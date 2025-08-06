import { BaseService, ServiceContext, ServiceResult, createServiceResult } from './base-service';
import { type Guest, type InsertGuest } from '@shared/schema';
import { NotFoundError, ValidationError, ConflictError } from '../lib/response-builder';

export interface GuestStats {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
  plusOnes: number;
  children: number;
  rsvpRate: number;
  byStatus: {
    confirmed: Guest[];
    pending: Guest[];
    declined: Guest[];
  };
}

export interface GuestFilters {
  rsvpStatus?: string;
  isFamily?: boolean;
  relationship?: string;
  search?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  requiresAccommodation?: boolean;
}

export interface GuestListOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filters?: GuestFilters;
  includeRelated?: boolean; // Include accommodation, travel, etc.
}

export interface EffectiveContact {
  name: string;
  email: string | null;
  phone: string | null;
  contactType: 'primary' | 'plus_one';
}

export interface GuestWithRelated extends Guest {
  accommodation?: any;
  travelInfo?: any;
  mealSelections?: any[];
  ceremonyAttendance?: any[];
  effectiveContact?: EffectiveContact;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  primaryContactName?: string;
  isUsingPlusOneContact?: boolean;
}

export class GuestService extends BaseService {

  // Get guests for an event with filtering and pagination
  async getGuestsByEvent(
    eventId: number,
    context: ServiceContext,
    options: GuestListOptions = {}
  ): Promise<ServiceResult<any>> {
    try {
      const { page = 1, limit = 50, sort = 'lastName', order = 'asc', filters = {}, includeRelated = false } = options;
      const { offset } = this.validatePagination(page, limit);

      this.logOperation('getGuestsByEvent', 'guests', eventId, { context, options });

      // Validate event access
      await this.validateEventAccess(eventId, context.userId, context.userRole);

      // Get base guests
      let guests = await this.storage.getGuestsByEvent(eventId);

      // Apply filters
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        guests = guests.filter(guest => 
          guest.firstName?.toLowerCase().includes(searchTerm) ||
          guest.lastName?.toLowerCase().includes(searchTerm) ||
          guest.email?.toLowerCase().includes(searchTerm) ||
          guest.plusOneName?.toLowerCase().includes(searchTerm)
        );
      }

      if (filters.rsvpStatus) {
        guests = guests.filter(guest => guest.rsvpStatus === filters.rsvpStatus);
      }

      if (filters.isFamily !== undefined) {
        guests = guests.filter(guest => guest.isFamily === filters.isFamily);
      }

      if (filters.relationship) {
        guests = guests.filter(guest => guest.relationship === filters.relationship);
      }

      if (filters.hasEmail !== undefined) {
        guests = guests.filter(guest => filters.hasEmail ? !!guest.email : !guest.email);
      }

      if (filters.hasPhone !== undefined) {
        guests = guests.filter(guest => filters.hasPhone ? !!guest.phone : !guest.phone);
      }

      // Apply sorting
      guests.sort((a, b) => {
        let aValue: any, bValue: any;
        switch (sort) {
          case 'firstName':
            aValue = a.firstName || '';
            bValue = b.firstName || '';
            break;
          case 'lastName':
            aValue = a.lastName || '';
            bValue = b.lastName || '';
            break;
          case 'email':
            aValue = a.email || '';
            bValue = b.email || '';
            break;
          case 'rsvpStatus':
            aValue = a.rsvpStatus || '';
            bValue = b.rsvpStatus || '';
            break;
          case 'createdAt':
          default:
            aValue = a.id;
            bValue = b.id;
            break;
        }

        if (order === 'desc') {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
      });

      // Process guests with effective contacts and related data
      const processedGuests = await Promise.all(
        guests.map(async (guest) => {
          const effectiveContact = this.getEffectiveGuestContact(guest);
          let guestWithRelated: GuestWithRelated = {
            ...guest,
            effectiveContact,
            primaryContactEmail: effectiveContact.email,
            primaryContactPhone: effectiveContact.phone,
            primaryContactName: effectiveContact.name,
            isUsingPlusOneContact: effectiveContact.contactType === 'plus_one'
          };

          // Include related data if requested
          if (includeRelated) {
            try {
              const [accommodation, travelInfo, mealSelections, ceremonyAttendance] = await Promise.all([
                this.storage.getAccommodationsByEvent(eventId).then(accs => 
                  accs.find((acc: any) => acc.guestId === guest.id)
                ).catch(() => null),
                this.storage.getTravelInfoByEvent(eventId).then(travels => 
                  travels.find((travel: any) => travel.guestId === guest.id)
                ).catch(() => null),
                this.storage.getGuestMealSelectionsByGuest(guest.id).catch(() => []),
                this.storage.getGuestCeremoniesByGuest(guest.id).catch(() => [])
              ]);

              guestWithRelated.accommodation = accommodation;
              guestWithRelated.travelInfo = travelInfo;
              guestWithRelated.mealSelections = mealSelections;
              guestWithRelated.ceremonyAttendance = ceremonyAttendance;
            } catch (error) {
              // Continue with base guest data if related data fails
              this.logger.warn({ error: error instanceof Error ? error.message : String(error), guestId: guest.id }, 'Failed to load related guest data');
            }
          }

          return guestWithRelated;
        })
      );

      // Apply pagination
      const total = processedGuests.length;
      const paginatedGuests = processedGuests.slice(offset, offset + limit);

      const result = this.formatPaginationResponse(paginatedGuests, page, limit, total);

      return createServiceResult(true, result, undefined, {
        operation: 'getGuestsByEvent',
        resourceType: 'guests',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('getGuestsByEvent', error as Error, { context, eventId, options });
      throw error;
    }
  }

  // Get guest by ID with authorization
  async getGuestById(guestId: number, context: ServiceContext): Promise<ServiceResult<GuestWithRelated>> {
    try {
      this.logOperation('getGuestById', 'guest', guestId, { context });

      const guest = await this.storage.getGuest(guestId);
      if (!guest) {
        this.handleNotFound('Guest', guestId);
      }

      // Validate event access
      await this.validateEventAccess(guest.eventId, context.userId, context.userRole);

      // Process guest with effective contact and related data
      const effectiveContact = this.getEffectiveGuestContact(guest);
      let guestWithRelated: GuestWithRelated = {
        ...guest,
        effectiveContact,
        primaryContactEmail: effectiveContact.email,
        primaryContactPhone: effectiveContact.phone,
        primaryContactName: effectiveContact.name,
        isUsingPlusOneContact: effectiveContact.contactType === 'plus_one'
      };

      return createServiceResult(true, guestWithRelated, undefined, {
        operation: 'getGuestById',
        resourceType: 'guest',
        resourceId: guestId
      });

    } catch (error) {
      this.logError('getGuestById', error as Error, { context, guestId });
      throw error;
    }
  }

  // Create new guest
  async createGuest(guestData: InsertGuest, context: ServiceContext): Promise<ServiceResult<Guest>> {
    try {
      this.logOperation('createGuest', 'guest', undefined, { context });

      // Validate required fields
      this.validateRequired(guestData.eventId, 'eventId');
      this.validateRequired(guestData.firstName, 'firstName');
      this.validateRequired(guestData.lastName, 'lastName');

      // Validate event access
      await this.validateEventAccess(guestData.eventId, context.userId, context.userRole);

      // Validate email format if provided
      if (guestData.email) {
        this.validateEmail(guestData.email);
      }

      // Validate phone format if provided
      if (guestData.phone) {
        this.validatePhoneNumber(guestData.phone);
      }

      // Check for duplicate guest in the same event
      if (guestData.email) {
        const existingGuest = await this.storage.getGuestByEmail(guestData.eventId, guestData.email);
        if (existingGuest) {
          this.handleConflict('Guest', 'Guest with this email already exists in this event', {
            email: guestData.email,
            existingGuestId: existingGuest.id
          });
        }
      }

      // Validate RSVP status
      if (guestData.rsvpStatus && !['pending', 'confirmed', 'declined'].includes(guestData.rsvpStatus)) {
        this.handleValidation('Invalid RSVP status. Must be: pending, confirmed, or declined');
      }

      const guest = await this.storage.createGuest(guestData);

      await this.auditLog('CREATE', 'guest', guest.id, context.userId, {
        eventId: guest.eventId,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email
      });

      return createServiceResult(true, guest, undefined, {
        operation: 'createGuest',
        resourceType: 'guest',
        resourceId: guest.id
      });

    } catch (error) {
      this.logError('createGuest', error as Error, { context, eventId: guestData.eventId });
      throw error;
    }
  }

  // Update guest
  async updateGuest(
    guestId: number,
    updateData: Partial<InsertGuest>,
    context: ServiceContext
  ): Promise<ServiceResult<Guest>> {
    try {
      this.logOperation('updateGuest', 'guest', guestId, { context });

      // Get existing guest
      const existingGuest = await this.storage.getGuest(guestId);
      if (!existingGuest) {
        this.handleNotFound('Guest', guestId);
      }

      // Validate event access
      await this.validateEventAccess(existingGuest.eventId, context.userId, context.userRole);

      // Validate email format if provided
      if (updateData.email) {
        this.validateEmail(updateData.email);
      }

      // Validate phone format if provided
      if (updateData.phone) {
        this.validatePhoneNumber(updateData.phone);
      }

      // Check for email conflicts if email is being changed
      if (updateData.email && updateData.email !== existingGuest.email) {
        const conflictGuest = await this.storage.getGuestByEmail(existingGuest.eventId, updateData.email);
        if (conflictGuest && conflictGuest.id !== guestId) {
          this.handleConflict('Guest', 'Another guest with this email already exists in this event', {
            email: updateData.email,
            conflictGuestId: conflictGuest.id
          });
        }
      }

      // Validate RSVP status
      if (updateData.rsvpStatus && !['pending', 'confirmed', 'declined'].includes(updateData.rsvpStatus)) {
        this.handleValidation('Invalid RSVP status. Must be: pending, confirmed, or declined');
      }

      // Ensure eventId cannot be changed
      const sanitizedUpdateData = { ...updateData };
      delete (sanitizedUpdateData as any).eventId;

      const updatedGuest = await this.storage.updateGuest(guestId, { 
        ...sanitizedUpdateData, 
        eventId: existingGuest.eventId 
      });

      if (!updatedGuest) {
        this.handleNotFound('Guest', guestId);
      }

      await this.auditLog('UPDATE', 'guest', guestId, context.userId, {
        eventId: existingGuest.eventId,
        changes: Object.keys(updateData)
      });

      return createServiceResult(true, updatedGuest, undefined, {
        operation: 'updateGuest',
        resourceType: 'guest',
        resourceId: guestId
      });

    } catch (error) {
      this.logError('updateGuest', error as Error, { context, guestId });
      throw error;
    }
  }

  // Delete guest
  async deleteGuest(guestId: number, context: ServiceContext): Promise<ServiceResult<void>> {
    try {
      this.logOperation('deleteGuest', 'guest', guestId, { context });

      // Get existing guest
      const existingGuest = await this.storage.getGuest(guestId);
      if (!existingGuest) {
        this.handleNotFound('Guest', guestId);
      }

      // Validate event access
      await this.validateEventAccess(existingGuest.eventId, context.userId, context.userRole);

      const success = await this.storage.deleteGuest(guestId);
      if (!success) {
        throw new Error('Failed to delete guest');
      }

      await this.auditLog('DELETE', 'guest', guestId, context.userId, {
        eventId: existingGuest.eventId,
        firstName: existingGuest.firstName,
        lastName: existingGuest.lastName,
        email: existingGuest.email
      });

      return createServiceResult(true, undefined, undefined, {
        operation: 'deleteGuest',
        resourceType: 'guest',
        resourceId: guestId
      });

    } catch (error) {
      this.logError('deleteGuest', error as Error, { context, guestId });
      throw error;
    }
  }

  // Update contact preference
  async updateContactPreference(
    guestId: number,
    plusOneRsvpContact: boolean,
    context: ServiceContext
  ): Promise<ServiceResult<GuestWithRelated>> {
    try {
      this.logOperation('updateContactPreference', 'guest', guestId, { context, plusOneRsvpContact });

      const currentGuest = await this.storage.getGuest(guestId);
      if (!currentGuest) {
        this.handleNotFound('Guest', guestId);
      }

      // Validate event access
      await this.validateEventAccess(currentGuest.eventId, context.userId, context.userRole);

      // Validate plus-one contact setting
      if (plusOneRsvpContact && (!currentGuest.plusOneConfirmed || !currentGuest.plusOneName)) {
        this.handleValidation('Cannot set plus-one as RSVP contact: No confirmed plus-one exists');
      }

      const updatedGuest = await this.storage.updateGuest(guestId, { plusOneRsvpContact });
      if (!updatedGuest) {
        this.handleNotFound('Guest', guestId);
      }

      // Return guest with effective contact
      const effectiveContact = this.getEffectiveGuestContact(updatedGuest);
      const guestWithContact: GuestWithRelated = {
        ...updatedGuest,
        effectiveContact,
        primaryContactEmail: effectiveContact.email,
        primaryContactPhone: effectiveContact.phone,
        primaryContactName: effectiveContact.name,
        isUsingPlusOneContact: effectiveContact.contactType === 'plus_one'
      };

      await this.auditLog('UPDATE', 'guest', guestId, context.userId, {
        eventId: currentGuest.eventId,
        changes: ['plusOneRsvpContact'],
        newValue: plusOneRsvpContact
      });

      return createServiceResult(true, guestWithContact, undefined, {
        operation: 'updateContactPreference',
        resourceType: 'guest',
        resourceId: guestId
      });

    } catch (error) {
      this.logError('updateContactPreference', error as Error, { context, guestId });
      throw error;
    }
  }

  // Bulk create guests (for imports)
  async bulkCreateGuests(guestsData: InsertGuest[], context: ServiceContext): Promise<ServiceResult<Guest[]>> {
    try {
      this.logOperation('bulkCreateGuests', 'guests', undefined, { context, count: guestsData.length });

      if (guestsData.length === 0) {
        this.handleValidation('No guest data provided for bulk creation');
      }

      // Validate all guests belong to the same event
      const eventIds = [...new Set(guestsData.map(g => g.eventId))];
      if (eventIds.length > 1) {
        this.handleValidation('All guests must belong to the same event for bulk creation');
      }

      const eventId = eventIds[0];
      await this.validateEventAccess(eventId, context.userId, context.userRole);

      // Validate each guest data
      const validatedGuests: InsertGuest[] = [];
      const errors: any[] = [];

      for (let i = 0; i < guestsData.length; i++) {
        const guestData = guestsData[i];
        try {
          // Basic validation
          this.validateRequired(guestData.firstName, `Guest ${i + 1}: firstName`);
          this.validateRequired(guestData.lastName, `Guest ${i + 1}: lastName`);

          if (guestData.email) {
            this.validateEmail(guestData.email);
          }

          if (guestData.phone) {
            this.validatePhoneNumber(guestData.phone);
          }

          validatedGuests.push(guestData);
        } catch (error) {
          errors.push({
            index: i,
            guest: `${guestData.firstName} ${guestData.lastName}`,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      if (errors.length > 0) {
        this.handleValidation('Validation errors in bulk guest data', errors);
      }

      // Check for email duplicates within the batch and against existing guests
      const emailMap = new Map<string, number>();
      const emailConflicts: any[] = [];

      for (let i = 0; i < validatedGuests.length; i++) {
        const guest = validatedGuests[i];
        if (guest.email) {
          // Check within batch
          if (emailMap.has(guest.email)) {
            emailConflicts.push({
              email: guest.email,
              conflictType: 'within_batch',
              guests: [emailMap.get(guest.email)! + 1, i + 1]
            });
          } else {
            emailMap.set(guest.email, i);
          }

          // Check against existing guests
          const existingGuest = await this.storage.getGuestByEmail(eventId, guest.email);
          if (existingGuest) {
            emailConflicts.push({
              email: guest.email,
              conflictType: 'existing_guest',
              existingGuestId: existingGuest.id,
              batchIndex: i + 1
            });
          }
        }
      }

      if (emailConflicts.length > 0) {
        this.handleConflict('Guests', 'Email conflicts detected in bulk import', emailConflicts);
      }

      // Create guests using storage bulk method
      const createdGuests = await this.storage.bulkCreateGuests(validatedGuests);

      await this.auditLog('BULK_CREATE', 'guests', eventId, context.userId, {
        eventId,
        count: createdGuests.length,
        guestNames: createdGuests.map(g => `${g.firstName} ${g.lastName}`)
      });

      return createServiceResult(true, createdGuests, undefined, {
        operation: 'bulkCreateGuests',
        resourceType: 'guests',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('bulkCreateGuests', error as Error, { context, count: guestsData.length });
      throw error;
    }
  }

  // Get effective contact information for a guest
  private getEffectiveGuestContact(guest: Guest): EffectiveContact {
    // If using plus-one contact and plus-one exists
    if (guest.plusOneRsvpContact && guest.plusOneName && guest.plusOneEmail) {
      return {
        name: guest.plusOneName,
        email: guest.plusOneEmail || null,
        phone: guest.plusOnePhone || null,
        contactType: 'plus_one'
      };
    }

    // Use primary guest contact
    return {
      name: `${guest.firstName} ${guest.lastName}`,
      email: guest.email || null,
      phone: guest.phone || null,
      contactType: 'primary'
    };
  }

  // Get guest statistics for an event
  async getGuestStats(eventId: number, context: ServiceContext): Promise<ServiceResult<GuestStats>> {
    try {
      this.logOperation('getGuestStats', 'guests', eventId, { context });

      // Validate event access
      await this.validateEventAccess(eventId, context.userId, context.userRole);

      const guests = await this.storage.getGuestsByEvent(eventId);

      const stats: GuestStats = {
        total: guests.length,
        confirmed: guests.filter(g => g.rsvpStatus === 'confirmed').length,
        pending: guests.filter(g => g.rsvpStatus === 'pending').length,
        declined: guests.filter(g => g.rsvpStatus === 'declined').length,
        plusOnes: guests.filter(g => g.plusOneName).length,
        children: guests.reduce((acc, g) => {
          if (g.childrenDetails && Array.isArray(g.childrenDetails)) {
            return acc + g.childrenDetails.length;
          }
          return acc;
        }, 0),
        rsvpRate: guests.length > 0 
          ? (guests.filter(g => g.rsvpStatus !== 'pending').length / guests.length) * 100 
          : 0,
        byStatus: {
          confirmed: guests.filter(g => g.rsvpStatus === 'confirmed'),
          pending: guests.filter(g => g.rsvpStatus === 'pending'),
          declined: guests.filter(g => g.rsvpStatus === 'declined')
        }
      };

      return createServiceResult(true, stats, undefined, {
        operation: 'getGuestStats',
        resourceType: 'guests',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('getGuestStats', error as Error, { context, eventId });
      throw error;
    }
  }
}