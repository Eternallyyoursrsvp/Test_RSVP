/**
 * Authentication Provider Interface
 * 
 * Flexible authentication abstraction supporting multiple strategies:
 * - Local authentication (username/password)
 * - OAuth providers (Google, GitHub, Facebook, Microsoft)
 * - JWT token-based authentication
 * - SSO/SAML integration
 * - Multi-factor authentication (MFA)
 * - API key authentication
 */

import { Request, Response } from 'express';

// Authentication Provider Error class
export class AuthenticationProviderError extends Error {
  constructor(
    message: string,
    public providerName?: string,
    public code?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AuthenticationProviderError';
  }
}

export interface UserProfile {
  id: string | number;
  username?: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: string;
  permissions?: string[];
  metadata?: Record<string, unknown>;
  
  // Provider-specific data
  provider: string;
  providerId: string;
  providerData?: Record<string, unknown>;
  
  // Security fields
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  mfaEnabled?: boolean;
  lastLogin?: Date;
  loginCount?: number;
}

export interface AuthenticationCredentials {
  // Local auth
  username?: string;
  password?: string;
  email?: string;
  
  // Token-based auth
  token?: string;
  refreshToken?: string;
  
  // OAuth
  code?: string;
  state?: string;
  
  // API key
  apiKey?: string;
  
  // MFA
  mfaCode?: string;
  mfaToken?: string;
  
  // Additional provider-specific credentials
  additional?: Record<string, unknown>;
}

export interface AuthenticationResult {
  success: boolean;
  user?: UserProfile;
  tokens?: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    tokenType?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requiresMFA?: boolean;
  mfaToken?: string;
  redirectUrl?: string;
}

export interface AuthProviderConfig {
  // Provider identification
  name: string;
  type: 'local' | 'oauth' | 'jwt' | 'saml' | 'apikey' | 'custom';
  enabled: boolean;
  
  // OAuth configuration
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scope?: string[];
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  
  // JWT configuration
  jwtSecret?: string;
  jwtAlgorithm?: string;
  jwtExpiration?: string;
  jwtIssuer?: string;
  jwtAudience?: string;
  
  // SAML configuration
  samlEntryPoint?: string;
  samlIssuer?: string;
  samlCert?: string;
  samlPrivateKey?: string;
  
  // Local auth configuration
  passwordMinLength?: number;
  passwordRequirements?: {
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  };
  maxLoginAttempts?: number;
  lockoutDuration?: number;
  
  // MFA configuration
  mfaEnabled?: boolean;
  mfaProviders?: string[];
  mfaRequired?: boolean;
  
  // Session configuration
  sessionTimeout?: number;
  allowMultipleSessions?: boolean;
  
  // Security features
  enableBruteForceProtection?: boolean;
  enableRateLimiting?: boolean;
  enableAuditLogging?: boolean;
  
  // Provider-specific options
  providerOptions?: Record<string, unknown>;
}

export interface AuthSession {
  id: string;
  userId: string | number;
  provider: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  provider: string;
  latency: number;
  activeUsers: number;
  activeSessions: number;
  lastError?: Error;
  uptime: number;
}

/**
 * Core authentication provider interface
 */
export interface IAuthenticationProvider {
  // Provider metadata
  readonly name: string;
  readonly type: string;
  readonly version: string;
  
  // Configuration
  configure(config: AuthProviderConfig): Promise<void>;
  getConfig(): AuthProviderConfig;
  isConfigured(): boolean;
  
  // Authentication methods
  authenticate(credentials: AuthenticationCredentials, req?: Request): Promise<AuthenticationResult>;
  validateToken(token: string): Promise<UserProfile | null>;
  refreshToken(refreshToken: string): Promise<AuthenticationResult>;
  
  // User management
  createUser?(userProfile: Partial<UserProfile>, password?: string): Promise<UserProfile>;
  updateUser?(userId: string | number, updates: Partial<UserProfile>): Promise<UserProfile>;
  deleteUser?(userId: string | number): Promise<boolean>;
  getUser?(userId: string | number): Promise<UserProfile | null>;
  findUserByEmail?(email: string): Promise<UserProfile | null>;
  findUserByUsername?(username: string): Promise<UserProfile | null>;
  
  // Password management (for local auth)
  changePassword?(userId: string | number, oldPassword: string, newPassword: string): Promise<boolean>;
  resetPassword?(email: string): Promise<string>; // Returns reset token
  validateResetToken?(token: string): Promise<boolean>;
  setNewPassword?(resetToken: string, newPassword: string): Promise<boolean>;
  
  // Session management
  createSession(user: UserProfile, req?: Request): Promise<AuthSession>;
  getSession(sessionId: string): Promise<AuthSession | null>;
  updateSession(sessionId: string, updates: Partial<AuthSession>): Promise<AuthSession>;
  destroySession(sessionId: string): Promise<boolean>;
  destroyAllUserSessions(userId: string | number): Promise<number>;
  
  // MFA support
  setupMFA?(userId: string | number, method: string): Promise<{ secret: string; qrCode?: string }>;
  verifyMFA?(userId: string | number, code: string, method?: string): Promise<boolean>;
  disableMFA?(userId: string | number): Promise<boolean>;
  getMFAMethods?(userId: string | number): Promise<string[]>;
  
  // OAuth specific methods
  getAuthorizationUrl?(state?: string): string;
  handleCallback?(code: string, state?: string): Promise<AuthenticationResult>;
  
  // Health and monitoring
  getHealth(): Promise<AuthHealthStatus>;
  getMetrics(): Promise<AuthMetrics>;
  
  // Cleanup and maintenance
  cleanup(): Promise<void>;
  validateConfiguration(): Promise<boolean>;
}

export interface AuthMetrics {
  users: {
    total: number;
    active: number;
    newToday: number;
    verified: number;
  };
  sessions: {
    active: number;
    total: number;
    avgDuration: number;
  };
  security: {
    failedLogins: number;
    blockedIPs: number;
    mfaEnabled: number;
  };
  performance: {
    avgAuthTime: number;
    authRequests: number;
    errors: number;
  };
  lastUpdated: Date;
}

/**
 * Authentication provider factory interface
 */
export interface IAuthProviderFactory {
  createProvider(type: string, config: AuthProviderConfig): Promise<IAuthenticationProvider>;
  getSupportedTypes(): string[];
  validateConfig(type: string, config: AuthProviderConfig): Promise<boolean>;
}

/**
 * Authentication provider registry interface
 */
export interface IAuthProviderRegistry {
  registerProvider(name: string, factory: IAuthProviderFactory): void;
  getProvider(name: string): IAuthProviderFactory | undefined;
  listProviders(): string[];
  hasProvider(name: string): boolean;
}

/**
 * Multi-provider authentication service
 */
export interface IAuthenticationService {
  // Provider management
  addProvider(name: string, provider: IAuthenticationProvider): Promise<void>;
  removeProvider(name: string): Promise<boolean>;
  getProvider(name?: string): IAuthenticationProvider | undefined; // Default to primary
  listProviders(): string[];
  setPrimaryProvider(name: string): Promise<void>;
  
  // Authentication delegation
  authenticate(credentials: AuthenticationCredentials, provider?: string, req?: Request): Promise<AuthenticationResult>;
  validateToken(token: string, provider?: string): Promise<UserProfile | null>;
  
  // Unified user management
  createUser(userProfile: Partial<UserProfile>, provider?: string): Promise<UserProfile>;
  findUser(identifier: string, type: 'id' | 'email' | 'username', provider?: string): Promise<UserProfile | null>;
  
  // Session management
  createSession(user: UserProfile, req?: Request): Promise<AuthSession>;
  getSession(sessionId: string): Promise<AuthSession | null>;
  destroySession(sessionId: string): Promise<boolean>;
  
  // Health monitoring
  getOverallHealth(): Promise<Record<string, AuthHealthStatus>>;
  getAggregatedMetrics(): Promise<AuthMetrics>;
  
  // Middleware integration
  createAuthMiddleware(): (req: Request, res: Response, next: Function) => void;
  createRoleMiddleware(roles: string[]): (req: Request, res: Response, next: Function) => void;
}

/**
 * Authentication events for logging and monitoring
 */
export interface AuthEvent {
  type: 'login' | 'logout' | 'register' | 'password_change' | 'mfa_setup' | 'mfa_verify' | 'token_refresh' | 'session_expired';
  userId?: string | number;
  provider: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface IAuthEventLogger {
  logEvent(event: AuthEvent): Promise<void>;
  getEvents(filters: Partial<AuthEvent>, limit?: number, offset?: number): Promise<AuthEvent[]>;
  getEventStats(timeRange: { start: Date; end: Date }): Promise<Record<string, number>>;
}

/**
 * Provider-specific errors
 */
export class AuthProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'AuthProviderError';
  }
}

export class AuthConfigurationError extends AuthProviderError {
  constructor(provider: string, configField: string, issue: string) {
    super(`Configuration error in ${provider} for field '${configField}': ${issue}`, provider, 'CONFIG_ERROR');
    this.name = 'AuthConfigurationError';
  }
}

export class AuthenticationFailedError extends AuthProviderError {
  constructor(provider: string, reason: string) {
    super(`Authentication failed in ${provider}: ${reason}`, provider, 'AUTH_FAILED', 401);
    this.name = 'AuthenticationFailedError';
  }
}

export class TokenValidationError extends AuthProviderError {
  constructor(provider: string, reason: string) {
    super(`Token validation failed in ${provider}: ${reason}`, provider, 'TOKEN_INVALID', 401);
    this.name = 'TokenValidationError';
  }
}