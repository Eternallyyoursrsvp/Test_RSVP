/**
 * Provider Service
 * 
 * Main service that integrates the provider architecture with the existing application.
 * Provides backward compatibility while enabling flexible provider switching.
 * Acts as the adapter between the existing storage.ts and the new provider system.
 */

import { IDatabaseProvider } from './interfaces/database-provider';
import { IAuthenticationProvider, AuthenticationResult, UserProfile } from './interfaces/auth-provider';
import { IProviderConfigManager, ProviderConfigSet } from './interfaces/provider-config';
import { IProviderRegistry } from './interfaces/provider-registry';
import { ProviderConfiguration } from './interfaces/provider-types';
import { PostgreSQLProvider, PostgreSQLProviderFactory } from './implementations/postgresql-provider';
import { LocalAuthProvider, LocalAuthProviderFactory } from './implementations/local-auth-provider';
import { IStorage } from '../storage';
import { DatabaseStorage } from '../../storage';
import { Request, Response, NextFunction } from 'express';

export interface ProviderServiceConfig {
  // Default providers
  defaultDatabase: string;
  defaultAuth: string;
  
  // Configuration source
  configPath?: string;
  useEnvironmentConfig?: boolean;
  
  // Feature flags
  enableHealthChecks?: boolean;
  enableMetrics?: boolean;
  enableAutoFailover?: boolean;
  
  // Legacy compatibility
  maintainBackwardCompatibility?: boolean;
}

export class ProviderService {
  private databaseProviders = new Map<string, IDatabaseProvider>();
  private authProviders = new Map<string, IAuthenticationProvider>();
  private configManager: IProviderConfigManager | null = null;
  private providerRegistry: IProviderRegistry | null = null;
  
  private defaultDatabaseProvider: IDatabaseProvider | null = null;
  private defaultAuthProvider: IAuthenticationProvider | null = null;
  
  private isInitialized = false;
  private config: ProviderServiceConfig;
  
  // Legacy storage adapter for backward compatibility
  private legacyStorageAdapter: IStorage | null = null;

  constructor(config: ProviderServiceConfig) {
    this.config = {
      enableHealthChecks: true,
      enableMetrics: true,
      enableAutoFailover: false,
      maintainBackwardCompatibility: true,
      ...config
    };
  }

  /**
   * Initialize the provider service with configuration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load configuration
      await this.loadConfiguration();
      
      // Initialize provider registry
      await this.initializeProviderRegistry();
      
      // Initialize database providers
      await this.initializeDatabaseProviders();
      
      // Initialize authentication providers  
      await this.initializeAuthProviders();
      
      // Set up legacy compatibility
      if (this.config.maintainBackwardCompatibility) {
        await this.setupLegacyCompatibility();
      }
      
      // Start health monitoring
      if (this.config.enableHealthChecks) {
        this.startHealthMonitoring();
      }
      
      this.isInitialized = true;
      
      console.log('✅ Provider Service initialized successfully');
      console.log(`   - Database Providers: ${this.databaseProviders.size}`);
      console.log(`   - Auth Providers: ${this.authProviders.size}`);
      console.log(`   - Default Database: ${this.config.defaultDatabase}`);
      console.log(`   - Default Auth: ${this.config.defaultAuth}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize Provider Service:', error);
      throw error;
    }
  }

  /**
   * Get the default database provider (for backward compatibility)
   */
  getDatabase(): IDatabaseProvider {
    if (!this.defaultDatabaseProvider) {
      throw new Error('No default database provider configured');
    }
    return this.defaultDatabaseProvider;
  }

  /**
   * Get a specific database provider by name
   */
  getDatabaseProvider(name?: string): IDatabaseProvider | undefined {
    if (!name) {
      return this.defaultDatabaseProvider || undefined;
    }
    return this.databaseProviders.get(name);
  }

  /**
   * Get the default authentication provider
   */
  getAuth(): IAuthenticationProvider {
    if (!this.defaultAuthProvider) {
      throw new Error('No default authentication provider configured');
    }
    return this.defaultAuthProvider;
  }

  /**
   * Get a specific authentication provider by name
   */
  getAuthProvider(name?: string): IAuthenticationProvider | undefined {
    if (!name) {
      return this.defaultAuthProvider || undefined;
    }
    return this.authProviders.get(name);
  }

  /**
   * Get the legacy storage adapter for backward compatibility
   */
  getLegacyStorage(): IStorage {
    if (!this.legacyStorageAdapter) {
      throw new Error('Legacy storage adapter not initialized');
    }
    return this.legacyStorageAdapter;
  }

  /**
   * Switch default database provider
   */
  async switchDatabaseProvider(name: string): Promise<void> {
    const provider = this.databaseProviders.get(name);
    if (!provider) {
      throw new Error(`Database provider '${name}' not found`);
    }
    
    // Test connection
    await provider.ping();
    
    this.defaultDatabaseProvider = provider;
    console.log(`✅ Switched to database provider: ${name}`);
  }

  /**
   * Switch default authentication provider
   */
  async switchAuthProvider(name: string): Promise<void> {
    const provider = this.authProviders.get(name);
    if (!provider) {
      throw new Error(`Auth provider '${name}' not found`);
    }
    
    // Test health
    await provider.getHealth();
    
    this.defaultAuthProvider = provider;
    console.log(`✅ Switched to auth provider: ${name}`);
  }

  /**
   * Get overall health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    providers: Record<string, any>;
    uptime: number;
  }> {
    const providers: Record<string, any> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check database providers
    for (const [name, provider] of this.databaseProviders) {
      try {
        const health = await provider.getHealth();
        providers[`db_${name}`] = health;
        
        if (health.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (health.status === 'degraded' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        providers[`db_${name}`] = { status: 'unhealthy', error: (error as Error).message };
        overallStatus = 'unhealthy';
      }
    }

    // Check auth providers
    for (const [name, provider] of this.authProviders) {
      try {
        const health = await provider.getHealth();
        providers[`auth_${name}`] = health;
        
        if (health.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (health.status === 'degraded' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        providers[`auth_${name}`] = { status: 'unhealthy', error: (error as Error).message };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      providers,
      uptime: process.uptime() * 1000
    };
  }

  /**
   * Create authentication middleware for Express
   */
  createAuthMiddleware(providerName?: string): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.isAuthenticated && req.isAuthenticated()) {
        next();
      } else {
        res.status(401).json({ message: "Not authenticated" });
      }
    };
  }

  /**
   * Create role-based middleware
   */
  createRoleMiddleware(roles: string[], providerName?: string): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        const user = req.user as any;
        if (roles.includes(user.role)) {
          next();
        } else {
          res.status(403).json({ message: "Forbidden" });
        }
      } else {
        res.status(401).json({ message: "Not authenticated" });
      }
    };
  }

  /**
   * Shutdown all providers gracefully
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Provider Service...');

    // Stop health monitoring
    this.stopHealthMonitoring();

    // Shutdown provider registry
    if (this.providerRegistry) {
      try {
        await this.providerRegistry.destroy();
        console.log('✅ Provider registry shutdown complete');
      } catch (error) {
        console.error('❌ Error shutting down provider registry:', error);
      }
    }

    // Disconnect database providers
    for (const [name, provider] of this.databaseProviders) {
      try {
        await provider.disconnect();
        console.log(`✅ Disconnected database provider: ${name}`);
      } catch (error) {
        console.error(`❌ Error disconnecting database provider ${name}:`, error);
      }
    }

    // Cleanup auth providers
    for (const [name, provider] of this.authProviders) {
      try {
        await provider.cleanup();
        console.log(`✅ Cleaned up auth provider: ${name}`);
      } catch (error) {
        console.error(`❌ Error cleaning up auth provider ${name}:`, error);
      }
    }

    this.isInitialized = false;
    console.log('✅ Provider Service shutdown complete');
  }

  private async loadConfiguration(): Promise<void> {
    console.log('📋 Loading provider configuration...');
    
    // Import and initialize config manager
    const { SimpleConfigManager } = await import('./implementations/config-manager');
    this.configManager = new SimpleConfigManager();
    
    // Load configuration from environment
    await this.configManager.loadConfig();
    
    console.log('✅ Provider configuration loaded');
  }

  private async initializeProviderRegistry(): Promise<void> {
    if (!this.configManager) {
      throw new Error('Config manager not initialized');
    }
    
    console.log('📋 Initializing provider registry...');
    
    // Import and initialize provider registry
    const { ProviderRegistry } = await import('./implementations/provider-registry');
    this.providerRegistry = new ProviderRegistry();
    
    // Initialize with config manager
    await this.providerRegistry.initialize(this.configManager);
    
    console.log('✅ Provider registry initialized');
  }

  private async initializeDatabaseProviders(): Promise<void> {
    console.log('🗄️ Initializing database providers...');

    // Initialize PostgreSQL provider with current database configuration
    const postgresFactory = new PostgreSQLProviderFactory();
    
    // Get database configuration from environment
    const dbConfig: ProviderConfiguration = {
      id: 'postgresql-default',
      type: 'postgresql' as const,
      enabled: true,
      config: {
        type: 'postgresql' as const,
        connectionString: process.env.DATABASE_URL,
        maxConnections: 5,
        idleTimeout: 30,
        connectionTimeout: 10,
        enablePreparedStatements: true,
        ssl: false
      }
    };

    const postgresProvider = await postgresFactory.createProvider('postgresql', dbConfig);
    
    this.databaseProviders.set('postgresql', postgresProvider);
    this.defaultDatabaseProvider = postgresProvider;
  }

  private async initializeAuthProviders(): Promise<void> {
    console.log('🔐 Initializing authentication providers...');

    // Initialize Local auth provider
    const localFactory = new LocalAuthProviderFactory();
    
    const authConfig = {
      name: 'local',
      type: 'local-auth' as const,
      enabled: true,
      passwordMinLength: 8,
      passwordRequirements: {
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false
      },
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      sessionTimeout: 60,
      allowMultipleSessions: false
    };

    const localProvider = await localFactory.createProvider('local-auth', authConfig);
    
    this.authProviders.set('local', localProvider);
    this.defaultAuthProvider = localProvider;
  }

  private async setupLegacyCompatibility(): Promise<void> {
    if (!this.defaultDatabaseProvider || !this.defaultAuthProvider) {
      return;
    }

    console.log('🔄 Setting up legacy compatibility layer...');

    // Create a legacy storage adapter that uses the new database provider
    this.legacyStorageAdapter = this.createLegacyStorageAdapter();

    // Configure auth provider with storage
    if (this.defaultAuthProvider instanceof LocalAuthProvider) {
      this.defaultAuthProvider.setStorage(this.legacyStorageAdapter);
    }
  }

  private createLegacyStorageAdapter(): IStorage {
    // Create an adapter that uses the new database provider
    const originalStorage = new DatabaseStorage();
    
    // Replace the db property with our provider's db instance
    if (this.defaultDatabaseProvider instanceof PostgreSQLProvider) {
      (originalStorage as any).db = this.defaultDatabaseProvider.getDb();
    }
    
    return originalStorage;
  }

  private healthCheckInterval: NodeJS.Timeout | null = null;

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      return;
    }

    console.log('💓 Starting health monitoring...');
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getHealthStatus();
        
        if (health.status === 'unhealthy') {
          console.warn('⚠️ Provider health check: UNHEALTHY');
          
          // Auto-failover logic could go here
          if (this.config.enableAutoFailover) {
            await this.attemptAutoFailover();
          }
        } else if (health.status === 'degraded') {
          console.warn('⚠️ Provider health check: DEGRADED');
        }
        
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async attemptAutoFailover(): Promise<void> {
    console.log('🔄 Attempting auto-failover...');
    
    // Try to find healthy alternative providers
    for (const [name, provider] of this.databaseProviders) {
      if (provider !== this.defaultDatabaseProvider) {
        try {
          const health = await provider.getHealth();
          if (health.status === 'healthy') {
            await this.switchDatabaseProvider(name);
            console.log(`✅ Auto-failover successful: switched to ${name}`);
            return;
          }
        } catch (error) {
          // Continue to next provider
        }
      }
    }
    
    console.error('❌ Auto-failover failed: no healthy providers available');
  }
}

/**
 * Global provider service instance
 */
let globalProviderService: ProviderService | null = null;

/**
 * Initialize the global provider service
 */
export async function initializeProviderService(config: ProviderServiceConfig): Promise<ProviderService> {
  if (globalProviderService) {
    return globalProviderService;
  }

  globalProviderService = new ProviderService(config);
  await globalProviderService.initialize();
  
  return globalProviderService;
}

/**
 * Get the global provider service instance
 */
export function getProviderService(): ProviderService {
  if (!globalProviderService) {
    throw new Error('Provider service not initialized. Call initializeProviderService() first.');
  }
  return globalProviderService;
}

/**
 * Shutdown the global provider service
 */
export async function shutdownProviderService(): Promise<void> {
  if (globalProviderService) {
    await globalProviderService.shutdown();
    globalProviderService = null;
  }
}

/**
 * Convenience functions for backward compatibility
 */
export function getDatabase(): IDatabaseProvider {
  return getProviderService().getDatabase();
}

export function getAuth(): IAuthenticationProvider {
  return getProviderService().getAuth();
}

export function getLegacyStorage(): IStorage {
  return getProviderService().getLegacyStorage();
}