# 🏗️ **VER4 FINAL ARCHITECTURE PLAN**
## **Wedding RSVP Platform - Hybrid Technology Architecture**

*Version: 4.0 Final*  
*Target Implementation: VER4 Modular Rebuild*  
*Last Updated: January 27, 2025*

---

## 📋 **ARCHITECTURE OVERVIEW**

### **System Philosophy**
- **Multi-Tenant SaaS**: Complete event isolation with shared infrastructure
- **Flexible Provider Architecture**: Deploy-time configuration for auth and database providers
- **API-First Modular Design**: Microservice-style API modules with Express.js
- **Technology Stack Preservation**: Maintain current proven stack with architectural improvements
- **Security-First**: Zero-trust architecture with defense in depth
- **Performance-First**: Sub-2-second load times with intelligent caching

### **Technology Stack (VER4 Hybrid)**
```
Frontend:    React 18 + Vite + TypeScript + Tailwind CSS + Wouter
Backend:     Express.js + Modular API Architecture + TypeScript
Database:    [FLEXIBLE] PostgreSQL + Drizzle ORM | Supabase Postgres
Auth:        [FLEXIBLE] Custom Auth + JWT | Supabase Auth
Styling:     Tailwind CSS + ShadCN UI + Apple iOS 18 Design
Email:       Resend + Gmail OAuth2 + Outlook OAuth2 + SMTP Fallback
WhatsApp:    Business API + Twilio + Web.js (Development)
Storage:     Local File System + Cloudinary (Images)
Monitoring:  Custom Health Checks + Logging + Analytics
Deployment:  Express Server + Docker + PM2 + Nginx
```

---

## 🔧 **FLEXIBLE PROVIDER ARCHITECTURE**

### **Deployment-Time Configuration**
```typescript
// Environment Variables Control Provider Selection
AUTH_PROVIDER="custom" | "supabase"
DATABASE_PROVIDER="postgres" | "supabase"

// Single Provider Active Per Deployment (Not Runtime)
interface DeploymentConfig {
  authProvider: 'custom' | 'supabase';
  databaseProvider: 'postgres' | 'supabase';
  features: {
    realtime: boolean;
    fileStorage: boolean;
    edgeFunctions: boolean;
  };
}
```

### **Authentication Provider System**
```typescript
// Abstract Authentication Interface
interface AuthProvider {
  name: string;
  initialize(): Promise<void>;
  authenticate(credentials: LoginCredentials): Promise<AuthResult>;
  validateToken(token: string): Promise<User | null>;
  refreshToken(refreshToken: string): Promise<TokenResult>;
  logout(userId: string): Promise<void>;
  createUser(userData: CreateUserData): Promise<User>;
  resetPassword(email: string): Promise<void>;
}

// Custom Authentication Provider (Current System Enhanced)
class CustomAuthProvider implements AuthProvider {
  name = 'custom';
  
  async initialize(): Promise<void> {
    // JWT configuration setup
    // Session store initialization
    // Password hashing configuration
  }
  
  async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    // bcrypt password verification
    // JWT token generation
    // Session management
    return {
      user: authenticatedUser,
      accessToken: jwtToken,
      refreshToken: refreshToken,
      expiresIn: 3600
    };
  }
  
  async validateToken(token: string): Promise<User | null> {
    // JWT verification and validation
    // User context retrieval
  }
}

// Supabase Authentication Provider
class SupabaseAuthProvider implements AuthProvider {
  name = 'supabase';
  
  async initialize(): Promise<void> {
    // Supabase client initialization
    // Auth configuration setup
  }
  
  async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });
    
    if (error) throw new AuthError(error.message);
    
    return {
      user: data.user,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in
    };
  }
}

// Provider Factory
class AuthProviderFactory {
  static create(): AuthProvider {
    const provider = process.env.AUTH_PROVIDER || 'custom';
    
    switch (provider) {
      case 'supabase':
        return new SupabaseAuthProvider();
      case 'custom':
      default:
        return new CustomAuthProvider();
    }
  }
}
```

### **Database Provider System**
```typescript
// Abstract Database Interface
interface DatabaseProvider {
  name: string;
  initialize(): Promise<void>;
  getConnection(): any;
  executeQuery<T>(query: string, params: any[]): Promise<T[]>;
  transaction<T>(callback: (tx: any) => Promise<T>): Promise<T>;
  migrate(): Promise<void>;
  seed(): Promise<void>;
}

// PostgreSQL + Drizzle Provider (Current System)
class PostgresDrizzleProvider implements DatabaseProvider {
  name = 'postgres-drizzle';
  private db: any;
  
  async initialize(): Promise<void> {
    // PostgreSQL connection setup
    // Drizzle ORM configuration
    // Connection pooling
    this.db = drizzle(postgresConnection);
  }
  
  getConnection() {
    return this.db;
  }
  
  async executeQuery<T>(query: string, params: any[]): Promise<T[]> {
    // Direct Drizzle query execution
  }
  
  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }
}

// Supabase Database Provider
class SupabaseDatabaseProvider implements DatabaseProvider {
  name = 'supabase-postgres';
  private supabase: any;
  private db: any;
  
  async initialize(): Promise<void> {
    // Supabase client initialization
    // Drizzle with Supabase configuration
    this.supabase = createClient(url, key);
    this.db = drizzle(supabaseConnection);
  }
  
  getConnection() {
    return {
      drizzle: this.db,
      supabase: this.supabase
    };
  }
  
  async executeQuery<T>(query: string, params: any[]): Promise<T[]> {
    // Drizzle with Supabase connection
  }
}

// Provider Factory
class DatabaseProviderFactory {
  static create(): DatabaseProvider {
    const provider = process.env.DATABASE_PROVIDER || 'postgres';
    
    switch (provider) {
      case 'supabase':
        return new SupabaseDatabaseProvider();
      case 'postgres':
      default:
        return new PostgresDrizzleProvider();
    }
  }
}
```

---

## 🏛️ **MODULAR API ARCHITECTURE**

### **Express.js Microservice-Style Structure**
```
server/
├── api/                      # Modular API endpoints
│   ├── auth/                 # Authentication module
│   │   ├── index.ts         # Route registration
│   │   ├── login.ts         # POST /api/auth/login
│   │   ├── register.ts      # POST /api/auth/register
│   │   ├── logout.ts        # POST /api/auth/logout
│   │   ├── refresh.ts       # POST /api/auth/refresh
│   │   └── profile.ts       # GET/PUT /api/auth/profile
│   ├── events/              # Event management module
│   │   ├── index.ts         # Route registration
│   │   ├── create.ts        # POST /api/events
│   │   ├── list.ts          # GET /api/events
│   │   ├── details.ts       # GET /api/events/:id
│   │   ├── update.ts        # PUT /api/events/:id
│   │   ├── delete.ts        # DELETE /api/events/:id
│   │   └── settings.ts      # GET/PUT /api/events/:id/settings
│   ├── guests/              # Guest management module
│   │   ├── index.ts         # Route registration
│   │   ├── list.ts          # GET /api/events/:eventId/guests
│   │   ├── create.ts        # POST /api/events/:eventId/guests
│   │   ├── details.ts       # GET /api/events/:eventId/guests/:id
│   │   ├── update.ts        # PUT /api/events/:eventId/guests/:id
│   │   ├── delete.ts        # DELETE /api/events/:eventId/guests/:id
│   │   ├── import.ts        # POST /api/events/:eventId/guests/import
│   │   └── export.ts        # GET /api/events/:eventId/guests/export
│   ├── rsvp/                # RSVP module
│   │   ├── index.ts         # Route registration
│   │   ├── form.ts          # GET /api/rsvp/:token
│   │   ├── submit.ts        # POST /api/rsvp/:token
│   │   ├── status.ts        # GET /api/rsvp/:token/status
│   │   └── resend.ts        # POST /api/rsvp/resend
│   ├── communications/      # Communication module
│   │   ├── index.ts         # Route registration
│   │   ├── templates/       # Template management
│   │   │   ├── list.ts      # GET /api/communications/templates
│   │   │   ├── create.ts    # POST /api/communications/templates
│   │   │   ├── update.ts    # PUT /api/communications/templates/:id
│   │   │   └── delete.ts    # DELETE /api/communications/templates/:id
│   │   ├── email/           # Email services
│   │   │   ├── send.ts      # POST /api/communications/email/send
│   │   │   ├── config.ts    # GET/PUT /api/communications/email/config
│   │   │   └── history.ts   # GET /api/communications/email/history
│   │   └── whatsapp/        # WhatsApp services
│   │       ├── send.ts      # POST /api/communications/whatsapp/send
│   │       ├── config.ts    # GET/PUT /api/communications/whatsapp/config
│   │       └── qr.ts        # GET /api/communications/whatsapp/qr
│   ├── accommodations/      # Accommodation module
│   │   ├── index.ts         # Route registration
│   │   ├── hotels/          # Hotel management
│   │   │   ├── list.ts      # GET /api/accommodations/hotels
│   │   │   ├── create.ts    # POST /api/accommodations/hotels
│   │   │   ├── update.ts    # PUT /api/accommodations/hotels/:id
│   │   │   └── delete.ts    # DELETE /api/accommodations/hotels/:id
│   │   ├── rooms/           # Room management
│   │   │   ├── list.ts      # GET /api/accommodations/rooms
│   │   │   ├── assign.ts    # POST /api/accommodations/rooms/assign
│   │   │   └── status.ts    # GET /api/accommodations/rooms/status
│   │   └── reports.ts       # GET /api/accommodations/reports
│   ├── transportation/      # Transportation module
│   │   ├── index.ts         # Route registration
│   │   ├── groups/          # Transport groups
│   │   │   ├── list.ts      # GET /api/transportation/groups
│   │   │   ├── create.ts    # POST /api/transportation/groups
│   │   │   ├── update.ts    # PUT /api/transportation/groups/:id
│   │   │   └── assign.ts    # POST /api/transportation/groups/:id/assign
│   │   ├── vendors/         # Transport vendors
│   │   │   ├── list.ts      # GET /api/transportation/vendors
│   │   │   ├── create.ts    # POST /api/transportation/vendors
│   │   │   └── update.ts    # PUT /api/transportation/vendors/:id
│   │   └── reports.ts       # GET /api/transportation/reports
│   ├── reports/             # Reporting module
│   │   ├── index.ts         # Route registration
│   │   ├── rsvp.ts          # GET /api/reports/rsvp
│   │   ├── guests.ts        # GET /api/reports/guests
│   │   ├── accommodations.ts# GET /api/reports/accommodations
│   │   ├── transportation.ts# GET /api/reports/transportation
│   │   └── analytics.ts     # GET /api/reports/analytics
│   └── system/              # System module
│       ├── index.ts         # Route registration
│       ├── health.ts        # GET /api/system/health
│       ├── version.ts       # GET /api/system/version
│       └── metrics.ts       # GET /api/system/metrics
├── middleware/              # Shared middleware
│   ├── auth.ts             # Authentication middleware
│   ├── validation.ts       # Input validation middleware
│   ├── rateLimit.ts        # Rate limiting middleware
│   ├── eventContext.ts     # Multi-tenant context middleware
│   ├── cors.ts             # CORS configuration
│   ├── compression.ts      # Response compression
│   └── errorHandler.ts     # Error handling middleware
├── services/               # Business logic services
│   ├── authService.ts      # Authentication service
│   ├── eventService.ts     # Event management service
│   ├── guestService.ts     # Guest management service
│   ├── rsvpService.ts      # RSVP processing service
│   ├── communicationService.ts # Communication service
│   ├── accommodationService.ts # Accommodation service
│   ├── transportationService.ts # Transportation service
│   └── reportService.ts    # Reporting service
├── providers/              # Provider abstractions
│   ├── auth/               # Authentication providers
│   │   ├── AuthProvider.ts # Abstract interface
│   │   ├── CustomAuthProvider.ts # Custom implementation
│   │   └── SupabaseAuthProvider.ts # Supabase implementation
│   ├── database/           # Database providers
│   │   ├── DatabaseProvider.ts # Abstract interface
│   │   ├── PostgresProvider.ts # PostgreSQL implementation
│   │   └── SupabaseProvider.ts # Supabase implementation
│   ├── email/              # Email providers
│   │   ├── EmailProvider.ts # Abstract interface
│   │   ├── ResendProvider.ts # Resend implementation
│   │   ├── GmailProvider.ts # Gmail OAuth implementation
│   │   └── OutlookProvider.ts # Outlook OAuth implementation
│   └── storage/            # Storage providers
│       ├── StorageProvider.ts # Abstract interface
│       ├── LocalStorageProvider.ts # Local file system
│       └── CloudinaryProvider.ts # Cloudinary implementation
├── lib/                    # Utilities and configurations
│   ├── database.ts         # Database connection setup
│   ├── jwt.ts              # JWT utilities
│   ├── validation.ts       # Validation schemas
│   ├── constants.ts        # Application constants
│   ├── logger.ts           # Logging utilities
│   └── utils.ts            # General utilities
├── config/                 # Configuration files
│   ├── auth.ts             # Authentication configuration
│   ├── database.ts         # Database configuration
│   ├── email.ts            # Email configuration
│   └── app.ts              # Application configuration
└── index.ts                # Application entry point
```

### **Modular Route Registration System**
```typescript
// server/api/index.ts - Master route registry
import { Express } from 'express';
import { authRoutes } from './auth';
import { eventRoutes } from './events';
import { guestRoutes } from './guests';
import { rsvpRoutes } from './rsvp';
import { communicationRoutes } from './communications';
import { accommodationRoutes } from './accommodations';
import { transportationRoutes } from './transportation';
import { reportRoutes } from './reports';
import { systemRoutes } from './system';

export function registerApiRoutes(app: Express): void {
  // Register all API modules with versioning
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/events', eventRoutes);
  app.use('/api/v1/guests', guestRoutes);
  app.use('/api/v1/rsvp', rsvpRoutes);
  app.use('/api/v1/communications', communicationRoutes);
  app.use('/api/v1/accommodations', accommodationRoutes);
  app.use('/api/v1/transportation', transportationRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/system', systemRoutes);
}

// server/api/events/index.ts - Module route registration
import { Router } from 'express';
import { createEvent } from './create';
import { listEvents } from './list';
import { getEventDetails } from './details';
import { updateEvent } from './update';
import { deleteEvent } from './delete';
import { getEventSettings, updateEventSettings } from './settings';
import { authMiddleware } from '../../middleware/auth';
import { eventContextMiddleware } from '../../middleware/eventContext';

const router = Router();

// Apply common middleware
router.use(authMiddleware);

// Event CRUD operations
router.post('/', createEvent);
router.get('/', listEvents);
router.get('/:eventId', eventContextMiddleware, getEventDetails);
router.put('/:eventId', eventContextMiddleware, updateEvent);
router.delete('/:eventId', eventContextMiddleware, deleteEvent);

// Event settings
router.get('/:eventId/settings', eventContextMiddleware, getEventSettings);
router.put('/:eventId/settings', eventContextMiddleware, updateEventSettings);

export { router as eventRoutes };

// server/api/events/create.ts - Individual endpoint implementation
import { Request, Response } from 'express';
import { eventService } from '../../services/eventService';
import { createEventSchema } from '../../lib/validation';
import { z } from 'zod';

export async function createEvent(req: Request, res: Response): Promise<void> {
  try {
    // Input validation
    const validatedData = createEventSchema.parse(req.body);
    
    // Business logic
    const event = await eventService.createEvent({
      ...validatedData,
      createdBy: req.user.id
    });
    
    // Response
    res.status(201).json({
      success: true,
      data: event,
      message: 'Event created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      });
      return;
    }
    
    throw error; // Let error middleware handle other errors
  }
}
```

---

## 🔐 **ENHANCED AUTHENTICATION ARCHITECTURE**

### **Flexible Authentication Configuration**
```typescript
// config/auth.ts
interface AuthConfig {
  provider: 'custom' | 'supabase';
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  session: {
    store: 'memory' | 'redis' | 'postgres';
    maxAge: number;
  };
  password: {
    minLength: number;
    requireSpecialChar: boolean;
    hashRounds: number;
  };
  oauth: {
    google?: OAuthConfig;
    microsoft?: OAuthConfig;
    github?: OAuthConfig;
  };
}

// Authentication service with provider abstraction
class AuthenticationService {
  private provider: AuthProvider;
  
  constructor() {
    this.provider = AuthProviderFactory.create();
  }
  
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    return this.provider.authenticate(credentials);
  }
  
  async validateSession(token: string): Promise<User | null> {
    return this.provider.validateToken(token);
  }
  
  async refreshToken(refreshToken: string): Promise<TokenResult> {
    return this.provider.refreshToken(refreshToken);
  }
}
```

### **Role-Based Access Control (RBAC)**
```typescript
// Enhanced RBAC system with granular permissions
enum UserRole {
  SUPER_ADMIN = 'super_admin',    // Platform administration
  ADMIN = 'admin',                // Full event access
  PLANNER = 'planner',            // Event planning access
  COUPLE = 'couple',              // Event owner access
  GUEST = 'guest',                // Limited guest access
}

enum Permission {
  // Event permissions
  EVENT_CREATE = 'event:create',
  EVENT_READ = 'event:read',
  EVENT_UPDATE = 'event:update',
  EVENT_DELETE = 'event:delete',
  
  // Guest permissions
  GUEST_CREATE = 'guest:create',
  GUEST_READ = 'guest:read',
  GUEST_UPDATE = 'guest:update',
  GUEST_DELETE = 'guest:delete',
  GUEST_IMPORT = 'guest:import',
  GUEST_EXPORT = 'guest:export',
  
  // Communication permissions
  COMMUNICATION_SEND = 'communication:send',
  COMMUNICATION_TEMPLATE = 'communication:template',
  COMMUNICATION_HISTORY = 'communication:history',
  
  // System permissions
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_MONITOR = 'system:monitor',
}

// Permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.ADMIN]: [
    Permission.EVENT_CREATE, Permission.EVENT_READ, Permission.EVENT_UPDATE,
    Permission.GUEST_CREATE, Permission.GUEST_READ, Permission.GUEST_UPDATE,
    Permission.GUEST_IMPORT, Permission.GUEST_EXPORT,
    Permission.COMMUNICATION_SEND, Permission.COMMUNICATION_TEMPLATE,
    Permission.SYSTEM_MONITOR
  ],
  [UserRole.PLANNER]: [
    Permission.EVENT_READ, Permission.EVENT_UPDATE,
    Permission.GUEST_CREATE, Permission.GUEST_READ, Permission.GUEST_UPDATE,
    Permission.GUEST_IMPORT, Permission.GUEST_EXPORT,
    Permission.COMMUNICATION_SEND, Permission.COMMUNICATION_TEMPLATE
  ],
  [UserRole.COUPLE]: [
    Permission.EVENT_READ, Permission.EVENT_UPDATE,
    Permission.GUEST_READ, Permission.GUEST_UPDATE,
    Permission.COMMUNICATION_SEND
  ],
  [UserRole.GUEST]: [
    Permission.EVENT_READ
  ]
};

// Permission middleware
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as UserRole;
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Required permission: ${permission}`
        }
      });
    }
    
    next();
  };
}
```

---

## 🗄️ **ENHANCED DATABASE ARCHITECTURE**

### **Flexible Database Configuration**
```typescript
// Database provider abstraction with schema compatibility
interface DatabaseConfig {
  provider: 'postgres' | 'supabase';
  connection: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
  };
  pooling: {
    min: number;
    max: number;
    idle: number;
  };
  migrations: {
    directory: string;
    tableName: string;
  };
}

// Unified schema that works with both providers
export const unifiedSchema = {
  // Core tables with UUID support for both providers
  events: pgTable('events', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    couple_names: varchar('couple_names', { length: 255 }).notNull(),
    wedding_date: date('wedding_date').notNull(),
    timezone: varchar('timezone', { length: 50 }).default('UTC'),
    status: varchar('status', { length: 20 }).default('draft'),
    // Supabase compatibility fields
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
    created_by: uuid('created_by').references(() => users.id),
  }),
  
  users: pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password_hash: varchar('password_hash', { length: 255 }),
    full_name: varchar('full_name', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull().default('couple'),
    // Supabase auth compatibility
    auth_provider: varchar('auth_provider', { length: 50 }).default('custom'),
    auth_provider_id: varchar('auth_provider_id', { length: 255 }),
    email_verified: boolean('email_verified').default(false),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
  }),
  
  // Enhanced guests table with better relationships
  guests: pgTable('guests', {
    id: uuid('id').defaultRandom().primaryKey(),
    event_id: uuid('event_id').references(() => events.id).notNull(),
    first_name: varchar('first_name', { length: 100 }).notNull(),
    last_name: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    side: varchar('side', { length: 10 }).notNull(), // 'bride' | 'groom'
    rsvp_status: varchar('rsvp_status', { length: 20 }).default('pending'),
    rsvp_token: varchar('rsvp_token', { length: 255 }).unique(),
    plus_one_allowed: boolean('plus_one_allowed').default(false),
    plus_one_name: varchar('plus_one_name', { length: 255 }),
    dietary_requirements: text('dietary_requirements'),
    special_requests: text('special_requests'),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
  }, (table) => ({
    eventGuestIndex: index('event_guest_idx').on(table.event_id, table.id),
    rsvpTokenIndex: uniqueIndex('rsvp_token_idx').on(table.rsvp_token),
    emailIndex: index('guest_email_idx').on(table.email),
  })),
};

// Database service with provider abstraction
class DatabaseService {
  private provider: DatabaseProvider;
  
  constructor() {
    this.provider = DatabaseProviderFactory.create();
  }
  
  async initialize(): Promise<void> {
    await this.provider.initialize();
  }
  
  getConnection() {
    return this.provider.getConnection();
  }
  
  async migrate(): Promise<void> {
    await this.provider.migrate();
  }
}
```

---

## 🌐 **MODULAR API RESPONSE STANDARDS**

### **Standardized Response Format**
```typescript
// Unified API response interface
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
    version: string;
    request_id: string;
  };
}

// Response builder utility
class ResponseBuilder {
  static success<T>(data: T, message?: string, meta?: any): APIResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        request_id: generateRequestId(),
        ...meta
      }
    };
  }
  
  static error(code: string, message: string, details?: any): APIResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        request_id: generateRequestId()
      }
    };
  }
  
  static paginated<T>(
    data: T[], 
    pagination: { page: number; limit: number; total: number }
  ): APIResponse<T[]> {
    return {
      success: true,
      data,
      meta: {
        pagination: {
          ...pagination,
          totalPages: Math.ceil(pagination.total / pagination.limit)
        },
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        request_id: generateRequestId()
      }
    };
  }
}

// Global error handler for modular APIs
export function globalErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] || generateRequestId();
  
  // Log error with context
  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    requestId,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    eventId: req.context?.eventId
  });
  
  // Handle different error types
  if (error instanceof ValidationError) {
    res.status(400).json(ResponseBuilder.error(
      'VALIDATION_ERROR',
      'Invalid input data',
      error.details
    ));
  } else if (error instanceof AuthenticationError) {
    res.status(401).json(ResponseBuilder.error(
      'AUTHENTICATION_ERROR',
      'Authentication required'
    ));
  } else if (error instanceof AuthorizationError) {
    res.status(403).json(ResponseBuilder.error(
      'AUTHORIZATION_ERROR',
      'Insufficient permissions'
    ));
  } else if (error instanceof NotFoundError) {
    res.status(404).json(ResponseBuilder.error(
      'NOT_FOUND',
      'Resource not found'
    ));
  } else {
    // Internal server error
    res.status(500).json(ResponseBuilder.error(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? error.stack : undefined
    ));
  }
}
```

---

## 📱 **FRONTEND ARCHITECTURE (Enhanced Current Stack)**

### **React 18 + Vite Enhanced Structure**
```
client/
├── src/
│   ├── components/           # Component library
│   │   ├── ui/              # ShadCN UI components
│   │   ├── forms/           # Form components with validation
│   │   ├── layout/          # Layout components
│   │   ├── dashboard/       # Dashboard-specific components
│   │   ├── rsvp/           # RSVP-specific components
│   │   ├── guest/          # Guest management components
│   │   ├── communication/  # Communication components
│   │   ├── accommodation/  # Accommodation components
│   │   ├── transportation/ # Transportation components
│   │   └── reports/        # Reporting components
│   ├── pages/              # Page components
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── events/         # Event management pages
│   │   ├── guests/         # Guest management pages
│   │   ├── rsvp/           # RSVP pages
│   │   ├── communications/ # Communication pages
│   │   ├── accommodations/ # Accommodation pages
│   │   ├── transportation/ # Transportation pages
│   │   └── reports/        # Report pages
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts      # Authentication hook
│   │   ├── useEvents.ts    # Event management hook
│   │   ├── useGuests.ts    # Guest management hook
│   │   ├── useRSVP.ts      # RSVP hook
│   │   └── useApi.ts       # API communication hook
│   ├── lib/                # Utilities and configurations
│   │   ├── api.ts          # API client configuration
│   │   ├── auth.ts         # Authentication utilities
│   │   ├── validation.ts   # Form validation schemas
│   │   ├── constants.ts    # Application constants
│   │   └── utils.ts        # General utilities
│   ├── stores/             # State management
│   │   ├── authStore.ts    # Authentication state
│   │   ├── eventStore.ts   # Event state
│   │   └── appStore.ts     # Global application state
│   ├── types/              # TypeScript definitions
│   │   ├── api.ts          # API response types
│   │   ├── auth.ts         # Authentication types
│   │   ├── event.ts        # Event types
│   │   └── guest.ts        # Guest types
│   └── styles/             # Styling files
│       ├── globals.css     # Global styles
│       ├── components.css  # Component-specific styles
│       └── themes.css      # Theme definitions
```

### **Enhanced State Management**
```typescript
// Enhanced API client with provider awareness
class ApiClient {
  private baseURL: string;
  private authProvider: 'custom' | 'supabase';
  
  constructor() {
    this.baseURL = process.env.VITE_API_BASE_URL || '/api/v1';
    this.authProvider = process.env.VITE_AUTH_PROVIDER as 'custom' | 'supabase' || 'custom';
  }
  
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<APIResponse<T>> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.json());
    }
    
    return response.json();
  }
  
  private async getAuthToken(): Promise<string | null> {
    if (this.authProvider === 'supabase') {
      // Get Supabase token
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } else {
      // Get custom JWT token
      return localStorage.getItem('auth_token');
    }
  }
}

// Enhanced authentication hook with provider support
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authProvider = process.env.VITE_AUTH_PROVIDER || 'custom';
  
  const login = useCallback(async (credentials: LoginCredentials) => {
    if (authProvider === 'supabase') {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw new Error(error.message);
      setUser(data.user);
    } else {
      const response = await apiClient.request<AuthResult>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      setUser(response.data.user);
      localStorage.setItem('auth_token', response.data.accessToken);
    }
  }, [authProvider]);
  
  const logout = useCallback(async () => {
    if (authProvider === 'supabase') {
      await supabase.auth.signOut();
    } else {
      await apiClient.request('/auth/logout', { method: 'POST' });
      localStorage.removeItem('auth_token');
    }
    setUser(null);
  }, [authProvider]);
  
  return { user, login, logout, isLoading };
}
```

---

## 🚀 **DEPLOYMENT ARCHITECTURE**

### **Enhanced Deployment Configuration**
```yaml
# docker-compose.yml - Multi-provider deployment
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - AUTH_PROVIDER=${AUTH_PROVIDER:-custom}
      - DATABASE_PROVIDER=${DATABASE_PROVIDER:-postgres}
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    depends_on:
      - postgres
      - redis
    
  postgres:
    image: postgres:16
    environment:
      - POSTGRES_DB=wedding_platform
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

### **Environment Configuration Templates**
```bash
# .env.custom - Custom auth + PostgreSQL
AUTH_PROVIDER=custom
DATABASE_PROVIDER=postgres
DATABASE_URL=postgresql://user:pass@localhost:5432/wedding_platform
JWT_SECRET=your-super-secret-jwt-key
REDIS_URL=redis://localhost:6379

# .env.supabase - Supabase auth + Supabase database
AUTH_PROVIDER=supabase
DATABASE_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# .env.hybrid - Custom auth + Supabase database
AUTH_PROVIDER=custom
DATABASE_PROVIDER=supabase
JWT_SECRET=your-super-secret-jwt-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

---

## 📈 **MIGRATION STRATEGY**

### **Phase 1: API Modularization (Week 1-3)**
1. **Extract existing routes** from monolithic `routes.ts`
2. **Create modular API structure** following VER4 architecture
3. **Implement provider abstractions** for auth and database
4. **Add comprehensive middleware stack**
5. **Test API endpoints** for functionality parity

### **Phase 2: Provider Integration (Week 4-5)**
1. **Implement Supabase auth provider**
2. **Implement Supabase database provider**
3. **Create deployment configuration templates**
4. **Test both provider configurations**
5. **Validate provider switching capabilities**

### **Phase 3: Frontend Enhancements (Week 6-7)**
1. **Update API client** for modular endpoints
2. **Enhance authentication hooks** for provider support
3. **Improve state management** patterns
4. **Add provider-specific UI elements**
5. **Test frontend with both providers**

### **Phase 4: Testing & Deployment (Week 8)**
1. **Comprehensive testing** of all configurations
2. **Performance optimization**
3. **Security audit** of provider implementations
4. **Documentation updates**
5. **Production deployment**

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Core Infrastructure**
- [ ] Modular API architecture implementation
- [ ] Provider abstraction system
- [ ] Enhanced middleware stack
- [ ] Standardized response format
- [ ] Error handling system

### **Authentication System**
- [ ] Custom JWT authentication provider
- [ ] Supabase authentication provider
- [ ] Role-based access control
- [ ] Session management
- [ ] OAuth integration support

### **Database System**
- [ ] PostgreSQL + Drizzle provider
- [ ] Supabase PostgreSQL provider
- [ ] Schema compatibility layer
- [ ] Migration system
- [ ] Connection pooling

### **Frontend Enhancements**
- [ ] Enhanced API client
- [ ] Provider-aware authentication
- [ ] Improved state management
- [ ] Component library updates
- [ ] Type safety improvements

### **Deployment & Operations**
- [ ] Docker configuration
- [ ] Environment templates
- [ ] Health check system
- [ ] Monitoring integration
- [ ] Documentation updates

---

*This VER4 Final Architecture Plan provides a comprehensive roadmap for maintaining the current proven technology stack while adding flexible provider support and resolving the monolithic API structure. The modular design ensures scalability, maintainability, and future extensibility.*