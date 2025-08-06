/**
 * Health API Integration Tests
 * Comprehensive testing for health monitoring endpoints
 */

import { createHealthAPI } from '../../server/api/health';
import { MockRequest, MockResponse, TestUtils, IntegrationTestBase } from '../infrastructure/test-infrastructure';
import { HealthStatus } from '../../server/services/provider-health-monitor';

class HealthAPITest extends IntegrationTestBase {
  private healthAPI = createHealthAPI();

  async testBasicHealthCheck(): Promise<void> {
    console.log('Testing basic health check...');
    
    const req = new MockRequest({ path: '/', method: 'GET' });
    const res = new MockResponse();
    
    // Mock the health endpoint
    const handler = this.healthAPI.stack.find(layer => layer.route?.path === '/')?.route?.stack[0]?.handle;
    
    if (handler) {
      await handler(req as any, res as any, () => {});
      
      // Should return success status
      if (res.statusCode !== 200 && res.statusCode !== 206 && res.statusCode !== 503) {
        throw new Error(`Unexpected status code: ${res.statusCode}`);
      }
      
      const body = res.expectJson();
      
      if (!body.success && res.statusCode < 400) {
        throw new Error('Expected success response for healthy service');
      }
      
      console.log(`✅ Basic health check returned status: ${res.statusCode}`);
    }
  }

  async testDetailedHealthCheck(): Promise<void> {
    console.log('Testing detailed health check...');
    
    const req = new MockRequest({ path: '/detailed', method: 'GET' });
    const res = new MockResponse();
    
    const handler = this.healthAPI.stack.find(layer => layer.route?.path === '/detailed')?.route?.stack[0]?.handle;
    
    if (handler) {
      await handler(req as any, res as any, () => {});
      
      const body = res.expectJson();
      
      // Verify response structure
      if (body.success && body.data) {
        const healthData = body.data;
        
        if (!healthData.system) {
          throw new Error('Missing system health data');
        }
        
        if (!healthData.providers) {
          throw new Error('Missing provider health data');
        }
        
        if (!healthData.timestamp) {
          throw new Error('Missing timestamp');
        }
        
        console.log(`✅ Detailed health check returned comprehensive data`);
      }
    }
  }

  async testReadinessProbe(): Promise<void> {
    console.log('Testing readiness probe...');
    
    const req = new MockRequest({ path: '/ready', method: 'GET' });
    const res = new MockResponse();
    
    const handler = this.healthAPI.stack.find(layer => layer.route?.path === '/ready')?.route?.stack[0]?.handle;
    
    if (handler) {
      await handler(req as any, res as any, () => {});
      
      const body = res.expectJson();
      
      if (res.statusCode === 200) {
        if (!body.success || !body.data?.ready) {
          throw new Error('Ready endpoint should indicate service is ready');
        }
        console.log('✅ Service is ready');
      } else if (res.statusCode === 503) {
        if (body.success) {
          throw new Error('Service not ready should return error response');
        }
        console.log('⚠️ Service is not ready (expected in test environment)');
      }
    }
  }

  async testLivenessProbe(): Promise<void> {
    console.log('Testing liveness probe...');
    
    const req = new MockRequest({ path: '/live', method: 'GET' });
    const res = new MockResponse();
    
    const handler = this.healthAPI.stack.find(layer => layer.route?.path === '/live')?.route?.stack[0]?.handle;
    
    if (handler) {
      await handler(req as any, res as any, () => {});
      
      // Liveness should always return 200 unless service is completely down
      res.expectStatus(200);
      const data = this.expectSuccessResponse(res);
      
      if (!data.alive) {
        throw new Error('Liveness probe should indicate service is alive');
      }
      
      if (typeof data.uptime !== 'number') {
        throw new Error('Missing uptime information');
      }
      
      if (!data.memory) {
        throw new Error('Missing memory information');
      }
      
      console.log(`✅ Service is alive (uptime: ${data.uptime}s)`);
    }
  }

  async testProviderHealthEndpoints(): Promise<void> {
    console.log('Testing provider health endpoints...');
    
    // Test all providers endpoint
    const req1 = new MockRequest({ path: '/providers', method: 'GET' });
    const res1 = new MockResponse();
    
    const providersHandler = this.healthAPI.stack.find(layer => layer.route?.path === '/providers')?.route?.stack[0]?.handle;
    
    if (providersHandler) {
      await providersHandler(req1 as any, res1 as any, () => {});
      
      const data = this.expectSuccessResponse(res1);
      
      if (!data.summary) {
        throw new Error('Missing provider summary');
      }
      
      if (!data.providers) {
        throw new Error('Missing provider details');
      }
      
      console.log(`✅ Provider health endpoint returned ${data.summary.totalProviders} providers`);
    }
    
    // Test individual provider endpoint (should handle not found gracefully)
    const req2 = new MockRequest({ 
      path: '/providers/nonexistent-provider', 
      method: 'GET',
      params: { providerId: 'nonexistent-provider' }
    });
    const res2 = new MockResponse();
    
    const providerHandler = this.healthAPI.stack.find(layer => 
      layer.route?.path === '/providers/:providerId'
    )?.route?.stack[0]?.handle;
    
    if (providerHandler) {
      await providerHandler(req2 as any, res2 as any, () => {});
      
      // Should return 404 for nonexistent provider
      this.expectErrorResponse(res2, 404, 'NOT_FOUND');
      
      console.log('✅ Provider not found handled correctly');
    }
  }

  async testPerformanceCharacteristics(): Promise<void> {
    console.log('Testing health endpoint performance...');
    
    const { result, duration } = await TestUtils.measurePerformance(async () => {
      const req = new MockRequest({ path: '/', method: 'GET' });
      const res = new MockResponse();
      
      const handler = this.healthAPI.stack.find(layer => layer.route?.path === '/')?.route?.stack[0]?.handle;
      
      if (handler) {
        await handler(req as any, res as any, () => {});
      }
      
      return res;
    });
    
    if (duration > 1000) { // 1 second
      console.warn(`⚠️ Health check took ${duration.toFixed(2)}ms (slow)`);
    } else {
      console.log(`✅ Health check completed in ${duration.toFixed(2)}ms`);
    }
    
    // Health checks should be fast
    if (duration > 5000) { // 5 seconds is too slow
      throw new Error(`Health check too slow: ${duration.toFixed(2)}ms`);
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Running Health API tests...');
    
    await this.setUp();
    
    try {
      await this.testBasicHealthCheck();
      await this.testDetailedHealthCheck();
      await this.testReadinessProbe();
      await this.testLivenessProbe();
      await this.testProviderHealthEndpoints();
      await this.testPerformanceCharacteristics();
      
      console.log('✅ All Health API tests passed!');
    } catch (error) {
      console.error('❌ Health API test failed:', error);
      throw error;
    } finally {
      await this.tearDown();
    }
  }
}

// Export test class and run function
export { HealthAPITest };

// Auto-run tests if this file is executed directly
if (require.main === module) {
  const test = new HealthAPITest();
  test.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}