/**
 * Provider Registry Interface
 * 
 * Central registry and coordination system for all providers:
 * - Provider registration and discovery
 * - Lifecycle management (initialize, start, stop, destroy)
 * - Health monitoring and metrics aggregation
 * - Dependency resolution between providers
 * - Event system for provider state changes
 * - Plugin architecture support
 */

import { IDatabaseProvider, DatabaseHealthStatus } from './database-provider';
import { IAuthenticationProvider, AuthHealthStatus } from './auth-provider';
import { IProviderConfigManager, ProviderConfigSet, BaseProviderConfig } from './provider-config';

export interface ProviderInfo {
  name: string;
  type: ProviderType;
  version: string;
  status: ProviderStatus;
  description?: string;
  author?: string;
  homepage?: string;
  dependencies?: string[];
  capabilities?: string[];
  tags?: string[];
  registeredAt: Date;
  lastHealthCheck?: Date;
}

export type ProviderType = 'database' | 'auth' | 'email' | 'storage' | 'notification' | 'cache' | 'queue' | 'custom';
export type ProviderStatus = 'registered' | 'initializing' | 'active' | 'degraded' | 'failed' | 'stopped';

export interface ProviderInstance {
  info: ProviderInfo;
  instance: IProvider;
  config: BaseProviderConfig;
  dependencies: ProviderInstance[];
  dependents: ProviderInstance[];
}

export interface ProviderHealthSummary {
  name: string;
  type: ProviderType;
  status: ProviderStatus;
  health: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  uptime: number;
  errors: number;
  warnings: number;
  details?: Record<string, unknown>;
}

export interface RegistryMetrics {
  // Provider counts
  totalProviders: number;
  activeProviders: number;
  failedProviders: number;
  
  // Health status
  healthyProviders: number;
  degradedProviders: number;
  unhealthyProviders: number;
  
  // Performance
  avgStartupTime: number;
  avgHealthCheckTime: number;
  totalRequests: number;
  totalErrors: number;
  
  // Uptime
  registryUptime: number;
  oldestProviderUptime: number;
  
  lastUpdated: Date;
}

/**
 * Base provider interface that all providers must implement
 */
export interface IProvider {
  // Provider metadata
  readonly name: string;
  readonly type: ProviderType;
  readonly version: string;
  
  // Lifecycle management
  initialize(config: BaseProviderConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;
  
  // Status and health
  getStatus(): ProviderStatus;
  getHealth(): Promise<ProviderHealthSummary>;
  
  // Configuration
  updateConfig(config: Partial<BaseProviderConfig>): Promise<void>;
  getConfig(): BaseProviderConfig;
  
  // Dependencies
  getDependencies(): string[];
  setDependency?(name: string, provider: IProvider): void;
  
  // Events
  on?(event: string, callback: Function): void;
  off?(event: string, callback: Function): void;
  emit?(event: string, ...args: unknown[]): void;
}

/**
 * Provider factory interface for creating provider instances
 */
export interface IProviderFactory<T extends IProvider = IProvider> {
  readonly supportedTypes: string[];
  readonly name: string;
  readonly version: string;
  
  createProvider(type: string, config: BaseProviderConfig): Promise<T>;
  validateConfig(type: string, config: BaseProviderConfig): Promise<boolean>;
  getDefaultConfig(type: string): BaseProviderConfig;
  
  // Plugin support
  supportsPlugin?(pluginName: string): boolean;
  loadPlugin?(pluginName: string, pluginConfig: Record<string, unknown>): Promise<void>;
}

/**
 * Provider event system
 */
export interface ProviderEvent {
  type: ProviderEventType;
  providerId: string;
  timestamp: Date;
  data?: Record<string, unknown>;
  error?: Error;
}

export type ProviderEventType = 
  | 'provider_registered'
  | 'provider_unregistered'
  | 'provider_initialized'
  | 'provider_started'
  | 'provider_stopped'
  | 'provider_failed'
  | 'provider_health_changed'
  | 'provider_config_updated'
  | 'dependency_resolved'
  | 'dependency_failed';

export interface IProviderEventEmitter {
  on(event: ProviderEventType, callback: (event: ProviderEvent) => void): void;
  off(event: ProviderEventType, callback: (event: ProviderEvent) => void): void;
  emit(event: ProviderEventType, providerId: string, data?: Record<string, unknown>, error?: Error): void;
  getEventHistory(providerId?: string, limit?: number): ProviderEvent[];
}

/**
 * Main provider registry interface
 */
export interface IProviderRegistry extends IProviderEventEmitter {
  // Registry lifecycle
  initialize(configManager: IProviderConfigManager): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;
  
  // Provider registration
  registerFactory(factory: IProviderFactory): void;
  unregisterFactory(factoryName: string): boolean;
  listFactories(): string[];
  
  // Provider management
  registerProvider(name: string, type: ProviderType, config: BaseProviderConfig): Promise<void>;
  unregisterProvider(name: string): Promise<boolean>;
  getProvider<T extends IProvider = IProvider>(name: string): T | undefined;
  listProviders(type?: ProviderType): ProviderInfo[];
  hasProvider(name: string): boolean;
  
  // Provider lifecycle control
  startProvider(name: string): Promise<void>;
  stopProvider(name: string): Promise<void>;
  restartProvider(name: string): Promise<void>;
  startAllProviders(): Promise<void>;
  stopAllProviders(): Promise<void>;
  
  // Configuration management
  updateProviderConfig(name: string, config: Partial<BaseProviderConfig>): Promise<void>;
  reloadProviderConfig(name: string): Promise<void>;
  reloadAllConfigs(): Promise<void>;
  
  // Health monitoring
  checkProviderHealth(name: string): Promise<ProviderHealthSummary>;
  checkAllHealth(): Promise<Record<string, ProviderHealthSummary>>;
  getHealthSummary(): Promise<RegistryMetrics>;
  
  // Dependency management
  resolveDependencies(): Promise<void>;
  getDependencyGraph(): Record<string, string[]>;
  getStartupOrder(): string[];
  
  // Registry information
  getInfo(): RegistryInfo;
  getMetrics(): Promise<RegistryMetrics>;
  
  // Utilities
  findProviders(filter: ProviderFilter): ProviderInfo[];
  getProvidersByType(type: ProviderType): ProviderInfo[];
  getProvidersWithCapability(capability: string): ProviderInfo[];
}

export interface RegistryInfo {
  version: string;
  startTime: Date;
  environment: string;
  totalProviders: number;
  activeProviders: number;
  failedProviders: number;
  uptime: number;
}

export interface ProviderFilter {
  type?: ProviderType;
  status?: ProviderStatus;
  health?: 'healthy' | 'degraded' | 'unhealthy';
  capability?: string;
  tag?: string;
  name?: string;
}

/**
 * High-level provider manager that provides convenient access to common provider types
 */
export interface IProviderManager {
  // Registry access
  getRegistry(): IProviderRegistry;
  
  // Database providers
  getDatabaseProvider(name?: string): IDatabaseProvider | undefined;
  getDefaultDatabaseProvider(): IDatabaseProvider | undefined;
  listDatabaseProviders(): string[];
  
  // Authentication providers
  getAuthProvider(name?: string): IAuthenticationProvider | undefined;
  getDefaultAuthProvider(): IAuthenticationProvider | undefined;
  listAuthProviders(): string[];
  
  // Generic provider access
  getProvider<T extends IProvider>(name: string): T | undefined;
  
  // Configuration shortcuts
  updateConfig(providerName: string, config: Partial<BaseProviderConfig>): Promise<void>;
  reloadConfigs(): Promise<void>;
  
  // Health monitoring shortcuts
  getOverallHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'>;
  getFailedProviders(): Promise<string[]>;
  
  // Lifecycle shortcuts
  startAll(): Promise<void>;
  stopAll(): Promise<void>;
  restart(): Promise<void>;
}

/**
 * Provider plugin system
 */
export interface IProviderPlugin {
  readonly name: string;
  readonly version: string;
  readonly providesCapabilities: string[];
  readonly requiredProviders: string[];
  
  initialize(registry: IProviderRegistry): Promise<void>;
  destroy(): Promise<void>;
  
  // Plugin can extend provider functionality
  extendProvider?(providerName: string, extensions: Record<string, Function>): void;
  
  // Plugin can provide middleware
  getMiddleware?(): Function[];
  
  // Plugin configuration
  configure?(config: Record<string, unknown>): Promise<void>;
  getDefaultConfig?(): Record<string, unknown>;
}

/**
 * Provider service discovery for microservices environments
 */
export interface IProviderDiscovery {
  // Service discovery
  discoverProviders(): Promise<ProviderInfo[]>;
  registerService(info: ProviderInfo, endpoint: string): Promise<void>;
  unregisterService(name: string): Promise<void>;
  
  // Health checking for remote providers
  checkRemoteHealth(endpoint: string): Promise<ProviderHealthSummary>;
  
  // Event broadcasting
  broadcastEvent(event: ProviderEvent): Promise<void>;
  subscribeToEvents(callback: (event: ProviderEvent) => void): void;
}

/**
 * Provider registry errors
 */
export class ProviderRegistryError extends Error {
  constructor(
    message: string,
    public readonly provider?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ProviderRegistryError';
  }
}

export class ProviderNotFoundError extends ProviderRegistryError {
  constructor(providerName: string) {
    super(`Provider '${providerName}' not found`, providerName, 'PROVIDER_NOT_FOUND');
    this.name = 'ProviderNotFoundError';
  }
}

export class ProviderDependencyError extends ProviderRegistryError {
  constructor(provider: string, dependency: string) {
    super(`Provider '${provider}' depends on '${dependency}' which is not available`, provider, 'DEPENDENCY_ERROR');
    this.name = 'ProviderDependencyError';
  }
}

export class ProviderLifecycleError extends ProviderRegistryError {
  constructor(provider: string, operation: string, originalError: Error) {
    super(`Provider '${provider}' failed during ${operation}: ${originalError.message}`, provider, `LIFECYCLE_${operation.toUpperCase()}_FAILED`);
    this.name = 'ProviderLifecycleError';
  }
}

export class CircularDependencyError extends ProviderRegistryError {
  constructor(cycle: string[]) {
    super(`Circular dependency detected: ${cycle.join(' -> ')}`, undefined, 'CIRCULAR_DEPENDENCY');
    this.name = 'CircularDependencyError';
  }
}