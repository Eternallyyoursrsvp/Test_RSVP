import { Request, Response } from 'express';
import { RSVPService } from '../../services/rsvp-service';
import { ResponseBuilder } from '../../lib/response-builder';

const rsvpService = new RSVPService();

export async function verifyRSVPToken(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return ResponseBuilder.badRequest(res, 'Token is required and must be a string');
    }

    // Verify the RSVP token and get guest context
    const result = await rsvpService.verifyRSVPAccess(token);
    
    if (result.success && result.data) {
      if (result.data.valid) {
        // Token is valid, return guest and event information
        const response = {
          valid: true,
          guest: {
            id: result.data.guest!.id,
            firstName: result.data.guest!.firstName,
            lastName: result.data.guest!.lastName,
            email: result.data.guest!.email,
            phone: result.data.guest!.phone,
            rsvpStatus: result.data.guest!.rsvpStatus,
            rsvpDate: result.data.guest!.rsvpDate,
            plusOneAllowed: result.data.guest!.plusOneAllowed,
            plusOneName: result.data.guest!.plusOneName,
            plusOneConfirmed: result.data.guest!.plusOneConfirmed,
            dietaryRestrictions: result.data.guest!.dietaryRestrictions,
            accessibilityNeeds: result.data.guest!.accessibilityNeeds,
            specialRequests: result.data.guest!.specialRequests,
            childrenDetails: result.data.guest!.childrenDetails
          },
          event: {
            id: result.data.event!.id,
            title: result.data.event!.title,
            coupleNames: result.data.event!.coupleNames,
            date: result.data.event!.date,
            location: result.data.event!.location,
            allowPlusOnes: result.data.event!.allowPlusOnes,
            allowChildrenDetails: result.data.event!.allowChildrenDetails,
            rsvpDeadline: result.data.event!.rsvpDeadline,
            rsvpWelcomeTitle: result.data.event!.rsvpWelcomeTitle,
            rsvpWelcomeMessage: result.data.event!.rsvpWelcomeMessage
          },
          ceremonies: result.data.ceremonies || [],
          expiresAt: new Date(result.data.tokenData!.timestamp + (90 * 24 * 60 * 60 * 1000)).toISOString()
        };
        
        ResponseBuilder.ok(res, response);
      } else {
        // Token is invalid
        ResponseBuilder.unauthorized(res, result.data.error || 'Invalid RSVP token');
      }
    } else {
      ResponseBuilder.internalError(res, 'Failed to verify RSVP token', result.error);
    }
  } catch (error) {
    throw error;
  }
}