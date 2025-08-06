import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';

export async function listRepresentatives(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const representatives = await transportService.listRepresentatives(eventId);

    return ResponseBuilder.success(res, {
      representatives,
      count: representatives.length
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to fetch location representatives', error);
  }
}