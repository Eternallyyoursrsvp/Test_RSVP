/**
 * Unified Template Inheritance Service
 * Implements Platform Compliance → Tenant → Event inheritance model
 * Enterprise SAAS Standard with comprehensive template management
 */

import { BaseService, ServiceContext, ServiceResult, createServiceResult } from './base-service';
import { NotFoundError, ValidationError, ConflictError } from '../lib/response-builder';

// Core Template Types with Platform Independence
export type TemplateChannel = 'email' | 'sms' | 'whatsapp';
export type TemplateCategory = 
  | 'welcome' | 'save_the_date' | 'invitation' | 'rsvp_confirmation' 
  | 'rsvp_reminder' | 'event_updates' | 'travel_info' | 'accommodation'
  | 'ceremony_details' | 'thank_you';
export type TemplateType = 'platform' | 'tenant' | 'event';
export type CustomizationLevel = 'none' | 'content' | 'design' | 'full';

export interface UnifiedTemplateConfig {
  id: string;
  parentTemplateId?: string; // For inheritance chain
  tenantId?: string; // NULL for platform templates
  eventId?: string; // NULL for platform/tenant templates
  category: TemplateCategory;
  channel: TemplateChannel;
  name: string;
  subject?: string; // For email templates
  content: string;
  variables: string[]; // Template variable placeholders
  designSettings: {
    primaryColor?: string;
    accentColor?: string;
    headerFont?: string;
    bodyFont?: string;
    layout?: string;
    [key: string]: any;
  };
  brandAssets: {
    logoUrl?: string;
    bannerUrl?: string;
    footerText?: string;
    socialLinks?: Record<string, string>;
    [key: string]: any;
  };
  metadata: {
    description?: string;
    tags?: string[];
    usage?: string;
    [key: string]: any;
  };
  templateType: TemplateType;
  customizationLevel: CustomizationLevel;
  isActive: boolean;
  version: number;
  createdBy?: string; // NULL for platform templates
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedTemplateConfig {
  eventId: string;
  templates: {
    [category in TemplateCategory]?: {
      [channel in TemplateChannel]?: UnifiedTemplateConfig;
    };
  };
  inheritance: {
    platformTemplates: UnifiedTemplateConfig[];
    tenantTemplates: UnifiedTemplateConfig[];
    eventTemplates: UnifiedTemplateConfig[];
  };
  inheritanceChain: {
    [templateKey: string]: {
      platform?: UnifiedTemplateConfig;
      tenant?: UnifiedTemplateConfig;
      event?: UnifiedTemplateConfig;
      resolved: UnifiedTemplateConfig;
    };
  };
}

export interface TemplateInheritanceOptions {
  includePlatformTemplates?: boolean;
  includeTenantTemplates?: boolean;
  includeEventTemplates?: boolean;
  categories?: TemplateCategory[];
  channels?: TemplateChannel[];
  includeInactive?: boolean;
}

export interface TemplateCustomizationRequest {
  baseTemplateId: string;
  customizationLevel: CustomizationLevel;
  content?: string;
  subject?: string;
  designSettings?: Record<string, any>;
  brandAssets?: Record<string, any>;
  variables?: string[];
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  variableIssues: {
    missing: string[];
    unused: string[];
    invalid: string[];
  };
}

export interface TemplatePreviewResult {
  renderedContent: string;
  renderedSubject?: string;
  appliedVariables: Record<string, string>;
  designPreview: {
    css: string;
    html: string;
  };
  metadata: {
    estimatedSize: number;
    renderTime: number;
    accessibility: {
      score: number;
      issues: string[];
    };
  };
}

/**
 * Enterprise Template Inheritance Service
 * Implements Platform → Tenant → Event inheritance with comprehensive template management
 */
export class UnifiedTemplateInheritanceService extends BaseService {

  /**
   * Get resolved template configuration for an event
   * Implements inheritance: Platform Compliance → Tenant Defaults → Event Customizations
   */
  async getResolvedTemplateConfiguration(
    eventId: string,
    context: ServiceContext,
    options: TemplateInheritanceOptions = {}
  ): Promise<ServiceResult<ResolvedTemplateConfig>> {
    try {
      this.logOperation('getResolvedTemplateConfiguration', 'template_inheritance', eventId, { context, options });

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

      // Get templates at each inheritance level
      const platformTemplates = await this.getPlatformTemplates(options);
      const tenantTemplates = await this.getTenantTemplates(tenantId, options);
      const eventTemplates = await this.getEventTemplates(eventId, options);

      // Resolve inheritance hierarchy for each category-channel combination
      const { resolvedTemplates, inheritanceChain } = this.resolveTemplateInheritance(
        platformTemplates,
        tenantTemplates,
        eventTemplates
      );

      // Organize templates by category and channel
      const templates = this.organizeTemplatesByCategory(resolvedTemplates);

      const result: ResolvedTemplateConfig = {
        eventId,
        templates,
        inheritance: {
          platformTemplates,
          tenantTemplates,
          eventTemplates,
        },
        inheritanceChain
      };

      return createServiceResult({
        success: true,
        data: result,
        operation: 'getResolvedTemplateConfiguration',
        resourceType: 'template_inheritance',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('getResolvedTemplateConfiguration', error as Error, { context, eventId, options });
      throw error;
    }
  }

  /**
   * Customize a template for a specific tenant or event
   */
  async customizeTemplate(
    eventId: string,
    customizationRequest: TemplateCustomizationRequest,
    context: ServiceContext
  ): Promise<ServiceResult<UnifiedTemplateConfig>> {
    try {
      this.logOperation('customizeTemplate', 'template_customization', eventId, { context, customizationRequest });

      const event = await this.storage.getEvent(parseInt(eventId));
      if (!event) {
        throw new NotFoundError(`Event ${eventId} not found`);
      }

      await this.validateEventAccess(parseInt(eventId), context.userId, context.userRole);

      // Get the base template
      const baseTemplate = await this.getTemplateById(customizationRequest.baseTemplateId);
      if (!baseTemplate) {
        throw new NotFoundError(`Base template ${customizationRequest.baseTemplateId} not found`);
      }

      // Validate customization request
      const validation = await this.validateTemplateCustomization(baseTemplate, customizationRequest);
      if (!validation.isValid) {
        throw new ValidationError(`Invalid template customization: ${validation.errors.join(', ')}`);
      }

      // Create event-level template customization
      const customizedTemplate = this.buildCustomizedTemplate(
        baseTemplate,
        customizationRequest,
        event.tenantId?.toString()!,
        eventId,
        context.userId
      );

      // Save the customized template
      const savedTemplate = await this.saveTemplate(customizedTemplate);

      return createServiceResult({
        success: true,
        data: savedTemplate,
        operation: 'customizeTemplate',
        resourceType: 'template_customization',
        resourceId: savedTemplate.id
      });

    } catch (error) {
      this.logError('customizeTemplate', error as Error, { context, eventId, customizationRequest });
      throw error;
    }
  }

  /**
   * Preview template with actual event data
   */
  async previewTemplate(
    templateId: string,
    eventId: string,
    previewData: Record<string, any>,
    context: ServiceContext
  ): Promise<ServiceResult<TemplatePreviewResult>> {
    try {
      this.logOperation('previewTemplate', 'template_preview', templateId, { context, eventId });

      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new NotFoundError(`Template ${templateId} not found`);
      }

      await this.validateEventAccess(parseInt(eventId), context.userId, context.userRole);

      // Get event data for variable resolution
      const event = await this.storage.getEvent(parseInt(eventId));
      const eventData = await this.buildEventDataForPreview(event, previewData);

      // Render template with variables
      const startTime = Date.now();
      const renderedContent = await this.renderTemplateContent(template.content, eventData);
      const renderedSubject = template.subject 
        ? await this.renderTemplateContent(template.subject, eventData)
        : undefined;

      // Generate design preview
      const designPreview = await this.generateDesignPreview(template, eventData);

      // Calculate accessibility score
      const accessibility = await this.calculateAccessibilityScore(renderedContent, template.channel);

      const renderTime = Date.now() - startTime;

      const previewResult: TemplatePreviewResult = {
        renderedContent,
        renderedSubject,
        appliedVariables: eventData,
        designPreview,
        metadata: {
          estimatedSize: Buffer.byteLength(renderedContent, 'utf8'),
          renderTime,
          accessibility
        }
      };

      return createServiceResult({
        success: true,
        data: previewResult,
        operation: 'previewTemplate',
        resourceType: 'template_preview',
        resourceId: templateId
      });

    } catch (error) {
      this.logError('previewTemplate', error as Error, { context, templateId, eventId });
      throw error;
    }
  }

  /**
   * Get template inheritance chain for a specific template
   */
  async getTemplateInheritanceChain(
    templateId: string,
    context: ServiceContext
  ): Promise<ServiceResult<UnifiedTemplateConfig[]>> {
    try {
      this.logOperation('getTemplateInheritanceChain', 'template_chain', templateId, { context });

      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new NotFoundError(`Template ${templateId} not found`);
      }

      const inheritanceChain: UnifiedTemplateConfig[] = [];
      let currentTemplate = template;

      // Walk up the inheritance chain
      while (currentTemplate) {
        inheritanceChain.unshift(currentTemplate);
        
        if (currentTemplate.parentTemplateId) {
          const parentTemplate = await this.getTemplateById(currentTemplate.parentTemplateId);
          currentTemplate = parentTemplate;
        } else {
          break;
        }
      }

      return createServiceResult({
        success: true,
        data: inheritanceChain,
        operation: 'getTemplateInheritanceChain',
        resourceType: 'template_chain',
        resourceId: templateId
      });

    } catch (error) {
      this.logError('getTemplateInheritanceChain', error as Error, { context, templateId });
      throw error;
    }
  }

  // Private helper methods

  /**
   * Get platform compliance templates
   */
  private async getPlatformTemplates(options: TemplateInheritanceOptions): Promise<UnifiedTemplateConfig[]> {
    const query = `
      SELECT * FROM unified_communication_templates 
      WHERE template_type = 'platform' AND is_active = true
      ${options.categories ? `AND category = ANY($1)` : ''}
      ${options.channels ? `AND channel = ANY($2)` : ''}
      ORDER BY category, channel, version DESC
    `;

    const params = [];
    if (options.categories) params.push(options.categories);
    if (options.channels) params.push(options.channels);

    const results = await this.storage.query(query, params);
    return results.map(this.mapDbRowToTemplateConfig);
  }

  /**
   * Get tenant default templates
   */
  private async getTenantTemplates(
    tenantId: string,
    options: TemplateInheritanceOptions
  ): Promise<UnifiedTemplateConfig[]> {
    const query = `
      SELECT * FROM unified_communication_templates 
      WHERE template_type = 'tenant' AND tenant_id = $1 AND is_active = true
      ${options.categories ? `AND category = ANY($2)` : ''}
      ${options.channels ? `AND channel = ANY($3)` : ''}
      ORDER BY category, channel, version DESC
    `;

    const params = [tenantId];
    if (options.categories) params.push(options.categories);
    if (options.channels) params.push(options.channels);

    const results = await this.storage.query(query, params);
    return results.map(this.mapDbRowToTemplateConfig);
  }

  /**
   * Get event customized templates
   */
  private async getEventTemplates(
    eventId: string,
    options: TemplateInheritanceOptions
  ): Promise<UnifiedTemplateConfig[]> {
    const query = `
      SELECT * FROM unified_communication_templates 
      WHERE template_type = 'event' AND event_id = $1 AND is_active = true
      ${options.categories ? `AND category = ANY($2)` : ''}
      ${options.channels ? `AND channel = ANY($3)` : ''}
      ORDER BY category, channel, version DESC
    `;

    const params = [eventId];
    if (options.categories) params.push(options.categories);
    if (options.channels) params.push(options.channels);

    const results = await this.storage.query(query, params);
    return results.map(this.mapDbRowToTemplateConfig);
  }

  /**
   * Resolve template inheritance hierarchy
   */
  private resolveTemplateInheritance(
    platformTemplates: UnifiedTemplateConfig[],
    tenantTemplates: UnifiedTemplateConfig[],
    eventTemplates: UnifiedTemplateConfig[]
  ): { 
    resolvedTemplates: UnifiedTemplateConfig[], 
    inheritanceChain: ResolvedTemplateConfig['inheritanceChain'] 
  } {
    const resolvedTemplates: UnifiedTemplateConfig[] = [];
    const inheritanceChain: ResolvedTemplateConfig['inheritanceChain'] = {};

    // Build a comprehensive map of all available templates
    const templateMap = {
      platform: this.buildTemplateMap(platformTemplates),
      tenant: this.buildTemplateMap(tenantTemplates),
      event: this.buildTemplateMap(eventTemplates)
    };

    // Get all unique category-channel combinations
    const allCombinations = new Set<string>();
    [...platformTemplates, ...tenantTemplates, ...eventTemplates].forEach(template => {
      allCombinations.add(`${template.category}:${template.channel}`);
    });

    // Resolve inheritance for each combination
    for (const combination of allCombinations) {
      const [category, channel] = combination.split(':') as [TemplateCategory, TemplateChannel];
      const key = combination;

      const platformTemplate = templateMap.platform.get(key);
      const tenantTemplate = templateMap.tenant.get(key);
      const eventTemplate = templateMap.event.get(key);

      // Event templates take highest precedence, then tenant, then platform
      const resolvedTemplate = eventTemplate || tenantTemplate || platformTemplate;

      if (resolvedTemplate) {
        resolvedTemplates.push(resolvedTemplate);
        
        inheritanceChain[key] = {
          platform: platformTemplate,
          tenant: tenantTemplate,
          event: eventTemplate,
          resolved: resolvedTemplate
        };
      }
    }

    return { resolvedTemplates, inheritanceChain };
  }

  /**
   * Build template map for efficient lookup
   */
  private buildTemplateMap(templates: UnifiedTemplateConfig[]): Map<string, UnifiedTemplateConfig> {
    const map = new Map<string, UnifiedTemplateConfig>();
    for (const template of templates) {
      const key = `${template.category}:${template.channel}`;
      // If multiple templates exist for same category-channel, keep the latest version
      if (!map.has(key) || template.version > map.get(key)!.version) {
        map.set(key, template);
      }
    }
    return map;
  }

  /**
   * Organize templates by category and channel for easy access
   */
  private organizeTemplatesByCategory(
    templates: UnifiedTemplateConfig[]
  ): ResolvedTemplateConfig['templates'] {
    const organized: ResolvedTemplateConfig['templates'] = {};

    for (const template of templates) {
      if (!organized[template.category]) {
        organized[template.category] = {};
      }
      organized[template.category]![template.channel] = template;
    }

    return organized;
  }

  /**
   * Build customized template from base template and customization request
   */
  private buildCustomizedTemplate(
    baseTemplate: UnifiedTemplateConfig,
    customization: TemplateCustomizationRequest,
    tenantId: string,
    eventId: string,
    userId: string
  ): UnifiedTemplateConfig {
    return {
      id: '', // Will be generated on save
      parentTemplateId: baseTemplate.id,
      tenantId,
      eventId,
      category: baseTemplate.category,
      channel: baseTemplate.channel,
      name: `${baseTemplate.name} (Custom)`,
      subject: customization.subject || baseTemplate.subject,
      content: customization.content || baseTemplate.content,
      variables: customization.variables || baseTemplate.variables,
      designSettings: {
        ...baseTemplate.designSettings,
        ...customization.designSettings
      },
      brandAssets: {
        ...baseTemplate.brandAssets,
        ...customization.brandAssets
      },
      metadata: {
        ...baseTemplate.metadata,
        customizedFrom: baseTemplate.id,
        customizationLevel: customization.customizationLevel
      },
      templateType: 'event',
      customizationLevel: customization.customizationLevel,
      isActive: true,
      version: 1,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Render template content with variable substitution
   */
  private async renderTemplateContent(
    content: string,
    variables: Record<string, any>
  ): Promise<string> {
    let rendered = content;

    // Simple variable substitution ({{variable_name}})
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    }

    return rendered;
  }

  /**
   * Generate design preview with CSS and HTML
   */
  private async generateDesignPreview(
    template: UnifiedTemplateConfig,
    eventData: Record<string, any>
  ): Promise<TemplatePreviewResult['designPreview']> {
    // Generate CSS based on design settings
    const css = this.generateTemplateCSS(template.designSettings, template.brandAssets);
    
    // Wrap content in appropriate HTML structure
    const html = this.wrapContentInHTML(template.content, template.channel, css);

    return { css, html };
  }

  /**
   * Calculate accessibility score for template content
   */
  private async calculateAccessibilityScore(
    content: string,
    channel: TemplateChannel
  ): Promise<{ score: number; issues: string[] }> {
    const issues: string[] = [];
    let score = 100;

    if (channel === 'email') {
      // Check for alt text on images
      if (content.includes('<img') && !content.includes('alt=')) {
        issues.push('Images missing alt text');
        score -= 20;
      }

      // Check for proper heading hierarchy
      if (content.includes('<h1') && content.includes('<h3') && !content.includes('<h2')) {
        issues.push('Heading hierarchy skips levels');
        score -= 10;
      }

      // Check for sufficient color contrast (basic check)
      if (content.includes('color:') && content.includes('background')) {
        // This would need more sophisticated color contrast analysis
        // For now, we'll skip the complex implementation
      }
    }

    return { score: Math.max(0, score), issues };
  }

  private mapDbRowToTemplateConfig(row: any): UnifiedTemplateConfig {
    return {
      id: row.id,
      parentTemplateId: row.parent_template_id,
      tenantId: row.tenant_id,
      eventId: row.event_id,
      category: row.category,
      channel: row.channel,
      name: row.name,
      subject: row.subject,
      content: row.content,
      variables: row.variables || [],
      designSettings: row.design_settings || {},
      brandAssets: row.brand_assets || {},
      metadata: row.metadata || {},
      templateType: row.template_type,
      customizationLevel: row.customization_level,
      isActive: row.is_active,
      version: row.version,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private async validateTemplateCustomization(
    baseTemplate: UnifiedTemplateConfig,
    customization: TemplateCustomizationRequest
  ): Promise<TemplateValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const variableIssues = { missing: [], unused: [], invalid: [] };

    // Basic validation logic
    if (customization.customizationLevel === 'none') {
      warnings.push('No customization level specified');
    }

    // Variable validation
    if (customization.variables) {
      // Check for required variables that might be missing
      const baseVariables = new Set(baseTemplate.variables);
      const customVariables = new Set(customization.variables);
      
      for (const baseVar of baseVariables) {
        if (!customVariables.has(baseVar)) {
          variableIssues.missing.push(baseVar);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      variableIssues: variableIssues as any
    };
  }

  private async getTemplateById(templateId: string): Promise<UnifiedTemplateConfig | null> {
    const query = 'SELECT * FROM unified_communication_templates WHERE id = $1 AND is_active = true';
    const results = await this.storage.query(query, [templateId]);
    return results.length > 0 ? this.mapDbRowToTemplateConfig(results[0]) : null;
  }

  private async saveTemplate(template: UnifiedTemplateConfig): Promise<UnifiedTemplateConfig> {
    // Implementation for saving template to database
    // This would use the unified_communication_templates table
    throw new Error('Method not implemented - requires database implementation');
  }

  private async buildEventDataForPreview(event: any, previewData: Record<string, any>): Promise<Record<string, any>> {
    // Build comprehensive event data for template variable resolution
    return {
      event_name: event?.eventName || 'Sample Wedding',
      bride_name: event?.brideName || 'Jane',  
      groom_name: event?.groomName || 'John',
      event_date: event?.eventDate || '2024-06-15',
      venue_name: event?.venueName || 'Beautiful Garden Venue',
      venue_address: event?.venueAddress || '123 Wedding Lane, City, State',
      rsvp_deadline: event?.rsvpDeadline || '2024-05-15',
      ...previewData
    };
  }

  private generateTemplateCSS(designSettings: any, brandAssets: any): string {
    // Generate CSS based on design settings and brand assets
    return `
      .template-container {
        font-family: ${designSettings.bodyFont || 'Arial, sans-serif'};
        color: ${designSettings.primaryColor || '#333333'};
        max-width: 600px;
        margin: 0 auto;
      }
      .template-header {
        background-color: ${designSettings.accentColor || '#f8f9fa'};
        padding: 20px;
        text-align: center;
      }
      .template-content {
        padding: 20px;
        line-height: 1.6;
      }
      h1, h2, h3 {
        font-family: ${designSettings.headerFont || 'Georgia, serif'};
        color: ${designSettings.primaryColor || '#333333'};
      }
    `;
  }

  private wrapContentInHTML(content: string, channel: TemplateChannel, css: string): string {
    if (channel === 'email') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>${css}</style>
        </head>
        <body>
          <div class="template-container">
            ${content}
          </div>
        </body>
        </html>
      `;
    }
    return content; // For SMS and WhatsApp, return plain content
  }
}