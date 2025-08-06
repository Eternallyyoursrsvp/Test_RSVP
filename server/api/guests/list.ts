import { Request, Response } from 'express';
import { GuestService } from '../../services/guest-service';
import { ResponseBuilder } from '../../lib/response-builder';

const guestService = new GuestService();

export async function listGuests(req: Request, res: Response): Promise<void> {
  try {
    // Event ID is validated by middleware and available in context
    const eventId = (req as any).context.eventId;
    
    // Extract query parameters for filtering and pagination
    const {
      page = 1,
      limit = 50,
      sort = 'lastName',
      order = 'asc',
      search,
      rsvpStatus,
      isFamily,
      relationship,
      hasEmail,
      hasPhone,
      requiresAccommodation,
      includeRelated = false
    } = req.query;

    // Build filters object
    const filters: any = {};
    if (search && typeof search === 'string') filters.search = search;
    if (rsvpStatus && typeof rsvpStatus === 'string') filters.rsvpStatus = rsvpStatus;
    if (isFamily !== undefined) filters.isFamily = isFamily === 'true';
    if (relationship && typeof relationship === 'string') filters.relationship = relationship;
    if (hasEmail !== undefined) filters.hasEmail = hasEmail === 'true';
    if (hasPhone !== undefined) filters.hasPhone = hasPhone === 'true';
    if (requiresAccommodation !== undefined) filters.requiresAccommodation = requiresAccommodation === 'true';

    // Build options object
    const options = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sort: sort as string,
      order: order as 'asc' | 'desc',
      filters,
      includeRelated: includeRelated === 'true'
    };

    // Create service context
    const context = {
      userId: (req.user as any).id,
      userRole: (req.user as any).role,
      eventId,
      requestId: req.headers['x-request-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Call service method
    const result = await guestService.getGuestsByEvent(eventId, context, options);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data);
    } else {
      ResponseBuilder.internalError(res, 'Failed to fetch guests', result.error);
    }
  } catch (error) {
    throw error;
  }
}