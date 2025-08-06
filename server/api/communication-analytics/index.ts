/**
 * Communication Analytics API
 * Enhanced analytics API for comprehensive communication tracking and dashboards
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { APIResponseBuilder } from '../versioning';
import { enhancedAuthMiddleware, requirePermission } from '../../middleware/enhanced-security';
import { createValidationMiddleware } from '../versioning';
import { getCommunicationAnalyticsService } from '../../services/communication-analytics';

const router = Router();

// Validation Schemas
const EventIdSchema = z.object({
  params: z.object({
    eventId: z.string().transform(val => parseInt(val))
  })
});

const AnalyticsQuerySchema = z.object({
  query: z.object({
    eventId: z.string().transform(val => parseInt(val)),
    channel: z.enum(['email', 'sms', 'whatsapp']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    interval: z.enum(['hour', 'day', 'week', 'month']).default('day')
  })
});

const TrackingSchema = z.object({
  body: z.object({
    messageId: z.string().uuid(),
    eventType: z.enum(['sent', 'delivered', 'opened', 'clicked', 'failed', 'read']),
    data: z.object({
      guestId: z.string().optional(),
      userAgent: z.string().optional(),
      ipAddress: z.string().optional(),
      timestamp: z.string().datetime().optional(),
      phoneNumber: z.string().optional(),
      templateName: z.string().optional(),
      cost: z.number().optional(),
      errorCode: z.string().optional(),
      errorMessage: z.string().optional(),
      linkId: z.string().optional(),
      url: z.string().url().optional()
    }).optional()
  })
});

const ABTestSchema = z.object({
  body: z.object({
    eventId: z.string().transform(val => parseInt(val)),
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    channel: z.enum(['email', 'sms', 'whatsapp']),
    variants: z.array(z.object({
      name: z.string(),
      templateId: z.string().uuid(),
      weight: z.number().min(0).max(100)
    })),
    primaryMetric: z.enum(['delivery_rate', 'open_rate', 'click_rate', 'reply_rate', 'conversion_rate']),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
    minSampleSize: z.number().min(100).default(1000)
  })
});

// Apply authentication to all routes
router.use(enhancedAuthMiddleware);

// Dashboard Analytics Endpoints

/**
 * GET /dashboard/:eventId
 * Get comprehensive dashboard metrics
 */
router.get(
  '/dashboard/:eventId',
  requirePermission('analytics:read'),
  createValidationMiddleware(EventIdSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      const { startDate, endDate } = req.query;
      
      const timeRange = startDate && endDate ? { 
        start: startDate as string, 
        end: endDate as string 
      } : undefined;
      
      const analyticsService = getCommunicationAnalyticsService();
      const dashboardMetrics = await analyticsService.getDashboardMetrics(eventId, timeRange);
      
      res.status(200).json(responseBuilder.success(dashboardMetrics));
      
    } catch (error) {
      console.error('❌ Failed to get dashboard metrics:', error);
      res.status(500).json(responseBuilder.error(
        'ANALYTICS_ERROR',
        'Failed to retrieve dashboard metrics',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /realtime/:eventId
 * Get real-time analytics data
 */
router.get(
  '/realtime/:eventId',
  requirePermission('analytics:read'),
  createValidationMiddleware(EventIdSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      
      const analyticsService = getCommunicationAnalyticsService();
      const realtimeStats = await analyticsService.getRealtimeStats(eventId);
      
      res.status(200).json(responseBuilder.success(realtimeStats));
      
    } catch (error) {
      console.error('❌ Failed to get realtime stats:', error);
      res.status(500).json(responseBuilder.error(
        'ANALYTICS_ERROR',
        'Failed to retrieve realtime statistics',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Channel-Specific Analytics

/**
 * GET /channels
 * Get channel performance metrics
 */
router.get(
  '/channels',
  requirePermission('analytics:read'),
  createValidationMiddleware(AnalyticsQuerySchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId, channel, startDate, endDate } = req.query as any;
      
      const timeRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;
      
      const analyticsService = getCommunicationAnalyticsService();
      const channelMetrics = await analyticsService.getChannelMetrics(
        eventId.toString(),
        channel,
        timeRange
      );
      
      res.status(200).json(responseBuilder.success(channelMetrics));
      
    } catch (error) {
      console.error('❌ Failed to get channel metrics:', error);
      res.status(500).json(responseBuilder.error(
        'ANALYTICS_ERROR',
        'Failed to retrieve channel metrics',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /timeseries
 * Get time series analytics data
 */
router.get(
  '/timeseries',
  requirePermission('analytics:read'),
  createValidationMiddleware(AnalyticsQuerySchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId, channel, startDate, endDate, interval } = req.query as any;
      
      const timeRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;
      
      const analyticsService = getCommunicationAnalyticsService();
      const timeSeriesData = await analyticsService.getTimeSeriesData(
        eventId.toString(),
        channel,
        interval,
        timeRange
      );
      
      res.status(200).json(responseBuilder.success(timeSeriesData));
      
    } catch (error) {
      console.error('❌ Failed to get time series data:', error);
      res.status(500).json(responseBuilder.error(
        'ANALYTICS_ERROR',
        'Failed to retrieve time series data',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /audience/:eventId
 * Get audience insights
 */
router.get(
  '/audience/:eventId',
  requirePermission('analytics:read'),
  createValidationMiddleware(EventIdSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      const { startDate, endDate } = req.query;
      
      const timeRange = startDate && endDate ? { 
        start: startDate as string, 
        end: endDate as string 
      } : undefined;
      
      const analyticsService = getCommunicationAnalyticsService();
      const audienceInsights = await analyticsService.getAudienceInsights(eventId, timeRange);
      
      res.status(200).json(responseBuilder.success(audienceInsights));
      
    } catch (error) {
      console.error('❌ Failed to get audience insights:', error);
      res.status(500).json(responseBuilder.error(
        'ANALYTICS_ERROR',
        'Failed to retrieve audience insights',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Event Tracking Endpoints

/**
 * POST /track/email
 * Track email events (opens, clicks)
 */
router.post(
  '/track/email',
  createValidationMiddleware(TrackingSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { messageId, eventType, data = {} } = req.body;
      
      const analyticsService = getCommunicationAnalyticsService();
      
      if (eventType === 'opened') {
        await analyticsService.trackEmailOpen(messageId, data);
      } else if (eventType === 'clicked') {
        if (!data.linkId || !data.url) {
          return res.status(400).json(responseBuilder.error(
            'MISSING_DATA',
            'linkId and url are required for click tracking'
          ));
        }
        await analyticsService.trackEmailClick(messageId, data.linkId, data);
      } else {
        return res.status(400).json(responseBuilder.error(
          'INVALID_EVENT_TYPE',
          'Event type must be "opened" or "clicked" for email tracking'
        ));
      }
      
      res.status(200).json(responseBuilder.success({
        messageId,
        eventType,
        tracked: true,
        timestamp: new Date().toISOString()
      }));
      
    } catch (error) {
      console.error('❌ Failed to track email event:', error);
      res.status(400).json(responseBuilder.error(
        'TRACKING_FAILED',
        'Failed to track email event',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * POST /track/whatsapp
 * Track WhatsApp events
 */
router.post(
  '/track/whatsapp',
  createValidationMiddleware(TrackingSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { messageId, eventType, data = {} } = req.body;
      
      if (!['sent', 'delivered', 'read', 'failed'].includes(eventType)) {
        return res.status(400).json(responseBuilder.error(
          'INVALID_EVENT_TYPE',
          'Event type must be "sent", "delivered", "read", or "failed" for WhatsApp tracking'
        ));
      }
      
      if (!data.phoneNumber) {
        return res.status(400).json(responseBuilder.error(
          'MISSING_PHONE_NUMBER',
          'Phone number is required for WhatsApp tracking'
        ));
      }
      
      const analyticsService = getCommunicationAnalyticsService();
      await analyticsService.trackWhatsAppMessage(messageId, eventType as any, data);
      
      res.status(200).json(responseBuilder.success({
        messageId,
        eventType,
        tracked: true,
        timestamp: new Date().toISOString()
      }));
      
    } catch (error) {
      console.error('❌ Failed to track WhatsApp event:', error);
      res.status(400).json(responseBuilder.error(
        'TRACKING_FAILED',
        'Failed to track WhatsApp event',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * POST /sync/sms/:eventId
 * Sync SMS delivery status with analytics
 */
router.post(
  '/sync/sms/:eventId',
  requirePermission('analytics:write'),
  createValidationMiddleware(EventIdSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      
      const analyticsService = getCommunicationAnalyticsService();
      await analyticsService.syncSmsDeliveryStatus(eventId);
      
      res.status(200).json(responseBuilder.success({
        eventId,
        synced: true,
        timestamp: new Date().toISOString(),
        message: 'SMS delivery status synced successfully'
      }));
      
    } catch (error) {
      console.error('❌ Failed to sync SMS delivery status:', error);
      res.status(500).json(responseBuilder.error(
        'SYNC_FAILED',
        'Failed to sync SMS delivery status',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// A/B Testing Endpoints

/**
 * POST /ab-tests
 * Create A/B test
 */
router.post(
  '/ab-tests',
  requirePermission('analytics:write'),
  createValidationMiddleware(ABTestSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const testData = req.body;
      
      const analyticsService = getCommunicationAnalyticsService();
      const abTest = await analyticsService.createABTest(testData);
      
      res.status(201).json(responseBuilder.success(abTest));
      
    } catch (error) {
      console.error('❌ Failed to create A/B test:', error);
      res.status(400).json(responseBuilder.error(
        'AB_TEST_CREATION_FAILED',
        'Failed to create A/B test',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /ab-tests/:testId/results
 * Get A/B test results
 */
router.get(
  '/ab-tests/:testId/results',
  requirePermission('analytics:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { testId } = req.params;
      
      const analyticsService = getCommunicationAnalyticsService();
      const results = await analyticsService.getABTestResults(testId);
      
      res.status(200).json(responseBuilder.success(results));
      
    } catch (error) {
      console.error('❌ Failed to get A/B test results:', error);
      res.status(500).json(responseBuilder.error(
        'AB_TEST_RESULTS_ERROR',
        'Failed to retrieve A/B test results',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Campaign Performance

/**
 * GET /campaigns/:eventId
 * Get campaign performance data
 */
router.get(
  '/campaigns/:eventId',
  requirePermission('analytics:read'),
  createValidationMiddleware(EventIdSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      const { campaignId, startDate, endDate } = req.query;
      
      const timeRange = startDate && endDate ? { 
        start: startDate as string, 
        end: endDate as string 
      } : undefined;
      
      const analyticsService = getCommunicationAnalyticsService();
      const campaigns = await analyticsService.getCampaignPerformance(
        eventId, 
        campaignId as string, 
        timeRange
      );
      
      res.status(200).json(responseBuilder.success(campaigns));
      
    } catch (error) {
      console.error('❌ Failed to get campaign performance:', error);
      res.status(500).json(responseBuilder.error(
        'CAMPAIGN_ERROR',
        'Failed to retrieve campaign performance',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Health Check
router.get('/health', (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    res.status(200).json(responseBuilder.success({
      service: 'communication-analytics-api',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: [
        'dashboard-metrics',
        'realtime-analytics',
        'channel-performance',
        'event-tracking',
        'ab-testing',
        'campaign-analytics'
      ]
    }));
  } catch (error) {
    res.status(503).json(responseBuilder.error(
      'SERVICE_UNAVAILABLE',
      'Communication analytics API service not available',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

export function createCommunicationAnalyticsAPI(): Router {
  return router;
}

// Export for use in main API registration
export default router;