import { Request, Response } from 'express';
import { CeremonyService } from '../../services/ceremony-service';
import { ResponseBuilder } from '../../lib/response-builder';

const ceremonyService = new CeremonyService();

export async function getCeremonyAttendance(req: Request, res: Response): Promise<void> {
  try {
    const ceremonyId = parseInt(req.params.id, 10);
    
    if (isNaN(ceremonyId)) {
      return ResponseBuilder.badRequest(res, 'Invalid ceremony ID');
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
    const result = await ceremonyService.getCeremonyAttendance(ceremonyId, context);
    
    if (result.success && result.data) {
      // Group attendance by status for easier frontend consumption
      const attendance = result.data;
      const grouped = {
        attending: attendance.filter(a => a.attending),
        notAttending: attendance.filter(a => !a.attending),
        summary: {
          total: attendance.length,
          attending: attendance.filter(a => a.attending).length,
          notAttending: attendance.filter(a => !a.attending).length,
          withMealSelection: attendance.filter(a => a.mealSelection).length
        }
      };
      
      ResponseBuilder.ok(res, grouped);
    } else {
      ResponseBuilder.internalError(res, 'Failed to fetch ceremony attendance', result.error);
    }
  } catch (error) {
    throw error;
  }
}