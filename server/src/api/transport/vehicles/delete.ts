import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';

export async function deleteVehicle(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const vehicleId = parseInt(req.params.vehicleId);
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    if (!vehicleId || isNaN(vehicleId)) {
      return ResponseBuilder.badRequest(res, 'Invalid vehicle ID');
    }

    const result = await transportService.deleteVehicle(vehicleId, eventId);

    if (!result.success) {
      return ResponseBuilder.conflict(res, result.message || 'Failed to delete vehicle');
    }

    return ResponseBuilder.success(res, {
      vehicleId,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to delete vehicle', error);
  }
}