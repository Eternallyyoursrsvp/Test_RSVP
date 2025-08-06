import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';
import { insertGuestTravelInfoSchema } from '@shared/schema';
import { z } from 'zod';

export async function createTravelInfo(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const validatedData = insertGuestTravelInfoSchema.parse({
      ...req.body,
      eventId
    });

    const travelInfo = await transportService.createTravelInfo(eventId, validatedData);

    return ResponseBuilder.success(res, {
      travelInfo,
      message: 'Travel info created successfully'
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseBuilder.validationError(res, error);
    }
    return ResponseBuilder.internalError(res, 'Failed to create travel info', error);
  }
}