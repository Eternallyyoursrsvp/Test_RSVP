import { Request, Response } from 'express';
import { RSVPService } from '../../services/rsvp-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const rsvpService = new RSVPService();

// Validation schema for RSVP reminders request
const RSVPRemindersSchema = z.object({
  guestIds: z.array(z.number()).optional(), // If not provided, sends to all pending guests
  message: z.string().max(500).optional() // Optional custom message
});

export async function sendRSVPReminders(req: Request, res: Response): Promise<void> {
  try {
    // Event ID is validated by middleware and available in context
    const eventId = (req as any).context.eventId;
    
    // Validate request body
    const validationResult = RSVPRemindersSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid reminder request data', validationResult.error.errors);
    }

    const { guestIds, message } = validationResult.data;
    
    // Create service context
    const context = {
      userId: (req.user as any).id,
      userRole: (req.user as any).role,
      eventId,
      requestId: req.headers['x-request-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Send RSVP reminders
    const result = await rsvpService.sendRSVPReminders(eventId, context, guestIds);
    
    if (result.success && result.data) {
      const response = {
        summary: {
          totalTargeted: result.data.sent + result.data.failed,
          sent: result.data.sent,
          failed: result.data.failed,
          successRate: result.data.sent + result.data.failed > 0 
            ? (result.data.sent / (result.data.sent + result.data.failed)) * 100 
            : 0
        },
        details: result.data.details,
        message: `Successfully sent ${result.data.sent} RSVP reminder${result.data.sent !== 1 ? 's' : ''}${result.data.failed > 0 ? ` (${result.data.failed} failed)` : ''}`
      };
      
      ResponseBuilder.ok(res, response, 'RSVP reminders processed');
    } else {
      ResponseBuilder.internalError(res, 'Failed to send RSVP reminders', result.error);
    }
  } catch (error) {
    throw error;
  }
}