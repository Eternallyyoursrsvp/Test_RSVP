import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';
import { insertLocationRepresentativeSchema } from '@shared/schema';
import { z } from 'zod';

export async function createRepresentative(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const validatedData = insertLocationRepresentativeSchema.parse({
      ...req.body,
      eventId
    });

    const representative = await transportService.createRepresentative(eventId, validatedData);

    return ResponseBuilder.success(res, {
      representative,
      message: 'Location representative created successfully'
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseBuilder.validationError(res, error);
    }
    return ResponseBuilder.internalError(res, 'Failed to create location representative', error);
  }
}