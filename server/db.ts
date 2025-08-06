/**
 * Database Module with Provider Architecture
 * 
 * Updated to use the flexible provider architecture while maintaining
 * full backward compatibility with existing code.
 */

import { initializeProviderService, getProviderService } from './src/providers/provider-service';
import fs from 'fs';
import path from 'path';

// Note: DATABASE_URL validation moved to runtime to support bootstrap mode
// The bootstrap logic in index.ts must run before this module is used

// Initialize provider service with configuration
let providerServiceInitialized = false;

async function initializeProviders() {
  if (providerServiceInitialized) {
    return;
  }

  // Runtime check for DATABASE_URL (after dotenv has loaded)
  if (!process.env.DATABASE_URL) {
    console.log('🔧 Bootstrap mode - DATABASE_URL not available, skipping provider initialization');
    return;
  }

  try {
    await initializeProviderService({
      defaultDatabase: 'postgresql',
      defaultAuth: 'local',
      enableHealthChecks: true,
      enableMetrics: true,
      maintainBackwardCompatibility: true
    });
    
    providerServiceInitialized = true;
    console.log('✅ Provider architecture initialized');
  } catch (error) {
    console.error('❌ Failed to initialize provider architecture:', error);
    throw error;
  }
}

// Initialize providers immediately and wait for completion
let initializationPromise: Promise<void> | null = null;

async function ensureProviderInitialization(): Promise<void> {
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = initializeProviders();
  return initializationPromise;
}

// Start initialization immediately and setup database caching
ensureProviderInitialization().then(async () => {
  // After provider initialization, cache the database instance
  if (providerServiceInitialized && !cachedDbInstance) {
    try {
      const providerService = getProviderService();
      const dbProvider = providerService.getDatabase();
      
      if ('getDb' in dbProvider) {
        cachedDbInstance = (dbProvider as any).getDb();
        console.log('✅ Database instance cached from provider service');
      }
    } catch (error) {
      console.log('ℹ️ Provider database not available, will use direct connection');
      // Initialize direct connection as backup
      await initializeDirectDb();
    }
  }
}).catch(err => {
  console.log('ℹ️ Provider initialization deferred (likely bootstrap mode)');
  // Try to initialize direct database connection for bootstrap mode
  if (process.env.DATABASE_URL) {
    initializeDirectDb().catch(dbErr => {
      console.log('ℹ️ Database initialization also deferred');
    });
  }
});

/**
 * Backward compatible database exports
 * These maintain the exact same interface as before while using the provider architecture
 */

// Direct database instance initialization - Ver5 Provider System Backup Only
let directDbInstance: any = null;

async function initializeDirectDb() {
  if (!directDbInstance && process.env.DATABASE_URL) {
    try {
      // Import Drizzle and postgres
      const { drizzle } = await import('drizzle-orm/postgres-js');
      const postgres = await import('postgres');
      const schema = await import('../shared/schema');
      
      // Create direct connection
      const client = postgres.default(process.env.DATABASE_URL, {
        max: 5,
        idle_timeout: 30,
        connect_timeout: 10,
        prepare: true,
        onnotice: () => {},
        ssl: false
      });
      
      // Create Drizzle instance
      directDbInstance = drizzle(client, { schema });
      
      console.log('✅ Direct database connection established');
      
      // Cache this as the db instance for the proxy
      if (!cachedDbInstance) {
        cachedDbInstance = directDbInstance;
      }
    } catch (error) {
      console.error('❌ Failed to initialize direct database connection:', error);
      throw error;
    }
  }
  return directDbInstance;
}

// Database instance - Ver5 Provider System Only
let cachedDbInstance: any = null;

export const db = new Proxy({} as any, {
  get(target, prop) {
    // Handle Promise-like properties correctly
    if (typeof prop === 'string' && (prop === 'then' || prop === 'catch' || prop === 'finally')) {
      return undefined;
    }
    
    // Get the database instance synchronously if cached, otherwise initialize
    let dbInstance = cachedDbInstance;
    
    if (!dbInstance) {
      // Try to get from provider service first
      if (providerServiceInitialized) {
        try {
          const providerService = getProviderService();
          const dbProvider = providerService.getDatabase();
          
          // For PostgreSQL provider, get the Drizzle instance
          if ('getDb' in dbProvider) {
            dbInstance = (dbProvider as any).getDb();
            cachedDbInstance = dbInstance; // Cache it
          }
        } catch (error) {
          console.log('Provider service database not available, will initialize direct connection');
        }
      }
      
      // If no provider service database, we need direct connection
      if (!dbInstance) {
        // For synchronous access, we need the database to be pre-initialized
        // This will happen automatically during server startup
        throw new Error('Database not initialized. Ensure server startup completed before using db.');
      }
    }
    
    // Get the property/method from the actual Drizzle instance
    const value = dbInstance[prop as string];
    
    // Return the value as-is (Drizzle methods return synchronous query builders)
    return value;
  }
});

// Postgres client - maintains backward compatibility  
export const pgClient = new Proxy({} as any, {
  get(target, prop) {
    // Return a function that ensures initialization before executing
    if (typeof prop === 'string' && (prop === 'then' || prop === 'catch' || prop === 'finally')) {
      // Handle Promise-like properties to prevent issues with async/await
      return undefined;
    }
    
    return async (...args: any[]) => {
      // Ensure provider service is initialized
      await ensureProviderInitialization();
      
      if (!providerServiceInitialized) {
        throw new Error('Provider service failed to initialize');
      }
      
      try {
        const providerService = getProviderService();
        const dbProvider = providerService.getDatabase();
        
        // For PostgreSQL provider, get the raw client
        if ('getClient' in dbProvider) {
          const clientInstance = (dbProvider as any).getClient();
          const value = clientInstance[prop as string];
          
          // If it's a function, call it with the provided arguments
          if (typeof value === 'function') {
            return await value.apply(clientInstance, args);
          }
          return value;
        }
        
        throw new Error('Current database provider is not PostgreSQL');
      } catch (error) {
        console.error('Error accessing postgres client:', error);
        throw error;
      }
    };
  }
});

// Enhanced test connection function
export async function testConnection() {
  // Ensure provider service is initialized
  await ensureProviderInitialization();
  
  if (!providerServiceInitialized) {
    throw new Error('Provider service failed to initialize');
  }
  
  try {
    const providerService = getProviderService();
    const dbProvider = providerService.getDatabase();
    
    const latency = await dbProvider.ping();
    console.log(`✅ Database connection test successful (${latency}ms)`);
    
    const health = await dbProvider.getHealth();
    console.log(`📊 Database health: ${health.status} (${health.activeConnections}/${health.maxConnections} connections)`);
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    throw error;
  }
}

// Test connection immediately (maintain existing behavior, skip in bootstrap mode)
// Only test if DATABASE_URL is available (runtime check)
if (process.env.DATABASE_URL) {
  testConnection().catch(err => {
    console.error('❌ Initial database connection test failed:', err);
  });
} else {
  console.log('🔧 Bootstrap mode - skipping database connection test');
}

// Set up graceful shutdown
process.on('SIGINT', async () => {
  try {
    if (providerServiceInitialized) {
      console.log('🔄 Shutting down database connections...');
      const { shutdownProviderService } = await import('./src/providers/provider-service');
      await shutdownProviderService();
    }
  } catch (error) {
    console.error('❌ Error during database shutdown:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  try {
    if (providerServiceInitialized) {
      console.log('🔄 Shutting down database connections...');
      const { shutdownProviderService } = await import('./src/providers/provider-service');
      await shutdownProviderService();
    }
  } catch (error) {
    console.error('❌ Error during database shutdown:', error);
  }
  process.exit(0);
});

/**
 * Additional provider-specific exports for enhanced functionality
 */

// Get database health information
export async function getDatabaseHealth() {
  // Ensure provider service is initialized
  await ensureProviderInitialization();
  
  if (!providerServiceInitialized) {
    throw new Error('Provider service failed to initialize');
  }
  
  const providerService = getProviderService();
  const dbProvider = providerService.getDatabase();
  return await dbProvider.getHealth();
}

// Get database metrics (PostgreSQL specific)
export async function getDatabaseMetrics() {
  // Ensure provider service is initialized
  await ensureProviderInitialization();
  
  if (!providerServiceInitialized) {
    throw new Error('Provider service failed to initialize');
  }
  
  const providerService = getProviderService();
  const dbProvider = providerService.getDatabase();
  
  if ('getMetrics' in dbProvider) {
    return (dbProvider as any).getMetrics();
  }
  
  return null;
}

// Get provider service instance for advanced usage
export async function getProviderServiceInstance() {
  // Ensure provider service is initialized
  await ensureProviderInitialization();
  
  if (!providerServiceInitialized) {
    throw new Error('Provider service failed to initialize');
  }
  
  return getProviderService();
}

// Export the initialization function for use by other modules
export { ensureProviderInitialization };