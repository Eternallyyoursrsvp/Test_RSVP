import { Request, Response } from 'express';
import { CommunicationService } from '../../services/communication-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';

const communicationService = new CommunicationService();

// Validation schema for creating a WhatsApp template
const CreateWhatsAppTemplateSchema = z.object({
  category: z.string().min(1, 'Category cannot be empty').max(50),
  name: z.string().min(1, 'Template name cannot be empty').max(200),
  content: z.string().min(1, 'Template content cannot be empty').max(5000),
  variables: z.array(z.string()).optional()
}).strict(); // Prevent unknown fields

export async function createWhatsAppTemplate(req: Request, res: Response): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    
    if (isNaN(eventId)) {
      return ResponseBuilder.badRequest(res, 'Invalid event ID');
    }
    
    // Validate request body
    const validationResult = CreateWhatsAppTemplateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid WhatsApp template data', validationResult.error.errors);
    }

    const templateData = {
      eventId,
      ...validationResult.data,
      isUsed: false
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
    const result = await communicationService.createWhatsAppTemplate(templateData, context);
    
    if (result.success && result.data) {
      ResponseBuilder.created(res, result.data, 'WhatsApp template created successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to create WhatsApp template', result.error);
    }
  } catch (error) {
    throw error;
  }
}