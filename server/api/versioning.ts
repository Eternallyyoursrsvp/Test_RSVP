/**
 * API Versioning and Response Standardization System
 * Implements consistent API versioning with backward compatibility
 */

import { Express, Request, Response, NextFunction, Router } from 'express';
import { z } from 'zod';

// API Version Configuration
export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2', // Future version
  CURRENT: 'v1',
  DEPRECATED: [], // Array of deprecated versions
  SUPPORTED: ['v1'] // Currently supported versions
} as const;

export type APIVersion = typeof API_VERSIONS.V1 | typeof API_VERSIONS.V2;

// Standard API Response Interface
export interface StandardAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
  meta?: {
    version: string;
    requestId: string;
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: number;
    };
  };
}

// Error Codes and Messages
export const API_ERROR_CODES = {
  // Client Errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server Errors (5xx)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_GATEWAY: 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',
  
  // Business Logic Errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  OPERATION_FAILED: 'OPERATION_FAILED',
  INVALID_STATE: 'INVALID_STATE'
} as const;

// Response Builder Class
export class APIResponseBuilder {
  private requestId: string;
  private version: string;

  constructor(req: Request) {
    this.requestId = req.headers['x-request-id'] as string || 
                    req.get('X-Request-ID') || 
                    crypto.randomUUID();
    this.version = this.extractVersion(req.path) || API_VERSIONS.CURRENT;
  }

  private extractVersion(path: string): string | null {
    const versionMatch = path.match(/^\/api\/(v\d+)\//);
    return versionMatch ? versionMatch[1] : null;
  }

  success<T>(data: T, meta?: Partial<StandardAPIResponse['meta']>): StandardAPIResponse<T> {
    return {
      success: true,
      data,
      meta: {
        version: this.version,
        requestId: this.requestId,
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  error(
    code: keyof typeof API_ERROR_CODES,
    message: string,
    details?: any,
    statusCode = 500
  ): StandardAPIResponse {
    return {
      success: false,
      error: {
        code: API_ERROR_CODES[code],
        message,
        details,
        timestamp: new Date().toISOString()
      },
      meta: {
        version: this.version,
        requestId: this.requestId,
        timestamp: new Date().toISOString()
      }
    };
  }

  paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    }
  ): StandardAPIResponse<T[]> {
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    
    return {
      success: true,
      data,
      meta: {
        version: this.version,
        requestId: this.requestId,
        timestamp: new Date().toISOString(),
        pagination: {
          ...pagination,
          totalPages
        }
      }
    };
  }
}

// Version Middleware
export function versionMiddleware(req: Request, res: Response, next: NextFunction) {
  const version = req.params.version || API_VERSIONS.CURRENT;
  
  // Check if version is supported
  if (!API_VERSIONS.SUPPORTED.includes(version as any)) {
    const responseBuilder = new APIResponseBuilder(req);
    return res.status(400).json(
      responseBuilder.error(
        'BAD_REQUEST',
        `API version '${version}' is not supported. Supported versions: ${API_VERSIONS.SUPPORTED.join(', ')}`
      )
    );
  }

  // Check if version is deprecated
  if (API_VERSIONS.DEPRECATED.includes(version as any)) {
    res.set('X-API-Deprecated', 'true');
    res.set('X-API-Sunset-Date', '2025-12-31'); // Example sunset date
    res.set('X-API-Migration-Guide', 'https://docs.rsvp-platform.com/api/migration');
  }

  // Add version info to request
  (req as any).apiVersion = version;
  next();
}

// Response Standardization Middleware
export function responseStandardizationMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  const responseBuilder = new APIResponseBuilder(req);

  res.json = function(body: any) {
    // If response is already standardized, send as-is
    if (body && typeof body === 'object' && 'success' in body && 'meta' in body) {
      return originalJson.call(this, body);
    }

    // Standardize the response
    let standardResponse: StandardAPIResponse;

    if (this.statusCode >= 400) {
      // Error response
      const errorCode = this.statusCode === 404 ? 'NOT_FOUND' :
                       this.statusCode === 401 ? 'UNAUTHORIZED' :
                       this.statusCode === 403 ? 'FORBIDDEN' :
                       this.statusCode === 400 ? 'BAD_REQUEST' :
                       'INTERNAL_SERVER_ERROR';
      
      standardResponse = responseBuilder.error(
        errorCode as keyof typeof API_ERROR_CODES,
        body?.message || body?.error || 'An error occurred',
        body?.details || body
      );
    } else {
      // Success response
      standardResponse = responseBuilder.success(body);
    }

    return originalJson.call(this, standardResponse);
  };

  next();
}

// Rate Limiting Middleware
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimitMiddleware(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Clean old entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }

    let entry = rateLimitStore.get(key);
    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + config.windowMs };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    if (config.standardHeaders !== false) {
      res.set({
        'RateLimit-Limit': config.max.toString(),
        'RateLimit-Remaining': Math.max(0, config.max - entry.count).toString(),
        'RateLimit-Reset': new Date(entry.resetTime).toISOString(),
      });
    }

    if (config.legacyHeaders !== false) {
      res.set({
        'X-RateLimit-Limit': config.max.toString(),
        'X-RateLimit-Remaining': Math.max(0, config.max - entry.count).toString(),
        'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
      });
    }

    if (entry.count > config.max) {
      const responseBuilder = new APIResponseBuilder(req);
      return res.status(429).json(
        responseBuilder.error(
          'RATE_LIMIT_EXCEEDED',
          config.message || 'Too many requests',
          {
            limit: config.max,
            windowMs: config.windowMs,
            retryAfter: Math.ceil((entry.resetTime - now) / 1000)
          },
          429
        )
      );
    }

    next();
  };
}

// API Version Router Factory
export function createVersionedRouter(version: APIVersion = API_VERSIONS.V1): Router {
  const router = Router();
  
  // Apply version-specific middleware
  router.use(versionMiddleware);
  router.use(responseStandardizationMiddleware);
  
  // Apply rate limiting (adjust limits per version if needed)
  const rateLimitConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: version === API_VERSIONS.V1 ? 1000 : 2000, // Higher limits for newer versions
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  };
  
  router.use(rateLimitMiddleware(rateLimitConfig));
  
  return router;
}

// Validation Middleware Factory
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;
      
      next();
    } catch (error) {
      const responseBuilder = new APIResponseBuilder(req);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseBuilder.error(
            'VALIDATION_ERROR',
            'Validation failed',
            {
              issues: error.issues,
              path: error.issues[0]?.path?.join('.') || 'unknown'
            },
            400
          )
        );
      }
      
      return res.status(500).json(
        responseBuilder.error(
          'INTERNAL_SERVER_ERROR',
          'Internal validation error',
          undefined,
          500
        )
      );
    }
  };
}

// Security Headers Middleware
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // CORS headers
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Version');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  
  // API-specific headers
  res.header('X-API-Version', API_VERSIONS.CURRENT);
  res.header('X-Request-ID', req.headers['x-request-id'] || crypto.randomUUID());
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
}

// Enhanced API Registration with Versioning
export function registerVersionedAPI(app: Express) {
  // Apply global security headers
  app.use(securityHeadersMiddleware);
  
  // Register versioned API routes
  const v1Router = createVersionedRouter(API_VERSIONS.V1);
  
  // Mount versioned router
  app.use('/api/v1', v1Router);
  
  // Legacy compatibility (redirect to v1)
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/v1')) {
      return next();
    }
    
    // Redirect legacy endpoints to v1
    const newPath = `/api/v1${req.path}`;
    res.redirect(301, newPath);
  });
  
  return { v1Router };
}