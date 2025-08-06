import { BaseService, ServiceContext, ServiceResult, createServiceResult } from './base-service';
import { type Guest, type InsertGuest } from '@shared/schema';
import { NotFoundError, ValidationError, ConflictError } from '../lib/response-builder';
import { randomBytes, createHmac } from 'crypto';

export interface RSVPTokenData {
  guestId: number;
  eventId: number;
  timestamp: number;
}

export interface PublicRSVPRequest {
  token: string;
  rsvpStatus: 'confirmed' | 'declined';
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  plusOneName?: string;
  plusOneEmail?: string;
  plusOnePhone?: string;
  plusOneConfirmed?: boolean;
  dietaryRestrictions?: string;
  accessibilityNeeds?: string;
  specialRequests?: string;
  message?: string;
  childrenDetails?: Array<{
    name: string;
    age: number;
    dietaryRestrictions?: string;
  }>;
  ceremoniesAttending?: number[];
}

export interface RSVPVerificationResult {
  valid: boolean;
  guest?: Guest;
  event?: any;
  ceremonies?: any[];
  tokenData?: RSVPTokenData;
  error?: string;
}

export interface RSVPStats {
  total: number;
  confirmed: number;
  declined: number;
  pending: number;
  responseRate: number;
  plusOnesConfirmed: number;
  childrenCount: number;
  recentResponses: Guest[];
}

export class RSVPService extends BaseService {
  private static readonly TOKEN_EXPIRY_DAYS = 90;
  private static readonly SECRET_KEY = process.env.RSVP_SECRET_KEY || 'wedding_rsvp_default_secret_key';

  // Generate secure RSVP token for public guest access
  generateRSVPToken(guestId: number, eventId: number): string {
    try {
      this.logOperation('generateRSVPToken', 'rsvp_token', guestId, { eventId });

      const timestamp = Date.now();
      const randomString = randomBytes(16).toString('hex');
      const payload = `${guestId}:${eventId}:${timestamp}:${randomString}`;
      
      const hmac = createHmac('sha256', RSVPService.SECRET_KEY);
      hmac.update(payload);
      const signature = hmac.digest('hex');
      
      return Buffer.from(`${payload}:${signature}`).toString('base64url');
    } catch (error) {
      this.logError('generateRSVPToken', error as Error, { guestId, eventId });
      throw error;
    }
  }

  // Verify RSVP token and return token data
  verifyRSVPToken(token: string): RSVPTokenData | null {
    try {
      this.logOperation('verifyRSVPToken', 'rsvp_token', undefined, { tokenLength: token.length });

      const decoded = Buffer.from(token, 'base64url').toString();
      const [guestIdStr, eventIdStr, timestampStr, randomString, signature] = decoded.split(':');
      
      const guestId = parseInt(guestIdStr);
      const eventId = parseInt(eventIdStr);
      const timestamp = parseInt(timestampStr);
      
      if (isNaN(guestId) || isNaN(eventId) || isNaN(timestamp)) {
        return null;
      }
      
      // Check if token is expired
      const expiryTime = timestamp + (RSVPService.TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      if (Date.now() > expiryTime) {
        return null;
      }
      
      // Verify signature
      const payload = `${guestId}:${eventId}:${timestamp}:${randomString}`;
      const hmac = createHmac('sha256', RSVPService.SECRET_KEY);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');
      
      if (signature !== expectedSignature) {
        return null;
      }
      
      return { guestId, eventId, timestamp };
    } catch (error) {
      this.logError('verifyRSVPToken', error as Error, { tokenLength: token.length });
      return null;
    }
  }

  // Generate public RSVP link for a guest
  generateRSVPLink(baseUrl: string, guestId: number, eventId: number): string {
    try {
      this.logOperation('generateRSVPLink', 'rsvp_link', guestId, { eventId, baseUrl });

      const token = this.generateRSVPToken(guestId, eventId);
      const formattedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      return `${formattedBaseUrl}/guest-rsvp/${token}`;
    } catch (error) {
      this.logError('generateRSVPLink', error as Error, { guestId, eventId, baseUrl });
      throw error;
    }
  }

  // Verify RSVP token and return guest context
  async verifyRSVPAccess(token: string): Promise<ServiceResult<RSVPVerificationResult>> {
    try {
      this.logOperation('verifyRSVPAccess', 'rsvp_verification', undefined, { tokenLength: token.length });

      // Verify token
      const tokenData = this.verifyRSVPToken(token);
      if (!tokenData) {
        return createServiceResult(true, {
          valid: false,
          error: 'Invalid or expired RSVP token'
        });
      }

      // Get guest and event information
      const guest = await this.storage.getGuest(tokenData.guestId);
      if (!guest) {
        return createServiceResult(true, {
          valid: false,
          error: 'Guest not found'
        });
      }

      // Verify guest belongs to the event in the token
      if (guest.eventId !== tokenData.eventId) {
        return createServiceResult(true, {
          valid: false,
          error: 'Token does not match guest event'
        });
      }

      const event = await this.storage.getEvent(tokenData.eventId);
      if (!event) {
        return createServiceResult(true, {
          valid: false,
          error: 'Event not found'
        });
      }

      // Get ceremonies for the event
      const ceremonies = await this.storage.getCeremonies(tokenData.eventId);

      return createServiceResult(true, {
        valid: true,
        guest,
        event,
        ceremonies,
        tokenData
      }, undefined, {
        operation: 'verifyRSVPAccess',
        resourceType: 'rsvp_verification',
        resourceId: tokenData.guestId
      });

    } catch (error) {
      this.logError('verifyRSVPAccess', error as Error, { tokenLength: token.length });
      return createServiceResult(false, undefined, error instanceof Error ? error.message : String(error));
    }
  }

  // Process public RSVP submission
  async submitPublicRSVP(rsvpData: PublicRSVPRequest): Promise<ServiceResult<Guest>> {
    try {
      this.logOperation('submitPublicRSVP', 'public_rsvp', undefined, { 
        token: rsvpData.token.substring(0, 10) + '...',
        rsvpStatus: rsvpData.rsvpStatus 
      });

      // Verify token and get guest context
      const verificationResult = await this.verifyRSVPAccess(rsvpData.token);
      if (!verificationResult.success || !verificationResult.data?.valid || !verificationResult.data.guest) {
        this.handleValidation(verificationResult.data?.error || 'Invalid RSVP token');
      }

      const { guest, event } = verificationResult.data!;

      // Validate RSVP status
      if (!['confirmed', 'declined'].includes(rsvpData.rsvpStatus)) {
        this.handleValidation('RSVP status must be "confirmed" or "declined"');
      }

      // Build update data
      const updateData: any = {
        rsvpStatus: rsvpData.rsvpStatus,
        rsvpDate: new Date().toISOString().split('T')[0]
      };

      // Update guest name and contact info if provided
      if (rsvpData.firstName) updateData.firstName = rsvpData.firstName;
      if (rsvpData.lastName) updateData.lastName = rsvpData.lastName;
      if (rsvpData.email) {
        this.validateEmail(rsvpData.email);
        updateData.email = rsvpData.email;
      }
      if (rsvpData.phone) {
        this.validatePhoneNumber(rsvpData.phone);
        updateData.phone = rsvpData.phone;
      }

      // Handle plus-one information
      if (guest.plusOneAllowed) {
        if (rsvpData.plusOneConfirmed !== undefined) {
          updateData.plusOneConfirmed = rsvpData.plusOneConfirmed;
        }
        if (rsvpData.plusOneName) updateData.plusOneName = rsvpData.plusOneName;
        if (rsvpData.plusOneEmail) {
          this.validateEmail(rsvpData.plusOneEmail);
          updateData.plusOneEmail = rsvpData.plusOneEmail;
        }
        if (rsvpData.plusOnePhone) {
          this.validatePhoneNumber(rsvpData.plusOnePhone);
          updateData.plusOnePhone = rsvpData.plusOnePhone;
        }
      }

      // Handle dietary restrictions and special requests
      if (rsvpData.dietaryRestrictions) updateData.dietaryRestrictions = rsvpData.dietaryRestrictions;
      if (rsvpData.accessibilityNeeds) updateData.accessibilityNeeds = rsvpData.accessibilityNeeds;
      if (rsvpData.specialRequests) updateData.specialRequests = rsvpData.specialRequests;

      // Handle children details
      if (rsvpData.childrenDetails && rsvpData.childrenDetails.length > 0) {
        // Validate children details
        for (const child of rsvpData.childrenDetails) {
          if (!child.name || child.age < 0 || child.age > 18) {
            this.handleValidation('Invalid children details: Name is required and age must be between 0-18');
          }
        }
        updateData.childrenDetails = rsvpData.childrenDetails;
      }

      // Update the guest
      const updatedGuest = await this.storage.updateGuest(guest.id, updateData);
      if (!updatedGuest) {
        this.handleNotFound('Guest', guest.id);
      }

      // Handle ceremony attendance if provided
      if (rsvpData.ceremoniesAttending && rsvpData.ceremoniesAttending.length > 0) {
        for (const ceremonyId of rsvpData.ceremoniesAttending) {
          // Check if guest-ceremony relation exists
          const existingRelation = await this.storage.getGuestCeremony(guest.id, ceremonyId);
          
          if (existingRelation) {
            await this.storage.updateGuestCeremony(existingRelation.id, { attending: true });
          } else {
            await this.storage.createGuestCeremony({
              guestId: guest.id,
              ceremonyId,
              attending: true
            });
          }
        }
      }

      // Record message to couple if provided
      if (rsvpData.message) {
        await this.storage.createCoupleMessage({
          eventId: guest.eventId,
          guestId: guest.id,
          message: rsvpData.message
        });
      }

      // Log the RSVP submission
      await this.auditLog('RSVP_SUBMIT', 'guest', guest.id, 'public', {
        eventId: guest.eventId,
        rsvpStatus: rsvpData.rsvpStatus,
        hasMessage: !!rsvpData.message,
        hasPlusOne: !!rsvpData.plusOneConfirmed,
        hasChildren: !!(rsvpData.childrenDetails && rsvpData.childrenDetails.length > 0)
      });

      return createServiceResult(true, updatedGuest, undefined, {
        operation: 'submitPublicRSVP',
        resourceType: 'public_rsvp',
        resourceId: guest.id
      });

    } catch (error) {
      this.logError('submitPublicRSVP', error as Error, { rsvpStatus: rsvpData.rsvpStatus });
      throw error;
    }
  }

  // Get RSVP statistics for an event
  async getRSVPStats(eventId: number, context: ServiceContext): Promise<ServiceResult<RSVPStats>> {
    try {
      this.logOperation('getRSVPStats', 'rsvp_stats', eventId, { context });

      // Validate event access
      await this.validateEventAccess(eventId, context.userId, context.userRole);

      // Get all guests for the event
      const guests = await this.storage.getGuestsByEvent(eventId);

      // Calculate statistics
      const confirmed = guests.filter(g => g.rsvpStatus === 'confirmed');
      const declined = guests.filter(g => g.rsvpStatus === 'declined');
      const pending = guests.filter(g => g.rsvpStatus === 'pending');
      const plusOnesConfirmed = guests.filter(g => g.plusOneConfirmed).length;
      const childrenCount = guests.reduce((acc, g) => {
        if (g.childrenDetails && Array.isArray(g.childrenDetails)) {
          return acc + g.childrenDetails.length;
        }
        return acc;
      }, 0);

      // Get recent responses (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentResponses = guests.filter(g => 
        g.rsvpDate && new Date(g.rsvpDate) >= sevenDaysAgo && g.rsvpStatus !== 'pending'
      ).sort((a, b) => new Date(b.rsvpDate!).getTime() - new Date(a.rsvpDate!).getTime()).slice(0, 10);

      const stats: RSVPStats = {
        total: guests.length,
        confirmed: confirmed.length,
        declined: declined.length,
        pending: pending.length,
        responseRate: guests.length > 0 ? ((confirmed.length + declined.length) / guests.length) * 100 : 0,
        plusOnesConfirmed,
        childrenCount,
        recentResponses
      };

      return createServiceResult(true, stats, undefined, {
        operation: 'getRSVPStats',
        resourceType: 'rsvp_stats',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('getRSVPStats', error as Error, { context, eventId });
      throw error;
    }
  }

  // Send RSVP reminders to pending guests
  async sendRSVPReminders(eventId: number, context: ServiceContext, guestIds?: number[]): Promise<ServiceResult<{ sent: number; failed: number; details: any[] }>> {
    try {
      this.logOperation('sendRSVPReminders', 'rsvp_reminders', eventId, { context, guestIds });

      // Validate event access
      await this.validateEventAccess(eventId, context.userId, context.userRole);

      // Get guests to remind
      let guests = await this.storage.getGuestsByEvent(eventId);
      
      if (guestIds && guestIds.length > 0) {
        // Filter to specific guests
        guests = guests.filter(g => guestIds.includes(g.id));
      } else {
        // Filter to pending guests with email
        guests = guests.filter(g => g.rsvpStatus === 'pending' && g.email);
      }

      const results = {
        sent: 0,
        failed: 0,
        details: [] as any[]
      };

      // Get event details for email
      const event = await this.storage.getEvent(eventId);
      if (!event) {
        this.handleNotFound('Event', eventId);
      }

      // Send reminders
      for (const guest of guests) {
        try {
          // Generate RSVP link
          const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
          const rsvpLink = this.generateRSVPLink(baseUrl, guest.id, eventId);

          // TODO: Send email using EmailService
          // For now, just log the reminder
          this.logger.info({
            guestId: guest.id,
            email: guest.email,
            rsvpLink
          }, 'RSVP reminder would be sent');

          results.sent++;
          results.details.push({
            guestId: guest.id,
            email: guest.email,
            status: 'sent',
            rsvpLink
          });

        } catch (error) {
          results.failed++;
          results.details.push({
            guestId: guest.id,
            email: guest.email,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      await this.auditLog('RSVP_REMINDERS', 'event', eventId, context.userId, {
        guestsTargeted: guests.length,
        sent: results.sent,
        failed: results.failed
      });

      return createServiceResult(true, results, undefined, {
        operation: 'sendRSVPReminders',
        resourceType: 'rsvp_reminders',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('sendRSVPReminders', error as Error, { context, eventId, guestIds });
      throw error;
    }
  }
}