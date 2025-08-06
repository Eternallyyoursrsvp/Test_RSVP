import { db } from '../../db';
import {
  guests,
  guestTravelInfo,
  locationRepresentatives,
  weddingEvents
} from '@shared/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

export interface TravelBatchData {
  travelGuests: Array<{
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    rsvpStatus: string;
    needsFlightAssistance: boolean;
    travelInfo: any | null;
    flightStatus: string;
  }>;
  airportReps: any[];
  travelSettings: any;
  statistics: {
    totalGuests: number;
    withFlightInfo: number;
    confirmed: number;
    pending: number;
    needsAssistance: number;
    completionRate: number;
  };
  performance: {
    executionTime: number;
    queryOptimization: string;
  };
}

export class TravelBatchService {
  /**
   * ULTRA-FAST batch endpoint for travel management data
   * Combines all travel-related queries into single optimized call
   */
  
  async getTravelBatchData(eventId: number): Promise<TravelBatchData> {
    const startTime = Date.now();

    try {
      // Parallel query execution for maximum performance
      const [guestTravelResults, airportRepsResults, eventSettingsResults] = await Promise.all([
        // Optimized guests query with travel info join
        db
          .select({
            id: guests.id,
            firstName: guests.firstName,
            lastName: guests.lastName,
            email: guests.email,
            phone: guests.phone,
            rsvpStatus: guests.rsvpStatus,
            needsFlightAssistance: guests.needsFlightAssistance,
            travelInfo: guestTravelInfo
          })
          .from(guests)
          .leftJoin(guestTravelInfo, eq(guests.id, guestTravelInfo.guestId))
          .where(eq(guests.eventId, eventId)),

        // Airport representatives query
        db
          .select()
          .from(locationRepresentatives)
          .where(eq(locationRepresentatives.eventId, eventId)),

        // Event settings query
        db
          .select()
          .from(weddingEvents)
          .where(eq(weddingEvents.id, eventId))
          .limit(1)
      ]);

      // Process results efficiently with optimized data structure
      const travelGuests = guestTravelResults.map(guest => ({
        id: guest.id,
        name: `${guest.firstName} ${guest.lastName}`,
        email: guest.email,
        phone: guest.phone,
        rsvpStatus: guest.rsvpStatus,
        needsFlightAssistance: guest.needsFlightAssistance || false,
        travelInfo: guest.travelInfo,
        flightStatus: guest.travelInfo?.status || 'pending'
      }));

      // Calculate statistics efficiently
      const totalGuests = travelGuests.length;
      const withFlightInfo = travelGuests.filter(g => g.travelInfo?.flightNumber).length;
      const confirmed = travelGuests.filter(g => g.flightStatus === 'confirmed').length;
      const pending = travelGuests.filter(g => g.flightStatus === 'pending').length;
      const needsAssistance = travelGuests.filter(g => g.needsFlightAssistance).length;

      const executionTime = Date.now() - startTime;

      // Performance optimization classification
      let queryOptimization: string;
      if (executionTime < 50) {
        queryOptimization = 'excellent';
      } else if (executionTime < 100) {
        queryOptimization = 'good';
      } else if (executionTime < 200) {
        queryOptimization = 'acceptable';
      } else {
        queryOptimization = 'needs_optimization';
      }

      return {
        travelGuests,
        airportReps: airportRepsResults || [],
        travelSettings: eventSettingsResults[0] || {},
        statistics: {
          totalGuests,
          withFlightInfo,
          confirmed,
          pending,
          needsAssistance,
          completionRate: totalGuests > 0 ? Math.round((confirmed / totalGuests) * 100) : 0
        },
        performance: {
          executionTime,
          queryOptimization
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Log performance issue
      if (executionTime > 1000) {
        console.error(`Slow travel batch query: ${executionTime}ms for event ${eventId}`);
      }
      
      throw new Error(`Travel batch query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get optimized travel statistics only (minimal data transfer)
   */
  
  async getTravelStatistics(eventId: number): Promise<{
    statistics: TravelBatchData['statistics'];
    performance: TravelBatchData['performance'];
  }> {
    const startTime = Date.now();

    try {
      // Ultra-optimized count queries using aggregation
      const [guestCounts] = await db
        .select({
          totalGuests: sql`COUNT(*)`,
          withFlightAssistance: sql`COUNT(CASE WHEN ${guests.needsFlightAssistance} = true THEN 1 END)`,
          withTravelInfo: sql`COUNT(${guestTravelInfo.id})`,
          confirmedFlights: sql`COUNT(CASE WHEN ${guestTravelInfo.status} = 'confirmed' THEN 1 END)`
        })
        .from(guests)
        .leftJoin(guestTravelInfo, eq(guests.id, guestTravelInfo.guestId))
        .where(eq(guests.eventId, eventId));

      const executionTime = Date.now() - startTime;

      const totalGuests = Number(guestCounts.totalGuests);
      const withFlightInfo = Number(guestCounts.withTravelInfo);
      const confirmed = Number(guestCounts.confirmedFlights);
      const needsAssistance = Number(guestCounts.withFlightAssistance);
      const pending = totalGuests - confirmed;

      return {
        statistics: {
          totalGuests,
          withFlightInfo,
          confirmed,
          pending,
          needsAssistance,
          completionRate: totalGuests > 0 ? Math.round((confirmed / totalGuests) * 100) : 0
        },
        performance: {
          executionTime,
          queryOptimization: executionTime < 25 ? 'excellent' : 
                           executionTime < 50 ? 'good' : 
                           executionTime < 100 ? 'acceptable' : 'needs_optimization'
        }
      };

    } catch (error) {
      throw new Error(`Travel statistics query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get optimized guest travel info for specific guests (cached lookup)
   */
  
  async getOptimizedGuestTravelInfo(eventId: number, guestIds?: number[]): Promise<{
    guests: TravelBatchData['travelGuests'];
    performance: TravelBatchData['performance'];
  }> {
    const startTime = Date.now();

    try {
      let query = db
        .select({
          id: guests.id,
          firstName: guests.firstName,
          lastName: guests.lastName,
          email: guests.email,
          phone: guests.phone,
          rsvpStatus: guests.rsvpStatus,
          needsFlightAssistance: guests.needsFlightAssistance,
          travelInfo: guestTravelInfo
        })
        .from(guests)
        .leftJoin(guestTravelInfo, eq(guests.id, guestTravelInfo.guestId))
        .where(eq(guests.eventId, eventId));

      // Add guest ID filter if specified
      if (guestIds && guestIds.length > 0) {
        query = query.where(
          and(
            eq(guests.eventId, eventId),
            inArray(guests.id, guestIds)
          )
        );
      }

      const results = await query;

      const travelGuests = results.map(guest => ({
        id: guest.id,
        name: `${guest.firstName} ${guest.lastName}`,
        email: guest.email,
        phone: guest.phone,
        rsvpStatus: guest.rsvpStatus,
        needsFlightAssistance: guest.needsFlightAssistance || false,
        travelInfo: guest.travelInfo,
        flightStatus: guest.travelInfo?.status || 'pending'
      }));

      const executionTime = Date.now() - startTime;

      return {
        guests: travelGuests,
        performance: {
          executionTime,
          queryOptimization: executionTime < 30 ? 'excellent' : 
                           executionTime < 60 ? 'good' : 
                           executionTime < 120 ? 'acceptable' : 'needs_optimization'
        }
      };

    } catch (error) {
      throw new Error(`Optimized guest travel info query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for batch operations performance
   */
  
  async performanceHealthCheck(eventId: number): Promise<{
    healthy: boolean;
    metrics: {
      batchQuery: number;
      statisticsQuery: number;
      guestInfoQuery: number;
    };
    recommendations: string[];
  }> {
    const metrics = {
      batchQuery: 0,
      statisticsQuery: 0,
      guestInfoQuery: 0
    };

    const recommendations: string[] = [];

    try {
      // Test batch query performance
      const batchStart = Date.now();
      await this.getTravelBatchData(eventId);
      metrics.batchQuery = Date.now() - batchStart;

      // Test statistics query performance
      const statsStart = Date.now();
      await this.getTravelStatistics(eventId);
      metrics.statisticsQuery = Date.now() - statsStart;

      // Test guest info query performance
      const guestStart = Date.now();
      await this.getOptimizedGuestTravelInfo(eventId);
      metrics.guestInfoQuery = Date.now() - guestStart;

      // Generate recommendations
      if (metrics.batchQuery > 200) {
        recommendations.push('Consider adding database indexes for travel batch queries');
      }
      if (metrics.statisticsQuery > 50) {
        recommendations.push('Statistics query may benefit from materialized views');
      }
      if (metrics.guestInfoQuery > 100) {
        recommendations.push('Guest travel info queries could use query optimization');
      }

      const healthy = metrics.batchQuery < 500 && 
                     metrics.statisticsQuery < 100 && 
                     metrics.guestInfoQuery < 200;

      return {
        healthy,
        metrics,
        recommendations
      };

    } catch (error) {
      return {
        healthy: false,
        metrics,
        recommendations: [`Performance health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}

export const travelBatchService = new TravelBatchService();