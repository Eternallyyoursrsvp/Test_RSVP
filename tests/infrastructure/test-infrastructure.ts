/**
 * Comprehensive Testing Infrastructure
 * Provides testing utilities, fixtures, and integration testing support
 */

import { performance } from 'perf_hooks';
import { Request, Response, NextFunction } from 'express';
import { DatabaseConnection } from '../../server/database/schema-validation';
import { ProviderHealthMonitor, ProviderType, HealthStatus } from '../../server/services/provider-health-monitor';

// Test Database Interface
export interface TestDatabaseConnection extends DatabaseConnection {
  reset(): Promise<void>;
  seed(fixture: string): Promise<void>;
  cleanup(): Promise<void>;
}

// Mock Request/Response helpers
export class MockRequest {
  public params: Record<string, any> = {};
  public query: Record<string, any> = {};
  public body: Record<string, any> = {};
  public headers: Record<string, string> = {};
  public ip: string = '127.0.0.1';
  public path: string = '/';
  public method: string = 'GET';
  public route?: { path: string };

  constructor(overrides?: Partial<MockRequest>) {
    Object.assign(this, overrides);
  }

  get(header: string): string | undefined {
    return this.headers[header.toLowerCase()];
  }

  header(name: string, value: string): this {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  param(name: string, value: any): this {
    this.params[name] = value;
    return this;
  }

  queryParam(name: string, value: any): this {
    this.query[name] = value;
    return this;
  }

  withAuth(userId: string, permissions: string[] = []): this {
    this.headers['authorization'] = `Bearer fake-jwt-token`;
    (this as any).user = {
      sub: userId,
      permissions,
      mfaRequired: false,
      mfaCompleted: true
    };
    return this;
  }
}

export class MockResponse {
  public statusCode: number = 200;
  public headers: Record<string, string> = {};
  public body: any;
  private jsonCalled = false;
  private sendCalled = false;

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  json(data: any): this {
    this.body = data;
    this.jsonCalled = true;
    return this;
  }

  send(data: any): this {
    this.body = data;
    this.sendCalled = true;
    return this;
  }

  header(name: string, value: string): this {
    this.headers[name] = value;
    return this;
  }

  set(headers: Record<string, string>): this {
    Object.assign(this.headers, headers);
    return this;
  }

  sendStatus(code: number): this {
    this.statusCode = code;
    this.sendCalled = true;
    return this;
  }

  redirect(code: number, url: string): this {
    this.statusCode = code;
    this.headers['location'] = url;
    return this;
  }

  // Test helpers
  expectStatus(expectedStatus: number): void {
    if (this.statusCode !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${this.statusCode}`);
    }
  }

  expectJson(): any {
    if (!this.jsonCalled) {
      throw new Error('Expected json() to be called');
    }
    return this.body;
  }

  expectHeader(name: string, value?: string): string {
    const headerValue = this.headers[name];
    if (!headerValue) {
      throw new Error(`Expected header '${name}' to be set`);
    }
    if (value && headerValue !== value) {
      throw new Error(`Expected header '${name}' to be '${value}', got '${headerValue}'`);
    }
    return headerValue;
  }
}

// Test Database Implementation
export class TestDatabase implements TestDatabaseConnection {
  private data: Map<string, any[]> = new Map();
  private transactionDepth = 0;

  async query(sql: string, params: any[] = []): Promise<any> {
    // Simulate database latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
    
    // Mock implementation for common queries
    if (sql.includes('SELECT 1')) {
      return [{ '?column?': 1 }];
    }
    
    if (sql.includes('pg_isready')) {
      return [{ pg_isready: true }];
    }
    
    if (sql.includes('information_schema.tables')) {
      return [
        { table_name: 'events' },
        { table_name: 'guests' },
        { table_name: 'rsvp_responses' },
        { table_name: 'venues' },
        { table_name: 'relationship_types' }
      ];
    }
    
    // Mock health check queries
    if (sql.includes('pg_stat_user_tables')) {
      return [
        {
          schemaname: 'public',
          tablename: 'events',
          n_tup_ins: 100,
          n_tup_upd: 50,
          n_tup_del: 5,
          n_live_tup: 145,
          n_dead_tup: 10
        }
      ];
    }
    
    console.log(`Mock DB Query: ${sql.substring(0, 50)}...`);
    return [];
  }

  async transaction<T>(callback: (client: DatabaseConnection) => Promise<T>): Promise<T> {
    this.transactionDepth++;
    try {
      return await callback(this);
    } finally {
      this.transactionDepth--;
    }
  }

  async close(): Promise<void> {
    console.log('Mock database connection closed');
  }

  async reset(): Promise<void> {
    this.data.clear();
    console.log('Test database reset');
  }

  async seed(fixture: string): Promise<void> {
    const fixtures = testFixtures[fixture];
    if (!fixtures) {
      throw new Error(`Fixture '${fixture}' not found`);
    }
    
    for (const [table, records] of Object.entries(fixtures)) {
      this.data.set(table, [...records as any[]]);
    }
    
    console.log(`Seeded database with fixture: ${fixture}`);
  }

  async cleanup(): Promise<void> {
    await this.reset();
  }
}

// Test Fixtures
export const testFixtures: Record<string, Record<string, any[]>> = {
  basic: {
    events: [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Test Wedding',
        description: 'A beautiful test wedding',
        event_date: '2024-06-15T14:00:00Z',
        venue_id: '550e8400-e29b-41d4-a716-446655440010',
        couple_id: '550e8400-e29b-41d4-a716-446655440020',
        status: 'published',
        max_guests: 150,
        rsvp_deadline: '2024-05-15T23:59:59Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ],
    guests: [
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        event_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        relationship_type_id: '550e8400-e29b-41d4-a716-446655440030',
        group_id: null,
        dietary_restrictions: ['vegetarian'],
        accessibility_needs: null,
        plus_one_allowed: true,
        status: 'invited',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ],
    venues: [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        name: 'Grand Test Hall',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        postal_code: '12345',
        latitude: 40.7128,
        longitude: -74.0060,
        capacity: 200,
        amenities: ['parking', 'wifi', 'catering'],
        contact_info: {
          email: 'venue@example.com',
          phone: '+1234567890',
          website: 'https://venue.example.com'
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ],
    relationship_types: [
      {
        id: '550e8400-e29b-41d4-a716-446655440030',
        name: 'Friend',
        description: 'Close friend of the couple',
        priority: 5,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]
  },
  
  large: {
    events: Array.from({ length: 10 }, (_, i) => ({
      id: `550e8400-e29b-41d4-a716-${String(446655440001 + i).padStart(12, '0')}`,
      title: `Wedding Event ${i + 1}`,
      description: `Test wedding event number ${i + 1}`,
      event_date: new Date(2024, 5, 15 + i).toISOString(),
      venue_id: '550e8400-e29b-41d4-a716-446655440010',
      couple_id: '550e8400-e29b-41d4-a716-446655440020',
      status: 'published',
      max_guests: 100 + i * 10,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    })),
    
    guests: Array.from({ length: 100 }, (_, i) => ({
      id: `550e8400-e29b-41d4-a716-${String(446655441000 + i).padStart(12, '0')}`,
      event_id: '550e8400-e29b-41d4-a716-446655440001',
      name: `Guest ${i + 1}`,
      email: `guest${i + 1}@example.com`,
      phone: `+123456789${String(i).padStart(2, '0')}`,
      status: ['invited', 'confirmed', 'declined'][i % 3] as any,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }))
  }
};

// Mock Provider Health Monitor
export class MockProviderHealthMonitor extends ProviderHealthMonitor {
  private mockHealthStatuses: Map<string, HealthStatus> = new Map();
  
  setProviderHealth(providerId: string, status: HealthStatus): void {
    this.mockHealthStatuses.set(providerId, status);
  }
  
  async performHealthCheck(providerId: string): Promise<any> {
    const mockStatus = this.mockHealthStatuses.get(providerId) || HealthStatus.HEALTHY;
    const latency = Math.random() * 100;
    
    return {
      status: mockStatus,
      latency,
      timestamp: Date.now(),
      details: { mock: true }
    };
  }
}

// Test Utilities
export class TestUtils {
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static createTestEvent(overrides: Partial<any> = {}): any {
    return {
      id: this.generateUUID(),
      title: 'Test Event',
      description: 'A test event',
      event_date: new Date().toISOString(),
      venue_id: this.generateUUID(),
      couple_id: this.generateUUID(),
      status: 'published',
      max_guests: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  static createTestGuest(eventId: string, overrides: Partial<any> = {}): any {
    return {
      id: this.generateUUID(),
      event_id: eventId,
      name: 'Test Guest',
      email: 'test@example.com',
      status: 'invited',
      plus_one_allowed: false,
      dietary_restrictions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  static measurePerformance<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    return new Promise(async (resolve, reject) => {
      const startTime = performance.now();
      try {
        const result = await operation();
        const duration = performance.now() - startTime;
        resolve({ result, duration });
      } catch (error) {
        reject(error);
      }
    });
  }

  static async testMiddleware(
    middleware: (req: Request, res: Response, next: NextFunction) => void,
    req: MockRequest,
    res: MockResponse
  ): Promise<{ req: MockRequest; res: MockResponse; error?: Error }> {
    return new Promise((resolve) => {
      const next = (error?: Error) => {
        resolve({ req, res, error });
      };
      
      try {
        middleware(req as any, res as any, next);
      } catch (error) {
        resolve({ req, res, error: error as Error });
      }
    });
  }

  static expectThrows(operation: () => any, expectedMessage?: string): void {
    try {
      operation();
      throw new Error('Expected operation to throw, but it did not');
    } catch (error) {
      if (expectedMessage && !error.message.includes(expectedMessage)) {
        throw new Error(`Expected error message to contain '${expectedMessage}', got '${error.message}'`);
      }
      // Expected error, test passes
    }
  }

  static async expectThrowsAsync(operation: () => Promise<any>, expectedMessage?: string): Promise<void> {
    try {
      await operation();
      throw new Error('Expected operation to throw, but it did not');
    } catch (error) {
      if (expectedMessage && !error.message.includes(expectedMessage)) {
        throw new Error(`Expected error message to contain '${expectedMessage}', got '${error.message}'`);
      }
      // Expected error, test passes
    }
  }
}

// Integration Test Base Class
export abstract class IntegrationTestBase {
  protected db: TestDatabase;
  protected mockProviderMonitor: MockProviderHealthMonitor;

  constructor() {
    this.db = new TestDatabase();
    this.mockProviderMonitor = new MockProviderHealthMonitor();
  }

  async setUp(): Promise<void> {
    await this.db.reset();
    await this.db.seed('basic');
    
    // Setup mock providers
    this.mockProviderMonitor.setProviderHealth('supabase-auth', HealthStatus.HEALTHY);
    this.mockProviderMonitor.setProviderHealth('postgresql-db', HealthStatus.HEALTHY);
    this.mockProviderMonitor.setProviderHealth('whatsapp-api', HealthStatus.HEALTHY);
    
    console.log('Integration test setup completed');
  }

  async tearDown(): Promise<void> {
    await this.db.cleanup();
    console.log('Integration test teardown completed');
  }

  protected createAuthenticatedRequest(userId: string = 'test-user'): MockRequest {
    return new MockRequest().withAuth(userId, ['read', 'write']);
  }

  protected expectSuccessResponse(res: MockResponse): any {
    res.expectStatus(200);
    const body = res.expectJson();
    if (!body.success) {
      throw new Error(`Expected success response, got: ${JSON.stringify(body)}`);
    }
    return body.data;
  }

  protected expectErrorResponse(res: MockResponse, expectedStatus: number, expectedCode?: string): any {
    res.expectStatus(expectedStatus);
    const body = res.expectJson();
    if (body.success) {
      throw new Error(`Expected error response, got success: ${JSON.stringify(body)}`);
    }
    if (expectedCode && body.error?.code !== expectedCode) {
      throw new Error(`Expected error code '${expectedCode}', got '${body.error?.code}'`);
    }
    return body.error;
  }
}

// Performance Testing Utilities
export class PerformanceTestUtils {
  static async loadTest(
    operation: () => Promise<any>,
    options: {
      concurrent: number;
      duration: number; // seconds
      rampUp?: number; // seconds
    }
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    maxLatency: number;
    minLatency: number;
    requestsPerSecond: number;
  }> {
    const results: { success: boolean; latency: number }[] = [];
    const startTime = Date.now();
    const endTime = startTime + (options.duration * 1000);
    
    let activeRequests = 0;
    const maxConcurrent = options.concurrent;
    
    // Ramp up gradually if specified
    const rampUpMs = (options.rampUp || 0) * 1000;
    const rampUpInterval = rampUpMs / maxConcurrent;
    
    const executeRequest = async (): Promise<void> => {
      if (Date.now() >= endTime) return;
      
      activeRequests++;
      const requestStart = performance.now();
      
      try {
        await operation();
        const latency = performance.now() - requestStart;
        results.push({ success: true, latency });
      } catch (error) {
        const latency = performance.now() - requestStart;
        results.push({ success: false, latency });
      } finally {
        activeRequests--;
        
        // Schedule next request if still within test duration
        if (Date.now() < endTime && activeRequests < maxConcurrent) {
          setImmediate(executeRequest);
        }
      }
    };
    
    // Start initial concurrent requests with ramp-up
    for (let i = 0; i < maxConcurrent; i++) {
      setTimeout(executeRequest, i * rampUpInterval);
    }
    
    // Wait for test duration plus some buffer for pending requests
    await TestUtils.delay(options.duration * 1000 + 5000);
    
    // Wait for remaining requests to complete
    while (activeRequests > 0) {
      await TestUtils.delay(100);
    }
    
    // Calculate statistics
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.length - successfulRequests;
    const latencies = results.map(r => r.latency);
    
    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);
    const requestsPerSecond = results.length / options.duration;
    
    return {
      totalRequests: results.length,
      successfulRequests,
      failedRequests,
      averageLatency: Math.round(averageLatency * 100) / 100,
      maxLatency: Math.round(maxLatency * 100) / 100,
      minLatency: Math.round(minLatency * 100) / 100,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100
    };
  }
}

// Export singleton instances for easy use
export const testDb = new TestDatabase();
export const mockProviderMonitor = new MockProviderHealthMonitor();

console.log('✅ Test infrastructure initialized');
console.log('   - Mock Request/Response utilities available');
console.log('   - Test database with fixtures ready');
console.log('   - Integration test base class available');
console.log('   - Performance testing utilities ready');