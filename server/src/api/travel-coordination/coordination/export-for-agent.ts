import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { travelCoordinationService } from '../../../services/TravelCoordinationService';

export async function exportGuestListForAgent(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const result = await travelCoordinationService.exportGuestListForAgent(eventId);

    return ResponseBuilder.success(res, {
      ...result,
      message: 'Guest list exported successfully for travel agent'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Event not found') {
      return ResponseBuilder.notFound(res, error.message);
    }
    return ResponseBuilder.internalError(res, 'Failed to export guest list', error);
  }
}

export async function exportFlightListForAgent(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const { format = 'csv', includeDetails = true } = req.body;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const result = await travelCoordinationService.exportFlightListForAgent(
      eventId, 
      format, 
      includeDetails
    );

    return ResponseBuilder.success(res, {
      ...result,
      message: 'Flight list exported successfully for travel agent'
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to export flight list', error);
  }
}