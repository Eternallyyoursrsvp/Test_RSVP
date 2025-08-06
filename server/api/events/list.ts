import { Request, Response } from 'express';
import { EventService } from '../../services/event-service';
import { ResponseBuilder } from '../../lib/response-builder';

const eventService = new EventService();

export async function listEvents(req: Request, res: Response): Promise<void> {
  try {
    // Extract query parameters (already validated by middleware)
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query as any;
    const { search, status, startDate, endDate } = req.query as any;

    // Build filters
    const filters: any = {};
    if (search) filters.search = search;
    if (status) filters.status = status;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    // Create service context
    const context = {
      userId: (req.user as any).id,
      userRole: (req.user as any).role,
      requestId: req.headers['x-request-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Build options
    const options = {
      page: Number(page),
      limit: Number(limit),
      sort,
      order: order as 'asc' | 'desc',
      filters
    };

    // Call service method
    const result = await eventService.getEvents(context, options);
    
    if (result.success && result.data) {
      // Use paginated response format
      res.json(ResponseBuilder.paginated(
        result.data.data,
        result.data.pagination
      ));
    } else {
      ResponseBuilder.internalError(res, 'Failed to fetch events', result.error);
    }
  } catch (error) {
    throw error;
  }
}