/**
 * RSVP Flight Integration Service
 * Automatically creates flight coordination records when guests submit RSVP with flight details
 */

import { getFlightTrackingService } from './flight-tracking';
import { schemaValidationService, DatabaseConnection } from '../database/schema-validation';
import { metricsRegistry } from '../middleware/monitoring';

export interface RsvpFlightData {
  guestId: number;
  eventId: number;
  flightDetails?: {
    // Arrival flight
    arrivalFlightNumber?: string;
    arrivalAirline?: string;
    departureAirport?: string;
    arrivalAirport?: string;
    scheduledDeparture?: string;
    scheduledArrival?: string;
    arrivalSeat?: string;
    arrivalAssistanceRequired?: boolean;
    arrivalSpecialRequirements?: string[];
    
    // Departure flight (if different)
    hasDepartureFlight?: boolean;
    departureFlightNumber?: string;
    departureAirline?: string;
    departureScheduledDeparture?: string;
    departureScheduledArrival?: string;
    departureSeat?: string;
    departureAssistanceRequired?: boolean;
    departureSpecialRequirements?: string[];
  };
}

export class RsvpFlightIntegrationService {
  constructor(private db: DatabaseConnection) {}

  /**
   * Process flight details from RSVP submission and create flight coordination records
   */
  async processRsvpFlightData(rsvpData: RsvpFlightData): Promise<{
    arrivalFlightId?: string;
    departureFlightId?: string;
    assistanceRequestIds?: string[];
  }> {
    const startTime = performance.now();
    
    try {
      const results: {
        arrivalFlightId?: string;
        departureFlightId?: string;
        assistanceRequestIds?: string[];
      } = {
        assistanceRequestIds: []
      };

      if (!rsvpData.flightDetails) {
        return results;
      }

      const flightService = getFlightTrackingService();
      const { flightDetails } = rsvpData;

      // Create arrival flight record
      if (flightDetails.arrivalFlightNumber && flightDetails.arrivalAirline) {
        try {
          const arrivalFlight = await flightService.createFlight({
            guestId: rsvpData.guestId.toString(),
            eventId: rsvpData.eventId.toString(),
            flightType: 'arrival',
            airline: flightDetails.arrivalAirline,
            flightNumber: flightDetails.arrivalFlightNumber,
            departureAirport: flightDetails.departureAirport || '',
            arrivalAirport: flightDetails.arrivalAirport || '',
            scheduledDeparture: flightDetails.scheduledDeparture || new Date().toISOString(),
            scheduledArrival: flightDetails.scheduledArrival || new Date().toISOString(),
            status: 'scheduled',
            seat: flightDetails.arrivalSeat,
            assistanceRequired: flightDetails.arrivalAssistanceRequired || false,
            specialRequirements: flightDetails.arrivalSpecialRequirements || []
          });

          results.arrivalFlightId = arrivalFlight.id;

          // Create assistance request if needed
          if (flightDetails.arrivalAssistanceRequired) {
            const assistanceRequest = await flightService.createAssistanceRequest({
              flightId: arrivalFlight.id,
              guestId: rsvpData.guestId.toString(),
              eventId: rsvpData.eventId.toString(),
              assistanceType: 'pickup', // Default to pickup, can be customized
              description: `Assistance required for arrival flight ${flightDetails.arrivalAirline} ${flightDetails.arrivalFlightNumber}`,
              status: 'requested'
            });

            results.assistanceRequestIds?.push(assistanceRequest.id);
          }

          console.log(`✅ Created arrival flight record: ${arrivalFlight.id}`);

        } catch (error) {
          console.error('❌ Failed to create arrival flight:', error);
          // Don't throw - continue processing departure flight
        }
      }

      // Create departure flight record (if different)
      if (flightDetails.hasDepartureFlight && 
          flightDetails.departureFlightNumber && 
          flightDetails.departureAirline) {
        try {
          const departureFlight = await flightService.createFlight({
            guestId: rsvpData.guestId.toString(),
            eventId: rsvpData.eventId.toString(),
            flightType: 'departure',
            airline: flightDetails.departureAirline,
            flightNumber: flightDetails.departureFlightNumber,
            departureAirport: flightDetails.arrivalAirport || '', // Departure from arrival airport
            arrivalAirport: flightDetails.departureAirport || '', // Return to original departure airport
            scheduledDeparture: flightDetails.departureScheduledDeparture || new Date().toISOString(),
            scheduledArrival: flightDetails.departureScheduledArrival || new Date().toISOString(),
            status: 'scheduled',
            seat: flightDetails.departureSeat,
            assistanceRequired: flightDetails.departureAssistanceRequired || false,
            specialRequirements: flightDetails.departureSpecialRequirements || []
          });

          results.departureFlightId = departureFlight.id;

          // Create assistance request if needed
          if (flightDetails.departureAssistanceRequired) {
            const assistanceRequest = await flightService.createAssistanceRequest({
              flightId: departureFlight.id,
              guestId: rsvpData.guestId.toString(),
              eventId: rsvpData.eventId.toString(),
              assistanceType: 'checkin', // Default to check-in assistance
              description: `Assistance required for departure flight ${flightDetails.departureAirline} ${flightDetails.departureFlightNumber}`,
              status: 'requested'
            });

            results.assistanceRequestIds?.push(assistanceRequest.id);
          }

          console.log(`✅ Created departure flight record: ${departureFlight.id}`);

        } catch (error) {
          console.error('❌ Failed to create departure flight:', error);
          // Don't throw - we've processed what we can
        }
      }

      // Record metrics
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('rsvp_flight_integration_duration_ms', duration, {
        status: 'success',
        has_arrival: results.arrivalFlightId ? 'true' : 'false',
        has_departure: results.departureFlightId ? 'true' : 'false'
      });

      metricsRegistry.incrementCounter('rsvp_flight_integrations_total', {
        status: 'success'
      });

      return results;

    } catch (error) {
      // Record error metrics
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('rsvp_flight_integration_duration_ms', duration, {
        status: 'error'
      });

      metricsRegistry.incrementCounter('rsvp_flight_integrations_total', {
        status: 'error'
      });

      console.error('❌ RSVP flight integration failed:', error);
      throw new Error(`RSVP flight integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update existing flight records when RSVP is modified
   */
  async updateRsvpFlightData(guestId: number, eventId: number, rsvpData: RsvpFlightData): Promise<void> {
    try {
      // First, check if there are existing flight records for this guest/event
      const existingFlights = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM flight_details WHERE guest_id = $1 AND event_id = $2`,
        [guestId, eventId]
      );

      // Delete existing flight records (they will be recreated with new data)
      if (existingFlights.length > 0) {
        await schemaValidationService.executeOptimizedQuery(
          this.db,
          `DELETE FROM flight_details WHERE guest_id = $1 AND event_id = $2`,
          [guestId, eventId]
        );

        console.log(`🗑️ Removed ${existingFlights.length} existing flight records for guest ${guestId}`);
      }

      // Create new flight records with updated data
      await this.processRsvpFlightData({
        guestId,
        eventId,
        flightDetails: rsvpData.flightDetails
      });

    } catch (error) {
      console.error('❌ Failed to update RSVP flight data:', error);
      throw error;
    }
  }

  /**
   * Remove flight records when RSVP is cancelled
   */
  async removeRsvpFlightData(guestId: number, eventId: number): Promise<void> {
    try {
      // Remove all flight-related records for this guest/event
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `DELETE FROM flight_assistance_requests WHERE guest_id = $1 AND event_id = $2`,
        [guestId, eventId]
      );

      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `DELETE FROM flight_details WHERE guest_id = $1 AND event_id = $2`,
        [guestId, eventId]
      );

      console.log(`🗑️ Removed all flight records for guest ${guestId} from event ${eventId}`);

      metricsRegistry.incrementCounter('rsvp_flight_removals_total', {
        status: 'success'
      });

    } catch (error) {
      console.error('❌ Failed to remove RSVP flight data:', error);

      metricsRegistry.incrementCounter('rsvp_flight_removals_total', {
        status: 'error'
      });

      throw error;
    }
  }

  /**
   * Get flight coordination summary for an RSVP
   */
  async getFlightCoordinationSummary(guestId: number, eventId: number): Promise<{
    hasFlights: boolean;
    arrivalFlight?: any;
    departureFlight?: any;
    assistanceRequests?: any[];
  }> {
    try {
      const flights = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM flight_details WHERE guest_id = $1 AND event_id = $2 ORDER BY flight_type, created_at`,
        [guestId, eventId]
      );

      const assistanceRequests = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM flight_assistance_requests WHERE guest_id = $1 AND event_id = $2`,
        [guestId, eventId]
      );

      const arrivalFlight = flights.find((f: any) => f.flight_type === 'arrival');
      const departureFlight = flights.find((f: any) => f.flight_type === 'departure');

      return {
        hasFlights: flights.length > 0,
        arrivalFlight,
        departureFlight,
        assistanceRequests
      };

    } catch (error) {
      console.error('❌ Failed to get flight coordination summary:', error);
      return { hasFlights: false };
    }
  }
}

// Export singleton instance
let rsvpFlightIntegrationService: RsvpFlightIntegrationService | null = null;

export function initializeRsvpFlightIntegration(db: DatabaseConnection): RsvpFlightIntegrationService {
  if (!rsvpFlightIntegrationService) {
    rsvpFlightIntegrationService = new RsvpFlightIntegrationService(db);
    console.log('✅ RSVP Flight Integration service initialized');
  }
  return rsvpFlightIntegrationService;
}

export function getRsvpFlightIntegrationService(): RsvpFlightIntegrationService {
  if (!rsvpFlightIntegrationService) {
    throw new Error('RSVP Flight Integration service not initialized');
  }
  return rsvpFlightIntegrationService;
}