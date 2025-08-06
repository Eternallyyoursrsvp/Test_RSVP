/**
 * Enhanced Provider Health Monitoring System
 * Comprehensive monitoring for external service providers with intelligent failover
 */

import { performance } from 'perf_hooks';
import { metricsRegistry } from '../middleware/monitoring';

// Provider Types
export enum ProviderType {
  AUTH = 'auth',
  DATABASE = 'database',
  EMAIL = 'email',
  SMS = 'sms',
  PAYMENT = 'payment',
  STORAGE = 'storage',
  NOTIFICATION = 'notification',
  ANALYTICS = 'analytics',
  WHATSAPP = 'whatsapp'
}

// Health Status Levels
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

// Provider Configuration Interface
export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  endpoint?: string;
  timeout: number;
  retries: number;
  healthCheckPath?: string;
  healthCheckInterval: number;
  circuitBreakerThreshold: number;
  fallbackProvider?: string;
  customHealthCheck?: () => Promise<ProviderHealthResult>;
}

// Health Check Result Interface
export interface ProviderHealthResult {
  status: HealthStatus;
  latency: number;
  error?: string;
  details?: Record<string, any>;
  timestamp: number;
}

// Provider Health History
interface HealthHistory {
  checks: ProviderHealthResult[];
  uptime: number;
  downtime: number;
  lastHealthy: number;
  lastUnhealthy: number;
  consecutiveFailures: number;
}

// Circuit Breaker States
enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Provider failing, rejecting requests
  HALF_OPEN = 'half_open' // Testing if provider recovered
}

// Circuit Breaker for each provider
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextRetryTime = 0;
  private readonly resetTimeout = 60000; // 1 minute

  constructor(private threshold: number, private providerId: string) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextRetryTime) {
        throw new Error(`Circuit breaker OPEN for provider ${this.providerId}`);
      }
      this.state = CircuitBreakerState.HALF_OPEN;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitBreakerState.CLOSED;
    
    metricsRegistry.incrementCounter('circuit_breaker_success_total', {
      provider: this.providerId
    });
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextRetryTime = Date.now() + this.resetTimeout;
      
      console.warn(`🔴 Circuit breaker OPEN for provider ${this.providerId}`);
      
      metricsRegistry.incrementCounter('circuit_breaker_open_total', {
        provider: this.providerId
      });
    }

    metricsRegistry.incrementCounter('circuit_breaker_failure_total', {
      provider: this.providerId
    });
  }

  getState(): CircuitBreakerState {
    return this.state;
  }
}

// Enhanced Provider Health Monitor
export class ProviderHealthMonitor {
  private providers: Map<string, ProviderConfig> = new Map();
  private healthHistory: Map<string, HealthHistory> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  // Register a provider for monitoring
  registerProvider(config: ProviderConfig): void {
    this.providers.set(config.id, config);
    
    // Initialize health history
    this.healthHistory.set(config.id, {
      checks: [],
      uptime: 0,
      downtime: 0,
      lastHealthy: 0,
      lastUnhealthy: 0,
      consecutiveFailures: 0
    });

    // Initialize circuit breaker
    this.circuitBreakers.set(
      config.id, 
      new CircuitBreaker(config.circuitBreakerThreshold, config.id)
    );

    console.log(`✅ Registered provider: ${config.name} (${config.type})`);
  }

  // Start monitoring all registered providers
  startMonitoring(): void {
    if (this.isRunning) {
      console.warn('⚠️ Provider health monitoring already running');
      return;
    }

    this.isRunning = true;
    console.log('🩺 Starting provider health monitoring...');

    for (const [providerId, config] of this.providers) {
      this.scheduleHealthCheck(providerId, config);
    }

    console.log(`✅ Monitoring ${this.providers.size} providers`);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    // Clear all intervals
    for (const [providerId, interval] of this.healthCheckIntervals) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();

    console.log('⏹️ Provider health monitoring stopped');
  }

  // Schedule periodic health checks for a provider
  private scheduleHealthCheck(providerId: string, config: ProviderConfig): void {
    const interval = setInterval(async () => {
      await this.performHealthCheck(providerId);
    }, config.healthCheckInterval);

    this.healthCheckIntervals.set(providerId, interval);

    // Perform initial health check
    setImmediate(() => this.performHealthCheck(providerId));
  }

  // Perform health check for a specific provider
  async performHealthCheck(providerId: string): Promise<ProviderHealthResult> {
    const config = this.providers.get(providerId);
    if (!config) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const circuitBreaker = this.circuitBreakers.get(providerId)!;
    const startTime = performance.now();

    try {
      const result = await circuitBreaker.execute(async () => {
        if (config.customHealthCheck) {
          return await config.customHealthCheck();
        }
        return await this.defaultHealthCheck(config);
      });

      this.updateHealthHistory(providerId, result);
      this.updateMetrics(providerId, result);
      
      return result;

    } catch (error) {
      const latency = performance.now() - startTime;
      const result: ProviderHealthResult = {
        status: HealthStatus.UNHEALTHY,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };

      this.updateHealthHistory(providerId, result);
      this.updateMetrics(providerId, result);
      
      return result;
    }
  }

  // Default HTTP health check
  private async defaultHealthCheck(config: ProviderConfig): Promise<ProviderHealthResult> {
    const startTime = performance.now();
    
    if (!config.endpoint) {
      throw new Error(`No endpoint configured for provider ${config.id}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const healthUrl = config.endpoint + (config.healthCheckPath || '/health');
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'RSVP-Platform-HealthCheck/1.0',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);
      const latency = performance.now() - startTime;

      let status: HealthStatus;
      if (response.ok) {
        status = HealthStatus.HEALTHY;
      } else if (response.status >= 500) {
        status = HealthStatus.UNHEALTHY;
      } else {
        status = HealthStatus.DEGRADED;
      }

      let details: Record<string, any> = {
        status_code: response.status,
        response_time: latency
      };

      // Try to parse JSON response for additional details
      try {
        const responseText = await response.text();
        if (responseText) {
          details.response = JSON.parse(responseText);
        }
      } catch (parseError) {
        // Ignore parse errors
      }

      return {
        status,
        latency,
        details,
        timestamp: Date.now()
      };

    } catch (error) {
      clearTimeout(timeoutId);
      const latency = performance.now() - startTime;
      
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update health history for a provider
  private updateHealthHistory(providerId: string, result: ProviderHealthResult): void {
    const history = this.healthHistory.get(providerId)!;
    
    // Add to history (keep last 100 checks)
    history.checks.push(result);
    if (history.checks.length > 100) {
      history.checks.shift();
    }

    // Update statistics
    const now = Date.now();
    if (result.status === HealthStatus.HEALTHY) {
      history.lastHealthy = now;
      history.consecutiveFailures = 0;
    } else {
      history.lastUnhealthy = now;
      history.consecutiveFailures++;
    }

    // Calculate uptime/downtime (simplified)
    const recentChecks = history.checks.slice(-10); // Last 10 checks
    const healthyChecks = recentChecks.filter(c => c.status === HealthStatus.HEALTHY).length;
    history.uptime = (healthyChecks / recentChecks.length) * 100;
    history.downtime = 100 - history.uptime;
  }

  // Update metrics
  private updateMetrics(providerId: string, result: ProviderHealthResult): void {
    const config = this.providers.get(providerId)!;
    
    // Record latency
    metricsRegistry.recordHistogram('provider_health_check_duration_ms', result.latency, {
      provider: providerId,
      provider_type: config.type,
      status: result.status
    });

    // Record status
    metricsRegistry.incrementCounter('provider_health_checks_total', {
      provider: providerId,
      provider_type: config.type,
      status: result.status
    });

    // Record availability
    metricsRegistry.setGauge('provider_availability', 
      result.status === HealthStatus.HEALTHY ? 1 : 0, {
      provider: providerId,
      provider_type: config.type
    });

    // Log status changes
    const history = this.healthHistory.get(providerId)!;
    const previousCheck = history.checks[history.checks.length - 2];
    
    if (previousCheck && previousCheck.status !== result.status) {
      console.log(`🔄 Provider ${config.name} status changed: ${previousCheck.status} → ${result.status}`);
      
      metricsRegistry.incrementCounter('provider_status_changes_total', {
        provider: providerId,
        from_status: previousCheck.status,
        to_status: result.status
      });
    }
  }

  // Get health status for a specific provider
  getProviderHealth(providerId: string): {
    config: ProviderConfig;
    status: ProviderHealthResult | null;
    history: HealthHistory;
    circuitBreakerState: CircuitBreakerState;
  } | null {
    const config = this.providers.get(providerId);
    if (!config) return null;

    const history = this.healthHistory.get(providerId)!;
    const status = history.checks[history.checks.length - 1] || null;
    const circuitBreakerState = this.circuitBreakers.get(providerId)!.getState();

    return {
      config,
      status,
      history,
      circuitBreakerState
    };
  }

  // Get health status for all providers
  getAllProvidersHealth(): Record<string, ReturnType<typeof this.getProviderHealth>> {
    const result: Record<string, ReturnType<typeof this.getProviderHealth>> = {};
    
    for (const providerId of this.providers.keys()) {
      result[providerId] = this.getProviderHealth(providerId);
    }
    
    return result;
  }

  // Get providers by type
  getProvidersByType(type: ProviderType): string[] {
    return Array.from(this.providers.entries())
      .filter(([_, config]) => config.type === type)
      .map(([id, _]) => id);
  }

  // Get healthy providers by type
  getHealthyProvidersByType(type: ProviderType): string[] {
    return this.getProvidersByType(type)
      .filter(providerId => {
        const health = this.getProviderHealth(providerId);
        return health?.status?.status === HealthStatus.HEALTHY;
      });
  }

  // Get fallback provider for a given provider
  getFallbackProvider(providerId: string): string | null {
    const config = this.providers.get(providerId);
    if (!config || !config.fallbackProvider) return null;

    const fallbackHealth = this.getProviderHealth(config.fallbackProvider);
    if (fallbackHealth?.status?.status === HealthStatus.HEALTHY) {
      return config.fallbackProvider;
    }

    return null;
  }

  // Comprehensive health report
  generateHealthReport(): {
    summary: {
      totalProviders: number;
      healthyProviders: number;
      degradedProviders: number;
      unhealthyProviders: number;
      overallHealth: number;
    };
    providers: Record<string, any>;
    alerts: string[];
  } {
    const providers = this.getAllProvidersHealth();
    const alerts: string[] = [];
    
    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;
    
    const providerDetails: Record<string, any> = {};

    for (const [providerId, health] of Object.entries(providers)) {
      if (!health) continue;

      const status = health.status?.status || HealthStatus.UNKNOWN;
      
      switch (status) {
        case HealthStatus.HEALTHY:
          healthyCount++;
          break;
        case HealthStatus.DEGRADED:
          degradedCount++;
          alerts.push(`Provider ${health.config.name} is degraded`);
          break;
        case HealthStatus.UNHEALTHY:
          unhealthyCount++;
          alerts.push(`Provider ${health.config.name} is unhealthy`);
          break;
      }

      // Check for consecutive failures
      if (health.history.consecutiveFailures >= 3) {
        alerts.push(`Provider ${health.config.name} has ${health.history.consecutiveFailures} consecutive failures`);
      }

      // Check circuit breaker state
      if (health.circuitBreakerState === CircuitBreakerState.OPEN) {
        alerts.push(`Circuit breaker OPEN for provider ${health.config.name}`);
      }

      providerDetails[providerId] = {
        name: health.config.name,
        type: health.config.type,
        status: status,
        latency: health.status?.latency,
        uptime: health.history.uptime,
        consecutiveFailures: health.history.consecutiveFailures,
        circuitBreakerState: health.circuitBreakerState,
        lastHealthy: new Date(health.history.lastHealthy).toISOString(),
        lastCheck: health.status ? new Date(health.status.timestamp).toISOString() : null
      };
    }

    const totalProviders = this.providers.size;
    const overallHealth = totalProviders > 0 ? (healthyCount / totalProviders) * 100 : 0;

    return {
      summary: {
        totalProviders,
        healthyProviders: healthyCount,
        degradedProviders: degradedCount,
        unhealthyProviders: unhealthyCount,
        overallHealth: Math.round(overallHealth * 100) / 100
      },
      providers: providerDetails,
      alerts
    };
  }
}

// Global provider health monitor instance
export const providerHealthMonitor = new ProviderHealthMonitor();

// Default provider configurations
export const defaultProviderConfigs: ProviderConfig[] = [
  {
    id: 'supabase-auth',
    name: 'Supabase Authentication',
    type: ProviderType.AUTH,
    endpoint: process.env.SUPABASE_URL,
    timeout: 5000,
    retries: 3,
    healthCheckPath: '/health',
    healthCheckInterval: 30000, // 30 seconds
    circuitBreakerThreshold: 5
  },
  {
    id: 'postgresql-db',
    name: 'PostgreSQL Database',
    type: ProviderType.DATABASE,
    timeout: 3000,
    retries: 2,
    healthCheckInterval: 60000, // 1 minute
    circuitBreakerThreshold: 3,
    customHealthCheck: async () => {
      // Custom database health check would go here
      return {
        status: HealthStatus.HEALTHY,
        latency: 50,
        timestamp: Date.now(),
        details: { connection_pool: 'active' }
      };
    }
  },
  {
    id: 'whatsapp-api',
    name: 'WhatsApp Business API',
    type: ProviderType.WHATSAPP,
    endpoint: 'https://graph.facebook.com',
    timeout: 10000,
    retries: 3,
    healthCheckPath: '/v18.0/me',
    healthCheckInterval: 300000, // 5 minutes
    circuitBreakerThreshold: 5
  }
];

// Initialize provider monitoring
export function initializeProviderMonitoring(): void {
  console.log('🩺 Initializing provider health monitoring...');
  
  // Register default providers
  for (const config of defaultProviderConfigs) {
    providerHealthMonitor.registerProvider(config);
  }
  
  // Start monitoring
  providerHealthMonitor.startMonitoring();
  
  console.log('✅ Provider health monitoring initialized');
}

// Cleanup function
export function cleanupProviderMonitoring(): void {
  providerHealthMonitor.stopMonitoring();
  console.log('✅ Provider health monitoring cleaned up');
}