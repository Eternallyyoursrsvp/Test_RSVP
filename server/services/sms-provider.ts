/**
 * SMS Provider Service
 * Multi-provider SMS service with Twilio primary and AWS SNS backup
 */

import { z } from 'zod';
import twilio from 'twilio';
import AWS from 'aws-sdk';
import { metricsRegistry } from '../middleware/monitoring';
import { schemaValidationService, DatabaseConnection } from '../database/schema-validation';

// SMS Message Schema
export const SMSMessageSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  guestId: z.string().uuid().optional(),
  recipientPhone: z.string().min(1),
  recipientName: z.string().optional(),
  message: z.string().min(1).max(1600), // SMS limit
  templateId: z.string().uuid().optional(),
  templateVariables: z.record(z.string()).default({}),
  provider: z.enum(['twilio', 'aws_sns']),
  providerMessageId: z.string().optional(),
  status: z.enum(['pending', 'queued', 'sent', 'delivered', 'failed', 'undelivered']),
  statusReason: z.string().optional(),
  cost: z.number().optional(),
  segments: z.number().default(1),
  countryCode: z.string().length(2).optional(), // ISO country code
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sentAt: z.string().datetime().optional(),
  deliveredAt: z.string().datetime().optional()
});

export const SMSTemplateSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  name: z.string().min(1).max(255),
  content: z.string().min(1).max(1600),
  variables: z.array(z.string()).default([]),
  language: z.string().length(2).default('en'),
  category: z.enum(['invitation', 'reminder', 'update', 'confirmation', 'transport', 'emergency']),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type SMSMessage = z.infer<typeof SMSMessageSchema>;
export type SMSTemplate = z.infer<typeof SMSTemplateSchema>;

// Provider Configuration
interface ProviderConfig {
  twilio: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
    statusCallbackUrl?: string;
  };
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    senderName?: string;
  };
}

// SMS Status Update Interface
export interface SMSStatusUpdate {
  messageId: string;
  status: SMSMessage['status'];
  statusReason?: string;
  timestamp: string;
  cost?: number;
  provider: 'twilio' | 'aws_sns';
  providerData?: any;
}

// Provider Interface
interface SMSProvider {
  name: string;
  send(message: Omit<SMSMessage, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<{
    providerMessageId: string;
    status: SMSMessage['status'];
    cost?: number;
    segments?: number;
  }>;
  getStatus(providerMessageId: string): Promise<SMSStatusUpdate>;
  validatePhoneNumber(phoneNumber: string): Promise<{
    isValid: boolean;
    countryCode?: string;
    carrier?: string;
  }>;
}

// Twilio Provider Implementation
class TwilioProvider implements SMSProvider {
  name = 'twilio';
  private client: twilio.Twilio;
  private fromNumber: string;
  private statusCallbackUrl?: string;

  constructor(config: ProviderConfig['twilio']) {
    this.client = twilio(config.accountSid, config.authToken);
    this.fromNumber = config.fromNumber;
    this.statusCallbackUrl = config.statusCallbackUrl;
  }

  async send(message: Omit<SMSMessage, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<{
    providerMessageId: string;
    status: SMSMessage['status'];
    cost?: number;
    segments?: number;
  }> {
    try {
      const result = await this.client.messages.create({
        body: message.message,
        from: this.fromNumber,
        to: message.recipientPhone,
        statusCallback: this.statusCallbackUrl
      });

      // Convert Twilio status to our status
      const status = this.mapTwilioStatus(result.status);

      return {
        providerMessageId: result.sid,
        status,
        segments: result.numSegments ? parseInt(result.numSegments) : 1
      };

    } catch (error) {
      console.error('❌ Twilio SMS send failed:', error);
      throw new Error(`Twilio SMS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStatus(providerMessageId: string): Promise<SMSStatusUpdate> {
    try {
      const message = await this.client.messages(providerMessageId).fetch();
      
      return {
        messageId: providerMessageId,
        status: this.mapTwilioStatus(message.status),
        statusReason: message.errorMessage || undefined,
        timestamp: new Date().toISOString(),
        cost: message.price ? parseFloat(message.price) : undefined,
        provider: 'twilio',
        providerData: {
          numSegments: message.numSegments,
          direction: message.direction,
          errorCode: message.errorCode
        }
      };

    } catch (error) {
      console.error('❌ Twilio status fetch failed:', error);
      throw new Error(`Twilio status fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validatePhoneNumber(phoneNumber: string): Promise<{
    isValid: boolean;
    countryCode?: string;
    carrier?: string;
  }> {
    try {
      const lookup = await this.client.lookups.v1.phoneNumbers(phoneNumber).fetch({
        type: ['carrier']
      });

      return {
        isValid: true,
        countryCode: lookup.countryCode,
        carrier: lookup.carrier?.name
      };

    } catch (error) {
      return {
        isValid: false
      };
    }
  }

  private mapTwilioStatus(twilioStatus: string): SMSMessage['status'] {
    switch (twilioStatus) {
      case 'accepted':
      case 'queued':
        return 'queued';
      case 'sending':
        return 'sent';
      case 'sent':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'failed':
      case 'undelivered':
        return 'failed';
      default:
        return 'pending';
    }
  }
}

// AWS SNS Provider Implementation
class AWSSNSProvider implements SMSProvider {
  name = 'aws_sns';
  private sns: AWS.SNS;
  private senderName?: string;

  constructor(config: ProviderConfig['aws']) {
    AWS.config.update({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region
    });
    
    this.sns = new AWS.SNS();
    this.senderName = config.senderName;
  }

  async send(message: Omit<SMSMessage, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<{
    providerMessageId: string;
    status: SMSMessage['status'];
    cost?: number;
    segments?: number;
  }> {
    try {
      const params: AWS.SNS.PublishInput = {
        Message: message.message,
        PhoneNumber: message.recipientPhone,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
          }
        }
      };

      if (this.senderName) {
        params.MessageAttributes!['AWS.SNS.SMS.SenderID'] = {
          DataType: 'String',
          StringValue: this.senderName
        };
      }

      const result = await this.sns.publish(params).promise();

      return {
        providerMessageId: result.MessageId!,
        status: 'sent',
        segments: Math.ceil(message.message.length / 160)
      };

    } catch (error) {
      console.error('❌ AWS SNS send failed:', error);
      throw new Error(`AWS SNS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStatus(providerMessageId: string): Promise<SMSStatusUpdate> {
    // AWS SNS doesn't provide delivery status by default
    // This would require CloudWatch logs or delivery status features
    return {
      messageId: providerMessageId,
      status: 'sent',
      timestamp: new Date().toISOString(),
      provider: 'aws_sns'
    };
  }

  async validatePhoneNumber(phoneNumber: string): Promise<{
    isValid: boolean;
    countryCode?: string;
    carrier?: string;
  }> {
    // Basic phone number validation for AWS SNS
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return {
      isValid: phoneRegex.test(phoneNumber)
    };
  }
}

// SMS Service Implementation
export class SMSProviderService {
  private db: DatabaseConnection;
  private primaryProvider: SMSProvider;
  private backupProvider: SMSProvider;
  private config: ProviderConfig;

  constructor(db: DatabaseConnection, config: ProviderConfig) {
    this.db = db;
    this.config = config;
    this.primaryProvider = new TwilioProvider(config.twilio);
    this.backupProvider = new AWSSNSProvider(config.aws);
  }

  // Template Management
  async createTemplate(templateData: Omit<SMSTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<SMSTemplate> {
    const startTime = performance.now();
    
    try {
      const validatedData = SMSTemplateSchema.omit({
        id: true,
        createdAt: true,
        updatedAt: true
      }).parse(templateData);

      const template: SMSTemplate = {
        id: crypto.randomUUID(),
        ...validatedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO sms_templates (
          id, event_id, name, content, variables, language, category,
          is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          template.id, template.eventId, template.name, template.content,
          JSON.stringify(template.variables), template.language, template.category,
          template.isActive, template.createdAt, template.updatedAt
        ],
        `sms_template_create_${template.id}`
      );

      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('sms_operation_duration_ms', duration, {
        operation: 'create_template',
        status: 'success'
      });

      console.log(`✅ SMS template created: ${template.name}`);
      return template;

    } catch (error) {
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('sms_operation_duration_ms', duration, {
        operation: 'create_template',
        status: 'error'
      });

      console.error('❌ SMS template creation failed:', error);
      throw new Error(`SMS template creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTemplatesByEvent(eventId: string): Promise<SMSTemplate[]> {
    try {
      const templates = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM sms_templates WHERE event_id = $1 AND is_active = true ORDER BY name ASC`,
        [eventId],
        `sms_templates_by_event_${eventId}`
      );

      return templates.map((template: any) => ({
        ...template,
        variables: JSON.parse(template.variables || '[]')
      }));

    } catch (error) {
      console.error('❌ Failed to get SMS templates by event:', error);
      throw new Error(`Failed to retrieve SMS templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Message Sending
  async sendSMS(messageData: Omit<SMSMessage, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'provider'>): Promise<SMSMessage> {
    const startTime = performance.now();
    
    try {
      // Process template if provided
      let processedMessage = messageData.message;
      if (messageData.templateId) {
        const template = await this.getTemplate(messageData.templateId);
        if (template) {
          processedMessage = this.processTemplate(template.content, messageData.templateVariables);
        }
      }

      // Validate phone number
      const phoneValidation = await this.primaryProvider.validatePhoneNumber(messageData.recipientPhone);
      if (!phoneValidation.isValid) {
        throw new Error('Invalid phone number format');
      }

      const messageWithProcessedContent = {
        ...messageData,
        message: processedMessage,
        countryCode: phoneValidation.countryCode
      };

      // Try primary provider first
      let result;
      let provider: 'twilio' | 'aws_sns' = 'twilio';
      
      try {
        result = await this.primaryProvider.send(messageWithProcessedContent);
      } catch (primaryError) {
        console.warn('⚠️ Primary SMS provider failed, trying backup:', primaryError);
        
        // Fallback to backup provider
        try {
          result = await this.backupProvider.send(messageWithProcessedContent);
          provider = 'aws_sns';
        } catch (backupError) {
          console.error('❌ Both SMS providers failed:', backupError);
          throw new Error('All SMS providers failed');
        }
      }

      // Create message record
      const smsMessage: SMSMessage = {
        id: crypto.randomUUID(),
        ...messageWithProcessedContent,
        provider,
        providerMessageId: result.providerMessageId,
        status: result.status,
        cost: result.cost,
        segments: result.segments || 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sentAt: result.status === 'sent' ? new Date().toISOString() : undefined
      };

      // Save to database
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO sms_messages (
          id, event_id, guest_id, recipient_phone, recipient_name, message,
          template_id, template_variables, provider, provider_message_id,
          status, cost, segments, country_code, created_at, updated_at, sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          smsMessage.id, smsMessage.eventId, smsMessage.guestId,
          smsMessage.recipientPhone, smsMessage.recipientName, smsMessage.message,
          smsMessage.templateId, JSON.stringify(smsMessage.templateVariables),
          smsMessage.provider, smsMessage.providerMessageId, smsMessage.status,
          smsMessage.cost, smsMessage.segments, smsMessage.countryCode,
          smsMessage.createdAt, smsMessage.updatedAt, smsMessage.sentAt
        ]
      );

      // Record metrics
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('sms_send_duration_ms', duration, {
        provider,
        status: result.status
      });

      metricsRegistry.incrementCounter('sms_messages_sent_total', {
        provider,
        status: result.status,
        country: smsMessage.countryCode || 'unknown'
      });

      console.log(`✅ SMS sent: ${smsMessage.id} via ${provider}`);
      return smsMessage;

    } catch (error) {
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('sms_send_duration_ms', duration, {
        status: 'error'
      });

      metricsRegistry.incrementCounter('sms_messages_sent_total', {
        status: 'error'
      });

      console.error('❌ SMS send failed:', error);
      throw new Error(`SMS send failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Bulk SMS sending
  async sendBulkSMS(messages: Array<Omit<SMSMessage, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'provider'>>): Promise<{
    successful: SMSMessage[];
    failed: Array<{ message: any; error: string }>;
  }> {
    const successful: SMSMessage[] = [];
    const failed: Array<{ message: any; error: string }> = [];

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (messageData) => {
        try {
          const result = await this.sendSMS(messageData);
          successful.push(result);
        } catch (error) {
          failed.push({
            message: messageData,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      await Promise.all(batchPromises);
      
      // Rate limiting delay between batches
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Bulk SMS completed: ${successful.length} sent, ${failed.length} failed`);
    return { successful, failed };
  }

  // Status tracking
  async updateMessageStatus(messageId: string, statusUpdate: SMSStatusUpdate): Promise<void> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(statusUpdate.status);

      if (statusUpdate.statusReason) {
        updateFields.push(`status_reason = $${paramIndex++}`);
        updateValues.push(statusUpdate.statusReason);
      }

      if (statusUpdate.cost !== undefined) {
        updateFields.push(`cost = $${paramIndex++}`);
        updateValues.push(statusUpdate.cost);
      }

      if (statusUpdate.status === 'delivered') {
        updateFields.push(`delivered_at = $${paramIndex++}`);
        updateValues.push(statusUpdate.timestamp);
      }

      updateFields.push(`updated_at = $${paramIndex++}`);
      updateValues.push(new Date().toISOString());

      updateValues.push(messageId);

      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `UPDATE sms_messages SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      );

      console.log(`✅ SMS status updated: ${messageId} -> ${statusUpdate.status}`);

      // Update metrics
      metricsRegistry.incrementCounter('sms_status_updates_total', {
        status: statusUpdate.status,
        provider: statusUpdate.provider
      });

    } catch (error) {
      console.error('❌ Failed to update SMS status:', error);
      throw new Error(`SMS status update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Analytics and Reporting
  async getSMSStatistics(eventId: string): Promise<{
    totalMessages: number;
    messagesByStatus: Record<string, number>;
    messagesByProvider: Record<string, number>;
    totalCost: number;
    deliveryRate: number;
    averageSegments: number;
  }> {
    try {
      const stats = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT 
           COUNT(*) as total_messages,
           COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_messages,
           COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_messages,
           COUNT(CASE WHEN provider = 'twilio' THEN 1 END) as twilio_messages,
           COUNT(CASE WHEN provider = 'aws_sns' THEN 1 END) as aws_messages,
           COALESCE(SUM(cost), 0) as total_cost,
           COALESCE(AVG(segments), 1) as average_segments
         FROM sms_messages 
         WHERE event_id = $1`,
        [eventId]
      );

      const totalMessages = parseInt(stats[0]?.total_messages || '0');
      const deliveredMessages = parseInt(stats[0]?.delivered_messages || '0');

      return {
        totalMessages,
        messagesByStatus: {
          delivered: deliveredMessages,
          failed: parseInt(stats[0]?.failed_messages || '0'),
          sent: totalMessages - deliveredMessages - parseInt(stats[0]?.failed_messages || '0')
        },
        messagesByProvider: {
          twilio: parseInt(stats[0]?.twilio_messages || '0'),
          aws_sns: parseInt(stats[0]?.aws_messages || '0')
        },
        totalCost: parseFloat(stats[0]?.total_cost || '0'),
        deliveryRate: totalMessages > 0 ? Math.round((deliveredMessages / totalMessages) * 100) : 0,
        averageSegments: parseFloat(stats[0]?.average_segments || '1')
      };

    } catch (error) {
      console.error('❌ Failed to get SMS statistics:', error);
      throw new Error(`Failed to get SMS statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods
  private async getTemplate(templateId: string): Promise<SMSTemplate | null> {
    try {
      const templates = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM sms_templates WHERE id = $1 AND is_active = true`,
        [templateId]
      );

      if (templates.length === 0) {
        return null;
      }

      const template = templates[0];
      return {
        ...template,
        variables: JSON.parse(template.variables || '[]')
      };

    } catch (error) {
      console.error('❌ Failed to get SMS template:', error);
      return null;
    }
  }

  private processTemplate(content: string, variables: Record<string, string>): string {
    let processedContent = content;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
    });

    return processedContent;
  }
}

// Export singleton instance
let smsProviderService: SMSProviderService | null = null;

export function initializeSMSProvider(db: DatabaseConnection, config: ProviderConfig): SMSProviderService {
  if (!smsProviderService) {
    smsProviderService = new SMSProviderService(db, config);
    console.log('✅ SMS provider service initialized');
  }
  return smsProviderService;
}

export function getSMSProviderService(): SMSProviderService {
  if (!smsProviderService) {
    throw new Error('SMS provider service not initialized');
  }
  return smsProviderService;
}

export async function cleanupSMSProvider(): Promise<void> {
  if (smsProviderService) {
    smsProviderService = null;
    console.log('✅ SMS provider service cleaned up');
  }
}