/**
 * Tracking Middleware
 * Comprehensive tracking middleware for communication analytics and performance monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { metricsRegistry } from './monitoring';
import { getCommunicationAnalyticsService, CommunicationEvent } from '../services/communication-analytics';

// Enhanced Request Interface
interface TrackedRequest extends Request {
  tracking?: {
    sessionId: string;
    userId?: string;
    eventId?: string;
    messageId?: string;
    channel?: string;
    startTime: number;
    userAgent?: string;
    ipAddress?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
    device?: {
      type?: string;
      os?: string;
      browser?: string;
    };
  };
}

// Tracking Configuration
interface TrackingConfig {
  enableEmailTracking: boolean;
  enableSMSTracking: boolean;
  enableWhatsAppTracking: boolean;
  enableClickTracking: boolean;
  enableOpenTracking: boolean;
  enableLocationTracking: boolean;
  enableDeviceTracking: boolean;
  anonymizeIPs: boolean;
  retentionDays: number;
}

const DEFAULT_CONFIG: TrackingConfig = {
  enableEmailTracking: true,
  enableSMSTracking: true,
  enableWhatsAppTracking: true,
  enableClickTracking: true,
  enableOpenTracking: true,
  enableLocationTracking: true,
  enableDeviceTracking: true,
  anonymizeIPs: false,
  retentionDays: 365
};

// User Agent Parser
function parseUserAgent(userAgent: string): {
  browser?: string;
  os?: string;
  device?: string;
} {
  if (!userAgent) return {};

  const result: any = {};

  // Browser detection
  if (userAgent.includes('Chrome')) result.browser = 'Chrome';
  else if (userAgent.includes('Firefox')) result.browser = 'Firefox';
  else if (userAgent.includes('Safari')) result.browser = 'Safari';
  else if (userAgent.includes('Edge')) result.browser = 'Edge';
  else if (userAgent.includes('Opera')) result.browser = 'Opera';

  // OS detection
  if (userAgent.includes('Windows')) result.os = 'Windows';
  else if (userAgent.includes('Mac OS')) result.os = 'macOS';
  else if (userAgent.includes('Linux')) result.os = 'Linux';
  else if (userAgent.includes('Android')) result.os = 'Android';
  else if (userAgent.includes('iOS')) result.os = 'iOS';

  // Device type detection
  if (userAgent.includes('Mobile')) result.device = 'mobile';
  else if (userAgent.includes('Tablet')) result.device = 'tablet';
  else result.device = 'desktop';

  return result;
}

// IP Geolocation (simplified - in production use a service like MaxMind)
async function getLocationFromIP(ip: string): Promise<{
  country?: string;
  region?: string;
  city?: string;
} | null> {
  try {
    // In production, this would use a geolocation service
    // For now, return mock data for non-local IPs
    if (ip && !ip.startsWith('127.') && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
      return {
        country: 'US',
        region: 'CA',
        city: 'San Francisco'
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to get location from IP:', error);
    return null;
  }
}

// Session Management
const activeSessions = new Map<string, {
  sessionId: string;
  userId?: string;
  startTime: number;
  lastActivity: number;
  events: CommunicationEvent[];
}>();

// Cleanup expired sessions (runs every hour)
setInterval(() => {
  const now = Date.now();
  const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > sessionTimeout) {
      activeSessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);

// Core Tracking Middleware
export function trackingMiddleware(config: Partial<TrackingConfig> = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  return async (req: TrackedRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const sessionId = req.headers['x-session-id'] as string || crypto.randomUUID();
    const userAgent = req.get('User-Agent') || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    // Parse device information
    const deviceInfo = fullConfig.enableDeviceTracking ? parseUserAgent(userAgent) : {};

    // Get location information
    const locationInfo = fullConfig.enableLocationTracking 
      ? await getLocationFromIP(ipAddress)
      : null;

    // Anonymize IP if configured
    const trackedIP = fullConfig.anonymizeIPs 
      ? ipAddress.split('.').slice(0, 3).join('.') + '.0'
      : ipAddress;

    // Attach tracking information to request
    req.tracking = {
      sessionId,
      userId: req.user?.id,
      startTime,
      userAgent,
      ipAddress: trackedIP,
      location: locationInfo || undefined,
      device: deviceInfo
    };

    // Update session
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, {
        sessionId,
        userId: req.user?.id,
        startTime,
        lastActivity: startTime,
        events: []
      });
    } else {
      const session = activeSessions.get(sessionId)!;
      session.lastActivity = startTime;
      if (req.user?.id) session.userId = req.user.id;
    }

    // Override response methods to capture response data
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function(body: any) {
      captureResponseData(req as TrackedRequest, res, body, fullConfig);
      return originalSend.call(this, body);
    };

    res.json = function(obj: any) {
      captureResponseData(req as TrackedRequest, res, obj, fullConfig);
      return originalJson.call(this, obj);
    };

    next();
  };
}

// Response Data Capture
async function captureResponseData(
  req: TrackedRequest, 
  res: Response, 
  data: any, 
  config: TrackingConfig
) {
  try {
    const duration = Date.now() - (req.tracking?.startTime || 0);
    const statusCode = res.statusCode;

    // Record general request metrics
    metricsRegistry.recordHistogram('http_request_duration_ms', duration, {
      method: req.method,
      status_code: statusCode.toString(),
      endpoint: req.path
    });

    // Track communication-specific events
    if (shouldTrackCommunicationEvent(req, res, data, config)) {
      await trackCommunicationEvent(req, res, data, config);
    }

    // Track performance metrics
    if (req.path.includes('/api/communications/')) {
      metricsRegistry.recordHistogram('communication_api_duration_ms', duration, {
        endpoint: req.path.split('/').pop() || 'unknown',
        status_code: statusCode.toString()
      });
    }

  } catch (error) {
    console.error('Failed to capture response data:', error);
  }
}

// Communication Event Detection
function shouldTrackCommunicationEvent(
  req: TrackedRequest,
  res: Response,
  data: any,
  config: TrackingConfig
): boolean {
  // Track successful API responses
  if (res.statusCode >= 200 && res.statusCode < 300) {
    // Email tracking
    if (config.enableEmailTracking && req.path.includes('/email/')) {
      return true;
    }

    // SMS tracking
    if (config.enableSMSTracking && req.path.includes('/sms/')) {
      return true;
    }

    // WhatsApp tracking
    if (config.enableWhatsAppTracking && req.path.includes('/whatsapp/')) {
      return true;
    }

    // Click tracking
    if (config.enableClickTracking && req.path.includes('/track/click/')) {
      return true;
    }

    // Open tracking
    if (config.enableOpenTracking && req.path.includes('/track/open/')) {
      return true;
    }
  }

  return false;
}

// Communication Event Tracking
async function trackCommunicationEvent(
  req: TrackedRequest,
  res: Response,
  data: any,
  config: TrackingConfig
) {
  try {
    const analyticsService = getCommunicationAnalyticsService();
    
    let eventType: CommunicationEvent['eventType'] = 'message_sent';
    let channel: CommunicationEvent['channel'] = 'email';

    // Determine event type and channel from request
    if (req.path.includes('/email/')) {
      channel = 'email';
      if (req.method === 'POST') eventType = 'message_sent';
    } else if (req.path.includes('/sms/')) {
      channel = 'sms';
      if (req.method === 'POST') eventType = 'message_sent';
    } else if (req.path.includes('/whatsapp/')) {
      channel = 'whatsapp';
      if (req.method === 'POST') eventType = 'message_sent';
    } else if (req.path.includes('/track/open/')) {
      eventType = 'message_opened';
      channel = req.query.channel as CommunicationEvent['channel'] || 'email';
    } else if (req.path.includes('/track/click/')) {
      eventType = 'link_clicked';
      channel = req.query.channel as CommunicationEvent['channel'] || 'email';
    }

    // Extract message and event IDs
    const messageId = req.params.messageId || req.query.messageId || 
      (data?.success && data?.data?.messageId) || crypto.randomUUID();
    const eventId = req.params.eventId || req.body?.eventId || 
      req.query.eventId || req.tracking?.eventId || '';

    const event: Omit<CommunicationEvent, 'id' | 'createdAt'> = {
      eventId,
      guestId: req.body?.guestId || req.query.guestId,
      messageId,
      channel,
      eventType,
      timestamp: new Date().toISOString(),
      data: {
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        duration: Date.now() - (req.tracking?.startTime || 0),
        requestSize: JSON.stringify(req.body || {}).length,
        responseSize: JSON.stringify(data || {}).length
      },
      userAgent: req.tracking?.userAgent,
      ipAddress: req.tracking?.ipAddress,
      location: req.tracking?.location,
      device: req.tracking?.device
    };

    await analyticsService.recordEvent(event);

    // Update session
    const session = activeSessions.get(req.tracking?.sessionId || '');
    if (session) {
      session.events.push({ ...event, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
      session.lastActivity = Date.now();
    }

  } catch (error) {
    console.error('Failed to track communication event:', error);
  }
}

// Email-specific tracking middleware
export function emailTrackingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Handle email open tracking pixel
  if (req.path.includes('/track/email/open/')) {
    const messageId = req.params.messageId || req.query.messageId;
    const timestamp = new Date().toISOString();

    if (messageId) {
      // Record email open event
      setImmediate(async () => {
        try {
          const analyticsService = getCommunicationAnalyticsService();
          await analyticsService.trackEmailOpen(messageId as string, {
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip,
            timestamp
          });
        } catch (error) {
          console.error('Failed to track email open:', error);
        }
      });
    }

    // Return tracking pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    res.set({
      'Content-Type': 'image/png',
      'Content-Length': pixel.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    return res.send(pixel);
  }

  // Handle email link click tracking
  if (req.path.includes('/track/email/click/')) {
    const messageId = req.params.messageId || req.query.messageId;
    const linkId = req.params.linkId || req.query.linkId;
    const targetUrl = req.query.url as string;
    const timestamp = new Date().toISOString();

    if (messageId && linkId && targetUrl) {
      // Record email click event
      setImmediate(async () => {
        try {
          const analyticsService = getCommunicationAnalyticsService();
          await analyticsService.trackEmailClick(messageId as string, linkId as string, {
            url: targetUrl,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip,
            timestamp
          });
        } catch (error) {
          console.error('Failed to track email click:', error);
        }
      });

      // Redirect to target URL
      return res.redirect(302, targetUrl);
    }

    return res.status(400).send('Invalid tracking parameters');
  }

  next();
}

// SMS-specific tracking middleware
export function smsTrackingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Handle SMS delivery webhooks
  if (req.path.includes('/webhook/sms/')) {
    const provider = req.path.includes('/twilio/') ? 'twilio' : 'aws_sns';
    
    // Record webhook received event
    setImmediate(async () => {
      try {
        const analyticsService = getCommunicationAnalyticsService();
        
        if (provider === 'twilio') {
          const { MessageSid, MessageStatus } = req.body;
          
          if (MessageSid && MessageStatus) {
            let eventType: CommunicationEvent['eventType'] = 'message_delivered';
            
            switch (MessageStatus) {
              case 'delivered':
                eventType = 'message_delivered';
                break;
              case 'failed':
              case 'undelivered':
                eventType = 'message_failed';
                break;
              case 'sent':
                eventType = 'message_sent';
                break;
            }

            await analyticsService.recordEvent({
              eventId: '', // Would be extracted from message record
              messageId: MessageSid,
              channel: 'sms',
              eventType,
              timestamp: new Date().toISOString(),
              data: {
                provider,
                originalStatus: MessageStatus,
                webhookData: req.body
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to track SMS webhook:', error);
      }
    });
  }

  next();
}

// WhatsApp-specific tracking middleware
export function whatsappTrackingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Handle WhatsApp webhooks
  if (req.path.includes('/webhook/whatsapp/')) {
    // Record WhatsApp webhook events
    setImmediate(async () => {
      try {
        const analyticsService = getCommunicationAnalyticsService();
        
        // Parse WhatsApp webhook data
        const { entry } = req.body;
        
        if (entry && entry.length > 0) {
          for (const entryItem of entry) {
            const changes = entryItem.changes || [];
            
            for (const change of changes) {
              if (change.field === 'messages') {
                const { messages, statuses } = change.value;
                
                // Process message status updates
                if (statuses) {
                  for (const status of statuses) {
                    let eventType: CommunicationEvent['eventType'] = 'message_delivered';
                    
                    switch (status.status) {
                      case 'delivered':
                        eventType = 'message_delivered';
                        break;
                      case 'read':
                        eventType = 'message_opened';
                        break;
                      case 'failed':
                        eventType = 'message_failed';
                        break;
                    }

                    await analyticsService.recordEvent({
                      eventId: '', // Would be extracted from message record
                      messageId: status.id,
                      channel: 'whatsapp',
                      eventType,
                      timestamp: new Date(status.timestamp * 1000).toISOString(),
                      data: {
                        provider: 'whatsapp',
                        originalStatus: status.status,
                        webhookData: status
                      }
                    });
                  }
                }

                // Process incoming messages (replies)
                if (messages) {
                  for (const message of messages) {
                    await analyticsService.recordEvent({
                      eventId: '', // Would be extracted from context
                      messageId: message.id,
                      channel: 'whatsapp',
                      eventType: 'reply_received',
                      timestamp: new Date(message.timestamp * 1000).toISOString(),
                      data: {
                        provider: 'whatsapp',
                        messageType: message.type,
                        from: message.from,
                        webhookData: message
                      }
                    });
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to track WhatsApp webhook:', error);
      }
    });
  }

  next();
}

// Analytics Data Export Middleware
export function analyticsExportMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path.includes('/analytics/export/')) {
    const originalSend = res.send;

    res.send = function(body: any) {
      // Record analytics export metrics
      metricsRegistry.incrementCounter('analytics_exports_total', {
        format: req.query.format as string || 'json',
        data_type: req.path.split('/').pop() || 'unknown'
      });

      return originalSend.call(this, body);
    };
  }

  next();
}

// Performance Monitoring Middleware
export function performanceMonitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  const originalSend = res.send;

  res.send = function(body: any) {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Record performance metrics
    metricsRegistry.recordHistogram('request_memory_usage_bytes', memoryDelta, {
      endpoint: req.path,
      method: req.method
    });

    metricsRegistry.recordHistogram('request_processing_time_ms', duration, {
      endpoint: req.path,
      method: req.method,
      status_code: res.statusCode.toString()
    });

    // Track slow requests
    if (duration > 1000) { // Slower than 1 second
      metricsRegistry.incrementCounter('slow_requests_total', {
        endpoint: req.path,
        method: req.method,
        duration_bucket: duration > 5000 ? 'very_slow' : 'slow'
      });
    }

    return originalSend.call(this, body);
  };

  next();
}

// Session Analytics Middleware
export function sessionAnalyticsMiddleware(req: TrackedRequest, res: Response, next: NextFunction) {
  if (req.tracking?.sessionId) {
    const session = activeSessions.get(req.tracking.sessionId);
    
    if (session) {
      // Update session activity
      session.lastActivity = Date.now();
      
      // Record session metrics
      const sessionDuration = session.lastActivity - session.startTime;
      const eventCount = session.events.length;
      
      metricsRegistry.recordHistogram('session_duration_ms', sessionDuration, {
        user_type: session.userId ? 'authenticated' : 'anonymous'
      });
      
      metricsRegistry.recordHistogram('session_events_count', eventCount, {
        user_type: session.userId ? 'authenticated' : 'anonymous'
      });
    }
  }

  next();
}

// Cleanup and utility functions
export function cleanupExpiredTracking(retentionDays: number = 365): void {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  // This would clean up old tracking data from the database
  console.log(`🧹 Cleaning up tracking data older than ${retentionDays} days`);
}

// Export session information for debugging
export function getActiveSessionsInfo(): {
  totalSessions: number;
  authenticatedSessions: number;
  averageSessionDuration: number;
  totalEvents: number;
} {
  const now = Date.now();
  let authenticatedCount = 0;
  let totalDuration = 0;
  let totalEvents = 0;

  for (const session of activeSessions.values()) {
    if (session.userId) authenticatedCount++;
    totalDuration += now - session.startTime;
    totalEvents += session.events.length;
  }

  return {
    totalSessions: activeSessions.size,
    authenticatedSessions: authenticatedCount,
    averageSessionDuration: activeSessions.size > 0 ? totalDuration / activeSessions.size : 0,
    totalEvents
  };
}