/**
 * Transport Service
 * 
 * Handles transport group generation logic and guest allocation
 */
import { TravelInfo, Guest, TransportGroup, TransportAllocation, InsertTransportGroup, InsertTransportAllocation } from "@shared/schema";
import { storage } from "../storage";
import { format, parse } from "date-fns";

// Interface for guest with travel info
interface GuestWithTravelInfo {
  guest: Guest;
  travelInfo: TravelInfo;
}

// Time slot generator (2-hour slots)
function generateTimeSlots(guestArrivalTimes: string[]): string[] {
  const timeSlots: string[] = [];
  
  guestArrivalTimes.forEach(timeStr => {
    try {
      // Parse time (assuming format like "14:30" or "2:30 PM")
      const time = parse(timeStr, 
                        timeStr.includes(':') ? (timeStr.includes('M') ? 'h:mm a' : 'HH:mm') : 'HH', 
                        new Date());
      
      // Round down to nearest even hour to create 2-hour slots
      const hour = time.getHours();
      const slotStartHour = Math.floor(hour / 2) * 2;
      
      // Create 2-hour time slot
      const slotStart = format(new Date().setHours(slotStartHour, 0, 0, 0), 'HH:mm');
      const slotEnd = format(new Date().setHours(slotStartHour + 2, 0, 0, 0), 'HH:mm');
      
      const timeSlot = `${slotStart}-${slotEnd}`;
      
      if (!timeSlots.includes(timeSlot)) {
        timeSlots.push(timeSlot);
      }
    } catch (error) {
      
    }
  });
  
  return timeSlots;
}

// Function to check if guests are family or linked by plus-one
async function areGuestsConnected(guest1: Guest, guest2: Guest): Promise<boolean> {
  // Same family
  if (guest1.isFamily && guest2.isFamily && 
      guest1.lastName === guest2.lastName && 
      guest1.side === guest2.side) {
    return true;
  }
  
  // Connected via plus-one
  if (guest1.plusOneAllowed && guest1.plusOneConfirmed && guest1.plusOneName) {
    const fullName = guest1.plusOneName.trim();
    // Simple name match (improve this with better name matching if needed)
    if (fullName.includes(guest2.firstName) && fullName.includes(guest2.lastName)) {
      return true;
    }
  }
  
  if (guest2.plusOneAllowed && guest2.plusOneConfirmed && guest2.plusOneName) {
    const fullName = guest2.plusOneName.trim();
    if (fullName.includes(guest1.firstName) && fullName.includes(guest1.lastName)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Group guests by arrival details and connected relationships
 */
export async function generateTransportGroups(eventId: number): Promise<TransportGroup[]> {
  try {
    // Get all guests with confirmed RSVP for this event
    const guests = await storage.getConfirmedGuestsByEvent(eventId);
    
    if (!guests || guests.length === 0) {
      return [];
    }
    
    // Fetch travel info for all guests
    const guestsWithTravelInfo: GuestWithTravelInfo[] = [];
    for (const guest of guests) {
      const travelInfo = await storage.getTravelInfoByGuestId(guest.id);
      if (travelInfo && travelInfo.needsTransportation) {
        guestsWithTravelInfo.push({ guest, travelInfo });
      }
    }
    
    if (guestsWithTravelInfo.length === 0) {
      return [];
    }
    
    // Get event transport settings
    const event = await storage.getEvent(eventId);
    const useSharedTransport = event?.transportMode === 'bus' || event?.transportMode === 'shuttle';
    
    // Group by arrival location, date, and time slot
    const groups: { [key: string]: GuestWithTravelInfo[] } = {};
    
    for (const guestInfo of guestsWithTravelInfo) {
      const { travelInfo } = guestInfo;
      
      // Skip if essential travel info is missing
      if (!travelInfo.arrivalDate || !travelInfo.arrivalTime || !travelInfo.arrivalLocation) {
        continue;
      }
      
      // Generate unique key for grouping
      const key = `${travelInfo.arrivalLocation.toLowerCase()}_${travelInfo.arrivalDate}_${travelInfo.arrivalTime}`;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      
      groups[key].push(guestInfo);
    }
    
    // Further process groups based on family/plus-one connections
    const finalGroups: GuestWithTravelInfo[][] = [];
    
    // For each location/date/time group
    for (const groupKey in groups) {
      const locationGroup = groups[groupKey];
      
      // If shared transport (bus/shuttle), keep as one group
      if (useSharedTransport) {
        finalGroups.push(locationGroup);
        continue;
      }
      
      // Otherwise, split into smaller groups based on connections
      const processedGuests = new Set<number>();
      
      for (const guestInfo of locationGroup) {
        // Skip if already processed
        if (processedGuests.has(guestInfo.guest.id)) {
          continue;
        }
        
        // Start a new connected group
        const connectedGroup: GuestWithTravelInfo[] = [guestInfo];
        processedGuests.add(guestInfo.guest.id);
        
        // Find all connected guests
        for (const otherGuestInfo of locationGroup) {
          if (processedGuests.has(otherGuestInfo.guest.id)) {
            continue;
          }
          
          // Check if connected to any guest in the current connected group
          let isConnected = false;
          for (const connectedGuestInfo of connectedGroup) {
            if (await areGuestsConnected(connectedGuestInfo.guest, otherGuestInfo.guest)) {
              isConnected = true;
              break;
            }
          }
          
          if (isConnected) {
            connectedGroup.push(otherGuestInfo);
            processedGuests.add(otherGuestInfo.guest.id);
          }
        }
        
        finalGroups.push(connectedGroup);
      }
    }
    
    // Create transport groups
    const transportGroups: TransportGroup[] = [];
    
    // Process each group and create transport groups
    for (const group of finalGroups) {
      if (group.length === 0) continue;
      
      // Use first guest's travel info as reference
      const refTravelInfo = group[0].travelInfo;
      
      // Determine vehicle type and capacity based on group size
      const groupSize = group.reduce((total: number, { guest }) => {
        // Count guest
        let count = 1;
        // Count plus one if applicable
        if (guest.plusOneAllowed && guest.plusOneConfirmed) {
          count += 1;
        }
        // Count children if applicable
        if (guest.childrenDetails) {
          try {
            const childrenArray = JSON.parse(guest.childrenDetails as string);
            count += childrenArray.length;
          } catch (e) {
            // If parsing fails, fallback to legacy field
            count += guest.numberOfChildren || 0;
          }
        }
        return total + count;
      }, 0);
      
      let vehicleType = 'sedan';
      let vehicleCapacity = 4;
      let vehicleCount = 1;
      
      if (useSharedTransport) {
        vehicleType = 'bus';
        vehicleCapacity = 50;
        // Calculate number of buses needed (with some buffer)
        vehicleCount = Math.ceil(groupSize / 45);
      } else if (groupSize > 6) {
        vehicleType = 'van';
        vehicleCapacity = 10;
        vehicleCount = Math.ceil(groupSize / 8);
      } else if (groupSize > 4) {
        vehicleType = 'suv';
        vehicleCapacity = 6;
      }
      
      // Generate time slot
      const arrivalTimes = group.map((g: GuestWithTravelInfo) => g.travelInfo.arrivalTime || '');
      const timeSlots = generateTimeSlots(arrivalTimes);
      const pickupTimeSlot = timeSlots[0] || '12:00-14:00'; // Default if parsing fails
      
      // Create group name
      const location = refTravelInfo.arrivalLocation || 'Unknown';
      const date = refTravelInfo.arrivalDate 
        ? format(new Date(refTravelInfo.arrivalDate), 'MMM dd')
        : 'Unknown Date';
      
      const groupName = `${location} - ${date} (${pickupTimeSlot})${useSharedTransport ? ' - Shared' : ''}`;
      
      // Create transport group
      const groupData: InsertTransportGroup = {
        eventId,
        name: groupName,
        transportMode: useSharedTransport ? 'bus' : 'car',
        vehicleType,
        vehicleCapacity,
        pickupLocation: refTravelInfo.arrivalLocation || 'Unknown',
        pickupLocationDetails: '',
        pickupDate: refTravelInfo.arrivalDate || new Date().toISOString(),
        pickupTimeSlot,
        dropoffLocation: event?.accommodationHotelName || event?.location || 'Venue',
        vehicleCount,
        status: 'draft'
      };
      
      const transportGroup = await storage.createTransportGroup(groupData);
      
      // Create allocations for each guest in the group
      for (const { guest } of group) {
        const allocationData: InsertTransportAllocation = {
          transportGroupId: transportGroup.id,
          guestId: guest.id,
          status: 'pending',
          includesPlusOne: guest.plusOneAllowed && guest.plusOneConfirmed,
          includesChildren: guest.childrenDetails ? JSON.parse(guest.childrenDetails as string).length > 0 : false,
          childrenCount: guest.numberOfChildren || 0
        };
        
        await storage.createTransportAllocation(allocationData);
      }
      
      transportGroups.push(transportGroup);
    }
    
    return transportGroups;
  } catch (error) {
    
    throw error;
  }
}

/**
 * Get transport groups with guest allocations
 */
export async function getTransportGroupWithAllocations(groupId: number): Promise<{
  group: TransportGroup;
  allocations: (TransportAllocation & { guest: Guest })[];
}> {
  const group = await storage.getTransportGroup(groupId);
  if (!group) {
    throw new Error(`Transport group with ID ${groupId} not found`);
  }
  
  const allocations = await storage.getTransportAllocationsByGroup(groupId);
  const allocationsWithGuests = [];
  
  for (const allocation of allocations) {
    const guest = await storage.getGuest(allocation.guestId);
    if (guest) {
      allocationsWithGuests.push({
        ...allocation,
        guest
      });
    }
  }
  
  return {
    group,
    allocations: allocationsWithGuests
  };
}

/**
 * Check if transport groups need to be regenerated
 * based on travel info updates
 */
export async function checkForTransportUpdates(eventId: number): Promise<{
  needsUpdate: boolean;
  modifiedGuests: Guest[];
}> {
  try {
    const groups = await storage.getTransportGroupsByEvent(eventId);
    if (!groups || groups.length === 0) {
      return { needsUpdate: false, modifiedGuests: [] };
    }
    
    const modifiedGuests: Guest[] = [];
    let needsUpdate = false;
    
    // Get all allocations
    for (const group of groups) {
      const allocations = await storage.getTransportAllocationsByGroup(group.id);
      
      for (const allocation of allocations) {
        const guest = await storage.getGuest(allocation.guestId);
        if (!guest) continue;
        
        const travelInfo = await storage.getTravelInfoByGuestId(guest.id);
        if (!travelInfo) continue;
        
        // Check if travel info still matches the group
        const arrivalTimeSlots = generateTimeSlots([travelInfo.arrivalTime || '']);
        const timeSlot = arrivalTimeSlots[0] || '';
        
        if (travelInfo.arrivalLocation !== group.pickupLocation ||
            travelInfo.arrivalDate !== group.pickupDate ||
            timeSlot !== group.pickupTimeSlot) {
          needsUpdate = true;
          modifiedGuests.push(guest);
        }
      }
    }
    
    return { needsUpdate, modifiedGuests };
  } catch (error) {
    
    throw error;
  }
}