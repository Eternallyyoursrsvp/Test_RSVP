import { BaseService, ServiceContext, ServiceResult, createServiceResult } from './base-service';
import { type Ceremony, type InsertCeremony } from '@shared/schema';
import { NotFoundError, ValidationError, ConflictError } from '../lib/response-builder';

export interface CeremonyListOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  includeStats?: boolean;
  includeAttendance?: boolean;
}

export interface CeremonyStats {
  totalGuests: number;
  attending: number;
  notAttending: number;
  pending: number;
  attendanceRate: number;
  mealSelections: {
    total: number;
    byOption: Array<{
      mealOptionId: number;
      mealOptionName: string;
      count: number;
    }>;
  };
}

export interface CeremonyWithStats extends Ceremony {
  stats?: CeremonyStats;
  attendance?: Array<{
    guestId: number;
    guestName: string;
    attending: boolean;
    mealSelection?: {
      mealOptionId: number;
      mealOptionName: string;
    };
  }>;
}

export interface MealOption {
  id: number;
  ceremonyId: number;
  eventId: number;
  name: string;
  description?: string;
  dietaryInfo?: string;
  isVegetarian: boolean;
  isVegan: boolean;
  allergens?: string;
  price?: number;
  maxSelections?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuestCeremonyAttendance {
  id: number;
  guestId: number;
  ceremonyId: number;
  attending: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuestMealSelection {
  id: number;
  guestId: number;
  ceremonyId: number;
  mealOptionId: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export class CeremonyService extends BaseService {

  // Get ceremonies for an event with optional stats and attendance
  async getCeremoniesByEvent(
    eventId: number,
    context: ServiceContext,
    options: CeremonyListOptions = {}
  ): Promise<ServiceResult<any>> {
    try {
      const { page = 1, limit = 50, sort = 'date', order = 'asc', includeStats = false, includeAttendance = false } = options;
      const { offset } = this.validatePagination(page, limit);

      this.logOperation('getCeremoniesByEvent', 'ceremonies', eventId, { context, options });

      // Validate event access
      await this.validateEventAccess(eventId, context.userId, context.userRole);

      // Get base ceremonies
      let ceremonies = await this.storage.getCeremoniesByEvent(eventId);

      // Apply sorting
      ceremonies.sort((a, b) => {
        let aValue: any, bValue: any;
        switch (sort) {
          case 'name':
            aValue = a.name || '';
            bValue = b.name || '';
            break;
          case 'date':
            aValue = a.date ? new Date(a.date).getTime() : 0;
            bValue = b.date ? new Date(b.date).getTime() : 0;
            break;
          case 'startTime':
            aValue = a.startTime || '';
            bValue = b.startTime || '';
            break;
          case 'location':
            aValue = a.location || '';
            bValue = b.location || '';
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

      // Process ceremonies with additional data if requested
      const processedCeremonies = await Promise.all(
        ceremonies.map(async (ceremony): Promise<CeremonyWithStats> => {
          let ceremonyWithStats: CeremonyWithStats = { ...ceremony };

          if (includeStats) {
            try {
              ceremonyWithStats.stats = await this.getCeremonyStatsInternal(ceremony.id);
            } catch (error) {
              this.logger.warn({ error: error instanceof Error ? error.message : String(error), ceremonyId: ceremony.id }, 'Failed to load ceremony stats');
            }
          }

          if (includeAttendance) {
            try {
              ceremonyWithStats.attendance = await this.getCeremonyAttendanceInternal(ceremony.id);
            } catch (error) {
              this.logger.warn({ error: error instanceof Error ? error.message : String(error), ceremonyId: ceremony.id }, 'Failed to load ceremony attendance');
            }
          }

          return ceremonyWithStats;
        })
      );

      // Apply pagination
      const total = processedCeremonies.length;
      const paginatedCeremonies = processedCeremonies.slice(offset, offset + limit);

      const result = this.formatPaginationResponse(paginatedCeremonies, page, limit, total);

      return createServiceResult(true, result, undefined, {
        operation: 'getCeremoniesByEvent',
        resourceType: 'ceremonies',
        resourceId: eventId
      });

    } catch (error) {
      this.logError('getCeremoniesByEvent', error as Error, { context, eventId, options });
      throw error;
    }
  }

  // Get ceremony by ID with authorization
  async getCeremonyById(ceremonyId: number, context: ServiceContext): Promise<ServiceResult<CeremonyWithStats>> {
    try {
      this.logOperation('getCeremonyById', 'ceremony', ceremonyId, { context });

      const ceremony = await this.storage.getCeremony(ceremonyId);
      if (!ceremony) {
        this.handleNotFound('Ceremony', ceremonyId);
      }

      // Validate event access
      await this.validateEventAccess(ceremony.eventId, context.userId, context.userRole);

      // Get stats and attendance
      const [stats, attendance] = await Promise.all([
        this.getCeremonyStatsInternal(ceremonyId).catch(() => undefined),
        this.getCeremonyAttendanceInternal(ceremonyId).catch(() => undefined)
      ]);

      const ceremonryWithStats: CeremonyWithStats = {
        ...ceremony,
        stats,
        attendance
      };

      return createServiceResult(true, ceremonryWithStats, undefined, {
        operation: 'getCeremonyById',
        resourceType: 'ceremony',
        resourceId: ceremonyId
      });

    } catch (error) {
      this.logError('getCeremonyById', error as Error, { context, ceremonyId });
      throw error;
    }
  }

  // Create new ceremony
  async createCeremony(ceremonyData: InsertCeremony, context: ServiceContext): Promise<ServiceResult<Ceremony>> {
    try {
      this.logOperation('createCeremony', 'ceremony', undefined, { context });

      // Validate required fields
      this.validateRequired(ceremonyData.eventId, 'eventId');
      this.validateRequired(ceremonyData.name, 'name');

      // Validate event access
      await this.validateEventAccess(ceremonyData.eventId, context.userId, context.userRole);

      // Validate date format (required field)
      const date = new Date(ceremonyData.date);
      if (isNaN(date.getTime())) {
        this.handleValidation('Invalid ceremony date format');
      }

      // Validate required fields
      this.validateRequired(ceremonyData.startTime, 'startTime');
      this.validateRequired(ceremonyData.endTime, 'endTime');
      this.validateRequired(ceremonyData.location, 'location');

      // Check for duplicate ceremony name in the same event
      const existingCeremonies = await this.storage.getCeremoniesByEvent(ceremonyData.eventId);
      const duplicateName = existingCeremonies.find(c => 
        c.name.toLowerCase() === ceremonyData.name.toLowerCase()
      );
      if (duplicateName) {
        this.handleConflict('Ceremony', 'A ceremony with this name already exists in this event', {
          name: ceremonyData.name,
          existingCeremonyId: duplicateName.id
        });
      }

      const ceremony = await this.storage.createCeremony(ceremonyData);

      await this.auditLog('CREATE', 'ceremony', ceremony.id, context.userId, {
        eventId: ceremony.eventId,
        name: ceremony.name,
        date: ceremony.date,
        location: ceremony.location,
        startTime: ceremony.startTime,
        endTime: ceremony.endTime
      });

      return createServiceResult(true, ceremony, undefined, {
        operation: 'createCeremony',
        resourceType: 'ceremony',
        resourceId: ceremony.id
      });

    } catch (error) {
      this.logError('createCeremony', error as Error, { context, eventId: ceremonyData.eventId });
      throw error;
    }
  }

  // Update ceremony
  async updateCeremony(
    ceremonyId: number,
    updateData: Partial<InsertCeremony>,
    context: ServiceContext
  ): Promise<ServiceResult<Ceremony>> {
    try {
      this.logOperation('updateCeremony', 'ceremony', ceremonyId, { context });

      // Get existing ceremony
      const existingCeremony = await this.storage.getCeremony(ceremonyId);
      if (!existingCeremony) {
        this.handleNotFound('Ceremony', ceremonyId);
      }

      // Validate event access
      await this.validateEventAccess(existingCeremony.eventId, context.userId, context.userRole);

      // Validate date if provided
      if (updateData.date) {
        const date = new Date(updateData.date);
        if (isNaN(date.getTime())) {
          this.handleValidation('Invalid ceremony date format');
        }
      }

      // Check for name conflicts if name is being changed
      if (updateData.name && updateData.name !== existingCeremony.name) {
        const existingCeremonies = await this.storage.getCeremoniesByEvent(existingCeremony.eventId);
        const duplicateName = existingCeremonies.find(c => 
          c.id !== ceremonyId && c.name.toLowerCase() === updateData.name!.toLowerCase()
        );
        if (duplicateName) {
          this.handleConflict('Ceremony', 'Another ceremony with this name already exists in this event', {
            name: updateData.name,
            conflictCeremonyId: duplicateName.id
          });
        }
      }

      // Ensure eventId cannot be changed
      const sanitizedUpdateData = { ...updateData };
      delete (sanitizedUpdateData as any).eventId;

      const updatedCeremony = await this.storage.updateCeremony(ceremonyId, {
        ...sanitizedUpdateData,
        eventId: existingCeremony.eventId
      });

      if (!updatedCeremony) {
        this.handleNotFound('Ceremony', ceremonyId);
      }

      await this.auditLog('UPDATE', 'ceremony', ceremonyId, context.userId, {
        eventId: existingCeremony.eventId,
        changes: Object.keys(updateData)
      });

      return createServiceResult(true, updatedCeremony, undefined, {
        operation: 'updateCeremony',
        resourceType: 'ceremony',
        resourceId: ceremonyId
      });

    } catch (error) {
      this.logError('updateCeremony', error as Error, { context, ceremonyId });
      throw error;
    }
  }

  // Delete ceremony
  async deleteCeremony(ceremonyId: number, context: ServiceContext): Promise<ServiceResult<void>> {
    try {
      this.logOperation('deleteCeremony', 'ceremony', ceremonyId, { context });

      // Get existing ceremony
      const existingCeremony = await this.storage.getCeremony(ceremonyId);
      if (!existingCeremony) {
        this.handleNotFound('Ceremony', ceremonyId);
      }

      // Validate event access
      await this.validateEventAccess(existingCeremony.eventId, context.userId, context.userRole);

      // Check if ceremony has any guest attendance or meal selections
      const [attendance, mealSelections] = await Promise.all([
        this.storage.getGuestCeremoniesByCeremony(ceremonyId),
        this.storage.getMealOptionsByCeremony(ceremonyId)
      ]);

      if (attendance.length > 0 || mealSelections.length > 0) {
        this.handleValidation('Cannot delete ceremony: It has existing guest attendance or meal selections. Please remove those first.');
      }

      const success = await this.storage.deleteCeremony(ceremonyId);
      if (!success) {
        throw new Error('Failed to delete ceremony');
      }

      await this.auditLog('DELETE', 'ceremony', ceremonyId, context.userId, {
        eventId: existingCeremony.eventId,
        name: existingCeremony.name,
        date: existingCeremony.date,
        location: existingCeremony.location,
        startTime: existingCeremony.startTime,
        endTime: existingCeremony.endTime
      });

      return createServiceResult(true, undefined, undefined, {
        operation: 'deleteCeremony',
        resourceType: 'ceremony',
        resourceId: ceremonyId
      });

    } catch (error) {
      this.logError('deleteCeremony', error as Error, { context, ceremonyId });
      throw error;
    }
  }

  // Get ceremony statistics
  async getCeremonyStats(ceremonyId: number, context: ServiceContext): Promise<ServiceResult<CeremonyStats>> {
    try {
      this.logOperation('getCeremonyStats', 'ceremony_stats', ceremonyId, { context });

      // Get ceremony and validate access
      const ceremony = await this.storage.getCeremony(ceremonyId);
      if (!ceremony) {
        this.handleNotFound('Ceremony', ceremonyId);
      }

      await this.validateEventAccess(ceremony.eventId, context.userId, context.userRole);

      const stats = await this.getCeremonyStatsInternal(ceremonyId);

      return createServiceResult(true, stats, undefined, {
        operation: 'getCeremonyStats',
        resourceType: 'ceremony_stats',
        resourceId: ceremonyId
      });

    } catch (error) {
      this.logError('getCeremonyStats', error as Error, { context, ceremonyId });
      throw error;
    }
  }

  // Get ceremony attendance
  async getCeremonyAttendance(ceremonyId: number, context: ServiceContext): Promise<ServiceResult<any[]>> {
    try {
      this.logOperation('getCeremonyAttendance', 'ceremony_attendance', ceremonyId, { context });

      // Get ceremony and validate access
      const ceremony = await this.storage.getCeremony(ceremonyId);
      if (!ceremony) {
        this.handleNotFound('Ceremony', ceremonyId);
      }

      await this.validateEventAccess(ceremony.eventId, context.userId, context.userRole);

      const attendance = await this.getCeremonyAttendanceInternal(ceremonyId);

      return createServiceResult(true, attendance, undefined, {
        operation: 'getCeremonyAttendance',
        resourceType: 'ceremony_attendance',
        resourceId: ceremonyId
      });

    } catch (error) {
      this.logError('getCeremonyAttendance', error as Error, { context, ceremonyId });
      throw error;
    }
  }

  // Set guest ceremony attendance
  async setGuestAttendance(
    guestId: number,
    ceremonyId: number,
    attending: boolean,
    context: ServiceContext
  ): Promise<ServiceResult<GuestCeremonyAttendance>> {
    try {
      this.logOperation('setGuestAttendance', 'guest_ceremony', guestId, { context, ceremonyId, attending });

      // Get guest and ceremony to validate
      const [guest, ceremony] = await Promise.all([
        this.storage.getGuest(guestId),
        this.storage.getCeremony(ceremonyId)
      ]);

      if (!guest) {
        this.handleNotFound('Guest', guestId);
      }
      if (!ceremony) {
        this.handleNotFound('Ceremony', ceremonyId);
      }

      // Ensure guest and ceremony belong to the same event
      if (guest.eventId !== ceremony.eventId) {
        this.handleValidation('Guest and ceremony must belong to the same event');
      }

      // Validate event access
      await this.validateEventAccess(guest.eventId, context.userId, context.userRole);

      // Check if attendance record already exists
      const existing = await this.storage.getGuestCeremony(guestId, ceremonyId);

      let result;
      if (existing) {
        // Update existing attendance
        result = await this.storage.updateGuestCeremony(existing.id, { attending });
      } else {
        // Create new attendance record
        result = await this.storage.createGuestCeremony({
          guestId,
          ceremonyId,
          attending
        });
      }

      await this.auditLog('UPDATE', 'guest_ceremony', guestId, context.userId, {
        ceremonyId,
        attending,
        action: existing ? 'updated' : 'created'
      });

      return createServiceResult(true, result, undefined, {
        operation: 'setGuestAttendance',
        resourceType: 'guest_ceremony',
        resourceId: guestId
      });

    } catch (error) {
      this.logError('setGuestAttendance', error as Error, { context, guestId, ceremonyId });
      throw error;
    }
  }

  // Internal helper methods
  private async getCeremonyStatsInternal(ceremonyId: number): Promise<CeremonyStats> {
    const [attendance, mealOptions] = await Promise.all([
      this.storage.getGuestCeremoniesByCeremony(ceremonyId),
      this.storage.getMealOptionsByCeremony(ceremonyId)
    ]);

    const totalGuests = attendance.length;
    const attending = attendance.filter(a => a.attending).length;
    const notAttending = attendance.filter(a => !a.attending).length;
    const pending = totalGuests - attending - notAttending;

    // Get meal selections for this ceremony
    const mealSelections = await this.storage.getGuestMealSelectionsByCeremony(ceremonyId);
    
    const mealSelectionsByOption = mealOptions.map(option => ({
      mealOptionId: option.id,
      mealOptionName: option.name,
      count: mealSelections.filter(selection => selection.mealOptionId === option.id).length
    }));

    return {
      totalGuests,
      attending,
      notAttending,
      pending,
      attendanceRate: totalGuests > 0 ? (attending / totalGuests) * 100 : 0,
      mealSelections: {
        total: mealSelections.length,
        byOption: mealSelectionsByOption
      }
    };
  }

  private async getCeremonyAttendanceInternal(ceremonyId: number): Promise<any[]> {
    const attendance = await this.storage.getGuestCeremoniesByCeremony(ceremonyId);
    
    // Get guest details and meal selections
    const attendanceWithDetails = await Promise.all(
      attendance.map(async (record) => {
        const guest = await this.storage.getGuest(record.guestId);
        const mealSelections = await this.storage.getGuestMealSelectionsByGuest(record.guestId);
        const ceremonyMealSelection = mealSelections.find(ms => ms.ceremonyId === ceremonyId);
        
        let mealSelection;
        if (ceremonyMealSelection) {
          const mealOption = await this.storage.getMealOption(ceremonyMealSelection.mealOptionId);
          if (mealOption) {
            mealSelection = {
              mealOptionId: mealOption.id,
              mealOptionName: mealOption.name
            };
          }
        }

        return {
          guestId: record.guestId,
          guestName: guest ? `${guest.firstName} ${guest.lastName}` : 'Unknown Guest',
          attending: record.attending,
          mealSelection
        };
      })
    );

    return attendanceWithDetails;
  }
}