import express from 'express';
import path from 'path';
import fs from 'fs';
import { log } from './vite';

/**
 * Registers fallback routes to ensure client-side routing works correctly
 * @param app Express application
 */
export function registerFallbackRoutes(app: express.Express): void {
  const clientRoutes = [
    '/guest-rsvp/:token',
    '/guest-rsvp'
  ];

  // Register each client route to be handled by the client-side router
  clientRoutes.forEach(route => {
    app.get(route, (req, res, next) => {
      log(`Fallback route handler: ${req.path}`);
      next();
    });
  });

  // This should be called after all API routes but before the catch-all route
  app.get('*', (req, res, next) => {
    // Only handle client routes, let API routes pass through
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // Check if it's a direct client route we want to handle
    const isClientRoute = clientRoutes.some(route => {
      // Convert route pattern to regex
      const pattern = route.replace(/:\w+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(req.path);
    });

    if (isClientRoute) {
      log(`Handling client route: ${req.path}`);
      // In development mode, just pass to the next middleware
      if (process.env.NODE_ENV !== 'production') {
        return next();
      }
      
      // In production, serve the index.html
      const indexPath = path.resolve(process.cwd(), 'dist', 'public', 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    
    next();
  });
}