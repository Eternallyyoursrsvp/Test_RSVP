/**
 * Provider Configuration Management Interface
 * 
 * Centralized configuration system for all providers:
 * - Environment-based configuration
 * - Runtime configuration updates
 * - Configuration validation
 * - Secrets management
 * - Configuration versioning
 */

import { DatabaseConnectionConfig } from './database-provider';
import { AuthProviderConfig } from './auth-provider';

export interface BaseProviderConfig {
  // Provider identification
  name: string;
  type: string;
  version?: string;
  enabled: boolean;
  
  // Environment settings
  environment: 'development' | 'staging' | 'production' | 'test';
  
  // Health check settings
  healthCheck?: {
    enabled: boolean;
    interval: number; // milliseconds
    timeout: number;
    retries: number;
  };
  
  // Logging settings
  logging?: {
    level: 'error' | 'warn' | 'info' | 'debug';
    enabled: boolean;
    includeMetadata: boolean;
  };
  
  // Performance settings
  performance?: {
    caching: boolean;
    cacheTTL: number;
    rateLimiting: boolean;
    maxRequestsPerMinute: number;
  };
  
  // Security settings
  security?: {
    encryptionEnabled: boolean;
    auditLogging: boolean;
    accessLogging: boolean;
  };
  
  // Provider-specific metadata
  metadata?: Record<string, unknown>;
  tags?: string[];
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProviderConfigSet {
  // Database providers
  database: Record<string, DatabaseProviderConfig>;
  
  // Authentication providers  
  auth: Record<string, AuthenticationProviderConfig>;
  
  // Email providers (future extension)
  email?: Record<string, EmailProviderConfig>;
  
  // Storage providers (future extension)
  storage?: Record<string, StorageProviderConfig>;
  
  // Notification providers (future extension)
  notification?: Record<string, NotificationProviderConfig>;
  
  // Global configuration
  global: GlobalProviderConfig;
}

export interface DatabaseProviderConfig extends BaseProviderConfig {
  connection: DatabaseConnectionConfig;
  migrations?: {
    enabled: boolean;
    autoRun: boolean;
    directory: string;
  };
  backup?: {
    enabled: boolean;
    schedule: string; // cron expression
    retention: number; // days
    location: string;
  };
}

export interface AuthenticationProviderConfig extends BaseProviderConfig {
  auth: AuthProviderConfig;
  session?: {
    secret: string;
    maxAge: number;
    store: 'memory' | 'redis' | 'database';
    secure: boolean;
    httpOnly: boolean;
  };
  rateLimit?: {
    windowMs: number;
    maxAttempts: number;
    blockDuration: number;
  };
}

export interface EmailProviderConfig extends BaseProviderConfig {
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  templates?: {
    directory: string;
    engine: 'handlebars' | 'ejs' | 'pug';
    cache: boolean;
  };
}

export interface StorageProviderConfig extends BaseProviderConfig {
  type: 'local' | 's3' | 'gcs' | 'azure';
  path?: string;
  bucket?: string;
  region?: string;
  credentials?: {
    accessKey: string;
    secretKey: string;
  };
}

export interface NotificationProviderConfig extends BaseProviderConfig {
  channels: ('email' | 'sms' | 'push' | 'webhook')[];
  providers: {
    email?: string; // References email provider
    sms?: {
      provider: 'twilio' | 'aws-sns' | 'custom';
      credentials: Record<string, string>;
    };
    push?: {
      provider: 'fcm' | 'apns' | 'custom';
      credentials: Record<string, string>;
    };
  };
}

export interface GlobalProviderConfig {
  // Application-wide settings
  app: {
    name: string;
    version: string;
    environment: string;
    debug: boolean;
  };
  
  // Default provider selections
  defaults: {
    database: string;
    auth: string;
    email?: string;
    storage?: string;
    notification?: string;
  };
  
  // Security settings
  security: {
    encryptionKey: string;
    hashSalt: string;
    jwtSecret: string;
    corsOrigins: string[];
    trustProxy: boolean;
  };
  
  // Feature flags
  features: {
    registration: boolean;
    passwordReset: boolean;
    emailVerification: boolean;
    mfaRequired: boolean;
    auditLogging: boolean;
  };
  
  // Monitoring and observability
  monitoring: {
    metricsEnabled: boolean;
    tracingEnabled: boolean;
    healthCheckEndpoint: string;
    metricsEndpoint: string;
  };
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: string[];
}

export interface ConfigValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ConfigUpdateResult {
  success: boolean;
  updated: string[];
  errors: string[];
  requiresRestart: boolean;
}

/**
 * Provider configuration manager interface
 */
export interface IProviderConfigManager {
  // Configuration loading
  loadConfig(): Promise<ProviderConfigSet>;
  loadConfigFromFile(filePath: string): Promise<ProviderConfigSet>;
  loadConfigFromEnv(): Promise<ProviderConfigSet>;
  
  // Configuration access
  getConfig(): ProviderConfigSet;
  getProviderConfig<T extends BaseProviderConfig>(type: string, name: string): T | undefined;
  getGlobalConfig(): GlobalProviderConfig;
  
  // Configuration updates
  updateProviderConfig(type: string, name: string, config: Partial<BaseProviderConfig>): Promise<ConfigUpdateResult>;
  updateGlobalConfig(config: Partial<GlobalProviderConfig>): Promise<ConfigUpdateResult>;
  reloadConfig(): Promise<void>;
  
  // Configuration validation
  validateConfig(config: ProviderConfigSet): Promise<ConfigValidationResult>;
  validateProviderConfig(type: string, config: BaseProviderConfig): Promise<ConfigValidationResult>;
  
  // Configuration persistence
  saveConfig(): Promise<void>;
  saveConfigToFile(filePath: string): Promise<void>;
  
  // Configuration versioning
  getConfigVersion(): string;
  getConfigHistory(): Promise<ConfigVersion[]>;
  rollbackToVersion(version: string): Promise<void>;
  
  // Configuration events
  onConfigChange(callback: (type: string, name: string, config: BaseProviderConfig) => void): void;
  offConfigChange(callback: Function): void;
  
  // Secrets management
  setSecret(key: string, value: string): Promise<void>;
  getSecret(key: string): Promise<string | undefined>;
  deleteSecret(key: string): Promise<boolean>;
  listSecrets(): Promise<string[]>;
  
  // Environment-specific configuration
  getEnvironmentConfig(environment: string): ProviderConfigSet;
  setEnvironment(environment: string): void;
  getCurrentEnvironment(): string;
}

export interface ConfigVersion {
  version: string;
  timestamp: Date;
  changes: ConfigChange[];
  author?: string;
  description?: string;
}

export interface ConfigChange {
  type: 'create' | 'update' | 'delete';
  path: string;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Configuration source interface for loading from different sources
 */
export interface IConfigSource {
  readonly name: string;
  readonly priority: number; // Higher priority overrides lower
  
  load(): Promise<Partial<ProviderConfigSet>>;
  watch?(callback: (config: Partial<ProviderConfigSet>) => void): void;
  save?(config: ProviderConfigSet): Promise<void>;
}

/**
 * Built-in configuration sources
 */
export interface FileConfigSource extends IConfigSource {
  filePath: string;
  format: 'json' | 'yaml' | 'toml';
  watchForChanges: boolean;
}

export interface EnvironmentConfigSource extends IConfigSource {
  prefix: string;
  separator: string;
  transformKey?: (key: string) => string;
}

export interface DatabaseConfigSource extends IConfigSource {
  connectionString: string;
  tableName: string;
  keyColumn: string;
  valueColumn: string;
}

/**
 * Configuration factory for creating configurations
 */
export interface IProviderConfigFactory {
  // Create default configurations
  createDefaultDatabaseConfig(type: string): DatabaseProviderConfig;
  createDefaultAuthConfig(type: string): AuthenticationProviderConfig;
  createDefaultGlobalConfig(): GlobalProviderConfig;
  
  // Create configurations from templates
  createFromTemplate(template: string, variables: Record<string, unknown>): BaseProviderConfig;
  
  // Merge configurations
  mergeConfigs<T extends BaseProviderConfig>(base: T, override: Partial<T>): T;
  
  // Validate configuration schemas
  getConfigSchema(type: string): object;
  validateAgainstSchema(config: unknown, schema: object): ConfigValidationResult;
}

/**
 * Configuration errors
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ConfigValidationFailedError extends ConfigurationError {
  constructor(
    public readonly errors: ConfigValidationError[]
  ) {
    super(`Configuration validation failed: ${errors.map(e => e.message).join(', ')}`);
    this.name = 'ConfigValidationFailedError';
  }
}

export class ConfigLoadError extends ConfigurationError {
  constructor(source: string, originalError: Error) {
    super(`Failed to load configuration from ${source}: ${originalError.message}`);
    this.name = 'ConfigLoadError';
  }
}

/**
 * Configuration utilities
 */
export interface ConfigUtils {
  // Environment variable utilities
  getEnvVar(key: string, defaultValue?: string): string | undefined;
  getEnvVarAsNumber(key: string, defaultValue?: number): number | undefined;
  getEnvVarAsBoolean(key: string, defaultValue?: boolean): boolean | undefined;
  getEnvVarAsArray(key: string, separator?: string, defaultValue?: string[]): string[] | undefined;
  
  // Path utilities
  resolvePath(path: string): string;
  resolveConfigPath(filename: string): string;
  
  // Validation utilities
  isValidUrl(url: string): boolean;
  isValidEmail(email: string): boolean;
  isValidPort(port: number): boolean;
  
  // Security utilities
  encryptValue(value: string, key: string): string;
  decryptValue(encryptedValue: string, key: string): string;
  hashValue(value: string, salt: string): string;
  
  // Template utilities
  interpolateTemplate(template: string, variables: Record<string, unknown>): string;
  parseTemplate(template: string): string[];
}