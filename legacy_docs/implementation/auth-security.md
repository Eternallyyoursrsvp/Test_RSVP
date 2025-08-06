# Authentication & Security Implementation

## Overview

The Wedding RSVP Platform implements comprehensive security measures including session-based authentication, OAuth integration, role-based access control, and multi-layered data protection.

## 🔐 Authentication Architecture

### Session-Based Authentication
The platform uses PostgreSQL-backed sessions for secure authentication:

```typescript
// Session configuration
app.use(session({
  store: new (require('connect-pg-simple')(session))({
    pool: pgClient,
    tableName: 'session',
  }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
  },
}));
```

### Passport.js Integration
Local strategy for username/password authentication:

```typescript
passport.use(new LocalStrategy(
  async (username: string, password: string, done) => {
    try {
      const user = await db.select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user.length) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user[0].passwordHash);
      if (!isValid) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      return done(null, {
        id: user[0].id,
        username: user[0].username,
        name: user[0].name,
        email: user[0].email,
        role: user[0].role,
      });
    } catch (error) {
      return done(error);
    }
  }
));
```

## 🔑 OAuth Implementation

### Multi-Provider Support
The platform supports multiple OAuth providers with fallback mechanisms:

```typescript
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
}

// Provider-specific configuration with fallback
export const getOAuthConfig = async (eventId: number, provider: 'gmail' | 'outlook'): Promise<OAuthConfig> => {
  // Try event-specific credentials first
  const event = await db.select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (event.length && event[0][`${provider}ClientId`]) {
    return {
      clientId: event[0][`${provider}ClientId`],
      clientSecret: event[0][`${provider}ClientSecret`],
      accessToken: event[0][`${provider}AccessToken`],
      refreshToken: event[0][`${provider}RefreshToken`],
      tokenExpiry: event[0][`${provider}TokenExpiry`],
      redirectUri: `${process.env.BASE_URL}/api/oauth/${provider}/callback`,
    };
  }

  // Fallback to environment variables
  return {
    clientId: process.env[`${provider.toUpperCase()}_CLIENT_ID`]!,
    clientSecret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`]!,
    redirectUri: process.env[`${provider.toUpperCase()}_REDIRECT_URI`]!,
  };
};
```

### OAuth Flow Implementation
Standard OAuth 2.0 authorization code flow:

```typescript
// Initiate OAuth flow
app.get('/api/oauth/:provider/auth', isAuthenticated, async (req, res) => {
  const { provider } = req.params;
  const eventId = req.session.currentEventId;

  if (!eventId) {
    return res.status(400).json({ error: 'No event context' });
  }

  const config = await getOAuthConfig(eventId, provider as 'gmail' | 'outlook');
  const authUrl = generateAuthUrl(provider, config);

  // Store state for security
  req.session.oauthState = generateRandomState();
  req.session.oauthProvider = provider;
  req.session.oauthEventId = eventId;

  res.redirect(authUrl);
});

// Handle OAuth callback
app.get('/api/oauth/:provider/callback', isAuthenticated, async (req, res) => {
  const { code, state } = req.query;
  const { provider } = req.params;

  // Verify state parameter
  if (state !== req.session.oauthState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  try {
    const tokens = await exchangeCodeForTokens(provider, code as string);
    
    // Store tokens in database
    await db.update(events)
      .set({
        [`${provider}AccessToken`]: tokens.accessToken,
        [`${provider}RefreshToken`]: tokens.refreshToken,
        [`${provider}TokenExpiry`]: tokens.expiryDate,
      })
      .where(eq(events.id, req.session.oauthEventId));

    res.redirect('/dashboard?oauth=success');
  } catch (error) {
    console.error(`OAuth ${provider} error:`, error);
    res.redirect('/dashboard?oauth=error');
  }
});
```

### Token Refresh Management
Automatic token refresh for expired access tokens:

```typescript
export const refreshOAuthToken = async (eventId: number, provider: 'gmail' | 'outlook'): Promise<string | null> => {
  const config = await getOAuthConfig(eventId, provider);
  
  if (!config.refreshToken) {
    throw new Error(`No refresh token available for ${provider}`);
  }

  try {
    const response = await fetch(`https://oauth2.googleapis.com/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: config.refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    const tokens = await response.json();
    
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${tokens.error}`);
    }

    // Update stored tokens
    await db.update(events)
      .set({
        [`${provider}AccessToken`]: tokens.access_token,
        [`${provider}TokenExpiry`]: new Date(Date.now() + tokens.expires_in * 1000),
      })
      .where(eq(events.id, eventId));

    return tokens.access_token;
  } catch (error) {
    console.error(`Failed to refresh ${provider} token:`, error);
    return null;
  }
};
```

## 🛡️ Role-Based Access Control

### User Role Definition
Hierarchical role system with clear permissions:

```typescript
enum UserRole {
  ADMIN = 'admin',        // Full system access
  STAFF = 'staff',        // Event management access
  COUPLE = 'couple',      // Personal event access
  GUEST = 'guest',        // RSVP-only access
}

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: UserRole;
}
```

### Permission Middleware
Route-level permission checking:

```typescript
export const requireRole = (requiredRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const roleHierarchy = {
      [UserRole.GUEST]: 0,
      [UserRole.COUPLE]: 1,
      [UserRole.STAFF]: 2,
      [UserRole.ADMIN]: 3,
    };

    if (roleHierarchy[req.user.role] < roleHierarchy[requiredRole]) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Usage in routes
app.get('/api/admin/users', isAuthenticated, requireRole(UserRole.ADMIN), async (req, res) => {
  // Admin-only endpoint
});
```

### Event-Specific Permissions
Users can have different roles within different events:

```typescript
interface EventUser {
  eventId: number;
  userId: number;
  role: 'owner' | 'planner' | 'viewer';
  createdAt: Date;
}

export const requireEventRole = (requiredEventRole: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const eventId = req.params.eventId || req.session.currentEventId;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event context required' });
    }

    const eventUser = await db.select()
      .from(eventUsers)
      .where(and(
        eq(eventUsers.eventId, parseInt(eventId)),
        eq(eventUsers.userId, req.user.id)
      ))
      .limit(1);

    if (!eventUser.length || eventUser[0].role !== requiredEventRole) {
      return res.status(403).json({ error: 'Insufficient event permissions' });
    }

    req.eventId = parseInt(eventId);
    next();
  };
};
```

## 🔒 Input Validation & Sanitization

### Zod Schema Validation
Comprehensive input validation using Zod:

```typescript
import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Auto-generated schemas from database
export const insertGuestSchema = createInsertSchema(guests, {
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone format'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateGuestSchema = insertGuestSchema.partial();

// Route validation
app.post('/api/events/:eventId/guests', isAuthenticated, async (req, res) => {
  const validation = insertGuestSchema.safeParse(req.body);
  
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors,
    });
  }

  // Process validated data
  const guestData = validation.data;
  // ... create guest
});
```

### XSS Protection
Input sanitization and output encoding:

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize HTML content
export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });
};

// Template content sanitization
export const sanitizeTemplateContent = (content: string, variables: Record<string, string>): string => {
  let sanitized = sanitizeHtml(content);
  
  // Replace variables safely
  Object.entries(variables).forEach(([key, value]) => {
    const sanitizedValue = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
    sanitized = sanitized.replace(new RegExp(`{{${key}}}`, 'g'), sanitizedValue);
  });
  
  return sanitized;
};
```

## 🚨 Security Headers & CSRF Protection

### Security Headers
Comprehensive security headers:

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'api.anthropic.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

### CSRF Protection
Token-based CSRF protection for state-changing operations:

```typescript
import csrf from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

// Apply to state-changing routes
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || req.path.startsWith('/api/rsvp/')) {
    return next(); // Skip CSRF for GET requests and public RSVP
  }
  csrfProtection(req, res, next);
});
```

## 🔐 RSVP Token Security

### HMAC-Signed Tokens
Secure RSVP tokens with expiration:

```typescript
import crypto from 'crypto';

interface RSVPTokenPayload {
  guestId: number;
  eventId: number;
  expiresAt: number;
}

export const generateRSVPToken = (guestId: number, eventId: number, expirationDays: number = 30): string => {
  const payload: RSVPTokenPayload = {
    guestId,
    eventId,
    expiresAt: Date.now() + (expirationDays * 24 * 60 * 60 * 1000),
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.RSVP_TOKEN_SECRET!)
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
};

export const verifyRSVPToken = (token: string): RSVPTokenPayload | null => {
  try {
    const [payloadBase64, signature] = token.split('.');
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RSVP_TOKEN_SECRET!)
      .update(payloadBase64)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payload: RSVPTokenPayload = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString()
    );

    // Check expiration
    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
};
```

## 📊 Audit Logging

### Security Event Logging
Comprehensive audit trail for security events:

```typescript
interface AuditLog {
  id: number;
  userId: number | null;
  eventId: number | null;
  action: string;
  resource: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export const auditLogger = {
  async log(req: Request, action: string, resource: string, details: any = {}) {
    await db.insert(auditLogs).values({
      userId: req.user?.id || null,
      eventId: req.eventId || null,
      action,
      resource,
      details: JSON.stringify(details),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      timestamp: new Date(),
    });
  },

  // Specific audit methods
  async loginAttempt(req: Request, username: string, success: boolean) {
    await this.log(req, success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED', 'auth', { username });
  },

  async dataAccess(req: Request, resource: string, resourceId: number) {
    await this.log(req, 'DATA_ACCESS', resource, { resourceId });
  },

  async permissionDenied(req: Request, resource: string, requiredRole: string) {
    await this.log(req, 'PERMISSION_DENIED', resource, { requiredRole });
  },
};

// Usage in middleware
export const auditMiddleware = (resource: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log successful requests
      if (res.statusCode < 400) {
        auditLogger.dataAccess(req, resource, req.params.id);
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};
```

## 🔧 Environment Security

### Secret Management
Secure handling of sensitive configuration:

```typescript
// Required environment variables validation
const requiredEnvVars = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'RSVP_TOKEN_SECRET',
] as const;

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Required environment variable ${varName} is not set`);
  }
});

// Secret rotation capability
export const rotateSecret = async (secretName: string, newValue: string) => {
  // Validate secret format
  if (secretName === 'SESSION_SECRET' && newValue.length < 32) {
    throw new Error('Session secret must be at least 32 characters');
  }

  // Update environment (in production, this would be handled by deployment system)
  process.env[secretName] = newValue;
  
  // Log secret rotation
  console.log(`Secret ${secretName} rotated at ${new Date().toISOString()}`);
};
```

### Database Security
Connection security and query protection:

```typescript
// Secure database connection
const client = postgres(process.env.DATABASE_URL!, {
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Connection pool limit
  idle_timeout: 30,
  connect_timeout: 10,
});

// Query logging in development
if (process.env.NODE_ENV === 'development') {
  client.listen('query', (query) => {
    console.log('Query:', query);
  });
}
```

## 🚀 Security Monitoring

### Real-time Threat Detection
Monitoring for suspicious activities:

```typescript
// Rate limiting by IP and user
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
};

// Suspicious activity detection
export const detectSuspiciousActivity = async (req: Request) => {
  const recentFailedLogins = await db.select()
    .from(auditLogs)
    .where(and(
      eq(auditLogs.action, 'LOGIN_FAILED'),
      eq(auditLogs.ipAddress, req.ip),
      gte(auditLogs.timestamp, new Date(Date.now() - 15 * 60 * 1000))
    ));

  if (recentFailedLogins.length > 5) {
    await auditLogger.log(req, 'SUSPICIOUS_ACTIVITY', 'auth', {
      reason: 'Multiple failed login attempts',
      failedAttempts: recentFailedLogins.length,
    });
    
    // Implement additional security measures (e.g., temporary IP ban)
    return true;
  }

  return false;
};
```