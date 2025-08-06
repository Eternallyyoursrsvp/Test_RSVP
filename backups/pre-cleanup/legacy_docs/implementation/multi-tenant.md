# Multi-Tenant Architecture Implementation

## Overview

The Wedding RSVP Platform implements a sophisticated multi-tenant architecture ensuring complete data isolation between wedding events. Each event operates as an independent tenant with zero cross-contamination of data.

## 🔒 Core Isolation Principles

### 1. Database-Level Isolation
Every data table includes an `eventId` foreign key that associates records with specific wedding events:

```sql
-- All primary tables follow this pattern
CREATE TABLE guests (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES wedding_events(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  -- other fields...
);

CREATE INDEX idx_guests_event_id ON guests(event_id);
```

### 2. Application-Level Filtering
All database queries automatically include event context filtering:

```typescript
// All queries scoped to current event
const guests = await db.select()
  .from(guestsTable)
  .where(eq(guestsTable.eventId, currentEventId));
```

### 3. Session-Based Context Management
User sessions maintain current event context with automatic data scoping:

```typescript
// Middleware ensures event context
export const requireEventContext = (req: Request, res: Response, next: NextFunction) => {
  const currentEventId = req.session.currentEventId;
  if (!currentEventId) {
    return res.status(400).json({ error: 'No event context selected' });
  }
  req.eventId = currentEventId;
  next();
};
```

## 🛡️ Security Implementation

### Event Context Validation
Context-aware storage methods include explicit validation:

```typescript
async getGuestWithEventContext(id: number, eventId: number): Promise<Guest | undefined> {
  if (!id || !eventId) {
    console.error('Invalid parameters for getGuestWithEventContext', { id, eventId });
    return undefined;
  }
  
  // Verify event exists and user has access
  const eventExists = await this.eventExists(eventId);
  if (!eventExists) {
    console.warn(`Event ID ${eventId} does not exist`);
    return undefined;
  }
  
  // Fetch with strict event context constraint
  const result = await db.select()
    .from(guests)
    .where(and(
      eq(guests.id, id),
      eq(guests.eventId, eventId)
    ));
    
  return result[0];
}
```

### Permission Verification
Role-based access control within event boundaries:

```typescript
// Users can only access events they're authorized for
const userEvents = await db.select()
  .from(eventUsers)
  .where(eq(eventUsers.userId, req.user.id));

const authorizedEventIds = userEvents.map(e => e.eventId);
if (!authorizedEventIds.includes(requestedEventId)) {
  return res.status(403).json({ error: 'Access denied to this event' });
}
```

## 🔄 Context Switching

### Session Management
Event context switching with proper cache invalidation:

```typescript
app.post('/api/current-event', isAuthenticated, async (req, res) => {
  const { eventId } = req.body;
  
  // Verify user has access to this event
  const hasAccess = await verifyEventAccess(req.user.id, eventId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Update session context
  req.session.currentEventId = eventId;
  
  // Clear related caches
  await invalidateEventCaches(eventId);
  
  res.json({ success: true, currentEventId: eventId });
});
```

### Frontend Cache Management
TanStack Query cache invalidation on context changes:

```typescript
const setCurrentEvent = useMutation({
  mutationFn: (eventId: number) => 
    apiRequest('/api/current-event', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    }),
  onSuccess: () => {
    // Invalidate all event-specific caches
    queryClient.invalidateQueries({ 
      predicate: (query) => 
        Array.isArray(query.queryKey) && 
        query.queryKey.some(key => typeof key === 'string' && key.includes('/api/events/'))
    });
  },
});
```

## 📊 Data Architecture

### Event Scoping Pattern
All major entities follow consistent event scoping:

```typescript
// Shared schema pattern
export const createEventScopedTable = (tableName: string, columns: any) => {
  return pgTable(tableName, {
    id: serial('id').primaryKey(),
    eventId: integer('event_id').notNull().references(() => events.id, {
      onDelete: 'cascade',
    }),
    ...columns,
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  });
};

// Applied to all event-scoped tables
export const guests = createEventScopedTable('guests', {
  name: text('name').notNull(),
  email: text('email').notNull(),
  // ... other guest fields
});

export const ceremonies = createEventScopedTable('ceremonies', {
  name: text('name').notNull(),
  date: timestamp('date').notNull(),
  // ... other ceremony fields
});
```

### Cascade Deletion
Event deletion automatically cleans up all related data:

```sql
-- Foreign key constraints ensure data integrity
ALTER TABLE guests 
ADD CONSTRAINT fk_guests_event 
FOREIGN KEY (event_id) REFERENCES wedding_events(id) 
ON DELETE CASCADE;

-- When an event is deleted, all related data is automatically removed
DELETE FROM wedding_events WHERE id = 1;
-- Automatically deletes: guests, ceremonies, accommodations, communications, etc.
```

## 🔍 Query Patterns

### Automatic Event Filtering
All data access methods include event context:

```typescript
// Guest operations
export class GuestService {
  async getGuests(eventId: number): Promise<Guest[]> {
    return db.select()
      .from(guests)
      .where(eq(guests.eventId, eventId));
  }
  
  async createGuest(eventId: number, guestData: NewGuest): Promise<Guest> {
    const [newGuest] = await db.insert(guests)
      .values({ ...guestData, eventId })
      .returning();
    return newGuest;
  }
  
  async updateGuest(eventId: number, guestId: number, updates: Partial<Guest>): Promise<Guest | null> {
    const [updatedGuest] = await db.update(guests)
      .set(updates)
      .where(and(
        eq(guests.id, guestId),
        eq(guests.eventId, eventId) // Critical: event context validation
      ))
      .returning();
    return updatedGuest || null;
  }
}
```

### Join Queries with Event Context
Complex queries maintain event boundaries:

```typescript
// Multi-table queries with event scoping
const guestAccommodations = await db.select({
  guest: guests,
  accommodation: accommodations,
  hotel: hotels,
})
.from(guests)
.leftJoin(accommodations, eq(guests.id, accommodations.guestId))
.leftJoin(hotels, eq(accommodations.hotelId, hotels.id))
.where(and(
  eq(guests.eventId, eventId),
  eq(accommodations.eventId, eventId), // All tables must match event context
  eq(hotels.eventId, eventId)
));
```

## 🚨 Security Safeguards

### Defense in Depth
Multiple layers prevent data leakage:

1. **Database Constraints**: Foreign key relationships enforce event scoping
2. **Application Logic**: All queries include event filtering
3. **Middleware**: Route-level event context validation
4. **Frontend**: UI components respect event boundaries
5. **Session Management**: User context limited to authorized events

### Audit Logging
Comprehensive logging for security monitoring:

```typescript
// Log all cross-event access attempts
const auditLog = async (userId: number, action: string, eventId: number, details: any) => {
  await db.insert(auditLogs).values({
    userId,
    action,
    eventId,
    details: JSON.stringify(details),
    timestamp: new Date(),
    ipAddress: req.ip,
  });
};

// Used throughout the application
await auditLog(req.user.id, 'GUEST_ACCESS', eventId, { guestId, action: 'view' });
```

## 📈 Performance Optimization

### Indexing Strategy
Optimized indexes for event-scoped queries:

```sql
-- Primary indexes for event-scoped lookups
CREATE INDEX idx_guests_event_id ON guests(event_id);
CREATE INDEX idx_ceremonies_event_id ON ceremonies(event_id);
CREATE INDEX idx_accommodations_event_id ON accommodations(event_id);

-- Composite indexes for common query patterns
CREATE INDEX idx_guests_event_status ON guests(event_id, rsvp_status);
CREATE INDEX idx_accommodations_event_guest ON accommodations(event_id, guest_id);
```

### Query Optimization
Efficient data access patterns:

```typescript
// Batch operations with event context
const bulkUpdateGuestStatus = async (eventId: number, guestIds: number[], status: string) => {
  return db.update(guests)
    .set({ rsvpStatus: status, updatedAt: new Date() })
    .where(and(
      eq(guests.eventId, eventId),
      inArray(guests.id, guestIds)
    ));
};
```

## 🔄 Migration Considerations

### Event Data Migration
Safe migration patterns for schema changes:

```typescript
// Migration script template
export async function migrateEventScopedTable(tableName: string) {
  // 1. Verify event isolation before migration
  const eventCounts = await db.select({
    eventId: sql`event_id`,
    count: sql`count(*)`
  })
  .from(sql.identifier(tableName))
  .groupBy(sql`event_id`);
  
  console.log(`Pre-migration event distribution for ${tableName}:`, eventCounts);
  
  // 2. Perform migration with event context preservation
  // ... migration logic ...
  
  // 3. Verify isolation maintained after migration
  const postMigrationCounts = await db.select({
    eventId: sql`event_id`,
    count: sql`count(*)`
  })
  .from(sql.identifier(tableName))
  .groupBy(sql`event_id`);
  
  console.log(`Post-migration event distribution for ${tableName}:`, postMigrationCounts);
}
```

## 🔧 Development Guidelines

### Adding New Event-Scoped Tables
1. **Include eventId**: All tables must have event_id foreign key
2. **Cascade Deletion**: Set up proper cascade relationships
3. **Index Creation**: Add performance indexes
4. **Service Layer**: Implement event-aware service methods
5. **Route Protection**: Add event context middleware
6. **Frontend Integration**: Respect event boundaries in UI

### Testing Multi-Tenancy
```typescript
// Test event isolation
describe('Multi-Tenant Isolation', () => {
  it('should not allow cross-event data access', async () => {
    const event1Guest = await createGuest(event1Id, guestData);
    const event2Guest = await createGuest(event2Id, guestData);
    
    // Attempt to access event1 guest from event2 context
    const result = await guestService.getGuest(event1Guest.id, event2Id);
    expect(result).toBeNull(); // Should not find guest
  });
});
```