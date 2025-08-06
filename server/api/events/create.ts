import { Request, Response } from 'express';
import { EventService } from '../../services/event-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { insertWeddingEventSchema } from '@shared/schema';

const eventService = new EventService();

export async function createEvent(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const eventData = insertWeddingEventSchema.parse(req.body);
    
    // Create service context
    const context = {
      userId: (req.user as any).id,
      userRole: (req.user as any).role,
      requestId: req.headers['x-request-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Call service method
    const result = await eventService.createEvent(eventData, context);
    
    if (result.success && result.data) {
      ResponseBuilder.created(res, result.data, 'Event created successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to create event', result.error);
    }
  } catch (error) {
    // Error will be handled by global error handler
    throw error;
  }
}