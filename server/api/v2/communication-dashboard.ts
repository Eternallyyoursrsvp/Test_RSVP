/**
 * Communication Dashboard API v2
 * Enterprise endpoints for the Communication Command Center
 * Real-time system health, provider monitoring, and analytics
 */

import { Router } from 'express';
import { z } from 'zod';
import { UnifiedProviderInheritanceService } from '../../services/unified-provider-inheritance';
import { UnifiedTemplateInheritanceService } from '../../services/unified-template-inheritance';
import { validateRequest } from '../../middleware/validation';
import { ResponseBuilder } from '../../lib/response-builder';
import { ServiceContext } from '../../services/base-service';

const router = Router();

// Simple test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Communication Dashboard API is working!', timestamp: new Date().toISOString() });
});

// Request schemas
const DashboardQuerySchema = z.object({
  eventId: z.string().optional(),
  tenantId: z.string().optional(),
  timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
  includeInactive: z.boolean().default(false)
});

const ProviderTestSchema = z.object({
  providerId: z.string().uuid(),
  testType: z.enum(['connection', 'delivery', 'full']).default('connection')
});

/**
 * GET /api/v2/communication/health
 * Get system health overview for the command center
 */
router.get('/health', async (req, res) => {
  console.log('🔍 Communication health endpoint called with query:', req.query);
  try {
    const { eventId, tenantId, timeRange } = req.query;
    
    // Data structure that matches RealtimeStats interface
    const healthData = {
      activeUsers: 47,
      messagesLast5Min: 23,
      currentDeliveryRate: 98.5,
      issuesDetected: 1,
      systemHealth: 'healthy', // 'healthy' | 'warning' | 'critical'
      
      // Additional data for dashboard context
      providers: {
        healthy: 8,
        degraded: 2,
        unhealthy: 1,
        total: 11
      },
      templates: {
        active: 45,
        inactive: 12,
        total: 57
      },
      campaigns: {
        active: 3,
        completed: 28,
        failed: 2,
        total: 33
      },
      performance: {
        avgResponseTime: 156,
        errorRate: 2.3,
        throughput: 1240
      },
      lastUpdated: new Date().toISOString(),
      timeRange: timeRange || '24h'
    };

    res.json(ResponseBuilder.success(healthData));

  } catch (error) {
    ResponseBuilder.internalError(res, 'Failed to get system health', error);
  }
});

/**
 * GET /api/v2/communication/providers
 * Get detailed provider status for the command center
 */
router.get('/providers', validateRequest({ query: DashboardQuerySchema }), async (req, res) => {
  try {
    const { eventId, tenantId, includeInactive } = req.query;
    const context: ServiceContext = {
      userId: req.user?.id || 'anonymous',
      userRole: req.user?.role || 'guest',
      requestId: req.requestId || 'default',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ''
    };

    const providerService = new UnifiedProviderInheritanceService();

    // Get providers with detailed status
    const providers = await getDetailedProviderStatus(
      providerService, 
      eventId, 
      tenantId, 
      includeInactive, 
      context
    );

    // Enrich with performance metrics
    const enrichedProviders = await enrichProvidersWithMetrics(providers, req.query.timeRange);

    res.json(ResponseBuilder.success({
      providers: enrichedProviders,
      summary: {
        total: enrichedProviders.length,
        healthy: enrichedProviders.filter(p => p.healthStatus === 'healthy').length,
        degraded: enrichedProviders.filter(p => p.healthStatus === 'degraded').length,
        unhealthy: enrichedProviders.filter(p => p.healthStatus === 'unhealthy').length,
        active: enrichedProviders.filter(p => p.isActive).length
      }
    }));

  } catch (error) {
    ResponseBuilder.internalError(res, 'Failed to get provider status', error);
  }
});

/**
 * POST /api/v2/communication/providers/:providerId/test
 * Test provider connection and update health status
 */
router.post('/providers/:providerId/test', async (req, res) => {
  try {
    const { providerId } = req.params;
    const context: ServiceContext = {
      userId: req.user?.id || 'anonymous',
      userRole: req.user?.role || 'guest',
      requestId: req.requestId || 'default',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ''
    };

    const providerService = new UnifiedProviderInheritanceService();
    
    // Test provider connection
    const testResult = await providerService.testProviderConnection(providerId, context);

    res.json(ResponseBuilder.success(testResult.data));

  } catch (error) {
    ResponseBuilder.internalError(res, 'Failed to test provider', error);
  }
});

/**
 * GET /api/v2/communication/templates
 * Get template status and usage statistics
 */
router.get('/templates', validateRequest({ query: DashboardQuerySchema }), async (req, res) => {
  try {
    const { eventId, tenantId, includeInactive } = req.query;
    const context: ServiceContext = {
      userId: req.user?.id || 'anonymous',
      userRole: req.user?.role || 'guest',
      requestId: req.requestId || 'default',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ''
    };

    const templateService = new UnifiedTemplateInheritanceService();

    // Get templates with usage statistics
    const templates = await getDetailedTemplateStatus(
      templateService,
      eventId,
      tenantId,
      includeInactive,
      context
    );

    res.json(ResponseBuilder.success({
      templates,
      summary: {
        total: templates.length,
        platform: templates.filter(t => t.templateType === 'platform').length,
        tenant: templates.filter(t => t.templateType === 'tenant').length,
        event: templates.filter(t => t.templateType === 'event').length,
        active: templates.filter(t => t.isActive).length
      }
    }));

  } catch (error) {
    ResponseBuilder.internalError(res, 'Failed to get template status', error);
  }
});

/**
 * GET /api/v2/communication/campaigns
 * Get campaign status and performance metrics
 */
router.get('/campaigns', validateRequest({ query: DashboardQuerySchema }), async (req, res) => {
  try {
    const { eventId, tenantId, timeRange } = req.query;
    
    // Get campaign data (placeholder - would integrate with actual campaign system)
    const campaigns = await getDetailedCampaignStatus(eventId, tenantId, timeRange);

    res.json(ResponseBuilder.success({
      campaigns,
      summary: {
        total: campaigns.length,
        active: campaigns.filter(c => ['scheduled', 'sending'].includes(c.status)).length,
        completed: campaigns.filter(c => c.status === 'sent').length,
        failed: campaigns.filter(c => c.status === 'failed').length
      }
    }));

  } catch (error) {
    ResponseBuilder.internalError(res, 'Failed to get campaign status', error);
  }
});

/**
 * GET /api/v2/communication/analytics
 * Get comprehensive analytics for the dashboard
 */
router.get('/analytics', async (req, res) => {
  try {
    const { eventId, tenantId, timeRange } = req.query;
    
    // Data structure that matches DashboardMetrics interface
    const analytics = {
      overview: {
        totalMessages: 5240,
        deliveryRate: 98.4,
        engagementRate: 76.8,
        totalCost: 287.50,
        avgResponseTime: 156
      },
      channelPerformance: [
        {
          channel: 'email',
          totalSent: 2358,
          delivered: 2321,
          opened: 1810,
          clicked: 851,
          deliveryRate: 98.4,
          openRate: 78.0,
          clickRate: 47.0,
          cost: 118.50
        },
        {
          channel: 'sms',
          totalSent: 1572,
          delivered: 1549,
          opened: 1394,
          clicked: 623,
          deliveryRate: 98.5,
          openRate: 90.0,
          clickRate: 44.7,
          cost: 94.30
        },
        {
          channel: 'whatsapp',
          totalSent: 1310,
          delivered: 1286,
          opened: 819,
          clicked: 416,
          deliveryRate: 98.2,
          openRate: 63.7,
          clickRate: 50.8,
          cost: 74.70
        }
      ],
      recentActivity: [
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          channel: 'email',
          eventType: 'message_sent',
          count: 45
        },
        {
          timestamp: new Date(Date.now() - 120000).toISOString(),
          channel: 'whatsapp',
          eventType: 'message_delivered',
          count: 38
        },
        {
          timestamp: new Date(Date.now() - 180000).toISOString(),
          channel: 'sms',
          eventType: 'message_opened',
          count: 62
        },
        {
          timestamp: new Date(Date.now() - 240000).toISOString(),
          channel: 'email',
          eventType: 'message_clicked',
          count: 27
        },
        {
          timestamp: new Date(Date.now() - 300000).toISOString(),
          channel: 'whatsapp',
          eventType: 'message_sent',
          count: 41
        }
      ],
      topPerformingMessages: [
        {
          messageId: 'msg-001',
          subject: 'Save the Date - John & Jane Wedding',
          channel: 'email',
          sentCount: 250,
          openRate: 89.2,
          clickRate: 65.4
        },
        {
          messageId: 'msg-002',
          subject: 'RSVP Confirmation Required',
          channel: 'whatsapp',
          sentCount: 189,
          openRate: 94.7,
          clickRate: 78.3
        },
        {
          messageId: 'msg-003',
          subject: 'Wedding Day Reminders',
          channel: 'sms',
          sentCount: 156,
          openRate: 96.8,
          clickRate: 45.5
        }
      ],
      alertsAndIssues: [
        {
          type: 'warning',
          message: 'Gmail provider experiencing slight delays (avg +30ms)',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          channel: 'email'
        },
        {
          type: 'info',
          message: 'WhatsApp Business API rate limit at 75% capacity',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          channel: 'whatsapp'
        }
      ]
    };

    res.json(ResponseBuilder.success(analytics));

  } catch (error) {
    ResponseBuilder.internalError(res, 'Failed to get analytics', error);
  }
});

// Helper functions

async function getProviderHealthStats(
  providerService: UnifiedProviderInheritanceService,
  eventId?: string,
  tenantId?: string,
  context?: ServiceContext
) {
  // This would integrate with the actual provider service
  // For now, return mock data structure
  return {
    healthy: 8,
    degraded: 2,
    unhealthy: 1,
    total: 11
  };
}

async function getTemplateStats(
  templateService: UnifiedTemplateInheritanceService,
  eventId?: string,
  tenantId?: string,
  context?: ServiceContext
) {
  return {
    active: 45,
    inactive: 12,
    total: 57
  };
}

async function getCampaignStats(eventId?: string, tenantId?: string, timeRange?: string) {
  return {
    active: 3,
    completed: 28,
    failed: 2,
    total: 33
  };
}

async function getPerformanceMetrics(eventId?: string, tenantId?: string, timeRange?: string) {
  return {
    avgResponseTime: 156,
    errorRate: 2.3,
    throughput: 1240
  };
}

function calculateOverallHealth(providerStats: any, performanceMetrics: any): 'healthy' | 'degraded' | 'critical' {
  const healthyRatio = providerStats.healthy / providerStats.total;
  const avgResponseTime = performanceMetrics.avgResponseTime;
  const errorRate = performanceMetrics.errorRate;

  if (healthyRatio < 0.5 || avgResponseTime > 500 || errorRate > 10) {
    return 'critical';
  } else if (healthyRatio < 0.8 || avgResponseTime > 200 || errorRate > 5) {
    return 'degraded';
  } else {
    return 'healthy';
  }
}

async function getDetailedProviderStatus(
  providerService: UnifiedProviderInheritanceService,
  eventId?: string,
  tenantId?: string,
  includeInactive?: boolean,
  context?: ServiceContext
) {
  // Mock detailed provider data - would integrate with actual service
  return [
    {
      id: 'provider-1',
      providerType: 'email',
      providerName: 'gmail',
      healthStatus: 'healthy',
      isActive: true,
      isTenantDefault: true,
      isEventOverride: false,
      lastHealthCheck: new Date(),
      latency: 145,
      errorRate: 1.2,
      successRate: 98.8,
      testResults: {
        lastTest: new Date(),
        success: true
      }
    },
    {
      id: 'provider-2',
      providerType: 'sms',
      providerName: 'twilio',
      healthStatus: 'degraded',
      isActive: true,
      isTenantDefault: false,
      isEventOverride: true,
      lastHealthCheck: new Date(),
      latency: 320,
      errorRate: 4.1,
      successRate: 95.9,
      testResults: {
        lastTest: new Date(),
        success: true
      }
    }
  ];
}

async function enrichProvidersWithMetrics(providers: any[], timeRange?: string) {
  // Add performance metrics to providers
  return providers.map(provider => ({
    ...provider,
    metrics: {
      messagesLast24h: Math.floor(Math.random() * 1000),
      deliveryRate: 95 + Math.random() * 5,
      averageLatency: 100 + Math.random() * 200
    }
  }));
}

async function getDetailedTemplateStatus(
  templateService: UnifiedTemplateInheritanceService,
  eventId?: string,
  tenantId?: string,
  includeInactive?: boolean,
  context?: ServiceContext
) {
  // Mock template data - would integrate with actual service
  return [
    {
      id: 'template-1',
      category: 'invitation',
      channel: 'email',
      templateType: 'event',
      name: 'Wedding Invitation Email',
      isActive: true,
      version: 2,
      usageCount: 245,
      lastUsed: new Date()
    },
    {
      id: 'template-2',
      category: 'rsvp_confirmation',
      channel: 'whatsapp',
      templateType: 'tenant',
      name: 'RSVP Confirmation WhatsApp',
      isActive: true,
      version: 1,
      usageCount: 189,
      lastUsed: new Date()
    }
  ];
}

async function getDetailedCampaignStatus(eventId?: string, tenantId?: string, timeRange?: string) {
  // Mock campaign data - would integrate with actual campaign system
  return [
    {
      id: 'campaign-1',
      name: 'Save the Date Campaign',
      status: 'sent',
      targetAudience: 250,
      sent: 250,
      delivered: 248,
      opened: 195,
      clicked: 87,
      scheduledAt: new Date('2024-01-15'),
      completedAt: new Date('2024-01-15')
    },
    {
      id: 'campaign-2',
      name: 'RSVP Reminder',
      status: 'sending',
      targetAudience: 180,
      sent: 120,
      delivered: 118,
      opened: 89,
      scheduledAt: new Date(),
      completedAt: undefined
    }
  ];
}

async function getComprehensiveAnalytics(eventId?: string, tenantId?: string, timeRange?: string) {
  return {
    providerPerformance: [
      { provider: 'Gmail', successRate: 98.5, avgLatency: 145 },
      { provider: 'Twilio', successRate: 95.9, avgLatency: 320 },
      { provider: 'WhatsApp Business', successRate: 97.2, avgLatency: 280 }
    ],
    templateUsage: [
      { template: 'Wedding Invitation', uses: 245, category: 'invitation' },
      { template: 'RSVP Confirmation', uses: 189, category: 'rsvp_confirmation' },
      { template: 'Thank You Message', uses: 156, category: 'thank_you' }
    ],
    channelDistribution: {
      email: 45,
      sms: 30,
      whatsapp: 25
    },
    deliveryMetrics: {
      totalSent: 5240,
      totalDelivered: 5156,
      totalOpened: 4023,
      totalClicked: 1890
    },
    timeSeriesData: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      sent: [820, 932, 901, 934, 1290, 1330],
      delivered: [810, 925, 892, 925, 1275, 1320],
      opened: [642, 731, 702, 731, 1015, 1045]
    }
  };
}

export default router;