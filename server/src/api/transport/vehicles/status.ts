import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';

export async function updateVehicleStatus(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const vehicleId = parseInt(req.params.vehicleId);
    const { status, currentLocation } = req.body;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    if (!vehicleId || isNaN(vehicleId)) {
      return ResponseBuilder.badRequest(res, 'Invalid vehicle ID');
    }

    if (!status) {
      return ResponseBuilder.badRequest(res, 'Status is required');
    }

    const validStatuses = ['available', 'assigned', 'in_transit', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return ResponseBuilder.badRequest(res, 'Invalid status. Must be one of: ' + validStatuses.join(', '));
    }

    const vehicle = await transportService.updateVehicleStatus(
      vehicleId,
      eventId,
      status,
      currentLocation
    );

    if (!vehicle) {
      return ResponseBuilder.notFound(res, 'Vehicle not found');
    }

    return ResponseBuilder.success(res, {
      vehicle,
      message: 'Vehicle status updated successfully'
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to update vehicle status', error);
  }
}