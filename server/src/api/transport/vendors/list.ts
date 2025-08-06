import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';

export async function listTransportVendors(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const vendors = await transportService.listVendors(eventId);

    return ResponseBuilder.success(res, {
      vendors,
      count: vendors.length
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to fetch transport vendors', error);
  }
}