import { BaseService, ServiceContext, ServiceResult, createServiceResult } from './base-service';
import { type WeddingEvent, type InsertWeddingEvent } from '@shared/schema';
import { NotFoundError, ValidationError } from '../lib/response-builder';

export interface EventStats {
  totalGuests: number;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
  rsvpRate: number;
  totalCeremonies: number;
  totalAccommodations: number;
}

export interface EventFilters {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface EventListOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filters?: EventFilters;
}

export class EventService extends BaseService {
  
  // Get all events with filtering and pagination
  async getEvents(context: ServiceContext, options: EventListOptions = {}): Promise<ServiceResult<any>> {
    try {
      const { page = 1, limit = 10, sort = 'createdAt', order = 'desc', filters = {} } = options;
      const { offset } = this.validatePagination(page, limit);

      this.logOperation('getEvents', 'events', undefined, { context, options });

      // Get all events first (storage layer handles basic filtering)
      let allEvents = await this.storage.getAllEvents();

      // Apply role-based filtering
      if (!['admin', 'super_admin', 'staff', 'planner'].includes(context.userRole)) {
        allEvents = allEvents.filter(event => event.createdBy === context.userId);
      }

      // Apply search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        allEvents = allEvents.filter(event => 
          event.title?.toLowerCase().includes(searchTerm) ||
          event.coupleNames?.toLowerCase().includes(searchTerm) ||
          event.location?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply date range filter
      if (filters.startDate || filters.endDate) {
        allEvents = allEvents.filter(event => {
          const eventDate = new Date(event.startDate || event.date);
          if (filters.startDate && eventDate < filters.startDate) return false;
          if (filters.endDate && eventDate > filters.endDate) return false;
          return true;
        });
      }

      // Apply sorting
      allEvents.sort((a, b) => {
        let aValue: any, bValue: any;
        switch (sort) {
          case 'title':
            aValue = a.title || '';
            bValue = b.title || '';
            break;
          case 'date':
          case 'startDate':
            aValue = new Date(a.startDate || a.date);
            bValue = new Date(b.startDate || b.date);
            break;
          case 'createdAt':
          default:
            aValue = a.id; // Using ID as proxy for creation order
            bValue = b.id;
            break;
        }

        if (order === 'desc') {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
      });

      // Apply pagination
      const total = allEvents.length;
      const paginatedEvents = allEvents.slice(offset, offset + limit);

      const result = this.formatPaginationResponse(paginatedEvents, page, limit, total);

      return createServiceResult(true, result, undefined, {
        operation: 'getEvents',
        resourceType: 'events'
      });

    } catch (error) {
      this.logError('getEvents', error as Error, { context, options });
      throw error;
    }
  }

  // Get event by ID with authorization check
  async getEventById(eventId: number, context: ServiceContext): Promise<ServiceResult<WeddingEvent>> {
    try {
      this.logOperation('getEventById', 'event', eventId, { context });

      const event = await this.storage.getEvent(eventId);
      if (!event) {
        this.handleNotFound('Event', eventId);
      }

      // Validate access permissions
      await this.validateOwnership(event.createdBy, context.userId, context.userRole, 'event');

      return createServiceResult(true, event, undefined, {
        operation: 'getEventById',
        resourceType: 'event',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('getEventById', error as Error, { context, eventId });
      throw error;
    }
  }

  // Create new event
  async createEvent(eventData: InsertWeddingEvent, context: ServiceContext): Promise<ServiceResult<WeddingEvent>> {
    try {
      this.logOperation('createEvent', 'event', undefined, { context });

      // Validate required fields
      this.validateRequired(eventData.title, 'title');
      this.validateRequired(eventData.coupleNames, 'coupleNames');
      this.validateRequired(eventData.brideName, 'brideName');
      this.validateRequired(eventData.groomName, 'groomName');
      this.validateRequired(eventData.location, 'location');

      // Validate dates
      if (eventData.startDate && eventData.endDate) {
        this.validateDateRange(new Date(eventData.startDate), new Date(eventData.endDate));
      }

      if (eventData.rsvpDeadline) {
        const rsvpDeadline = new Date(eventData.rsvpDeadline);
        const eventDate = new Date(eventData.startDate || eventData.date);
        if (rsvpDeadline >= eventDate) {
          this.handleValidation('RSVP deadline must be before the event date');
        }
      }

      // Set the creator
      const completeEventData = {
        ...eventData,
        createdBy: context.userId
      };

      const event = await this.storage.createEvent(completeEventData);

      await this.auditLog('CREATE', 'event', event.id, context.userId, {
        title: event.title,
        location: event.location
      });

      return createServiceResult(true, event, undefined, {
        operation: 'createEvent',
        resourceType: 'event',
        resourceId: event.id
      });

    } catch (error) {
      this.logError('createEvent', error as Error, { context, eventData: eventData.title });
      throw error;
    }
  }

  // Update event
  async updateEvent(
    eventId: number, 
    updateData: Partial<InsertWeddingEvent>, 
    context: ServiceContext
  ): Promise<ServiceResult<WeddingEvent>> {
    try {
      this.logOperation('updateEvent', 'event', eventId, { context });

      // Check if event exists and user has permission
      const existingEvent = await this.storage.getEvent(eventId);
      if (!existingEvent) {
        this.handleNotFound('Event', eventId);
      }

      await this.validateOwnership(existingEvent.createdBy, context.userId, context.userRole, 'event');

      // Validate update data
      if (updateData.startDate && updateData.endDate) {
        this.validateDateRange(new Date(updateData.startDate), new Date(updateData.endDate));
      }

      // Ensure user cannot change the creator
      const sanitizedUpdateData = { ...updateData };
      delete (sanitizedUpdateData as any).createdBy;

      const updatedEvent = await this.storage.updateEvent(eventId, sanitizedUpdateData);
      if (!updatedEvent) {
        this.handleNotFound('Event', eventId);
      }

      await this.auditLog('UPDATE', 'event', eventId, context.userId, {
        changes: Object.keys(updateData)
      });

      return createServiceResult(true, updatedEvent, undefined, {
        operation: 'updateEvent',
        resourceType: 'event',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('updateEvent', error as Error, { context, eventId });
      throw error;
    }
  }

  // Delete event
  async deleteEvent(eventId: number, context: ServiceContext): Promise<ServiceResult<void>> {
    try {
      this.logOperation('deleteEvent', 'event', eventId, { context });

      // Check if event exists and user has permission
      const existingEvent = await this.storage.getEvent(eventId);
      if (!existingEvent) {
        this.handleNotFound('Event', eventId);
      }

      await this.validateOwnership(existingEvent.createdBy, context.userId, context.userRole, 'event');

      // Check for dependencies (guests, ceremonies, etc.)
      const guests = await this.storage.getGuestsByEvent(eventId);
      if (guests.length > 0) {
        this.handleConflict('Event', 'Cannot delete event with existing guests', {
          guestCount: guests.length
        });
      }

      const success = await this.storage.deleteEvent(eventId);
      if (!success) {
        throw new Error('Failed to delete event');
      }

      await this.auditLog('DELETE', 'event', eventId, context.userId, {
        title: existingEvent.title
      });

      return createServiceResult(true, undefined, undefined, {
        operation: 'deleteEvent',
        resourceType: 'event',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('deleteEvent', error as Error, { context, eventId });
      throw error;
    }
  }

  // Get event statistics
  async getEventStats(eventId: number, context: ServiceContext): Promise<ServiceResult<EventStats>> {
    try {
      this.logOperation('getEventStats', 'event', eventId, { context });

      // Validate access
      await this.validateEventAccess(eventId, context.userId, context.userRole);

      const guests = await this.storage.getGuestsByEvent(eventId);
      const ceremonies = await this.storage.getCeremoniesByEvent(eventId);
      const accommodations = await this.storage.getAccommodationsByEvent(eventId);

      const stats: EventStats = {
        totalGuests: guests.length,
        confirmedGuests: guests.filter(g => g.rsvpStatus === 'confirmed').length,
        pendingGuests: guests.filter(g => g.rsvpStatus === 'pending').length,
        declinedGuests: guests.filter(g => g.rsvpStatus === 'declined').length,
        rsvpRate: guests.length > 0 
          ? (guests.filter(g => g.rsvpStatus !== 'pending').length / guests.length) * 100 
          : 0,
        totalCeremonies: ceremonies.length,
        totalAccommodations: accommodations.length
      };

      return createServiceResult(true, stats, undefined, {
        operation: 'getEventStats',
        resourceType: 'event',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('getEventStats', error as Error, { context, eventId });
      throw error;
    }
  }

  // Get dashboard data (event + stats + guests)
  async getDashboardData(eventId: number, context: ServiceContext): Promise<ServiceResult<any>> {
    try {
      this.logOperation('getDashboardData', 'event', eventId, { context });

      // Get all data in parallel
      const [eventResult, statsResult] = await Promise.all([
        this.getEventById(eventId, context),
        this.getEventStats(eventId, context)
      ]);

      const guests = await this.storage.getGuestsByEvent(eventId);
      const ceremonies = await this.storage.getCeremoniesByEvent(eventId);

      const dashboardData = {
        event: eventResult.data,
        stats: statsResult.data,
        guests: guests || [],
        ceremonies: ceremonies || []
      };

      return createServiceResult(true, dashboardData, undefined, {
        operation: 'getDashboardData',
        resourceType: 'event',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('getDashboardData', error as Error, { context, eventId });
      throw error;
    }
  }
}