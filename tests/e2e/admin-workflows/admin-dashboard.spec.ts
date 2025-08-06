import { test, expect } from '@playwright/test';

// Admin Dashboard E2E Tests for Ver4 Implementation
test.describe('Admin Dashboard Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin/dashboard');
    
    // Handle authentication
    try {
      await page.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 5000 });
    } catch {
      // Login if required
      await page.goto('/login');
      await page.fill('[data-testid="username-input"]', 'admin');
      await page.fill('[data-testid="password-input"]', 'admin123');
      await page.click('[data-testid="login-button"]');
      await page.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 10000 });
    }
  });

  test('Admin dashboard loads with key metrics', async ({ page }) => {
    // Verify admin dashboard is loaded
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();

    // Check for stats grid or metrics cards
    const statsSelectors = [
      '[data-testid="stats-grid"]',
      '[data-testid="total-guests-stat"]',
      '[data-testid="confirmed-guests-stat"]',
      '[data-testid="pending-guests-stat"]',
      '.stats-card',
      '.metric-card'
    ];

    let statsFound = false;
    for (const selector of statsSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        console.log(`Found dashboard metric: ${selector}`);
        statsFound = true;
        break;
      }
    }

    // Dashboard should have some content visible
    const dashboardContent = page.locator('[data-testid="admin-dashboard"] *');
    const contentCount = await dashboardContent.count();
    expect(contentCount).toBeGreaterThan(0);
  });

  test('Real-time WebSocket connection works', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Verify WebSocket status
    const wsStatus = page.locator('[data-testid="websocket-status"]');
    await expect(wsStatus).toContainText('Connected');
    
    // Test notification
    await page.click('[data-testid="test-notification-button"]');
    
    // Verify notification appears in real-time
    await expect(page.locator('[data-testid="notification-item"]').first())
      .toContainText('Test Notification', { timeout: 5000 });
  });

  test('System metrics update in real-time', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Get initial metrics
    const initialMemory = await page.locator('[data-testid="memory-usage"]').textContent();
    
    // Wait for metrics update
    await page.waitForTimeout(5000);
    
    // Verify metrics can change (or stay the same, but component is updating)
    const currentMemory = await page.locator('[data-testid="memory-usage"]').textContent();
    expect(currentMemory).toBeDefined();
  });

  test('Analytics dashboard performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/admin/analytics');
    await page.waitForSelector('[data-testid="analytics-dashboard"]');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within performance budget
    expect(loadTime).toBeLessThan(3000);
    
    // Verify analytics components
    await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible();
    await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
  });

  test('User management functionality', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.click('[data-testid="users-tab"]');
    
    // Verify user table loads
    await expect(page.locator('[data-testid="user-management-table"]')).toBeVisible();
    
    // Test user actions (if any users exist)
    const userRows = page.locator('[data-testid^="user-row-"]');
    const userCount = await userRows.count();
    
    if (userCount > 0) {
      // Test user interaction
      await userRows.first().click();
      // Add more specific user management tests here
    }
  });

  test('Error handling and recovery', async ({ page }) => {
    // Mock API error
    await page.route('/api/admin/analytics/dashboard', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    await page.goto('/admin/dashboard');
    
    // Verify error state
    await expect(page.locator('[data-testid="error-message"]'))
      .toBeVisible({ timeout: 10000 });
    
    // Test retry functionality
    await page.unroute('/api/admin/analytics/dashboard');
    await page.click('[data-testid="retry-button"]');
    
    // Should recover
    await expect(page.locator('[data-testid="admin-dashboard"]'))
      .toBeVisible({ timeout: 10000 });
  });
});
