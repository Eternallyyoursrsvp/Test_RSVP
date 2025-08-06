import { Request, Response } from 'express';
import { CommunicationService } from '../../services/communication-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const communicationService = new CommunicationService();

// Validation schema for provider configuration
const ProviderConfigSchema = z.object({
  // Gmail configuration
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
  
  // API key-based providers (Brevo, SendGrid)
  apiKey: z.string().min(1).optional(),
  
  // Twilio configuration
  accountSid: z.string().min(1).optional(),
  authToken: z.string().min(1).optional(),
  phoneNumber: z.string().min(1).optional(),
  
  // WhatsApp Business API configuration
  accessToken: z.string().min(1).optional(),
  phoneNumberId: z.string().min(1).optional(),
  businessAccountId: z.string().min(1).optional(),
  
  // WhatsApp Web.js configuration
  enabled: z.boolean().optional()
}).strict(); // Prevent unknown fields

export async function configureProvider(req: Request, res: Response): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const providerType = req.params.providerType;
    
    if (isNaN(eventId)) {
      return ResponseBuilder.badRequest(res, 'Invalid event ID');
    }
    
    if (!providerType) {
      return ResponseBuilder.badRequest(res, 'Provider type is required');
    }

    // Validate supported provider types
    const supportedProviders = ['gmail', 'outlook', 'brevo', 'sendgrid', 'twilio', 'whatsapp_business', 'whatsapp_webjs'];
    if (!supportedProviders.includes(providerType)) {
      return ResponseBuilder.badRequest(res, `Unsupported provider type: ${providerType}`);
    }
    
    // Validate request body
    const validationResult = ProviderConfigSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid provider configuration data', validationResult.error.errors);
    }

    const config = validationResult.data;

    // Create service context
    const context = {
      userId: (req.user as any).id,
      userRole: (req.user as any).role,
      eventId,
      requestId: req.headers['x-request-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Call service method
    const result = await communicationService.configureProvider(eventId, providerType, config, context);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data, 'Provider configured successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to configure provider', result.error);
    }
  } catch (error) {
    throw error;
  }
}