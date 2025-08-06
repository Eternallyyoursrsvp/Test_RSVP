/**
 * Transport Optimization Service
 * Intelligent transport group formation and vehicle utilization optimization
 */

import { z } from 'zod';
import { metricsRegistry } from '../middleware/monitoring';
import { schemaValidationService, DatabaseConnection } from '../database/schema-validation';

// Transport Group Schema
export const TransportGroupSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  name: z.string().min(1).max(255),
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid().optional(),
  passengers: z.array(z.object({
    guestId: z.string().uuid(),
    guestName: z.string(),
    pickupLocation: z.string().optional(),
    dropoffLocation: z.string().optional(),
    specialRequirements: z.array(z.string()).default([])
  })),
  capacity: z.number().int().positive(),
  currentOccupancy: z.number().int().min(0),
  route: z.array(z.object({
    location: z.string(),
    type: z.enum(['pickup', 'dropoff', 'waypoint']),
    timestamp: z.string().datetime().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  })).default([]),
  status: z.enum(['planning', 'assigned', 'in_transit', 'completed', 'cancelled']),
  estimatedDuration: z.number().optional(), // minutes
  actualDuration: z.number().optional(), // minutes
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const VehicleSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(['bus', 'van', 'car', 'limousine', 'shuttle']),
  capacity: z.number().int().positive(),
  licensePlate: z.string().optional(),
  features: z.array(z.string()).default([]), // e.g., ['wheelchair_accessible', 'wifi', 'ac']
  driverId: z.string().uuid().optional(),
  availability: z.object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    isAvailable: z.boolean().default(true)
  }),
  currentLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional()
  }).optional(),
  status: z.enum(['available', 'assigned', 'in_use', 'maintenance', 'unavailable']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const DriverSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().min(1),
  licenseNumber: z.string().min(1),
  vehicleTypes: z.array(z.string()).default([]),
  languages: z.array(z.string()).default(['en']),
  rating: z.number().min(0).max(5).default(0),
  availability: z.object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    isAvailable: z.boolean().default(true)
  }),
  currentAssignment: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type TransportGroup = z.infer<typeof TransportGroupSchema>;
export type Vehicle = z.infer<typeof VehicleSchema>;
export type Driver = z.infer<typeof DriverSchema>;

// Optimization Algorithms
interface OptimizationOptions {
  prioritizeCapacity: boolean;
  minimizeVehicles: boolean;
  respectSpecialRequirements: boolean;
  optimizeRoutes: boolean;
  maxTravelTime: number; // minutes
}

interface PassengerAssignment {
  guestId: string;
  guestName: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  specialRequirements: string[];
  priority: number;
}

interface OptimizationResult {
  groups: TransportGroup[];
  unassignedPassengers: PassengerAssignment[];
  metrics: {
    totalVehiclesUsed: number;
    averageCapacityUtilization: number;
    totalEstimatedDuration: number;
    optimizationScore: number;
  };
  warnings: string[];
}

// Transport Optimization Service
export class TransportOptimizationService {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  // Group Management Operations
  async createGroup(groupData: Omit<TransportGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<TransportGroup> {
    const startTime = performance.now();
    
    try {
      const validatedData = TransportGroupSchema.omit({ 
        id: true, 
        createdAt: true, 
        updatedAt: true 
      }).parse(groupData);
      
      const group: TransportGroup = {
        id: crypto.randomUUID(),
        ...validatedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO transport_groups (
          id, event_id, name, vehicle_id, driver_id, passengers, capacity,
          current_occupancy, route, status, estimated_duration, notes,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          group.id, group.eventId, group.name, group.vehicleId, group.driverId,
          JSON.stringify(group.passengers), group.capacity, group.currentOccupancy,
          JSON.stringify(group.route), group.status, group.estimatedDuration,
          group.notes, group.createdAt, group.updatedAt
        ],
        `transport_group_create_${group.id}`
      );
      
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('transport_operation_duration_ms', duration, {
        operation: 'create_group',
        status: 'success'
      });
      
      console.log(`✅ Transport group created: ${group.name}`);
      return group;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('transport_operation_duration_ms', duration, {
        operation: 'create_group',
        status: 'error'
      });
      
      console.error('❌ Transport group creation failed:', error);
      throw new Error(`Transport group creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getGroupsByEvent(eventId: string): Promise<TransportGroup[]> {
    try {
      const groups = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM transport_groups WHERE event_id = $1 ORDER BY created_at ASC`,
        [eventId],
        `transport_groups_by_event_${eventId}`
      );
      
      return groups.map((group: any) => ({
        ...group,
        passengers: JSON.parse(group.passengers || '[]'),
        route: JSON.parse(group.route || '[]')
      }));
      
    } catch (error) {
      console.error('❌ Failed to get transport groups by event:', error);
      throw new Error(`Failed to retrieve transport groups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateGroup(groupId: string, updates: Partial<TransportGroup>): Promise<void> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;
      
      if (updates.name) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updates.name);
      }
      
      if (updates.vehicleId) {
        updateFields.push(`vehicle_id = $${paramIndex++}`);
        updateValues.push(updates.vehicleId);
      }
      
      if (updates.driverId !== undefined) {
        updateFields.push(`driver_id = $${paramIndex++}`);
        updateValues.push(updates.driverId);
      }
      
      if (updates.passengers) {
        updateFields.push(`passengers = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.passengers));
        
        // Update current occupancy
        updateFields.push(`current_occupancy = $${paramIndex++}`);
        updateValues.push(updates.passengers.length);
      }
      
      if (updates.route) {
        updateFields.push(`route = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.route));
      }
      
      if (updates.status) {
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(updates.status);
      }
      
      if (updates.estimatedDuration) {
        updateFields.push(`estimated_duration = $${paramIndex++}`);
        updateValues.push(updates.estimatedDuration);
      }
      
      if (updates.actualDuration) {
        updateFields.push(`actual_duration = $${paramIndex++}`);
        updateValues.push(updates.actualDuration);
      }
      
      if (updates.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        updateValues.push(updates.notes);
      }
      
      updateFields.push(`updated_at = $${paramIndex++}`);
      updateValues.push(new Date().toISOString());
      
      updateValues.push(groupId);
      
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `UPDATE transport_groups SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      );
      
      console.log(`✅ Transport group updated: ${groupId}`);
      
    } catch (error) {
      console.error('❌ Failed to update transport group:', error);
      throw new Error(`Transport group update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Passenger Assignment Operations  
  async assignPassengerToGroup(groupId: string, passenger: PassengerAssignment): Promise<void> {
    try {
      // Get current group
      const groups = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM transport_groups WHERE id = $1`,
        [groupId]
      );
      
      if (groups.length === 0) {
        throw new Error('Transport group not found');
      }
      
      const group = groups[0];
      const currentPassengers = JSON.parse(group.passengers || '[]');
      
      // Check capacity
      if (currentPassengers.length >= group.capacity) {
        throw new Error('Transport group is at full capacity');
      }
      
      // Check if passenger is already assigned
      const existingPassenger = currentPassengers.find((p: any) => p.guestId === passenger.guestId);
      if (existingPassenger) {
        throw new Error('Passenger is already assigned to this group');
      }
      
      // Add passenger
      const updatedPassengers = [...currentPassengers, passenger];
      
      await this.updateGroup(groupId, {
        passengers: updatedPassengers
      });
      
      console.log(`✅ Passenger assigned to group: ${passenger.guestName} -> ${group.name}`);
      
    } catch (error) {
      console.error('❌ Failed to assign passenger to group:', error);
      throw new Error(`Passenger assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async removePassengerFromGroup(groupId: string, guestId: string): Promise<void> {
    try {
      // Get current group
      const groups = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM transport_groups WHERE id = $1`,
        [groupId]
      );
      
      if (groups.length === 0) {
        throw new Error('Transport group not found');
      }
      
      const group = groups[0];
      const currentPassengers = JSON.parse(group.passengers || '[]');
      
      // Remove passenger
      const updatedPassengers = currentPassengers.filter((p: any) => p.guestId !== guestId);
      
      await this.updateGroup(groupId, {
        passengers: updatedPassengers
      });
      
      console.log(`✅ Passenger removed from group: ${guestId} from ${group.name}`);
      
    } catch (error) {
      console.error('❌ Failed to remove passenger from group:', error);
      throw new Error(`Passenger removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async movePassengerBetweenGroups(fromGroupId: string, toGroupId: string, guestId: string): Promise<void> {
    try {
      // Get both groups
      const groups = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM transport_groups WHERE id = ANY($1)`,
        [[fromGroupId, toGroupId]]
      );
      
      if (groups.length !== 2) {
        throw new Error('One or both transport groups not found');
      }
      
      const fromGroup = groups.find((g: any) => g.id === fromGroupId);
      const toGroup = groups.find((g: any) => g.id === toGroupId);
      
      const fromPassengers = JSON.parse(fromGroup.passengers || '[]');
      const toPassengers = JSON.parse(toGroup.passengers || '[]');
      
      // Find passenger in source group
      const passenger = fromPassengers.find((p: any) => p.guestId === guestId);
      if (!passenger) {
        throw new Error('Passenger not found in source group');
      }
      
      // Check capacity in destination group
      if (toPassengers.length >= toGroup.capacity) {
        throw new Error('Destination group is at full capacity');
      }
      
      // Move passenger
      const updatedFromPassengers = fromPassengers.filter((p: any) => p.guestId !== guestId);
      const updatedToPassengers = [...toPassengers, passenger];
      
      // Update both groups
      await Promise.all([
        this.updateGroup(fromGroupId, { passengers: updatedFromPassengers }),
        this.updateGroup(toGroupId, { passengers: updatedToPassengers })
      ]);
      
      console.log(`✅ Passenger moved between groups: ${passenger.guestName} from ${fromGroup.name} to ${toGroup.name}`);
      
    } catch (error) {
      console.error('❌ Failed to move passenger between groups:', error);
      throw new Error(`Passenger move failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Intelligent Group Formation
  async optimizeGroupFormation(
    eventId: string, 
    passengers: PassengerAssignment[], 
    options: Partial<OptimizationOptions> = {}
  ): Promise<OptimizationResult> {
    const startTime = performance.now();
    
    try {
      const defaultOptions: OptimizationOptions = {
        prioritizeCapacity: true,
        minimizeVehicles: true,
        respectSpecialRequirements: true,
        optimizeRoutes: false,
        maxTravelTime: 60,
        ...options
      };
      
      // Get available vehicles
      const vehicles = await this.getAvailableVehicles(eventId);
      
      if (vehicles.length === 0) {
        throw new Error('No vehicles available for optimization');
      }
      
      // Sort passengers by priority and special requirements
      const sortedPassengers = this.sortPassengersByPriority(passengers, defaultOptions);
      
      // Apply optimization algorithm
      const result = await this.applyGroupFormationAlgorithm(
        eventId,
        sortedPassengers,
        vehicles,
        defaultOptions
      );
      
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('transport_optimization_duration_ms', duration, {
        passengers_count: passengers.length.toString(),
        vehicles_count: vehicles.length.toString()
      });
      
      metricsRegistry.incrementCounter('transport_optimizations_total', {
        status: 'success'
      });
      
      console.log(`✅ Transport optimization completed: ${result.groups.length} groups created`);
      return result;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('transport_optimization_duration_ms', duration, {
        status: 'error'
      });
      
      metricsRegistry.incrementCounter('transport_optimizations_total', {
        status: 'error'
      });
      
      console.error('❌ Transport optimization failed:', error);
      throw new Error(`Transport optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getAvailableVehicles(eventId: string): Promise<Vehicle[]> {
    try {
      const vehicles = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM vehicles 
         WHERE event_id = $1 AND status = 'available' 
         ORDER BY capacity DESC`,
        [eventId],
        `available_vehicles_${eventId}`
      );
      
      return vehicles.map((vehicle: any) => ({
        ...vehicle,
        features: JSON.parse(vehicle.features || '[]'),
        availability: JSON.parse(vehicle.availability || '{}'),
        currentLocation: vehicle.current_location ? JSON.parse(vehicle.current_location) : undefined
      }));
      
    } catch (error) {
      console.error('❌ Failed to get available vehicles:', error);
      return [];
    }
  }

  private sortPassengersByPriority(
    passengers: PassengerAssignment[], 
    options: OptimizationOptions
  ): PassengerAssignment[] {
    return passengers.sort((a, b) => {
      // Prioritize passengers with special requirements
      if (options.respectSpecialRequirements) {
        if (a.specialRequirements.length > 0 && b.specialRequirements.length === 0) return -1;
        if (a.specialRequirements.length === 0 && b.specialRequirements.length > 0) return 1;
      }
      
      // Then by priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      
      // Finally by name for consistency
      return a.guestName.localeCompare(b.guestName);
    });
  }

  private async applyGroupFormationAlgorithm(
    eventId: string,
    passengers: PassengerAssignment[],
    vehicles: Vehicle[],
    options: OptimizationOptions
  ): Promise<OptimizationResult> {
    const groups: TransportGroup[] = [];
    const unassignedPassengers: PassengerAssignment[] = [];
    const warnings: string[] = [];
    
    let currentVehicleIndex = 0;
    let currentGroup: Partial<TransportGroup> | null = null;
    
    for (const passenger of passengers) {
      // Check if we need a new group
      if (!currentGroup || 
          currentGroup.passengers!.length >= currentGroup.capacity! ||
          !this.canAssignPassengerToGroup(passenger, currentGroup, options)) {
        
        // Finalize current group
        if (currentGroup && currentGroup.passengers!.length > 0) {
          groups.push(await this.finalizeGroup(eventId, currentGroup));
        }
        
        // Find next available vehicle
        if (currentVehicleIndex >= vehicles.length) {
          unassignedPassengers.push(passenger);
          warnings.push(`No more vehicles available for passenger: ${passenger.guestName}`);
          continue;
        }
        
        const vehicle = vehicles[currentVehicleIndex];
        currentVehicleIndex++;
        
        // Create new group
        currentGroup = {
          eventId,
          name: `Group ${groups.length + 1} - ${vehicle.name}`,
          vehicleId: vehicle.id,
          capacity: vehicle.capacity,
          currentOccupancy: 0,
          passengers: [],
          route: [],
          status: 'planning',
          notes: `Auto-generated group for ${vehicle.name}`
        };
      }
      
      // Assign passenger to current group
      if (currentGroup) {
        currentGroup.passengers!.push({
          guestId: passenger.guestId,
          guestName: passenger.guestName,
          pickupLocation: passenger.pickupLocation,
          dropoffLocation: passenger.dropoffLocation,
          specialRequirements: passenger.specialRequirements
        });
        currentGroup.currentOccupancy = currentGroup.passengers!.length;
      } else {
        unassignedPassengers.push(passenger);
      }
    }
    
    // Finalize last group
    if (currentGroup && currentGroup.passengers!.length > 0) {
      groups.push(await this.finalizeGroup(eventId, currentGroup));
    }
    
    // Calculate metrics
    const metrics = this.calculateOptimizationMetrics(groups, vehicles);
    
    return {
      groups,
      unassignedPassengers,
      metrics,
      warnings
    };
  }

  private canAssignPassengerToGroup(
    passenger: PassengerAssignment,
    group: Partial<TransportGroup>,
    options: OptimizationOptions
  ): boolean {
    // Check capacity
    if (group.passengers!.length >= group.capacity!) {
      return false;
    }
    
    // Check special requirements compatibility
    if (options.respectSpecialRequirements && passenger.specialRequirements.length > 0) {
      // This is where you'd implement complex compatibility logic
      // For now, we'll allow assignment unless there's a clear conflict
      const conflictingRequirements = ['wheelchair_only', 'no_pets'];
      const existingRequirements = group.passengers!.flatMap(p => p.specialRequirements);
      
      for (const requirement of passenger.specialRequirements) {
        if (conflictingRequirements.includes(requirement)) {
          const hasConflict = existingRequirements.some(req => 
            req !== requirement && conflictingRequirements.includes(req)
          );
          if (hasConflict) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  private async finalizeGroup(eventId: string, groupData: Partial<TransportGroup>): Promise<TransportGroup> {
    const finalGroup: TransportGroup = {
      id: crypto.randomUUID(),
      eventId,
      name: groupData.name!,
      vehicleId: groupData.vehicleId!,
      driverId: groupData.driverId,
      passengers: groupData.passengers!,
      capacity: groupData.capacity!,
      currentOccupancy: groupData.passengers!.length,
      route: groupData.route || [],
      status: 'planning',
      estimatedDuration: this.estimateGroupDuration(groupData.passengers!),
      notes: groupData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    await schemaValidationService.executeOptimizedQuery(
      this.db,
      `INSERT INTO transport_groups (
        id, event_id, name, vehicle_id, driver_id, passengers, capacity,
        current_occupancy, route, status, estimated_duration, notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        finalGroup.id, finalGroup.eventId, finalGroup.name, finalGroup.vehicleId,
        finalGroup.driverId, JSON.stringify(finalGroup.passengers), finalGroup.capacity,
        finalGroup.currentOccupancy, JSON.stringify(finalGroup.route), finalGroup.status,
        finalGroup.estimatedDuration, finalGroup.notes, finalGroup.createdAt, finalGroup.updatedAt
      ]
    );
    
    return finalGroup;
  }

  private estimateGroupDuration(passengers: TransportGroup['passengers']): number {
    // Simple estimation: base time + time per passenger + pickup/dropoff time
    const baseTime = 15; // minutes
    const timePerPassenger = 3; // minutes
    const uniqueLocations = new Set();
    
    passengers.forEach(p => {
      if (p.pickupLocation) uniqueLocations.add(p.pickupLocation);
      if (p.dropoffLocation) uniqueLocations.add(p.dropoffLocation);
    });
    
    const stopTime = uniqueLocations.size * 5; // 5 minutes per stop
    
    return baseTime + (passengers.length * timePerPassenger) + stopTime;
  }

  private calculateOptimizationMetrics(groups: TransportGroup[], availableVehicles: Vehicle[]): OptimizationResult['metrics'] {
    const totalPassengers = groups.reduce((sum, group) => sum + group.passengers.length, 0);
    const totalCapacity = groups.reduce((sum, group) => sum + group.capacity, 0);
    const totalEstimatedDuration = groups.reduce((sum, group) => sum + (group.estimatedDuration || 0), 0);
    
    const averageCapacityUtilization = totalCapacity > 0 ? (totalPassengers / totalCapacity) * 100 : 0;
    
    // Optimization score: higher is better
    const vehicleEfficiency = availableVehicles.length > 0 ? (groups.length / availableVehicles.length) : 0;
    const capacityEfficiency = averageCapacityUtilization / 100;
    const optimizationScore = (vehicleEfficiency * 0.4 + capacityEfficiency * 0.6) * 100;
    
    return {
      totalVehiclesUsed: groups.length,
      averageCapacityUtilization: Math.round(averageCapacityUtilization),
      totalEstimatedDuration,
      optimizationScore: Math.round(optimizationScore)
    };
  }

  // Vehicle and Driver Management
  async createVehicle(vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> {
    try {
      const validatedData = VehicleSchema.omit({ 
        id: true, 
        createdAt: true, 
        updatedAt: true 
      }).parse(vehicleData);
      
      const vehicle: Vehicle = {
        id: crypto.randomUUID(),
        ...validatedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO vehicles (
          id, event_id, name, type, capacity, license_plate, features,
          driver_id, availability, current_location, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          vehicle.id, vehicle.eventId, vehicle.name, vehicle.type, vehicle.capacity,
          vehicle.licensePlate, JSON.stringify(vehicle.features), vehicle.driverId,
          JSON.stringify(vehicle.availability), 
          vehicle.currentLocation ? JSON.stringify(vehicle.currentLocation) : null,
          vehicle.status, vehicle.createdAt, vehicle.updatedAt
        ]
      );
      
      console.log(`✅ Vehicle created: ${vehicle.name}`);
      return vehicle;
      
    } catch (error) {
      console.error('❌ Vehicle creation failed:', error);
      throw new Error(`Vehicle creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createDriver(driverData: Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>): Promise<Driver> {
    try {
      const validatedData = DriverSchema.omit({ 
        id: true, 
        createdAt: true, 
        updatedAt: true 
      }).parse(driverData);
      
      const driver: Driver = {
        id: crypto.randomUUID(),
        ...validatedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO drivers (
          id, name, email, phone, license_number, vehicle_types, languages,
          rating, availability, current_assignment, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          driver.id, driver.name, driver.email, driver.phone, driver.licenseNumber,
          JSON.stringify(driver.vehicleTypes), JSON.stringify(driver.languages),
          driver.rating, JSON.stringify(driver.availability), driver.currentAssignment,
          driver.isActive, driver.createdAt, driver.updatedAt
        ]
      );
      
      console.log(`✅ Driver created: ${driver.name}`);
      return driver;
      
    } catch (error) {
      console.error('❌ Driver creation failed:', error);
      throw new Error(`Driver creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Analytics and Reporting
  async getTransportStatistics(eventId: string): Promise<{
    totalGroups: number;
    totalPassengers: number;
    averageGroupSize: number;
    capacityUtilization: number;
    groupsByStatus: Record<string, number>;
    vehicleTypes: Record<string, number>;
  }> {
    try {
      const groups = await this.getGroupsByEvent(eventId);
      const vehicles = await this.getAvailableVehicles(eventId);
      
      const totalGroups = groups.length;
      const totalPassengers = groups.reduce((sum, group) => sum + group.passengers.length, 0);
      const totalCapacity = groups.reduce((sum, group) => sum + group.capacity, 0);
      
      const averageGroupSize = totalGroups > 0 ? Math.round(totalPassengers / totalGroups) : 0;
      const capacityUtilization = totalCapacity > 0 ? Math.round((totalPassengers / totalCapacity) * 100) : 0;
      
      const groupsByStatus: Record<string, number> = {};
      groups.forEach(group => {
        groupsByStatus[group.status] = (groupsByStatus[group.status] || 0) + 1;
      });
      
      const vehicleTypes: Record<string, number> = {};
      vehicles.forEach(vehicle => {
        vehicleTypes[vehicle.type] = (vehicleTypes[vehicle.type] || 0) + 1;
      });
      
      return {
        totalGroups,
        totalPassengers,
        averageGroupSize,
        capacityUtilization,
        groupsByStatus,
        vehicleTypes
      };
      
    } catch (error) {
      console.error('❌ Failed to get transport statistics:', error);
      throw new Error(`Failed to get transport statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
let transportOptimizationService: TransportOptimizationService | null = null;

export function initializeTransportOptimization(db: DatabaseConnection): TransportOptimizationService {
  if (!transportOptimizationService) {
    transportOptimizationService = new TransportOptimizationService(db);
    console.log('✅ Transport optimization service initialized');
  }
  return transportOptimizationService;
}

export function getTransportOptimizationService(): TransportOptimizationService {
  if (!transportOptimizationService) {
    throw new Error('Transport optimization service not initialized');
  }
  return transportOptimizationService;
}

export async function cleanupTransportOptimization(): Promise<void> {
  if (transportOptimizationService) {
    transportOptimizationService = null;
    console.log('✅ Transport optimization service cleaned up');
  }
}