import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { performance } from 'perf_hooks';

export class ModuleService {
  private moduleName: string;
  private metrics: Map<string, number> = new Map();

  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  get middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = performance.now();
      
      // Add module context to request
      req.moduleContext = {
        name: this.moduleName,
        startTime: start
      };

      res.on('finish', () => {
        const duration = performance.now() - start;
        this.recordMetric(req.path, duration);
        
        if (duration > 500) {
          console.warn(`SLOW ${this.moduleName}: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`);
        }
      });

      next();
    };
  }

  recordMetric(path: string, duration: number) {
    const key = `${this.moduleName}:${path}`;
    this.metrics.set(key, duration);
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  handleError(error: unknown, res: Response) {
    console.error(`Error in ${this.moduleName}:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: error.errors,
        module: this.moduleName
      });
    }

    if (error instanceof Error) {
      return res.status(500).json({ 
        message: error.message || 'Internal server error',
        module: this.moduleName
      });
    }

    return res.status(500).json({ 
      message: 'Unknown error occurred',
      module: this.moduleName
    });
  }

  async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxRetries) {
          throw lastError;
        }
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    }
    
    throw lastError!;
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      moduleContext?: {
        name: string;
        startTime: number;
      };
      validatedBody?: any;
    }
  }
}
