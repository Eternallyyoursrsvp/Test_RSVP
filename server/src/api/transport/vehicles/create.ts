import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';
import { insertEventVehicleSchema } from '@shared/schema';
import { z } from 'zod';

export async function createVehicle(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const validatedData = insertEventVehicleSchema.parse({
      ...req.body,
      eventId,
      vendorId: req.body.vendorId ? parseInt(req.body.vendorId) : null
    });

    const vehicle = await transportService.createVehicle(eventId, validatedData);

    return ResponseBuilder.success(res, {
      vehicle,
      message: 'Vehicle created successfully'
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseBuilder.validationError(res, error);
    }
    return ResponseBuilder.internalError(res, 'Failed to create vehicle', error);
  }
}