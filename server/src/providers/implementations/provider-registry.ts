/**
 * Provider Registry Implementation
 * 
 * Concrete implementation of the provider registry system that manages
 * all providers, their lifecycles, dependencies, and health monitoring.
 */

import {
  IProviderRegistry,
  IProviderFactory,
  IProvider,
  ProviderInfo,
  ProviderInstance,
  ProviderType,
  ProviderStatus,
  ProviderHealthSummary,
  RegistryMetrics,
  RegistryInfo,
  ProviderEvent,
  ProviderEventType,
  ProviderFilter,
  ProviderNotFoundError,
  ProviderDependencyError,
  ProviderLifecycleError,
  CircularDependencyError
} from '../interfaces/provider-registry';

import { IProviderConfigManager, BaseProviderConfig } from '../interfaces/provider-config';

export class ProviderRegistry implements IProviderRegistry {
  private factories = new Map<string, IProviderFactory>();
  private providers = new Map<string, ProviderInstance>();
  private configManager: IProviderConfigManager | null = null;
  private eventListeners = new Map<ProviderEventType, Set<Function>>();
  private eventHistory: ProviderEvent[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private startTime = new Date();
  private isInitialized = false;

  async initialize(configManager: IProviderConfigManager): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.configManager = configManager;
    
    // Register built-in factories
    await this.registerBuiltInFactories();
    
    // Load providers from configuration
    await this.loadProvidersFromConfig();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    this.isInitialized = true;
    this.emit('registry_initialized', 'registry');
    
    console.log('✅ Provider Registry initialized');
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Registry not initialized');
    }

    console.log('🚀 Starting Provider Registry...');
    
    // Resolve dependencies first
    await this.resolveDependencies();
    
    // Start providers in dependency order
    const startupOrder = this.getStartupOrder();
    
    for (const providerName of startupOrder) {
      try {
        await this.startProvider(providerName);
      } catch (error) {
        console.error(`❌ Failed to start provider ${providerName}:`, error);
        this.emit('provider_failed', providerName, undefined, error as Error);
      }
    }
    
    console.log('✅ Provider Registry started');
  }

  async stop(): Promise<void> {
    console.log('🔄 Stopping Provider Registry...');
    
    // Stop health monitoring
    this.stopHealthMonitoring();
    
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
    
    console.log('✅ Provider Registry stopped');
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
    this.isInitialized = false;
    
    console.log('✅ Provider Registry destroyed');
  }

  // Factory management
  registerFactory(factory: IProviderFactory): void {
    this.factories.set(factory.name, factory);
    console.log(`📦 Registered provider factory: ${factory.name} (supports: ${factory.supportedTypes.join(', ')})`);
  }

  unregisterFactory(factoryName: string): boolean {
    const deleted = this.factories.delete(factoryName);
    if (deleted) {
      console.log(`📦 Unregistered provider factory: ${factoryName}`);
    }
    return deleted;
  }

  listFactories(): string[] {
    return Array.from(this.factories.keys());
  }

  // Provider management
  async registerProvider(name: string, type: ProviderType, config: BaseProviderConfig): Promise<void> {
    if (this.providers.has(name)) {
      throw new Error(`Provider '${name}' is already registered`);
    }

    // Find appropriate factory
    const factory = this.findFactoryForType(type);
    if (!factory) {
      throw new Error(`No factory found for provider type '${type}'`);
    }

    try {
      // Create provider instance
      const providerInstance = await factory.createProvider(type, config);
      
      // Create provider info
      const info: ProviderInfo = {
        name,
        type,
        version: providerInstance.version,
        status: 'registered',
        description: config.description,
        dependencies: providerInstance.getDependencies ? providerInstance.getDependencies() : [],
        capabilities: [],
        tags: config.tags,
        registeredAt: new Date()
      };

      // Store provider instance
      const instance: ProviderInstance = {
        info,
        instance: providerInstance,
        config,
        dependencies: [],
        dependents: []
      };

      this.providers.set(name, instance);
      this.emit('provider_registered', name, { type, config });
      
      console.log(`✅ Registered provider: ${name} (${type})`);
      
    } catch (error) {
      throw new ProviderLifecycleError(name, 'register', error as Error);
    }
  }

  async unregisterProvider(name: string): Promise<boolean> {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      return false;
    }

    try {
      // Stop and destroy the provider
      await this.stopProvider(name);
      await providerInstance.instance.destroy();
      
      // Remove from dependents
      for (const dependent of providerInstance.dependents) {
        const depIndex = dependent.dependencies.indexOf(providerInstance);
        if (depIndex >= 0) {
          dependent.dependencies.splice(depIndex, 1);
        }
      }
      
      this.providers.delete(name);
      this.emit('provider_unregistered', name);
      
      console.log(`✅ Unregistered provider: ${name}`);
      return true;
      
    } catch (error) {
      throw new ProviderLifecycleError(name, 'unregister', error as Error);
    }
  }

  getProvider<T extends IProvider = IProvider>(name: string): T | undefined {
    const providerInstance = this.providers.get(name);
    return providerInstance?.instance as T;
  }

  listProviders(type?: ProviderType): ProviderInfo[] {
    const providers = Array.from(this.providers.values());
    
    if (type) {
      return providers.filter(p => p.info.type === type).map(p => p.info);
    }
    
    return providers.map(p => p.info);
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  // Provider lifecycle control
  async startProvider(name: string): Promise<void> {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      throw new ProviderNotFoundError(name);
    }

    if (providerInstance.info.status === 'active') {
      return;
    }

    try {
      providerInstance.info.status = 'initializing';
      this.emit('provider_initializing', name);
      
      // Initialize provider
      await providerInstance.instance.initialize(providerInstance.config);
      this.emit('provider_initialized', name);
      
      // Start provider
      await providerInstance.instance.start();
      providerInstance.info.status = 'active';
      this.emit('provider_started', name);
      
      console.log(`✅ Started provider: ${name}`);
      
    } catch (error) {
      providerInstance.info.status = 'failed';
      this.emit('provider_failed', name, undefined, error as Error);
      throw new ProviderLifecycleError(name, 'start', error as Error);
    }
  }

  async stopProvider(name: string): Promise<void> {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      throw new ProviderNotFoundError(name);
    }

    if (providerInstance.info.status === 'stopped') {
      return;
    }

    try {
      await providerInstance.instance.stop();
      providerInstance.info.status = 'stopped';
      this.emit('provider_stopped', name);
      
      console.log(`✅ Stopped provider: ${name}`);
      
    } catch (error) {
      throw new ProviderLifecycleError(name, 'stop', error as Error);
    }
  }

  async restartProvider(name: string): Promise<void> {
    await this.stopProvider(name);
    await this.startProvider(name);
  }

  async startAllProviders(): Promise<void> {
    const startupOrder = this.getStartupOrder();
    
    for (const providerName of startupOrder) {
      try {
        await this.startProvider(providerName);
      } catch (error) {
        console.error(`❌ Failed to start provider ${providerName}:`, error);
      }
    }
  }

  async stopAllProviders(): Promise<void> {
    const startupOrder = this.getStartupOrder();
    const shutdownOrder = [...startupOrder].reverse();
    
    for (const providerName of shutdownOrder) {
      try {
        await this.stopProvider(providerName);
      } catch (error) {
        console.error(`❌ Failed to stop provider ${providerName}:`, error);
      }
    }
  }

  // Configuration management
  async updateProviderConfig(name: string, config: Partial<BaseProviderConfig>): Promise<void> {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      throw new ProviderNotFoundError(name);
    }

    try {
      const updatedConfig = { ...providerInstance.config, ...config };
      await providerInstance.instance.updateConfig(updatedConfig);
      providerInstance.config = updatedConfig;
      
      this.emit('provider_config_updated', name, { config: updatedConfig });
      console.log(`✅ Updated config for provider: ${name}`);
      
    } catch (error) {
      throw new ProviderLifecycleError(name, 'update_config', error as Error);
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

  // Health monitoring
  async checkProviderHealth(name: string): Promise<ProviderHealthSummary> {
    const providerInstance = this.providers.get(name);
    if (!providerInstance) {
      throw new ProviderNotFoundError(name);
    }

    try {
      const health = await providerInstance.instance.getHealth();
      providerInstance.info.lastHealthCheck = new Date();
      
      // Update status based on health
      if (health.health === 'unhealthy' && providerInstance.info.status === 'active') {
        providerInstance.info.status = 'failed';
        this.emit('provider_failed', name);
      } else if (health.health === 'degraded' && providerInstance.info.status === 'active') {
        providerInstance.info.status = 'degraded';
        this.emit('provider_health_changed', name, { health });
      }
      
      return health;
      
    } catch (error) {
      const healthSummary: ProviderHealthSummary = {
        name,
        type: providerInstance.info.type,
        status: 'failed',
        health: 'unhealthy',
        lastCheck: new Date(),
        uptime: 0,
        errors: 1,
        warnings: 0,
        details: { error: (error as Error).message }
      };
      
      providerInstance.info.status = 'failed';
      this.emit('provider_failed', name, undefined, error as Error);
      
      return healthSummary;
    }
  }

  async checkAllHealth(): Promise<Record<string, ProviderHealthSummary>> {
    const healthResults: Record<string, ProviderHealthSummary> = {};
    
    for (const providerName of this.providers.keys()) {
      try {
        healthResults[providerName] = await this.checkProviderHealth(providerName);
      } catch (error) {
        console.error(`❌ Health check failed for ${providerName}:`, error);
      }
    }
    
    return healthResults;
  }

  async getHealthSummary(): Promise<RegistryMetrics> {
    const providers = Array.from(this.providers.values());
    const healthResults = await this.checkAllHealth();
    
    const metrics: RegistryMetrics = {
      totalProviders: providers.length,
      activeProviders: providers.filter(p => p.info.status === 'active').length,
      failedProviders: providers.filter(p => p.info.status === 'failed').length,
      healthyProviders: Object.values(healthResults).filter(h => h.health === 'healthy').length,
      degradedProviders: Object.values(healthResults).filter(h => h.health === 'degraded').length,
      unhealthyProviders: Object.values(healthResults).filter(h => h.health === 'unhealthy').length,
      avgStartupTime: 0, // Would need tracking
      avgHealthCheckTime: 0, // Would need tracking
      totalRequests: 0, // Would need tracking
      totalErrors: Object.values(healthResults).reduce((sum, h) => sum + h.errors, 0),
      registryUptime: Date.now() - this.startTime.getTime(),
      oldestProviderUptime: 0, // Would need tracking
      lastUpdated: new Date()
    };
    
    return metrics;
  }

  // Dependency management
  async resolveDependencies(): Promise<void> {
    console.log('🔗 Resolving provider dependencies...');
    
    // Build dependency graph
    for (const [name, providerInstance] of this.providers) {
      const dependencies = providerInstance.info.dependencies || [];
      
      for (const depName of dependencies) {
        const depInstance = this.providers.get(depName);
        if (!depInstance) {
          throw new ProviderDependencyError(name, depName);
        }
        
        providerInstance.dependencies.push(depInstance);
        depInstance.dependents.push(providerInstance);
        
        // Set dependency on provider if supported
        if (providerInstance.instance.setDependency) {
          providerInstance.instance.setDependency(depName, depInstance.instance);
        }
      }
    }
    
    // Check for circular dependencies
    this.checkCircularDependencies();
    
    console.log('✅ Dependencies resolved');
  }

  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    
    for (const [name, providerInstance] of this.providers) {
      graph[name] = providerInstance.info.dependencies || [];
    }
    
    return graph;
  }

  getStartupOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];
    
    const visit = (name: string) => {
      if (visiting.has(name)) {
        throw new CircularDependencyError([...visiting, name]);
      }
      
      if (visited.has(name)) {
        return;
      }
      
      visiting.add(name);
      
      const providerInstance = this.providers.get(name);
      if (providerInstance) {
        const dependencies = providerInstance.info.dependencies || [];
        for (const dep of dependencies) {
          visit(dep);
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

  // Registry information
  getInfo(): RegistryInfo {
    const providers = Array.from(this.providers.values());
    
    return {
      version: '1.0.0',
      startTime: this.startTime,
      environment: process.env.NODE_ENV || 'development',
      totalProviders: providers.length,
      activeProviders: providers.filter(p => p.info.status === 'active').length,
      failedProviders: providers.filter(p => p.info.status === 'failed').length,
      uptime: Date.now() - this.startTime.getTime()
    };
  }

  async getMetrics(): Promise<RegistryMetrics> {
    return await this.getHealthSummary();
  }

  // Utilities
  findProviders(filter: ProviderFilter): ProviderInfo[] {
    const providers = Array.from(this.providers.values());
    
    return providers.filter(p => {
      if (filter.type && p.info.type !== filter.type) return false;
      if (filter.status && p.info.status !== filter.status) return false;
      if (filter.name && !p.info.name.includes(filter.name)) return false;
      if (filter.tag && (!p.info.tags || !p.info.tags.includes(filter.tag))) return false;
      
      return true;
    }).map(p => p.info);
  }

  getProvidersByType(type: ProviderType): ProviderInfo[] {
    return this.findProviders({ type });
  }

  getProvidersWithCapability(capability: string): ProviderInfo[] {
    return this.findProviders({ capability });
  }

  // Event system
  on(event: ProviderEventType, callback: (event: ProviderEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: ProviderEventType, callback: (event: ProviderEvent) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  emit(event: ProviderEventType, providerId: string, data?: Record<string, unknown>, error?: Error): void {
    const eventObj: ProviderEvent = {
      type: event,
      providerId,
      timestamp: new Date(),
      data,
      error
    };
    
    // Store in history
    this.eventHistory.push(eventObj);
    
    // Keep only last 1000 events
    if (this.eventHistory.length > 1000) {
      this.eventHistory.splice(0, this.eventHistory.length - 1000);
    }
    
    // Notify listeners
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(eventObj);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      }
    }
  }

  getEventHistory(providerId?: string, limit = 100): ProviderEvent[] {
    let events = this.eventHistory;
    
    if (providerId) {
      events = events.filter(e => e.providerId === providerId);
    }
    
    return events.slice(-limit);
  }

  private async registerBuiltInFactories(): Promise<void> {
    // Register Database Providers
    const { PostgreSQLProviderFactory } = await import('./postgresql-provider');
    this.registerFactory(new PostgreSQLProviderFactory() as any);
    
    // Register Supabase Database factory (temporarily disabled - missing dependency)
    // const { SupabaseDatabaseProviderFactory } = await import('./supabase-database-provider');
    // this.registerFactory(new SupabaseDatabaseProviderFactory() as any);
    
    // Register Authentication Providers
    const { LocalAuthProviderFactory } = await import('./local-auth-provider');
    this.registerFactory(new LocalAuthProviderFactory() as any);
    
    // Register JWT Local Auth factory
    const { JWTLocalAuthProviderFactory } = await import('./jwt-local-auth-provider');
    this.registerFactory(new JWTLocalAuthProviderFactory() as any);
    
    // Register Supabase Auth factory (temporarily disabled - missing dependency)
    // const { SupabaseAuthProviderFactory } = await import('./supabase-auth-provider');
    // this.registerFactory(new SupabaseAuthProviderFactory() as any);
  }

  private async loadProvidersFromConfig(): Promise<void> {
    if (!this.configManager) {
      return;
    }

    // Load providers from configuration
    // This would read from the config manager and register providers
    console.log('📋 Loading providers from configuration...');
  }

  private findFactoryForType(type: string): IProviderFactory | undefined {
    for (const factory of this.factories.values()) {
      if (factory.supportedTypes.includes(type)) {
        return factory;
      }
    }
    return undefined;
  }

  private checkCircularDependencies(): void {
    // This is handled in getStartupOrder through the visiting set
    try {
      this.getStartupOrder();
    } catch (error) {
      if (error instanceof CircularDependencyError) {
        throw error;
      }
      throw new Error('Dependency resolution failed');
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
    }, 30000); // Check every 30 seconds
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}