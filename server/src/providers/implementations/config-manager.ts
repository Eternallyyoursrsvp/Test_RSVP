/**
 * Provider Configuration Manager Implementation
 * 
 * Simple implementation of the provider configuration manager that loads
 * configuration from environment variables and provides basic management.
 */

import {
  IProviderConfigManager,
  ProviderConfigSet,
  BaseProviderConfig,
  GlobalProviderConfig,
  ConfigValidationResult,
  ConfigUpdateResult,
  ConfigVersion,
  ConfigurationError,
  ConfigValidationFailedError
} from '../interfaces/provider-config';

export class SimpleConfigManager implements IProviderConfigManager {
  private config: ProviderConfigSet;
  private version: string = '1.0.0';
  private configHistory: ConfigVersion[] = [];
  private changeCallbacks: Set<Function> = new Set();

  constructor() {
    this.config = this.createDefaultConfig();
  }

  async loadConfig(): Promise<ProviderConfigSet> {
    // Load from environment variables
    this.config = await this.loadConfigFromEnv();
    return this.config;
  }

  async loadConfigFromFile(filePath: string): Promise<ProviderConfigSet> {
    // For now, just return the environment config
    // In a full implementation, this would read from the specified file
    console.log(`📋 Loading config from file: ${filePath} (not implemented, using env)`);
    return await this.loadConfigFromEnv();
  }

  async loadConfigFromEnv(): Promise<ProviderConfigSet> {
    console.log('📋 Loading configuration from environment variables...');

    const config: ProviderConfigSet = {
      database: {
        postgresql: {
          name: 'postgresql',
          type: 'database',
          enabled: true,
          environment: (process.env.NODE_ENV as any) || 'development',
          connection: {
            type: 'postgresql',
            connectionString: process.env.DATABASE_URL,
            maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '5'),
            idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30'),
            connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10'),
            ssl: process.env.DB_SSL === 'true'
          },
          healthCheck: {
            enabled: true,
            interval: 30000,
            timeout: 5000,
            retries: 3
          },
          logging: {
            level: (process.env.DB_LOG_LEVEL as any) || 'info',
            enabled: process.env.DB_LOGGING !== 'false',
            includeMetadata: true
          },
          performance: {
            caching: process.env.DB_CACHING === 'true',
            cacheTTL: parseInt(process.env.DB_CACHE_TTL || '300'),
            rateLimiting: false,
            maxRequestsPerMinute: 1000
          }
        }
      },
      auth: {
        local: {
          name: 'local',
          type: 'auth',
          enabled: true,
          environment: (process.env.NODE_ENV as any) || 'development',
          auth: {
            name: 'local',
            type: 'local-auth',
            enabled: true,
            passwordMinLength: parseInt(process.env.AUTH_PASSWORD_MIN_LENGTH || '8'),
            passwordRequirements: {
              requireUppercase: process.env.AUTH_REQUIRE_UPPERCASE !== 'false',
              requireLowercase: process.env.AUTH_REQUIRE_LOWERCASE !== 'false',
              requireNumbers: process.env.AUTH_REQUIRE_NUMBERS !== 'false',
              requireSpecialChars: process.env.AUTH_REQUIRE_SPECIAL === 'true'
            },
            maxLoginAttempts: parseInt(process.env.AUTH_MAX_LOGIN_ATTEMPTS || '5'),
            lockoutDuration: parseInt(process.env.AUTH_LOCKOUT_DURATION || '15'),
            sessionTimeout: parseInt(process.env.AUTH_SESSION_TIMEOUT || '60'),
            allowMultipleSessions: process.env.AUTH_MULTIPLE_SESSIONS === 'true'
          },
          session: {
            secret: process.env.SESSION_SECRET || 'default-session-secret',
            maxAge: parseInt(process.env.SESSION_MAX_AGE || '3600') * 1000,
            store: (process.env.SESSION_STORE as any) || 'memory',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true
          },
          healthCheck: {
            enabled: true,
            interval: 30000,
            timeout: 5000,
            retries: 3
          }
        }
      },
      global: {
        app: {
          name: process.env.APP_NAME || 'RSVP Platform',
          version: process.env.APP_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          debug: process.env.DEBUG === 'true'
        },
        defaults: {
          database: 'postgresql',
          auth: 'local'
        },
        security: {
          encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key',
          hashSalt: process.env.HASH_SALT || 'default-salt',
          jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret',
          corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
          trustProxy: process.env.TRUST_PROXY === 'true'
        },
        features: {
          registration: process.env.ENABLE_REGISTRATION !== 'false',
          passwordReset: process.env.ENABLE_PASSWORD_RESET !== 'false',
          emailVerification: process.env.ENABLE_EMAIL_VERIFICATION === 'true',
          mfaRequired: process.env.REQUIRE_MFA === 'true',
          auditLogging: process.env.ENABLE_AUDIT_LOGGING === 'true'
        },
        monitoring: {
          metricsEnabled: process.env.ENABLE_METRICS !== 'false',
          tracingEnabled: process.env.ENABLE_TRACING === 'true',
          healthCheckEndpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health',
          metricsEndpoint: process.env.METRICS_ENDPOINT || '/metrics'
        }
      }
    };

    // Validate configuration
    const validation = await this.validateConfig(config);
    if (!validation.valid) {
      console.warn('⚠️ Configuration validation warnings:', validation.warnings);
      
      const errors = validation.errors.filter(e => e.severity === 'error');
      if (errors.length > 0) {
        throw new ConfigValidationFailedError(errors);
      }
    }

    this.config = config;
    this.recordConfigChange('loaded from environment');
    
    return config;
  }

  getConfig(): ProviderConfigSet {
    return this.config;
  }

  getProviderConfig<T extends BaseProviderConfig>(type: string, name: string): T | undefined {
    switch (type) {
      case 'database':
        return this.config.database[name] as T;
      case 'auth':
        return this.config.auth[name] as T;
      default:
        return undefined;
    }
  }

  getGlobalConfig(): GlobalProviderConfig {
    return this.config.global;
  }

  async updateProviderConfig(type: string, name: string, config: Partial<BaseProviderConfig>): Promise<ConfigUpdateResult> {
    try {
      const currentConfig = this.getProviderConfig(type, name);
      if (!currentConfig) {
        return {
          success: false,
          updated: [],
          errors: [`Provider ${type}:${name} not found`],
          requiresRestart: false
        };
      }

      const updatedConfig = { ...currentConfig, ...config };
      
      // Validate the updated configuration
      const validation = await this.validateProviderConfig(type, updatedConfig);
      if (!validation.valid) {
        const errorMessages = validation.errors.map(e => e.message);
        return {
          success: false,
          updated: [],
          errors: errorMessages,
          requiresRestart: false
        };
      }

      // Update the configuration
      switch (type) {
        case 'database':
          this.config.database[name] = updatedConfig as any;
          break;
        case 'auth':
          this.config.auth[name] = updatedConfig as any;
          break;
        default:
          return {
            success: false,
            updated: [],
            errors: [`Unknown provider type: ${type}`],
            requiresRestart: false
          };
      }

      this.recordConfigChange(`updated ${type}:${name}`);
      this.notifyConfigChange(type, name, updatedConfig);

      return {
        success: true,
        updated: [`${type}:${name}`],
        errors: [],
        requiresRestart: this.configRequiresRestart(config)
      };

    } catch (error) {
      return {
        success: false,
        updated: [],
        errors: [(error as Error).message],
        requiresRestart: false
      };
    }
  }

  async updateGlobalConfig(config: Partial<GlobalProviderConfig>): Promise<ConfigUpdateResult> {
    try {
      const updatedConfig = { ...this.config.global, ...config };
      
      this.config.global = updatedConfig;
      this.recordConfigChange('updated global config');
      
      return {
        success: true,
        updated: ['global'],
        errors: [],
        requiresRestart: true // Global changes typically require restart
      };
      
    } catch (error) {
      return {
        success: false,
        updated: [],
        errors: [(error as Error).message],
        requiresRestart: false
      };
    }
  }

  async reloadConfig(): Promise<void> {
    const newConfig = await this.loadConfigFromEnv();
    this.config = newConfig;
    this.recordConfigChange('reloaded configuration');
    console.log('✅ Configuration reloaded');
  }

  async validateConfig(config: ProviderConfigSet): Promise<ConfigValidationResult> {
    const errors: any[] = [];
    const warnings: string[] = [];

    // Validate database configurations
    for (const [name, dbConfig] of Object.entries(config.database)) {
      const dbValidation = await this.validateProviderConfig('database', dbConfig);
      errors.push(...dbValidation.errors);
      warnings.push(...dbValidation.warnings);
    }

    // Validate auth configurations
    for (const [name, authConfig] of Object.entries(config.auth)) {
      const authValidation = await this.validateProviderConfig('auth', authConfig);
      errors.push(...authValidation.errors);
      warnings.push(...authValidation.warnings);
    }

    // Validate global configuration
    if (!config.global.security.encryptionKey || config.global.security.encryptionKey === 'default-encryption-key') {
      warnings.push('Using default encryption key - should be changed in production');
    }

    if (!config.global.security.jwtSecret || config.global.security.jwtSecret === 'default-jwt-secret') {
      warnings.push('Using default JWT secret - should be changed in production');
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings
    };
  }

  async validateProviderConfig(type: string, config: BaseProviderConfig): Promise<ConfigValidationResult> {
    const errors: any[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!config.name) {
      errors.push({
        field: 'name',
        message: 'Provider name is required',
        code: 'MISSING_NAME',
        severity: 'error'
      });
    }

    if (!config.type) {
      errors.push({
        field: 'type',
        message: 'Provider type is required',
        code: 'MISSING_TYPE',
        severity: 'error'
      });
    }

    // Type-specific validation
    switch (type) {
      case 'database':
        const dbConfig = config as any;
        if (!dbConfig.connection?.connectionString && !dbConfig.connection?.host) {
          errors.push({
            field: 'connection',
            message: 'Database connection string or host is required',
            code: 'MISSING_CONNECTION',
            severity: 'error'
          });
        }
        break;

      case 'auth':
        const authConfig = config as any;
        if (authConfig.auth?.passwordMinLength && authConfig.auth.passwordMinLength < 6) {
          warnings.push('Password minimum length is less than 6 characters');
        }
        break;
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings
    };
  }

  async saveConfig(): Promise<void> {
    // For now, this is a no-op since we're using environment variables
    // In a full implementation, this would save to a file or database
    console.log('💾 Save config requested (not implemented for env-based config)');
  }

  async saveConfigToFile(filePath: string): Promise<void> {
    // For now, this is a no-op
    // In a full implementation, this would save to the specified file
    console.log(`💾 Save config to file requested: ${filePath} (not implemented)`);
  }

  getConfigVersion(): string {
    return this.version;
  }

  async getConfigHistory(): Promise<ConfigVersion[]> {
    return [...this.configHistory];
  }

  async rollbackToVersion(version: string): Promise<void> {
    // For now, this is a no-op
    // In a full implementation, this would restore a previous version
    throw new Error('Config rollback not implemented');
  }

  onConfigChange(callback: (type: string, name: string, config: BaseProviderConfig) => void): void {
    this.changeCallbacks.add(callback);
  }

  offConfigChange(callback: Function): void {
    this.changeCallbacks.delete(callback);
  }

  // Secrets management (simplified implementation)
  async setSecret(key: string, value: string): Promise<void> {
    // In a production implementation, this would use a secure secrets store
    process.env[key] = value;
  }

  async getSecret(key: string): Promise<string | undefined> {
    return process.env[key];
  }

  async deleteSecret(key: string): Promise<boolean> {
    if (process.env[key]) {
      delete process.env[key];
      return true;
    }
    return false;
  }

  async listSecrets(): Promise<string[]> {
    // Return environment variable keys that look like secrets
    return Object.keys(process.env).filter(key => 
      key.includes('SECRET') || 
      key.includes('KEY') || 
      key.includes('TOKEN') ||
      key.includes('PASSWORD')
    );
  }

  getEnvironmentConfig(environment: string): ProviderConfigSet {
    // For now, return the current config
    // In a full implementation, this would return environment-specific config
    return this.config;
  }

  setEnvironment(environment: string): void {
    process.env.NODE_ENV = environment;
  }

  getCurrentEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }

  private createDefaultConfig(): ProviderConfigSet {
    return {
      database: {},
      auth: {},
      global: {
        app: {
          name: 'RSVP Platform',
          version: '1.0.0',
          environment: 'development',
          debug: false
        },
        defaults: {
          database: 'postgresql',
          auth: 'local'
        },
        security: {
          encryptionKey: 'default-encryption-key',
          hashSalt: 'default-salt',
          jwtSecret: 'default-jwt-secret',
          corsOrigins: ['http://localhost:3000'],
          trustProxy: false
        },
        features: {
          registration: true,
          passwordReset: true,
          emailVerification: false,
          mfaRequired: false,
          auditLogging: false
        },
        monitoring: {
          metricsEnabled: true,
          tracingEnabled: false,
          healthCheckEndpoint: '/health',
          metricsEndpoint: '/metrics'
        }
      }
    };
  }

  private recordConfigChange(description: string): void {
    const version: ConfigVersion = {
      version: `${Date.now()}`,
      timestamp: new Date(),
      changes: [], // Would track detailed changes in full implementation
      description
    };

    this.configHistory.push(version);
    
    // Keep only last 50 versions
    if (this.configHistory.length > 50) {
      this.configHistory.splice(0, this.configHistory.length - 50);
    }
  }

  private notifyConfigChange(type: string, name: string, config: BaseProviderConfig): void {
    for (const callback of this.changeCallbacks) {
      try {
        callback(type, name, config);
      } catch (error) {
        console.error('❌ Error in config change callback:', error);
      }
    }
  }

  private configRequiresRestart(config: Partial<BaseProviderConfig>): boolean {
    // Determine if the configuration change requires a restart
    // For now, assume connection-related changes require restart
    return !!(config as any).connection || !!(config as any).auth;
  }
}