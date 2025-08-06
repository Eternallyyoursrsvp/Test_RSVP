import { Request, Response } from 'express';
import { CommunicationService } from '../../services/communication-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const communicationService = new CommunicationService();

// Query parameters validation schema
const CoupleMessagesQuerySchema = z.object({
  page: z.string().transform((val) => parseInt(val, 10)).refine((val) => val > 0, {
    message: 'Page must be a positive integer'
  }).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).refine((val) => val > 0 && val <= 100, {
    message: 'Limit must be between 1 and 100'
  }).optional(),
  sort: z.enum(['createdAt', 'message', 'guestName']).optional(),
  order: z.enum(['asc', 'desc']).optional()
});

export async function getCoupleMessages(req: Request, res: Response): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    
    if (isNaN(eventId)) {
      return ResponseBuilder.badRequest(res, 'Invalid event ID');
    }

    // Validate query parameters
    const validationResult = CoupleMessagesQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid query parameters', validationResult.error.errors);
    }

    const options = validationResult.data;

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
    const result = await communicationService.getCoupleMessages(eventId, context, options);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data, 'Couple messages retrieved successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to retrieve couple messages', result.error);
    }
  } catch (error) {
    throw error;
  }
}