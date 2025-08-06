/**
 * AUTHENTICATION SETTINGS API ROUTES
 * 
 * API endpoints for managing authentication method switching and configuration.
 * Provides UI-based authentication system management with validation and testing.
 * 
 * Features:
 * - Authentication method switching (Database Auth ↔ Supabase Auth)
 * - Configuration validation and testing
 * - Real-time authentication status
 * - Configuration backup and restore
 */

import express from 'express';
import { z } from 'zod';
import { getAuthConfigManager, type AuthConfiguration } from '../src/auth/auth-config-manager';
import { getAuthenticationInfo, resetGlobalAuthenticationAdapter } from '../src/auth/auth-factory';
import { validateSupabaseConfig } from '../src/auth/auth-factory';

const router = express.Router();

// Request validation schemas
const switchMethodSchema = z.object({
  method: z.enum(['database', 'supabase']),
  modifiedBy: z.string().optional(),
});

const updateConfigSchema = z.object({
  method: z.enum(['database', 'supabase']).optional(),
  databaseAuth: z.object({
    enabled: z.boolean().optional(),
    provider: z.enum(['postgresql', 'supabase', 'sqlite']).optional(),
    connectionUrl: z.string().optional(),
  }).optional(),
  supabaseAuth: z.object({
    enabled: z.boolean().optional(),
    url: z.string().optional(),
    anonKey: z.string().optional(),
    serviceRoleKey: z.string().optional(),
    features: z.object({
      oauthProviders: z.array(z.string()).optional(),
      magicLinks: z.boolean().optional(),
      emailVerification: z.boolean().optional(),
      phoneAuth: z.boolean().optional(),
    }).optional(),
  }).optional(),
  security: z.object({
    passwordPolicy: z.object({
      minLength: z.number().min(8).max(128).optional(),
      requireUppercase: z.boolean().optional(),
      requireLowercase: z.boolean().optional(),
      requireNumbers: z.boolean().optional(),
      requireSymbols: z.boolean().optional(),
    }).optional(),
    sessionTimeout: z.number().min(30).max(480).optional(),
    maxFailedAttempts: z.number().min(3).max(10).optional(),
    accountLockDuration: z.number().min(5).max(60).optional(),
  }).optional(),
  modifiedBy: z.string().optional(),
});

const testSupabaseConnectionSchema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(20),
  serviceRoleKey: z.string().optional(),
});

/**
 * GET /api/auth/settings/status
 * Get current authentication configuration and status
 */
router.get('/status', async (req, res) => {
  try {
    const configManager = getAuthConfigManager();
    const currentConfig = configManager.getConfiguration();
    const authStatus = configManager.getAuthenticationStatus();
    const authInfo = getAuthenticationInfo();

    res.json({
      success: true,
      data: {
        currentMethod: currentConfig.method,
        configuration: currentConfig,
        status: authStatus,
        info: authInfo,
        lastModified: currentConfig.lastModified,
        version: currentConfig.version,
      }
    });
  } catch (error) {
    console.error('❌ Failed to get authentication status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get authentication status',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/auth/settings/switch-method
 * Switch authentication method (Database Auth ↔ Supabase Auth)
 */
router.post('/switch-method', async (req, res) => {
  try {
    const validatedData = switchMethodSchema.parse(req.body);
    const { method, modifiedBy } = validatedData;

    console.log(`🔄 Switching authentication method to: ${method}`);

    const configManager = getAuthConfigManager();
    const updatedConfig = await configManager.switchAuthenticationMethod(method, modifiedBy);

    // Reset the global authentication adapter to pick up the new configuration
    resetGlobalAuthenticationAdapter();

    console.log(`✅ Authentication method switched to: ${method}`);

    res.json({
      success: true,
      data: {
        method: updatedConfig.method,
        configuration: updatedConfig,
        message: `Authentication method switched to ${method}`,
      }
    });
  } catch (error) {
    console.error('❌ Failed to switch authentication method:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to switch authentication method',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/auth/settings/update-config
 * Update authentication configuration
 */
router.post('/update-config', async (req, res) => {
  try {
    const validatedData = updateConfigSchema.parse(req.body);
    const { modifiedBy, ...updates } = validatedData;

    console.log('🔧 Updating authentication configuration...');

    const configManager = getAuthConfigManager();
    const updatedConfig = await configManager.updateConfiguration(
      updates as Partial<AuthConfiguration>,
      modifiedBy
    );

    // Reset the global authentication adapter to pick up the new configuration
    resetGlobalAuthenticationAdapter();

    console.log('✅ Authentication configuration updated successfully');

    res.json({
      success: true,
      data: {
        configuration: updatedConfig,
        message: 'Authentication configuration updated successfully',
      }
    });
  } catch (error) {
    console.error('❌ Failed to update authentication configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update authentication configuration',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/auth/settings/test-supabase-connection
 * Test Supabase connection parameters
 */
router.post('/test-supabase-connection', async (req, res) => {
  try {
    const validatedData = testSupabaseConnectionSchema.parse(req.body);
    const { url, anonKey, serviceRoleKey } = validatedData;

    console.log('🧪 Testing Supabase connection...');

    // Validate the configuration format
    const config = validateSupabaseConfig();
    if (!config && (!url || !anonKey)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Supabase configuration',
        details: 'URL and anonymous key are required'
      });
    }

    // Test the connection using the provided or environment configuration
    const testConfig = {
      url: url || config?.url || '',
      anonKey: anonKey || config?.anonKey || '',
      serviceRoleKey: serviceRoleKey || config?.serviceRoleKey,
    };

    // Import Supabase client for testing
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(testConfig.url, testConfig.anonKey);

    // Test basic connectivity by trying to get the current user (should not fail with anonymous key)
    const { data, error } = await supabase.auth.getUser();
    
    // Even if no user is returned, a successful response means the connection works
    if (error && !error.message.includes('invalid claim: missing sub claim')) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }

    // Test the profiles table (if it exists)
    const { error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(0);

    let profilesTableExists = true;
    let profilesMessage = 'Profiles table is accessible';

    if (profilesError) {
      if (profilesError.message.includes('relation "profiles" does not exist')) {
        profilesTableExists = false;
        profilesMessage = 'Profiles table does not exist (will be created automatically)';
      } else {
        profilesMessage = `Profiles table access warning: ${profilesError.message}`;
      }
    }

    console.log('✅ Supabase connection test successful');

    res.json({
      success: true,
      data: {
        connectionValid: true,
        profilesTableExists,
        message: 'Supabase connection successful',
        details: {
          url: testConfig.url,
          hasServiceRoleKey: !!testConfig.serviceRoleKey,
          profilesMessage,
        }
      }
    });
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    res.status(400).json({
      success: false,
      error: 'Supabase connection test failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/auth/settings/backup-config
 * Create a backup of current authentication configuration
 */
router.post('/backup-config', async (req, res) => {
  try {
    const { modifiedBy } = req.body;

    console.log('💾 Creating authentication configuration backup...');

    const configManager = getAuthConfigManager();
    const backupPath = configManager.createBackup();

    console.log(`✅ Configuration backup created: ${backupPath}`);

    res.json({
      success: true,
      data: {
        backupPath,
        message: 'Configuration backup created successfully',
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('❌ Failed to create configuration backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create configuration backup',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/auth/settings/restore-config
 * Restore authentication configuration from backup
 */
router.post('/restore-config', async (req, res) => {
  try {
    const { backupPath, modifiedBy } = req.body;

    if (!backupPath) {
      return res.status(400).json({
        success: false,
        error: 'Backup path is required'
      });
    }

    console.log(`🔄 Restoring authentication configuration from: ${backupPath}`);

    const configManager = getAuthConfigManager();
    const restoredConfig = await configManager.restoreFromBackup(backupPath, modifiedBy);

    // Reset the global authentication adapter to pick up the restored configuration
    resetGlobalAuthenticationAdapter();

    console.log('✅ Authentication configuration restored successfully');

    res.json({
      success: true,
      data: {
        configuration: restoredConfig,
        message: 'Configuration restored successfully',
      }
    });
  } catch (error) {
    console.error('❌ Failed to restore configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore configuration',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/auth/settings/reset-to-default
 * Reset authentication configuration to default settings
 */
router.post('/reset-to-default', async (req, res) => {
  try {
    const { modifiedBy } = req.body;

    console.log('🔄 Resetting authentication configuration to defaults...');

    const configManager = getAuthConfigManager();
    const defaultConfig = await configManager.resetToDefault(modifiedBy);

    // Reset the global authentication adapter to pick up the default configuration
    resetGlobalAuthenticationAdapter();

    console.log('✅ Authentication configuration reset to defaults');

    res.json({
      success: true,
      data: {
        configuration: defaultConfig,
        message: 'Configuration reset to defaults successfully',
      }
    });
  } catch (error) {
    console.error('❌ Failed to reset configuration to defaults:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset configuration to defaults',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/auth/settings/export-config
 * Export current authentication configuration
 */
router.get('/export-config', async (req, res) => {
  try {
    console.log('📤 Exporting authentication configuration...');

    const configManager = getAuthConfigManager();
    const configString = configManager.exportConfiguration();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="auth-config-export.json"');
    
    res.send(configString);
  } catch (error) {
    console.error('❌ Failed to export configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export configuration',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/auth/settings/import-config
 * Import authentication configuration from JSON
 */
router.post('/import-config', async (req, res) => {
  try {
    const { configString, modifiedBy } = req.body;

    if (!configString) {
      return res.status(400).json({
        success: false,
        error: 'Configuration data is required'
      });
    }

    console.log('📥 Importing authentication configuration...');

    const configManager = getAuthConfigManager();
    const importedConfig = await configManager.importConfiguration(configString, modifiedBy);

    // Reset the global authentication adapter to pick up the imported configuration
    resetGlobalAuthenticationAdapter();

    console.log('✅ Authentication configuration imported successfully');

    res.json({
      success: true,
      data: {
        configuration: importedConfig,
        message: 'Configuration imported successfully',
      }
    });
  } catch (error) {
    console.error('❌ Failed to import configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import configuration',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;