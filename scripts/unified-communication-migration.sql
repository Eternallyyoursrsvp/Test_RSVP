-- =====================================================================================
-- UNIFIED COMMUNICATION SYSTEM MIGRATION
-- Platform Independent Provider Management with Tenant → Event Inheritance
-- Enterprise SAAS Standard - Zero-downtime migration with backward compatibility
-- =====================================================================================

BEGIN TRANSACTION;

-- =====================================================================================
-- PHASE 1: CREATE UNIFIED TABLES
-- =====================================================================================

-- Create unified provider configuration table with Platform Independent model
CREATE TABLE IF NOT EXISTS unified_communication_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, -- Always required, no platform-level providers
  event_id UUID NULL, -- NULL for tenant defaults, UUID for event overrides
  provider_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'whatsapp'
  provider_name VARCHAR(100) NOT NULL, -- 'gmail', 'outlook', 'twilio', 'brevo', etc.
  configuration JSONB NOT NULL DEFAULT '{}', -- Provider-specific configuration
  credentials JSONB NOT NULL DEFAULT '{}', -- Encrypted credentials storage
  priority INTEGER NOT NULL DEFAULT 100, -- Provider priority for failover
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_tenant_default BOOLEAN NOT NULL DEFAULT false, -- Tenant-level default
  is_event_override BOOLEAN NOT NULL DEFAULT false, -- Event-specific override
  health_status VARCHAR(20) NOT NULL DEFAULT 'unknown', -- 'healthy', 'degraded', 'unhealthy', 'unknown'
  last_health_check TIMESTAMP NULL,
  test_results JSONB NOT NULL DEFAULT '{}', -- Latest test results
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints for Platform Independent model
  CONSTRAINT unique_tenant_provider UNIQUE(tenant_id, provider_type, provider_name) 
    WHERE event_id IS NULL,
  CONSTRAINT unique_event_provider UNIQUE(event_id, provider_type, provider_name) 
    WHERE event_id IS NOT NULL,
  
  -- Ensure only one type flag is set
  CONSTRAINT provider_type_consistency CHECK (
    (is_tenant_default = true AND is_event_override = false AND event_id IS NULL) OR
    (is_tenant_default = false AND is_event_override = true AND event_id IS NOT NULL)
  ),
  
  -- Validate provider types and names
  CONSTRAINT valid_provider_type CHECK (provider_type IN ('email', 'sms', 'whatsapp')),
  CONSTRAINT valid_provider_name CHECK (provider_name IN (
    'gmail', 'outlook', 'brevo', 'mailchimp', 'sendgrid', 'custom_smtp',
    'twilio', 'whatsapp_business', 'whatsapp_web'
  )),
  
  -- Validate health status
  CONSTRAINT valid_health_status CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown'))
);

-- Create unified template system with Platform Independent inheritance
CREATE TABLE IF NOT EXISTS unified_communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_template_id UUID REFERENCES unified_communication_templates(id), -- Inheritance chain
  tenant_id UUID NULL, -- NULL only for platform compliance templates
  event_id UUID NULL, -- NULL for platform/tenant templates
  category VARCHAR(100) NOT NULL, -- welcome, confirmation, reminder, etc. (10 categories)
  channel VARCHAR(50) NOT NULL, -- email, sms, whatsapp
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NULL, -- For email templates
  content TEXT NOT NULL, -- Template content with variable placeholders
  variables JSONB NOT NULL DEFAULT '[]', -- Available template variables
  design_settings JSONB NOT NULL DEFAULT '{}', -- Styling, layout preferences
  brand_assets JSONB NOT NULL DEFAULT '{}', -- Logos, colors, fonts specific to this template
  metadata JSONB NOT NULL DEFAULT '{}', -- Additional template metadata
  template_type VARCHAR(20) NOT NULL DEFAULT 'event', -- 'platform', 'tenant', 'event'
  customization_level VARCHAR(20) NOT NULL DEFAULT 'none', -- 'none', 'content', 'design', 'full'
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NULL, -- NULL for platform templates
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints for proper inheritance model
  CONSTRAINT valid_template_type CHECK (
    (template_type = 'platform' AND tenant_id IS NULL AND event_id IS NULL) OR
    (template_type = 'tenant' AND tenant_id IS NOT NULL AND event_id IS NULL) OR
    (template_type = 'event' AND tenant_id IS NOT NULL AND event_id IS NOT NULL)
  ),
  
  -- Validate template types and channels
  CONSTRAINT valid_template_category CHECK (category IN (
    'welcome', 'save_the_date', 'invitation', 'rsvp_confirmation', 
    'rsvp_reminder', 'event_updates', 'travel_info', 'accommodation',
    'ceremony_details', 'thank_you'
  )),
  CONSTRAINT valid_template_channel CHECK (channel IN ('email', 'sms', 'whatsapp')),
  CONSTRAINT valid_template_type_enum CHECK (template_type IN ('platform', 'tenant', 'event')),
  CONSTRAINT valid_customization_level CHECK (customization_level IN ('none', 'content', 'design', 'full'))
);

-- Create campaign management table
CREATE TABLE IF NOT EXISTS unified_communication_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  template_id UUID REFERENCES unified_communication_templates(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  target_audience JSONB NOT NULL DEFAULT '{}',
  delivery_settings JSONB NOT NULL DEFAULT '{}',
  analytics_settings JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Validate campaign status
  CONSTRAINT valid_campaign_status CHECK (status IN (
    'draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed'
  ))
);

-- =====================================================================================
-- PHASE 2: CREATE PERFORMANCE INDEXES
-- =====================================================================================

-- Performance indexes for tenant-event inheritance model
CREATE INDEX IF NOT EXISTS idx_unified_providers_tenant_event 
  ON unified_communication_providers(tenant_id, event_id);

CREATE INDEX IF NOT EXISTS idx_unified_providers_tenant_defaults 
  ON unified_communication_providers(tenant_id, provider_type, priority) 
  WHERE event_id IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_unified_providers_event_overrides 
  ON unified_communication_providers(event_id, provider_type, priority) 
  WHERE event_id IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_unified_providers_health 
  ON unified_communication_providers(health_status, last_health_check) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_unified_providers_type_name 
  ON unified_communication_providers(provider_type, provider_name);

-- Template indexes for inheritance and performance
CREATE INDEX IF NOT EXISTS idx_unified_templates_tenant_event 
  ON unified_communication_templates(tenant_id, event_id, template_type);

CREATE INDEX IF NOT EXISTS idx_unified_templates_platform 
  ON unified_communication_templates(template_type, category, channel) 
  WHERE template_type = 'platform';

CREATE INDEX IF NOT EXISTS idx_unified_templates_tenant 
  ON unified_communication_templates(tenant_id, template_type, category, channel) 
  WHERE template_type = 'tenant';

CREATE INDEX IF NOT EXISTS idx_unified_templates_event 
  ON unified_communication_templates(event_id, template_type, category, channel) 
  WHERE template_type = 'event';

CREATE INDEX IF NOT EXISTS idx_unified_templates_category_channel 
  ON unified_communication_templates(category, channel, template_type) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_unified_templates_parent 
  ON unified_communication_templates(parent_template_id) 
  WHERE parent_template_id IS NOT NULL;

-- Campaign indexes
CREATE INDEX IF NOT EXISTS idx_unified_campaigns_event_status 
  ON unified_communication_campaigns(event_id, status);

CREATE INDEX IF NOT EXISTS idx_unified_campaigns_scheduled 
  ON unified_communication_campaigns(scheduled_at) 
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_unified_campaigns_template 
  ON unified_communication_campaigns(template_id);

-- =====================================================================================
-- PHASE 3: SEED PLATFORM COMPLIANCE TEMPLATES
-- =====================================================================================

-- Insert platform-level compliance templates (GDPR, legal requirements)
INSERT INTO unified_communication_templates (
  id, tenant_id, event_id, category, channel, name, subject, content,
  variables, template_type, created_by, created_at
) VALUES
-- GDPR Compliance Templates
(
  gen_random_uuid(), NULL, NULL, 'welcome', 'email',
  'GDPR Data Processing Notice',
  'Important: Your Data Privacy Rights',
  'We are committed to protecting your personal data. This notice explains how we collect, use, and protect your information in compliance with GDPR. You have the right to access, rectify, or delete your personal data at any time. Contact us at {{support_email}} for any privacy concerns.',
  '["support_email"]',
  'platform', NULL, NOW()
),
(
  gen_random_uuid(), NULL, NULL, 'welcome', 'email',
  'Data Opt-out Template',
  'Unsubscribe Confirmation',
  'You have been successfully unsubscribed from all communications. Your data will be removed from our systems within 30 days as required by law. If you need immediate data deletion, please contact {{support_email}}.',
  '["support_email"]',
  'platform', NULL, NOW()
),
-- Legal Compliance Templates
(
  gen_random_uuid(), NULL, NULL, 'welcome', 'email',
  'Terms of Service Update',
  'Important Update to Our Terms of Service',
  'We have updated our Terms of Service to better serve you and comply with current regulations. Please review the changes at {{terms_url}}. Continued use of our service constitutes acceptance of these terms.',
  '["terms_url"]',
  'platform', NULL, NOW()
);

-- =====================================================================================
-- PHASE 4: DATA MIGRATION FROM EXISTING SYSTEM
-- =====================================================================================

-- Migrate existing provider data from wedding_events table
-- Note: This assumes the current provider data is stored as individual columns in wedding_events
INSERT INTO unified_communication_providers (
  tenant_id, event_id, provider_type, provider_name, configuration, credentials,
  is_tenant_default, is_event_override, created_by, created_at
)
SELECT 
  COALESCE(we.tenant_id::text, 'default-tenant')::uuid as tenant_id,
  we.id::text::uuid as event_id,
  'email' as provider_type,
  'gmail' as provider_name,
  jsonb_build_object(
    'account', we.gmail_account,
    'enabled', we.use_gmail
  ) as configuration,
  '{}' as credentials, -- Credentials should be migrated separately with encryption
  false as is_tenant_default,
  true as is_event_override,
  COALESCE(we.created_by::text, 'system')::uuid as created_by,
  COALESCE(we.created_at, NOW()) as created_at
FROM wedding_events we 
WHERE we.use_gmail = true AND we.gmail_account IS NOT NULL

UNION ALL

SELECT 
  COALESCE(we.tenant_id::text, 'default-tenant')::uuid as tenant_id,
  we.id::text::uuid as event_id,
  'email' as provider_type,
  'outlook' as provider_name,
  jsonb_build_object(
    'account', we.outlook_account,
    'enabled', we.use_outlook
  ) as configuration,
  '{}' as credentials,
  false as is_tenant_default,
  true as is_event_override,
  COALESCE(we.created_by::text, 'system')::uuid as created_by,
  COALESCE(we.created_at, NOW()) as created_at
FROM wedding_events we 
WHERE we.use_outlook = true AND we.outlook_account IS NOT NULL

UNION ALL

SELECT 
  COALESCE(we.tenant_id::text, 'default-tenant')::uuid as tenant_id,
  we.id::text::uuid as event_id,
  'sms' as provider_type,
  'twilio' as provider_name,
  jsonb_build_object(
    'account', we.twilio_account,
    'enabled', we.use_twilio
  ) as configuration,
  '{}' as credentials,
  false as is_tenant_default,
  true as is_event_override,
  COALESCE(we.created_by::text, 'system')::uuid as created_by,
  COALESCE(we.created_at, NOW()) as created_at
FROM wedding_events we 
WHERE we.use_twilio = true AND we.twilio_account IS NOT NULL

UNION ALL

SELECT 
  COALESCE(we.tenant_id::text, 'default-tenant')::uuid as tenant_id,
  we.id::text::uuid as event_id,
  'whatsapp' as provider_type,
  'whatsapp_business' as provider_name,
  jsonb_build_object(
    'phone_id', we.whatsapp_business_phone_id,
    'account_id', we.whatsapp_business_account_id,
    'enabled', (we.whatsapp_business_phone_id IS NOT NULL)
  ) as configuration,
  '{}' as credentials,
  false as is_tenant_default,
  true as is_event_override,
  COALESCE(we.created_by::text, 'system')::uuid as created_by,
  COALESCE(we.created_at, NOW()) as created_at
FROM wedding_events we 
WHERE we.whatsapp_business_phone_id IS NOT NULL;

-- Migrate existing template data from communication_templates table
INSERT INTO unified_communication_templates (
  tenant_id, event_id, category, channel, name, subject, content, variables,
  template_type, created_by, created_at
)
SELECT 
  -- Get tenant_id from event
  (SELECT tenant_id::text::uuid FROM wedding_events WHERE id = ct.event_id),
  ct.event_id::text::uuid as event_id,
  ct.category_id as category,
  ct.channel,
  ct.name,
  ct.subject,
  ct.content,
  COALESCE(ct.variables, '[]'::jsonb) as variables,
  'event' as template_type,
  COALESCE(ct.created_by::text, 'system')::uuid as created_by,
  COALESCE(ct.created_at, NOW()) as created_at
FROM communication_templates ct
WHERE ct.enabled = true AND ct.event_id IS NOT NULL;

-- Migrate WhatsApp templates
INSERT INTO unified_communication_templates (
  tenant_id, event_id, category, channel, name, subject, content, variables,
  template_type, created_by, created_at
)
SELECT 
  -- Get tenant_id from event
  (SELECT tenant_id::text::uuid FROM wedding_events WHERE id = wt.event_id),
  wt.event_id::text::uuid as event_id,
  wt.category,
  'whatsapp' as channel,
  wt.name,
  NULL as subject, -- WhatsApp doesn't have subjects
  wt.content,
  COALESCE(wt.parameters, '[]'::jsonb) as variables,
  'event' as template_type,
  'system'::uuid as created_by,
  COALESCE(wt.created_at, NOW()) as created_at
FROM whatsapp_templates wt;

-- =====================================================================================
-- PHASE 5: CREATE BACKWARD COMPATIBILITY VIEWS
-- =====================================================================================

-- Create view for backward compatibility with existing provider status queries
CREATE OR REPLACE VIEW provider_status_legacy AS
SELECT 
  ucp.event_id::integer as event_id,
  jsonb_object_agg(
    ucp.provider_name,
    jsonb_build_object(
      'connected', ucp.is_active,
      'type', ucp.provider_type,
      'account', ucp.configuration->>'account',
      'health_status', ucp.health_status
    )
  ) as providers
FROM unified_communication_providers ucp
WHERE ucp.event_id IS NOT NULL
GROUP BY ucp.event_id;

-- Create view for backward compatibility with template queries
CREATE OR REPLACE VIEW communication_templates_legacy AS
SELECT 
  uct.id::integer as id,
  uct.event_id::integer as event_id,
  uct.category as category_id,
  uct.name as template_id,
  uct.channel,
  uct.name,
  uct.subject,
  uct.content,
  uct.variables,
  uct.is_active as enabled,
  false as is_system, -- All migrated templates are not system templates
  0 as sort_order,
  uct.created_at,
  uct.updated_at
FROM unified_communication_templates uct
WHERE uct.template_type = 'event' AND uct.event_id IS NOT NULL;

-- =====================================================================================
-- PHASE 6: UPDATE TRIGGER FUNCTIONS
-- =====================================================================================

-- Create trigger function to maintain updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_unified_providers_updated_at 
  BEFORE UPDATE ON unified_communication_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_templates_updated_at 
  BEFORE UPDATE ON unified_communication_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_campaigns_updated_at 
  BEFORE UPDATE ON unified_communication_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- PHASE 7: GRANT PERMISSIONS
-- =====================================================================================

-- Grant permissions to application role (adjust role name as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON unified_communication_providers TO app_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON unified_communication_templates TO app_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON unified_communication_campaigns TO app_role;
-- GRANT SELECT ON provider_status_legacy TO app_role;
-- GRANT SELECT ON communication_templates_legacy TO app_role;

-- =====================================================================================
-- MIGRATION VALIDATION
-- =====================================================================================

-- Validate migration results
DO $$
DECLARE
    provider_count INTEGER;
    template_count INTEGER;
    legacy_provider_count INTEGER;
    legacy_template_count INTEGER;
BEGIN
    -- Count migrated providers
    SELECT COUNT(*) INTO provider_count FROM unified_communication_providers WHERE is_event_override = true;
    
    -- Count migrated templates  
    SELECT COUNT(*) INTO template_count FROM unified_communication_templates WHERE template_type = 'event';
    
    -- Count original providers (estimate from events with provider configurations)
    SELECT COUNT(*) INTO legacy_provider_count FROM wedding_events 
    WHERE use_gmail = true OR use_outlook = true OR use_twilio = true OR whatsapp_business_phone_id IS NOT NULL;
    
    -- Count original templates
    SELECT COUNT(*) INTO legacy_template_count FROM communication_templates WHERE enabled = true;
    
    -- Log migration results
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Migrated Providers: %', provider_count;
    RAISE NOTICE '  Migrated Templates: %', template_count;
    RAISE NOTICE '  Legacy Provider Configs: %', legacy_provider_count;
    RAISE NOTICE '  Legacy Templates: %', legacy_template_count;
    
    -- Validate critical constraints
    IF NOT EXISTS (SELECT 1 FROM unified_communication_templates WHERE template_type = 'platform') THEN
        RAISE EXCEPTION 'Migration failed: No platform compliance templates created';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
END
$$;

COMMIT;

-- =====================================================================================
-- POST-MIGRATION NOTES
-- =====================================================================================

/*
POST-MIGRATION CHECKLIST:

1. ✅ Unified provider table created with Platform Independent model
2. ✅ Template inheritance system with platform compliance templates
3. ✅ Campaign management table for unified operations
4. ✅ Performance indexes optimized for tenant-event inheritance
5. ✅ Platform compliance templates seeded (GDPR, legal)
6. ✅ Data migration from existing fragmented system
7. ✅ Backward compatibility views for existing APIs
8. ✅ Automatic timestamp triggers
9. ✅ Migration validation and logging

NEXT STEPS:
1. Update application services to use unified tables
2. Create unified API endpoints (v2)
3. Enhance Event Wizard with inheritance display
4. Implement wizard-to-operations integration pipeline
5. Add comprehensive testing suite
6. Monitor performance and optimize queries as needed

SECURITY NOTES:
- Provider credentials should be encrypted before storage
- Implement proper RBAC for tenant/event access control
- Audit logging should be enabled for all provider/template changes
- Regular security scans should be performed on stored configurations

PERFORMANCE NOTES:
- Indexes are optimized for inheritance queries
- Consider partitioning if dealing with >100K providers/templates
- Monitor slow queries and adjust indexes as usage patterns emerge
- Implement caching layer for frequently accessed configurations
*/