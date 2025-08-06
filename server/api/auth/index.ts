import express, { Router } from 'express';
import { ModuleService } from '../core/module-service';
import { ValidationMiddleware } from '../core/validation';
import { isAuthenticated, isAdmin } from '../../middleware';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { storage } from '../../storage';
import { insertUserSchema } from '@shared/schema';
import { z } from 'zod';

// Import authentication settings functionality
import { getAuthConfigManager, type AuthConfiguration } from '../../src/auth/auth-config-manager';
import { getAuthInfo, resetGlobalAuthenticationAdapter, validateSupabaseConfig } from '../../src/auth/auth-factory';

export async function createAuthAPI(): Promise<Router> {
  const router = express.Router();
  const service = new ModuleService('auth');
  const validator = new ValidationMiddleware('auth');

  router.use(service.middleware);

  // Register endpoint
  router.post('/register', validator.validate(insertUserSchema), async (req, res) => {
    try {
      const userData = req.validatedBody;
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const secureUserData = { ...userData, password: hashedPassword };
      const user = await storage.createUser(secureUserData);

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Registration successful but login failed' });
        }
        req.session.save((saveErr) => {
          if (saveErr) {
            return res.status(500).json({ message: 'Registration successful but session save failed' });
          }
          const { password, ...safeUser } = user;
          res.status(201).json({ user: safeUser });
        });
      });
    } catch (error) {
      service.handleError(error, res);
    }
  });

  // Login endpoint
  router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }
      req.login(user, (loginErr: Error | null) => {
        if (loginErr) {
          return next(loginErr);
        }
        const safeUser: { [key: string]: unknown } = { ...user };
        if ('password' in safeUser) {
          delete safeUser.password;
        }
        req.session.save((saveErr) => {
          if (saveErr) {
            return next(saveErr);
          }
          // Check both possible field names for password change requirement
          const passwordChangeRequired = (user as any).password_change_required || 
                                       (user as any).passwordChangeRequired || 
                                       false;
          
          return res.json({ 
            user: safeUser,
            passwordChangeRequired: passwordChangeRequired
          });
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  router.post('/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Status endpoint
  router.get('/status', (req, res) => {
    if (req.isAuthenticated() && req.user) {
      const userObj = req.user as Record<string, unknown>;
      const user = {
        id: userObj.id,
        username: userObj.username,
        name: userObj.name || 'User',
        email: userObj.email || '',
        role: userObj.role || 'couple',
      };
      return res.json({ 
        user, 
        authenticated: true,
        passwordChangeRequired: userObj.password_change_required || false
      });
    } else {
      return res.status(401).json({ message: 'Not authenticated', authenticated: false });
    }
  });

  // User endpoint (similar to status but with different response format)
  router.get('/user', (req, res) => {
    if (req.isAuthenticated() && req.user) {
      const userObj = req.user as Record<string, unknown>;
      const user = {
        id: userObj.id,
        username: userObj.username,
        name: userObj.name || 'User',
        email: userObj.email || '',
        role: userObj.role || 'couple',
      };
      return res.json({ 
        user,
        passwordChangeRequired: userObj.password_change_required || false
      });
    } else {
      return res.status(401).json({ message: 'Not authenticated' });
    }
  });

  // User management (admin only)
  router.post('/users', isAdmin, validator.validate(insertUserSchema), async (req, res) => {
    try {
      const userData = req.validatedBody;
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const secureUserData = { ...userData, password: hashedPassword };
      const user = await storage.createUser(secureUserData);
      const { password, ...safeUserData } = user;
      res.status(201).json(safeUserData);
    } catch (error) {
      service.handleError(error, res);
    }
  });

  // Password change endpoint (for authenticated users)
  const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Password confirmation is required")
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ["confirmPassword"],
  });

  router.post('/change-password', isAuthenticated, validator.validate(passwordChangeSchema), async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.validatedBody;
      const userId = (req.user as any).id;
      
      // Get current user from database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify current password
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      // Update password and clear password change requirement (handled in updateUserPassword)
      await storage.updateUserPassword(userId, hashedPassword);
      
      res.json({ 
        message: 'Password changed successfully',
        passwordChangeRequired: false
      });
    } catch (error) {
      service.handleError(error, res);
    }
  });

  // Profile update endpoint
  const profileUpdateSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    username: z.string().min(3).max(50),
    phone: z.string().optional(),
  });

  router.put('/profile', isAuthenticated, validator.validate(profileUpdateSchema), async (req, res) => {
    try {
      const userId = req.user.id;
      const profileData = req.validatedBody;
      
      // Check if username is already taken by another user
      if (profileData.username !== req.user.username) {
        const existingUser = await storage.getUserByUsername(profileData.username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: 'Username already exists' });
        }
      }
      
      // Check if email is already taken by another user
      if (profileData.email !== req.user.email) {
        const existingUser = await storage.getUserByEmail(profileData.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: 'Email already exists' });
        }
      }
      
      // Update user profile
      const updatedUser = await storage.updateUser(userId, profileData);
      
      // Return updated user data (without password)
      const { password, ...safeUser } = updatedUser;
      
      res.json({ 
        message: 'Profile updated successfully',
        user: safeUser
      });
    } catch (error) {
      service.handleError(error, res);
    }
  });

  // =============== AUTHENTICATION SETTINGS ROUTES ===============
  // These routes provide UI-based authentication method switching and configuration

  // Validation schemas for authentication settings
  const switchMethodSchema = z.object({
    method: z.enum(['database', 'supabase']),
    modifiedBy: z.string().optional(),
  });

  const updateConfigSchema = z.object({
    method: z.enum(['database', 'supabase']).optional(),
    databaseAuth: z.object({
      enabled: z.boolean().optional(),
      provider: z.enum(['postgresql', 'supabase', 'sqlite']).optional(),
      connectionUrl: z.string().optional(),
    }).optional(),
    supabaseAuth: z.object({
      enabled: z.boolean().optional(),
      url: z.string().optional(),
      anonKey: z.string().optional(),
      serviceRoleKey: z.string().optional(),
      features: z.object({
        oauthProviders: z.array(z.string()).optional(),
        magicLinks: z.boolean().optional(),
        emailVerification: z.boolean().optional(),
        phoneAuth: z.boolean().optional(),
      }).optional(),
    }).optional(),
    security: z.object({
      passwordPolicy: z.object({
        minLength: z.number().min(8).max(128).optional(),
        requireUppercase: z.boolean().optional(),
        requireLowercase: z.boolean().optional(),
        requireNumbers: z.boolean().optional(),
        requireSymbols: z.boolean().optional(),
      }).optional(),
      sessionTimeout: z.number().min(30).max(480).optional(),
      maxFailedAttempts: z.number().min(3).max(10).optional(),
      accountLockDuration: z.number().min(5).max(60).optional(),
    }).optional(),
    modifiedBy: z.string().optional(),
  });

  const testSupabaseConnectionSchema = z.object({
    url: z.string().url(),
    anonKey: z.string().min(20),
    serviceRoleKey: z.string().optional(),
  });

  /**
   * GET /api/auth/settings/status
   * Get current authentication configuration and status (Admin only)
   */
  router.get('/settings/status', isAdmin, async (req, res) => {
    try {
      const configManager = getAuthConfigManager();
      const currentConfig = configManager.getConfiguration();
      const authStatus = configManager.getAuthenticationStatus();
      const authInfo = getAuthInfo();

      res.json({
        success: true,
        data: {
          currentMethod: currentConfig.method,
          configuration: currentConfig,
          status: authStatus,
          info: authInfo,
          lastModified: currentConfig.lastModified,
          version: currentConfig.version,
        }
      });
    } catch (error) {
      service.handleError(error, res, 'Failed to get authentication status');
    }
  });

  /**
   * POST /api/auth/settings/switch-method
   * Switch authentication method (Admin only)
   */
  router.post('/settings/switch-method', isAdmin, validator.validate(switchMethodSchema), async (req, res) => {
    try {
      const { method, modifiedBy } = req.validatedBody;

      console.log(`🔄 Switching authentication method to: ${method}`);

      const configManager = getAuthConfigManager();
      const updatedConfig = await configManager.switchAuthenticationMethod(method, modifiedBy);

      // Reset the global authentication adapter to pick up the new configuration
      resetGlobalAuthenticationAdapter();

      console.log(`✅ Authentication method switched to: ${method}`);

      res.json({
        success: true,
        data: {
          method: updatedConfig.method,
          configuration: updatedConfig,
          message: `Authentication method switched to ${method}`,
        }
      });
    } catch (error) {
      service.handleError(error, res, 'Failed to switch authentication method');
    }
  });

  /**
   * POST /api/auth/settings/update-config
   * Update authentication configuration (Admin only)
   */
  router.post('/settings/update-config', isAdmin, validator.validate(updateConfigSchema), async (req, res) => {
    try {
      const { modifiedBy, ...updates } = req.validatedBody;

      console.log('🔧 Updating authentication configuration...');

      const configManager = getAuthConfigManager();
      const updatedConfig = await configManager.updateConfiguration(
        updates as Partial<AuthConfiguration>,
        modifiedBy
      );

      // Reset the global authentication adapter to pick up the new configuration
      resetGlobalAuthenticationAdapter();

      console.log('✅ Authentication configuration updated successfully');

      res.json({
        success: true,
        data: {
          configuration: updatedConfig,
          message: 'Authentication configuration updated successfully',
        }
      });
    } catch (error) {
      service.handleError(error, res, 'Failed to update authentication configuration');
    }
  });

  /**
   * POST /api/auth/settings/test-supabase-connection
   * Test Supabase connection parameters (Admin only)
   */
  router.post('/settings/test-supabase-connection', isAdmin, validator.validate(testSupabaseConnectionSchema), async (req, res) => {
    try {
      const { url, anonKey, serviceRoleKey } = req.validatedBody;

      console.log('🧪 Testing Supabase connection...');

      // Test the connection using the provided configuration
      const testConfig = { url, anonKey, serviceRoleKey };

      // Import Supabase client for testing
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(testConfig.url, testConfig.anonKey);

      // Test basic connectivity by trying to get the current user
      const { data, error } = await supabase.auth.getUser();
      
      // Even if no user is returned, a successful response means the connection works
      if (error && !error.message.includes('invalid claim: missing sub claim')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }

      // Test the profiles table (if it exists)
      const { error: profilesError } = await supabase
        .from('profiles')
        .select('count')
        .limit(0);

      let profilesTableExists = true;
      let profilesMessage = 'Profiles table is accessible';

      if (profilesError) {
        if (profilesError.message.includes('relation "profiles" does not exist')) {
          profilesTableExists = false;
          profilesMessage = 'Profiles table does not exist (will be created automatically)';
        } else {
          profilesMessage = `Profiles table access warning: ${profilesError.message}`;
        }
      }

      console.log('✅ Supabase connection test successful');

      res.json({
        success: true,
        data: {
          connectionValid: true,
          profilesTableExists,
          message: 'Supabase connection successful',
          details: {
            url: testConfig.url,
            hasServiceRoleKey: !!testConfig.serviceRoleKey,
            profilesMessage,
          }
        }
      });
    } catch (error) {
      console.error('❌ Supabase connection test failed:', error);
      res.status(400).json({
        success: false,
        error: 'Supabase connection test failed',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * POST /api/auth/settings/backup-config
   * Create a backup of current authentication configuration (Admin only)
   */
  router.post('/settings/backup-config', isAdmin, async (req, res) => {
    try {
      const { modifiedBy } = req.body;

      console.log('💾 Creating authentication configuration backup...');

      const configManager = getAuthConfigManager();
      const backupPath = configManager.createBackup();

      console.log(`✅ Configuration backup created: ${backupPath}`);

      res.json({
        success: true,
        data: {
          backupPath,
          message: 'Configuration backup created successfully',
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      service.handleError(error, res, 'Failed to create configuration backup');
    }
  });

  /**
   * GET /api/auth/settings/export-config
   * Export current authentication configuration (Admin only)
   */
  router.get('/settings/export-config', isAdmin, async (req, res) => {
    try {
      console.log('📤 Exporting authentication configuration...');

      const configManager = getAuthConfigManager();
      const configString = configManager.exportConfiguration();

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="auth-config-export.json"');
      
      res.send(configString);
    } catch (error) {
      service.handleError(error, res, 'Failed to export configuration');
    }
  });

  return router;
}
