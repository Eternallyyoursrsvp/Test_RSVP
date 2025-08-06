import { Request, Response } from 'express';
import { RSVPService } from '../../services/rsvp-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const rsvpService = new RSVPService();

// Validation schema for Stage 1 RSVP submission (basic information)
const Stage1RSVPSchema = z.object({
  eventId: z.number().int().positive('Event ID is required'),
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  rsvpStatus: z.enum(['confirmed', 'declined'], {
    errorMap: () => ({ message: 'RSVP status must be "confirmed" or "declined"' })
  }),
  plusOneName: z.string().max(100).optional(),
  message: z.string().max(1000).optional(),
  // For tracking which ceremonies to attend (handled separately)
  ceremonies: z.record(z.string(), z.boolean()).optional()
});

export async function submitStage1RSVP(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validationResult = Stage1RSVPSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid stage 1 RSVP data', validationResult.error.errors);
    }

    const stage1Data = validationResult.data;

    // Find or create guest based on email and event
    const eventGuests = await rsvpService.storage.getGuestsByEvent(stage1Data.eventId);
    let guest = eventGuests.find(g => g.email === stage1Data.email);
    
    if (!guest) {
      // Create new guest
      const newGuestData = {
        eventId: stage1Data.eventId,
        firstName: stage1Data.firstName,
        lastName: stage1Data.lastName,
        email: stage1Data.email,
        rsvpStatus: stage1Data.rsvpStatus,
        rsvpDate: new Date().toISOString().split('T')[0],
        plusOneName: stage1Data.plusOneName || null,
        plusOneAllowed: true, // Default to allowing plus ones
        plusOneConfirmed: !!stage1Data.plusOneName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      guest = await rsvpService.storage.createGuest(newGuestData);
      if (!guest) {
        return ResponseBuilder.internalError(res, 'Failed to create guest record');
      }
    } else {
      // Update existing guest
      const updateData = {
        firstName: stage1Data.firstName,
        lastName: stage1Data.lastName,
        rsvpStatus: stage1Data.rsvpStatus,
        rsvpDate: new Date().toISOString().split('T')[0],
        plusOneName: stage1Data.plusOneName || null,
        plusOneConfirmed: !!stage1Data.plusOneName,
        updatedAt: new Date().toISOString()
      };

      guest = await rsvpService.storage.updateGuest(guest.id, updateData);
      if (!guest) {
        return ResponseBuilder.internalError(res, 'Failed to update guest record');
      }
    }

    // Handle ceremony attendance if provided
    if (stage1Data.ceremonies && stage1Data.rsvpStatus === 'confirmed') {
      const attendingCeremonies = Object.entries(stage1Data.ceremonies)
        .filter(([_, isAttending]) => isAttending)
        .map(([ceremonyId]) => parseInt(ceremonyId));

      for (const ceremonyId of attendingCeremonies) {
        // Check if guest-ceremony relation exists
        const existingRelation = await rsvpService.storage.getGuestCeremony(guest.id, ceremonyId);
        
        if (existingRelation) {
          await rsvpService.storage.updateGuestCeremony(existingRelation.id, { attending: true });
        } else {
          await rsvpService.storage.createGuestCeremony({
            guestId: guest.id,
            ceremonyId,
            attending: true
          });
        }
      }
    }

    // Record message to couple if provided
    if (stage1Data.message) {
      await rsvpService.storage.createCoupleMessage({
        eventId: stage1Data.eventId,
        guestId: guest.id,
        message: stage1Data.message
      });
    }

    // Log the stage 1 RSVP submission
    await rsvpService.auditLog('RSVP_STAGE1_SUBMIT', 'guest', guest.id, 'public', {
      eventId: stage1Data.eventId,
      rsvpStatus: stage1Data.rsvpStatus,
      hasMessage: !!stage1Data.message,
      hasPlusOne: !!stage1Data.plusOneName,
      ceremoniesCount: stage1Data.ceremonies ? Object.values(stage1Data.ceremonies).filter(Boolean).length : 0
    });

    // Return success response with guest information
    const response = {
      message: `Stage 1 RSVP ${stage1Data.rsvpStatus === 'confirmed' ? 'confirmation' : 'decline'} submitted successfully`,
      guest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        rsvpStatus: guest.rsvpStatus,
        rsvpDate: guest.rsvpDate,
        plusOneConfirmed: guest.plusOneConfirmed,
        plusOneName: guest.plusOneName
      },
      submittedAt: new Date().toISOString(),
      requiresStage2: stage1Data.rsvpStatus === 'confirmed' // Only confirmed guests need stage 2
    };
    
    ResponseBuilder.ok(res, response, 'Stage 1 RSVP submitted successfully');

  } catch (error) {
    console.error('Stage 1 RSVP submission error:', error);
    ResponseBuilder.internalError(res, 'Failed to submit stage 1 RSVP', error);
  }
}