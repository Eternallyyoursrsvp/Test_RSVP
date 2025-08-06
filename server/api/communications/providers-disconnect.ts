import { Request, Response } from 'express';
import { CommunicationService } from '../../services/communication-service';
import { ResponseBuilder } from '../../lib/response-builder';

const communicationService = new CommunicationService();

export async function disconnectProvider(req: Request, res: Response): Promise<void> {
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
    const result = await communicationService.disconnectProvider(eventId, providerType, context);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data, 'Provider disconnected successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to disconnect provider', result.error);
    }
  } catch (error) {
    throw error;
  }
}