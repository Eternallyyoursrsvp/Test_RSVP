import express, { Express } from 'express';
import { createAuthAPI } from './auth';
import { createAdminAPI } from './admin';
import { createNotificationAPI, setNotificationServer } from './notifications';
import { createAnalyticsAPI } from './analytics';
import { createEventsAPI } from './events';
import { createGuestsAPI } from './guests';
import { createRSVPAPI } from './rsvp';
import { createCeremoniesAPI } from './ceremonies';
import { createCommunicationsAPI } from './communications';
import { createTransportAPI } from './transport';
import { createTravelCoordinationAPI } from './travel-coordination';
import { createFlightCoordinationAPI } from './travel-coordination/flights';
import { createSmsAPI } from './sms';
import { createCommunicationAnalyticsAPI } from './communication-analytics';
import { createBatchAPI } from './batch';
import { createSystemAPI } from './system';
import { createRelationshipTypesAPI } from './relationship-types';
import { createRBACAPI } from './rbac';
import { createSetupAPI } from './setup';
import communicationDashboardRouter from './v2/communication-dashboard';
import { NotificationWebSocketServer } from '../services/notification-websocket';
import { initializeRBACService } from '../services/rbac-service';
import { initializeSecurityMiddleware } from '../middleware/enhanced-security';
import { initializeFlightTracking } from '../services/flight-tracking';
import { initializeRsvpFlightIntegration } from '../services/rsvp-flight-integration';
import { initializeTransportOptimization } from '../services/transport-group-optimization';
import { bootstrapManager } from '../src/bootstrap/startup-manager.js';
import { Server } from 'http';

export async function registerModularAPIs(app: Express, httpServer: Server): Promise<void> {
  console.log('🚀 Registering modular APIs...');

  try {
    // Initialize security middleware
    initializeSecurityMiddleware();

    // Skip database-dependent services in bootstrap mode
    if (!bootstrapManager.isBootstrapMode()) {
      // Initialize database provider first
      const { db, ensureProviderInitialization } = await import('../db.js');
      await ensureProviderInitialization();
      
      // Initialize RBAC service
      initializeRBACService(db);
      
      // Initialize Flight Tracking service
      initializeFlightTracking(db);
      
      // Initialize RSVP Flight Integration service
      initializeRsvpFlightIntegration(db);
      
      // Initialize Transport Optimization service
      initializeTransportOptimization(db);
    } else {
      console.log('🔧 Bootstrap mode - skipping database-dependent service initialization');
    }

    // Initialize WebSocket notification server
    const notificationServer = new NotificationWebSocketServer(httpServer);
    setNotificationServer(notificationServer);

    // Setup API (always available for status checks and maintenance)
    const setupAPI = createSetupAPI();
    app.use('/api/setup', setupAPI);
    
    if (bootstrapManager.isBootstrapMode()) {
      console.log('🔧 Bootstrap mode detected - Setup API enabled, other APIs disabled');
      
      // Skip other APIs in bootstrap mode
      console.log('🔧 Bootstrap mode - only Setup API available');
    } else {
      // Register all API modules in normal mode
      const authAPI = await createAuthAPI();
      const adminAPI = await createAdminAPI();
      const notificationAPI = await createNotificationAPI();
      const analyticsAPI = await createAnalyticsAPI();
      const eventsAPI = await createEventsAPI();
      const guestsAPI = await createGuestsAPI();
      const rsvpAPI = await createRSVPAPI();
      const ceremoniesAPI = await createCeremoniesAPI();
      const communicationsAPI = await createCommunicationsAPI();
      const transportAPI = await createTransportAPI();
      const travelCoordinationAPI = await createTravelCoordinationAPI();
      const flightCoordinationAPI = createFlightCoordinationAPI();
      const smsAPI = await createSmsAPI();
      const communicationAnalyticsAPI = await createCommunicationAnalyticsAPI();
      const batchAPI = await createBatchAPI();
      const systemAPI = await createSystemAPI();
      const relationshipTypesAPI = await createRelationshipTypesAPI();
      const rbacAPI = await createRBACAPI();

      // Mount all APIs in normal mode
      app.use('/api/auth', authAPI);
      app.use('/api/admin', adminAPI);
      app.use('/api/notifications', notificationAPI);
      app.use('/api/analytics', analyticsAPI);
      app.use('/api/v1/events', eventsAPI);
      app.use('/api/v1', guestsAPI);
      app.use('/api/rsvp', rsvpAPI);
      app.use('/api/v1', ceremoniesAPI);
      app.use('/api/v1', communicationsAPI);
      app.use('/api/v1/transport', transportAPI);
      app.use('/api/v1/travel-coordination', travelCoordinationAPI);
      app.use('/api/travel-coordination', flightCoordinationAPI);
      app.use('/api/v1/sms', smsAPI);
      app.use('/api/v1/communication-analytics', communicationAnalyticsAPI);
      app.use('/api/v2/communication', communicationDashboardRouter);
      app.use('/api/v1/batch', batchAPI);
      app.use('/api/system', systemAPI);
      app.use('/api/relationship-types', relationshipTypesAPI);
      app.use('/api/v1/rbac', rbacAPI);
    }

    console.log('✅ Modular APIs registered successfully');
    
    // Setup API is always available
    console.log('   - Setup API: /api/setup (always available)');
    
    if (bootstrapManager.isBootstrapMode()) {
      console.log('   🔧 Bootstrap mode - other APIs disabled');
    } else {
      console.log('   - Auth API: /api/auth');
      console.log('   - Admin API: /api/admin');
      console.log('   - Notifications API: /api/notifications');
      console.log('   - Analytics API: /api/analytics');
      console.log('   - Events API: /api/v1/events');
      console.log('   - Guests API: /api/v1/:eventId/guests, /api/v1/guests');
      console.log('   - RSVP API: /api/rsvp (public + authenticated endpoints)');
      console.log('   - Ceremonies API: /api/v1/:eventId/ceremonies, /api/v1/ceremonies');
      console.log('   - Communications API: /api/v1/:eventId/couple-messages, /api/v1/whatsapp-templates, /api/v1/:eventId/providers');
      console.log('   - Transport API: /api/v1/transport/events/:eventId/vendors, /api/v1/transport/events/:eventId/vehicles, /api/v1/transport/events/:eventId/representatives');
      console.log('   - Travel Coordination API: /api/v1/travel-coordination/events/:eventId/flights, /api/v1/travel-coordination/events/:eventId/coordination');
      console.log('   - Flight Coordination API: /api/travel-coordination/flights, /api/travel-coordination/assistance-requests, /api/travel-coordination/representatives');
      console.log('   - SMS API: /api/v1/sms/providers, /api/v1/sms/templates, /api/v1/sms/send, /api/v1/sms/analytics');
      console.log('   - Communication Analytics API: /api/v1/communication-analytics/dashboard, /api/v1/communication-analytics/realtime, /api/v1/communication-analytics/track');
      console.log('   - Batch API: /api/v1/batch/events/:eventId/travel-batch, /api/v1/batch/events/:eventId/travel-statistics');
      console.log('   - System API: /api/system (csrf-token, info, health, version)');
      console.log('   - Relationship Types API: /api/relationship-types');
      console.log('   - RBAC API: /api/v1/rbac (roles, permissions, user-roles, analytics, audit-log, system)');
    }
    
    console.log('   - WebSocket: ws://localhost:5000/ws/notifications');

    // Store notification server reference for graceful shutdown
    (app as any).notificationServer = notificationServer;

  } catch (error) {
    console.error('❌ Failed to register modular APIs:', error);
    throw error;
  }
}

export * from './auth';
export * from './admin';
export * from './notifications';
export * from './core/module-service';
export * from './core/validation';
