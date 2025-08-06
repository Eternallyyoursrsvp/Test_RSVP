import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';
import { insertLocationRepresentativeSchema } from '@shared/schema';
import { z } from 'zod';

export async function updateRepresentative(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const repId = parseInt(req.params.repId);
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    if (isNaN(repId)) {
      return ResponseBuilder.badRequest(res, 'Invalid representative ID');
    }

    const validatedData = insertLocationRepresentativeSchema.partial().parse(req.body);

    const updatedRepresentative = await transportService.updateRepresentative(repId, eventId, validatedData);

    if (!updatedRepresentative) {
      return ResponseBuilder.notFound(res, 'Location representative not found');
    }

    return ResponseBuilder.success(res, {
      representative: updatedRepresentative,
      message: 'Location representative updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseBuilder.validationError(res, error);
    }
    return ResponseBuilder.internalError(res, 'Failed to update location representative', error);
  }
}