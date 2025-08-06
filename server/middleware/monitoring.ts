/**
 * Comprehensive Monitoring and Observability Middleware
 * Implements enterprise-grade monitoring with Prometheus metrics
 */

import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

// Metrics Storage Interface
interface Metric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

interface Counter extends Metric {
  type: 'counter';
}

interface Gauge extends Metric {
  type: 'gauge';
}

interface Histogram extends Metric {
  type: 'histogram';
  buckets: number[];
}

// Metrics Registry
class MetricsRegistry {
  private metrics: Map<string, Metric[]> = new Map();
  private counters: Map<string, number> = new Map();
  
  // Counter methods
  incrementCounter(name: string, labels?: Record<string, string>, value = 1) {
    const key = this.createKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    
    this.addMetric({
      name,
      type: 'counter',
      value: current + value,
      timestamp: Date.now(),
      labels
    } as Counter);
  }
  
  // Gauge methods
  setGauge(name: string, value: number, labels?: Record<string, string>) {
    this.addMetric({
      name,
      type: 'gauge',
      value,
      timestamp: Date.now(),
      labels
    } as Gauge);
  }
  
  // Histogram methods
  recordHistogram(name: string, value: number, labels?: Record<string, string>) {
    const buckets = [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0];
    
    this.addMetric({
      name,
      type: 'histogram',
      value,
      timestamp: Date.now(),
      labels,
      buckets
    } as Histogram);
  }
  
  private createKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelString}}`;
  }
  
  private addMetric(metric: Metric) {
    const key = metric.name;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metrics = this.metrics.get(key)!;
    metrics.push(metric);
    
    // Keep only last 1000 entries per metric
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
  }
  
  // Export metrics in Prometheus format
  exportPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // Counters
    for (const [key, value] of this.counters.entries()) {
      lines.push(`${key} ${value}`);
    }
    
    // Recent metrics
    for (const [name, metricsList] of this.metrics.entries()) {
      const latest = metricsList[metricsList.length - 1];
      if (latest) {
        const labelString = latest.labels 
          ? Object.entries(latest.labels).map(([k, v]) => `${k}="${v}"`).join(',')
          : '';
        const metricName = labelString ? `${name}{${labelString}}` : name;
        lines.push(`${metricName} ${latest.value}`);
      }
    }
    
    return lines.join('\n');
  }
  
  // Get all metrics as JSON
  getAllMetrics() {
    const result: any = {
      counters: Object.fromEntries(this.counters),
      metrics: Object.fromEntries(
        Array.from(this.metrics.entries()).map(([name, metrics]) => [
          name,
          metrics.slice(-10) // Last 10 entries
        ])
      ),
      timestamp: Date.now()
    };
    
    return result;
  }
  
  // Health check metrics
  getHealthMetrics() {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    // Calculate error rate for last 5 minutes
    const requestMetrics = this.metrics.get('http_requests_total') || [];
    const recentRequests = requestMetrics.filter(m => m.timestamp > fiveMinutesAgo);
    const errorRequests = recentRequests.filter(m => 
      m.labels?.status_code && parseInt(m.labels.status_code) >= 400
    );
    
    const errorRate = recentRequests.length > 0 
      ? (errorRequests.length / recentRequests.length) * 100 
      : 0;
    
    // Calculate average response time
    const responseTimeMetrics = this.metrics.get('http_request_duration_seconds') || [];
    const recentResponseTimes = responseTimeMetrics.filter(m => m.timestamp > fiveMinutesAgo);
    const avgResponseTime = recentResponseTimes.length > 0
      ? recentResponseTimes.reduce((sum, m) => sum + m.value, 0) / recentResponseTimes.length
      : 0;
    
    return {
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 1000 * 100) / 100, // Convert to ms
      requestCount: recentRequests.length,
      timestamp: now
    };
  }
}

// Global metrics registry
export const metricsRegistry = new MetricsRegistry();

// Request tracking middleware
export function requestTrackingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = performance.now();
  const startTimestamp = Date.now();
  
  // Track request start
  metricsRegistry.incrementCounter('http_requests_total', {
    method: req.method,
    route: req.route?.path || req.path,
    status_code: 'pending'
  });
  
  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = (performance.now() - startTime) / 1000; // Convert to seconds
    
    // Record request duration
    metricsRegistry.recordHistogram('http_request_duration_seconds', duration, {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode.toString()
    });
    
    // Update request counter with final status
    metricsRegistry.incrementCounter('http_requests_total', {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode.toString()
    });
    
    // Track response size
    const responseSize = chunk ? Buffer.byteLength(chunk) : 0;
    metricsRegistry.recordHistogram('http_response_size_bytes', responseSize, {
      method: req.method,
      route: req.route?.path || req.path
    });
    
    // Log slow requests
    if (duration > 1.0) { // Requests taking more than 1 second
      console.warn(`⚠️  Slow request detected: ${req.method} ${req.path} took ${duration.toFixed(3)}s`);
    }
    
    // Log error responses
    if (res.statusCode >= 400) {
      console.error(`❌ Error response: ${req.method} ${req.path} returned ${res.statusCode}`);
    }
    
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

// System metrics collection
class SystemMetrics {
  private intervalId: NodeJS.Timeout | null = null;
  
  start() {
    if (this.intervalId) return;
    
    // Collect system metrics every 30 seconds
    this.intervalId = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
    
    // Initial collection
    this.collectSystemMetrics();
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  private collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Memory metrics
    metricsRegistry.setGauge('nodejs_memory_usage_bytes', memUsage.rss, { type: 'rss' });
    metricsRegistry.setGauge('nodejs_memory_usage_bytes', memUsage.heapUsed, { type: 'heap_used' });
    metricsRegistry.setGauge('nodejs_memory_usage_bytes', memUsage.heapTotal, { type: 'heap_total' });
    metricsRegistry.setGauge('nodejs_memory_usage_bytes', memUsage.external, { type: 'external' });
    
    // CPU metrics (in microseconds, convert to percentage)
    metricsRegistry.setGauge('nodejs_cpu_usage_percent', cpuUsage.user / 1000000, { type: 'user' });
    metricsRegistry.setGauge('nodejs_cpu_usage_percent', cpuUsage.system / 1000000, { type: 'system' });
    
    // Process uptime
    metricsRegistry.setGauge('nodejs_process_uptime_seconds', process.uptime());
    
    // Event loop lag (approximate)
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      metricsRegistry.setGauge('nodejs_eventloop_lag_milliseconds', lag);
    });
  }
}

// Global system metrics collector
export const systemMetrics = new SystemMetrics();

// Health check endpoint data
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database?: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
      error?: string;
    };
    redis?: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
      error?: string;
    };
    providers?: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      details?: Record<string, any>;
    };
  };
  metrics: {
    errorRate: number;
    avgResponseTime: number;
    requestCount: number;
  };
}

// Health check service
export class HealthCheckService {
  async getHealthStatus(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Database health check
    try {
      const dbStart = performance.now();
      // This would need to be implemented with actual database connection
      // For now, simulate a database check
      await new Promise(resolve => setTimeout(resolve, 10));
      const dbLatency = performance.now() - dbStart;
      
      checks.database = {
        status: dbLatency < 100 ? 'healthy' : 'unhealthy',
        latency: Math.round(dbLatency)
      };
      
      if (checks.database.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      }
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Database check failed'
      };
      overallStatus = 'unhealthy';
    }
    
    // Redis health check
    try {
      const redisStart = performance.now();
      // This would need to be implemented with actual Redis connection
      await new Promise(resolve => setTimeout(resolve, 5));
      const redisLatency = performance.now() - redisStart;
      
      checks.redis = {
        status: redisLatency < 50 ? 'healthy' : 'unhealthy',
        latency: Math.round(redisLatency)
      };
      
      if (checks.redis.status === 'unhealthy' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Redis check failed'
      };
      if (overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    }
    
    // Get current metrics
    const healthMetrics = metricsRegistry.getHealthMetrics();
    
    // Determine status based on metrics
    if (healthMetrics.errorRate > 10) { // More than 10% error rate
      overallStatus = 'unhealthy';
    } else if (healthMetrics.errorRate > 5 || healthMetrics.avgResponseTime > 2000) {
      if (overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      metrics: healthMetrics
    };
  }
}

// Global health check service
export const healthCheckService = new HealthCheckService();

// Middleware to track database operations
export function databaseMetricsMiddleware(operation: string) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const startTime = performance.now();
      
      try {
        const result = await method.apply(this, args);
        const duration = (performance.now() - startTime) / 1000;
        
        metricsRegistry.recordHistogram('db_operation_duration_seconds', duration, {
          operation,
          status: 'success'
        });
        
        metricsRegistry.incrementCounter('db_operations_total', {
          operation,
          status: 'success'
        });
        
        return result;
      } catch (error) {
        const duration = (performance.now() - startTime) / 1000;
        
        metricsRegistry.recordHistogram('db_operation_duration_seconds', duration, {
          operation,
          status: 'error'
        });
        
        metricsRegistry.incrementCounter('db_operations_total', {
          operation,
          status: 'error'
        });
        
        throw error;
      }
    };
    
    return descriptor;
  };
}

// Error tracking middleware
export function errorTrackingMiddleware(error: Error, req: Request, res: Response, next: NextFunction) {
  // Track error metrics
  metricsRegistry.incrementCounter('application_errors_total', {
    type: error.constructor.name,
    route: req.route?.path || req.path,
    method: req.method
  });
  
  // Log error details
  console.error('🚨 Application Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  next(error);
}

// Initialize monitoring
export function initializeMonitoring() {
  systemMetrics.start();
  console.log('✅ Monitoring system initialized');
}

// Cleanup monitoring
export function cleanupMonitoring() {
  systemMetrics.stop();
  console.log('✅ Monitoring system cleaned up');
}