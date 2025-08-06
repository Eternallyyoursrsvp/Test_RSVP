/**
 * Enhanced Provider Registry Bridge
 * 
 * Extends the existing ProviderRegistry to support enhanced providers
 * while maintaining backward compatibility with the original registry.
 * This acts as a bridge between the legacy registry and enhanced provider system.
 */

import { EventEmitter } from 'events';
import { ProviderRegistry } from './provider-registry';
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

import { IProviderConfigManager, BaseProviderConfig } from '../interfaces/provider-config';
import { IProvider } from '../interfaces/provider-registry';

// Import enhanced provider implementations
import { PostgreSQLProviderFactory } from './postgresql-provider';
// import { SupabaseDatabaseProviderFactory } from './supabase-database-provider'; // Temporarily disabled
import { LocalAuthProviderFactory } from './local-auth-provider';
import { PocketBaseProviderFactory } from './pocketbase-provider';

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

export class EnhancedProviderRegistryBridge extends EventEmitter implements IEnhancedProviderRegistry {
  private baseRegistry: ProviderRegistry;
  private enhancedFactories = new Map<string, IEnhancedProviderFactory>();
  private enhancedProviders = new Map<string, EnhancedProviderInstance>();
  private eventHistory: ProviderEvent[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  
  private readonly providerMetrics = new Map<string, ProviderMetrics[]>();
  private readonly MAX_EVENT_HISTORY = 1000;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly METRICS_COLLECTION_INTERVAL = 60000; // 1 minute

  constructor(baseRegistry?: ProviderRegistry) {
    super();
    this.baseRegistry = baseRegistry || new ProviderRegistry();
    this.setupEventForwarding();
  }

  async initialize(configManager: IProviderConfigManager): Promise<void> {
    // Initialize base registry first
    await this.baseRegistry.initialize(configManager);
    
    // Register enhanced factories
    await this.registerBuiltInEnhancedFactories();
    
    // Start enhanced monitoring
    this.startHealthMonitoring();
    this.startMetricsCollection();
    
    console.log('✅ Enhanced Provider Registry Bridge initialized');
  }

  async start(): Promise<void> {
    await this.baseRegistry.start();
    
    // Start enhanced providers
    for (const [name, providerInstance] of this.enhancedProviders) {
      try {
        await providerInstance.instance.start();
        providerInstance.info.status = 'active';
        this.emitEvent(name, 'started', 'info', { timestamp: new Date() });
      } catch (error) {
        providerInstance.info.status = 'failed';
        this.emitEvent(name, 'failed', 'error', { error: (error as Error).message });
        console.error(`❌ Failed to start enhanced provider ${name}:`, error);
      }
    }
    
    console.log('✅ Enhanced Provider Registry Bridge started');
  }

  async stop(): Promise<void> {
    // Stop enhanced providers first
    for (const [name, providerInstance] of this.enhancedProviders) {
      try {
        await providerInstance.instance.stop();
        providerInstance.info.status = 'stopped';
        this.emitEvent(name, 'stopped', 'info', { timestamp: new Date() });
      } catch (error) {
        console.error(`❌ Error stopping enhanced provider ${name}:`, error);
      }
    }
    
    // Stop monitoring
    this.stopHealthMonitoring();
    this.stopMetricsCollection();
    
    await this.baseRegistry.stop();
    console.log('✅ Enhanced Provider Registry Bridge stopped');
  }

  // Basic Registry Methods (delegated to base registry)
  
  registerFactory(factory: IEnhancedProviderFactory): void {
    this.enhancedFactories.set(factory.name, factory);
    console.log(`📦 Registered enhanced provider factory: ${factory.name} (supports: ${factory.getSupportedTypes().join(', ')})`);
  }

  unregisterFactory(factoryName: string): boolean {
    const deleted = this.enhancedFactories.delete(factoryName);
    if (deleted) {
      console.log(`📦 Unregistered enhanced provider factory: ${factoryName}`);
    }
    return deleted;
  }

  listFactories(): string[] {
    const baseFactories = this.baseRegistry.listFactories();
    const enhancedFactories = Array.from(this.enhancedFactories.keys());
    return [...new Set([...baseFactories, ...enhancedFactories])];
  }

  async registerProvider(name: string, type: ProviderType, config: ProviderConfiguration): Promise<void> {
    // Check if we have an enhanced factory for this type
    const enhancedFactory = this.findEnhancedFactoryForType(type);
    
    if (enhancedFactory) {
      await this.registerEnhancedProvider(name, type, config, enhancedFactory);
    } else {
      // Fall back to base registry with converted config
      const baseConfig: BaseProviderConfig = {
        name: config.name,
        type: config.type as any,
        enabled: config.enabled,
        description: config.description,
        tags: config.tags,
        priority: config.priority,
        timeout: config.timeout,
        retries: config.retries,
        ...config.config
      };
      await this.baseRegistry.registerProvider(name, type as any, baseConfig);
    }
  }

  async unregisterProvider(name: string): Promise<boolean> {
    // Try enhanced providers first
    if (this.enhancedProviders.has(name)) {
      return await this.unregisterEnhancedProvider(name);
    }
    
    // Fall back to base registry
    return await this.baseRegistry.unregisterProvider(name);
  }

  getProvider<T extends IEnhancedProvider = IEnhancedProvider>(name: string): T | undefined {
    // Try enhanced providers first
    const enhancedProvider = this.enhancedProviders.get(name);
    if (enhancedProvider) {
      return enhancedProvider.instance as T;
    }
    
    // Fall back to base registry
    const baseProvider = this.baseRegistry.getProvider<IProvider>(name);
    return baseProvider as any;
  }

  listProviders(type?: ProviderType): ProviderSummary[] {
    const enhancedSummaries = Array.from(this.enhancedProviders.values()).map(p => ({
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
    
    const baseProviders = this.baseRegistry.listProviders(type as any);
    const baseSummaries = baseProviders.map(p => ({
      name: p.name,
      type: p.type as ProviderType,
      category: 'legacy',
      status: p.status as ProviderStatus['status'],
      health: 'unknown' as ProviderStatus['health'],
      version: p.version,
      uptime: 0,
      capabilities: p.capabilities || [],
      isMultiService: false
    }));
    
    const allSummaries = [...enhancedSummaries, ...baseSummaries];
    
    if (type) {
      return allSummaries.filter(p => p.type === type);
    }
    
    return allSummaries;
  }

  hasProvider(name: string): boolean {
    return this.enhancedProviders.has(name) || this.baseRegistry.hasProvider(name);
  }

  // Enhanced Registry Methods

  getProviderInfo(name: string): ProviderDetails | undefined {
    const enhancedProvider = this.enhancedProviders.get(name);
    if (!enhancedProvider) {
      return undefined;
    }

    return {
      name: enhancedProvider.info.name,
      type: enhancedProvider.info.type,
      category: enhancedProvider.info.category,
      status: enhancedProvider.info.status,
      health: enhancedProvider.info.health,
      version: enhancedProvider.info.version,
      uptime: enhancedProvider.info.uptime,
      capabilities: enhancedProvider.info.capabilities,
      isMultiService: enhancedProvider.info.isMultiService,
      services: enhancedProvider.info.services,
      description: enhancedProvider.info.description || '',
      configuration: enhancedProvider.config,
      dependencies: enhancedProvider.dependencies.map(d => d.info.name),
      dependents: enhancedProvider.dependents.map(d => d.info.name),
      lastHealthCheck: enhancedProvider.info.lastHealthCheck || new Date(),
      errors: enhancedProvider.info.errors,
      warnings: enhancedProvider.info.warnings,
      performance: {
        responseTime: 0, // Would be populated from metrics
        throughput: 0,
        errorRate: 0
      },
      features: Object.keys(enhancedProvider.config.features || {}),
      tags: enhancedProvider.info.tags || []
    };
  }

  getProvidersByCategory(category: string): ProviderSummary[] {
    return this.listProviders().filter(p => p.category === category);
  }

  getProvidersByCapability(capability: string): ProviderSummary[] {
    return this.listProviders().filter(p => p.capabilities.includes(capability));
  }

  // Lifecycle Management

  async startProvider(name: string, options?: StartOptions): Promise<void> {
    const enhancedProvider = this.enhancedProviders.get(name);
    if (enhancedProvider) {
      try {
        await enhancedProvider.instance.start();
        enhancedProvider.info.status = 'active';
        this.emitEvent(name, 'started', 'info', { timestamp: new Date() });
      } catch (error) {
        enhancedProvider.info.status = 'failed';
        throw new ProviderStartupError(name, error as Error);
      }
    } else {
      await this.baseRegistry.startProvider(name);
    }
  }

  async stopProvider(name: string, options?: StopOptions): Promise<void> {
    const enhancedProvider = this.enhancedProviders.get(name);
    if (enhancedProvider) {
      try {
        await enhancedProvider.instance.stop();
        enhancedProvider.info.status = 'stopped';
        this.emitEvent(name, 'stopped', 'info', { timestamp: new Date() });
      } catch (error) {
        console.error(`Error stopping enhanced provider ${name}:`, error);
        throw error;
      }
    } else {
      await this.baseRegistry.stopProvider(name);
    }
  }

  async restartProvider(name: string, options?: RestartOptions): Promise<void> {
    await this.stopProvider(name, options);
    await this.startProvider(name, options);
  }

  async startAllProviders(options?: StartOptions): Promise<void> {
    await this.start();
  }

  async stopAllProviders(options?: StopOptions): Promise<void> {
    await this.stop();
  }

  async restartAllProviders(options?: RestartOptions): Promise<void> {
    await this.stop();
    await this.start();
  }

  // Configuration Management

  async updateProviderConfig(name: string, config: Partial<ProviderConfiguration>): Promise<void> {
    const enhancedProvider = this.enhancedProviders.get(name);
    if (!enhancedProvider) {
      throw new ProviderNotFoundError(name);
    }

    const updatedConfig = { ...enhancedProvider.config, ...config };
    await enhancedProvider.instance.updateConfig(updatedConfig.config);
    enhancedProvider.config = updatedConfig;
    
    this.emitEvent(name, 'config_changed', 'info', { config: updatedConfig.id });
  }

  async reloadProviderConfig(name: string): Promise<void> {
    const enhancedProvider = this.enhancedProviders.get(name);
    if (!enhancedProvider) {
      throw new ProviderNotFoundError(name);
    }

    await enhancedProvider.instance.resetConfig();
  }

  async reloadAllConfigs(): Promise<void> {
    for (const name of this.enhancedProviders.keys()) {
      try {
        await this.reloadProviderConfig(name);
      } catch (error) {
        console.error(`Error reloading config for ${name}:`, error);
      }
    }
  }

  async exportConfiguration(): Promise<string> {
    const config = {
      factories: Array.from(this.enhancedFactories.keys()),
      providers: Array.from(this.enhancedProviders.entries()).map(([name, provider]) => ({
        name,
        config: provider.config
      }))
    };
    
    return JSON.stringify(config, null, 2);
  }

  async importConfiguration(config: string): Promise<void> {
    try {
      const parsed = JSON.parse(config);
      
      // Import provider configurations
      if (parsed.providers) {
        for (const { name, config: providerConfig } of parsed.providers) {
          if (!this.enhancedProviders.has(name)) {
            await this.registerProvider(name, providerConfig.type, providerConfig);
          } else {
            await this.updateProviderConfig(name, providerConfig);
          }
        }
      }
    } catch (error) {
      throw new ProviderRegistryError(`Configuration import failed: ${(error as Error).message}`);
    }
  }

  // Health and Monitoring

  async checkProviderHealth(name: string): Promise<ProviderStatus> {
    const enhancedProvider = this.enhancedProviders.get(name);
    if (!enhancedProvider) {
      throw new ProviderNotFoundError(name);
    }

    const health = await enhancedProvider.instance.getDetailedHealth();
    enhancedProvider.info.lastHealthCheck = new Date();
    enhancedProvider.info.health = health.health;
    enhancedProvider.info.errors = health.errors;
    enhancedProvider.info.warnings = health.warnings;
    
    return health;
  }

  async checkAllHealth(): Promise<Record<string, ProviderStatus>> {
    const results: Record<string, ProviderStatus> = {};
    
    for (const name of this.enhancedProviders.keys()) {
      try {
        results[name] = await this.checkProviderHealth(name);
      } catch (error) {
        results[name] = {
          status: 'failed',
          health: 'unhealthy',
          uptime: 0,
          lastCheck: new Date(),
          errors: 1,
          warnings: 0,
          performance: {
            responseTime: -1,
            throughput: 0,
            errorRate: 1
          },
          details: { error: (error as Error).message }
        };
      }
    }
    
    return results;
  }

  async getHealthSummary(): Promise<HealthSummary> {
    const allHealth = await this.checkAllHealth();
    const providers = Object.values(allHealth);
    
    const healthyProviders = providers.filter(p => p.health === 'healthy').length;
    const degradedProviders = providers.filter(p => p.health === 'degraded').length;
    const unhealthyProviders = providers.filter(p => p.health === 'unhealthy').length;
    const stoppedProviders = providers.filter(p => p.status === 'stopped').length;
    
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyProviders > 0) {
      overallHealth = 'unhealthy';
    } else if (degradedProviders > 0) {
      overallHealth = 'degraded';
    }
    
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    
    for (const [name, health] of Object.entries(allHealth)) {
      if (health.health === 'unhealthy') {
        criticalIssues.push(`Provider ${name} is unhealthy`);
      } else if (health.health === 'degraded') {
        warnings.push(`Provider ${name} is degraded`);
      }
    }
    
    return {
      totalProviders: providers.length,
      healthyProviders,
      degradedProviders,
      unhealthyProviders,
      stoppedProviders,
      overallHealth,
      criticalIssues,
      warnings
    };
  }

  // Metrics and Analytics

  async getProviderMetrics(name: string): Promise<ProviderMetrics> {
    const enhancedProvider = this.enhancedProviders.get(name);
    if (!enhancedProvider) {
      throw new ProviderNotFoundError(name);
    }

    return await enhancedProvider.instance.getMetrics();
  }

  async getAllMetrics(): Promise<Record<string, ProviderMetrics>> {
    const results: Record<string, ProviderMetrics> = {};
    
    for (const name of this.enhancedProviders.keys()) {
      try {
        results[name] = await this.getProviderMetrics(name);
      } catch (error) {
        console.error(`Error getting metrics for ${name}:`, error);
      }
    }
    
    return results;
  }

  async getMetricsSummary(): Promise<MetricsSummary> {
    const allMetrics = await this.getAllMetrics();
    const metrics = Object.values(allMetrics);
    
    const totalRequests = metrics.reduce((sum, m) => sum + m.requests.total, 0);
    const successfulRequests = metrics.reduce((sum, m) => sum + m.requests.successful, 0);
    const failedRequests = metrics.reduce((sum, m) => sum + m.requests.failed, 0);
    
    const avgResponseTime = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.performance.avgResponseTime, 0) / metrics.length 
      : 0;
    
    return {
      totalRequests,
      successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
      errorRate: totalRequests > 0 ? failedRequests / totalRequests : 0,
      avgResponseTime,
      totalProviders: this.enhancedProviders.size,
      activeProviders: Array.from(this.enhancedProviders.values()).filter(p => p.info.status === 'active').length,
      resourceUsage: {
        cpu: 0, // Would need system monitoring
        memory: process.memoryUsage().heapUsed,
        disk: 0, // Would need disk monitoring
        connections: metrics.reduce((sum, m) => sum + m.resources.connections, 0)
      },
      topPerformers: [], // Would need performance ranking
      bottlenecks: [] // Would need bottleneck detection
    };
  }

  // Events and Logging

  getProviderEvents(name: string, limit?: number): ProviderEvent[] {
    const events = this.eventHistory.filter(e => e.providerId === name);
    return limit ? events.slice(-limit) : events;
  }

  getAllEvents(limit?: number): ProviderEvent[] {
    return limit ? this.eventHistory.slice(-limit) : [...this.eventHistory];
  }

  subscribeToEvents(callback: (event: ProviderEvent) => void): () => void {
    const unsubscribe = () => {
      this.off('providerEvent', callback);
    };
    
    this.on('providerEvent', callback);
    return unsubscribe;
  }

  // Testing and Diagnostics

  async testProvider(name: string): Promise<TestResult> {
    const enhancedProvider = this.enhancedProviders.get(name);
    if (!enhancedProvider) {
      throw new ProviderNotFoundError(name);
    }

    try {
      const diagnostics = await enhancedProvider.instance.runDiagnostics();
      const allPassed = Object.values(diagnostics).every(result => result.success);
      
      return {
        success: allPassed,
        message: allPassed ? 'All diagnostics passed' : 'Some diagnostics failed',
        details: diagnostics
      };
    } catch (error) {
      return {
        success: false,
        message: `Diagnostics failed: ${(error as Error).message}`
      };
    }
  }

  async testAllProviders(): Promise<Record<string, TestResult>> {
    const results: Record<string, TestResult> = {};
    
    for (const name of this.enhancedProviders.keys()) {
      try {
        results[name] = await this.testProvider(name);
      } catch (error) {
        results[name] = {
          success: false,
          message: `Test failed: ${(error as Error).message}`
        };
      }
    }
    
    return results;
  }

  async runDiagnostics(name?: string): Promise<Record<string, TestResult>> {
    if (name) {
      return { [name]: await this.testProvider(name) };
    }
    
    return await this.testAllProviders();
  }

  // Automation and Setup

  async autoSetupProvider(type: ProviderType, config: Partial<ProviderConfiguration>): Promise<string> {
    const factory = this.findEnhancedFactoryForType(type);
    if (!factory) {
      throw new ProviderRegistryError(`No factory found for provider type: ${type}`);
    }

    if (!factory.canAutoSetup(type)) {
      throw new ProviderRegistryError(`Provider type ${type} does not support auto-setup`);
    }

    const fullConfig = {
      ...factory.generateDefaultConfig(type),
      ...config,
      id: config.id || `${type}-${Date.now()}`,
      name: config.name || `${type} Provider`
    };

    const providerName = fullConfig.name;
    await this.registerProvider(providerName, type, fullConfig);
    await this.startProvider(providerName);

    return providerName;
  }

  async migrateProvider(name: string, targetType: ProviderType, config?: Partial<ProviderConfiguration>): Promise<void> {
    const currentProvider = this.enhancedProviders.get(name);
    if (!currentProvider) {
      throw new ProviderNotFoundError(name);
    }

    // Export data from current provider
    const setupAutomation = currentProvider.instance.getSetupAutomation?.();
    const exportedData = setupAutomation ? await setupAutomation.exportData() : Buffer.alloc(0);

    // Stop and unregister current provider
    await this.stopProvider(name);
    await this.unregisterProvider(name);

    // Create new provider with target type
    const newConfig = {
      ...currentProvider.config,
      type: targetType,
      ...config
    };

    await this.registerProvider(name, targetType, newConfig);
    await this.startProvider(name);

    // Import data to new provider
    const newProvider = this.enhancedProviders.get(name);
    if (newProvider && exportedData.length > 0) {
      const newSetupAutomation = newProvider.instance.getSetupAutomation?.();
      if (newSetupAutomation) {
        await newSetupAutomation.importData(exportedData);
      }
    }
  }

  // Backup and Recovery

  async backupProvider(name: string): Promise<string> {
    const enhancedProvider = this.enhancedProviders.get(name);
    if (!enhancedProvider) {
      throw new ProviderNotFoundError(name);
    }

    const setupAutomation = enhancedProvider.instance.getSetupAutomation?.();
    if (setupAutomation) {
      return await setupAutomation.createBackup();
    }

    throw new ProviderRegistryError(`Provider ${name} does not support backup`);
  }

  async restoreProvider(name: string, backupId: string): Promise<void> {
    const enhancedProvider = this.enhancedProviders.get(name);
    if (!enhancedProvider) {
      throw new ProviderNotFoundError(name);
    }

    const setupAutomation = enhancedProvider.instance.getSetupAutomation?.();
    if (setupAutomation) {
      await setupAutomation.restoreBackup(backupId);
    } else {
      throw new ProviderRegistryError(`Provider ${name} does not support restore`);
    }
  }

  // Multi-service Provider Support

  getMultiServiceProviders(): string[] {
    return Array.from(this.enhancedProviders.entries())
      .filter(([_, provider]) => provider.info.isMultiService)
      .map(([name, _]) => name);
  }

  getProviderServices(name: string): string[] {
    const enhancedProvider = this.enhancedProviders.get(name);
    if (!enhancedProvider || !enhancedProvider.info.isMultiService) {
      return [];
    }

    const multiServiceProvider = enhancedProvider.instance.getMultiServiceProvider?.();
    return multiServiceProvider ? multiServiceProvider.getAvailableServices() : [];
  }

  isServiceEnabled(providerName: string, serviceName: string): boolean {
    const enhancedProvider = this.enhancedProviders.get(providerName);
    if (!enhancedProvider || !enhancedProvider.info.isMultiService) {
      return false;
    }

    const multiServiceProvider = enhancedProvider.instance.getMultiServiceProvider?.();
    return multiServiceProvider ? multiServiceProvider.isServiceEnabled(serviceName) : false;
  }

  async enableService(providerName: string, serviceName: string): Promise<void> {
    const enhancedProvider = this.enhancedProviders.get(providerName);
    if (!enhancedProvider || !enhancedProvider.info.isMultiService) {
      throw new ProviderRegistryError(`Provider ${providerName} is not a multi-service provider`);
    }

    const multiServiceProvider = enhancedProvider.instance.getMultiServiceProvider?.();
    if (multiServiceProvider) {
      await multiServiceProvider.enableService(serviceName);
    }
  }

  async disableService(providerName: string, serviceName: string): Promise<void> {
    const enhancedProvider = this.enhancedProviders.get(providerName);
    if (!enhancedProvider || !enhancedProvider.info.isMultiService) {
      throw new ProviderRegistryError(`Provider ${providerName} is not a multi-service provider`);
    }

    const multiServiceProvider = enhancedProvider.instance.getMultiServiceProvider?.();
    if (multiServiceProvider) {
      await multiServiceProvider.disableService(serviceName);
    }
  }

  // Wizard Integration

  getProviderWizardSteps(type: ProviderType): WizardStep[] {
    const factory = this.findEnhancedFactoryForType(type);
    if (!factory) {
      throw new ProviderRegistryError(`No factory found for provider type: ${type}`);
    }

    return factory.getWizardSteps(type);
  }

  async validateWizardStep(type: ProviderType, stepId: string, data: Record<string, unknown>): Promise<ValidationResult> {
    const factory = this.findEnhancedFactoryForType(type);
    if (!factory) {
      throw new ProviderRegistryError(`No factory found for provider type: ${type}`);
    }

    // Create a temporary provider to validate the step
    const tempConfig = factory.generateDefaultConfig(type);
    const tempProvider = await factory.createProvider(type, tempConfig);
    const wizardIntegration = tempProvider.getWizardIntegration?.();

    if (wizardIntegration) {
      return await wizardIntegration.validateStep(stepId, data);
    }

    return { valid: true, errors: [], warnings: [] };
  }

  async executeWizardStep(type: ProviderType, stepId: string, data: Record<string, unknown>): Promise<StepResult> {
    const factory = this.findEnhancedFactoryForType(type);
    if (!factory) {
      throw new ProviderRegistryError(`No factory found for provider type: ${type}`);
    }

    // Create a temporary provider to execute the step
    const tempConfig = factory.generateDefaultConfig(type);
    const tempProvider = await factory.createProvider(type, tempConfig);
    const wizardIntegration = tempProvider.getWizardIntegration?.();

    if (wizardIntegration) {
      return await wizardIntegration.executeStep(stepId, data);
    }

    return { success: false, error: 'Wizard integration not available' };
  }

  // Advanced Querying

  findProviders(query: ProviderQuery): ProviderSummary[] {
    return this.listProviders().filter(provider => {
      if (query.type && provider.type !== query.type) return false;
      if (query.category && provider.category !== query.category) return false;
      if (query.status && provider.status !== query.status) return false;
      if (query.health && provider.health !== query.health) return false;
      if (query.capability && !provider.capabilities.includes(query.capability)) return false;
      if (query.tag && !(provider as any).tags?.includes(query.tag)) return false;
      if (query.multiService !== undefined && provider.isMultiService !== query.multiService) return false;
      return true;
    });
  }

  searchProviders(searchTerm: string): ProviderSummary[] {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return this.listProviders().filter(provider => 
      provider.name.toLowerCase().includes(lowerSearchTerm) ||
      provider.type.toLowerCase().includes(lowerSearchTerm) ||
      provider.category.toLowerCase().includes(lowerSearchTerm) ||
      provider.capabilities.some(cap => cap.toLowerCase().includes(lowerSearchTerm))
    );
  }

  // Registry Information

  getRegistryInfo(): RegistryInfo {
    return {
      version: '1.0.0',
      startTime: this.startTime,
      environment: process.env.NODE_ENV || 'development',
      uptime: Date.now() - this.startTime.getTime(),
      totalProviders: this.enhancedProviders.size,
      activeProviders: Array.from(this.enhancedProviders.values()).filter(p => p.info.status === 'active').length,
      failedProviders: Array.from(this.enhancedProviders.values()).filter(p => p.info.status === 'failed').length,
      registeredFactories: this.enhancedFactories.size,
      supportedTypes: Array.from(this.enhancedFactories.values()).flatMap(f => f.getSupportedTypes()),
      features: ['enhanced-providers', 'multi-service', 'wizard-integration', 'auto-setup', 'health-monitoring', 'metrics-collection']
    };
  }

  async getRegistryMetrics(): Promise<RegistryMetrics> {
    const allMetrics = await this.getAllMetrics();
    const metrics = Object.values(allMetrics);
    
    const totalRequests = metrics.reduce((sum, m) => sum + m.requests.total, 0);
    const successfulRequests = metrics.reduce((sum, m) => sum + m.requests.successful, 0);
    const failedRequests = metrics.reduce((sum, m) => sum + m.requests.failed, 0);
    
    return {
      providers: {
        total: this.enhancedProviders.size,
        active: Array.from(this.enhancedProviders.values()).filter(p => p.info.status === 'active').length,
        stopped: Array.from(this.enhancedProviders.values()).filter(p => p.info.status === 'stopped').length,
        failed: Array.from(this.enhancedProviders.values()).filter(p => p.info.status === 'failed').length,
        byType: this.getProviderCountByType(),
        byCategory: this.getProviderCountByCategory()
      },
      performance: {
        avgStartupTime: 0, // Would need startup time tracking
        avgHealthCheckTime: 0, // Would need health check time tracking
        totalRequests,
        successfulRequests,
        failedRequests,
        avgResponseTime: metrics.length > 0 
          ? metrics.reduce((sum, m) => sum + m.performance.avgResponseTime, 0) / metrics.length 
          : 0
      },
      resources: {
        totalMemoryUsage: metrics.reduce((sum, m) => sum + m.resources.memoryUsage, 0),
        totalCpuUsage: metrics.reduce((sum, m) => sum + m.resources.cpuUsage, 0),
        totalDiskUsage: metrics.reduce((sum, m) => sum + m.resources.diskUsage, 0),
        totalConnections: metrics.reduce((sum, m) => sum + m.resources.connections, 0)
      },
      events: {
        total: this.eventHistory.length,
        errors: this.eventHistory.filter(e => e.severity === 'error').length,
        warnings: this.eventHistory.filter(e => e.severity === 'warning').length,
        info: this.eventHistory.filter(e => e.severity === 'info').length,
        recentEvents: this.eventHistory.slice(-10)
      },
      timestamp: new Date()
    };
  }

  async getRegistryHealth(): Promise<RegistryHealth> {
    const allHealth = await this.checkAllHealth();
    const healthSummary = await this.getHealthSummary();
    
    return {
      status: healthSummary.overallHealth,
      providers: allHealth,
      issues: {
        critical: healthSummary.criticalIssues,
        warnings: healthSummary.warnings,
        info: []
      },
      recommendations: this.generateHealthRecommendations(healthSummary),
      lastCheck: new Date()
    };
  }

  // Private Helper Methods

  private async registerBuiltInEnhancedFactories(): Promise<void> {
    // Register enhanced provider factories
    this.registerFactory(new PostgreSQLProviderFactory());
    // this.registerFactory(new SupabaseDatabaseProviderFactory()); // Temporarily disabled
    this.registerFactory(new LocalAuthProviderFactory());
    this.registerFactory(new PocketBaseProviderFactory());
    
    console.log('✅ Built-in enhanced provider factories registered');
  }

  private async registerEnhancedProvider(
    name: string, 
    type: ProviderType, 
    config: ProviderConfiguration,
    factory: IEnhancedProviderFactory
  ): Promise<void> {
    if (this.enhancedProviders.has(name)) {
      throw new ProviderRegistryError(`Enhanced provider '${name}' is already registered`);
    }

    try {
      // Create provider instance
      const providerInstance = await factory.createProvider(type, config);
      
      // Create enhanced provider info
      const info = {
        name,
        type,
        category: config.category,
        version: providerInstance.version,
        status: 'stopped' as ProviderStatus['status'],
        health: 'unknown' as ProviderStatus['health'],
        description: config.description,
        tags: config.tags,
        capabilities: providerInstance.getCapabilities(),
        isMultiService: providerInstance.isMultiService(),
        services: providerInstance.isMultiService() ? 
          providerInstance.getMultiServiceProvider?.()?.getAvailableServices() : undefined,
        registeredAt: new Date(),
        errors: 0,
        warnings: 0,
        uptime: 0
      };

      // Store enhanced provider instance
      const instance: EnhancedProviderInstance = {
        info,
        instance: providerInstance,
        config,
        dependencies: [],
        dependents: []
      };

      this.enhancedProviders.set(name, instance);
      this.emitEvent(name, 'started', 'info', { type, config: config.id });
      
      console.log(`✅ Registered enhanced provider: ${name} (${type})`);
      
    } catch (error) {
      throw new ProviderStartupError(name, error as Error);
    }
  }

  private async unregisterEnhancedProvider(name: string): Promise<boolean> {
    const enhancedProvider = this.enhancedProviders.get(name);
    if (!enhancedProvider) {
      return false;
    }

    try {
      // Stop the provider
      await enhancedProvider.instance.stop();
      
      // Remove from dependents
      for (const dependent of enhancedProvider.dependents) {
        const depIndex = dependent.dependencies.indexOf(enhancedProvider);
        if (depIndex >= 0) {
          dependent.dependencies.splice(depIndex, 1);
        }
      }
      
      this.enhancedProviders.delete(name);
      this.emitEvent(name, 'stopped', 'info', { timestamp: new Date() });
      
      console.log(`✅ Unregistered enhanced provider: ${name}`);
      return true;
      
    } catch (error) {
      console.error(`Error unregistering enhanced provider ${name}:`, error);
      throw error;
    }
  }

  private findEnhancedFactoryForType(type: ProviderType): IEnhancedProviderFactory | undefined {
    for (const factory of this.enhancedFactories.values()) {
      if (factory.getSupportedTypes().includes(type)) {
        return factory;
      }
    }
    return undefined;
  }

  private setupEventForwarding(): void {
    // Forward base registry events
    // This would require the base registry to expose events
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkAllHealth();
      } catch (error) {
        console.error('Health check error:', error);
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
        
        // Store metrics for historical analysis
        for (const [name, metrics] of Object.entries(allMetrics)) {
          if (!this.providerMetrics.has(name)) {
            this.providerMetrics.set(name, []);
          }
          
          const metricsHistory = this.providerMetrics.get(name)!;
          metricsHistory.push(metrics);
          
          // Keep only last 100 metrics entries
          if (metricsHistory.length > 100) {
            metricsHistory.splice(0, metricsHistory.length - 100);
          }
        }
      } catch (error) {
        console.error('Metrics collection error:', error);
      }
    }, this.METRICS_COLLECTION_INTERVAL);
  }

  private stopMetricsCollection(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }
  }

  private emitEvent(
    providerId: string, 
    type: ProviderEvent['type'], 
    severity: ProviderEvent['severity'], 
    data?: Record<string, unknown>
  ): void {
    const event: ProviderEvent = {
      id: `${providerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      providerId,
      timestamp: new Date(),
      severity,
      data
    };
    
    this.eventHistory.push(event);
    
    // Keep only last MAX_EVENT_HISTORY events
    if (this.eventHistory.length > this.MAX_EVENT_HISTORY) {
      this.eventHistory = this.eventHistory.slice(-this.MAX_EVENT_HISTORY);
    }
    
    this.emit('providerEvent', event);
  }

  private getProviderCountByType(): Record<ProviderType, number> {
    const counts = {} as Record<ProviderType, number>;
    
    for (const provider of this.enhancedProviders.values()) {
      counts[provider.info.type] = (counts[provider.info.type] || 0) + 1;
    }
    
    return counts;
  }

  private getProviderCountByCategory(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const provider of this.enhancedProviders.values()) {
      counts[provider.info.category] = (counts[provider.info.category] || 0) + 1;
    }
    
    return counts;
  }

  private generateHealthRecommendations(healthSummary: HealthSummary): string[] {
    const recommendations: string[] = [];
    
    if (healthSummary.unhealthyProviders > 0) {
      recommendations.push('Investigate and fix unhealthy providers immediately');
    }
    
    if (healthSummary.degradedProviders > 0) {
      recommendations.push('Monitor degraded providers and consider optimization');
    }
    
    if (healthSummary.stoppedProviders > 0) {
      recommendations.push('Review stopped providers and restart if needed');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All providers are healthy');
    }
    
    return recommendations;
  }
}