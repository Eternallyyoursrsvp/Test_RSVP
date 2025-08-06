# Wedding RSVP Application System Architecture

## Overview
This document outlines the system architecture of the Wedding RSVP application, detailing the technical components, data flow, and integration points. This architecture is designed to support the user flows outlined in the UserFlow.md document and aligns with the development roadmap.

## System Architecture Diagram

```
                                    +--------------------+
                                    |                    |
                                    |  Client Browser    |
                                    |                    |
                                    +----------+---------+
                                               |
                                               | HTTPS
                                               |
                  +----------------------------v------------------------------+
                  |                                                           |
                  |                   Vite Frontend Server                    |
                  |                 (React + TypeScript)                      |
                  |                                                           |
                  +----------------------------+------------------------------+
                                               |
                                               | API Calls
                                               |
+--------------+  +----------------------------v------------------------------+
|              |  |                                                           |
|   External   |  |                Express Backend Server                     |
|   Services   |  |                    (Node.js)                              |
|              |  |                                                           |
|  +----------+|  | +-------------+  +-------------+  +-------------+         |
|  |  Gmail   ||  | |  Auth       |  |  RSVP       |  |  Reporting  |         |
|  |  OAuth   <------>  Service   |  |  Service    |  |  Service    |         |
|  +----------+|  | +-------------+  +-------------+  +-------------+         |
|              |  |                                                           |
|  +----------+|  | +-------------+  +-------------+  +-------------+         |
|  | Outlook  ||  | |  Guest      |  |  Event      |  |  User       |         |
|  |  OAuth   <------>  Service   |  |  Service    |  |  Service    |         |
|  +----------+|  | +-------------+  +-------------+  +-------------+         |
|              |  |                                                           |
|  +----------+|  | +-------------+  +-------------+  +-------------+         |
|  | WhatsApp ||  | |  Email      |  |  Messaging  |  |  Storage    |         |
|  |  API     <------>  Service   |  |  Service    |  |  Service    |         |
|  +----------+|  | +-------------+  +-------------+  +-------------+         |
|              |  |                                                           |
+--------------+  +----------------------------+------------------------------+
                                               |
                                               | Database Access
                                               |
                  +----------------------------v------------------------------+
                  |                                                           |
                  |                PostgreSQL Database                        |
                  |                                                           |
                  +-----------------------------------------------------------+
```

## Component Architecture

### Core Utility Libraries

1. **API Utilities** (`client/src/lib/api-utils.ts`)
   - Standardized HTTP request methods
   - Error handling
   - Authentication handling
   - Resource-based operations
   
2. **Date Utilities** (`client/src/lib/date-utils.ts`)
   - Standardized date formatting
   - Relative time calculations
   - Date manipulation helpers
   - Date input/output conversion

3. **Validation Utilities** (`shared/validation-schemas.ts`)
   - Centralized validation schemas
   - Shared frontend/backend validation
   - Form validation helpers
   - Zod schema extensions

4. **Notification Utilities** (`client/src/lib/notification-utils.ts`)
   - Standardized toast notifications
   - Error presentation
   - Success confirmations
   - Status updates

### Frontend Components

1. **Authentication Module**
   - Login/Logout components
   - Session management
   - Role-based access control

2. **Dashboard Module**
   - Overview panels
   - Event statistics
   - Navigation components
   - Notification system

3. **Event Management Module**
   - Event creation/editing
   - Ceremony management
   - Timeline visualization
   - Settings configuration

4. **Guest Management Module**
   - Guest list views
   - Import/export functionality
   - Guest profile components
   - Relationship mapping UI

5. **RSVP Module**
   - RSVP form (Stage 1 and 2)
   - Link generation
   - Status tracking
   - Response management

6. **Communication Module**
   - Email template editor
   - WhatsApp message interface
   - Scheduling components
   - Template management

7. **Travel & Accommodation Module**
   - Hotel management
   - Room allocation interface
   - Travel arrangement tracking
   - Transportation scheduling

8. **Reporting Module**
   - Data visualization components
   - Report generation
   - Export functionality
   - Analytics dashboard

9. **Utility Components**
   - Consolidated DataTable component
   - Standardized form inputs
   - Error handling components
   - Loading states and skeletons

### Backend Services

1. **Authentication Service**
   - User authentication
   - Session management
   - Role and permission handling
   - OAuth integrations

2. **Guest Service**
   - Guest data management
   - Excel import/export processing
   - Relationship tracking
   - Guest categorization

3. **Event Service**
   - Event CRUD operations
   - Multi-tenant isolation
   - Ceremony management
   - Timeline coordination

4. **RSVP Service**
   - Token generation and validation
   - RSVP processing
   - Follow-up automation
   - Status tracking

5. **Email Service**
   - Email template rendering
   - Email sending via multiple providers
   - OAuth authentication
   - Email tracking

6. **Messaging Service**
   - WhatsApp integration
   - SMS fallback
   - Message templating
   - Delivery tracking

7. **Accommodation Service**
   - Hotel data management
   - Room allocation
   - Booking coordination
   - Guest preference matching

8. **Transportation Service**
   - Travel arrangement tracking
   - Airport pickup coordination
   - Shuttle scheduling
   - Route optimization

9. **Reporting Service**
   - Data aggregation
   - Report generation
   - Export functionality
   - Analytics processing

10. **Storage Service**
    - File uploads
    - Image processing
    - Document storage
    - Secure access control

## Database Schema Overview

### Core Tables

1. **users**
   - User authentication and profile information
   - Role-based access control

2. **events**
   - Wedding event details
   - Multi-tenant isolation key

3. **guests**
   - Guest information
   - RSVP status tracking
   - Contact details

4. **ceremonies**
   - Individual ceremony details
   - Linked to parent event

5. **guest_ceremonies**
   - Many-to-many relationship between guests and ceremonies
   - Attendance tracking per ceremony

6. **rsvp_responses**
   - Detailed RSVP response data
   - Two-stage response tracking

### Supporting Tables

7. **hotels**
   - Accommodation options
   - Room information

8. **guest_accommodations**
   - Hotel assignments for guests
   - Room allocation

9. **transportation**
   - Transportation options and providers
   - Route information

10. **guest_transportation**
    - Transportation assignments for guests
    - Pickup/dropoff details

11. **meal_options**
    - Meal choices for ceremonies
    - Dietary information

12. **guest_meal_selections**
    - Guest meal choices by ceremony
    - Special requests

13. **messages**
    - Communication history
    - Template usage tracking

14. **event_settings**
    - Configuration settings per event
    - Communication preferences

## API Interface Design

The API follows RESTful principles with resource-based URLs and standard HTTP methods. Authentication is handled via JWT tokens.

### Core Endpoints:

```
/api/auth
  - POST /login
  - POST /logout
  - GET /user
  - POST /refresh-token

/api/events
  - GET /
  - POST /
  - GET /:id
  - PUT /:id
  - DELETE /:id
  - GET /:id/stats

/api/events/:eventId/guests
  - GET /
  - POST /
  - POST /import
  - GET /:id
  - PUT /:id
  - DELETE /:id

/api/events/:eventId/ceremonies
  - GET /
  - POST /
  - GET /:id
  - PUT /:id
  - DELETE /:id

/api/rsvp
  - GET /verify
  - POST /stage1
  - POST /stage2
  - POST /combined

/api/admin/rsvp
  - POST /generate-links
  - POST /send-invites

/api/events/:eventId/accommodations
  - GET /
  - POST /
  - GET /:id
  - PUT /:id
  - DELETE /:id

/api/events/:eventId/transportation
  - GET /
  - POST /
  - GET /:id
  - PUT /:id
  - DELETE /:id

/api/events/:eventId/meals
  - GET /
  - POST /
  - GET /:id
  - PUT /:id
  - DELETE /:id

/api/events/:eventId/reports
  - GET /summary
  - GET /attendance
  - GET /accommodation
  - GET /transportation
  - GET /meals
```

## Integration Points

### OAuth Providers
- Gmail OAuth for email sending
- Outlook OAuth for email sending
- (Future) Google Calendar integration

### Communication APIs
- WhatsApp Business API
- (Future) SMS gateway integration
- (Future) Push notification services

### External Services
- Email delivery services
- Payment processing (future)
- Map services for location data
- Image hosting and processing

## Security Architecture

1. **Authentication**
   - Express session-based authentication with persistence
   - HTTP-only cookies with secure settings for session management
   - OAuth 2.0 for third-party authentication and email integration
   - Comprehensive role-based access control (admin, planner, couple)
   - Resource-level authorization based on role and ownership

2. **Data Protection**
   - Event-level isolation (multi-tenancy)
   - Input validation and sanitization
   - Parameterized queries to prevent SQL injection
   - HTTPS for all communications

3. **API Security**
   - Rate limiting
   - Request validation
   - CORS configuration
   - API permissions by role

4. **Infrastructure Security**
   - Database access restrictions
   - Environment variable management for secrets
   - Regular security updates

## Scalability Considerations

1. **Horizontal Scaling**
   - Stateless API design for multiple instances
   - Redis for distributed caching (future)
   - Load balancing for API servers

2. **Database Scalability**
   - Connection pooling
   - Efficient indexing
   - Query optimization
   - (Future) Read replicas for reporting

3. **Performance Optimization**
   - Frontend code splitting
   - Asset optimization
   - Caching strategies
   - Server-side rendering (future)

## Monitoring and Logging

1. **Application Monitoring**
   - Error tracking
   - Performance metrics
   - User behavior analytics

2. **Infrastructure Monitoring**
   - Server health
   - Database performance
   - API response times

3. **Logging Strategy**
   - Structured logging
   - Log aggregation
   - Security event logging
   - Audit trails for sensitive operations

## Deployment Architecture

The application is designed for deployment on Replit with the following structure:

1. **Development Environment**
   - Local development with Vite
   - Replit development instance
   - Feature branch testing

2. **Staging Environment**
   - Pre-production testing
   - Integration testing
   - UAT (User Acceptance Testing)

3. **Production Environment**
   - Replit production deployment
   - PostgreSQL database
   - Static asset optimization

## Disaster Recovery and Backup

1. **Database Backups**
   - Regular database snapshots
   - Point-in-time recovery
   - Backup retention policy

2. **Application Recovery**
   - Deployment rollback capability
   - Configuration backups
   - Environment recreation procedures

3. **Business Continuity**
   - Documented recovery procedures
   - Alternate communication channels
   - Data export capabilities

## Conclusion

This architecture is designed to support the complete user flow requirements of the Wedding RSVP application while maintaining security, scalability, and maintainability. It provides a solid foundation that can evolve as new features are developed according to the roadmap.