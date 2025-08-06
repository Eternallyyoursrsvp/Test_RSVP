/**
 * SMS API Endpoints
 * RESTful API for SMS functionality including templates, sending, and analytics
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { APIResponseBuilder } from '../versioning';
import { enhancedAuthMiddleware, requirePermission } from '../../middleware/enhanced-security';
import { createValidationMiddleware } from '../versioning';
import { getSmsService, SendSmsSchema, BulkSmsSchema } from '../../services/sms-service';

const router = Router();

// Validation Schemas
const CreateProviderConfigSchema = z.object({
  body: z.object({
    eventId: z.number().int().positive(),
    providerName: z.enum(['twilio', 'aws_sns']),
    providerType: z.enum(['primary', 'backup', 'test']),
    configuration: z.object({
      // Twilio config
      accountSid: z.string().optional(),
      authToken: z.string().optional(),
      fromNumber: z.string().optional(),
      // AWS SNS config
      accessKeyId: z.string().optional(),
      secretAccessKey: z.string().optional(),
      region: z.string().optional()
    }),
    supportedCountries: z.array(z.string()).default([]),
    webhookUrl: z.string().url().optional()
  })
});

const CreateTemplateSchema = z.object({
  body: z.object({
    eventId: z.number().int().positive(),
    name: z.string().min(1).max(255),
    category: z.enum(['rsvp_reminder', 'transport_update', 'general', 'welcome']),
    content: z.string().min(1).max(1600),
    variables: z.array(z.string()).default([])
  })
});

const SendSmsRequestSchema = z.object({
  body: SendSmsSchema
});

const BulkSmsRequestSchema = z.object({
  body: BulkSmsSchema
});

const OptOutSchema = z.object({
  body: z.object({
    eventId: z.number().int().positive(),
    phoneNumber: z.string().min(10),
    reason: z.string().optional(),
    optOutMethod: z.enum(['keyword', 'admin', 'api', 'webhook']).default('admin')
  })
});

const AnalyticsSchema = z.object({
  query: z.object({
    eventId: z.string().transform(val => parseInt(val)),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    providerId: z.string().optional(),
    groupBy: z.enum(['day', 'week', 'month']).optional()
  })
});

// Apply authentication to all routes
router.use(enhancedAuthMiddleware);

// Provider Configuration Endpoints

/**
 * POST /providers
 * Create SMS provider configuration
 */
router.post(
  '/providers',
  requirePermission('communication:manage'),
  createValidationMiddleware(CreateProviderConfigSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId, providerName, providerType, configuration, supportedCountries, webhookUrl } = req.body;
      
      // Validate provider configuration
      let configValidation = false;
      if (providerName === 'twilio' && configuration.accountSid && configuration.authToken) {
        configValidation = true;
      } else if (providerName === 'aws_sns' && configuration.accessKeyId && configuration.secretAccessKey) {
        configValidation = true;
      }
      
      if (!configValidation) {
        return res.status(400).json(responseBuilder.error(
          'INVALID_CONFIG',
          'Provider configuration is incomplete or invalid'
        ));
      }

      const smsService = getSmsService();
      
      const providerConfig = await smsService.createProviderConfig({
        eventId,
        providerName,
        providerType,
        configuration,
        supportedCountries,
        webhookUrl,
        isActive: true
      });
      
      res.status(201).json(responseBuilder.success({
        ...providerConfig,
        message: 'SMS provider configuration created successfully'
      }));
      
    } catch (error) {
      console.error('❌ Failed to create SMS provider config:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to create SMS provider configuration',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /providers/event/:eventId
 * Get SMS provider configurations for an event
 */
router.get(
  '/providers/event/:eventId',
  requirePermission('communication:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const eventId = parseInt(req.params.eventId);
      
      if (!eventId) {
        return res.status(400).json(responseBuilder.error(
          'INVALID_EVENT_ID',
          'Valid event ID is required'
        ));
      }

      const smsService = getSmsService();
      const providers = await smsService.getProviderConfigs(eventId);
      
      res.status(200).json(responseBuilder.success(providers));
      
    } catch (error) {
      console.error('❌ Failed to get SMS providers:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve SMS provider configurations',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Template Management Endpoints

/**
 * POST /templates
 * Create SMS template
 */
router.post(
  '/templates',
  requirePermission('communication:write'),
  createValidationMiddleware(CreateTemplateSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId, name, category, content, variables } = req.body;
      
      const smsService = getSmsService();
      const template = await smsService.createTemplate(eventId, {
        name,
        category,
        content,
        variables,
        createdBy: (req as any).user?.id
      });
      
      res.status(201).json(responseBuilder.success(template));
      
    } catch (error) {
      console.error('❌ Failed to create SMS template:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
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
  requirePermission('communication:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const eventId = parseInt(req.params.eventId);
      
      if (!eventId) {
        return res.status(400).json(responseBuilder.error(
          'INVALID_EVENT_ID',
          'Valid event ID is required'
        ));
      }

      const smsService = getSmsService();
      const templates = await smsService.getTemplates(eventId);
      
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

// SMS Sending Endpoints

/**
 * POST /send
 * Send single SMS
 */
router.post(
  '/send',
  requirePermission('communication:send'),
  createValidationMiddleware(SendSmsRequestSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { phoneNumber, content, templateId, templateVariables, guestId, priority } = req.body;
      const eventId = req.body.eventId || (req as any).eventId;
      
      if (!eventId) {
        return res.status(400).json(responseBuilder.error(
          'MISSING_EVENT_ID',
          'Event ID is required'
        ));
      }

      const smsService = getSmsService();
      await smsService.initializeProviders(eventId);
      
      const deliveryLog = await smsService.sendSms(eventId, {
        phoneNumber,
        content,
        templateId,
        templateVariables,
        guestId,
        priority
      });
      
      res.status(200).json(responseBuilder.success({
        messageId: deliveryLog.id,
        status: deliveryLog.status,
        phoneNumber: deliveryLog.phoneNumber,
        segments: deliveryLog.segments,
        cost: deliveryLog.cost,
        sentAt: deliveryLog.sentAt,
        message: 'SMS sent successfully'
      }));
      
    } catch (error) {
      console.error('❌ Failed to send SMS:', error);
      res.status(400).json(responseBuilder.error(
        'SEND_FAILED',
        'Failed to send SMS',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * POST /send/bulk
 * Send bulk SMS
 */
router.post(
  '/send/bulk',
  requirePermission('communication:send'),
  createValidationMiddleware(BulkSmsRequestSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { recipients, templateId, scheduledAt } = req.body;
      const eventId = req.body.eventId || (req as any).eventId;
      
      if (!eventId) {
        return res.status(400).json(responseBuilder.error(
          'MISSING_EVENT_ID',
          'Event ID is required'
        ));
      }

      const smsService = getSmsService();
      await smsService.initializeProviders(eventId);
      
      const deliveryLogs = await smsService.sendBulkSms(eventId, {
        recipients,
        templateId,
        scheduledAt
      });
      
      const summary = {
        totalRecipients: recipients.length,
        sent: deliveryLogs.filter(log => log.status === 'sent' || log.status === 'pending').length,
        failed: deliveryLogs.filter(log => log.status === 'failed').length,
        totalCost: deliveryLogs.reduce((sum, log) => sum + (parseFloat(log.cost?.toString() || '0')), 0),
        deliveryLogs: deliveryLogs.map(log => ({
          messageId: log.id,
          phoneNumber: log.phoneNumber,
          status: log.status,
          errorMessage: log.errorMessage
        }))
      };
      
      res.status(200).json(responseBuilder.success(summary));
      
    } catch (error) {
      console.error('❌ Failed to send bulk SMS:', error);
      res.status(400).json(responseBuilder.error(
        'BULK_SEND_FAILED',
        'Failed to send bulk SMS',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Opt-out Management

/**
 * POST /opt-out
 * Add phone number to opt-out list
 */
router.post(
  '/opt-out',
  requirePermission('communication:manage'),
  createValidationMiddleware(OptOutSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId, phoneNumber, reason, optOutMethod } = req.body;
      
      const smsService = getSmsService();
      const optOut = await smsService.addOptOut({
        eventId,
        phoneNumber,
        reason,
        optOutMethod
      });
      
      res.status(201).json(responseBuilder.success({
        ...optOut,
        message: 'Phone number added to opt-out list successfully'
      }));
      
    } catch (error) {
      console.error('❌ Failed to add opt-out:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to add phone number to opt-out list',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * DELETE /opt-out/:phoneNumber/event/:eventId
 * Remove phone number from opt-out list
 */
router.delete(
  '/opt-out/:phoneNumber/event/:eventId',
  requirePermission('communication:manage'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { phoneNumber, eventId } = req.params;
      
      const smsService = getSmsService();
      await smsService.removeOptOut(parseInt(eventId), phoneNumber);
      
      res.status(200).json(responseBuilder.success({
        phoneNumber,
        eventId,
        message: 'Phone number removed from opt-out list successfully'
      }));
      
    } catch (error) {
      console.error('❌ Failed to remove opt-out:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to remove phone number from opt-out list',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Analytics and Reporting

/**
 * GET /analytics
 * Get SMS delivery analytics
 */
router.get(
  '/analytics',
  requirePermission('analytics:read'),
  createValidationMiddleware(AnalyticsSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId, startDate, endDate, providerId, groupBy } = req.query as any;
      
      const smsService = getSmsService();
      const stats = await smsService.getDeliveryStats(eventId, 
        startDate && endDate ? { start: startDate, end: endDate } : undefined
      );
      
      const analytics = {
        totalSent: parseInt(stats[0]?.total_sent || '0'),
        delivered: parseInt(stats[0]?.delivered || '0'),
        failed: parseInt(stats[0]?.failed || '0'),
        totalCost: parseFloat(stats[0]?.total_cost || '0'),
        averageDeliveryTime: parseFloat(stats[0]?.avg_delivery_time || '0'),
        deliveryRate: stats[0]?.total_sent > 0 ? 
          ((stats[0]?.delivered / stats[0]?.total_sent) * 100).toFixed(2) : '0',
        errorRate: stats[0]?.total_sent > 0 ? 
          ((stats[0]?.failed / stats[0]?.total_sent) * 100).toFixed(2) : '0',
        period: {
          startDate: startDate || 'all_time',
          endDate: endDate || 'now'
        }
      };
      
      res.status(200).json(responseBuilder.success(analytics));
      
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

/**
 * GET /delivery-status/:messageId
 * Get delivery status for specific message
 */
router.get(
  '/delivery-status/:messageId',
  requirePermission('communication:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { messageId } = req.params;
      
      // Implementation needed - query delivery log by message ID
      const deliveryStatus = {
        messageId,
        status: 'delivered',
        phoneNumber: '+1234567890',
        sentAt: new Date(Date.now() - 300000).toISOString(),
        deliveredAt: new Date(Date.now() - 60000).toISOString(),
        cost: 0.0075,
        segments: 1,
        providerMessageId: 'SM1234567890abcdef'
      };
      
      res.status(200).json(responseBuilder.success(deliveryStatus));
      
    } catch (error) {
      console.error('❌ Failed to get delivery status:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve delivery status',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Webhook Endpoints

/**
 * POST /webhooks/twilio
 * Handle Twilio delivery status webhooks
 */
router.post('/webhooks/twilio', async (req: Request, res: Response) => {
  try {
    const smsService = getSmsService();
    await smsService.handleDeliveryWebhook('twilio', req.body);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Failed to handle Twilio webhook:', error);
    res.status(500).send('Error');
  }
});

/**
 * POST /webhooks/aws-sns
 * Handle AWS SNS delivery status webhooks
 */
router.post('/webhooks/aws-sns', async (req: Request, res: Response) => {
  try {
    const smsService = getSmsService();
    await smsService.handleDeliveryWebhook('aws_sns', req.body);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Failed to handle AWS SNS webhook:', error);
    res.status(500).send('Error');
  }
});

// Health Check
router.get('/health', (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    res.status(200).json(responseBuilder.success({
      service: 'sms-api',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      providers: ['twilio', 'aws_sns']
    }));
  } catch (error) {
    res.status(503).json(responseBuilder.error(
      'SERVICE_UNAVAILABLE',
      'SMS API service not available',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

export function createSmsAPI(): Router {
  return router;
}

// Export for use in main API registration
export default router;