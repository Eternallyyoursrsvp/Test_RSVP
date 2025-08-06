import { BaseService, ServiceContext, ServiceResult, createServiceResult } from './base-service';
import { NotFoundError, ValidationError, ConflictError } from '../lib/response-builder';

export interface CoupleMessage {
  id: number;
  eventId: number;
  guestId: number | null;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppTemplate {
  id: number;
  eventId: number;
  category: string;
  name: string;
  content: string;
  variables: string[] | null;
  isUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationTemplate {
  id: number;
  eventId: number | null;
  categoryId: string;
  templateId: string;
  channel: string;
  name: string;
  description: string | null;
  subject: string | null;
  content: string;
  variables: string[] | null;
  tags: string[] | null;
  enabled: boolean;
  isSystem: boolean;
  sortOrder: number;
  conditionalOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandAsset {
  id: number;
  eventId: number;
  name: string;
  type: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface BrandSettings {
  id: number;
  eventId: number;
  primaryColor: string | null;
  accentColor: string | null;
  headingFont: string | null;
  bodyFont: string | null;
  templateStyle: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderStatus {
  gmail: {
    connected: boolean;
    type: string;
    account: string | null;
  };
  outlook: {
    connected: boolean;
    type: string;
    account: string | null;
  };
  brevo: {
    connected: boolean;
    type: string;
    account: string;
    usingDemo: boolean;
  };
  sendgrid: {
    connected: boolean;
    type: string;
    account: string | null;
  };
  twilio: {
    connected: boolean;
    type: string;
    account: string | null;
  };
  whatsapp_business: {
    connected: boolean;
    type: string;
    account: string | null;
  };
  whatsapp_webjs: {
    connected: boolean;
    type: string;
    configured: boolean;
    qrCode: string | null;
    error: string | null;
  };
}

export interface CommunicationListOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  category?: string;
  channel?: string;
  enabled?: boolean;
}

export interface TemplatePreviewRequest {
  content: string;
  subject?: string;
}

export interface ProviderConfig {
  provider: string;
  config: Record<string, any>;
}

export class CommunicationService extends BaseService {

  // Get couple messages for an event
  async getCoupleMessages(
    eventId: number,
    context: ServiceContext,
    options: CommunicationListOptions = {}
  ): Promise<ServiceResult<any>> {
    try {
      const { page = 1, limit = 50, sort = 'createdAt', order = 'desc' } = options;
      const { offset } = this.validatePagination(page, limit);

      this.logOperation('getCoupleMessages', 'couple_messages', eventId, { context, options });

      // Validate event access
      await this.validateEventAccess(eventId, context.userId, context.userRole);

      // Get messages with guest information
      let messages = await this.storage.getCoupleMessagesByEvent(eventId);

      // Apply sorting
      messages.sort((a, b) => {
        let aValue: any, bValue: any;
        switch (sort) {
          case 'message':
            aValue = a.message || '';
            bValue = b.message || '';
            break;
          case 'guestName':
            aValue = a.guestName || '';
            bValue = b.guestName || '';
            break;
          case 'createdAt':
          default:
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            break;
        }

        if (order === 'desc') {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
      });

      // Apply pagination
      const total = messages.length;
      const paginatedMessages = messages.slice(offset, offset + limit);

      const result = this.formatPaginationResponse(paginatedMessages, page, limit, total);

      return createServiceResult(true, result, undefined, {
        operation: 'getCoupleMessages',
        resourceType: 'couple_messages',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('getCoupleMessages', error as Error, { context, eventId, options });
      throw error;
    }
  }

  // Create couple message
  async createCoupleMessage(
    messageData: { eventId: number; guestId?: number; message: string },
    context: ServiceContext
  ): Promise<ServiceResult<CoupleMessage>> {
    try {
      this.logOperation('createCoupleMessage', 'couple_message', undefined, { context });

      // Validate required fields
      this.validateRequired(messageData.eventId, 'eventId');
      this.validateRequired(messageData.message, 'message');

      // Validate event access
      await this.validateEventAccess(messageData.eventId, context.userId, context.userRole);

      // Validate guest if provided
      if (messageData.guestId) {
        const guest = await this.storage.getGuest(messageData.guestId);
        if (!guest || guest.eventId !== messageData.eventId) {
          this.handleValidation('Guest not found or does not belong to this event');
        }
      }

      const message = await this.storage.createCoupleMessage(messageData);

      await this.auditLog('CREATE', 'couple_message', message.id, context.userId, {
        eventId: message.eventId,
        guestId: message.guestId,
        messageLength: message.message.length
      });

      return createServiceResult(true, message, undefined, {
        operation: 'createCoupleMessage',
        resourceType: 'couple_message',
        resourceId: message.id
      });

    } catch (error) {
      this.logError('createCoupleMessage', error as Error, { context, eventId: messageData.eventId });
      throw error;
    }
  }

  // Get WhatsApp templates for an event
  async getWhatsAppTemplates(
    eventId: number,
    context: ServiceContext,
    category?: string
  ): Promise<ServiceResult<WhatsAppTemplate[]>> {
    try {
      this.logOperation('getWhatsAppTemplates', 'whatsapp_templates', eventId, { context, category });

      // Validate event access
      await this.validateEventAccess(eventId, context.userId, context.userRole);

      let templates;
      if (category) {
        templates = await this.storage.getWhatsappTemplatesByCategory(eventId, category);
      } else {
        templates = await this.storage.getWhatsappTemplatesByEvent(eventId);
      }

      return createServiceResult(true, templates, undefined, {
        operation: 'getWhatsAppTemplates',
        resourceType: 'whatsapp_templates',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('getWhatsAppTemplates', error as Error, { context, eventId, category });
      throw error;
    }
  }

  // Get WhatsApp template by ID
  async getWhatsAppTemplateById(
    templateId: number,
    context: ServiceContext
  ): Promise<ServiceResult<WhatsAppTemplate>> {
    try {
      this.logOperation('getWhatsAppTemplateById', 'whatsapp_template', templateId, { context });

      const template = await this.storage.getWhatsappTemplate(templateId);
      if (!template) {
        this.handleNotFound('WhatsApp template', templateId);
      }

      // Validate event access
      await this.validateEventAccess(template.eventId, context.userId, context.userRole);

      return createServiceResult(true, template, undefined, {
        operation: 'getWhatsAppTemplateById',
        resourceType: 'whatsapp_template',
        resourceId: templateId
      });

    } catch (error) {
      this.logError('getWhatsAppTemplateById', error as Error, { context, templateId });
      throw error;
    }
  }

  // Create WhatsApp template
  async createWhatsAppTemplate(
    templateData: any,
    context: ServiceContext
  ): Promise<ServiceResult<WhatsAppTemplate>> {
    try {
      this.logOperation('createWhatsAppTemplate', 'whatsapp_template', undefined, { context });

      // Validate event access
      await this.validateEventAccess(templateData.eventId, context.userId, context.userRole);

      const template = await this.storage.createWhatsappTemplate(templateData);

      await this.auditLog('CREATE', 'whatsapp_template', template.id, context.userId, {
        eventId: template.eventId,
        category: template.category,
        name: template.name
      });

      return createServiceResult(true, template, undefined, {
        operation: 'createWhatsAppTemplate',
        resourceType: 'whatsapp_template',
        resourceId: template.id
      });

    } catch (error) {
      this.logError('createWhatsAppTemplate', error as Error, { context, eventId: templateData.eventId });
      throw error;
    }
  }

  // Update WhatsApp template
  async updateWhatsAppTemplate(
    templateId: number,
    updateData: any,
    context: ServiceContext
  ): Promise<ServiceResult<WhatsAppTemplate>> {
    try {
      this.logOperation('updateWhatsAppTemplate', 'whatsapp_template', templateId, { context });

      // Get existing template
      const existingTemplate = await this.storage.getWhatsappTemplate(templateId);
      if (!existingTemplate) {
        this.handleNotFound('WhatsApp template', templateId);
      }

      // Validate event access
      await this.validateEventAccess(existingTemplate.eventId, context.userId, context.userRole);

      const updatedTemplate = await this.storage.updateWhatsappTemplate(templateId, updateData);

      await this.auditLog('UPDATE', 'whatsapp_template', templateId, context.userId, {
        eventId: existingTemplate.eventId,
        changes: Object.keys(updateData)
      });

      return createServiceResult(true, updatedTemplate, undefined, {
        operation: 'updateWhatsAppTemplate',
        resourceType: 'whatsapp_template',
        resourceId: templateId
      });

    } catch (error) {
      this.logError('updateWhatsAppTemplate', error as Error, { context, templateId });
      throw error;
    }
  }

  // Delete WhatsApp template
  async deleteWhatsAppTemplate(
    templateId: number,
    context: ServiceContext
  ): Promise<ServiceResult<void>> {
    try {
      this.logOperation('deleteWhatsAppTemplate', 'whatsapp_template', templateId, { context });

      // Get existing template
      const existingTemplate = await this.storage.getWhatsappTemplate(templateId);
      if (!existingTemplate) {
        this.handleNotFound('WhatsApp template', templateId);
      }

      // Validate event access
      await this.validateEventAccess(existingTemplate.eventId, context.userId, context.userRole);

      const success = await this.storage.deleteWhatsappTemplate(templateId);
      if (!success) {
        throw new Error('Failed to delete WhatsApp template');
      }

      await this.auditLog('DELETE', 'whatsapp_template', templateId, context.userId, {
        eventId: existingTemplate.eventId,
        name: existingTemplate.name,
        category: existingTemplate.category
      });

      return createServiceResult(true, undefined, undefined, {
        operation: 'deleteWhatsAppTemplate',
        resourceType: 'whatsapp_template',
        resourceId: templateId
      });

    } catch (error) {
      this.logError('deleteWhatsAppTemplate', error as Error, { context, templateId });
      throw error;
    }
  }

  // Mark WhatsApp template as used
  async markWhatsAppTemplateAsUsed(
    templateId: number,
    context: ServiceContext
  ): Promise<ServiceResult<WhatsAppTemplate>> {
    try {
      this.logOperation('markWhatsAppTemplateAsUsed', 'whatsapp_template', templateId, { context });

      // Get existing template
      const existingTemplate = await this.storage.getWhatsappTemplate(templateId);
      if (!existingTemplate) {
        this.handleNotFound('WhatsApp template', templateId);
      }

      // Validate event access
      await this.validateEventAccess(existingTemplate.eventId, context.userId, context.userRole);

      const updatedTemplate = await this.storage.markWhatsappTemplateAsUsed(templateId);

      await this.auditLog('UPDATE', 'whatsapp_template', templateId, context.userId, {
        eventId: existingTemplate.eventId,
        action: 'marked_as_used'
      });

      return createServiceResult(true, updatedTemplate, undefined, {
        operation: 'markWhatsAppTemplateAsUsed',
        resourceType: 'whatsapp_template',
        resourceId: templateId
      });

    } catch (error) {
      this.logError('markWhatsAppTemplateAsUsed', error as Error, { context, templateId });
      throw error;
    }
  }

  // Test email functionality
  async testEmail(
    eventId: number,
    email: string,
    context: ServiceContext
  ): Promise<ServiceResult<{ success: boolean; message: string }>> {
    try {
      this.logOperation('testEmail', 'email_test', eventId, { context, email });

      // Validate event access
      await this.validateEventAccess(eventId, context.userId, context.userRole);

      // Validate email format
      this.validateEmail(email);

      // Get event details
      const event = await this.storage.getEvent(eventId);
      if (!event) {
        this.handleNotFound('Event', eventId);
      }

      // TODO: Implement actual email sending logic using EmailService
      // For now, simulate success
      const testResult = {
        success: true,
        message: `Test email would be sent to ${email} for event: ${event.title}`
      };

      await this.auditLog('TEST', 'email', eventId, context.userId, {
        testEmail: email,
        result: 'success'
      });

      return createServiceResult(true, testResult, undefined, {
        operation: 'testEmail',
        resourceType: 'email_test',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('testEmail', error as Error, { context, eventId, email });
      throw error;
    }
  }

  // Get provider status for an event
  async getProviderStatus(
    eventId: number,
    context: ServiceContext
  ): Promise<ServiceResult<ProviderStatus>> {
    try {
      this.logOperation('getProviderStatus', 'provider_status', eventId, { context });

      // Validate event access
      await this.validateEventAccess(eventId, context.userId, context.userRole);

      // Get event details to check provider configurations
      const event = await this.storage.getEvent(eventId);
      if (!event) {
        this.handleNotFound('Event', eventId);
      }

      // Build provider status object
      const providers: ProviderStatus = {
        gmail: {
          connected: !!(event.useGmail && event.gmailAccount),
          type: 'email',
          account: event.gmailAccount || null
        },
        outlook: {
          connected: !!(event.useOutlook && event.outlookAccount),
          type: 'email',
          account: event.outlookAccount || null
        },
        brevo: {
          connected: !!(event.brevoApiKey || process.env.BREVO_API_KEY),
          type: 'email',
          account: event.brevoApiKey ? 'User API Key' : 'Demo Account',
          usingDemo: !event.brevoApiKey && !!process.env.BREVO_API_KEY
        },
        sendgrid: {
          connected: !!(event.useSendGrid && event.sendgridApiKey),
          type: 'email',
          account: event.sendgridApiKey ? 'Configured' : null
        },
        twilio: {
          connected: !!(event.twilioAccountSid && event.twilioAuthToken),
          type: 'sms',
          account: event.twilioPhoneNumber || null
        },
        whatsapp_business: {
          connected: !!(event.whatsappConfigured && event.whatsappAccessToken),
          type: 'whatsapp',
          account: event.whatsappPhoneNumberId || null
        },
        whatsapp_webjs: {
          connected: false, // TODO: Check actual WhatsApp Web.js connection status
          type: 'whatsapp',
          configured: !!event.whatsappConfigured,
          qrCode: null, // TODO: Get QR code if available
          error: null
        }
      };

      return createServiceResult(true, providers, undefined, {
        operation: 'getProviderStatus',
        resourceType: 'provider_status',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('getProviderStatus', error as Error, { context, eventId });
      throw error;
    }
  }

  // Configure provider for an event
  async configureProvider(
    eventId: number,
    providerType: string,
    config: Record<string, any>,
    context: ServiceContext
  ): Promise<ServiceResult<{ success: boolean; message: string }>> {
    try {
      this.logOperation('configureProvider', 'provider_config', eventId, { context, providerType });

      // Validate event access
      await this.validateEventAccess(eventId, context.userId, context.userRole);

      // Build update data based on provider type
      let updateData: any = {};
      let validationResult = { success: true, message: '' };

      switch (providerType) {
        case 'gmail':
          this.validateRequired(config.email, 'email');
          this.validateRequired(config.password, 'password');
          this.validateEmail(config.email);
          updateData = {
            useGmail: true,
            gmailAccount: config.email,
            gmailPassword: config.password,
            emailConfigured: true
          };
          validationResult.message = 'Gmail configured successfully';
          break;

        case 'outlook':
          this.validateRequired(config.email, 'email');
          this.validateRequired(config.password, 'password');
          this.validateEmail(config.email);
          updateData = {
            useOutlook: true,
            outlookAccount: config.email,
            outlookAccessToken: config.password,
            emailConfigured: true
          };
          validationResult.message = 'Outlook configured successfully';
          break;

        case 'brevo':
          this.validateRequired(config.apiKey, 'apiKey');
          updateData = {
            brevoApiKey: config.apiKey,
            emailConfigured: true
          };
          validationResult.message = 'Brevo configured successfully';
          break;

        case 'sendgrid':
          this.validateRequired(config.apiKey, 'apiKey');
          updateData = {
            useSendGrid: true,
            sendgridApiKey: config.apiKey,
            emailConfigured: true
          };
          validationResult.message = 'SendGrid configured successfully';
          break;

        case 'twilio':
          this.validateRequired(config.accountSid, 'accountSid');
          this.validateRequired(config.authToken, 'authToken');
          this.validateRequired(config.phoneNumber, 'phoneNumber');
          updateData = {
            twilioAccountSid: config.accountSid,
            twilioAuthToken: config.authToken,
            twilioPhoneNumber: config.phoneNumber
          };
          validationResult.message = 'Twilio configured successfully';
          break;

        case 'whatsapp_business':
          this.validateRequired(config.accessToken, 'accessToken');
          this.validateRequired(config.phoneNumberId, 'phoneNumberId');
          this.validateRequired(config.businessAccountId, 'businessAccountId');
          updateData = {
            whatsappConfigured: true,
            whatsappAccessToken: config.accessToken,
            whatsappPhoneNumberId: config.phoneNumberId,
            whatsappBusinessAccountId: config.businessAccountId
          };
          validationResult.message = 'WhatsApp Business API configured successfully';
          break;

        case 'whatsapp_webjs':
          updateData = {
            whatsappConfigured: config.enabled || true
          };
          validationResult.message = 'WhatsApp Web.js enabled successfully';
          break;

        default:
          this.handleValidation(`Unsupported provider type: ${providerType}`);
      }

      // Update event with provider configuration
      const updatedEvent = await this.storage.updateEvent(eventId, updateData);
      if (!updatedEvent) {
        throw new Error('Failed to update event with provider configuration');
      }

      await this.auditLog('UPDATE', 'provider_config', eventId, context.userId, {
        providerType,
        action: 'configured',
        configFields: Object.keys(config).filter(key => key !== 'password' && key !== 'apiKey' && key !== 'authToken')
      });

      return createServiceResult(true, validationResult, undefined, {
        operation: 'configureProvider',
        resourceType: 'provider_config',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('configureProvider', error as Error, { context, eventId, providerType });
      throw error;
    }
  }

  // Disconnect provider for an event
  async disconnectProvider(
    eventId: number,
    providerType: string,
    context: ServiceContext
  ): Promise<ServiceResult<{ success: boolean; message: string }>> {
    try {
      this.logOperation('disconnectProvider', 'provider_disconnect', eventId, { context, providerType });

      // Validate event access
      await this.validateEventAccess(eventId, context.userId, context.userRole);

      // Build update data based on provider type
      let updateData: any = {};

      switch (providerType) {
        case 'gmail':
          updateData = {
            useGmail: false,
            gmailAccount: null,
            gmailPassword: null
          };
          break;
        case 'outlook':
          updateData = {
            useOutlook: false,
            outlookAccount: null,
            outlookAccessToken: null
          };
          break;
        case 'brevo':
          updateData = {
            brevoApiKey: null
          };
          break;
        case 'sendgrid':
          updateData = {
            useSendGrid: false,
            sendgridApiKey: null
          };
          break;
        case 'twilio':
          updateData = {
            twilioAccountSid: null,
            twilioAuthToken: null,
            twilioPhoneNumber: null
          };
          break;
        case 'whatsapp_business':
          updateData = {
            whatsappAccessToken: null,
            whatsappPhoneNumberId: null,
            whatsappBusinessAccountId: null
          };
          break;
        case 'whatsapp_webjs':
          updateData = {
            whatsappConfigured: false
          };
          break;
        default:
          this.handleValidation(`Unsupported provider type: ${providerType}`);
      }

      // Update event
      const updatedEvent = await this.storage.updateEvent(eventId, updateData);
      if (!updatedEvent) {
        throw new Error('Failed to disconnect provider');
      }

      await this.auditLog('UPDATE', 'provider_disconnect', eventId, context.userId, {
        providerType,
        action: 'disconnected'
      });

      return createServiceResult(true, {
        success: true,
        message: `${providerType} disconnected successfully`
      }, undefined, {
        operation: 'disconnectProvider',
        resourceType: 'provider_disconnect',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('disconnectProvider', error as Error, { context, eventId, providerType });
      throw error;
    }
  }
}