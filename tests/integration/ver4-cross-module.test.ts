import { test, expect } from '@playwright/test';
import { performance } from 'perf_hooks';

// Cross-module Integration Tests for Ver4 Implementation
test.describe('Ver4 Cross-module Integration', () => {
  let startTime: number;

  test.beforeEach(async ({ page }) => {
    startTime = performance.now();
    await page.goto('/admin/dashboard');
    
    // Wait for authentication
    await page.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    const duration = performance.now() - startTime;
    console.log(`Test completed in ${duration.toFixed(2)}ms`);
  });

  test('RSVP submission triggers comprehensive workflow', async ({ page, context }) => {
    // This test verifies the complete RSVP workflow as specified in the Ver4 workflow
    
    // Step 1: Monitor admin dashboard for real-time updates
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/dashboard');
    await adminPage.waitForSelector('[data-testid="notification-center"]');
    
    // Step 2: Create a guest RSVP submission
    await page.goto('/events/1/rsvp');
    
    // Fill RSVP form
    await page.fill('[data-testid="guest-name"]', 'John Doe');
    await page.fill('[data-testid="guest-email"]', 'john.doe@example.com');
    await page.selectOption('[data-testid="rsvp-status"]', 'confirmed');
    await page.fill('[data-testid="plus-one-name"]', 'Jane Doe');
    
    // Submit RSVP
    await page.click('[data-testid="submit-rsvp"]');
    
    // Step 3: Verify RSVP submission success
    await expect(page.locator('[data-testid="rsvp-success-message"]'))
      .toContainText('RSVP submitted successfully');
    
    // Step 4: Verify real-time notification in admin dashboard
    await expect(adminPage.locator('[data-testid="notification-alert"]'))
      .toContainText('New RSVP received from John Doe', { timeout: 5000 });
    
    // Step 5: Verify accommodation auto-assignment
    await adminPage.goto('/admin/accommodations');
    await adminPage.waitForSelector('[data-testid="accommodation-table"]');
    
    const accommodationRow = adminPage.locator(`[data-testid="guest-accommodation-John-Doe"]`);
    await expect(accommodationRow).toBeVisible({ timeout: 10000 });
    
    // Step 6: Verify transport group assignment
    await adminPage.goto('/admin/transport');
    await adminPage.waitForSelector('[data-testid="transport-table"]');
    
    const transportRow = adminPage.locator(`[data-testid="guest-transport-John-Doe"]`);
    await expect(transportRow).toBeVisible({ timeout: 10000 });
    
    // Step 7: Verify notifications were sent
    await adminPage.goto('/admin/notifications');
    await adminPage.waitForSelector('[data-testid="notifications-list"]');
    
    const notifications = adminPage.locator('[data-testid="notification-item"]');
    await expect(notifications.filter({ hasText: 'RSVP_RECEIVED' })).toBeVisible();
    await expect(notifications.filter({ hasText: 'ACCOMMODATION_ASSIGNED' })).toBeVisible();
    await expect(notifications.filter({ hasText: 'TRANSPORT_ASSIGNED' })).toBeVisible();
  });

  test('Admin user approval workflow with real-time updates', async ({ page, context }) => {
    // Open user management in admin dashboard
    await page.goto('/admin/users');
    await page.waitForSelector('[data-testid="user-management-table"]');
    
    // Create a pending user (simulate registration)
    await page.click('[data-testid="add-user-button"]');
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.selectOption('[data-testid="role-select"]', 'couple');
    await page.click('[data-testid="create-user-button"]');
    
    // Navigate to pending users tab
    await page.click('[data-testid="pending-users-tab"]');
    
    // Verify user appears in pending list
    await expect(page.locator('[data-testid="user-row-testuser"]')).toBeVisible();
    
    // Approve the user
    await page.click('[data-testid="approve-user-testuser"]');
    
    // Verify approval notification
    await expect(page.locator('[data-testid="notification-toast"]'))
      .toContainText('User approved successfully');
    
    // Verify user moved to approved users
    await page.click('[data-testid="approved-users-tab"]');
    await expect(page.locator('[data-testid="user-row-testuser"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-status-testuser"]'))
      .toContainText('Approved');
    
    // Verify real-time notification was sent
    const notificationCount = await page.locator('[data-testid="notification-badge"]').textContent();
    expect(parseInt(notificationCount || '0')).toBeGreaterThan(0);
  });

  test('WebSocket connection and real-time features', async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin/dashboard');
    
    // Verify WebSocket connection status
    await expect(page.locator('[data-testid="websocket-status"]'))
      .toContainText('Connected');
    
    // Test notification functionality
    await page.click('[data-testid="test-notification-button"]');
    
    // Verify test notification appears
    await expect(page.locator('[data-testid="notification-list"] >> text="Test Notification"'))
      .toBeVisible({ timeout: 5000 });
    
    // Verify metrics are updating
    const messagesSent = await page.locator('[data-testid="messages-sent-metric"]').textContent();
    expect(parseInt(messagesSent || '0')).toBeGreaterThan(0);
  });

  test('Analytics service with caching performance', async ({ page }) => {
    // Navigate to analytics dashboard
    await page.goto('/admin/analytics');
    await page.waitForSelector('[data-testid="analytics-dashboard"]');
    
    // Measure initial load time
    const startTime = performance.now();
    await page.click('[data-testid="refresh-analytics"]');
    await page.waitForSelector('[data-testid="analytics-loaded"]');
    const initialLoadTime = performance.now() - startTime;
    
    // Test cache hit performance
    const cacheStartTime = performance.now();
    await page.click('[data-testid="refresh-analytics"]');
    await page.waitForSelector('[data-testid="analytics-loaded"]');
    const cacheLoadTime = performance.now() - cacheStartTime;
    
    // Cache should be significantly faster
    expect(cacheLoadTime).toBeLessThan(initialLoadTime * 0.5);
    
    // Verify analytics data is displayed
    await expect(page.locator('[data-testid="total-guests-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmed-guests-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-guests-stat"]')).toBeVisible();
    
    // Test cache invalidation
    await page.click('[data-testid="invalidate-cache-button"]');
    await expect(page.locator('[data-testid="cache-invalidated-message"]'))
      .toContainText('Cache invalidated');
  });

  test('Performance requirements validation', async ({ page }) => {
    // Test page load performance
    const navigationStart = performance.now();
    await page.goto('/admin/dashboard');
    await page.waitForSelector('[data-testid="admin-dashboard"]');
    const navigationEnd = performance.now();
    
    const pageLoadTime = navigationEnd - navigationStart;
    
    // Ver4 requirement: <2s page load time
    expect(pageLoadTime).toBeLessThan(2000);
    
    // Test API response times
    const apiStart = performance.now();
    const response = await page.request.get('/api/admin/analytics/dashboard');
    const apiEnd = performance.now();
    
    const apiResponseTime = apiEnd - apiStart;
    
    // Ver4 requirement: <500ms API response
    expect(apiResponseTime).toBeLessThan(500);
    expect(response.status()).toBe(200);
    
    // Test WebSocket real-time latency
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:5000/ws/notifications');
        const startTime = performance.now();
        
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'PING' }));
        };
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'PONG') {
            const latency = performance.now() - startTime;
            // Ver4 requirement: <100ms real-time latency
            expect(latency).toBeLessThan(100);
            ws.close();
            resolve(latency);
          }
        };
      });
    });
  });

  test('Comprehensive error handling and recovery', async ({ page }) => {
    // Test API error handling
    await page.route('/api/admin/analytics/dashboard', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' })
      });
    });
    
    await page.goto('/admin/dashboard');
    
    // Verify error is handled gracefully
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Error loading dashboard');
    
    // Test recovery after error
    await page.unroute('/api/admin/analytics/dashboard');
    await page.click('[data-testid="retry-button"]');
    
    // Verify dashboard loads successfully after retry
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    
    // Test WebSocket disconnection and reconnection
    await page.evaluate(() => {
      // Simulate WebSocket disconnection
      window.dispatchEvent(new CustomEvent('websocket-disconnect'));
    });
    
    await expect(page.locator('[data-testid="websocket-status"]'))
      .toContainText('Disconnected');
    
    // Wait for automatic reconnection
    await expect(page.locator('[data-testid="websocket-status"]'))
      .toContainText('Connected', { timeout: 10000 });
  });

  test('Security and authentication flow', async ({ page, context }) => {
    // Test unauthorized access
    await context.clearCookies();
    await page.goto('/admin/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login.*/);
    
    // Test login with invalid credentials
    await page.fill('[data-testid="username-input"]', 'invalid');
    await page.fill('[data-testid="password-input"]', 'invalid');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Invalid credentials');
    
    // Test login with valid credentials
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    
    // Test session persistence
    await page.reload();
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    
    // Test logout
    await page.click('[data-testid="logout-button"]');
    await expect(page).toHaveURL(/.*login.*/);
  });
});
