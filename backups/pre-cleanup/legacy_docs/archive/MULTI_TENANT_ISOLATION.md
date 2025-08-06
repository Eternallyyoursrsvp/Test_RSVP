# Multi-Tenant Data Isolation in the Wedding Management Platform

## Overview

This document explains the approach used to ensure proper data isolation between different wedding events in the platform. The system is designed to handle multiple concurrent wedding projects while ensuring that data from one event cannot be accessed by users of another event.

## Key Principles

1. **Event Context Validation**: All guest data access is validated against the event context
2. **Tenant-Aware Database Schema**: All relevant tables contain `eventId` as a foreign key to the associated event
3. **Defense in Depth**: Multiple layers of protection ensure isolation even if one layer fails

## Implementation Details

### 1. Database Schema Design

All primary tables include an `eventId` column that associates each record with a specific wedding event:

- `guests` table includes `eventId` for each guest
- `ceremonies` table includes `eventId` for each ceremony
- `accommodations` table includes `eventId` for each accommodation
- etc.

This ensures that at the data storage level, there is a clear association between records and their respective events.

### 2. Context-Aware Storage Access Methods

The standard storage methods that do not include event context (like `getGuest(id)`) have been augmented with context-aware versions (`getGuestWithEventContext(id, eventId)`). The context-aware methods include:

- Explicit validation that the accessed resource belongs to the specified event
- Query-level restrictions that limit database queries to specific event IDs
- Clear logging with warnings when non-context methods are used

Example implementation:

```typescript
async getGuestWithEventContext(id: number, eventId: number): Promise<Guest | undefined> {
  if (!id || !eventId) {
    console.error('Invalid parameters for getGuestWithEventContext', { id, eventId });
    return undefined;
  }
  
  console.log(`Fetching guest with ID: ${id} in event context: ${eventId}`);
  try {
    // First verify the event exists
    const eventExists = await this.eventExists(eventId);
    if (!eventExists) {
      console.warn(`Event ID ${eventId} does not exist in getGuestWithEventContext`);
      return undefined;
    }
    
    // Then fetch the guest with event context constraint
    const result = await db.select().from(guests).where(
      and(
        eq(guests.id, id),
        eq(guests.eventId, eventId)
      )
    );
    
    // Return guest only if it belongs to the specified event
    return result[0];
  } catch (error) {
    console.error(`Error in getGuestWithEventContext for guest ${id}, event ${eventId}:`, error);
    throw new Error(`Failed to retrieve guest with ID ${id} in event context ${eventId}`);
  }
}
```

### 3. API Route Protection

All API routes that access guest data have been updated to use context-aware methods:

#### RSVP Routes
- `/api/rsvp/verify`: Uses `getGuestWithEventContext` to validate RSVP tokens
- `/api/rsvp/submit`: Uses `getGuestWithEventContext` via `RSVPService.processRSVPResponse`
- `/api/admin/rsvp/send-invites`: Uses `getGuestWithEventContext` to validate guest access

#### Guest Management Routes
- `/api/guests/:id`: Now requires event context from query parameter or session
- `/api/events/:eventId/guests`: Uses event context for retrieving guests
- `/api/guests/:id` (PUT): Validates guest belongs to the correct event before updating
- `/api/guests/:id` (DELETE): Requires event context and validates guest belongs to event

#### WhatsApp Communication Routes
- `/api/whatsapp/send-message`: Uses `getGuestWithEventContext` to validate recipient context
- `/api/whatsapp/send-bulk`: Uses `getGuestWithEventContext` for all recipients

### 4. Error Handling & Logging

Enhanced error handling ensures that any attempt to access data across event boundaries:

- Fails gracefully with appropriate error messages
- Generates warning logs for security monitoring
- Returns clear user-facing messages that don't leak information

## Potential Weaknesses and Mitigations

1. **Direct Method Access**: Some internal methods might still use `getGuest()` directly
   - Mitigation: Added warning logs for all non-context-aware method usage
   - Mitigation: Planning to deprecate non-context methods in future versions

2. **Missing JOIN Constraints**: Some complex queries might miss event context constraints
   - Mitigation: Added comprehensive logging to identify such scenarios
   - Mitigation: Code reviews specifically looking for missing event context

## Future Enhancements

1. **Event Assignment System**: Implement a proper event assignment system for wedding planners
   - Create an `event_assignments` table to link planners to specific events
   - Update access control logic to check event assignments for planners
   - Add UI for admins to assign planners to events
   - Current workaround: Wedding planners can see all events (added May 19, 2025)

2. **Audit Logging**: Implement comprehensive audit logging for all cross-event access attempts
3. **Authentication Integration**: Enhance the system to use event-specific authentication tokens
4. **Row-Level Security**: Consider implementing database-level row security policies

## Conclusion

The platform uses a multi-layered approach to ensure event data isolation. The combination of database schema design, context-aware methods, and API route protection provides robust protection against cross-event data leakage while maintaining a clean and maintainable codebase.

## Recent Implementation Progress

As of May 19, 2025, the following progress has been made:

1. Implemented context-aware guest access method `getGuestWithEventContext`
2. Added warning logs and documentation for unsafe non-context methods
3. Updated all core guest management routes to use context validation:
   - GET/PUT/DELETE individual guest endpoints
   - Bulk guest listing endpoint 
4. Updated WhatsApp communication routes for proper isolation:
   - Individual message sending
   - Bulk message distribution
5. Updated RSVP routes for proper isolation:
   - Guest verification
   - RSVP submission
   - Invitation sending
6. Implemented ceremony-related route isolation:
   - Ceremony deletion with event context validation
   - Guest-ceremony attendance with cross-validation between guest and ceremony events
7. Enhanced meal selection routes for multi-tenant security:
   - Added guest-ceremony-meal cross-validation when creating selections
   - Implemented comprehensive validation for meal selection updates
   - Added detailed logging for troubleshooting and security auditing
   
8. Improved authentication and session management:
   - Enhanced session persistence with optimized cookie settings
   - Fixed user session handling to maintain consistent authentication state
   - Implemented proper event visibility based on user roles
   - Added interim solution for wedding planner event access

### Completed Route Updates

The following specific route endpoints now have proper multi-tenant isolation:

1. **Guest Management:**
   - `/api/guests/:id` (GET/PUT/DELETE)
   - `/api/events/:eventId/guests` (GET)

2. **WhatsApp Communication:**
   - `/api/whatsapp/send-message` (POST)
   - `/api/whatsapp/send-bulk` (POST)
   - `/api/whatsapp/templates` endpoints

3. **RSVP Management:**
   - `/api/rsvp/verify` (GET)
   - `/api/rsvp/submit` (POST)
   - `/api/admin/rsvp/send-invites` (POST)

4. **Ceremony Management:**
   - `/api/ceremonies/:id` (DELETE)
   - `/api/guests/:guestId/attendance` (POST)

5. **Meal Management:**
   - `/api/guests/:guestId/meal-selections` (POST)
   - `/api/meal-selections/:id` (PUT)

Remaining work includes applying similar isolation techniques to:
- Travel information routes
- Accommodation allocation routes
- Relationship type and template routes
- Statistics and reporting endpoints