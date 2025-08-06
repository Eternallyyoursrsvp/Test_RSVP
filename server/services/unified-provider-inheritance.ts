/**
 * Unified Provider Inheritance Service
 * Implements Platform Independent Provider Management with Tenant → Event inheritance
 * Enterprise SAAS Standard - No backward compatibility fallbacks
 */

import { BaseService, ServiceContext, ServiceResult, createServiceResult } from './base-service';
import { NotFoundError, ValidationError, ConflictError } from '../lib/response-builder';

// Core Provider Types (Platform Independent)
export type ProviderType = 'email' | 'sms' | 'whatsapp';
export type ProviderName = 'gmail' | 'outlook' | 'brevo' | 'mailchimp' | 'sendgrid' | 'twilio' | 'whatsapp_business' | 'whatsapp_web';

export interface UnifiedProviderConfig {
  id: string;
  tenantId: string;
  eventId?: string; // NULL for tenant defaults
  providerType: ProviderType;
  providerName: ProviderName;
  configuration: Record<string, any>;
  credentials: Record<string, any>; // Encrypted
  priority: number;
  isActive: boolean;
  isTenantDefault: boolean;
  isEventOverride: boolean;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastHealthCheck?: Date;
  testResults: {
    lastTest?: Date;
    success: boolean;
    latency?: number;
    errorMessage?: string;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedProviderConfig {
  eventId: string;
  providers: {
    email: UnifiedProviderConfig[];
    sms: UnifiedProviderConfig[];
    whatsapp: UnifiedProviderConfig[];
  };
  inheritance: {
    tenantDefaults: UnifiedProviderConfig[];
    eventOverrides: UnifiedProviderConfig[];
  };
  operationalConfig: {
    primaryProviders: Record<ProviderType, UnifiedProviderConfig>;
    fallbackProviders: Record<ProviderType, UnifiedProviderConfig[]>;
  };
}

export interface ProviderInheritanceOptions {
  includeTenantDefaults?: boolean;
  includeEventOverrides?: boolean;
  includeHealthStatus?: boolean;
  providerTypes?: ProviderType[];
}

export interface ProviderTestResult {
  providerId: string;
  success: boolean;
  latency?: number;
  errorMessage?: string;
  testedAt: Date;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

export interface ProviderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Enterprise Provider Inheritance Service
 * Implements Tenant → Event inheritance model with Platform Independence
 */
export class UnifiedProviderInheritanceService extends BaseService {

  /**
   * Get resolved provider configuration for an event
   * Implements inheritance: Tenant Defaults → Event Overrides
   */
  async getResolvedProviderConfiguration(
    eventId: string,
    context: ServiceContext,
    options: ProviderInheritanceOptions = {}
  ): Promise<ServiceResult<ResolvedProviderConfig>> {
    try {
      this.logOperation('getResolvedProviderConfiguration', 'provider_inheritance', eventId, { context, options });

      // Validate event access and get tenant info
      const event = await this.storage.getEvent(parseInt(eventId));
      if (!event) {
        throw new NotFoundError(`Event ${eventId} not found`);
      }

      await this.validateEventAccess(parseInt(eventId), context.userId, context.userRole);

      const tenantId = event.tenantId?.toString();
      if (!tenantId) {
        throw new ValidationError('Event must be associated with a tenant');
      }

      // Get tenant default providers
      const tenantDefaults = await this.getTenantDefaultProviders(tenantId, options);

      // Get event override providers
      const eventOverrides = await this.getEventOverrideProviders(eventId, options);

      // Resolve inheritance hierarchy
      const resolvedProviders = this.resolveProviderInheritance(tenantDefaults, eventOverrides);

      // Build operational configuration
      const operationalConfig = this.buildOperationalConfiguration(resolvedProviders);

      const result: ResolvedProviderConfig = {
        eventId,
        providers: {
          email: resolvedProviders.filter(p => p.providerType === 'email'),
          sms: resolvedProviders.filter(p => p.providerType === 'sms'),
          whatsapp: resolvedProviders.filter(p => p.providerType === 'whatsapp'),
        },
        inheritance: {
          tenantDefaults,
          eventOverrides,
        },
        operationalConfig
      };

      return createServiceResult({
        success: true,
        data: result,
        operation: 'getResolvedProviderConfiguration',
        resourceType: 'provider_inheritance',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('getResolvedProviderConfiguration', error as Error, { context, eventId, options });
      throw error;
    }
  }

  /**
   * Get tenant default providers
   */
  private async getTenantDefaultProviders(
    tenantId: string,
    options: ProviderInheritanceOptions
  ): Promise<UnifiedProviderConfig[]> {
    // Query unified_communication_providers where eventId IS NULL (tenant defaults)
    const query = `
      SELECT * FROM unified_communication_providers 
      WHERE tenant_id = $1 AND event_id IS NULL AND is_active = true
      ${options.providerTypes ? `AND provider_type = ANY($2)` : ''}
      ORDER BY provider_type, priority ASC
    `;

    const params = options.providerTypes 
      ? [tenantId, options.providerTypes] 
      : [tenantId];

    const results = await this.storage.query(query, params);
    return results.map(this.mapDbRowToProviderConfig);
  }

  /**
   * Get event override providers
   */
  private async getEventOverrideProviders(
    eventId: string,
    options: ProviderInheritanceOptions
  ): Promise<UnifiedProviderConfig[]> {
    // Query unified_communication_providers where eventId matches (event overrides)
    const query = `
      SELECT * FROM unified_communication_providers 
      WHERE event_id = $1 AND is_active = true
      ${options.providerTypes ? `AND provider_type = ANY($2)` : ''}
      ORDER BY provider_type, priority ASC
    `;

    const params = options.providerTypes 
      ? [eventId, options.providerTypes] 
      : [eventId];

    const results = await this.storage.query(query, params);
    return results.map(this.mapDbRowToProviderConfig);
  }

  /**
   * Resolve provider inheritance: Event overrides take precedence over tenant defaults
   */
  private resolveProviderInheritance(
    tenantDefaults: UnifiedProviderConfig[],
    eventOverrides: UnifiedProviderConfig[]
  ): UnifiedProviderConfig[] {
    const resolvedProviders: UnifiedProviderConfig[] = [];
    const processedKeys = new Set<string>();

    // First, add all event overrides (highest precedence)
    for (const override of eventOverrides) {
      const key = `${override.providerType}:${override.providerName}`;
      resolvedProviders.push(override);
      processedKeys.add(key);
    }

    // Then, add tenant defaults that weren't overridden
    for (const tenantDefault of tenantDefaults) {
      const key = `${tenantDefault.providerType}:${tenantDefault.providerName}`;
      if (!processedKeys.has(key)) {
        resolvedProviders.push(tenantDefault);
        processedKeys.add(key);
      }
    }

    return resolvedProviders.sort((a, b) => {
      // Sort by provider type first, then by priority
      if (a.providerType !== b.providerType) {
        return a.providerType.localeCompare(b.providerType);
      }
      return a.priority - b.priority;
    });
  }

  /**
   * Build operational configuration for runtime use
   */
  private buildOperationalConfiguration(
    resolvedProviders: UnifiedProviderConfig[]
  ): ResolvedProviderConfig['operationalConfig'] {
    const primaryProviders: Record<ProviderType, UnifiedProviderConfig> = {} as any;
    const fallbackProviders: Record<ProviderType, UnifiedProviderConfig[]> = {
      email: [],
      sms: [],
      whatsapp: []
    };

    // Group providers by type
    const providersByType = {
      email: resolvedProviders.filter(p => p.providerType === 'email'),
      sms: resolvedProviders.filter(p => p.providerType === 'sms'),
      whatsapp: resolvedProviders.filter(p => p.providerType === 'whatsapp')
    };

    // For each provider type, set primary and fallbacks
    for (const [type, providers] of Object.entries(providersByType)) {
      const providerType = type as ProviderType;
      const healthyProviders = providers.filter(p => p.healthStatus === 'healthy');
      const availableProviders = healthyProviders.length > 0 ? healthyProviders : providers;

      if (availableProviders.length > 0) {
        // Primary provider is the first healthy provider (lowest priority number)
        primaryProviders[providerType] = availableProviders[0];
        
        // Fallback providers are the rest
        fallbackProviders[providerType] = availableProviders.slice(1);
      }
    }

    return {
      primaryProviders,
      fallbackProviders
    };
  }

  /**
   * Test provider connection in real-time
   */
  async testProviderConnection(
    providerId: string,
    context: ServiceContext
  ): Promise<ServiceResult<ProviderTestResult>> {
    try {
      this.logOperation('testProviderConnection', 'provider_test', providerId, { context });

      const provider = await this.getProviderById(providerId);
      if (!provider) {
        throw new NotFoundError(`Provider ${providerId} not found`);
      }

      // Validate access to the provider's tenant/event
      if (provider.eventId) {
        await this.validateEventAccess(parseInt(provider.eventId), context.userId, context.userRole);
      } else {
        await this.validateTenantAccess(provider.tenantId, context.userId, context.userRole);
      }

      const startTime = Date.now();
      let testResult: ProviderTestResult;

      try {
        // Perform provider-specific test
        await this.performProviderTest(provider);
        
        const latency = Date.now() - startTime;
        testResult = {
          providerId,
          success: true,
          latency,
          testedAt: new Date(),
          healthStatus: latency < 1000 ? 'healthy' : 'degraded'
        };

      } catch (testError) {
        const latency = Date.now() - startTime;
        testResult = {
          providerId,
          success: false,
          latency,
          errorMessage: (testError as Error).message,
          testedAt: new Date(),
          healthStatus: 'unhealthy'
        };
      }

      // Update provider health status
      await this.updateProviderHealthStatus(providerId, testResult);

      return createServiceResult({
        success: true,
        data: testResult,
        operation: 'testProviderConnection',
        resourceType: 'provider_test',
        resourceId: providerId
      });

    } catch (error) {
      this.logError('testProviderConnection', error as Error, { context, providerId });
      throw error;
    }
  }

  /**
   * Create or update tenant default provider
   */
  async setTenantDefaultProvider(
    tenantId: string,
    providerConfig: Partial<UnifiedProviderConfig>,
    context: ServiceContext
  ): Promise<ServiceResult<UnifiedProviderConfig>> {
    try {
      this.logOperation('setTenantDefaultProvider', 'tenant_provider', tenantId, { context, providerConfig });

      await this.validateTenantAccess(tenantId, context.userId, context.userRole);

      // Validate provider configuration
      const validation = await this.validateProviderConfiguration(providerConfig);
      if (!validation.isValid) {
        throw new ValidationError(`Invalid provider configuration: ${validation.errors.join(', ')}`);
      }

      const providerData: Partial<UnifiedProviderConfig> = {
        ...providerConfig,
        tenantId,
        eventId: undefined, // Tenant defaults have no eventId
        isTenantDefault: true,
        isEventOverride: false,
        createdBy: context.userId,
        updatedAt: new Date()
      };

      // Check if tenant default already exists for this provider type/name
      const existingProvider = await this.findTenantDefaultProvider(
        tenantId, 
        providerConfig.providerType!, 
        providerConfig.providerName!
      );

      let result: UnifiedProviderConfig;

      if (existingProvider) {
        // Update existing tenant default
        result = await this.updateProvider(existingProvider.id, providerData, context);
      } else {
        // Create new tenant default
        result = await this.createProvider(providerData, context);
      }

      return createServiceResult({
        success: true,
        data: result,
        operation: 'setTenantDefaultProvider',
        resourceType: 'tenant_provider',
        resourceId: result.id
      });

    } catch (error) {
      this.logError('setTenantDefaultProvider', error as Error, { context, tenantId, providerConfig });
      throw error;
    }
  }

  /**
   * Create or update event override provider
   */
  async setEventOverrideProvider(
    eventId: string,
    providerConfig: Partial<UnifiedProviderConfig>,
    context: ServiceContext
  ): Promise<ServiceResult<UnifiedProviderConfig>> {
    try {
      this.logOperation('setEventOverrideProvider', 'event_provider', eventId, { context, providerConfig });

      const event = await this.storage.getEvent(parseInt(eventId));
      if (!event) {
        throw new NotFoundError(`Event ${eventId} not found`);
      }

      await this.validateEventAccess(parseInt(eventId), context.userId, context.userRole);

      const validation = await this.validateProviderConfiguration(providerConfig);
      if (!validation.isValid) {
        throw new ValidationError(`Invalid provider configuration: ${validation.errors.join(', ')}`);
      }

      const providerData: Partial<UnifiedProviderConfig> = {
        ...providerConfig,
        tenantId: event.tenantId?.toString(),
        eventId,
        isTenantDefault: false,
        isEventOverride: true,
        createdBy: context.userId,
        updatedAt: new Date()
      };

      // Check if event override already exists
      const existingProvider = await this.findEventOverrideProvider(
        eventId,
        providerConfig.providerType!,
        providerConfig.providerName!
      );

      let result: UnifiedProviderConfig;

      if (existingProvider) {
        result = await this.updateProvider(existingProvider.id, providerData, context);
      } else {
        result = await this.createProvider(providerData, context);
      }

      return createServiceResult({
        success: true,
        data: result,
        operation: 'setEventOverrideProvider',
        resourceType: 'event_provider',
        resourceId: result.id
      });

    } catch (error) {
      this.logError('setEventOverrideProvider', error as Error, { context, eventId, providerConfig });
      throw error;
    }
  }

  // Private helper methods

  private mapDbRowToProviderConfig(row: any): UnifiedProviderConfig {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      eventId: row.event_id,
      providerType: row.provider_type,
      providerName: row.provider_name,
      configuration: row.configuration || {},
      credentials: row.credentials || {},
      priority: row.priority || 100,
      isActive: row.is_active ?? true,
      isTenantDefault: row.is_tenant_default ?? false,
      isEventOverride: row.is_event_override ?? false,
      healthStatus: row.health_status || 'unknown',
      lastHealthCheck: row.last_health_check ? new Date(row.last_health_check) : undefined,
      testResults: row.test_results || { success: false },
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private async performProviderTest(provider: UnifiedProviderConfig): Promise<void> {
    // Provider-specific testing logic
    switch (provider.providerName) {
      case 'gmail':
      case 'outlook':
        await this.testEmailProvider(provider);
        break;
      case 'twilio':
        await this.testSmsProvider(provider);
        break;
      case 'whatsapp_business':
      case 'whatsapp_web':
        await this.testWhatsAppProvider(provider);
        break;
      default:
        throw new ValidationError(`Unknown provider type: ${provider.providerName}`);
    }
  }

  private async testEmailProvider(provider: UnifiedProviderConfig): Promise<void> {
    // Implement email provider testing logic
    // This would vary based on the specific provider (Gmail OAuth, SMTP, etc.)
  }

  private async testSmsProvider(provider: UnifiedProviderConfig): Promise<void> {
    // Implement SMS provider testing logic (Twilio API test)
  }

  private async testWhatsAppProvider(provider: UnifiedProviderConfig): Promise<void> {
    // Implement WhatsApp provider testing logic
  }

  private async validateProviderConfiguration(config: Partial<UnifiedProviderConfig>): Promise<ProviderValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!config.providerType) errors.push('Provider type is required');
    if (!config.providerName) errors.push('Provider name is required');
    if (!config.configuration) errors.push('Provider configuration is required');

    // Provider-specific validation
    if (config.providerType && config.providerName) {
      await this.validateProviderSpecificConfig(config, errors, warnings, suggestions);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private async validateProviderSpecificConfig(
    config: Partial<UnifiedProviderConfig>,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): Promise<void> {
    // Provider-specific validation logic
    // This would check required fields for each provider type
  }

  private async getProviderById(providerId: string): Promise<UnifiedProviderConfig | null> {
    const query = 'SELECT * FROM unified_communication_providers WHERE id = $1';
    const results = await this.storage.query(query, [providerId]);
    return results.length > 0 ? this.mapDbRowToProviderConfig(results[0]) : null;
  }

  private async findTenantDefaultProvider(
    tenantId: string,
    providerType: ProviderType,
    providerName: ProviderName
  ): Promise<UnifiedProviderConfig | null> {
    const query = `
      SELECT * FROM unified_communication_providers 
      WHERE tenant_id = $1 AND event_id IS NULL 
      AND provider_type = $2 AND provider_name = $3
    `;
    const results = await this.storage.query(query, [tenantId, providerType, providerName]);
    return results.length > 0 ? this.mapDbRowToProviderConfig(results[0]) : null;
  }

  private async findEventOverrideProvider(
    eventId: string,
    providerType: ProviderType,
    providerName: ProviderName
  ): Promise<UnifiedProviderConfig | null> {
    const query = `
      SELECT * FROM unified_communication_providers 
      WHERE event_id = $1 AND provider_type = $2 AND provider_name = $3
    `;
    const results = await this.storage.query(query, [eventId, providerType, providerName]);
    return results.length > 0 ? this.mapDbRowToProviderConfig(results[0]) : null;
  }

  private async createProvider(
    providerData: Partial<UnifiedProviderConfig>,
    context: ServiceContext
  ): Promise<UnifiedProviderConfig> {
    // Implementation for creating new provider record
    throw new Error('Method not implemented - requires database implementation');
  }

  private async updateProvider(
    providerId: string,
    providerData: Partial<UnifiedProviderConfig>,
    context: ServiceContext
  ): Promise<UnifiedProviderConfig> {
    // Implementation for updating existing provider record
    throw new Error('Method not implemented - requires database implementation');
  }

  private async updateProviderHealthStatus(
    providerId: string,
    testResult: ProviderTestResult
  ): Promise<void> {
    const query = `
      UPDATE unified_communication_providers 
      SET health_status = $1, last_health_check = $2, test_results = $3, updated_at = NOW()
      WHERE id = $4
    `;
    await this.storage.query(query, [
      testResult.healthStatus,
      testResult.testedAt,
      JSON.stringify(testResult),
      providerId
    ]);
  }

  private async validateTenantAccess(tenantId: string, userId: string, userRole: string): Promise<void> {
    // Implementation for tenant access validation
    // This would check if the user has permission to manage the tenant's providers
  }
}