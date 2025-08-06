import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';

export async function deleteTravelInfo(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const travelInfoId = parseInt(req.params.travelInfoId);
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    if (!travelInfoId || isNaN(travelInfoId)) {
      return ResponseBuilder.badRequest(res, 'Invalid travel info ID');
    }

    const result = await transportService.deleteTravelInfo(travelInfoId, eventId);

    if (!result) {
      return ResponseBuilder.notFound(res, 'Travel info not found');
    }

    return ResponseBuilder.success(res, {
      travelInfoId,
      message: 'Travel info deleted successfully'
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to delete travel info', error);
  }
}