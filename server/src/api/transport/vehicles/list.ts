import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';

export async function listVehicles(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const vehicles = await transportService.listVehicles(eventId);

    return ResponseBuilder.success(res, {
      vehicles,
      count: vehicles.length
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to fetch vehicles', error);
  }
}