import { Request, Response } from 'express';
import { RSVPService } from '../../services/rsvp-service';
import { ResponseBuilder } from '../../lib/response-builder';

const rsvpService = new RSVPService();

export async function getRSVPStats(req: Request, res: Response): Promise<void> {
  try {
    // Event ID is validated by middleware and available in context
    const eventId = (req as any).context.eventId;
    
    // Create service context
    const context = {
      userId: (req.user as any).id,
      userRole: (req.user as any).role,
      eventId,
      requestId: req.headers['x-request-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Get RSVP statistics
    const result = await rsvpService.getRSVPStats(eventId, context);
    
    if (result.success && result.data) {
      // Format the response with additional calculated fields
      const stats = {
        ...result.data,
        // Add percentage breakdowns
        confirmedPercentage: result.data.total > 0 ? (result.data.confirmed / result.data.total) * 100 : 0,
        declinedPercentage: result.data.total > 0 ? (result.data.declined / result.data.total) * 100 : 0,
        pendingPercentage: result.data.total > 0 ? (result.data.pending / result.data.total) * 100 : 0,
        // Add expected attendance (confirmed + plus ones)
        expectedAttendance: result.data.confirmed + result.data.plusOnesConfirmed,
        // Format recent responses for display
        recentResponses: result.data.recentResponses.map(guest => ({
          id: guest.id,
          name: `${guest.firstName} ${guest.lastName}`,
          rsvpStatus: guest.rsvpStatus,
          rsvpDate: guest.rsvpDate,
          hasPlusOne: !!guest.plusOneConfirmed
        }))
      };
      
      ResponseBuilder.ok(res, stats);
    } else {
      ResponseBuilder.internalError(res, 'Failed to fetch RSVP statistics', result.error);
    }
  } catch (error) {
    throw error;
  }
}