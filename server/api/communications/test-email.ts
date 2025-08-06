import { Request, Response } from 'express';
import { CommunicationService } from '../../services/communication-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const communicationService = new CommunicationService();

// Validation schema for test email request
const TestEmailSchema = z.object({
  email: z.string().email('Invalid email format')
}).strict(); // Prevent unknown fields

export async function testEmail(req: Request, res: Response): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    
    if (isNaN(eventId)) {
      return ResponseBuilder.badRequest(res, 'Invalid event ID');
    }
    
    // Validate request body
    const validationResult = TestEmailSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid test email data', validationResult.error.errors);
    }

    const { email } = validationResult.data;

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
    const result = await communicationService.testEmail(eventId, email, context);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data, 'Test email processed successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to process test email', result.error);
    }
  } catch (error) {
    throw error;
  }
}