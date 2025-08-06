/**
 * PRODUCTION AUTHENTICATION SYSTEM
 * 
 * Permanent fix for deployment authentication issues
 * Ensures robust authentication without hardcoded user dependencies
 */


import { storage } from '../storage';
import bcrypt from 'bcryptjs';

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Authenticate user and return user object or null
 */
export async function authenticateUser(username: string, password: string): Promise<AuthUser | null> {
  try {
    const user = await storage.getUserByUsername(username);
    if (!user) {
      
      return null;
    }
    
    // Handle both hashed and plain text passwords
    let passwordMatch = false;
    
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      // Password is hashed
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // Plain text password (legacy support)
      passwordMatch = user.password === password;
      
      // Upgrade to hashed password if match
      if (passwordMatch) {
        try {
          const hashedPassword = await bcrypt.hash(password, 10);
          await storage.updateUserPassword(user.id, hashedPassword);
          
        } catch (error) {
          
        }
      }
    }
    
    if (!passwordMatch) {
      
      return null;
    }
    
    // Return safe user object
    const { password: _, ...safeUser } = user;
    
    return safeUser;
    
  } catch (error) {
    
    return null;
  }
}

/**
 * Check if user has privileged access (can see all events)
 */
export function hasPrivilegedAccess(user: AuthUser): boolean {
  return user.role === 'admin' || user.role === 'staff' || user.role === 'planner';
}

/**
 * Generate secure one-time admin credentials for initial setup
 */
export async function generateOneTimeAdminCredentials() {
  const crypto = await import('crypto');
  const oneTimePassword = crypto.randomBytes(16).toString('hex');
  
  return {
    username: 'admin',
    password: oneTimePassword,
    message: 'One-time admin credentials - password change required on first login'
  };
}

/**
 * Ensure at least one admin user exists in the system with modern security
 */
export async function ensureAdminUserExists(): Promise<void> {
  try {
    const adminUser = await storage.getUserByUsername('admin');
    if (!adminUser) {
      const credentials = await generateOneTimeAdminCredentials();
      const hashedPassword = await bcrypt.hash(credentials.password, 12); // Increased salt rounds for security
      
      await storage.createUser({
        username: 'admin',
        name: 'System Administrator',
        email: 'admin@eternallyyours.rsvp',
        password: hashedPassword,
        role: 'admin',
        passwordChangeRequired: true, // Force password change on first login
        emailVerified: false,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Display one-time credentials in logs (similar to magic link pattern)
      console.log('\n' + '='.repeat(80));
      console.log('🔐 ETERNALLY YOURS RSVP PLATFORM - ADMIN CREDENTIALS');
      console.log('='.repeat(80));
      console.log('');
      console.log('✨ Admin account created successfully!');
      console.log('🔑 ONE-TIME LOGIN CREDENTIALS (Save these now!):');
      console.log('');
      console.log(`   Username: ${credentials.username}`);
      console.log(`   Password: ${credentials.password}`);
      console.log('');
      console.log('🚨 IMPORTANT SECURITY NOTICES:');
      console.log('   • Password change is REQUIRED on first login');
      console.log('   • These credentials will not be shown again');
      console.log('   • Use strong password (min 12 chars, mixed case, numbers, symbols)'); 
      console.log('   • Login at: http://localhost:3001/auth');
      console.log('   • Enable user registration through admin panel after setup');
      console.log('');
      console.log('='.repeat(80));
      console.log('');
    }
  } catch (error) {
    console.error('❌ Failed to ensure admin user exists:', error);
  }
}