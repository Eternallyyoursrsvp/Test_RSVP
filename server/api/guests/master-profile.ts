import express, { Router } from 'express';
import { ModuleService } from '../core/module-service';
import { ValidationMiddleware } from '../core/validation';
import { isAuthenticated } from '../../middleware';
import { storage } from '../../storage';
import { z } from 'zod';

const paramsSchema = z.object({
  eventId: z.string().transform(val => parseInt(val)),
  guestId: z.string().transform(val => parseInt(val))
});

const communicationEntrySchema = z.object({
  type: z.enum(['email', 'sms', 'whatsapp', 'call', 'system']),
  direction: z.enum(['inbound', 'outbound']),
  subject: z.string().optional(),
  content: z.string(),
  createdBy: z.string().optional()
});

export async function createMasterGuestProfileAPI(): Promise<Router> {
  const router = express.Router();
  const service = new ModuleService('master-guest-profile');
  const validator = new ValidationMiddleware('master-guest-profile');

  router.use(isAuthenticated);
  router.use(service.middleware);

  // Get master guest profile with comprehensive data
  router.get('/events/:eventId/guests/:guestId/master-profile',
    validator.validateParams(paramsSchema),
    async (req, res) => {
      try {
        const { eventId, guestId } = req.validatedParams;

        // Fetch comprehensive guest data from multiple sources
        const [guest, accommodations, travelInfo, communications] = await Promise.all([
          storage.getGuest(guestId),
          storage.getAccommodationsByEvent(eventId).then(accs => accs.filter(acc => acc.guestId === guestId)),
          storage.getTravelInfoByEvent(eventId).then(travels => travels.filter(travel => travel.guestId === guestId)),
          getMockCommunications(guestId) // Mock for Phase 2
        ]);

        if (!guest) {
          return res.status(404).json({
            success: false,
            error: 'Guest not found'
          });
        }

        // Build comprehensive profile
        const profile = {
          guest: {
            id: guest.id,
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
            phone: guest.phone,
            rsvpStatus: guest.rsvpStatus || 'pending',
            side: guest.side,
            relationship: guest.relationship,
            isFamily: guest.isFamily || false,
            createdAt: guest.createdAt,
            updatedAt: guest.updatedAt,
            plusOneAllowed: guest.plusOneAllowed || false,
            plusOneName: guest.plusOneName,
            plusOneConfirmed: guest.plusOneConfirmed || false,
            needsAccommodation: guest.needsAccommodation || false,
            dietaryRestrictions: guest.dietaryRestrictions,
            notes: guest.notes
          },
          accommodation: accommodations.length > 0 ? {
            id: accommodations[0].id,
            hotelName: accommodations[0].hotelName || 'Hotel TBD',
            roomType: accommodations[0].roomType || 'Standard',
            roomNumber: accommodations[0].roomNumber,
            checkIn: accommodations[0].checkIn,
            checkOut: accommodations[0].checkOut,
            specialRequests: accommodations[0].specialRequests,
            status: accommodations[0].status || 'pending'
          } : null,
          travel: travelInfo.length > 0 ? {
            id: travelInfo[0].id,
            flightNumber: travelInfo[0].flightNumber,
            airline: travelInfo[0].airline,
            arrivalDate: travelInfo[0].arrivalDate,
            arrivalTime: travelInfo[0].arrivalTime,
            arrivalLocation: travelInfo[0].arrivalLocation,
            departureDate: travelInfo[0].departureDate,
            departureTime: travelInfo[0].departureTime,
            departureLocation: travelInfo[0].departureLocation,
            needsTransportation: travelInfo[0].needsTransportation || false,
            transportGroup: travelInfo[0].transportGroup,
            status: travelInfo[0].status || 'scheduled'
          } : null,
          communications
        };

        // Generate timeline from all data sources
        const timeline = generateGuestTimeline(guest, accommodations, travelInfo, communications);

        res.json({
          success: true,
          data: {
            profile,
            timeline
          },
          metadata: {
            eventId,
            guestId,
            lastUpdated: new Date().toISOString(),
            version: '1.0'
          }
        });
      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // Add communication entry
  router.post('/events/:eventId/guests/:guestId/communications',
    validator.validateParams(paramsSchema),
    validator.validate(communicationEntrySchema),
    async (req, res) => {
      try {
        const { eventId, guestId } = req.validatedParams;
        const { type, direction, subject, content, createdBy } = req.validatedBody;

        // Mock implementation for Phase 2
        const communication = {
          id: `comm-${Date.now()}`,
          type,
          direction,
          subject,
          content,
          timestamp: new Date().toISOString(),
          status: 'sent',
          createdBy: createdBy || 'System'
        };

        // In Phase 3, this would save to database and trigger notifications
        console.log('New communication logged:', communication);

        res.json({
          success: true,
          data: communication,
          message: 'Communication logged successfully'
        });
      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // Get guest timeline only
  router.get('/events/:eventId/guests/:guestId/timeline',
    validator.validateParams(paramsSchema),
    async (req, res) => {
      try {
        const { eventId, guestId } = req.validatedParams;

        const [guest, accommodations, travelInfo, communications] = await Promise.all([
          storage.getGuest(guestId),
          storage.getAccommodationsByEvent(eventId).then(accs => accs.filter(acc => acc.guestId === guestId)),
          storage.getTravelInfoByEvent(eventId).then(travels => travels.filter(travel => travel.guestId === guestId)),
          getMockCommunications(guestId)
        ]);

        if (!guest) {
          return res.status(404).json({
            success: false,
            error: 'Guest not found'
          });
        }

        const timeline = generateGuestTimeline(guest, accommodations, travelInfo, communications);

        res.json({
          success: true,
          data: timeline,
          metadata: {
            eventId,
            guestId,
            count: timeline.length,
            lastUpdated: new Date().toISOString()
          }
        });
      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // Update guest profile quick action
  router.patch('/events/:eventId/guests/:guestId/quick-update',
    validator.validateParams(paramsSchema),
    validator.validate(z.object({
      field: z.enum(['notes', 'dietaryRestrictions', 'rsvpStatus', 'giftStatus']),
      value: z.string()
    })),
    async (req, res) => {
      try {
        const { eventId, guestId } = req.validatedParams;
        const { field, value } = req.validatedBody;

        // Mock update for Phase 2
        console.log(`Quick update: Guest ${guestId} ${field} = ${value}`);

        res.json({
          success: true,
          message: `Guest ${field} updated successfully`,
          data: {
            guestId,
            field,
            value,
            updatedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  return router;
}

// Helper function to generate guest timeline from multiple data sources
function generateGuestTimeline(guest: any, accommodations: any[], travelInfo: any[], communications: any[]) {
  const timeline = [];

  // Guest creation event
  timeline.push({
    id: `timeline-guest-created-${guest.id}`,
    type: 'rsvp',
    title: 'Guest Added',
    description: 'Guest profile created in the system',
    timestamp: guest.createdAt,
    status: 'completed',
    icon: 'user-plus',
    metadata: { source: 'guest-creation' }
  });

  // RSVP events
  if (guest.rsvpStatus && guest.rsvpStatus !== 'pending') {
    timeline.push({
      id: `timeline-rsvp-${guest.id}`,
      type: 'rsvp',
      title: `RSVP ${guest.rsvpStatus === 'confirmed' ? 'Confirmed' : 'Declined'}`,
      description: `Guest ${guest.rsvpStatus} their attendance`,
      timestamp: guest.rsvpDate || guest.updatedAt,
      status: 'completed',
      icon: guest.rsvpStatus === 'confirmed' ? 'check-circle' : 'x-circle',
      metadata: { 
        rsvpStatus: guest.rsvpStatus,
        plusOne: guest.plusOneAllowed,
        plusOneName: guest.plusOneName
      }
    });
  }

  // Accommodation events
  accommodations.forEach((acc, index) => {
    timeline.push({
      id: `timeline-accommodation-${acc.id}`,
      type: 'accommodation',
      title: 'Accommodation Assigned',
      description: `${acc.roomType} assigned at ${acc.hotelName}`,
      timestamp: acc.createdAt || acc.updatedAt,
      status: acc.status === 'confirmed' ? 'completed' : 'pending',
      icon: 'bed',
      metadata: {
        hotel: acc.hotelName,
        roomType: acc.roomType,
        roomNumber: acc.roomNumber
      }
    });
  });

  // Travel events
  travelInfo.forEach((travel, index) => {
    timeline.push({
      id: `timeline-travel-${travel.id}`,
      type: 'travel',
      title: 'Flight Details Added',
      description: `${travel.airline || ''} ${travel.flightNumber || 'Flight'} details confirmed`,
      timestamp: travel.createdAt || travel.updatedAt,
      status: travel.status === 'confirmed' ? 'completed' : 'pending',
      icon: 'plane',
      metadata: {
        flightNumber: travel.flightNumber,
        airline: travel.airline,
        arrivalDate: travel.arrivalDate,
        needsTransportation: travel.needsTransportation
      }
    });

    // Transport assignment if needed
    if (travel.needsTransportation && travel.transportGroup) {
      timeline.push({
        id: `timeline-transport-${travel.id}`,
        type: 'transport',
        title: 'Transport Assigned',
        description: `Added to ${travel.transportGroup}`,
        timestamp: travel.updatedAt,
        status: 'completed',
        icon: 'car',
        metadata: {
          transportGroup: travel.transportGroup
        }
      });
    }
  });

  // Communication events
  communications.forEach((comm) => {
    timeline.push({
      id: `timeline-comm-${comm.id}`,
      type: 'communication',
      title: `${comm.type.toUpperCase()} ${comm.direction === 'outbound' ? 'Sent' : 'Received'}`,
      description: comm.subject || comm.content.substring(0, 50) + '...',
      timestamp: comm.timestamp,
      status: 'completed',
      icon: 'message-square',
      metadata: {
        type: comm.type,
        direction: comm.direction,
        status: comm.status
      }
    });
  });

  // Sort timeline by timestamp (most recent first)
  return timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Mock communications for Phase 2 implementation
function getMockCommunications(guestId: number) {
  return [
    {
      id: `comm-1-${guestId}`,
      type: 'email',
      direction: 'outbound',
      subject: 'Wedding Invitation & RSVP',
      content: 'Save the date for our special day! Please confirm your attendance.',
      timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      status: 'read',
      createdBy: 'Wedding Couple'
    },
    {
      id: `comm-2-${guestId}`,
      type: 'email',
      direction: 'inbound',
      subject: 'Re: Wedding Invitation & RSVP',
      content: 'So excited to be part of your special day! Confirmed for both myself and plus one.',
      timestamp: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString(), // 27 days ago
      status: 'delivered'
    },
    {
      id: `comm-3-${guestId}`,
      type: 'sms',
      direction: 'outbound',
      content: 'Hi! Your accommodation details have been confirmed. Check your email for details.',
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      status: 'delivered',
      createdBy: 'Wedding Coordinator'
    },
    {
      id: `comm-4-${guestId}`,
      type: 'whatsapp',
      direction: 'inbound',
      content: 'Thank you for the update! Looking forward to the celebration 🎉',
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(), // 10 days ago + 15 minutes
      status: 'read'
    }
  ];
}