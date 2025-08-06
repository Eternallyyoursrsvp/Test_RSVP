// CRITICAL: Load .env FIRST before any other imports
import 'dotenv/config';

// Add comprehensive error handling for process events
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  console.error('🚨 This might cause process exit!');
  // Don't exit immediately, log and continue
});

process.on('warning', (warning) => {
  console.warn('⚠️ Process Warning:', warning.name, warning.message);
});

// Bootstrap startup detection - check after loading .env
import { bootstrapManager } from "./src/bootstrap/startup-manager.js";

async function initializeFirstTimeSetup() {
  const bootConfig = bootstrapManager.getBootstrapConfig();

  if (bootConfig.isFirstTimeSetup) {
    console.log('🔍 First-time setup detected - database initialization required');
    
    // Initialize database schema if needed
    try {
      console.log('🚀 Initializing database for first-time setup...');
      await bootstrapManager.initializeDatabase();
      
      // Import and create admin user after database is ready
      const { ensureAdminUserExists } = await import('./auth/production-auth.js');
      await ensureAdminUserExists();
      
      console.log('✅ First-time setup completed successfully');
    } catch (error) {
      console.error('❌ First-time setup failed:', error);
      console.log('📋 Please check your database connection and try again');
    }
  }
}

// Run first-time setup
await initializeFirstTimeSetup();

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import fs from "fs";
import { rsvpLinkHandler } from "./middleware";
import { createServer } from "http";
// import CommunicationMonitoringService from "./websocket/communication-monitor";


const app = express();

// Enable lightweight compression for all responses (fixed configuration)
app.use(compression({
  level: 1, // Reduced compression level to fix decoding issues
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    // Don't compress development assets to prevent ERR_CONTENT_DECODING_FAILED
    if (process.env.NODE_ENV !== 'production' && req.url.includes('src/')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Performance optimizations for faster parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Add cache headers for static assets only (removed problematic Content-Encoding header)
app.use((req, res, next) => {
  if (req.url.startsWith('/assets/') || req.url.endsWith('.js') || req.url.endsWith('.css')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.url.startsWith('/api/')) {
    // No caching for API during development to prevent errors
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

// Production-ready CORS configuration for deployed environment
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Always allow origins for Replit deployment compatibility
  if (origin && (origin.includes('replit.app') || origin.includes('replit.dev') || origin.includes('localhost'))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Apply the RSVP link handler middleware early in the pipeline
// This is essential for handling direct navigation to RSVP links
app.use(rsvpLinkHandler);

// Lightweight logging for essential debugging only
app.use((req, res, next) => {
  // Remove heavy logging middleware that was causing memory issues and server crashes
  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

  console.log('🔧 About to setup Vite/static serving...');
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    console.log('🔧 Setting up Vite...');
    await setupVite(app, server);
    console.log('✅ Vite setup complete');
  }

  // Import and register the fallback route handlers AFTER Vite middleware
  try {
    const { registerFallbackRoutes } = await import('./fallback');
    registerFallbackRoutes(app);
    log('Registered fallback route handlers for client-side routing');
  } catch (error) {
    console.error('Failed to register fallback routes:', error);
    // Continue without fallback routes - the app can still function
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    
    res.status(status).json({ message });
  });

  // ALWAYS serve the app on port 3001 (local development)
  // this serves both the API and the client.
  // Production uses port 5000.
  const port = parseInt(process.env.PORT || "3001");
  
  // Initialize WebSocket communication monitoring (temporarily disabled for debugging)
  let communicationMonitor: any | null = null;
  // try {
  //   communicationMonitor = new CommunicationMonitoringService(server);
  //   console.log('✅ Communication monitoring WebSocket service initialized');
  // } catch (error) {
  //   console.error('❌ Failed to initialize communication monitoring:', error);
  //   console.log('⚠️ WebSocket monitoring will not be available');
  // }

  try {
    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Eternally Yours RSVP Platform server running on port ${port}`);
      console.log(`🌐 Access your platform at: http://localhost:${port}`);
      
      if (communicationMonitor) {
        console.log('📡 WebSocket communication monitoring available at /ws/communication-monitor');
      }
    });
    
    server.on('error', (error: any) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use`);
      }
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }

  // Graceful shutdown handling to prevent port conflicts
  const gracefulShutdown = () => {
    console.log('🔧 Graceful shutdown initiated');
    
    // Shutdown communication monitoring
    if (communicationMonitor) {
      communicationMonitor.shutdown();
      console.log('📡 Communication monitoring service shut down');
    }
    
    server.close(() => {
      console.log('🔧 Server closed gracefully');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.log('🔧 Force closing server');
      process.exit(0);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGHUP', gracefulShutdown);
  
  console.log('✅ Server startup completed successfully');
  
  } catch (error) {
    console.error('🚨 Critical error in main async function:', error);
    console.error('🚨 Error stack:', (error as Error).stack);
    process.exit(1);
  }
})();

console.log('🔧 Main execution completed - process should stay alive due to server listening');
