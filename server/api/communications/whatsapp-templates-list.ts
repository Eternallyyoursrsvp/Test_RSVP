import { Request, Response } from 'express';
import { CommunicationService } from '../../services/communication-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const communicationService = new CommunicationService();

// Query parameters validation schema
const WhatsAppTemplatesQuerySchema = z.object({
  category: z.string().min(1).optional()
});

export async function getWhatsAppTemplates(req: Request, res: Response): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    
    if (isNaN(eventId)) {
      return ResponseBuilder.badRequest(res, 'Invalid event ID');
    }

    // Validate query parameters
    const validationResult = WhatsAppTemplatesQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid query parameters', validationResult.error.errors);
    }

    const { category } = validationResult.data;

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
    const result = await communicationService.getWhatsAppTemplates(eventId, context, category);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data, 'WhatsApp templates retrieved successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to retrieve WhatsApp templates', result.error);
    }
  } catch (error) {
    throw error;
  }
}