import { Request, Response } from 'express';
import { CeremonyService } from '../../services/ceremony-service';
import { ResponseBuilder } from '../../lib/response-builder';

const ceremonyService = new CeremonyService();

export async function listCeremonies(req: Request, res: Response): Promise<void> {
  try {
    // Event ID is validated by middleware and available in context
    const eventId = (req as any).context.eventId;
    
    // Extract query parameters for filtering and pagination
    const {
      page = 1,
      limit = 50,
      sort = 'date',
      order = 'asc',
      includeStats = false,
      includeAttendance = false
    } = req.query;

    // Build options object
    const options = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sort: sort as string,
      order: order as 'asc' | 'desc',
      includeStats: includeStats === 'true',
      includeAttendance: includeAttendance === 'true'
    };

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
    const result = await ceremonyService.getCeremoniesByEvent(eventId, context, options);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data);
    } else {
      ResponseBuilder.internalError(res, 'Failed to fetch ceremonies', result.error);
    }
  } catch (error) {
    throw error;
  }
}