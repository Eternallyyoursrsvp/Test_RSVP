import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';

export async function listTravelInfo(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const travelInfoList = await transportService.listTravelInfo(eventId);

    return ResponseBuilder.success(res, {
      travelInfo: travelInfoList,
      count: travelInfoList.length
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to fetch travel info', error);
  }
}