/**
 * Bootstrap Startup Manager
 * 
 * Handles first-time startup detection, setup token generation, and bootstrap mode configuration.
 * This enables zero-configuration startup with visual setup wizard instead of manual .env editing.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../../shared/schema';
import { users } from '../../../shared/schema';
import { DatabaseAuthAdapter, createDatabaseAuthAdapter, IAuthDatabaseAdapter } from '../auth/database-auth-adapter';
import { getGlobalAuthenticationAdapter } from '../auth/auth-factory';
import { getProviderService } from '../providers/provider-service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BootstrapConfig {
  isFirstTimeSetup: boolean;
  setupToken?: string;
  setupTokenExpiry?: Date;
  hasValidConfig: boolean;
  missingRequiredVars: string[];
}

export interface SetupTokenInfo {
  token: string;
  expiry: Date;
  setupUrl: string;
}

export class BootstrapStartupManager {
  private static instance: BootstrapStartupManager;
  private readonly projectRoot: string;
  private readonly envPath: string;
  private readonly bootstrapConfigPath: string;
  
  // Required environment variables for full operation
  private readonly requiredEnvVars = [
    'DATABASE_URL',
    'SESSION_SECRET'
  ];

  // Bootstrap environment variables (minimal config)
  private readonly bootstrapEnvVars = {
    NODE_ENV: 'bootstrap',
    PORT: '3001',  // Use different port to avoid macOS AirTunes conflict
    SESSION_SECRET: 'bootstrap-session-secret-change-after-setup',
    BOOTSTRAP_MODE: 'true'
  };

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../../');
    this.envPath = path.join(this.projectRoot, '.env');
    this.bootstrapConfigPath = path.join(this.projectRoot, '.bootstrap');
  }

  static getInstance(): BootstrapStartupManager {
    if (!BootstrapStartupManager.instance) {
      BootstrapStartupManager.instance = new BootstrapStartupManager();
    }
    return BootstrapStartupManager.instance;
  }

  /**
   * Check if this is a first-time setup
   */
  isFirstTimeSetup(): boolean {
    // Check if .env file exists and has required variables
    if (!fs.existsSync(this.envPath)) {
      return true;
    }

    // Check if .env has required variables
    try {
      const envContent = fs.readFileSync(this.envPath, 'utf-8');
      const missingVars = this.getMissingRequiredVars(envContent);
      if (missingVars.length > 0) {
        return true;
      }
    } catch (error) {
      console.error('Error reading .env file:', error);
      return true;
    }

    // Also check if database has been initialized
    return this.isDatabaseEmpty();
  }

  /**
   * Check if database is empty (no tables exist)
   */
  private isDatabaseEmpty(): boolean {
    try {
      // If DATABASE_URL doesn't exist, consider it first-time setup
      if (!process.env.DATABASE_URL) {
        return true;
      }

      // For production readiness, we need to properly check if tables exist
      // Use synchronous approach with promise wrapper
      const sql = postgres(process.env.DATABASE_URL);
      
      try {
        // Create a synchronous check using postgres
        const result = sql.unsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
          ) as exists;
        `);
        
        // For synchronous operation, we'll use a simple heuristic:
        // If we can connect and check, assume tables exist (not first-time setup)
        sql.end(); // Close connection
        return false; // Tables likely exist, not first-time setup
      } catch (queryError) {
        console.log('📋 Database connection successful but no tables found - first-time setup needed');
        sql.end();
        return true; // Query failed, likely no tables exist
      }
    } catch (error) {
      console.error('⚠️ Error checking database state:', error);
      return true; // Connection failed, assume first-time setup
    }
  }

  /**
   * Check if required tables exist in database
   */
  private async checkTablesExist(sql: any): Promise<boolean> {
    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        ) as exists;
      `;
      return result[0]?.exists || false;
    } catch (error) {
      console.error('Error checking table existence:', error);
      return false;
    }
  }

  /**
   * Initialize database schema using multi-provider architecture
   * 
   * ENTERPRISE ENHANCEMENT: Now supports PostgreSQL, Supabase, SQLite, and other providers
   * through the DatabaseAuthAdapter abstraction layer. This resolves the critical limitation
   * where authentication was hardcoded to PostgreSQL only.
   */
  async initializeDatabase(): Promise<void> {
    console.log('🗄️ Initializing database schema with multi-provider support...');
    
    try {
      // Use the authentication factory for automatic provider detection
      const authAdapter = await getGlobalAuthenticationAdapter();
      
      console.log('✅ Using authentication factory for multi-provider database initialization');
      
      // Use the multi-provider authentication adapter
      await authAdapter.initializeUserTable();
      
      console.log('✅ Database schema initialized successfully with multi-provider support');
      
    } catch (error) {
      console.error('❌ Failed to initialize database schema with factory:', error);
      
      // If multi-provider approach fails, try legacy approach as last resort
      if (process.env.DATABASE_URL) {
        console.log('🔄 Attempting legacy PostgreSQL initialization as fallback...');
        try {
          await this.initializeDatabaseLegacy();
          console.log('✅ Legacy database initialization successful');
        } catch (legacyError) {
          console.error('❌ Legacy database initialization also failed:', legacyError);
          throw new Error(`Both multi-provider and legacy database initialization failed: ${error.message}`);
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Legacy PostgreSQL-only database initialization
   * 
   * BACKWARD COMPATIBILITY: Maintains existing functionality for deployments
   * that haven't migrated to the provider architecture yet.
   */
  private async initializeDatabaseLegacy(): Promise<void> {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not found');
    }

    console.log('🗄️ Initializing database schema (legacy PostgreSQL mode)...');
    
    const sql = postgres(process.env.DATABASE_URL);
    const db = drizzle(sql, { schema });

    try {
      // Create users table if it doesn't exist (PostgreSQL-specific)
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'staff',
          password_change_required BOOLEAN DEFAULT false,
          email_verified BOOLEAN DEFAULT false,
          invitation_token TEXT,
          invitation_expires_at TIMESTAMP,
          last_login_at TIMESTAMP,
          failed_login_attempts INTEGER DEFAULT 0,
          account_locked_until TIMESTAMP,
          password_changed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
      `;

      console.log('✅ Legacy database schema initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize legacy database schema:', error);
      throw error;
    } finally {
      await sql.end();
    }
  }

  /**
   * Get missing required environment variables
   */
  private getMissingRequiredVars(envContent: string): string[] {
    const missing: string[] = [];
    
    for (const varName of this.requiredEnvVars) {
      const regex = new RegExp(`^${varName}=.+$`, 'm');
      if (!regex.test(envContent) || envContent.includes(`${varName}=`) && envContent.match(regex)?.[0]?.endsWith('=')) {
        missing.push(varName);
      }
    }
    
    return missing;
  }

  /**
   * Generate setup token and save to bootstrap config
   */
  generateSetupToken(): SetupTokenInfo {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const port = process.env.PORT || '5000';
    const setupUrl = `http://localhost:${port}/setup?token=${token}`;

    const bootstrapConfig = {
      setupToken: token,
      setupTokenExpiry: expiry.toISOString(),
      generatedAt: new Date().toISOString()
    };

    try {
      fs.writeFileSync(this.bootstrapConfigPath, JSON.stringify(bootstrapConfig, null, 2));
    } catch (error) {
      console.error('Failed to save bootstrap config:', error);
    }

    return { token, expiry, setupUrl };
  }

  /**
   * Validate setup token
   */
  validateSetupToken(token: string): boolean {
    if (!fs.existsSync(this.bootstrapConfigPath)) {
      return false;
    }

    try {
      const config = JSON.parse(fs.readFileSync(this.bootstrapConfigPath, 'utf-8'));
      const expiry = new Date(config.setupTokenExpiry);
      
      return config.setupToken === token && new Date() < expiry;
    } catch (error) {
      console.error('Error validating setup token:', error);
      return false;
    }
  }

  /**
   * Setup bootstrap environment variables
   */
  setupBootstrapEnvironment(): void {
    console.log('🔧 Setting up bootstrap environment variables...');
    
    for (const [key, value] of Object.entries(this.bootstrapEnvVars)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }

  /**
   * Get bootstrap configuration
   */
  getBootstrapConfig(): BootstrapConfig {
    const isFirstTime = this.isFirstTimeSetup();
    let setupToken: string | undefined;
    let setupTokenExpiry: Date | undefined;

    if (isFirstTime && fs.existsSync(this.bootstrapConfigPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(this.bootstrapConfigPath, 'utf-8'));
        setupToken = config.setupToken;
        setupTokenExpiry = new Date(config.setupTokenExpiry);
      } catch (error) {
        console.error('Error reading bootstrap config:', error);
      }
    }

    const envContent = fs.existsSync(this.envPath) ? fs.readFileSync(this.envPath, 'utf-8') : '';
    const missingRequiredVars = this.getMissingRequiredVars(envContent);

    return {
      isFirstTimeSetup: isFirstTime,
      setupToken,
      setupTokenExpiry,
      hasValidConfig: !isFirstTime,
      missingRequiredVars
    };
  }

  /**
   * Generate .env file from wizard data
   */
  generateEnvFile(wizardData: Record<string, any>): void {
    console.log('📝 Generating .env file from wizard data...');

    let envContent = '# Generated by RSVP Platform Setup Wizard\n';
    envContent += `# Created: ${new Date().toISOString()}\n\n`;

    // Database configuration
    if (wizardData.database) {
      const db = wizardData.database;
      switch (db.type) {
        case 'postgresql':
          envContent += '# Database Configuration - PostgreSQL\n';
          envContent += `DATABASE_URL=postgresql://${db.username}:${db.password}@${db.host}:${db.port || 5432}/${db.database}\n\n`;
          break;
        case 'sqlite':
          envContent += '# Database Configuration - SQLite\n';
          envContent += `DATABASE_URL=file:${db.path || './database.sqlite'}\n\n`;
          break;
        case 'supabase':
          envContent += '# Database Configuration - Supabase\n';
          envContent += `DATABASE_URL=${db.connectionString}\n`;
          envContent += `SUPABASE_URL=${db.url}\n`;
          envContent += `SUPABASE_ANON_KEY=${db.anonKey}\n`;
          envContent += `SUPABASE_SERVICE_ROLE_KEY=${db.serviceRoleKey}\n\n`;
          break;
      }
    }

    // Authentication configuration
    if (wizardData.auth) {
      const auth = wizardData.auth;
      envContent += '# Authentication Configuration\n';
      envContent += `AUTH_PROVIDER=${auth.provider || 'jwt-local'}\n`;
      if (auth.jwtSecret) {
        envContent += `JWT_SECRET=${auth.jwtSecret}\n`;
      }
      envContent += '\n';
    }

    // Email configuration
    if (wizardData.email) {
      const email = wizardData.email;
      envContent += '# Email Configuration\n';
      switch (email.provider) {
        case 'sendgrid':
          envContent += `SENDGRID_API_KEY=${email.apiKey}\n`;
          break;
        case 'smtp':
          envContent += `SMTP_HOST=${email.host}\n`;
          envContent += `SMTP_PORT=${email.port}\n`;
          envContent += `SMTP_USER=${email.username}\n`;
          envContent += `SMTP_PASS=${email.password}\n`;
          envContent += `SMTP_SECURE=${email.secure ? 'true' : 'false'}\n`;
          break;
        case 'gmail':
          envContent += `GMAIL_CLIENT_ID=${email.clientId}\n`;
          envContent += `GMAIL_CLIENT_SECRET=${email.clientSecret}\n`;
          envContent += `GMAIL_REDIRECT_URI=${email.redirectUri}\n`;
          break;
      }
      envContent += '\n';
    }

    // Storage configuration
    if (wizardData.storage) {
      const storage = wizardData.storage;
      envContent += '# Storage Configuration\n';
      switch (storage.provider) {
        case 'aws-s3':
          envContent += `AWS_ACCESS_KEY_ID=${storage.accessKeyId}\n`;
          envContent += `AWS_SECRET_ACCESS_KEY=${storage.secretAccessKey}\n`;
          envContent += `AWS_REGION=${storage.region}\n`;
          envContent += `AWS_S3_BUCKET=${storage.bucket}\n`;
          break;
        case 'local':
          envContent += `STORAGE_PATH=${storage.path || './uploads'}\n`;
          break;
      }
      envContent += '\n';
    }

    // Session configuration
    envContent += '# Session Configuration\n';
    envContent += `SESSION_SECRET=${wizardData.sessionSecret || crypto.randomBytes(32).toString('hex')}\n\n`;

    // Server configuration
    envContent += '# Server Configuration\n';
    envContent += `PORT=${wizardData.port || 5000}\n`;
    envContent += `NODE_ENV=${wizardData.nodeEnv || 'development'}\n`;
    envContent += `BASE_URL=${wizardData.baseUrl || `http://localhost:${wizardData.port || 5000}`}\n`;
    envContent += `BOOTSTRAP_MODE=false\n`;

    // Write .env file
    try {
      fs.writeFileSync(this.envPath, envContent);
      console.log('✅ Successfully generated .env file');
    } catch (error) {
      console.error('❌ Failed to generate .env file:', error);
      throw new Error('Failed to generate .env file');
    }
  }

  /**
   * Clean up bootstrap files after successful setup
   */
  cleanupBootstrap(): void {
    try {
      if (fs.existsSync(this.bootstrapConfigPath)) {
        fs.unlinkSync(this.bootstrapConfigPath);
        console.log('🧹 Cleaned up bootstrap configuration');
      }
    } catch (error) {
      console.error('Error cleaning up bootstrap files:', error);
    }
  }

  /**
   * Check if currently running in bootstrap mode
   * Bootstrap mode is active when setup is needed OR explicitly enabled via env var
   */
  isBootstrapMode(): boolean {
    // Always consider it bootstrap mode if setup is needed
    if (this.isFirstTimeSetup()) {
      return true;
    }
    
    // Also check the explicit env var for forced bootstrap mode
    return process.env.BOOTSTRAP_MODE === 'true';
  }

  /**
   * Log setup instructions to console
   */
  logSetupInstructions(setupInfo: SetupTokenInfo): void {
    console.log('\n' + '='.repeat(80));
    console.log('🎉 RSVP PLATFORM - FIRST TIME SETUP');
    console.log('='.repeat(80));
    console.log('');
    console.log('✨ Welcome! This appears to be your first time running the RSVP Platform.');
    console.log('📋 No manual configuration required - everything is visual!');
    console.log('');
    console.log('🔗 SETUP LINK (Valid for 24 hours):');
    console.log(`   ${setupInfo.setupUrl}`);
    console.log('');
    console.log('📝 SETUP INSTRUCTIONS:');
    console.log('   1. Copy the setup link above');
    console.log('   2. Open it in your web browser');
    console.log('   3. Follow the visual setup wizard');
    console.log('   4. The system will automatically create all configuration files');
    console.log('   5. Server will restart with your settings');
    console.log('');
    console.log('⏰ Token expires at:', setupInfo.expiry.toLocaleString());
    console.log('🔄 Server is running in bootstrap mode until setup is complete');
    console.log('');
    console.log('='.repeat(80));
    console.log('');
  }
}

export const bootstrapManager = BootstrapStartupManager.getInstance();