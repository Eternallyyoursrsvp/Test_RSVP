/**
 * Health Check API Endpoints
 * Comprehensive health monitoring and diagnostics
 */

import { Router, Request, Response } from 'express';
import { APIResponseBuilder } from '../versioning';
import { healthCheckService } from '../../middleware/monitoring';
import { providerHealthMonitor } from '../../services/provider-health-monitor';
import { schemaValidationService } from '../../database/schema-validation';
import { testDb } from '../../../tests/infrastructure/test-infrastructure';

const router = Router();

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    const health = await healthCheckService.getHealthStatus();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 206 : 503;
    
    res.status(statusCode).json(responseBuilder.success(health));
  } catch (error) {
    res.status(503).json(responseBuilder.error(
      'SERVICE_UNAVAILABLE',
      'Health check failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

// Detailed health report
router.get('/detailed', async (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    // Get system health
    const systemHealth = await healthCheckService.getHealthStatus();
    
    // Get provider health
    const providerHealth = providerHealthMonitor.generateHealthReport();
    
    // Get database health if available
    let databaseHealth;
    try {
      if (testDb) {
        databaseHealth = await schemaValidationService.performHealthCheck(testDb);
      }
    } catch (error) {
      databaseHealth = {
        status: 'unknown',
        issues: ['Health check not available'],
        metrics: {}
      };
    }
    
    const detailedHealth = {
      system: systemHealth,
      providers: providerHealth,
      database: databaseHealth,
      timestamp: new Date().toISOString()
    };
    
    // Determine overall status
    const overallStatus = systemHealth.status === 'unhealthy' || 
                         providerHealth.summary.overallHealth < 50 ||
                         databaseHealth?.status === 'critical' ? 'unhealthy' :
                         systemHealth.status === 'degraded' ||
                         providerHealth.summary.overallHealth < 80 ||
                         databaseHealth?.status === 'warning' ? 'degraded' : 'healthy';
    
    const statusCode = overallStatus === 'healthy' ? 200 :
                      overallStatus === 'degraded' ? 206 : 503;
    
    res.status(statusCode).json(responseBuilder.success({
      status: overallStatus,
      ...detailedHealth
    }));
    
  } catch (error) {
    res.status(503).json(responseBuilder.error(
      'SERVICE_UNAVAILABLE',
      'Detailed health check failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

// Readiness probe (Kubernetes-style)
router.get('/ready', async (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    // Check critical dependencies
    const health = await healthCheckService.getHealthStatus();
    const providerHealth = providerHealthMonitor.generateHealthReport();
    
    const isReady = health.status !== 'unhealthy' && 
                   providerHealth.summary.overallHealth > 50;
    
    if (isReady) {
      res.status(200).json(responseBuilder.success({
        ready: true,
        message: 'Service is ready to accept traffic'
      }));
    } else {
      res.status(503).json(responseBuilder.error(
        'SERVICE_UNAVAILABLE',
        'Service not ready',
        {
          systemHealth: health.status,
          providerHealth: providerHealth.summary.overallHealth
        }
      ));
    }
  } catch (error) {
    res.status(503).json(responseBuilder.error(
      'SERVICE_UNAVAILABLE',
      'Readiness check failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

// Liveness probe (Kubernetes-style)
router.get('/live', async (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    // Simple liveness check - just verify the service is responsive
    const startTime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.status(200).json(responseBuilder.success({
      alive: true,
      uptime: Math.floor(startTime),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024)
      },
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    res.status(503).json(responseBuilder.error(
      'SERVICE_UNAVAILABLE',
      'Liveness check failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

// Provider-specific health checks
router.get('/providers', async (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    const providerHealth = providerHealthMonitor.generateHealthReport();
    res.status(200).json(responseBuilder.success(providerHealth));
  } catch (error) {
    res.status(500).json(responseBuilder.error(
      'INTERNAL_SERVER_ERROR',
      'Provider health check failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

// Provider-specific health check
router.get('/providers/:providerId', async (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  const { providerId } = req.params;
  
  try {
    const providerHealth = providerHealthMonitor.getProviderHealth(providerId);
    
    if (!providerHealth) {
      return res.status(404).json(responseBuilder.error(
        'NOT_FOUND',
        `Provider '${providerId}' not found`
      ));
    }
    
    const statusCode = providerHealth.status?.status === 'healthy' ? 200 :
                      providerHealth.status?.status === 'degraded' ? 206 : 503;
    
    res.status(statusCode).json(responseBuilder.success(providerHealth));
  } catch (error) {
    res.status(500).json(responseBuilder.error(
      'INTERNAL_SERVER_ERROR',
      'Provider health check failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

// Trigger manual health check for a provider
router.post('/providers/:providerId/check', async (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  const { providerId } = req.params;
  
  try {
    const result = await providerHealthMonitor.performHealthCheck(providerId);
    
    const statusCode = result.status === 'healthy' ? 200 :
                      result.status === 'degraded' ? 206 : 503;
    
    res.status(statusCode).json(responseBuilder.success({
      providerId,
      ...result
    }));
  } catch (error) {
    res.status(500).json(responseBuilder.error(
      'INTERNAL_SERVER_ERROR',
      'Manual health check failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

export function createHealthAPI(): Router {
  return router;
}