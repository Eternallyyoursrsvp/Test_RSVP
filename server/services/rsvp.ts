/**
 * RSVP service for generating secure RSVP links and handling RSVP responses
 */
import { Guest, WeddingEvent, insertGuestSchema } from "@shared/schema";
import { storage } from "../storage";
import { randomBytes, createHmac } from "crypto";

// Import the new schema definitions
import { 
  RSVPResponseSchema,
  RSVPStage1Schema,
  RSVPStage2Schema,
  RSVPCombinedSchema,
  type RSVPResponse,
  type RSVPStage1Response,
  type RSVPStage2Response,
  type RSVPCombinedResponse
} from "./rsvp-schema";

// Import the RSVP follow-up service
import { rsvpFollowupService } from './rsvp-followup';

// Import the auto room assignment service
import { AutoRoomAssignmentService } from './auto-room-assignment';

export class RSVPService {
  private static readonly TOKEN_EXPIRY_DAYS = 90; // 90 days expiry for RSVP tokens
  private static readonly SECRET_KEY = process.env.RSVP_SECRET_KEY || 'wedding_rsvp_default_secret_key';
  
  /**
   * Generate a secure RSVP token for a guest
   */
  static generateToken(guestId: number, eventId: number): string {
    const timestamp = Date.now();
    const randomString = randomBytes(16).toString('hex');
    const payload = `${guestId}:${eventId}:${timestamp}:${randomString}`;
    
    const hmac = createHmac('sha256', this.SECRET_KEY);
    hmac.update(payload);
    const signature = hmac.digest('hex');
    
    return Buffer.from(`${payload}:${signature}`).toString('base64url');
  }
  
  /**
   * Verify a RSVP token and return guest and event IDs if valid
   */
  static verifyToken(token: string): { guestId: number; eventId: number; timestamp: number } | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      const [guestIdStr, eventIdStr, timestampStr, randomString, signature] = decoded.split(':');
      
      const guestId = parseInt(guestIdStr);
      const eventId = parseInt(eventIdStr);
      const timestamp = parseInt(timestampStr);
      
      if (isNaN(guestId) || isNaN(eventId) || isNaN(timestamp)) {
        
        return null;
      }
      
      // Check if token is expired
      const expiryTime = timestamp + (this.TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      if (Date.now() > expiryTime) {
        
        return null;
      }
      
      // Verify signature
      const payload = `${guestId}:${eventId}:${timestamp}:${randomString}`;
      const hmac = createHmac('sha256', this.SECRET_KEY);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');
      
      if (signature !== expectedSignature) {
        
        return null;
      }
      
      return { guestId, eventId, timestamp };
    } catch (error) {
      
      return null;
    }
  }
  
  /**
   * Generate a RSVP link for a guest
   */
  static generateRSVPLink(baseUrl: string, guest: Guest, event: WeddingEvent): string {
    const token = this.generateToken(guest.id, event.id);
    // Ensure the baseUrl doesn't already contain a trailing slash
    const formattedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    // Use path parameter format instead of query parameter for better compatibility
    return `${formattedBaseUrl}/guest-rsvp/${token}`;
  }
  
  /**
   * Process Stage 1 of RSVP (Basic attendance information)
   */
  static async processRSVPStage1(response: RSVPStage1Response): Promise<{ 
    success: boolean; 
    message?: string; 
    guest?: Guest; 
    requiresStage2?: boolean;
  }> {
    try {
      // Validate guest and event exist with proper context validation
      const guest = await this.getGuest(response.guestId);
      if (!guest || guest.eventId !== response.eventId) {
        return { success: false, message: 'Guest not found or does not belong to this event' };
      }
      
      const event = await this.getEvent(response.eventId);
      if (!event) {
        return { success: false, message: 'Event not found' };
      }
      
      // Update guest basic information
      const updatedGuest: any = {
        // Update name and contact info if it was edited
        firstName: response.firstName,
        lastName: response.lastName,
        email: response.email,
        // RSVP status and date
        rsvpStatus: response.rsvpStatus,
        rsvpDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        // Basic guest preferences
        dietaryRestrictions: response.dietaryRestrictions || guest.dietaryRestrictions,
        allergies: response.allergies || guest.allergies,
      };
      
      // Update phone if provided
      if (response.phone) {
        updatedGuest.phone = response.phone;
      }
      
      // Add local/outstation status if provided
      if (response.isLocalGuest !== undefined) {
        updatedGuest.isLocalGuest = response.isLocalGuest;
      }
      
      // Handle plus one information
      if (response.plusOneAttending !== undefined) {
        updatedGuest.plusOneConfirmed = response.plusOneAttending;
        if (response.plusOneAttending && response.plusOneName) {
          updatedGuest.plusOneName = response.plusOneName;
          
          // Only update these fields if they're provided
          if (response.plusOneEmail) updatedGuest.plusOneEmail = response.plusOneEmail;
          if (response.plusOnePhone) updatedGuest.plusOnePhone = response.plusOnePhone;
          if (response.plusOneGender) updatedGuest.plusOneGender = response.plusOneGender;
        }
      }
      
      // Update the guest record
      await this.updateGuest(guest.id, updatedGuest);
      
      // Process ceremony selections if provided
      if (response.ceremonies && response.ceremonies.length > 0) {
        for (const ceremony of response.ceremonies) {
          // Check if guest-ceremony relation already exists
          const existingRelation = await this.getGuestCeremony(guest.id, ceremony.ceremonyId);
          
          if (existingRelation) {
            // Update existing relation
            await this.updateGuestCeremony(existingRelation.id, {
              attending: ceremony.attending
            });
          } else {
            // Create new relation
            await this.createGuestCeremony({
              guestId: guest.id,
              ceremonyId: ceremony.ceremonyId,
              attending: ceremony.attending
            });
          }
        }
      }
      
      // Record message if provided
      if (response.message) {
        await this.createCoupleMessage({
          guestId: guest.id,
          eventId: event.id,
          message: response.message
        });
      }
      
      // Determine if Stage 2 is required
      // Stage 2 is only required for confirmed attendees who are not local guests
      const requiresStage2 = response.rsvpStatus === 'confirmed' && !response.isLocalGuest;
      
      // Trigger follow-up communication based on RSVP status
      try {
        await rsvpFollowupService.processRsvpFollowup(guest.id, event.id);
      } catch (followupError) {
        
        // Continue with the response even if follow-up fails
      }
      
      return { 
        success: true, 
        guest: await this.getGuest(guest.id), // Return updated guest data
        requiresStage2
      };
    } catch (error) {
      
      return { 
        success: false, 
        message: 'An error occurred while processing your RSVP. Please try again later.'
      };
    }
  }
  
  /**
   * Process Stage 2 of RSVP (Detailed travel and accommodation information)
   */
  static async processRSVPStage2(response: RSVPStage2Response): Promise<{ 
    success: boolean; 
    message?: string; 
    guest?: Guest;
  }> {
    try {
      // Validate guest and event exist with proper context validation
      const guest = await this.getGuest(response.guestId);
      if (!guest || guest.eventId !== response.eventId) {
        return { success: false, message: 'Guest not found or does not belong to this event' };
      }
      
      const event = await this.getEvent(response.eventId);
      if (!event) {
        return { success: false, message: 'Event not found' };
      }
      
      // Ensure guest has confirmed attendance before processing stage 2
      if (guest.rsvpStatus !== 'confirmed') {
        return { 
          success: false, 
          message: 'Cannot process detailed information for guests who have not confirmed attendance' 
        };
      }

      // Wrap all Stage 2 operations in a database transaction for atomicity
      return await this.transaction(async function(this: typeof storage) {
      
        // Process accommodation needs
        if (response.needsAccommodation) {
          await this.updateGuest(guest.id, {
          needsAccommodation: true,
          accommodationPreference: response.accommodationPreference,
          notes: (guest.notes || '') + 
            `\nAccommodation: ${response.accommodationPreference}` +
            (response.accommodationNotes ? `\nNotes: ${response.accommodationNotes}` : '')
        });
        
        // If guest selected "provided" accommodation, trigger auto room assignment
        if (response.accommodationPreference === 'provided') {
          try {
            
            const roomAssignmentResult = await AutoRoomAssignmentService.processForGuest(guest.id, response.eventId);
            
            if (roomAssignmentResult.success) {
              
              // Add note about the auto-assignment
              await this.updateGuest(guest.id, {
                notes: (guest.notes || '') + 
                  `\nAuto room assignment: Room automatically assigned for review by planner.` +
                  (roomAssignmentResult.earlyCheckIn ? ' Early check-in may be needed.' : '')
              });
            } else {
              
              // Update guest notes with the failure info so planner can follow up
              await this.updateGuest(guest.id, {
                notes: (guest.notes || '') + 
                  `\nAuto room assignment: Failed - ${roomAssignmentResult.message}. Manual assignment needed.`
              });
            }
          } catch (assignmentError) {
            
            // Continue with RSVP processing even if room assignment fails
          }
        }
      }
      
      // Process transportation needs
      if (response.needsTransportation) {
        // Check if travel info already exists
        const existingTravelInfo = await this.getTravelInfoByGuest(guest.id);
        
        const travelInfoData: any = {
          needsTransportation: true,
          transportationType: response.transportationType,
          travelMode: response.travelMode,
          arrivalDate: response.arrivalDate,
          arrivalTime: response.arrivalTime,
          departureDate: response.departureDate,
          departureTime: response.departureTime,
        };
        
        // Add flight details if available
        if (response.travelMode === 'air' && response.flightDetails) {
          travelInfoData.flightNumber = response.flightDetails.flightNumber;
          // Store additional flight data in a notes field
          const flightNotes = [];
          if (response.flightDetails.airline) flightNotes.push(`Airline: ${response.flightDetails.airline}`);
          if (response.flightDetails.arrivalAirport) flightNotes.push(`Arrival Airport: ${response.flightDetails.arrivalAirport}`);
          if (response.flightDetails.departureAirport) flightNotes.push(`Departure Airport: ${response.flightDetails.departureAirport}`);
          
          if (flightNotes.length > 0) {
            travelInfoData.notes = flightNotes.join('\n');
          }
        }
        
        if (existingTravelInfo) {
          // Update existing travel info
          await this.updateTravelInfo(existingTravelInfo.id, travelInfoData);
        } else {
          // Create new travel info
          travelInfoData.guestId = guest.id;
          await this.createTravelInfo(travelInfoData);
        }
      }
      
      // Process children details if provided
      if (response.childrenDetails && response.childrenDetails.length > 0) {
        // Format children details as JSON
        const childrenDetailsJson = JSON.stringify(response.childrenDetails);
        
        // Update guest record with children information
        await this.updateGuest(guest.id, {
          childrenDetails: childrenDetailsJson,
          numberOfChildren: response.childrenDetails.length
        });
      }
      
      // Process meal selections if provided
      if (response.mealSelections && response.mealSelections.length > 0) {
        for (const mealSelection of response.mealSelections) {
          // Check if meal selection already exists
          const existingMealSelections = await this.getGuestMealSelectionsByGuest(guest.id);
          const existingForCeremony = existingMealSelections.find(ms => 
            ms.ceremonyId === mealSelection.ceremonyId
          );
          
          const mealData: any = {
            mealOptionId: mealSelection.mealOptionId
          };
          
          // Add notes if provided
          if (mealSelection.notes) {
            mealData.notes = mealSelection.notes;
          }
          
          if (existingForCeremony) {
            // Update existing meal selection
            await this.updateGuestMealSelection(existingForCeremony.id, mealData);
          } else {
            // Create new meal selection
            mealData.guestId = guest.id;
            mealData.ceremonyId = mealSelection.ceremonyId;
            await this.createGuestMealSelection(mealData);
          }
        }
      }
      
      // Trigger follow-up communication for Stage 2 completion
      try {
        await rsvpFollowupService.processRsvpFollowup(guest.id, event.id);
      } catch (followupError) {
        
        // Continue with the response even if follow-up fails
      }
      
          return { 
            success: true, 
            guest: await this.getGuest(guest.id) // Return updated guest data
          };
        }); // End transaction
    } catch (error) {
      
      return { 
        success: false, 
        message: 'An error occurred while processing your detailed information. Please try again later.'
      };
    }
  }
  
  /**
   * Process a combined RSVP response (Both stages at once)
   */
  static async processRSVPCombined(response: RSVPCombinedResponse): Promise<{ 
    success: boolean; 
    message?: string; 
    guest?: Guest;
  }> {
    try {
      // Process Stage 1 first
      const stage1Result = await this.processRSVPStage1({
        guestId: response.guestId,
        eventId: response.eventId,
        firstName: response.firstName,
        lastName: response.lastName,
        email: response.email,
        phone: response.phone,
        rsvpStatus: response.rsvpStatus,
        isLocalGuest: response.isLocalGuest,
        plusOneAttending: response.plusOneAttending,
        plusOneName: response.plusOneName,
        plusOneEmail: response.plusOneEmail,
        plusOnePhone: response.plusOnePhone,
        plusOneGender: response.plusOneGender,
        dietaryRestrictions: response.dietaryRestrictions,
        allergies: response.allergies,
        ceremonies: response.ceremonies,
        message: response.message
      });
      
      if (!stage1Result.success) {
        return stage1Result;
      }
      
      // If attendance is declined or guest is local and no stage 2 data is needed, return success
      if (response.rsvpStatus === 'declined' || (response.isLocalGuest && 
          !response.needsAccommodation && !response.needsTransportation &&
          (!response.childrenDetails || response.childrenDetails.length === 0) &&
          (!response.mealSelections || response.mealSelections.length === 0))) {
        return {
          success: true,
          guest: stage1Result.guest
        };
      }
      
      // Otherwise, process Stage 2
      const stage2Result = await this.processRSVPStage2({
        guestId: response.guestId,
        eventId: response.eventId,
        needsAccommodation: response.needsAccommodation,
        accommodationPreference: response.accommodationPreference,
        accommodationNotes: response.accommodationNotes,
        needsTransportation: response.needsTransportation,
        transportationType: response.transportationType,
        transportationNotes: response.transportationNotes,
        travelMode: response.travelMode,
        flightDetails: response.flightDetails,
        arrivalDate: response.arrivalDate,
        arrivalTime: response.arrivalTime,
        departureDate: response.departureDate,
        departureTime: response.departureTime,
        childrenDetails: response.childrenDetails,
        mealSelections: response.mealSelections
      });
      
      return stage2Result;
    } catch (error) {
      
      return { 
        success: false, 
        message: 'An error occurred while processing your RSVP. Please try again later.'
      };
    }
  }
  
  /**
   * Process an RSVP response (for backward compatibility)
   */
  static async processRSVPResponse(response: RSVPResponse): Promise<{ success: boolean; message?: string }> {
    try {
      // Validate guest and event exist with proper context validation
      const guest = await this.getGuest(response.guestId);
      if (!guest || guest.eventId !== response.eventId) {
        return { success: false, message: 'Guest not found or does not belong to this event' };
      }
      
      const event = await this.getEvent(response.eventId);
      if (!event) {
        return { success: false, message: 'Event not found' };
      }
      
      // Update guest RSVP status - only updating fields that are in the schema
      const updatedGuest = {
        rsvpStatus: response.attending ? 'confirmed' : 'declined',
        rsvpDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        plusOneName: response.plusOneName || guest.plusOneName, 
        dietaryRestrictions: response.dietaryRestrictions || guest.dietaryRestrictions,
        notes: guest.notes || ''
      };
      
      // Add plus one confirmation if provided
      if (response.plusOneAttending !== undefined) {
        (updatedGuest as any).plusOneConfirmed = response.plusOneAttending;
      }
      
      // Add children details if provided
      if (response.childrenDetails) {
        // Convert children details to proper JSON
        const childrenDetailsJson = typeof response.childrenDetails === 'string' 
          ? response.childrenDetails 
          : JSON.stringify(response.childrenDetails);
          
        (updatedGuest as any).childrenDetails = childrenDetailsJson;
      }
      
      await this.updateGuest(guest.id, updatedGuest);
      
      // Process ceremony selections if provided
      if (response.ceremonies && response.ceremonies.length > 0) {
        for (const ceremony of response.ceremonies) {
          // Check if guest-ceremony relation already exists
          const existingRelation = await this.getGuestCeremony(guest.id, ceremony.ceremonyId);
          
          if (existingRelation) {
            // Update existing relation
            await this.updateGuestCeremony(existingRelation.id, {
              attending: ceremony.attending
            });
          } else {
            // Create new relation
            await this.createGuestCeremony({
              guestId: guest.id,
              ceremonyId: ceremony.ceremonyId,
              attending: ceremony.attending
            });
          }
          
          // Handle meal selection if provided and attending
          if (ceremony.attending && ceremony.mealOptionId) {
            // Check if meal selection already exists
            const existingMealSelections = await this.getGuestMealSelectionsByGuest(guest.id);
            const existingForCeremony = existingMealSelections.find(ms => 
              ms.ceremonyId === ceremony.ceremonyId
            );
            
            if (existingForCeremony) {
              // Update existing meal selection
              await this.updateGuestMealSelection(existingForCeremony.id, {
                mealOptionId: ceremony.mealOptionId
              });
            } else {
              // Create new meal selection
              await this.createGuestMealSelection({
                guestId: guest.id,
                ceremonyId: ceremony.ceremonyId,
                mealOptionId: ceremony.mealOptionId
              });
            }
          }
        }
      }
      
      // Handle accommodation needs
      if (response.accommodationNeeded) {
        // For now, just record this in the guest record as notes
        // In a future enhancement, we would allocate a room based on available inventory
        await this.updateGuest(guest.id, {
          needsAccommodation: true,
          notes: (guest.notes || '') + `\nAccommodation needed: Arrival: ${response.arrivalDate || 'TBD'}, Departure: ${response.departureDate || 'TBD'}`
        });
      }
      
      // Handle transportation needs
      if (response.transportationNeeded) {
        // Check if travel info already exists
        const existingTravelInfo = await this.getTravelInfoByGuest(guest.id);
        
        if (existingTravelInfo) {
          // Update existing travel info
          await this.updateTravelInfo(existingTravelInfo.id, {
            needsTransportation: true,
            arrivalDate: response.arrivalDate,
            departureDate: response.departureDate
          });
        } else {
          // Create new travel info
          await this.createTravelInfo({
            guestId: guest.id,
            needsTransportation: true,
            arrivalDate: response.arrivalDate,
            departureDate: response.departureDate
          });
        }
      }
      
      // Record message if provided
      if (response.message) {
        await this.createCoupleMessage({
          guestId: guest.id,
          eventId: event.id,
          message: response.message
        });
      }
      
      // Trigger follow-up communication after RSVP is processed
      try {
        await rsvpFollowupService.processRsvpFollowup(guest.id, event.id);
      } catch (followupError) {
        
        // Continue with the response even if follow-up fails
      }
      
      return { success: true };
    } catch (error) {
      
      return { 
        success: false, 
        message: 'An error occurred while processing your RSVP. Please try again later.'
      };
    }
  }
}