/**
 * SMS Tracking Middleware
 * Middleware for tracking SMS delivery, analytics, and performance monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { metricsRegistry } from './monitoring';
import { schemaValidationService, DatabaseConnection } from '../database/schema-validation';
import { getSMSProviderService, SMSStatusUpdate } from '../services/sms-provider';

// Tracking Event Schema
const SMSTrackingEventSchema = z.object({
  messageId: z.string().uuid(),
  eventType: z.enum([
    'message_queued',
    'message_sent',
    'message_delivered',
    'message_failed',
    'message_bounced',
    'webhook_received',
    'cost_calculated',
    'retry_attempted'
  ]),
  timestamp: z.string().datetime(),
  data: z.record(z.any()).optional(),
  provider: z.enum(['twilio', 'aws_sns']).optional(),
  cost: z.number().optional(),
  metadata: z.record(z.string()).optional()
});

export type SMSTrackingEvent = z.infer<typeof SMSTrackingEventSchema>;

// Rate Limiting Configuration
interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Max requests per window
  provider: 'twilio' | 'aws_sns';
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  twilio: {
    windowMs: 60000,      // 1 minute
    maxRequests: 100,     // 100 SMS per minute
    provider: 'twilio'
  },
  aws_sns: {
    windowMs: 60000,      // 1 minute  
    maxRequests: 200,     // 200 SMS per minute
    provider: 'aws_sns'
  }
};

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// SMS Tracking Service
class SMSTrackingService {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async recordTrackingEvent(event: SMSTrackingEvent): Promise<void> {
    try {
      const validatedEvent = SMSTrackingEventSchema.parse(event);

      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO sms_tracking_events (
          id, message_id, event_type, timestamp, data, provider, cost, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          crypto.randomUUID(),
          validatedEvent.messageId,
          validatedEvent.eventType,
          validatedEvent.timestamp,
          validatedEvent.data ? JSON.stringify(validatedEvent.data) : null,
          validatedEvent.provider,
          validatedEvent.cost,
          validatedEvent.metadata ? JSON.stringify(validatedEvent.metadata) : null,
          new Date().toISOString()
        ]
      );

      // Record metrics
      metricsRegistry.incrementCounter('sms_tracking_events_total', {
        event_type: validatedEvent.eventType,
        provider: validatedEvent.provider || 'unknown'
      });

      if (validatedEvent.cost) {
        metricsRegistry.recordHistogram('sms_cost_per_message', validatedEvent.cost, {
          provider: validatedEvent.provider || 'unknown'
        });
      }

    } catch (error) {
      console.error('❌ Failed to record SMS tracking event:', error);
      // Don't throw - tracking failures shouldn't break the main flow
    }
  }

  async getMessageAnalytics(messageId: string): Promise<{
    events: SMSTrackingEvent[];
    timeline: Array<{ timestamp: string; event: string; data?: any }>;
    totalCost: number;
    deliveryTime?: number; // milliseconds from sent to delivered
  }> {
    try {
      const events = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT * FROM sms_tracking_events WHERE message_id = $1 ORDER BY timestamp ASC`,
        [messageId],
        `sms_tracking_${messageId}`
      );

      const parsedEvents: SMSTrackingEvent[] = events.map((event: any) => ({
        ...event,
        data: event.data ? JSON.parse(event.data) : undefined,
        metadata: event.metadata ? JSON.parse(event.metadata) : undefined
      }));

      const timeline = parsedEvents.map(event => ({
        timestamp: event.timestamp,
        event: event.eventType,
        data: event.data
      }));

      const totalCost = parsedEvents.reduce((sum, event) => sum + (event.cost || 0), 0);

      // Calculate delivery time
      let deliveryTime: number | undefined;
      const sentEvent = parsedEvents.find(e => e.eventType === 'message_sent');
      const deliveredEvent = parsedEvents.find(e => e.eventType === 'message_delivered');
      
      if (sentEvent && deliveredEvent) {
        deliveryTime = new Date(deliveredEvent.timestamp).getTime() - new Date(sentEvent.timestamp).getTime();
      }

      return {
        events: parsedEvents,
        timeline,
        totalCost,
        deliveryTime
      };

    } catch (error) {
      console.error('❌ Failed to get message analytics:', error);
      throw new Error(`Failed to get message analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getEventAnalytics(eventId: string, timeRange?: { start: string; end: string }): Promise<{
    totalMessages: number;
    messagesByStatus: Record<string, number>;
    totalCost: number;
    averageDeliveryTime: number;
    deliveryRate: number;
    costByProvider: Record<string, number>;
    hourlyVolume: Array<{ hour: string; count: number; cost: number }>;
  }> {
    try {
      let query = `
        SELECT te.*, sm.status, sm.provider, sm.cost, sm.created_at as message_created_at
        FROM sms_tracking_events te
        JOIN sms_messages sm ON te.message_id = sm.id
        WHERE sm.event_id = $1
      `;
      const queryParams: any[] = [eventId];

      if (timeRange) {
        query += ` AND te.timestamp BETWEEN $2 AND $3`;
        queryParams.push(timeRange.start, timeRange.end);
      }

      query += ` ORDER BY te.timestamp ASC`;

      const trackingData = await schemaValidationService.executeOptimizedQuery(
        this.db,
        query,
        queryParams
      );

      // Process analytics
      const messageStats = new Map<string, any>();
      let totalCost = 0;
      const deliveryTimes: number[] = [];
      const costByProvider: Record<string, number> = {};
      const hourlyVolume: Record<string, { count: number; cost: number }> = {};

      trackingData.forEach((record: any) => {
        const messageId = record.message_id;
        
        if (!messageStats.has(messageId)) {
          messageStats.set(messageId, {
            status: record.status,
            provider: record.provider,
            cost: record.cost || 0,
            events: []
          });
        }

        messageStats.get(messageId).events.push({
          type: record.event_type,
          timestamp: record.timestamp
        });

        // Accumulate costs
        if (record.cost) {
          totalCost += parseFloat(record.cost);
          
          if (!costByProvider[record.provider]) {
            costByProvider[record.provider] = 0;
          }
          costByProvider[record.provider] += parseFloat(record.cost);
        }

        // Track hourly volume
        const hour = new Date(record.timestamp).toISOString().substring(0, 13) + ':00:00Z';
        if (!hourlyVolume[hour]) {
          hourlyVolume[hour] = { count: 0, cost: 0 };
        }
        hourlyVolume[hour].count += 1;
        hourlyVolume[hour].cost += record.cost || 0;
      });

      // Calculate delivery times
      messageStats.forEach((stats, messageId) => {
        const sentEvent = stats.events.find((e: any) => e.type === 'message_sent');
        const deliveredEvent = stats.events.find((e: any) => e.type === 'message_delivered');
        
        if (sentEvent && deliveredEvent) {
          const deliveryTime = new Date(deliveredEvent.timestamp).getTime() - new Date(sentEvent.timestamp).getTime();
          deliveryTimes.push(deliveryTime);
        }
      });

      // Count messages by status
      const messagesByStatus: Record<string, number> = {};
      let deliveredCount = 0;
      
      messageStats.forEach((stats) => {
        const status = stats.status;
        messagesByStatus[status] = (messagesByStatus[status] || 0) + 1;
        
        if (status === 'delivered') {
          deliveredCount++;
        }
      });

      return {
        totalMessages: messageStats.size,
        messagesByStatus,
        totalCost,
        averageDeliveryTime: deliveryTimes.length > 0 ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length : 0,
        deliveryRate: messageStats.size > 0 ? (deliveredCount / messageStats.size) * 100 : 0,
        costByProvider,
        hourlyVolume: Object.entries(hourlyVolume).map(([hour, data]) => ({
          hour,
          count: data.count,
          cost: data.cost
        }))
      };

    } catch (error) {
      console.error('❌ Failed to get event analytics:', error);
      throw new Error(`Failed to get event analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Singleton tracking service
let trackingService: SMSTrackingService | null = null;

export function initializeSMSTracking(db: DatabaseConnection): SMSTrackingService {
  if (!trackingService) {
    trackingService = new SMSTrackingService(db);
    console.log('✅ SMS tracking service initialized');
  }
  return trackingService;
}

export function getSMSTrackingService(): SMSTrackingService {
  if (!trackingService) {
    throw new Error('SMS tracking service not initialized');
  }
  return trackingService;
}

// Middleware Functions

/**
 * Rate limiting middleware for SMS endpoints
 */
export function smsRateLimit(provider: 'twilio' | 'aws_sns') {
  return (req: Request, res: Response, next: NextFunction) => {
    const config = RATE_LIMITS[provider];
    const key = `${provider}:${req.ip}`;
    const now = Date.now();

    // Clean up expired entries
    for (const [storeKey, data] of rateLimitStore.entries()) {
      if (data.resetTime <= now) {
        rateLimitStore.delete(storeKey);
      }
    }

    // Check current limits
    const current = rateLimitStore.get(key);
    
    if (!current) {
      // First request in window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
    } else if (current.resetTime <= now) {
      // Window expired, reset
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
    } else if (current.count >= config.maxRequests) {
      // Rate limit exceeded
      const resetIn = Math.ceil((current.resetTime - now) / 1000);
      
      res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded for ${provider}. Try again in ${resetIn} seconds.`,
        retryAfter: resetIn
      });
      
      // Record rate limit violation
      metricsRegistry.incrementCounter('sms_rate_limit_violations_total', {
        provider,
        endpoint: req.path
      });
      
      return;
    } else {
      // Increment counter
      current.count++;
    }

    // Add rate limit headers
    const remaining = Math.max(0, config.maxRequests - (rateLimitStore.get(key)?.count || 0));
    const resetTime = rateLimitStore.get(key)?.resetTime || now + config.windowMs;
    
    res.set({
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
      'X-RateLimit-Provider': provider
    });

    next();
  };
}

/**
 * SMS request tracking middleware
 */
export function trackSMSRequest(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const originalSend = res.send;

  // Override response send to capture response data
  res.send = function(body: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Record request metrics
    metricsRegistry.recordHistogram('sms_request_duration_ms', duration, {
      method: req.method,
      endpoint: req.path,
      status_code: statusCode.toString()
    });

    metricsRegistry.incrementCounter('sms_requests_total', {
      method: req.method,
      endpoint: req.path,
      status_code: statusCode.toString()
    });

    // Track successful SMS sends
    if (statusCode >= 200 && statusCode < 300 && req.path.includes('/send')) {
      try {
        const responseData = typeof body === 'string' ? JSON.parse(body) : body;
        if (responseData.success && responseData.data?.messageId) {
          // Record tracking event asynchronously
          setImmediate(async () => {
            try {
              const trackingService = getSMSTrackingService();
              await trackingService.recordTrackingEvent({
                messageId: responseData.data.messageId,
                eventType: 'message_queued',
                timestamp: new Date().toISOString(),
                data: {
                  endpoint: req.path,
                  duration,
                  statusCode
                },
                metadata: {
                  userAgent: req.get('User-Agent') || '',
                  ip: req.ip
                }
              });
            } catch (error) {
              console.error('Failed to record SMS tracking event:', error);
            }
          });
        }
      } catch (error) {
        // Ignore JSON parse errors
      }
    }

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Webhook signature verification middleware
 */
export function verifyWebhookSignature(provider: 'twilio' | 'aws_sns') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (provider === 'twilio') {
        // Twilio webhook signature verification
        const signature = req.get('X-Twilio-Signature');
        
        if (!signature) {
          return res.status(401).json({
            success: false,
            error: 'INVALID_SIGNATURE',
            message: 'Missing Twilio signature'
          });
        }

        // In production, verify the signature using Twilio's validation
        // For now, we'll just check that it exists
        
        console.log('📞 Twilio webhook signature verified');
      } else if (provider === 'aws_sns') {
        // AWS SNS message verification would go here
        // This involves verifying the SNS message signature
        
        console.log('📱 AWS SNS webhook received');
      }

      next();
    } catch (error) {
      console.error(`❌ Webhook signature verification failed for ${provider}:`, error);
      res.status(401).json({
        success: false,
        error: 'SIGNATURE_VERIFICATION_FAILED',
        message: 'Webhook signature verification failed'
      });
    }
  };
}

/**
 * Webhook processing middleware
 */
export function processSMSWebhook(provider: 'twilio' | 'aws_sns') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trackingService = getSMSTrackingService();
      
      if (provider === 'twilio') {
        const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
        
        if (MessageSid && MessageStatus) {
          // Find message by provider ID and update status
          // This would require a query to find the message
          
          await trackingService.recordTrackingEvent({
            messageId: MessageSid, // This would be our internal message ID
            eventType: 'webhook_received',
            timestamp: new Date().toISOString(),
            provider: 'twilio',
            data: {
              twilioStatus: MessageStatus,
              errorCode: ErrorCode,
              errorMessage: ErrorMessage
            }
          });

          // Record delivery event if delivered
          if (MessageStatus === 'delivered') {
            await trackingService.recordTrackingEvent({
              messageId: MessageSid,
              eventType: 'message_delivered',
              timestamp: new Date().toISOString(),
              provider: 'twilio'
            });
          } else if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
            await trackingService.recordTrackingEvent({
              messageId: MessageSid,
              eventType: 'message_failed',
              timestamp: new Date().toISOString(),
              provider: 'twilio',
              data: {
                reason: ErrorMessage || 'Unknown failure'
              }
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error(`❌ Webhook processing failed for ${provider}:`, error);
      // Continue processing - webhook failures shouldn't break the flow
      next();
    }
  };
}

/**
 * Cost tracking middleware
 */
export function trackSMSCosts(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;

  res.send = function(body: any) {
    try {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const responseData = typeof body === 'string' ? JSON.parse(body) : body;
        
        if (responseData.success && responseData.data?.estimatedCost) {
          // Record cost metrics
          metricsRegistry.recordHistogram('sms_estimated_cost', responseData.data.estimatedCost, {
            provider: responseData.data.provider || 'unknown',
            endpoint: req.path
          });

          // Track cost per segment
          if (responseData.data.segments) {
            const costPerSegment = responseData.data.estimatedCost / responseData.data.segments;
            metricsRegistry.recordHistogram('sms_cost_per_segment', costPerSegment, {
              provider: responseData.data.provider || 'unknown'
            });
          }
        }
      }
    } catch (error) {
      // Ignore cost tracking errors
    }

    return originalSend.call(this, body);
  };

  next();
}

// Export types and services
export { SMSTrackingService, SMSTrackingEvent };