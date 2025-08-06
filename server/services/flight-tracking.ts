/**
 * Flight Tracking Service
 * Comprehensive flight coordination and tracking system for wedding events
 */

import { z } from 'zod';
import { metricsRegistry } from '../middleware/monitoring';
import { schemaValidationService, DatabaseConnection } from '../database/schema-validation';

// Flight Data Schemas
export const FlightDetailsSchema = z.object({
  id: z.string().uuid(),
  guestId: z.string().uuid(),
  eventId: z.string().uuid(),
  flightType: z.enum(['arrival', 'departure']),
  airline: z.string().min(1).max(100),
  flightNumber: z.string().min(1).max(20),
  departureAirport: z.string().length(3), // IATA code
  arrivalAirport: z.string().length(3),   // IATA code
  scheduledDeparture: z.string().datetime(),
  scheduledArrival: z.string().datetime(),
  actualDeparture: z.string().datetime().optional(),
  actualArrival: z.string().datetime().optional(),
  status: z.enum(['scheduled', 'boarding', 'departed', 'arrived', 'delayed', 'cancelled']),
  gate: z.string().optional(),
  terminal: z.string().optional(),
  seat: z.string().optional(),
  assistanceRequired: z.boolean().default(false),
  specialRequirements: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const FlightAssistanceRequestSchema = z.object({
  id: z.string().uuid(),
  flightId: z.string().uuid(),
  guestId: z.string().uuid(),
  eventId: z.string().uuid(),
  assistanceType: z.enum(['pickup', 'checkin', 'wheelchair', 'language', 'customs', 'baggage']),
  description: z.string().optional(),
  contactPhone: z.string().optional(),
  meetingPoint: z.string().optional(),
  representativeId: z.string().uuid().optional(),
  status: z.enum(['requested', 'assigned', 'in_progress', 'completed', 'cancelled']),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const AirportRepresentativeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().min(1),
  airport: z.string().length(3), // IATA code
  languages: z.array(z.string()).default(['en']),
  specializations: z.array(z.string()).default([]),
  availability: z.object({
    monday: z.array(z.string()).default([]),
    tuesday: z.array(z.string()).default([]),
    wednesday: z.array(z.string()).default([]),
    thursday: z.array(z.string()).default([]),
    friday: z.array(z.string()).default([]),
    saturday: z.array(z.string()).default([]),
    sunday: z.array(z.string()).default([])
  }),
  rating: z.number().min(0).max(5).default(0),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type FlightDetails = z.infer<typeof FlightDetailsSchema>;
export type FlightAssistanceRequest = z.infer<typeof FlightAssistanceRequestSchema>;
export type AirportRepresentative = z.infer<typeof AirportRepresentativeSchema>;

// Flight Status Update Interface
export interface FlightStatusUpdate {
  flightId: string;
  status: FlightDetails['status'];
  actualDeparture?: string;
  actualArrival?: string;
  gate?: string;
  terminal?: string;
  delay?: number; // minutes
  reason?: string;
  timestamp: string;
}

// External Flight API Integration
import { flightAPIManager, FlightAPIManager } from './external-flight-api';

// External Flight API Integration
interface ExternalFlightAPI {
  getFlightStatus(airline: string, flightNumber: string, date: string): Promise<FlightStatusUpdate>;
  subscribeToUpdates(flightId: string, callback: (update: FlightStatusUpdate) => void): void;
  unsubscribeFromUpdates(flightId: string): void;
}

// Production Flight API Implementation
class ProductionFlightAPI implements ExternalFlightAPI {
  private manager: FlightAPIManager;
  
  constructor() {
    this.manager = flightAPIManager;
  }
  
  async getFlightStatus(airline: string, flightNumber: string, date: string): Promise<FlightStatusUpdate> {
    return await this.manager.getFlightStatus(airline, flightNumber, date);
  }
  
  subscribeToUpdates(flightId: string, callback: (update: FlightStatusUpdate) => void): void {
    this.manager.subscribeToUpdates(flightId, callback);
  }
  
  unsubscribeFromUpdates(flightId: string): void {
    this.manager.unsubscribeFromUpdates(flightId);
  }
}

// Flight Tracking Service Implementation
export class FlightTrackingService {
  private db: DatabaseConnection;
  private flightAPI: ExternalFlightAPI;
  private activeSubscriptions = new Set<string>();

  constructor(db: DatabaseConnection, flightAPI?: ExternalFlightAPI) {
    this.db = db;
    this.flightAPI = flightAPI || new ProductionFlightAPI();
  }

  // Flight Management Operations
  async createFlight(flightData: Omit<FlightDetails, 'id' | 'createdAt' | 'updatedAt'>): Promise<FlightDetails> {
    const startTime = performance.now();
    
    try {
      // Validate flight data
      const validatedData = FlightDetailsSchema.omit({ 
        id: true, 
        createdAt: true, 
        updatedAt: true 
      }).parse(flightData);
      
      const flightDetails: FlightDetails = {
        id: crypto.randomUUID(),
        ...validatedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to database
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO flight_details (
          id, guest_id, event_id, flight_type, airline, flight_number,
          departure_airport, arrival_airport, scheduled_departure, scheduled_arrival,
          status, assistance_required, special_requirements, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          flightDetails.id, flightDetails.guestId, flightDetails.eventId,
          flightDetails.flightType, flightDetails.airline, flightDetails.flightNumber,
          flightDetails.departureAirport, flightDetails.arrivalAirport,
          flightDetails.scheduledDeparture, flightDetails.scheduledArrival,
          flightDetails.status, flightDetails.assistanceRequired,
          JSON.stringify(flightDetails.specialRequirements),
          flightDetails.createdAt, flightDetails.updatedAt
        ],
        `flight_create_${flightDetails.id}`
      );
      
      // Start tracking flight status
      await this.startFlightTracking(flightDetails.id);
      
      // Record metrics
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('flight_operation_duration_ms', duration, {
        operation: 'create',
        status: 'success'
      });
      
      metricsRegistry.incrementCounter('flight_operations_total', {
        operation: 'create',
        status: 'success'
      });
      
      console.log(`✅ Flight created: ${flightDetails.airline}${flightDetails.flightNumber}`);
      return flightDetails;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('flight_operation_duration_ms', duration, {
        operation: 'create',
        status: 'error'
      });
      
      metricsRegistry.incrementCounter('flight_operations_total', {
        operation: 'create',
        status: 'error'
      });
      
      console.error('❌ Flight creation failed:', error);
      throw new Error(`Flight creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFlightsByEvent(eventId: string): Promise<FlightDetails[]> {
    try {
      const flights = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM flight_details WHERE event_id = $1 ORDER BY scheduled_departure ASC`,
        [eventId],
        `flights_by_event_${eventId}`
      );
      
      return flights.map((flight: any) => ({
        ...flight,
        specialRequirements: JSON.parse(flight.special_requirements || '[]')
      }));
      
    } catch (error) {
      console.error('❌ Failed to get flights by event:', error);
      throw new Error(`Failed to retrieve flights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFlightsByGuest(guestId: string): Promise<FlightDetails[]> {
    try {
      const flights = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM flight_details WHERE guest_id = $1 ORDER BY scheduled_departure ASC`,
        [guestId],
        `flights_by_guest_${guestId}`
      );
      
      return flights.map((flight: any) => ({
        ...flight,
        specialRequirements: JSON.parse(flight.special_requirements || '[]')
      }));
      
    } catch (error) {
      console.error('❌ Failed to get flights by guest:', error);
      throw new Error(`Failed to retrieve guest flights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateFlightStatus(flightId: string, statusUpdate: Partial<FlightStatusUpdate>): Promise<void> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;
      
      if (statusUpdate.status) {
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(statusUpdate.status);
      }
      
      if (statusUpdate.actualDeparture) {
        updateFields.push(`actual_departure = $${paramIndex++}`);
        updateValues.push(statusUpdate.actualDeparture);
      }
      
      if (statusUpdate.actualArrival) {
        updateFields.push(`actual_arrival = $${paramIndex++}`);
        updateValues.push(statusUpdate.actualArrival);
      }
      
      if (statusUpdate.gate) {
        updateFields.push(`gate = $${paramIndex++}`);
        updateValues.push(statusUpdate.gate);
      }
      
      if (statusUpdate.terminal) {
        updateFields.push(`terminal = $${paramIndex++}`);
        updateValues.push(statusUpdate.terminal);
      }
      
      updateFields.push(`updated_at = $${paramIndex++}`);
      updateValues.push(new Date().toISOString());
      
      updateValues.push(flightId);
      
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `UPDATE flight_details SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      );
      
      console.log(`✅ Flight status updated: ${flightId} -> ${statusUpdate.status}`);
      
      // Trigger notifications for status changes
      await this.triggerFlightNotification(flightId, statusUpdate);
      
    } catch (error) {
      console.error('❌ Failed to update flight status:', error);
      throw new Error(`Flight status update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Flight Assistance Management
  async createAssistanceRequest(
    requestData: Omit<FlightAssistanceRequest, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<FlightAssistanceRequest> {
    try {
      const validatedData = FlightAssistanceRequestSchema.omit({ 
        id: true, 
        createdAt: true, 
        updatedAt: true 
      }).parse(requestData);
      
      const assistanceRequest: FlightAssistanceRequest = {
        id: crypto.randomUUID(),
        ...validatedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO flight_assistance_requests (
          id, flight_id, guest_id, event_id, assistance_type, description,
          contact_phone, meeting_point, status, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          assistanceRequest.id, assistanceRequest.flightId, assistanceRequest.guestId,
          assistanceRequest.eventId, assistanceRequest.assistanceType,
          assistanceRequest.description, assistanceRequest.contactPhone,
          assistanceRequest.meetingPoint, assistanceRequest.status,
          assistanceRequest.notes, assistanceRequest.createdAt, assistanceRequest.updatedAt
        ]
      );
      
      // Auto-assign representative if available
      await this.autoAssignRepresentative(assistanceRequest);
      
      console.log(`✅ Assistance request created: ${assistanceRequest.id}`);
      return assistanceRequest;
      
    } catch (error) {
      console.error('❌ Assistance request creation failed:', error);
      throw new Error(`Assistance request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async assignRepresentative(requestId: string, representativeId: string): Promise<void> {
    try {
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `UPDATE flight_assistance_requests 
         SET representative_id = $1, status = 'assigned', updated_at = $2 
         WHERE id = $3`,
        [representativeId, new Date().toISOString(), requestId]
      );
      
      console.log(`✅ Representative assigned: ${representativeId} -> ${requestId}`);
      
      // Notify representative and guest
      await this.notifyAssignment(requestId, representativeId);
      
    } catch (error) {
      console.error('❌ Representative assignment failed:', error);
      throw new Error(`Representative assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Flight Tracking Operations
  private async startFlightTracking(flightId: string): Promise<void> {
    if (this.activeSubscriptions.has(flightId)) {
      return; // Already tracking
    }
    
    try {
      // Get flight details
      const flights = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM flight_details WHERE id = $1`,
        [flightId]
      );
      
      if (flights.length === 0) {
        throw new Error(`Flight not found: ${flightId}`);
      }
      
      const flight = flights[0];
      
      // Subscribe to external flight updates
      this.flightAPI.subscribeToUpdates(flightId, async (update: FlightStatusUpdate) => {
        await this.updateFlightStatus(flightId, update);
      });
      
      this.activeSubscriptions.add(flightId);
      
      // Get initial status from external API
      const initialStatus = await this.flightAPI.getFlightStatus(
        flight.airline,
        flight.flight_number,
        flight.scheduled_departure
      );
      
      await this.updateFlightStatus(flightId, initialStatus);
      
      console.log(`✅ Flight tracking started: ${flightId}`);
      
    } catch (error) {
      console.error('❌ Failed to start flight tracking:', error);
    }
  }

  private async stopFlightTracking(flightId: string): Promise<void> {
    if (!this.activeSubscriptions.has(flightId)) {
      return;
    }
    
    this.flightAPI.unsubscribeFromUpdates(flightId);
    this.activeSubscriptions.delete(flightId);
    
    console.log(`✅ Flight tracking stopped: ${flightId}`);
  }

  private async autoAssignRepresentative(request: FlightAssistanceRequest): Promise<void> {
    try {
      // Get flight details to determine airport
      const flights = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM flight_details WHERE id = $1`,
        [request.flightId]
      );
      
      if (flights.length === 0) {
        return;
      }
      
      const flight = flights[0];
      const airport = request.assistanceType === 'pickup' ? flight.arrival_airport : flight.departure_airport;
      
      // Find available representatives
      const representatives = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM airport_representatives 
         WHERE airport = $1 AND is_active = true 
         ORDER BY rating DESC, id ASC`,
        [airport]
      );
      
      if (representatives.length > 0) {
        // Assign the highest-rated available representative
        const representative = representatives[0];
        await this.assignRepresentative(request.id, representative.id);
      }
      
    } catch (error) {
      console.error('❌ Auto-assignment failed:', error);
      // Don't throw - this is a best-effort operation
    }
  }

  private async triggerFlightNotification(flightId: string, statusUpdate: Partial<FlightStatusUpdate>): Promise<void> {
    try {
      // Get flight and guest details
      const flightData = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT fd.*, g.name, g.email, g.phone 
         FROM flight_details fd 
         JOIN guests g ON fd.guest_id = g.id 
         WHERE fd.id = $1`,
        [flightId]
      );
      
      if (flightData.length === 0) {
        return;
      }
      
      const flight = flightData[0];
      
      // Create notification based on status
      let notificationMessage = '';
      
      switch (statusUpdate.status) {
        case 'boarding':
          notificationMessage = `Your flight ${flight.airline}${flight.flight_number} is now boarding at gate ${statusUpdate.gate || flight.gate}`;
          break;
        case 'departed':
          notificationMessage = `Your flight ${flight.airline}${flight.flight_number} has departed`;
          break;
        case 'arrived':
          notificationMessage = `Your flight ${flight.airline}${flight.flight_number} has arrived`;
          break;
        case 'delayed':
          notificationMessage = `Your flight ${flight.airline}${flight.flight_number} has been delayed${statusUpdate.delay ? ` by ${statusUpdate.delay} minutes` : ''}`;
          break;
        case 'cancelled':
          notificationMessage = `Your flight ${flight.airline}${flight.flight_number} has been cancelled`;
          break;
      }
      
      if (notificationMessage) {
        // Queue notification (this would integrate with the notification system)
        console.log(`📢 Flight notification: ${notificationMessage} (to: ${flight.email})`);
        
        // Increment metrics
        metricsRegistry.incrementCounter('flight_notifications_sent_total', {
          status: statusUpdate.status || 'unknown',
          type: 'status_update'
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to trigger flight notification:', error);
    }
  }

  private async notifyAssignment(requestId: string, representativeId: string): Promise<void> {
    try {
      // Get request and representative details
      const assignmentData = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT far.*, ar.name as rep_name, ar.phone as rep_phone, ar.email as rep_email,
                g.name as guest_name, g.email as guest_email, g.phone as guest_phone
         FROM flight_assistance_requests far
         JOIN airport_representatives ar ON far.representative_id = ar.id
         JOIN guests g ON far.guest_id = g.id
         WHERE far.id = $1`,
        [requestId]
      );
      
      if (assignmentData.length === 0) {
        return;
      }
      
      const assignment = assignmentData[0];
      
      // Notify guest
      console.log(`📢 Guest notification: Representative ${assignment.rep_name} assigned for ${assignment.assistance_type} assistance (to: ${assignment.guest_email})`);
      
      // Notify representative
      console.log(`📢 Representative notification: New assistance assignment for ${assignment.guest_name} (to: ${assignment.rep_email})`);
      
      metricsRegistry.incrementCounter('flight_notifications_sent_total', {
        type: 'assignment',
        assistance_type: assignment.assistance_type
      });
      
    } catch (error) {
      console.error('❌ Failed to notify assignment:', error);
    }
  }

  // Airport Representative Management
  async createRepresentative(
    repData: Omit<AirportRepresentative, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AirportRepresentative> {
    try {
      const validatedData = AirportRepresentativeSchema.omit({ 
        id: true, 
        createdAt: true, 
        updatedAt: true 
      }).parse(repData);
      
      const representative: AirportRepresentative = {
        id: crypto.randomUUID(),
        ...validatedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO airport_representatives (
          id, name, email, phone, airport, languages, specializations,
          availability, rating, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          representative.id, representative.name, representative.email, representative.phone,
          representative.airport, JSON.stringify(representative.languages),
          JSON.stringify(representative.specializations), JSON.stringify(representative.availability),
          representative.rating, representative.isActive, representative.createdAt, representative.updatedAt
        ]
      );
      
      console.log(`✅ Airport representative created: ${representative.name}`);
      return representative;
      
    } catch (error) {
      console.error('❌ Representative creation failed:', error);
      throw new Error(`Representative creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRepresentativesByAirport(airport: string): Promise<AirportRepresentative[]> {
    try {
      const representatives = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM airport_representatives 
         WHERE airport = $1 AND is_active = true 
         ORDER BY rating DESC, name ASC`,
        [airport],
        `representatives_by_airport_${airport}`
      );
      
      return representatives.map((rep: any) => ({
        ...rep,
        languages: JSON.parse(rep.languages || '[]'),
        specializations: JSON.parse(rep.specializations || '[]'),
        availability: JSON.parse(rep.availability || '{}')
      }));
      
    } catch (error) {
      console.error('❌ Failed to get representatives by airport:', error);
      throw new Error(`Failed to retrieve representatives: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Cleanup and Management
  async cleanup(): Promise<void> {
    // Stop all active flight tracking
    for (const flightId of this.activeSubscriptions) {
      await this.stopFlightTracking(flightId);
    }
    
    console.log('✅ Flight tracking service cleaned up');
  }

  // Analytics and Reporting
  async getFlightStatistics(eventId: string): Promise<{
    totalFlights: number;
    flightsByStatus: Record<string, number>;
    assistanceRequests: number;
    onTimePercentage: number;
  }> {
    try {
      const stats = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT 
           COUNT(*) as total_flights,
           COUNT(CASE WHEN status = 'arrived' THEN 1 END) as arrived_flights,
           COUNT(CASE WHEN status = 'delayed' THEN 1 END) as delayed_flights,
           COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_flights,
           COUNT(CASE WHEN actual_arrival <= scheduled_arrival THEN 1 END) as on_time_flights
         FROM flight_details 
         WHERE event_id = $1`,
        [eventId]
      );
      
      const assistanceStats = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT COUNT(*) as assistance_requests 
         FROM flight_assistance_requests 
         WHERE event_id = $1`,
        [eventId]
      );
      
      const totalFlights = parseInt(stats[0]?.total_flights || '0');
      const onTimeFlights = parseInt(stats[0]?.on_time_flights || '0');
      
      return {
        totalFlights,
        flightsByStatus: {
          arrived: parseInt(stats[0]?.arrived_flights || '0'),
          delayed: parseInt(stats[0]?.delayed_flights || '0'),
          cancelled: parseInt(stats[0]?.cancelled_flights || '0')
        },
        assistanceRequests: parseInt(assistanceStats[0]?.assistance_requests || '0'),
        onTimePercentage: totalFlights > 0 ? Math.round((onTimeFlights / totalFlights) * 100) : 0
      };
      
    } catch (error) {
      console.error('❌ Failed to get flight statistics:', error);
      throw new Error(`Failed to get flight statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
let flightTrackingService: FlightTrackingService | null = null;

export function initializeFlightTracking(db: DatabaseConnection): FlightTrackingService {
  if (!flightTrackingService) {
    flightTrackingService = new FlightTrackingService(db);
    console.log('✅ Flight tracking service initialized');
  }
  return flightTrackingService;
}

export function getFlightTrackingService(): FlightTrackingService {
  if (!flightTrackingService) {
    throw new Error('Flight tracking service not initialized');
  }
  return flightTrackingService;
}

export async function cleanupFlightTracking(): Promise<void> {
  if (flightTrackingService) {
    await flightTrackingService.cleanup();
    flightTrackingService = null;
  }
}