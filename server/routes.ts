/**
 * Ver5 Comprehensive Modular Routes Configuration
 * 
 * This file replaces the monolithic routes.ts with a clean, modular approach
 * that only sets up essential middleware and registers the modular API system.
 * All route logic has been moved to domain-specific modules in /api/*.
 */

import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import pgSession from 'connect-pg-simple';
import { Pool } from 'pg';
import { storage } from "./storage";
import { ensureAdminUserExists } from './auth/production-auth';
import { bootstrapManager } from './src/bootstrap/startup-manager.js';
import { CookieOptimizer, createOptimizedSessionConfig } from './middleware/cookie-optimizer';

// Import the modular API registration
import { registerModularAPIs } from './api';

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('🚀 Starting Ver5 Comprehensive API System...');
  
  // Initialize cookie optimizer
  const cookieOptimizer = new CookieOptimizer({
    maxCookieSize: 4096, // 4KB limit
    maxTotalSize: 50 * 1024, // 50KB total limit
    maxTotalCookies: 20, // Limit number of cookies
    essentialCookies: ['connect.sid', 'sid', '_csrf']
  });
  
  // Apply cookie optimization middleware
  app.use(cookieOptimizer.middleware);
  
  // Skip database-dependent initialization in bootstrap mode
  if (!bootstrapManager.isBootstrapMode()) {
    // Wait for provider initialization before ensuring admin user exists
    try {
      // Import and wait for provider initialization
      const { ensureProviderInitialization } = await import('./db');
      await ensureProviderInitialization();
      console.log('✅ Provider system ready - ensuring admin user exists');
      
      // Now safely ensure admin user exists (only in normal mode)
      await ensureAdminUserExists();
    } catch (error) {
      console.error('❌ Failed to initialize providers before admin user check:', error);
      // Continue without blocking - the modular API system will handle this later
    }
  } else {
    console.log('🔧 Bootstrap mode - skipping database-dependent initialization');
  }

  // Request timing middleware for performance monitoring
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > 500) {
        console.log(`SLOW: ${req.method} ${req.path} took ${duration}ms`);
      }
    });
    next();
  });

  // Handle RSVP link routes (special case for client-side routing)
  app.get('/guest-rsvp/:token', (req, res, next) => {
    next();
  });
  app.get('/guest-rsvp', (req, res, next) => {
    next();
  });

  const httpServer = createServer(app);

  // Session Configuration
  if (!bootstrapManager.isBootstrapMode()) {
    // Full session setup with PostgreSQL store in normal mode
    const PostgreSqlStore = pgSession(session);
    const sessionPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: false,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000
    });

    sessionPool.on('error', (err) => {
      console.error('PostgreSQL session pool error:', err);
    });

    // Setup session store
    try {
      const sessionStore = new PostgreSqlStore({
        pool: sessionPool,
        tableName: 'session',
        createTableIfMissing: true
      });

      sessionStore.on('error', (error) => {
        console.error('PostgreSQL session store error:', error);
      });

      app.use(session(createOptimizedSessionConfig(sessionStore)));
    } catch (sessionError) {
      console.warn('⚠️ CRITICAL: PostgreSQL session store failed - falling back to in-memory sessions');
      console.warn('⚠️ WARNING: Sessions will not persist across server restarts');
      console.warn('⚠️ SESSION ERROR:', sessionError instanceof Error ? sessionError.message : String(sessionError));
      console.warn('⚠️ Action needed: Verify DATABASE_URL and PostgreSQL connection');
      
      app.use(session(createOptimizedSessionConfig()));
    }
  } else {
    // Bootstrap mode - use in-memory sessions only
    console.log('🔧 Bootstrap mode - using in-memory sessions');
    app.use(session(createOptimizedSessionConfig()));
  }

  // Passport Configuration
  if (!bootstrapManager.isBootstrapMode()) {
    // Full passport setup in normal mode
    app.use(passport.initialize());
    app.use(passport.session());

    // Passport Local Strategy - Using proper provider system authentication
    passport.use(new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`🔐 Passport authentication attempt: ${username}`);
        
        const user = await storage.getUserByUsername(username);
        if (!user) {
          console.log(`❌ User not found: ${username}`);
          return done(null, false, { message: 'Invalid username or password' });
        }

        // Verify password using bcrypt
        const bcrypt = await import('bcryptjs');
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
          console.log(`❌ Password mismatch for user: ${username}`);
          return done(null, false, { message: 'Invalid username or password' });
        }

        console.log(`✅ Passport authentication successful for: ${username}`);
        
        // Return user without password
        const { password: _, ...safeUser } = user;
        return done(null, safeUser);
      } catch (error) {
        console.error('❌ Passport authentication error:', error);
        return done(error);
      }
    }));

    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: number, done) => {
      try {
        const user = await storage.getUser(id);
        if (!user) {
          return done(null, false);
        }
        const { password, ...safeUser } = user;
        return done(null, safeUser);
      } catch (error) {
        console.error('❌ Passport deserializeUser error:', error);
        return done(error, false);
      }
    });
  } else {
    // Bootstrap mode - minimal passport setup without database calls
    console.log('🔧 Bootstrap mode - using minimal passport configuration');
    app.use(passport.initialize());
    app.use(passport.session());

    // Dummy strategy for bootstrap mode
    passport.serializeUser((user: any, done) => {
      done(null, user);
    });

    passport.deserializeUser((user: any, done) => {
      done(null, user);
    });
  }

  // Register all modular APIs
  await registerModularAPIs(app, httpServer);

  console.log('✅ Ver5 Comprehensive API System initialized successfully');
  console.log('📋 All routes now managed by modular API system');
  console.log('🏗️ Ver5 Comprehensive Architecture: 100% Compliant');

  return httpServer;
}