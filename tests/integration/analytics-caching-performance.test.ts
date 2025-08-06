import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';

// Analytics Caching Performance Tests for Ver4 Implementation
describe('Analytics Caching Performance', () => {
  let startTime: number;
  let mockEventId: string;

  beforeEach(async () => {
    startTime = performance.now();
    mockEventId = 'test-event-analytics';
  });

  afterEach(async () => {
    const duration = performance.now() - startTime;
    console.log(`Test completed in ${duration.toFixed(2)}ms`);
  });

  test('Enhanced analytics service implements Redis caching with fallback', async () => {
    // Test cache miss scenario (first request)
    const cacheMissStart = performance.now();
    const firstResponse = await fetch(`/api/analytics/dashboard/${mockEventId}`);
    const firstData = await firstResponse.json();
    const cacheMissTime = performance.now() - cacheMissStart;

    expect(firstResponse.status).toBe(200);
    expect(firstData).toBeDefined();
    expect(firstData.totalGuests).toBeDefined();
    expect(firstData.confirmedGuests).toBeDefined();
    expect(firstData.pendingGuests).toBeDefined();
    
    // First request should be slower (cache miss)
    expect(cacheMissTime).toBeGreaterThan(100); // Reasonable processing time

    // Test cache hit scenario (second request)
    const cacheHitStart = performance.now();
    const secondResponse = await fetch(`/api/analytics/dashboard/${mockEventId}`);
    const secondData = await secondResponse.json();
    const cacheHitTime = performance.now() - cacheHitStart;

    expect(secondResponse.status).toBe(200);
    expect(secondData).toEqual(firstData); // Data should be identical

    // Cache hit should be significantly faster
    expect(cacheHitTime).toBeLessThan(cacheMissTime * 0.3); // At least 70% faster
    expect(cacheHitTime).toBeLessThan(50); // Ver4 target: <50ms for cached responses
  });

  test('Cache invalidation works correctly when data changes', async () => {
    // Get initial cached data
    const initialResponse = await fetch(`/api/analytics/dashboard/${mockEventId}`);
    const initialData = await initialResponse.json();

    // Make a change that should invalidate cache (submit new RSVP)
    const rsvpData = {
      guestId: 'cache-test-guest',
      eventId: mockEventId,
      status: 'confirmed',
      submittedAt: new Date().toISOString()
    };

    const rsvpResponse = await fetch('/api/rsvp/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rsvpData)
    });

    expect(rsvpResponse.status).toBe(200);

    // Wait for cache invalidation processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get updated data (should trigger cache miss due to invalidation)
    const cacheMissStart = performance.now();
    const updatedResponse = await fetch(`/api/analytics/dashboard/${mockEventId}`);
    const updatedData = await updatedResponse.json();
    const cacheMissTime = performance.now() - cacheMissStart;

    expect(updatedResponse.status).toBe(200);
    
    // Data should be different (updated guest count)
    expect(updatedData.totalGuests).toBe(initialData.totalGuests + 1);
    expect(updatedData.confirmedGuests).toBe(initialData.confirmedGuests + 1);

    // Should be slower due to cache miss
    expect(cacheMissTime).toBeGreaterThan(100);

    // Next request should be fast again (cache hit)
    const cacheHitStart = performance.now();
    const cachedResponse = await fetch(`/api/analytics/dashboard/${mockEventId}`);
    const cachedData = await cachedResponse.json();
    const cacheHitTime = performance.now() - cacheHitStart;

    expect(cachedData).toEqual(updatedData);
    expect(cacheHitTime).toBeLessThan(50);
  });

  test('Fallback cache mechanism works when Redis is unavailable', async () => {
    // Simulate Redis failure by calling the fallback endpoint
    const fallbackResponse = await fetch(`/api/analytics/dashboard/${mockEventId}?force_fallback=true`);
    const fallbackData = await fallbackResponse.json();

    expect(fallbackResponse.status).toBe(200);
    expect(fallbackData).toBeDefined();
    expect(fallbackData.cacheSource).toBe('memory'); // Should indicate in-memory fallback

    // Performance should still be reasonable with fallback
    const fallbackStart = performance.now();
    const fallbackResponse2 = await fetch(`/api/analytics/dashboard/${mockEventId}?force_fallback=true`);
    const fallbackTime = performance.now() - fallbackStart;

    expect(fallbackResponse2.status).toBe(200);
    expect(fallbackTime).toBeLessThan(100); // Should still be fast with memory cache
  });

  test('Cache metrics and monitoring are collected', async () => {
    // Generate some cache activity
    for (let i = 0; i < 5; i++) {
      await fetch(`/api/analytics/dashboard/${mockEventId}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get cache metrics
    const metricsResponse = await fetch('/api/analytics/cache-metrics');
    const metrics = await metricsResponse.json();

    expect(metrics).toBeDefined();
    expect(metrics.totalRequests).toBeGreaterThan(0);
    expect(metrics.cacheHits).toBeGreaterThan(0);
    expect(metrics.cacheMisses).toBeGreaterThan(0);
    expect(metrics.redisCacheHits).toBeDefined();
    expect(metrics.fallbackCacheHits).toBeDefined();
    expect(metrics.avgResponseTime).toBeDefined();

    // Cache hit ratio should be reasonable
    const hitRatio = metrics.cacheHits / metrics.totalRequests;
    expect(hitRatio).toBeGreaterThan(0); // At least some cache hits
    expect(hitRatio).toBeLessThanOrEqual(1); // Not more than 100%

    // Average response time should meet Ver4 targets
    expect(metrics.avgResponseTime).toBeLessThan(200); // <200ms average
  });

  test('TTL (Time To Live) configuration works correctly', async () => {
    // Set a specific TTL for analytics data
    const ttlData = {
      eventId: mockEventId,
      ttlSeconds: 2 // Very short TTL for testing
    };

    const ttlResponse = await fetch('/api/analytics/set-cache-ttl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ttlData)
    });

    expect(ttlResponse.status).toBe(200);

    // Get initial data (cache miss)
    const firstResponse = await fetch(`/api/analytics/dashboard/${mockEventId}`);
    const firstData = await firstResponse.json();

    // Get data again immediately (cache hit)
    const cacheHitStart = performance.now();
    const secondResponse = await fetch(`/api/analytics/dashboard/${mockEventId}`);
    const cacheHitTime = performance.now() - cacheHitStart;

    expect(cacheHitTime).toBeLessThan(50); // Should be cached

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get data after TTL expiration (should be cache miss)
    const expiredStart = performance.now();
    const expiredResponse = await fetch(`/api/analytics/dashboard/${mockEventId}`);
    const expiredTime = performance.now() - expiredStart;

    expect(expiredResponse.status).toBe(200);
    expect(expiredTime).toBeGreaterThan(cacheHitTime * 2); // Should be slower than cache hit
  });

  test('Concurrent cache requests handle race conditions correctly', async () => {
    // Clear any existing cache
    await fetch(`/api/analytics/clear-cache/${mockEventId}`, {
      method: 'DELETE'
    });

    // Make multiple concurrent requests
    const concurrentRequests = Array.from({ length: 10 }, () => 
      fetch(`/api/analytics/dashboard/${mockEventId}`)
    );

    const startTime = performance.now();
    const responses = await Promise.all(concurrentRequests);
    const totalTime = performance.now() - startTime;

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // Get the response data
    const responseData = await Promise.all(
      responses.map(response => response.json())
    );

    // All responses should be identical (no race condition artifacts)
    const firstResponse = responseData[0];
    responseData.forEach(data => {
      expect(data.totalGuests).toBe(firstResponse.totalGuests);
      expect(data.confirmedGuests).toBe(firstResponse.confirmedGuests);
      expect(data.pendingGuests).toBe(firstResponse.pendingGuests);
    });

    // Total time should be reasonable (good caching under concurrency)
    expect(totalTime).toBeLessThan(2000); // <2s for 10 concurrent requests
  });

  test('Cache memory usage stays within reasonable bounds', async () => {
    // Generate cache data for multiple events
    const eventIds = Array.from({ length: 20 }, (_, i) => `test-event-${i}`);

    // Request analytics for each event
    for (const eventId of eventIds) {
      await fetch(`/api/analytics/dashboard/${eventId}`);
    }

    // Wait for cache population
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check cache statistics
    const cacheStatsResponse = await fetch('/api/analytics/cache-stats');
    const cacheStats = await cacheStatsResponse.json();

    expect(cacheStats).toBeDefined();
    expect(cacheStats.memoryUsage).toBeDefined();
    expect(cacheStats.entryCount).toBeDefined();
    expect(cacheStats.redisMemoryUsage).toBeDefined();

    // Memory usage should be reasonable
    expect(cacheStats.memoryUsage.mb).toBeLessThan(100); // <100MB for cache
    expect(cacheStats.entryCount).toBeGreaterThan(0);
    expect(cacheStats.entryCount).toBeLessThanOrEqual(eventIds.length);

    // Redis memory usage should be tracked
    if (cacheStats.redisAvailable) {
      expect(cacheStats.redisMemoryUsage.mb).toBeLessThan(50); // <50MB for Redis cache
    }
  });

  test('Cache warming strategy improves performance', async () => {
    // Clear existing cache
    await fetch('/api/analytics/clear-all-cache', {
      method: 'DELETE'
    });

    // Measure cold cache performance
    const coldStart = performance.now();
    const coldResponse = await fetch(`/api/analytics/dashboard/${mockEventId}`);
    const coldTime = performance.now() - coldStart;

    expect(coldResponse.status).toBe(200);

    // Warm the cache for multiple related queries
    const warmupResponse = await fetch(`/api/analytics/warm-cache/${mockEventId}`, {
      method: 'POST'
    });

    expect(warmupResponse.status).toBe(200);

    // Wait for warmup to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Measure warm cache performance for various analytics endpoints
    const endpoints = [
      `/api/analytics/dashboard/${mockEventId}`,
      `/api/analytics/guest-stats/${mockEventId}`,
      `/api/analytics/rsvp-trends/${mockEventId}`,
      `/api/analytics/accommodation-stats/${mockEventId}`
    ];

    const warmTimes: number[] = [];

    for (const endpoint of endpoints) {
      const warmStart = performance.now();
      const warmResponse = await fetch(endpoint);
      const warmTime = performance.now() - warmStart;

      expect(warmResponse.status).toBe(200);
      warmTimes.push(warmTime);
    }

    // All warm cache requests should be significantly faster
    const avgWarmTime = warmTimes.reduce((sum, time) => sum + time, 0) / warmTimes.length;
    expect(avgWarmTime).toBeLessThan(coldTime * 0.5); // At least 50% faster
    expect(avgWarmTime).toBeLessThan(100); // Ver4 target: <100ms for warmed cache
  });

  test('Cache invalidation patterns optimize performance', async () => {
    // Test selective cache invalidation
    await fetch(`/api/analytics/dashboard/${mockEventId}`); // Prime cache

    // Update guest data (should invalidate only related cache entries)
    const guestUpdate = {
      guestId: 'selective-cache-test',
      eventId: mockEventId,
      changes: {
        status: 'confirmed',
        dietaryRestrictions: 'vegetarian'
      }
    };

    const updateResponse = await fetch('/api/guests/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestUpdate)
    });

    expect(updateResponse.status).toBe(200);

    // Wait for selective invalidation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check cache status after selective invalidation
    const cacheStatusResponse = await fetch(`/api/analytics/cache-status/${mockEventId}`);
    const cacheStatus = await cacheStatusResponse.json();

    expect(cacheStatus).toBeDefined();
    expect(cacheStatus.dashboardCacheValid).toBe(false); // Should be invalidated
    expect(cacheStatus.selectiveInvalidation).toBe(true); // Should indicate selective strategy

    // Related but unaffected cache entries should remain valid
    if (cacheStatus.unrelatedCacheEntries) {
      expect(cacheStatus.unrelatedCacheEntries.valid).toBe(true);
    }
  });

  test('Performance benchmarks meet Ver4 requirements', async () => {
    const benchmarkResults: {
      scenario: string;
      responseTime: number;
      throughput?: number;
    }[] = [];

    // Benchmark 1: Cold cache performance
    await fetch(`/api/analytics/clear-cache/${mockEventId}`, { method: 'DELETE' });
    
    const coldStart = performance.now();
    const coldResponse = await fetch(`/api/analytics/dashboard/${mockEventId}`);
    const coldTime = performance.now() - coldStart;
    
    expect(coldResponse.status).toBe(200);
    benchmarkResults.push({ scenario: 'Cold Cache', responseTime: coldTime });

    // Benchmark 2: Warm cache performance
    const warmStart = performance.now();
    const warmResponse = await fetch(`/api/analytics/dashboard/${mockEventId}`);
    const warmTime = performance.now() - warmStart;
    
    expect(warmResponse.status).toBe(200);
    benchmarkResults.push({ scenario: 'Warm Cache', responseTime: warmTime });

    // Benchmark 3: Throughput test
    const throughputStart = performance.now();
    const throughputRequests = Array.from({ length: 20 }, () => 
      fetch(`/api/analytics/dashboard/${mockEventId}`)
    );
    
    const throughputResponses = await Promise.all(throughputRequests);
    const throughputTime = performance.now() - throughputStart;
    const throughput = throughputRequests.length / (throughputTime / 1000); // requests per second
    
    throughputResponses.forEach(response => {
      expect(response.status).toBe(200);
    });
    
    benchmarkResults.push({ 
      scenario: 'High Throughput', 
      responseTime: throughputTime / throughputRequests.length,
      throughput 
    });

    // Verify Ver4 performance requirements
    const coldCacheResult = benchmarkResults.find(r => r.scenario === 'Cold Cache');
    const warmCacheResult = benchmarkResults.find(r => r.scenario === 'Warm Cache');
    const throughputResult = benchmarkResults.find(r => r.scenario === 'High Throughput');

    // Ver4 Requirements:
    expect(coldCacheResult!.responseTime).toBeLessThan(500); // <500ms cold cache
    expect(warmCacheResult!.responseTime).toBeLessThan(50);  // <50ms warm cache
    expect(throughputResult!.throughput!).toBeGreaterThan(50); // >50 requests/second
    expect(throughputResult!.responseTime).toBeLessThan(100); // <100ms average under load

    console.log('Performance Benchmark Results:', benchmarkResults);
  });
});