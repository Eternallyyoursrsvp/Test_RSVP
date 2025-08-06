import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { travelCoordinationService } from '../../../services/TravelCoordinationService';

export async function getCoordinationStatus(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const status = await travelCoordinationService.getCoordinationStatus(eventId);

    return ResponseBuilder.success(res, {
      status,
      message: 'Flight coordination status retrieved successfully'
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to fetch coordination status', error);
  }
}

export async function updateFlightStatus(req: Request, res: Response) {
  try {
    const flightId = parseInt(req.params.flightId);
    const { status } = req.body;

    if (isNaN(flightId)) {
      return ResponseBuilder.badRequest(res, 'Invalid flight ID');
    }

    if (!status) {
      return ResponseBuilder.badRequest(res, 'Status is required');
    }

    const result = await travelCoordinationService.updateFlightStatus(flightId, status);

    return ResponseBuilder.success(res, {
      ...result,
      message: 'Flight status updated successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid flight status') {
      return ResponseBuilder.badRequest(res, error.message);
    }
    return ResponseBuilder.internalError(res, 'Failed to update flight status', error);
  }
}

export async function createFlightInfo(req: Request, res: Response) {
  try {
    const guestId = parseInt(req.params.guestId);
    const flightData = req.body;

    if (isNaN(guestId)) {
      return ResponseBuilder.badRequest(res, 'Invalid guest ID');
    }

    const result = await travelCoordinationService.createFlightInfo(guestId, flightData);

    return ResponseBuilder.success(res, {
      ...result,
      message: `Flight information ${result.action} successfully`
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Guest not found') {
      return ResponseBuilder.notFound(res, error.message);
    }
    return ResponseBuilder.internalError(res, 'Failed to save flight information', error);
  }
}