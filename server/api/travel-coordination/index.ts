import express, { Router } from 'express';
import { isAuthenticated } from '../../middleware';

// Flight dashboard endpoints
import { getFlightDashboard } from '../../src/api/travel-coordination/flights/dashboard';
import { getCoordinationStatus, updateFlightStatus, createFlightInfo } from '../../src/api/travel-coordination/flights/status';

// Coordination workflow endpoints
import { exportGuestListForAgent, exportFlightListForAgent } from '../../src/api/travel-coordination/coordination/export-for-agent';
import { importFlightDetails, importFlightDetailsAdvanced } from '../../src/api/travel-coordination/coordination/import-flights';
import { sendFlightNotifications } from '../../src/api/travel-coordination/coordination/notifications';

// Transport group endpoints
import { generateTransportFromFlights } from '../../src/api/travel-coordination/transport-groups/generate-from-flights';

export async function createTravelCoordinationAPI(): Promise<Router> {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(isAuthenticated);

  // Flight Dashboard Routes
  router.get('/events/:eventId/flights/dashboard', getFlightDashboard);
  router.get('/events/:eventId/flights/status', getCoordinationStatus);
  router.put('/flights/:flightId/status', updateFlightStatus);
  router.post('/guests/:guestId/flight', createFlightInfo);

  // Flight Coordination Workflow Routes
  router.post('/events/:eventId/export-guest-list', exportGuestListForAgent);
  router.post('/events/:eventId/export-flight-list', exportFlightListForAgent);
  router.post('/events/:eventId/import-flights', importFlightDetails);
  router.post('/events/:eventId/import-flights-advanced', importFlightDetailsAdvanced);
  router.post('/events/:eventId/send-notifications', sendFlightNotifications);

  // Transport Group Generation Routes
  router.post('/events/:eventId/generate-transport-groups', generateTransportFromFlights);

  return router;
}