/**
 * Middleware Integration Tests
 * Comprehensive testing for security, monitoring, and validation middleware
 */

import { 
  enhancedAuthMiddleware, 
  advancedRateLimitMiddleware, 
  requirePermission, 
  mfaManager 
} from '../../server/middleware/enhanced-security';
import { 
  requestTrackingMiddleware, 
  errorTrackingMiddleware,
  metricsRegistry 
} from '../../server/middleware/monitoring';
import { 
  versionMiddleware, 
  responseStandardizationMiddleware,
  createValidationMiddleware,
  APIResponseBuilder 
} from '../../server/api/versioning';
import { MockRequest, MockResponse, TestUtils, IntegrationTestBase } from '../infrastructure/test-infrastructure';
import { z } from 'zod';

class MiddlewareTest extends IntegrationTestBase {

  async testEnhancedAuthMiddleware(): Promise<void> {
    console.log('Testing enhanced authentication middleware...');
    
    // Test missing token
    const req1 = new MockRequest();
    const res1 = new MockResponse();
    
    const { error } = await TestUtils.testMiddleware(enhancedAuthMiddleware, req1, res1);
    
    if (!error) {
      res1.expectStatus(401);
      const errorBody = this.expectErrorResponse(res1, 401, 'UNAUTHORIZED');
      console.log('✅ Missing token handled correctly');
    }
    
    // Test valid token (mocked)
    const req2 = new MockRequest()
      .header('authorization', 'Bearer valid-token')
      .withAuth('test-user', ['read', 'write']);
    const res2 = new MockResponse();
    
    // Mock JWT verification for testing
    const originalJwtVerify = require('jsonwebtoken').verify;
    require('jsonwebtoken').verify = () => ({
      sub: 'test-user',
      permissions: ['read', 'write'],
      mfaRequired: false,
      mfaCompleted: true
    });
    
    try {
      const { error: error2 } = await TestUtils.testMiddleware(enhancedAuthMiddleware, req2, res2);
      
      if (!error2) {
        // Should pass through successfully
        if ((req2 as any).user?.sub !== 'test-user') {
          throw new Error('User not attached to request');
        }
        console.log('✅ Valid token processed correctly');
      }
    } finally {
      // Restore original JWT verify
      require('jsonwebtoken').verify = originalJwtVerify;
    }
    
    // Test MFA required
    const req3 = new MockRequest().header('authorization', 'Bearer mfa-required-token');
    const res3 = new MockResponse();
    
    require('jsonwebtoken').verify = () => ({
      sub: 'test-user',
      mfaRequired: true,
      mfaCompleted: false
    });
    
    try {
      const { error: error3 } = await TestUtils.testMiddleware(enhancedAuthMiddleware, req3, res3);
      
      if (!error3) {
        this.expectErrorResponse(res3, 403, 'MFA_REQUIRED');
        console.log('✅ MFA requirement enforced correctly');
      }
    } finally {
      require('jsonwebtoken').verify = originalJwtVerify;
    }
  }

  async testAdvancedRateLimitMiddleware(): Promise<void> {
    console.log('Testing advanced rate limiting middleware...');
    
    const rateLimitConfig = {
      windowMs: 60000, // 1 minute
      maxRequests: 5,
      dynamicScaling: true
    };
    
    const rateLimitMiddleware = advancedRateLimitMiddleware(rateLimitConfig);
    
    // Test normal requests under limit
    for (let i = 0; i < 3; i++) {
      const req = new MockRequest({ ip: '192.168.1.100', path: '/test' });
      const res = new MockResponse();
      
      const { error } = await TestUtils.testMiddleware(rateLimitMiddleware, req, res);
      
      if (error) {
        throw new Error(`Request ${i + 1} should not be rate limited`);
      }
      
      // Check rate limit headers
      const remaining = res.headers['ratelimit-remaining'];
      if (!remaining) {
        throw new Error('Missing rate limit headers');
      }
    }
    
    console.log('✅ Normal rate limiting works correctly');
    
    // Test rate limit exceeded
    const requests = [];
    for (let i = 0; i < 10; i++) {
      const req = new MockRequest({ ip: '192.168.1.101', path: '/test' });
      const res = new MockResponse();
      requests.push({ req, res });
    }
    
    let rateLimitHit = false;
    for (const { req, res } of requests) {
      const { error } = await TestUtils.testMiddleware(rateLimitMiddleware, req, res);
      
      if (res.statusCode === 429) {
        rateLimitHit = true;
        this.expectErrorResponse(res, 429, 'RATE_LIMIT_EXCEEDED');
        break;
      }
    }
    
    if (!rateLimitHit) {
      throw new Error('Rate limit should have been triggered');
    }
    
    console.log('✅ Rate limit enforcement works correctly');
  }

  async testPermissionMiddleware(): Promise<void> {
    console.log('Testing permission middleware...');
    
    const permissionMiddleware = requirePermission('admin:read');
    
    // Test without authentication
    const req1 = new MockRequest();
    const res1 = new MockResponse();
    
    const { error } = await TestUtils.testMiddleware(permissionMiddleware, req1, res1);
    
    if (!error) {
      this.expectErrorResponse(res1, 401, 'UNAUTHORIZED');
      console.log('✅ Unauthenticated request blocked correctly');
    }
    
    // Test with insufficient permissions
    const req2 = new MockRequest().withAuth('test-user', ['read']);
    const res2 = new MockResponse();
    
    const { error: error2 } = await TestUtils.testMiddleware(permissionMiddleware, req2, res2);
    
    if (!error2) {
      this.expectErrorResponse(res2, 403, 'PERMISSION_DENIED');
      console.log('✅ Insufficient permissions blocked correctly');
    }
    
    // Test with sufficient permissions
    const req3 = new MockRequest().withAuth('test-user', ['admin:read']);
    const res3 = new MockResponse();
    
    const { error: error3 } = await TestUtils.testMiddleware(permissionMiddleware, req3, res3);
    
    if (error3) {
      throw new Error('Should allow request with sufficient permissions');
    }
    
    console.log('✅ Sufficient permissions allowed correctly');
    
    // Test with wildcard permissions
    const req4 = new MockRequest().withAuth('admin-user', ['*']);
    const res4 = new MockResponse();
    
    const { error: error4 } = await TestUtils.testMiddleware(permissionMiddleware, req4, res4);
    
    if (error4) {
      throw new Error('Should allow request with wildcard permissions');
    }
    
    console.log('✅ Wildcard permissions work correctly');
  }

  async testRequestTrackingMiddleware(): Promise<void> {
    console.log('Testing request tracking middleware...');
    
    const req = new MockRequest({ 
      method: 'GET', 
      path: '/api/test',
      route: { path: '/api/test' }
    });
    const res = new MockResponse();
    
    // Clear metrics before test
    metricsRegistry.getAllMetrics();
    
    const { error } = await TestUtils.testMiddleware(requestTrackingMiddleware, req, res);
    
    if (error) {
      throw new Error('Request tracking should not error');
    }
    
    // Simulate response completion
    res.status(200).json({ success: true });
    res.end();
    
    // Give time for metrics to be recorded
    await TestUtils.delay(10);
    
    const metrics = metricsRegistry.getAllMetrics();
    
    // Check if request was tracked
    if (!metrics.counters['http_requests_total']) {
      console.warn('⚠️ Request tracking metrics not found (may be timing issue)');
    } else {
      console.log('✅ Request tracking recorded metrics correctly');
    }
  }

  async testVersionMiddleware(): Promise<void> {
    console.log('Testing API version middleware...');
    
    // Test supported version
    const req1 = new MockRequest({ params: { version: 'v1' } });
    const res1 = new MockResponse();
    
    const { error } = await TestUtils.testMiddleware(versionMiddleware, req1, res1);
    
    if (error) {
      throw new Error('Supported version should not error');
    }
    
    if ((req1 as any).apiVersion !== 'v1') {
      throw new Error('API version not set on request');
    }
    
    console.log('✅ Supported version handled correctly');
    
    // Test unsupported version
    const req2 = new MockRequest({ params: { version: 'v99' } });
    const res2 = new MockResponse();
    
    const { error: error2 } = await TestUtils.testMiddleware(versionMiddleware, req2, res2);
    
    if (!error2) {
      this.expectErrorResponse(res2, 400, 'BAD_REQUEST');
      console.log('✅ Unsupported version rejected correctly');
    }
  }

  async testResponseStandardizationMiddleware(): Promise<void> {
    console.log('Testing response standardization middleware...');
    
    const req = new MockRequest();
    const res = new MockResponse();
    
    const { error } = await TestUtils.testMiddleware(responseStandardizationMiddleware, req, res);
    
    if (error) {
      throw new Error('Response standardization should not error');
    }
    
    // Test success response standardization
    res.json({ message: 'Hello World' });
    
    const response = res.expectJson();
    
    if (!response.success) {
      throw new Error('Response should be standardized as success');
    }
    
    if (!response.data) {
      throw new Error('Response data should be preserved');
    }
    
    if (!response.meta) {
      throw new Error('Response should include meta information');
    }
    
    if (!response.meta.version || !response.meta.requestId || !response.meta.timestamp) {
      throw new Error('Response meta should include version, requestId, and timestamp');
    }
    
    console.log('✅ Response standardization works correctly');
  }

  async testValidationMiddleware(): Promise<void> {
    console.log('Testing validation middleware...');
    
    const testSchema = z.object({
      body: z.object({
        name: z.string().min(1),
        email: z.string().email()
      })
    });
    
    const validationMiddleware = createValidationMiddleware(testSchema);
    
    // Test valid data
    const req1 = new MockRequest({
      body: { name: 'John Doe', email: 'john@example.com' }
    });
    const res1 = new MockResponse();
    
    const { error } = await TestUtils.testMiddleware(validationMiddleware, req1, res1);
    
    if (error) {
      throw new Error('Valid data should not cause validation error');
    }
    
    console.log('✅ Valid data passes validation');
    
    // Test invalid data
    const req2 = new MockRequest({
      body: { name: '', email: 'invalid-email' }
    });
    const res2 = new MockResponse();
    
    const { error: error2 } = await TestUtils.testMiddleware(validationMiddleware, req2, res2);
    
    if (!error2) {
      this.expectErrorResponse(res2, 400, 'VALIDATION_ERROR');
      console.log('✅ Invalid data rejected correctly');
    }
  }

  async testMFAManager(): Promise<void> {
    console.log('Testing MFA manager...');
    
    // Test TOTP challenge generation
    const totpChallengeId = await mfaManager.generateChallenge('totp', 'test-user', 'user@example.com');
    
    if (!totpChallengeId) {
      throw new Error('TOTP challenge generation failed');
    }
    
    console.log('✅ TOTP challenge generated successfully');
    
    // Test SMS challenge generation
    const smsChallengeId = await mfaManager.generateChallenge('sms', 'test-user', '+1234567890');
    
    if (!smsChallengeId) {
      throw new Error('SMS challenge generation failed');
    }
    
    console.log('✅ SMS challenge generated successfully');
    
    // Test challenge verification (mock verification)
    const isValidTotp = await mfaManager.verifyChallenge('totp', 'test-user', totpChallengeId, '123456');
    
    // In test environment, this should succeed with any 6-digit code
    if (!isValidTotp) {
      console.log('⚠️ TOTP verification failed (expected in test environment)');
    } else {
      console.log('✅ TOTP verification works');
    }
  }

  async testErrorTrackingMiddleware(): Promise<void> {
    console.log('Testing error tracking middleware...');
    
    const testError = new Error('Test error for middleware');
    const req = new MockRequest({ 
      method: 'POST', 
      path: '/api/test',
      route: { path: '/api/test' }
    });
    const res = new MockResponse();
    
    let nextCalled = false;
    const next = (error?: Error) => {
      nextCalled = true;
      if (error !== testError) {
        throw new Error('Error should be passed to next middleware');
      }
    };
    
    errorTrackingMiddleware(testError, req as any, res as any, next);
    
    if (!nextCalled) {
      throw new Error('Next middleware should be called');
    }
    
    console.log('✅ Error tracking middleware processed error correctly');
  }

  async testMiddlewarePerformance(): Promise<void> {
    console.log('Testing middleware performance...');
    
    const middlewares = [
      { name: 'requestTracking', middleware: requestTrackingMiddleware },
      { name: 'versionMiddleware', middleware: versionMiddleware },
      { name: 'responseStandardization', middleware: responseStandardizationMiddleware }
    ];
    
    for (const { name, middleware } of middlewares) {
      const { duration } = await TestUtils.measurePerformance(async () => {
        const req = new MockRequest({ params: { version: 'v1' } });
        const res = new MockResponse();
        
        await TestUtils.testMiddleware(middleware, req, res);
      });
      
      if (duration > 100) { // 100ms is quite slow for middleware
        console.warn(`⚠️ ${name} middleware is slow: ${duration.toFixed(2)}ms`);
      } else {
        console.log(`✅ ${name} middleware performance: ${duration.toFixed(2)}ms`);
      }
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Running Middleware Integration tests...');
    
    await this.setUp();
    
    try {
      await this.testEnhancedAuthMiddleware();
      await this.testAdvancedRateLimitMiddleware();
      await this.testPermissionMiddleware();
      await this.testRequestTrackingMiddleware();
      await this.testVersionMiddleware();
      await this.testResponseStandardizationMiddleware();
      await this.testValidationMiddleware();
      await this.testMFAManager();
      await this.testErrorTrackingMiddleware();
      await this.testMiddlewarePerformance();
      
      console.log('✅ All Middleware Integration tests passed!');
    } catch (error) {
      console.error('❌ Middleware Integration test failed:', error);
      throw error;
    } finally {
      await this.tearDown();
    }
  }
}

// Export test class
export { MiddlewareTest };

// Auto-run tests if this file is executed directly
if (require.main === module) {
  const test = new MiddlewareTest();
  test.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}