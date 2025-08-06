import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';
import { insertTransportVendorSchema } from '@shared/schema';
import { z } from 'zod';

export async function updateTransportVendor(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const vendorId = parseInt(req.params.vendorId);
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    if (isNaN(vendorId)) {
      return ResponseBuilder.badRequest(res, 'Invalid vendor ID');
    }

    const validatedData = insertTransportVendorSchema.partial().parse(req.body);

    const updatedVendor = await transportService.updateVendor(vendorId, eventId, validatedData);

    if (!updatedVendor) {
      return ResponseBuilder.notFound(res, 'Transport vendor not found');
    }

    return ResponseBuilder.success(res, {
      vendor: updatedVendor,
      message: 'Transport vendor updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseBuilder.validationError(res, error);
    }
    return ResponseBuilder.internalError(res, 'Failed to update transport vendor', error);
  }
}