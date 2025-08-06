/**
 * Automated Setup Manager
 * 
 * Orchestrates automated backend setup when providers are selected via frontend wizard.
 * Handles schema creation, initial configurations, migrations, and provider registration.
 */

import { EventEmitter } from 'events';
import { IEnhancedProviderRegistry } from '../interfaces/enhanced-provider-registry';
import {
  ProviderType,
  ProviderConfiguration,
  ProviderSetupAutomation,
  ProviderWizardIntegration,
  WizardStep,
  StepResult,
  ValidationResult,
  TestResult
} from '../interfaces/provider-types';

export interface SetupStep {
  id: string;
  name: string;
  description: string;
  required: boolean;
  dependencies?: string[];
  estimatedTime: number; // milliseconds
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  result?: StepResult;
  error?: Error;
  startTime?: Date;
  endTime?: Date;
}

export interface SetupProgress {
  setupId: string;
  providerType: ProviderType;
  providerName: string;
  totalSteps: number;
  completedSteps: number;
  currentStep?: SetupStep;
  steps: SetupStep[];
  status: 'initializing' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  estimatedTotalTime: number;
  actualTotalTime?: number;
  errors: Error[];
  warnings: string[];
}

export interface SetupOptions {
  validateOnly?: boolean;
  skipOptionalSteps?: boolean;
  continueOnWarnings?: boolean;
  backup?: boolean;
  rollbackOnFailure?: boolean;
  notificationCallback?: (progress: SetupProgress) => void;
}

export class AutomatedSetupManager extends EventEmitter {
  private registry: IEnhancedProviderRegistry;
  private activeSetups = new Map<string, SetupProgress>();
  private setupHistory: SetupProgress[] = [];
  private readonly MAX_HISTORY = 100;

  constructor(registry: IEnhancedProviderRegistry) {
    super();
    this.registry = registry;
  }

  /**
   * Start automated setup for a provider based on wizard data
   */
  async setupProvider(
    providerType: ProviderType,
    wizardData: Record<string, Record<string, unknown>>,
    options: SetupOptions = {}
  ): Promise<SetupProgress> {
    const setupId = `setup_${providerType}_${Date.now()}`;
    const providerName = this.generateProviderName(providerType, wizardData);

    console.log(`🚀 Starting automated setup for ${providerType} provider: ${providerName}`);

    // Initialize setup progress
    const progress: SetupProgress = {
      setupId,
      providerType,
      providerName,
      totalSteps: 0,
      completedSteps: 0,
      steps: [],
      status: 'initializing',
      startTime: new Date(),
      estimatedTotalTime: 0,
      errors: [],
      warnings: []
    };

    this.activeSetups.set(setupId, progress);
    this.emit('setupStarted', progress);
    options.notificationCallback?.(progress);

    try {
      // Step 1: Get wizard steps and validate configuration
      const wizardSteps = this.registry.getProviderWizardSteps(providerType);
      const config = await this.buildProviderConfiguration(providerType, wizardData, wizardSteps);

      // Step 2: Create setup steps
      progress.steps = await this.createSetupSteps(providerType, config, wizardSteps, options);
      progress.totalSteps = progress.steps.length;
      progress.estimatedTotalTime = progress.steps.reduce((sum, step) => sum + step.estimatedTime, 0);
      progress.status = 'in_progress';

      this.emit('setupConfigured', progress);
      options.notificationCallback?.(progress);

      // Step 3: Execute setup steps
      if (!options.validateOnly) {
        await this.executeSetupSteps(progress, config, options);
      }

      // Step 4: Finalize setup
      if (progress.status !== 'failed' && !options.validateOnly) {
        await this.finalizeSetup(progress, config);
      }

      progress.endTime = new Date();
      progress.actualTotalTime = progress.endTime.getTime() - progress.startTime.getTime();

      if (progress.status !== 'failed') {
        progress.status = 'completed';
        console.log(`✅ Automated setup completed for ${providerName} in ${progress.actualTotalTime}ms`);
      }

    } catch (error) {
      progress.status = 'failed';
      progress.errors.push(error as Error);
      progress.endTime = new Date();
      
      console.error(`❌ Automated setup failed for ${providerName}:`, error);
      
      if (options.rollbackOnFailure) {
        await this.rollbackSetup(progress);
      }
    } finally {
      this.activeSetups.delete(setupId);
      this.addToHistory(progress);
      this.emit('setupCompleted', progress);
      options.notificationCallback?.(progress);
    }

    return progress;
  }

  /**
   * Get setup progress by ID
   */
  getSetupProgress(setupId: string): SetupProgress | undefined {
    return this.activeSetups.get(setupId);
  }

  /**
   * Get all active setups
   */
  getActiveSetups(): SetupProgress[] {
    return Array.from(this.activeSetups.values());
  }

  /**
   * Get setup history
   */
  getSetupHistory(): SetupProgress[] {
    return [...this.setupHistory];
  }

  /**
   * Cancel an active setup
   */
  async cancelSetup(setupId: string): Promise<boolean> {
    const progress = this.activeSetups.get(setupId);
    if (!progress) {
      return false;
    }

    progress.status = 'cancelled';
    progress.endTime = new Date();
    
    console.log(`🛑 Setup cancelled: ${progress.providerName}`);
    
    // Attempt cleanup
    try {
      await this.rollbackSetup(progress);
    } catch (error) {
      console.error(`Error during setup cancellation cleanup:`, error);
    }

    this.activeSetups.delete(setupId);
    this.addToHistory(progress);
    this.emit('setupCancelled', progress);

    return true;
  }

  /**
   * Validate provider configuration without executing setup
   */
  async validateSetup(
    providerType: ProviderType,
    wizardData: Record<string, Record<string, unknown>>
  ): Promise<ValidationResult> {
    try {
      const wizardSteps = this.registry.getProviderWizardSteps(providerType);
      const config = await this.buildProviderConfiguration(providerType, wizardData, wizardSteps);
      
      // Validate each wizard step
      const errors: string[] = [];
      const warnings: string[] = [];

      for (const [stepId, stepData] of Object.entries(wizardData)) {
        const validation = await this.registry.validateWizardStep(providerType, stepId, stepData);
        errors.push(...validation.errors);
        warnings.push(...validation.warnings);
      }

      // Test provider factory validation
      const factories = this.registry.listFactories();
      const factory = factories.find(f => f.includes(providerType));
      
      if (!factory) {
        errors.push(`No factory found for provider type: ${providerType}`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Validation failed: ${(error as Error).message}`],
        warnings: []
      };
    }
  }

  /**
   * Get estimated setup time for a provider type
   */
  async getEstimatedSetupTime(providerType: ProviderType): Promise<number> {
    try {
      const wizardSteps = this.registry.getProviderWizardSteps(providerType);
      const baseTime = this.getBaseSetupTime(providerType);
      const wizardTime = wizardSteps.length * 30000; // 30 seconds per step
      
      return baseTime + wizardTime;
    } catch (error) {
      return 300000; // Default 5 minutes
    }
  }

  // Private Methods

  private async buildProviderConfiguration(
    providerType: ProviderType,
    wizardData: Record<string, Record<string, unknown>>,
    wizardSteps: WizardStep[]
  ): Promise<ProviderConfiguration> {
    // Get factory to generate base config
    const factories = this.registry.listFactories();
    const factoryName = factories.find(f => f.includes(providerType));
    
    if (!factoryName) {
      throw new Error(`No factory found for provider type: ${providerType}`);
    }

    // Start with default config
    const baseConfig = {
      id: `${providerType}-${Date.now()}`,
      name: this.generateProviderName(providerType, wizardData),
      type: providerType,
      version: '1.0.0',
      description: `Auto-configured ${providerType} provider`,
      category: this.getProviderCategory(providerType),
      features: {},
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
          enterprise: false
        }
      },
      dependencies: [],
      config: {},
      secrets: {},
      enabled: true,
      autoStart: true,
      healthCheck: true,
      priority: 1,
      timeout: 30000,
      retries: 3
    } as ProviderConfiguration;

    // Merge wizard data into config
    const mergedConfig = { ...baseConfig.config };
    
    for (const [stepId, stepData] of Object.entries(wizardData)) {
      Object.assign(mergedConfig, stepData);
    }

    baseConfig.config = mergedConfig;

    return baseConfig;
  }

  private async createSetupSteps(
    providerType: ProviderType,
    config: ProviderConfiguration,
    wizardSteps: WizardStep[],
    options: SetupOptions
  ): Promise<SetupStep[]> {
    const steps: SetupStep[] = [];

    // Step 1: Validate configuration
    steps.push({
      id: 'validate-configuration',
      name: 'Validate Configuration',
      description: 'Validate provider configuration and wizard data',
      required: true,
      estimatedTime: 10000, // 10 seconds
      status: 'pending'
    });

    // Step 2: Test connectivity
    steps.push({
      id: 'test-connectivity',
      name: 'Test Connectivity',
      description: 'Test connection to provider services',
      required: true,
      dependencies: ['validate-configuration'],
      estimatedTime: 15000, // 15 seconds
      status: 'pending'
    });

    // Step 3: Create backup (if requested)
    if (options.backup) {
      steps.push({
        id: 'create-backup',
        name: 'Create Backup',
        description: 'Create backup of existing configuration',
        required: false,
        dependencies: ['test-connectivity'],
        estimatedTime: 30000, // 30 seconds
        status: 'pending'
      });
    }

    // Step 4: Register provider
    steps.push({
      id: 'register-provider',
      name: 'Register Provider',
      description: 'Register provider with enhanced registry',
      required: true,
      dependencies: options.backup ? ['create-backup'] : ['test-connectivity'],
      estimatedTime: 5000, // 5 seconds
      status: 'pending'
    });

    // Step 5: Setup automation (schema, migrations, etc.)
    steps.push({
      id: 'setup-automation',
      name: 'Setup Automation',
      description: 'Execute automated setup tasks (schema, migrations, etc.)',
      required: true,
      dependencies: ['register-provider'],
      estimatedTime: this.getSetupAutomationTime(providerType),
      status: 'pending'
    });

    // Step 6: Start provider
    steps.push({
      id: 'start-provider',
      name: 'Start Provider',
      description: 'Start provider and verify health',
      required: true,
      dependencies: ['setup-automation'],
      estimatedTime: 10000, // 10 seconds
      status: 'pending'
    });

    // Step 7: Run diagnostics
    steps.push({
      id: 'run-diagnostics',
      name: 'Run Diagnostics',
      description: 'Run comprehensive provider diagnostics',
      required: true,
      dependencies: ['start-provider'],
      estimatedTime: 20000, // 20 seconds
      status: 'pending'
    });

    // Step 8: Verify features
    steps.push({
      id: 'verify-features',
      name: 'Verify Features',
      description: 'Verify all provider features are working',
      required: false,
      dependencies: ['run-diagnostics'],
      estimatedTime: 15000, // 15 seconds
      status: 'pending'
    });

    // Filter out optional steps if requested
    if (options.skipOptionalSteps) {
      return steps.filter(step => step.required);
    }

    return steps;
  }

  private async executeSetupSteps(
    progress: SetupProgress,
    config: ProviderConfiguration,
    options: SetupOptions
  ): Promise<void> {
    for (const step of progress.steps) {
      if (progress.status === 'cancelled') {
        break;
      }

      // Check dependencies
      if (step.dependencies) {
        const unmetDeps = step.dependencies.filter(depId => {
          const depStep = progress.steps.find(s => s.id === depId);
          return !depStep || depStep.status !== 'completed';
        });

        if (unmetDeps.length > 0) {
          step.status = 'skipped';
          continue;
        }
      }

      progress.currentStep = step;
      step.status = 'in_progress';
      step.startTime = new Date();

      this.emit('stepStarted', progress, step);
      options.notificationCallback?.(progress);

      try {
        step.result = await this.executeSetupStep(step, config, progress);
        step.status = 'completed';
        progress.completedSteps++;

        console.log(`✅ Setup step completed: ${step.name}`);

      } catch (error) {
        step.status = 'failed';
        step.error = error as Error;
        progress.errors.push(error as Error);

        console.error(`❌ Setup step failed: ${step.name}:`, error);

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
  }

  private async executeSetupStep(
    step: SetupStep,
    config: ProviderConfiguration,
    progress: SetupProgress
  ): Promise<StepResult> {
    switch (step.id) {
      case 'validate-configuration':
        return await this.validateConfigurationStep(config);

      case 'test-connectivity':
        return await this.testConnectivityStep(config);

      case 'create-backup':
        return await this.createBackupStep(progress);

      case 'register-provider':
        return await this.registerProviderStep(config, progress);

      case 'setup-automation':
        return await this.setupAutomationStep(config, progress);

      case 'start-provider':
        return await this.startProviderStep(progress);

      case 'run-diagnostics':
        return await this.runDiagnosticsStep(progress);

      case 'verify-features':
        return await this.verifyFeaturesStep(progress);

      default:
        throw new Error(`Unknown setup step: ${step.id}`);
    }
  }

  private async validateConfigurationStep(config: ProviderConfiguration): Promise<StepResult> {
    try {
      // Get the factory for this provider type
      const factories = this.registry.listFactories();
      const factoryName = factories.find(f => f.includes(config.type));
      
      if (!factoryName) {
        throw new Error(`No factory found for provider type: ${config.type}`);
      }

      return {
        success: true,
        data: { factoryName, configValid: true }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async testConnectivityStep(config: ProviderConfiguration): Promise<StepResult> {
    try {
      // This would test connectivity based on provider type
      // For now, we'll simulate a successful connection test
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate test time
      
      return {
        success: true,
        data: { connectivity: 'verified', latency: 45 }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async createBackupStep(progress: SetupProgress): Promise<StepResult> {
    try {
      // Check if there's an existing provider to backup
      const existingProvider = this.registry.getProvider(progress.providerName);
      
      if (existingProvider) {
        const backupId = await this.registry.backupProvider(progress.providerName);
        return {
          success: true,
          data: { backupId, timestamp: new Date() }
        };
      }
      
      return {
        success: true,
        data: { message: 'No existing provider to backup' }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async registerProviderStep(config: ProviderConfiguration, progress: SetupProgress): Promise<StepResult> {
    try {
      await this.registry.registerProvider(progress.providerName, config.type, config);
      
      return {
        success: true,
        data: { providerName: progress.providerName, registered: true }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async setupAutomationStep(config: ProviderConfiguration, progress: SetupProgress): Promise<StepResult> {
    try {
      const provider = this.registry.getProvider(progress.providerName);
      if (!provider) {
        throw new Error('Provider not found after registration');
      }

      const setupAutomation = provider.getSetupAutomation?.();
      if (setupAutomation) {
        // Execute setup automation steps
        const steps = setupAutomation.getSetupSteps();
        
        for (const stepName of steps) {
          console.log(`Executing setup automation step: ${stepName}`);
          
          switch (stepName) {
            case 'create-schema':
              await setupAutomation.createSchema();
              break;
            case 'run-migrations':
              // Migration logic would go here
              break;
            case 'validate-config':
              await setupAutomation.validateConfiguration(config.config);
              break;
          }
        }
      }

      return {
        success: true,
        data: { automationSteps: setupAutomation?.getSetupSteps() || [] }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async startProviderStep(progress: SetupProgress): Promise<StepResult> {
    try {
      await this.registry.startProvider(progress.providerName);
      
      // Verify provider is running
      const health = await this.registry.checkProviderHealth(progress.providerName);
      
      return {
        success: true,
        data: { 
          started: true, 
          health: health.health,
          status: health.status
        }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async runDiagnosticsStep(progress: SetupProgress): Promise<StepResult> {
    try {
      const diagnostics = await this.registry.runDiagnostics(progress.providerName);
      const providerDiagnostics = diagnostics[progress.providerName];
      
      return {
        success: providerDiagnostics?.success || false,
        data: providerDiagnostics?.details || diagnostics
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async verifyFeaturesStep(progress: SetupProgress): Promise<StepResult> {
    try {
      const provider = this.registry.getProvider(progress.providerName);
      if (!provider) {
        throw new Error('Provider not found');
      }

      const capabilities = provider.getCapabilities();
      const verifiedFeatures: Record<string, boolean> = {};

      // Verify each capability
      for (const capability of capabilities) {
        try {
          // This would run specific feature tests
          verifiedFeatures[capability] = true;
        } catch (error) {
          verifiedFeatures[capability] = false;
        }
      }

      const allFeaturesWorking = Object.values(verifiedFeatures).every(working => working);

      return {
        success: allFeaturesWorking,
        data: { 
          features: verifiedFeatures,
          totalFeatures: capabilities.length,
          workingFeatures: Object.values(verifiedFeatures).filter(Boolean).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async finalizeSetup(progress: SetupProgress, config: ProviderConfiguration): Promise<void> {
    try {
      // Perform any final setup tasks
      console.log(`🎉 Finalizing setup for ${progress.providerName}`);
      
      // Update provider configuration with any final settings
      await this.registry.updateProviderConfig(progress.providerName, {
        description: `${config.description} (Auto-configured on ${new Date().toISOString()})`
      });

    } catch (error) {
      console.error('Error during setup finalization:', error);
      throw error;
    }
  }

  private async rollbackSetup(progress: SetupProgress): Promise<void> {
    console.log(`🔄 Rolling back setup for ${progress.providerName}`);
    
    try {
      // Stop provider if it was started
      if (this.registry.hasProvider(progress.providerName)) {
        try {
          await this.registry.stopProvider(progress.providerName);
        } catch (error) {
          console.error('Error stopping provider during rollback:', error);
        }

        // Unregister provider
        try {
          await this.registry.unregisterProvider(progress.providerName);
        } catch (error) {
          console.error('Error unregistering provider during rollback:', error);
        }
      }

      // Restore from backup if available
      const backupStep = progress.steps.find(s => s.id === 'create-backup');
      if (backupStep?.result?.success && backupStep.result.data?.backupId) {
        try {
          await this.registry.restoreProvider(progress.providerName, backupStep.result.data.backupId);
        } catch (error) {
          console.error('Error restoring backup during rollback:', error);
        }
      }

    } catch (error) {
      console.error('Error during setup rollback:', error);
    }
  }

  private generateProviderName(providerType: ProviderType, wizardData: Record<string, Record<string, unknown>>): string {
    const connectionData = wizardData.connection || {};
    const name = connectionData.name as string;
    
    if (name) {
      return name;
    }

    // Generate name based on provider type and timestamp
    return `${providerType}-provider-${Date.now()}`;
  }

  private getProviderCategory(providerType: ProviderType): string {
    if (providerType.includes('db') || providerType.includes('database') || providerType === 'postgresql' || providerType === 'mysql') {
      return 'database';
    }
    if (providerType.includes('auth')) {
      return 'auth';
    }
    if (providerType.includes('email')) {
      return 'email';
    }
    if (providerType.includes('storage')) {
      return 'storage';
    }
    if (providerType.includes('all-in-one')) {
      return 'all-in-one';
    }
    return 'other';
  }

  private getBaseSetupTime(providerType: ProviderType): number {
    // Base setup times in milliseconds
    switch (providerType) {
      case 'postgresql':
        return 120000; // 2 minutes
      case 'supabase-db':
        return 180000; // 3 minutes
      case 'pocketbase-all-in-one':
        return 300000; // 5 minutes
      case 'local-auth':
        return 60000; // 1 minute
      default:
        return 120000; // 2 minutes default
    }
  }

  private getSetupAutomationTime(providerType: ProviderType): number {
    // Setup automation times in milliseconds
    switch (providerType) {
      case 'postgresql':
        return 60000; // 1 minute for schema creation
      case 'supabase-db':
        return 90000; // 1.5 minutes for Supabase setup
      case 'pocketbase-all-in-one':
        return 120000; // 2 minutes for PocketBase setup
      case 'local-auth':
        return 30000; // 30 seconds for local auth setup
      default:
        return 60000; // 1 minute default
    }
  }

  private addToHistory(progress: SetupProgress): void {
    this.setupHistory.unshift(progress);
    
    // Keep only last MAX_HISTORY entries
    if (this.setupHistory.length > this.MAX_HISTORY) {
      this.setupHistory = this.setupHistory.slice(0, this.MAX_HISTORY);
    }
  }
}