import { Request, Response, NextFunction } from 'express';
import { ResponseBuilder, AuthenticationError, AuthorizationError } from '../lib/response-builder';

// Enhanced role-based access control (RBAC) system following 
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  PLANNER = 'planner',
  COUPLE = 'couple',
  GUEST = 'guest',
}

export enum Permission {
  // Event permissions
  EVENT_CREATE = 'event:create',
  EVENT_READ = 'event:read',
  EVENT_UPDATE = 'event:update',
  EVENT_DELETE = 'event:delete',
  
  // Guest permissions
  GUEST_CREATE = 'guest:create',
  GUEST_READ = 'guest:read',
  GUEST_UPDATE = 'guest:update',
  GUEST_DELETE = 'guest:delete',
  GUEST_IMPORT = 'guest:import',
  GUEST_EXPORT = 'guest:export',
  
  // Communication permissions
  COMMUNICATION_SEND = 'communication:send',
  COMMUNICATION_TEMPLATE = 'communication:template',
  COMMUNICATION_HISTORY = 'communication:history',
  
  // System permissions
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_MONITOR = 'system:monitor',
}

// Permission mapping for roles
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.ADMIN]: [
    Permission.EVENT_CREATE, Permission.EVENT_READ, Permission.EVENT_UPDATE,
    Permission.GUEST_CREATE, Permission.GUEST_READ, Permission.GUEST_UPDATE,
    Permission.GUEST_IMPORT, Permission.GUEST_EXPORT,
    Permission.COMMUNICATION_SEND, Permission.COMMUNICATION_TEMPLATE,
    Permission.SYSTEM_MONITOR
  ],
  [UserRole.PLANNER]: [
    Permission.EVENT_READ, Permission.EVENT_UPDATE,
    Permission.GUEST_CREATE, Permission.GUEST_READ, Permission.GUEST_UPDATE,
    Permission.GUEST_IMPORT, Permission.GUEST_EXPORT,
    Permission.COMMUNICATION_SEND, Permission.COMMUNICATION_TEMPLATE
  ],
  [UserRole.COUPLE]: [
    Permission.EVENT_READ, Permission.EVENT_UPDATE,
    Permission.GUEST_READ, Permission.GUEST_UPDATE,
    Permission.COMMUNICATION_SEND
  ],
  [UserRole.GUEST]: [
    Permission.EVENT_READ
  ]
};

// Enhanced authentication middleware with better error handling
export function requireAuthentication(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.isAuthenticated() || !req.user) {
      throw new AuthenticationError('Authentication required');
    }
    next();
  } catch (error) {
    next(error);
  }
}

// Permission-based authorization middleware
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const userRole = (req.user as any).role as UserRole;
      const userPermissions = ROLE_PERMISSIONS[userRole] || [];
      
      if (!userPermissions.includes(permission)) {
        throw new AuthorizationError(`Required permission: ${permission}`);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Role-based authorization middleware (backward compatibility)
export function requireRole(roles: UserRole | UserRole[]) {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const userRole = (req.user as any).role as UserRole;
      
      if (!roleArray.includes(userRole)) {
        throw new AuthorizationError(`Required role: ${roleArray.join(' or ')}`);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Admin role middleware (backward compatibility)
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN])(req, res, next);
}

// Event context middleware for multi-tenant isolation
export function eventContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const eventId = req.params.eventId || req.params.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'Event ID is required');
    }

    const parsedEventId = parseInt(eventId);
    if (isNaN(parsedEventId)) {
      return ResponseBuilder.badRequest(res, 'Invalid event ID format');
    }

    // Add event context to request
    (req as any).context = {
      ...(req as any).context,
      eventId: parsedEventId
    };

    next();
  } catch (error) {
    next(error);
  }
}

// User ownership middleware for resource access control
export function requireOwnership(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.isAuthenticated() || !req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const userId = (req.user as any).id;
    const userRole = (req.user as any).role as UserRole;
    
    // Admin and super admin can access all resources
    if ([UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(userRole)) {
      return next();
    }

    // For other roles, check ownership based on createdBy field
    // This will be validated in the service layer with actual resource lookup
    (req as any).ownership = {
      userId,
      userRole,
      requiresOwnershipCheck: true
    };

    next();
  } catch (error) {
    next(error);
  }
}

// Rate limiting middleware for API protection
export function rateLimitMiddleware(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < windowStart) {
        requests.delete(key);
      }
    }

    // Get current request info
    const current = requests.get(identifier) || { count: 0, resetTime: now + windowMs };

    // Reset if window has passed
    if (current.resetTime < now) {
      current.count = 0;
      current.resetTime = now + windowMs;
    }

    // Increment request count
    current.count++;
    requests.set(identifier, current);

    // Check if limit exceeded
    if (current.count > maxRequests) {
      const retryAfter = Math.ceil((current.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return ResponseBuilder.error('RATE_LIMIT_EXCEEDED', 'Too many requests', {
        retryAfter,
        limit: maxRequests,
        windowMs
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current.count));
    res.setHeader('X-RateLimit-Reset', current.resetTime);

    next();
  };
}