import { Request, Response } from 'express';
import { CommunicationService } from '../../services/communication-service';
import { ResponseBuilder } from '../../lib/response-builder';

const communicationService = new CommunicationService();

export async function getWhatsAppTemplateById(req: Request, res: Response): Promise<void> {
  try {
    const templateId = parseInt(req.params.id, 10);
    
    if (isNaN(templateId)) {
      return ResponseBuilder.badRequest(res, 'Invalid template ID');
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
    const result = await communicationService.getWhatsAppTemplateById(templateId, context);
    
    if (result.success && result.data) {
      ResponseBuilder.ok(res, result.data, 'WhatsApp template retrieved successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to retrieve WhatsApp template', result.error);
    }
  } catch (error) {
    throw error;
  }
}