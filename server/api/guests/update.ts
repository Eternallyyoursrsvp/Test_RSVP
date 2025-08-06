import { Request, Response } from 'express';
import { GuestService } from '../../services/guest-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const guestService = new GuestService();

// Validation schema for updating a guest (all fields optional)
const UpdateGuestSchema = z.object({
  firstName: z.string().min(1, 'First name cannot be empty').max(100).optional(),
  lastName: z.string().min(1, 'Last name cannot be empty').max(100).optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional(),
  relationship: z.string().optional(),
  isFamily: z.boolean().optional(),
  rsvpStatus: z.enum(['pending', 'confirmed', 'declined']).optional(),
  plusOneAllowed: z.boolean().optional(),
  plusOneName: z.string().optional(),
  plusOneEmail: z.string().email('Invalid plus-one email format').optional().or(z.literal('')),
  plusOnePhone: z.string().optional(),
  plusOneConfirmed: z.boolean().optional(),
  plusOneRsvpContact: z.boolean().optional(),
  childrenDetails: z.array(z.object({
    name: z.string(),
    age: z.number().min(0).max(18),
    dietaryRestrictions: z.string().optional()
  })).optional(),
  dietaryRestrictions: z.string().optional(),
  accessibilityNeeds: z.string().optional(),
  specialRequests: z.string().optional(),
  notes: z.string().optional()
}).strict(); // Prevent unknown fields

export async function updateGuest(req: Request, res: Response): Promise<void> {
  try {
    const guestId = parseInt(req.params.id, 10);
    
    if (isNaN(guestId)) {
      return ResponseBuilder.badRequest(res, 'Invalid guest ID');
    }
    
    // Validate request body
    const validationResult = UpdateGuestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid guest update data', validationResult.error.errors);
    }

    const updateData = validationResult.data;

    // Check if any data was provided
    if (Object.keys(updateData).length === 0) {
      return ResponseBuilder.badRequest(res, 'No update data provided');
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
    const result = await guestService.updateGuest(guestId, updateData, context);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data, 'Guest updated successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to update guest', result.error);
    }
  } catch (error) {
    throw error;
  }
}