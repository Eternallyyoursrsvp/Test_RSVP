import { Request, Response } from 'express';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';
import { transportService } from '../../../services/TransportService';

export async function deleteTransportVendor(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const vendorId = parseInt(req.params.vendorId);
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    if (isNaN(vendorId)) {
      return ResponseBuilder.badRequest(res, 'Invalid vendor ID');
    }

    const deleted = await transportService.deleteVendor(vendorId, eventId);

    if (!deleted) {
      return ResponseBuilder.notFound(res, 'Transport vendor not found');
    }

    return ResponseBuilder.success(res, {
      message: 'Transport vendor deleted successfully',
      deletedVendorId: vendorId
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to delete transport vendor', error);
  }
}