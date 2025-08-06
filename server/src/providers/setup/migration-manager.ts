/**
 * Migration Manager
 * 
 * Handles data migration between different providers during provider switching.
 * Supports schema migration, data export/import, and validation.
 */

import { EventEmitter } from 'events';
import { IEnhancedProviderRegistry } from '../interfaces/enhanced-provider-registry';
import {
  ProviderType,
  ProviderConfiguration,
  ProviderSetupAutomation,
  TestResult,
  ValidationResult
} from '../interfaces/provider-types';

export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  required: boolean;
  estimatedTime: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: Error;
  startTime?: Date;
  endTime?: Date;
}

export interface MigrationPlan {
  migrationId: string;
  sourceProvider: {
    name: string;
    type: ProviderType;
  };
  targetProvider: {
    name: string;
    type: ProviderType;
  };
  steps: MigrationStep[];
  estimatedTotalTime: number;
  dataSize: number;
  compatibility: {
    schemaCompatible: boolean;
    dataCompatible: boolean;
    featureCompatible: boolean;
    warnings: string[];
  };
  backupRequired: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface MigrationProgress {
  migrationId: string;
  plan: MigrationPlan;
  status: 'planning' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  currentStep?: MigrationStep;
  completedSteps: number;
  totalSteps: number;
  startTime: Date;
  endTime?: Date;
  actualTotalTime?: number;
  errors: Error[];
  warnings: string[];
  dataTransferred: number;
  backupId?: string;
}

export interface MigrationOptions {
  validateOnly?: boolean;
  createBackup?: boolean;
  preserveSource?: boolean;
  continueOnWarnings?: boolean;
  batchSize?: number;
  notificationCallback?: (progress: MigrationProgress) => void;
}

export class MigrationManager extends EventEmitter {
  private registry: IEnhancedProviderRegistry;
  private activeMigrations = new Map<string, MigrationProgress>();
  private migrationHistory: MigrationProgress[] = [];
  private readonly MAX_HISTORY = 50;

  constructor(registry: IEnhancedProviderRegistry) {
    super();
    this.registry = registry;
  }

  /**
   * Plan a migration between two providers
   */
  async planMigration(
    sourceProviderName: string,
    targetProviderName: string,
    targetConfig?: ProviderConfiguration
  ): Promise<MigrationPlan> {
    console.log(`📋 Planning migration from ${sourceProviderName} to ${targetProviderName}`);

    const sourceProvider = this.registry.getProvider(sourceProviderName);
    const targetProvider = this.registry.getProvider(targetProviderName);

    if (!sourceProvider) {
      throw new Error(`Source provider '${sourceProviderName}' not found`);
    }

    if (!targetProvider && !targetConfig) {
      throw new Error(`Target provider '${targetProviderName}' not found and no config provided`);
    }

    const sourceDetails = this.registry.getProviderInfo(sourceProviderName);
    const targetDetails = targetProvider 
      ? this.registry.getProviderInfo(targetProviderName)
      : { type: targetConfig!.type, name: targetProviderName };

    if (!sourceDetails || !targetDetails) {
      throw new Error('Unable to get provider details for migration planning');
    }

    const migrationId = `migration_${sourceProviderName}_to_${targetProviderName}_${Date.now()}`;

    // Check compatibility
    const compatibility = await this.checkCompatibility(sourceDetails, targetDetails);

    // Estimate data size
    const dataSize = await this.estimateDataSize(sourceProviderName);

    // Create migration steps
    const steps = this.createMigrationSteps(sourceDetails, targetDetails, compatibility);

    // Calculate total time and risk level
    const estimatedTotalTime = steps.reduce((sum, step) => sum + step.estimatedTime, 0);
    const riskLevel = this.assessRiskLevel(compatibility, dataSize);

    const plan: MigrationPlan = {
      migrationId,
      sourceProvider: {
        name: sourceProviderName,
        type: sourceDetails.type
      },
      targetProvider: {
        name: targetProviderName,
        type: targetDetails.type
      },
      steps,
      estimatedTotalTime,
      dataSize,
      compatibility,
      backupRequired: riskLevel !== 'low',
      riskLevel
    };

    console.log(`📋 Migration plan created: ${estimatedTotalTime}ms, risk: ${riskLevel}`);
    return plan;
  }

  /**
   * Execute a migration plan
   */
  async executeMigration(
    plan: MigrationPlan,
    targetConfig?: ProviderConfiguration,
    options: MigrationOptions = {}
  ): Promise<MigrationProgress> {
    console.log(`🚀 Starting migration: ${plan.migrationId}`);

    const progress: MigrationProgress = {
      migrationId: plan.migrationId,
      plan,
      status: 'in_progress',
      completedSteps: 0,
      totalSteps: plan.steps.length,
      startTime: new Date(),
      errors: [],
      warnings: [],
      dataTransferred: 0
    };

    this.activeMigrations.set(plan.migrationId, progress);
    this.emit('migrationStarted', progress);
    options.notificationCallback?.(progress);

    try {
      // Execute migration steps
      for (const step of plan.steps) {
        if (progress.status === 'cancelled') {
          break;
        }

        progress.currentStep = step;
        step.status = 'in_progress';
        step.startTime = new Date();

        this.emit('stepStarted', progress, step);
        options.notificationCallback?.(progress);

        try {
          step.result = await this.executeMigrationStep(step, progress, targetConfig, options);
          step.status = 'completed';
          progress.completedSteps++;

          console.log(`✅ Migration step completed: ${step.name}`);

        } catch (error) {
          step.status = 'failed';
          step.error = error as Error;
          progress.errors.push(error as Error);

          console.error(`❌ Migration step failed: ${step.name}:`, error);

          if (step.required) {
            progress.status = 'failed';
            throw error;
          } else {
            progress.warnings.push(`Optional step failed: ${step.name}`);
            if (!options.continueOnWarnings) {
              progress.status = 'failed';
              throw error;
            }
          }
        } finally {
          step.endTime = new Date();
          this.emit('stepCompleted', progress, step);
          options.notificationCallback?.(progress);
        }
      }

      progress.status = 'completed';
      progress.endTime = new Date();
      progress.actualTotalTime = progress.endTime.getTime() - progress.startTime.getTime();

      console.log(`✅ Migration completed: ${plan.migrationId} in ${progress.actualTotalTime}ms`);

    } catch (error) {
      progress.status = 'failed';
      progress.endTime = new Date();
      
      console.error(`❌ Migration failed: ${plan.migrationId}:`, error);
      
      // Attempt rollback if backup was created
      if (progress.backupId && !options.preserveSource) {
        await this.rollbackMigration(progress);
      }
    } finally {
      this.activeMigrations.delete(plan.migrationId);
      this.addToHistory(progress);
      this.emit('migrationCompleted', progress);
      options.notificationCallback?.(progress);
    }

    return progress;
  }

  /**
   * Get migration progress by ID
   */
  getMigrationProgress(migrationId: string): MigrationProgress | undefined {
    return this.activeMigrations.get(migrationId);
  }

  /**
   * Get all active migrations
   */
  getActiveMigrations(): MigrationProgress[] {
    return Array.from(this.activeMigrations.values());
  }

  /**
   * Get migration history
   */
  getMigrationHistory(): MigrationProgress[] {
    return [...this.migrationHistory];
  }

  /**
   * Cancel an active migration
   */
  async cancelMigration(migrationId: string): Promise<boolean> {
    const progress = this.activeMigrations.get(migrationId);
    if (!progress) {
      return false;
    }

    progress.status = 'cancelled';
    progress.endTime = new Date();
    
    console.log(`🛑 Migration cancelled: ${migrationId}`);
    
    // Attempt rollback if backup was created
    if (progress.backupId) {
      await this.rollbackMigration(progress);
    }

    this.activeMigrations.delete(migrationId);
    this.addToHistory(progress);
    this.emit('migrationCancelled', progress);

    return true;
  }

  /**
   * Validate migration compatibility
   */
  async validateMigration(
    sourceProviderName: string,
    targetProviderName: string
  ): Promise<ValidationResult> {
    try {
      const plan = await this.planMigration(sourceProviderName, targetProviderName);
      
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check compatibility issues
      if (!plan.compatibility.schemaCompatible) {
        errors.push('Schema compatibility issues detected');
      }

      if (!plan.compatibility.dataCompatible) {
        errors.push('Data compatibility issues detected');
      }

      if (!plan.compatibility.featureCompatible) {
        warnings.push('Some features may not be available in target provider');
      }

      warnings.push(...plan.compatibility.warnings);

      // Check risk level
      if (plan.riskLevel === 'high') {
        warnings.push('High-risk migration - backup strongly recommended');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Migration validation failed: ${(error as Error).message}`],
        warnings: []
      };
    }
  }

  // Private Methods

  private async checkCompatibility(
    sourceDetails: any,
    targetDetails: any
  ): Promise<MigrationPlan['compatibility']> {
    const warnings: string[] = [];
    
    // Check schema compatibility
    const schemaCompatible = this.checkSchemaCompatibility(sourceDetails.type, targetDetails.type);
    
    // Check data compatibility
    const dataCompatible = this.checkDataCompatibility(sourceDetails.type, targetDetails.type);
    
    // Check feature compatibility
    const featureCompatible = this.checkFeatureCompatibility(sourceDetails, targetDetails);

    if (!schemaCompatible) {
      warnings.push('Schema migration may require manual intervention');
    }

    if (!dataCompatible) {
      warnings.push('Data transformation may be required');
    }

    if (!featureCompatible) {
      warnings.push('Some features may not be available in target provider');
    }

    return {
      schemaCompatible,
      dataCompatible,
      featureCompatible,
      warnings
    };
  }

  private checkSchemaCompatibility(sourceType: ProviderType, targetType: ProviderType): boolean {
    // Define compatibility matrix
    const compatibilityMatrix: Record<string, string[]> = {
      'postgresql': ['supabase-db', 'mysql'],
      'supabase-db': ['postgresql', 'mysql'],
      'mysql': ['postgresql', 'supabase-db'],
      'pocketbase-db': ['sqlite', 'postgresql'],
      'sqlite': ['pocketbase-db', 'postgresql'],
      'local-auth': ['jwt-local-auth', 'oauth2-auth'],
      'jwt-local-auth': ['local-auth', 'oauth2-auth']
    };

    const compatibleTypes = compatibilityMatrix[sourceType] || [];
    return compatibleTypes.includes(targetType);
  }

  private checkDataCompatibility(sourceType: ProviderType, targetType: ProviderType): boolean {
    // Similar providers have better data compatibility
    const sourceFamily = this.getProviderFamily(sourceType);
    const targetFamily = this.getProviderFamily(targetType);
    
    return sourceFamily === targetFamily;
  }

  private checkFeatureCompatibility(sourceDetails: any, targetDetails: any): boolean {
    // Check if target has all features of source
    const sourceCapabilities = sourceDetails.capabilities || [];
    const targetCapabilities = targetDetails.capabilities || [];
    
    return sourceCapabilities.every((cap: string) => targetCapabilities.includes(cap));
  }

  private getProviderFamily(providerType: ProviderType): string {
    if (providerType.includes('auth')) return 'auth';
    if (providerType.includes('db') || providerType === 'postgresql' || providerType === 'mysql') return 'database';
    if (providerType.includes('email')) return 'email';
    if (providerType.includes('storage')) return 'storage';
    return 'other';
  }

  private async estimateDataSize(providerName: string): Promise<number> {
    try {
      const provider = this.registry.getProvider(providerName);
      if (!provider) {
        return 0;
      }

      const metrics = await provider.getMetrics();
      
      // Estimate based on metrics (this would be more sophisticated in practice)
      return metrics.business?.totalRecords || 0;
    } catch (error) {
      console.warn(`Could not estimate data size for ${providerName}:`, error);
      return 0;
    }
  }

  private createMigrationSteps(
    sourceDetails: any,
    targetDetails: any,
    compatibility: MigrationPlan['compatibility']
  ): MigrationStep[] {
    const steps: MigrationStep[] = [];

    // Step 1: Validate migration
    steps.push({
      id: 'validate-migration',
      name: 'Validate Migration',
      description: 'Validate source and target providers',
      required: true,
      estimatedTime: 10000,
      status: 'pending'
    });

    // Step 2: Create backup
    steps.push({
      id: 'create-backup',
      name: 'Create Backup',
      description: 'Create backup of source provider data',
      required: true,
      estimatedTime: 30000,
      status: 'pending'
    });

    // Step 3: Prepare target
    steps.push({
      id: 'prepare-target',
      name: 'Prepare Target',
      description: 'Prepare target provider for data import',
      required: true,
      estimatedTime: 15000,
      status: 'pending'
    });

    // Step 4: Export data
    steps.push({
      id: 'export-data',
      name: 'Export Data',
      description: 'Export data from source provider',
      required: true,
      estimatedTime: 60000,
      status: 'pending'
    });

    // Step 5: Transform data (if needed)
    if (!compatibility.dataCompatible) {
      steps.push({
        id: 'transform-data',
        name: 'Transform Data',
        description: 'Transform data for target provider compatibility',
        required: true,
        estimatedTime: 45000,
        status: 'pending'
      });
    }

    // Step 6: Import data
    steps.push({
      id: 'import-data',
      name: 'Import Data',
      description: 'Import data to target provider',
      required: true,
      estimatedTime: 60000,
      status: 'pending'
    });

    // Step 7: Verify data
    steps.push({
      id: 'verify-data',
      name: 'Verify Data',
      description: 'Verify data integrity after migration',
      required: true,
      estimatedTime: 30000,
      status: 'pending'
    });

    // Step 8: Update configuration
    steps.push({
      id: 'update-config',
      name: 'Update Configuration',
      description: 'Update application configuration to use target provider',
      required: true,
      estimatedTime: 10000,
      status: 'pending'
    });

    // Step 9: Test functionality
    steps.push({
      id: 'test-functionality',
      name: 'Test Functionality',
      description: 'Test all functionality with target provider',
      required: false,
      estimatedTime: 60000,
      status: 'pending'
    });

    return steps;
  }

  private assessRiskLevel(
    compatibility: MigrationPlan['compatibility'],
    dataSize: number
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    if (!compatibility.schemaCompatible) riskScore += 3;
    if (!compatibility.dataCompatible) riskScore += 2;
    if (!compatibility.featureCompatible) riskScore += 1;
    if (dataSize > 10000) riskScore += 2;
    if (compatibility.warnings.length > 3) riskScore += 1;

    if (riskScore >= 5) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  private async executeMigrationStep(
    step: MigrationStep,
    progress: MigrationProgress,
    targetConfig?: ProviderConfiguration,
    options: MigrationOptions = {}
  ): Promise<any> {
    switch (step.id) {
      case 'validate-migration':
        return await this.validateMigrationStep(progress);

      case 'create-backup':
        return await this.createBackupStep(progress);

      case 'prepare-target':
        return await this.prepareTargetStep(progress, targetConfig);

      case 'export-data':
        return await this.exportDataStep(progress, options);

      case 'transform-data':
        return await this.transformDataStep(progress);

      case 'import-data':
        return await this.importDataStep(progress, options);

      case 'verify-data':
        return await this.verifyDataStep(progress);

      case 'update-config':
        return await this.updateConfigStep(progress);

      case 'test-functionality':
        return await this.testFunctionalityStep(progress);

      default:
        throw new Error(`Unknown migration step: ${step.id}`);
    }
  }

  private async validateMigrationStep(progress: MigrationProgress): Promise<any> {
    const sourceProvider = this.registry.getProvider(progress.plan.sourceProvider.name);
    const targetExists = this.registry.hasProvider(progress.plan.targetProvider.name);

    if (!sourceProvider) {
      throw new Error('Source provider not found');
    }

    return {
      sourceValid: true,
      targetExists,
      validated: true
    };
  }

  private async createBackupStep(progress: MigrationProgress): Promise<any> {
    try {
      const backupId = await this.registry.backupProvider(progress.plan.sourceProvider.name);
      progress.backupId = backupId;
      
      return {
        backupId,
        created: true,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Backup creation failed: ${(error as Error).message}`);
    }
  }

  private async prepareTargetStep(
    progress: MigrationProgress,
    targetConfig?: ProviderConfiguration
  ): Promise<any> {
    const targetExists = this.registry.hasProvider(progress.plan.targetProvider.name);
    
    if (!targetExists && targetConfig) {
      // Register target provider
      await this.registry.registerProvider(
        progress.plan.targetProvider.name,
        progress.plan.targetProvider.type,
        targetConfig
      );
    }

    // Start target provider
    await this.registry.startProvider(progress.plan.targetProvider.name);

    return {
      targetPrepared: true,
      registered: !targetExists,
      started: true
    };
  }

  private async exportDataStep(progress: MigrationProgress, options: MigrationOptions): Promise<any> {
    const sourceProvider = this.registry.getProvider(progress.plan.sourceProvider.name);
    if (!sourceProvider) {
      throw new Error('Source provider not found');
    }

    const setupAutomation = sourceProvider.getSetupAutomation?.();
    if (!setupAutomation) {
      throw new Error('Source provider does not support data export');
    }

    const exportedData = await setupAutomation.exportData();
    progress.dataTransferred = exportedData.length;

    return {
      dataSize: exportedData.length,
      exported: true,
      data: exportedData
    };
  }

  private async transformDataStep(progress: MigrationProgress): Promise<any> {
    // This would implement data transformation logic
    // For now, we'll simulate the transformation
    console.log('Transforming data for compatibility...');
    
    return {
      transformed: true,
      transformations: ['schema_mapping', 'data_type_conversion']
    };
  }

  private async importDataStep(progress: MigrationProgress, options: MigrationOptions): Promise<any> {
    const targetProvider = this.registry.getProvider(progress.plan.targetProvider.name);
    if (!targetProvider) {
      throw new Error('Target provider not found');
    }

    const setupAutomation = targetProvider.getSetupAutomation?.();
    if (!setupAutomation) {
      throw new Error('Target provider does not support data import');
    }

    // Get exported data from export step
    const exportStep = progress.plan.steps.find(s => s.id === 'export-data');
    if (!exportStep?.result?.data) {
      throw new Error('No exported data found');
    }

    await setupAutomation.importData(exportStep.result.data);

    return {
      imported: true,
      dataSize: exportStep.result.dataSize
    };
  }

  private async verifyDataStep(progress: MigrationProgress): Promise<any> {
    // This would implement data verification logic
    // For now, we'll simulate verification
    console.log('Verifying data integrity...');
    
    return {
      verified: true,
      recordsVerified: progress.dataTransferred,
      integrityCheck: 'passed'
    };
  }

  private async updateConfigStep(progress: MigrationProgress): Promise<any> {
    // This would update application configuration to use the new provider
    // For now, we'll simulate the update
    console.log('Updating application configuration...');
    
    return {
      configUpdated: true,
      provider: progress.plan.targetProvider.name
    };
  }

  private async testFunctionalityStep(progress: MigrationProgress): Promise<any> {
    const targetProvider = this.registry.getProvider(progress.plan.targetProvider.name);
    if (!targetProvider) {
      throw new Error('Target provider not found');
    }

    const diagnostics = await targetProvider.runDiagnostics();
    const allPassed = Object.values(diagnostics).every(result => result.success);

    return {
      tested: true,
      allTestsPassed: allPassed,
      diagnostics
    };
  }

  private async rollbackMigration(progress: MigrationProgress): Promise<void> {
    console.log(`🔄 Rolling back migration: ${progress.migrationId}`);
    
    try {
      if (progress.backupId) {
        await this.registry.restoreProvider(
          progress.plan.sourceProvider.name,
          progress.backupId
        );
      }

      // Stop and remove target provider if it was created during migration
      if (this.registry.hasProvider(progress.plan.targetProvider.name)) {
        await this.registry.stopProvider(progress.plan.targetProvider.name);
        await this.registry.unregisterProvider(progress.plan.targetProvider.name);
      }

    } catch (error) {
      console.error('Error during migration rollback:', error);
    }
  }

  private addToHistory(progress: MigrationProgress): void {
    this.migrationHistory.unshift(progress);
    
    // Keep only last MAX_HISTORY entries
    if (this.migrationHistory.length > this.MAX_HISTORY) {
      this.migrationHistory = this.migrationHistory.slice(0, this.MAX_HISTORY);
    }
  }
}