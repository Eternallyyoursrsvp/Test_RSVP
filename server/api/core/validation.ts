import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export class ValidationMiddleware {
  private moduleName: string;

  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  validate(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = schema.parse(req.body);
        req.validatedBody = validatedData;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: 'Validation failed',
            errors: error.errors,
            module: this.moduleName
          });
        }
        next(error);
      }
    };
  }

  validateQuery(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = schema.parse(req.query);
        req.validatedQuery = validatedData;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: 'Query validation failed',
            errors: error.errors,
            module: this.moduleName
          });
        }
        next(error);
      }
    };
  }

  validateParams(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = schema.parse(req.params);
        req.validatedParams = validatedData;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: 'Parameter validation failed',
            errors: error.errors,
            module: this.moduleName
          });
        }
        next(error);
      }
    };
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      validatedQuery?: any;
      validatedParams?: any;
    }
  }
}
