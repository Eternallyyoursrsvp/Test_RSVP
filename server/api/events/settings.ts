import { Request, Response } from 'express';
import { EventService } from '../../services/event-service';
import { ResponseBuilder } from '../../lib/response-builder';

const eventService = new EventService();

export async function getEventSettings(req: Request, res: Response): Promise<void> {
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

    // Get event details (settings are part of the event entity)
    const result = await eventService.getEventById(eventId, context);
    
    if (result.success && result.data) {
      // Extract settings-related fields from the event
      const settings = {
        rsvpDeadline: result.data.rsvpDeadline,
        allowPlusOnes: result.data.allowPlusOnes,
        allowChildrenDetails: result.data.allowChildrenDetails,
        customRsvpUrl: result.data.customRsvpUrl,
        rsvpWelcomeTitle: result.data.rsvpWelcomeTitle,
        rsvpWelcomeMessage: result.data.rsvpWelcomeMessage,
        rsvpCustomBranding: result.data.rsvpCustomBranding,
        rsvpShowSelectAll: result.data.rsvpShowSelectAll,
        accommodationMode: result.data.accommodationMode,
        transportMode: result.data.transportMode,
        emailConfigured: result.data.emailConfigured,
        communicationConfigured: result.data.communicationConfigured,
        whatsappConfigured: result.data.whatsappConfigured
      };
      
      ResponseBuilder.ok(res, settings);
    } else {
      ResponseBuilder.internalError(res, 'Failed to fetch event settings', result.error);
    }
  } catch (error) {
    throw error;
  }
}

export async function updateEventSettings(req: Request, res: Response): Promise<void> {
  try {
    // Event ID is validated by middleware and available in context
    const eventId = (req as any).context.eventId;
    
    // Extract only settings-related fields from request body
    const {
      rsvpDeadline,
      allowPlusOnes,
      allowChildrenDetails,
      customRsvpUrl,
      rsvpWelcomeTitle,
      rsvpWelcomeMessage,
      rsvpCustomBranding,
      rsvpShowSelectAll,
      accommodationMode,
      transportMode,
      // Email and communication settings would typically be handled separately
      // but included here for backward compatibility
      emailConfigured,
      communicationConfigured,
      whatsappConfigured
    } = req.body;

    const settingsUpdate: any = {};
    
    // Only include provided fields
    if (rsvpDeadline !== undefined) settingsUpdate.rsvpDeadline = rsvpDeadline;
    if (allowPlusOnes !== undefined) settingsUpdate.allowPlusOnes = allowPlusOnes;
    if (allowChildrenDetails !== undefined) settingsUpdate.allowChildrenDetails = allowChildrenDetails;
    if (customRsvpUrl !== undefined) settingsUpdate.customRsvpUrl = customRsvpUrl;
    if (rsvpWelcomeTitle !== undefined) settingsUpdate.rsvpWelcomeTitle = rsvpWelcomeTitle;
    if (rsvpWelcomeMessage !== undefined) settingsUpdate.rsvpWelcomeMessage = rsvpWelcomeMessage;
    if (rsvpCustomBranding !== undefined) settingsUpdate.rsvpCustomBranding = rsvpCustomBranding;
    if (rsvpShowSelectAll !== undefined) settingsUpdate.rsvpShowSelectAll = rsvpShowSelectAll;
    if (accommodationMode !== undefined) settingsUpdate.accommodationMode = accommodationMode;
    if (transportMode !== undefined) settingsUpdate.transportMode = transportMode;
    if (emailConfigured !== undefined) settingsUpdate.emailConfigured = emailConfigured;
    if (communicationConfigured !== undefined) settingsUpdate.communicationConfigured = communicationConfigured;
    if (whatsappConfigured !== undefined) settingsUpdate.whatsappConfigured = whatsappConfigured;
    
    // Create service context
    const context = {
      userId: (req.user as any).id,
      userRole: (req.user as any).role,
      eventId,
      requestId: req.headers['x-request-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Call service method to update event with settings
    const result = await eventService.updateEvent(eventId, settingsUpdate, context);
    
    if (result.success && result.data) {
      // Return just the settings part of the updated event
      const updatedSettings = {
        rsvpDeadline: result.data.rsvpDeadline,
        allowPlusOnes: result.data.allowPlusOnes,
        allowChildrenDetails: result.data.allowChildrenDetails,
        customRsvpUrl: result.data.customRsvpUrl,
        rsvpWelcomeTitle: result.data.rsvpWelcomeTitle,
        rsvpWelcomeMessage: result.data.rsvpWelcomeMessage,
        rsvpCustomBranding: result.data.rsvpCustomBranding,
        rsvpShowSelectAll: result.data.rsvpShowSelectAll,
        accommodationMode: result.data.accommodationMode,
        transportMode: result.data.transportMode,
        emailConfigured: result.data.emailConfigured,
        communicationConfigured: result.data.communicationConfigured,
        whatsappConfigured: result.data.whatsappConfigured
      };
      
      ResponseBuilder.ok(res, updatedSettings, 'Event settings updated successfully');
    } else {
      ResponseBuilder.internalError(res, 'Failed to update event settings', result.error);
    }
  } catch (error) {
    throw error;
  }
}