/**
 * Provider Setup System Export
 * 
 * Main export file for the automated provider setup, migration, and validation system.
 * Provides a unified interface for all setup-related functionality.
 */

export { AutomatedSetupManager } from './automated-setup-manager';
export { MigrationManager } from './migration-manager';
export { ProviderValidator } from './provider-validator';

export type {
  SetupStep,
  SetupProgress,
  SetupOptions
} from './automated-setup-manager';

export type {
  MigrationStep,
  MigrationPlan,
  MigrationProgress,
  MigrationOptions
} from './migration-manager';

export type {
  ValidationRule,
  ValidationReport,
  ValidationRuleResult,
  ValidationOptions
} from './provider-validator';

/**
 * Unified Setup System
 * 
 * Combines all setup managers into a single interface for easy use.
 */
export class ProviderSetupSystem {
  public readonly setupManager: AutomatedSetupManager;
  public readonly migrationManager: MigrationManager;
  public readonly validator: ProviderValidator;

  constructor(registry: import('../interfaces/enhanced-provider-registry').IEnhancedProviderRegistry) {
    this.setupManager = new AutomatedSetupManager(registry);
    this.migrationManager = new MigrationManager(registry);
    this.validator = new ProviderValidator(registry);

    // Set up cross-manager event forwarding
    this.setupEventForwarding();
  }

  /**
   * Complete provider setup workflow
   */
  async setupProviderComplete(
    providerType: import('../interfaces/provider-types').ProviderType,
    wizardData: Record<string, Record<string, unknown>>,
    options: SetupOptions & { validate?: boolean } = {}
  ) {
    const results = {
      validation: null as any,
      setup: null as any,
      finalValidation: null as any
    };

    try {
      // Step 1: Pre-setup validation
      if (options.validate !== false) {
        console.log('🔍 Running pre-setup validation...');
        const validation = await this.setupManager.validateSetup(providerType, wizardData);
        results.validation = validation;

        if (!validation.valid && !options.continueOnWarnings) {
          throw new Error(`Pre-setup validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Step 2: Execute automated setup
      console.log('🚀 Executing automated setup...');
      const setup = await this.setupManager.setupProvider(providerType, wizardData, options);
      results.setup = setup;

      if (setup.status === 'failed') {
        throw new Error(`Setup failed: ${setup.errors.map(e => e.message).join(', ')}`);
      }

      // Step 3: Post-setup validation
      if (options.validate !== false && setup.status === 'completed') {
        console.log('✅ Running post-setup validation...');
        const finalValidation = await this.validator.validateProvider(setup.providerName);
        results.finalValidation = finalValidation;

        if (finalValidation.overallResult === 'failed') {
          console.warn('⚠️ Post-setup validation failed, but provider is set up');
        }
      }

      return results;

    } catch (error) {
      console.error('❌ Complete setup workflow failed:', error);
      throw error;
    }
  }

  /**
   * Complete provider migration workflow
   */
  async migrateProviderComplete(
    sourceProviderName: string,
    targetProviderName: string,
    targetConfig?: import('../interfaces/provider-types').ProviderConfiguration,
    options: MigrationOptions & { validate?: boolean } = {}
  ) {
    const results = {
      validation: null as any,
      plan: null as any,
      migration: null as any,
      finalValidation: null as any
    };

    try {
      // Step 1: Pre-migration validation
      if (options.validate !== false) {
        console.log('🔍 Running pre-migration validation...');
        const validation = await this.migrationManager.validateMigration(sourceProviderName, targetProviderName);
        results.validation = validation;

        if (!validation.valid && !options.continueOnWarnings) {
          throw new Error(`Pre-migration validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Step 2: Create migration plan
      console.log('📋 Creating migration plan...');
      const plan = await this.migrationManager.planMigration(sourceProviderName, targetProviderName, targetConfig);
      results.plan = plan;

      // Step 3: Execute migration
      console.log('🚀 Executing migration...');
      const migration = await this.migrationManager.executeMigration(plan, targetConfig, options);
      results.migration = migration;

      if (migration.status === 'failed') {
        throw new Error(`Migration failed: ${migration.errors.map(e => e.message).join(', ')}`);
      }

      // Step 4: Post-migration validation
      if (options.validate !== false && migration.status === 'completed') {
        console.log('✅ Running post-migration validation...');
        const finalValidation = await this.validator.validateProvider(targetProviderName);
        results.finalValidation = finalValidation;

        if (finalValidation.overallResult === 'failed') {
          console.warn('⚠️ Post-migration validation failed, but migration completed');
        }
      }

      return results;

    } catch (error) {
      console.error('❌ Complete migration workflow failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus() {
    return {
      activeSetups: this.setupManager.getActiveSetups(),
      activeMigrations: this.migrationManager.getActiveMigrations(),
      setupHistory: this.setupManager.getSetupHistory().slice(0, 10), // Last 10
      migrationHistory: this.migrationManager.getMigrationHistory().slice(0, 10), // Last 10
      validationHistory: this.validator.getValidationHistory().slice(0, 10), // Last 10
      validationRules: this.validator.getValidationRules().length
    };
  }

  private setupEventForwarding(): void {
    // Forward setup events
    this.setupManager.on('setupStarted', (progress) => {
      this.emit('setupStarted', progress);
    });

    this.setupManager.on('setupCompleted', (progress) => {
      this.emit('setupCompleted', progress);
    });

    // Forward migration events
    this.migrationManager.on('migrationStarted', (progress) => {
      this.emit('migrationStarted', progress);
    });

    this.migrationManager.on('migrationCompleted', (progress) => {
      this.emit('migrationCompleted', progress);
    });

    // Forward validation events
    this.validator.on('validationStarted', (report) => {
      this.emit('validationStarted', report);
    });

    this.validator.on('validationCompleted', (report) => {
      this.emit('validationCompleted', report);
    });
  }

  // Make ProviderSetupSystem an EventEmitter
  private eventEmitter = new (require('events').EventEmitter)();
  
  on(event: string, listener: (...args: any[]) => void) {
    return this.eventEmitter.on(event, listener);
  }

  emit(event: string, ...args: any[]) {
    return this.eventEmitter.emit(event, ...args);
  }

  off(event: string, listener: (...args: any[]) => void) {
    return this.eventEmitter.off(event, listener);
  }
}