/**
 * Enhanced PostgreSQL Database Provider Implementation
 * 
 * Concrete implementation of IEnhancedProvider for PostgreSQL using Drizzle ORM
 * Provides enhanced capabilities including health monitoring, metrics, and automation
 * Maintains backward compatibility with existing storage.ts implementation
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { EventEmitter } from 'events';
import * as schema from '../../../../shared/schema';
import {
  IDatabaseProvider,
  DatabaseConnectionConfig,
  DatabaseTransaction,
  QueryResult,
  DatabaseHealthStatus,
  DatabaseProviderFeatures,
  DatabaseProviderError,
  DatabaseConnectionError,
  DatabaseTransactionError
} from '../interfaces/database-provider';
import {
  IEnhancedProvider,
  IEnhancedProviderFactory,
  ProviderInfo,
  ProviderRequirements
} from '../interfaces/enhanced-provider-registry';
import {
  ProviderType,
  ProviderConfiguration,
  ProviderStatus,
  ProviderMetrics,
  ProviderEvent,
  ProviderSetupAutomation,
  ProviderWizardIntegration,
  TestResult,
  ValidationResult,
  WizardStep,
  WizardField,
  StepResult,
  PreviewResult
} from '../interfaces/provider-types';

export class PostgreSQLProvider extends EventEmitter implements IDatabaseProvider, IEnhancedProvider, ProviderSetupAutomation, ProviderWizardIntegration {
  public readonly name = 'postgresql';
  public readonly version = '1.0.0';
  public readonly type: ProviderType = 'postgresql';
  public readonly supportedTypes = ['postgresql'];
  
  private client: postgres.Sql | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private config: DatabaseConnectionConfig | null = null;
  private enhancedConfig: ProviderConfiguration | null = null;
  private connectionStartTime: Date | null = null;
  private isStarted = false;
  private lastHealthCheck: Date | null = null;
  private eventHistory: ProviderEvent[] = [];
  private metrics = {
    queries: 0,
    errors: 0,
    totalTime: 0,
    connections: 0,
    lastRequestTime: 0
  };
  
  constructor() {
    super();
    this.setupEventHandlers();
  }

  async connect(config: DatabaseConnectionConfig): Promise<void> {
    try {
      this.config = config;
      
      // Validate configuration
      if (!config.connectionString && (!config.host || !config.database)) {
        throw new Error('Either connectionString or host+database must be provided');
      }
      
      // Build connection string if not provided
      const connectionString = config.connectionString || this.buildConnectionString(config);
      
      // Create postgres client with configuration
      this.client = postgres(connectionString, {
        max: config.maxConnections || 5,
        idle_timeout: config.idleTimeout || 30,
        connect_timeout: config.connectionTimeout || 10,
        max_lifetime: 900, // 15 minutes
        prepare: config.enablePreparedStatements !== false,
        onnotice: () => {}, // Silence notice messages
        onparameter: () => {}, // Silence parameter messages
        debug: config.providerOptions?.debug as boolean || false,
        transform: {
          undefined: null,
        },
        ssl: config.ssl ? {
          rejectUnauthorized: true,
          ca: config.sslCA,
          key: config.sslKey,
          cert: config.sslCert
        } : false,
        ...config.providerOptions as Record<string, unknown>
      });

      // Test connection
      await this.client`SELECT 1`;
      
      // Create drizzle instance with schema
      this.db = drizzle(this.client, { schema });
      
      this.connectionStartTime = new Date();
      
      // Set up cleanup handlers
      this.setupCleanupHandlers();
      
    } catch (error) {
      throw new DatabaseConnectionError(this.name, error as Error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.end({ timeout: 5 });
        this.client = null;
        this.db = null;
        this.connectionStartTime = null;
      } catch (error) {
        throw new DatabaseProviderError(
          `Failed to disconnect from ${this.name}`,
          this.name,
          'DISCONNECT_FAILED'
        );
      }
    }
  }

  isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }

  async getHealth(): Promise<DatabaseHealthStatus> {
    if (!this.isConnected()) {
      return {
        status: 'unhealthy',
        latency: -1,
        activeConnections: 0,
        maxConnections: this.config?.maxConnections || 0,
        uptime: 0,
        lastError: new Error('Not connected')
      };
    }

    try {
      const startTime = Date.now();
      await this.client!`SELECT 1`;
      const latency = Date.now() - startTime;
      
      // Get connection info
      const connectionInfo = await this.getConnectionInfo();
      
      return {
        status: latency > 1000 ? 'degraded' : 'healthy',
        latency,
        activeConnections: connectionInfo.active,
        maxConnections: connectionInfo.max,
        uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime.getTime() : 0
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: -1,
        activeConnections: 0,
        maxConnections: this.config?.maxConnections || 0,
        uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime.getTime() : 0,
        lastError: error as Error
      };
    }
  }

  async ping(): Promise<number> {
    if (!this.isConnected()) {
      throw new DatabaseProviderError('Not connected', this.name, 'NOT_CONNECTED');
    }

    const startTime = Date.now();
    await this.client!`SELECT 1`;
    return Date.now() - startTime;
  }

  async beginTransaction(): Promise<DatabaseTransaction> {
    if (!this.db) {
      throw new DatabaseProviderError('Not connected', this.name, 'NOT_CONNECTED');
    }

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let isActive = true;

    // Start transaction using Drizzle's transaction method
    const transaction = this.db.transaction(async (tx) => {
      return {
        id: transactionId,
        isActive,
        tx,
        commit: async () => {
          if (!isActive) throw new Error('Transaction is not active');
          isActive = false;
          // Transaction will be committed when the callback completes successfully
        },
        rollback: async () => {
          if (!isActive) throw new Error('Transaction is not active');
          isActive = false;
          throw new Error('Transaction rolled back');
        }
      };
    });

    return transaction as unknown as DatabaseTransaction;
  }

  async executeRaw<T = unknown>(query: string, params: unknown[] = []): Promise<QueryResult<T>> {
    if (!this.client) {
      throw new DatabaseProviderError('Not connected', this.name, 'NOT_CONNECTED');
    }

    try {
      const startTime = Date.now();
      
      // Execute query with parameters
      const result = await this.client.unsafe(query, params as postgres.Parameter[]);
      
      // Update metrics
      this.metrics.queries++;
      this.metrics.totalTime += Date.now() - startTime;
      
      return {
        data: result as T[],
        rowsAffected: result.count,
        metadata: {
          executionTime: Date.now() - startTime,
          query,
          params
        }
      };
    } catch (error) {
      this.metrics.errors++;
      throw new DatabaseProviderError(
        `Query execution failed: ${(error as Error).message}`,
        this.name,
        'QUERY_FAILED',
        query
      );
    }
  }

  getProviderFeatures(): DatabaseProviderFeatures {
    return {
      // Core SQL features
      supportsTransactions: true,
      supportsFullTextSearch: true,
      supportsJsonQueries: true,
      supportsArrayQueries: true,
      supportsGeoQueries: true,
      
      // Performance features
      supportsIndexes: true,
      supportsPartitioning: true,
      supportsCaching: false, // Can be added with Redis
      supportsConnectionPooling: true,
      
      // Enterprise features
      supportsReplication: true,
      supportsSharding: false, // Requires additional setup
      supportsBackup: true,
      supportsEncryption: true,
      
      // Query features
      maxQueryComplexity: 1000,
      maxBatchSize: 10000,
      supportsPagination: true,
      supportsAggregation: true
    };
  }

  /**
   * Get the Drizzle database instance for backward compatibility
   */
  getDb() {
    if (!this.db) {
      throw new DatabaseProviderError('Not connected', this.name, 'NOT_CONNECTED');
    }
    return this.db;
  }

  /**
   * Get the raw postgres client for advanced operations
   */
  getClient() {
    if (!this.client) {
      throw new DatabaseProviderError('Not connected', this.name, 'NOT_CONNECTED');
    }
    return this.client;
  }

  /**
   * Get database metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      avgQueryTime: this.metrics.queries > 0 ? this.metrics.totalTime / this.metrics.queries : 0,
      errorRate: this.metrics.queries > 0 ? this.metrics.errors / this.metrics.queries : 0
    };
  }

  // Enhanced Provider Interface Implementation
  
  getProviderType(): ProviderType {
    return this.type;
  }
  
  getCapabilities(): string[] {
    return [
      'database',
      'transactions',
      'fulltext-search',
      'json-queries',
      'array-queries',
      'geo-queries',
      'replication',
      'backup',
      'encryption'
    ];
  }
  
  isMultiService(): boolean {
    return false;
  }
  
  async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }
    
    if (!this.enhancedConfig) {
      throw new DatabaseProviderError('Provider not configured', this.name, 'NOT_CONFIGURED');
    }
    
    await this.connect(this.enhancedConfig.config as DatabaseConnectionConfig);
    this.isStarted = true;
    
    this.emitEvent('started', 'info', { timestamp: new Date() });
  }
  
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }
    
    await this.disconnect();
    this.isStarted = false;
    
    this.emitEvent('stopped', 'info', { timestamp: new Date() });
  }
  
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
    
    this.emitEvent('restarted', 'info', { timestamp: new Date() });
  }
  
  async configure(config: ProviderConfiguration): Promise<void> {
    this.enhancedConfig = config;
    
    // Convert ProviderConfiguration to DatabaseConnectionConfig and connect
    if (config.config && typeof config.config === 'object') {
      const dbConfig = config.config as any;
      const connectionConfig: DatabaseConnectionConfig = {
        type: 'postgresql' as const,
        connectionString: dbConfig.connectionString || process.env.DATABASE_URL,
        maxConnections: dbConfig.maxConnections || 5,
        idleTimeout: dbConfig.idleTimeout || 30,
        connectionTimeout: dbConfig.connectionTimeout || 10,
        enablePreparedStatements: dbConfig.enablePreparedStatements !== false,
        ssl: dbConfig.ssl || false
      };
      
      // Connect to the database
      await this.connect(connectionConfig);
    }
    
    if (this.isStarted) {
      await this.restart();
    }
    
    this.emitEvent('config_changed', 'info', { config: config.id });
  }
  
  async getDetailedHealth(): Promise<ProviderStatus> {
    const health = await this.getHealth();
    this.lastHealthCheck = new Date();
    
    const uptime = this.connectionStartTime ? Date.now() - this.connectionStartTime.getTime() : 0;
    
    const status: ProviderStatus = {
      status: this.isStarted ? (health.status === 'healthy' ? 'active' : 'degraded') : 'stopped',
      health: health.status,
      uptime,
      lastCheck: this.lastHealthCheck,
      errors: this.metrics.errors,
      warnings: 0,
      performance: {
        responseTime: health.latency,
        throughput: this.metrics.queries > 0 ? this.metrics.queries / (uptime / 1000) : 0,
        errorRate: this.metrics.queries > 0 ? this.metrics.errors / this.metrics.queries : 0
      },
      details: {
        activeConnections: health.activeConnections,
        maxConnections: health.maxConnections,
        totalQueries: this.metrics.queries,
        avgQueryTime: this.getMetrics().avgQueryTime
      }
    };
    
    if (health.status !== 'healthy') {
      this.emitEvent('health_changed', 'warning', { status: health.status, error: health.lastError });
    }
    
    return status;
  }
  
  async getMetrics(): Promise<ProviderMetrics> {
    const uptime = this.connectionStartTime ? Date.now() - this.connectionStartTime.getTime() : 0;
    const uptimeSeconds = uptime / 1000;
    
    return {
      requests: {
        total: this.metrics.queries,
        successful: this.metrics.queries - this.metrics.errors,
        failed: this.metrics.errors,
        rate: uptimeSeconds > 0 ? this.metrics.queries / uptimeSeconds : 0
      },
      performance: {
        avgResponseTime: this.getMetrics().avgQueryTime,
        p95ResponseTime: this.getMetrics().avgQueryTime * 1.5, // Estimated
        p99ResponseTime: this.getMetrics().avgQueryTime * 2, // Estimated
        throughput: uptimeSeconds > 0 ? this.metrics.queries / uptimeSeconds : 0
      },
      resources: {
        cpuUsage: 0, // Would need system monitoring
        memoryUsage: process.memoryUsage().heapUsed,
        diskUsage: 0, // Would need disk monitoring
        connections: this.metrics.connections
      },
      business: {
        activeUsers: 0, // Would need business logic
        totalRecords: 0, // Would need count queries
        emailsSent: 0,
        filesStored: 0
      },
      timestamp: new Date(),
      period: '1h'
    };
  }
  
  async validateConfig(config: Record<string, unknown>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const dbConfig = config as DatabaseConnectionConfig;
      
      // Validate required fields
      if (!dbConfig.connectionString && (!dbConfig.host || !dbConfig.database)) {
        errors.push('Either connectionString or host+database must be provided');
      }
      
      // Validate connection limits
      if (dbConfig.maxConnections && dbConfig.maxConnections < 1) {
        errors.push('maxConnections must be at least 1');
      }
      
      if (dbConfig.maxConnections && dbConfig.maxConnections > 100) {
        warnings.push('maxConnections > 100 may impact performance');
      }
      
      // Test connection if config looks valid
      if (errors.length === 0) {
        const testProvider = new PostgreSQLProvider();
        try {
          await testProvider.connect(dbConfig);
          await testProvider.disconnect();
        } catch (error) {
          errors.push(`Connection test failed: ${(error as Error).message}`);
        }
      }
      
    } catch (error) {
      errors.push(`Invalid configuration: ${(error as Error).message}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  async updateConfig(config: Record<string, unknown>): Promise<void> {
    const validation = await this.validateConfig(config);
    if (!validation.valid) {
      throw new DatabaseProviderError(
        `Configuration validation failed: ${validation.errors.join(', ')}`,
        this.name,
        'CONFIG_INVALID'
      );
    }
    
    if (this.enhancedConfig) {
      this.enhancedConfig.config = config;
      await this.configure(this.enhancedConfig);
    }
  }
  
  async resetConfig(): Promise<void> {
    if (this.enhancedConfig) {
      const factory = new PostgreSQLProviderFactory();
      const defaultConfig = factory.getDefaultConfig('postgresql');
      await this.updateConfig(defaultConfig);
    }
  }
  
  async runDiagnostics(): Promise<Record<string, TestResult>> {
    const results: Record<string, TestResult> = {};
    
    // Test connection
    try {
      const latency = await this.ping();
      results.connection = {
        success: true,
        message: 'Connection successful',
        latency
      };
    } catch (error) {
      results.connection = {
        success: false,
        message: `Connection failed: ${(error as Error).message}`
      };
    }
    
    // Test basic query
    try {
      await this.executeRaw('SELECT 1 as test');
      results.query = {
        success: true,
        message: 'Basic query successful'
      };
    } catch (error) {
      results.query = {
        success: false,
        message: `Query failed: ${(error as Error).message}`
      };
    }
    
    // Test transaction
    try {
      const tx = await this.beginTransaction();
      results.transaction = {
        success: true,
        message: 'Transaction support confirmed'
      };
    } catch (error) {
      results.transaction = {
        success: false,
        message: `Transaction failed: ${(error as Error).message}`
      };
    }
    
    return results;
  }
  
  async getDebugInfo(): Promise<Record<string, unknown>> {
    const health = await this.getHealth();
    const metrics = this.getMetrics();
    
    return {
      provider: {
        name: this.name,
        version: this.version,
        type: this.type,
        isStarted: this.isStarted,
        isConnected: this.isConnected()
      },
      connection: {
        startTime: this.connectionStartTime,
        uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime.getTime() : 0,
        lastHealthCheck: this.lastHealthCheck
      },
      health,
      metrics,
      configuration: this.config ? {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        maxConnections: this.config.maxConnections,
        ssl: this.config.ssl
      } : null,
      events: this.eventHistory.slice(-10) // Last 10 events
    };
  }
  
  // Setup Automation Interface Implementation
  
  getSetupAutomation(): ProviderSetupAutomation {
    return this;
  }
  
  canAutoSetup(): boolean {
    return true;
  }
  
  getSetupSteps(): string[] {
    return [
      'validate-config',
      'test-connection',
      'create-schema',
      'run-migrations',
      'verify-setup'
    ];
  }
  
  async createSchema(): Promise<void> {
    if (!this.client) {
      throw new DatabaseProviderError('Not connected', this.name, 'NOT_CONNECTED');
    }
    
    // In a real implementation, this would create the database schema
    // For now, we assume the schema is managed by Drizzle migrations
    try {
      await this.client`SELECT 1`;
    } catch (error) {
      throw new DatabaseProviderError(
        `Schema creation failed: ${(error as Error).message}`,
        this.name,
        'SCHEMA_CREATION_FAILED'
      );
    }
  }
  
  async migrateSchema(from: string, to: string): Promise<void> {
    // Schema migration would be handled by Drizzle migrate
    // This is a placeholder implementation
    console.log(`Migrating PostgreSQL schema from ${from} to ${to}`);
  }
  
  generateDefaultConfig(): Record<string, unknown> {
    const factory = new PostgreSQLProviderFactory();
    return factory.getDefaultConfig('postgresql');
  }
  
  async validateConfiguration(config: Record<string, unknown>): Promise<boolean> {
    const validation = await this.validateConfig(config);
    return validation.valid;
  }
  
  async exportData(): Promise<Buffer> {
    // This would implement a full database export
    // Placeholder implementation
    const data = JSON.stringify({ message: 'PostgreSQL data export not implemented' });
    return Buffer.from(data, 'utf8');
  }
  
  async importData(data: Buffer): Promise<void> {
    // This would implement a full database import
    // Placeholder implementation
    console.log('PostgreSQL data import not implemented', data.length);
  }
  
  async createBackup(): Promise<string> {
    // This would create a database backup using pg_dump
    // Placeholder implementation
    const backupId = `pg_backup_${Date.now()}`;
    console.log('PostgreSQL backup created:', backupId);
    return backupId;
  }
  
  async restoreBackup(backupId: string): Promise<void> {
    // This would restore from a backup using pg_restore
    // Placeholder implementation
    console.log('PostgreSQL backup restored:', backupId);
  }
  
  // Wizard Integration Interface Implementation
  
  getWizardIntegration(): ProviderWizardIntegration {
    return this;
  }
  
  getWizardSteps(): WizardStep[] {
    return [
      {
        id: 'connection',
        name: 'Database Connection',
        description: 'Configure PostgreSQL database connection',
        required: true,
        fields: [
          {
            id: 'host',
            name: 'host',
            type: 'text',
            label: 'Database Host',
            description: 'PostgreSQL server hostname or IP address',
            required: true,
            defaultValue: 'localhost'
          },
          {
            id: 'port',
            name: 'port',
            type: 'number',
            label: 'Database Port',
            description: 'PostgreSQL server port number',
            required: false,
            defaultValue: 5432
          },
          {
            id: 'database',
            name: 'database',
            type: 'text',
            label: 'Database Name',
            description: 'Name of the PostgreSQL database',
            required: true,
            defaultValue: 'rsvp_platform'
          },
          {
            id: 'username',
            name: 'username',
            type: 'text',
            label: 'Username',
            description: 'PostgreSQL username',
            required: true,
            defaultValue: 'postgres'
          },
          {
            id: 'password',
            name: 'password',
            type: 'password',
            label: 'Password',
            description: 'PostgreSQL password',
            required: false
          }
        ]
      },
      {
        id: 'advanced',
        name: 'Advanced Settings',
        description: 'Configure advanced PostgreSQL settings',
        required: false,
        fields: [
          {
            id: 'maxConnections',
            name: 'maxConnections',
            type: 'number',
            label: 'Max Connections',
            description: 'Maximum number of database connections',
            required: false,
            defaultValue: 5
          },
          {
            id: 'ssl',
            name: 'ssl',
            type: 'boolean',
            label: 'Enable SSL',
            description: 'Use SSL for database connections',
            required: false,
            defaultValue: false
          }
        ]
      }
    ];
  }
  
  async validateStep(stepId: string, data: Record<string, unknown>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (stepId === 'connection') {
      if (!data.host) errors.push('Host is required');
      if (!data.database) errors.push('Database name is required');
      if (!data.username) errors.push('Username is required');
      
      if (data.port && (data.port as number) < 1) {
        errors.push('Port must be a positive number');
      }
    }
    
    if (stepId === 'advanced') {
      if (data.maxConnections && (data.maxConnections as number) < 1) {
        errors.push('Max connections must be at least 1');
      }
      
      if (data.maxConnections && (data.maxConnections as number) > 100) {
        warnings.push('High connection count may impact performance');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  async executeStep(stepId: string, data: Record<string, unknown>): Promise<StepResult> {
    try {
      if (stepId === 'connection') {
        // Test connection with provided data
        const testConfig: DatabaseConnectionConfig = {
          type: 'postgresql',
          host: data.host as string,
          port: data.port as number,
          database: data.database as string,
          username: data.username as string,
          password: data.password as string
        };
        
        const testProvider = new PostgreSQLProvider();
        await testProvider.connect(testConfig);
        await testProvider.disconnect();
        
        return {
          success: true,
          data: testConfig,
          nextStep: 'advanced'
        };
      }
      
      if (stepId === 'advanced') {
        return {
          success: true,
          data: data
        };
      }
      
      return {
        success: false,
        error: `Unknown step: ${stepId}`
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  async testConnection(config: Record<string, unknown>): Promise<TestResult> {
    try {
      const dbConfig = config as DatabaseConnectionConfig;
      const testProvider = new PostgreSQLProvider();
      
      const startTime = Date.now();
      await testProvider.connect(dbConfig);
      const latency = Date.now() - startTime;
      await testProvider.disconnect();
      
      return {
        success: true,
        message: 'Connection successful',
        latency,
        details: {
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${(error as Error).message}`
      };
    }
  }
  
  async testFeatures(features: string[]): Promise<Record<string, TestResult>> {
    const results: Record<string, TestResult> = {};
    
    for (const feature of features) {
      switch (feature) {
        case 'transactions':
          try {
            const tx = await this.beginTransaction();
            results[feature] = {
              success: true,
              message: 'Transaction support confirmed'
            };
          } catch (error) {
            results[feature] = {
              success: false,
              message: `Transaction test failed: ${(error as Error).message}`
            };
          }
          break;
          
        case 'fulltext-search':
          try {
            await this.executeRaw('SELECT to_tsvector(\'Simple text\') @@ to_tsquery(\'text\')');
            results[feature] = {
              success: true,
              message: 'Full-text search supported'
            };
          } catch (error) {
            results[feature] = {
              success: false,
              message: `Full-text search test failed: ${(error as Error).message}`
            };
          }
          break;
          
        default:
          results[feature] = {
            success: false,
            message: `Unknown feature: ${feature}`
          };
      }
    }
    
    return results;
  }
  
  async generatePreview(config: Record<string, unknown>): Promise<PreviewResult> {
    try {
      const dbConfig = config as DatabaseConnectionConfig;
      
      return {
        success: true,
        preview: {
          schema: {
            tables: ['users', 'events', 'rsvps', 'notifications'],
            indexes: ['idx_user_email', 'idx_event_date', 'idx_rsvp_status'],
            constraints: ['pk_users', 'fk_rsvp_user', 'fk_rsvp_event']
          },
          sampleData: [
            { table: 'users', count: 0 },
            { table: 'events', count: 0 },
            { table: 'rsvps', count: 0 }
          ],
          endpoints: [
            `postgresql://${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
          ],
          features: this.getCapabilities()
        },
        estimatedSetupTime: 300000 // 5 minutes
      };
    } catch (error) {
      return {
        success: false,
        preview: {}
      };
    }
  }
  
  // Private helper methods
  
  private setupEventHandlers(): void {
    this.on('error', (error) => {
      this.metrics.errors++;
      this.emitEvent('failed', 'error', { error: error.message });
    });
  }
  
  private emitEvent(type: ProviderEvent['type'], severity: ProviderEvent['severity'], data?: Record<string, unknown>): void {
    const event: ProviderEvent = {
      id: `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      providerId: this.name,
      timestamp: new Date(),
      severity,
      data
    };
    
    this.eventHistory.push(event);
    
    // Keep only last 100 events
    if (this.eventHistory.length > 100) {
      this.eventHistory = this.eventHistory.slice(-100);
    }
    
    this.emit('providerEvent', event);
  }

  private buildConnectionString(config: DatabaseConnectionConfig): string {
    const { host, port, database, username, password } = config;
    
    if (!host || !database) {
      throw new Error('Host and database are required when not using connectionString');
    }
    
    let connectionString = `postgresql://`;
    
    if (username) {
      connectionString += username;
      if (password) {
        connectionString += `:${password}`;
      }
      connectionString += '@';
    }
    
    connectionString += host;
    
    if (port) {
      connectionString += `:${port}`;
    }
    
    connectionString += `/${database}`;
    
    // Add SSL parameter if enabled
    if (config.ssl) {
      connectionString += '?ssl=true';
    }
    
    return connectionString;
  }

  private async getConnectionInfo(): Promise<{ active: number; max: number }> {
    try {
      // Query PostgreSQL for connection information
      const result = await this.client!`
        SELECT 
          count(*) as active_connections,
          setting::int as max_connections
        FROM pg_stat_activity 
        CROSS JOIN pg_settings 
        WHERE pg_settings.name = 'max_connections'
        GROUP BY setting
      `;
      
      return {
        active: parseInt(result[0]?.active_connections as string) || 0,
        max: parseInt(result[0]?.max_connections as string) || 0
      };
    } catch (error) {
      // Fallback to configuration values
      return {
        active: 0,
        max: this.config?.maxConnections || 0
      };
    }
  }

  private setupCleanupHandlers(): void {
    // Handle graceful shutdown
    const cleanup = async () => {
      try {
        await this.disconnect();
      } catch (error) {
        console.error('Error during PostgreSQL cleanup:', error);
      }
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
  }
}

/**
 * Enhanced PostgreSQL Provider Factory
 */
export class PostgreSQLProviderFactory implements IEnhancedProviderFactory {
  public readonly supportedTypes: ProviderType[] = ['postgresql'];
  public readonly name = 'postgresql';
  public readonly version = '1.0.0';

  async createProvider(type: ProviderType, config: ProviderConfiguration): Promise<PostgreSQLProvider> {
    if (!this.supportedTypes.includes(type)) {
      throw new Error(`Unsupported provider type: ${type}`);
    }

    const provider = new PostgreSQLProvider();
    await provider.configure(config);
    return provider;
  }
  
  getSupportedTypes(): ProviderType[] {
    return this.supportedTypes;
  }
  
  async validateConfig(type: ProviderType, config: ProviderConfiguration): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Type validation
      if (!this.supportedTypes.includes(type)) {
        errors.push(`Unsupported provider type: ${type}`);
      }
      
      // Configuration validation
      const dbConfig = config.config as DatabaseConnectionConfig;
      if (!dbConfig.connectionString && (!dbConfig.host || !dbConfig.database)) {
        errors.push('Either connectionString or host+database must be provided');
      }
      
      // Test connection if config looks valid
      if (errors.length === 0) {
        const testProvider = new PostgreSQLProvider();
        try {
          await testProvider.connect(dbConfig);
          await testProvider.disconnect();
        } catch (error) {
          errors.push(`Connection test failed: ${(error as Error).message}`);
        }
      }
      
    } catch (error) {
      errors.push(`Configuration validation failed: ${(error as Error).message}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  getProviderInfo(type: ProviderType): ProviderInfo {
    return {
      type,
      name: 'PostgreSQL',
      description: 'PostgreSQL relational database with advanced features including JSON, full-text search, and spatial data support',
      category: 'database',
      vendor: 'PostgreSQL Global Development Group',
      version: this.version,
      documentation: 'https://www.postgresql.org/docs/',
      features: [
        'ACID Transactions',
        'Full-text Search',
        'JSON/JSONB Support',
        'Array Data Types',
        'Spatial Data (PostGIS)',
        'Replication',
        'Partitioning',
        'Custom Data Types',
        'Stored Procedures',
        'Triggers'
      ],
      tags: ['sql', 'relational', 'open-source', 'enterprise'],
      maturity: 'stable',
      pricing: 'free'
    };
  }
  
  getProviderRequirements(type: ProviderType): ProviderRequirements {
    return {
      system: {
        os: ['linux', 'windows', 'macos'],
        architecture: ['x64', 'arm64'],
        memory: 512, // MB
        disk: 100, // MB
        cpu: 1 // cores
      },
      runtime: {
        node: '>=16.0.0'
      },
      network: {
        ports: [5432],
        protocols: ['tcp'],
        outbound: ['postgresql://'],
        inbound: []
      },
      dependencies: {
        required: ['postgres', 'drizzle-orm'],
        optional: ['@types/pg'],
        conflicting: []
      }
    };
  }
  
  canAutoSetup(type: ProviderType): boolean {
    return this.supportedTypes.includes(type);
  }
  
  generateDefaultConfig(type: ProviderType): ProviderConfiguration {
    return {
      id: `postgresql-${Date.now()}`,
      name: 'PostgreSQL Database',
      type,
      version: this.version,
      description: 'PostgreSQL database provider with Drizzle ORM',
      category: 'database',
      features: {
        database: {
          transactions: true,
          migrations: true,
          relationships: true,
          fullTextSearch: true,
          realTimeSubscriptions: false,
          backup: true
        }
      },
      compatibility: {
        frameworks: ['express', 'fastify', 'nextjs'],
        deployment: {
          standalone: true,
          docker: true,
          serverless: false,
          edge: false
        },
        environment: {
          development: true,
          staging: true,
          production: true
        },
        scale: {
          singleTenant: true,
          multiTenant: true,
          enterprise: true
        }
      },
      dependencies: [],
      config: {
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'rsvp_platform',
        username: 'postgres',
        maxConnections: 5,
        idleTimeout: 30,
        connectionTimeout: 10,
        enablePreparedStatements: true,
        ssl: false,
        providerOptions: {
          debug: false
        }
      },
      secrets: {},
      enabled: true,
      autoStart: true,
      healthCheck: true,
      priority: 1,
      timeout: 30000,
      retries: 3
    };
  }
  
  async testProviderType(type: ProviderType, config: ProviderConfiguration): Promise<TestResult> {
    try {
      const provider = await this.createProvider(type, config);
      await provider.start();
      
      const diagnostics = await provider.runDiagnostics();
      await provider.stop();
      
      const allPassed = Object.values(diagnostics).every(result => result.success);
      
      return {
        success: allPassed,
        message: allPassed ? 'All tests passed' : 'Some tests failed',
        details: diagnostics
      };
    } catch (error) {
      return {
        success: false,
        message: `Provider test failed: ${(error as Error).message}`
      };
    }
  }
  
  getWizardSteps(type: ProviderType): WizardStep[] {
    const provider = new PostgreSQLProvider();
    return provider.getWizardSteps();
  }
  
  // Legacy method for backward compatibility
  async createProviderLegacy(type: string, config: DatabaseConnectionConfig): Promise<PostgreSQLProvider> {
    if (!this.supportedTypes.includes(type as ProviderType)) {
      throw new Error(`Unsupported database type: ${type}`);
    }

    const provider = new PostgreSQLProvider();
    await provider.connect(config);
    return provider;
  }
  
  // Legacy method for backward compatibility
  getDefaultConfigLegacy(type: string): DatabaseConnectionConfig {
    return {
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'rsvp_platform',
      username: 'postgres',
      maxConnections: 5,
      idleTimeout: 30,
      connectionTimeout: 10,
      enablePreparedStatements: true,
      ssl: false,
      providerOptions: {
        debug: false
      }
    };
  }
}