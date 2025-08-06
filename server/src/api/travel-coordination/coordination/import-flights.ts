import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { travelCoordinationService } from '../../../services/TravelCoordinationService';

export async function importFlightDetails(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const { csvData } = req.body;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    if (!csvData) {
      return ResponseBuilder.badRequest(res, 'CSV data is required');
    }

    const result = await travelCoordinationService.importFlightDetails(eventId, csvData);

    return ResponseBuilder.success(res, {
      ...result,
      message: 'Flight details imported successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'CSV data is required') {
      return ResponseBuilder.badRequest(res, error.message);
    }
    return ResponseBuilder.internalError(res, 'Failed to import flight details', error);
  }
}

export async function importFlightDetailsAdvanced(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const { flightData } = req.body;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    if (!Array.isArray(flightData)) {
      return ResponseBuilder.badRequest(res, 'Flight data must be an array');
    }

    const result = await travelCoordinationService.importFlightDetailsAdvanced(eventId, flightData);

    return ResponseBuilder.success(res, {
      ...result,
      message: 'Flight details imported successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Flight data must be an array') {
      return ResponseBuilder.badRequest(res, error.message);
    }
    return ResponseBuilder.internalError(res, 'Failed to import flight details', error);
  }
}