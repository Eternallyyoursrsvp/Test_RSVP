
import { storage } from "../storage";
import { Guest, RoomAllocation, insertRoomAllocationSchema } from "@shared/schema";
import { parseISO, isAfter, isBefore, format, addHours } from "date-fns";

// Define constants for early check-in time
const EARLY_CHECKIN_HOUR = 10; // 10:00 AM
const STANDARD_CHECKIN_HOUR = 14; // 2:00 PM

// Define types for room assignment results
interface RoomAssignmentResult {
  success: boolean;
  allocation?: RoomAllocation;
  message?: string;
  needsReview: boolean;
  earlyCheckIn: boolean;
}

/**
 * Service for automatically assigning rooms to guests
 * who have selected "provided" accommodation during RSVP Stage 2
 */
export class AutoRoomAssignmentService {
  /**
   * Process automated room assignment for a guest who has selected provided accommodation
   * @param guestId The ID of the guest
   * @param eventId The ID of the event
   * @returns Result of the room assignment process
   */
  static async processForGuest(guestId: number, eventId: number): Promise<RoomAssignmentResult> {
    try {
      
      
      // Get the guest with all their details
      const guest = await storage.getGuest(guestId);
      if (!guest) {
        
        return {
          success: false,
          message: 'Guest not found',
          needsReview: false,
          earlyCheckIn: false
        };
      }
      
      // Verify the guest belongs to the specified event
      if (guest.eventId !== eventId) {
        
        return {
          success: false,
          message: 'Guest does not belong to specified event',
          needsReview: false,
          earlyCheckIn: false
        };
      }
      
      // Check if the guest has already been assigned a room
      const existingAllocations = await storage.getRoomAllocationsByGuest(guestId);
      if (existingAllocations && existingAllocations.length > 0) {
        
        return {
          success: true,
          allocation: existingAllocations[0],
          message: 'Guest already has a room assignment',
          needsReview: true, // Still flag for review in case it needs updating
          earlyCheckIn: this.needsEarlyCheckin(guest)
        };
      }
      
      // Find the appropriate room based on guest details
      const suggestedRoom = await this.findSuitableRoom(guest, eventId);
      
      if (!suggestedRoom) {
        
        return {
          success: false,
          message: 'No suitable rooms available',
          needsReview: true,
          earlyCheckIn: this.needsEarlyCheckin(guest)
        };
      }
      
      // Calculate check-in date based on guest arrival date or default to first day of event
      const event = await storage.getEvent(eventId);
      if (!event) {
        return {
          success: false,
          message: 'Event not found',
          needsReview: false,
          earlyCheckIn: false
        };
      }
      
      // Determine check-in and check-out dates
      const checkInDate = guest.arrivalDate || event.startDate;
      const checkOutDate = guest.departureDate || event.endDate;
      
      // Create room allocation with draft status
      const needsEarlyCheckin = this.needsEarlyCheckin(guest);
      
      const allocationData = {
        accommodationId: suggestedRoom.id,
        guestId: guest.id,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        checkInStatus: 'pending',
        checkOutStatus: 'pending',
        includesPlusOne: guest.plusOneAttending || false,
        includesChildren: guest.numberOfChildren > 0,
        childrenCount: guest.numberOfChildren || 0,
        specialRequests: needsEarlyCheckin ? 'AUTO-FLAGGED: Early check-in required based on arrival time.' : '',
        // Additional metadata about this being auto-assigned
        additionalGuestsInfo: this.buildAdditionalGuestsInfo(guest)
      };
      
      // Create the allocation
      const allocation = await storage.createRoomAllocation(allocationData);
      
      // Update the accommodation to increment allocated rooms
      const accommodation = await storage.getAccommodation(suggestedRoom.id);
      if (accommodation) {
        await storage.updateAccommodation(accommodation.id, {
          allocatedRooms: (accommodation.allocatedRooms || 0) + 1
        });
      }
      
      // Return success with the allocation
      return {
        success: true,
        allocation,
        message: 'Room automatically assigned',
        needsReview: true, // Always flag for review
        earlyCheckIn: needsEarlyCheckin
      };
      
    } catch (error) {
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error in room assignment',
        needsReview: true,
        earlyCheckIn: false
      };
    }
  }
  
  /**
   * Find a suitable room for a guest based on their details
   * @param guest The guest to find a room for
   * @param eventId The event ID
   * @returns The most suitable accommodation or undefined if none available
   */
  private static async findSuitableRoom(guest: Guest, eventId: number): Promise<any | undefined> {
    // Get all hotels for the event
    const hotels = await storage.getHotelsByEvent(eventId);
    if (!hotels || hotels.length === 0) {
      return undefined;
    }
    
    // Get available accommodations across all hotels
    let availableAccommodations = [];
    
    for (const hotel of hotels) {
      const hotelAccommodations = await storage.getAccommodationsByHotel(hotel.id);
      
      // Filter for accommodations with available rooms
      const availableHotelAccommodations = hotelAccommodations.filter(
        acc => (acc.totalRooms - (acc.allocatedRooms || 0)) > 0
      );
      
      availableAccommodations = [...availableAccommodations, ...availableHotelAccommodations];
    }
    
    if (availableAccommodations.length === 0) {
      return undefined;
    }
    
    // Logic to determine the best room type based on guest details
    const guestWithPlusOne = guest.plusOneAttending || false;
    const guestWithChildren = (guest.numberOfChildren || 0) > 0;
    const totalGuestCount = 1 + 
      (guestWithPlusOne ? 1 : 0) + 
      (guestWithChildren ? guest.numberOfChildren || 0 : 0);
    
    // First try to find rooms with exact capacity match
    let suitableRooms = availableAccommodations.filter(
      acc => acc.capacity >= totalGuestCount
    ).sort((a, b) => {
      // Sort by minimal capacity difference (prefer rooms that just fit the guests)
      return (a.capacity - totalGuestCount) - (b.capacity - totalGuestCount);
    });
    
    // If no exact match, just get any available room with largest capacity
    if (suitableRooms.length === 0) {
      suitableRooms = availableAccommodations.sort((a, b) => b.capacity - a.capacity);
    }
    
    // Return the first/best match
    return suitableRooms[0];
  }
  
  /**
   * Determine if a guest needs early check-in based on arrival time
   * @param guest The guest to check
   * @returns Whether early check-in is needed
   */
  private static needsEarlyCheckin(guest: Guest): boolean {
    // If no arrival date or time, no early check-in needed
    if (!guest.arrivalDate || !guest.arrivalTime) {
      return false;
    }
    
    try {
      // Parse the arrival date and time to create a full datetime
      const arrivalDate = parseISO(guest.arrivalDate);
      
      // Split time like "14:00" into hours and minutes
      const [hours, minutes] = guest.arrivalTime.split(':').map(Number);
      
      // Create a date object with the arrival date and time
      const arrivalDateTime = new Date(
        arrivalDate.getFullYear(),
        arrivalDate.getMonth(),
        arrivalDate.getDate(),
        hours || 0,
        minutes || 0
      );
      
      // Create the standard check-in time for comparison
      const standardCheckinTime = new Date(
        arrivalDate.getFullYear(),
        arrivalDate.getMonth(),
        arrivalDate.getDate(),
        STANDARD_CHECKIN_HOUR,
        0
      );
      
      // Check if arrival is before standard check-in time and after early morning
      const earlyMorningTime = new Date(
        arrivalDate.getFullYear(),
        arrivalDate.getMonth(),
        arrivalDate.getDate(),
        EARLY_CHECKIN_HOUR,
        0
      );
      
      // Early check-in needed if arriving before standard check-in but after early morning
      return isBefore(arrivalDateTime, standardCheckinTime) && isAfter(arrivalDateTime, earlyMorningTime);
    } catch (error) {
      
      return false;
    }
  }
  
  /**
   * Build additional guests info string
   * @param guest The guest with additional guests
   * @returns Formatted string with additional guests info
   */
  private static buildAdditionalGuestsInfo(guest: Guest): string {
    const parts = [];
    
    if (guest.plusOneAttending && guest.plusOneName) {
      parts.push(`Plus one: ${guest.plusOneName}`);
    }
    
    if (guest.numberOfChildren && guest.numberOfChildren > 0) {
      parts.push(`Children: ${guest.numberOfChildren}`);
      if (guest.childrenNames) {
        parts.push(`Children names: ${guest.childrenNames}`);
      }
    }
    
    return parts.join('. ');
  }
}