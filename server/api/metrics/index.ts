/**
 * Metrics API Endpoints
 * Prometheus-compatible metrics and performance monitoring
 */

import { Router, Request, Response } from 'express';
import { APIResponseBuilder } from '../versioning';
import { metricsRegistry } from '../../middleware/monitoring';
import { requirePermission } from '../../middleware/enhanced-security';

const router = Router();

// Prometheus metrics endpoint
router.get('/prometheus', (req: Request, res: Response) => {
  try {
    const prometheusMetrics = metricsRegistry.exportPrometheusMetrics();
    
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(prometheusMetrics);
  } catch (error) {
    res.status(500).send('# Error generating metrics\n');
  }
});

// JSON metrics endpoint
router.get('/json', requirePermission('admin:metrics'), (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    const allMetrics = metricsRegistry.getAllMetrics();
    res.status(200).json(responseBuilder.success(allMetrics));
  } catch (error) {
    res.status(500).json(responseBuilder.error(
      'INTERNAL_SERVER_ERROR',
      'Failed to retrieve metrics',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

// Health metrics summary
router.get('/health', (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    const healthMetrics = metricsRegistry.getHealthMetrics();
    res.status(200).json(responseBuilder.success(healthMetrics));
  } catch (error) {
    res.status(500).json(responseBuilder.error(
      'INTERNAL_SERVER_ERROR',
      'Failed to retrieve health metrics',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

// Performance metrics
router.get('/performance', requirePermission('admin:metrics'), (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    const allMetrics = metricsRegistry.getAllMetrics();
    
    // Filter performance-related metrics
    const performanceMetrics = {
      request_duration: allMetrics.metrics.http_request_duration_seconds || [],
      response_size: allMetrics.metrics.http_response_size_bytes || [],
      database_operations: allMetrics.metrics.db_operation_duration_seconds || [],
      error_rates: allMetrics.counters,
      timestamp: allMetrics.timestamp
    };
    
    res.status(200).json(responseBuilder.success(performanceMetrics));
  } catch (error) {
    res.status(500).json(responseBuilder.error(
      'INTERNAL_SERVER_ERROR',
      'Failed to retrieve performance metrics',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

// Security metrics
router.get('/security', requirePermission('admin:security'), (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    const allMetrics = metricsRegistry.getAllMetrics();
    
    // Filter security-related metrics
    const securityMetrics = {
      security_events: allMetrics.counters.security_events_total || 0,
      failed_logins: allMetrics.counters.login_failures_total || 0,
      rate_limit_violations: allMetrics.counters.rate_limit_exceeded_total || 0,
      authentication_errors: allMetrics.counters.authentication_errors_total || 0,
      timestamp: allMetrics.timestamp
    };
    
    res.status(200).json(responseBuilder.success(securityMetrics));
  } catch (error) {
    res.status(500).json(responseBuilder.error(
      'INTERNAL_SERVER_ERROR',
      'Failed to retrieve security metrics',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

export function createMetricsAPI(): Router {
  return router;
}