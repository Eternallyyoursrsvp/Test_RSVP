import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';

export async function getVehicleAssignments(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const vehicleId = parseInt(req.params.vehicleId);
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    if (!vehicleId || isNaN(vehicleId)) {
      return ResponseBuilder.badRequest(res, 'Invalid vehicle ID');
    }

    const assignments = await transportService.getVehicleAssignments(vehicleId, eventId);

    return ResponseBuilder.success(res, {
      vehicleId,
      assignments,
      total: assignments.length,
      message: 'Vehicle assignments retrieved successfully'
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to fetch vehicle assignments', error);
  }
}