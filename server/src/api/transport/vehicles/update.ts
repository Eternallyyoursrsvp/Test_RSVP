import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';
import { insertEventVehicleSchema } from '@shared/schema';
import { z } from 'zod';

export async function updateVehicle(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const vehicleId = parseInt(req.params.vehicleId);
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    if (isNaN(vehicleId)) {
      return ResponseBuilder.badRequest(res, 'Invalid vehicle ID');
    }

    const validatedData = insertEventVehicleSchema.partial().parse(req.body);

    const updatedVehicle = await transportService.updateVehicle(vehicleId, eventId, validatedData);

    if (!updatedVehicle) {
      return ResponseBuilder.notFound(res, 'Vehicle not found');
    }

    return ResponseBuilder.success(res, {
      vehicle: updatedVehicle,
      message: 'Vehicle updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseBuilder.validationError(res, error);
    }
    return ResponseBuilder.internalError(res, 'Failed to update vehicle', error);
  }
}