/**
 * Enhanced System Health Monitoring API
 * Comprehensive system health and performance monitoring endpoints
 * Phase 3.3: Ferrari transformation implementation
 */

import express, { Router, Request, Response } from 'express';
import { z } from 'zod';
import { APIResponseBuilder } from '../versioning';
import { enhancedAuthMiddleware, requirePermission } from '../../middleware/enhanced-security';
import { createValidationMiddleware } from '../versioning';
import os from 'os';
import process from 'process';

const router = Router();

// Enhanced system health interface
interface SystemHealthMetrics {
  status: 'healthy' | 'warning' | 'critical' | 'maintenance';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  nodeVersion: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsage: {
      used: number;
      total: number;
      external: number;
    };
  };
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  database: {
    status: 'connected' | 'disconnected' | 'slow';
    connections: number;
    maxConnections: number;
    queryTime: number;
    activeQueries: number;
  };
  api: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    activeEndpoints: number;
    rateLimitStatus: number;
  };
  websocket: {
    activeConnections: number;
    totalConnections: number;
    messagesSent: number;
    messagesReceived: number;
    errors: number;
  };
  security: {
    failedLogins: number;
    activeTokens: number;
    csrfTokens: number;
    securityAlerts: number;
  };
  services: Array<{
    name: string;
    status: 'running' | 'stopped' | 'error' | 'starting';
    uptime: number;
    lastCheck: string;
  }>;
}

// Global metrics storage (in production, this would be Redis/database)
let globalMetrics = {
  requestCount: 0,
  totalResponseTime: 0,
  errorCount: 0,
  activeConnections: 0,
  lastRequestTime: Date.now()
};

// Apply authentication to all routes
router.use(enhancedAuthMiddleware);

/**
 * GET /system/health/comprehensive
 * Enhanced system health with detailed metrics
 */
router.get(
  '/comprehensive',
  requirePermission('system:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const currentTime = new Date();
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const loadAverage = os.loadavg();
      
      // Calculate memory percentage
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryPercentage = (usedMemory / totalMemory) * 100;
      
      // Calculate CPU usage percentage (simplified)
      const cpuPercent = Math.min(100, (cpuUsage.user + cpuUsage.system) / 10000);
      
      // Mock database metrics (in production, these would be real metrics)
      const dbMetrics = {
        status: 'connected' as const,
        connections: 15 + Math.floor(Math.random() * 10),
        maxConnections: 100,
        queryTime: 15 + Math.random() * 20,
        activeQueries: Math.floor(Math.random() * 5)
      };
      
      // Calculate API metrics
      const avgResponseTime = globalMetrics.requestCount > 0 
        ? globalMetrics.totalResponseTime / globalMetrics.requestCount 
        : 0;
      const errorRate = globalMetrics.requestCount > 0 
        ? (globalMetrics.errorCount / globalMetrics.requestCount) * 100 
        : 0;
      
      // Mock WebSocket metrics (in production, these would be from WebSocket manager)
      const wsMetrics = {
        activeConnections: globalMetrics.activeConnections,
        totalConnections: 156 + Math.floor(Math.random() * 50),
        messagesSent: 2547 + Math.floor(Math.random() * 500),
        messagesReceived: 1876 + Math.floor(Math.random() * 300),
        errors: Math.floor(Math.random() * 3)
      };
      
      // Mock security metrics (in production, these would be from security manager)
      const securityMetrics = {
        failedLogins: Math.floor(Math.random() * 3),
        activeTokens: 45 + Math.floor(Math.random() * 20),
        csrfTokens: 23 + Math.floor(Math.random() * 10),
        securityAlerts: Math.floor(Math.random() * 2)
      };
      
      // Service status checks
      const services = [
        {
          name: 'RSVP Core Service',
          status: 'running' as const,
          uptime: process.uptime(),
          lastCheck: currentTime.toISOString()
        },
        {
          name: 'Communication Service',
          status: 'running' as const,
          uptime: process.uptime() * 0.8,
          lastCheck: currentTime.toISOString()
        },
        {
          name: 'Transport Service',
          status: 'running' as const,
          uptime: process.uptime() * 0.9,
          lastCheck: currentTime.toISOString()
        },
        {
          name: 'Analytics Service',
          status: globalMetrics.activeConnections > 0 ? 'running' as const : 'error' as const,
          uptime: globalMetrics.activeConnections > 0 ? process.uptime() * 0.7 : 0,
          lastCheck: currentTime.toISOString()
        },
        {
          name: 'File Storage Service',
          status: 'running' as const,
          uptime: process.uptime() * 1.1,
          lastCheck: currentTime.toISOString()
        }
      ];
      
      // Determine overall system status
      let systemStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (memoryPercentage > 85 || cpuPercent > 80 || errorRate > 5) {
        systemStatus = 'warning';
      }
      if (memoryPercentage > 95 || cpuPercent > 90 || errorRate > 10) {
        systemStatus = 'critical';
      }
      
      const healthMetrics: SystemHealthMetrics = {
        status: systemStatus,
        timestamp: currentTime.toISOString(),
        uptime: process.uptime(),
        version: '5.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        memory: {
          used: Math.round(usedMemory / 1024 / 1024), // MB
          total: Math.round(totalMemory / 1024 / 1024), // MB
          percentage: Math.round(memoryPercentage),
          heapUsage: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024) // MB
          }
        },
        cpu: {
          usage: Math.round(cpuPercent),
          loadAverage: loadAverage,
          cores: os.cpus().length
        },
        database: dbMetrics,
        api: {
          totalRequests: globalMetrics.requestCount,
          averageResponseTime: Math.round(avgResponseTime),
          errorRate: Math.round(errorRate * 100) / 100,
          activeEndpoints: 47, // Mock value
          rateLimitStatus: Math.round(Math.random() * 20 + 80) // Mock 80-100%
        },
        websocket: wsMetrics,
        security: securityMetrics,
        services: services
      };
      
      res.status(200).json(responseBuilder.success(healthMetrics));
    } catch (error) {
      console.error('❌ System health check failed:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve system health metrics',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /system/health/metrics
 * Real-time performance metrics
 */
router.get(
  '/metrics',
  requirePermission('system:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const memoryUsage = process.memoryUsage();
      const loadAverage = os.loadavg();
      
      const metrics = {
        timestamp: new Date().toISOString(),
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        },
        cpu: {
          loadAverage: loadAverage,
          cores: os.cpus().length
        },
        uptime: process.uptime(),
        activeHandles: (process as any)._getActiveHandles?.()?.length || 0,
        activeRequests: (process as any)._getActiveRequests?.()?.length || 0
      };
      
      res.status(200).json(responseBuilder.success(metrics));
    } catch (error) {
      console.error('❌ Failed to get system metrics:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve system metrics',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /system/health/services
 * Service status monitoring
 */
router.get(
  '/services',
  requirePermission('system:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const currentTime = new Date();
      
      // In production, these would be real service health checks
      const services = [
        {
          name: 'Database Connection',
          status: 'healthy',
          responseTime: 15 + Math.random() * 10,
          lastCheck: currentTime.toISOString(),
          details: 'PostgreSQL connection pool active'
        },
        {
          name: 'Redis Cache',
          status: 'healthy',
          responseTime: 5 + Math.random() * 5,
          lastCheck: currentTime.toISOString(),
          details: 'Cache hit ratio: 94%'
        },
        {
          name: 'Email Service',
          status: 'healthy',
          responseTime: 120 + Math.random() * 50,
          lastCheck: currentTime.toISOString(),
          details: 'SMTP connection established'
        },
        {
          name: 'WhatsApp Integration',
          status: globalMetrics.activeConnections > 0 ? 'healthy' : 'warning',
          responseTime: 200 + Math.random() * 100,
          lastCheck: currentTime.toISOString(),
          details: 'API rate limit: 85% used'
        },
        {
          name: 'File Storage',
          status: 'healthy',
          responseTime: 45 + Math.random() * 20,
          lastCheck: currentTime.toISOString(),
          details: 'Storage utilization: 67%'
        }
      ];
      
      res.status(200).json(responseBuilder.success({
        services,
        summary: {
          total: services.length,
          healthy: services.filter(s => s.status === 'healthy').length,
          warning: services.filter(s => s.status === 'warning').length,
          critical: services.filter(s => s.status === 'critical').length
        },
        lastUpdated: currentTime.toISOString()
      }));
    } catch (error) {
      console.error('❌ Failed to get service status:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve service status',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * POST /system/health/alert
 * Create system alert
 */
router.post(
  '/alert',
  requirePermission('system:write'),
  createValidationMiddleware(z.object({
    body: z.object({
      severity: z.enum(['info', 'warning', 'error', 'critical']),
      title: z.string().min(1),
      message: z.string().min(1),
      category: z.string().default('system'),
      source: z.string().default('manual')
    })
  })),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { severity, title, message, category, source } = req.body;
      
      const alert = {
        id: `alert-${Date.now()}`,
        severity,
        title,
        message,
        category,
        source,
        timestamp: new Date().toISOString(),
        resolved: false
      };
      
      // In production, this would be stored in database and broadcast via WebSocket
      console.log('🚨 System Alert Created:', alert);
      
      res.status(201).json(responseBuilder.success({
        alert,
        message: 'System alert created successfully'
      }));
    } catch (error) {
      console.error('❌ Failed to create system alert:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to create system alert',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * Middleware to track API metrics
 */
export const trackApiMetrics = (req: Request, res: Response, next: Function) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    globalMetrics.requestCount++;
    globalMetrics.totalResponseTime += responseTime;
    globalMetrics.lastRequestTime = Date.now();
    
    if (res.statusCode >= 400) {
      globalMetrics.errorCount++;
    }
  });
  
  next();
};

/**
 * Function to update WebSocket connection count
 */
export const updateConnectionCount = (count: number) => {
  globalMetrics.activeConnections = count;
};

// Health check endpoint (lightweight)
router.get('/status', (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024)
      },
      version: '5.0.0'
    };
    
    res.status(200).json(responseBuilder.success(status));
  } catch (error) {
    res.status(503).json(responseBuilder.error(
      'SERVICE_UNAVAILABLE',
      'Health check failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

export function createSystemHealthAPI(): Router {
  return router;
}

// Export for use in main API registration
export default router;