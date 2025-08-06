import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { travelCoordinationService } from '../../../services/TravelCoordinationService';

export async function generateTransportFromFlights(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const result = await travelCoordinationService.generateTransportFromFlights(eventId);

    return ResponseBuilder.success(res, {
      ...result,
      message: `Successfully generated ${result.groupsCreated} transport groups for ${result.guestsProcessed} guests`
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Event not found') {
      return ResponseBuilder.notFound(res, error.message);
    }
    return ResponseBuilder.internalError(res, 'Failed to generate transport groups', error);
  }
}