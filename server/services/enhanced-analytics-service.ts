import { storage } from '../storage';
import { performance } from 'perf_hooks';
import Redis from 'ioredis';

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

/**
 * Enhanced Analytics Service with Redis Caching
 * Following the systematic workflow patterns from Phase 2 Week 3
 */
export class EnhancedAnalyticsService {
  private redis: Redis;
  private fallbackCache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 300; // 5 minutes in seconds
  private metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    redisCacheHits: 0,
    redisCacheMisses: 0,
    fallbackCacheHits: 0,
    generationTime: 0,
    totalRequests: 0,
    redisErrors: 0
  };

  constructor() {
    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis connected for analytics caching');
    });

    this.redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
      this.metrics.redisErrors++;
    });

    // Cleanup expired fallback cache entries every minute
    setInterval(() => this.cleanupFallbackCache(), 60000);
  }

  /**
   * Get cached data or fetch from source with Redis-first caching strategy
   */
  async getCachedOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const start = performance.now();
    this.metrics.totalRequests++;

    try {
      // Try Redis cache first
      const cached = await this.redis.get(key);
      if (cached) {
        this.metrics.cacheHits++;
        this.metrics.redisCacheHits++;
        console.log(`📊 Redis cache HIT for ${key} (${(performance.now() - start).toFixed(2)}ms)`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`⚠️ Redis cache error for ${key}:`, error);
      this.metrics.redisErrors++;
      
      // Try fallback cache
      const fallback = this.getFromFallbackCache<T>(key);
      if (fallback) {
        this.metrics.cacheHits++;
        this.metrics.fallbackCacheHits++;
        console.log(`📊 Fallback cache HIT for ${key} (${(performance.now() - start).toFixed(2)}ms)`);
        return fallback;
      }
    }

    // Cache miss - fetch data
    this.metrics.cacheMisses++;
    this.metrics.redisCacheMisses++;
    console.log(`📊 Cache MISS for ${key}, fetching...`);

    const data = await fetcher();
    
    // Cache the result
    await this.setCacheWithFallback(key, data, ttl);

    const duration = performance.now() - start;
    this.metrics.generationTime = (this.metrics.generationTime + duration) / 2; // Moving average
    
    console.log(`📊 Data generated and cached for ${key} (${duration.toFixed(2)}ms)`);
    return data;
  }

  /**
   * Get dashboard data with enhanced caching
   */
  async getDashboardData(eventId: string, useCache = true): Promise<DashboardData> {
    if (!useCache) {
      return this.generateDashboardData(eventId);
    }

    const cacheKey = `analytics:dashboard:${eventId}`;
    return this.getCachedOrFetch(cacheKey, () => this.generateDashboardData(eventId));
  }

  /**
   * Get event statistics with caching
   */
  async getEventStats(eventId: string): Promise<any> {
    const cacheKey = `analytics:stats:${eventId}`;
    return this.getCachedOrFetch(
      cacheKey, 
      () => this.generateEventStats(eventId),
      60 // Shorter TTL for stats (1 minute)
    );
  }

  /**
   * Get RSVP trends with caching
   */
  async getRSVPTrends(eventId: string, days: number = 30): Promise<any> {
    const cacheKey = `analytics:trends:${eventId}:${days}`;
    return this.getCachedOrFetch(
      cacheKey,
      () => this.generateRSVPTrends(eventId, days),
      600 // Longer TTL for trends (10 minutes)
    );
  }

  /**
   * Generate dashboard data from database
   */
  private async generateDashboardData(eventId: string): Promise<DashboardData> {
    const eventIdNum = parseInt(eventId);
    
    // Parallel data fetching for performance
    const [
      guests,
      hotels,
      transportGroups,
      travelInfo,
      recentActivity
    ] = await Promise.all([
      storage.getGuestsByEvent(eventIdNum),
      this.getHotelStats(eventIdNum),
      this.getTransportStats(eventIdNum),
      this.getTravelStats(eventIdNum),
      this.getRecentActivity(eventIdNum)
    ]);

    // Calculate guest statistics
    const confirmedGuests = guests.filter(g => g.rsvpStatus === 'confirmed').length;
    const pendingGuests = guests.filter(g => g.rsvpStatus === 'pending').length;
    const declinedGuests = guests.filter(g => g.rsvpStatus === 'declined').length;
    const plusOnes = guests.filter(g => g.plusOneConfirmed).length;
    const children = guests.reduce((sum, g) => sum + (g.numberOfChildren || 0), 0);

    return {
      stats: {
        totalGuests: guests.length,
        confirmedGuests,
        pendingGuests,
        declinedGuests,
        rsvpRate: guests.length > 0 ? Math.round((confirmedGuests / guests.length) * 100) : 0,
        plusOnes,
        children
      },
      recentActivity,
      accommodationStats: hotels,
      transportStats: transportGroups,
      travelStats: travelInfo
    };
  }

  /**
   * Generate event statistics
   */
  private async generateEventStats(eventId: string): Promise<any> {
    const eventIdNum = parseInt(eventId);
    const guests = await storage.getGuestsByEvent(eventIdNum);
    
    const stats = {
      totalGuests: guests.length,
      confirmedGuests: guests.filter(g => g.rsvpStatus === 'confirmed').length,
      pendingGuests: guests.filter(g => g.rsvpStatus === 'pending').length,
      declinedGuests: guests.filter(g => g.rsvpStatus === 'declined').length,
      lastUpdated: new Date().toISOString()
    };

    return stats;
  }

  /**
   * Generate RSVP trends data
   */
  private async generateRSVPTrends(eventId: string, days: number): Promise<any> {
    const eventIdNum = parseInt(eventId);
    const guests = await storage.getGuestsByEvent(eventIdNum);
    
    // Group RSVPs by date
    const trends = guests
      .filter(g => g.rsvpDate && g.rsvpStatus !== 'pending')
      .reduce((acc, guest) => {
        const date = guest.rsvpDate!.split('T')[0];
        if (!acc[date]) {
          acc[date] = { confirmed: 0, declined: 0 };
        }
        acc[date][guest.rsvpStatus as 'confirmed' | 'declined']++;
        return acc;
      }, {} as Record<string, { confirmed: number; declined: number }>);

    return {
      dailyTrends: trends,
      totalResponses: Object.values(trends).reduce((sum, day) => sum + day.confirmed + day.declined, 0),
      period: `${days} days`
    };
  }

  /**
   * Get hotel accommodation statistics
   */
  private async getHotelStats(eventId: number) {
    try {
      const accommodations = await storage.getAccommodationsByEvent(eventId);
      const hotels = await storage.getHotelsByEvent(eventId);
      
      const hotelStats = hotels.map(hotel => {
        const allocations = accommodations.filter(a => a.hotelId === hotel.id);
        const allocatedRooms = allocations.length;
        const totalRooms = hotel.totalRooms || 0;
        
        return {
          hotelName: hotel.name,
          totalRooms,
          allocatedRooms,
          occupancyRate: totalRooms > 0 ? Math.round((allocatedRooms / totalRooms) * 100) : 0
        };
      });

      const totalRooms = hotels.reduce((sum, h) => sum + (h.totalRooms || 0), 0);
      const totalAllocated = accommodations.length;

      return {
        totalRooms,
        allocatedRooms: totalAllocated,
        occupancyRate: totalRooms > 0 ? Math.round((totalAllocated / totalRooms) * 100) : 0,
        byHotel: hotelStats
      };
    } catch (error) {
      console.error('Error getting hotel stats:', error);
      return {
        totalRooms: 0,
        allocatedRooms: 0,
        occupancyRate: 0,
        byHotel: []
      };
    }
  }

  /**
   * Get transport statistics
   */
  private async getTransportStats(eventId: number) {
    try {
      // This would integrate with transport services when available
      return {
        totalGuests: 0,
        assignedGuests: 0,
        assignmentRate: 0,
        byGroup: []
      };
    } catch (error) {
      console.error('Error getting transport stats:', error);
      return {
        totalGuests: 0,
        assignedGuests: 0,
        assignmentRate: 0,
        byGroup: []
      };
    }
  }

  /**
   * Get travel statistics
   */
  private async getTravelStats(eventId: number) {
    try {
      const travelInfos = await Promise.resolve([]); // Placeholder for travel info service
      
      return {
        totalTravelers: travelInfos.length,
        flightDetails: 0,
        accommodationNeeds: 0,
        byFlightStatus: []
      };
    } catch (error) {
      console.error('Error getting travel stats:', error);
      return {
        totalTravelers: 0,
        flightDetails: 0,
        accommodationNeeds: 0,
        byFlightStatus: []
      };
    }
  }

  /**
   * Get recent activity
   */
  private async getRecentActivity(eventId: number) {
    try {
      const guests = await storage.getGuestsByEvent(eventId);
      
      // Get recent RSVP activity
      const recentRSVPs = guests
        .filter(g => g.rsvpDate && g.rsvpStatus !== 'pending')
        .sort((a, b) => new Date(b.rsvpDate!).getTime() - new Date(a.rsvpDate!).getTime())
        .slice(0, 10)
        .map(guest => ({
          id: `rsvp-${guest.id}`,
          type: 'RSVP_RECEIVED',
          message: `${guest.firstName} ${guest.lastName} ${guest.rsvpStatus === 'confirmed' ? 'confirmed' : 'declined'} their RSVP`,
          timestamp: guest.rsvpDate!,
          guestName: `${guest.firstName} ${guest.lastName}`
        }));

      return recentRSVPs;
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Set cache with Redis primary and fallback
   */
  private async setCacheWithFallback<T>(key: string, data: T, ttl: number) {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.warn(`⚠️ Redis cache set error for ${key}:`, error);
      this.metrics.redisErrors++;
      
      // Use fallback cache
      this.setFallbackCache(key, data, ttl * 1000); // Convert to milliseconds
    }
  }

  /**
   * Invalidate event cache
   */
  async invalidateEventCache(eventId: string) {
    const patterns = [
      `analytics:dashboard:${eventId}`,
      `analytics:stats:${eventId}`,
      `analytics:trends:${eventId}:*`
    ];

    for (const pattern of patterns) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          console.log(`🗑️ Invalidated ${keys.length} cache keys for pattern: ${pattern}`);
        }
      } catch (error) {
        console.warn(`⚠️ Redis cache invalidation error for ${pattern}:`, error);
        
        // Clear fallback cache
        for (const [cacheKey] of this.fallbackCache) {
          if (cacheKey.includes(eventId)) {
            this.fallbackCache.delete(cacheKey);
          }
        }
      }
    }
  }

  /**
   * Clear all cache
   */
  async clearAllCache() {
    try {
      await this.redis.flushall();
      console.log('🗑️ All Redis cache cleared');
    } catch (error) {
      console.warn('⚠️ Redis flush error:', error);
    }
    
    this.fallbackCache.clear();
    console.log('🗑️ All fallback cache cleared');
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.totalRequests > 0 
        ? Math.round((this.metrics.cacheHits / this.metrics.totalRequests) * 100) 
        : 0,
      redisHealth: this.redis.status === 'ready',
      fallbackCacheSize: this.fallbackCache.size
    };
  }

  /**
   * Fallback cache operations
   */
  private getFromFallbackCache<T>(key: string): T | null {
    const entry = this.fallbackCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.fallbackCache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setFallbackCache<T>(key: string, data: T, ttl: number) {
    this.fallbackCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private cleanupFallbackCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.fallbackCache) {
      if (now > entry.timestamp + entry.ttl) {
        this.fallbackCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired fallback cache entries`);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.redis.ping();
      return {
        redis: 'healthy',
        fallbackCache: 'healthy',
        metrics: this.getMetrics()
      };
    } catch (error) {
      return {
        redis: 'unhealthy',
        fallbackCache: 'healthy',
        error: error instanceof Error ? error.message : String(error),
        metrics: this.getMetrics()
      };
    }
  }
}

// Export singleton instance
export const enhancedAnalyticsService = new EnhancedAnalyticsService();