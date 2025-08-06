/**
 * System API Module
 * 
 * Handles system-level endpoints including CSRF tokens, system info, and health checks.
 * Part of the 
 */

import express, { Router } from 'express';
import csurf from 'csurf';
import { ModuleService } from '../core/module-service';
import { storage } from '../../storage';
import { createSystemHealthAPI, trackApiMetrics } from './health-monitoring';
import { createOptimizedCSRFConfig } from '../../middleware/cookie-optimizer';
// Legacy demo credentials removed for security

export async function createSystemAPI(): Promise<Router> {
  const router = express.Router();
  const service = new ModuleService('system');

  router.use(service.middleware);
  router.use(trackApiMetrics); // Track API metrics for health monitoring

  // CSRF protection middleware with optimization
  const csrfProtection = csurf(createOptimizedCSRFConfig());

  // CSRF token endpoint
  router.get('/csrf-token', csrfProtection, (req, res) => {
    try {
      res.json({ csrfToken: req.csrfToken() });
    } catch (error) {
      service.handleError(error, res);
    }
  });

  // System information endpoint
  router.get('/info', async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allEvents = await storage.getAllEvents();

      res.json({
        users: allUsers.map(u => ({ 
          id: u.id, 
          username: u.username, 
          name: u.name, 
          role: u.role 
        })),
        events: allEvents.map(e => ({ 
          id: e.id, 
          title: e.title, 
          createdBy: e.createdBy 
        })),
        authentication: {
          isAuthenticated: req.isAuthenticated(),
          user: req.user ? {
            id: (req.user as Record<string, unknown>).id,
            username: (req.user as Record<string, unknown>).username,
            role: (req.user as Record<string, unknown>).role
          } : null
        },
        version: '5.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      service.handleError(error, res, 'Failed to get system info');
    }
  });

  // Health check endpoint
  router.get('/health', async (req, res) => {
    try {
      // Basic health check - can be expanded with database connectivity, etc.
      const healthInfo = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '5.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      res.json(healthInfo);
    } catch (error) {
      service.handleError(error, res, 'Health check failed');
    }
  });

  // Version endpoint
  router.get('/version', (req, res) => {
    res.json({
      version: '5.0.0',
      apiVersion: 'v1',
      architecture: 'Ver5 Comprehensive',
      timestamp: new Date().toISOString()
    });
  });

  // Mount enhanced health monitoring API
  const healthAPI = createSystemHealthAPI();
  router.use('/health', healthAPI);

  return router;
}