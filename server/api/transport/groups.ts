/**
 * Transport Group Management API
 * RESTful endpoints for transport group operations with drag-and-drop functionality
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { APIResponseBuilder } from '../versioning';
import { enhancedAuthMiddleware, requirePermission } from '../../middleware/enhanced-security';
import { createValidationMiddleware } from '../versioning';
import { getTransportOptimizationService } from '../../services/transport-optimization';

const router = Router();

// Validation Schemas
const CreateGroupSchema = z.object({
  body: z.object({
    eventId: z.string().uuid(),
    name: z.string().min(1).max(255),
    vehicleId: z.string().uuid(),
    driverId: z.string().uuid().optional(),
    capacity: z.number().int().positive(),
    notes: z.string().optional()
  })
});

const UpdateGroupSchema = z.object({
  params: z.object({
    groupId: z.string().uuid()
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    vehicleId: z.string().uuid().optional(),
    driverId: z.string().uuid().optional(),
    status: z.enum(['planning', 'assigned', 'in_transit', 'completed', 'cancelled']).optional(),
    notes: z.string().optional()
  })
});

const AssignPassengerSchema = z.object({
  params: z.object({
    groupId: z.string().uuid()
  }),
  body: z.object({
    guestId: z.string().uuid(),
    guestName: z.string(),
    pickupLocation: z.string().optional(),
    dropoffLocation: z.string().optional(),
    specialRequirements: z.array(z.string()).default([])
  })
});

const MovePassengerSchema = z.object({
  body: z.object({
    fromGroupId: z.string().uuid(),
    toGroupId: z.string().uuid(),
    guestId: z.string().uuid()
  })
});

const OptimizeGroupsSchema = z.object({
  body: z.object({
    eventId: z.string().uuid(),
    passengers: z.array(z.object({
      guestId: z.string().uuid(),
      guestName: z.string(),
      pickupLocation: z.string().optional(),
      dropoffLocation: z.string().optional(),
      specialRequirements: z.array(z.string()).default([]),
      priority: z.number().default(1)
    })),
    options: z.object({
      prioritizeCapacity: z.boolean().default(true),
      minimizeVehicles: z.boolean().default(true),
      respectSpecialRequirements: z.boolean().default(true),
      optimizeRoutes: z.boolean().default(false),
      maxTravelTime: z.number().min(15).max(240).default(60)
    }).optional()
  })
});

// Apply authentication to all routes
router.use(enhancedAuthMiddleware);

// Transport Group Management Endpoints

/**
 * POST /groups
 * Create a new transport group
 */
router.post(
  '/groups',
  requirePermission('transport:write'),
  createValidationMiddleware(CreateGroupSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const transportService = getTransportOptimizationService();
      const groupData = {
        ...req.body,
        passengers: [],
        currentOccupancy: 0,
        route: [],
        status: 'planning' as const
      };
      
      const group = await transportService.createGroup(groupData);
      
      res.status(201).json(responseBuilder.success(group));
    } catch (error) {
      console.error('❌ Transport group creation failed:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to create transport group',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /groups/event/:eventId
 * Get all transport groups for an event
 */
router.get(
  '/groups/event/:eventId',
  requirePermission('transport:read'),
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
      
      const transportService = getTransportOptimizationService();
      const groups = await transportService.getGroupsByEvent(eventId);
      
      res.status(200).json(responseBuilder.success(groups));
    } catch (error) {
      console.error('❌ Failed to get transport groups by event:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve transport groups',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * PUT /groups/:groupId
 * Update a transport group
 */
router.put(
  '/groups/:groupId',
  requirePermission('transport:write'),
  createValidationMiddleware(UpdateGroupSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { groupId } = req.params;
      const updates = req.body;
      
      const transportService = getTransportOptimizationService();
      await transportService.updateGroup(groupId, updates);
      
      res.status(200).json(responseBuilder.success({
        groupId,
        message: 'Transport group updated successfully',
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ Transport group update failed:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to update transport group',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * POST /groups/:groupId/passengers
 * Assign passenger to transport group
 */
router.post(
  '/groups/:groupId/passengers',
  requirePermission('transport:write'),
  createValidationMiddleware(AssignPassengerSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { groupId } = req.params;
      const passengerData = req.body;
      
      const transportService = getTransportOptimizationService();
      await transportService.assignPassengerToGroup(groupId, {
        guestId: passengerData.guestId,
        guestName: passengerData.guestName,
        pickupLocation: passengerData.pickupLocation,
        dropoffLocation: passengerData.dropoffLocation,
        specialRequirements: passengerData.specialRequirements,
        priority: 1
      });
      
      res.status(200).json(responseBuilder.success({
        groupId,
        guestId: passengerData.guestId,
        message: 'Passenger assigned to group successfully',
        assignedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ Passenger assignment failed:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to assign passenger to group',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * DELETE /groups/:groupId/passengers/:guestId
 * Remove passenger from transport group
 */
router.delete(
  '/groups/:groupId/passengers/:guestId',
  requirePermission('transport:write'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { groupId, guestId } = req.params;
      
      const transportService = getTransportOptimizationService();
      await transportService.removePassengerFromGroup(groupId, guestId);
      
      res.status(200).json(responseBuilder.success({
        groupId,
        guestId,
        message: 'Passenger removed from group successfully',
        removedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ Passenger removal failed:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to remove passenger from group',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * POST /groups/move-passenger
 * Move passenger between transport groups
 */
router.post(
  '/groups/move-passenger',
  requirePermission('transport:write'),
  createValidationMiddleware(MovePassengerSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { fromGroupId, toGroupId, guestId } = req.body;
      
      const transportService = getTransportOptimizationService();
      await transportService.movePassengerBetweenGroups(fromGroupId, toGroupId, guestId);
      
      res.status(200).json(responseBuilder.success({
        fromGroupId,
        toGroupId,
        guestId,
        message: 'Passenger moved between groups successfully',
        movedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ Passenger move failed:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to move passenger between groups',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * POST /optimize
 * Optimize transport group formation
 */
router.post(
  '/optimize',
  requirePermission('transport:manage'),
  createValidationMiddleware(OptimizeGroupsSchema),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId, passengers, options } = req.body;
      
      const transportService = getTransportOptimizationService();
      const optimizationResult = await transportService.optimizeGroupFormation(
        eventId,
        passengers,
        options || {}
      );
      
      res.status(200).json(responseBuilder.success(optimizationResult));
    } catch (error) {
      console.error('❌ Transport optimization failed:', error);
      res.status(400).json(responseBuilder.error(
        'OPERATION_FAILED',
        'Failed to optimize transport groups',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /vehicles/event/:eventId
 * Get available vehicles for an event
 */
router.get(
  '/vehicles/event/:eventId',
  requirePermission('transport:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      
      // Mock vehicle data - in production this would come from a vehicles service
      const vehicles = [
        {
          id: crypto.randomUUID(),
          name: 'Luxury Bus 1',
          type: 'bus',
          capacity: 25,
          status: 'available',
          features: ['AC', 'WiFi', 'Wheelchair Accessible']
        },
        {
          id: crypto.randomUUID(),
          name: 'Minivan Fleet A',
          type: 'van',
          capacity: 8,
          status: 'available',
          features: ['AC', 'GPS Tracking']
        },
        {
          id: crypto.randomUUID(),
          name: 'Premium Sedan 1',
          type: 'car',
          capacity: 4,
          status: 'available',
          features: ['AC', 'Leather Seats', 'GPS Tracking']
        }
      ];
      
      res.status(200).json(responseBuilder.success(vehicles));
    } catch (error) {
      console.error('❌ Failed to get vehicles by event:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve vehicles',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /drivers/event/:eventId
 * Get available drivers for an event
 */
router.get(
  '/drivers/event/:eventId',
  requirePermission('transport:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      
      // Mock driver data - in production this would come from a drivers service
      const drivers = [
        {
          id: crypto.randomUUID(),
          name: 'Rajesh Kumar',
          phone: '+91 98765 43210',
          rating: 4.8,
          isActive: true
        },
        {
          id: crypto.randomUUID(),
          name: 'Mohammed Ali',
          phone: '+91 87654 32109',
          rating: 4.6,
          isActive: true
        },
        {
          id: crypto.randomUUID(),
          name: 'Suresh Patel',
          phone: '+91 76543 21098',
          rating: 4.9,
          isActive: true
        }
      ];
      
      res.status(200).json(responseBuilder.success(drivers));
    } catch (error) {
      console.error('❌ Failed to get drivers by event:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve drivers',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

/**
 * GET /statistics/event/:eventId
 * Get transport statistics for an event
 */
router.get(
  '/statistics/event/:eventId',
  requirePermission('analytics:read'),
  async (req: Request, res: Response) => {
    const responseBuilder = new APIResponseBuilder(req);
    
    try {
      const { eventId } = req.params;
      
      const transportService = getTransportOptimizationService();
      const statistics = await transportService.getTransportStatistics(eventId);
      
      res.status(200).json(responseBuilder.success({
        eventId,
        statistics,
        generatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ Failed to get transport statistics:', error);
      res.status(500).json(responseBuilder.error(
        'INTERNAL_SERVER_ERROR',
        'Failed to retrieve transport statistics',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
);

// Health Check
router.get('/health', (req: Request, res: Response) => {
  const responseBuilder = new APIResponseBuilder(req);
  
  try {
    const transportService = getTransportOptimizationService();
    
    res.status(200).json(responseBuilder.success({
      service: 'transport-groups',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }));
  } catch (error) {
    res.status(503).json(responseBuilder.error(
      'SERVICE_UNAVAILABLE',
      'Transport groups service not available',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

export function createTransportGroupsAPI(): Router {
  return router;
}

// Export for use in main API registration
export default router;