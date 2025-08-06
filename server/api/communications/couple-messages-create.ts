import { Request, Response } from 'express';
import { CommunicationService } from '../../services/communication-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const communicationService = new CommunicationService();

// Validation schema for creating a couple message
const CreateCoupleMessageSchema = z.object({
  guestId: z.number().positive().optional(),
  message: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long')
}).strict(); // Prevent unknown fields

export async function createCoupleMessage(req: Request, res: Response): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    
    if (isNaN(eventId)) {
      return ResponseBuilder.badRequest(res, 'Invalid event ID');
    }
    
    // Validate request body
    const validationResult = CreateCoupleMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid couple message data', validationResult.error.errors);
    }

    const messageData = {
      eventId,
      ...validationResult.data
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
    const result = await communicationService.createCoupleMessage(messageData, context);
    
    if (result.success && result.data) {
      ResponseBuilder.created(res, result.data, 'Couple message created successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to create couple message', result.error);
    }
  } catch (error) {
    throw error;
  }
}