/**
 * Setup API Module
 * 
 * Handles first-time setup wizard, token validation, and automated configuration.
 * This enables zero-configuration startup with visual setup instead of manual .env editing.
 */

import express, { Request, Response } from 'express';
import { bootstrapManager } from '../../src/bootstrap/startup-manager.js';
import { z } from 'zod';
import { ResponseBuilder } from '../../src/utils/ResponseBuilder.js';

const router = express.Router();

// Setup wizard data validation schema
const setupWizardSchema = z.object({
  database: z.object({
    type: z.enum(['postgresql', 'sqlite', 'mysql', 'supabase']),
    host: z.string().optional(),
    port: z.number().optional(),
    database: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    path: z.string().optional(), // for SQLite
    connectionString: z.string().optional(), // for Supabase
    url: z.string().optional(), // for Supabase
    anonKey: z.string().optional(), // for Supabase
    serviceRoleKey: z.string().optional(), // for Supabase
  }),
  auth: z.object({
    provider: z.string().default('jwt-local'),
    jwtSecret: z.string().optional(),
  }).optional(),
  email: z.object({
    provider: z.enum(['sendgrid', 'smtp', 'gmail', 'none']),
    apiKey: z.string().optional(), // for SendGrid
    host: z.string().optional(), // for SMTP
    port: z.number().optional(), // for SMTP
    username: z.string().optional(), // for SMTP
    password: z.string().optional(), // for SMTP
    secure: z.boolean().optional(), // for SMTP
    clientId: z.string().optional(), // for Gmail OAuth
    clientSecret: z.string().optional(), // for Gmail OAuth
    redirectUri: z.string().optional(), // for Gmail OAuth
  }).optional(),
  storage: z.object({
    provider: z.enum(['local', 'aws-s3', 'supabase']),
    path: z.string().optional(), // for local storage
    accessKeyId: z.string().optional(), // for AWS S3
    secretAccessKey: z.string().optional(), // for AWS S3
    region: z.string().optional(), // for AWS S3
    bucket: z.string().optional(), // for AWS S3
  }).optional(),
  sessionSecret: z.string().optional(),
  port: z.number().default(5000),
  nodeEnv: z.string().default('development'),
  baseUrl: z.string().optional(),
});

type SetupWizardData = z.infer<typeof setupWizardSchema>;

/**
 * GET /api/setup/status
 * Get current setup status and configuration
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const config = bootstrapManager.getBootstrapConfig();
    
    ResponseBuilder.ok(res, {
      isFirstTimeSetup: config.isFirstTimeSetup,
      hasValidConfig: config.hasValidConfig,
      isBootstrapMode: bootstrapManager.isBootstrapMode(),
      missingRequiredVars: config.missingRequiredVars || [],
      setupTokenActive: config.setupToken && config.setupTokenExpiry && new Date() < config.setupTokenExpiry
    });
  } catch (error) {
    console.error('Setup status error:', error);
    ResponseBuilder.internalError(res, 'Failed to get setup status');
  }
});

/**
 * GET /api/setup/token
 * Get current active setup token (only available in bootstrap mode)
 */
router.get('/token', (req: Request, res: Response) => {
  try {
    if (!bootstrapManager.isBootstrapMode()) {
      return ResponseBuilder.badRequest(res, 'Setup token is only available in bootstrap mode');
    }

    const config = bootstrapManager.getBootstrapConfig();
    
    if (!config.setupToken || !config.setupTokenExpiry || new Date() >= config.setupTokenExpiry) {
      return ResponseBuilder.badRequest(res, 'No active setup token available');
    }

    ResponseBuilder.ok(res, {
      token: config.setupToken,
      expiresAt: config.setupTokenExpiry,
      setupLink: `http://localhost:3001/setup?token=${config.setupToken}`
    });
  } catch (error) {
    console.error('Get token error:', error);
    ResponseBuilder.internalError(res, 'Failed to get setup token');
  }
});

/**
 * GET /api/setup/validate-token
 * Validate setup token
 */
router.get('/validate-token', (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    
    if (!token) {
      return ResponseBuilder.badRequest(res, 'Setup token is required');
    }

    const isValid = bootstrapManager.validateSetupToken(token);
    
    ResponseBuilder.ok(res, {
      valid: isValid,
      message: isValid ? 'Token is valid' : 'Token is invalid or expired'
    });
  } catch (error) {
    console.error('Token validation error:', error);
    ResponseBuilder.internalError(res, 'Failed to validate token');
  }
});

/**
 * POST /api/setup/complete
 * Complete setup with wizard data
 */
router.post('/complete', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    
    if (!token) {
      return ResponseBuilder.badRequest(res, 'Setup token is required');
    }

    if (!bootstrapManager.validateSetupToken(token)) {
      return ResponseBuilder.unauthorized(res, 'Invalid or expired setup token');
    }

    // Validate wizard data
    const validationResult = setupWizardSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.validationError(res, validationResult.error.errors);
    }

    const wizardData = validationResult.data;

    // Generate .env file
    bootstrapManager.generateEnvFile(wizardData);

    // Clean up bootstrap files
    bootstrapManager.cleanupBootstrap();

    ResponseBuilder.ok(res, {
      message: 'Setup completed successfully',
      restartRequired: true,
      nextSteps: [
        'Server will restart automatically',
        'Configuration has been saved to .env file',
        'Setup wizard will be disabled after restart'
      ]
    });

    // Schedule server restart after response is sent
    setTimeout(() => {
      console.log('🔄 Setup completed - restarting server...');
      process.exit(0); // This will trigger a restart in most deployment environments
    }, 1000);

  } catch (error) {
    console.error('Setup completion error:', error);
    ResponseBuilder.internalError(res, 'Failed to complete setup');
  }
});

/**
 * GET /api/setup/provider-types
 * Get available provider types and their configuration requirements
 */
router.get('/provider-types', (req: Request, res: Response) => {
  try {
    const providerTypes = {
      database: [
        {
          id: 'postgresql',
          name: 'PostgreSQL',
          description: 'Enterprise-grade relational database',
          fields: ['host', 'port', 'database', 'username', 'password'],
          recommended: true
        },
        {
          id: 'sqlite',
          name: 'SQLite',
          description: 'Lightweight file-based database',
          fields: ['path'],
          recommended: false
        },
        {
          id: 'supabase',
          name: 'Supabase',
          description: 'Cloud PostgreSQL with built-in features',
          fields: ['connectionString', 'url', 'anonKey', 'serviceRoleKey'],
          recommended: true
        }
      ],
      email: [
        {
          id: 'sendgrid',
          name: 'SendGrid',
          description: 'Reliable email delivery service',
          fields: ['apiKey'],
          recommended: true
        },
        {
          id: 'smtp',
          name: 'SMTP',
          description: 'Standard email protocol',
          fields: ['host', 'port', 'username', 'password', 'secure']
        },
        {
          id: 'gmail',
          name: 'Gmail OAuth',
          description: 'Gmail with OAuth authentication',
          fields: ['clientId', 'clientSecret', 'redirectUri']
        },
        {
          id: 'none',
          name: 'No Email',
          description: 'Skip email configuration for now',
          fields: []
        }
      ],
      storage: [
        {
          id: 'local',
          name: 'Local Storage',
          description: 'Store files on local filesystem',
          fields: ['path'],
          recommended: true
        },
        {
          id: 'aws-s3',
          name: 'AWS S3',
          description: 'Amazon S3 cloud storage',
          fields: ['accessKeyId', 'secretAccessKey', 'region', 'bucket']
        }
      ]
    };

    ResponseBuilder.ok(res, providerTypes);
  } catch (error) {
    console.error('Provider types error:', error);
    ResponseBuilder.internalError(res, 'Failed to get provider types');
  }
});

/**
 * POST /api/setup/test-connection
 * Test database connection with provided credentials
 */
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    
    if (!token) {
      return ResponseBuilder.badRequest(res, 'Setup token is required');
    }

    if (!bootstrapManager.validateSetupToken(token)) {
      return ResponseBuilder.unauthorized(res, 'Invalid or expired setup token');
    }

    const { database } = req.body;
    
    if (!database) {
      return ResponseBuilder.badRequest(res, 'Database configuration is required');
    }

    // Test database connection based on type
    let connectionResult = { success: false, message: '', details: {} };

    switch (database.type) {
      case 'postgresql':
        // Test PostgreSQL connection
        try {
          const { Pool } = await import('pg');
          const connectionString = `postgresql://${database.username}:${database.password}@${database.host}:${database.port || 5432}/${database.database}`;
          
          const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
          const client = await pool.connect();
          await client.query('SELECT NOW()');
          client.release();
          await pool.end();
          
          connectionResult = {
            success: true,
            message: 'PostgreSQL connection successful',
            details: { host: database.host, database: database.database }
          };
        } catch (error) {
          connectionResult = {
            success: false,
            message: `PostgreSQL connection failed: ${(error as Error).message}`,
            details: {}
          };
        }
        break;

      case 'sqlite':
        // Test SQLite path
        try {
          const fs = await import('fs');
          const path = await import('path');
          
          const dbPath = database.path || './database.sqlite';
          const dir = path.dirname(dbPath);
          
          // Check if directory exists or can be created
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          connectionResult = {
            success: true,
            message: 'SQLite path is valid',
            details: { path: dbPath }
          };
        } catch (error) {
          connectionResult = {
            success: false,
            message: `SQLite path validation failed: ${(error as Error).message}`,
            details: {}
          };
        }
        break;

      case 'supabase':
        // Test Supabase connection
        try {
          const response = await fetch(`${database.url}/rest/v1/`, {
            headers: {
              'apikey': database.anonKey,
              'Authorization': `Bearer ${database.anonKey}`
            }
          });
          
          if (response.ok) {
            connectionResult = {
              success: true,
              message: 'Supabase connection successful',
              details: { url: database.url }
            };
          } else {
            connectionResult = {
              success: false,
              message: `Supabase connection failed: ${response.status} ${response.statusText}`,
              details: {}
            };
          }
        } catch (error) {
          connectionResult = {
            success: false,
            message: `Supabase connection failed: ${(error as Error).message}`,
            details: {}
          };
        }
        break;

      default:
        connectionResult = {
          success: false,
          message: `Unsupported database type: ${database.type}`,
          details: {}
        };
    }

    ResponseBuilder.ok(res, connectionResult);

  } catch (error) {
    console.error('Connection test error:', error);
    ResponseBuilder.internalError(res, 'Failed to test connection');
  }
});

export function createSetupAPI(): express.Router {
  return router;
}