/**
 * Unified Communication API v2
 * Enterprise-grade communication system with inheritance support
 * Backward compatible with existing v1 endpoints
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { APIResponseBuilder } from '../versioning';
import { enhancedAuthMiddleware, requirePermission } from '../../middleware/enhanced-security';
import { createValidationMiddleware } from '../versioning';
import { UnifiedProviderInheritanceService } from '../../services/unified-provider-inheritance';
import { UnifiedTemplateInheritanceService } from '../../services/unified-template-inheritance';
import { WizardOperationsPipelineService } from '../../services/wizard-operations-pipeline';

const router = Router();

// Initialize services
const providerService = new UnifiedProviderInheritanceService();
const templateService = new UnifiedTemplateInheritanceService();
const pipelineService = new WizardOperationsPipelineService();

// Validation Schemas
const ScopeParamSchema = z.object({
  params: z.object({
    scope: z.enum(['tenant', 'event']),
    scopeId: z.string().uuid()
  })
});

const ProviderConfigSchema = z.object({
  body: z.object({
    providerType: z.enum(['email', 'sms', 'whatsapp']),
    providerName: z.enum(['gmail', 'outlook', 'brevo', 'mailchimp', 'sendgrid', 'custom_smtp', 'twilio', 'whatsapp_business', 'whatsapp_web']),
    configuration: z.record(z.any()),
    credentials: z.record(z.any()).optional(),
    priority: z.number().min(1).max(1000).default(100),
    isActive: z.boolean().default(true)
  })
});

const TemplateCustomizationSchema = z.object({
  body: z.object({
    baseTemplateId: z.string().uuid(),
    customizationLevel: z.enum(['none', 'content', 'design', 'full']),
    content: z.string().optional(),
    subject: z.string().optional(),
    designSettings: z.record(z.any()).optional(),
    brandAssets: z.record(z.any()).optional(),
    variables: z.array(z.string()).optional()
  })
});

const TemplatePreviewSchema = z.object({
  body: z.object({
    templateId: z.string().uuid(),
    previewData: z.record(z.any()).default({})
  })
});

const WizardCompletionSchema = z.object({
  body: z.object({
    step: z.string(),
    configuration: z.object({
      providers: z.record(z.any()).optional(),
      templates: z.record(z.any()).optional(),
      brandAssets: z.record(z.any()).optional(),
      settings: z.record(z.any()).optional()
    })
  })
});

// Apply authentication to all routes
router.use(enhancedAuthMiddleware);

// =====================================================================================
// PROVIDER MANAGEMENT ENDPOINTS
// =====================================================================================

/**
 * GET /v2/communication/providers/:scope/:scopeId
 * Get resolved provider configuration with inheritance
 */
router.get(
  '/providers/:scope/:scopeId',
  requirePermission('communication:read'),
  createValidationMiddleware(ScopeParamSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { scope, scopeId } = req.params;
      const { includeHealthStatus, providerTypes } = req.query;
      
      const context = {
        userId: (req.user as any).id,
        userRole: (req.user as any).role,
        requestId: req.headers['x-request-id'] as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      let result;

      if (scope === 'event') {
        result = await providerService.getResolvedProviderConfiguration(
          scopeId,
          context,
          {
            includeHealthStatus: includeHealthStatus === 'true',
            providerTypes: providerTypes ? (providerTypes as string).split(',') as any : undefined
          }
        );
      } else if (scope === 'tenant') {
        // Get tenant-level providers only
        result = await providerService.getResolvedProviderConfiguration(
          scopeId, // This would need to be adapted for tenant-only lookup
          context,
          {
            includeTenantDefaults: true,
            includeEventOverrides: false,
            includeHealthStatus: includeHealthStatus === 'true'
          }
        );
      }

      if (result?.success) {
        res.status(200).json(responseBuilder.success(result.data));
      } else {
        res.status(500).json(responseBuilder.error(
          'PROVIDER_CONFIG_ERROR',
          'Failed to retrieve provider configuration',
          result?.error
        ));
      }
      
    } catch (error) {
      console.error('❌ Failed to get provider configuration:', error);
      res.status(500).json(responseBuilder.error(
        'PROVIDER_CONFIG_ERROR',
        'Failed to retrieve provider configuration',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * POST /v2/communication/providers/:scope/:scopeId
 * Create or update provider configuration
 */
router.post(
  '/providers/:scope/:scopeId',
  requirePermission('communication:write'),
  createValidationMiddleware(ScopeParamSchema),
  createValidationMiddleware(ProviderConfigSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { scope, scopeId } = req.params;
      const providerConfig = req.body;
      
      const context = {
        userId: (req.user as any).id,
        userRole: (req.user as any).role,
        requestId: req.headers['x-request-id'] as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      let result;

      if (scope === 'tenant') {
        result = await providerService.setTenantDefaultProvider(
          scopeId,
          providerConfig,
          context
        );
      } else if (scope === 'event') {
        result = await providerService.setEventOverrideProvider(
          scopeId,
          providerConfig,
          context
        );
      }

      if (result?.success) {
        res.status(201).json(responseBuilder.success(result.data));
      } else {
        res.status(400).json(responseBuilder.error(
          'PROVIDER_CONFIG_ERROR',
          'Failed to configure provider',
          result?.error
        ));
      }
      
    } catch (error) {
      console.error('❌ Failed to configure provider:', error);
      res.status(400).json(responseBuilder.error(
        'PROVIDER_CONFIG_ERROR',
        'Failed to configure provider',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * POST /v2/communication/providers/:scope/:scopeId/:providerId/test
 * Test provider connection in real-time
 */
router.post(
  '/providers/:scope/:scopeId/:providerId/test',
  requirePermission('communication:test'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { providerId } = req.params;
      
      const context = {
        userId: (req.user as any).id,
        userRole: (req.user as any).role,
        requestId: req.headers['x-request-id'] as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const result = await providerService.testProviderConnection(providerId, context);

      if (result.success) {
        res.status(200).json(responseBuilder.success(result.data));
      } else {
        res.status(400).json(responseBuilder.error(
          'PROVIDER_TEST_ERROR',
          'Provider test failed',
          result.error
        ));
      }
      
    } catch (error) {
      console.error('❌ Provider test failed:', error);
      res.status(500).json(responseBuilder.error(
        'PROVIDER_TEST_ERROR',
        'Provider test failed',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// =====================================================================================
// TEMPLATE MANAGEMENT ENDPOINTS
// =====================================================================================

/**
 * GET /v2/communication/templates/:scope/:scopeId
 * Get resolved template configuration with inheritance
 */
router.get(
  '/templates/:scope/:scopeId',
  requirePermission('communication:read'),
  createValidationMiddleware(ScopeParamSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { scope, scopeId } = req.params;
      const { categories, channels, includePlatform, includeTenant, includeEvent } = req.query;
      
      const context = {
        userId: (req.user as any).id,
        userRole: (req.user as any).role,
        requestId: req.headers['x-request-id'] as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const options = {
        categories: categories ? (categories as string).split(',') as any : undefined,
        channels: channels ? (channels as string).split(',') as any : undefined,
        includePlatformTemplates: includePlatform !== 'false',
        includeTenantTemplates: includeTenant !== 'false',
        includeEventTemplates: includeEvent !== 'false'
      };

      let result;

      if (scope === 'event') {
        result = await templateService.getResolvedTemplateConfiguration(
          scopeId,
          context,
          options
        );
      }

      if (result?.success) {
        res.status(200).json(responseBuilder.success(result.data));
      } else {
        res.status(500).json(responseBuilder.error(
          'TEMPLATE_CONFIG_ERROR',
          'Failed to retrieve template configuration',
          result?.error
        ));
      }
      
    } catch (error) {
      console.error('❌ Failed to get template configuration:', error);
      res.status(500).json(responseBuilder.error(
        'TEMPLATE_CONFIG_ERROR',
        'Failed to retrieve template configuration',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * POST /v2/communication/templates/:scope/:scopeId/customize
 * Customize template with inheritance
 */
router.post(
  '/templates/:scope/:scopeId/customize',
  requirePermission('communication:write'),
  createValidationMiddleware(ScopeParamSchema),
  createValidationMiddleware(TemplateCustomizationSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { scope, scopeId } = req.params;
      const customizationRequest = req.body;
      
      const context = {
        userId: (req.user as any).id,
        userRole: (req.user as any).role,
        requestId: req.headers['x-request-id'] as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      let result;

      if (scope === 'event') {
        result = await templateService.customizeTemplate(
          scopeId,
          customizationRequest,
          context
        );
      }

      if (result?.success) {
        res.status(201).json(responseBuilder.success(result.data));
      } else {
        res.status(400).json(responseBuilder.error(
          'TEMPLATE_CUSTOMIZATION_ERROR',
          'Failed to customize template',
          result?.error
        ));
      }
      
    } catch (error) {
      console.error('❌ Failed to customize template:', error);
      res.status(400).json(responseBuilder.error(
        'TEMPLATE_CUSTOMIZATION_ERROR',
        'Failed to customize template',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * POST /v2/communication/templates/:scope/:scopeId/preview
 * Preview template with actual event data
 */
router.post(
  '/templates/:scope/:scopeId/preview',
  requirePermission('communication:read'),
  createValidationMiddleware(ScopeParamSchema),
  createValidationMiddleware(TemplatePreviewSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { scope, scopeId } = req.params;
      const { templateId, previewData } = req.body;
      
      const context = {
        userId: (req.user as any).id,
        userRole: (req.user as any).role,
        requestId: req.headers['x-request-id'] as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      let result;

      if (scope === 'event') {
        result = await templateService.previewTemplate(
          templateId,
          scopeId,
          previewData,
          context
        );
      }

      if (result?.success) {
        res.status(200).json(responseBuilder.success(result.data));
      } else {
        res.status(400).json(responseBuilder.error(
          'TEMPLATE_PREVIEW_ERROR',
          'Failed to preview template',
          result?.error
        ));
      }
      
    } catch (error) {
      console.error('❌ Failed to preview template:', error);
      res.status(400).json(responseBuilder.error(
        'TEMPLATE_PREVIEW_ERROR',
        'Failed to preview template',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /v2/communication/templates/:templateId/inheritance
 * Get template inheritance chain
 */
router.get(
  '/templates/:templateId/inheritance',
  requirePermission('communication:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { templateId } = req.params;
      
      const context = {
        userId: (req.user as any).id,
        userRole: (req.user as any).role,
        requestId: req.headers['x-request-id'] as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const result = await templateService.getTemplateInheritanceChain(templateId, context);

      if (result.success) {
        res.status(200).json(responseBuilder.success(result.data));
      } else {
        res.status(404).json(responseBuilder.error(
          'TEMPLATE_NOT_FOUND',
          'Template not found or access denied',
          result.error
        ));
      }
      
    } catch (error) {
      console.error('❌ Failed to get template inheritance:', error);
      res.status(500).json(responseBuilder.error(
        'TEMPLATE_INHERITANCE_ERROR',
        'Failed to retrieve template inheritance',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// =====================================================================================
// WIZARD INTEGRATION ENDPOINTS
// =====================================================================================

/**
 * POST /v2/communication/wizard/:eventId/complete
 * Process wizard completion and activate operational configuration
 */
router.post(
  '/wizard/:eventId/complete',
  requirePermission('communication:write'),
  createValidationMiddleware(WizardCompletionSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      const { step, configuration } = req.body;
      
      const context = {
        userId: (req.user as any).id,
        userRole: (req.user as any).role,
        requestId: req.headers['x-request-id'] as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const wizardData = {
        eventId,
        step,
        configuration,
        completedAt: new Date(),
        userId: context.userId
      };

      const result = await pipelineService.processWizardCompletion(wizardData, context);

      if (result.success) {
        res.status(200).json(responseBuilder.success(result.data));
      } else {
        res.status(400).json(responseBuilder.error(
          'WIZARD_COMPLETION_ERROR',
          'Failed to process wizard completion',
          result.error
        ));
      }
      
    } catch (error) {
      console.error('❌ Wizard completion failed:', error);
      res.status(500).json(responseBuilder.error(
        'WIZARD_COMPLETION_ERROR',
        'Failed to process wizard completion',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /v2/communication/wizard/:eventId/status
 * Get wizard-to-operations pipeline status
 */
router.get(
  '/wizard/:eventId/status',
  requirePermission('communication:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      
      const context = {
        userId: (req.user as any).id,
        userRole: (req.user as any).role,
        requestId: req.headers['x-request-id'] as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const result = await pipelineService.getPipelineStatus(eventId, context);

      if (result.success) {
        res.status(200).json(responseBuilder.success(result.data));
      } else {
        res.status(404).json(responseBuilder.error(
          'PIPELINE_STATUS_NOT_FOUND',
          'Pipeline status not found',
          result.error
        ));
      }
      
    } catch (error) {
      console.error('❌ Failed to get pipeline status:', error);
      res.status(500).json(responseBuilder.error(
        'PIPELINE_STATUS_ERROR',
        'Failed to retrieve pipeline status',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// =====================================================================================
// HEALTH & MONITORING ENDPOINTS
// =====================================================================================

/**
 * GET /v2/communication/health/:eventId
 * Get comprehensive health status for event communication configuration
 */
router.get(
  '/health/:eventId',
  requirePermission('communication:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      
      const context = {
        userId: (req.user as any).id,
        userRole: (req.user as any).role,
        requestId: req.headers['x-request-id'] as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const result = await pipelineService.getConfigurationHealth(eventId, context);

      if (result.success) {
        res.status(200).json(responseBuilder.success(result.data));
      } else {
        res.status(404).json(responseBuilder.error(
          'HEALTH_CHECK_ERROR',
          'Failed to retrieve health status',
          result.error
        ));
      }
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      res.status(500).json(responseBuilder.error(
        'HEALTH_CHECK_ERROR',
        'Failed to retrieve health status',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * POST /v2/communication/rollback/:eventId
 * Rollback configuration to previous state
 */
router.post(
  '/rollback/:eventId',
  requirePermission('communication:admin'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      const { rollbackToken } = req.body;
      
      if (!rollbackToken) {
        return res.status(400).json(responseBuilder.error(
          'MISSING_ROLLBACK_TOKEN',
          'Rollback token is required'
        ));
      }
      
      const context = {
        userId: (req.user as any).id,
        userRole: (req.user as any).role,
        requestId: req.headers['x-request-id'] as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const result = await pipelineService.rollbackConfiguration(eventId, rollbackToken, context);

      if (result.success) {
        res.status(200).json(responseBuilder.success(result.data));
      } else {
        res.status(400).json(responseBuilder.error(
          'ROLLBACK_ERROR',
          'Failed to rollback configuration',
          result.error
        ));
      }
      
    } catch (error) {
      console.error('❌ Configuration rollback failed:', error);
      res.status(500).json(responseBuilder.error(
        'ROLLBACK_ERROR',
        'Failed to rollback configuration',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }  
  }
);

// =====================================================================================
// BACKWARD COMPATIBILITY ENDPOINTS
// =====================================================================================

/**
 * GET /v2/communication/legacy/provider-status/:eventId
 * Backward compatibility endpoint for existing provider status queries
 */
router.get(
  '/legacy/provider-status/:eventId',
  requirePermission('communication:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      
      // Query the legacy view for backward compatibility
      const query = `SELECT providers FROM provider_status_legacy WHERE event_id = $1`;
      const results = await providerService.storage.query(query, [parseInt(eventId)]);
      
      if (results.length > 0) {
        res.status(200).json(responseBuilder.success(results[0].providers));
      } else {
        res.status(404).json(responseBuilder.error(
          'PROVIDER_STATUS_NOT_FOUND',
          'Provider status not found for event'
        ));
      }
      
    } catch (error) {
      console.error('❌ Legacy provider status failed:', error);
      res.status(500).json(responseBuilder.error(
        'LEGACY_PROVIDER_ERROR',
        'Failed to retrieve legacy provider status',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Health Check Endpoint
router.get('/health', (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    res.status(200).json(responseBuilder.success({
      service: 'unified-communication-api-v2',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      features: [
        'provider-inheritance',
        'template-inheritance',
        'wizard-integration',
        'real-time-testing',
        'health-monitoring',
        'rollback-support',
        'backward-compatibility'
      ],
      inheritance: {
        providerModel: 'tenant-to-event',
        templateModel: 'platform-to-tenant-to-event',
        platformIndependent: true
      }
    }));
  } catch (error) {
    res.status(503).json(responseBuilder.error(
      'SERVICE_UNAVAILABLE',
      'Unified communication API v2 service not available',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

// Export router factory
export function createUnifiedCommunicationAPIv2(): Router {
  return router;
}

// Export for use in main API registration
export default router;