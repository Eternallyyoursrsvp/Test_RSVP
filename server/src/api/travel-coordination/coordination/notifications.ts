import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { travelCoordinationService } from '../../../services/TravelCoordinationService';

export async function sendFlightNotifications(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const { type, guestIds } = req.body;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    if (!type || !['confirmation', 'reminder', 'update'].includes(type)) {
      return ResponseBuilder.badRequest(res, 'Invalid notification type. Must be: confirmation, reminder, or update');
    }

    const result = await travelCoordinationService.sendFlightNotifications(
      eventId,
      type,
      guestIds
    );

    return ResponseBuilder.success(res, {
      ...result,
      message: `${result.sentCount} flight notifications sent successfully`
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Event not found') {
      return ResponseBuilder.notFound(res, error.message);
    }
    if (error instanceof Error && error.message === 'Invalid notification type') {
      return ResponseBuilder.badRequest(res, error.message);
    }
    return ResponseBuilder.internalError(res, 'Failed to send flight notifications', error);
  }
}