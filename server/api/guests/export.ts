import { Request, Response } from 'express';
import { GuestService } from '../../services/guest-service';
import { ResponseBuilder } from '../../lib/response-builder';
import { createObjectCsvStringifier } from 'csv-writer';

const guestService = new GuestService();

export async function exportGuests(req: Request, res: Response): Promise<void> {
  try {
    // Event ID is validated by middleware and available in context
    const eventId = (req as any).context.eventId;
    
    // Extract export format from query params
    const format = (req.query.format as string) || 'csv';
    const includeRelated = req.query.includeRelated === 'true';
    
    if (format !== 'csv') {
      return ResponseBuilder.badRequest(res, 'Only CSV format is currently supported');
    }

    // Create service context
    const context = {
      userId: (req.user as any).id,
      userRole: (req.user as any).role,
      eventId,
      requestId: req.headers['x-request-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Get all guests for the event
    const result = await guestService.getGuestsByEvent(eventId, context, {
      page: 1,
      limit: 10000, // Large limit to get all guests
      includeRelated
    });
    
    if (!result.success || !result.data) {
      return ResponseBuilder.internalError(res, 'Failed to fetch guests for export', result.error);
    }

    const guests = result.data.items || result.data;

    // Define CSV headers based on whether related data is included
    const baseHeaders = [
      { id: 'id', title: 'ID' },
      { id: 'firstName', title: 'First Name' },
      { id: 'lastName', title: 'Last Name' },
      { id: 'email', title: 'Email' },
      { id: 'phone', title: 'Phone' },
      { id: 'relationship', title: 'Relationship' },
      { id: 'isFamily', title: 'Is Family' },
      { id: 'rsvpStatus', title: 'RSVP Status' },
      { id: 'plusOneAllowed', title: 'Plus One Allowed' },
      { id: 'plusOneName', title: 'Plus One Name' },
      { id: 'plusOneEmail', title: 'Plus One Email' },
      { id: 'plusOnePhone', title: 'Plus One Phone' },
      { id: 'plusOneConfirmed', title: 'Plus One Confirmed' },
      { id: 'plusOneRsvpContact', title: 'Use Plus One for RSVP' },
      { id: 'dietaryRestrictions', title: 'Dietary Restrictions' },
      { id: 'accessibilityNeeds', title: 'Accessibility Needs' },
      { id: 'specialRequests', title: 'Special Requests' },
      { id: 'notes', title: 'Notes' },
      { id: 'effectiveContactName', title: 'Effective Contact Name' },
      { id: 'effectiveContactEmail', title: 'Effective Contact Email' },
      { id: 'effectiveContactPhone', title: 'Effective Contact Phone' },
      { id: 'createdAt', title: 'Created At' },
      { id: 'updatedAt', title: 'Updated At' }
    ];

    const headers = includeRelated ? [
      ...baseHeaders,
      { id: 'hasAccommodation', title: 'Has Accommodation' },
      { id: 'hasTravelInfo', title: 'Has Travel Info' },
      { id: 'mealSelectionsCount', title: 'Meal Selections Count' },
      { id: 'ceremonyAttendanceCount', title: 'Ceremony Attendance Count' }
    ] : baseHeaders;

    // Transform guest data for CSV export
    const csvData = guests.map((guest: any) => {
      const baseData = {
        id: guest.id,
        firstName: guest.firstName || '',
        lastName: guest.lastName || '',
        email: guest.email || '',
        phone: guest.phone || '',
        relationship: guest.relationship || '',
        isFamily: guest.isFamily ? 'Yes' : 'No',
        rsvpStatus: guest.rsvpStatus || 'pending',
        plusOneAllowed: guest.plusOneAllowed ? 'Yes' : 'No',
        plusOneName: guest.plusOneName || '',
        plusOneEmail: guest.plusOneEmail || '',
        plusOnePhone: guest.plusOnePhone || '',
        plusOneConfirmed: guest.plusOneConfirmed ? 'Yes' : 'No',
        plusOneRsvpContact: guest.plusOneRsvpContact ? 'Yes' : 'No',
        dietaryRestrictions: guest.dietaryRestrictions || '',
        accessibilityNeeds: guest.accessibilityNeeds || '',
        specialRequests: guest.specialRequests || '',
        notes: guest.notes || '',
        effectiveContactName: guest.effectiveContact?.name || '',
        effectiveContactEmail: guest.effectiveContact?.email || '',
        effectiveContactPhone: guest.effectiveContact?.phone || '',
        createdAt: guest.createdAt ? new Date(guest.createdAt).toISOString() : '',
        updatedAt: guest.updatedAt ? new Date(guest.updatedAt).toISOString() : ''
      };

      if (includeRelated) {
        return {
          ...baseData,
          hasAccommodation: guest.accommodation ? 'Yes' : 'No',
          hasTravelInfo: guest.travelInfo ? 'Yes' : 'No',
          mealSelectionsCount: guest.mealSelections ? guest.mealSelections.length : 0,
          ceremonyAttendanceCount: guest.ceremonyAttendance ? guest.ceremonyAttendance.length : 0
        };
      }

      return baseData;
    });

    // Create CSV stringifier
    const csvStringifier = createObjectCsvStringifier({
      header: headers
    });

    // Generate CSV content
    const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(csvData);

    // Generate filename with timestamp and event ID
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `guests-export-event-${eventId}-${timestamp}.csv`;

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');

    // Send CSV data
    res.send(csvContent);

  } catch (error) {
    throw error;
  }
}