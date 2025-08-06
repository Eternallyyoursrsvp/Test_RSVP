/**
 * AUTHENTICATION CONFIGURATION MANAGER
 * 
 * Enterprise-grade authentication configuration system that provides UI-based
 * switching between different authentication methods (Database Auth vs Supabase Auth).
 * 
 * Features:
 * - Runtime authentication method switching
 * - Secure configuration storage and validation
 * - UI-based configuration interface
 * - Configuration migration and rollback
 * - Real-time configuration updates
 * - Configuration backup and restore
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import type { SupabaseAuthConfig, AuthenticationType } from './auth-factory';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Authentication configuration interface
 */
export interface AuthConfiguration {
  // Primary authentication method
  method: AuthenticationType;
  
  // Database authentication settings
  databaseAuth: {
    enabled: boolean;
    provider: 'postgresql' | 'supabase' | 'sqlite';
    connectionUrl?: string;
  };
  
  // Supabase authentication settings
  supabaseAuth: {
    enabled: boolean;
    url?: string;
    anonKey?: string;
    serviceRoleKey?: string;
    features: {
      oauthProviders: string[];
      magicLinks: boolean;
      emailVerification: boolean;
      phoneAuth: boolean;
    };
  };
  
  // Security settings
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
    sessionTimeout: number; // minutes
    maxFailedAttempts: number;
    accountLockDuration: number; // minutes
  };
  
  // Metadata
  version: string;
  lastModified: Date;
  modifiedBy?: string;
}

/**
 * Default authentication configuration
 */
const defaultAuthConfig: AuthConfiguration = {
  method: 'database',
  databaseAuth: {
    enabled: true,
    provider: 'postgresql'
  },
  supabaseAuth: {
    enabled: false,
    features: {
      oauthProviders: [],
      magicLinks: false,
      emailVerification: true,
      phoneAuth: false
    }
  },
  security: {
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true
    },
    sessionTimeout: 480, // 8 hours
    maxFailedAttempts: 5,
    accountLockDuration: 30 // 30 minutes
  },
  version: '1.0.0',
  lastModified: new Date()
};

/**
 * Authentication Configuration Manager
 */
export class AuthConfigManager {
  private configPath: string;
  private backupPath: string;
  private currentConfig: AuthConfiguration;
  
  constructor() {
    const projectRoot = path.resolve(__dirname, '../../../');
    this.configPath = path.join(projectRoot, '.auth-config.json');
    this.backupPath = path.join(projectRoot, '.auth-config.backup.json');
    
    this.currentConfig = this.loadConfiguration();
  }

  /**
   * Load authentication configuration from file
   * Creates default configuration if none exists
   */
  private loadConfiguration(): AuthConfiguration {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        const config = JSON.parse(configData);
        
        // Validate and merge with defaults
        return this.validateAndMergeConfig(config);
      }
    } catch (error) {
      console.error('❌ Failed to load auth configuration:', error);
    }
    
    // Return default configuration and save it
    const config = { ...defaultAuthConfig };
    this.saveConfiguration(config);
    return config;
  }

  /**
   * Validate and merge configuration with defaults
   */
  private validateAndMergeConfig(config: any): AuthConfiguration {
    return {
      method: config.method === 'supabase' ? 'supabase' : 'database',
      databaseAuth: {
        enabled: config.databaseAuth?.enabled !== false,
        provider: config.databaseAuth?.provider || 'postgresql',
        connectionUrl: config.databaseAuth?.connectionUrl
      },
      supabaseAuth: {
        enabled: config.supabaseAuth?.enabled || false,
        url: config.supabaseAuth?.url,
        anonKey: config.supabaseAuth?.anonKey,
        serviceRoleKey: config.supabaseAuth?.serviceRoleKey,
        features: {
          oauthProviders: config.supabaseAuth?.features?.oauthProviders || [],
          magicLinks: config.supabaseAuth?.features?.magicLinks || false,
          emailVerification: config.supabaseAuth?.features?.emailVerification !== false,
          phoneAuth: config.supabaseAuth?.features?.phoneAuth || false
        }
      },
      security: {
        passwordPolicy: {
          minLength: Math.max(config.security?.passwordPolicy?.minLength || 12, 8),
          requireUppercase: config.security?.passwordPolicy?.requireUppercase !== false,
          requireLowercase: config.security?.passwordPolicy?.requireLowercase !== false,
          requireNumbers: config.security?.passwordPolicy?.requireNumbers !== false,
          requireSymbols: config.security?.passwordPolicy?.requireSymbols !== false
        },
        sessionTimeout: Math.max(config.security?.sessionTimeout || 480, 30),
        maxFailedAttempts: Math.max(config.security?.maxFailedAttempts || 5, 3),
        accountLockDuration: Math.max(config.security?.accountLockDuration || 30, 5)
      },
      version: config.version || '1.0.0',
      lastModified: new Date(config.lastModified || Date.now()),
      modifiedBy: config.modifiedBy
    };
  }

  /**
   * Save configuration to file with backup
   */
  private saveConfiguration(config: AuthConfiguration): void {
    try {
      // Create backup of current configuration
      if (fs.existsSync(this.configPath)) {
        fs.copyFileSync(this.configPath, this.backupPath);
      }
      
      // Save new configuration
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      
      console.log('✅ Authentication configuration saved successfully');
    } catch (error) {
      console.error('❌ Failed to save authentication configuration:', error);
      throw new Error('Failed to save authentication configuration');
    }
  }

  /**
   * Get current authentication configuration
   */
  getConfiguration(): AuthConfiguration {
    return { ...this.currentConfig };
  }

  /**
   * Update authentication configuration
   */
  async updateConfiguration(
    updates: Partial<AuthConfiguration>, 
    modifiedBy?: string
  ): Promise<AuthConfiguration> {
    try {
      // Validate updates
      const validatedUpdates = this.validateConfigurationUpdates(updates);
      
      // Create updated configuration
      const updatedConfig: AuthConfiguration = {
        ...this.currentConfig,
        ...validatedUpdates,
        lastModified: new Date(),
        modifiedBy
      };
      
      // Test configuration before saving
      await this.testConfiguration(updatedConfig);
      
      // Save configuration
      this.saveConfiguration(updatedConfig);
      this.currentConfig = updatedConfig;
      
      // Update environment variables if needed
      this.updateEnvironmentVariables(updatedConfig);
      
      console.log(`✅ Authentication configuration updated by ${modifiedBy || 'system'}`);
      return { ...updatedConfig };
      
    } catch (error) {
      console.error('❌ Failed to update authentication configuration:', error);
      throw new Error(`Configuration update failed: ${error.message}`);
    }
  }

  /**
   * Validate configuration updates
   */
  private validateConfigurationUpdates(updates: Partial<AuthConfiguration>): Partial<AuthConfiguration> {
    const validated: Partial<AuthConfiguration> = {};
    
    // Validate authentication method
    if (updates.method) {
      if (!['database', 'supabase'].includes(updates.method)) {
        throw new Error('Invalid authentication method. Must be "database" or "supabase"');
      }
      validated.method = updates.method;
    }
    
    // Validate Supabase configuration
    if (updates.supabaseAuth) {
      if (updates.supabaseAuth.enabled && updates.supabaseAuth.url) {
        try {
          new URL(updates.supabaseAuth.url);
        } catch {
          throw new Error('Invalid Supabase URL format');
        }
      }
      
      if (updates.supabaseAuth.anonKey && updates.supabaseAuth.anonKey.length < 20) {
        throw new Error('Invalid Supabase anonymous key');
      }
      
      validated.supabaseAuth = updates.supabaseAuth;
    }
    
    // Validate database configuration
    if (updates.databaseAuth) {
      validated.databaseAuth = updates.databaseAuth;
    }
    
    // Validate security settings
    if (updates.security) {
      if (updates.security.passwordPolicy?.minLength && updates.security.passwordPolicy.minLength < 8) {
        throw new Error('Password minimum length must be at least 8 characters');
      }
      
      if (updates.security.sessionTimeout && updates.security.sessionTimeout < 30) {
        throw new Error('Session timeout must be at least 30 minutes');
      }
      
      validated.security = updates.security;
    }
    
    return validated;
  }

  /**
   * Test configuration before applying
   */
  private async testConfiguration(config: AuthConfiguration): Promise<void> {
    // Test Supabase configuration if enabled
    if (config.method === 'supabase' && config.supabaseAuth.enabled) {
      if (!config.supabaseAuth.url || !config.supabaseAuth.anonKey) {
        throw new Error('Supabase URL and anonymous key are required for Supabase authentication');
      }
      
      try {
        // Test Supabase connection
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(config.supabaseAuth.url, config.supabaseAuth.anonKey);
        
        // Test basic connectivity
        const { error } = await supabase.from('profiles').select('count').limit(0);
        if (error && !error.message.includes('relation "profiles" does not exist')) {
          throw new Error(`Supabase connection test failed: ${error.message}`);
        }
        
        console.log('✅ Supabase configuration test passed');
      } catch (error) {
        throw new Error(`Supabase configuration test failed: ${error.message}`);
      }
    }
    
    // Test database configuration if enabled
    if (config.method === 'database' && config.databaseAuth.enabled) {
      if (!config.databaseAuth.connectionUrl && !process.env.DATABASE_URL) {
        throw new Error('Database connection URL is required for database authentication');
      }
      
      console.log('✅ Database configuration test passed');
    }
  }

  /**
   * Update environment variables based on configuration
   */
  private updateEnvironmentVariables(config: AuthConfiguration): void {
    if (config.method === 'supabase' && config.supabaseAuth.enabled) {
      process.env.SUPABASE_URL = config.supabaseAuth.url;
      process.env.SUPABASE_ANON_KEY = config.supabaseAuth.anonKey;
      if (config.supabaseAuth.serviceRoleKey) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = config.supabaseAuth.serviceRoleKey;
      }
    }
    
    if (config.databaseAuth.connectionUrl) {
      process.env.DATABASE_URL = config.databaseAuth.connectionUrl;
    }
  }

  /**
   * Switch authentication method
   */
  async switchAuthenticationMethod(
    method: AuthenticationType, 
    modifiedBy?: string
  ): Promise<AuthConfiguration> {
    console.log(`🔄 Switching authentication method to: ${method}`);
    
    const updates: Partial<AuthConfiguration> = {
      method,
      databaseAuth: {
        ...this.currentConfig.databaseAuth,
        enabled: method === 'database'
      },
      supabaseAuth: {
        ...this.currentConfig.supabaseAuth,
        enabled: method === 'supabase'
      }
    };
    
    return await this.updateConfiguration(updates, modifiedBy);
  }

  /**
   * Get authentication method status
   */
  getAuthenticationStatus(): {
    current: AuthenticationType;
    databaseAuth: { enabled: boolean; configured: boolean };
    supabaseAuth: { enabled: boolean; configured: boolean };
  } {
    return {
      current: this.currentConfig.method,
      databaseAuth: {
        enabled: this.currentConfig.databaseAuth.enabled,
        configured: !!(this.currentConfig.databaseAuth.connectionUrl || process.env.DATABASE_URL)
      },
      supabaseAuth: {
        enabled: this.currentConfig.supabaseAuth.enabled,
        configured: !!(this.currentConfig.supabaseAuth.url && this.currentConfig.supabaseAuth.anonKey)
      }
    };
  }

  /**
   * Backup current configuration
   */
  createBackup(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = this.configPath.replace('.json', `.backup-${timestamp}.json`);
    
    fs.copyFileSync(this.configPath, backupPath);
    
    console.log(`✅ Authentication configuration backup created: ${backupPath}`);
    return backupPath;
  }

  /**
   * Restore configuration from backup
   */
  async restoreFromBackup(backupPath: string, modifiedBy?: string): Promise<AuthConfiguration> {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }
      
      const backupData = fs.readFileSync(backupPath, 'utf-8');
      const backupConfig = JSON.parse(backupData);
      
      // Validate backup configuration
      const validatedConfig = this.validateAndMergeConfig(backupConfig);
      validatedConfig.lastModified = new Date();
      validatedConfig.modifiedBy = modifiedBy;
      
      // Test configuration
      await this.testConfiguration(validatedConfig);
      
      // Save restored configuration
      this.saveConfiguration(validatedConfig);
      this.currentConfig = validatedConfig;
      
      console.log(`✅ Authentication configuration restored from backup by ${modifiedBy || 'system'}`);
      return { ...validatedConfig };
      
    } catch (error) {
      console.error('❌ Failed to restore configuration from backup:', error);
      throw new Error(`Configuration restore failed: ${error.message}`);
    }
  }

  /**
   * Reset to default configuration
   */
  async resetToDefault(modifiedBy?: string): Promise<AuthConfiguration> {
    const defaultConfig: AuthConfiguration = {
      ...defaultAuthConfig,
      lastModified: new Date(),
      modifiedBy
    };
    
    this.saveConfiguration(defaultConfig);
    this.currentConfig = defaultConfig;
    
    console.log(`✅ Authentication configuration reset to defaults by ${modifiedBy || 'system'}`);
    return { ...defaultConfig };
  }

  /**
   * Export configuration for migration
   */
  exportConfiguration(): string {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  /**
   * Import configuration from string
   */
  async importConfiguration(configString: string, modifiedBy?: string): Promise<AuthConfiguration> {
    try {
      const importedConfig = JSON.parse(configString);
      const validatedConfig = this.validateAndMergeConfig(importedConfig);
      
      return await this.updateConfiguration(validatedConfig, modifiedBy);
    } catch (error) {
      throw new Error(`Configuration import failed: ${error.message}`);
    }
  }
}

/**
 * Global configuration manager instance
 */
let globalConfigManager: AuthConfigManager | null = null;

/**
 * Get global authentication configuration manager
 */
export function getAuthConfigManager(): AuthConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new AuthConfigManager();
  }
  return globalConfigManager;
}

/**
 * Quick access functions for common operations
 */
export const authConfig = {
  get: () => getAuthConfigManager().getConfiguration(),
  update: (updates: Partial<AuthConfiguration>, modifiedBy?: string) => 
    getAuthConfigManager().updateConfiguration(updates, modifiedBy),
  switch: (method: AuthenticationType, modifiedBy?: string) => 
    getAuthConfigManager().switchAuthenticationMethod(method, modifiedBy),
  status: () => getAuthConfigManager().getAuthenticationStatus(),
  backup: () => getAuthConfigManager().createBackup(),
  restore: (backupPath: string, modifiedBy?: string) => 
    getAuthConfigManager().restoreFromBackup(backupPath, modifiedBy),
  reset: (modifiedBy?: string) => getAuthConfigManager().resetToDefault(modifiedBy)
};