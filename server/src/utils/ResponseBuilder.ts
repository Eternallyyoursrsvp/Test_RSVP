import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

// Unified API response interface following 
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
    version: string;
    request_id: string;
  };
}

// Response builder utility for standardized API responses
export class ResponseBuilder {
  private static generateRequestId(): string {
    return randomUUID();
  }

  private static getVersion(): string {
    return process.env.API_VERSION || '1.0.0';
  }

  static success<T>(res: Response, data: T, message?: string, meta?: any): Response {
    return res.status(200).json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: this.getVersion(),
        request_id: this.generateRequestId(),
        ...meta
      }
    });
  }

  static error(code: string, message: string, details?: any): APIResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: this.getVersion(),
        request_id: this.generateRequestId()
      }
    };
  }

  static paginated<T>(
    data: T[], 
    pagination: { page: number; limit: number; total: number }
  ): APIResponse<T[]> {
    return {
      success: true,
      data,
      meta: {
        pagination: {
          ...pagination,
          totalPages: Math.ceil(pagination.total / pagination.limit)
        },
        timestamp: new Date().toISOString(),
        version: this.getVersion(),
        request_id: this.generateRequestId()
      }
    };
  }

  // Convenience methods for common HTTP responses
  static ok<T>(res: Response, data: T, message?: string): Response {
    return res.status(200).json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: this.getVersion(),
        request_id: this.generateRequestId()
      }
    });
  }

  static created<T>(res: Response, data: T, message?: string): Response {
    return res.status(201).json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: this.getVersion(),
        request_id: this.generateRequestId()
      }
    });
  }

  static badRequest(res: Response, message: string, details?: any): Response {
    return res.status(400).json(this.error('BAD_REQUEST', message, details));
  }

  static unauthorized(res: Response, message: string = 'Authentication required'): Response {
    return res.status(401).json(this.error('UNAUTHORIZED', message));
  }

  static forbidden(res: Response, message: string = 'Insufficient permissions'): Response {
    return res.status(403).json(this.error('FORBIDDEN', message));
  }

  static notFound(res: Response, message: string = 'Resource not found'): Response {
    return res.status(404).json(this.error('NOT_FOUND', message));
  }

  static conflict(res: Response, message: string, details?: any): Response {
    return res.status(409).json(this.error('CONFLICT', message, details));
  }

  static validationError(res: Response, error: any): Response {
    return res.status(422).json(this.error('VALIDATION_ERROR', 'Validation failed', error));
  }

  static internalError(res: Response, message: string = 'Internal server error', details?: any): Response {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return res.status(500).json(this.error('INTERNAL_ERROR', message, isDevelopment ? details : undefined));
  }
}

// Custom error types for better error handling
export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ConflictError';
  }
}

// Request ID middleware for tracing
export function requestIdMiddleware(req: Request, res: Response, next: Function) {
  const requestId = req.headers['x-request-id'] as string || ResponseBuilder['generateRequestId']();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}