import { Request, Response } from 'express';
import { GuestService } from '../../services/guest-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const guestService = new GuestService();

// Validation schema for creating a guest
const CreateGuestSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional(),
  relationship: z.string().optional(),
  isFamily: z.boolean().optional().default(false),
  rsvpStatus: z.enum(['pending', 'confirmed', 'declined']).optional().default('pending'),
  plusOneAllowed: z.boolean().optional().default(false),
  plusOneName: z.string().optional(),
  plusOneEmail: z.string().email('Invalid plus-one email format').optional().or(z.literal('')),
  plusOnePhone: z.string().optional(),
  plusOneConfirmed: z.boolean().optional().default(false),
  plusOneRsvpContact: z.boolean().optional().default(false),
  childrenDetails: z.array(z.object({
    name: z.string(),
    age: z.number().min(0).max(18),
    dietaryRestrictions: z.string().optional()
  })).optional(),
  dietaryRestrictions: z.string().optional(),
  accessibilityNeeds: z.string().optional(),
  specialRequests: z.string().optional(),
  notes: z.string().optional()
});

export async function createGuest(req: Request, res: Response): Promise<void> {
  try {
    // Event ID is validated by middleware and available in context
    const eventId = (req as any).context.eventId;
    
    // Validate request body
    const validationResult = CreateGuestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid guest data', validationResult.error.errors);
    }

    const guestData = {
      ...validationResult.data,
      eventId
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
    const result = await guestService.createGuest(guestData, context);
    
    if (result.success && result.data) {
      ResponseBuilder.created(res, result.data, 'Guest created successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to create guest', result.error);
    }
  } catch (error) {
    throw error;
  }
}