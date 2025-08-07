import { Request, Response } from 'express';
import { CeremonyService } from '../../services/ceremony-service';
import { ResponseBuilder } from '../../lib/response-builder';

const ceremonyService = new CeremonyService();

export async function getCeremonyStats(req: Request, res: Response): Promise<void> {
  try {
    const ceremonyId = parseInt(req.params.id, 10);
    
    if (isNaN(ceremonyId)) {
      ResponseBuilder.badRequest(res, 'Invalid ceremony ID');
      return;
    }
    
    // Create service context
    const context = {
      userId: (req.user as any).id,
      userRole: (req.user as any).role,
      eventId: undefined, // Will be validated by service based on ceremony's event
      requestId: req.headers['x-request-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Call service method
    const result = await ceremonyService.getCeremonyStats(ceremonyId, context);
    
    if (result.success && result.data) {
      // Format the response with additional calculated fields
      const stats = {
        ...result.data,
        // Add percentage breakdowns
        attendingPercentage: result.data.totalGuests > 0 ? (result.data.attending / result.data.totalGuests) * 100 : 0,
        notAttendingPercentage: result.data.totalGuests > 0 ? (result.data.notAttending / result.data.totalGuests) * 100 : 0,
        pendingPercentage: result.data.totalGuests > 0 ? (result.data.pending / result.data.totalGuests) * 100 : 0,
        // Add meal selection percentage
        mealSelectionRate: result.data.attending > 0 ? (result.data.mealSelections.total / result.data.attending) * 100 : 0
      };
      
      ResponseBuilder.ok(res, stats);
    } else {
      ResponseBuilder.internalError(res, 'Failed to fetch ceremony statistics', result.error);
    }
  } catch (error) {
    throw error;
  }
}