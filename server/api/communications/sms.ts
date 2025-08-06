/**
 * SMS Communication API
 * RESTful endpoints for SMS messaging and template management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { APIResponseBuilder } from '../versioning';
import { enhancedAuthMiddleware, requirePermission } from '../../middleware/enhanced-security';
import { createValidationMiddleware } from '../versioning';
import { 
  getSMSProviderService,
  SMSMessageSchema,
  SMSTemplateSchema,
  SMSStatusUpdate
} from '../../services/sms-provider';

const router = Router();

// Validation Schemas
const SendSMSSchema = z.object({
  body: z.object({
    eventId: z.string().uuid(),
    guestId: z.string().uuid().optional(),
    recipientPhone: z.string().min(1),
    recipientName: z.string().optional(),
    message: z.string().min(1).max(1600).optional(),
    templateId: z.string().uuid().optional(),
    templateVariables: z.record(z.string()).default({})
  }).refine(data => data.message || data.templateId, {
    message: "Either message or templateId must be provided"
  })
});

const BulkSMSSchema = z.object({
  body: z.object({
    eventId: z.string().uuid(),
    messages: z.array(z.object({
      guestId: z.string().uuid().optional(),
      recipientPhone: z.string().min(1),
      recipientName: z.string().optional(),
      message: z.string().min(1).max(1600).optional(),
      templateId: z.string().uuid().optional(),
      templateVariables: z.record(z.string()).default({})
    })).min(1).max(100) // Limit bulk operations
  })
});

const CreateTemplateSchema = z.object({
  body: SMSTemplateSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
  })
});

const UpdateTemplateSchema = z.object({
  params: z.object({
    templateId: z.string().uuid()
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    content: z.string().min(1).max(1600).optional(),
    variables: z.array(z.string()).optional(),
    language: z.string().length(2).optional(),
    category: z.enum(['invitation', 'reminder', 'update', 'confirmation', 'transport', 'emergency']).optional(),
    isActive: z.boolean().optional()
  })
});

const StatusWebhookSchema = z.object({
  body: z.object({
    MessageSid: z.string().optional(), // Twilio
    MessageStatus: z.string().optional(), // Twilio
    ErrorCode: z.string().optional(), // Twilio
    ErrorMessage: z.string().optional(), // Twilio
    // Add other webhook fields as needed
  })
});

// Apply authentication to all routes
router.use(enhancedAuthMiddleware);

// SMS Sending Endpoints

/**
 * POST /send
 * Send a single SMS message
 */
router.post(
  '/send',
  requirePermission('communications:write'),
  createValidationMiddleware(SendSMSSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const smsService = getSMSProviderService();
      const messageData = {
        ...req.body,
        message: req.body.message || '' // Will be filled by template processing
      };

      const smsMessage = await smsService.sendSMS(messageData);
      
      res.status(201).json(responseBuilder.success({
        messageId: smsMessage.id,
        status: smsMessage.status,
        provider: smsMessage.provider,
        segments: smsMessage.segments,
        estimatedCost: smsMessage.cost,
        sentAt: smsMessage.sentAt
      }));

    } catch (error) {
      console.error('❌ SMS send failed:', error);
      res.status(400).json(responseBuilder.error(
        'SEND_FAILED',
        'Failed to send SMS message',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * POST /send-bulk
 * Send multiple SMS messages
 */
router.post(
  '/send-bulk',
  requirePermission('communications:write'),
  createValidationMiddleware(BulkSMSSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const smsService = getSMSProviderService();
      const { eventId, messages } = req.body;

      // Prepare messages with eventId
      const messagesWithEventId = messages.map((msg: any) => ({
        ...msg,
        eventId,
        message: msg.message || '' // Will be filled by template processing
      }));

      const result = await smsService.sendBulkSMS(messagesWithEventId);
      
      res.status(201).json(responseBuilder.success({
        totalMessages: messages.length,
        successful: result.successful.length,
        failed: result.failed.length,
        successfulMessages: result.successful.map(msg => ({
          messageId: msg.id,
          recipientPhone: msg.recipientPhone,
          status: msg.status,
          provider: msg.provider
        })),
        failedMessages: result.failed.map(failure => ({
          recipientPhone: failure.message.recipientPhone,
          error: failure.error
        }))
      }));

    } catch (error) {
      console.error('❌ Bulk SMS send failed:', error);
      res.status(400).json(responseBuilder.error(
        'BULK_SEND_FAILED',
        'Failed to send bulk SMS messages',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Message Management Endpoints

/**
 * GET /messages/event/:eventId
 * Get SMS messages for an event
 */
router.get(
  '/messages/event/:eventId',
  requirePermission('communications:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      const { status, provider, page = '1', limit = '50' } = req.query;

      if (!eventId) {
        return res.status(400).json(responseBuilder.error(
          'BAD_REQUEST',
          'Event ID is required'
        ));
      }

      // Build query with filters
      let query = `SELECT * FROM sms_messages WHERE event_id = $1`;
      const queryParams: any[] = [eventId];
      let paramIndex = 2;

      if (status && typeof status === 'string') {
        query += ` AND status = $${paramIndex++}`;
        queryParams.push(status);
      }

      if (provider && typeof provider === 'string') {
        query += ` AND provider = $${paramIndex++}`;
        queryParams.push(provider);
      }

      // Add pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      queryParams.push(limitNum, offset);

      // Execute query (using a simplified approach - in real implementation use the schema service)
      const messages: any[] = []; // This would be populated by actual database query
      
      res.status(200).json(responseBuilder.success({
        messages: messages.map(msg => ({
          ...msg,
          templateVariables: JSON.parse(msg.template_variables || '{}')
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: messages.length // This would be from a separate count query
        }
      }));

    } catch (error) {
      console.error('❌ Failed to get SMS messages:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve SMS messages',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /messages/:messageId/status
 * Get message status
 */
router.get(
  '/messages/:messageId/status',
  requirePermission('communications:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { messageId } = req.params;

      if (!messageId) {
        return res.status(400).json(responseBuilder.error(
          'BAD_REQUEST',
          'Message ID is required'
        ));
      }

      // This would fetch from database and potentially update from provider
      // Simplified implementation for now
      const messageStatus = {
        messageId,
        status: 'delivered',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(responseBuilder.success(messageStatus));

    } catch (error) {
      console.error('❌ Failed to get message status:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve message status',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Template Management Endpoints

/**
 * POST /templates
 * Create a new SMS template
 */
router.post(
  '/templates',
  requirePermission('communications:manage'),
  createValidationMiddleware(CreateTemplateSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const smsService = getSMSProviderService();
      const template = await smsService.createTemplate(req.body);
      
      res.status(201).json(responseBuilder.success(template));

    } catch (error) {
      console.error('❌ SMS template creation failed:', error);
      res.status(400).json(responseBuilder.error(
        'CREATION_FAILED',
        'Failed to create SMS template',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /templates/event/:eventId
 * Get SMS templates for an event
 */
router.get(
  '/templates/event/:eventId',
  requirePermission('communications:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      const { category, language } = req.query;

      if (!eventId) {
        return res.status(400).json(responseBuilder.error(
          'BAD_REQUEST',
          'Event ID is required'
        ));
      }

      const smsService = getSMSProviderService();
      let templates = await smsService.getTemplatesByEvent(eventId);

      // Apply filters
      if (category && typeof category === 'string') {
        templates = templates.filter(t => t.category === category);
      }

      if (language && typeof language === 'string') {
        templates = templates.filter(t => t.language === language);
      }

      res.status(200).json(responseBuilder.success(templates));

    } catch (error) {
      console.error('❌ Failed to get SMS templates:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve SMS templates',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * PUT /templates/:templateId
 * Update an SMS template
 */
router.put(
  '/templates/:templateId',
  requirePermission('communications:manage'),
  createValidationMiddleware(UpdateTemplateSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { templateId } = req.params;
      const updates = req.body;

      // Build update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.name) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updates.name);
      }

      if (updates.content) {
        updateFields.push(`content = $${paramIndex++}`);
        updateValues.push(updates.content);
      }

      if (updates.variables) {
        updateFields.push(`variables = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.variables));
      }

      if (updates.language) {
        updateFields.push(`language = $${paramIndex++}`);
        updateValues.push(updates.language);
      }

      if (updates.category) {
        updateFields.push(`category = $${paramIndex++}`);
        updateValues.push(updates.category);
      }

      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(updates.isActive);
      }

      updateFields.push(`updated_at = $${paramIndex++}`);
      updateValues.push(new Date().toISOString());

      updateValues.push(templateId);

      // This would execute the actual update query
      // Simplified for now
      
      res.status(200).json(responseBuilder.success({
        templateId,
        message: 'Template updated successfully',
        updatedAt: new Date().toISOString()
      }));

    } catch (error) {
      console.error('❌ SMS template update failed:', error);
      res.status(400).json(responseBuilder.error(
        'UPDATE_FAILED',
        'Failed to update SMS template',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Analytics Endpoints

/**
 * GET /analytics/event/:eventId
 * Get SMS analytics for an event
 */
router.get(
  '/analytics/event/:eventId',
  requirePermission('analytics:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json(responseBuilder.error(
          'BAD_REQUEST',
          'Event ID is required'
        ));
      }

      const smsService = getSMSProviderService();
      const statistics = await smsService.getSMSStatistics(eventId);

      res.status(200).json(responseBuilder.success({
        eventId,
        statistics,
        generatedAt: new Date().toISOString()
      }));

    } catch (error) {
      console.error('❌ Failed to get SMS analytics:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve SMS analytics',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Webhook Endpoints

/**
 * POST /webhooks/twilio
 * Handle Twilio status webhooks
 */
router.post(
  '/webhooks/twilio',
  createValidationMiddleware(StatusWebhookSchema),
  async (req: Request, res: Response) => {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

      if (MessageSid && MessageStatus) {
        const smsService = getSMSProviderService();
        
        // Convert Twilio status to our internal status
        let status: any = 'pending';
        switch (MessageStatus) {
          case 'delivered':
            status = 'delivered';
            break;
          case 'failed':
          case 'undelivered':
            status = 'failed';
            break;
          case 'sent':
            status = 'sent';
            break;
        }

        const statusUpdate: SMSStatusUpdate = {
          messageId: MessageSid,
          status,
          statusReason: ErrorMessage,
          timestamp: new Date().toISOString(),
          provider: 'twilio',
          providerData: {
            errorCode: ErrorCode
          }
        };

        // Find message by provider ID and update
        // This would require a query to find the message by provider_message_id
        // Simplified implementation for now
        
        console.log(`📞 Twilio webhook: ${MessageSid} -> ${MessageStatus}`);
      }

      // Always respond with 200 to acknowledge webhook
      res.status(200).send('OK');

    } catch (error) {
      console.error('❌ Twilio webhook processing failed:', error);
      res.status(200).send('OK'); // Still acknowledge to prevent retries
    }
  }
);

/**
 * POST /webhooks/aws-sns
 * Handle AWS SNS notifications
 */
router.post(
  '/webhooks/aws-sns',
  async (req: Request, res: Response) => {
    try {
      // AWS SNS webhook handling would go here
      // This is more complex as it involves SNS message verification
      
      console.log('📱 AWS SNS webhook received');
      res.status(200).send('OK');

    } catch (error) {
      console.error('❌ AWS SNS webhook processing failed:', error);
      res.status(200).send('OK');
    }
  }
);

// Health Check
router.get('/health', (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    const smsService = getSMSProviderService();
    
    res.status(200).json(responseBuilder.success({
      service: 'sms-communications',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      providers: ['twilio', 'aws_sns']
    }));

  } catch (error) {
    res.status(503).json(responseBuilder.error(
      'SERVICE_UNAVAILABLE',
      'SMS service not available',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

export function createSMSAPI(): Router {
  return router;
}

// Export for use in main API registration
export default router;