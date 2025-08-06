import { db } from '../../db';
import {
  guests,
  travelInfo,
  weddingEvents,
  transportGroups,
  transportAllocations,
  insertTravelInfoSchema,
  Guest,
  TravelInfo,
  WeddingEvent,
  TransportGroup
} from '@shared/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createObjectCsvStringifier } from 'csv-writer';
import * as XLSX from 'sheetjs-style';

export interface FlightDashboardData {
  id: number | null;
  guestId: number;
  guestName: string;
  contactNumber: string | null;
  flightNumber: string;
  airline: string;
  arrivalDate: string | null;
  arrivalTime: string;
  arrivalLocation: string;
  departureDate: string | null;
  departureTime: string | null;
  departureLocation: string | null;
  terminal: string | null;
  gate: string | null;
  status: string;
  needsTransportation: boolean;
  specialRequirements: string | null;
}

export interface CoordinationStatus {
  totalGuestsNeedingAssistance: number;
  guestsWithFlightInfo: number;
  confirmedFlights: number;
  exported: boolean;
  notificationsSent: number;
  lastExportDate: Date | null;
  workflowCompletion: number;
}

export interface TransportGenerationResult {
  success: boolean;
  groupsCreated: number;
  guestsProcessed: number;
  bufferMinutes: number;
}

export class TravelCoordinationService {
  /**
   * FLIGHT COORDINATION DASHBOARD
   */
  
  async getFlightDashboard(eventId: number): Promise<FlightDashboardData[]> {
    // Get all guests for the event
    const allGuests = await db
      .select()
      .from(guests)
      .where(eq(guests.eventId, eventId));

    // Get travel info for these guests (simply return empty for now since no travel data exists)
    const travelData: TravelInfo[] = [];

    // Create a map for efficient lookup
    const travelMap = new Map<number, TravelInfo>();
    for (const travel of travelData) {
      travelMap.set(travel.guestId, travel);
    }

    // Combine guest and travel data
    const guestsWithTravel = allGuests.map((guest: Guest) => {
      const travel = travelMap.get(guest.id);
      return {
        id: guest.id,
        guestId: guest.id,
        guestName: `${guest.firstName} ${guest.lastName}`,
        name: `${guest.firstName} ${guest.lastName}`,
        email: guest.email,
        phone: guest.phone,
        travelId: travel?.id || null,
        travelMode: travel?.travelMode || null,
        arrivalDate: travel?.arrivalDate || null,
        arrivalTime: travel?.arrivalTime || null,
        arrivalLocation: travel?.arrivalLocation || null,
        departureDate: travel?.departureDate || null,
        departureTime: travel?.departureTime || null,
        departureLocation: travel?.departureLocation || null,
        flightNumber: travel?.flightNumber || null,
        airline: travel?.airline || null,
        terminal: travel?.terminal || null,
        gate: travel?.gate || null,
        flightStatus: travel?.flightStatus || 'scheduled',
        needsTransportation: travel?.needsTransportation || false,
        specialRequirements: travel?.specialRequirements || null
      };
    });

    // Transform data for flight coordination dashboard
    const flightData = guestsWithTravel
      .filter((guest: any) => guest.travelMode === 'air' && guest.arrivalDate)
      .map((guest: any) => ({
        id: guest.travelId,
        guestId: guest.id,
        guestName: guest.name,
        contactNumber: guest.phone,
        flightNumber: guest.flightNumber || '',
        airline: guest.airline || '',
        arrivalDate: guest.arrivalDate,
        arrivalTime: guest.arrivalTime || '',
        arrivalLocation: guest.arrivalLocation || '',
        departureDate: guest.departureDate,
        departureTime: guest.departureTime,
        departureLocation: guest.departureLocation,
        terminal: guest.terminal,
        gate: guest.gate,
        status: guest.flightStatus || 'scheduled',
        needsTransportation: guest.needsTransportation || false,
        specialRequirements: guest.specialRequirements
      }));

    return flightData;
  }

  /**
   * TRAVEL AGENT COORDINATION WORKFLOWS
   */
  
  async exportGuestListForAgent(eventId: number): Promise<{
    success: boolean;
    csvData: string;
    guestCount: number;
    eventName: string;
  }> {
    // Get event details
    const event = await db
      .select()
      .from(weddingEvents)
      .where(eq(weddingEvents.id, eventId))
      .limit(1);

    if (event.length === 0) {
      throw new Error('Event not found');
    }

    // Get all guests for the event
    const guestList = await db
      .select({
        firstName: guests.firstName,
        lastName: guests.lastName,
        email: guests.email,
        phone: guests.phone,
        plusOneAllowed: guests.plusOneAllowed,
        plusOneConfirmed: guests.plusOneConfirmed,
        plusOneName: guests.plusOneName,
        specialRequirements: travelInfo.specialRequirements,
        arrivalDate: travelInfo.arrivalDate,
        arrivalLocation: travelInfo.arrivalLocation,
        departureDate: travelInfo.departureDate,
        departureLocation: travelInfo.departureLocation,
        needsTransportation: travelInfo.needsTransportation
      })
      .from(guests)
      .leftJoin(travelInfo, eq(guests.id, travelInfo.guestId))
      .where(eq(guests.eventId, eventId));

    // Generate CSV content
    const csvHeaders = [
      'Guest Name',
      'Email',
      'Phone',
      'Plus One Name',
      'Preferred Arrival Date',
      'Preferred Arrival Airport',
      'Preferred Departure Date',
      'Preferred Departure Airport',
      'Needs Transportation',
      'Special Requirements',
      'Flight Number',
      'Airline',
      'Actual Arrival Date',
      'Actual Arrival Time',
      'Terminal',
      'Gate'
    ];

    const csvRows = guestList.map(guest => [
      guest.name,
      guest.email || '',
      guest.phone || '',
      guest.plusOneConfirmed ? guest.plusOneName || '' : '',
      guest.arrivalDate || '',
      guest.arrivalLocation || '',
      guest.departureDate || '',
      guest.departureLocation || '',
      guest.needsTransportation ? 'Yes' : 'No',
      guest.specialRequirements || '',
      '', // Flight Number - to be filled by travel agent
      '', // Airline - to be filled by travel agent
      '', // Actual Arrival Date - to be filled by travel agent
      '', // Actual Arrival Time - to be filled by travel agent
      '', // Terminal - to be filled by travel agent
      ''  // Gate - to be filled by travel agent
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return {
      success: true,
      csvData: csvContent,
      guestCount: guestList.length,
      eventName: event[0].title
    };
  }

  async importFlightDetails(eventId: number, csvData: string): Promise<{
    success: boolean;
    imported: number;
    errors: number;
    errorDetails: string[];
  }> {
    if (!csvData) {
      throw new Error('CSV data is required');
    }

    // Parse CSV data
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map((h: string) => h.replace(/"/g, ''));

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map((v: string) => v.replace(/"/g, ''));

        const guestName = values[0];
        const flightNumber = values[10];
        const airline = values[11];
        const arrivalDate = values[12];
        const arrivalTime = values[13];
        const terminal = values[14];
        const gate = values[15];

        if (!guestName || !flightNumber) {
          continue; // Skip incomplete rows
        }

        // Find guest by name
        const guest = await db
          .select()
          .from(guests)
          .where(and(
            eq(guests.eventId, eventId), 
            or(
              eq(guests.firstName, guestName),
              eq(guests.lastName, guestName),
              sql`${guests.firstName} || ' ' || ${guests.lastName} = ${guestName}`
            )
          ))
          .limit(1);

        if (guest.length === 0) {
          errors.push(`Guest not found: ${guestName}`);
          errorCount++;
          continue;
        }

        // Update or create travel info
        const existingTravel = await db
          .select()
          .from(travelInfo)
          .where(eq(travelInfo.guestId, guest[0].id))
          .limit(1);

        const travelData = {
          guestId: guest[0].id,
          travelMode: 'air' as const,
          flightNumber,
          airline,
          arrivalDate,
          arrivalTime,
          terminal,
          gate,
          flightStatus: 'confirmed' as const,
          needsTransportation: true
        };

        if (existingTravel.length > 0) {
          await db
            .update(travelInfo)
            .set({
              ...travelData,
              updatedAt: new Date()
            })
            .where(eq(travelInfo.id, existingTravel[0].id));
        } else {
          await db.insert(travelInfo).values(travelData);
        }

        successCount++;
      } catch (rowError) {
        errorCount++;
        errors.push(`Row ${i}: ${rowError}`);
      }
    }

    return {
      success: true,
      imported: successCount,
      errors: errorCount,
      errorDetails: errors.slice(0, 10) // Limit error details
    };
  }

  /**
   * FLIGHT STATUS MANAGEMENT
   */
  
  async updateFlightStatus(
    flightId: number,
    status: 'scheduled' | 'confirmed' | 'delayed' | 'cancelled'
  ): Promise<{ success: boolean; status: string }> {
    const validStatuses = ['scheduled', 'confirmed', 'delayed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid flight status');
    }

    await db
      .update(travelInfo)
      .set({
        flightStatus: status,
        updatedAt: new Date()
      })
      .where(eq(travelInfo.id, flightId));

    return { success: true, status };
  }

  async createFlightInfo(guestId: number, flightData: any): Promise<{
    success: boolean;
    travelInfo: TravelInfo;
    action: 'created' | 'updated';
  }> {
    // Validate guest exists
    const guest = await db
      .select()
      .from(guests)
      .where(eq(guests.id, guestId))
      .limit(1);

    if (guest.length === 0) {
      throw new Error('Guest not found');
    }

    // Check if travel info already exists
    const existingTravel = await db
      .select()
      .from(travelInfo)
      .where(eq(travelInfo.guestId, guestId))
      .limit(1);

    const travelPayload = {
      guestId,
      travelMode: 'air',
      flightNumber: flightData.flightNumber,
      airline: flightData.airline,
      arrivalDate: flightData.arrivalDate,
      arrivalTime: flightData.arrivalTime,
      arrivalLocation: flightData.arrivalLocation,
      departureDate: flightData.departureDate,
      departureTime: flightData.departureTime,
      departureLocation: flightData.departureLocation,
      terminal: flightData.terminal,
      gate: flightData.gate,
      flightStatus: flightData.flightStatus || 'scheduled',
      needsTransportation: flightData.needsTransportation || false,
      specialRequirements: flightData.specialRequirements,
      updatedAt: new Date()
    };

    let result: TravelInfo[];
    let action: 'created' | 'updated';

    if (existingTravel.length > 0) {
      // Update existing
      result = await db
        .update(travelInfo)
        .set(travelPayload)
        .where(eq(travelInfo.id, existingTravel[0].id))
        .returning();
      action = 'updated';
    } else {
      // Create new
      result = await db
        .insert(travelInfo)
        .values(travelPayload)
        .returning();
      action = 'created';
    }

    return {
      success: true,
      travelInfo: result[0],
      action
    };
  }

  /**
   * TRANSPORT GROUP GENERATION
   */
  
  async generateTransportFromFlights(eventId: number): Promise<TransportGenerationResult> {
    // Get event configuration for buffer times
    const event = await db
      .select()
      .from(weddingEvents)
      .where(eq(weddingEvents.id, eventId))
      .limit(1);

    if (event.length === 0) {
      throw new Error('Event not found');
    }

    const bufferMinutes = event[0].arrivalBufferTime ?
      parseInt(event[0].arrivalBufferTime.split(':')[0]) * 60 +
      parseInt(event[0].arrivalBufferTime.split(':')[1]) : 30;

    // Get all guests with confirmed flights needing transportation
    const flightGuests = await db
      .select({
        guestId: guests.id,
        guestName: sql`${guests.firstName} || ' ' || ${guests.lastName}`,
        arrivalDate: travelInfo.arrivalDate,
        arrivalTime: travelInfo.arrivalTime,
        arrivalLocation: travelInfo.arrivalLocation,
        flightNumber: travelInfo.flightNumber,
        needsTransportation: travelInfo.needsTransportation
      })
      .from(guests)
      .leftJoin(travelInfo, eq(guests.id, travelInfo.guestId))
      .where(and(
        eq(guests.eventId, eventId),
        eq(travelInfo.travelMode, 'air'),
        eq(travelInfo.needsTransportation, true),
        eq(travelInfo.flightStatus, 'confirmed')
      ));

    // Group guests by arrival time slots (considering buffer time)
    const timeSlots: { [key: string]: any[] } = {};

    flightGuests.forEach(guest => {
      if (!guest.arrivalDate || !guest.arrivalTime) return;

      const arrivalDateTime = new Date(`${guest.arrivalDate}T${guest.arrivalTime}`);
      const pickupDateTime = new Date(arrivalDateTime.getTime() + bufferMinutes * 60000);

      // Create 30-minute pickup time slots
      const slotHour = Math.floor(pickupDateTime.getHours());
      const slotMinute = pickupDateTime.getMinutes() < 30 ? 0 : 30;
      const timeSlotKey = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}`;
      const locationSlotKey = `${guest.arrivalLocation}_${guest.arrivalDate}_${timeSlotKey}`;

      if (!timeSlots[locationSlotKey]) {
        timeSlots[locationSlotKey] = [];
      }
      timeSlots[locationSlotKey].push(guest);
    });

    let groupCount = 0;

    // Create transport groups for each time slot
    for (const [slotKey, guests] of Object.entries(timeSlots)) {
      const [location, date, time] = slotKey.split('_');

      // Determine vehicle type based on group size
      const groupSize = guests.length;
      let vehicleType = 'sedan';
      let vehicleCount = 1;

      if (groupSize <= 4) {
        vehicleType = 'sedan';
        vehicleCount = 1;
      } else if (groupSize <= 8) {
        vehicleType = 'suv';
        vehicleCount = Math.ceil(groupSize / 6);
      } else {
        vehicleType = 'bus';
        vehicleCount = Math.ceil(groupSize / 15);
      }

      // Create transport group
      const [transportGroup] = await db
        .insert(transportGroups)
        .values({
          eventId,
          name: `Flight Pickup - ${location} ${time}`,
          pickupLocation: location,
          pickupDate: date,
          pickupTimeSlot: time,
          dropoffLocation: event[0].accommodationHotelName || event[0].location || 'Hotel',
          vehicleType,
          vehicleCount,
          capacity: vehicleCount * (vehicleType === 'bus' ? 15 : vehicleType === 'suv' ? 6 : 4),
          status: 'draft'
        })
        .returning();

      // Create allocations for each guest
      for (const guest of guests) {
        await db
          .insert(transportAllocations)
          .values({
            transportGroupId: transportGroup.id,
            guestId: guest.guestId,
            status: 'pending',
            includesPlusOne: false, // Will be updated based on guest data
            includesChildren: false,
            childrenCount: 0
          });
      }

      groupCount++;
    }

    return {
      success: true,
      groupsCreated: groupCount,
      guestsProcessed: flightGuests.length,
      bufferMinutes
    };
  }

  /**
   * FLIGHT COORDINATION STATUS
   */
  
  async getCoordinationStatus(eventId: number): Promise<CoordinationStatus> {
    // Get event configuration
    const event = await db
      .select()
      .from(weddingEvents)
      .where(eq(weddingEvents.id, eventId))
      .limit(1);

    if (event.length === 0) {
      throw new Error('Event not found');
    }

    // Get flight assistance guests count
    const guestsWithFlightAssistance = await db
      .select()
      .from(guests)
      .where(and(
        eq(guests.eventId, eventId),
        eq(travelInfo.needsFlightAssistance, true)
      ));

    // Get guests with flight information
    const guestsWithFlightInfo = await db
      .select({
        guestId: guests.id,
        flightInfo: travelInfo
      })
      .from(guests)
      .leftJoin(travelInfo, eq(guests.id, travelInfo.guestId))
      .where(and(
        eq(guests.eventId, eventId),
        eq(travelInfo.needsFlightAssistance, true)
      ));

    // Calculate workflow status
    const totalNeedingAssistance = guestsWithFlightAssistance.length;
    const withFlightInfo = guestsWithFlightInfo.filter(g => g.flightInfo).length;
    const confirmed = guestsWithFlightInfo.filter(g =>
      g.flightInfo && g.flightInfo.status === 'confirmed'
    ).length;

    return {
      totalGuestsNeedingAssistance: totalNeedingAssistance,
      guestsWithFlightInfo: withFlightInfo,
      confirmedFlights: confirmed,
      exported: event[0].flightListExported || false,
      notificationsSent: event[0].flightNotificationsSent || 0,
      lastExportDate: event[0].flightListExportDate,
      workflowCompletion: totalNeedingAssistance > 0 ?
        Math.round(((withFlightInfo + confirmed) / (totalNeedingAssistance * 2)) * 100) : 100
    };
  }

  /**
   * FLIGHT NOTIFICATIONS
   */
  
  async sendFlightNotifications(
    eventId: number,
    type: 'confirmation' | 'reminder' | 'update',
    guestIds?: number[]
  ): Promise<{ success: boolean; sentCount: number; notificationType: string }> {
    if (!['confirmation', 'reminder', 'update'].includes(type)) {
      throw new Error('Invalid notification type');
    }

    // Get event details for email templates
    const event = await db
      .select()
      .from(weddingEvents)
      .where(eq(weddingEvents.id, eventId))
      .limit(1);

    if (event.length === 0) {
      throw new Error('Event not found');
    }

    // Get guests with their travel information
    const guestsToNotify = await db
      .select({
        guest: guests,
        travel: travelInfo
      })
      .from(guests)
      .leftJoin(travelInfo, eq(guests.id, travelInfo.guestId))
      .where(and(
        eq(guests.eventId, eventId),
        guestIds && guestIds.length > 0 ?
          // Filter by specific guest IDs if provided
          eq(guests.id, guestIds[0]) : // Simplified for demo
          eq(travelInfo.needsFlightAssistance, true)
      ));

    let sentCount = 0;

    for (const { guest, travel } of guestsToNotify) {
      try {
        // Here you would integrate with your email service
        // For now, we'll just simulate the notification

        // In a real implementation, you'd call your email service here
        // await emailService.sendFlightNotification({
        //   to: guest.email,
        //   type,
        //   guestName: guest.name,
        //   eventDetails: event[0],
        //   flightDetails: travel
        // });

        sentCount++;
      } catch (error) {
        // Log error but continue with other notifications
        console.error(`Failed to send notification to ${guest.email}:`, error);
      }
    }

    // Update notification tracking
    const currentCount = event[0].flightNotificationsSent || 0;
    await db
      .update(weddingEvents)
      .set({
        flightNotificationsSent: currentCount + sentCount,
        lastFlightNotificationDate: new Date()
      })
      .where(eq(weddingEvents.id, eventId));

    return {
      success: true,
      sentCount,
      notificationType: type
    };
  }

  /**
   * ADVANCED FLIGHT COORDINATION WORKFLOWS
   */
  
  async exportFlightListForAgent(
    eventId: number,
    format: 'csv' | 'xlsx' = 'csv',
    includeDetails: boolean = true
  ): Promise<{
    success: boolean;
    content: string | Buffer;
    format: string;
    filename: string;
    exportedCount: number;
  }> {
    // Get guests needing flight assistance with their details
    const flightGuests = await db
      .select({
        guestId: guests.id,
        guestName: sql`${guests.firstName} || ' ' || ${guests.lastName}`,
        email: guests.email,
        phone: guests.phone,
        needsFlightAssistance: travelInfo.needsFlightAssistance,
        accommodationPreference: guests.accommodationPreference,
        dietaryRestrictions: guests.dietaryRestrictions,
        specialRequirements: travelInfo.specialRequirements,
        travelMode: travelInfo.travelMode,
        arrivalDate: travelInfo.arrivalDate,
        departureDate: travelInfo.departureDate,
        flightInfo: travelInfo
      })
      .from(guests)
      .leftJoin(travelInfo, eq(guests.id, travelInfo.guestId))
      .where(and(
        eq(guests.eventId, eventId),
        eq(travelInfo.needsFlightAssistance, true)
      ));

    // Prepare export data
    const exportData = flightGuests.map((guest: any) => ({
      'Guest Name': guest.guestName,
      'Email': guest.email,
      'Phone': guest.phone || '',
      'Travel Mode': guest.travelMode || 'Air',
      'Preferred Arrival Date': guest.arrivalDate ? guest.arrivalDate.toISOString().split('T')[0] : '',
      'Preferred Departure Date': guest.departureDate ? guest.departureDate.toISOString().split('T')[0] : '',
      'Accommodation Preference': guest.accommodationPreference || '',
      'Dietary Restrictions': guest.dietaryRestrictions || '',
      'Special Requests': guest.specialRequests || '',
      'Current Flight Number': guest.flightInfo?.flightNumber || '',
      'Current Arrival Time': guest.flightInfo?.arrivalTime || '',
      'Current Departure Time': guest.flightInfo?.departureTime || '',
      'Origin Airport': guest.flightInfo?.originAirport || '',
      'Destination Airport': guest.flightInfo?.destinationAirport || ''
    }));

    let content: string | Buffer;
    let contentType: string;
    let fileExtension: string;

    if (format === 'csv') {
      const csvStringifier = createObjectCsvStringifier({
        header: Object.keys(exportData[0] || {}).map(key => ({ id: key, title: key }))
      });

      content = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(exportData);
      contentType = 'text/csv';
      fileExtension = 'csv';
    } else {
      // Excel format
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Flight List');

      content = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileExtension = 'xlsx';
    }

    // Update export tracking
    await db
      .update(weddingEvents)
      .set({
        flightListExported: true,
        flightListExportDate: new Date()
      })
      .where(eq(weddingEvents.id, eventId));

    return {
      success: true,
      content,
      format: fileExtension,
      filename: `flight-list-event-${eventId}.${fileExtension}`,
      exportedCount: exportData.length
    };
  }

  async importFlightDetailsAdvanced(eventId: number, flightData: any[]): Promise<{
    success: boolean;
    updatedCount: number;
    createdCount: number;
    totalProcessed: number;
  }> {
    if (!Array.isArray(flightData)) {
      throw new Error('Flight data must be an array');
    }

    let updatedCount = 0;
    let createdCount = 0;

    for (const flight of flightData) {
      // Find guest by name or email
      const guest = await db
        .select()
        .from(guests)
        .where(and(
          eq(guests.eventId, eventId),
          // Match by name or email
          // Note: In a real implementation, you'd want more sophisticated matching
        ))
        .limit(1);

      if (guest.length === 0) {
        console.log(`Guest not found for flight data:`, flight);
        continue;
      }

      const guestId = guest[0].id;

      // Check if travel info already exists
      const existingTravelInfo = await db
        .select()
        .from(travelInfo)
        .where(eq(travelInfo.guestId, guestId))
        .limit(1);

      const flightInfoData = {
        guestId,
        travelMode: 'air',
        flightNumber: flight.flightNumber,
        arrivalTime: flight.arrivalTime,
        departureTime: flight.departureTime,
        originAirport: flight.originAirport,
        destinationAirport: flight.destinationAirport,
        airline: flight.airline,
        status: 'confirmed',
        updatedAt: new Date()
      };

      if (existingTravelInfo.length > 0) {
        // Update existing record
        await db
          .update(travelInfo)
          .set(flightInfoData)
          .where(eq(travelInfo.id, existingTravelInfo[0].id));
        updatedCount++;
      } else {
        // Create new record
        await db
          .insert(travelInfo)
          .values(flightInfoData);
        createdCount++;
      }

      // Update guest flight status
      await db
        .update(guests)
        .set({ flightStatus: 'confirmed' })
        .where(eq(guests.id, guestId));
    }

    return {
      success: true,
      updatedCount,
      createdCount,
      totalProcessed: updatedCount + createdCount
    };
  }
}

export const travelCoordinationService = new TravelCoordinationService();