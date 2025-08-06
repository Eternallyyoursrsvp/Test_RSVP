import { storage } from '../storage';
import { NotFoundError, ConflictError, ValidationError } from '../lib/response-builder';
import logger from '../lib/logger';

// Base service class providing common functionality for all services
export abstract class BaseService {
  protected storage = storage;
  protected logger = logger;

  // Common error handling
  protected handleNotFound(resource: string, id: string | number): never {
    throw new NotFoundError(`${resource} with ID ${id} not found`);
  }

  protected handleConflict(resource: string, message: string, details?: any): never {
    throw new ConflictError(`${resource} conflict: ${message}`, details);
  }

  protected handleValidation(message: string, details?: any): never {
    throw new ValidationError(message, details);
  }

  // Common validation helpers
  protected validateRequired(value: any, fieldName: string): void {
    if (value === null || value === undefined || value === '') {
      this.handleValidation(`${fieldName} is required`);
    }
  }

  protected validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.handleValidation('Invalid email format');
    }
  }

  protected validatePhoneNumber(phone: string): void {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      this.handleValidation('Invalid phone number format');
    }
  }

  // Common logging helpers
  protected logOperation(operation: string, resourceType: string, resourceId?: string | number, metadata?: any): void {
    this.logger.info({
      operation,
      resourceType,
      resourceId,
      ...metadata
    }, `${operation} ${resourceType}`);
  }

  protected logError(operation: string, error: Error, metadata?: any): void {
    this.logger.error({
      operation,
      error: error.message,
      stack: error.stack,
      ...metadata
    }, `Error in ${operation}`);
  }

  // Ownership validation for multi-tenant security
  protected async validateOwnership(
    resourceOwnerId: number, 
    requestingUserId: number, 
    userRole: string,
    resourceType: string = 'resource'
  ): Promise<void> {
    // Super admin and admin can access all resources
    if (['super_admin', 'admin'].includes(userRole)) {
      return;
    }

    // Other roles must own the resource
    if (resourceOwnerId !== requestingUserId) {
      throw new ValidationError(`Access denied: You don't have permission to access this ${resourceType}`);
    }
  }

  // Event context validation for multi-tenant isolation
  protected async validateEventAccess(
    eventId: number, 
    userId: number, 
    userRole: string
  ): Promise<void> {
    const event = await this.storage.getEvent(eventId);
    if (!event) {
      this.handleNotFound('Event', eventId);
    }

    await this.validateOwnership(event.createdBy, userId, userRole, 'event');
  }

  // Pagination helpers
  protected validatePagination(page: number, limit: number): { offset: number; limit: number } {
    if (page < 1) {
      this.handleValidation('Page must be greater than 0');
    }
    if (limit < 1 || limit > 100) {
      this.handleValidation('Limit must be between 1 and 100');
    }

    return {
      offset: (page - 1) * limit,
      limit
    };
  }

  protected formatPaginationResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ) {
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1
      }
    };
  }

  // Data transformation helpers
  protected sanitizeForOutput<T extends Record<string, any>>(
    data: T, 
    excludeFields: (keyof T)[] = []
  ): Omit<T, keyof T> {
    const result = { ...data };
    excludeFields.forEach(field => {
      delete result[field];
    });
    return result;
  }

  // Date validation helpers
  protected validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate >= endDate) {
      this.handleValidation('Start date must be before end date');
    }
  }

  protected validateFutureDate(date: Date, fieldName: string = 'Date'): void {
    if (date <= new Date()) {
      this.handleValidation(`${fieldName} must be in the future`);
    }
  }

  // Search and filtering helpers
  protected buildSearchFilter(searchTerm: string, searchFields: string[]): any {
    if (!searchTerm) return {};
    
    // This is a placeholder - actual implementation would depend on your ORM
    // For Drizzle, you'd use the appropriate search syntax
    return {
      search: searchTerm,
      fields: searchFields
    };
  }

  // Audit logging for important operations
  protected async auditLog(
    operation: string,
    resourceType: string,
    resourceId: string | number,
    userId: number,
    details?: any
  ): Promise<void> {
    this.logger.info({
      type: 'AUDIT',
      operation,
      resourceType,
      resourceId,
      userId,
      timestamp: new Date().toISOString(),
      details
    }, `Audit: ${operation} ${resourceType}`);
  }
}

// Service context interface for request-scoped data
export interface ServiceContext {
  userId: number;
  userRole: string;
  eventId?: number;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
}

// Result wrapper for service operations
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    operation: string;
    resourceType: string;
  };
}

// Helper function to create service results
export function createServiceResult<T>(
  success: boolean,
  data?: T,
  error?: { code: string; message: string; details?: any },
  metadata?: any
): ServiceResult<T> {
  return {
    success,
    data,
    error,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}