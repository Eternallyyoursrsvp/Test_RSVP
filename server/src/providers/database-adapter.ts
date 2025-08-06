/**
 * Database Adapter
 * 
 * Provides backward compatibility with the existing db.ts while using the new provider architecture.
 * This adapter allows existing code to continue working without changes while benefiting from
 * the flexible provider system underneath.
 */

import { getProviderService } from './provider-service';
import { PostgreSQLProvider } from './implementations/postgresql-provider';

/**
 * Get the database instance for backward compatibility
 * This replaces the existing db export from db.ts
 */
export function getDb() {
  const providerService = getProviderService();
  const databaseProvider = providerService.getDatabase();
  
  if (databaseProvider instanceof PostgreSQLProvider) {
    return databaseProvider.getDb();
  }
  
  throw new Error('Current database provider does not support Drizzle ORM interface');
}

/**
 * Get the raw postgres client for advanced operations
 * This replaces the existing pgClient export from db.ts
 */
export function getPgClient() {
  const providerService = getProviderService();
  const databaseProvider = providerService.getDatabase();
  
  if (databaseProvider instanceof PostgreSQLProvider) {
    return databaseProvider.getClient();
  }
  
  throw new Error('Current database provider is not PostgreSQL');
}

/**
 * Test database connection
 * Enhanced version of the existing testConnection function
 */
export async function testConnection(): Promise<void> {
  const providerService = getProviderService();
  const databaseProvider = providerService.getDatabase();
  
  try {
    const latency = await databaseProvider.ping();
    console.log(`✅ Database connection test successful (${latency}ms)`);
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    throw error;
  }
}

/**
 * Get database health information
 */
export async function getDatabaseHealth() {
  const providerService = getProviderService();
  const databaseProvider = providerService.getDatabase();
  
  return await databaseProvider.getHealth();
}

/**
 * Get database metrics (if supported)
 */
export async function getDatabaseMetrics() {
  const providerService = getProviderService();
  const databaseProvider = providerService.getDatabase();
  
  if (databaseProvider instanceof PostgreSQLProvider) {
    return databaseProvider.getMetrics();
  }
  
  return null;
}

/**
 * Execute raw SQL query with the current provider
 */
export async function executeRawQuery<T = unknown>(query: string, params?: unknown[]) {
  const providerService = getProviderService();
  const databaseProvider = providerService.getDatabase();
  
  return await databaseProvider.executeRaw<T>(query, params);
}

/**
 * Legacy exports for backward compatibility
 * These maintain the exact same interface as the original db.ts
 */

// Re-export the database instance as 'db' for backward compatibility
export const db = new Proxy({}, {
  get(target, prop) {
    const dbInstance = getDb();
    return dbInstance[prop as keyof typeof dbInstance];
  }
});

// Re-export the postgres client as 'pgClient' for backward compatibility  
export const pgClient = new Proxy({}, {
  get(target, prop) {
    const clientInstance = getPgClient();
    return clientInstance[prop as keyof typeof clientInstance];
  }
});

// Export the test connection function with the same name
export { testConnection };