import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ResponseBuilder, ValidationError } from '../lib/response-builder';

// Validation middleware factory for request validation
export function validateRequest(schema: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
  headers?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: any[] = [];

      // Validate request body
      if (schema.body) {
        try {
          req.body = schema.body.parse(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push({
              location: 'body',
              errors: error.errors
            });
          }
        }
      }

      // Validate request parameters
      if (schema.params) {
        try {
          req.params = schema.params.parse(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push({
              location: 'params',
              errors: error.errors
            });
          }
        }
      }

      // Validate query parameters
      if (schema.query) {
        try {
          req.query = schema.query.parse(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push({
              location: 'query',
              errors: error.errors
            });
          }
        }
      }

      // Validate headers
      if (schema.headers) {
        try {
          req.headers = schema.headers.parse(req.headers);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push({
              location: 'headers',
              errors: error.errors
            });
          }
        }
      }

      // If validation errors exist, return them
      if (errors.length > 0) {
        throw new ValidationError('Request validation failed', errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Common validation schemas
export const commonSchemas = {
  // ID parameter validation
  idParam: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a positive integer').transform(Number)
  }),

  // Event ID parameter validation
  eventIdParam: z.object({
    eventId: z.string().regex(/^\d+$/, 'Event ID must be a positive integer').transform(Number)
  }),

  // Pagination query validation
  paginationQuery: z.object({
    page: z.string().optional().default('1').transform(Number),
    limit: z.string().optional().default('10').transform(Number),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional().default('asc')
  }).refine(data => data.page > 0, { message: 'Page must be greater than 0' })
    .refine(data => data.limit > 0 && data.limit <= 100, { message: 'Limit must be between 1 and 100' }),

  // Search query validation
  searchQuery: z.object({
    q: z.string().min(1).max(100).optional(),
    fields: z.string().optional()
  }),

  // Date range query validation
  dateRangeQuery: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, { message: 'Start date must be before end date' }),

  // File upload validation
  fileUpload: z.object({
    mimetype: z.string().refine(type => 
      ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(type),
      'Invalid file type'
    ),
    size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB')
  })
};

// Convenience functions for common validations
export const validateId = validateRequest({ params: commonSchemas.idParam });
export const validateEventId = validateRequest({ params: commonSchemas.eventIdParam });
export const validatePagination = validateRequest({ query: commonSchemas.paginationQuery });
export const validateSearch = validateRequest({ query: commonSchemas.searchQuery });
export const validateDateRange = validateRequest({ query: commonSchemas.dateRangeQuery });

// Custom validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Data sanitization middleware
export function sanitizeRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    // Recursively sanitize object
    function sanitizeObject(obj: any): any {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    }

    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (error) {
    next(error);
  }
}

// Content-Type validation middleware
export function validateContentType(allowedTypes: string[] = ['application/json']) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip validation for GET requests
    if (req.method === 'GET') {
      return next();
    }

    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      return ResponseBuilder.badRequest(res, 'Content-Type header is required');
    }

    const isValidType = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isValidType) {
      return ResponseBuilder.badRequest(res, `Invalid Content-Type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    next();
  };
}