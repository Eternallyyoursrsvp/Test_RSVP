/**
 * SMS Service
 * Multi-provider SMS service with Twilio primary and AWS SNS backup
 * Includes template rendering, delivery tracking, and analytics
 */

import { z } from 'zod';
import twilio from 'twilio';
import AWS from 'aws-sdk';
import { schemaValidationService, DatabaseConnection } from '../database/schema-validation';
import { metricsRegistry } from '../middleware/monitoring';
import { 
  SmsProviderConfig, 
  SmsTemplate, 
  SmsDeliveryLog, 
  SmsOptOut,
  InsertSmsDeliveryLog,
  InsertSmsAnalytics 
} from '../../shared/schema';

// SMS Provider Interfaces
interface SmsProvider {
  name: string;
  sendSms(phoneNumber: string, content: string, options?: any): Promise<SmsResult>;
  getDeliveryStatus(providerMessageId: string): Promise<DeliveryStatus>;
  validateConfiguration(): Promise<boolean>;
  calculateCost(content: string, phoneNumber: string): Promise<number>;
}

interface SmsResult {
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  cost?: number;
  segments?: number;
}

interface DeliveryStatus {
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  timestamp?: Date;
  errorCode?: string;
  errorMessage?: string;
}

// Template rendering interface
interface TemplateVariables {
  [key: string]: string | number | boolean;
}

// Validation schemas
const SendSmsSchema = z.object({
  phoneNumber: z.string().min(10),
  content: z.string().min(1).max(1600),
  templateId: z.number().optional(),
  templateVariables: z.record(z.any()).optional(),
  guestId: z.number().optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  scheduledAt: z.string().datetime().optional()
});

const BulkSmsSchema = z.object({
  recipients: z.array(z.object({
    phoneNumber: z.string().min(10),
    guestId: z.number().optional(),
    templateVariables: z.record(z.any()).optional()
  })),
  templateId: z.number(),
  scheduledAt: z.string().datetime().optional()
});

// Twilio Provider Implementation
class TwilioProvider implements SmsProvider {
  name = 'twilio';
  private client: twilio.Twilio;
  private config: any;

  constructor(config: any) {
    this.config = config;
    this.client = twilio(config.accountSid, config.authToken);
  }

  async sendSms(phoneNumber: string, content: string, options: any = {}): Promise<SmsResult> {
    try {
      const message = await this.client.messages.create({
        body: content,
        from: this.config.fromNumber,
        to: phoneNumber,
        ...options
      });

      return {
        success: true,
        providerMessageId: message.sid,
        cost: parseFloat(message.price || '0'),
        segments: message.numSegments ? parseInt(message.numSegments) : 1
      };
    } catch (error: any) {
      return {
        success: false,
        errorCode: error.code?.toString() || 'UNKNOWN',
        errorMessage: error.message || 'Failed to send SMS'
      };
    }
  }

  async getDeliveryStatus(providerMessageId: string): Promise<DeliveryStatus> {
    try {
      const message = await this.client.messages(providerMessageId).fetch();
      
      const statusMap: Record<string, DeliveryStatus['status']> = {
        'queued': 'pending',
        'sending': 'sent', 
        'sent': 'sent',
        'delivered': 'delivered',
        'failed': 'failed',
        'undelivered': 'undelivered'
      };

      return {
        status: statusMap[message.status] || 'pending',
        timestamp: message.dateUpdated ? new Date(message.dateUpdated) : undefined,
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage || undefined
      };
    } catch (error: any) {
      return {
        status: 'failed',
        errorCode: 'FETCH_ERROR',
        errorMessage: error.message
      };
    }
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      await this.client.api.accounts(this.config.accountSid).fetch();
      return true;
    } catch {
      return false;
    }
  }

  async calculateCost(content: string, phoneNumber: string): Promise<number> {
    // Estimate cost based on segments and destination
    const segments = Math.ceil(content.length / 160);
    const baseRate = phoneNumber.startsWith('+1') ? 0.0075 : 0.05; // US vs International
    return segments * baseRate;
  }
}

// AWS SNS Provider Implementation  
class AWSProvider implements SmsProvider {
  name = 'aws_sns';
  private sns: AWS.SNS;
  private config: any;

  constructor(config: any) {
    this.config = config;
    AWS.config.update({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region || 'us-east-1'
    });
    this.sns = new AWS.SNS();
  }

  async sendSms(phoneNumber: string, content: string, options: any = {}): Promise<SmsResult> {
    try {
      const params = {
        Message: content,
        PhoneNumber: phoneNumber,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: options.priority === 'high' ? 'Transactional' : 'Promotional'
          }
        }
      };

      const result = await this.sns.publish(params).promise();
      
      return {
        success: true,
        providerMessageId: result.MessageId,
        cost: await this.calculateCost(content, phoneNumber),
        segments: Math.ceil(content.length / 160)
      };
    } catch (error: any) {
      return {
        success: false,
        errorCode: error.code || 'UNKNOWN',
        errorMessage: error.message || 'Failed to send SMS via AWS SNS'
      };
    }
  }

  async getDeliveryStatus(providerMessageId: string): Promise<DeliveryStatus> {
    // AWS SNS doesn't provide delivery status by default
    // Would require additional setup with CloudWatch or delivery status logging
    return {
      status: 'sent',
      timestamp: new Date()
    };
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      await this.sns.listTopics().promise();
      return true;
    } catch {
      return false;
    }
  }

  async calculateCost(content: string, phoneNumber: string): Promise<number> {
    const segments = Math.ceil(content.length / 160);
    const baseRate = phoneNumber.startsWith('+1') ? 0.006 : 0.04; // AWS SNS rates
    return segments * baseRate;
  }
}

// Main SMS Service
export class SmsService {
  private db: DatabaseConnection;
  private providers: Map<string, SmsProvider> = new Map();
  private primaryProvider: SmsProvider | null = null;
  private backupProvider: SmsProvider | null = null;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  // Initialize providers for an event
  async initializeProviders(eventId: number): Promise<void> {
    try {
      const configs = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM sms_provider_configs WHERE event_id = $1 AND is_active = true ORDER BY provider_type`,
        [eventId],
        `sms_providers_${eventId}`
      );

      for (const config of configs) {
        let provider: SmsProvider;
        
        switch (config.provider_name) {
          case 'twilio':
            provider = new TwilioProvider(config.configuration);
            break;
          case 'aws_sns':
            provider = new AWSProvider(config.configuration);
            break;
          default:
            console.warn(`Unknown SMS provider: ${config.provider_name}`);
            continue;
        }

        this.providers.set(config.provider_name, provider);
        
        if (config.provider_type === 'primary') {
          this.primaryProvider = provider;
        } else if (config.provider_type === 'backup') {
          this.backupProvider = provider;
        }
      }

      console.log(`✅ SMS providers initialized for event ${eventId}`);
    } catch (error) {
      console.error('❌ Failed to initialize SMS providers:', error);
      throw error;
    }
  }

  // Send single SMS
  async sendSms(eventId: number, data: z.infer<typeof SendSmsSchema>): Promise<SmsDeliveryLog> {
    const startTime = performance.now();
    const logId = crypto.randomUUID();
    
    try {
      const validatedData = SendSmsSchema.parse(data);
      
      // Check opt-out status
      const isOptedOut = await this.checkOptOutStatus(eventId, validatedData.phoneNumber);
      if (isOptedOut) {
        throw new Error('Phone number has opted out of SMS communications');
      }

      // Render template if provided
      let content = validatedData.content;
      let templateId = validatedData.templateId;
      
      if (templateId) {
        const template = await this.getTemplate(templateId);
        content = await this.renderTemplate(template, validatedData.templateVariables || {});
      }

      // Get country code
      const countryCode = this.extractCountryCode(validatedData.phoneNumber);
      
      // Get primary provider config
      const providerConfig = await this.getProviderForCountry(eventId, countryCode);
      
      // Create delivery log entry
      const deliveryLog: InsertSmsDeliveryLog = {
        id: logId,
        eventId,
        guestId: validatedData.guestId,
        templateId,
        providerId: providerConfig.id,
        phoneNumber: validatedData.phoneNumber,
        countryCode,
        content,
        status: 'pending',
        segments: Math.ceil(content.length / 160),
        metadata: {
          priority: validatedData.priority,
          scheduledAt: validatedData.scheduledAt
        }
      };

      // Insert log entry
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO sms_delivery_logs (
          id, event_id, guest_id, template_id, provider_id, phone_number, 
          country_code, content, status, segments, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          deliveryLog.id, deliveryLog.eventId, deliveryLog.guestId, 
          deliveryLog.templateId, deliveryLog.providerId, deliveryLog.phoneNumber,
          deliveryLog.countryCode, deliveryLog.content, deliveryLog.status,
          deliveryLog.segments, JSON.stringify(deliveryLog.metadata)
        ]
      );

      // Send SMS
      const result = await this.attemptSend(validatedData.phoneNumber, content, {
        priority: validatedData.priority
      });

      // Update delivery log
      await this.updateDeliveryLog(logId, result);

      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('sms_send_duration_ms', duration, {
        provider: result.success ? this.primaryProvider?.name || 'unknown' : 'failed',
        status: result.success ? 'success' : 'failed'
      });

      // Return updated log
      const updatedLog = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM sms_delivery_logs WHERE id = $1`,
        [logId]
      );

      return updatedLog[0];
      
    } catch (error) {
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('sms_send_duration_ms', duration, {
        provider: 'failed',
        status: 'error'
      });

      console.error('❌ SMS send failed:', error);
      
      // Update log with error if exists
      if (logId) {
        await this.updateDeliveryLog(logId, {
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      throw error;
    }
  }

  // Send bulk SMS
  async sendBulkSms(eventId: number, data: z.infer<typeof BulkSmsSchema>): Promise<SmsDeliveryLog[]> {
    const validatedData = BulkSmsSchema.parse(data);
    const template = await this.getTemplate(validatedData.templateId);
    const results: SmsDeliveryLog[] = [];

    // Process in batches to respect rate limits
    const batchSize = 100;
    for (let i = 0; i < validatedData.recipients.length; i += batchSize) {
      const batch = validatedData.recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        const content = await this.renderTemplate(template, recipient.templateVariables || {});
        
        return this.sendSms(eventId, {
          phoneNumber: recipient.phoneNumber,
          content,
          templateId: validatedData.templateId,
          guestId: recipient.guestId,
          scheduledAt: validatedData.scheduledAt
        });
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });

      // Rate limiting between batches
      if (i + batchSize < validatedData.recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  // Attempt to send SMS with fallback
  private async attemptSend(phoneNumber: string, content: string, options: any = {}): Promise<SmsResult> {
    // Try primary provider first
    if (this.primaryProvider) {
      const result = await this.primaryProvider.sendSms(phoneNumber, content, options);
      if (result.success) {
        return result;
      }
      
      console.warn(`Primary SMS provider failed: ${result.errorMessage}`);
    }

    // Fallback to backup provider
    if (this.backupProvider) {
      console.log('Attempting SMS send with backup provider...');
      const result = await this.backupProvider.sendSms(phoneNumber, content, options);
      if (result.success) {
        return result;
      }
      
      console.error(`Backup SMS provider also failed: ${result.errorMessage}`);
    }

    throw new Error('All SMS providers failed');
  }

  // Template rendering
  private async renderTemplate(template: SmsTemplate, variables: TemplateVariables): Promise<string> {
    let content = template.content;
    
    // Replace template variables
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      content = content.replace(placeholder, String(value));
    });

    // Handle missing variables
    const missingVariables = content.match(/{{\s*\w+\s*}}/g);
    if (missingVariables) {
      console.warn(`Missing template variables: ${missingVariables.join(', ')}`);
      // Remove unfilled placeholders
      content = content.replace(/{{\s*\w+\s*}}/g, '');
    }

    return content.trim();
  }

  // Utility methods
  private extractCountryCode(phoneNumber: string): string {
    // Simple country code extraction - in production, use a proper library
    if (phoneNumber.startsWith('+1')) return 'US';
    if (phoneNumber.startsWith('+91')) return 'IN';
    if (phoneNumber.startsWith('+44')) return 'GB';
    return 'UNKNOWN';
  }

  private async checkOptOutStatus(eventId: number, phoneNumber: string): Promise<boolean> {
    const optOuts = await schemaValidationService.executeOptimizedQuery(
      this.db,
      `SELECT id FROM sms_opt_outs WHERE event_id = $1 AND phone_number = $2 AND is_active = true`,
      [eventId, phoneNumber]
    );
    
    return optOuts.length > 0;
  }

  private async getTemplate(templateId: number): Promise<SmsTemplate> {
    const templates = await schemaValidationService.executeOptimizedQuery(
      this.db,
      `SELECT * FROM sms_templates WHERE id = $1 AND is_active = true`,
      [templateId]
    );
    
    if (templates.length === 0) {
      throw new Error(`SMS template not found: ${templateId}`);
    }
    
    return templates[0];
  }

  private async getProviderForCountry(eventId: number, countryCode: string): Promise<SmsProviderConfig> {
    const providers = await schemaValidationService.executeOptimizedQuery(
      this.db,
      `SELECT * FROM sms_provider_configs 
       WHERE event_id = $1 AND is_active = true 
       AND (supported_countries::jsonb ? $2 OR supported_countries = '[]'::jsonb)
       ORDER BY provider_type ASC LIMIT 1`,
      [eventId, countryCode]
    );
    
    if (providers.length === 0) {
      throw new Error(`No SMS provider available for country: ${countryCode}`);
    }
    
    return providers[0];
  }

  private async updateDeliveryLog(logId: string, result: SmsResult): Promise<void> {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (result.success) {
      updateFields.push(`status = $${paramIndex++}`, `sent_at = NOW()`);
      updateValues.push('sent');
      
      if (result.providerMessageId) {
        updateFields.push(`provider_message_id = $${paramIndex++}`);
        updateValues.push(result.providerMessageId);
      }
      
      if (result.cost) {
        updateFields.push(`cost = $${paramIndex++}`);
        updateValues.push(result.cost);
      }
    } else {
      updateFields.push(`status = $${paramIndex++}`, `failed_at = NOW()`);
      updateValues.push('failed');
      
      if (result.errorCode) {
        updateFields.push(`error_code = $${paramIndex++}`);
        updateValues.push(result.errorCode);
      }
      
      if (result.errorMessage) {
        updateFields.push(`error_message = $${paramIndex++}`);
        updateValues.push(result.errorMessage);
      }
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(logId);

    await schemaValidationService.executeOptimizedQuery(
      this.db,
      `UPDATE sms_delivery_logs SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
      updateValues
    );
  }

  // Analytics methods
  async getDeliveryStats(eventId: number, dateRange?: { start: string; end: string }): Promise<any> {
    let whereClause = 'WHERE event_id = $1';
    const params = [eventId];
    
    if (dateRange) {
      whereClause += ' AND created_at BETWEEN $2 AND $3';
      params.push(dateRange.start, dateRange.end);
    }

    return await schemaValidationService.executeOptimizedQuery(
      this.db,
      `SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        SUM(COALESCE(cost, 0)) as total_cost,
        AVG(CASE 
          WHEN delivered_at IS NOT NULL AND sent_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (delivered_at - sent_at))
        END) as avg_delivery_time
       FROM sms_delivery_logs ${whereClause}`,
      params
    );
  }

  // Provider configuration management
  async createProviderConfig(configData: any): Promise<SmsProviderConfig> {
    try {
      const config = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO sms_provider_configs 
         (event_id, provider_name, provider_type, configuration, supported_countries, webhook_url, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
        [
          configData.eventId,
          configData.providerName,
          configData.providerType,
          JSON.stringify(configData.configuration),
          JSON.stringify(configData.supportedCountries || []),
          configData.webhookUrl,
          configData.isActive
        ]
      );

      console.log(`✅ SMS provider config created: ${configData.providerName} for event ${configData.eventId}`);
      return config[0];
    } catch (error) {
      console.error('❌ Failed to create SMS provider config:', error);
      throw error;
    }
  }

  async getProviderConfigs(eventId: number): Promise<SmsProviderConfig[]> {
    return await schemaValidationService.executeOptimizedQuery(
      this.db,
      `SELECT * FROM sms_provider_configs WHERE event_id = $1 ORDER BY provider_type, created_at`,
      [eventId]
    );
  }

  async updateProviderConfig(configId: number, updates: any): Promise<void> {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updates.configuration) {
      updateFields.push(`configuration = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updates.configuration));
    }

    if (updates.supportedCountries) {
      updateFields.push(`supported_countries = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updates.supportedCountries));
    }

    if (updates.webhookUrl !== undefined) {
      updateFields.push(`webhook_url = $${paramIndex++}`);
      updateValues.push(updates.webhookUrl);
    }

    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(updates.isActive);
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(configId);

    await schemaValidationService.executeOptimizedQuery(
      this.db,
      `UPDATE sms_provider_configs SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
      updateValues
    );
  }

  async deleteProviderConfig(configId: number): Promise<void> {
    await schemaValidationService.executeOptimizedQuery(
      this.db,
      `UPDATE sms_provider_configs SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [configId]
    );
  }

  // Opt-out management
  async addOptOut(optOutData: any): Promise<any> {
    try {
      const optOut = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO sms_opt_outs 
         (event_id, phone_number, country_code, guest_id, reason, opt_out_method, is_active, opted_out_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW()) RETURNING *`,
        [
          optOutData.eventId,
          optOutData.phoneNumber,
          this.extractCountryCode(optOutData.phoneNumber),
          optOutData.guestId,
          optOutData.reason,
          optOutData.optOutMethod
        ]
      );

      console.log(`✅ Phone number opted out: ${optOutData.phoneNumber}`);
      return optOut[0];
    } catch (error) {
      console.error('❌ Failed to add opt-out:', error);
      throw error;
    }
  }

  async removeOptOut(eventId: number, phoneNumber: string): Promise<void> {
    await schemaValidationService.executeOptimizedQuery(
      this.db,
      `UPDATE sms_opt_outs 
       SET is_active = false, opted_back_in_at = NOW() 
       WHERE event_id = $1 AND phone_number = $2 AND is_active = true`,
      [eventId, phoneNumber]
    );

    console.log(`✅ Phone number opted back in: ${phoneNumber}`);
  }

  async getOptOuts(eventId: number): Promise<any[]> {
    return await schemaValidationService.executeOptimizedQuery(
      this.db,
      `SELECT * FROM sms_opt_outs WHERE event_id = $1 AND is_active = true ORDER BY opted_out_at DESC`,
      [eventId]
    );
  }

  // Template management
  async createTemplate(eventId: number, templateData: any): Promise<SmsTemplate> {
    const template = await schemaValidationService.executeOptimizedQuery(
      this.db,
      `INSERT INTO sms_templates (event_id, name, category, content, variables, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        eventId,
        templateData.name,
        templateData.category,
        templateData.content,
        JSON.stringify(templateData.variables || []),
        templateData.createdBy
      ]
    );

    return template[0];
  }

  async getTemplates(eventId: number): Promise<SmsTemplate[]> {
    return await schemaValidationService.executeOptimizedQuery(
      this.db,
      `SELECT * FROM sms_templates WHERE event_id = $1 AND is_active = true ORDER BY name`,
      [eventId]
    );
  }

  // Webhook handling for delivery status
  async handleDeliveryWebhook(provider: string, payload: any): Promise<void> {
    try {
      let messageId: string;
      let status: string;
      let timestamp: Date = new Date();

      if (provider === 'twilio') {
        messageId = payload.MessageSid;
        status = this.mapTwilioStatus(payload.MessageStatus);
      } else if (provider === 'aws_sns') {
        // AWS SNS webhook format would be different
        messageId = payload.messageId;
        status = payload.status;
      } else {
        throw new Error(`Unknown webhook provider: ${provider}`);
      }

      // Update delivery log
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `UPDATE sms_delivery_logs 
         SET status = $1, delivered_at = $2, webhook_data = $3, updated_at = NOW()
         WHERE provider_message_id = $4`,
        [status, timestamp, JSON.stringify(payload), messageId]
      );

      console.log(`✅ Updated SMS delivery status: ${messageId} -> ${status}`);
    } catch (error) {
      console.error('❌ Failed to handle delivery webhook:', error);
    }
  }

  private mapTwilioStatus(twilioStatus: string): string {
    const statusMap: Record<string, string> = {
      'delivered': 'delivered',
      'failed': 'failed',
      'undelivered': 'undelivered',
      'sent': 'sent',
      'received': 'delivered'
    };
    
    return statusMap[twilioStatus] || 'pending';
  }
}

// Export singleton instance
let smsService: SmsService | null = null;

export function initializeSmsService(db: DatabaseConnection): SmsService {
  if (!smsService) {
    smsService = new SmsService(db);
    console.log('✅ SMS service initialized');
  }
  return smsService;
}

export function getSmsService(): SmsService {
  if (!smsService) {
    throw new Error('SMS service not initialized');
  }
  return smsService;
}

export async function cleanupSmsService(): Promise<void> {
  if (smsService) {
    smsService = null;
    console.log('✅ SMS service cleaned up');
  }
}

// Export types and schemas
export { SendSmsSchema, BulkSmsSchema };
export type { SmsResult, DeliveryStatus, TemplateVariables };