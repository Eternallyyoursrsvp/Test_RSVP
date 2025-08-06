import express, { Router } from 'express';
import { isAuthenticated } from '../../middleware';

// Batch operation endpoints
import { 
  getTravelBatchData, 
  getTravelStatistics, 
  getOptimizedGuestTravelInfo, 
  getPerformanceHealthCheck 
} from '../../src/api/batch/travel-data';

export async function createBatchAPI(): Promise<Router> {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(isAuthenticated);

  // Travel Batch Data Routes
  router.get('/events/:eventId/travel-batch', getTravelBatchData);
  router.get('/events/:eventId/travel-statistics', getTravelStatistics);
  router.get('/events/:eventId/guest-travel-info', getOptimizedGuestTravelInfo);
  router.get('/events/:eventId/performance-health', getPerformanceHealthCheck);

  return router;
}