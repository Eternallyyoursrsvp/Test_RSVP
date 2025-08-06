import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { travelCoordinationService } from '../../../services/TravelCoordinationService';

export async function getFlightDashboard(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const flightData = await travelCoordinationService.getFlightDashboard(eventId);

    return ResponseBuilder.success(res, {
      flights: flightData,
      count: flightData.length,
      message: 'Flight dashboard data retrieved successfully'
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to fetch flight dashboard data', error);
  }
}