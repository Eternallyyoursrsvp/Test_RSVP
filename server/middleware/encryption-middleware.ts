/**
 * Database Encryption Middleware
 * 
 * Automatically encrypts/decrypts sensitive fields when interacting with the database.
 * Integrates with Drizzle ORM and provides transparent field-level encryption.
 */

import { Request, Response, NextFunction } from 'express';
import { getEncryptionService, EncryptionContext } from '../services/encryption-service';
import { TABLE_ENCRYPTION_MAPPINGS, getTableEncryptionFields } from '../config/encryption-fields';
import { metricsRegistry } from './monitoring';

// Encryption middleware configuration
interface EncryptionMiddlewareConfig {
  enabled: boolean;
  skipTablePatterns: RegExp[];
  skipOperations: string[];
  logOperations: boolean;
  performanceTracking: boolean;
}

const DEFAULT_CONFIG: EncryptionMiddlewareConfig = {
  enabled: process.env.ENCRYPTION_MIDDLEWARE_ENABLED !== 'false',
  skipTablePatterns: [/^_/, /migrations?$/, /schema_/, /pg_/], // Skip system tables
  skipOperations: ['DESCRIBE', 'SHOW', 'EXPLAIN'],
  logOperations: process.env.NODE_ENV !== 'production',
  performanceTracking: true
};

/**
 * Database Query Encryption Interceptor
 * 
 * This class intercepts database operations and automatically applies encryption/decryption
 * based on the field configuration.
 */
export class DatabaseEncryptionInterceptor {
  private config: EncryptionMiddlewareConfig;
  private encryptionService: ReturnType<typeof getEncryptionService>;

  constructor(config: Partial<EncryptionMiddlewareConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.enabled) {
      this.encryptionService = getEncryptionService();
      console.log('🔐 Database encryption middleware initialized');
    }
  }

  /**
   * Encrypt data before INSERT/UPDATE operations
   */
  async encryptForStorage<T extends Record<string, any>>(
    tableName: string,
    data: T
  ): Promise<T> {
    if (!this.config.enabled) return data;
    
    const startTime = performance.now();
    
    try {
      // Check if table has encryption configuration
      if (!(tableName in TABLE_ENCRYPTION_MAPPINGS)) {
        return data;
      }
      
      const encryptionFields = getTableEncryptionFields(tableName as keyof typeof TABLE_ENCRYPTION_MAPPINGS);
      
      // Encrypt specified fields
      const encryptedData = await this.encryptionService.encryptFields(data, encryptionFields);
      
      if (this.config.performanceTracking) {
        const duration = performance.now() - startTime;
        metricsRegistry.recordHistogram('db_encryption_duration_ms', duration, {
          table: tableName,
          operation: 'encrypt',
          fields: Object.keys(encryptionFields).length.toString()
        });
      }
      
      if (this.config.logOperations) {
        const encryptedFieldCount = Object.keys(encryptionFields).filter(field => data[field]).length;
        console.log(`🔐 Encrypted ${encryptedFieldCount} fields for ${tableName}`);
      }
      
      return encryptedData;
      
    } catch (error) {
      console.error(`❌ Encryption failed for table ${tableName}:`, error);
      
      metricsRegistry.incrementCounter('db_encryption_errors_total', {
        table: tableName,
        operation: 'encrypt'
      });
      
      throw error;
    }
  }

  /**
   * Decrypt data after SELECT operations
   */
  async decryptFromStorage<T extends Record<string, any>>(
    tableName: string,
    data: T
  ): Promise<T> {
    if (!this.config.enabled) return data;
    
    const startTime = performance.now();
    
    try {
      // Check if table has encryption configuration
      if (!(tableName in TABLE_ENCRYPTION_MAPPINGS)) {
        return data;
      }
      
      const encryptionFields = getTableEncryptionFields(tableName as keyof typeof TABLE_ENCRYPTION_MAPPINGS);
      
      // Decrypt specified fields
      const decryptedData = await this.encryptionService.decryptFields(data, encryptionFields);
      
      if (this.config.performanceTracking) {
        const duration = performance.now() - startTime;
        metricsRegistry.recordHistogram('db_encryption_duration_ms', duration, {
          table: tableName,
          operation: 'decrypt',
          fields: Object.keys(encryptionFields).length.toString()
        });
      }
      
      if (this.config.logOperations) {
        const decryptedFieldCount = Object.keys(encryptionFields).filter(field => data[field]).length;
        console.log(`🔓 Decrypted ${decryptedFieldCount} fields for ${tableName}`);
      }
      
      return decryptedData;
      
    } catch (error) {
      console.warn(`⚠️ Decryption warning for table ${tableName}:`, error);
      
      metricsRegistry.incrementCounter('db_encryption_errors_total', {
        table: tableName,
        operation: 'decrypt'
      });
      
      // Return original data if decryption fails (backwards compatibility)
      return data;
    }
  }

  /**
   * Decrypt array of records
   */
  async decryptArray<T extends Record<string, any>>(
    tableName: string,
    records: T[]
  ): Promise<T[]> {
    if (!this.config.enabled || records.length === 0) return records;
    
    const startTime = performance.now();
    
    try {
      const decryptedRecords = await Promise.all(
        records.map(record => this.decryptFromStorage(tableName, record))
      );
      
      if (this.config.performanceTracking) {
        const duration = performance.now() - startTime;
        metricsRegistry.recordHistogram('db_encryption_batch_duration_ms', duration, {
          table: tableName,
          operation: 'decrypt_batch',
          count: records.length.toString()
        });
      }
      
      return decryptedRecords;
      
    } catch (error) {
      console.error(`❌ Batch decryption failed for table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Check if table should be processed
   */
  private shouldProcessTable(tableName: string): boolean {
    return !this.config.skipTablePatterns.some(pattern => pattern.test(tableName));
  }

  /**
   * Get configuration status
   */
  getConfig(): EncryptionMiddlewareConfig {
    return { ...this.config };
  }

  /**
   * Enable or disable middleware
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`🔐 Database encryption middleware ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Global interceptor instance
let interceptor: DatabaseEncryptionInterceptor | null = null;

/**
 * Initialize database encryption interceptor
 */
export function initializeDatabaseEncryption(config?: Partial<EncryptionMiddlewareConfig>): DatabaseEncryptionInterceptor {
  if (!interceptor) {
    interceptor = new DatabaseEncryptionInterceptor(config);
  }
  return interceptor;
}

/**
 * Get database encryption interceptor
 */
export function getDatabaseEncryptionInterceptor(): DatabaseEncryptionInterceptor {
  if (!interceptor) {
    throw new Error('Database encryption interceptor not initialized');
  }
  return interceptor;
}

/**
 * Express middleware for request-level encryption context
 */
export function encryptionContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Add encryption helper functions to request
    (req as any).encryption = {
      // Helper to encrypt data for API responses
      encrypt: async (data: string, context: EncryptionContext) => {
        if (!interceptor?.getConfig().enabled) return data;
        return await getEncryptionService().encrypt(data, context);
      },
      
      // Helper to decrypt data from API requests
      decrypt: async (encryptedData: string, expectedContext?: EncryptionContext) => {
        if (!interceptor?.getConfig().enabled) return encryptedData;
        return await getEncryptionService().decrypt(encryptedData, expectedContext);
      },
      
      // Helper to check if data is encrypted
      isEncrypted: (data: string) => {
        if (!interceptor?.getConfig().enabled) return false;
        return getEncryptionService().isEncrypted(data);
      },
      
      // Helper to get encryption context
      getContext: (encryptedData: string) => {
        if (!interceptor?.getConfig().enabled) return null;
        return getEncryptionService().getEncryptionContext(encryptedData);
      }
    };
    
    next();
    
  } catch (error) {
    console.error('❌ Encryption context middleware error:', error);
    next(error);
  }
}

/**
 * Database operation wrapper with automatic encryption/decryption
 */
export class EncryptedDatabaseOperations {
  private interceptor: DatabaseEncryptionInterceptor;

  constructor() {
    this.interceptor = getDatabaseEncryptionInterceptor();
  }

  /**
   * Encrypted INSERT operation
   */
  async insert<T extends Record<string, any>>(
    tableName: string,
    data: T
  ): Promise<T> {
    const encryptedData = await this.interceptor.encryptForStorage(tableName, data);
    // Here you would call your actual database insert operation
    // This is a template that needs to be integrated with your ORM
    console.log(`📝 INSERT into ${tableName} with encrypted data`);
    return encryptedData;
  }

  /**
   * Encrypted UPDATE operation
   */
  async update<T extends Record<string, any>>(
    tableName: string,
    data: Partial<T>,
    where: Record<string, any>
  ): Promise<T> {
    const encryptedData = await this.interceptor.encryptForStorage(tableName, data);
    // Here you would call your actual database update operation
    console.log(`✏️ UPDATE ${tableName} with encrypted data`);
    return encryptedData as T;
  }

  /**
   * Encrypted SELECT operation
   */
  async select<T extends Record<string, any>>(
    tableName: string,
    where?: Record<string, any>
  ): Promise<T[]> {
    // Here you would call your actual database select operation
    // This is a mock - replace with actual database call
    const rawData: T[] = [];
    
    const decryptedData = await this.interceptor.decryptArray(tableName, rawData);
    console.log(`🔍 SELECT from ${tableName} with decrypted data`);
    return decryptedData;
  }

  /**
   * Encrypted SELECT single record
   */
  async selectOne<T extends Record<string, any>>(
    tableName: string,
    where: Record<string, any>
  ): Promise<T | null> {
    // Here you would call your actual database select operation
    const rawData: T | null = null;
    
    if (!rawData) return null;
    
    const decryptedData = await this.interceptor.decryptFromStorage(tableName, rawData);
    console.log(`🔍 SELECT ONE from ${tableName} with decrypted data`);
    return decryptedData;
  }
}

/**
 * Drizzle ORM Integration Helper
 * 
 * This helper provides methods to integrate encryption with Drizzle ORM operations.
 */
export class DrizzleEncryptionHelper {
  private interceptor: DatabaseEncryptionInterceptor;

  constructor() {
    this.interceptor = getDatabaseEncryptionInterceptor();
  }

  /**
   * Wrap Drizzle insert with encryption
   */
  async wrapInsert<T extends Record<string, any>>(
    tableName: string,
    insertFn: (data: T) => Promise<T>,
    data: T
  ): Promise<T> {
    const encryptedData = await this.interceptor.encryptForStorage(tableName, data);
    const result = await insertFn(encryptedData);
    return await this.interceptor.decryptFromStorage(tableName, result);
  }

  /**
   * Wrap Drizzle update with encryption
   */
  async wrapUpdate<T extends Record<string, any>>(
    tableName: string,
    updateFn: (data: Partial<T>) => Promise<T>,
    data: Partial<T>
  ): Promise<T> {
    const encryptedData = await this.interceptor.encryptForStorage(tableName, data);
    const result = await updateFn(encryptedData);
    return await this.interceptor.decryptFromStorage(tableName, result);
  }

  /**
   * Wrap Drizzle select with decryption
   */
  async wrapSelect<T extends Record<string, any>>(
    tableName: string,
    selectFn: () => Promise<T[]>
  ): Promise<T[]> {
    const results = await selectFn();
    return await this.interceptor.decryptArray(tableName, results);
  }

  /**
   * Wrap Drizzle select one with decryption
   */
  async wrapSelectOne<T extends Record<string, any>>(
    tableName: string,
    selectFn: () => Promise<T | null>
  ): Promise<T | null> {
    const result = await selectFn();
    if (!result) return null;
    return await this.interceptor.decryptFromStorage(tableName, result);
  }
}

// Export singleton instances
export const encryptedDatabaseOperations = new EncryptedDatabaseOperations();
export const drizzleEncryptionHelper = new DrizzleEncryptionHelper();

/**
 * Express middleware for database encryption statistics
 */
export function encryptionStatsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/api/admin/encryption/stats' && req.method === 'GET') {
    try {
      const encryptionService = getEncryptionService();
      const stats = encryptionService.getStats();
      const interceptorConfig = interceptor?.getConfig() || null;
      
      res.json({
        success: true,
        data: {
          encryption: stats,
          middleware: interceptorConfig,
          timestamp: new Date().toISOString()
        }
      });
      return;
    } catch (error) {
      console.error('❌ Error getting encryption stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get encryption statistics'
      });
      return;
    }
  }
  
  next();
}

/**
 * Cleanup encryption middleware
 */
export async function cleanupDatabaseEncryption(): Promise<void> {
  if (interceptor) {
    interceptor = null;
    console.log('✅ Database encryption middleware cleaned up');
  }
}