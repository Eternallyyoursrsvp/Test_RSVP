import { Request, Response } from 'express';
import { EventService } from '../../services/event-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { insertWeddingEventSchema } from '@shared/schema';

const eventService = new EventService();

export async function updateEvent(req: Request, res: Response): Promise<void> {
  try {
    // Event ID is validated by middleware and available in context
    const eventId = (req as any).context.eventId;
    
    // Validate request body for partial updates
    const updateData = insertWeddingEventSchema.partial().parse(req.body);
    
    // If no update data provided, return current event
    if (Object.keys(updateData).length === 0) {
      const context = {
        userId: (req.user as any).id,
        userRole: (req.user as any).role,
        eventId,
        requestId: req.headers['x-request-id'] as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const result = await eventService.getEventById(eventId, context);
      if (result.success && result.data) {
        return ResponseBuilder.ok(res, result.data);
      }
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
    const result = await eventService.updateEvent(eventId, updateData, context);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data, 'Event updated successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to update event', result.error);
    }
  } catch (error) {
    throw error;
  }
}