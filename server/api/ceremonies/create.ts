import { Request, Response } from 'express';
import { CeremonyService } from '../../services/ceremony-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const ceremonyService = new CeremonyService();

// Validation schema for creating a ceremony
const CreateCeremonySchema = z.object({
  name: z.string().min(1, 'Ceremony name is required').max(200),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format'
  }),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  location: z.string().min(1, 'Location is required').max(500),
  description: z.string().optional(),
  attireCode: z.string().optional()
});

export async function createCeremony(req: Request, res: Response): Promise<void> {
  try {
    // Event ID is validated by middleware and available in context
    const eventId = (req as any).context.eventId;
    
    // Validate request body
    const validationResult = CreateCeremonySchema.safeParse(req.body);
    if (!validationResult.success) {
      ResponseBuilder.badRequest(res, 'Invalid ceremony data', validationResult.error.errors);
      return;
    }

    const ceremonyData = {
      ...validationResult.data,
      eventId
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
    const result = await ceremonyService.createCeremony(ceremonyData, context);
    
    if (result.success && result.data) {
      ResponseBuilder.created(res, result.data, 'Ceremony created successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to create ceremony', result.error);
    }
  } catch (error) {
    throw error;
  }
}