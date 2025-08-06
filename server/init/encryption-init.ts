/**
 * Encryption System Initialization
 * 
 * Centralizes the initialization of all encryption-related services and middleware.
 * Ensures proper startup sequence and configuration validation.
 */

import { Express } from 'express';
import { 
  initializeEncryptionService, 
  getEncryptionService, 
  EncryptionContext 
} from '../services/encryption-service';
import { 
  initializeDatabaseEncryption,
  encryptionContextMiddleware,
  encryptionStatsMiddleware
} from '../middleware/encryption-middleware';
import { 
  initializeKeyManagement,
  getKeyManagementService
} from '../utils/key-management';
import { DatabaseConnection } from '../database/schema-validation';

// Encryption system configuration
interface EncryptionSystemConfig {
  masterKey?: string;
  keyDerivationSalt?: string;
  enableKeyRotation: boolean;
  enableDatabaseEncryption: boolean;
  enableAuditLogging: boolean;
  compressionEnabled: boolean;
  performanceTracking: boolean;
  developmentMode: boolean;
}

// Default configuration
const DEFAULT_CONFIG: EncryptionSystemConfig = {
  enableKeyRotation: process.env.ENABLE_KEY_ROTATION !== 'false',
  enableDatabaseEncryption: process.env.ENABLE_DATABASE_ENCRYPTION !== 'false',
  enableAuditLogging: process.env.ENABLE_ENCRYPTION_AUDIT !== 'false',
  compressionEnabled: process.env.ENABLE_ENCRYPTION_COMPRESSION !== 'false',
  performanceTracking: process.env.ENABLE_ENCRYPTION_METRICS !== 'false',
  developmentMode: process.env.NODE_ENV !== 'production'
};

/**
 * Initialize the complete encryption system
 */
export async function initializeEncryptionSystem(
  app: Express,
  db: DatabaseConnection,
  config: Partial<EncryptionSystemConfig> = {}
): Promise<void> {
  const startTime = performance.now();
  console.log('🔐 Initializing enterprise encryption system...');
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  try {
    // 1. Validate environment variables
    await validateEncryptionEnvironment(finalConfig);
    
    // 2. Initialize core encryption service
    console.log('🔑 Initializing encryption service...');
    const encryptionService = initializeEncryptionService(finalConfig.masterKey, {
      enableCompression: finalConfig.compressionEnabled,
      enableAuditLogging: finalConfig.enableAuditLogging
    });
    
    // 3. Initialize database encryption middleware
    if (finalConfig.enableDatabaseEncryption) {
      console.log('🛡️ Initializing database encryption middleware...');
      initializeDatabaseEncryption({
        enabled: true,
        logOperations: finalConfig.developmentMode,
        performanceTracking: finalConfig.performanceTracking
      });
    }
    
    // 4. Initialize key management system
    if (finalConfig.enableKeyRotation) {
      console.log('⏰ Initializing key management system...');
      initializeKeyManagement();
      
      // Perform initial health check
      const keyManagement = getKeyManagementService();
      await keyManagement.performHealthCheck();
    }
    
    // 5. Setup Express middleware
    setupExpressMiddleware(app, finalConfig);
    
    // 6. Setup API endpoints
    setupEncryptionAPIEndpoints(app);
    
    // 7. Perform system validation
    await performSystemValidation(encryptionService);
    
    const duration = performance.now() - startTime;
    console.log(`✅ Encryption system initialized successfully in ${Math.round(duration)}ms`);
    console.log('🔐 Encryption System Status:');
    console.log(`   - Core service: ✅ Active`);
    console.log(`   - Database encryption: ${finalConfig.enableDatabaseEncryption ? '✅ Active' : '⏹️ Disabled'}`);
    console.log(`   - Key rotation: ${finalConfig.enableKeyRotation ? '✅ Active' : '⏹️ Disabled'}`);
    console.log(`   - Audit logging: ${finalConfig.enableAuditLogging ? '✅ Active' : '⏹️ Disabled'}`);
    console.log(`   - Performance tracking: ${finalConfig.performanceTracking ? '✅ Active' : '⏹️ Disabled'}`);
    
  } catch (error) {
    console.error('❌ Failed to initialize encryption system:', error);
    throw new Error(`Encryption system initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate encryption environment variables
 */
async function validateEncryptionEnvironment(config: EncryptionSystemConfig): Promise<void> {
  console.log('🔍 Validating encryption environment...');
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check master encryption key
  const masterKey = config.masterKey || process.env.MASTER_ENCRYPTION_KEY;
  if (!masterKey) {
    errors.push('MASTER_ENCRYPTION_KEY environment variable is required');
  } else if (masterKey === 'default-encryption-key' || masterKey.length < 64) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('Production environments require a strong master encryption key (minimum 64 hex characters)');
    } else {
      warnings.push('Using weak or default master encryption key - not suitable for production');
    }
  }
  
  // Check key derivation salt
  const salt = config.keyDerivationSalt || process.env.KEY_DERIVATION_SALT;
  if (!salt && process.env.NODE_ENV === 'production') {
    errors.push('KEY_DERIVATION_SALT environment variable is required for production');
  } else if (!salt) {
    warnings.push('KEY_DERIVATION_SALT not set - using random salt (not persistent across restarts)');
  }
  
  // Check JWT secret compatibility
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === 'default-jwt-secret') {
    warnings.push('JWT_SECRET should be set to a strong value for production');
  }
  
  // Validate encryption contexts
  for (const context of Object.values(EncryptionContext)) {
    // Additional context-specific validation could go here
    console.log(`   ✓ Context configured: ${context}`);
  }
  
  // Handle validation results
  if (warnings.length > 0) {
    console.warn('⚠️ Encryption environment warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }
  
  if (errors.length > 0) {
    console.error('❌ Encryption environment errors:');
    errors.forEach(error => console.error(`   - ${error}`));
    throw new Error('Encryption environment validation failed');
  }
  
  console.log('✅ Encryption environment validation passed');
}

/**
 * Setup Express middleware for encryption
 */
function setupExpressMiddleware(app: Express, config: EncryptionSystemConfig): void {
  console.log('🔗 Setting up Express middleware...');
  
  // Add encryption context to all requests
  app.use(encryptionContextMiddleware);
  
  // Add encryption statistics endpoint
  app.use(encryptionStatsMiddleware);
  
  // Add security headers for encrypted data
  app.use((req, res, next) => {
    // Indicate that sensitive data is encrypted
    res.setHeader('X-Encryption-Enabled', 'true');
    
    // Add HSTS for production
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
  });
  
  console.log('✅ Express middleware configured');
}

/**
 * Setup encryption-related API endpoints
 */
function setupEncryptionAPIEndpoints(app: Express): void {
  console.log('🔌 Setting up encryption API endpoints...');
  
  // Encryption health check endpoint
  app.get('/api/admin/encryption/health', async (req, res) => {
    try {
      const encryptionService = getEncryptionService();
      const stats = encryptionService.getStats();
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        encryption: {
          totalKeys: stats.totalKeys,
          activeKeys: stats.activeKeys,
          contexts: stats.contexts,
          auditLogs: stats.auditLogs
        }
      };
      
      // Add key management health if available
      try {
        const keyManagement = getKeyManagementService();
        const keyStats = keyManagement.getKeyManagementStats();
        health.encryption = {
          ...health.encryption,
          ...keyStats
        };
      } catch {
        // Key management not initialized
      }
      
      res.json({ success: true, data: health });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Key rotation endpoint (admin only)
  app.post('/api/admin/encryption/rotate-key', async (req, res) => {
    try {
      const { context } = req.body;
      
      if (!context || !Object.values(EncryptionContext).includes(context)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid context specified'
        });
      }
      
      const keyManagement = getKeyManagementService();
      await keyManagement.rotateKeyNow(context);
      
      res.json({
        success: true,
        message: `Key rotation completed for context: ${context}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Key rotation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Emergency key rotation endpoint (admin only)
  app.post('/api/admin/encryption/emergency-rotate', async (req, res) => {
    try {
      const keyManagement = getKeyManagementService();
      await keyManagement.emergencyRotateAllKeys();
      
      res.json({
        success: true,
        message: 'Emergency key rotation completed for all contexts'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Emergency key rotation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Encryption audit logs endpoint
  app.get('/api/admin/encryption/audit', async (req, res) => {
    try {
      const { context, operation, limit = 100 } = req.query;
      
      const encryptionService = getEncryptionService();
      const auditLogs = encryptionService.getAuditLogs({
        context: context as EncryptionContext,
        operation: operation as string,
        limit: parseInt(limit as string) || 100
      });
      
      res.json({ success: true, data: auditLogs });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Key management events endpoint
  app.get('/api/admin/encryption/events', async (req, res) => {
    try {
      const { context, type, severity, limit = 50 } = req.query;
      
      const keyManagement = getKeyManagementService();
      const events = keyManagement.getEvents({
        context: context as EncryptionContext,
        type: type as string,
        severity: severity as string,
        limit: parseInt(limit as string) || 50
      });
      
      res.json({ success: true, data: events });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve key management events',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  console.log('✅ API endpoints configured');
}

/**
 * Perform system validation
 */
async function performSystemValidation(encryptionService: ReturnType<typeof getEncryptionService>): Promise<void> {
  console.log('🧪 Performing system validation...');
  
  try {
    // Test encryption/decryption for each context
    const testData = 'test-encryption-data-12345';
    
    for (const context of Object.values(EncryptionContext)) {
      const encrypted = await encryptionService.encrypt(testData, context);
      const decrypted = await encryptionService.decrypt(encrypted, context);
      
      if (decrypted !== testData) {
        throw new Error(`Encryption/decryption test failed for context: ${context}`);
      }
      
      console.log(`   ✓ ${context}: encryption/decryption working`);
    }
    
    // Test field-level encryption
    const testFields = {
      email: 'test@example.com',
      apiKey: 'test-api-key-12345'
    };
    
    const fieldContextMap = {
      email: EncryptionContext.USER_PII,
      apiKey: EncryptionContext.API_KEYS
    };
    
    const encryptedFields = await encryptionService.encryptFields(testFields, fieldContextMap);
    const decryptedFields = await encryptionService.decryptFields(encryptedFields, fieldContextMap);
    
    if (JSON.stringify(decryptedFields) !== JSON.stringify(testFields)) {
      throw new Error('Field-level encryption/decryption test failed');
    }
    
    console.log('   ✓ Field-level encryption working');
    
    // Test encryption detection
    const isEncrypted = encryptionService.isEncrypted(encryptedFields.email);
    if (!isEncrypted) {
      throw new Error('Encryption detection test failed');
    }
    
    console.log('   ✓ Encryption detection working');
    
    console.log('✅ System validation completed successfully');
    
  } catch (error) {
    console.error('❌ System validation failed:', error);
    throw error;
  }
}

/**
 * Generate encryption system report
 */
export function generateEncryptionReport(): {
  system: {
    initialized: boolean;
    version: string;
    environment: string;
  };
  services: {
    encryption: any;
    keyManagement?: any;
    databaseEncryption?: any;
  };
  security: {
    contexts: EncryptionContext[];
    keyRotationEnabled: boolean;
    auditLoggingEnabled: boolean;
  };
  recommendations: string[];
} {
  const recommendations: string[] = [];
  
  try {
    const encryptionService = getEncryptionService();
    const encryptionStats = encryptionService.getStats();
    
    let keyManagementStats;
    try {
      const keyManagement = getKeyManagementService();
      keyManagementStats = keyManagement.getKeyManagementStats();
    } catch {
      recommendations.push('Key management service not initialized - consider enabling for production');
    }
    
    // Add security recommendations
    if (process.env.NODE_ENV === 'production') {
      if (process.env.MASTER_ENCRYPTION_KEY === 'default-encryption-key') {
        recommendations.push('CRITICAL: Change default master encryption key for production');
      }
      
      if (!process.env.KEY_DERIVATION_SALT) {
        recommendations.push('Set KEY_DERIVATION_SALT environment variable for production');
      }
      
      if (!encryptionStats.config.enableAuditLogging) {
        recommendations.push('Enable audit logging for production environments');
      }
    }
    
    if (encryptionStats.activeKeys < encryptionStats.contexts) {
      recommendations.push('Some encryption contexts may not have active keys');
    }
    
    return {
      system: {
        initialized: true,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      services: {
        encryption: encryptionStats,
        keyManagement: keyManagementStats
      },
      security: {
        contexts: Object.values(EncryptionContext),
        keyRotationEnabled: !!keyManagementStats,
        auditLoggingEnabled: encryptionStats.config.enableAuditLogging
      },
      recommendations
    };
    
  } catch (error) {
    return {
      system: {
        initialized: false,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      services: {},
      security: {
        contexts: Object.values(EncryptionContext),
        keyRotationEnabled: false,
        auditLoggingEnabled: false
      },
      recommendations: ['Encryption system not properly initialized']
    };
  }
}

/**
 * Graceful shutdown of encryption system
 */
export async function shutdownEncryptionSystem(): Promise<void> {
  console.log('🔐 Shutting down encryption system...');
  
  try {
    // Stop key management service
    const { cleanupKeyManagement } = await import('../utils/key-management');
    await cleanupKeyManagement();
    
    // Cleanup database encryption
    const { cleanupDatabaseEncryption } = await import('../middleware/encryption-middleware');
    await cleanupDatabaseEncryption();
    
    // Cleanup encryption service
    const { cleanupEncryptionService } = await import('../services/encryption-service');
    await cleanupEncryptionService();
    
    console.log('✅ Encryption system shutdown completed');
    
  } catch (error) {
    console.error('❌ Error during encryption system shutdown:', error);
  }
}

// Export types
export type { EncryptionSystemConfig };