import { Request, Response } from 'express';
import { RSVPService } from '../../services/rsvp-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const rsvpService = new RSVPService();

// Validation schema for Stage 2 RSVP submission (detailed travel and accommodation)
const Stage2RSVPSchema = z.object({
  guestId: z.number().int().positive('Guest ID is required'),
  eventId: z.number().int().positive('Event ID is required'),
  
  // Children information
  numberOfChildren: z.number().min(0).max(10).default(0),
  childrenNames: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  
  // Accommodation details
  needsAccommodation: z.boolean().optional().default(false),
  accommodationPreference: z.enum(['provided', 'self_managed', 'special_arrangement']).optional(),
  accommodationNotes: z.string().optional(),
  
  // Transportation details
  needsTransportation: z.boolean().optional().default(false),
  transportationType: z.enum(['provided', 'self_managed', 'special_arrangement']).optional(),
  transportationNotes: z.string().optional(),
  
  // Travel details
  travelMode: z.enum(['air', 'train', 'bus', 'car', 'other']).optional().default('car'),
  arrivalDate: z.string().optional(),
  arrivalTime: z.string().optional(),
  departureDate: z.string().optional(),
  departureTime: z.string().optional(),
  
  // Additional requests
  specialRequests: z.string().optional()
});

export async function submitStage2RSVP(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validationResult = Stage2RSVPSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid stage 2 RSVP data', validationResult.error.errors);
    }

    const stage2Data = validationResult.data;

    // Verify guest exists and belongs to the event
    const guest = await rsvpService.storage.getGuest(stage2Data.guestId);
    if (!guest) {
      return ResponseBuilder.notFound(res, 'Guest not found');
    }

    if (guest.eventId !== stage2Data.eventId) {
      return ResponseBuilder.badRequest(res, 'Guest does not belong to this event');
    }

    // Verify guest has confirmed attendance (stage 1 completed)
    if (guest.rsvpStatus !== 'confirmed') {
      return ResponseBuilder.badRequest(res, 'Guest must complete stage 1 RSVP confirmation first');
    }

    // Prepare children details if provided
    let childrenDetails = null;
    if (stage2Data.numberOfChildren > 0 && stage2Data.childrenNames) {
      const childrenNames = stage2Data.childrenNames.split(',').map(name => name.trim());
      childrenDetails = childrenNames.map((name, index) => ({
        name,
        age: 0, // Default age, can be updated later
        dietaryRestrictions: stage2Data.dietaryRestrictions || ''
      }));
    }

    // Build comprehensive update data for the guest
    const updateData: any = {
      // Children information
      numberOfChildren: stage2Data.numberOfChildren,
      childrenDetails: childrenDetails,
      dietaryRestrictions: stage2Data.dietaryRestrictions,
      
      // Accommodation preferences
      needsAccommodation: stage2Data.needsAccommodation,
      accommodationPreference: stage2Data.accommodationPreference,
      accommodationNotes: stage2Data.accommodationNotes,
      
      // Transportation preferences
      needsTransportation: stage2Data.needsTransportation,
      transportationType: stage2Data.transportationType,
      transportationNotes: stage2Data.transportationNotes,
      
      // Travel information
      travelMode: stage2Data.travelMode,
      arrivalDate: stage2Data.arrivalDate,
      arrivalTime: stage2Data.arrivalTime,
      departureDate: stage2Data.departureDate,
      departureTime: stage2Data.departureTime,
      
      // Special requests
      specialRequests: stage2Data.specialRequests,
      
      // Update metadata
      updatedAt: new Date().toISOString(),
      stage2Completed: true,
      stage2CompletedAt: new Date().toISOString()
    };

    // Update the guest with stage 2 information
    const updatedGuest = await rsvpService.storage.updateGuest(guest.id, updateData);
    if (!updatedGuest) {
      return ResponseBuilder.internalError(res, 'Failed to update guest with stage 2 information');
    }

    // Create travel record if guest needs accommodation or transportation
    if (stage2Data.needsAccommodation || stage2Data.needsTransportation) {
      const travelData = {
        guestId: guest.id,
        eventId: stage2Data.eventId,
        needsAccommodation: stage2Data.needsAccommodation,
        accommodationPreference: stage2Data.accommodationPreference || 'self_managed',
        accommodationNotes: stage2Data.accommodationNotes,
        needsTransportation: stage2Data.needsTransportation,
        transportationType: stage2Data.transportationType || 'self_managed',
        transportationNotes: stage2Data.transportationNotes,
        travelMode: stage2Data.travelMode || 'car',
        arrivalDate: stage2Data.arrivalDate,
        arrivalTime: stage2Data.arrivalTime,
        departureDate: stage2Data.departureDate,
        departureTime: stage2Data.departureTime,
        specialRequests: stage2Data.specialRequests,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Check if travel record already exists
      const existingTravel = await rsvpService.storage.getTravelInfoByGuest(guest.id);
      if (existingTravel) {
        await rsvpService.storage.updateTravelInfo(existingTravel.id, travelData);
      } else {
        await rsvpService.storage.createTravelInfo(travelData);
      }
    }

    // Log the stage 2 RSVP submission
    await rsvpService.auditLog('RSVP_STAGE2_SUBMIT', 'guest', guest.id, 'public', {
      eventId: stage2Data.eventId,
      numberOfChildren: stage2Data.numberOfChildren,
      needsAccommodation: stage2Data.needsAccommodation,
      needsTransportation: stage2Data.needsTransportation,
      travelMode: stage2Data.travelMode,
      hasSpecialRequests: !!stage2Data.specialRequests
    });

    // Return success response with updated guest information
    const response = {
      message: 'Stage 2 RSVP details submitted successfully',
      guest: {
        id: updatedGuest.id,
        firstName: updatedGuest.firstName,
        lastName: updatedGuest.lastName,
        email: updatedGuest.email,
        rsvpStatus: updatedGuest.rsvpStatus,
        numberOfChildren: updatedGuest.numberOfChildren,
        needsAccommodation: updatedGuest.needsAccommodation,
        needsTransportation: updatedGuest.needsTransportation,
        travelMode: updatedGuest.travelMode,
        stage2Completed: true
      },
      submittedAt: new Date().toISOString(),
      complete: true // Both stages are now complete
    };
    
    ResponseBuilder.ok(res, response, 'Stage 2 RSVP submitted successfully');

  } catch (error) {
    console.error('Stage 2 RSVP submission error:', error);
    ResponseBuilder.internalError(res, 'Failed to submit stage 2 RSVP', error);
  }
}