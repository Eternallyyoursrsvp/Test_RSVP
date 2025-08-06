import { test, expect } from '@playwright/test';

// Real-time Notification System E2E Tests
test.describe('Real-time Notification System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin/dashboard');
    
    // Wait for authentication or auto-login in test environment
    try {
      await page.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 5000 });
    } catch {
      // If authentication is required, use test credentials
      await page.goto('/login');
      await page.fill('[data-testid="username-input"]', 'admin');
      await page.fill('[data-testid="password-input"]', 'admin123');
      await page.click('[data-testid="login-button"]');
      await page.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 10000 });
    }
  });

  test('should deliver real-time notifications via WebSocket', async () => {
    // Navigate user to notification center
    await userPage.click('[data-testid="notification-center-nav"]');
    await expect(userPage.locator('[data-testid="notification-center"]')).toBeVisible();

    // Monitor WebSocket messages on user page
    let notificationReceived = false;
    userPage.on('websocket', ws => {
      ws.on('framereceived', ({ payload }) => {
        const message = JSON.parse(payload.toString());
        if (message.type === 'NEW_NOTIFICATION') {
          notificationReceived = true;
        }
      });
    });

    // Admin triggers a notification
    await adminPage.click('[data-testid="admin-notifications-nav"]');
    await adminPage.click('[data-testid="send-notification-button"]');
    await adminPage.fill('[data-testid="notification-title"]', 'Test Notification');
    await adminPage.fill('[data-testid="notification-message"]', 'This is a test notification');
    await adminPage.click('[data-testid="notification-recipient-select"]');
    await adminPage.click('[data-testid="select-all-users"]');
    await adminPage.click('[data-testid="send-notification-confirm"]');

    // Verify real-time notification appears on user page
    await expect(userPage.locator('[data-testid="notification-toast"]')).toBeVisible({ timeout: 5000 });
    await expect(userPage.locator('[data-testid="notification-toast"]')).toContainText('Test Notification');

    // Verify notification appears in notification center
    await expect(userPage.locator('[data-testid="notification-item"]').first()).toContainText('Test Notification');

    // Verify WebSocket message was received
    await userPage.waitForFunction(() => window.notificationReceived === true, undefined, { timeout: 5000 });
  });

  test('should handle different notification types correctly', async () => {
    const notificationTypes = [
      { type: 'RSVP_RECEIVED', title: 'New RSVP Response', icon: 'rsvp-icon' },
      { type: 'TRANSPORT_UPDATE', title: 'Transport Status Update', icon: 'transport-icon' },
      { type: 'ACCOMMODATION_ASSIGNED', title: 'Accommodation Assigned', icon: 'hotel-icon' },
      { type: 'SYSTEM_ALERT', title: 'System Alert', icon: 'alert-icon' },
    ];

    // Navigate to notification center
    await userPage.click('[data-testid="notification-center-nav"]');

    for (const notificationType of notificationTypes) {
      // Admin sends specific notification type
      await adminPage.click('[data-testid="send-notification-button"]');
      await adminPage.selectOption('[data-testid="notification-type-select"]', notificationType.type);
      await adminPage.fill('[data-testid="notification-title"]', notificationType.title);
      await adminPage.fill('[data-testid="notification-message"]', `Test ${notificationType.type} notification`);
      await adminPage.click('[data-testid="send-notification-confirm"]');

      // Verify notification with correct type and icon
      await expect(userPage.locator('[data-testid="notification-toast"]')).toBeVisible({ timeout: 5000 });
      await expect(userPage.locator(`[data-testid="${notificationType.icon}"]`)).toBeVisible();
      
      // Close toast to prepare for next notification
      await userPage.click('[data-testid="close-toast"]');
    }
  });

  test('should respect notification preferences', async () => {
    // Navigate to notification preferences
    await userPage.click('[data-testid="notification-center-nav"]');
    await userPage.click('[data-testid="notification-preferences-tab"]');

    // Disable RSVP notifications
    await userPage.uncheck('[data-testid="rsvp-notifications-toggle"]');
    await userPage.click('[data-testid="save-preferences-button"]');

    // Verify preferences saved
    await expect(userPage.locator('[data-testid="preferences-saved-toast"]')).toBeVisible();

    // Admin sends RSVP notification
    await adminPage.click('[data-testid="send-notification-button"]');
    await adminPage.selectOption('[data-testid="notification-type-select"]', 'RSVP_RECEIVED');
    await adminPage.fill('[data-testid="notification-title"]', 'RSVP Test');
    await adminPage.fill('[data-testid="notification-message"]', 'This should not appear');
    await adminPage.click('[data-testid="send-notification-confirm"]');

    // Verify notification does NOT appear
    await expect(userPage.locator('[data-testid="notification-toast"]')).not.toBeVisible({ timeout: 3000 });

    // Admin sends system alert (should still appear)
    await adminPage.click('[data-testid="send-notification-button"]');
    await adminPage.selectOption('[data-testid="notification-type-select"]', 'SYSTEM_ALERT');
    await adminPage.fill('[data-testid="notification-title"]', 'System Alert');
    await adminPage.fill('[data-testid="notification-message"]', 'This should appear');
    await adminPage.click('[data-testid="send-notification-confirm"]');

    // Verify system alert appears (preferences allow it)
    await expect(userPage.locator('[data-testid="notification-toast"]')).toBeVisible({ timeout: 5000 });
  });

  test('should queue notifications when user is offline', async () => {
    // Simulate user going offline
    await userPage.context().setOffline(true);

    // Admin sends multiple notifications while user is offline
    const offlineNotifications = [
      'Offline Notification 1',
      'Offline Notification 2', 
      'Offline Notification 3'
    ];

    for (const title of offlineNotifications) {
      await adminPage.click('[data-testid="send-notification-button"]');
      await adminPage.fill('[data-testid="notification-title"]', title);
      await adminPage.fill('[data-testid="notification-message"]', `Message for ${title}`);
      await adminPage.click('[data-testid="send-notification-confirm"]');
    }

    // Bring user back online
    await userPage.context().setOffline(false);
    await userPage.reload();

    // Login again after reconnection
    await userPage.fill('[data-testid="username-input"]', 'user@test.com');
    await userPage.fill('[data-testid="password-input"]', 'user-password');
    await userPage.click('[data-testid="login-button"]');

    // Navigate to notification center
    await userPage.click('[data-testid="notification-center-nav"]');

    // Verify all offline notifications are delivered
    for (const title of offlineNotifications) {
      await expect(userPage.locator('[data-testid="notification-item"]').filter({ hasText: title })).toBeVisible();
    }
  });

  test('should handle notification marking as read/unread', async () => {
    // Send a test notification
    await adminPage.click('[data-testid="send-notification-button"]');
    await adminPage.fill('[data-testid="notification-title"]', 'Mark Read Test');
    await adminPage.fill('[data-testid="notification-message"]', 'Test marking as read');
    await adminPage.click('[data-testid="send-notification-confirm"]');

    // User receives notification
    await expect(userPage.locator('[data-testid="notification-toast"]')).toBeVisible({ timeout: 5000 });

    // Navigate to notification center
    await userPage.click('[data-testid="notification-center-nav"]');

    // Verify notification shows as unread
    await expect(userPage.locator('[data-testid="unread-notification"]').first()).toBeVisible();
    await expect(userPage.locator('[data-testid="unread-badge"]')).toBeVisible();

    // Mark notification as read
    await userPage.click('[data-testid="notification-item"]');
    await expect(userPage.locator('[data-testid="notification-detail-modal"]')).toBeVisible();
    await userPage.click('[data-testid="close-modal"]');

    // Verify notification is now marked as read
    await expect(userPage.locator('[data-testid="read-notification"]').first()).toBeVisible();
    await expect(userPage.locator('[data-testid="unread-badge"]')).not.toBeVisible();

    // Test bulk mark as read
    await userPage.click('[data-testid="mark-all-read-button"]');
    await expect(userPage.locator('[data-testid="unread-notification"]')).not.toBeVisible();
  });

  test('should display notification history with pagination', async () => {
    // Send multiple notifications to create history
    for (let i = 1; i <= 25; i++) {
      await adminPage.click('[data-testid="send-notification-button"]');
      await adminPage.fill('[data-testid="notification-title"]', `History Test ${i}`);
      await adminPage.fill('[data-testid="notification-message"]', `Message ${i}`);
      await adminPage.click('[data-testid="send-notification-confirm"]');
    }

    // Navigate to notification center
    await userPage.click('[data-testid="notification-center-nav"]');

    // Verify pagination is present
    await expect(userPage.locator('[data-testid="notification-pagination"]')).toBeVisible();

    // Verify first page shows recent notifications
    await expect(userPage.locator('[data-testid="notification-item"]')).toHaveCount(10); // Default page size

    // Navigate to next page
    await userPage.click('[data-testid="next-page-button"]');
    await expect(userPage.locator('[data-testid="notification-item"]')).toHaveCount(10);

    // Test filtering by date
    await userPage.click('[data-testid="filter-today-button"]');
    await expect(userPage.locator('[data-testid="notification-item"]')).toHaveCount(25);
  });

  test('should handle WebSocket connection failures gracefully', async () => {
    // Monitor network activity
    const networkFailures: string[] = [];
    userPage.on('response', response => {
      if (!response.ok() && response.url().includes('notifications')) {
        networkFailures.push(response.url());
      }
    });

    // Simulate WebSocket connection failure
    await userPage.route('**/notifications/ws', route => {
      route.abort();
    });

    // Navigate to notification center
    await userPage.click('[data-testid="notification-center-nav"]');

    // Verify fallback message is displayed
    await expect(userPage.locator('[data-testid="connection-status-warning"]')).toBeVisible();
    await expect(userPage.locator('[data-testid="connection-status-warning"]')).toContainText('real-time updates unavailable');

    // Send notification from admin
    await adminPage.click('[data-testid="send-notification-button"]');
    await adminPage.fill('[data-testid="notification-title"]', 'Fallback Test');
    await adminPage.fill('[data-testid="notification-message"]', 'Testing fallback delivery');
    await adminPage.click('[data-testid="send-notification-confirm"]');

    // Verify notification appears via polling fallback
    await userPage.click('[data-testid="refresh-notifications-button"]');
    await expect(userPage.locator('[data-testid="notification-item"]').filter({ hasText: 'Fallback Test' })).toBeVisible();
  });

  test('should support notification actions and interactions', async () => {
    // Send actionable notification (e.g., RSVP response)
    await adminPage.click('[data-testid="send-notification-button"]');
    await adminPage.selectOption('[data-testid="notification-type-select"]', 'RSVP_RESPONSE_REQUIRED');
    await adminPage.fill('[data-testid="notification-title"]', 'RSVP Response Required');
    await adminPage.fill('[data-testid="notification-message"]', 'Please respond to the wedding invitation');
    await adminPage.check('[data-testid="include-actions-checkbox"]');
    await adminPage.click('[data-testid="send-notification-confirm"]');

    // User receives actionable notification
    await expect(userPage.locator('[data-testid="notification-toast"]')).toBeVisible({ timeout: 5000 });
    await expect(userPage.locator('[data-testid="notification-action-button"]')).toBeVisible();

    // Click action button from toast
    await userPage.click('[data-testid="notification-action-button"]');

    // Verify action redirects to appropriate page
    await expect(userPage.locator('[data-testid="rsvp-form"]')).toBeVisible();

    // Navigate back to notification center
    await userPage.click('[data-testid="notification-center-nav"]');

    // Verify notification shows as actioned
    await expect(userPage.locator('[data-testid="actioned-notification"]')).toBeVisible();
  });

  test.afterEach(async () => {
    await adminPage.close();
    await userPage.close();
  });
});