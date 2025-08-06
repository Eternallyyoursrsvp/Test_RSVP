/**
 * Enhanced Provider Types for Comprehensive Backend Services
 * 
 * Defines extended provider types to support enterprise-grade backend services
 * including database, authentication, email, storage, and real-time capabilities.
 */

export type ProviderType = 
  // Database Providers
  | 'postgresql' 
  | 'mysql' 
  | 'sqlite' 
  | 'mongodb' 
  | 'supabase-db'
  | 'pocketbase-db'
  
  // Authentication Providers  
  | 'local-auth'
  | 'jwt-local-auth'
  | 'oauth2-auth'
  | 'supabase-auth'
  | 'pocketbase-auth'
  | 'custom-auth'
  
  // Email Providers
  | 'smtp-email'
  | 'sendgrid-email'
  | 'resend-email'
  | 'gmail-oauth-email'
  | 'outlook-oauth-email'
  | 'ses-email'
  | 'mailgun-email'
  | 'pocketbase-email'
  
  // Storage Providers
  | 'local-storage'
  | 's3-storage'
  | 'gcs-storage'
  | 'azure-storage'
  | 'supabase-storage'
  | 'pocketbase-storage'
  
  // Real-time Providers
  | 'websocket-realtime'
  | 'sse-realtime'
  | 'supabase-realtime'
  | 'pocketbase-realtime'
  
  // Multi-service Providers (All-in-one solutions)
  | 'pocketbase-all-in-one'
  | 'supabase-all-in-one'
  | 'firebase-all-in-one';

export interface ProviderCapability {
  name: string;
  version: string;
  supported: boolean;
  configuration?: Record<string, unknown>;
}

export interface ProviderFeatures {
  // Database capabilities
  database?: {
    transactions: boolean;
    migrations: boolean;
    relationships: boolean;
    fullTextSearch: boolean;
    realTimeSubscriptions: boolean;
    backup: boolean;
  };
  
  // Authentication capabilities
  authentication?: {
    localAuth: boolean;
    oauth2: boolean;
    jwt: boolean;
    mfa: boolean;
    passwordReset: boolean;
    emailVerification: boolean;
    sessionManagement: boolean;
    rbac: boolean;
  };
  
  // Email capabilities
  email?: {
    transactional: boolean;
    templates: boolean;
    tracking: boolean;
    scheduling: boolean;
    attachments: boolean;
    webhooks: boolean;
  };
  
  // Storage capabilities
  storage?: {
    fileUpload: boolean;
    imageProcessing: boolean;
    cdn: boolean;
    versioning: boolean;
    publicAccess: boolean;
    privateAccess: boolean;
    presignedUrls: boolean;
  };
  
  // Real-time capabilities
  realtime?: {
    websockets: boolean;
    serverSentEvents: boolean;
    pubsub: boolean;
    presence: boolean;
    broadcasting: boolean;
  };
  
  // Administrative capabilities
  admin?: {
    dashboard: boolean;
    userManagement: boolean;
    analytics: boolean;
    logs: boolean;
    monitoring: boolean;
  };
}

export interface ProviderDependency {
  type: ProviderType;
  name: string;
  required: boolean;
  version?: string;
}

export interface ProviderCompatibility {
  // Framework compatibility
  frameworks: string[];
  
  // Deployment compatibility
  deployment: {
    standalone: boolean;
    docker: boolean;
    serverless: boolean;
    edge: boolean;
  };
  
  // Environment compatibility
  environment: {
    development: boolean;
    staging: boolean;
    production: boolean;
  };
  
  // Scale compatibility
  scale: {
    singleTenant: boolean;
    multiTenant: boolean;
    enterprise: boolean;
  };
}

export interface ProviderConfiguration {
  // Provider identification
  id: string;
  name: string;
  type: ProviderType;
  version: string;
  
  // Provider metadata
  description?: string;
  tags?: string[];
  category: 'database' | 'auth' | 'email' | 'storage' | 'realtime' | 'all-in-one';
  
  // Provider capabilities
  features: ProviderFeatures;
  compatibility: ProviderCompatibility;
  dependencies: ProviderDependency[];
  
  // Provider configuration
  config: Record<string, unknown>;
  secrets: Record<string, string>;
  
  // Provider settings
  enabled: boolean;
  autoStart: boolean;
  healthCheck: boolean;
  
  // Provider lifecycle
  priority: number;
  timeout: number;
  retries: number;
}

export interface ProviderStatus {
  status: 'stopped' | 'starting' | 'active' | 'degraded' | 'failed' | 'maintenance';
  health: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  lastCheck: Date;
  errors: number;
  warnings: number;
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
  details?: Record<string, unknown>;
}

export interface ProviderMetrics {
  // Request metrics
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number;
  };
  
  // Performance metrics
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
  };
  
  // Resource metrics
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    connections: number;
  };
  
  // Business metrics
  business?: {
    activeUsers: number;
    totalRecords: number;
    emailsSent: number;
    filesStored: number;
  };
  
  // Metadata
  timestamp: Date;
  period: string;
}

export interface ProviderEvent {
  id: string;
  type: 'started' | 'stopped' | 'failed' | 'recovered' | 'config_changed' | 'health_changed';
  providerId: string;
  timestamp: Date;
  data?: Record<string, unknown>;
  error?: Error;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * Multi-service provider interface for all-in-one solutions like PocketBase
 */
export interface MultiServiceProvider {
  // Service management
  getAvailableServices(): string[];
  isServiceEnabled(service: string): boolean;
  enableService(service: string): Promise<void>;
  disableService(service: string): Promise<void>;
  
  // Service configuration
  getServiceConfig(service: string): Record<string, unknown>;
  updateServiceConfig(service: string, config: Record<string, unknown>): Promise<void>;
  
  // Service health
  getServiceHealth(service: string): Promise<ProviderStatus>;
  getAllServicesHealth(): Promise<Record<string, ProviderStatus>>;
  
  // Service metrics
  getServiceMetrics(service: string): Promise<ProviderMetrics>;
  getAllServicesMetrics(): Promise<Record<string, ProviderMetrics>>;
}

/**
 * Provider setup automation interface
 */
export interface ProviderSetupAutomation {
  // Setup capabilities
  canAutoSetup(): boolean;
  getSetupSteps(): string[];
  
  // Schema management
  createSchema(): Promise<void>;
  migrateSchema(from: string, to: string): Promise<void>;
  
  // Initial configuration
  generateDefaultConfig(): Record<string, unknown>;
  validateConfiguration(config: Record<string, unknown>): Promise<boolean>;
  
  // Data migration
  exportData(): Promise<Buffer>;
  importData(data: Buffer): Promise<void>;
  
  // Backup and restore
  createBackup(): Promise<string>;
  restoreBackup(backupId: string): Promise<void>;
}

/**
 * Provider wizard integration interface
 */
export interface ProviderWizardIntegration {
  // Wizard steps
  getWizardSteps(): WizardStep[];
  validateStep(stepId: string, data: Record<string, unknown>): Promise<ValidationResult>;
  executeStep(stepId: string, data: Record<string, unknown>): Promise<StepResult>;
  
  // Provider testing
  testConnection(config: Record<string, unknown>): Promise<TestResult>;
  testFeatures(features: string[]): Promise<Record<string, TestResult>>;
  
  // Preview capabilities
  generatePreview(config: Record<string, unknown>): Promise<PreviewResult>;
}

export interface WizardStep {
  id: string;
  name: string;
  description: string;
  required: boolean;
  fields: WizardField[];
  dependencies?: string[];
}

export interface WizardField {
  id: string;
  name: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select' | 'file' | 'json';
  label: string;
  description?: string;
  required: boolean;
  validation?: string;
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StepResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  nextStep?: string;
}

export interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
  latency?: number;
}

export interface PreviewResult {
  success: boolean;
  preview: {
    schema?: Record<string, unknown>;
    sampleData?: Record<string, unknown>[];
    endpoints?: string[];
    features?: string[];
  };
  estimatedSetupTime?: number;
}