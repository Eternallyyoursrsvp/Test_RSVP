/**
 * AUTHENTICATION FACTORY
 * 
 * Enterprise-grade authentication factory that automatically detects and configures
 * the appropriate authentication adapter based on environment configuration.
 * 
 * Supports:
 * - Supabase Auth: Native Supabase authentication service with OAuth, magic links, etc.
 * - Database Auth: Custom JWT authentication with multi-provider database support
 * 
 * Auto-detection logic ensures zero-configuration switching between authentication methods.
 */

import { IAuthDatabaseAdapter } from './database-auth-adapter';

// Lazy imports to avoid circular dependencies
let DatabaseAuthAdapter: any = null;
let SupabaseAuthAdapter: any = null;

/**
 * Authentication type enumeration
 */
export type AuthenticationType = 'supabase' | 'database';

/**
 * Environment configuration interface for Supabase Auth
 */
export interface SupabaseAuthConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

/**
 * Detect which authentication system to use based on configuration
 * 
 * Detection Logic (Priority Order):
 * 1. Bootstrap mode check (always use Database Auth during bootstrap)
 * 2. Configuration file setting (.auth-config.json)
 * 3. Environment variables (SUPABASE_URL + SUPABASE_ANON_KEY)
 * 4. Default to Database Auth
 */
export function detectAuthenticationType(): AuthenticationType {
  // Check if we're in bootstrap mode - always use Database Auth for initialization
  try {
    const { bootstrapManager } = require('../bootstrap/startup-manager');
    if (bootstrapManager.isBootstrapMode()) {
      console.log('🔧 Bootstrap mode detected - using Database Auth for initialization');
      return 'database';
    }
  } catch (error) {
    // Bootstrap manager not available, continue with normal detection
    console.log('⚠️ Bootstrap manager not available, continuing with normal auth detection');
  }

  try {
    // Try to load from configuration manager (only in normal mode)
    const { getAuthConfigManager } = require('./auth-config-manager');
    const configManager = getAuthConfigManager();
    const config = configManager.getConfiguration();
    
    console.log(`🔐 Using configured authentication method: ${config.method}`);
    return config.method;
  } catch (error) {
    console.log('⚠️ Auth configuration not available, falling back to environment detection:', error.message);
    
    // Fallback to environment variable detection
    const hasSupabaseConfig = !!(
      process.env.SUPABASE_URL && 
      process.env.SUPABASE_ANON_KEY
    );
    
    if (hasSupabaseConfig) {
      console.log('🔐 Detected Supabase Auth via environment - using Supabase authentication service');
      return 'supabase';
    } else {
      console.log('🔐 Using Database Auth - custom JWT authentication system');
      return 'database';
    }
  }
}

/**
 * Validate Supabase configuration parameters
 */
export function validateSupabaseConfig(): SupabaseAuthConfig | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !anonKey) {
    return null;
  }
  
  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    console.error('❌ Invalid SUPABASE_URL format:', url);
    return null;
  }
  
  // Validate key formats (basic check)
  if (anonKey.length < 20 || !anonKey.startsWith('eyJ')) {
    console.error('❌ Invalid SUPABASE_ANON_KEY format');
    return null;
  }
  
  return {
    url,
    anonKey,
    serviceRoleKey
  };
}

/**
 * Enterprise Authentication Factory - Ver5 Provider System Integration
 * 
 * Returns DatabaseAuthAdapter that integrates with the provider system.
 * Enterprise-grade single path with provider system backing.
 */
export async function createAuthenticationAdapter(): Promise<IAuthDatabaseAdapter> {
  console.log('🔧 Ver5 Provider System: Creating enterprise authentication adapter');
  
  try {
    // Import the provider service to get the database provider
    const { getProviderService } = await import('../providers/provider-service');
    const providerService = getProviderService();
    
    // Get the database provider from Ver5 provider system
    const dbProvider = providerService.getDatabase();
    
    // Create DatabaseAuthAdapter with the provider system's database provider
    if (!DatabaseAuthAdapter) {
      const module = await import('./database-auth-adapter');
      DatabaseAuthAdapter = module.DatabaseAuthAdapter;
    }
    
    console.log('✅ Ver5 Provider System: Enterprise authentication adapter created');
    return new DatabaseAuthAdapter(dbProvider);
    
  } catch (error) {
    console.error('❌ Ver5 Provider System: Authentication adapter creation failed:', error);
    throw new Error(`Ver5 Provider System authentication failure: ${error.message}`);
  }
}

/**
 * Enterprise Synchronous Authentication - Ver5 Provider System Integration
 * 
 * Returns DatabaseAuthAdapter with provider system backing.
 */
export function createAuthenticationAdapterSync(): IAuthDatabaseAdapter {
  console.log('🔧 Ver5 Provider System: Synchronous authentication adapter requested');
  
  try {
    // Import the provider service synchronously
    const { getProviderService } = require('../providers/provider-service');
    const providerService = getProviderService();
    
    // Get the database provider from Ver5 provider system
    const dbProvider = providerService.getDatabase();
    
    // Create DatabaseAuthAdapter with the provider system's database provider
    if (!DatabaseAuthAdapter) {
      const module = require('./database-auth-adapter');
      DatabaseAuthAdapter = module.DatabaseAuthAdapter;
    }
    
    console.log('✅ Ver5 Provider System: Synchronous authentication adapter created');
    return new DatabaseAuthAdapter(dbProvider);
    
  } catch (error) {
    console.error('❌ Ver5 Provider System: Synchronous authentication failed:', error);
    throw new Error(`Ver5 Provider System synchronous authentication failure: ${error.message}`);
  }
}

/**
 * Global authentication adapter instance
 * Updated by async factory when available
 */
let globalAuthAdapter: IAuthDatabaseAdapter | null = null;

/**
 * Get global authentication adapter with async initialization support
 */
export async function getGlobalAuthenticationAdapter(): Promise<IAuthDatabaseAdapter> {
  if (!globalAuthAdapter) {
    globalAuthAdapter = await createAuthenticationAdapter();
  }
  return globalAuthAdapter;
}

/**
 * Synchronous version for backward compatibility
 * Will be replaced by async version when possible
 */
export function getGlobalAuthenticationAdapterSync(): IAuthDatabaseAdapter {
  if (!globalAuthAdapter) {
    globalAuthAdapter = createAuthenticationAdapterSync();
  }
  return globalAuthAdapter;
}

/**
 * Reset global adapter (useful for testing or configuration changes)
 */
export function resetGlobalAuthenticationAdapter(): void {
  globalAuthAdapter = null;
  console.log('🔄 Global authentication adapter reset');
}

/**
 * Get current authentication configuration info
 */
export function getAuthInfo(): {
  type: AuthenticationType;
  configured: boolean;
  config?: Partial<SupabaseAuthConfig>;
} {
  const type = detectAuthenticationType();
  
  if (type === 'supabase') {
    const config = validateSupabaseConfig();
    return {
      type,
      configured: !!config,
      config: config ? {
        url: config.url,
        // Don't expose keys in info
        anonKey: config.anonKey ? '***' : undefined,
        serviceRoleKey: config.serviceRoleKey ? '***' : undefined
      } : undefined
    };
  }
  
  return {
    type,
    configured: true // Database auth is always available
  };
}