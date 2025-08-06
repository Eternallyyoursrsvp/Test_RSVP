/**
 * Database Schema Validation and Optimization System
 * Implements production-ready database validation with performance optimizations
 */

import { z } from 'zod';
import { metricsRegistry } from '../middleware/monitoring';

// Database Connection Interface
export interface DatabaseConnection {
  query(sql: string, params?: any[]): Promise<any>;
  transaction<T>(callback: (client: DatabaseConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

// Schema Validation Configuration
export interface SchemaValidationConfig {
  enforceConstraints: boolean;
  validateForeignKeys: boolean;
  optimizeQueries: boolean;
  enableCaching: boolean;
  logSlowQueries: boolean;
  slowQueryThreshold: number; // milliseconds
}

// Table Schema Definitions
export const TableSchemas = {
  events: z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    event_date: z.string().datetime(),
    venue_id: z.string().uuid(),
    couple_id: z.string().uuid(),
    status: z.enum(['draft', 'published', 'cancelled']),
    max_guests: z.number().int().positive().optional(),
    rsvp_deadline: z.string().datetime().optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime()
  }),

  guests: z.object({
    id: z.string().uuid(),
    event_id: z.string().uuid(),
    name: z.string().min(1).max(255),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    relationship_type_id: z.string().uuid().optional(),
    group_id: z.string().uuid().optional(),
    dietary_restrictions: z.array(z.string()).default([]),
    accessibility_needs: z.string().optional(),
    plus_one_allowed: z.boolean().default(false),
    status: z.enum(['invited', 'confirmed', 'declined', 'pending']).default('pending'),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime()
  }),

  rsvp_responses: z.object({
    id: z.string().uuid(),
    guest_id: z.string().uuid(),
    event_id: z.string().uuid(),
    ceremony_id: z.string().uuid().optional(),
    attendance: z.enum(['attending', 'not_attending', 'maybe']),
    plus_one_name: z.string().optional(),
    dietary_restrictions: z.array(z.string()).default([]),
    special_requests: z.string().optional(),
    response_date: z.string().datetime(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime()
  }),

  venues: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255),
    address: z.string().min(1),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    country: z.string().min(1).max(100),
    postal_code: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    capacity: z.number().int().positive().optional(),
    amenities: z.array(z.string()).default([]),
    contact_info: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      website: z.string().url().optional()
    }).optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime()
  }),

  relationship_types: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    priority: z.number().int().min(1).max(10).default(5),
    is_active: z.boolean().default(true),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime()
  })
};

// Schema Validation Service
export class SchemaValidationService {
  private config: SchemaValidationConfig;
  private queryCache: Map<string, { result: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: SchemaValidationConfig) {
    this.config = config;
  }

  // Validate data against table schema
  async validateTableData<T extends keyof typeof TableSchemas>(
    table: T,
    data: any
  ): Promise<z.infer<typeof TableSchemas[T]>> {
    const startTime = performance.now();
    
    try {
      const schema = TableSchemas[table];
      const validated = schema.parse(data);
      
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('schema_validation_duration_ms', duration, {
        table,
        status: 'success'
      });
      
      return validated;
    } catch (error) {
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('schema_validation_duration_ms', duration, {
        table,
        status: 'error'
      });
      
      metricsRegistry.incrementCounter('schema_validation_errors_total', {
        table,
        error_type: error instanceof z.ZodError ? 'validation' : 'unknown'
      });
      
      throw error;
    }
  }

  // Execute optimized query with caching
  async executeOptimizedQuery(
    db: DatabaseConnection,
    sql: string,
    params: any[] = [],
    cacheKey?: string
  ): Promise<any> {
    const startTime = performance.now();
    
    // Check cache if enabled and key provided
    if (this.config.enableCaching && cacheKey) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        metricsRegistry.incrementCounter('database_query_cache_hits_total');
        return cached.result;
      }
    }
    
    try {
      const result = await db.query(sql, params);
      const duration = performance.now() - startTime;
      
      // Log slow queries
      if (this.config.logSlowQueries && duration > this.config.slowQueryThreshold) {
        console.warn(`🐌 Slow query detected (${duration.toFixed(2)}ms):`, {
          sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
          duration,
          params: params?.length
        });
      }
      
      // Cache result if enabled
      if (this.config.enableCaching && cacheKey) {
        this.queryCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
        
        // Clean old cache entries
        this.cleanCache();
      }
      
      // Record metrics
      metricsRegistry.recordHistogram('database_query_duration_ms', duration, {
        status: 'success'
      });
      
      metricsRegistry.incrementCounter('database_queries_total', {
        status: 'success'
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      metricsRegistry.recordHistogram('database_query_duration_ms', duration, {
        status: 'error'
      });
      
      metricsRegistry.incrementCounter('database_queries_total', {
        status: 'error'
      });
      
      console.error('🚨 Database query error:', {
        sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });
      
      throw error;
    }
  }

  // Validate foreign key relationships
  async validateForeignKeys(
    db: DatabaseConnection,
    table: string,
    data: Record<string, any>
  ): Promise<void> {
    if (!this.config.validateForeignKeys) return;
    
    const foreignKeyValidations: Promise<void>[] = [];
    
    // Common foreign key validations
    if (data.event_id) {
      foreignKeyValidations.push(
        this.validateForeignKeyExists(db, 'events', 'id', data.event_id)
      );
    }
    
    if (data.guest_id) {
      foreignKeyValidations.push(
        this.validateForeignKeyExists(db, 'guests', 'id', data.guest_id)
      );
    }
    
    if (data.venue_id) {
      foreignKeyValidations.push(
        this.validateForeignKeyExists(db, 'venues', 'id', data.venue_id)
      );
    }
    
    if (data.relationship_type_id) {
      foreignKeyValidations.push(
        this.validateForeignKeyExists(db, 'relationship_types', 'id', data.relationship_type_id)
      );
    }
    
    if (data.ceremony_id) {
      foreignKeyValidations.push(
        this.validateForeignKeyExists(db, 'ceremonies', 'id', data.ceremony_id)
      );
    }
    
    await Promise.all(foreignKeyValidations);
  }

  private async validateForeignKeyExists(
    db: DatabaseConnection,
    table: string,
    column: string,
    value: any
  ): Promise<void> {
    const cacheKey = `fk_${table}_${column}_${value}`;
    const sql = `SELECT 1 FROM ${table} WHERE ${column} = $1 LIMIT 1`;
    
    const result = await this.executeOptimizedQuery(db, sql, [value], cacheKey);
    
    if (!result || result.length === 0) {
      throw new Error(`Foreign key violation: ${value} not found in ${table}.${column}`);
    }
  }

  // Clean expired cache entries
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.queryCache.delete(key);
      }
    }
  }

  // Database performance optimization recommendations
  async analyzePerformance(db: DatabaseConnection): Promise<{
    recommendations: string[];
    slowQueries: Array<{ query: string; avgDuration: number; count: number }>;
    indexSuggestions: string[];
  }> {
    const recommendations: string[] = [];
    const slowQueries: Array<{ query: string; avgDuration: number; count: number }> = [];
    const indexSuggestions: string[] = [];
    
    try {
      // Analyze table statistics (PostgreSQL specific)
      const tableStats = await db.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `);
      
      // Check for tables with high dead tuple ratio
      for (const table of tableStats) {
        const deadRatio = table.dead_tuples / (table.live_tuples + table.dead_tuples);
        if (deadRatio > 0.1) {
          recommendations.push(
            `Table ${table.tablename} has ${(deadRatio * 100).toFixed(1)}% dead tuples. Consider running VACUUM ANALYZE.`
          );
        }
      }
      
      // Analyze missing indexes
      const missingIndexes = await db.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE schemaname = 'public'
        AND n_distinct > 100
        AND correlation < 0.1
      `);
      
      for (const index of missingIndexes) {
        indexSuggestions.push(
          `CREATE INDEX idx_${index.tablename}_${index.attname} ON ${index.tablename} (${index.attname});`
        );
      }
      
      // Check for unused indexes
      const unusedIndexes = await db.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND schemaname = 'public'
      `);
      
      for (const index of unusedIndexes) {
        recommendations.push(
          `Index ${index.indexname} on table ${index.tablename} is never used. Consider dropping it.`
        );
      }
      
    } catch (error) {
      console.warn('⚠️ Could not analyze database performance:', error);
      recommendations.push('Unable to analyze database performance. Ensure proper permissions.');
    }
    
    return {
      recommendations,
      slowQueries,
      indexSuggestions
    };
  }

  // Health check for database schema
  async performHealthCheck(db: DatabaseConnection): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: Record<string, number>;
  }> {
    const issues: string[] = [];
    const metrics: Record<string, number> = {};
    
    try {
      // Check database connectivity
      const connectionTest = await db.query('SELECT 1');
      metrics.connection_status = connectionTest ? 1 : 0;
      
      // Check table existence
      const tables = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const expectedTables = ['events', 'guests', 'rsvp_responses', 'venues', 'relationship_types'];
      const existingTables = tables.map((t: any) => t.table_name);
      
      for (const expectedTable of expectedTables) {
        if (!existingTables.includes(expectedTable)) {
          issues.push(`Missing required table: ${expectedTable}`);
        }
      }
      
      metrics.table_count = existingTables.length;
      metrics.required_tables_present = expectedTables.filter(t => existingTables.includes(t)).length;
      
      // Check for orphaned records
      if (existingTables.includes('guests') && existingTables.includes('events')) {
        const orphanedGuests = await db.query(`
          SELECT COUNT(*) as count
          FROM guests g
          LEFT JOIN events e ON g.event_id = e.id
          WHERE e.id IS NULL
        `);
        metrics.orphaned_guests = parseInt(orphanedGuests[0]?.count || '0');
        
        if (metrics.orphaned_guests > 0) {
          issues.push(`Found ${metrics.orphaned_guests} orphaned guest records`);
        }
      }
      
      // Determine overall health status
      const status = issues.length === 0 ? 'healthy' : 
                    issues.some(i => i.includes('Missing required table')) ? 'critical' : 'warning';
      
      return { status, issues, metrics };
      
    } catch (error) {
      issues.push(`Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { status: 'critical', issues, metrics };
    }
  }
}

// Database optimization utilities
export class DatabaseOptimizer {
  private db: DatabaseConnection;
  private validationService: SchemaValidationService;

  constructor(db: DatabaseConnection, validationService: SchemaValidationService) {
    this.db = db;
    this.validationService = validationService;
  }

  // Create recommended indexes
  async createRecommendedIndexes(): Promise<string[]> {
    const indexQueries = [
      // Events table indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_date ON events (event_date)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_status ON events (status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_venue ON events (venue_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_couple ON events (couple_id)',
      
      // Guests table indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guests_event ON guests (event_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guests_status ON guests (status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guests_email ON guests (email) WHERE email IS NOT NULL',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guests_relationship ON guests (relationship_type_id)',
      
      // RSVP responses indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rsvp_guest ON rsvp_responses (guest_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rsvp_event ON rsvp_responses (event_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rsvp_ceremony ON rsvp_responses (ceremony_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rsvp_attendance ON rsvp_responses (attendance)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rsvp_date ON rsvp_responses (response_date)',
      
      // Composite indexes for common queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guests_event_status ON guests (event_id, status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rsvp_event_attendance ON rsvp_responses (event_id, attendance)'
    ];

    const createdIndexes: string[] = [];

    for (const indexQuery of indexQueries) {
      try {
        await this.db.query(indexQuery);
        createdIndexes.push(indexQuery);
        console.log(`✅ Created index: ${indexQuery.split(' ')[7]}`);
      } catch (error) {
        console.warn(`⚠️ Failed to create index: ${indexQuery}`, error);
      }
    }

    return createdIndexes;
  }

  // Update table statistics
  async updateStatistics(): Promise<void> {
    const tables = ['events', 'guests', 'rsvp_responses', 'venues', 'relationship_types'];
    
    for (const table of tables) {
      try {
        await this.db.query(`ANALYZE ${table}`);
        console.log(`✅ Updated statistics for table: ${table}`);
      } catch (error) {
        console.warn(`⚠️ Failed to update statistics for table: ${table}`, error);
      }
    }
  }

  // Vacuum and reindex
  async performMaintenance(): Promise<void> {
    try {
      console.log('🧹 Starting database maintenance...');
      
      // Vacuum analyze all tables
      await this.db.query('VACUUM ANALYZE');
      console.log('✅ Completed VACUUM ANALYZE');
      
      // Reindex if needed (careful in production)
      if (process.env.NODE_ENV !== 'production') {
        await this.db.query('REINDEX DATABASE CONCURRENTLY');
        console.log('✅ Completed REINDEX');
      }
      
      console.log('✅ Database maintenance completed');
    } catch (error) {
      console.error('❌ Database maintenance failed:', error);
      throw error;
    }
  }
}

// Default configuration
export const defaultSchemaValidationConfig: SchemaValidationConfig = {
  enforceConstraints: true,
  validateForeignKeys: true,
  optimizeQueries: true,
  enableCaching: true,
  logSlowQueries: true,
  slowQueryThreshold: 1000 // 1 second
};

// Export singleton instances
export const schemaValidationService = new SchemaValidationService(defaultSchemaValidationConfig);

// Initialization function
export function initializeDatabaseValidation() {
  console.log('🔍 Database schema validation system initialized');
  console.log('   - Schema validation enabled');
  console.log('   - Foreign key validation enabled');
  console.log('   - Query optimization enabled');
  console.log('   - Query caching enabled');
  console.log(`   - Slow query threshold: ${defaultSchemaValidationConfig.slowQueryThreshold}ms`);
}