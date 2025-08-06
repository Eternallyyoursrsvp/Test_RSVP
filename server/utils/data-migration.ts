/**
 * Data Migration Utility for Encryption
 * 
 * Provides safe migration of existing unencrypted data to encrypted format.
 * Includes rollback capabilities, progress tracking, and validation.
 */

import { getEncryptionService, EncryptionContext } from '../services/encryption-service';
import { TABLE_ENCRYPTION_MAPPINGS, getTableEncryptionFields } from '../config/encryption-fields';
import { DatabaseConnection } from '../database/schema-validation';
import { metricsRegistry } from '../middleware/monitoring';

// Migration status
export enum MigrationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

// Migration configuration
interface MigrationConfig {
  batchSize: number;
  maxRetries: number;
  backupEnabled: boolean;
  validateAfterMigration: boolean;
  rollbackOnFailure: boolean;
  dryRun: boolean;
  parallelTables: boolean;
  continueOnError: boolean;
}

// Default migration configuration
const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  batchSize: 100,
  maxRetries: 3,
  backupEnabled: true,
  validateAfterMigration: true,
  rollbackOnFailure: true,
  dryRun: false,
  parallelTables: false,
  continueOnError: false
};

// Migration progress tracking
interface MigrationProgress {
  tableName: string;
  totalRecords: number;
  processedRecords: number;
  encryptedRecords: number;
  failedRecords: number;
  status: MigrationStatus;
  startTime: Date;
  endTime?: Date;
  errors: string[];
  backupLocation?: string;
}

// Migration result
interface MigrationResult {
  success: boolean;
  tablesProcessed: number;
  totalRecords: number;
  encryptedRecords: number;
  failedRecords: number;
  duration: number;
  errors: string[];
  tableResults: MigrationProgress[];
}

// Backup record structure
interface BackupRecord {
  tableName: string;
  recordId: string | number;
  originalData: Record<string, any>;
  encryptedData: Record<string, any>;
  timestamp: Date;
}

/**
 * Encryption Data Migration Service
 */
export class EncryptionMigrationService {
  private db: DatabaseConnection;
  private encryptionService: ReturnType<typeof getEncryptionService>;
  private config: MigrationConfig;
  private backupRecords: Map<string, BackupRecord[]> = new Map();
  private migrationProgress: Map<string, MigrationProgress> = new Map();

  constructor(db: DatabaseConnection, config: Partial<MigrationConfig> = {}) {
    this.db = db;
    this.config = { ...DEFAULT_MIGRATION_CONFIG, ...config };
    this.encryptionService = getEncryptionService();
    
    console.log('🔄 Encryption migration service initialized');
    console.log(`   - Batch size: ${this.config.batchSize}`);
    console.log(`   - Backup enabled: ${this.config.backupEnabled}`);
    console.log(`   - Dry run: ${this.config.dryRun}`);
  }

  /**
   * Migrate all tables with encryption configuration
   */
  async migrateAllTables(): Promise<MigrationResult> {
    const startTime = Date.now();
    console.log('🚀 Starting encryption migration for all tables...');
    
    const tableNames = Object.keys(TABLE_ENCRYPTION_MAPPINGS);
    const results: MigrationResult = {
      success: true,
      tablesProcessed: 0,
      totalRecords: 0,
      encryptedRecords: 0,
      failedRecords: 0,
      duration: 0,
      errors: [],
      tableResults: []
    };
    
    try {
      if (this.config.parallelTables) {
        // Process tables in parallel
        const migrations = tableNames.map(tableName => this.migrateTable(tableName));
        const tableResults = await Promise.allSettled(migrations);
        
        for (let i = 0; i < tableResults.length; i++) {
          const result = tableResults[i];
          if (result.status === 'fulfilled') {
            this.aggregateResults(results, result.value);
          } else {
            results.errors.push(`Table ${tableNames[i]}: ${result.reason}`);
            results.success = false;
          }
        }
      } else {
        // Process tables sequentially
        for (const tableName of tableNames) {
          try {
            const tableResult = await this.migrateTable(tableName);
            this.aggregateResults(results, tableResult);
          } catch (error) {
            const errorMessage = `Table ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            results.errors.push(errorMessage);
            results.success = false;
            
            if (!this.config.continueOnError) {
              break;
            }
          }
        }
      }
      
      results.duration = Date.now() - startTime;
      
      // Record metrics
      metricsRegistry.recordHistogram('migration_duration_ms', results.duration, {
        type: 'full_migration',
        success: results.success.toString()
      });
      
      metricsRegistry.setGauge('migration_records_total', results.totalRecords);
      metricsRegistry.setGauge('migration_records_encrypted', results.encryptedRecords);
      metricsRegistry.setGauge('migration_records_failed', results.failedRecords);
      
      if (results.success) {
        console.log(`✅ Migration completed successfully in ${Math.round(results.duration / 1000)}s`);
        console.log(`   - Tables processed: ${results.tablesProcessed}`);
        console.log(`   - Records encrypted: ${results.encryptedRecords}/${results.totalRecords}`);
      } else {
        console.error(`❌ Migration completed with errors: ${results.errors.length} errors`);
        
        if (this.config.rollbackOnFailure) {
          console.log('🔄 Rolling back changes...');
          await this.rollbackAllTables();
        }
      }
      
      return results;
      
    } catch (error) {
      results.success = false;
      results.duration = Date.now() - startTime;
      results.errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      console.error('❌ Migration failed with critical error:', error);
      
      if (this.config.rollbackOnFailure) {
        console.log('🔄 Rolling back changes...');
        await this.rollbackAllTables();
      }
      
      return results;
    }
  }

  /**
   * Migrate a specific table
   */
  async migrateTable(tableName: string): Promise<MigrationProgress> {
    console.log(`📋 Starting migration for table: ${tableName}`);
    
    const progress: MigrationProgress = {
      tableName,
      totalRecords: 0,
      processedRecords: 0,
      encryptedRecords: 0,
      failedRecords: 0,
      status: MigrationStatus.IN_PROGRESS,
      startTime: new Date(),
      errors: []
    };
    
    this.migrationProgress.set(tableName, progress);
    
    try {
      // Get encryption fields configuration
      const encryptionFields = getTableEncryptionFields(tableName as keyof typeof TABLE_ENCRYPTION_MAPPINGS);
      const fieldNames = Object.keys(encryptionFields);
      
      if (fieldNames.length === 0) {
        progress.status = MigrationStatus.COMPLETED;
        console.log(`⏭️ No encryption fields configured for ${tableName}, skipping`);
        return progress;
      }
      
      // Get total record count
      const countResult = await this.db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      progress.totalRecords = parseInt(countResult[0]?.count || '0');
      
      if (progress.totalRecords === 0) {
        progress.status = MigrationStatus.COMPLETED;
        console.log(`⏭️ No records found in ${tableName}, skipping`);
        return progress;
      }
      
      console.log(`📊 Found ${progress.totalRecords} records in ${tableName}`);
      
      // Initialize backup storage if enabled
      if (this.config.backupEnabled) {
        this.backupRecords.set(tableName, []);
      }
      
      // Process records in batches
      let offset = 0;
      
      while (offset < progress.totalRecords) {
        const batchEnd = Math.min(offset + this.config.batchSize, progress.totalRecords);
        console.log(`🔄 Processing batch ${offset + 1}-${batchEnd} of ${progress.totalRecords} for ${tableName}`);
        
        try {
          await this.processBatch(tableName, fieldNames, encryptionFields, offset, this.config.batchSize, progress);
          offset += this.config.batchSize;
          
          // Update progress
          const progressPercent = Math.round((progress.processedRecords / progress.totalRecords) * 100);
          console.log(`   Progress: ${progressPercent}% (${progress.encryptedRecords} encrypted, ${progress.failedRecords} failed)`);
          
        } catch (error) {
          const errorMessage = `Batch ${offset}-${batchEnd}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          progress.errors.push(errorMessage);
          
          if (!this.config.continueOnError) {
            throw error;
          }
          
          console.warn(`⚠️ Batch error (continuing): ${errorMessage}`);
          offset += this.config.batchSize;
        }
      }
      
      // Validate migration if enabled
      if (this.config.validateAfterMigration && !this.config.dryRun) {
        console.log(`🔍 Validating migration for ${tableName}...`);
        const validationResult = await this.validateTableMigration(tableName, encryptionFields);
        
        if (!validationResult.valid) {
          progress.errors.push(`Validation failed: ${validationResult.errors.join(', ')}`);
          progress.status = MigrationStatus.FAILED;
          throw new Error(`Migration validation failed for ${tableName}`);
        }
        
        console.log(`✅ Validation passed for ${tableName}`);
      }
      
      progress.status = MigrationStatus.COMPLETED;
      progress.endTime = new Date();
      
      const duration = progress.endTime.getTime() - progress.startTime.getTime();
      console.log(`✅ Migration completed for ${tableName} in ${Math.round(duration / 1000)}s`);
      console.log(`   - Processed: ${progress.processedRecords}/${progress.totalRecords}`);
      console.log(`   - Encrypted: ${progress.encryptedRecords}`);
      console.log(`   - Failed: ${progress.failedRecords}`);
      
      return progress;
      
    } catch (error) {
      progress.status = MigrationStatus.FAILED;
      progress.endTime = new Date();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      progress.errors.push(errorMessage);
      
      console.error(`❌ Migration failed for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Process a batch of records
   */
  private async processBatch(
    tableName: string,
    fieldNames: string[],
    encryptionFields: Record<string, EncryptionContext>,
    offset: number,
    batchSize: number,
    progress: MigrationProgress
  ): Promise<void> {
    // Fetch batch of records
    const records = await this.db.query(
      `SELECT * FROM ${tableName} LIMIT ${batchSize} OFFSET ${offset}`
    );
    
    for (const record of records) {
      try {
        const recordId = record.id || record.uuid || `${offset}_${records.indexOf(record)}`;
        
        // Check if record needs encryption
        const needsEncryption = fieldNames.some(field => {
          const value = record[field];
          return value && typeof value === 'string' && !this.encryptionService.isEncrypted(value);
        });
        
        if (!needsEncryption) {
          progress.processedRecords++;
          continue;
        }
        
        // Create backup if enabled
        if (this.config.backupEnabled) {
          const backup: BackupRecord = {
            tableName,
            recordId,
            originalData: { ...record },
            encryptedData: {},
            timestamp: new Date()
          };
          
          this.backupRecords.get(tableName)?.push(backup);
        }
        
        // Encrypt fields
        const encryptedRecord = { ...record };
        let fieldsEncrypted = 0;
        
        for (const [fieldName, context] of Object.entries(encryptionFields)) {
          const value = record[fieldName];
          
          if (value && typeof value === 'string' && !this.encryptionService.isEncrypted(value)) {
            if (!this.config.dryRun) {
              encryptedRecord[fieldName] = await this.encryptionService.encrypt(value, context, {
                table: tableName,
                field: fieldName,
                recordId
              });
            }
            fieldsEncrypted++;
          }
        }
        
        // Update record in database (if not dry run)
        if (!this.config.dryRun && fieldsEncrypted > 0) {
          const setClause = fieldNames
            .filter(field => encryptedRecord[field] !== record[field])
            .map(field => `${field} = $${fieldNames.indexOf(field) + 2}`)
            .join(', ');
          
          if (setClause) {
            const values = [recordId, ...fieldNames.map(field => encryptedRecord[field])];
            await this.db.query(
              `UPDATE ${tableName} SET ${setClause} WHERE id = $1`,
              values
            );
          }
        }
        
        progress.processedRecords++;
        if (fieldsEncrypted > 0) {
          progress.encryptedRecords++;
        }
        
        // Update backup with encrypted data
        if (this.config.backupEnabled) {
          const backup = this.backupRecords.get(tableName)?.find(b => b.recordId === recordId);
          if (backup) {
            backup.encryptedData = encryptedRecord;
          }
        }
        
      } catch (error) {
        progress.failedRecords++;
        const errorMessage = `Record ${record.id || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        progress.errors.push(errorMessage);
        
        console.warn(`⚠️ Failed to encrypt record: ${errorMessage}`);
        
        if (!this.config.continueOnError) {
          throw error;
        }
      }
    }
  }

  /**
   * Validate table migration
   */
  private async validateTableMigration(
    tableName: string,
    encryptionFields: Record<string, EncryptionContext>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Sample validation - check first 10 records
      const sampleRecords = await this.db.query(
        `SELECT * FROM ${tableName} LIMIT 10`
      );
      
      for (const record of sampleRecords) {
        for (const [fieldName, expectedContext] of Object.entries(encryptionFields)) {
          const value = record[fieldName];
          
          if (value && typeof value === 'string') {
            if (!this.encryptionService.isEncrypted(value)) {
              errors.push(`Field ${fieldName} in record ${record.id} is not encrypted`);
            } else {
              const actualContext = this.encryptionService.getEncryptionContext(value);
              if (actualContext !== expectedContext) {
                errors.push(`Field ${fieldName} in record ${record.id} has wrong context: ${actualContext} (expected: ${expectedContext})`);
              }
              
              // Test decryption
              try {
                await this.encryptionService.decrypt(value, expectedContext);
              } catch (decryptError) {
                errors.push(`Field ${fieldName} in record ${record.id} cannot be decrypted: ${decryptError.message}`);
              }
            }
          }
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
      
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed']
      };
    }
  }

  /**
   * Rollback migration for a specific table
   */
  async rollbackTable(tableName: string): Promise<void> {
    console.log(`🔄 Rolling back migration for table: ${tableName}`);
    
    const backups = this.backupRecords.get(tableName);
    if (!backups || backups.length === 0) {
      console.warn(`⚠️ No backup data found for ${tableName}`);
      return;
    }
    
    let rolledBack = 0;
    let failed = 0;
    
    for (const backup of backups) {
      try {
        // Restore original data
        const originalRecord = backup.originalData;
        const fieldNames = Object.keys(originalRecord).filter(key => key !== 'id');
        
        const setClause = fieldNames.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const values = [backup.recordId, ...fieldNames.map(field => originalRecord[field])];
        
        await this.db.query(
          `UPDATE ${tableName} SET ${setClause} WHERE id = $1`,
          values
        );
        
        rolledBack++;
        
      } catch (error) {
        failed++;
        console.error(`❌ Failed to rollback record ${backup.recordId}:`, error);
      }
    }
    
    // Update progress
    const progress = this.migrationProgress.get(tableName);
    if (progress) {
      progress.status = MigrationStatus.ROLLED_BACK;
      progress.endTime = new Date();
    }
    
    console.log(`✅ Rollback completed for ${tableName}: ${rolledBack} restored, ${failed} failed`);
  }

  /**
   * Rollback migration for all tables
   */
  async rollbackAllTables(): Promise<void> {
    console.log('🔄 Rolling back migration for all tables...');
    
    const tableNames = Array.from(this.backupRecords.keys());
    
    for (const tableName of tableNames) {
      try {
        await this.rollbackTable(tableName);
      } catch (error) {
        console.error(`❌ Failed to rollback table ${tableName}:`, error);
      }
    }
    
    console.log('✅ Rollback completed for all tables');
  }

  /**
   * Get migration progress
   */
  getMigrationProgress(): MigrationProgress[] {
    return Array.from(this.migrationProgress.values());
  }

  /**
   * Get backup statistics
   */
  getBackupStats(): {
    totalTables: number;
    totalRecords: number;
    backupSize: number;
  } {
    let totalRecords = 0;
    let backupSize = 0;
    
    for (const backups of this.backupRecords.values()) {
      totalRecords += backups.length;
      backupSize += JSON.stringify(backups).length;
    }
    
    return {
      totalTables: this.backupRecords.size,
      totalRecords,
      backupSize
    };
  }

  /**
   * Clear backup data (use with caution)
   */
  clearBackups(): void {
    this.backupRecords.clear();
    console.log('🗑️ Backup data cleared');
  }

  /**
   * Export backup data to file
   */
  async exportBackups(filePath: string): Promise<void> {
    const fs = await import('fs/promises');
    
    const backupData = {
      timestamp: new Date().toISOString(),
      config: this.config,
      backups: Object.fromEntries(this.backupRecords)
    };
    
    await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));
    console.log(`💾 Backup data exported to: ${filePath}`);
  }

  /**
   * Import backup data from file
   */
  async importBackups(filePath: string): Promise<void> {
    const fs = await import('fs/promises');
    
    const backupDataStr = await fs.readFile(filePath, 'utf8');
    const backupData = JSON.parse(backupDataStr);
    
    this.backupRecords = new Map(Object.entries(backupData.backups));
    console.log(`📥 Backup data imported from: ${filePath}`);
  }

  /**
   * Aggregate results from table migration
   */
  private aggregateResults(totalResults: MigrationResult, tableResult: MigrationProgress): void {
    totalResults.tablesProcessed++;
    totalResults.totalRecords += tableResult.totalRecords;
    totalResults.encryptedRecords += tableResult.encryptedRecords;
    totalResults.failedRecords += tableResult.failedRecords;
    totalResults.errors.push(...tableResult.errors);
    totalResults.tableResults.push(tableResult);
    
    if (tableResult.status === MigrationStatus.FAILED) {
      totalResults.success = false;
    }
  }
}

// Export factory function
export function createMigrationService(
  db: DatabaseConnection, 
  config?: Partial<MigrationConfig>
): EncryptionMigrationService {
  return new EncryptionMigrationService(db, config);
}

// Export types
export type { 
  MigrationConfig, 
  MigrationProgress, 
  MigrationResult, 
  BackupRecord 
};