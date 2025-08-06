import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';

export async function assignVehicle(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const { vehicleId, transportGroupId } = req.body;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    if (!vehicleId || !transportGroupId) {
      return ResponseBuilder.badRequest(res, 'Vehicle ID and transport group ID are required');
    }

    const vehicleIdNum = parseInt(vehicleId);
    const transportGroupIdNum = parseInt(transportGroupId);

    if (isNaN(vehicleIdNum) || isNaN(transportGroupIdNum)) {
      return ResponseBuilder.badRequest(res, 'Invalid vehicle ID or transport group ID');
    }

    const result = await transportService.assignVehicleToGroup(
      vehicleIdNum,
      eventId,
      transportGroupIdNum
    );

    if (!result.success) {
      return ResponseBuilder.conflict(res, result.message || 'Failed to assign vehicle');
    }

    return ResponseBuilder.success(res, {
      assignment: result.assignment,
      message: 'Vehicle assigned successfully'
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to assign vehicle', error);
  }
}