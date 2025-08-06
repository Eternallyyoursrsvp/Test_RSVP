import { storage } from '../storage';
import { performance } from 'perf_hooks';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface DashboardData {
  stats: {
    totalGuests: number;
    confirmedGuests: number;
    pendingGuests: number;
    declinedGuests: number;
    rsvpRate: number;
    plusOnes: number;
    children: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    guestName?: string;
  }>;
  accommodationStats: {
    totalRooms: number;
    allocatedRooms: number;
    occupancyRate: number;
    byHotel: Array<{
      hotelName: string;
      totalRooms: number;
      allocatedRooms: number;
      occupancyRate: number;
    }>;
  };
  transportStats: {
    totalGuests: number;
    assignedGuests: number;
    assignmentRate: number;
    byGroup: Array<{
      groupName: string;
      capacity: number;
      assigned: number;
      utilizationRate: number;
    }>;
  };
  travelStats: {
    totalTravelers: number;
    flightDetails: number;
    accommodationNeeds: number;
    byFlightStatus: Array<{
      status: string;
      count: number;
    }>;
  };
}

export class AnalyticsService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 300000; // 5 minutes
  private metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    generationTime: 0,
    totalRequests: 0
  };

  constructor() {
    // Cleanup expired cache entries every minute
    setInterval(() => this.cleanupCache(), 60000);
  }

  async getDashboardData(eventId: string, useCache = true): Promise<DashboardData> {
    const start = performance.now();
    this.metrics.totalRequests++;
    
    const cacheKey = `dashboard:${eventId}`;
    
    if (useCache) {
      const cached = this.getFromCache<DashboardData>(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        console.log(`📊 Dashboard cache HIT for event ${eventId} (${(performance.now() - start).toFixed(2)}ms)`);
        return cached;
      }
    }

    this.metrics.cacheMisses++;
    console.log(`📊 Dashboard cache MISS for event ${eventId}, generating...`);

    try {
      const data = await this.generateDashboardData(eventId);
      
      if (useCache) {
        this.setCache(cacheKey, data, this.defaultTTL);
      }

      const duration = performance.now() - start;
      this.metrics.generationTime += duration;
      
      console.log(`📊 Dashboard data generated for event ${eventId} (${duration.toFixed(2)}ms)`);
      return data;
    } catch (error) {
      console.error(`❌ Error generating dashboard data for event ${eventId}:`, error);
      throw error;
    }
  }

  private async generateDashboardData(eventId: string): Promise<DashboardData> {
    const eventIdNum = parseInt(eventId);
    
    const [guests, accommodations, ceremonies, travelInfos] = await Promise.all([
      storage.getGuestsByEvent(eventIdNum),
      storage.getAccommodationsByEvent(eventIdNum),
      storage.getCeremoniesByEvent(eventIdNum),
      storage.getTravelInfoByEvent(eventIdNum)
    ]);

    // Calculate basic stats
    const confirmedGuests = guests.filter(g => g.rsvpStatus === 'confirmed').length;
    const pendingGuests = guests.filter(g => g.rsvpStatus === 'pending').length;
    const declinedGuests = guests.filter(g => g.rsvpStatus === 'declined').length;
    const plusOnes = guests.filter(g => g.plusOneName && g.plusOneConfirmed).length;
    const children = guests.reduce((acc, g) => {
      return acc + (g.childrenDetails && Array.isArray(g.childrenDetails) ? g.childrenDetails.length : 0);
    }, 0);

    // Calculate accommodation stats
    const accommodationStats = await this.calculateAccommodationStats(accommodations);
    
    // Calculate transport stats (placeholder - would need transport data structure)
    const transportStats = {
      totalGuests: guests.length,
      assignedGuests: 0, // Would calculate from transport assignments
      assignmentRate: 0,
      byGroup: []
    };

    // Calculate travel stats
    const travelStats = {
      totalTravelers: travelInfos.length,
      flightDetails: travelInfos.filter(t => t.flightNumber).length,
      accommodationNeeds: travelInfos.filter(t => t.needsAccommodation).length,
      byFlightStatus: this.groupByFlightStatus(travelInfos)
    };

    // Generate recent activity (placeholder)
    const recentActivity = this.generateRecentActivity(guests, accommodations);

    return {
      stats: {
        totalGuests: guests.length,
        confirmedGuests,
        pendingGuests,
        declinedGuests,
        rsvpRate: guests.length > 0 ? ((confirmedGuests + declinedGuests) / guests.length) * 100 : 0,
        plusOnes,
        children
      },
      recentActivity,
      accommodationStats,
      transportStats,
      travelStats
    };
  }

  private async calculateAccommodationStats(accommodations: any[]) {
    const totalRooms = accommodations.reduce((acc, acc_item) => acc + (acc_item.totalRooms || 0), 0);
    const allocatedRooms = accommodations.reduce((acc, acc_item) => acc + (acc_item.allocatedRooms || 0), 0);
    
    const byHotel = await Promise.all(
      accommodations.map(async (acc) => {
        let hotelName = 'Unknown Hotel';
        if (acc.hotelId) {
          try {
            const hotel = await storage.getHotel(acc.hotelId);
            hotelName = hotel?.name || 'Unknown Hotel';
          } catch (error) {
            console.warn(`Could not fetch hotel ${acc.hotelId}:`, error);
          }
        }
        
        const totalRooms = acc.totalRooms || 0;
        const allocatedRooms = acc.allocatedRooms || 0;
        
        return {
          hotelName,
          totalRooms,
          allocatedRooms,
          occupancyRate: totalRooms > 0 ? (allocatedRooms / totalRooms) * 100 : 0
        };
      })
    );

    return {
      totalRooms,
      allocatedRooms,
      occupancyRate: totalRooms > 0 ? (allocatedRooms / totalRooms) * 100 : 0,
      byHotel
    };
  }

  private groupByFlightStatus(travelInfos: any[]) {
    const statusGroups = travelInfos.reduce((acc, travel) => {
      const status = travel.flightStatus || 'Not Specified';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusGroups).map(([status, count]) => ({ status, count }));
  }

  private generateRecentActivity(guests: any[], accommodations: any[]) {
    const activities = [];
    
    // Recent RSVPs
    const recentRSVPs = guests
      .filter(g => g.rsvpStatus !== 'pending' && g.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
    
    recentRSVPs.forEach(guest => {
      activities.push({
        id: `rsvp-${guest.id}`,
        type: 'RSVP_UPDATE',
        message: `${guest.firstName} ${guest.lastName} ${guest.rsvpStatus} their invitation`,
        timestamp: guest.updatedAt,
        guestName: `${guest.firstName} ${guest.lastName}`
      });
    });

    // Recent accommodations
    accommodations.forEach(acc => {
      if (acc.updatedAt) {
        activities.push({
          id: `accommodation-${acc.id}`,
          type: 'ACCOMMODATION_UPDATE',
          message: `Accommodation updated`,
          timestamp: acc.updatedAt
        });
      }
    });

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }

  // Real-time analytics methods
  async getEventStats(eventId: string): Promise<any> {
    const cacheKey = `stats:${eventId}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const eventIdNum = parseInt(eventId);
    const stats = await storage.getEventStats(eventIdNum);
    
    this.setCache(cacheKey, stats, 60000); // 1 minute cache
    return stats;
  }

  async getRSVPTrends(eventId: string, days = 30): Promise<any> {
    const cacheKey = `rsvp-trends:${eventId}:${days}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    // This would require a more sophisticated query to get RSVP trends over time
    const eventIdNum = parseInt(eventId);
    const guests = await storage.getGuestsByEvent(eventIdNum);
    
    // Group by date (simplified)
    const trends = this.calculateRSVPTrends(guests, days);
    
    this.setCache(cacheKey, trends, 3600000); // 1 hour cache
    return trends;
  }

  private calculateRSVPTrends(guests: any[], days: number) {
    const now = new Date();
    const trends = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const rsvpsOnDate = guests.filter(g => {
        if (!g.updatedAt) return false;
        const guestDate = new Date(g.updatedAt).toISOString().split('T')[0];
        return guestDate === dateStr && g.rsvpStatus !== 'pending';
      }).length;
      
      trends.push({
        date: dateStr,
        rsvps: rsvpsOnDate,
        cumulative: guests.filter(g => {
          if (!g.updatedAt) return false;
          return new Date(g.updatedAt) <= date && g.rsvpStatus !== 'pending';
        }).length
      });
    }
    
    return trends.reverse();
  }

  // Cache management
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  // Invalidate cache methods
  invalidateEventCache(eventId: string): void {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(eventId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries for event ${eventId}`);
  }

  clearAllCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cleared all ${size} cache entries`);
  }

  // Metrics and monitoring
  getMetrics() {
    const avgGenerationTime = this.metrics.totalRequests > 0 
      ? this.metrics.generationTime / this.metrics.cacheMisses 
      : 0;
    
    const cacheHitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100 
      : 0;

    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      avgGenerationTime: Math.round(avgGenerationTime * 100) / 100
    };
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();
