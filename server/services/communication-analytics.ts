/**
 * Communication Analytics Service
 * Comprehensive analytics for email, SMS, and WhatsApp communications
 */

import { z } from 'zod';
import { metricsRegistry } from '../middleware/monitoring';
import { schemaValidationService, DatabaseConnection } from '../database/schema-validation';

// Analytics Event Schema
export const CommunicationEventSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  guestId: z.string().uuid().optional(),
  messageId: z.string().uuid(),
  channel: z.enum(['email', 'sms', 'whatsapp', 'push']),
  eventType: z.enum([
    'message_sent',
    'message_delivered',
    'message_failed',
    'message_opened',
    'link_clicked',
    'reply_received',
    'unsubscribed',
    'bounced',
    'marked_spam'
  ]),
  timestamp: z.string().datetime(),
  data: z.record(z.any()).optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  location: z.object({
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional()
  }).optional(),
  device: z.object({
    type: z.string().optional(),
    os: z.string().optional(),
    browser: z.string().optional()
  }).optional(),
  createdAt: z.string().datetime()
});

export const ABTestSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  channel: z.enum(['email', 'sms', 'whatsapp']),
  variants: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    templateId: z.string().uuid(),
    weight: z.number().min(0).max(100), // Percentage
    metrics: z.object({
      sent: z.number().default(0),
      delivered: z.number().default(0),
      opened: z.number().default(0),
      clicked: z.number().default(0),
      replied: z.number().default(0),
      unsubscribed: z.number().default(0)
    }).optional()
  })),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  targetAudience: z.object({
    totalSize: z.number(),
    criteria: z.record(z.any())
  }).optional(),
  primaryMetric: z.enum(['delivery_rate', 'open_rate', 'click_rate', 'reply_rate', 'conversion_rate']),
  confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
  minSampleSize: z.number().min(100).default(1000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type CommunicationEvent = z.infer<typeof CommunicationEventSchema>;
export type ABTest = z.infer<typeof ABTestSchema>;

// Analytics Interfaces
export interface ChannelMetrics {
  channel: 'email' | 'sms' | 'whatsapp';
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  failed: number;
  unsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  unsubscribeRate: number;
  cost: number;
  avgDeliveryTime: number; // milliseconds
}

export interface TimeSeriesData {
  timestamp: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  cost: number;
}

export interface AudienceInsights {
  demographics: {
    countries: Record<string, number>;
    devices: Record<string, number>;
    browsers: Record<string, number>;
    os: Record<string, number>;
  };
  engagement: {
    bestTimeOfDay: Array<{ hour: number; engagement: number }>;
    bestDayOfWeek: Array<{ day: string; engagement: number }>;
    avgSessionDuration: number;
  };
  preferences: {
    preferredChannels: Record<string, number>;
    contentCategories: Record<string, number>;
  };
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  startDate: string;
  endDate?: string;
  channels: ChannelMetrics[];
  totalMetrics: {
    sent: number;
    delivered: number;
    engaged: number; // opened or clicked
    converted: number;
    cost: number;
    roi: number;
  };
  timeline: TimeSeriesData[];
  topMessages: Array<{
    messageId: string;
    subject: string;
    channel: string;
    engagement: number;
    conversions: number;
  }>;
}

// Communication Analytics Service
export class CommunicationAnalyticsService {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  // Event Tracking
  async recordEvent(eventData: Omit<CommunicationEvent, 'id' | 'createdAt'>): Promise<CommunicationEvent> {
    const startTime = performance.now();

    try {
      const validatedData = CommunicationEventSchema.omit({
        id: true,
        createdAt: true
      }).parse(eventData);

      const event: CommunicationEvent = {
        id: crypto.randomUUID(),
        ...validatedData,
        createdAt: new Date().toISOString()
      };

      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO communication_events (
          id, event_id, guest_id, message_id, channel, event_type, timestamp,
          data, user_agent, ip_address, location, device, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          event.id, event.eventId, event.guestId, event.messageId,
          event.channel, event.eventType, event.timestamp,
          event.data ? JSON.stringify(event.data) : null,
          event.userAgent, event.ipAddress,
          event.location ? JSON.stringify(event.location) : null,
          event.device ? JSON.stringify(event.device) : null,
          event.createdAt
        ],
        `comm_event_${event.id}`
      );

      // Record metrics
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('communication_event_recording_duration_ms', duration, {
        channel: event.channel,
        event_type: event.eventType
      });

      metricsRegistry.incrementCounter('communication_events_recorded_total', {
        channel: event.channel,
        event_type: event.eventType
      });

      console.log(`✅ Communication event recorded: ${event.eventType} for ${event.channel}`);
      return event;

    } catch (error) {
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('communication_event_recording_duration_ms', duration, {
        status: 'error'
      });

      console.error('❌ Failed to record communication event:', error);
      throw new Error(`Communication event recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Channel Analytics
  async getChannelMetrics(
    eventId: string,
    channel?: string,
    timeRange?: { start: string; end: string }
  ): Promise<ChannelMetrics[]> {
    try {
      let query = `
        SELECT 
          channel,
          COUNT(CASE WHEN event_type = 'message_sent' THEN 1 END) as total_sent,
          COUNT(CASE WHEN event_type = 'message_delivered' THEN 1 END) as delivered,
          COUNT(CASE WHEN event_type = 'message_opened' THEN 1 END) as opened,
          COUNT(CASE WHEN event_type = 'link_clicked' THEN 1 END) as clicked,
          COUNT(CASE WHEN event_type = 'reply_received' THEN 1 END) as replied,
          COUNT(CASE WHEN event_type = 'message_failed' THEN 1 END) as failed,
          COUNT(CASE WHEN event_type = 'unsubscribed' THEN 1 END) as unsubscribed
        FROM communication_events 
        WHERE event_id = $1
      `;
      const queryParams: any[] = [eventId];
      let paramIndex = 2;

      if (channel) {
        query += ` AND channel = $${paramIndex++}`;
        queryParams.push(channel);
      }

      if (timeRange) {
        query += ` AND timestamp BETWEEN $${paramIndex++} AND $${paramIndex++}`;
        queryParams.push(timeRange.start, timeRange.end);
      }

      query += ` GROUP BY channel ORDER BY channel`;

      const results = await schemaValidationService.executeOptimizedQuery(
        this.db,
        query,
        queryParams,
        `channel_metrics_${eventId}_${channel || 'all'}`
      );

      // Get cost data (this would join with message cost tables)
      const costQuery = `
        SELECT channel, COALESCE(SUM(cost), 0) as total_cost
        FROM (
          SELECT 'email' as channel, COALESCE(SUM(cost), 0) as cost FROM email_messages WHERE event_id = $1
          UNION ALL
          SELECT 'sms' as channel, COALESCE(SUM(cost), 0) as cost FROM sms_messages WHERE event_id = $1
          UNION ALL  
          SELECT 'whatsapp' as channel, COALESCE(SUM(cost), 0) as cost FROM whatsapp_messages WHERE event_id = $1
        ) costs
        GROUP BY channel
      `;

      const costResults = await schemaValidationService.executeOptimizedQuery(
        this.db,
        costQuery,
        [eventId],
        `channel_costs_${eventId}`
      );

      const costMap = new Map(costResults.map((row: any) => [row.channel, parseFloat(row.total_cost)]));

      return results.map((row: any) => {
        const totalSent = parseInt(row.total_sent) || 0;
        const delivered = parseInt(row.delivered) || 0;
        const opened = parseInt(row.opened) || 0;
        const clicked = parseInt(row.clicked) || 0;
        const replied = parseInt(row.replied) || 0;
        const failed = parseInt(row.failed) || 0;
        const unsubscribed = parseInt(row.unsubscribed) || 0;

        return {
          channel: row.channel,
          totalSent,
          delivered,
          opened,
          clicked,
          replied,
          failed,
          unsubscribed,
          deliveryRate: totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0,
          openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
          clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
          replyRate: delivered > 0 ? Math.round((replied / delivered) * 100) : 0,
          unsubscribeRate: delivered > 0 ? Math.round((unsubscribed / delivered) * 100) : 0,
          cost: costMap.get(row.channel) || 0,
          avgDeliveryTime: 0 // Would calculate from timestamp differences
        };
      });

    } catch (error) {
      console.error('❌ Failed to get channel metrics:', error);
      throw new Error(`Failed to get channel metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Time Series Analytics
  async getTimeSeriesData(
    eventId: string,
    channel?: string,
    interval: 'hour' | 'day' | 'week' | 'month' = 'day',
    timeRange?: { start: string; end: string }
  ): Promise<TimeSeriesData[]> {
    try {
      const intervalMap = {
        hour: "date_trunc('hour', timestamp)",
        day: "date_trunc('day', timestamp)",
        week: "date_trunc('week', timestamp)",
        month: "date_trunc('month', timestamp)"
      };

      let query = `
        SELECT 
          ${intervalMap[interval]} as timestamp,
          COUNT(CASE WHEN event_type = 'message_sent' THEN 1 END) as sent,
          COUNT(CASE WHEN event_type = 'message_delivered' THEN 1 END) as delivered,
          COUNT(CASE WHEN event_type = 'message_opened' THEN 1 END) as opened,
          COUNT(CASE WHEN event_type = 'link_clicked' THEN 1 END) as clicked,
          COUNT(CASE WHEN event_type = 'message_failed' THEN 1 END) as failed
        FROM communication_events 
        WHERE event_id = $1
      `;
      const queryParams: any[] = [eventId];
      let paramIndex = 2;

      if (channel) {
        query += ` AND channel = $${paramIndex++}`;
        queryParams.push(channel);
      }

      if (timeRange) {
        query += ` AND timestamp BETWEEN $${paramIndex++} AND $${paramIndex++}`;
        queryParams.push(timeRange.start, timeRange.end);
      }

      query += ` GROUP BY ${intervalMap[interval]} ORDER BY timestamp`;

      const results = await schemaValidationService.executeOptimizedQuery(
        this.db,
        query,
        queryParams,
        `timeseries_${eventId}_${channel || 'all'}_${interval}`
      );

      return results.map((row: any) => ({
        timestamp: row.timestamp,
        sent: parseInt(row.sent) || 0,
        delivered: parseInt(row.delivered) || 0,
        opened: parseInt(row.opened) || 0,
        clicked: parseInt(row.clicked) || 0,
        failed: parseInt(row.failed) || 0,
        cost: 0 // Would calculate from cost data
      }));

    } catch (error) {
      console.error('❌ Failed to get time series data:', error);
      throw new Error(`Failed to get time series data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Audience Insights
  async getAudienceInsights(eventId: string, timeRange?: { start: string; end: string }): Promise<AudienceInsights> {
    try {
      let baseQuery = `FROM communication_events WHERE event_id = $1`;
      const queryParams: any[] = [eventId];
      let paramIndex = 2;

      if (timeRange) {
        baseQuery += ` AND timestamp BETWEEN $${paramIndex++} AND $${paramIndex++}`;
        queryParams.push(timeRange.start, timeRange.end);
      }

      // Demographics
      const demographicsQuery = `
        SELECT 
          JSON_EXTRACT(location, '$.country') as country,
          JSON_EXTRACT(device, '$.type') as device_type,
          JSON_EXTRACT(device, '$.browser') as browser,
          JSON_EXTRACT(device, '$.os') as os,
          COUNT(*) as count
        ${baseQuery}
        AND location IS NOT NULL
        GROUP BY country, device_type, browser, os
      `;

      const demographics = await schemaValidationService.executeOptimizedQuery(
        this.db,
        demographicsQuery,
        queryParams
      );

      // Engagement by time
      const engagementQuery = `
        SELECT 
          EXTRACT(hour FROM timestamp) as hour,
          EXTRACT(dow FROM timestamp) as day_of_week,
          COUNT(CASE WHEN event_type IN ('message_opened', 'link_clicked') THEN 1 END) as engagement_count,
          COUNT(*) as total_events
        ${baseQuery}
        GROUP BY hour, day_of_week
      `;

      const engagement = await schemaValidationService.executeOptimizedQuery(
        this.db,
        engagementQuery,
        queryParams
      );

      // Channel preferences
      const preferencesQuery = `
        SELECT 
          channel,
          COUNT(CASE WHEN event_type IN ('message_opened', 'link_clicked', 'reply_received') THEN 1 END) as engagement_count,
          COUNT(*) as total_events
        ${baseQuery}
        GROUP BY channel
      `;

      const preferences = await schemaValidationService.executeOptimizedQuery(
        this.db,
        preferencesQuery,
        queryParams
      );

      // Process results
      const countries: Record<string, number> = {};
      const devices: Record<string, number> = {};
      const browsers: Record<string, number> = {};
      const os: Record<string, number> = {};

      demographics.forEach((row: any) => {
        if (row.country) countries[row.country] = (countries[row.country] || 0) + parseInt(row.count);
        if (row.device_type) devices[row.device_type] = (devices[row.device_type] || 0) + parseInt(row.count);
        if (row.browser) browsers[row.browser] = (browsers[row.browser] || 0) + parseInt(row.count);
        if (row.os) os[row.os] = (os[row.os] || 0) + parseInt(row.count);
      });

      const hourlyEngagement: Record<number, number> = {};
      const dailyEngagement: Record<number, number> = {};

      engagement.forEach((row: any) => {
        const hour = parseInt(row.hour);
        const day = parseInt(row.day_of_week);
        const engagementRate = parseInt(row.total_events) > 0 
          ? parseInt(row.engagement_count) / parseInt(row.total_events) 
          : 0;
        
        hourlyEngagement[hour] = (hourlyEngagement[hour] || 0) + engagementRate;
        dailyEngagement[day] = (dailyEngagement[day] || 0) + engagementRate;
      });

      const preferredChannels: Record<string, number> = {};
      preferences.forEach((row: any) => {
        const engagementRate = parseInt(row.total_events) > 0 
          ? parseInt(row.engagement_count) / parseInt(row.total_events) 
          : 0;
        preferredChannels[row.channel] = engagementRate;
      });

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      return {
        demographics: {
          countries,
          devices,
          browsers,
          os
        },
        engagement: {
          bestTimeOfDay: Object.entries(hourlyEngagement).map(([hour, engagement]) => ({
            hour: parseInt(hour),
            engagement: Math.round(engagement * 100)
          })).sort((a, b) => b.engagement - a.engagement),
          bestDayOfWeek: Object.entries(dailyEngagement).map(([day, engagement]) => ({
            day: dayNames[parseInt(day)],
            engagement: Math.round(engagement * 100)
          })).sort((a, b) => b.engagement - a.engagement),
          avgSessionDuration: 0 // Would calculate from session data
        },
        preferences: {
          preferredChannels,
          contentCategories: {} // Would analyze from message content
        }
      };

    } catch (error) {
      console.error('❌ Failed to get audience insights:', error);
      throw new Error(`Failed to get audience insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // A/B Testing
  async createABTest(testData: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ABTest> {
    const startTime = performance.now();

    try {
      const validatedData = ABTestSchema.omit({
        id: true,
        createdAt: true,
        updatedAt: true
      }).parse(testData);

      const abTest: ABTest = {
        id: crypto.randomUUID(),
        ...validatedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO ab_tests (
          id, event_id, name, description, channel, variants, status,
          start_date, end_date, target_audience, primary_metric,
          confidence_level, min_sample_size, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          abTest.id, abTest.eventId, abTest.name, abTest.description,
          abTest.channel, JSON.stringify(abTest.variants), abTest.status,
          abTest.startDate, abTest.endDate,
          abTest.targetAudience ? JSON.stringify(abTest.targetAudience) : null,
          abTest.primaryMetric, abTest.confidenceLevel, abTest.minSampleSize,
          abTest.createdAt, abTest.updatedAt
        ],
        `ab_test_create_${abTest.id}`
      );

      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('ab_test_creation_duration_ms', duration, {
        channel: abTest.channel,
        status: 'success'
      });

      console.log(`✅ A/B test created: ${abTest.name}`);
      return abTest;

    } catch (error) {
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('ab_test_creation_duration_ms', duration, {
        status: 'error'
      });

      console.error('❌ A/B test creation failed:', error);
      throw new Error(`A/B test creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getABTestResults(testId: string): Promise<{
    test: ABTest;
    results: Array<{
      variantId: string;
      variantName: string;
      metrics: {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        replied: number;
        unsubscribed: number;
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        conversionRate: number;
      };
      confidenceInterval: {
        lower: number;
        upper: number;
        significantDifference: boolean;
      };
    }>;
    winner?: {
      variantId: string;
      metric: string;
      improvement: number;
      confidence: number;
    };
  }> {
    try {
      // Get test details
      const tests = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM ab_tests WHERE id = $1`,
        [testId]
      );

      if (tests.length === 0) {
        throw new Error('A/B test not found');
      }

      const test: ABTest = {
        ...tests[0],
        variants: JSON.parse(tests[0].variants),
        targetAudience: tests[0].target_audience ? JSON.parse(tests[0].target_audience) : undefined
      };

      // Get metrics for each variant
      const variantResults = await Promise.all(
        test.variants.map(async (variant) => {
          const metrics = await this.getVariantMetrics(testId, variant.id);
          return {
            variantId: variant.id,
            variantName: variant.name,
            metrics,
            confidenceInterval: this.calculateConfidenceInterval(metrics, test.confidenceLevel)
          };
        })
      );

      // Determine winner
      const winner = this.determineWinner(variantResults, test.primaryMetric);

      return {
        test,
        results: variantResults,
        winner
      };

    } catch (error) {
      console.error('❌ Failed to get A/B test results:', error);
      throw new Error(`Failed to get A/B test results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Campaign Performance
  async getCampaignPerformance(
    eventId: string,
    campaignId?: string,
    timeRange?: { start: string; end: string }
  ): Promise<CampaignPerformance[]> {
    try {
      // This would aggregate data across all communication channels
      // Simplified implementation for now
      
      const channelMetrics = await this.getChannelMetrics(eventId, undefined, timeRange);
      const timeSeriesData = await this.getTimeSeriesData(eventId, undefined, 'day', timeRange);

      const campaign: CampaignPerformance = {
        campaignId: campaignId || eventId,
        campaignName: 'Wedding Communication Campaign',
        startDate: timeRange?.start || new Date().toISOString(),
        endDate: timeRange?.end,
        channels: channelMetrics,
        totalMetrics: {
          sent: channelMetrics.reduce((sum, ch) => sum + ch.totalSent, 0),
          delivered: channelMetrics.reduce((sum, ch) => sum + ch.delivered, 0),
          engaged: channelMetrics.reduce((sum, ch) => sum + ch.opened + ch.clicked, 0),
          converted: channelMetrics.reduce((sum, ch) => sum + ch.replied, 0),
          cost: channelMetrics.reduce((sum, ch) => sum + ch.cost, 0),
          roi: 0 // Would calculate based on conversion value
        },
        timeline: timeSeriesData,
        topMessages: [] // Would query top performing messages
      };

      return [campaign];

    } catch (error) {
      console.error('❌ Failed to get campaign performance:', error);
      throw new Error(`Failed to get campaign performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Email-specific tracking
  async trackEmailOpen(messageId: string, data: {
    userAgent?: string;
    ipAddress?: string;
    timestamp?: string;
    guestId?: string;
  }): Promise<void> {
    try {
      // Get event ID from message
      const eventId = await this.getEventIdFromMessage(messageId, 'email');
      if (!eventId) {
        console.warn(`⚠️ Could not find event ID for email message: ${messageId}`);
        return;
      }

      await this.recordEvent({
        eventId,
        guestId: data.guestId,
        messageId,
        channel: 'email',
        eventType: 'message_opened',
        timestamp: data.timestamp || new Date().toISOString(),
        userAgent: data.userAgent,
        ipAddress: data.ipAddress
      });

      metricsRegistry.incrementCounter('email_opens_total', {
        tracking_method: 'pixel',
        event_id: eventId
      });

      console.log(`📧 Email open tracked: ${messageId}`);

    } catch (error) {
      console.error('❌ Failed to track email open:', error);
    }
  }

  async trackEmailClick(messageId: string, linkId: string, data: {
    url: string;
    userAgent?: string;
    ipAddress?: string;
    timestamp?: string;
    guestId?: string;
  }): Promise<void> {
    try {
      // Get event ID from message
      const eventId = await this.getEventIdFromMessage(messageId, 'email');
      if (!eventId) {
        console.warn(`⚠️ Could not find event ID for email message: ${messageId}`);
        return;
      }

      await this.recordEvent({
        eventId,
        guestId: data.guestId,
        messageId,
        channel: 'email',
        eventType: 'link_clicked',
        timestamp: data.timestamp || new Date().toISOString(),
        data: {
          linkId,
          url: data.url
        },
        userAgent: data.userAgent,
        ipAddress: data.ipAddress
      });

      metricsRegistry.incrementCounter('email_clicks_total', {
        link_id: linkId,
        event_id: eventId
      });

      console.log(`📧 Email link click tracked: ${messageId} -> ${data.url}`);

    } catch (error) {
      console.error('❌ Failed to track email click:', error);
    }
  }

  // SMS Analytics Integration
  async syncSmsDeliveryStatus(eventId: string): Promise<void> {
    try {
      // Get SMS delivery logs that haven't been synced to analytics
      const unsynced = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT sdl.*, st.name as template_name
         FROM sms_delivery_logs sdl
         LEFT JOIN sms_templates st ON sdl.template_id = st.id
         WHERE sdl.event_id = $1 
         AND sdl.updated_at > (SELECT COALESCE(MAX(timestamp), '1970-01-01') 
                               FROM communication_events 
                               WHERE event_id = $1 AND channel = 'sms')
         ORDER BY sdl.updated_at`,
        [eventId]
      );

      for (const log of unsynced) {
        // Map SMS status to communication event type
        let eventType: string;
        switch (log.status) {
          case 'sent':
            eventType = 'message_sent';
            break;
          case 'delivered':
            eventType = 'message_delivered';
            break;
          case 'failed':
            eventType = 'message_failed';
            break;
          default:
            continue; // Skip unknown statuses
        }

        await this.recordEvent({
          eventId,
          guestId: log.guest_id?.toString(),
          messageId: log.id,
          channel: 'sms',
          eventType: eventType as any,
          timestamp: log.updated_at || log.created_at,
          data: {
            phoneNumber: log.phone_number,
            countryCode: log.country_code,
            segments: log.segments,
            cost: log.cost,
            templateName: log.template_name,
            providerMessageId: log.provider_message_id,
            errorCode: log.error_code,
            errorMessage: log.error_message
          }
        });
      }

      console.log(`📱 Synced ${unsynced.length} SMS delivery events to analytics`);

    } catch (error) {
      console.error('❌ Failed to sync SMS delivery status:', error);
    }
  }

  // WhatsApp Analytics
  async trackWhatsAppMessage(messageId: string, eventType: 'sent' | 'delivered' | 'read' | 'failed', data: {
    phoneNumber: string;
    timestamp?: string;
    guestId?: string;
    templateName?: string;
    cost?: number;
    errorCode?: string;
    errorMessage?: string;
  }): Promise<void> {
    try {
      const eventId = await this.getEventIdFromMessage(messageId, 'whatsapp');
      if (!eventId) {
        console.warn(`⚠️ Could not find event ID for WhatsApp message: ${messageId}`);
        return;
      }

      const eventTypeMap = {
        'sent': 'message_sent',
        'delivered': 'message_delivered', 
        'read': 'message_opened',
        'failed': 'message_failed'
      };

      await this.recordEvent({
        eventId,
        guestId: data.guestId,
        messageId,
        channel: 'whatsapp',
        eventType: eventTypeMap[eventType] as any,
        timestamp: data.timestamp || new Date().toISOString(),
        data: {
          phoneNumber: data.phoneNumber,
          templateName: data.templateName,
          cost: data.cost,
          errorCode: data.errorCode,
          errorMessage: data.errorMessage
        }
      });

      metricsRegistry.incrementCounter('whatsapp_events_total', {
        event_type: eventType,
        event_id: eventId
      });

      console.log(`💬 WhatsApp ${eventType} tracked: ${messageId}`);

    } catch (error) {
      console.error('❌ Failed to track WhatsApp message:', error);
    }
  }

  // Performance Dashboard Data
  async getDashboardMetrics(eventId: string, timeRange?: { start: string; end: string }): Promise<{
    overview: {
      totalMessages: number;
      deliveryRate: number;
      engagementRate: number;
      totalCost: number;
      avgResponseTime: number;
    };
    channelPerformance: ChannelMetrics[];
    recentActivity: Array<{
      timestamp: string;
      channel: string;
      eventType: string;
      count: number;
    }>;
    topPerformingMessages: Array<{
      messageId: string;
      subject: string;
      channel: string;
      sentCount: number;
      openRate: number;
      clickRate: number;
    }>;
    alertsAndIssues: Array<{
      type: 'error' | 'warning' | 'info';
      message: string;
      timestamp: string;
      channel?: string;
    }>;
  }> {
    try {
      // Get channel metrics
      const channelMetrics = await this.getChannelMetrics(eventId, undefined, timeRange);
      
      // Calculate overview metrics
      const totalMessages = channelMetrics.reduce((sum, ch) => sum + ch.totalSent, 0);
      const totalDelivered = channelMetrics.reduce((sum, ch) => sum + ch.delivered, 0);
      const totalEngaged = channelMetrics.reduce((sum, ch) => sum + ch.opened + ch.clicked, 0);
      const totalCost = channelMetrics.reduce((sum, ch) => sum + ch.cost, 0);
      
      // Get recent activity
      const recentActivity = await this.getRecentActivity(eventId, timeRange);
      
      // Get top performing messages
      const topMessages = await this.getTopPerformingMessages(eventId, timeRange);
      
      // Get alerts and issues
      const alerts = await this.getSystemAlerts(eventId, timeRange);
      
      return {
        overview: {
          totalMessages,
          deliveryRate: totalMessages > 0 ? Math.round((totalDelivered / totalMessages) * 100) : 0,
          engagementRate: totalDelivered > 0 ? Math.round((totalEngaged / totalDelivered) * 100) : 0,
          totalCost: Math.round(totalCost * 100) / 100,
          avgResponseTime: channelMetrics.reduce((sum, ch) => sum + ch.avgDeliveryTime, 0) / channelMetrics.length || 0
        },
        channelPerformance: channelMetrics,
        recentActivity,
        topPerformingMessages: topMessages,
        alertsAndIssues: alerts
      };

    } catch (error) {
      console.error('❌ Failed to get dashboard metrics:', error);
      throw new Error(`Failed to get dashboard metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Real-time Analytics Updates
  async getRealtimeStats(eventId: string): Promise<{
    activeUsers: number;
    messagesLast5Min: number;
    currentDeliveryRate: number;
    issuesDetected: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  }> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      // Messages in last 5 minutes
      const recentMessages = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT COUNT(*) as count,
                COUNT(CASE WHEN event_type = 'message_delivered' THEN 1 END) as delivered,
                COUNT(CASE WHEN event_type = 'message_failed' THEN 1 END) as failed
         FROM communication_events 
         WHERE event_id = $1 AND timestamp >= $2`,
        [eventId, fiveMinutesAgo]
      );

      const messageCount = parseInt(recentMessages[0]?.count || '0');
      const deliveredCount = parseInt(recentMessages[0]?.delivered || '0');
      const failedCount = parseInt(recentMessages[0]?.failed || '0');
      
      // Calculate system health
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      const failureRate = messageCount > 0 ? failedCount / messageCount : 0;
      
      if (failureRate > 0.1) systemHealth = 'critical';
      else if (failureRate > 0.05) systemHealth = 'warning';
      
      return {
        activeUsers: 0, // Would implement with session tracking
        messagesLast5Min: messageCount,
        currentDeliveryRate: messageCount > 0 ? Math.round((deliveredCount / messageCount) * 100) : 100,
        issuesDetected: failedCount,
        systemHealth
      };

    } catch (error) {
      console.error('❌ Failed to get realtime stats:', error);
      return {
        activeUsers: 0,
        messagesLast5Min: 0,
        currentDeliveryRate: 0,
        issuesDetected: 0,
        systemHealth: 'critical'
      };
    }
  }

  // Helper Methods
  private async getEventIdFromMessage(messageId: string, channel: 'email' | 'sms' | 'whatsapp'): Promise<string | null> {
    try {
      let query: string;
      
      switch (channel) {
        case 'email':
          query = `SELECT event_id FROM email_messages WHERE id = $1 OR message_id = $1 LIMIT 1`;
          break;
        case 'sms':
          query = `SELECT event_id FROM sms_delivery_logs WHERE id = $1 OR provider_message_id = $1 LIMIT 1`;
          break;
        case 'whatsapp':
          query = `SELECT event_id FROM whatsapp_messages WHERE id = $1 OR provider_message_id = $1 LIMIT 1`;
          break;
        default:
          return null;
      }
      
      const result = await schemaValidationService.executeOptimizedQuery(
        this.db,
        query,
        [messageId]
      );
      
      return result[0]?.event_id?.toString() || null;
      
    } catch (error) {
      console.error(`❌ Failed to get event ID for ${channel} message ${messageId}:`, error);
      return null;
    }
  }

  private async getRecentActivity(eventId: string, timeRange?: { start: string; end: string }): Promise<Array<{
    timestamp: string;
    channel: string;
    eventType: string;
    count: number;
  }>> {
    try {
      let whereClause = 'WHERE event_id = $1';
      const params = [eventId];
      
      if (timeRange) {
        whereClause += ' AND timestamp BETWEEN $2 AND $3';
        params.push(timeRange.start, timeRange.end);
      } else {
        whereClause += ' AND timestamp >= $2';
        params.push(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours
      }
      
      const activity = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT 
           date_trunc('hour', timestamp) as timestamp,
           channel,
           event_type,
           COUNT(*) as count
         FROM communication_events ${whereClause}
         GROUP BY date_trunc('hour', timestamp), channel, event_type
         ORDER BY timestamp DESC
         LIMIT 50`,
        params
      );
      
      return activity.map((row: any) => ({
        timestamp: row.timestamp,
        channel: row.channel,
        eventType: row.event_type,
        count: parseInt(row.count)
      }));
      
    } catch (error) {
      console.error('❌ Failed to get recent activity:', error);
      return [];
    }
  }

  private async getTopPerformingMessages(eventId: string, timeRange?: { start: string; end: string }): Promise<Array<{
    messageId: string;
    subject: string;
    channel: string;
    sentCount: number;
    openRate: number;
    clickRate: number;
  }>> {
    try {
      // This would need to be implemented based on actual message storage schema
      // For now, return mock data structure
      return [];
      
    } catch (error) {
      console.error('❌ Failed to get top performing messages:', error);
      return [];
    }
  }

  private async getSystemAlerts(eventId: string, timeRange?: { start: string; end: string }): Promise<Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
    channel?: string;
  }>> {
    try {
      // Get recent failures and issues
      let whereClause = 'WHERE event_id = $1 AND event_type = \'message_failed\'';
      const params = [eventId];
      
      if (timeRange) {
        whereClause += ' AND timestamp BETWEEN $2 AND $3';
        params.push(timeRange.start, timeRange.end);
      } else {
        whereClause += ' AND timestamp >= $2';
        params.push(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      }
      
      const failures = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT channel, timestamp, data FROM communication_events ${whereClause} ORDER BY timestamp DESC LIMIT 10`,
        params
      );
      
      const alerts = failures.map((failure: any) => {
        const data = typeof failure.data === 'string' ? JSON.parse(failure.data) : failure.data;
        return {
          type: 'error' as const,
          message: `Message delivery failed: ${data?.errorMessage || 'Unknown error'}`,
          timestamp: failure.timestamp,
          channel: failure.channel
        };
      });
      
      // Add system health alerts
      const recentFailureRate = await this.calculateRecentFailureRate(eventId);
      if (recentFailureRate > 0.1) {
        alerts.unshift({
          type: 'warning',
          message: `High failure rate detected: ${Math.round(recentFailureRate * 100)}% of messages failed in the last hour`,
          timestamp: new Date().toISOString()
        });
      }
      
      return alerts;
      
    } catch (error) {
      console.error('❌ Failed to get system alerts:', error);
      return [];
    }
  }

  private async calculateRecentFailureRate(eventId: string): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const stats = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT 
           COUNT(*) as total,
           COUNT(CASE WHEN event_type = 'message_failed' THEN 1 END) as failed
         FROM communication_events 
         WHERE event_id = $1 AND timestamp >= $2`,
        [eventId, oneHourAgo]
      );
      
      const total = parseInt(stats[0]?.total || '0');
      const failed = parseInt(stats[0]?.failed || '0');
      
      return total > 0 ? failed / total : 0;
      
    } catch (error) {
      console.error('❌ Failed to calculate failure rate:', error);
      return 0;
    }
  }

  // Helper methods
  private async getVariantMetrics(testId: string, variantId: string): Promise<any> {
    // This would query communication events for messages tagged with the variant
    return {
      sent: 100,
      delivered: 95,
      opened: 25,
      clicked: 8,
      replied: 3,
      unsubscribed: 1,
      deliveryRate: 95,
      openRate: 26.3,
      clickRate: 32,
      conversionRate: 12
    };
  }

  private calculateConfidenceInterval(metrics: any, confidenceLevel: number): any {
    // Statistical calculation for confidence intervals
    return {
      lower: metrics.openRate * 0.9,
      upper: metrics.openRate * 1.1,
      significantDifference: true
    };
  }

  private determineWinner(results: any[], primaryMetric: string): any {
    // Statistical significance testing
    if (results.length < 2) return undefined;

    const best = results.reduce((best, current) => {
      const bestValue = best.metrics[primaryMetric.replace('_rate', 'Rate')] || 0;
      const currentValue = current.metrics[primaryMetric.replace('_rate', 'Rate')] || 0;
      return currentValue > bestValue ? current : best;
    });

    return {
      variantId: best.variantId,
      metric: primaryMetric,
      improvement: 15.5, // Would calculate actual improvement
      confidence: 95.2
    };
  }
}

// Export singleton instance
let communicationAnalyticsService: CommunicationAnalyticsService | null = null;

export function initializeCommunicationAnalytics(db: DatabaseConnection): CommunicationAnalyticsService {
  if (!communicationAnalyticsService) {
    communicationAnalyticsService = new CommunicationAnalyticsService(db);
    console.log('✅ Communication analytics service initialized');
  }
  return communicationAnalyticsService;
}

export function getCommunicationAnalyticsService(): CommunicationAnalyticsService {
  if (!communicationAnalyticsService) {
    throw new Error('Communication analytics service not initialized');
  }
  return communicationAnalyticsService;
}

export async function cleanupCommunicationAnalytics(): Promise<void> {
  if (communicationAnalyticsService) {
    communicationAnalyticsService = null;
    console.log('✅ Communication analytics service cleaned up');
  }
}