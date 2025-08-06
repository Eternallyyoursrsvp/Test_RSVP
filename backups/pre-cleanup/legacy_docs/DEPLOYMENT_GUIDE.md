# Production Deployment Guide

## Authentication System

The application uses a robust role-based authentication system that works reliably in deployment environments.

### Default Credentials

For production deployment, use these credentials:

**Username:** `demo_planner`
**Password:** `password123`
**Role:** `staff`

This user has full access to all events and system features.

### System Features

- **Role-Based Access Control**: The system uses roles instead of hardcoded user IDs for authentication
- **Session Management**: PostgreSQL-based session storage with proper cookie handling
- **Multi-Tenant Support**: Complete data isolation between events while maintaining proper access control

### Available Users

The system comes with these pre-configured users:

1. **admin** (admin role) - Full system access
2. **demo_planner** (staff role) - Full event access ✅ **RECOMMENDED FOR DEPLOYMENT**
3. **demo_couple** (couple role) - Limited to own events
4. **demo_admin** (admin role) - Full system access

### Event Data

The system includes a sample event:
- **Event ID:** 11
- **Title:** "Raj Weds Riya"
- **Created by:** demo_planner (user ID: 5)
- **Status:** Fully configured with ceremonies, venues, and settings

### Deployment Verification

To verify the deployment is working correctly:

1. Log in with the demo_planner credentials
2. You should see the "Raj Weds Riya" event in the dashboard
3. All features should be accessible including:
   - Event management
   - Guest lists
   - RSVP system
   - Communication tools
   - Travel and accommodation management

### Technical Details

- **Database:** PostgreSQL with proper schemas and indexes
- **Session Storage:** PostgreSQL-based with 24-hour expiration
- **Authentication:** bcrypt password hashing with plain text fallback
- **Access Control:** Role-based permissions (admin/staff/planner can access all events)
- **Cookie Configuration:** Optimized for Replit deployment environment

### Troubleshooting

If you encounter "No events found" errors:

1. Ensure you're using the correct credentials (demo_planner/password)
2. Check that the user has staff/admin/planner role
3. Verify the authentication cookie is being set properly
4. Confirm the database connection is established

The system is designed to be self-healing and will automatically handle authentication issues through proper role-based access control.