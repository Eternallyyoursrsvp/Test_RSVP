/**
 * Vitest Configuration for Provider Tests
 * 
 * Specialized configuration for comprehensive provider testing with
 * optimized settings for different test types and environments.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment setup
    environment: 'node',
    setupFiles: [
      './setup/test-environment.ts',
      '../setup.ts'
    ],

    // Global test configuration
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    // Test execution settings
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    isolate: true,

    // Timeouts for different test types
    testTimeout: 30000,      // 30s for regular tests
    hookTimeout: 10000,      // 10s for setup/teardown hooks

    // Test file patterns
    include: [
      '**/*.test.ts',
      '**/*.spec.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**'
    ],

    // Coverage configuration
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'server/providers/**/*.ts',
        'server/services/**/*.ts'
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/node_modules/**',
        '**/coverage/**',
        '**/test-environment.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        },
        // Stricter thresholds for critical provider code
        'server/providers/core/**': {
          branches: 90,
          functions: 95,
          lines: 90,
          statements: 90
        }
      }
    },

    // Reporter configuration
    reporter: [
      'verbose',
      'json',
      'html'
    ],
    outputFile: {
      json: './test-results/provider-tests.json',
      html: './test-results/provider-tests.html'
    },

    // Retry configuration for flaky tests
    retry: {
      // Retry flaky tests up to 2 times
      integration: 2,
      e2e: 3,
      performance: 1,
      unit: 0
    },

    // Parallel execution for different test types
    sequence: {
      concurrent: true,
      shuffle: false, // Keep deterministic order for debugging
      hooks: 'parallel'
    },

    // Test type specific configurations
    workspace: [
      {
        // Unit tests - fast execution
        test: {
          name: 'unit',
          include: ['unit/**/*.test.ts'],
          testTimeout: 10000,
          threads: true,
          maxThreads: 8
        }
      },
      {
        // Integration tests - moderate timeouts
        test: {
          name: 'integration',
          include: ['integration/**/*.test.ts'],
          testTimeout: 45000,
          threads: true,
          maxThreads: 4
        }
      },
      {
        // Performance tests - longer timeouts, sequential
        test: {
          name: 'performance',
          include: ['performance/**/*.test.ts'],
          testTimeout: 120000,
          threads: false, // Sequential for accurate benchmarking
          maxThreads: 1
        }
      },
      {
        // End-to-end tests - longest timeouts
        test: {
          name: 'e2e',
          include: ['e2e/**/*.test.ts'],
          testTimeout: 180000,
          threads: true,
          maxThreads: 2
        }
      }
    ],

    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
      
      // Test database configurations
      TEST_DB_HOST: 'localhost',
      TEST_DB_PORT: '5433',
      TEST_DB_NAME: 'rsvp_test',
      TEST_DB_USER: 'test_user',
      TEST_DB_PASSWORD: 'test_password',
      
      // Test email configurations
      TEST_EMAIL_FROM: 'test@example.com',
      TEST_SENDGRID_API_KEY: 'SG.test-api-key',
      TEST_SMTP_HOST: 'localhost',
      TEST_SMTP_PORT: '1025',
      
      // Test storage configurations
      TEST_S3_BUCKET: 'test-bucket',
      TEST_S3_REGION: 'us-east-1',
      TEST_S3_ACCESS_KEY: 'test-access-key',
      TEST_S3_SECRET_KEY: 'test-secret-key',
      TEST_S3_ENDPOINT: 'http://localhost:9000',
      TEST_LOCAL_STORAGE_PATH: './test-uploads',
      
      // Performance testing flags
      VITEST_VERBOSE: process.env.CI ? 'false' : 'true',
      BENCHMARK_ENABLED: 'true'
    },

    // Conditional configurations based on environment
    ...(process.env.CI && {
      // CI-specific settings
      threads: false,
      maxThreads: 2,
      testTimeout: 60000,
      retry: 1,
      reporter: ['json', 'github-actions'],
      coverage: {
        reporter: ['lcov', 'text-summary']
      }
    }),

    // Development mode optimizations
    ...(process.env.NODE_ENV === 'development' && {
      watch: true,
      watchExclude: [
        '**/node_modules/**',
        '**/coverage/**',
        '**/test-results/**'
      ]
    })
  },

  // Resolve configuration for TypeScript paths
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../../'),
      '@server': path.resolve(__dirname, '../../../server'),
      '@client': path.resolve(__dirname, '../../../client'),
      '@tests': path.resolve(__dirname, '../'),
      '@providers': path.resolve(__dirname, '../../../server/providers'),
      '@services': path.resolve(__dirname, '../../../server/services')
    }
  },

  // Build optimization for tests
  esbuild: {
    target: 'node18',
    keepNames: true, // Preserve function names for better error messages
    sourcemap: true
  },

  // Plugin configuration
  plugins: [],

  // Define configuration for different test commands
  define: {
    // Feature flags for testing
    __TEST_MODE__: true,
    __MOCK_EXTERNAL_SERVICES__: true,
    __ENABLE_PERFORMANCE_TRACKING__: true,
    
    // Provider-specific test flags
    __TEST_DATABASE_PROVIDERS__: true,
    __TEST_EMAIL_PROVIDERS__: true,
    __TEST_STORAGE_PROVIDERS__: true,
    __TEST_AUTH_PROVIDERS__: true,
    
    // Integration test flags
    __TEST_PROVIDER_SWITCHING__: true,
    __TEST_FAILOVER__: true,
    __TEST_BACKUP_RESTORE__: true,
    
    // Performance test thresholds
    __PERFORMANCE_THRESHOLD_DB_QUERY__: 100,    // ms
    __PERFORMANCE_THRESHOLD_EMAIL_SEND__: 3000, // ms
    __PERFORMANCE_THRESHOLD_FILE_UPLOAD__: 5000, // ms
    
    // Test data limits
    __MAX_TEST_EVENTS__: 100,
    __MAX_TEST_GUESTS__: 1000,
    __MAX_TEST_FILES__: 50
  }
});