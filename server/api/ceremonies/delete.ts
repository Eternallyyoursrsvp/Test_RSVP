import { Request, Response } from 'express';
import { CeremonyService } from '../../services/ceremony-service';
import { ResponseBuilder } from '../../lib/response-builder';

const ceremonyService = new CeremonyService();

export async function deleteCeremony(req: Request, res: Response): Promise<void> {
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
    const result = await ceremonyService.deleteCeremony(ceremonyId, context);
    
    if (result.success) {
      ResponseBuilder.ok(res, null, 'Ceremony deleted successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to delete ceremony', result.error);
    }
  } catch (error) {
    throw error;
  }
}