import { Request, Response } from 'express';
import { CommunicationService } from '../../services/communication-service';
import { ResponseBuilder } from '../../lib/response-builder';

const communicationService = new CommunicationService();

export async function getProviderStatus(req: Request, res: Response): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    
    if (isNaN(eventId)) {
      return ResponseBuilder.badRequest(res, 'Invalid event ID');
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
    const result = await communicationService.getProviderStatus(eventId, context);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data, 'Provider status retrieved successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to retrieve provider status', result.error);
    }
  } catch (error) {
    throw error;
  }
}