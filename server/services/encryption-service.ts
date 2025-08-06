/**
 * Enterprise-Grade Data Encryption Service
 * 
 * Provides comprehensive field-level encryption for sensitive data with:
 * - AES-256-GCM encryption for data at rest
 * - Key rotation and management
 * - Multiple encryption contexts
 * - Audit logging
 * - Performance optimization
 */

import crypto from 'crypto';
import { z } from 'zod';
import { metricsRegistry } from '../middleware/monitoring';

// Encryption Configuration
interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  keyDerivationIterations: number;
  enableCompression: boolean;
  enableAuditLogging: boolean;
}

// Default configuration
const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits
  tagLength: 16, // 128 bits
  keyDerivationIterations: 100000,
  enableCompression: true,
  enableAuditLogging: true
};

// Encryption Context Types
export enum EncryptionContext {
  USER_PII = 'user_pii',           // Personal identifiable information
  AUTH_TOKENS = 'auth_tokens',     // Authentication tokens and secrets
  API_KEYS = 'api_keys',           // Third-party API keys
  COMMUNICATIONS = 'communications', // Email/SMS content
  FINANCIAL = 'financial',         // Payment and financial data
  METADATA = 'metadata',           // General sensitive metadata
  INTERNAL = 'internal'            // Internal system data
}

// Encrypted Data Structure
interface EncryptedData {
  data: string;           // Base64 encoded encrypted data
  iv: string;            // Base64 encoded initialization vector
  tag: string;           // Base64 encoded authentication tag
  context: EncryptionContext;
  keyVersion: number;
  algorithm: string;
  compressed: boolean;
  timestamp: string;
}

// Key Information
interface EncryptionKey {
  id: string;
  version: number;
  context: EncryptionContext;
  key: Buffer;
  createdAt: Date;
  expiresAt?: Date;
  active: boolean;
  rotationSchedule?: string; // Cron expression
}

// Audit Log Entry
interface EncryptionAuditLog {
  operation: 'encrypt' | 'decrypt' | 'key_rotate' | 'key_create';
  context: EncryptionContext;
  keyVersion: number;
  success: boolean;
  error?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Validation Schemas
const encryptedDataSchema = z.object({
  data: z.string(),
  iv: z.string(),
  tag: z.string(),
  context: z.nativeEnum(EncryptionContext),
  keyVersion: z.number(),
  algorithm: z.string(),
  compressed: z.boolean(),
  timestamp: z.string()
});

/**
 * Enterprise Encryption Service Implementation
 */
export class EncryptionService {
  private config: EncryptionConfig;
  private keys: Map<string, EncryptionKey> = new Map();
  private auditLogs: EncryptionAuditLog[] = [];
  private masterKey: Buffer;
  private keyDerivationSalt: Buffer;

  constructor(masterKeyHex?: string, config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize master key from environment or parameter
    const masterKeyString = masterKeyHex || process.env.MASTER_ENCRYPTION_KEY;
    if (!masterKeyString) {
      throw new Error('Master encryption key is required. Set MASTER_ENCRYPTION_KEY environment variable.');
    }
    
    this.masterKey = Buffer.from(masterKeyString, 'hex');
    if (this.masterKey.length < 32) {
      throw new Error('Master encryption key must be at least 256 bits (64 hex characters)');
    }
    
    // Initialize key derivation salt
    const saltString = process.env.KEY_DERIVATION_SALT;
    if (saltString) {
      this.keyDerivationSalt = Buffer.from(saltString, 'hex');
    } else {
      this.keyDerivationSalt = crypto.randomBytes(32);
      console.warn('⚠️ Using randomly generated salt. Set KEY_DERIVATION_SALT for production.');
    }
    
    // Initialize context keys
    this.initializeContextKeys();
    
    console.log('🔐 Enterprise encryption service initialized');
    console.log(`   - Algorithm: ${this.config.algorithm}`);
    console.log(`   - Key length: ${this.config.keyLength * 8} bits`);
    console.log(`   - Contexts: ${Object.values(EncryptionContext).length}`);
    console.log(`   - Audit logging: ${this.config.enableAuditLogging ? 'enabled' : 'disabled'}`);
  }

  // ===================== KEY MANAGEMENT =====================

  /**
   * Initialize encryption keys for all contexts
   */
  private initializeContextKeys(): void {
    for (const context of Object.values(EncryptionContext)) {
      this.createContextKey(context, 1);
    }
  }

  /**
   * Create encryption key for specific context
   */
  private createContextKey(context: EncryptionContext, version: number): EncryptionKey {
    const keyId = `${context}_v${version}`;
    
    // Derive context-specific key from master key
    const contextSalt = crypto.createHash('sha256')
      .update(this.keyDerivationSalt)
      .update(context)
      .update(version.toString())
      .digest();
    
    const derivedKey = crypto.pbkdf2Sync(
      this.masterKey,
      contextSalt,
      this.config.keyDerivationIterations,
      this.config.keyLength,
      'sha512'
    );
    
    const key: EncryptionKey = {
      id: keyId,
      version,
      context,
      key: derivedKey,
      createdAt: new Date(),
      active: true
    };
    
    this.keys.set(keyId, key);
    
    this.logAuditEvent({
      operation: 'key_create',
      context,
      keyVersion: version,
      success: true,
      timestamp: new Date(),
      metadata: { keyId }
    });
    
    return key;
  }

  /**
   * Get active key for context
   */
  private getActiveKey(context: EncryptionContext): EncryptionKey {
    // Find the highest version active key for this context
    const contextKeys = Array.from(this.keys.values())
      .filter(key => key.context === context && key.active)
      .sort((a, b) => b.version - a.version);
    
    if (contextKeys.length === 0) {
      throw new Error(`No active encryption key found for context: ${context}`);
    }
    
    return contextKeys[0];
  }

  /**
   * Get specific key by context and version
   */
  private getKey(context: EncryptionContext, version: number): EncryptionKey {
    const keyId = `${context}_v${version}`;
    const key = this.keys.get(keyId);
    
    if (!key) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }
    
    return key;
  }

  /**
   * Rotate encryption key for context
   */
  async rotateKey(context: EncryptionContext): Promise<EncryptionKey> {
    const startTime = performance.now();
    
    try {
      const currentKey = this.getActiveKey(context);
      const newVersion = currentKey.version + 1;
      
      // Create new key
      const newKey = this.createContextKey(context, newVersion);
      
      // Mark old key as inactive (but keep for decryption)
      currentKey.active = false;
      
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('encryption_key_rotation_duration_ms', duration, {
        context: context.toString(),
        success: 'true'
      });
      
      this.logAuditEvent({
        operation: 'key_rotate',
        context,
        keyVersion: newVersion,
        success: true,
        timestamp: new Date(),
        metadata: { 
          oldVersion: currentKey.version,
          newVersion,
          duration: Math.round(duration)
        }
      });
      
      console.log(`🔄 Key rotated for context ${context}: v${currentKey.version} → v${newVersion}`);
      return newKey;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('encryption_key_rotation_duration_ms', duration, {
        context: context.toString(),
        success: 'false'
      });
      
      this.logAuditEvent({
        operation: 'key_rotate',
        context,
        keyVersion: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      
      console.error(`❌ Key rotation failed for context ${context}:`, error);
      throw error;
    }
  }

  // ===================== ENCRYPTION/DECRYPTION =====================

  /**
   * Encrypt sensitive data
   */
  async encrypt(
    plaintext: string | Buffer, 
    context: EncryptionContext,
    metadata?: Record<string, any>
  ): Promise<string> {
    const startTime = performance.now();
    
    try {
      if (!plaintext || (typeof plaintext === 'string' && plaintext.trim().length === 0)) {
        throw new Error('Cannot encrypt empty or null data');
      }
      
      const key = this.getActiveKey(context);
      const iv = crypto.randomBytes(this.config.ivLength);
      
      // Convert to string if buffer
      let dataToEncrypt = typeof plaintext === 'string' ? plaintext : plaintext.toString('utf8');
      
      // Optional compression for large data
      if (this.config.enableCompression && dataToEncrypt.length > 1000) {
        const zlib = await import('zlib');
        const compressed = zlib.deflateSync(Buffer.from(dataToEncrypt));
        dataToEncrypt = compressed.toString('base64');
      }
      
      // Create cipher
      const cipher = crypto.createCipherGCM(this.config.algorithm, key.key, iv);
      cipher.setAAD(Buffer.from(context)); // Additional authenticated data
      
      // Encrypt data
      let encrypted = cipher.update(dataToEncrypt, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Create encrypted data structure
      const encryptedData: EncryptedData = {
        data: encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        context,
        keyVersion: key.version,
        algorithm: this.config.algorithm,
        compressed: this.config.enableCompression && dataToEncrypt.length > 1000,
        timestamp: new Date().toISOString()
      };
      
      const result = JSON.stringify(encryptedData);
      
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('encryption_operation_duration_ms', duration, {
        operation: 'encrypt',
        context: context.toString(),
        success: 'true'
      });
      
      metricsRegistry.incrementCounter('encryption_operations_total', {
        operation: 'encrypt',
        context: context.toString(),
        status: 'success'
      });
      
      this.logAuditEvent({
        operation: 'encrypt',
        context,
        keyVersion: key.version,
        success: true,
        timestamp: new Date(),
        metadata: {
          dataSize: dataToEncrypt.length,
          compressed: encryptedData.compressed,
          duration: Math.round(duration),
          ...metadata
        }
      });
      
      return result;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('encryption_operation_duration_ms', duration, {
        operation: 'encrypt',
        context: context.toString(),
        success: 'false'
      });
      
      metricsRegistry.incrementCounter('encryption_operations_total', {
        operation: 'encrypt',
        context: context.toString(),
        status: 'error'
      });
      
      this.logAuditEvent({
        operation: 'encrypt',
        context,
        keyVersion: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        metadata
      });
      
      console.error('❌ Encryption failed:', error);
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decrypt(encryptedString: string, expectedContext?: EncryptionContext): Promise<string> {
    const startTime = performance.now();
    
    try {
      if (!encryptedString || encryptedString.trim().length === 0) {
        throw new Error('Cannot decrypt empty or null data');
      }
      
      // Parse encrypted data structure
      let encryptedData: EncryptedData;
      try {
        const parsed = JSON.parse(encryptedString);
        encryptedData = encryptedDataSchema.parse(parsed);
      } catch (parseError) {
        throw new Error('Invalid encrypted data format');
      }
      
      // Verify context if specified
      if (expectedContext && encryptedData.context !== expectedContext) {
        throw new Error(`Context mismatch: expected ${expectedContext}, got ${encryptedData.context}`);
      }
      
      // Get decryption key
      const key = this.getKey(encryptedData.context, encryptedData.keyVersion);
      
      // Create decipher
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const decipher = crypto.createDecipherGCM(encryptedData.algorithm, key.key, iv);
      decipher.setAAD(Buffer.from(encryptedData.context));
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'base64'));
      
      // Decrypt data
      let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Decompress if necessary
      if (encryptedData.compressed) {
        const zlib = await import('zlib');
        const decompressed = zlib.inflateSync(Buffer.from(decrypted, 'base64'));
        decrypted = decompressed.toString('utf8');
      }
      
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('encryption_operation_duration_ms', duration, {
        operation: 'decrypt',
        context: encryptedData.context.toString(),
        success: 'true'
      });
      
      metricsRegistry.incrementCounter('encryption_operations_total', {
        operation: 'decrypt',
        context: encryptedData.context.toString(),
        status: 'success'
      });
      
      this.logAuditEvent({
        operation: 'decrypt',
        context: encryptedData.context,
        keyVersion: encryptedData.keyVersion,
        success: true,
        timestamp: new Date(),
        metadata: {
          keyVersion: encryptedData.keyVersion,
          algorithm: encryptedData.algorithm,
          compressed: encryptedData.compressed,
          duration: Math.round(duration)
        }
      });
      
      return decrypted;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('encryption_operation_duration_ms', duration, {
        operation: 'decrypt',
        context: expectedContext?.toString() || 'unknown',
        success: 'false'
      });
      
      metricsRegistry.incrementCounter('encryption_operations_total', {
        operation: 'decrypt',
        context: expectedContext?.toString() || 'unknown',
        status: 'error'
      });
      
      this.logAuditEvent({
        operation: 'decrypt',
        context: expectedContext || EncryptionContext.INTERNAL,
        keyVersion: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      
      console.error('❌ Decryption failed:', error);
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===================== FIELD-LEVEL ENCRYPTION HELPERS =====================

  /**
   * Encrypt specific database fields based on context
   */
  async encryptFields<T extends Record<string, any>>(
    data: T, 
    fieldContextMap: Record<keyof T, EncryptionContext>
  ): Promise<T> {
    const result = { ...data };
    
    for (const [field, context] of Object.entries(fieldContextMap)) {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = await this.encrypt(result[field], context, { field });
      }
    }
    
    return result;
  }

  /**
   * Decrypt specific database fields
   */
  async decryptFields<T extends Record<string, any>>(
    data: T, 
    fieldContextMap: Record<keyof T, EncryptionContext>
  ): Promise<T> {
    const result = { ...data };
    
    for (const [field, context] of Object.entries(fieldContextMap)) {
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = await this.decrypt(result[field], context);
        } catch (error) {
          console.warn(`⚠️ Failed to decrypt field ${String(field)}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }
    
    return result;
  }

  // ===================== UTILITY METHODS =====================

  /**
   * Check if string is encrypted data
   */
  isEncrypted(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      return encryptedDataSchema.safeParse(parsed).success;
    } catch {
      return false;
    }
  }

  /**
   * Get encryption context from encrypted data
   */
  getEncryptionContext(encryptedString: string): EncryptionContext | null {
    try {
      const parsed = JSON.parse(encryptedString);
      const validated = encryptedDataSchema.parse(parsed);
      return validated.context;
    } catch {
      return null;
    }
  }

  /**
   * Get key information for context
   */
  getKeyInfo(context: EncryptionContext): { version: number; createdAt: Date; active: boolean } | null {
    try {
      const key = this.getActiveKey(context);
      return {
        version: key.version,
        createdAt: key.createdAt,
        active: key.active
      };
    } catch {
      return null;
    }
  }

  /**
   * Get encryption statistics
   */
  getStats(): {
    totalKeys: number;
    activeKeys: number;
    contexts: number;
    auditLogs: number;
    config: EncryptionConfig;
  } {
    const activeKeys = Array.from(this.keys.values()).filter(key => key.active);
    
    return {
      totalKeys: this.keys.size,
      activeKeys: activeKeys.length,
      contexts: Object.values(EncryptionContext).length,
      auditLogs: this.auditLogs.length,
      config: this.config
    };
  }

  /**
   * Get audit logs with filtering
   */
  getAuditLogs(options: {
    context?: EncryptionContext;
    operation?: string;
    limit?: number;
    since?: Date;
  } = {}): EncryptionAuditLog[] {
    let logs = [...this.auditLogs];
    
    if (options.context) {
      logs = logs.filter(log => log.context === options.context);
    }
    
    if (options.operation) {
      logs = logs.filter(log => log.operation === options.operation);
    }
    
    if (options.since) {
      logs = logs.filter(log => log.timestamp >= options.since!);
    }
    
    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (options.limit) {
      logs = logs.slice(0, options.limit);
    }
    
    return logs;
  }

  /**
   * Log audit event
   */
  private logAuditEvent(event: EncryptionAuditLog): void {
    if (!this.config.enableAuditLogging) return;
    
    this.auditLogs.push(event);
    
    // Keep only last 10000 audit logs
    if (this.auditLogs.length > 10000) {
      this.auditLogs.splice(0, this.auditLogs.length - 10000);
    }
    
    // In production, you might want to send these to a separate audit service
    if (event.success) {
      console.log(`🔐 Encryption audit: ${event.operation} for ${event.context} (v${event.keyVersion})`);
    } else {
      console.error(`🚨 Encryption audit ERROR: ${event.operation} for ${event.context} - ${event.error}`);
    }
  }

  /**
   * Cleanup old keys (keep for backward compatibility)
   */
  async cleanupOldKeys(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    let removedCount = 0;
    
    for (const [keyId, key] of this.keys.entries()) {
      if (!key.active && key.createdAt < cutoffDate) {
        this.keys.delete(keyId);
        removedCount++;
      }
    }
    
    console.log(`🧹 Cleaned up ${removedCount} old encryption keys`);
    return removedCount;
  }
}

// Export singleton instance
let encryptionService: EncryptionService | null = null;

export function initializeEncryptionService(masterKeyHex?: string, config?: Partial<EncryptionConfig>): EncryptionService {
  if (!encryptionService) {
    encryptionService = new EncryptionService(masterKeyHex, config);
    console.log('✅ Encryption service initialized');
  }
  return encryptionService;
}

export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    throw new Error('Encryption service not initialized. Call initializeEncryptionService() first.');
  }
  return encryptionService;
}

export async function cleanupEncryptionService(): Promise<void> {
  if (encryptionService) {
    await encryptionService.cleanupOldKeys();
    encryptionService = null;
    console.log('✅ Encryption service cleaned up');
  }
}

// Export types and enums
export type { EncryptedData, EncryptionKey, EncryptionAuditLog, EncryptionConfig };