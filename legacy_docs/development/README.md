# Development Guide

## Overview

This guide provides comprehensive information for developers working on the Wedding RSVP Platform. The platform uses modern web technologies with a focus on type safety, design system consistency, and luxury user experiences.

## 🚀 Quick Start

### Prerequisites
- Node.js 20 or higher
- PostgreSQL 16
- Git for version control

### Environment Setup
1. **Clone Repository**: Access the Replit environment
2. **Install Dependencies**: Dependencies are pre-installed via `package.json`
3. **Database Setup**: PostgreSQL is automatically configured
4. **Environment Variables**: Set up in Replit secrets

### First Run
```bash
# Start the development server
npm run dev

# The application will be available at the Replit URL
# Backend API: /api/*
# Frontend: All other routes
```

## 🛠️ Technology Stack

### Backend Technologies
- **Node.js 20**: JavaScript runtime environment
- **TypeScript**: Type-safe JavaScript development
- **Express.js**: Web application framework
- **Drizzle ORM**: Type-safe database operations
- **PostgreSQL**: Relational database with multi-tenant support
- **Passport.js**: Authentication middleware
- **Zod**: Runtime type validation

### Frontend Technologies
- **React 18**: Component-based UI library
- **TypeScript**: Type-safe client development
- **Vite**: Fast build tool and dev server
- **TanStack Query**: Data fetching and state management
- **Wouter**: Lightweight client-side routing
- **shadcn/ui**: Modern component library
- **Tailwind CSS**: Utility-first CSS framework

### Development Tools
- **ESLint**: Code linting and quality
- **Prettier**: Code formatting
- **Drizzle Kit**: Database migrations
- **esbuild**: Fast JavaScript bundler

## 📁 Project Structure

```
/
├── client/                     # Frontend React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── forms/         # Form-specific components
│   │   │   └── layout/        # Layout components
│   │   ├── pages/             # Route components
│   │   ├── design-system/     # Design tokens and utilities
│   │   │   ├── tokens.ts      # Master design tokens
│   │   │   ├── components.ts  # Component style utilities
│   │   │   └── index.ts       # Unified exports
│   │   ├── lib/               # Client utilities
│   │   │   ├── api-utils.ts   # API communication
│   │   │   ├── queryClient.ts # TanStack Query setup
│   │   │   └── utils.ts       # General utilities
│   │   ├── hooks/             # Custom React hooks
│   │   └── types/             # Frontend-specific types
├── server/                     # Backend Express application
│   ├── routes.ts              # API route handlers
│   ├── middleware.ts          # Authentication and validation
│   ├── db.ts                  # Database connection setup
│   ├── index.ts              # Server entry point
│   └── fallback.ts           # Client-side routing support
├── shared/                     # Shared TypeScript types and schemas
│   ├── schema.ts              # Database schema definitions
│   └── types.ts               # Shared type definitions
├── docs/                       # Comprehensive documentation
│   ├── design-system/         # Design system documentation
│   ├── architecture/          # System architecture docs
│   ├── api/                   # API documentation
│   ├── features/              # Feature-specific docs
│   └── implementation/        # Implementation guides
├── scripts/                    # Database migration scripts
└── public/                     # Static assets
```

## 🔧 Development Workflow

### Code Organization Principles
1. **Single Responsibility**: Each file has a clear, single purpose
2. **Type Safety**: Full TypeScript coverage with strict settings
3. **Component Reusability**: Shared components with consistent styling
4. **Design System Compliance**: All styling through design tokens
5. **API First**: Backend provides data, frontend handles presentation

### Design System Workflow
1. **Design Tokens First**: All styling decisions in `/client/src/design-system/tokens.ts`
2. **CSS Variables**: Theme-aware variables in `/client/src/index.css`
3. **Component Utilities**: Reusable style functions in `/client/src/design-system/components.ts`
4. **Tailwind Integration**: Design system tokens mapped to Tailwind classes
5. **No Hardcoded Colors**: All components use design system tokens

### Database Development
1. **Schema First**: Define models in `/shared/schema.ts`
2. **Type Generation**: Drizzle generates TypeScript types
3. **Migration Scripts**: Create scripts in `/scripts/` for schema changes
4. **Push Changes**: Use `npm run db:push` to apply schema changes
5. **No Manual SQL**: Always use Drizzle ORM for database operations

## 📊 Database Management

### Schema Development
```typescript
// shared/schema.ts
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const events = pgTable('wedding_events', {
  id: serial('id').primaryKey(),
  coupleName1: text('couple_name_1').notNull(),
  coupleName2: text('couple_name_2').notNull(),
  weddingDate: timestamp('wedding_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Type generation
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
```

### Migration Workflow
```bash
# Push schema changes to database
npm run db:push

# Generate migration files (when needed)
npm run db:generate

# Apply migrations
npm run db:migrate
```

### Multi-Tenant Implementation
All tables include `eventId` foreign keys for complete data isolation:

```sql
-- All queries automatically filtered by eventId
SELECT * FROM guests WHERE event_id = :currentEventId;
```

## 🎨 Design System Development

### Adding New Colors
1. **Update Tokens**: Add color to `/client/src/design-system/tokens.ts`
2. **CSS Variables**: Define HSL values in `/client/src/index.css`
3. **Tailwind Config**: Map to Tailwind classes if needed
4. **Documentation**: Update color documentation

### Creating Components
1. **Design System First**: Use existing style utilities
2. **Token-Based Styling**: No hardcoded colors or spacing
3. **Theme Support**: Test in both light and dark modes
4. **Accessibility**: Ensure proper contrast and focus states
5. **TypeScript**: Full type safety with proper props interfaces

### Style Utility Example
```typescript
// client/src/design-system/components.ts
export const getCardClasses = (variant: 'default' | 'elevated') => {
  const base = 'rounded-xl border backdrop-blur-sm';
  const variants = {
    default: 'bg-card/60 border-border',
    elevated: 'bg-card/80 border-border shadow-lg',
  };
  return `${base} ${variants[variant]}`;
};
```

## 🔄 API Development

### Route Structure
```typescript
// server/routes.ts
app.get('/api/events', isAuthenticated, async (req, res) => {
  try {
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.userId, req.user.id));
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Validation Pattern
```typescript
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';

const eventSchema = createInsertSchema(eventsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

app.post('/api/events', isAuthenticated, async (req, res) => {
  const validation = eventSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: validation.error.errors 
    });
  }
  
  // Process validated data
  const newEvent = await db.insert(eventsTable)
    .values(validation.data)
    .returning();
    
  res.status(201).json(newEvent[0]);
});
```

## 🔍 Frontend Development

### Component Development Pattern
```typescript
// Component with design system integration
import { getCardClasses, getButtonClasses } from '@/design-system';

interface EventCardProps {
  event: Event;
  onEdit: (id: number) => void;
}

export function EventCard({ event, onEdit }: EventCardProps) {
  return (
    <div className={getCardClasses('default')}>
      <h3 className="text-lg font-semibold text-foreground">
        {event.coupleName1} & {event.coupleName2}
      </h3>
      <button 
        onClick={() => onEdit(event.id)}
        className={getButtonClasses('primary')}
      >
        Edit Event
      </button>
    </div>
  );
}
```

### Data Fetching Pattern
```typescript
// TanStack Query with type safety
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useEvents() {
  return useQuery({
    queryKey: ['/api/events'],
    queryFn: () => apiRequest<Event[]>('/api/events'),
  });
}

function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: NewEvent) => 
      apiRequest<Event>('/api/events', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
  });
}
```

## 🧪 Testing Strategy

### Type Safety Testing
- **TypeScript Compilation**: Ensures type correctness
- **Strict Mode**: Enabled for maximum type checking
- **Schema Validation**: Zod schemas catch runtime errors

### Design System Testing
- **Visual Consistency**: All components use design tokens
- **Theme Testing**: Verify components in light/dark modes
- **Accessibility**: WCAG AA compliance testing

### Integration Testing
- **API Endpoints**: Test with real database operations
- **Authentication**: Verify session management
- **Multi-Tenancy**: Ensure proper data isolation

## 🚀 Deployment

### Build Process
```bash
# Frontend build
npm run build:client

# Backend build  
npm run build:server

# Combined build
npm run build
```

### Environment Configuration
```bash
# Required environment variables
DATABASE_URL=postgresql://...
SESSION_SECRET=your-session-secret
SENDGRID_API_KEY=your-sendgrid-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Production Considerations
- **Session Store**: PostgreSQL-backed sessions
- **Static Assets**: Served through Express
- **Database**: Connection pooling enabled
- **Security**: HTTPS enforced, secure cookies

## 🔧 Development Tools

### Useful Scripts
```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Database
npm run db:push      # Push schema changes
npm run db:generate  # Generate migrations
npm run db:migrate   # Apply migrations
npm run db:studio    # Open database studio

# Code Quality
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run type-check   # TypeScript type checking
```

### VS Code Extensions
- **TypeScript**: Enhanced TypeScript support
- **Tailwind CSS IntelliSense**: Tailwind class suggestions
- **ES7+ React/Redux/React-Native snippets**: React snippets
- **Prettier**: Code formatting
- **ESLint**: Code linting

## 📋 Best Practices

### Code Style
- **TypeScript First**: All new code in TypeScript
- **Functional Components**: React hooks over class components
- **Design System**: Never hardcode colors or spacing
- **Error Handling**: Comprehensive error boundaries and validation
- **Performance**: Lazy loading and code splitting

### Database Practices
- **Event Scoping**: All queries filtered by current event
- **Type Safety**: Use Drizzle-generated types
- **Migrations**: Version-controlled schema changes
- **Indexing**: Proper indexes for performance

### Security Practices
- **Input Validation**: Zod schemas for all inputs
- **Authentication**: Session-based with proper middleware
- **Authorization**: Role-based access control
- **Data Isolation**: Multi-tenant architecture

## 🔄 Maintenance

### Regular Tasks
- **Dependency Updates**: Keep packages current
- **Security Audits**: Regular vulnerability scanning
- **Performance Monitoring**: Query optimization
- **Documentation**: Keep docs up to date

### Debugging
- **Browser DevTools**: React DevTools, Network tab
- **Database Queries**: Drizzle query logging
- **Session Management**: Session debugging tools
- **Error Tracking**: Comprehensive error logging