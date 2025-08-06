import { Request, Response } from 'express';
import { EventService } from '../../services/event-service';
import { ResponseBuilder } from '../../lib/response-builder';

const eventService = new EventService();

export async function deleteEvent(req: Request, res: Response): Promise<void> {
  try {
    // Event ID is validated by middleware and available in context
    const eventId = (req as any).context.eventId;
    
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
    const result = await eventService.deleteEvent(eventId, context);
    
    if (result.success) {
      ResponseBuilder.ok(res, { 
        message: 'Event and all related data successfully deleted',
        eventId 
      });
    } else {
      ResponseBuilder.internalError(res, 'Failed to delete event', result.error);
    }
  } catch (error) {
    throw error;
  }
}