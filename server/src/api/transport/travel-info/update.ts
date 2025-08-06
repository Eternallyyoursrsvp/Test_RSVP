import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';
import { insertGuestTravelInfoSchema } from '@shared/schema';
import { z } from 'zod';

export async function updateTravelInfo(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const travelInfoId = parseInt(req.params.travelInfoId);
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    if (isNaN(travelInfoId)) {
      return ResponseBuilder.badRequest(res, 'Invalid travel info ID');
    }

    const validatedData = insertGuestTravelInfoSchema.partial().parse(req.body);

    const updatedTravelInfo = await transportService.updateTravelInfo(travelInfoId, eventId, validatedData);

    if (!updatedTravelInfo) {
      return ResponseBuilder.notFound(res, 'Travel info not found');
    }

    return ResponseBuilder.success(res, {
      travelInfo: updatedTravelInfo,
      message: 'Travel info updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseBuilder.validationError(res, error);
    }
    return ResponseBuilder.internalError(res, 'Failed to update travel info', error);
  }
}