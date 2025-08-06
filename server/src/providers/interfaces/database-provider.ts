/**
 * Database Provider Interface
 * 
 * Flexible database abstraction supporting multiple database types:
 * - PostgreSQL (Drizzle, TypeORM, Prisma)
 * - MySQL (Drizzle, TypeORM, Prisma) 
 * - MongoDB (Mongoose, native driver)
 * - SQLite (Drizzle, better-sqlite3)
 * - Redis (for caching/sessions)
 */

export interface DatabaseConnectionConfig {
  // Common connection properties
  type: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite' | 'redis';
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  
  // Connection pool settings
  poolSize?: number;
  maxConnections?: number;
  idleTimeout?: number;
  connectionTimeout?: number;
  
  // SSL/Security settings
  ssl?: boolean;
  sslCert?: string;
  sslKey?: string;
  sslCA?: string;
  
  // Performance settings
  enableCache?: boolean;
  cacheSize?: number;
  enablePreparedStatements?: boolean;
  
  // Provider-specific settings
  providerOptions?: Record<string, unknown>;
}

export interface DatabaseTransaction {
  id: string;
  isActive: boolean;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface QueryResult<T = unknown> {
  data: T[];
  rowsAffected?: number;
  metadata?: Record<string, unknown>;
}

export interface DatabaseHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  activeConnections: number;
  maxConnections: number;
  lastError?: Error;
  uptime: number;
}

/**
 * Core database provider interface
 */
export interface IDatabaseProvider {
  // Provider metadata
  readonly name: string;
  readonly version: string;
  readonly supportedTypes: string[];
  
  // Connection management
  connect(config: DatabaseConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Health and monitoring
  getHealth(): Promise<DatabaseHealthStatus>;
  ping(): Promise<number>; // Returns latency in ms
  
  // Transaction management
  beginTransaction(): Promise<DatabaseTransaction>;
  
  // Raw query interface for provider-specific operations
  executeRaw<T = unknown>(query: string, params?: unknown[]): Promise<QueryResult<T>>;
  
  // Schema management
  createSchema?(schemaName: string): Promise<void>;
  dropSchema?(schemaName: string): Promise<void>;
  migrationSupport?: {
    applyMigration(migration: string): Promise<void>;
    rollbackMigration(migration: string): Promise<void>;
    getMigrationHistory(): Promise<string[]>;
  };
  
  // Provider-specific features
  getProviderFeatures(): DatabaseProviderFeatures;
}

export interface DatabaseProviderFeatures {
  // Core SQL features
  supportsTransactions: boolean;
  supportsFullTextSearch: boolean;
  supportsJsonQueries: boolean;
  supportsArrayQueries: boolean;
  supportsGeoQueries: boolean;
  
  // Performance features
  supportsIndexes: boolean;
  supportsPartitioning: boolean;
  supportsCaching: boolean;
  supportsConnectionPooling: boolean;
  
  // Enterprise features
  supportsReplication: boolean;
  supportsSharding: boolean;
  supportsBackup: boolean;
  supportsEncryption: boolean;
  
  // Query features
  maxQueryComplexity: number;
  maxBatchSize: number;
  supportsPagination: boolean;
  supportsAggregation: boolean;
}

/**
 * Database provider factory interface
 */
export interface IDatabaseProviderFactory {
  createProvider(type: string, config: DatabaseConnectionConfig): Promise<IDatabaseProvider>;
  getSupportedProviders(): string[];
  validateConfig(type: string, config: DatabaseConnectionConfig): Promise<boolean>;
}

/**
 * Database provider registry interface
 */
export interface IDatabaseProviderRegistry {
  registerProvider(name: string, factory: IDatabaseProviderFactory): void;
  getProvider(name: string): IDatabaseProviderFactory | undefined;
  listProviders(): string[];
  hasProvider(name: string): boolean;
}

/**
 * High-level database service interface
 * This provides a unified interface regardless of the underlying provider
 */
export interface IDatabaseService {
  // Provider management
  getCurrentProvider(): IDatabaseProvider;
  switchProvider(providerName: string, config: DatabaseConnectionConfig): Promise<void>;
  
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
  
  // Health monitoring
  getHealth(): Promise<DatabaseHealthStatus>;
  getMetrics(): Promise<DatabaseMetrics>;
  
  // Configuration
  getConfig(): DatabaseConnectionConfig;
  updateConfig(config: Partial<DatabaseConnectionConfig>): Promise<void>;
  
  // Backup and restore (if supported)
  backup?(location: string): Promise<string>;
  restore?(backupPath: string): Promise<void>;
}

export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    total: number;
    max: number;
  };
  performance: {
    avgQueryTime: number;
    slowQueries: number;
    totalQueries: number;
    errors: number;
  };
  storage: {
    size: number;
    tables: number;
    indexes: number;
  };
  uptime: number;
  lastUpdated: Date;
}

/**
 * Provider-specific errors
 */
export class DatabaseProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly query?: string
  ) {
    super(message);
    this.name = 'DatabaseProviderError';
  }
}

export class DatabaseConnectionError extends DatabaseProviderError {
  constructor(provider: string, originalError: Error) {
    super(`Failed to connect to ${provider}: ${originalError.message}`, provider);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseTransactionError extends DatabaseProviderError {
  constructor(provider: string, operation: string, originalError: Error) {
    super(`Transaction ${operation} failed in ${provider}: ${originalError.message}`, provider);
    this.name = 'DatabaseTransactionError';
  }
}