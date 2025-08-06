import { Request, Response } from 'express';
import { GuestService } from '../../services/guest-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const guestService = new GuestService();

// Validation schema for contact preference update
const ContactPreferenceSchema = z.object({
  plusOneRsvpContact: z.boolean()
}).strict();

export async function updateContactPreference(req: Request, res: Response): Promise<void> {
  try {
    const guestId = parseInt(req.params.id, 10);
    
    if (isNaN(guestId)) {
      return ResponseBuilder.badRequest(res, 'Invalid guest ID');
    }
    
    // Validate request body
    const validationResult = ContactPreferenceSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid contact preference data', validationResult.error.errors);
    }

    const { plusOneRsvpContact } = validationResult.data;

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
    const result = await guestService.updateContactPreference(guestId, plusOneRsvpContact, context);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data, 'Contact preference updated successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to update contact preference', result.error);
    }
  } catch (error) {
    throw error;
  }
}