# 🏗️ **VER3 COMPLETE ARCHITECTURE PLAN**
## **Wedding RSVP Platform - Technical Architecture Specification**

*Version: 3.0 Complete*  
*Target Implementation: V4 Next.js Rebuild*  
*Last Updated: January 27, 2025*

---

## 📋 **ARCHITECTURE OVERVIEW**

### **System Philosophy**
- **Multi-Tenant SaaS**: Complete event isolation with shared infrastructure
- **Mobile-First**: Progressive Web App with offline capabilities  
- **API-First**: RESTful services with GraphQL future consideration
- **Security-First**: Zero-trust architecture with defense in depth
- **Performance-First**: Sub-2-second load times with intelligent caching

### **Technology Stack**
```
Frontend:    Next.js 15 + React 19 + TypeScript + Tailwind CSS
Backend:     Next.js API Routes + Middleware Stack
Database:    PostgreSQL 16 + Drizzle ORM + Connection Pooling
Auth:        NextAuth.js + JWT + Role-Based Access Control
Styling:     Tailwind CSS + ShadCN UI + Apple iOS 18 Design
Email:       Resend + Gmail OAuth2 + Outlook OAuth2 + SMTP Fallback
WhatsApp:    Business API + Twilio + Web.js (Development)
Storage:     Vercel Blob + Cloudinary (Images)
Monitoring:  Vercel Analytics + Sentry + Custom Health Checks
Deployment:  Vercel + GitHub Actions + Preview Deployments
```

---

## 🏛️ **SYSTEM ARCHITECTURE**

### **High-Level Architecture Diagram**
```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────┤
│  Web App (Next.js)  │  Mobile PWA  │  Admin Dashboard       │
│  - Guest RSVP       │  - Offline   │  - Event Management    │
│  - Event Pages      │  - Push      │  - Guest Management    │
│  - Communication    │  - Native    │  - Analytics           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTPS/HTTP2
┌─────────────────────────────────────────────────────────────┐
│                 APPLICATION LAYER                           │
├─────────────────────────────────────────────────────────────┤
│           Next.js 15 Application Server                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   App       │ │   API       │ │ Middleware  │            │
│  │   Router    │ │   Routes    │ │   Stack     │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ Connection Pool
┌─────────────────────────────────────────────────────────────┐
│                  DATA LAYER                                 │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL 16  │  Redis Cache  │  File Storage              │
│  - Multi-tenant │  - Sessions   │  - Images                  │
│  - ACID         │  - Query      │  - Documents               │
│  - Drizzle ORM  │  - Rate Limit │  - Templates               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ External APIs
┌─────────────────────────────────────────────────────────────┐
│               INTEGRATION LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  Email Services │ WhatsApp APIs │ Auth Providers             │
│  - Resend       │ - Business API│ - Google OAuth             │
│  - Gmail OAuth  │ - Twilio      │ - Microsoft OAuth          │
│  - SMTP         │ - Web.js      │ - GitHub OAuth             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ **DATABASE ARCHITECTURE**

### **Multi-Tenant Data Model**
```sql
-- Core Tables (Multi-Tenant)
events              -- Event isolation boundary
├── users           -- Platform users (admins, planners, couples)
├── guests          -- Event guests with RSVP data
├── ceremonies      -- Event ceremonies/functions
├── guest_ceremonies-- Guest-ceremony attendance mapping
├── accommodations  -- Hotel and room management
├── transportation  -- Transport providers and assignments
├── communications  -- Message history and templates
├── rsvp_responses  -- Detailed RSVP response data
└── event_settings  -- Per-event configuration

-- Supporting Tables
meal_options        -- Ceremony meal choices
guest_meal_selections-- Guest meal preferences
plus_ones          -- Guest +1 management
relationships      -- Family relationship tracking
communication_templates-- Email/WhatsApp templates
audit_logs         -- System audit trail
user_sessions      -- Authentication sessions
```

### **Drizzle Schema Structure**
```typescript
// Event-Level Isolation
export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  couple_names: varchar('couple_names', { length: 255 }).notNull(),
  wedding_date: date('wedding_date').notNull(),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  status: eventStatusEnum('status').default('draft'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Multi-Tenant Guest Management
export const guests = pgTable('guests', {
  id: uuid('id').defaultRandom().primaryKey(),
  event_id: uuid('event_id').references(() => events.id).notNull(),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  side: guestSideEnum('side').notNull(), // 'bride' | 'groom'
  rsvp_status: rsvpStatusEnum('rsvp_status').default('pending'),
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
}));
```

### **Data Relationships**
```
event (1) ──── (N) guests
event (1) ──── (N) ceremonies  
event (1) ──── (N) accommodations
event (1) ──── (N) transportation
guests (N) ──── (N) ceremonies [guest_ceremonies]
guests (1) ──── (N) rsvp_responses
guests (1) ──── (N) accommodations
guests (1) ──── (N) transportation
```

---

## 🔐 **AUTHENTICATION & AUTHORIZATION**

### **NextAuth.js Configuration**
```typescript
// Multi-Provider Authentication
providers: [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      // bcrypt password verification
      // JWT token generation
      // Role assignment
    }
  }),
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }),
  MicrosoftEntraIDProvider({
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  }),
]
```

### **Role-Based Access Control (RBAC)**
```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',    // Platform administration
  ADMIN = 'admin',                // Full event access
  PLANNER = 'planner',            // Event planning access
  COUPLE = 'couple',              // Event owner access
  GUEST = 'guest',                // Limited guest access
}

// Permission Matrix
interface Permissions {
  events: {
    create: UserRole[];
    read: UserRole[];
    update: UserRole[];
    delete: UserRole[];
  };
  guests: {
    create: UserRole[];
    read: UserRole[];
    update: UserRole[];
    delete: UserRole[];
    import: UserRole[];
    export: UserRole[];
  };
  communications: {
    send: UserRole[];
    view_history: UserRole[];
    manage_templates: UserRole[];
  };
}
```

### **JWT Token Structure**
```typescript
interface JWTPayload {
  sub: string;              // User ID
  email: string;            // User email
  role: UserRole;           // User role
  event_id?: string;        // Current event context
  permissions: string[];    // Granular permissions
  exp: number;             // Expiration timestamp
  iat: number;             // Issued at timestamp
}
```

---

## 🌐 **API ARCHITECTURE**

### **RESTful API Design**
```typescript
// Resource-Based URL Structure
/api/auth/*                 // Authentication endpoints
/api/events/*               // Event management
/api/events/{id}/guests/*   // Guest management (scoped)
/api/events/{id}/ceremonies/* // Ceremony management
/api/events/{id}/rsvp/*     // RSVP management
/api/events/{id}/communications/* // Communication
/api/events/{id}/accommodations/* // Accommodation
/api/events/{id}/transportation/* // Transportation
/api/events/{id}/reports/*  // Reporting and analytics
/api/system/*              // System health and monitoring
```

### **API Response Standards**
```typescript
// Success Response
interface APIResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
    version: string;
  };
}

// Error Response
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    request_id: string;
  };
}
```

### **Middleware Stack**
```typescript
// Request Processing Pipeline
1. CORS Handler              // Cross-origin requests
2. Rate Limiter             // API abuse prevention
3. Request Logger           // Audit trail
4. Body Parser              // JSON/Form parsing
5. Authentication           // JWT validation
6. Authorization            // Permission checking
7. Event Context            // Multi-tenant scoping
8. Input Validation         // Zod schema validation
9. Route Handler            // Business logic
10. Response Formatter      // Standardized responses
11. Error Handler           // Error processing
```

---

## 💌 **COMMUNICATION ARCHITECTURE**

### **Email Service Abstraction**
```typescript
interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<SendResult>;
  verify(): Promise<boolean>;
  getTemplates(): Promise<EmailTemplate[]>;
}

// Provider Implementations
class ResendProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<SendResult> {
    // Resend API implementation
  }
}

class GmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<SendResult> {
    // Gmail OAuth2 + SMTP implementation
  }
}

class OutlookProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<SendResult> {
    // Microsoft Graph API implementation
  }
}
```

### **WhatsApp Integration Strategy**
```typescript
interface WhatsAppProvider {
  name: string;
  send(message: WhatsAppMessage): Promise<SendResult>;
  getQRCode(): Promise<string>;
  isConnected(): Promise<boolean>;
}

// Provider Priority
1. WhatsApp Business API (Production)
2. Twilio WhatsApp API (Backup)
3. WhatsApp Web.js (Development)
```

### **Template System**
```typescript
interface MessageTemplate {
  id: string;
  name: string;
  type: 'email' | 'whatsapp' | 'sms';
  subject?: string;
  content: string;
  variables: TemplateVariable[];
  category: TemplateCategory;
}

// Template Categories
enum TemplateCategory {
  INVITATION = 'invitation',
  REMINDER = 'reminder',
  CONFIRMATION = 'confirmation',
  UPDATE = 'update',
  THANK_YOU = 'thank_you',
}

// Variable Substitution
interface TemplateVariable {
  key: string;
  description: string;
  required: boolean;
  default_value?: string;
}
```

---

## 🎨 **FRONTEND ARCHITECTURE**

### **Next.js App Router Structure**
```
src/
├── app/                    # App Router
│   ├── (auth)/            # Auth group routes
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── events/
│   │   ├── guests/
│   │   ├── communications/
│   │   ├── accommodations/
│   │   ├── transportation/
│   │   └── reports/
│   ├── rsvp/             # Public RSVP routes
│   │   └── [token]/
│   ├── api/              # API routes
│   └── globals.css
├── components/           # Reusable components
│   ├── ui/              # ShadCN UI components
│   ├── forms/           # Form components
│   ├── dashboard/       # Dashboard widgets
│   ├── rsvp/           # RSVP components
│   └── layout/         # Layout components
├── lib/                # Utilities and configs
│   ├── auth.ts         # Auth configuration
│   ├── db.ts           # Database connection
│   ├── email.ts        # Email service
│   ├── whatsapp.ts     # WhatsApp service
│   └── utils.ts        # Utility functions
├── hooks/              # Custom React hooks
├── types/              # TypeScript definitions
└── styles/             # Additional styles
```

### **State Management Strategy**
```typescript
// Server State: TanStack Query
const { data: guests, isLoading, error } = useQuery({
  queryKey: ['guests', eventId],
  queryFn: () => fetchGuests(eventId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Client State: React State + Context
const [currentEvent, setCurrentEvent] = useContext(EventContext);

// Form State: React Hook Form + Zod
const form = useForm<GuestFormData>({
  resolver: zodResolver(guestSchema),
  defaultValues: {
    firstName: '',
    lastName: '',
    email: '',
  },
});
```

### **Component Architecture**
```typescript
// Atomic Design Pattern
atoms/          // Basic UI elements (Button, Input)
molecules/      // Component combinations (SearchInput, Card)
organisms/      // Complex components (DataTable, Form)
templates/      // Page layouts
pages/          // Complete pages
```

---

## 🚀 **PERFORMANCE ARCHITECTURE**

### **Frontend Optimization**
```typescript
// Code Splitting
const GuestManagement = lazy(() => import('./GuestManagement'));
const AccommodationManager = lazy(() => import('./AccommodationManager'));

// Image Optimization
import Image from 'next/image';
<Image
  src="/hero-image.jpg"
  alt="Wedding"
  width={800}
  height={600}
  priority
  placeholder="blur"
/>

// Bundle Analysis
// next build --analyze
```

### **Caching Strategy**
```typescript
// Multi-Layer Caching
1. Browser Cache     // Static assets (1 year)
2. CDN Cache        // Dynamic content (1 hour)
3. Application Cache // TanStack Query (5 minutes)
4. Database Cache   // Redis (30 minutes)
5. Connection Pool  // Database connections
```

### **Database Optimization**
```sql
-- Strategic Indexes
CREATE INDEX CONCURRENTLY idx_guests_event_rsvp 
ON guests(event_id, rsvp_status);

CREATE INDEX CONCURRENTLY idx_guest_ceremonies_ceremony 
ON guest_ceremonies(ceremony_id, attendance_status);

CREATE INDEX CONCURRENTLY idx_communications_event_status 
ON communications(event_id, status, created_at);

-- Partition Strategy (Future)
PARTITION events BY RANGE (created_at);
PARTITION guests BY HASH (event_id);
```

---

## 🔒 **SECURITY ARCHITECTURE**

### **Security Headers**
```typescript
// Next.js Security Headers
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
];
```

### **Input Validation & Sanitization**
```typescript
// Zod Schema Validation
const guestCreateSchema = z.object({
  firstName: z.string().min(1).max(100).regex(/^[a-zA-Z\s]+$/),
  lastName: z.string().min(1).max(100).regex(/^[a-zA-Z\s]+$/),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
});

// SQL Injection Prevention
const guests = await db.select()
  .from(guestsTable)
  .where(and(
    eq(guestsTable.eventId, eventId),
    eq(guestsTable.id, guestId)
  ));
```

### **Rate Limiting**
```typescript
// API Rate Limiting
const rateLimit = {
  '/api/auth/login': { requests: 5, window: '15m' },
  '/api/rsvp/*': { requests: 10, window: '5m' },
  '/api/communications/send': { requests: 50, window: '1h' },
  '/api/*': { requests: 100, window: '15m' },
};
```

---

## 📊 **MONITORING & OBSERVABILITY**

### **Health Check System**
```typescript
// Health Check Endpoints
GET /api/health          // Overall system health
GET /api/health/db       // Database connectivity
GET /api/health/external // External service status
GET /api/health/detailed // Comprehensive health report

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthStatus;
    email: HealthStatus;
    whatsapp: HealthStatus;
    storage: HealthStatus;
  };
}
```

### **Logging Strategy**
```typescript
// Structured Logging
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata: {
    userId?: string;
    eventId?: string;
    requestId: string;
    userAgent?: string;
    ip?: string;
  };
}
```

---

## 🧩 API MODULARITY & MAINTAINABILITY POLICY

- All API endpoints must be implemented as modular route files (one file per endpoint) following the Next.js App Router convention.
- Monolithic routes.ts files are strictly prohibited.
- Shared business logic should be extracted to service or utility modules in `lib/` or `services/`.
- This ensures separation of concerns, scalability, and maintainability as the codebase grows.

---

## ⚙️ FLEXIBLE PROVIDER OPTIONABILITY

- The platform supports multiple authentication and database providers, with a single provider active per deployment.
- **Authentication:**
  - Supports both NextAuth (with Google, Microsoft, Credentials, etc.) and Supabase Auth.
  - Controlled by the `NEXT_PUBLIC_USE_SUPABASE_AUTH` environment variable.
  - Only one auth system is active per deployment; no mixed sessions.
- **Database:**
  - Supports both Supabase Postgres and standard Postgres.
  - Controlled by the `NEXT_PUBLIC_USE_SUPABASE_DB` environment variable.
  - Only one database system is active per deployment.
- This optionability allows for easy adaptation to different hosting, compliance, or customer requirements.
- All code branches cleanly based on these flags, and only the selected provider is initialized and exposed at runtime.

---

## 🚀 **DEPLOYMENT ARCHITECTURE**

### **Vercel Deployment Configuration**
```javascript
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "env": {
    "DATABASE_URL": "@database-url",
    "NEXTAUTH_SECRET": "@nextauth-secret",
    "RESEND_API_KEY": "@resend-api-key"
  },
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### **Environment Strategy**
```
Development → Preview → Production

- Feature branches → Preview deployments
- Main branch → Production deployment
- Database migrations → Manual approval
- Environment variables → Encrypted secrets
```

---

## 📈 **SCALABILITY ROADMAP**

### **Phase 1: Single Tenant (Current)**
- Single database instance
- File-based sessions
- Direct API calls
- Manual scaling

### **Phase 2: Multi-Tenant Optimization**
- Redis session store
- Database connection pooling
- API rate limiting
- Horizontal scaling preparation

### **Phase 3: Enterprise Scale**
- Database sharding
- Microservices architecture
- Event-driven communication
- Auto-scaling infrastructure

---

## ✅ **IMPLEMENTATION PRIORITIES**

### **Immediate (Week 1-2)**
1. Database schema implementation
2. Authentication system setup
3. Basic CRUD operations
4. RSVP form functionality

### **Short-term (Week 3-4)**
1. Email service integration
2. Guest management interface
3. Event setup wizard
4. Basic reporting

### **Medium-term (Month 2)**
1. WhatsApp integration
2. Accommodation management
3. Transportation system
4. Advanced analytics

### **Long-term (Month 3+)**
1. Performance optimization
2. Security hardening
3. Advanced features
4. Enterprise capabilities

---

*This architecture plan serves as the technical foundation for the V4 rebuild. All implementation decisions must align with this specification.*