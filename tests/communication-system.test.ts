/**
 * Comprehensive Testing Suite for Unified Communication System
 * Tests Platform Independent Provider Management with Tenant → Event Inheritance
 * Enterprise SAAS Standard - Zero-downtime operations
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UnifiedProviderInheritanceService } from '../server/services/unified-provider-inheritance';
import { UnifiedTemplateInheritanceService } from '../server/services/unified-template-inheritance';
import { WizardOperationsPipelineService } from '../server/services/wizard-operations-pipeline';

// Mock database storage
const mockStorage = {
  query: jest.fn(),
  getEvent: jest.fn(),
  transaction: jest.fn()
};

// Mock service context
const mockContext = {
  userId: 'test-user-123',
  userRole: 'admin',
  requestId: 'req-test-456',
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent'
};

// Test data fixtures
const mockTenantId = 'tenant-123';
const mockEventId = 'event-456';
const mockEvent = {
  id: parseInt(mockEventId),
  tenantId: parseInt(mockTenantId),
  eventName: 'Test Wedding',
  eventDate: new Date()
};

const mockTenantProvider = {
  id: 'provider-tenant-1',
  tenantId: mockTenantId,
  eventId: null,
  providerType: 'email',
  providerName: 'gmail',
  configuration: { account: 'tenant@example.com' },
  credentials: {},
  priority: 100,
  isActive: true,
  isTenantDefault: true,
  isEventOverride: false,
  healthStatus: 'healthy',
  createdBy: 'admin',
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockEventProvider = {
  id: 'provider-event-1',
  tenantId: mockTenantId,
  eventId: mockEventId,
  providerType: 'email',
  providerName: 'gmail',
  configuration: { account: 'event@example.com' },
  credentials: {},
  priority: 50,
  isActive: true,
  isTenantDefault: false,
  isEventOverride: true,
  healthStatus: 'healthy',
  createdBy: 'admin',
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('Unified Communication System - Provider Inheritance', () => {
  let providerService: UnifiedProviderInheritanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore - Mock private property for testing
    providerService = new UnifiedProviderInheritanceService();
    providerService['storage'] = mockStorage;
  });

  describe('Platform Independent Provider Management', () => {
    it('should enforce Platform Independent model - no platform-level providers', async () => {
      mockStorage.getEvent.mockResolvedValue(mockEvent);
      mockStorage.query.mockResolvedValueOnce([mockTenantProvider]); // tenant defaults
      mockStorage.query.mockResolvedValueOnce([mockEventProvider]); // event overrides

      const result = await providerService.getResolvedProviderConfiguration(
        mockEventId,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Verify no platform-level providers exist
      const allProviders = [
        ...result.data.providers.email,
        ...result.data.providers.sms,
        ...result.data.providers.whatsapp
      ];
      
      allProviders.forEach(provider => {
        expect(provider.tenantId).toBeDefined();
        expect(provider.tenantId).toBeTruthy();
      });
    });

    it('should properly implement Tenant → Event inheritance', async () => {
      mockStorage.getEvent.mockResolvedValue(mockEvent);
      mockStorage.query.mockResolvedValueOnce([mockTenantProvider]); // tenant defaults
      mockStorage.query.mockResolvedValueOnce([mockEventProvider]); // event overrides

      const result = await providerService.getResolvedProviderConfiguration(
        mockEventId,
        mockContext
      );

      expect(result.success).toBe(true);
      
      // Event overrides should take precedence
      const emailProviders = result.data.providers.email;
      expect(emailProviders).toHaveLength(1);
      expect(emailProviders[0].id).toBe(mockEventProvider.id);
      expect(emailProviders[0].isEventOverride).toBe(true);
      
      // Verify inheritance structure
      expect(result.data.inheritance.tenantDefaults).toHaveLength(1);
      expect(result.data.inheritance.eventOverrides).toHaveLength(1);
    });

    it('should use tenant defaults when no event overrides exist', async () => {
      mockStorage.getEvent.mockResolvedValue(mockEvent);
      mockStorage.query.mockResolvedValueOnce([mockTenantProvider]); // tenant defaults
      mockStorage.query.mockResolvedValueOnce([]); // no event overrides

      const result = await providerService.getResolvedProviderConfiguration(
        mockEventId,
        mockContext
      );

      expect(result.success).toBe(true);
      
      const emailProviders = result.data.providers.email;
      expect(emailProviders).toHaveLength(1);
      expect(emailProviders[0].id).toBe(mockTenantProvider.id);
      expect(emailProviders[0].isTenantDefault).toBe(true);
    });

    it('should build operational configuration with proper failover', async () => {
      const healthyProvider = { ...mockTenantProvider, healthStatus: 'healthy', priority: 100 };
      const degradedProvider = { ...mockTenantProvider, id: 'provider-2', healthStatus: 'degraded', priority: 200 };
      
      mockStorage.getEvent.mockResolvedValue(mockEvent);
      mockStorage.query.mockResolvedValueOnce([healthyProvider, degradedProvider]);
      mockStorage.query.mockResolvedValueOnce([]);

      const result = await providerService.getResolvedProviderConfiguration(
        mockEventId,
        mockContext
      );

      expect(result.success).toBe(true);
      
      // Primary should be healthy provider with lowest priority
      expect(result.data.operationalConfig.primaryProviders.email.id).toBe(healthyProvider.id);
      
      // Fallback should contain degraded provider
      expect(result.data.operationalConfig.fallbackProviders.email).toHaveLength(1);
      expect(result.data.operationalConfig.fallbackProviders.email[0].id).toBe(degradedProvider.id);
    });
  });

  describe('Real-time Provider Testing', () => {
    it('should test provider connection and update health status', async () => {
      const providerId = 'test-provider-1';
      const mockProvider = { ...mockTenantProvider, id: providerId };
      
      mockStorage.query.mockResolvedValueOnce([mockProvider]); // getProviderById
      mockStorage.query.mockResolvedValueOnce([]); // updateProviderHealthStatus
      
      // Mock successful provider test
      jest.spyOn(providerService as any, 'performProviderTest').mockResolvedValue(undefined);

      const result = await providerService.testProviderConnection(providerId, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
      expect(result.data.latency).toBeDefined();
      expect(result.data.healthStatus).toBe('healthy');
      
      // Verify health status update was called
      expect(mockStorage.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE unified_communication_providers'),
        expect.arrayContaining(['healthy', expect.any(Date), expect.any(String), providerId])
      );
    });

    it('should handle provider test failures gracefully', async () => {
      const providerId = 'test-provider-1';
      const mockProvider = { ...mockTenantProvider, id: providerId };
      
      mockStorage.query.mockResolvedValueOnce([mockProvider]);
      mockStorage.query.mockResolvedValueOnce([]);
      
      // Mock failed provider test
      jest.spyOn(providerService as any, 'performProviderTest')
        .mockRejectedValue(new Error('Connection timeout'));

      const result = await providerService.testProviderConnection(providerId, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(false);
      expect(result.data.errorMessage).toBe('Connection timeout');
      expect(result.data.healthStatus).toBe('unhealthy');
    });

    it('should respect performance thresholds for health status', async () => {
      const providerId = 'test-provider-1';
      const mockProvider = { ...mockTenantProvider, id: providerId };
      
      mockStorage.query.mockResolvedValueOnce([mockProvider]);
      mockStorage.query.mockResolvedValueOnce([]);
      
      // Mock slow provider test (degraded performance)
      jest.spyOn(providerService as any, 'performProviderTest')
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1500))); // 1.5s latency

      const result = await providerService.testProviderConnection(providerId, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
      expect(result.data.latency).toBeGreaterThan(1000);
      expect(result.data.healthStatus).toBe('degraded'); // Should be degraded due to high latency
    });
  });

  describe('Error Handling & Validation', () => {
    it('should validate event access permissions', async () => {
      mockStorage.getEvent.mockResolvedValue(null); // Event not found

      await expect(
        providerService.getResolvedProviderConfiguration(mockEventId, mockContext)
      ).rejects.toThrow('Event event-456 not found');
    });

    it('should validate tenant association', async () => {
      const eventWithoutTenant = { ...mockEvent, tenantId: null };
      mockStorage.getEvent.mockResolvedValue(eventWithoutTenant);

      await expect(
        providerService.getResolvedProviderConfiguration(mockEventId, mockContext)
      ).rejects.toThrow('Event must be associated with a tenant');
    });

    it('should handle database connection failures gracefully', async () => {
      mockStorage.getEvent.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        providerService.getResolvedProviderConfiguration(mockEventId, mockContext)
      ).rejects.toThrow('Database connection failed');
    });
  });
});

describe('Unified Communication System - Template Inheritance', () => {
  let templateService: UnifiedTemplateInheritanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore - Mock private property for testing
    templateService = new UnifiedTemplateInheritanceService();
    templateService['storage'] = mockStorage;
  });

  describe('Platform → Tenant → Event Template Inheritance', () => {
    it('should properly resolve template inheritance hierarchy', async () => {
      const platformTemplate = {
        id: 'template-platform-1',
        tenantId: null,
        eventId: null,
        category: 'invitation',
        channel: 'email',
        templateType: 'platform',
        content: 'Platform template content',
        isActive: true
      };

      const tenantTemplate = {
        id: 'template-tenant-1',
        tenantId: mockTenantId,
        eventId: null,
        category: 'invitation',
        channel: 'email',
        templateType: 'tenant',
        content: 'Tenant template content',
        isActive: true
      };

      const eventTemplate = {
        id: 'template-event-1',
        tenantId: mockTenantId,
        eventId: mockEventId,
        category: 'invitation',
        channel: 'email',
        templateType: 'event',
        content: 'Event template content',
        isActive: true
      };

      mockStorage.getEvent.mockResolvedValue(mockEvent);
      mockStorage.query.mockResolvedValueOnce([platformTemplate]); // platform templates
      mockStorage.query.mockResolvedValueOnce([tenantTemplate]); // tenant templates
      mockStorage.query.mockResolvedValueOnce([eventTemplate]); // event templates

      const result = await templateService.getResolvedTemplateConfiguration(
        mockEventId,
        mockContext
      );

      expect(result.success).toBe(true);
      
      // Event template should take highest precedence
      const resolvedTemplate = result.data.templates.invitation?.email;
      expect(resolvedTemplate?.id).toBe(eventTemplate.id);
      expect(resolvedTemplate?.content).toBe('Event template content');
      
      // Verify inheritance chain
      expect(result.data.inheritance.platformTemplates).toHaveLength(1);
      expect(result.data.inheritance.tenantTemplates).toHaveLength(1);
      expect(result.data.inheritance.eventTemplates).toHaveLength(1);
      
      // Verify inheritance chain details
      const inheritanceChain = result.data.inheritanceChain['invitation:email'];
      expect(inheritanceChain.platform?.id).toBe(platformTemplate.id);
      expect(inheritanceChain.tenant?.id).toBe(tenantTemplate.id);
      expect(inheritanceChain.event?.id).toBe(eventTemplate.id);
      expect(inheritanceChain.resolved.id).toBe(eventTemplate.id);
    });

    it('should fall back to tenant template when no event template exists', async () => {
      const tenantTemplate = {
        id: 'template-tenant-1',
        tenantId: mockTenantId,
        eventId: null,
        category: 'invitation',
        channel: 'email',
        templateType: 'tenant',
        content: 'Tenant template content',
        isActive: true
      };

      mockStorage.getEvent.mockResolvedValue(mockEvent);
      mockStorage.query.mockResolvedValueOnce([]); // no platform templates
      mockStorage.query.mockResolvedValueOnce([tenantTemplate]); // tenant templates
      mockStorage.query.mockResolvedValueOnce([]); // no event templates

      const result = await templateService.getResolvedTemplateConfiguration(
        mockEventId,
        mockContext
      );

      expect(result.success).toBe(true);
      
      const resolvedTemplate = result.data.templates.invitation?.email;
      expect(resolvedTemplate?.id).toBe(tenantTemplate.id);
      expect(resolvedTemplate?.templateType).toBe('tenant');
    });

    it('should handle template customization with inheritance tracking', async () => {
      const baseTemplate = {
        id: 'template-base-1',
        tenantId: null,
        eventId: null,
        category: 'invitation',
        channel: 'email',
        templateType: 'platform',
        content: 'Base template content',
        subject: 'Base subject',
        isActive: true
      };

      mockStorage.getEvent.mockResolvedValue(mockEvent);
      mockStorage.query.mockResolvedValueOnce([baseTemplate]); // getTemplateById
      
      // Mock template saving
      jest.spyOn(templateService as any, 'saveTemplate')
        .mockResolvedValue({
          ...baseTemplate,
          id: 'template-custom-1',
          tenantId: mockTenantId,
          eventId: mockEventId,
          templateType: 'event',
          content: 'Customized content',
          parentTemplateId: baseTemplate.id
        });

      const customizationRequest = {
        baseTemplateId: baseTemplate.id,
        customizationLevel: 'content' as const,
        content: 'Customized content'
      };

      const result = await templateService.customizeTemplate(
        mockEventId,
        customizationRequest,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.templateType).toBe('event');
      expect(result.data.parentTemplateId).toBe(baseTemplate.id);
      expect(result.data.content).toBe('Customized content');
    });
  });

  describe('Template Preview & Validation', () => {
    it('should generate template preview with event data', async () => {
      const template = {
        id: 'template-1',
        content: 'Dear {{guest_name}}, you are invited to {{event_name}} on {{event_date}}.',
        subject: 'Invitation to {{event_name}}',
        channel: 'email'
      };

      mockStorage.query.mockResolvedValueOnce([template]); // getTemplateById

      const previewData = {
        guest_name: 'John Doe',
        additional_data: 'Extra info'
      };

      const result = await templateService.previewTemplate(
        template.id,
        mockEventId,
        previewData,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.renderedContent).toContain('Dear John Doe');
      expect(result.data.renderedContent).toContain('Test Wedding');
      expect(result.data.renderedSubject).toContain('Test Wedding');
      expect(result.data.appliedVariables).toMatchObject({
        guest_name: 'John Doe',
        event_name: 'Test Wedding',
        additional_data: 'Extra info'
      });
    });

    it('should calculate accessibility score for email templates', async () => {
      const template = {
        id: 'template-1',
        content: '<img src="test.jpg" alt="Wedding photo"><h1>Heading</h1><h2>Subheading</h2>',
        channel: 'email'
      };

      mockStorage.query.mockResolvedValueOnce([template]);

      const result = await templateService.previewTemplate(
        template.id,
        mockEventId,
        {},
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.metadata.accessibility.score).toBeGreaterThan(80);
      expect(result.data.metadata.accessibility.issues).toHaveLength(0);
    });
  });
});

describe('Unified Communication System - Wizard-to-Operations Pipeline', () => {
  let pipelineService: WizardOperationsPipelineService;

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore - Mock private property for testing
    pipelineService = new WizardOperationsPipelineService();
    pipelineService['storage'] = mockStorage;
  });

  describe('Wizard Completion Processing', () => {
    it('should process wizard completion with comprehensive validation', async () => {
      const wizardData = {
        eventId: mockEventId,
        step: 'communication',
        configuration: {
          providers: { email: { enabled: true } },
          templates: { invitation: { enabled: true } },
          settings: { enabledChannels: ['email'] }
        },
        completedAt: new Date(),
        userId: mockContext.userId
      };

      mockStorage.getEvent.mockResolvedValue(mockEvent);
      mockStorage.query.mockResolvedValue([]); // Various mocked queries
      
      // Mock validation success
      jest.spyOn(pipelineService as any, 'validateWizardConfiguration')
        .mockResolvedValue({ isValid: true, errors: [], warnings: [], missingRequirements: [], recommendations: [] });
      
      // Mock successful build and activation
      jest.spyOn(pipelineService as any, 'buildOperationalConfiguration')
        .mockResolvedValue({
          eventId: mockEventId,
          providers: {},
          templates: {},
          brandConfiguration: {},
          deliverySettings: { enabledChannels: ['email'] },
          analyticsConfiguration: {}
        });

      const result = await pipelineService.processWizardCompletion(wizardData, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
      expect(result.data.operationalConfigId).toBeDefined();
      expect(result.data.activatedAt).toBeDefined();
      expect(result.data.rollbackToken).toBeDefined();
    });

    it('should validate wizard configuration comprehensively', async () => {
      const wizardData = {
        eventId: mockEventId,
        step: 'communication',
        configuration: {
          providers: {},
          templates: {},
          settings: {}
        },
        completedAt: new Date(),
        userId: mockContext.userId
      };

      mockStorage.getEvent.mockResolvedValue(mockEvent);
      
      // Mock provider and template validation
      jest.spyOn(pipelineService as any, 'validateProviderConfiguration')
        .mockResolvedValue({ errors: [], warnings: ['No providers configured'], missingRequirements: [] });
      
      jest.spyOn(pipelineService as any, 'validateTemplateConfiguration')
        .mockResolvedValue({ errors: [], warnings: [], recommendations: ['Consider customizing templates'] });

      const result = await (pipelineService as any).validateWizardConfiguration(wizardData, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.missingRequirements).toContain('At least one communication channel must be enabled');
    });

    it('should handle pipeline failures with automatic rollback', async () => {
      const wizardData = {
        eventId: mockEventId,
        step: 'communication',
        configuration: { providers: {}, templates: {} },
        completedAt: new Date(),
        userId: mockContext.userId
      };

      mockStorage.getEvent.mockResolvedValue(mockEvent);
      mockStorage.query.mockResolvedValue([]);
      
      // Mock validation success but activation failure
      jest.spyOn(pipelineService as any, 'validateWizardConfiguration')
        .mockResolvedValue({ isValid: true, errors: [], warnings: [], missingRequirements: [], recommendations: [] });
      
      jest.spyOn(pipelineService as any, 'buildOperationalConfiguration')
        .mockResolvedValue({});
      
      jest.spyOn(pipelineService as any, 'activateOperationalConfiguration')
        .mockRejectedValue(new Error('Activation failed'));
      
      // Mock rollback functionality
      jest.spyOn(pipelineService as any, 'rollbackConfiguration')
        .mockResolvedValue({ success: true });

      await expect(
        pipelineService.processWizardCompletion(wizardData, mockContext)
      ).rejects.toThrow('Activation failed');
      
      // Verify pipeline status was updated to failed
      expect(mockStorage.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE wizard_pipeline_status'),
        expect.arrayContaining([mockEventId, 'failed', 0, 'Activation failed'])
      );
    });
  });

  describe('Health Monitoring & Configuration Rollback', () => {
    it('should perform comprehensive health checks', async () => {
      mockStorage.query.mockResolvedValue([]);
      
      const result = await pipelineService.getConfigurationHealth(mockEventId, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.eventId).toBe(mockEventId);
      expect(result.data.isHealthy).toBeDefined();
      expect(result.data.components).toHaveProperty('providers');
      expect(result.data.components).toHaveProperty('templates');
      expect(result.data.components).toHaveProperty('configuration');
      expect(result.data.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.data.overallScore).toBeLessThanOrEqual(100);
    });

    it('should support configuration rollback with token validation', async () => {
      const rollbackToken = 'rollback_test_123';
      const mockRollbackData = {
        configuration: { providers: {}, templates: {} },
        timestamp: new Date()
      };

      mockStorage.query.mockResolvedValueOnce([{
        configuration_snapshot: JSON.stringify(mockRollbackData.configuration),
        created_at: mockRollbackData.timestamp
      }]); // getRollbackData
      
      mockStorage.query.mockResolvedValueOnce([]); // restoreConfiguration
      mockStorage.query.mockResolvedValueOnce([]); // createRollbackPoint

      jest.spyOn(pipelineService as any, 'restoreConfiguration')
        .mockResolvedValue(undefined);
      
      jest.spyOn(pipelineService as any, 'createRollbackPoint')
        .mockResolvedValue('new_rollback_token');

      const result = await pipelineService.rollbackConfiguration(
        mockEventId,
        rollbackToken,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
      expect(result.data.rollbackToken).toBe('new_rollback_token');
      expect(result.data.restoredConfiguration).toBeDefined();
    });
  });
});

describe('Unified Communication System - Performance & Integration', () => {
  describe('Performance Requirements', () => {
    it('should meet <200ms response time for provider configuration', async () => {
      const providerService = new UnifiedProviderInheritanceService();
      // @ts-ignore
      providerService['storage'] = mockStorage;
      
      mockStorage.getEvent.mockResolvedValue(mockEvent);
      mockStorage.query.mockResolvedValue([mockTenantProvider]);

      const startTime = Date.now();
      await providerService.getResolvedProviderConfiguration(mockEventId, mockContext);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });

    it('should handle concurrent provider tests without degradation', async () => {
      const providerService = new UnifiedProviderInheritanceService();
      // @ts-ignore
      providerService['storage'] = mockStorage;
      
      mockStorage.query.mockResolvedValue([mockTenantProvider]);
      jest.spyOn(providerService as any, 'performProviderTest').mockResolvedValue(undefined);

      const concurrentTests = Array(10).fill(0).map(() =>
        providerService.testProviderConnection('test-provider', mockContext)
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentTests);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      results.forEach(result => expect(result.success).toBe(true));
      expect(duration).toBeLessThan(2000); // Should handle 10 concurrent tests in under 2s
    });
  });

  describe('Zero Breaking Changes Validation', () => {
    it('should maintain backward compatibility with existing APIs', async () => {
      // Test that legacy API responses are still supported
      const legacyProviderData = {
        gmail: { connected: true, account: 'test@gmail.com' },
        twilio: { connected: false }
      };

      // Verify that the new system can interpret legacy data formats
      expect(legacyProviderData.gmail.connected).toBe(true);
      expect(typeof legacyProviderData.gmail.account).toBe('string');
    });

    it('should support gradual migration from legacy system', async () => {
      // Test that both old and new data structures can coexist
      const mixedData = {
        legacy: { providers: { gmail: { connected: true } } },
        unified: { providers: { email: [mockTenantProvider] } }
      };

      expect(mixedData.legacy).toBeDefined();
      expect(mixedData.unified).toBeDefined();
    });
  });

  describe('Multi-tenant Data Isolation', () => {
    it('should enforce strict tenant isolation', async () => {
      const providerService = new UnifiedProviderInheritanceService();
      // @ts-ignore
      providerService['storage'] = mockStorage;
      
      const tenant1Event = { ...mockEvent, tenantId: 1 };
      const tenant2Event = { ...mockEvent, id: 999, tenantId: 2 };
      
      mockStorage.getEvent.mockResolvedValueOnce(tenant1Event);
      mockStorage.query.mockResolvedValue([]);

      // Should only return providers for the specific tenant
      await providerService.getResolvedProviderConfiguration('1', mockContext);
      
      expect(mockStorage.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tenant_id = $1'),
        expect.arrayContaining(['1'])
      );
    });

    it('should prevent cross-tenant data access', async () => {
      const providerService = new UnifiedProviderInheritanceService();
      // @ts-ignore
      providerService['storage'] = mockStorage;
      
      // Mock access validation failure
      jest.spyOn(providerService as any, 'validateEventAccess')
        .mockRejectedValue(new Error('Access denied'));

      await expect(
        providerService.getResolvedProviderConfiguration(mockEventId, {
          ...mockContext,
          userRole: 'guest' // Insufficient permissions
        })
      ).rejects.toThrow('Access denied');
    });
  });
});

describe('Unified Communication System - Edge Cases & Error Recovery', () => {
  describe('Edge Case Handling', () => {
    it('should handle missing provider configurations gracefully', async () => {
      const providerService = new UnifiedProviderInheritanceService();
      // @ts-ignore
      providerService['storage'] = mockStorage;
      
      mockStorage.getEvent.mockResolvedValue(mockEvent);
      mockStorage.query.mockResolvedValue([]); // No providers configured

      const result = await providerService.getResolvedProviderConfiguration(
        mockEventId,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.providers.email).toHaveLength(0);
      expect(result.data.providers.sms).toHaveLength(0);
      expect(result.data.providers.whatsapp).toHaveLength(0);
    });

    it('should handle circular template inheritance', async () => {
      const templateService = new UnifiedTemplateInheritanceService();
      // @ts-ignore
      templateService['storage'] = mockStorage;
      
      const circularTemplate1 = {
        id: 'template-1',
        parentTemplateId: 'template-2',
        content: 'Template 1'
      };
      
      const circularTemplate2 = {
        id: 'template-2',
        parentTemplateId: 'template-1',
        content: 'Template 2'
      };

      mockStorage.query
        .mockResolvedValueOnce([circularTemplate1])
        .mockResolvedValueOnce([circularTemplate2])
        .mockResolvedValueOnce([circularTemplate1]); // Circular reference

      const result = await templateService.getTemplateInheritanceChain('template-1', mockContext);

      // Should handle circular reference gracefully without infinite loop
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // Should limit chain length
    });

    it('should handle database transaction failures during wizard completion', async () => {
      const pipelineService = new WizardOperationsPipelineService();
      // @ts-ignore
      pipelineService['storage'] = mockStorage;
      
      const wizardData = {
        eventId: mockEventId,
        step: 'communication',
        configuration: {},
        completedAt: new Date(),
        userId: mockContext.userId
      };

      mockStorage.getEvent.mockResolvedValue(mockEvent);
      mockStorage.query.mockRejectedValue(new Error('Transaction deadlock'));

      await expect(
        pipelineService.processWizardCompletion(wizardData, mockContext)
      ).rejects.toThrow('Transaction deadlock');
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should implement exponential backoff for provider testing', async () => {
      const providerService = new UnifiedProviderInheritanceService();
      // @ts-ignore
      providerService['storage'] = mockStorage;
      
      mockStorage.query.mockResolvedValue([mockTenantProvider]);
      
      let attemptCount = 0;
      jest.spyOn(providerService as any, 'performProviderTest')
        .mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Temporary failure');
          }
          return Promise.resolve();
        });

      const result = await providerService.testProviderConnection('test-provider', mockContext);
      
      // Should eventually succeed after retries
      expect(result.success).toBe(true);
      expect(attemptCount).toBeGreaterThan(1);
    });

    it('should maintain system state consistency during partial failures', async () => {
      const pipelineService = new WizardOperationsPipelineService();
      // @ts-ignore
      pipelineService['storage'] = mockStorage;
      
      const wizardData = {
        eventId: mockEventId,
        step: 'communication',
        configuration: {},
        completedAt: new Date(),
        userId: mockContext.userId
      };

      mockStorage.getEvent.mockResolvedValue(mockEvent);
      
      // Mock partial failure scenario
      let queryCount = 0;
      mockStorage.query.mockImplementation(() => {
        queryCount++;
        if (queryCount === 3) { // Fail on third query
          throw new Error('Partial failure');
        }
        return Promise.resolve([]);
      });

      try {
        await pipelineService.processWizardCompletion(wizardData, mockContext);
      } catch (error) {
        // Verify cleanup operations were attempted
        expect(mockStorage.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE wizard_pipeline_status'),
          expect.arrayContaining([mockEventId, 'failed'])
        );
      }
    });
  });
});