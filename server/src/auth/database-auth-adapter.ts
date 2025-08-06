/**
 * DATABASE AUTHENTICATION ADAPTER
 * 
 * Enterprise-grade multi-provider authentication adapter that abstracts database operations
 * across different providers (PostgreSQL, Supabase, SQLite, etc.) while maintaining
 * backward compatibility and security standards.
 * 
 * This adapter resolves the critical limitation where authentication was hardcoded to PostgreSQL.
 * Now supports full multi-provider architecture with enterprise security features.
 */

import bcrypt from 'bcryptjs';
import { IDatabaseProvider } from '../providers/interfaces/database-provider';
import { getProviderService } from '../providers/provider-service';

/**
 * User data interface for authentication operations
 */
export interface CreateUserData {
  username: string;
  name: string;
  email: string;
  password: string; // Will be hashed by adapter
  role: string;
  passwordChangeRequired?: boolean;
  emailVerified?: boolean;
  invitationToken?: string;
  invitationExpiresAt?: Date;
  failedLoginAttempts?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User entity returned from database operations
 */
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  password: string; // Hashed
  role: string;
  passwordChangeRequired: boolean;
  emailVerified: boolean;
  invitationToken?: string;
  invitationExpiresAt?: Date;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Multi-provider authentication database adapter interface
 */
export interface IAuthDatabaseAdapter {
  // Core user management
  initializeUserTable(): Promise<void>;
  createUser(userData: CreateUserData): Promise<User>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  
  // Enterprise security features
  updateLastLogin(userId: number): Promise<void>;
  incrementFailedAttempts(userId: number): Promise<void>;
  resetFailedAttempts(userId: number): Promise<void>;
  lockAccount(userId: number, until: Date): Promise<void>;
  unlockAccount(userId: number): Promise<void>;
  
  // Administrative operations
  getAllUsers(): Promise<User[]>;
  deleteUser(userId: number): Promise<void>;
  updateUser(userId: number, userData: Partial<User>): Promise<User>;
}

/**
 * Enterprise Multi-Provider Database Authentication Adapter
 * 
 * Provides database-agnostic authentication operations while maintaining
 * enterprise security standards across all supported providers.
 */
export class DatabaseAuthAdapter implements IAuthDatabaseAdapter {
  private dbProvider: IDatabaseProvider;
  
  constructor(dbProvider?: IDatabaseProvider) {
    // Use provided provider or get from provider service
    try {
      this.dbProvider = dbProvider || getProviderService().getDatabase();
    } catch (error) {
      // If provider service isn't available, this adapter will only be used with explicit provider
      if (!dbProvider) {
        throw new Error('Provider service not available and no explicit provider provided');
      }
      this.dbProvider = dbProvider;
    }
  }

  /**
   * Initialize user table with enterprise security fields
   * Supports provider-specific SQL syntax and features
   */
  async initializeUserTable(): Promise<void> {
    const providerName = this.dbProvider.name.toLowerCase();
    
    try {
      switch (providerName) {
        case 'postgresql':
          await this.createPostgreSQLUserTable();
          break;
          
        case 'supabase':
          await this.createSupabaseUserTable();
          break;
          
        case 'sqlite':
          await this.createSQLiteUserTable();
          break;
          
        default:
          // Generic SQL approach for unknown providers
          await this.createGenericUserTable();
      }
      
      console.log(`✅ User table initialized successfully for ${providerName} provider`);
    } catch (error) {
      console.error(`❌ Failed to initialize user table for ${providerName}:`, error);
      throw new Error(`User table initialization failed: ${error.message}`);
    }
  }

  /**
   * Create user with enterprise security standards
   * Automatically hashes password and sets security defaults
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      // Hash password with enterprise-grade security (12 salt rounds)
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Prepare user data with security defaults
      const userRecord = {
        ...userData,
        password: hashedPassword,
        password_change_required: userData.passwordChangeRequired ?? false,
        email_verified: userData.emailVerified ?? false,
        failed_login_attempts: userData.failedLoginAttempts ?? 0,
        created_at: userData.createdAt?.toISOString() ?? new Date().toISOString(),
        updated_at: userData.updatedAt?.toISOString() ?? new Date().toISOString()
      };

      // Use provider-specific user creation
      const createdUser = await this.executeProviderSpecificUserCreation(userRecord);
      
      console.log(`✅ User created successfully: ${userData.username} (${this.dbProvider.name})`);
      return createdUser;
      
    } catch (error) {
      console.error(`❌ Failed to create user ${userData.username}:`, error);
      throw new Error(`User creation failed: ${error.message}`);
    }
  }

  /**
   * Get user by username with provider-agnostic query
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const user = await this.executeProviderSpecificUserQuery(
        'getUserByUsername', 
        { username }
      );
      
      return user;
    } catch (error) {
      console.error(`❌ Failed to get user by username ${username}:`, error);
      throw new Error(`User retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get user by ID with provider-agnostic query
   */
  async getUserById(id: number): Promise<User | null> {
    try {
      const user = await this.executeProviderSpecificUserQuery(
        'getUserById',
        { id }
      );
      
      return user;
    } catch (error) {
      console.error(`❌ Failed to get user by ID ${id}:`, error);
      throw new Error(`User retrieval failed: ${error.message}`);
    }
  }

  /**
   * Update user password with enterprise security
   */
  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    try {
      await this.executeProviderSpecificUserUpdate(userId, {
        password: hashedPassword,
        password_changed_at: new Date().toISOString(),
        password_change_required: false, // Reset after successful change
        updated_at: new Date().toISOString()
      });
      
      console.log(`✅ Password updated successfully for user ID: ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to update password for user ID ${userId}:`, error);
      throw new Error(`Password update failed: ${error.message}`);
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: number): Promise<void> {
    try {
      await this.executeProviderSpecificUserUpdate(userId, {
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ Failed to update last login for user ID ${userId}:`, error);
      throw new Error(`Last login update failed: ${error.message}`);
    }
  }

  /**
   * Increment failed login attempts for security
   */
  async incrementFailedAttempts(userId: number): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');
      
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updates: any = {
        failed_login_attempts: newFailedAttempts,
        updated_at: new Date().toISOString()
      };
      
      // Lock account after 5 failed attempts
      if (newFailedAttempts >= 5) {
        updates.account_locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
        console.log(`🔒 Account locked for user ID ${userId} after ${newFailedAttempts} failed attempts`);
      }
      
      await this.executeProviderSpecificUserUpdate(userId, updates);
    } catch (error) {
      console.error(`❌ Failed to increment failed attempts for user ID ${userId}:`, error);
      throw new Error(`Failed attempt increment failed: ${error.message}`);
    }
  }

  /**
   * Reset failed login attempts after successful login
   */
  async resetFailedAttempts(userId: number): Promise<void> {
    try {
      await this.executeProviderSpecificUserUpdate(userId, {
        failed_login_attempts: 0,
        account_locked_until: null,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ Failed to reset failed attempts for user ID ${userId}:`, error);
      throw new Error(`Failed attempt reset failed: ${error.message}`);
    }
  }

  /**
   * Lock user account for security
   */
  async lockAccount(userId: number, until: Date): Promise<void> {
    try {
      await this.executeProviderSpecificUserUpdate(userId, {
        account_locked_until: until.toISOString(),
        updated_at: new Date().toISOString()
      });
      
      console.log(`🔒 Account locked for user ID ${userId} until ${until.toISOString()}`);
    } catch (error) {
      console.error(`❌ Failed to lock account for user ID ${userId}:`, error);
      throw new Error(`Account lock failed: ${error.message}`);
    }
  }

  /**
   * Unlock user account
   */
  async unlockAccount(userId: number): Promise<void> {
    try {
      await this.executeProviderSpecificUserUpdate(userId, {
        account_locked_until: null,
        failed_login_attempts: 0,
        updated_at: new Date().toISOString()
      });
      
      console.log(`🔓 Account unlocked for user ID ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to unlock account for user ID ${userId}:`, error);
      throw new Error(`Account unlock failed: ${error.message}`);
    }
  }

  /**
   * Get all users (administrative operation)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const users = await this.executeProviderSpecificQuery('getAllUsers', {});
      return users || [];
    } catch (error) {
      console.error(`❌ Failed to get all users:`, error);
      throw new Error(`User list retrieval failed: ${error.message}`);
    }
  }

  /**
   * Delete user (administrative operation)
   */
  async deleteUser(userId: number): Promise<void> {
    try {
      await this.executeProviderSpecificQuery('deleteUser', { userId });
      console.log(`✅ User deleted successfully: ID ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to delete user ID ${userId}:`, error);
      throw new Error(`User deletion failed: ${error.message}`);
    }
  }

  /**
   * Convert camelCase field names to snake_case for database consistency
   */
  private convertFieldNamesToSnakeCase(userData: any): any {
    const fieldMapping: { [key: string]: string } = {
      passwordChangeRequired: 'password_change_required',
      passwordChangedAt: 'password_changed_at',
      emailVerified: 'email_verified',
      invitationToken: 'invitation_token',
      invitationExpiresAt: 'invitation_expires_at',
      lastLoginAt: 'last_login_at',
      failedLoginAttempts: 'failed_login_attempts',
      accountLockedUntil: 'account_locked_until',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    const converted: any = {};
    
    for (const [key, value] of Object.entries(userData)) {
      // Use snake_case version if mapping exists, otherwise keep original
      const dbFieldName = fieldMapping[key] || key;
      converted[dbFieldName] = value;
      
      // Convert Date objects to ISO strings for PostgreSQL
      if (value instanceof Date) {
        converted[dbFieldName] = value.toISOString();
      }
    }
    
    return converted;
  }

  /**
   * Update user data (administrative operation)
   */
  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    try {
      // Convert camelCase field names to snake_case before updating
      const convertedUserData = this.convertFieldNamesToSnakeCase(userData);
      
      const updatedUser = await this.executeProviderSpecificUserUpdate(userId, {
        ...convertedUserData,
        updated_at: new Date().toISOString()
      });
      
      console.log(`✅ User updated successfully: ID ${userId}`);
      return updatedUser;
    } catch (error) {
      console.error(`❌ Failed to update user ID ${userId}:`, error);
      throw new Error(`User update failed: ${error.message}`);
    }
  }

  // ====== PROVIDER-SPECIFIC IMPLEMENTATIONS ======

  /**
   * PostgreSQL-specific user table creation
   */
  private async createPostgreSQLUserTable(): Promise<void> {
    const createTableSQL = `
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
      
      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `;
    
    await this.dbProvider.executeRaw(createTableSQL);
  }

  /**
   * Supabase-specific user table creation (PostgreSQL with RLS)
   */
  private async createSupabaseUserTable(): Promise<void> {
    const createTableSQL = `
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
        invitation_expires_at TIMESTAMP WITH TIME ZONE,
        last_login_at TIMESTAMP WITH TIME ZONE,
        failed_login_attempts INTEGER DEFAULT 0,
        account_locked_until TIMESTAMP WITH TIME ZONE,
        password_changed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      
      -- Supabase Row Level Security (RLS)
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policies for multi-tenant isolation
      CREATE POLICY IF NOT EXISTS "Users can view their own data" ON users
        FOR SELECT USING (auth.uid()::text = id::text OR role = 'admin');
        
      CREATE POLICY IF NOT EXISTS "Admin can manage all users" ON users
        FOR ALL USING (role = 'admin');
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `;
    
    await this.dbProvider.executeRaw(createTableSQL);
  }

  /**
   * SQLite-specific user table creation
   */
  private async createSQLiteUserTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff',
        password_change_required BOOLEAN DEFAULT 0,
        email_verified BOOLEAN DEFAULT 0,
        invitation_token TEXT,
        invitation_expires_at DATETIME,
        last_login_at DATETIME,
        failed_login_attempts INTEGER DEFAULT 0,
        account_locked_until DATETIME,
        password_changed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `;
    
    await this.dbProvider.executeRaw(createTableSQL);
  }

  /**
   * Generic SQL user table creation for unknown providers
   */
  private async createGenericUserTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'staff',
        password_change_required BOOLEAN DEFAULT FALSE,
        email_verified BOOLEAN DEFAULT FALSE,
        invitation_token VARCHAR(255),
        invitation_expires_at TIMESTAMP,
        last_login_at TIMESTAMP,
        failed_login_attempts INTEGER DEFAULT 0,
        account_locked_until TIMESTAMP,
        password_changed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    
    await this.dbProvider.executeRaw(createTableSQL);
  }

  /**
   * Execute provider-specific user creation logic
   */
  private async executeProviderSpecificUserCreation(userData: any): Promise<User> {
    const providerName = this.dbProvider.name.toLowerCase();
    
    try {
      let insertSQL: string;
      let values: any[];
      
      // Use provider-specific SQL syntax
      if (providerName === 'postgresql' || providerName === 'supabase') {
        // PostgreSQL uses $1, $2, etc. for parameters
        insertSQL = `
          INSERT INTO users (
            username, password, name, email, role, password_change_required,
            email_verified, failed_login_attempts, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *;
        `;
      } else {
        // SQLite and other providers use ? for parameters
        insertSQL = `
          INSERT INTO users (
            username, password, name, email, role, password_change_required,
            email_verified, failed_login_attempts, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *;
        `;
      }
      
      values = [
        userData.username,
        userData.password,
        userData.name,
        userData.email,
        userData.role,
        userData.password_change_required,
        userData.email_verified,
        userData.failed_login_attempts,
        userData.created_at,
        userData.updated_at
      ];
      
      const result = await this.dbProvider.executeRaw(insertSQL, values);
      return result.data[0] as User;
      
    } catch (error) {
      console.error(`❌ Provider-specific user creation failed for ${providerName}:`, error);
      throw new Error(`User creation failed for provider ${providerName}: ${error.message}`);
    }
  }

  /**
   * Execute provider-specific user query
   */
  private async executeProviderSpecificUserQuery(
    operation: string, 
    params: any
  ): Promise<User | null> {
    const providerName = this.dbProvider.name.toLowerCase();
    let sql: string;
    let values: any[];
    
    // Use provider-specific parameter syntax
    const param1 = (providerName === 'postgresql' || providerName === 'supabase') ? '$1' : '?';
    
    switch (operation) {
      case 'getUserByUsername':
        sql = `SELECT * FROM users WHERE username = ${param1} LIMIT 1`;
        values = [params.username];
        break;
        
      case 'getUserById':
        sql = `SELECT * FROM users WHERE id = ${param1} LIMIT 1`;
        values = [params.id];
        break;
        
      default:
        throw new Error(`Unknown user query operation: ${operation}`);
    }
    
    try {
      const result = await this.dbProvider.executeRaw(sql, values);
      return result.data.length > 0 ? result.data[0] as User : null;
    } catch (error) {
      console.error(`❌ Provider-specific query failed for ${operation}:`, error);
      throw new Error(`Query failed for operation ${operation}: ${error.message}`);
    }
  }

  /**
   * Execute provider-specific user update
   */
  private async executeProviderSpecificUserUpdate(
    userId: number, 
    updates: Partial<User>
  ): Promise<User> {
    const providerName = this.dbProvider.name.toLowerCase();
    const updateKeys = Object.keys(updates);
    const values = [...Object.values(updates), userId];
    
    let updateFields: string;
    let whereClause: string;
    
    if (providerName === 'postgresql' || providerName === 'supabase') {
      // PostgreSQL uses $1, $2, etc.
      updateFields = updateKeys.map((key, index) => `${key} = $${index + 1}`).join(', ');
      whereClause = `id = $${values.length}`;
    } else {
      // SQLite and others use ?
      updateFields = updateKeys.map(key => `${key} = ?`).join(', ');
      whereClause = 'id = ?';
    }
    
    const sql = `
      UPDATE users 
      SET ${updateFields}
      WHERE ${whereClause}
      RETURNING *;
    `;
    
    try {
      const result = await this.dbProvider.executeRaw(sql, values);
      return result.data[0] as User;
    } catch (error) {
      console.error(`❌ Provider-specific user update failed:`, error);
      throw new Error(`User update failed: ${error.message}`);
    }
  }

  /**
   * Execute provider-specific general queries
   */
  private async executeProviderSpecificQuery(operation: string, params: any): Promise<any> {
    const providerName = this.dbProvider.name.toLowerCase();
    
    switch (operation) {
      case 'getAllUsers':
        const result = await this.dbProvider.executeRaw('SELECT * FROM users ORDER BY created_at DESC');
        return result.data as User[];
        
      case 'deleteUser':
        // Use provider-specific parameter syntax
        const deleteParam = (providerName === 'postgresql' || providerName === 'supabase') ? '$1' : '?';
        const deleteSql = `DELETE FROM users WHERE id = ${deleteParam}`;
        await this.dbProvider.executeRaw(deleteSql, [params.userId]);
        return;
        
      default:
        throw new Error(`Unknown query operation: ${operation}`);
    }
  }
}

/**
 * Factory function to create DatabaseAuthAdapter instance
 * Uses provider service to get appropriate database provider
 */
export function createDatabaseAuthAdapter(provider?: IDatabaseProvider): DatabaseAuthAdapter {
  return new DatabaseAuthAdapter(provider);
}

/**
 * Legacy singleton for backward compatibility
 * @deprecated Use getGlobalAuthenticationAdapter from auth-factory instead
 */
let _globalAuthAdapter: DatabaseAuthAdapter | null = null;

/**
 * @deprecated Use getGlobalAuthenticationAdapter from auth-factory instead
 * This function is maintained for backward compatibility only
 */
export function getGlobalAuthAdapter(): DatabaseAuthAdapter {
  if (!_globalAuthAdapter) {
    try {
      _globalAuthAdapter = new DatabaseAuthAdapter();
    } catch (error) {
      // If provider service isn't available, create a fallback adapter
      console.log('⚠️ Provider service not available, creating fallback auth adapter');
      _globalAuthAdapter = new DatabaseAuthAdapter(undefined);
    }
  }
  return _globalAuthAdapter;
}