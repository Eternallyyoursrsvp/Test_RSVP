import { Request, Response } from 'express';
import { CommunicationService } from '../../services/communication-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const communicationService = new CommunicationService();

// Validation schema for updating a WhatsApp template (all fields optional)
const UpdateWhatsAppTemplateSchema = z.object({
  category: z.string().min(1, 'Category cannot be empty').max(50).optional(),
  name: z.string().min(1, 'Template name cannot be empty').max(200).optional(),
  content: z.string().min(1, 'Template content cannot be empty').max(5000).optional(),
  variables: z.array(z.string()).optional()
}).strict(); // Prevent unknown fields

export async function updateWhatsAppTemplate(req: Request, res: Response): Promise<void> {
  try {
    const templateId = parseInt(req.params.id, 10);
    
    if (isNaN(templateId)) {
      return ResponseBuilder.badRequest(res, 'Invalid template ID');
    }
    
    // Validate request body
    const validationResult = UpdateWhatsAppTemplateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid WhatsApp template update data', validationResult.error.errors);
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
      eventId: undefined, // Will be validated by service based on template's event
      requestId: req.headers['x-request-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Call service method
    const result = await communicationService.updateWhatsAppTemplate(templateId, updateData, context);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data, 'WhatsApp template updated successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to update WhatsApp template', result.error);
    }
  } catch (error) {
    throw error;
  }
}