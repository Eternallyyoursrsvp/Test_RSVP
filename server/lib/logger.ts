/**
 * Basic Pino Logging System
 * 
 * Simple, lightweight logging without analytics overhead.
 * Essential error logging only.
 */

import pino from 'pino';

/**
 * Create Pino logger with minimal configuration
 */
const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  
  // Pretty print in development, structured JSON in production
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined,
  
  // Base fields for all logs
  base: {
    service: 'wedding-platform'
  },
  
  // Timestamp formatting
  timestamp: pino.stdTimeFunctions.isoTime,
  
  // Error serialization
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  }
});

// Export default logger
export default logger;