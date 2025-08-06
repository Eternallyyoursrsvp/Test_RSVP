import { Request, Response } from 'express';
import { CeremonyService } from '../../services/ceremony-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const ceremonyService = new CeremonyService();

// Validation schema for updating a ceremony (all fields optional)
const UpdateCeremonySchema = z.object({
  name: z.string().min(1, 'Ceremony name cannot be empty').max(200).optional(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format'
  }).optional(),
  startTime: z.string().min(1, 'Start time cannot be empty').optional(),
  endTime: z.string().min(1, 'End time cannot be empty').optional(),
  location: z.string().min(1, 'Location cannot be empty').max(500).optional(),
  description: z.string().optional(),
  attireCode: z.string().optional()
}).strict(); // Prevent unknown fields

export async function updateCeremony(req: Request, res: Response): Promise<void> {
  try {
    const ceremonyId = parseInt(req.params.id, 10);
    
    if (isNaN(ceremonyId)) {
      return ResponseBuilder.badRequest(res, 'Invalid ceremony ID');
    }
    
    // Validate request body
    const validationResult = UpdateCeremonySchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid ceremony update data', validationResult.error.errors);
    }

    const updateData = validationResult.data;

    // Check if any data was provided
    if (Object.keys(updateData).length === 0) {
      return ResponseBuilder.badRequest(res, 'No update data provided');
    }

    // Create service context
    const context = {
      userId: (req.user as any).id,
      userRole: (req.user as any).role,
      eventId: undefined, // Will be validated by service based on ceremony's event
      requestId: req.headers['x-request-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Call service method
    const result = await ceremonyService.updateCeremony(ceremonyId, updateData, context);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data, 'Ceremony updated successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to update ceremony', result.error);
    }
  } catch (error) {
    throw error;
  }
}