import express, { Router } from 'express';
import { ModuleService } from '../core/module-service';
import { ValidationMiddleware } from '../core/validation';
import { isAuthenticated } from '../../middleware';
import { enhancedAnalyticsService } from '../../services/enhanced-analytics-service';
import { z } from 'zod';

const eventIdSchema = z.object({
  eventId: z.string().transform(val => parseInt(val))
});

const analyticsQuerySchema = z.object({
  useCache: z.string().optional().transform(val => val !== 'false'),
  refresh: z.string().optional().transform(val => val === 'true'),
  days: z.string().optional().transform(val => val ? parseInt(val) : 30)
});

export async function createAnalyticsAPI(): Promise<Router> {
  const router = express.Router();
  const service = new ModuleService('analytics');
  const validator = new ValidationMiddleware('analytics');

  router.use(isAuthenticated);
  router.use(service.middleware);

  // Dashboard data endpoint
  router.get('/events/:eventId/dashboard', 
    validator.validateParams(eventIdSchema),
    validator.validateQuery(analyticsQuerySchema),
    async (req, res) => {
      try {
        const { eventId } = req.validatedParams;
        const { useCache, refresh } = req.validatedQuery;
        
        // Refresh cache if requested
        if (refresh) {
          await enhancedAnalyticsService.invalidateEventCache(eventId.toString());
        }

        const dashboardData = await enhancedAnalyticsService.getDashboardData(
          eventId.toString(), 
          useCache && !refresh
        );

        res.json({
          success: true,
          data: dashboardData,
          metadata: {
            eventId,
            cached: useCache && !refresh,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // Event statistics endpoint
  router.get('/events/:eventId/stats',
    validator.validateParams(eventIdSchema),
    async (req, res) => {
      try {
        const { eventId } = req.validatedParams;
        const stats = await enhancedAnalyticsService.getEventStats(eventId.toString());

        res.json({
          success: true,
          data: stats,
          metadata: {
            eventId,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // RSVP trends endpoint
  router.get('/events/:eventId/rsvp-trends',
    validator.validateParams(eventIdSchema),
    validator.validateQuery(analyticsQuerySchema),
    async (req, res) => {
      try {
        const { eventId } = req.validatedParams;
        const { days } = req.validatedQuery;
        
        const trends = await enhancedAnalyticsService.getRSVPTrends(eventId.toString(), days);

        res.json({
          success: true,
          data: trends,
          metadata: {
            eventId,
            days,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // Real-time event data (lightweight for frequent polling)
  router.get('/events/:eventId/realtime',
    validator.validateParams(eventIdSchema),
    async (req, res) => {
      try {
        const { eventId } = req.validatedParams;
        
        // Get minimal real-time data with shorter cache
        const stats = await enhancedAnalyticsService.getEventStats(eventId.toString());
        
        res.json({
          success: true,
          data: {
            stats,
            lastUpdated: new Date().toISOString(),
            eventId
          },
          metadata: {
            realtime: true,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // Cache management endpoints
  router.post('/cache/invalidate/:eventId',
    validator.validateParams(eventIdSchema),
    async (req, res) => {
      try {
        const { eventId } = req.validatedParams;
        await enhancedAnalyticsService.invalidateEventCache(eventId.toString());
        
        res.json({
          success: true,
          message: `Cache invalidated for event ${eventId}`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  router.post('/cache/clear', async (req, res) => {
    try {
      await enhancedAnalyticsService.clearAllCache();
      
      res.json({
        success: true,
        message: 'All cache cleared',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      service.handleError(error, res);
    }
  });

  // Analytics metrics endpoint
  router.get('/metrics', async (req, res) => {
    try {
      const metrics = enhancedAnalyticsService.getMetrics();
      
      res.json({
        success: true,
        data: metrics,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      service.handleError(error, res);
    }
  });

  // Comparison endpoint for multiple events
  router.post('/compare', 
    validator.validate(z.object({
      eventIds: z.array(z.number()),
      metrics: z.array(z.string()).optional().default(['stats'])
    })),
    async (req, res) => {
      try {
        const { eventIds, metrics } = req.validatedBody;
        
        const comparisons = await Promise.all(
          eventIds.map(async (eventId) => {
            const data: any = { eventId };
            
            if (metrics.includes('stats')) {
              data.stats = await enhancedAnalyticsService.getEventStats(eventId.toString());
            }
            
            if (metrics.includes('dashboard')) {
              data.dashboard = await enhancedAnalyticsService.getDashboardData(eventId.toString());
            }
            
            return data;
          })
        );

        res.json({
          success: true,
          data: comparisons,
          metadata: {
            eventCount: eventIds.length,
            metrics,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // Export data endpoint
  router.get('/events/:eventId/export/:format',
    validator.validateParams(z.object({
      eventId: z.string().transform(val => parseInt(val)),
      format: z.enum(['json', 'csv'])
    })),
    async (req, res) => {
      try {
        const { eventId, format } = req.validatedParams;
        
        const dashboardData = await enhancedAnalyticsService.getDashboardData(eventId.toString());
        
        if (format === 'csv') {
          // Convert to CSV format
          const csvData = this.convertToCSV(dashboardData);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="analytics-${eventId}-${Date.now()}.csv"`);
          res.send(csvData);
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="analytics-${eventId}-${Date.now()}.json"`);
          res.json(dashboardData);
        }
      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  return router;
}

// Helper function to convert dashboard data to CSV
function convertToCSV(data: any): string {
  const rows = [];
  
  // Add stats
  rows.push('Metric,Value');
  Object.entries(data.stats).forEach(([key, value]) => {
    rows.push(`${key},${value}`);
  });
  
  rows.push(''); // Empty row
  
  // Add accommodation stats
  rows.push('Hotel,Total Rooms,Allocated Rooms,Occupancy Rate');
  data.accommodationStats.byHotel.forEach((hotel: any) => {
    rows.push(`${hotel.hotelName},${hotel.totalRooms},${hotel.allocatedRooms},${hotel.occupancyRate}%`);
  });
  
  return rows.join('\n');
}
