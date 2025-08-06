import { db } from '../../db';
import {
  transportVendors,
  locationRepresentatives,
  eventVehicles,
  guestTravelInfo,
  transportGroups,
  insertTransportVendorSchema,
  insertLocationRepresentativeSchema,
  insertEventVehicleSchema,
  insertGuestTravelInfoSchema,
  TransportVendor,
  LocationRepresentative,
  EventVehicle,
  GuestTravelInfo
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export class TransportService {
  /**
   * TRANSPORT VENDORS MANAGEMENT
   */
  
  async createVendor(eventId: number, vendorData: z.infer<typeof insertTransportVendorSchema>): Promise<TransportVendor> {
    const validatedData = insertTransportVendorSchema.parse({
      ...vendorData,
      eventId
    });

    const [vendor] = await db
      .insert(transportVendors)
      .values(validatedData)
      .returning();

    return vendor;
  }

  async listVendors(eventId: number): Promise<TransportVendor[]> {
    return await db
      .select()
      .from(transportVendors)
      .where(eq(transportVendors.eventId, eventId));
  }

  async updateVendor(
    vendorId: number, 
    eventId: number, 
    updates: Partial<z.infer<typeof insertTransportVendorSchema>>
  ): Promise<TransportVendor | null> {
    const validatedData = insertTransportVendorSchema.partial().parse(updates);

    const [updatedVendor] = await db
      .update(transportVendors)
      .set(validatedData)
      .where(and(
        eq(transportVendors.id, vendorId),
        eq(transportVendors.eventId, eventId)
      ))
      .returning();

    return updatedVendor || null;
  }

  async deleteVendor(vendorId: number, eventId: number): Promise<boolean> {
    const result = await db
      .delete(transportVendors)
      .where(and(
        eq(transportVendors.id, vendorId),
        eq(transportVendors.eventId, eventId)
      ));

    return result.rowCount > 0;
  }

  /**
   * LOCATION REPRESENTATIVES MANAGEMENT  
   */
  
  async createRepresentative(
    eventId: number, 
    repData: z.infer<typeof insertLocationRepresentativeSchema>
  ): Promise<LocationRepresentative> {
    const validatedData = insertLocationRepresentativeSchema.parse({
      ...repData,
      eventId
    });

    const [representative] = await db
      .insert(locationRepresentatives)
      .values(validatedData)
      .returning();

    return representative;
  }

  async listRepresentatives(eventId: number): Promise<LocationRepresentative[]> {
    return await db
      .select()
      .from(locationRepresentatives)
      .where(eq(locationRepresentatives.eventId, eventId));
  }

  async updateRepresentative(
    repId: number,
    eventId: number,
    updates: Partial<z.infer<typeof insertLocationRepresentativeSchema>>
  ): Promise<LocationRepresentative | null> {
    const validatedData = insertLocationRepresentativeSchema.partial().parse(updates);

    const [updatedRep] = await db
      .update(locationRepresentatives)
      .set(validatedData)
      .where(and(
        eq(locationRepresentatives.id, repId),
        eq(locationRepresentatives.eventId, eventId)
      ))
      .returning();

    return updatedRep || null;
  }

  async deleteRepresentative(repId: number, eventId: number): Promise<boolean> {
    const result = await db
      .delete(locationRepresentatives)
      .where(and(
        eq(locationRepresentatives.id, repId),
        eq(locationRepresentatives.eventId, eventId)
      ));

    return result.rowCount > 0;
  }

  /**
   * EVENT VEHICLES MANAGEMENT
   */
  
  async createVehicle(eventId: number, vehicleData: z.infer<typeof insertEventVehicleSchema>): Promise<EventVehicle> {
    const validatedData = insertEventVehicleSchema.parse({
      ...vehicleData,
      eventId,
      status: 'available',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const [vehicle] = await db
      .insert(eventVehicles)
      .values(validatedData)
      .returning();

    return vehicle;
  }

  async listVehicles(eventId: number): Promise<(EventVehicle & { vendor?: TransportVendor })[]> {
    return await db
      .select({
        id: eventVehicles.id,
        eventId: eventVehicles.eventId,
        vehicleType: eventVehicles.vehicleType,
        capacity: eventVehicles.capacity,
        plateNumber: eventVehicles.plateNumber,
        driverName: eventVehicles.driverName,
        driverPhone: eventVehicles.driverPhone,
        vendorId: eventVehicles.vendorId,
        status: eventVehicles.status,
        currentLocation: eventVehicles.currentLocation,
        route: eventVehicles.route,
        notes: eventVehicles.notes,
        createdAt: eventVehicles.createdAt,
        updatedAt: eventVehicles.updatedAt,
        vendor: transportVendors
      })
      .from(eventVehicles)
      .leftJoin(transportVendors, eq(eventVehicles.vendorId, transportVendors.id))
      .where(eq(eventVehicles.eventId, eventId));
  }

  async updateVehicle(
    vehicleId: number,
    eventId: number,
    updates: Partial<z.infer<typeof insertEventVehicleSchema>>
  ): Promise<EventVehicle | null> {
    const validatedData = insertEventVehicleSchema.partial().parse({
      ...updates,
      updatedAt: new Date()
    });

    const [updatedVehicle] = await db
      .update(eventVehicles)
      .set(validatedData)
      .where(and(
        eq(eventVehicles.id, vehicleId),
        eq(eventVehicles.eventId, eventId)
      ))
      .returning();

    return updatedVehicle || null;
  }

  async updateVehicleStatus(
    vehicleId: number,
    eventId: number,
    status: 'available' | 'assigned' | 'in_transit' | 'maintenance',
    currentLocation?: string
  ): Promise<EventVehicle | null> {
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (currentLocation) {
      updateData.currentLocation = currentLocation;
    }

    const [updatedVehicle] = await db
      .update(eventVehicles)
      .set(updateData)
      .where(and(
        eq(eventVehicles.id, vehicleId),
        eq(eventVehicles.eventId, eventId)
      ))
      .returning();

    return updatedVehicle || null;
  }

  async deleteVehicle(vehicleId: number, eventId: number): Promise<{ success: boolean; message?: string }> {
    // Check if vehicle is assigned to any transport groups
    const assignedGroups = await db
      .select()
      .from(transportGroups)
      .where(and(
        eq(transportGroups.eventId, eventId),
        eq(transportGroups.vehicleId, vehicleId)
      ));

    if (assignedGroups.length > 0) {
      return {
        success: false,
        message: 'Cannot delete vehicle that is assigned to transport groups'
      };
    }

    const result = await db
      .delete(eventVehicles)
      .where(and(
        eq(eventVehicles.id, vehicleId),
        eq(eventVehicles.eventId, eventId)
      ));

    return { success: result.rowCount > 0 };
  }

  async getVehicleAssignments(vehicleId: number, eventId: number) {
    return await db
      .select({
        group: transportGroups,
        assignedAt: transportGroups.createdAt
      })
      .from(transportGroups)
      .where(and(
        eq(transportGroups.eventId, eventId),
        eq(transportGroups.vehicleId, vehicleId)
      ));
  }

  async assignVehicleToGroup(
    vehicleId: number,
    eventId: number,
    transportGroupId: number
  ): Promise<{ success: boolean; message?: string; assignment?: any }> {
    // Verify vehicle exists and is available
    const vehicle = await db
      .select()
      .from(eventVehicles)
      .where(and(
        eq(eventVehicles.id, vehicleId),
        eq(eventVehicles.eventId, eventId)
      ))
      .limit(1);

    if (vehicle.length === 0) {
      return { success: false, message: 'Vehicle not found' };
    }

    if (vehicle[0].status !== 'available') {
      return { success: false, message: 'Vehicle is not available for assignment' };
    }

    // Verify transport group exists
    const group = await db
      .select()
      .from(transportGroups)
      .where(and(
        eq(transportGroups.id, transportGroupId),
        eq(transportGroups.eventId, eventId)
      ))
      .limit(1);

    if (group.length === 0) {
      return { success: false, message: 'Transport group not found' };
    }

    // Check capacity
    if (vehicle[0].capacity < group[0].guestCount) {
      return {
        success: false,
        message: 'Vehicle capacity insufficient for group size'
      };
    }

    // Assign vehicle to group
    await db
      .update(transportGroups)
      .set({
        vehicleId,
        updatedAt: new Date()
      })
      .where(eq(transportGroups.id, transportGroupId));

    // Update vehicle status
    await db
      .update(eventVehicles)
      .set({
        status: 'assigned',
        updatedAt: new Date()
      })
      .where(eq(eventVehicles.id, vehicleId));

    return {
      success: true,
      assignment: {
        vehicleId,
        transportGroupId,
        assignedAt: new Date()
      }
    };
  }

  async unassignVehicle(vehicleId: number, eventId: number): Promise<boolean> {
    // Find and unassign from transport groups
    await db
      .update(transportGroups)
      .set({
        vehicleId: null,
        updatedAt: new Date()
      })
      .where(and(
        eq(transportGroups.eventId, eventId),
        eq(transportGroups.vehicleId, vehicleId)
      ));

    // Update vehicle status to available
    const result = await db
      .update(eventVehicles)
      .set({
        status: 'available',
        updatedAt: new Date()
      })
      .where(and(
        eq(eventVehicles.id, vehicleId),
        eq(eventVehicles.eventId, eventId)
      ));

    return result.rowCount > 0;
  }

  /**
   * GUEST TRAVEL INFO MANAGEMENT
   */
  
  async createTravelInfo(eventId: number, travelData: z.infer<typeof insertGuestTravelInfoSchema>): Promise<GuestTravelInfo> {
    const validatedData = insertGuestTravelInfoSchema.parse({
      ...travelData,
      eventId
    });

    const [travelInfo] = await db
      .insert(guestTravelInfo)
      .values(validatedData)
      .returning();

    return travelInfo;
  }

  async listTravelInfo(eventId: number): Promise<GuestTravelInfo[]> {
    return await db
      .select()
      .from(guestTravelInfo)
      .where(eq(guestTravelInfo.eventId, eventId));
  }

  async updateTravelInfo(
    travelInfoId: number,
    eventId: number,
    updates: Partial<z.infer<typeof insertGuestTravelInfoSchema>>
  ): Promise<GuestTravelInfo | null> {
    const validatedData = insertGuestTravelInfoSchema.partial().parse(updates);

    const [updatedTravelInfo] = await db
      .update(guestTravelInfo)
      .set(validatedData)
      .where(and(
        eq(guestTravelInfo.id, travelInfoId),
        eq(guestTravelInfo.eventId, eventId)
      ))
      .returning();

    return updatedTravelInfo || null;
  }

  async deleteTravelInfo(travelInfoId: number, eventId: number): Promise<boolean> {
    const result = await db
      .delete(guestTravelInfo)
      .where(and(
        eq(guestTravelInfo.id, travelInfoId),
        eq(guestTravelInfo.eventId, eventId)
      ));

    return result.rowCount > 0;
  }
}

export const transportService = new TransportService();