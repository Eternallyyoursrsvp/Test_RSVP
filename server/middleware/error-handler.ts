import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { 
  ResponseBuilder, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError, 
  ConflictError 
} from '../lib/response-builder';
import logger from '../lib/logger';

// Global error handler for modular APIs following 
export function globalErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  // Log error with context for debugging
  logger.error({
    error: error.message,
    stack: error.stack,
    requestId,
    url: req.url,
    method: req.method,
    userId: (req as any).user?.id,
    eventId: (req as any).context?.eventId,
    timestamp: new Date().toISOString()
  }, 'API Error');

  // Handle different error types with appropriate HTTP status codes
  if (error instanceof z.ZodError) {
    return ResponseBuilder.validationError(res, 'Invalid input data', error.errors);
  }

  if (error instanceof ValidationError) {
    return ResponseBuilder.validationError(res, error.message, error.details);
  }

  if (error instanceof AuthenticationError) {
    return ResponseBuilder.unauthorized(res, error.message);
  }

  if (error instanceof AuthorizationError) {
    return ResponseBuilder.forbidden(res, error.message);
  }

  if (error instanceof NotFoundError) {
    return ResponseBuilder.notFound(res, error.message);
  }

  if (error instanceof ConflictError) {
    return ResponseBuilder.conflict(res, error.message, error.details);
  }

  // Handle database constraint errors
  if (error.code === '23505') { // PostgreSQL unique constraint violation
    return ResponseBuilder.conflict(res, 'Resource already exists', {
      constraint: error.constraint,
      detail: error.detail
    });
  }

  if (error.code === '23503') { // PostgreSQL foreign key constraint violation
    return ResponseBuilder.badRequest(res, 'Invalid reference to related resource', {
      constraint: error.constraint,
      detail: error.detail
    });
  }

  if (error.code === '23502') { // PostgreSQL not null constraint violation
    return ResponseBuilder.badRequest(res, 'Required field missing', {
      column: error.column,
      detail: error.detail
    });
  }

  // Handle rate limiting errors
  if (error.status === 429) {
    return ResponseBuilder.error('RATE_LIMIT_EXCEEDED', 'Too many requests', {
      retryAfter: error.retryAfter
    });
  }

  // Handle file upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return ResponseBuilder.badRequest(res, 'File size exceeds limit', {
      limit: error.limit,
      field: error.field
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return ResponseBuilder.badRequest(res, 'Unexpected file upload', {
      field: error.field
    });
  }

  // Handle session errors
  if (error.message?.includes('session')) {
    return ResponseBuilder.unauthorized(res, 'Session expired or invalid');
  }

  // Handle CSRF errors
  if (error.code === 'EBADCSRFTOKEN') {
    return ResponseBuilder.forbidden(res, 'Invalid CSRF token');
  }

  // Handle timeout errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return ResponseBuilder.internalError(res, 'Request timeout', {
      code: error.code
    });
  }

  // Generic internal server error
  return ResponseBuilder.internalError(res, 'An unexpected error occurred', error.stack);
}

// Async error wrapper for route handlers
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler for undefined routes
export function notFoundHandler(req: Request, res: Response): void {
  ResponseBuilder.notFound(res, `Route ${req.method} ${req.path} not found`);
}

// Error boundaries for specific modules
export function moduleErrorBoundary(moduleName: string) {
  return (error: any, req: Request, res: Response, next: NextFunction) => {
    // Add module context to error
    error.module = moduleName;
    next(error);
  };
}