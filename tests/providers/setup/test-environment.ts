/**
 * Provider Test Environment Setup
 * 
 * Sets up isolated test environments for provider testing with proper mocking
 * and cleanup to ensure tests don't interfere with each other.
 */

import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import type { MockedFunction } from 'vitest';

// Test database configurations
export const TEST_CONFIGS = {
  postgresql: {
    host: 'localhost',
    port: 5433, // Different port for tests
    database: 'rsvp_test',
    username: 'test_user',
    password: 'test_password',
    ssl: false,
    pool: { min: 1, max: 3 }
  },
  sqlite: {
    database: ':memory:', // In-memory database for tests
    options: { verbose: false }
  },
  supabase: {
    projectUrl: 'https://test-project.supabase.co',
    anonKey: 'test-anon-key',
    serviceRoleKey: 'test-service-role-key'
  },
  pocketbase: {
    baseUrl: 'http://localhost:8091', // Different port for tests
    adminEmail: 'test@example.com',
    adminPassword: 'test-password'
  },
  sendgrid: {
    apiKey: 'SG.test-api-key',
    fromEmail: 'test@example.com',
    sandbox: true
  },
  smtp: {
    host: 'localhost',
    port: 1025, // Test SMTP server port
    secure: false,
    auth: {
      user: 'test@example.com',
      pass: 'test-password'
    }
  },
  aws_s3: {
    bucket: 'test-bucket',
    region: 'us-east-1',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    endpoint: 'http://localhost:9000' // MinIO test server
  },
  local_storage: {
    basePath: './test-uploads',
    publicPath: '/test-uploads'
  }
};

// Mock implementations for external services
export const createProviderMocks = () => {
  return {
    // Database mocks
    pg: {
      Client: vi.fn().mockImplementation(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        end: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        on: vi.fn(),
        off: vi.fn()
      })),
      Pool: vi.fn().mockImplementation(() => ({
        connect: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
          release: vi.fn()
        }),
        end: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        on: vi.fn(),
        off: vi.fn()
      }))
    },

    // SQLite mock
    sqlite3: {
      Database: vi.fn().mockImplementation(() => ({
        all: vi.fn((sql, params, callback) => callback(null, [])),
        run: vi.fn((sql, params, callback) => callback(null, { lastID: 1, changes: 1 })),
        get: vi.fn((sql, params, callback) => callback(null, {})),
        close: vi.fn((callback) => callback(null)),
        serialize: vi.fn((callback) => callback()),
        parallelize: vi.fn((callback) => callback())
      }))
    },

    // Supabase mock
    supabase: {
      createClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          }),
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
          update: vi.fn().mockResolvedValue({ data: {}, error: null }),
          delete: vi.fn().mockResolvedValue({ data: {}, error: null })
        }),
        auth: {
          signUp: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
          signInWithPassword: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
          signOut: vi.fn().mockResolvedValue({ error: null }),
          getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null })
        },
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
            download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
            remove: vi.fn().mockResolvedValue({ data: [], error: null }),
            getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://test.com/file.jpg' } })
          })
        }
      })
    },

    // PocketBase mock
    pocketbase: vi.fn().mockImplementation(() => ({
      collection: vi.fn().mockReturnValue({
        getFullList: vi.fn().mockResolvedValue([]),
        getFirstListItem: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue(true),
        subscribe: vi.fn(),
        unsubscribe: vi.fn()
      }),
      admins: {
        authWithPassword: vi.fn().mockResolvedValue({ token: 'test-token' })
      },
      authStore: {
        token: 'test-token',
        model: { id: 'test-admin' },
        isValid: true
      }
    })),

    // Email service mocks
    nodemailer: {
      createTransport: vi.fn().mockReturnValue({
        sendMail: vi.fn().mockResolvedValue({
          messageId: 'test-message-id',
          accepted: ['test@example.com'],
          rejected: []
        }),
        verify: vi.fn().mockResolvedValue(true),
        close: vi.fn()
      })
    },

    sendgrid: {
      setApiKey: vi.fn(),
      send: vi.fn().mockResolvedValue([{
        statusCode: 202,
        body: '',
        headers: {}
      }])
    },

    // AWS S3 mock
    aws: {
      S3: vi.fn().mockImplementation(() => ({
        upload: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Location: 'https://test-bucket.s3.amazonaws.com/test-file.jpg',
            ETag: '"test-etag"',
            Key: 'test-file.jpg'
          })
        }),
        getObject: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Body: Buffer.from('test file content'),
            ContentType: 'image/jpeg'
          })
        }),
        deleteObject: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({})
        }),
        listObjects: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Contents: []
          })
        }),
        headBucket: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({})
        })
      }))
    },

    // File system mocks
    fs: {
      promises: {
        mkdir: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined),
        readFile: vi.fn().mockResolvedValue(Buffer.from('test content')),
        unlink: vi.fn().mockResolvedValue(undefined),
        stat: vi.fn().mockResolvedValue({
          size: 1024,
          isFile: () => true,
          isDirectory: () => false,
          mtime: new Date()
        }),
        access: vi.fn().mockResolvedValue(undefined)
      },
      createReadStream: vi.fn().mockReturnValue({
        pipe: vi.fn(),
        on: vi.fn(),
        destroy: vi.fn()
      }),
      createWriteStream: vi.fn().mockReturnValue({
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn(),
        destroy: vi.fn()
      })
    }
  };
};

// Test environment state
let mocks: ReturnType<typeof createProviderMocks>;
let originalEnv: NodeJS.ProcessEnv;

// Setup test environment
export const setupProviderTestEnvironment = () => {
  beforeAll(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
    
    // Create and setup mocks
    mocks = createProviderMocks();
    
    // Mock external modules
    vi.doMock('pg', () => mocks.pg);
    vi.doMock('sqlite3', () => mocks.sqlite3);
    vi.doMock('@supabase/supabase-js', () => mocks.supabase);
    vi.doMock('pocketbase', () => ({ default: mocks.pocketbase }));
    vi.doMock('nodemailer', () => mocks.nodemailer);
    vi.doMock('@sendgrid/mail', () => mocks.sendgrid);
    vi.doMock('aws-sdk', () => mocks.aws);
    vi.doMock('fs', () => mocks.fs);
  });

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any test-specific state
    vi.restoreAllMocks();
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Clean up mocks
    vi.clearAllMocks();
    vi.resetModules();
  });
};

// Utility functions for tests
export const waitForAsync = (ms: number = 0) => 
  new Promise(resolve => setTimeout(resolve, ms));

export const mockNetworkError = () => {
  const error = new Error('Network Error');
  (error as any).code = 'ECONNREFUSED';
  return error;
};

export const mockTimeoutError = () => {
  const error = new Error('Timeout Error');
  (error as any).code = 'ETIMEDOUT';
  return error;
};

export const mockAuthenticationError = () => {
  const error = new Error('Authentication failed');
  (error as any).code = 'AUTH_FAILED';
  return error;
};

// Database test utilities
export const createTestData = {
  event: (overrides = {}) => ({
    id: 'test-event-1',
    title: 'Test Wedding',
    description: 'A beautiful test wedding',
    date: new Date('2024-12-31'),
    location: 'Test Venue',
    maxGuests: 100,
    ...overrides
  }),

  guest: (overrides = {}) => ({
    id: 'test-guest-1',
    eventId: 'test-event-1',
    email: 'guest@example.com',
    name: 'Test Guest',
    rsvpStatus: 'pending',
    plusOnes: 0,
    ...overrides
  }),

  user: (overrides = {}) => ({
    id: 'test-user-1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'organizer',
    ...overrides
  })
};

// File upload test utilities
export const createTestFile = (options = {}) => {
  const defaults = {
    name: 'test-image.jpg',
    type: 'image/jpeg',
    size: 1024,
    content: 'test file content'
  };
  
  const config = { ...defaults, ...options };
  
  return new File([config.content], config.name, {
    type: config.type,
    lastModified: Date.now()
  });
};

// Export mocks for use in tests
export { mocks };

// Type definitions for test helpers
export interface TestProviderConfig {
  type: string;
  config: Record<string, any>;
  expectedResults?: Record<string, any>;
  shouldFail?: boolean;
  errorType?: string;
}

export interface TestCase {
  name: string;
  config: TestProviderConfig;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  assertions: (result: any) => void | Promise<void>;
}