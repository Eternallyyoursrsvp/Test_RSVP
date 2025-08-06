/**
 * Cookie Optimization Middleware
 * Prevents cookie bloat and implements size limits
 */

import { Request, Response, NextFunction } from 'express';
import session from 'express-session';

interface CookieOptimizerOptions {
  maxCookieSize?: number;
  maxTotalCookies?: number;
  maxTotalSize?: number;
  cleanupInterval?: number;
  essentialCookies?: string[];
}

class CookieOptimizer {
  private maxCookieSize: number;
  private maxTotalCookies: number;
  private maxTotalSize: number;
  private essentialCookies: Set<string>;
  private cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: CookieOptimizerOptions = {}) {
    this.maxCookieSize = options.maxCookieSize || 4096; // 4KB per cookie
    this.maxTotalCookies = options.maxTotalCookies || 50;
    this.maxTotalSize = options.maxTotalSize || 50 * 1024; // 50KB total
    this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000; // 5 minutes
    
    this.essentialCookies = new Set(options.essentialCookies || [
      'connect.sid',
      '_csrf',
      'auth_token',
      'session_id',
      'remember_me'
    ]);

    this.startPeriodicCleanup();
  }

  /**
   * Middleware to validate and limit cookies
   */
  middleware = (req: Request, res: Response, next: NextFunction) => {
    // Override res.cookie to enforce size limits
    const originalSetCookie = res.cookie;
    const originalClearCookie = res.clearCookie;

    const self = this;
    res.cookie = function(name: string, value: any, options?: any): any {
      const cookieString = self.serializeCookie(name, value, options || {});
      
      if (cookieString.length > self.maxCookieSize) {
        console.warn(`🚫 Cookie '${name}' exceeds size limit (${cookieString.length} bytes)`);
        
        if (self.essentialCookies.has(name)) {
          console.warn(`⚠️ Essential cookie '${name}' is oversized - allowing but logging`);
          return (originalSetCookie as any).call(this, name, value, options);
        } else {
          console.warn(`🗑️ Non-essential cookie '${name}' blocked due to size`);
          return this;
        }
      }

      // Check total cookie count and size
      const currentCookies = self.parseCookieHeader(req.headers.cookie as string);
      if (currentCookies.length >= self.maxTotalCookies && !self.essentialCookies.has(name)) {
        console.warn(`🚫 Cookie '${name}' blocked - too many cookies (${currentCookies.length})`);
        return this;
      }

      const totalSize = self.calculateTotalCookieSize(req.headers.cookie as string) + cookieString.length;
      if (totalSize > self.maxTotalSize && !self.essentialCookies.has(name)) {
        console.warn(`🚫 Cookie '${name}' blocked - total size limit exceeded`);
        return this;
      }

      return (originalSetCookie as any).call(this, name, value, options);
    };

    // Add cleanup method to response
    (res as any).cleanupCookies = () => {
      this.cleanupResponseCookies(req, res);
    };

    next();
  };

  /**
   * Parse cookie header into array of cookie objects
   */
  private parseCookieHeader(cookieHeader: string): Array<{name: string, value: string, size: number}> {
    if (!cookieHeader) return [];

    return cookieHeader.split(';').map(cookie => {
      const [name, ...valueParts] = cookie.trim().split('=');
      const value = valueParts.join('=') || '';
      return {
        name: name.trim(),
        value,
        size: cookie.length
      };
    });
  }

  /**
   * Calculate total size of all cookies
   */
  private calculateTotalCookieSize(cookieHeader: string): number {
    if (!cookieHeader) return 0;
    return cookieHeader.length;
  }

  /**
   * Serialize cookie for size calculation
   */
  private serializeCookie(name: string, value: any, options: any = {}): string {
    let cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}`;
    
    if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
    if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
    if (options.path) cookie += `; Path=${options.path}`;
    if (options.domain) cookie += `; Domain=${options.domain}`;
    if (options.secure) cookie += `; Secure`;
    if (options.httpOnly) cookie += `; HttpOnly`;
    if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
    
    return cookie;
  }

  /**
   * Clean up oversized or unnecessary cookies
   */
  private cleanupResponseCookies(req: Request, res: Response): void {
    const cookies = this.parseCookieHeader(req.headers.cookie as string);
    const oversizedCookies = cookies.filter(cookie => 
      cookie.size > this.maxCookieSize && !this.essentialCookies.has(cookie.name)
    );

    oversizedCookies.forEach(cookie => {
      console.log(`🧹 Cleaning up oversized cookie: ${cookie.name} (${cookie.size} bytes)`);
      res.clearCookie(cookie.name, {
        path: '/'
      });
    });
  }

  /**
   * Periodic cleanup of old or unnecessary cookies
   */
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      console.log('🧹 Running periodic cookie cleanup...');
      // This would be implemented based on your specific needs
    }, this.cleanupInterval);
  }

  /**
   * Stop periodic cleanup
   */
  public stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

/**
 * Optimized session configuration factory
 */
export function createOptimizedSessionConfig(store?: any) {
  return {
    store,
    secret: process.env.SESSION_SECRET || 'wedding-rsvp-secret-key-production',
    resave: false,
    saveUninitialized: false,
    rolling: false, // Disable rolling to reduce cookie updates
    name: 'sid', // Shorter cookie name to save space
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 2 * 60 * 60 * 1000, // Reduced to 2 hours from 24 hours
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      domain: undefined
    }
  } as session.SessionOptions;
}

/**
 * CSRF optimization configuration
 */
export function createOptimizedCSRFConfig() {
  return {
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 60 * 60 * 1000, // 1 hour instead of session-based
      key: '_csrf' // Shorter name
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    value: (req: Request) => {
      return req.body._csrf || req.query._csrf || req.headers['x-csrf-token'];
    }
  };
}

export { CookieOptimizer };