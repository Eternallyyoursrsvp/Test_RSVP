/**
 * JWT-Enhanced Local Authentication Provider
 * 
 * Extends the existing LocalAuthProvider with JWT token support as required by 
 * Maintains backward compatibility while adding JWT authentication capabilities.
 */

import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { LocalAuthProvider, LocalAuthConfig } from './local-auth-provider';
import {
  IAuthenticationProvider,
  AuthenticationResult,
  UserProfile,
  LoginCredentials,
  SessionInfo,
  AuthenticationProviderError
} from '../interfaces/auth-provider';

export interface JWTLocalAuthConfig extends LocalAuthConfig {
  jwt: {
    secret: string;
    expiresIn: string; // e.g., '1h', '24h', '7d'
    refreshExpiresIn: string; // e.g., '7d', '30d'
    issuer: string;
    audience: string;
    algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
    includeRefreshToken: boolean;
  };
  session: {
    jwtOnly: boolean; // If true, only use JWT tokens, no session cookies
    cookieName?: string;
    cookieSecure?: boolean;
    cookieHttpOnly?: boolean;
    cookieSameSite?: 'strict' | 'lax' | 'none';
  };
}

interface JWTPayload {
  sub: string; // user ID
  username: string;
  email: string;
  role: string;
  name: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  sessionId: string;
  permissions?: string[];
}

interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

export class JWTLocalAuthProvider extends LocalAuthProvider {
  public readonly name = 'jwt-local';
  public readonly version = '1.1.0';
  
  private jwtConfig: JWTLocalAuthConfig['jwt'] | null = null;
  private sessionConfig: JWTLocalAuthConfig['session'] | null = null;
  private refreshTokens = new Map<string, { userId: string; tokenVersion: number; createdAt: Date; expiresAt: Date }>();
  private blacklistedTokens = new Set<string>(); // For logout/revocation

  async initialize(config: JWTLocalAuthConfig): Promise<void> {
    // Initialize the base LocalAuthProvider
    await super.configure(config);
    
    // Set JWT-specific configuration
    this.jwtConfig = {
      secret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
      expiresIn: '1h',
      refreshExpiresIn: '7d',
      issuer: 'rsvp-platform',
      audience: 'rsvp-platform-users',
      algorithm: 'HS256',
      includeRefreshToken: true,
      ...config.jwt
    };

    this.sessionConfig = {
      jwtOnly: false,
      cookieName: 'jwt-token',
      cookieSecure: process.env.NODE_ENV === 'production',
      cookieHttpOnly: true,
      cookieSameSite: 'lax',
      ...config.session
    };

    // Validate JWT configuration
    if (this.jwtConfig.secret === 'default-jwt-secret-change-in-production' && process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Using default JWT secret in production! Please set JWT_SECRET environment variable.');
    }

    // Start cleanup interval for expired refresh tokens
    this.startTokenCleanup();
    
    console.log('✅ JWT Local Auth Provider initialized');
  }

  async start(): Promise<void> {
    await super.start();
    console.log('✅ JWT Local Auth Provider started');
  }

  async stop(): Promise<void> {
    await super.stop();
    this.stopTokenCleanup();
    console.log('✅ JWT Local Auth Provider stopped');
  }

  /**
   * Enhanced authentication with JWT token generation
   */
  async authenticate(credentials: LoginCredentials): Promise<AuthenticationResult> {
    // First authenticate using the base provider
    const baseResult = await super.authenticate(credentials);
    
    if (!baseResult.success || !baseResult.user) {
      return baseResult;
    }

    try {
      // Generate JWT tokens
      const sessionId = this.generateSessionId();
      const { accessToken, refreshToken } = await this.generateTokens(baseResult.user, sessionId);
      
      // Store refresh token if enabled
      if (refreshToken && this.jwtConfig!.includeRefreshToken) {
        await this.storeRefreshToken(refreshToken, baseResult.user.id);
      }

      return {
        ...baseResult,
        token: accessToken,
        refreshToken: refreshToken,
        sessionId: sessionId,
        expiresAt: this.getTokenExpiry(accessToken),
        metadata: {
          ...baseResult.metadata,
          tokenType: 'JWT',
          algorithm: this.jwtConfig!.algorithm,
          includesRefreshToken: !!refreshToken
        }
      };

    } catch (error) {
      throw new AuthenticationProviderError(
        `JWT token generation failed: ${(error as Error).message}`,
        this.name,
        'TOKEN_GENERATION_FAILED'
      );
    }
  }

  /**
   * Enhanced token validation with JWT support
   */
  async validateToken(token: string): Promise<UserProfile | null> {
    if (!this.jwtConfig) {
      throw new AuthenticationProviderError('JWT not configured', this.name, 'NOT_CONFIGURED');
    }

    try {
      // Check if token is blacklisted
      if (this.blacklistedTokens.has(token)) {
        return null;
      }

      // Verify JWT token
      const payload = jwt.verify(token, this.jwtConfig.secret, {
        issuer: this.jwtConfig.issuer,
        audience: this.jwtConfig.audience,
        algorithms: [this.jwtConfig.algorithm]
      }) as JWTPayload;

      // Validate payload structure
      if (!payload.sub || !payload.username || !payload.email) {
        return null;
      }

      // Get user from database to ensure they still exist and are active
      const user = await this.getUser(payload.sub);
      if (!user || !user.isActive) {
        return null;
      }

      // Return user profile with JWT session info
      return {
        ...user,
        metadata: {
          ...user.metadata,
          sessionId: payload.sessionId,
          tokenType: 'JWT',
          issuedAt: new Date(payload.iat * 1000),
          expiresAt: new Date(payload.exp * 1000)
        }
      };

    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return null; // Invalid token
      }
      throw new AuthenticationProviderError(
        `Token validation failed: ${(error as Error).message}`,
        this.name,
        'TOKEN_VALIDATION_FAILED'
      );
    }
  }

  /**
   * Refresh JWT token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthenticationResult> {
    if (!this.jwtConfig || !this.jwtConfig.includeRefreshToken) {
      return {
        success: false,
        error: 'Refresh tokens not enabled',
        attempts: 0,
        lockoutTime: null
      };
    }

    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.jwtConfig.secret) as RefreshTokenPayload;
      
      // Check if refresh token exists and is valid
      const tokenInfo = this.refreshTokens.get(refreshToken);
      if (!tokenInfo || tokenInfo.userId !== payload.sub || tokenInfo.tokenVersion !== payload.tokenVersion) {
        return {
          success: false,
          error: 'Invalid refresh token',
          attempts: 0,
          lockoutTime: null
        };
      }

      // Get user data
      const user = await this.getUser(payload.sub);
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'User not found or inactive',
          attempts: 0,
          lockoutTime: null
        };
      }

      // Generate new tokens
      const sessionId = payload.sessionId; // Keep same session ID
      const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(user, sessionId);

      // Replace old refresh token with new one
      this.refreshTokens.delete(refreshToken);
      if (newRefreshToken) {
        await this.storeRefreshToken(newRefreshToken, user.id);
      }

      return {
        success: true,
        user,
        token: accessToken,
        refreshToken: newRefreshToken,
        sessionId: sessionId,
        expiresAt: this.getTokenExpiry(accessToken),
        metadata: {
          provider: this.name,
          tokenRefreshed: true,
          tokenType: 'JWT'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof jwt.JsonWebTokenError ? 'Invalid refresh token' : (error as Error).message,
        attempts: 0,
        lockoutTime: null
      };
    }
  }

  /**
   * Enhanced logout with token blacklisting
   */
  async logout(sessionId: string): Promise<boolean> {
    try {
      // Add access token to blacklist if we can find it
      // In a production system, you'd want to store this in a database
      const session = await this.validateSession(sessionId);
      if (session && session.metadata?.token) {
        this.blacklistedTokens.add(session.metadata.token);
      }

      // Remove refresh tokens associated with this session
      for (const [token, info] of this.refreshTokens.entries()) {
        if (info.userId === session?.userId) {
          this.refreshTokens.delete(token);
        }
      }

      // Call base logout
      return await super.logout(sessionId);

    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Validate JWT session
   */
  async validateSession(sessionId: string): Promise<SessionInfo | null> {
    // For JWT-only mode, validate based on token
    if (this.sessionConfig?.jwtOnly) {
      // In JWT-only mode, sessionId is actually the token
      const user = await this.validateToken(sessionId);
      if (!user) return null;

      return {
        sessionId: user.metadata?.sessionId || sessionId,
        userId: user.id,
        createdAt: user.metadata?.issuedAt || new Date(),
        lastActivity: new Date(),
        isActive: true,
        metadata: {
          provider: this.name,
          tokenType: 'JWT',
          token: sessionId
        }
      };
    }

    // Fall back to base session validation
    return await super.validateSession(sessionId);
  }

  /**
   * Get user permissions for JWT payload
   */
  private async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.getUser(userId);
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

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(user: UserProfile, sessionId: string): Promise<{
    accessToken: string;
    refreshToken?: string;
  }> {
    if (!this.jwtConfig) {
      throw new Error('JWT configuration not available');
    }

    const now = Math.floor(Date.now() / 1000);
    const permissions = await this.getUserPermissions(user.id);

    // Generate access token
    const accessTokenPayload: JWTPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: user.name,
      iat: now,
      exp: now + this.parseExpiry(this.jwtConfig.expiresIn),
      iss: this.jwtConfig.issuer,
      aud: this.jwtConfig.audience,
      sessionId,
      permissions
    };

    const accessToken = jwt.sign(accessTokenPayload, this.jwtConfig.secret, {
      algorithm: this.jwtConfig.algorithm
    });

    let refreshToken: string | undefined;

    // Generate refresh token if enabled
    if (this.jwtConfig.includeRefreshToken) {
      const refreshTokenPayload: RefreshTokenPayload = {
        sub: user.id,
        sessionId,
        tokenVersion: 1, // Would increment on password change
        iat: now,
        exp: now + this.parseExpiry(this.jwtConfig.refreshExpiresIn)
      };

      refreshToken = jwt.sign(refreshTokenPayload, this.jwtConfig.secret, {
        algorithm: this.jwtConfig.algorithm
      });
    }

    return { accessToken, refreshToken };
  }

  /**
   * Store refresh token information
   */
  private async storeRefreshToken(token: string, userId: string): Promise<void> {
    const payload = jwt.decode(token) as RefreshTokenPayload;
    
    this.refreshTokens.set(token, {
      userId,
      tokenVersion: payload.tokenVersion,
      createdAt: new Date(),
      expiresAt: new Date(payload.exp * 1000)
    });
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `jwt_${Date.now()}_${randomBytes(16).toString('hex')}`;
  }

  /**
   * Get token expiry date
   */
  private getTokenExpiry(token: string): Date {
    try {
      const payload = jwt.decode(token) as JWTPayload;
      return new Date(payload.exp * 1000);
    } catch {
      return new Date(Date.now() + 3600000); // Default 1 hour
    }
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      case 'w': return value * 604800;
      default: return 3600; // Default 1 hour
    }
  }

  /**
   * Token cleanup interval
   */
  private cleanupInterval: NodeJS.Timeout | null = null;

  private startTokenCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      
      // Clean up expired refresh tokens
      for (const [token, info] of this.refreshTokens.entries()) {
        if (info.expiresAt <= now) {
          this.refreshTokens.delete(token);
        }
      }

      // Clean up old blacklisted tokens (keep for 24 hours)
      // In production, this would be handled by a database TTL or separate cleanup job
      
    }, 3600000); // Run every hour
  }

  private stopTokenCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Revoke all tokens for a user (e.g., on password change)
   */
  async revokeAllTokens(userId: string): Promise<void> {
    // Remove all refresh tokens for this user
    for (const [token, info] of this.refreshTokens.entries()) {
      if (info.userId === userId) {
        this.refreshTokens.delete(token);
      }
    }

    // In a production system, you'd also:
    // 1. Increment the user's token version in the database
    // 2. Add all active access tokens to blacklist
    // 3. Clear any cached sessions
    
    console.log(`Revoked all tokens for user ${userId}`);
  }

  /**
   * Get enhanced metrics including JWT stats
   */
  getMetrics() {
    const baseMetrics = super.getMetrics();
    
    return {
      ...baseMetrics,
      refreshTokensActive: this.refreshTokens.size,
      blacklistedTokens: this.blacklistedTokens.size,
      jwtEnabled: !!this.jwtConfig,
      refreshTokensEnabled: this.jwtConfig?.includeRefreshToken || false
    };
  }
}

/**
 * JWT Local Authentication Provider Factory
 */
export class JWTLocalAuthProviderFactory {
  public readonly supportedTypes = ['jwt-local'];
  public readonly name = 'jwt-local-auth';
  public readonly version = '1.1.0';

  async createProvider(type: string, config: JWTLocalAuthConfig): Promise<JWTLocalAuthProvider> {
    if (!this.supportedTypes.includes(type)) {
      throw new Error(`Unsupported auth provider type: ${type}`);
    }

    const provider = new JWTLocalAuthProvider();
    await provider.initialize(config);
    return provider;
  }

  async validateConfig(type: string, config: JWTLocalAuthConfig): Promise<boolean> {
    try {
      if (!this.supportedTypes.includes(type)) {
        return false;
      }

      // Validate JWT configuration
      if (!config.jwt?.secret) {
        return false;
      }

      // Test provider creation
      const testProvider = new JWTLocalAuthProvider();
      await testProvider.initialize(config);
      await testProvider.destroy();

      return true;
    } catch (error) {
      return false;
    }
  }

  getDefaultConfig(type: string): JWTLocalAuthConfig {
    return {
      name: 'jwt-local',
      type: 'auth',
      enabled: true,
      environment: 'development',
      // Base auth config
      passwordMinLength: 8,
      passwordRequirements: {
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false
      },
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      saltRounds: 12,
      sessionTimeout: 60,
      allowMultipleSessions: false,
      // JWT-specific config
      jwt: {
        secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
        expiresIn: '1h',
        refreshExpiresIn: '7d',
        issuer: 'rsvp-platform',
        audience: 'rsvp-platform-users',
        algorithm: 'HS256',
        includeRefreshToken: true
      },
      session: {
        jwtOnly: false,
        cookieName: 'jwt-token',
        cookieSecure: process.env.NODE_ENV === 'production',
        cookieHttpOnly: true,
        cookieSameSite: 'lax'
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