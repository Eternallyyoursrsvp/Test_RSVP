import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';

export async function deleteRepresentative(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const repId = parseInt(req.params.repId);
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    if (!repId || isNaN(repId)) {
      return ResponseBuilder.badRequest(res, 'Invalid representative ID');
    }

    const result = await transportService.deleteRepresentative(repId, eventId);

    if (!result) {
      return ResponseBuilder.notFound(res, 'Location representative not found');
    }

    return ResponseBuilder.success(res, {
      repId,
      message: 'Location representative deleted successfully'
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to delete location representative', error);
  }
}