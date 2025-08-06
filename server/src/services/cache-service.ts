/**
 * Cache Service
 * 
 * Comprehensive caching system supporting multiple backends:
 * - In-memory caching for development
 * - Redis for production
 * - Multi-tier caching with TTL and invalidation
 * - Cache warming and intelligent prefetching
 */

import { EventEmitter } from 'events';

export interface CacheConfig {
  // Cache backend configuration
  backend: 'memory' | 'redis' | 'hybrid';
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    maxRetriesPerRequest?: number;
    connectTimeout?: number;
  };
  
  // Cache behavior
  defaultTTL: number; // seconds
  maxMemoryMB?: number; // for memory backend
  compression?: boolean;
  serialization?: 'json' | 'msgpack';
  
  // Performance settings
  enableStatistics: boolean;
  enableWarmup: boolean;
  prefetchEnabled: boolean;
  
  // Cache tiers (for hybrid mode)
  tiers?: {
    l1: { backend: 'memory'; ttl: number; maxItems: number };
    l2: { backend: 'redis'; ttl: number };
  };
}

export interface CacheKey {
  key: string;
  tags?: string[];
  ttl?: number;
  namespace?: string;
}

export interface CacheEntry<T = unknown> {
  value: T;
  ttl: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  memory: {
    used: number;
    limit: number;
    percentage: number;
  };
  hitRate: number;
  avgResponseTime: number;
  totalKeys: number;
}

/**
 * Cache backend interface
 */
export interface ICacheBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  delByPattern(pattern: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  keys(pattern?: string): Promise<string[]>;
  clear(): Promise<void>;
  getStats(): Promise<Partial<CacheStats>>;
  close(): Promise<void>;
}

/**
 * Memory cache backend
 */
export class MemoryCacheBackend implements ICacheBackend {
  private cache = new Map<string, CacheEntry>();
  private timers = new Map<string, NodeJS.Timeout>();
  private stats: CacheStats;
  private maxMemory: number;

  constructor(maxMemoryMB = 100) {
    this.maxMemory = maxMemoryMB * 1024 * 1024; // Convert to bytes
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memory: { used: 0, limit: this.maxMemory, percentage: 0 },
      hitRate: 0,
      avgResponseTime: 0,
      totalKeys: 0
    };
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.createdAt + (entry.ttl * 1000)) {
      this.cache.delete(key);
      this.clearTimer(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl = 3600): Promise<boolean> {
    try {
      const size = this.estimateSize(value);
      
      // Check memory limits
      await this.ensureMemoryLimit(size);
      
      const entry: CacheEntry<T> = {
        value,
        ttl,
        createdAt: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        tags: [],
        size
      };

      this.cache.set(key, entry);
      this.stats.sets++;
      this.stats.totalKeys = this.cache.size;
      this.updateMemoryStats();

      // Set expiration timer
      this.setExpirationTimer(key, ttl);

      return true;
    } catch (error) {
      console.error('Memory cache set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    this.clearTimer(key);
    
    if (deleted) {
      this.stats.deletes++;
      this.stats.totalKeys = this.cache.size;
      this.updateMemoryStats();
    }
    
    return deleted;
  }

  async delByPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let deleted = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        await this.del(key);
        deleted++;
      }
    }
    
    return deleted;
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async keys(pattern = '*'): Promise<string[]> {
    if (pattern === '*') {
      return Array.from(this.cache.keys());
    }
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.stats.totalKeys = 0;
    this.updateMemoryStats();
  }

  async getStats(): Promise<Partial<CacheStats>> {
    this.stats.hitRate = this.stats.hits + this.stats.misses > 0 
      ? this.stats.hits / (this.stats.hits + this.stats.misses) 
      : 0;
    
    return { ...this.stats };
  }

  async close(): Promise<void> {
    await this.clear();
  }

  private setExpirationTimer(key: string, ttl: number): void {
    this.clearTimer(key);
    
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
      this.stats.totalKeys = this.cache.size;
      this.updateMemoryStats();
    }, ttl * 1000);
    
    this.timers.set(key, timer);
  }

  private clearTimer(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  private estimateSize(value: unknown): number {
    // Rough estimation of object size in bytes
    try {
      return JSON.stringify(value).length * 2; // UTF-16 characters
    } catch {
      return 1024; // Default size if can't serialize
    }
  }

  private async ensureMemoryLimit(newSize: number): Promise<void> {
    const currentMemory = this.stats.memory.used;
    
    if (currentMemory + newSize > this.maxMemory) {
      // Evict least recently used entries
      await this.evictLRU(currentMemory + newSize - this.maxMemory);
    }
  }

  private async evictLRU(bytesToEvict: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    let bytesEvicted = 0;
    
    for (const [key, entry] of entries) {
      if (bytesEvicted >= bytesToEvict) break;
      
      await this.del(key);
      bytesEvicted += entry.size;
      this.stats.evictions++;
    }
  }

  private updateMemoryStats(): void {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    
    this.stats.memory.used = totalSize;
    this.stats.memory.percentage = (totalSize / this.maxMemory) * 100;
  }
}

/**
 * Redis cache backend
 */
export class RedisCacheBackend implements ICacheBackend {
  private redis: any = null;
  private isConnected = false;
  private stats: Partial<CacheStats> = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };

  constructor(private config: Required<CacheConfig>['redis']) {}

  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    try {
      const Redis = await import('ioredis');
      
      this.redis = new Redis.default({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db || 0,
        keyPrefix: this.config.keyPrefix || 'rsvp:',
        maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
        connectTimeout: this.config.connectTimeout || 10000,
        lazyConnect: true
      });

      await this.redis.connect();
      this.isConnected = true;
      
      console.log('✅ Redis cache backend connected');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) await this.connect();
    
    try {
      const value = await this.redis.get(key);
      
      if (value === null) {
        this.stats.misses = (this.stats.misses || 0) + 1;
        return null;
      }
      
      this.stats.hits = (this.stats.hits || 0) + 1;
      return JSON.parse(value);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.isConnected) await this.connect();
    
    try {
      const serialized = JSON.stringify(value);
      
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      
      this.stats.sets = (this.stats.sets || 0) + 1;
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isConnected) await this.connect();
    
    try {
      const result = await this.redis.del(key);
      this.stats.deletes = (this.stats.deletes || 0) + 1;
      return result > 0;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }

  async delByPattern(pattern: string): Promise<number> {
    if (!this.isConnected) await this.connect();
    
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      const result = await this.redis.del(...keys);
      this.stats.deletes = (this.stats.deletes || 0) + result;
      return result;
    } catch (error) {
      console.error('Redis delByPattern error:', error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) await this.connect();
    
    try {
      const result = await this.redis.exists(key);
      return result > 0;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async keys(pattern = '*'): Promise<string[]> {
    if (!this.isConnected) await this.connect();
    
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      console.error('Redis keys error:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    if (!this.isConnected) await this.connect();
    
    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error('Redis clear error:', error);
    }
  }

  async getStats(): Promise<Partial<CacheStats>> {
    if (!this.isConnected) await this.connect();
    
    try {
      const info = await this.redis.info('memory');
      const lines = info.split('\r\n');
      const memoryInfo = lines.find(line => line.startsWith('used_memory:'));
      const memory = memoryInfo ? parseInt(memoryInfo.split(':')[1]) : 0;
      
      return {
        ...this.stats,
        memory: {
          used: memory,
          limit: 0,
          percentage: 0
        }
      };
    } catch (error) {
      return this.stats;
    }
  }

  async close(): Promise<void> {
    if (this.redis && this.isConnected) {
      await this.redis.quit();
      this.isConnected = false;
    }
  }
}

/**
 * Main cache service
 */
export class CacheService extends EventEmitter {
  private backend: ICacheBackend;
  private config: CacheConfig;
  private isInitialized = false;

  constructor(config: CacheConfig) {
    super();
    this.config = {
      defaultTTL: 3600,
      enableStatistics: true,
      enableWarmup: false,
      prefetchEnabled: false,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log(`🚀 Initializing cache service (${this.config.backend})...`);

    try {
      switch (this.config.backend) {
        case 'memory':
          this.backend = new MemoryCacheBackend(this.config.maxMemoryMB);
          break;
          
        case 'redis':
          if (!this.config.redis) {
            throw new Error('Redis configuration required for redis backend');
          }
          this.backend = new RedisCacheBackend(this.config.redis);
          if ('connect' in this.backend) {
            await (this.backend as RedisCacheBackend).connect();
          }
          break;
          
        case 'hybrid':
          // For now, fall back to memory
          this.backend = new MemoryCacheBackend(this.config.maxMemoryMB);
          break;
          
        default:
          throw new Error(`Unsupported cache backend: ${this.config.backend}`);
      }

      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('✅ Cache service initialized');
    } catch (error) {
      console.error('❌ Cache service initialization failed:', error);
      throw error;
    }
  }

  // Core cache operations
  async get<T>(key: string | CacheKey): Promise<T | null> {
    if (!this.isInitialized) await this.initialize();
    
    const cacheKey = typeof key === 'string' ? key : this.buildKey(key);
    return await this.backend.get<T>(cacheKey);
  }

  async set<T>(key: string | CacheKey, value: T, ttl?: number): Promise<boolean> {
    if (!this.isInitialized) await this.initialize();
    
    const cacheKey = typeof key === 'string' ? key : this.buildKey(key);
    const cacheTTL = ttl || (typeof key === 'object' ? key.ttl : undefined) || this.config.defaultTTL;
    
    return await this.backend.set(cacheKey, value, cacheTTL);
  }

  async del(key: string | CacheKey): Promise<boolean> {
    if (!this.isInitialized) await this.initialize();
    
    const cacheKey = typeof key === 'string' ? key : this.buildKey(key);
    return await this.backend.del(cacheKey);
  }

  async exists(key: string | CacheKey): Promise<boolean> {
    if (!this.isInitialized) await this.initialize();
    
    const cacheKey = typeof key === 'string' ? key : this.buildKey(key);
    return await this.backend.exists(cacheKey);
  }

  // Advanced operations
  async invalidateByTag(tag: string): Promise<number> {
    if (!this.isInitialized) await this.initialize();
    
    return await this.backend.delByPattern(`*:tag:${tag}:*`);
  }

  async invalidateByPattern(pattern: string): Promise<number> {
    if (!this.isInitialized) await this.initialize();
    
    return await this.backend.delByPattern(pattern);
  }

  async clear(): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    await this.backend.clear();
    this.emit('cleared');
  }

  // Wrapper for database queries with caching
  async wrap<T>(key: string | CacheKey, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttl);
    
    return result;
  }

  // Multi-get operation
  async mget<T>(keys: (string | CacheKey)[]): Promise<(T | null)[]> {
    const promises = keys.map(key => this.get<T>(key));
    return Promise.all(promises);
  }

  // Multi-set operation
  async mset<T>(entries: Array<{ key: string | CacheKey; value: T; ttl?: number }>): Promise<boolean[]> {
    const promises = entries.map(entry => this.set(entry.key, entry.value, entry.ttl));
    return Promise.all(promises);
  }

  // Statistics and monitoring
  async getStats(): Promise<CacheStats | Partial<CacheStats>> {
    if (!this.isInitialized) await this.initialize();
    
    return await this.backend.getStats();
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    if (!this.isInitialized) {
      return { status: 'unhealthy', details: { error: 'Not initialized' } };
    }

    try {
      const testKey = '__health_check__';
      const testValue = Date.now();
      
      await this.set(testKey, testValue, 10);
      const retrieved = await this.get<number>(testKey);
      await this.del(testKey);
      
      if (retrieved === testValue) {
        const stats = await this.getStats();
        return { 
          status: 'healthy', 
          details: { 
            backend: this.config.backend,
            stats
          } 
        };
      } else {
        return { status: 'unhealthy', details: { error: 'Cache read/write test failed' } };
      }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: { 
          error: (error as Error).message 
        } 
      };
    }
  }

  // Shutdown
  async shutdown(): Promise<void> {
    if (this.backend) {
      await this.backend.close();
    }
    this.isInitialized = false;
    this.emit('shutdown');
  }

  private buildKey(cacheKey: CacheKey): string {
    let key = cacheKey.key;
    
    if (cacheKey.namespace) {
      key = `${cacheKey.namespace}:${key}`;
    }
    
    if (cacheKey.tags && cacheKey.tags.length > 0) {
      const tagString = cacheKey.tags.sort().join(',');
      key = `${key}:tag:${tagString}`;
    }
    
    return key;
  }
}

// Global cache service instance
let globalCacheService: CacheService | null = null;

export function initializeCacheService(config: CacheConfig): CacheService {
  if (globalCacheService) {
    return globalCacheService;
  }

  globalCacheService = new CacheService(config);
  return globalCacheService;
}

export function getCacheService(): CacheService {
  if (!globalCacheService) {
    throw new Error('Cache service not initialized. Call initializeCacheService() first.');
  }
  return globalCacheService;
}

export async function shutdownCacheService(): Promise<void> {
  if (globalCacheService) {
    await globalCacheService.shutdown();
    globalCacheService = null;
  }
}