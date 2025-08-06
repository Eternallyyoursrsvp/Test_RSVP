/**
 * Transport Group Optimization Service
 * Intelligent algorithms for passenger assignment, vehicle utilization, and route optimization
 */

import { schemaValidationService, DatabaseConnection } from '../database/schema-validation';
import { metricsRegistry } from '../middleware/monitoring';

// Core interfaces
export interface OptimizationPassenger {
  guestId: string;
  guestName: string;
  pickupLocation: string;
  dropoffLocation: string;
  arrivalTime?: string;
  departureTime?: string;
  specialRequirements: string[];
  priority: number; // 1-10, higher = more priority
  groupPreferences?: string[]; // Preferred to be with specific guests
  avoidances?: string[]; // Prefer not to be with specific guests
}

export interface OptimizationVehicle {
  id: string;
  name: string;
  type: 'bus' | 'van' | 'car' | 'limousine' | 'shuttle';
  capacity: number;
  features: string[];
  driverId?: string;
  isAccessible: boolean;
  costPerKm: number;
  availableFrom: string;
  availableUntil: string;
}

export interface OptimizationGroup {
  id: string;
  vehicleId: string;
  passengers: OptimizationPassenger[];
  route: RoutePoint[];
  estimatedDuration: number;
  estimatedCost: number;
  capacityUtilization: number;
  specialRequirementsCovered: string[];
}

// Transport Group interface for database operations
interface TransportGroup {
  id: string;
  eventId: string;
  name: string;
  vehicleId: string;
  driverId?: string;
  passengers: {
    guestId: string;
    guestName: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    specialRequirements: string[];
  }[];
  capacity: number;
  currentOccupancy: number;
  route: {
    location: string;
    type: 'pickup' | 'dropoff' | 'waypoint';
    timestamp?: string;
    coordinates?: { lat: number; lng: number };
  }[];
  status: 'planning' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
  estimatedDuration?: number;
  notes?: string;
  vehicleName?: string;
  vehicleType?: string;
  driverName?: string;
  driverPhone?: string;
}

export interface RoutePoint {
  location: string;
  type: 'pickup' | 'dropoff' | 'waypoint';
  passengers: string[]; // Guest IDs for this point
  estimatedTime: string;
  coordinates?: { lat: number; lng: number };
}

export interface OptimizationOptions {
  prioritizeCapacity: boolean;
  minimizeVehicles: boolean;
  respectSpecialRequirements: boolean;
  optimizeRoutes: boolean;
  maxTravelTime: number; // minutes
  allowPartialFilling: boolean;
  prioritizeGroupPreferences: boolean;
  minimizeCost: boolean;
  maximizeComfort: boolean;
}

export interface OptimizationResult {
  groups: TransportGroup[];
  unassignedPassengers: OptimizationPassenger[];
  metrics: OptimizationMetrics;
  warnings: string[];
  recommendations: string[];
}

export interface OptimizationMetrics {
  totalVehiclesUsed: number;
  averageCapacityUtilization: number;
  totalEstimatedDuration: number;
  totalEstimatedCost: number;
  optimizationScore: number; // 0-100
  satisfactionScore: number; // 0-100 based on preferences met
  unassignedCount: number;
  specialRequirementsCoverage: number; // 0-100%
}

export class TransportOptimizationService {
  constructor(private db: DatabaseConnection) {}

  /**
   * Create a new transport group
   */
  async createGroup(groupData: {
    eventId: string;
    name: string;
    vehicleId: string;
    driverId?: string;
    capacity: number;
    notes?: string;
    passengers: any[];
    currentOccupancy: number;
    route: any[];
    status: string;
  }): Promise<TransportGroup> {
    try {
      const groupId = crypto.randomUUID();
      
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO transport_groups (id, event_id, name, vehicle_id, driver_id, capacity, notes, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [groupId, groupData.eventId, groupData.name, groupData.vehicleId, groupData.driverId, groupData.capacity, groupData.notes, groupData.status]
      );

      const group: TransportGroup = {
        id: groupId,
        eventId: groupData.eventId,
        name: groupData.name,
        vehicleId: groupData.vehicleId,
        driverId: groupData.driverId,
        passengers: [],
        capacity: groupData.capacity,
        currentOccupancy: 0,
        route: [],
        status: groupData.status as any,
        notes: groupData.notes
      };

      console.log(`✅ Created transport group: ${groupId}`);
      return group;

    } catch (error) {
      console.error('❌ Failed to create transport group:', error);
      throw new Error(`Failed to create transport group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all transport groups for an event
   */
  async getGroupsByEvent(eventId: string): Promise<TransportGroup[]> {
    try {
      const groups = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT tg.*, v.name as vehicle_name, v.type as vehicle_type, 
                d.name as driver_name, d.phone as driver_phone
         FROM transport_groups tg
         LEFT JOIN vehicles v ON tg.vehicle_id = v.id
         LEFT JOIN drivers d ON tg.driver_id = d.id
         WHERE tg.event_id = $1
         ORDER BY tg.created_at DESC`,
        [eventId]
      );

      // Get passengers for each group
      const groupsWithPassengers = await Promise.all(
        groups.map(async (group: any) => {
          const passengers = await schemaValidationService.executeOptimizedQuery(
            this.db,
            `SELECT * FROM transport_group_passengers WHERE group_id = $1`,
            [group.id]
          );

          const route = await schemaValidationService.executeOptimizedQuery(
            this.db,
            `SELECT * FROM transport_group_routes WHERE group_id = $1 ORDER BY sequence`,
            [group.id]
          );

          return {
            id: group.id,
            eventId: group.event_id,
            name: group.name,
            vehicleId: group.vehicle_id,
            driverId: group.driver_id,
            passengers: passengers.map((p: any) => ({
              guestId: p.guest_id,
              guestName: p.guest_name,
              pickupLocation: p.pickup_location,
              dropoffLocation: p.dropoff_location,
              specialRequirements: p.special_requirements || []
            })),
            capacity: group.capacity,
            currentOccupancy: passengers.length,
            route: route.map((r: any) => ({
              location: r.location,
              type: r.type,
              timestamp: r.timestamp,
              coordinates: r.coordinates
            })),
            status: group.status,
            estimatedDuration: group.estimated_duration,
            notes: group.notes,
            vehicleName: group.vehicle_name,
            vehicleType: group.vehicle_type,
            driverName: group.driver_name,
            driverPhone: group.driver_phone
          };
        })
      );

      return groupsWithPassengers;

    } catch (error) {
      console.error('❌ Failed to get groups by event:', error);
      throw new Error(`Failed to get transport groups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a transport group
   */
  async updateGroup(groupId: string, updates: {
    name?: string;
    vehicleId?: string;
    driverId?: string;
    status?: string;
    notes?: string;
  }): Promise<void> {
    try {
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setClause.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.vehicleId !== undefined) {
        setClause.push(`vehicle_id = $${paramIndex++}`);
        values.push(updates.vehicleId);
      }
      if (updates.driverId !== undefined) {
        setClause.push(`driver_id = $${paramIndex++}`);
        values.push(updates.driverId);
      }
      if (updates.status !== undefined) {
        setClause.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.notes !== undefined) {
        setClause.push(`notes = $${paramIndex++}`);
        values.push(updates.notes);
      }

      if (setClause.length === 0) {
        return; // No updates to apply
      }

      setClause.push(`updated_at = NOW()`);
      values.push(groupId);

      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `UPDATE transport_groups SET ${setClause.join(', ')} WHERE id = $${paramIndex}`,
        values
      );

      console.log(`✅ Updated transport group: ${groupId}`);

    } catch (error) {
      console.error('❌ Failed to update transport group:', error);
      throw new Error(`Failed to update transport group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assign passenger to transport group
   */
  async assignPassengerToGroup(groupId: string, passenger: OptimizationPassenger): Promise<void> {
    try {
      // Check group capacity
      const group = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT capacity FROM transport_groups WHERE id = $1`,
        [groupId]
      );

      if (group.length === 0) {
        throw new Error('Transport group not found');
      }

      const currentPassengers = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT COUNT(*) as count FROM transport_group_passengers WHERE group_id = $1`,
        [groupId]
      );

      if (currentPassengers[0].count >= group[0].capacity) {
        throw new Error('Transport group is at full capacity');
      }

      // Add passenger to group
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO transport_group_passengers 
         (id, group_id, guest_id, guest_name, pickup_location, dropoff_location, special_requirements, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (group_id, guest_id) DO UPDATE SET
         guest_name = EXCLUDED.guest_name,
         pickup_location = EXCLUDED.pickup_location,
         dropoff_location = EXCLUDED.dropoff_location,
         special_requirements = EXCLUDED.special_requirements,
         updated_at = NOW()`,
        [
          crypto.randomUUID(),
          groupId,
          passenger.guestId,
          passenger.guestName,
          passenger.pickupLocation,
          passenger.dropoffLocation,
          JSON.stringify(passenger.specialRequirements)
        ]
      );

      console.log(`✅ Assigned passenger ${passenger.guestId} to group ${groupId}`);

    } catch (error) {
      console.error('❌ Failed to assign passenger to group:', error);
      throw new Error(`Failed to assign passenger: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove passenger from transport group
   */
  async removePassengerFromGroup(groupId: string, guestId: string): Promise<void> {
    try {
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `DELETE FROM transport_group_passengers WHERE group_id = $1 AND guest_id = $2`,
        [groupId, guestId]
      );

      console.log(`✅ Removed passenger ${guestId} from group ${groupId}`);

    } catch (error) {
      console.error('❌ Failed to remove passenger from group:', error);
      throw new Error(`Failed to remove passenger: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Move passenger between transport groups
   */
  async movePassengerBetweenGroups(fromGroupId: string, toGroupId: string, guestId: string): Promise<void> {
    try {
      // Get passenger data from source group
      const passenger = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM transport_group_passengers WHERE group_id = $1 AND guest_id = $2`,
        [fromGroupId, guestId]
      );

      if (passenger.length === 0) {
        throw new Error('Passenger not found in source group');
      }

      const passengerData = passenger[0];

      // Check destination group capacity
      await this.assignPassengerToGroup(toGroupId, {
        guestId: passengerData.guest_id,
        guestName: passengerData.guest_name,
        pickupLocation: passengerData.pickup_location,
        dropoffLocation: passengerData.dropoff_location,
        specialRequirements: JSON.parse(passengerData.special_requirements || '[]'),
        priority: 1
      });

      // Remove from source group
      await this.removePassengerFromGroup(fromGroupId, guestId);

      console.log(`✅ Moved passenger ${guestId} from group ${fromGroupId} to ${toGroupId}`);

    } catch (error) {
      console.error('❌ Failed to move passenger between groups:', error);
      throw new Error(`Failed to move passenger: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize group formation using the intelligent algorithms
   */
  async optimizeGroupFormation(eventId: string, passengers: OptimizationPassenger[], options: OptimizationOptions): Promise<OptimizationResult> {
    try {
      // Get available vehicles for the event
      const vehicles = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM vehicles WHERE event_id = $1 AND status = 'available'`,
        [eventId]
      );

      if (vehicles.length === 0) {
        throw new Error('No available vehicles found for optimization');
      }

      // Convert to optimization vehicle format
      const optimizationVehicles: OptimizationVehicle[] = vehicles.map((v: any) => ({
        id: v.id,
        name: v.name,
        type: v.type,
        capacity: v.capacity,
        features: v.features || [],
        isAccessible: v.is_accessible || false,
        costPerKm: v.cost_per_km || 0,
        availableFrom: v.available_from || new Date().toISOString(),
        availableUntil: v.available_until || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));

      // Run the optimization algorithm
      const optimizationResult = await this.optimizeTransportGroups(
        passengers,
        optimizationVehicles,
        options
      );

      // Convert optimization groups to transport groups and save them
      const transportGroups: TransportGroup[] = [];
      
      for (const group of optimizationResult.groups) {
        const transportGroup = await this.createGroup({
          eventId,
          name: `Optimized Group ${transportGroups.length + 1}`,
          vehicleId: group.vehicleId,
          capacity: group.passengers.length,
          passengers: [],
          currentOccupancy: 0,
          route: [],
          status: 'planning'
        });

        // Assign passengers to the group
        for (const passenger of group.passengers) {
          await this.assignPassengerToGroup(transportGroup.id, passenger);
        }

        transportGroups.push(transportGroup);
      }

      return {
        groups: transportGroups,
        unassignedPassengers: optimizationResult.unassignedPassengers,
        metrics: optimizationResult.metrics,
        warnings: optimizationResult.warnings,
        recommendations: optimizationResult.recommendations
      };

    } catch (error) {
      console.error('❌ Failed to optimize group formation:', error);
      throw new Error(`Failed to optimize groups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transport statistics for an event
   */
  async getTransportStatistics(eventId: string): Promise<{
    totalGroups: number;
    totalPassengers: number;
    averageOccupancy: number;
    vehicleUtilization: number;
    unassignedCount: number;
  }> {
    try {
      const groupStats = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT 
           COUNT(*) as total_groups,
           AVG(CASE WHEN capacity > 0 THEN 
             (SELECT COUNT(*) FROM transport_group_passengers WHERE group_id = tg.id) * 100.0 / capacity 
           ELSE 0 END) as avg_occupancy
         FROM transport_groups tg
         WHERE tg.event_id = $1`,
        [eventId]
      );

      const passengerStats = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT COUNT(*) as total_passengers
         FROM transport_group_passengers tgp
         JOIN transport_groups tg ON tgp.group_id = tg.id
         WHERE tg.event_id = $1`,
        [eventId]
      );

      // Get unassigned passengers (guests with RSVP but no transport group)
      const unassignedStats = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT COUNT(*) as unassigned_count
         FROM rsvp_responses r
         WHERE r.event_id = $1 
         AND r.status = 'attending'
         AND r.guest_id NOT IN (
           SELECT DISTINCT tgp.guest_id::uuid
           FROM transport_group_passengers tgp
           JOIN transport_groups tg ON tgp.group_id = tg.id
           WHERE tg.event_id = $1
         )`,
        [eventId]
      );

      return {
        totalGroups: parseInt(groupStats[0]?.total_groups) || 0,
        totalPassengers: parseInt(passengerStats[0]?.total_passengers) || 0,
        averageOccupancy: Math.round(parseFloat(groupStats[0]?.avg_occupancy) || 0),
        vehicleUtilization: 75, // Mock value - would be calculated from actual vehicle usage
        unassignedCount: parseInt(unassignedStats[0]?.unassigned_count) || 0
      };

    } catch (error) {
      console.error('❌ Failed to get transport statistics:', error);
      throw new Error(`Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Main optimization algorithm using multi-objective optimization
   */
  async optimizeTransportGroups(
    passengers: OptimizationPassenger[],
    vehicles: OptimizationVehicle[],
    options: OptimizationOptions
  ): Promise<OptimizationResult> {
    const startTime = performance.now();

    try {
      console.log(`🚀 Starting transport optimization for ${passengers.length} passengers, ${vehicles.length} vehicles`);

      // Step 1: Preprocess and validate data
      const validatedPassengers = this.preprocessPassengers(passengers);
      const availableVehicles = this.filterAvailableVehicles(vehicles);

      // Step 2: Apply special requirements constraints
      const constraintGroups = this.applySpecialRequirements(validatedPassengers, availableVehicles);

      // Step 3: Run multi-objective optimization
      const optimizedGroups = await this.runOptimizationAlgorithm(
        constraintGroups,
        availableVehicles,
        options
      );

      // Step 4: Optimize routes for each group
      const routeOptimizedGroups = options.optimizeRoutes 
        ? await this.optimizeRoutes(optimizedGroups)
        : optimizedGroups;

      // Step 5: Calculate metrics and generate result
      const result = this.generateOptimizationResult(
        routeOptimizedGroups,
        validatedPassengers,
        availableVehicles,
        options
      );

      // Record metrics
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('transport_optimization_duration_ms', duration, {
        passenger_count: passengers.length.toString(),
        vehicle_count: vehicles.length.toString(),
        groups_created: result.groups.length.toString()
      });

      metricsRegistry.incrementCounter('transport_optimizations_total', {
        status: 'success'
      });

      console.log(`✅ Transport optimization completed: ${result.groups.length} groups, ${result.metrics.optimizationScore}% score`);
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

  /**
   * Preprocess passengers - validate, normalize, and enrich data
   */
  private preprocessPassengers(passengers: OptimizationPassenger[]): OptimizationPassenger[] {
    return passengers.map(passenger => ({
      ...passenger,
      priority: Math.max(1, Math.min(10, passenger.priority || 5)),
      specialRequirements: passenger.specialRequirements || [],
      groupPreferences: passenger.groupPreferences || [],
      avoidances: passenger.avoidances || []
    })).sort((a, b) => b.priority - a.priority); // Sort by priority descending
  }

  /**
   * Filter vehicles by availability and capacity
   */
  private filterAvailableVehicles(vehicles: OptimizationVehicle[]): OptimizationVehicle[] {
    const now = new Date();
    return vehicles
      .filter(vehicle => vehicle.capacity > 0)
      .filter(vehicle => {
        const availableFrom = new Date(vehicle.availableFrom);
        const availableUntil = new Date(vehicle.availableUntil);
        return now >= availableFrom && now <= availableUntil;
      })
      .sort((a, b) => {
        // Prioritize by capacity, then by cost efficiency
        if (a.capacity !== b.capacity) return b.capacity - a.capacity;
        return a.costPerKm - b.costPerKm;
      });
  }

  /**
   * Apply special requirements constraints and create constraint groups
   */
  private applySpecialRequirements(
    passengers: OptimizationPassenger[],
    vehicles: OptimizationVehicle[]
  ): Map<string, OptimizationPassenger[]> {
    const constraintGroups = new Map<string, OptimizationPassenger[]>();

    // Group passengers with similar special requirements
    const wheelchairPassengers = passengers.filter(p => 
      p.specialRequirements.some(req => req.toLowerCase().includes('wheelchair'))
    );
    const childPassengers = passengers.filter(p => 
      p.specialRequirements.some(req => req.toLowerCase().includes('child'))
    );
    const elderlyPassengers = passengers.filter(p => 
      p.specialRequirements.some(req => req.toLowerCase().includes('elderly'))
    );

    // Create constraint groups
    if (wheelchairPassengers.length > 0) {
      constraintGroups.set('wheelchair_accessible', wheelchairPassengers);
    }
    if (childPassengers.length > 0) {
      constraintGroups.set('child_friendly', childPassengers);
    }
    if (elderlyPassengers.length > 0) {
      constraintGroups.set('elderly_comfort', elderlyPassengers);
    }

    // Regular passengers without special constraints
    const regularPassengers = passengers.filter(p => 
      !wheelchairPassengers.includes(p) && 
      !childPassengers.includes(p) && 
      !elderlyPassengers.includes(p)
    );
    if (regularPassengers.length > 0) {
      constraintGroups.set('regular', regularPassengers);
    }

    return constraintGroups;
  }

  /**
   * Main optimization algorithm using greedy approach with backtracking
   */
  private async runOptimizationAlgorithm(
    constraintGroups: Map<string, OptimizationPassenger[]>,
    vehicles: OptimizationVehicle[],
    options: OptimizationOptions
  ): Promise<OptimizationGroup[]> {
    const groups: OptimizationGroup[] = [];
    const usedVehicles = new Set<string>();

    // Process constraint groups first (special requirements)
    for (const [constraint, passengers] of constraintGroups) {
      if (constraint === 'regular') continue; // Process regular passengers last

      const availableVehicles = vehicles.filter(v => {
        if (usedVehicles.has(v.id)) return false;
        
        // Match vehicle capabilities to constraints
        if (constraint === 'wheelchair_accessible') {
          return v.isAccessible || v.features.includes('wheelchair_accessible');
        }
        if (constraint === 'child_friendly') {
          return v.features.includes('child_seats') || v.type === 'van' || v.type === 'bus';
        }
        if (constraint === 'elderly_comfort') {
          return v.type === 'limousine' || v.type === 'van' || v.features.includes('comfortable_seating');
        }
        
        return true;
      });

      const constraintGroups = await this.createGroupsForPassengers(
        passengers,
        availableVehicles,
        options,
        usedVehicles
      );

      groups.push(...constraintGroups);
    }

    // Process regular passengers
    const regularPassengers = constraintGroups.get('regular') || [];
    if (regularPassengers.length > 0) {
      const availableVehicles = vehicles.filter(v => !usedVehicles.has(v.id));
      const regularGroups = await this.createGroupsForPassengers(
        regularPassengers,
        availableVehicles,
        options,
        usedVehicles
      );

      groups.push(...regularGroups);
    }

    return groups;
  }

  /**
   * Create optimized groups for a set of passengers
   */
  private async createGroupsForPassengers(
    passengers: OptimizationPassenger[],
    vehicles: OptimizationVehicle[],
    options: OptimizationOptions,
    usedVehicles: Set<string>
  ): Promise<OptimizationGroup[]> {
    const groups: OptimizationGroup[] = [];
    const assignedPassengers = new Set<string>();

    // Sort passengers by priority and group preferences
    const sortedPassengers = this.sortPassengersByOptimizationCriteria(passengers, options);

    for (const passenger of sortedPassengers) {
      if (assignedPassengers.has(passenger.guestId)) continue;

      // Find the best vehicle for this passenger
      const availableVehicles = vehicles.filter(v => !usedVehicles.has(v.id));
      if (availableVehicles.length === 0) break;

      const bestVehicle = this.selectBestVehicle(passenger, availableVehicles, options);
      if (!bestVehicle) continue;

      // Create a new group with this passenger as the seed
      const group = await this.createOptimalGroup(
        passenger,
        bestVehicle,
        sortedPassengers,
        assignedPassengers,
        options
      );

      if (group) {
        groups.push(group);
        usedVehicles.add(bestVehicle.id);
        group.passengers.forEach(p => assignedPassengers.add(p.guestId));
      }
    }

    return groups;
  }

  /**
   * Sort passengers by optimization criteria
   */
  private sortPassengersByOptimizationCriteria(
    passengers: OptimizationPassenger[],
    options: OptimizationOptions
  ): OptimizationPassenger[] {
    return passengers.sort((a, b) => {
      // Priority first
      if (a.priority !== b.priority) return b.priority - a.priority;
      
      // Special requirements next
      if (options.respectSpecialRequirements) {
        const aSpecial = a.specialRequirements.length;
        const bSpecial = b.specialRequirements.length;
        if (aSpecial !== bSpecial) return bSpecial - aSpecial;
      }
      
      // Group preferences
      if (options.prioritizeGroupPreferences) {
        const aPrefs = a.groupPreferences?.length || 0;
        const bPrefs = b.groupPreferences?.length || 0;
        if (aPrefs !== bPrefs) return bPrefs - aPrefs;
      }
      
      return 0;
    });
  }

  /**
   * Select the best vehicle for a passenger based on optimization criteria
   */
  private selectBestVehicle(
    passenger: OptimizationPassenger,
    vehicles: OptimizationVehicle[],
    options: OptimizationOptions
  ): OptimizationVehicle | null {
    if (vehicles.length === 0) return null;

    let bestVehicle = vehicles[0];
    let bestScore = this.calculateVehicleScore(passenger, bestVehicle, options);

    for (let i = 1; i < vehicles.length; i++) {
      const score = this.calculateVehicleScore(passenger, vehicles[i], options);
      if (score > bestScore) {
        bestScore = score;
        bestVehicle = vehicles[i];
      }
    }

    return bestVehicle;
  }

  /**
   * Calculate vehicle score for a passenger
   */
  private calculateVehicleScore(
    passenger: OptimizationPassenger,
    vehicle: OptimizationVehicle,
    options: OptimizationOptions
  ): number {
    let score = 0;

    // Capacity efficiency (prefer vehicles that won't be too oversized)
    const capacityEfficiency = Math.min(vehicle.capacity / 4, 1); // Prefer vehicles that can hold at least 4 people
    score += capacityEfficiency * 30;

    // Cost efficiency
    if (options.minimizeCost) {
      const costScore = 1 / (1 + vehicle.costPerKm); // Lower cost = higher score
      score += costScore * 25;
    }

    // Comfort score
    if (options.maximizeComfort) {
      const comfortTypes = ['limousine', 'van', 'shuttle', 'car', 'bus'];
      const comfortScore = (comfortTypes.length - comfortTypes.indexOf(vehicle.type)) / comfortTypes.length;
      score += comfortScore * 20;
    }

    // Special requirements match
    if (options.respectSpecialRequirements) {
      const requirementsMatch = passenger.specialRequirements.some(req => 
        vehicle.features.some(feature => feature.toLowerCase().includes(req.toLowerCase()))
      );
      if (requirementsMatch) score += 25;
    }

    return score;
  }

  /**
   * Create an optimal group around a seed passenger
   */
  private async createOptimalGroup(
    seedPassenger: OptimizationPassenger,
    vehicle: OptimizationVehicle,
    allPassengers: OptimizationPassenger[],
    assignedPassengers: Set<string>,
    options: OptimizationOptions
  ): Promise<OptimizationGroup | null> {
    const groupPassengers: OptimizationPassenger[] = [seedPassenger];
    const availableCapacity = vehicle.capacity - 1;

    // Find compatible passengers to fill the vehicle
    const compatiblePassengers = allPassengers.filter(p => 
      p.guestId !== seedPassenger.guestId &&
      !assignedPassengers.has(p.guestId) &&
      this.arePassengersCompatible(seedPassenger, p) &&
      this.canFitInVehicle(p, vehicle)
    );

    // Add passengers based on optimization criteria
    for (const passenger of compatiblePassengers) {
      if (groupPassengers.length >= availableCapacity) break;

      const compatibilityScore = this.calculateGroupCompatibility(
        [...groupPassengers, passenger],
        options
      );

      if (compatibilityScore > 0.7) { // 70% compatibility threshold
        groupPassengers.push(passenger);
      }
    }

    // Generate route
    const route = await this.generateBasicRoute(groupPassengers);

    // Calculate metrics
    const estimatedDuration = this.calculateEstimatedDuration(route);
    const estimatedCost = this.calculateEstimatedCost(route, vehicle.costPerKm);
    const capacityUtilization = (groupPassengers.length / vehicle.capacity) * 100;

    return {
      id: crypto.randomUUID(),
      vehicleId: vehicle.id,
      passengers: groupPassengers,
      route,
      estimatedDuration,
      estimatedCost,
      capacityUtilization,
      specialRequirementsCovered: this.getSpecialRequirementsCovered(groupPassengers, vehicle)
    };
  }

  /**
   * Check if two passengers are compatible
   */
  private arePassengersCompatible(p1: OptimizationPassenger, p2: OptimizationPassenger): boolean {
    // Check avoidances
    if (p1.avoidances?.includes(p2.guestId) || p2.avoidances?.includes(p1.guestId)) {
      return false;
    }

    // Check conflicting special requirements
    const conflictingRequirements = [
      ['smoking', 'non_smoking'],
      ['pets', 'allergic_to_pets'],
      ['loud_music', 'quiet_environment']
    ];

    for (const [req1, req2] of conflictingRequirements) {
      if (p1.specialRequirements.includes(req1) && p2.specialRequirements.includes(req2)) {
        return false;
      }
      if (p1.specialRequirements.includes(req2) && p2.specialRequirements.includes(req1)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if passenger can fit in vehicle
   */
  private canFitInVehicle(passenger: OptimizationPassenger, vehicle: OptimizationVehicle): boolean {
    // Check accessibility requirements
    if (passenger.specialRequirements.includes('wheelchair') && !vehicle.isAccessible) {
      return false;
    }

    // Check vehicle features match requirements
    const requiredFeatures = passenger.specialRequirements.filter(req => 
      ['child_seat', 'wheelchair_accessible', 'pet_friendly'].includes(req)
    );

    return requiredFeatures.every(feature => 
      vehicle.features.includes(feature) || vehicle.features.includes('universal_accessibility')
    );
  }

  /**
   * Calculate group compatibility score
   */
  private calculateGroupCompatibility(
    passengers: OptimizationPassenger[],
    options: OptimizationOptions
  ): number {
    if (passengers.length <= 1) return 1;

    let compatibilityScore = 0;
    let comparisons = 0;

    // Check pairwise compatibility
    for (let i = 0; i < passengers.length; i++) {
      for (let j = i + 1; j < passengers.length; j++) {
        const p1 = passengers[i];
        const p2 = passengers[j];
        
        // Base compatibility
        let pairScore = this.arePassengersCompatible(p1, p2) ? 1 : 0;
        
        // Bonus for group preferences
        if (options.prioritizeGroupPreferences) {
          if (p1.groupPreferences?.includes(p2.guestId) || p2.groupPreferences?.includes(p1.guestId)) {
            pairScore += 0.5;
          }
        }
        
        // Bonus for similar pickup/dropoff locations
        if (p1.pickupLocation === p2.pickupLocation || p1.dropoffLocation === p2.dropoffLocation) {
          pairScore += 0.3;
        }
        
        compatibilityScore += Math.min(pairScore, 1);
        comparisons++;
      }
    }

    return comparisons > 0 ? compatibilityScore / comparisons : 1;
  }

  /**
   * Generate basic route for a group
   */
  private async generateBasicRoute(passengers: OptimizationPassenger[]): Promise<RoutePoint[]> {
    const route: RoutePoint[] = [];
    const locations = new Map<string, { passengers: string[]; type: 'pickup' | 'dropoff' }>();

    // Collect pickup locations
    passengers.forEach(p => {
      if (p.pickupLocation) {
        if (!locations.has(p.pickupLocation)) {
          locations.set(p.pickupLocation, { passengers: [], type: 'pickup' });
        }
        locations.get(p.pickupLocation)!.passengers.push(p.guestId);
      }
    });

    // Collect dropoff locations
    passengers.forEach(p => {
      if (p.dropoffLocation) {
        const key = `${p.dropoffLocation}_dropoff`;
        if (!locations.has(key)) {
          locations.set(key, { passengers: [], type: 'dropoff' });
        }
        locations.get(key)!.passengers.push(p.guestId);
      }
    });

    // Convert to route points
    for (const [location, data] of locations) {
      const cleanLocation = location.replace('_dropoff', '');
      route.push({
        location: cleanLocation,
        type: data.type,
        passengers: data.passengers,
        estimatedTime: new Date().toISOString() // TODO: Calculate actual estimated times
      });
    }

    // Sort route: all pickups first, then all dropoffs
    return route.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'pickup' ? -1 : 1;
      }
      return 0;
    });
  }

  /**
   * Optimize routes for groups (placeholder for advanced route optimization)
   */
  private async optimizeRoutes(groups: OptimizationGroup[]): Promise<OptimizationGroup[]> {
    // TODO: Implement advanced route optimization using mapping APIs
    // For now, return groups as-is
    return groups;
  }

  /**
   * Calculate estimated duration for a route
   */
  private calculateEstimatedDuration(route: RoutePoint[]): number {
    // Simple estimation: 10 minutes per stop + 5 minutes travel between stops
    const baseTime = route.length * 10;
    const travelTime = Math.max(0, route.length - 1) * 5;
    return baseTime + travelTime;
  }

  /**
   * Calculate estimated cost for a route
   */
  private calculateEstimatedCost(route: RoutePoint[], costPerKm: number): number {
    // Simple estimation: assume 2km between stops
    const estimatedDistance = Math.max(0, route.length - 1) * 2;
    return estimatedDistance * costPerKm;
  }

  /**
   * Get special requirements covered by vehicle
   */
  private getSpecialRequirementsCovered(
    passengers: OptimizationPassenger[],
    vehicle: OptimizationVehicle
  ): string[] {
    const allRequirements = passengers.flatMap(p => p.specialRequirements);
    const uniqueRequirements = [...new Set(allRequirements)];
    
    return uniqueRequirements.filter(req => 
      vehicle.features.some(feature => feature.toLowerCase().includes(req.toLowerCase())) ||
      vehicle.isAccessible && req.toLowerCase().includes('wheelchair')
    );
  }

  /**
   * Generate final optimization result
   */
  private generateOptimizationResult(
    groups: OptimizationGroup[],
    allPassengers: OptimizationPassenger[],
    vehicles: OptimizationVehicle[],
    options: OptimizationOptions
  ): OptimizationResult {
    const assignedPassengerIds = new Set(groups.flatMap(g => g.passengers.map(p => p.guestId)));
    const unassignedPassengers = allPassengers.filter(p => !assignedPassengerIds.has(p.guestId));

    const metrics: OptimizationMetrics = {
      totalVehiclesUsed: groups.length,
      averageCapacityUtilization: groups.length > 0 
        ? groups.reduce((sum, g) => sum + g.capacityUtilization, 0) / groups.length 
        : 0,
      totalEstimatedDuration: groups.reduce((sum, g) => sum + g.estimatedDuration, 0),
      totalEstimatedCost: groups.reduce((sum, g) => sum + g.estimatedCost, 0),
      optimizationScore: this.calculateOptimizationScore(groups, allPassengers, options),
      satisfactionScore: this.calculateSatisfactionScore(groups, allPassengers),
      unassignedCount: unassignedPassengers.length,
      specialRequirementsCoverage: this.calculateSpecialRequirementsCoverage(groups, allPassengers)
    };

    const warnings = this.generateWarnings(groups, unassignedPassengers, metrics);
    const recommendations = this.generateRecommendations(groups, metrics, options);

    return {
      groups,
      unassignedPassengers,
      metrics,
      warnings,
      recommendations
    };
  }

  /**
   * Calculate overall optimization score
   */
  private calculateOptimizationScore(
    groups: OptimizationGroup[],
    allPassengers: OptimizationPassenger[],
    options: OptimizationOptions
  ): number {
    if (allPassengers.length === 0) return 100;

    let score = 0;

    // Assignment efficiency (40% weight)
    const assignmentRate = (allPassengers.length - this.getUnassignedCount(groups, allPassengers)) / allPassengers.length;
    score += assignmentRate * 40;

    // Capacity utilization (30% weight)
    const avgUtilization = groups.length > 0 
      ? groups.reduce((sum, g) => sum + g.capacityUtilization, 0) / groups.length / 100
      : 0;
    score += avgUtilization * 30;

    // Special requirements coverage (20% weight)
    const specialCoverage = this.calculateSpecialRequirementsCoverage(groups, allPassengers) / 100;
    score += specialCoverage * 20;

    // Vehicle efficiency (10% weight)
    const vehicleEfficiency = options.minimizeVehicles && groups.length > 0
      ? Math.min(1, allPassengers.length / (groups.length * 4)) // Assume optimal is 4 passengers per vehicle
      : 1;
    score += vehicleEfficiency * 10;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Calculate satisfaction score based on preferences
   */
  private calculateSatisfactionScore(groups: OptimizationGroup[], allPassengers: OptimizationPassenger[]): number {
    let totalPreferences = 0;
    let metPreferences = 0;

    for (const group of groups) {
      for (const passenger of group.passengers) {
        const originalPassenger = allPassengers.find(p => p.guestId === passenger.guestId);
        if (!originalPassenger?.groupPreferences) continue;

        totalPreferences += originalPassenger.groupPreferences.length;
        
        const groupPassengerIds = group.passengers.map(p => p.guestId);
        metPreferences += originalPassenger.groupPreferences.filter(prefId => 
          groupPassengerIds.includes(prefId)
        ).length;
      }
    }

    return totalPreferences > 0 ? Math.round((metPreferences / totalPreferences) * 100) : 100;
  }

  /**
   * Calculate special requirements coverage
   */
  private calculateSpecialRequirementsCoverage(groups: OptimizationGroup[], allPassengers: OptimizationPassenger[]): number {
    const allRequirements = allPassengers.flatMap(p => p.specialRequirements);
    if (allRequirements.length === 0) return 100;

    const coveredRequirements = groups.flatMap(g => g.specialRequirementsCovered);
    const uniqueAllRequirements = [...new Set(allRequirements)];
    const uniqueCoveredRequirements = [...new Set(coveredRequirements)];

    const coverageCount = uniqueAllRequirements.filter(req => 
      uniqueCoveredRequirements.includes(req)
    ).length;

    return Math.round((coverageCount / uniqueAllRequirements.length) * 100);
  }

  /**
   * Get count of unassigned passengers
   */
  private getUnassignedCount(groups: OptimizationGroup[], allPassengers: OptimizationPassenger[]): number {
    const assignedIds = new Set(groups.flatMap(g => g.passengers.map(p => p.guestId)));
    return allPassengers.filter(p => !assignedIds.has(p.guestId)).length;
  }

  /**
   * Generate warnings about the optimization result
   */
  private generateWarnings(
    groups: OptimizationGroup[],
    unassignedPassengers: OptimizationPassenger[],
    metrics: OptimizationMetrics
  ): string[] {
    const warnings: string[] = [];

    if (unassignedPassengers.length > 0) {
      warnings.push(`${unassignedPassengers.length} passengers could not be assigned to any vehicle`);
    }

    if (metrics.averageCapacityUtilization < 50) {
      warnings.push('Low capacity utilization - consider using fewer or smaller vehicles');
    }

    if (metrics.specialRequirementsCoverage < 80) {
      warnings.push('Some special requirements may not be fully covered by assigned vehicles');
    }

    const underutilizedGroups = groups.filter(g => g.capacityUtilization < 30);
    if (underutilizedGroups.length > 0) {
      warnings.push(`${underutilizedGroups.length} vehicles are significantly underutilized`);
    }

    return warnings;
  }

  /**
   * Generate recommendations for optimization improvement
   */
  private generateRecommendations(
    groups: OptimizationGroup[],
    metrics: OptimizationMetrics,
    options: OptimizationOptions
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.averageCapacityUtilization < 60) {
      recommendations.push('Consider consolidating passengers into fewer vehicles to improve efficiency');
    }

    if (metrics.specialRequirementsCoverage < 90) {
      recommendations.push('Review vehicle features to ensure all special requirements can be accommodated');
    }

    if (metrics.optimizationScore < 70) {
      recommendations.push('Consider adjusting optimization parameters or adding more suitable vehicles');
    }

    const highCostGroups = groups.filter(g => g.estimatedCost > 100);
    if (highCostGroups.length > 0) {
      recommendations.push('Some routes have high estimated costs - consider route optimization');
    }

    if (!options.optimizeRoutes) {
      recommendations.push('Enable route optimization to potentially reduce travel time and costs');
    }

    return recommendations;
  }
}

// Export singleton instance
let transportOptimizationService: TransportOptimizationService | null = null;

export function initializeTransportOptimization(db: DatabaseConnection): TransportOptimizationService {
  if (!transportOptimizationService) {
    transportOptimizationService = new TransportOptimizationService(db);
    console.log('✅ Transport Optimization service initialized');
  }
  return transportOptimizationService;
}

export function getTransportOptimizationService(): TransportOptimizationService {
  if (!transportOptimizationService) {
    throw new Error('Transport Optimization service not initialized');
  }
  return transportOptimizationService;
}