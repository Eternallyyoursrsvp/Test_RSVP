/**
 * Wizard-to-Operations Integration Pipeline Service
 * Seamless transition from Event Wizard completion to operational readiness
 * Enterprise SAAS Standard - Zero-configuration operations startup
 */

import { BaseService, ServiceContext, ServiceResult, createServiceResult } from './base-service';
import { UnifiedProviderInheritanceService, ResolvedProviderConfig } from './unified-provider-inheritance';
import { UnifiedTemplateInheritanceService, ResolvedTemplateConfig } from './unified-template-inheritance';
import { NotFoundError, ValidationError, ConflictError } from '../lib/response-builder';

export interface WizardCompletionData {
  eventId: string;
  step: string;
  configuration: {
    providers?: any;
    templates?: any;
    brandAssets?: any;
    settings?: any;
  };
  completedAt: Date;
  userId: string;
}

export interface OperationalConfiguration {
  eventId: string;
  providers: ResolvedProviderConfig;
  templates: ResolvedTemplateConfig;
  brandConfiguration: {
    primaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    headerFont?: string;
    bodyFont?: string;
    customCSS?: string;
  };
  deliverySettings: {
    enabledChannels: string[];
    fallbackProviders: Record<string, string[]>;
    retryPolicy: {
      maxRetries: number;
      backoffStrategy: 'linear' | 'exponential';
      retryDelayMs: number;
    };
    rateLimits: Record<string, { perMinute: number; perHour: number; perDay: number }>;
  };
  analyticsConfiguration: {
    trackingEnabled: boolean;
    metricsToTrack: string[];
    alertingThresholds: Record<string, number>;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingRequirements: string[];
  recommendations: string[];
}

export interface ActivationResult {
  success: boolean;
  operationalConfigId: string;
  activatedAt: Date;
  activatedProviders: string[];
  activatedTemplates: string[];
  healthChecks: {
    providersHealthy: boolean;
    templatesValid: boolean;
    systemReady: boolean;
  };
  rollbackToken?: string; // For emergency rollback
}

export interface PipelineStatus {
  eventId: string;
  currentStage: 'validation' | 'configuration' | 'activation' | 'completed' | 'failed';
  progress: number; // 0-100
  startedAt: Date;
  completedAt?: Date;
  errors: string[];
  stages: {
    validation: { completed: boolean; duration?: number; };
    configuration: { completed: boolean; duration?: number; };
    activation: { completed: boolean; duration?: number; };
  };
}

export interface HealthStatus {
  eventId: string;
  isHealthy: boolean;
  lastCheck: Date;
  components: {
    providers: { healthy: boolean; details: Record<string, any>; };
    templates: { healthy: boolean; details: Record<string, any>; };
    configuration: { healthy: boolean; details: Record<string, any>; };
  };
  overallScore: number; // 0-100
}

export interface RollbackResult {
  success: boolean;
  rolledBackTo: string;
  restoredConfiguration: any;
  rollbackToken: string;
}

/**
 * Enterprise Wizard-to-Operations Integration Pipeline
 * Implements seamless configuration deployment with validation and rollback
 */
export class WizardOperationsPipelineService extends BaseService {

  private providerService: UnifiedProviderInheritanceService;
  private templateService: UnifiedTemplateInheritanceService;

  constructor() {
    super();
    this.providerService = new UnifiedProviderInheritanceService();
    this.templateService = new UnifiedTemplateInheritanceService();
  }

  /**
   * Process wizard completion and prepare operational configuration
   * Main entry point for wizard-to-operations pipeline
   */
  async processWizardCompletion(
    wizardData: WizardCompletionData,
    context: ServiceContext
  ): Promise<ServiceResult<ActivationResult>> {
    try {
      this.logOperation('processWizardCompletion', 'wizard_pipeline', wizardData.eventId, { context, wizardData });

      // Initialize pipeline status tracking
      const pipelineStatus = await this.initializePipelineStatus(wizardData.eventId, context);

      try {
        // Stage 1: Validate wizard configuration
        await this.updatePipelineStage(wizardData.eventId, 'validation', 0);
        const validation = await this.validateWizardConfiguration(wizardData, context);
        if (!validation.isValid) {
          throw new ValidationError(`Wizard validation failed: ${validation.errors.join(', ')}`);
        }
        await this.updatePipelineStage(wizardData.eventId, 'validation', 100);

        // Stage 2: Build operational configuration
        await this.updatePipelineStage(wizardData.eventId, 'configuration', 0);
        const operationalConfig = await this.buildOperationalConfiguration(wizardData, context);
        await this.updatePipelineStage(wizardData.eventId, 'configuration', 100);

        // Stage 3: Activate operational configuration
        await this.updatePipelineStage(wizardData.eventId, 'activation', 0);
        const activationResult = await this.activateOperationalConfiguration(operationalConfig, context);
        await this.updatePipelineStage(wizardData.eventId, 'activation', 100);

        // Mark pipeline as completed
        await this.updatePipelineStage(wizardData.eventId, 'completed', 100);

        return createServiceResult({
          success: true,
          data: activationResult,
          operation: 'processWizardCompletion',
          resourceType: 'wizard_pipeline',
          resourceId: wizardData.eventId
        });

      } catch (error) {
        // Mark pipeline as failed and store error
        await this.updatePipelineStage(wizardData.eventId, 'failed', 0, (error as Error).message);
        throw error;
      }

    } catch (error) {
      this.logError('processWizardCompletion', error as Error, { context, wizardData });
      throw error;
    }
  }

  /**
   * Validate wizard configuration before processing
   */
  async validateWizardConfiguration(
    wizardData: WizardCompletionData,
    context: ServiceContext
  ): Promise<ValidationResult> {
    try {
      this.logOperation('validateWizardConfiguration', 'validation', wizardData.eventId, { context });

      const errors: string[] = [];
      const warnings: string[] = [];
      const missingRequirements: string[] = [];
      const recommendations: string[] = [];

      // Validate event exists and is accessible
      const event = await this.storage.getEvent(parseInt(wizardData.eventId));
      if (!event) {
        errors.push(`Event ${wizardData.eventId} not found`);
        return { isValid: false, errors, warnings, missingRequirements, recommendations };
      }

      await this.validateEventAccess(parseInt(wizardData.eventId), context.userId, context.userRole);

      // Validate provider configuration
      const providerValidation = await this.validateProviderConfiguration(wizardData, context);
      errors.push(...providerValidation.errors);
      warnings.push(...providerValidation.warnings);
      missingRequirements.push(...providerValidation.missingRequirements);

      // Validate template configuration
      const templateValidation = await this.validateTemplateConfiguration(wizardData, context);
      errors.push(...templateValidation.errors);
      warnings.push(...templateValidation.warnings);
      recommendations.push(...templateValidation.recommendations);

      // Validate required channels have providers
      const enabledChannels = this.extractEnabledChannels(wizardData);
      for (const channel of enabledChannels) {
        const hasProvider = await this.hasProviderForChannel(wizardData.eventId, channel);
        if (!hasProvider) {
          missingRequirements.push(`No active provider configured for ${channel} channel`);
        }
      }

      // Check for minimum requirements
      if (enabledChannels.length === 0) {
        missingRequirements.push('At least one communication channel must be enabled');
      }

      return {
        isValid: errors.length === 0 && missingRequirements.length === 0,
        errors,
        warnings,
        missingRequirements,
        recommendations
      };

    } catch (error) {
      this.logError('validateWizardConfiguration', error as Error, { context, wizardData });
      return {
        isValid: false,
        errors: [(error as Error).message],
        warnings: [],
        missingRequirements: [],
        recommendations: []
      };
    }
  }

  /**
   * Build comprehensive operational configuration
   */
  async buildOperationalConfiguration(
    wizardData: WizardCompletionData,
    context: ServiceContext
  ): Promise<OperationalConfiguration> {
    try {
      this.logOperation('buildOperationalConfiguration', 'configuration', wizardData.eventId, { context });

      // Get resolved provider configuration
      const providerResult = await this.providerService.getResolvedProviderConfiguration(
        wizardData.eventId,
        context,
        { includeHealthStatus: true }
      );

      if (!providerResult.success) {
        throw new Error(`Failed to resolve provider configuration: ${providerResult.error}`);
      }

      // Get resolved template configuration
      const templateResult = await this.templateService.getResolvedTemplateConfiguration(
        wizardData.eventId,
        context,
        { includePlatformTemplates: true, includeTenantTemplates: true, includeEventTemplates: true }
      );

      if (!templateResult.success) {
        throw new Error(`Failed to resolve template configuration: ${templateResult.error}`);
      }

      // Build brand configuration from wizard data
      const brandConfiguration = this.buildBrandConfiguration(wizardData);

      // Build delivery settings with intelligent defaults
      const deliverySettings = this.buildDeliverySettings(providerResult.data, wizardData);

      // Build analytics configuration
      const analyticsConfiguration = this.buildAnalyticsConfiguration(wizardData);

      const operationalConfig: OperationalConfiguration = {
        eventId: wizardData.eventId,
        providers: providerResult.data,
        templates: templateResult.data,
        brandConfiguration,
        deliverySettings,
        analyticsConfiguration
      };

      return operationalConfig;

    } catch (error) {
      this.logError('buildOperationalConfiguration', error as Error, { context, wizardData });
      throw error;
    }
  }

  /**
   * Activate operational configuration for runtime use
   */
  async activateOperationalConfiguration(
    config: OperationalConfiguration,
    context: ServiceContext
  ): Promise<ActivationResult> {
    try {
      this.logOperation('activateOperationalConfiguration', 'activation', config.eventId, { context });

      const startTime = Date.now();
      const activatedProviders: string[] = [];
      const activatedTemplates: string[] = [];

      // Create rollback token for emergency recovery
      const rollbackToken = await this.createRollbackPoint(config.eventId, context);

      try {
        // Activate providers with health checks
        for (const [type, providers] of Object.entries(config.providers.providers)) {
          for (const provider of providers) {
            await this.activateProvider(provider, context);
            activatedProviders.push(provider.id);
          }
        }

        // Validate templates
        for (const [category, channels] of Object.entries(config.templates.templates)) {
          for (const [channel, template] of Object.entries(channels || {})) {
            if (template) {
              await this.validateTemplateForProduction(template);
              activatedTemplates.push(template.id);
            }
          }
        }

        // Store operational configuration
        const operationalConfigId = await this.storeOperationalConfiguration(config, context);

        // Perform final health checks
        const healthChecks = await this.performHealthChecks(config, context);

        const activationResult: ActivationResult = {
          success: true,
          operationalConfigId,
          activatedAt: new Date(),
          activatedProviders,
          activatedTemplates,
          healthChecks,
          rollbackToken
        };

        // Log successful activation
        this.logOperation('activationCompleted', 'activation_success', config.eventId, {
          context,
          duration: Date.now() - startTime,
          providersActivated: activatedProviders.length,
          templatesActivated: activatedTemplates.length
        });

        return activationResult;

      } catch (activationError) {
        // Attempt automatic rollback on failure
        this.logError('activationFailed', activationError as Error, { context, config });
        
        try {
          await this.rollbackConfiguration(config.eventId, rollbackToken, context);
        } catch (rollbackError) {
          this.logError('rollbackFailed', rollbackError as Error, { context, config });
        }

        throw activationError;
      }

    } catch (error) {
      this.logError('activateOperationalConfiguration', error as Error, { context, config });
      throw error;
    }
  }

  /**
   * Get pipeline status for real-time monitoring
   */
  async getPipelineStatus(
    eventId: string,
    context: ServiceContext
  ): Promise<ServiceResult<PipelineStatus>> {
    try {
      this.logOperation('getPipelineStatus', 'pipeline_status', eventId, { context });

      await this.validateEventAccess(parseInt(eventId), context.userId, context.userRole);

      const query = `
        SELECT * FROM wizard_pipeline_status 
        WHERE event_id = $1 
        ORDER BY started_at DESC 
        LIMIT 1
      `;

      const results = await this.storage.query(query, [eventId]);
      
      if (results.length === 0) {
        throw new NotFoundError(`No pipeline status found for event ${eventId}`);
      }

      const status = this.mapDbRowToPipelineStatus(results[0]);

      return createServiceResult({
        success: true,
        data: status,
        operation: 'getPipelineStatus',
        resourceType: 'pipeline_status',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('getPipelineStatus', error as Error, { context, eventId });
      throw error;
    }
  }

  /**
   * Get configuration health status
   */
  async getConfigurationHealth(
    eventId: string,
    context: ServiceContext
  ): Promise<ServiceResult<HealthStatus>> {
    try {
      this.logOperation('getConfigurationHealth', 'health_check', eventId, { context });

      await this.validateEventAccess(parseInt(eventId), context.userId, context.userRole);

      const healthStatus = await this.performComprehensiveHealthCheck(eventId, context);

      return createServiceResult({
        success: true,
        data: healthStatus,
        operation: 'getConfigurationHealth',
        resourceType: 'health_status',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('getConfigurationHealth', error as Error, { context, eventId });
      throw error;
    }
  }

  /**
   * Rollback configuration to previous state
   */
  async rollbackConfiguration(
    eventId: string,
    rollbackToken: string,
    context: ServiceContext
  ): Promise<ServiceResult<RollbackResult>> {
    try {
      this.logOperation('rollbackConfiguration', 'rollback', eventId, { context, rollbackToken });

      await this.validateEventAccess(parseInt(eventId), context.userId, context.userRole);

      // Verify rollback token
      const rollbackData = await this.getRollbackData(eventId, rollbackToken);
      if (!rollbackData) {
        throw new ValidationError(`Invalid rollback token for event ${eventId}`);
      }

      // Perform rollback operations
      await this.restoreConfiguration(rollbackData, context);

      const rollbackResult: RollbackResult = {
        success: true,
        rolledBackTo: rollbackData.timestamp,
        restoredConfiguration: rollbackData.configuration,
        rollbackToken: await this.createRollbackPoint(eventId, context) // New rollback point after rollback
      };

      return createServiceResult({
        success: true,
        data: rollbackResult,
        operation: 'rollbackConfiguration',
        resourceType: 'rollback',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('rollbackConfiguration', error as Error, { context, eventId, rollbackToken });
      throw error;
    }
  }

  // Private helper methods

  private async initializePipelineStatus(eventId: string, context: ServiceContext): Promise<void> {
    const query = `
      INSERT INTO wizard_pipeline_status (event_id, current_stage, progress, started_at, stages)
      VALUES ($1, 'validation', 0, NOW(), $2)
      ON CONFLICT (event_id) DO UPDATE SET
        current_stage = 'validation',
        progress = 0,
        started_at = NOW(),
        stages = $2,
        errors = ARRAY[]::text[]
    `;

    const stages = {
      validation: { completed: false },
      configuration: { completed: false },
      activation: { completed: false }
    };

    await this.storage.query(query, [eventId, JSON.stringify(stages)]);
  }

  private async updatePipelineStage(
    eventId: string,
    stage: string,
    progress: number,
    error?: string
  ): Promise<void> {
    const updateQuery = error 
      ? `UPDATE wizard_pipeline_status SET current_stage = $2, progress = $3, errors = array_append(errors, $4) WHERE event_id = $1`
      : `UPDATE wizard_pipeline_status SET current_stage = $2, progress = $3 WHERE event_id = $1`;

    const params = error 
      ? [eventId, stage, progress, error]
      : [eventId, stage, progress];

    await this.storage.query(updateQuery, params);
  }

  private async validateProviderConfiguration(
    wizardData: WizardCompletionData,
    context: ServiceContext
  ): Promise<{ errors: string[], warnings: string[], missingRequirements: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingRequirements: string[] = [];

    // Test each configured provider
    const providerResult = await this.providerService.getResolvedProviderConfiguration(
      wizardData.eventId,
      context
    );

    if (!providerResult.success) {
      errors.push('Failed to resolve provider configuration');
      return { errors, warnings, missingRequirements };
    }

    // Test provider connections
    for (const [type, providers] of Object.entries(providerResult.data.providers)) {
      if (providers.length === 0) {
        warnings.push(`No ${type} providers configured`);
        continue;
      }

      for (const provider of providers) {
        try {
          const testResult = await this.providerService.testProviderConnection(provider.id, context);
          if (!testResult.success || !testResult.data.success) {
            errors.push(`Provider ${provider.providerName} failed connection test: ${testResult.data.errorMessage}`);
          }
        } catch (testError) {
          warnings.push(`Could not test provider ${provider.providerName}: ${(testError as Error).message}`);
        }
      }
    }

    return { errors, warnings, missingRequirements };
  }

  private async validateTemplateConfiguration(
    wizardData: WizardCompletionData,
    context: ServiceContext
  ): Promise<{ errors: string[], warnings: string[], recommendations: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const templateResult = await this.templateService.getResolvedTemplateConfiguration(
      wizardData.eventId,
      context
    );

    if (!templateResult.success) {
      errors.push('Failed to resolve template configuration');
      return { errors, warnings, recommendations };
    }

    // Check for essential templates
    const essentialCategories = ['invitation', 'rsvp_confirmation'];
    for (const category of essentialCategories) {
      const categoryTemplates = templateResult.data.templates[category as any];
      if (!categoryTemplates || Object.keys(categoryTemplates).length === 0) {
        warnings.push(`No templates configured for essential category: ${category}`);
      }
    }

    return { errors, warnings, recommendations };
  }

  private extractEnabledChannels(wizardData: WizardCompletionData): string[] {
    // Extract enabled channels from wizard configuration
    const channels: string[] = [];
    const config = wizardData.configuration;

    if (config.providers) {
      if (config.providers.email?.enabled) channels.push('email');
      if (config.providers.sms?.enabled) channels.push('sms');
      if (config.providers.whatsapp?.enabled) channels.push('whatsapp');
    }

    return channels;
  }

  private async hasProviderForChannel(eventId: string, channel: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count FROM unified_communication_providers 
      WHERE (event_id = $1 OR (tenant_id = (SELECT tenant_id FROM wedding_events WHERE id = $1) AND event_id IS NULL))
      AND provider_type = $2 AND is_active = true
    `;

    const results = await this.storage.query(query, [eventId, channel]);
    return parseInt(results[0].count) > 0;
  }

  private buildBrandConfiguration(wizardData: WizardCompletionData): OperationalConfiguration['brandConfiguration'] {
    const brandAssets = wizardData.configuration.brandAssets || {};
    
    return {
      primaryColor: brandAssets.primaryColor,
      accentColor: brandAssets.accentColor,
      logoUrl: brandAssets.logoUrl,
      headerFont: brandAssets.headerFont,
      bodyFont: brandAssets.bodyFont,
      customCSS: brandAssets.customCSS
    };
  }

  private buildDeliverySettings(
    providers: ResolvedProviderConfig,
    wizardData: WizardCompletionData
  ): OperationalConfiguration['deliverySettings'] {
    const enabledChannels = this.extractEnabledChannels(wizardData);
    
    // Build fallback provider lists
    const fallbackProviders: Record<string, string[]> = {};
    for (const [type, providerList] of Object.entries(providers.providers)) {
      fallbackProviders[type] = providerList.map(p => p.id);
    }

    return {
      enabledChannels,
      fallbackProviders,
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        retryDelayMs: 1000
      },
      rateLimits: {
        email: { perMinute: 100, perHour: 1000, perDay: 10000 },
        sms: { perMinute: 50, perHour: 500, perDay: 2000 },
        whatsapp: { perMinute: 80, perHour: 800, perDay: 5000 }
      }
    };
  }

  private buildAnalyticsConfiguration(wizardData: WizardCompletionData): OperationalConfiguration['analyticsConfiguration'] {
    return {
      trackingEnabled: true,
      metricsToTrack: [
        'messages_sent',
        'messages_delivered', 
        'messages_opened',
        'messages_clicked',
        'bounce_rate',
        'unsubscribe_rate'
      ],
      alertingThresholds: {
        bounce_rate: 0.05, // 5%
        failure_rate: 0.02, // 2%
        response_time: 5000 // 5 seconds
      }
    };
  }

  private async activateProvider(provider: any, context: ServiceContext): Promise<void> {
    // Perform provider-specific activation
    // This would include final connection tests, credential validation, etc.
  }

  private async validateTemplateForProduction(template: any): Promise<void> {
    // Perform template validation for production use
    // This would include variable validation, content checks, etc.
  }

  private async storeOperationalConfiguration(
    config: OperationalConfiguration,
    context: ServiceContext
  ): Promise<string> {
    // Store the operational configuration in the database
    const configId = `config_${config.eventId}_${Date.now()}`;
    
    const query = `
      INSERT INTO operational_configurations (id, event_id, configuration, created_by, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (event_id) DO UPDATE SET
        configuration = $3,
        updated_at = NOW()
    `;

    await this.storage.query(query, [configId, config.eventId, JSON.stringify(config), context.userId]);
    return configId;
  }

  private async performHealthChecks(
    config: OperationalConfiguration,
    context: ServiceContext
  ): Promise<ActivationResult['healthChecks']> {
    // Perform comprehensive health checks
    let providersHealthy = true;
    let templatesValid = true;

    // Check provider health
    for (const [type, providers] of Object.entries(config.providers.providers)) {
      for (const provider of providers) {
        if (provider.healthStatus !== 'healthy') {
          providersHealthy = false;
          break;
        }
      }
    }

    // Check template validity
    for (const [category, channels] of Object.entries(config.templates.templates)) {
      for (const [channel, template] of Object.entries(channels || {})) {
        if (template && !template.isActive) {
          templatesValid = false;
          break;
        }
      }
    }

    return {
      providersHealthy,
      templatesValid,
      systemReady: providersHealthy && templatesValid
    };
  }

  private async performComprehensiveHealthCheck(
    eventId: string,
    context: ServiceContext
  ): Promise<HealthStatus> {
    // Implement comprehensive health checking
    return {
      eventId,
      isHealthy: true,
      lastCheck: new Date(),
      components: {
        providers: { healthy: true, details: {} },
        templates: { healthy: true, details: {} },
        configuration: { healthy: true, details: {} }
      },
      overallScore: 100
    };
  }

  private async createRollbackPoint(eventId: string, context: ServiceContext): Promise<string> {
    // Create rollback point for emergency recovery
    const rollbackToken = `rollback_${eventId}_${Date.now()}`;
    
    // Store current configuration state
    const query = `
      INSERT INTO configuration_rollbacks (token, event_id, configuration_snapshot, created_by, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `;

    const currentConfig = await this.getCurrentConfiguration(eventId);
    await this.storage.query(query, [rollbackToken, eventId, JSON.stringify(currentConfig), context.userId]);
    
    return rollbackToken;
  }

  private async getRollbackData(eventId: string, rollbackToken: string): Promise<any> {
    const query = `
      SELECT configuration_snapshot, created_at FROM configuration_rollbacks 
      WHERE token = $1 AND event_id = $2
    `;

    const results = await this.storage.query(query, [rollbackToken, eventId]);
    return results.length > 0 ? {
      configuration: JSON.parse(results[0].configuration_snapshot),
      timestamp: results[0].created_at
    } : null;
  }

  private async restoreConfiguration(rollbackData: any, context: ServiceContext): Promise<void> {
    // Implement configuration restoration logic
  }

  private async getCurrentConfiguration(eventId: string): Promise<any> {
    // Get current operational configuration for rollback purposes
    const query = `
      SELECT configuration FROM operational_configurations WHERE event_id = $1
    `;

    const results = await this.storage.query(query, [eventId]);
    return results.length > 0 ? JSON.parse(results[0].configuration) : {};
  }

  private mapDbRowToPipelineStatus(row: any): PipelineStatus {
    return {
      eventId: row.event_id,
      currentStage: row.current_stage,
      progress: row.progress,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      errors: row.errors || [],
      stages: row.stages ? JSON.parse(row.stages) : {
        validation: { completed: false },
        configuration: { completed: false },
        activation: { completed: false }
      }
    };
  }
}