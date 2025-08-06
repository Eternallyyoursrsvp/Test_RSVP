import { Request, Response } from 'express';
import { RSVPService } from '../../services/rsvp-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const rsvpService = new RSVPService();

// Validation schema for public RSVP submission
const PublicRSVPSchema = z.object({
  token: z.string().min(1, 'RSVP token is required'),
  rsvpStatus: z.enum(['confirmed', 'declined'], {
    errorMap: () => ({ message: 'RSVP status must be "confirmed" or "declined"' })
  }),
  // Optional guest information updates
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional(),
  // Plus-one information
  plusOneName: z.string().max(100).optional(),
  plusOneEmail: z.string().email('Invalid plus-one email format').optional().or(z.literal('')),
  plusOnePhone: z.string().optional(),
  plusOneConfirmed: z.boolean().optional(),
  // Dietary and accessibility information
  dietaryRestrictions: z.string().optional(),
  accessibilityNeeds: z.string().optional(),
  specialRequests: z.string().optional(),
  // Message to couple
  message: z.string().max(1000).optional(),
  // Children details
  childrenDetails: z.array(z.object({
    name: z.string().min(1, 'Child name is required').max(100),
    age: z.number().min(0).max(18, 'Child age must be between 0-18'),
    dietaryRestrictions: z.string().optional()
  })).optional(),
  // Ceremony attendance
  ceremoniesAttending: z.array(z.number()).optional()
});

export async function submitPublicRSVP(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validationResult = PublicRSVPSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid RSVP data', validationResult.error.errors);
    }

    const rsvpData = validationResult.data;

    // Process the RSVP submission
    const result = await rsvpService.submitPublicRSVP(rsvpData);
    
    if (result.success && result.data) {
      // Return success response with updated guest information
      const response = {
        message: `RSVP ${rsvpData.rsvpStatus === 'confirmed' ? 'confirmation' : 'decline'} submitted successfully`,
        guest: {
          id: result.data.id,
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          email: result.data.email,
          rsvpStatus: result.data.rsvpStatus,
          rsvpDate: result.data.rsvpDate,
          plusOneConfirmed: result.data.plusOneConfirmed,
          plusOneName: result.data.plusOneName
        },
        submittedAt: new Date().toISOString()
      };
      
      ResponseBuilder.ok(res, response, 'RSVP submitted successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to submit RSVP', result.error);
    }
  } catch (error) {
    throw error;
  }
}