/**
 * Supabase Authentication Provider Implementation
 * 
 * Implements the 
 * with Supabase as the authentication service, including JWT token management.
 */

import { createClient, SupabaseClient, AuthError, AuthResponse, User } from '@supabase/supabase-js';
import {
  IAuthenticationProvider,
  AuthenticationResult,
  UserProfile,
  AuthConfig,
  AuthenticationError,
  AuthenticationProviderError,
  HealthStatus,
  LoginCredentials,
  RegisterCredentials,
  SessionInfo,
  PasswordResetRequest,
  MFASetupResult,
  MFAVerificationRequest,
  AccountLockStatus,
  AuditLogEntry
} from '../interfaces/auth-provider';
import { BaseProviderConfig } from '../interfaces/provider-config';

export interface SupabaseAuthConfig extends BaseProviderConfig {
  auth: AuthConfig & {
    supabaseUrl: string;
    supabaseKey: string;
    jwtSecret?: string;
    autoRefreshToken?: boolean;
    persistSession?: boolean;
    detectSessionInUrl?: boolean;
    // Additional Supabase-specific settings
    flowType?: 'implicit' | 'pkce';
    storageKey?: string;
    debug?: boolean;
  };
  session: {
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  };
}

export class SupabaseAuthProvider implements IAuthenticationProvider {
  public readonly name = 'supabase';
  public readonly version = '1.0.0';
  public readonly supportedTypes = ['supabase'];

  private supabase: SupabaseClient | null = null;
  private config: SupabaseAuthConfig | null = null;
  private isInitialized = false;
  private metrics = {
    totalLogins: 0,
    successfulLogins: 0,
    failedLogins: 0,
    activeUsers: 0,
    sessionCount: 0
  };

  async initialize(config: SupabaseAuthConfig): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.config = config;

      // Validate required configuration
      if (!config.auth.supabaseUrl || !config.auth.supabaseKey) {
        throw new Error('Supabase URL and key are required');
      }

      // Initialize Supabase client
      this.supabase = createClient(config.auth.supabaseUrl, config.auth.supabaseKey, {
        auth: {
          autoRefreshToken: config.auth.autoRefreshToken !== false,
          persistSession: config.auth.persistSession !== false,
          detectSessionInUrl: config.auth.detectSessionInUrl !== false,
          flowType: config.auth.flowType || 'pkce',
          storageKey: config.auth.storageKey || 'supabase.auth.token',
          debug: config.auth.debug || false
        }
      });

      // Test connection
      const { data, error } = await this.supabase.auth.getSession();
      if (error && error.message !== 'Auth session missing!') {
        throw new Error(`Failed to connect to Supabase: ${error.message}`);
      }

      this.isInitialized = true;
      console.log('✅ Supabase Auth Provider initialized');
      
    } catch (error) {
      throw new AuthenticationProviderError(
        `Failed to initialize Supabase auth provider: ${(error as Error).message}`,
        this.name,
        'INITIALIZATION_FAILED'
      );
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Provider not initialized');
    }
    console.log('✅ Supabase Auth Provider started');
  }

  async stop(): Promise<void> {
    // Supabase client doesn't require explicit cleanup
    console.log('✅ Supabase Auth Provider stopped');
  }

  async destroy(): Promise<void> {
    this.supabase = null;
    this.config = null;
    this.isInitialized = false;
    console.log('✅ Supabase Auth Provider destroyed');
  }

  async updateConfig(config: Partial<SupabaseAuthConfig>): Promise<void> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }
    
    this.config = { ...this.config, ...config };
    
    // Reinitialize if critical settings changed
    if (config.auth?.supabaseUrl || config.auth?.supabaseKey) {
      await this.destroy();
      await this.initialize(this.config);
    }
  }

  // Authentication methods
  async authenticate(credentials: LoginCredentials): Promise<AuthenticationResult> {
    if (!this.supabase || !this.config) {
      throw new AuthenticationProviderError('Provider not initialized', this.name);
    }

    try {
      this.metrics.totalLogins++;
      
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.username, // Treat username as email for Supabase
        password: credentials.password
      });

      if (error) {
        this.metrics.failedLogins++;
        return {
          success: false,
          error: error.message,
          attempts: 1, // Supabase handles attempt counting internally
          lockoutTime: null
        };
      }

      if (!data.user || !data.session) {
        this.metrics.failedLogins++;
        return {
          success: false,
          error: 'Authentication failed',
          attempts: 1,
          lockoutTime: null
        };
      }

      this.metrics.successfulLogins++;
      this.metrics.activeUsers++;

      // Convert Supabase user to our UserProfile format
      const userProfile: UserProfile = await this.mapSupabaseUserToProfile(data.user);

      return {
        success: true,
        user: userProfile,
        sessionId: data.session.access_token,
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: new Date(data.session.expires_at! * 1000),
        permissions: await this.getUserPermissions(userProfile.id),
        metadata: {
          provider: this.name,
          loginTime: new Date(),
          sessionType: 'jwt'
        }
      };

    } catch (error) {
      this.metrics.failedLogins++;
      throw new AuthenticationProviderError(
        `Authentication failed: ${(error as Error).message}`,
        this.name,
        'AUTHENTICATION_FAILED'
      );
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthenticationResult> {
    if (!this.supabase || !this.config) {
      throw new AuthenticationProviderError('Provider not initialized', this.name);
    }

    try {
      // Check if registration is enabled
      if (!this.config.auth.allowRegistration) {
        return {
          success: false,
          error: 'Registration is disabled',
          attempts: 0,
          lockoutTime: null
        };
      }

      const { data, error } = await this.supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            name: credentials.name,
            username: credentials.username
          }
        }
      });

      if (error) {
        return {
          success: false,
          error: error.message,
          attempts: 0,
          lockoutTime: null
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Registration failed',
          attempts: 0,
          lockoutTime: null
        };
      }

      // Create user profile
      const userProfile: UserProfile = await this.mapSupabaseUserToProfile(data.user);

      return {
        success: true,
        user: userProfile,
        sessionId: data.session?.access_token,
        token: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
        expiresAt: data.session ? new Date(data.session.expires_at! * 1000) : undefined,
        requiresEmailVerification: !data.user.email_confirmed_at,
        metadata: {
          provider: this.name,
          registrationTime: new Date(),
          requiresEmailVerification: !data.user.email_confirmed_at
        }
      };

    } catch (error) {
      throw new AuthenticationProviderError(
        `Registration failed: ${(error as Error).message}`,
        this.name,
        'REGISTRATION_FAILED'
      );
    }
  }

  async validateToken(token: string): Promise<UserProfile | null> {
    if (!this.supabase) {
      throw new AuthenticationProviderError('Provider not initialized', this.name);
    }

    try {
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data.user) {
        return null;
      }

      return await this.mapSupabaseUserToProfile(data.user);

    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthenticationResult> {
    if (!this.supabase) {
      throw new AuthenticationProviderError('Provider not initialized', this.name);
    }

    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error || !data.session || !data.user) {
        return {
          success: false,
          error: error?.message || 'Token refresh failed',
          attempts: 0,
          lockoutTime: null
        };
      }

      const userProfile = await this.mapSupabaseUserToProfile(data.user);

      return {
        success: true,
        user: userProfile,
        sessionId: data.session.access_token,
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: new Date(data.session.expires_at! * 1000),
        metadata: {
          provider: this.name,
          refreshTime: new Date()
        }
      };

    } catch (error) {
      throw new AuthenticationProviderError(
        `Token refresh failed: ${(error as Error).message}`,
        this.name,
        'TOKEN_REFRESH_FAILED'
      );
    }
  }

  async logout(sessionId: string): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase.auth.signOut();
      
      if (!error) {
        this.metrics.activeUsers = Math.max(0, this.metrics.activeUsers - 1);
      }
      
      return !error;

    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  async requestPasswordReset(request: PasswordResetRequest): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(request.email, {
        redirectTo: request.callbackUrl
      });

      return !error;

    } catch (error) {
      console.error('Password reset error:', error);
      return false;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      return !error;

    } catch (error) {
      console.error('Password reset error:', error);
      return false;
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      // Supabase doesn't require old password verification for authenticated users
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      return !error;

    } catch (error) {
      console.error('Password change error:', error);
      return false;
    }
  }

  // Health and monitoring
  async getHealth(): Promise<HealthStatus> {
    try {
      if (!this.supabase) {
        return {
          status: 'unhealthy',
          uptime: 0,
          activeConnections: 0,
          errors: 1,
          warnings: 0,
          lastCheck: new Date(),
          details: { error: 'Provider not initialized' }
        };
      }

      // Test connection with a simple query
      const startTime = Date.now();
      const { error } = await this.supabase.auth.getSession();
      const responseTime = Date.now() - startTime;

      const status = responseTime > 5000 ? 'degraded' : 'healthy';

      return {
        status,
        uptime: process.uptime() * 1000,
        activeConnections: this.metrics.sessionCount,
        errors: this.metrics.failedLogins,
        warnings: 0,
        lastCheck: new Date(),
        details: {
          responseTime,
          totalLogins: this.metrics.totalLogins,
          successRate: this.metrics.totalLogins > 0 
            ? (this.metrics.successfulLogins / this.metrics.totalLogins * 100).toFixed(2) + '%'
            : '0%'
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        uptime: 0,
        activeConnections: 0,
        errors: this.metrics.failedLogins + 1,
        warnings: 0,
        lastCheck: new Date(),
        details: { error: (error as Error).message }
      };
    }
  }

  async cleanup(): Promise<void> {
    await this.destroy();
  }

  // Private helper methods
  private async mapSupabaseUserToProfile(user: User): Promise<UserProfile> {
    // Default role mapping - in production, this would come from user metadata or a separate table
    const role = user.user_metadata?.role || 'guest';
    
    return {
      id: user.id,
      username: user.user_metadata?.username || user.email?.split('@')[0] || '',
      name: user.user_metadata?.name || '',
      email: user.email || '',
      role,
      isActive: true,
      emailVerified: !!user.email_confirmed_at,
      createdAt: new Date(user.created_at),
      lastLoginAt: new Date(),
      metadata: {
        provider: this.name,
        supabaseId: user.id,
        emailConfirmedAt: user.email_confirmed_at,
        lastSignInAt: user.last_sign_in_at
      }
    };
  }

  private async getUserPermissions(userId: string): Promise<string[]> {
    // This would typically fetch from a database table or use Supabase RLS policies
    // For now, return basic permissions based on role
    const user = await this.validateToken(userId);
    if (!user) return [];

    // Map roles to permissions (same as enhanced-auth.ts)
    const rolePermissions: Record<string, string[]> = {
      'super_admin': ['*'], // All permissions
      'admin': [
        'event:create', 'event:read', 'event:update',
        'guest:create', 'guest:read', 'guest:update',
        'guest:import', 'guest:export',
        'communication:send', 'communication:template',
        'system:monitor'
      ],
      'planner': [
        'event:read', 'event:update',
        'guest:create', 'guest:read', 'guest:update',
        'guest:import', 'guest:export',
        'communication:send', 'communication:template'
      ],
      'couple': [
        'event:read', 'event:update',
        'guest:read', 'guest:update',
        'communication:send'
      ],
      'guest': ['event:read']
    };

    return rolePermissions[user.role] || [];
  }

  // Unimplemented methods for 
  async getUser(userId: string): Promise<UserProfile | null> {
    if (!this.supabase) return null;
    
    const { data, error } = await this.supabase.auth.admin.getUserById(userId);
    return data.user ? await this.mapSupabaseUserToProfile(data.user) : null;
  }

  async updateUser(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    if (!this.supabase) return false;
    
    const { error } = await this.supabase.auth.updateUser({
      data: updates
    });
    
    return !error;
  }

  async deleteUser(userId: string): Promise<boolean> {
    if (!this.supabase) return false;
    
    const { error } = await this.supabase.auth.admin.deleteUser(userId);
    return !error;
  }

  async lockAccount(userId: string, duration: number): Promise<boolean> {
    // Supabase doesn't have built-in account locking - would need custom implementation
    console.warn('Account locking not implemented for Supabase provider');
    return false;
  }

  async unlockAccount(userId: string): Promise<boolean> {
    // Supabase doesn't have built-in account locking - would need custom implementation
    console.warn('Account unlocking not implemented for Supabase provider');
    return false;
  }

  async getAccountLockStatus(userId: string): Promise<AccountLockStatus> {
    return {
      isLocked: false,
      lockedAt: null,
      lockDuration: 0,
      reason: null,
      unlockAt: null
    };
  }

  // Stub implementations for advanced features
  async setupMFA(userId: string): Promise<MFASetupResult> {
    throw new Error('MFA not implemented for Supabase provider');
  }

  async verifyMFA(request: MFAVerificationRequest): Promise<boolean> {
    throw new Error('MFA not implemented for Supabase provider');
  }

  async disableMFA(userId: string): Promise<boolean> {
    throw new Error('MFA not implemented for Supabase provider');
  }

  async getAuditLog(userId?: string, limit = 100): Promise<AuditLogEntry[]> {
    return []; // Would implement with Supabase logs or custom tracking
  }

  async validateSession(sessionId: string): Promise<SessionInfo | null> {
    const user = await this.validateToken(sessionId);
    if (!user) return null;

    return {
      sessionId,
      userId: user.id,
      createdAt: new Date(), // Would track actual session creation
      lastActivity: new Date(),
      isActive: true,
      metadata: { provider: this.name }
    };
  }
}

/**
 * Supabase Authentication Provider Factory
 */
export class SupabaseAuthProviderFactory {
  public readonly supportedTypes = ['supabase'];
  public readonly name = 'supabase-auth';
  public readonly version = '1.0.0';

  async createProvider(type: string, config: SupabaseAuthConfig): Promise<SupabaseAuthProvider> {
    if (!this.supportedTypes.includes(type)) {
      throw new Error(`Unsupported auth provider type: ${type}`);
    }

    const provider = new SupabaseAuthProvider();
    await provider.initialize(config);
    return provider;
  }

  async validateConfig(type: string, config: SupabaseAuthConfig): Promise<boolean> {
    try {
      if (!this.supportedTypes.includes(type)) {
        return false;
      }

      if (!config.auth.supabaseUrl || !config.auth.supabaseKey) {
        return false;
      }

      // Test connection
      const testProvider = new SupabaseAuthProvider();
      await testProvider.initialize(config);
      await testProvider.destroy();

      return true;
    } catch (error) {
      return false;
    }
  }

  getDefaultConfig(type: string): SupabaseAuthConfig {
    return {
      name: 'supabase',
      type: 'auth',
      enabled: true,
      environment: 'development',
      auth: {
        name: 'supabase',
        type: 'supabase',
        enabled: true,
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseKey: process.env.SUPABASE_ANON_KEY || '',
        jwtSecret: process.env.SUPABASE_JWT_SECRET,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        allowRegistration: true,
        passwordMinLength: 8,
        passwordRequirements: {
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false
        },
        maxLoginAttempts: 5,
        lockoutDuration: 15,
        sessionTimeout: 60,
        allowMultipleSessions: false
      },
      session: {
        maxAge: 3600000, // 1 hour
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
      },
      healthCheck: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        retries: 3
      }
    };
  }
}