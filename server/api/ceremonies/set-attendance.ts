import { Request, Response } from 'express';
import { CeremonyService } from '../../services/ceremony-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const ceremonyService = new CeremonyService();

// Validation schema for setting guest ceremony attendance
const SetAttendanceSchema = z.object({
  ceremonyId: z.number().int().min(1, 'Ceremony ID is required'),
  attending: z.boolean()
});

export async function setGuestAttendance(req: Request, res: Response): Promise<void> {
  try {
    const guestId = parseInt(req.params.guestId, 10);
    
    if (isNaN(guestId)) {
      return ResponseBuilder.badRequest(res, 'Invalid guest ID');
    }

    // Handle both route patterns:
    // POST /guests/:guestId/attendance (ceremonyId in body)
    // PUT /guests/:guestId/ceremonies/:ceremonyId/attendance (ceremonyId in params)
    let ceremonyId: number;
    let attending: boolean;

    if (req.params.ceremonyId) {
      // Route pattern: PUT /guests/:guestId/ceremonies/:ceremonyId/attendance
      ceremonyId = parseInt(req.params.ceremonyId, 10);
      if (isNaN(ceremonyId)) {
        return ResponseBuilder.badRequest(res, 'Invalid ceremony ID');
      }
      
      // For PUT route, attending status is in body
      const bodyValidation = z.object({ attending: z.boolean() }).safeParse(req.body);
      if (!bodyValidation.success) {
        return ResponseBuilder.badRequest(res, 'Attending status is required', bodyValidation.error.errors);
      }
      attending = bodyValidation.data.attending;
    } else {
      // Route pattern: POST /guests/:guestId/attendance
      const validationResult = SetAttendanceSchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseBuilder.badRequest(res, 'Invalid attendance data', validationResult.error.errors);
      }
      ceremonyId = validationResult.data.ceremonyId;
      attending = validationResult.data.attending;
    }

    // Create service context
    const context = {
      userId: (req.user as any).id,
      userRole: (req.user as any).role,
      eventId: undefined, // Will be validated by service
      requestId: req.headers['x-request-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Call service method
    const result = await ceremonyService.setGuestAttendance(guestId, ceremonyId, attending, context);
    
    if (result.success && result.data) {
      const response = {
        id: result.data.id,
        guestId: result.data.guestId,
        ceremonyId: result.data.ceremonyId,
        attending: result.data.attending,
        updatedAt: result.data.updatedAt
      };
      
      ResponseBuilder.ok(res, response, `Guest attendance ${attending ? 'confirmed' : 'declined'} for ceremony`);
    } else {
      ResponseBuilder.internalError(res, 'Failed to set guest attendance', result.error);
    }
  } catch (error) {
    throw error;
  }
}