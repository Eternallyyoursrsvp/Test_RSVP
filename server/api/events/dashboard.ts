import { Request, Response } from 'express';
import { EventService } from '../../services/event-service';
import { ResponseBuilder } from '../../lib/response-builder';

const eventService = new EventService();

export async function getDashboardData(req: Request, res: Response): Promise<void> {
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
    const result = await eventService.getDashboardData(eventId, context);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data);
    } else {
      ResponseBuilder.internalError(res, 'Failed to fetch dashboard data', result.error);
    }
  } catch (error) {
    throw error;
  }
}