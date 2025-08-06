/**
 * Advanced Compression Middleware
 * 
 * Intelligent compression middleware with:
 * - Multiple compression algorithms (gzip, brotli, deflate)
 * - Content-type aware compression
 * - Dynamic compression level adjustment
 * - Performance monitoring and optimization
 * - Bandwidth savings tracking
 */

import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { createGzip, createBrotliCompress, createDeflate, constants } from 'zlib';
import { Transform } from 'stream';

export interface CompressionConfig {
  // Algorithm settings
  algorithms: ('gzip' | 'br' | 'deflate')[];
  defaultAlgorithm: 'gzip' | 'br' | 'deflate';
  
  // Compression levels (1-9 for gzip/deflate, 1-11 for brotli)
  levels: {
    gzip: number;
    deflate: number;
    brotli: number;
  };
  
  // Dynamic compression settings
  enableDynamicLevel: boolean;
  dynamicThresholds: {
    small: { size: number; level: number }; // < 10KB
    medium: { size: number; level: number }; // 10KB - 100KB
    large: { size: number; level: number }; // > 100KB
  };
  
  // Filtering options
  threshold: number; // Minimum size to compress (bytes)
  filter: (req: Request, res: Response) => boolean;
  contentTypes: string[];
  excludeContentTypes: string[];
  
  // Performance settings
  chunkSize: number;
  windowBits: number;
  memLevel: number;
  
  // Features
  enableStatistics: boolean;
  enableCaching: boolean;
  enablePrecompression: boolean;
}

export interface CompressionStats {
  totalRequests: number;
  compressedRequests: number;
  compressionRatio: number;
  bytesOriginal: number;
  bytesCompressed: number;
  bytesSaved: number;
  avgCompressionTime: number;
  algorithmUsage: Record<string, number>;
  contentTypeStats: Record<string, {
    requests: number;
    originalSize: number;
    compressedSize: number;
    avgRatio: number;
  }>;
}

/**
 * Enhanced compression middleware class
 */
export class CompressionMiddleware {
  private config: CompressionConfig;
  private stats: CompressionStats;
  private startTime = Date.now();

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = {
      algorithms: ['br', 'gzip', 'deflate'],
      defaultAlgorithm: 'gzip',
      levels: {
        gzip: 6,
        deflate: 6,
        brotli: 6
      },
      enableDynamicLevel: true,
      dynamicThresholds: {
        small: { size: 10 * 1024, level: 1 }, // 10KB, fast compression
        medium: { size: 100 * 1024, level: 6 }, // 100KB, balanced
        large: { size: Infinity, level: 9 } // Large files, maximum compression
      },
      threshold: 1024, // 1KB minimum
      filter: this.defaultFilter,
      contentTypes: [
        'text/html',
        'text/css',
        'text/javascript',
        'text/xml',
        'text/plain',
        'application/javascript',
        'application/json',
        'application/xml',
        'application/rss+xml',
        'application/atom+xml',
        'image/svg+xml'
      ],
      excludeContentTypes: [
        'image/png',
        'image/jpg',
        'image/jpeg',
        'image/gif',
        'image/webp',
        'application/zip',
        'application/gzip',
        'application/x-7z-compressed'
      ],
      chunkSize: 16 * 1024, // 16KB chunks
      windowBits: 15,
      memLevel: 8,
      enableStatistics: true,
      enableCaching: false,
      enablePrecompression: false,
      ...config
    };

    this.stats = {
      totalRequests: 0,
      compressedRequests: 0,
      compressionRatio: 0,
      bytesOriginal: 0,
      bytesCompressed: 0,
      bytesSaved: 0,
      avgCompressionTime: 0,
      algorithmUsage: {},
      contentTypeStats: {}
    };

    // Initialize algorithm usage stats
    for (const algo of this.config.algorithms) {
      this.stats.algorithmUsage[algo] = 0;
    }
  }

  /**
   * Get the compression middleware function
   */
  getMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      this.handleRequest(req, res, next);
    };
  }

  /**
   * Handle compression for a request
   */
  private async handleRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Check if compression should be applied
    if (!this.shouldCompress(req, res)) {
      return next();
    }

    // Determine best compression algorithm
    const algorithm = this.selectAlgorithm(req);
    if (!algorithm) {
      return next();
    }

    // Set up compression tracking
    const startTime = Date.now();
    let originalSize = 0;
    let compressedSize = 0;
    const contentType = res.getHeader('content-type') as string || 'unknown';

    // Create compression transform stream
    const compressionStream = this.createCompressionStream(algorithm, originalSize);

    // Override response methods to track data
    const originalWrite = res.write;
    const originalEnd = res.end;
    const originalSend = res.send;

    let compressionApplied = false;

    // Intercept write method
    res.write = function(chunk: any, encoding?: any, callback?: any) {
      if (!compressionApplied) {
        return originalWrite.call(this, chunk, encoding, callback);
      }

      if (chunk) {
        originalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      }
      
      return originalWrite.call(this, chunk, encoding, callback);
    };

    // Intercept end method
    res.end = function(chunk?: any, encoding?: any, callback?: any) {
      if (chunk && compressionApplied) {
        originalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      }
      
      return originalEnd.call(this, chunk, encoding, callback);
    };

    // Intercept send method (for JSON responses)
    res.send = function(body?: any) {
      if (body && !compressionApplied) {
        const bodySize = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body);
        
        // Check if body is large enough to compress
        if (bodySize >= this.config.threshold) {
          compressionApplied = true;
          originalSize = bodySize;

          // Apply compression headers
          this.setCompressionHeaders(algorithm);
          
          // Determine compression level dynamically
          const level = this.config.enableDynamicLevel 
            ? this.getDynamicLevel(algorithm, bodySize)
            : this.config.levels[algorithm];

          // Compress the body
          const compressed = this.compressSync(body, algorithm, level);
          compressedSize = compressed.length;

          // Update statistics
          this.updateStats(algorithm, contentType, originalSize, compressedSize, Date.now() - startTime);

          return originalSend.call(this, compressed);
        }
      }
      
      return originalSend.call(this, body);
    }.bind(this);

    next();
  }

  /**
   * Check if request/response should be compressed
   */
  private shouldCompress(req: Request, res: Response): boolean {
    // Update total requests
    if (this.config.enableStatistics) {
      this.stats.totalRequests++;
    }

    // Check custom filter
    if (!this.config.filter(req, res)) {
      return false;
    }

    // Check if client accepts compression
    const acceptEncoding = req.headers['accept-encoding'] as string || '';
    if (!this.config.algorithms.some(algo => acceptEncoding.includes(algo))) {
      return false;
    }

    // Check content type
    const contentType = res.getHeader('content-type') as string;
    if (contentType) {
      // Check excluded content types
      if (this.config.excludeContentTypes.some(type => contentType.includes(type))) {
        return false;
      }

      // Check included content types
      if (this.config.contentTypes.length > 0) {
        if (!this.config.contentTypes.some(type => contentType.includes(type))) {
          return false;
        }
      }
    }

    // Check if already compressed
    if (res.getHeader('content-encoding')) {
      return false;
    }

    return true;
  }

  /**
   * Select best compression algorithm based on client support and preferences
   */
  private selectAlgorithm(req: Request): string | null {
    const acceptEncoding = req.headers['accept-encoding'] as string || '';
    
    // Check algorithms in order of preference
    for (const algo of this.config.algorithms) {
      if (acceptEncoding.includes(algo === 'br' ? 'br' : algo)) {
        return algo;
      }
    }

    return null;
  }

  /**
   * Create compression stream for given algorithm
   */
  private createCompressionStream(algorithm: string, size: number): Transform {
    const level = this.config.enableDynamicLevel 
      ? this.getDynamicLevel(algorithm, size)
      : this.config.levels[algorithm];

    switch (algorithm) {
      case 'br':
        return createBrotliCompress({
          params: {
            [constants.BROTLI_PARAM_QUALITY]: level,
            [constants.BROTLI_PARAM_SIZE_HINT]: size
          }
        });
      
      case 'gzip':
        return createGzip({
          level,
          windowBits: this.config.windowBits,
          memLevel: this.config.memLevel,
          chunkSize: this.config.chunkSize
        });
      
      case 'deflate':
        return createDeflate({
          level,
          windowBits: this.config.windowBits,
          memLevel: this.config.memLevel,
          chunkSize: this.config.chunkSize
        });
      
      default:
        throw new Error(`Unsupported compression algorithm: ${algorithm}`);
    }
  }

  /**
   * Compress data synchronously
   */
  private compressSync(data: any, algorithm: string, level: number): Buffer {
    const input = Buffer.isBuffer(data) ? data : Buffer.from(data);

    switch (algorithm) {
      case 'br':
        const { brotliCompressSync } = require('zlib');
        return brotliCompressSync(input, {
          params: {
            [constants.BROTLI_PARAM_QUALITY]: level
          }
        });
      
      case 'gzip':
        const { gzipSync } = require('zlib');
        return gzipSync(input, { level });
      
      case 'deflate':
        const { deflateSync } = require('zlib');
        return deflateSync(input, { level });
      
      default:
        return input;
    }
  }

  /**
   * Set compression headers
   */
  private setCompressionHeaders(algorithm: string): void {
    // This would be called on the response object
    // Implementation depends on how this is integrated
  }

  /**
   * Get dynamic compression level based on content size
   */
  private getDynamicLevel(algorithm: string, size: number): number {
    const thresholds = this.config.dynamicThresholds;
    
    if (size < thresholds.small.size) {
      return Math.min(thresholds.small.level, this.config.levels[algorithm]);
    } else if (size < thresholds.medium.size) {
      return Math.min(thresholds.medium.level, this.config.levels[algorithm]);
    } else {
      return Math.min(thresholds.large.level, this.config.levels[algorithm]);
    }
  }

  /**
   * Update compression statistics
   */
  private updateStats(algorithm: string, contentType: string, originalSize: number, compressedSize: number, compressionTime: number): void {
    if (!this.config.enableStatistics) return;

    this.stats.compressedRequests++;
    this.stats.bytesOriginal += originalSize;
    this.stats.bytesCompressed += compressedSize;
    this.stats.bytesSaved += (originalSize - compressedSize);
    this.stats.algorithmUsage[algorithm]++;

    // Update average compression ratio
    this.stats.compressionRatio = this.stats.bytesOriginal > 0 
      ? (this.stats.bytesCompressed / this.stats.bytesOriginal)
      : 0;

    // Update average compression time
    const totalTime = this.stats.avgCompressionTime * (this.stats.compressedRequests - 1) + compressionTime;
    this.stats.avgCompressionTime = totalTime / this.stats.compressedRequests;

    // Update content type stats
    if (!this.stats.contentTypeStats[contentType]) {
      this.stats.contentTypeStats[contentType] = {
        requests: 0,
        originalSize: 0,
        compressedSize: 0,
        avgRatio: 0
      };
    }

    const ctStats = this.stats.contentTypeStats[contentType];
    ctStats.requests++;
    ctStats.originalSize += originalSize;
    ctStats.compressedSize += compressedSize;
    ctStats.avgRatio = ctStats.originalSize > 0 
      ? (ctStats.compressedSize / ctStats.originalSize) 
      : 0;
  }

  /**
   * Default filter function
   */
  private defaultFilter(req: Request, res: Response): boolean {
    // Don't compress responses that are already being handled by other compression
    if (res.getHeader('content-encoding')) {
      return false;
    }

    // Don't compress small responses (handled by threshold check)
    const contentLength = res.getHeader('content-length');
    if (contentLength && parseInt(contentLength as string) < 1024) {
      return false;
    }

    return true;
  }

  /**
   * Get compression statistics
   */
  getStats(): CompressionStats & { uptime: number } {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      compressedRequests: 0,
      compressionRatio: 0,
      bytesOriginal: 0,
      bytesCompressed: 0,
      bytesSaved: 0,
      avgCompressionTime: 0,
      algorithmUsage: {},
      contentTypeStats: {}
    };

    // Reinitialize algorithm usage stats
    for (const algo of this.config.algorithms) {
      this.stats.algorithmUsage[algo] = 0;
    }

    this.startTime = Date.now();
  }

  /**
   * Get compression efficiency report
   */
  getEfficiencyReport(): {
    overallSavings: string;
    compressionRate: string;
    avgCompressionRatio: string;
    topContentTypes: Array<{ type: string; savings: string; requests: number }>;
    algorithmPreference: Array<{ algorithm: string; usage: string }>;
  } {
    const totalSavings = ((this.stats.bytesSaved / (1024 * 1024))).toFixed(2);
    const compressionRate = ((this.stats.compressedRequests / this.stats.totalRequests) * 100).toFixed(1);
    const avgRatio = ((1 - this.stats.compressionRatio) * 100).toFixed(1);

    // Top content types by savings
    const topContentTypes = Object.entries(this.stats.contentTypeStats)
      .map(([type, stats]) => ({
        type,
        savings: ((stats.originalSize - stats.compressedSize) / (1024 * 1024)).toFixed(2),
        requests: stats.requests
      }))
      .sort((a, b) => parseFloat(b.savings) - parseFloat(a.savings))
      .slice(0, 5);

    // Algorithm usage
    const totalAlgoUsage = Object.values(this.stats.algorithmUsage).reduce((sum, count) => sum + count, 0);
    const algorithmPreference = Object.entries(this.stats.algorithmUsage)
      .map(([algorithm, count]) => ({
        algorithm,
        usage: totalAlgoUsage > 0 ? ((count / totalAlgoUsage) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => parseFloat(b.usage) - parseFloat(a.usage));

    return {
      overallSavings: `${totalSavings} MB`,
      compressionRate: `${compressionRate}%`,
      avgCompressionRatio: `${avgRatio}%`,
      topContentTypes,
      algorithmPreference
    };
  }
}

/**
 * Express.js compression middleware factory
 */
export function createCompressionMiddleware(config: Partial<CompressionConfig> = {}) {
  const compressionMiddleware = new CompressionMiddleware(config);
  
  // Return both the middleware function and the instance for stats access
  const middleware = compressionMiddleware.getMiddleware();
  (middleware as any).instance = compressionMiddleware;
  
  return middleware;
}

/**
 * Pre-configured compression middleware for different use cases
 */
export const compressionPresets = {
  // Development: Fast compression for quick iterations
  development: createCompressionMiddleware({
    algorithms: ['gzip'],
    levels: { gzip: 1, deflate: 1, brotli: 1 },
    enableDynamicLevel: false,
    threshold: 2048
  }),

  // Production: Balanced compression for performance
  production: createCompressionMiddleware({
    algorithms: ['br', 'gzip', 'deflate'],
    levels: { gzip: 6, deflate: 6, brotli: 6 },
    enableDynamicLevel: true,
    enableStatistics: true,
    threshold: 1024
  }),

  // High-performance: Maximum compression for bandwidth-constrained environments
  highPerformance: createCompressionMiddleware({
    algorithms: ['br', 'gzip'],
    levels: { gzip: 9, deflate: 9, brotli: 11 },
    enableDynamicLevel: true,
    dynamicThresholds: {
      small: { size: 5 * 1024, level: 6 },
      medium: { size: 50 * 1024, level: 9 },
      large: { size: Infinity, level: 11 }
    },
    enableStatistics: true,
    threshold: 512
  }),

  // API-focused: Optimized for JSON/XML API responses
  api: createCompressionMiddleware({
    algorithms: ['br', 'gzip'],
    contentTypes: [
      'application/json',
      'application/xml',
      'text/xml',
      'application/javascript'
    ],
    levels: { gzip: 6, deflate: 6, brotli: 8 },
    enableDynamicLevel: true,
    threshold: 256
  })
};

export default CompressionMiddleware;