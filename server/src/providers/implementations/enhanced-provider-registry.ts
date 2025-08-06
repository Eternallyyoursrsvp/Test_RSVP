/**
 * Enhanced Provider Registry Implementation
 * 
 * Extends the base provider registry with multi-service providers,
 * automated setup, wizard integration, and enterprise management.
 */

import {
  IEnhancedProviderRegistry,
  IEnhancedProviderFactory,
  IEnhancedProvider,
  ProviderSummary,
  ProviderDetails,
  HealthSummary,
  MetricsSummary,
  ProviderQuery,
  RegistryInfo,
  RegistryMetrics,
  RegistryHealth,
  StartOptions,
  StopOptions,
  RestartOptions,
  ValidationResult,
  TestResult,
  ProviderRegistryError,
  ProviderNotFoundError,
  ProviderStartupError
} from '../interfaces/enhanced-provider-registry';

import {
  ProviderType,
  ProviderConfiguration,
  ProviderStatus,
  ProviderMetrics,
  ProviderEvent,
  MultiServiceProvider,
  WizardStep,
  StepResult
} from '../interfaces/provider-types';

import { IProviderConfigManager } from '../interfaces/provider-config';

interface EnhancedProviderInstance {
  info: {
    name: string;
    type: ProviderType;
    category: string;
    version: string;
    status: ProviderStatus['status'];
    health: ProviderStatus['health'];
    description?: string;
    tags?: string[];
    capabilities: string[];
    isMultiService: boolean;
    services?: string[];
    registeredAt: Date;
    lastHealthCheck?: Date;
    errors: number;
    warnings: number;
    uptime: number;
  };
  instance: IEnhancedProvider;
  config: ProviderConfiguration;
  dependencies: EnhancedProviderInstance[];
  dependents: EnhancedProviderInstance[];
}

export class EnhancedProviderRegistry implements IEnhancedProviderRegistry {
  private factories = new Map<string, IEnhancedProviderFactory>();
  private providers = new Map<string, EnhancedProviderInstance>();
  private configManager: IProviderConfigManager | null = null;
  private eventListeners = new Map<string, Set<Function>>();
  private eventHistory: ProviderEvent[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private startTime = new Date();
  private isInitialized = false;
  
  private readonly providerMetrics = new Map<string, ProviderMetrics[]>();
  private readonly MAX_EVENT_HISTORY = 1000;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly METRICS_COLLECTION_INTERVAL = 60000; // 1 minute

  async initialize(configManager: IProviderConfigManager): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.configManager = configManager;
    
    // Register built-in enhanced factories
    await this.registerBuiltInFactories();
    
    // Load providers from configuration
    await this.loadProvidersFromConfig();
    
    // Start monitoring
    this.startHealthMonitoring();
    this.startMetricsCollection();
    
    this.isInitialized = true;
    this.emit('registry_initialized');
    
    console.log('✅ Enhanced Provider Registry initialized');
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Registry not initialized');
    }

    console.log('🚀 Starting Enhanced Provider Registry...');
    
    // Resolve dependencies
    await this.resolveDependencies();
    
    // Start providers in dependency order
    const startupOrder = this.getStartupOrder();
    
    for (const providerName of startupOrder) {
      try {
        await this.startProvider(providerName);
      } catch (error) {
        console.error(`❌ Failed to start provider ${providerName}:`, error);
        this.emit('provider_failed', providerName, error);
      }
    }
    
    console.log('✅ Enhanced Provider Registry started');
  }

  async stop(): Promise<void> {
    console.log('🔄 Stopping Enhanced Provider Registry...');
    
    // Stop monitoring
    this.stopHealthMonitoring();
    this.stopMetricsCollection();
    
    // Stop providers in reverse dependency order
    const startupOrder = this.getStartupOrder();
    const shutdownOrder = [...startupOrder].reverse();
    
    for (const providerName of shutdownOrder) {
      try {
        await this.stopProvider(providerName);
      } catch (error) {
        console.error(`❌ Error stopping provider ${providerName}:`, error);
      }
    }
    
    console.log('✅ Enhanced Provider Registry stopped');
  }

  async destroy(): Promise<void> {
    await this.stop();
    
    // Destroy all provider instances
    for (const [name, providerInstance] of this.providers) {
      try {
        await providerInstance.instance.destroy();
      } catch (error) {
        console.error(`❌ Error destroying provider ${name}:`, error);
      }
    }
    
    this.providers.clear();
    this.factories.clear();
    this.eventListeners.clear();
    this.eventHistory = [];
    this.providerMetrics.clear();
    this.isInitialized = false;
    
    console.log('✅ Enhanced Provider Registry destroyed');
  }

  // Factory management
  registerFactory(factory: IEnhancedProviderFactory): void {
    this.factories.set(factory.name, factory);
    console.log(`📦 Registered enhanced provider factory: ${factory.name} (supports: ${factory.getSupportedTypes().join(', ')})`);
  }

  unregisterFactory(factoryName: string): boolean {
    const deleted = this.factories.delete(factoryName);
    if (deleted) {
      console.log(`📦 Unregistered enhanced provider factory: ${factoryName}`);
    }
    return deleted;
  }

  listFactories(): string[] {
    return Array.from(this.factories.keys());
  }

  // Provider management
  async registerProvider(name: string, type: ProviderType, config: ProviderConfiguration): Promise<void> {
    if (this.providers.has(name)) {
      throw new Error(`Provider '${name}' is already registered`);
    }

    // Find appropriate factory
    const factory = this.findFactoryForType(type);
    if (!factory) {
      throw new Error(`No factory found for provider type '${type}'`);
    }

    try {
      // Validate configuration
      const validation = await factory.validateConfig(type, config);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      // Create provider instance
      const providerInstance = await factory.createProvider(type, config);
      
      // Get provider info
      const providerInfo = factory.getProviderInfo(type);
      
      // Create enhanced provider info
      const info = {
        name,
        type,
        category: providerInfo.category,
        version: providerInstance.version,
        status: 'stopped' as const,
        health: 'unhealthy' as const,
        description: config.description || providerInfo.description,
        tags: config.tags || providerInfo.tags,
        capabilities: providerInstance.getCapabilities(),
        isMultiService: providerInstance.isMultiService(),
        services: providerInstance.isMultiService() ? 
          providerInstance.getMultiServiceProvider?.()?.getAvailableServices() : undefined,
        registeredAt: new Date(),
        errors: 0,
        warnings: 0,
        uptime: 0
      };

      // Store provider instance
      const instance: EnhancedProviderInstance = {
        info,
        instance: providerInstance,
        config,
        dependencies: [],
        dependents: []
      };

      this.providers.set(name, instance);
      this.emit('provider_registered', name, { type, config, info });
      
      console.log(`✅ Registered enhanced provider: ${name} (${type})`);
      
    } catch (error) {
      throw new ProviderStartupError(name, error as Error);
    }
  }

  async unregisterProvider(name: string): Promise<boolean> {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      return false;
    }

    try {
      // Stop and destroy the provider
      await this.stopProvider(name, { force: true });
      await providerInstance.instance.destroy();
      
      // Remove from dependents
      for (const dependent of providerInstance.dependents) {
        const depIndex = dependent.dependencies.indexOf(providerInstance);
        if (depIndex >= 0) {
          dependent.dependencies.splice(depIndex, 1);
        }
      }
      
      this.providers.delete(name);
      this.providerMetrics.delete(name);
      this.emit('provider_unregistered', name);
      
      console.log(`✅ Unregistered enhanced provider: ${name}`);
      return true;
      
    } catch (error) {
      throw new ProviderStartupError(name, error as Error);
    }
  }

  getProvider<T extends IEnhancedProvider = IEnhancedProvider>(name: string): T | undefined {
    const providerInstance = this.providers.get(name);
    return providerInstance?.instance as T;
  }

  listProviders(type?: ProviderType): ProviderSummary[] {
    const providers = Array.from(this.providers.values());
    
    return providers
      .filter(p => !type || p.info.type === type)
      .map(p => ({
        name: p.info.name,
        type: p.info.type,
        category: p.info.category,
        status: p.info.status,
        health: p.info.health,
        version: p.info.version,
        uptime: p.info.uptime,
        capabilities: p.info.capabilities,
        isMultiService: p.info.isMultiService,
        services: p.info.services
      }));
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  // Enhanced management
  getProviderInfo(name: string): ProviderDetails | undefined {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      return undefined;
    }

    return {
      name: providerInstance.info.name,
      type: providerInstance.info.type,
      category: providerInstance.info.category,
      status: providerInstance.info.status,
      health: providerInstance.info.health,
      version: providerInstance.info.version,
      uptime: providerInstance.info.uptime,
      capabilities: providerInstance.info.capabilities,
      isMultiService: providerInstance.info.isMultiService,
      services: providerInstance.info.services,
      description: providerInstance.info.description || '',
      configuration: providerInstance.config,
      dependencies: providerInstance.dependencies.map(d => d.info.name),
      dependents: providerInstance.dependents.map(d => d.info.name),
      lastHealthCheck: providerInstance.info.lastHealthCheck || new Date(),
      errors: providerInstance.info.errors,
      warnings: providerInstance.info.warnings,
      performance: {
        responseTime: 0,
        throughput: 0,
        errorRate: 0
      },
      features: Object.keys(providerInstance.config.features || {}),
      tags: providerInstance.info.tags || []
    };
  }

  getProvidersByCategory(category: string): ProviderSummary[] {
    return Array.from(this.providers.values())
      .filter(p => p.info.category === category)
      .map(p => ({
        name: p.info.name,
        type: p.info.type,
        category: p.info.category,
        status: p.info.status,
        health: p.info.health,
        version: p.info.version,
        uptime: p.info.uptime,
        capabilities: p.info.capabilities,
        isMultiService: p.info.isMultiService,
        services: p.info.services
      }));
  }

  getProvidersByCapability(capability: string): ProviderSummary[] {
    return Array.from(this.providers.values())
      .filter(p => p.info.capabilities.includes(capability))
      .map(p => ({
        name: p.info.name,
        type: p.info.type,
        category: p.info.category,
        status: p.info.status,
        health: p.info.health,
        version: p.info.version,
        uptime: p.info.uptime,
        capabilities: p.info.capabilities,
        isMultiService: p.info.isMultiService,
        services: p.info.services
      }));
  }

  // Lifecycle management
  async startProvider(name: string, options: StartOptions = {}): Promise<void> {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      throw new ProviderNotFoundError(name);
    }

    if (providerInstance.info.status === 'active') {
      return;
    }

    try {
      providerInstance.info.status = 'starting';
      this.emit('provider_starting', name);
      
      // Start dependencies first if requested
      if (options.dependencies) {
        for (const dep of providerInstance.dependencies) {
          if (dep.info.status !== 'active') {
            await this.startProvider(dep.info.name, options);
          }
        }
      }
      
      // Start provider with timeout
      const timeout = options.timeout || 30000;
      await Promise.race([
        providerInstance.instance.start(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Start timeout')), timeout)
        )
      ]);
      
      providerInstance.info.status = 'active';
      providerInstance.info.health = 'healthy';
      this.emit('provider_started', name);
      
      console.log(`✅ Started enhanced provider: ${name}`);
      
    } catch (error) {
      providerInstance.info.status = 'failed';
      providerInstance.info.health = 'unhealthy';
      providerInstance.info.errors++;
      this.emit('provider_failed', name, error);
      throw new ProviderStartupError(name, error as Error);
    }
  }

  async stopProvider(name: string, options: StopOptions = {}): Promise<void> {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      throw new ProviderNotFoundError(name);
    }

    if (providerInstance.info.status === 'stopped') {
      return;
    }

    try {
      // Stop dependents first if requested
      if (options.dependents) {
        for (const dependent of providerInstance.dependents) {
          if (dependent.info.status === 'active') {
            await this.stopProvider(dependent.info.name, options);
          }
        }
      }
      
      // Stop provider with timeout
      const timeout = options.timeout || 30000;
      if (options.graceful) {
        await Promise.race([
          providerInstance.instance.stop(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Stop timeout')), timeout)
          )
        ]);
      } else if (options.force) {
        // Force stop - may not be graceful
        await providerInstance.instance.stop();
      } else {
        await providerInstance.instance.stop();
      }
      
      providerInstance.info.status = 'stopped';
      providerInstance.info.health = 'unhealthy';
      this.emit('provider_stopped', name);
      
      console.log(`✅ Stopped enhanced provider: ${name}`);
      
    } catch (error) {
      throw new ProviderStartupError(name, error as Error);
    }
  }

  async restartProvider(name: string, options: RestartOptions = {}): Promise<void> {
    console.log(`🔄 Restarting provider: ${name}${options.reason ? ` (${options.reason})` : ''}`);
    
    await this.stopProvider(name, options);
    await this.startProvider(name, options);
    
    this.emit('provider_restarted', name, options.reason);
  }

  async startAllProviders(options: StartOptions = {}): Promise<void> {
    const startupOrder = this.getStartupOrder();
    
    for (const providerName of startupOrder) {
      try {
        await this.startProvider(providerName, options);
      } catch (error) {
        console.error(`❌ Failed to start provider ${providerName}:`, error);
        if (!options.force) {
          throw error;
        }
      }
    }
  }

  async stopAllProviders(options: StopOptions = {}): Promise<void> {
    const startupOrder = this.getStartupOrder();
    const shutdownOrder = [...startupOrder].reverse();
    
    for (const providerName of shutdownOrder) {
      try {
        await this.stopProvider(providerName, options);
      } catch (error) {
        console.error(`❌ Failed to stop provider ${providerName}:`, error);
        if (!options.force) {
          throw error;
        }
      }
    }
  }

  async restartAllProviders(options: RestartOptions = {}): Promise<void> {
    await this.stopAllProviders(options);
    await this.startAllProviders(options);
  }

  // Configuration management
  async updateProviderConfig(name: string, config: Partial<ProviderConfiguration>): Promise<void> {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      throw new ProviderNotFoundError(name);
    }

    try {
      const updatedConfig = { ...providerInstance.config, ...config };
      
      // Validate updated configuration
      const validation = await providerInstance.instance.validateConfig(updatedConfig);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }
      
      await providerInstance.instance.updateConfig(updatedConfig);
      providerInstance.config = updatedConfig;
      
      this.emit('provider_config_updated', name, updatedConfig);
      console.log(`✅ Updated config for enhanced provider: ${name}`);
      
    } catch (error) {
      throw new ProviderStartupError(name, error as Error);
    }
  }

  async reloadProviderConfig(name: string): Promise<void> {
    if (!this.configManager) {
      throw new Error('Config manager not available');
    }

    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      throw new ProviderNotFoundError(name);
    }

    // Reload config from config manager
    const newConfig = this.configManager.getProviderConfig(providerInstance.info.type, name);
    if (newConfig) {
      await this.updateProviderConfig(name, newConfig);
    }
  }

  async reloadAllConfigs(): Promise<void> {
    if (!this.configManager) {
      throw new Error('Config manager not available');
    }

    await this.configManager.reloadConfig();
    
    for (const providerName of this.providers.keys()) {
      try {
        await this.reloadProviderConfig(providerName);
      } catch (error) {
        console.error(`❌ Failed to reload config for ${providerName}:`, error);
      }
    }
  }

  async exportConfiguration(): Promise<string> {
    const config = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      providers: Array.from(this.providers.entries()).map(([name, instance]) => ({
        name,
        type: instance.info.type,
        config: instance.config
      }))
    };
    
    return JSON.stringify(config, null, 2);
  }

  async importConfiguration(configData: string): Promise<void> {
    try {
      const config = JSON.parse(configData);
      
      if (!config.providers || !Array.isArray(config.providers)) {
        throw new Error('Invalid configuration format');
      }
      
      for (const providerConfig of config.providers) {
        if (this.hasProvider(providerConfig.name)) {
          await this.updateProviderConfig(providerConfig.name, providerConfig.config);
        } else {
          await this.registerProvider(providerConfig.name, providerConfig.type, providerConfig.config);
        }
      }
      
      this.emit('configuration_imported');
      
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Health and monitoring
  async checkProviderHealth(name: string): Promise<ProviderStatus> {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      throw new ProviderNotFoundError(name);
    }

    try {
      const health = await providerInstance.instance.getDetailedHealth();
      
      // Update cached info
      providerInstance.info.lastHealthCheck = new Date();
      providerInstance.info.status = health.status;
      providerInstance.info.health = health.health;
      providerInstance.info.errors = health.errors;
      providerInstance.info.warnings = health.warnings;
      providerInstance.info.uptime = health.uptime;
      
      if (health.health === 'unhealthy' && providerInstance.info.status === 'active') {
        this.emit('provider_health_degraded', name, health);
      }
      
      return health;
      
    } catch (error) {
      const errorHealth: ProviderStatus = {
        status: 'failed',
        health: 'unhealthy',
        uptime: 0,
        lastCheck: new Date(),
        errors: providerInstance.info.errors + 1,
        warnings: providerInstance.info.warnings,
        performance: { responseTime: 0, throughput: 0, errorRate: 1 },
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
      
      providerInstance.info.errors++;
      this.emit('provider_health_check_failed', name, error);
      
      return errorHealth;
    }
  }

  async checkAllHealth(): Promise<Record<string, ProviderStatus>> {
    const healthResults: Record<string, ProviderStatus> = {};
    
    const promises = Array.from(this.providers.keys()).map(async name => {
      try {
        healthResults[name] = await this.checkProviderHealth(name);
      } catch (error) {
        console.error(`❌ Health check failed for ${name}:`, error);
      }
    });
    
    await Promise.allSettled(promises);
    return healthResults;
  }

  async getHealthSummary(): Promise<HealthSummary> {
    const healthResults = await this.checkAllHealth();
    const providers = Array.from(this.providers.values());
    
    const totalProviders = providers.length;
    const healthyProviders = Object.values(healthResults).filter(h => h.health === 'healthy').length;
    const degradedProviders = Object.values(healthResults).filter(h => h.health === 'degraded').length;
    const unhealthyProviders = Object.values(healthResults).filter(h => h.health === 'unhealthy').length;
    const stoppedProviders = providers.filter(p => p.info.status === 'stopped').length;
    
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyProviders > 0 || stoppedProviders > totalProviders / 2) {
      overallHealth = 'unhealthy';
    } else if (degradedProviders > 0) {
      overallHealth = 'degraded';
    }
    
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    
    for (const [name, health] of Object.entries(healthResults)) {
      if (health.health === 'unhealthy') {
        criticalIssues.push(`Provider ${name} is unhealthy: ${health.details?.error || 'Unknown issue'}`);
      } else if (health.health === 'degraded') {
        warnings.push(`Provider ${name} is degraded`);
      }
    }
    
    return {
      totalProviders,
      healthyProviders,
      degradedProviders,
      unhealthyProviders,
      stoppedProviders,
      overallHealth,
      criticalIssues,
      warnings
    };
  }

  // Metrics and analytics
  async getProviderMetrics(name: string): Promise<ProviderMetrics> {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      throw new ProviderNotFoundError(name);
    }

    return providerInstance.instance.getMetrics();
  }

  async getAllMetrics(): Promise<Record<string, ProviderMetrics>> {
    const metricsResults: Record<string, ProviderMetrics> = {};
    
    const promises = Array.from(this.providers.keys()).map(async name => {
      try {
        metricsResults[name] = await this.getProviderMetrics(name);
      } catch (error) {
        console.error(`❌ Metrics collection failed for ${name}:`, error);
      }
    });
    
    await Promise.allSettled(promises);
    return metricsResults;
  }

  async getMetricsSummary(): Promise<MetricsSummary> {
    const allMetrics = await this.getAllMetrics();
    const providers = Array.from(this.providers.values());
    
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    let metricCount = 0;
    
    const resourceUsage = {
      cpu: 0,
      memory: 0,
      disk: 0,
      connections: 0
    };
    
    for (const metrics of Object.values(allMetrics)) {
      totalRequests += metrics.requests?.total || 0;
      successfulRequests += metrics.requests?.successful || 0;
      failedRequests += metrics.requests?.failed || 0;
      totalResponseTime += metrics.performance?.avgResponseTime || 0;
      metricCount++;
      
      resourceUsage.cpu += metrics.resources?.cpuUsage || 0;
      resourceUsage.memory += metrics.resources?.memoryUsage || 0;
      resourceUsage.disk += metrics.resources?.diskUsage || 0;
      resourceUsage.connections += metrics.resources?.connections || 0;
    }
    
    const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0;
    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;
    const avgResponseTime = metricCount > 0 ? totalResponseTime / metricCount : 0;
    
    // Determine top performers and bottlenecks
    const performanceData = Object.entries(allMetrics).map(([name, metrics]) => ({
      name,
      responseTime: metrics.performance?.avgResponseTime || 0,
      successRate: metrics.requests?.total ? 
        (metrics.requests.successful || 0) / metrics.requests.total : 0
    }));
    
    const topPerformers = performanceData
      .filter(p => p.successRate > 0.95)
      .sort((a, b) => a.responseTime - b.responseTime)
      .slice(0, 3)
      .map(p => p.name);
    
    const bottlenecks = performanceData
      .filter(p => p.responseTime > avgResponseTime * 2 || p.successRate < 0.8)
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 3)
      .map(p => p.name);
    
    return {
      totalRequests,
      successRate,
      errorRate,
      avgResponseTime,
      totalProviders: providers.length,
      activeProviders: providers.filter(p => p.info.status === 'active').length,
      resourceUsage,
      topPerformers,
      bottlenecks
    };
  }

  // Events and logging
  getProviderEvents(name: string, limit = 100): ProviderEvent[] {
    return this.eventHistory
      .filter(e => e.providerId === name)
      .slice(-limit);
  }

  getAllEvents(limit = 100): ProviderEvent[] {
    return this.eventHistory.slice(-limit);
  }

  subscribeToEvents(callback: (event: ProviderEvent) => void): () => void {
    const eventType = 'all';
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    
    this.eventListeners.get(eventType)!.add(callback);
    
    return () => {
      this.eventListeners.get(eventType)?.delete(callback);
    };
  }

  // Testing and diagnostics
  async testProvider(name: string): Promise<TestResult> {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      throw new ProviderNotFoundError(name);
    }

    try {
      const diagnostics = await providerInstance.instance.runDiagnostics();
      const allPassed = Object.values(diagnostics).every(result => result.success);
      
      return {
        success: allPassed,
        message: allPassed ? 'All diagnostics passed' : 'Some diagnostics failed',
        details: diagnostics
      };
    } catch (error) {
      return {
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async testAllProviders(): Promise<Record<string, TestResult>> {
    const results: Record<string, TestResult> = {};
    
    const promises = Array.from(this.providers.keys()).map(async name => {
      results[name] = await this.testProvider(name);
    });
    
    await Promise.allSettled(promises);
    return results;
  }

  async runDiagnostics(name?: string): Promise<Record<string, TestResult>> {
    if (name) {
      const providerInstance = this.providers.get(name);
      if (!providerInstance) {
        throw new ProviderNotFoundError(name);
      }
      return { [name]: await this.testProvider(name) };
    }
    
    return this.testAllProviders();
  }

  // Automation and setup
  async autoSetupProvider(type: ProviderType, config: Partial<ProviderConfiguration>): Promise<string> {
    const factory = this.findFactoryForType(type);
    if (!factory) {
      throw new Error(`No factory found for provider type: ${type}`);
    }

    if (!factory.canAutoSetup(type)) {
      throw new Error(`Provider type ${type} does not support auto-setup`);
    }

    // Generate default configuration and merge with provided config
    const defaultConfig = factory.generateDefaultConfig(type);
    const fullConfig = { ...defaultConfig, ...config };
    
    // Generate unique name
    const name = `${type}-${Date.now()}`;
    
    // Register and start provider
    await this.registerProvider(name, type, fullConfig);
    await this.startProvider(name);
    
    this.emit('provider_auto_setup', name, type, fullConfig);
    return name;
  }

  async migrateProvider(name: string, targetType: ProviderType, config?: Partial<ProviderConfiguration>): Promise<void> {
    const sourceProvider = this.providers.get(name);
    if (!sourceProvider) {
      throw new ProviderNotFoundError(name);
    }

    // Export data from source provider
    const setupAutomation = sourceProvider.instance.getSetupAutomation?.();
    if (!setupAutomation) {
      throw new Error(`Provider ${name} does not support data export`);
    }

    const data = await setupAutomation.exportData();
    
    // Create new provider
    const targetName = `${name}-migrated`;
    await this.autoSetupProvider(targetType, config || {});
    
    // Import data to target provider
    const targetProvider = this.providers.get(targetName);
    if (targetProvider) {
      const targetAutomation = targetProvider.instance.getSetupAutomation?.();
      if (targetAutomation) {
        await targetAutomation.importData(data);
      }
    }
    
    this.emit('provider_migrated', name, targetName, targetType);
  }

  // Backup and recovery
  async backupProvider(name: string): Promise<string> {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      throw new ProviderNotFoundError(name);
    }

    const setupAutomation = providerInstance.instance.getSetupAutomation?.();
    if (!setupAutomation) {
      throw new Error(`Provider ${name} does not support backup`);
    }

    const backupId = await setupAutomation.createBackup();
    this.emit('provider_backup_created', name, backupId);
    
    return backupId;
  }

  async restoreProvider(name: string, backupId: string): Promise<void> {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      throw new ProviderNotFoundError(name);
    }

    const setupAutomation = providerInstance.instance.getSetupAutomation?.();
    if (!setupAutomation) {
      throw new Error(`Provider ${name} does not support restore`);
    }

    await setupAutomation.restoreBackup(backupId);
    this.emit('provider_backup_restored', name, backupId);
  }

  // Multi-service provider support
  getMultiServiceProviders(): string[] {
    return Array.from(this.providers.values())
      .filter(p => p.info.isMultiService)
      .map(p => p.info.name);
  }

  getProviderServices(name: string): string[] {
    const providerInstance = this.providers.get(name);
    if (!providerInstance || !providerInstance.info.isMultiService) {
      return [];
    }

    const multiService = providerInstance.instance.getMultiServiceProvider?.();
    return multiService?.getAvailableServices() || [];
  }

  isServiceEnabled(providerName: string, serviceName: string): boolean {
    const providerInstance = this.providers.get(providerName);
    if (!providerInstance || !providerInstance.info.isMultiService) {
      return false;
    }

    const multiService = providerInstance.instance.getMultiServiceProvider?.();
    return multiService?.isServiceEnabled(serviceName) || false;
  }

  async enableService(providerName: string, serviceName: string): Promise<void> {
    const providerInstance = this.providers.get(providerName);
    if (!providerInstance || !providerInstance.info.isMultiService) {
      throw new ProviderNotFoundError(providerName);
    }

    const multiService = providerInstance.instance.getMultiServiceProvider?.();
    if (!multiService) {
      throw new Error(`Provider ${providerName} is not a multi-service provider`);
    }

    await multiService.enableService(serviceName);
    this.emit('provider_service_enabled', providerName, serviceName);
  }

  async disableService(providerName: string, serviceName: string): Promise<void> {
    const providerInstance = this.providers.get(providerName);
    if (!providerInstance || !providerInstance.info.isMultiService) {
      throw new ProviderNotFoundError(providerName);
    }

    const multiService = providerInstance.instance.getMultiServiceProvider?.();
    if (!multiService) {
      throw new Error(`Provider ${providerName} is not a multi-service provider`);
    }

    await multiService.disableService(serviceName);
    this.emit('provider_service_disabled', providerName, serviceName);
  }

  // Wizard integration
  getProviderWizardSteps(type: ProviderType): WizardStep[] {
    const factory = this.findFactoryForType(type);
    if (!factory) {
      return [];
    }

    return factory.getWizardSteps(type);
  }

  async validateWizardStep(type: ProviderType, stepId: string, data: Record<string, unknown>): Promise<ValidationResult> {
    const factory = this.findFactoryForType(type);
    if (!factory) {
      return {
        valid: false,
        errors: [`No factory found for provider type: ${type}`],
        warnings: []
      };
    }

    // Create temporary provider instance for validation
    const tempConfig = factory.generateDefaultConfig(type);
    const provider = await factory.createProvider(type, tempConfig);
    
    const wizardIntegration = provider.getWizardIntegration?.();
    if (!wizardIntegration) {
      return {
        valid: false,
        errors: [`Provider type ${type} does not support wizard integration`],
        warnings: []
      };
    }

    const result = await wizardIntegration.validateStep(stepId, data);
    
    // Cleanup temporary provider
    await provider.destroy();
    
    return result;
  }

  async executeWizardStep(type: ProviderType, stepId: string, data: Record<string, unknown>): Promise<StepResult> {
    const factory = this.findFactoryForType(type);
    if (!factory) {
      return {
        success: false,
        error: `No factory found for provider type: ${type}`
      };
    }

    // Create temporary provider instance for execution
    const tempConfig = factory.generateDefaultConfig(type);
    const provider = await factory.createProvider(type, tempConfig);
    
    const wizardIntegration = provider.getWizardIntegration?.();
    if (!wizardIntegration) {
      await provider.destroy();
      return {
        success: false,
        error: `Provider type ${type} does not support wizard integration`
      };
    }

    const result = await wizardIntegration.executeStep(stepId, data);
    
    // Cleanup temporary provider
    await provider.destroy();
    
    return result;
  }

  // Advanced querying
  findProviders(query: ProviderQuery): ProviderSummary[] {
    return Array.from(this.providers.values())
      .filter(p => {
        if (query.type && p.info.type !== query.type) return false;
        if (query.category && p.info.category !== query.category) return false;
        if (query.status && p.info.status !== query.status) return false;
        if (query.health && p.info.health !== query.health) return false;
        if (query.capability && !p.info.capabilities.includes(query.capability)) return false;
        if (query.tag && (!p.info.tags || !p.info.tags.includes(query.tag))) return false;
        if (query.multiService !== undefined && p.info.isMultiService !== query.multiService) return false;
        if (query.autoSetup !== undefined) {
          const setupAutomation = p.instance.getSetupAutomation?.();
          const canAutoSetup = setupAutomation?.canAutoSetup() || false;
          if (canAutoSetup !== query.autoSetup) return false;
        }
        
        return true;
      })
      .map(p => ({
        name: p.info.name,
        type: p.info.type,
        category: p.info.category,
        status: p.info.status,
        health: p.info.health,
        version: p.info.version,
        uptime: p.info.uptime,
        capabilities: p.info.capabilities,
        isMultiService: p.info.isMultiService,
        services: p.info.services
      }));
  }

  searchProviders(searchTerm: string): ProviderSummary[] {
    const term = searchTerm.toLowerCase();
    
    return Array.from(this.providers.values())
      .filter(p => {
        return (
          p.info.name.toLowerCase().includes(term) ||
          p.info.type.toLowerCase().includes(term) ||
          p.info.category.toLowerCase().includes(term) ||
          p.info.description?.toLowerCase().includes(term) ||
          p.info.capabilities.some(cap => cap.toLowerCase().includes(term)) ||
          p.info.tags?.some(tag => tag.toLowerCase().includes(term))
        );
      })
      .map(p => ({
        name: p.info.name,
        type: p.info.type,
        category: p.info.category,
        status: p.info.status,
        health: p.info.health,
        version: p.info.version,
        uptime: p.info.uptime,
        capabilities: p.info.capabilities,
        isMultiService: p.info.isMultiService,
        services: p.info.services
      }));
  }

  // Registry information
  getRegistryInfo(): RegistryInfo {
    const providers = Array.from(this.providers.values());
    
    return {
      version: '1.0.0',
      startTime: this.startTime,
      environment: process.env.NODE_ENV || 'development',
      uptime: Date.now() - this.startTime.getTime(),
      totalProviders: providers.length,
      activeProviders: providers.filter(p => p.info.status === 'active').length,
      failedProviders: providers.filter(p => p.info.status === 'failed').length,
      registeredFactories: this.factories.size,
      supportedTypes: Array.from(new Set(
        Array.from(this.factories.values())
          .flatMap(f => f.getSupportedTypes())
      )) as ProviderType[],
      features: [
        'multi-service-providers',
        'auto-setup',
        'wizard-integration',
        'health-monitoring',
        'metrics-collection',
        'backup-restore',
        'configuration-management',
        'dependency-resolution'
      ]
    };
  }

  async getRegistryMetrics(): Promise<RegistryMetrics> {
    const providers = Array.from(this.providers.values());
    const allMetrics = await this.getAllMetrics();
    
    // Provider statistics
    const providerStats = {
      total: providers.length,
      active: providers.filter(p => p.info.status === 'active').length,
      stopped: providers.filter(p => p.info.status === 'stopped').length,
      failed: providers.filter(p => p.info.status === 'failed').length,
      byType: {} as Record<ProviderType, number>,
      byCategory: {} as Record<string, number>
    };
    
    // Count by type and category
    for (const provider of providers) {
      providerStats.byType[provider.info.type] = (providerStats.byType[provider.info.type] || 0) + 1;
      providerStats.byCategory[provider.info.category] = (providerStats.byCategory[provider.info.category] || 0) + 1;
    }
    
    // Performance statistics
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    let metricCount = 0;
    
    for (const metrics of Object.values(allMetrics)) {
      totalRequests += metrics.requests?.total || 0;
      successfulRequests += metrics.requests?.successful || 0;
      failedRequests += metrics.requests?.failed || 0;
      totalResponseTime += metrics.performance?.avgResponseTime || 0;
      metricCount++;
    }
    
    const performanceStats = {
      avgStartupTime: 0, // Would need to track
      avgHealthCheckTime: 0, // Would need to track
      totalRequests,
      successfulRequests,
      failedRequests,
      avgResponseTime: metricCount > 0 ? totalResponseTime / metricCount : 0
    };
    
    // Resource statistics
    const resourceStats = {
      totalMemoryUsage: 0,
      totalCpuUsage: 0,
      totalDiskUsage: 0,
      totalConnections: 0
    };
    
    for (const metrics of Object.values(allMetrics)) {
      resourceStats.totalMemoryUsage += metrics.resources?.memoryUsage || 0;
      resourceStats.totalCpuUsage += metrics.resources?.cpuUsage || 0;
      resourceStats.totalDiskUsage += metrics.resources?.diskUsage || 0;
      resourceStats.totalConnections += metrics.resources?.connections || 0;
    }
    
    // Event statistics
    const recentEvents = this.eventHistory.slice(-10);
    const eventStats = {
      total: this.eventHistory.length,
      errors: this.eventHistory.filter(e => e.severity === 'error').length,
      warnings: this.eventHistory.filter(e => e.severity === 'warning').length,
      info: this.eventHistory.filter(e => e.severity === 'info').length,
      recentEvents
    };
    
    return {
      providers: providerStats,
      performance: performanceStats,
      resources: resourceStats,
      events: eventStats,
      timestamp: new Date()
    };
  }

  async getRegistryHealth(): Promise<RegistryHealth> {
    const healthSummary = await this.getHealthSummary();
    const allHealth = await this.checkAllHealth();
    
    const issues = {
      critical: healthSummary.criticalIssues,
      warnings: healthSummary.warnings,
      info: [] as string[]
    };
    
    // Add informational messages
    if (healthSummary.healthyProviders === healthSummary.totalProviders) {
      issues.info.push('All providers are healthy');
    }
    
    const recommendations: string[] = [];
    
    if (healthSummary.unhealthyProviders > 0) {
      recommendations.push('Investigate and fix unhealthy providers');
    }
    
    if (healthSummary.degradedProviders > 0) {
      recommendations.push('Monitor degraded providers for potential issues');
    }
    
    if (healthSummary.stoppedProviders > 0) {
      recommendations.push('Consider starting stopped providers if they are needed');
    }
    
    return {
      status: healthSummary.overallHealth,
      providers: allHealth,
      issues,
      recommendations,
      lastCheck: new Date()
    };
  }

  // Private helper methods
  private async registerBuiltInFactories(): Promise<void> {
    // Register existing factories
    const { PostgreSQLProviderFactory } = await import('./postgresql-provider');
    // const { SupabaseDatabaseProviderFactory } = await import('./supabase-database-provider'); // Temporarily disabled
    const { LocalAuthProviderFactory } = await import('./local-auth-provider');
    const { JWTLocalAuthProviderFactory } = await import('./jwt-local-auth-provider');
    // const { SupabaseAuthProviderFactory } = await import('./supabase-auth-provider'); // Temporarily disabled
    
    // Register new enhanced factories
    const { PocketBaseProviderFactory } = await import('./pocketbase-provider');
    
    // Register all factories as enhanced factories
    this.registerFactory(new PostgreSQLProviderFactory() as any);
    // this.registerFactory(new SupabaseDatabaseProviderFactory() as any); // Temporarily disabled
    this.registerFactory(new LocalAuthProviderFactory() as any);
    this.registerFactory(new JWTLocalAuthProviderFactory() as any);
    // this.registerFactory(new SupabaseAuthProviderFactory() as any); // Temporarily disabled
    this.registerFactory(new PocketBaseProviderFactory());
  }

  private async loadProvidersFromConfig(): Promise<void> {
    if (!this.configManager) {
      return;
    }

    // Load providers from configuration
    console.log('📋 Loading enhanced providers from configuration...');
  }

  private findFactoryForType(type: ProviderType): IEnhancedProviderFactory | undefined {
    for (const factory of this.factories.values()) {
      if (factory.getSupportedTypes().includes(type)) {
        return factory;
      }
    }
    return undefined;
  }

  private async resolveDependencies(): Promise<void> {
    console.log('🔗 Resolving enhanced provider dependencies...');
    
    // Build dependency graph
    for (const [name, providerInstance] of this.providers) {
      const dependencies = providerInstance.config.dependencies || [];
      
      for (const dependency of dependencies) {
        const depInstance = this.providers.get(dependency.name);
        if (!depInstance) {
          if (dependency.required) {
            throw new Error(`Provider ${name} has unresolved required dependency: ${dependency.name}`);
          }
          continue;
        }
        
        providerInstance.dependencies.push(depInstance);
        depInstance.dependents.push(providerInstance);
      }
    }
    
    // Check for circular dependencies
    this.checkCircularDependencies();
    
    console.log('✅ Enhanced dependencies resolved');
  }

  private getStartupOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];
    
    const visit = (name: string) => {
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving provider: ${name}`);
      }
      
      if (visited.has(name)) {
        return;
      }
      
      visiting.add(name);
      
      const providerInstance = this.providers.get(name);
      if (providerInstance) {
        for (const dep of providerInstance.dependencies) {
          visit(dep.info.name);
        }
      }
      
      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };
    
    for (const name of this.providers.keys()) {
      visit(name);
    }
    
    return order;
  }

  private checkCircularDependencies(): void {
    try {
      this.getStartupOrder();
    } catch (error) {
      throw new ProviderRegistryError('Circular dependency detected in provider configuration');
    }
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkAllHealth();
      } catch (error) {
        console.error('❌ Health monitoring error:', error);
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private startMetricsCollection(): void {
    if (this.metricsCollectionInterval) {
      return;
    }

    this.metricsCollectionInterval = setInterval(async () => {
      try {
        const allMetrics = await this.getAllMetrics();
        
        // Store metrics history for each provider
        for (const [name, metrics] of Object.entries(allMetrics)) {
          if (!this.providerMetrics.has(name)) {
            this.providerMetrics.set(name, []);
          }
          
          const history = this.providerMetrics.get(name)!;
          history.push(metrics);
          
          // Keep only last 100 metrics entries
          if (history.length > 100) {
            history.splice(0, history.length - 100);
          }
        }
      } catch (error) {
        console.error('❌ Metrics collection error:', error);
      }
    }, this.METRICS_COLLECTION_INTERVAL);
  }

  private stopMetricsCollection(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }
  }

  private emit(event: string, ...args: any[]): void {
    // Create event object
    const eventObj: ProviderEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: event as any,
      providerId: typeof args[0] === 'string' ? args[0] : 'registry',
      timestamp: new Date(),
      data: args.length > 1 ? { args: args.slice(1) } : undefined,
      error: args.find(arg => arg instanceof Error),
      severity: event.includes('error') || event.includes('failed') ? 'error' :
                event.includes('warning') ? 'warning' : 'info'
    };
    
    // Store in history
    this.eventHistory.push(eventObj);
    
    // Keep only last MAX_EVENT_HISTORY events
    if (this.eventHistory.length > this.MAX_EVENT_HISTORY) {
      this.eventHistory.splice(0, this.eventHistory.length - this.MAX_EVENT_HISTORY);
    }
    
    // Notify listeners
    const listeners = this.eventListeners.get('all') || new Set();
    const eventListeners = this.eventListeners.get(event) || new Set();
    
    for (const callback of [...listeners, ...eventListeners]) {
      try {
        callback(eventObj);
      } catch (error) {
        console.error(`❌ Error in event listener for ${event}:`, error);
      }
    }
  }
}