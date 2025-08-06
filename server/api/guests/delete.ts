import { Request, Response } from 'express';
import { GuestService } from '../../services/guest-service';
import { ResponseBuilder } from '../../lib/response-builder';

const guestService = new GuestService();

export async function deleteGuest(req: Request, res: Response): Promise<void> {
  try {
    const guestId = parseInt(req.params.id, 10);
    
    if (isNaN(guestId)) {
      return ResponseBuilder.badRequest(res, 'Invalid guest ID');
    }
    
    // Create service context
    const context = {
      userId: (req.user as any).id,
      userRole: (req.user as any).role,
      eventId: undefined, // Will be validated by service based on guest's event
      requestId: req.headers['x-request-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Call service method
    const result = await guestService.deleteGuest(guestId, context);
    
    if (result.success) {
      ResponseBuilder.ok(res, null, 'Guest deleted successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to delete guest', result.error);
    }
  } catch (error) {
    throw error;
  }
}