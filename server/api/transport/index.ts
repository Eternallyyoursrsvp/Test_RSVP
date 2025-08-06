import express, { Router } from 'express';
import { isAuthenticated } from '../../middleware';

// Transport vendor endpoints
import { createTransportVendor } from '../../src/api/transport/vendors/create';
import { listTransportVendors } from '../../src/api/transport/vendors/list';
import { updateTransportVendor } from '../../src/api/transport/vendors/update';
import { deleteTransportVendor } from '../../src/api/transport/vendors/delete';

// Vehicle endpoints
import { createVehicle } from '../../src/api/transport/vehicles/create';
import { listVehicles } from '../../src/api/transport/vehicles/list';
import { updateVehicle } from '../../src/api/transport/vehicles/update';
import { deleteVehicle } from '../../src/api/transport/vehicles/delete';
import { assignVehicle } from '../../src/api/transport/vehicles/assign';
import { updateVehicleStatus } from '../../src/api/transport/vehicles/status';
import { getVehicleAssignments } from '../../src/api/transport/vehicles/assignments';

// Representative endpoints
import { createRepresentative } from '../../src/api/transport/representatives/create';
import { listRepresentatives } from '../../src/api/transport/representatives/list';
import { updateRepresentative } from '../../src/api/transport/representatives/update';
import { deleteRepresentative } from '../../src/api/transport/representatives/delete';

// Travel info endpoints
import { createTravelInfo } from '../../src/api/transport/travel-info/create';
import { listTravelInfo } from '../../src/api/transport/travel-info/list';
import { updateTravelInfo } from '../../src/api/transport/travel-info/update';
import { deleteTravelInfo } from '../../src/api/transport/travel-info/delete';

// Transport operations API
import { createTransportOperationsAPI } from './operations';

// Transport groups API
import { createTransportGroupsAPI } from './groups';

export async function createTransportAPI(): Promise<Router> {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(isAuthenticated);

  // Transport Vendor Routes
  router.post('/events/:eventId/vendors', createTransportVendor);
  router.get('/events/:eventId/vendors', listTransportVendors);
  router.put('/events/:eventId/vendors/:vendorId', updateTransportVendor);
  router.delete('/events/:eventId/vendors/:vendorId', deleteTransportVendor);

  // Vehicle Routes
  router.post('/events/:eventId/vehicles', createVehicle);
  router.get('/events/:eventId/vehicles', listVehicles);
  router.put('/events/:eventId/vehicles/:vehicleId', updateVehicle);
  router.delete('/events/:eventId/vehicles/:vehicleId', deleteVehicle);
  router.post('/events/:eventId/vehicles/:vehicleId/assign', assignVehicle);
  router.patch('/events/:eventId/vehicles/:vehicleId/status', updateVehicleStatus);
  router.get('/events/:eventId/vehicles/:vehicleId/assignments', getVehicleAssignments);

  // Location Representative Routes
  router.post('/events/:eventId/representatives', createRepresentative);
  router.get('/events/:eventId/representatives', listRepresentatives);
  router.put('/events/:eventId/representatives/:repId', updateRepresentative);
  router.delete('/events/:eventId/representatives/:repId', deleteRepresentative);

  // Travel Info Routes
  router.post('/events/:eventId/travel-info', createTravelInfo);
  router.get('/events/:eventId/travel-info', listTravelInfo);
  router.put('/events/:eventId/travel-info/:travelInfoId', updateTravelInfo);
  router.delete('/events/:eventId/travel-info/:travelInfoId', deleteTravelInfo);

  // Mount transport operations sub-routes
  const operationsRouter = await createTransportOperationsAPI();
  router.use('/', operationsRouter);
  
  // Mount transport groups sub-routes
  const groupsRouter = createTransportGroupsAPI();
  router.use('/', groupsRouter);

  return router;
}