/**
 * Flight Coordination API
 * RESTful endpoints for flight tracking and assistance management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { APIResponseBuilder } from '../versioning';
import { enhancedAuthMiddleware, requirePermission } from '../../middleware/enhanced-security';
import { createValidationMiddleware } from '../versioning';
import { 
  getFlightTrackingService, 
  FlightDetailsSchema, 
  FlightAssistanceRequestSchema,
  AirportRepresentativeSchema 
} from '../../services/flight-tracking';

const router = Router();

// Validation Schemas
const CreateFlightSchema = z.object({
  body: FlightDetailsSchema.omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true,
    actualDeparture: true,
    actualArrival: true 
  })
});

const UpdateFlightStatusSchema = z.object({
  params: z.object({
    flightId: z.string().uuid()
  }),
  body: z.object({
    status: z.enum(['scheduled', 'boarding', 'departed', 'arrived', 'delayed', 'cancelled']).optional(),
    actualDeparture: z.string().datetime().optional(),
    actualArrival: z.string().datetime().optional(),
    gate: z.string().optional(),
    terminal: z.string().optional(),
    delay: z.number().optional(),
    reason: z.string().optional()
  })
});

const CreateAssistanceRequestSchema = z.object({
  body: FlightAssistanceRequestSchema.omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true 
  })
});

const AssignRepresentativeSchema = z.object({
  params: z.object({
    requestId: z.string().uuid()
  }),
  body: z.object({
    representativeId: z.string().uuid()
  })
});

const CreateRepresentativeSchema = z.object({
  body: AirportRepresentativeSchema.omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true 
  })
});

// Apply authentication to all routes
router.use(enhancedAuthMiddleware);

// Flight Management Endpoints

/**
 * POST /flights
 * Create a new flight record
 */
router.post(
  '/flights',
  requirePermission('travel:write'),
  createValidationMiddleware(CreateFlightSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const flightService = getFlightTrackingService();
      const flight = await flightService.createFlight(req.body);
      
      res.status(201).json(responseBuilder.success(flight));
    } catch (error) {
      console.error('❌ Flight creation failed:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to create flight',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /flights/event/:eventId
 * Get all flights for an event
 */
router.get(
  '/flights/event/:eventId',
  requirePermission('travel:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      
      if (!eventId) {
        return res.status(400).json(responseBuilder.error(
          'BAD_REQUEST',
          'Event ID is required'
        ));
      }
      
      const flightService = getFlightTrackingService();
      const flights = await flightService.getFlightsByEvent(eventId);
      
      res.status(200).json(responseBuilder.success(flights));
    } catch (error) {
      console.error('❌ Failed to get flights by event:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve flights',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /flights/guest/:guestId
 * Get all flights for a guest
 */
router.get(
  '/flights/guest/:guestId',
  requirePermission('travel:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { guestId } = req.params;
      
      if (!guestId) {
        return res.status(400).json(responseBuilder.error(
          'BAD_REQUEST',
          'Guest ID is required'
        ));
      }
      
      const flightService = getFlightTrackingService();
      const flights = await flightService.getFlightsByGuest(guestId);
      
      res.status(200).json(responseBuilder.success(flights));
    } catch (error) {
      console.error('❌ Failed to get flights by guest:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve guest flights',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * PUT /flights/:flightId/status
 * Update flight status
 */
router.put(
  '/flights/:flightId/status',
  requirePermission('travel:write'),
  createValidationMiddleware(UpdateFlightStatusSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { flightId } = req.params;
      const statusUpdate = {
        ...req.body,
        timestamp: new Date().toISOString()
      };
      
      const flightService = getFlightTrackingService();
      await flightService.updateFlightStatus(flightId, statusUpdate);
      
      res.status(200).json(responseBuilder.success({
        flightId,
        message: 'Flight status updated successfully',
        updatedAt: statusUpdate.timestamp
      }));
    } catch (error) {
      console.error('❌ Flight status update failed:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to update flight status',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Flight Assistance Endpoints

/**
 * POST /assistance-requests
 * Create a flight assistance request
 */
router.post(
  '/assistance-requests',
  requirePermission('travel:write'),
  createValidationMiddleware(CreateAssistanceRequestSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const flightService = getFlightTrackingService();
      const request = await flightService.createAssistanceRequest(req.body);
      
      res.status(201).json(responseBuilder.success(request));
    } catch (error) {
      console.error('❌ Assistance request creation failed:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to create assistance request',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * PUT /assistance-requests/:requestId/assign
 * Assign a representative to an assistance request
 */
router.put(
  '/assistance-requests/:requestId/assign',
  requirePermission('travel:manage'),
  createValidationMiddleware(AssignRepresentativeSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { requestId } = req.params;
      const { representativeId } = req.body;
      
      const flightService = getFlightTrackingService();
      await flightService.assignRepresentative(requestId, representativeId);
      
      res.status(200).json(responseBuilder.success({
        requestId,
        representativeId,
        message: 'Representative assigned successfully',
        assignedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ Representative assignment failed:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to assign representative',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Airport Representative Management

/**
 * POST /representatives
 * Create a new airport representative
 */
router.post(
  '/representatives',
  requirePermission('admin:manage'),
  createValidationMiddleware(CreateRepresentativeSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const flightService = getFlightTrackingService();
      const representative = await flightService.createRepresentative(req.body);
      
      res.status(201).json(responseBuilder.success(representative));
    } catch (error) {
      console.error('❌ Representative creation failed:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to create representative',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /representatives/airport/:airportCode
 * Get representatives for a specific airport
 */
router.get(
  '/representatives/airport/:airportCode',
  requirePermission('travel:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { airportCode } = req.params;
      
      if (!airportCode || airportCode.length !== 3) {
        return res.status(400).json(responseBuilder.error(
          'BAD_REQUEST',
          'Valid 3-letter airport code is required'
        ));
      }
      
      const flightService = getFlightTrackingService();
      const representatives = await flightService.getRepresentativesByAirport(airportCode.toUpperCase());
      
      res.status(200).json(responseBuilder.success(representatives));
    } catch (error) {
      console.error('❌ Failed to get representatives by airport:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve representatives',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Analytics and Reporting

/**
 * GET /flights/event/:eventId/statistics
 * Get flight statistics for an event
 */
router.get(
  '/flights/event/:eventId/statistics',
  requirePermission('analytics:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      
      if (!eventId) {
        return res.status(400).json(responseBuilder.error(
          'BAD_REQUEST',
          'Event ID is required'
        ));
      }
      
      const flightService = getFlightTrackingService();
      const statistics = await flightService.getFlightStatistics(eventId);
      
      res.status(200).json(responseBuilder.success({
        eventId,
        statistics,
        generatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ Failed to get flight statistics:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve flight statistics',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Health Check
router.get('/health', (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    const flightService = getFlightTrackingService();
    
    res.status(200).json(responseBuilder.success({
      service: 'flight-coordination',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }));
  } catch (error) {
    res.status(503).json(responseBuilder.error(
      'SERVICE_UNAVAILABLE',
      'Flight tracking service not available',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

export function createFlightCoordinationAPI(): Router {
  return router;
}

// Export for use in main API registration
export default router;