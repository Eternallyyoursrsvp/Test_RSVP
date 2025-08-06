/**
 * Enhanced Provider Registry Interface
 * 
 * Extends the base provider registry to support multi-service providers,
 * automated setup, wizard integration, and enterprise-grade management.
 */

import {
  ProviderType,
  ProviderConfiguration,
  ProviderStatus,
  ProviderMetrics,
  ProviderEvent,
  MultiServiceProvider,
  ProviderSetupAutomation,
  ProviderWizardIntegration,
  TestResult,
  ValidationResult
} from './provider-types';

import { IProvider } from './provider-registry';

/**
 * Enhanced provider interface with multi-service and automation support
 */
export interface IEnhancedProvider extends IProvider {
  // Enhanced capabilities
  getProviderType(): ProviderType;
  getCapabilities(): string[];
  isMultiService(): boolean;
  
  // Multi-service support
  getMultiServiceProvider?(): MultiServiceProvider;
  
  // Setup automation
  getSetupAutomation?(): ProviderSetupAutomation;
  
  // Wizard integration
  getWizardIntegration?(): ProviderWizardIntegration;
  
  // Enhanced health monitoring
  getDetailedHealth(): Promise<ProviderStatus>;
  getMetrics(): Promise<ProviderMetrics>;
  
  // Configuration management
  validateConfig(config: Record<string, unknown>): Promise<ValidationResult>;
  updateConfig(config: Record<string, unknown>): Promise<void>;
  resetConfig(): Promise<void>;
  
  // Testing and debugging
  runDiagnostics(): Promise<Record<string, TestResult>>;
  getDebugInfo(): Promise<Record<string, unknown>>;
}

/**
 * Enhanced provider factory with automation and testing support
 */
export interface IEnhancedProviderFactory {
  // Basic factory methods
  createProvider(type: ProviderType, config: ProviderConfiguration): Promise<IEnhancedProvider>;
  getSupportedTypes(): ProviderType[];
  validateConfig(type: ProviderType, config: ProviderConfiguration): Promise<ValidationResult>;
  
  // Enhanced capabilities
  getProviderInfo(type: ProviderType): ProviderInfo;
  getProviderRequirements(type: ProviderType): ProviderRequirements;
  
  // Automation support
  canAutoSetup(type: ProviderType): boolean;
  generateDefaultConfig(type: ProviderType): ProviderConfiguration;
  
  // Testing support
  testProviderType(type: ProviderType, config: ProviderConfiguration): Promise<TestResult>;
  
  // Wizard support
  getWizardSteps(type: ProviderType): import('./provider-types').WizardStep[];
}

export interface ProviderInfo {
  type: ProviderType;
  name: string;
  description: string;
  category: string;
  vendor: string;
  version: string;
  documentation: string;
  features: string[];
  tags: string[];
  maturity: 'experimental' | 'beta' | 'stable' | 'deprecated';
  pricing: 'free' | 'freemium' | 'paid' | 'enterprise';
}

export interface ProviderRequirements {
  // System requirements
  system: {
    os: string[];
    architecture: string[];
    memory: number;
    disk: number;
    cpu: number;
  };
  
  // Runtime requirements
  runtime: {
    node?: string;
    python?: string;
    go?: string;
    docker?: string;
  };
  
  // Network requirements
  network: {
    ports: number[];
    protocols: string[];
    outbound: string[];
    inbound: string[];
  };
  
  // Dependencies
  dependencies: {
    required: string[];
    optional: string[];
    conflicting: string[];
  };
}

/**
 * Enhanced provider registry with comprehensive management capabilities
 */
export interface IEnhancedProviderRegistry {
  // Basic registry methods (inherited)
  registerFactory(factory: IEnhancedProviderFactory): void;
  unregisterFactory(factoryName: string): boolean;
  listFactories(): string[];
  
  registerProvider(name: string, type: ProviderType, config: ProviderConfiguration): Promise<void>;
  unregisterProvider(name: string): Promise<boolean>;
  getProvider<T extends IEnhancedProvider = IEnhancedProvider>(name: string): T | undefined;
  listProviders(type?: ProviderType): ProviderSummary[];
  hasProvider(name: string): boolean;
  
  // Enhanced management
  getProviderInfo(name: string): ProviderDetails | undefined;
  getProvidersByCategory(category: string): ProviderSummary[];
  getProvidersByCapability(capability: string): ProviderSummary[];
  
  // Lifecycle management
  startProvider(name: string, options?: StartOptions): Promise<void>;
  stopProvider(name: string, options?: StopOptions): Promise<void>;
  restartProvider(name: string, options?: RestartOptions): Promise<void>;
  
  startAllProviders(options?: StartOptions): Promise<void>;
  stopAllProviders(options?: StopOptions): Promise<void>;
  restartAllProviders(options?: RestartOptions): Promise<void>;
  
  // Configuration management
  updateProviderConfig(name: string, config: Partial<ProviderConfiguration>): Promise<void>;
  reloadProviderConfig(name: string): Promise<void>;
  reloadAllConfigs(): Promise<void>;
  exportConfiguration(): Promise<string>;
  importConfiguration(config: string): Promise<void>;
  
  // Health and monitoring
  checkProviderHealth(name: string): Promise<ProviderStatus>;
  checkAllHealth(): Promise<Record<string, ProviderStatus>>;
  getHealthSummary(): Promise<HealthSummary>;
  
  // Metrics and analytics
  getProviderMetrics(name: string): Promise<ProviderMetrics>;
  getAllMetrics(): Promise<Record<string, ProviderMetrics>>;
  getMetricsSummary(): Promise<MetricsSummary>;
  
  // Events and logging
  getProviderEvents(name: string, limit?: number): ProviderEvent[];
  getAllEvents(limit?: number): ProviderEvent[];
  subscribeToEvents(callback: (event: ProviderEvent) => void): () => void;
  
  // Testing and diagnostics
  testProvider(name: string): Promise<TestResult>;
  testAllProviders(): Promise<Record<string, TestResult>>;
  runDiagnostics(name?: string): Promise<Record<string, TestResult>>;
  
  // Automation and setup
  autoSetupProvider(type: ProviderType, config: Partial<ProviderConfiguration>): Promise<string>;
  migrateProvider(name: string, targetType: ProviderType, config?: Partial<ProviderConfiguration>): Promise<void>;
  
  // Backup and recovery
  backupProvider(name: string): Promise<string>;
  restoreProvider(name: string, backupId: string): Promise<void>;
  
  // Multi-service provider support
  getMultiServiceProviders(): string[];
  getProviderServices(name: string): string[];
  isServiceEnabled(providerName: string, serviceName: string): boolean;
  enableService(providerName: string, serviceName: string): Promise<void>;
  disableService(providerName: string, serviceName: string): Promise<void>;
  
  // Wizard integration
  getProviderWizardSteps(type: ProviderType): import('./provider-types').WizardStep[];
  validateWizardStep(type: ProviderType, stepId: string, data: Record<string, unknown>): Promise<ValidationResult>;
  executeWizardStep(type: ProviderType, stepId: string, data: Record<string, unknown>): Promise<import('./provider-types').StepResult>;
  
  // Advanced querying
  findProviders(query: ProviderQuery): ProviderSummary[];
  searchProviders(searchTerm: string): ProviderSummary[];
  
  // Registry information
  getRegistryInfo(): RegistryInfo;
  getRegistryMetrics(): Promise<RegistryMetrics>;
  getRegistryHealth(): Promise<RegistryHealth>;
}

export interface ProviderSummary {
  name: string;
  type: ProviderType;
  category: string;
  status: ProviderStatus['status'];
  health: ProviderStatus['health'];
  version: string;
  uptime: number;
  capabilities: string[];
  isMultiService: boolean;
  services?: string[];
}

export interface ProviderDetails extends ProviderSummary {
  description: string;
  configuration: ProviderConfiguration;
  dependencies: string[];
  dependents: string[];
  lastHealthCheck: Date;
  errors: number;
  warnings: number;
  performance: ProviderStatus['performance'];
  features: string[];
  tags: string[];
}

export interface StartOptions {
  timeout?: number;
  retries?: number;
  force?: boolean;
  dependencies?: boolean;
}

export interface StopOptions {
  timeout?: number;
  force?: boolean;
  graceful?: boolean;
  dependents?: boolean;
}

export interface RestartOptions extends StartOptions, StopOptions {
  reason?: string;
}

export interface HealthSummary {
  totalProviders: number;
  healthyProviders: number;
  degradedProviders: number;
  unhealthyProviders: number;
  stoppedProviders: number;
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  criticalIssues: string[];
  warnings: string[];
}

export interface MetricsSummary {
  totalRequests: number;
  successRate: number;
  errorRate: number;
  avgResponseTime: number;
  totalProviders: number;
  activeProviders: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
    connections: number;
  };
  topPerformers: string[];
  bottlenecks: string[];
}

export interface ProviderQuery {
  type?: ProviderType;
  category?: string;
  status?: ProviderStatus['status'];
  health?: ProviderStatus['health'];
  capability?: string;
  tag?: string;
  multiService?: boolean;
  autoSetup?: boolean;
}

export interface RegistryInfo {
  version: string;
  startTime: Date;
  environment: string;
  uptime: number;
  totalProviders: number;
  activeProviders: number;
  failedProviders: number;
  registeredFactories: number;
  supportedTypes: ProviderType[];
  features: string[];
}

export interface RegistryMetrics {
  // Provider statistics
  providers: {
    total: number;
    active: number;
    stopped: number;
    failed: number;
    byType: Record<ProviderType, number>;
    byCategory: Record<string, number>;
  };
  
  // Performance statistics
  performance: {
    avgStartupTime: number;
    avgHealthCheckTime: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
  };
  
  // Resource statistics
  resources: {
    totalMemoryUsage: number;
    totalCpuUsage: number;
    totalDiskUsage: number;
    totalConnections: number;
  };
  
  // Event statistics
  events: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    recentEvents: ProviderEvent[];
  };
  
  timestamp: Date;
}

export interface RegistryHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  providers: Record<string, ProviderStatus>;
  issues: {
    critical: string[];
    warnings: string[];
    info: string[];
  };
  recommendations: string[];
  lastCheck: Date;
}

/**
 * Provider registry error types
 */
export class ProviderRegistryError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'ProviderRegistryError';
  }
}

export class ProviderNotFoundError extends ProviderRegistryError {
  constructor(providerName: string) {
    super(`Provider '${providerName}' not found`, 'PROVIDER_NOT_FOUND');
    this.name = 'ProviderNotFoundError';
  }
}

export class ProviderStartupError extends ProviderRegistryError {
  constructor(providerName: string, cause: Error) {
    super(`Failed to start provider '${providerName}': ${cause.message}`, 'PROVIDER_STARTUP_FAILED');
    this.name = 'ProviderStartupError';
    this.cause = cause;
  }
}

export class ProviderConfigurationError extends ProviderRegistryError {
  constructor(providerName: string, configField: string, issue: string) {
    super(`Configuration error in provider '${providerName}' for field '${configField}': ${issue}`, 'PROVIDER_CONFIG_ERROR');
    this.name = 'ProviderConfigurationError';
  }
}

export class ProviderDependencyError extends ProviderRegistryError {
  constructor(providerName: string, dependencyName: string) {
    super(`Provider '${providerName}' has unresolved dependency: '${dependencyName}'`, 'PROVIDER_DEPENDENCY_ERROR');
    this.name = 'ProviderDependencyError';
  }
}

export class ProviderHealthError extends ProviderRegistryError {
  constructor(providerName: string, healthIssue: string) {
    super(`Provider '${providerName}' health check failed: ${healthIssue}`, 'PROVIDER_HEALTH_ERROR');
    this.name = 'ProviderHealthError';
  }
}