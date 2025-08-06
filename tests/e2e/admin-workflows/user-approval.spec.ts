import { test, expect, Page } from '@playwright/test';
import { createTestUser } from '../../fixtures/test-data';

// Test data setup
const adminUser = createTestUser({ role: 'admin', username: 'admin@test.com' });
const pendingUser = createTestUser({ 
  role: 'staff', 
  status: 'pending',
  name: 'Jane Doe',
  email: 'jane.doe@test.com'
});

test.describe('Admin User Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', adminUser.username);
    await page.fill('[data-testid="password-input"]', 'test-password');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
  });

  test('should display pending users in admin dashboard', async ({ page }) => {
    // Navigate to user management
    await page.click('[data-testid="user-management-nav"]');
    
    // Verify pending users section is visible
    await expect(page.locator('[data-testid="pending-users-section"]')).toBeVisible();
    
    // Check that pending users are displayed
    await expect(page.locator('[data-testid="pending-user-row"]')).toBeVisible();
    
    // Verify user information is displayed correctly
    await expect(page.locator('[data-testid="user-name"]').first()).toContainText(pendingUser.name);
    await expect(page.locator('[data-testid="user-email"]').first()).toContainText(pendingUser.email);
  });

  test('should approve user successfully', async ({ page }) => {
    // Navigate to user management
    await page.click('[data-testid="user-management-nav"]');
    
    // Click on the first pending user
    await page.click('[data-testid="pending-user-row"]');
    
    // User details modal should open
    await expect(page.locator('[data-testid="user-detail-modal"]')).toBeVisible();
    
    // Click approve button
    await page.click('[data-testid="approve-user-button"]');
    
    // Confirm approval in confirmation dialog
    await expect(page.locator('[data-testid="confirmation-dialog"]')).toBeVisible();
    await page.click('[data-testid="confirm-approval-button"]');
    
    // Verify success notification
    await expect(page.locator('[data-testid="success-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-notification"]')).toContainText('User approved successfully');
    
    // Verify user is no longer in pending list
    await page.click('[data-testid="close-modal"]');
    await expect(page.locator('[data-testid="pending-user-row"]').filter({ hasText: pendingUser.name })).not.toBeVisible();
    
    // Verify user appears in approved list
    await page.click('[data-testid="approved-users-tab"]');
    await expect(page.locator('[data-testid="approved-user-row"]').filter({ hasText: pendingUser.name })).toBeVisible();
  });

  test('should reject user with reason', async ({ page }) => {
    // Navigate to user management
    await page.click('[data-testid="user-management-nav"]');
    
    // Click on the first pending user
    await page.click('[data-testid="pending-user-row"]');
    
    // Click reject button
    await page.click('[data-testid="reject-user-button"]');
    
    // Fill rejection reason
    await expect(page.locator('[data-testid="rejection-reason-input"]')).toBeVisible();
    await page.fill('[data-testid="rejection-reason-input"]', 'Invalid credentials provided');
    
    // Confirm rejection
    await page.click('[data-testid="confirm-rejection-button"]');
    
    // Verify success notification
    await expect(page.locator('[data-testid="success-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-notification"]')).toContainText('User rejected');
    
    // Verify user is no longer in pending list
    await page.click('[data-testid="close-modal"]');
    await expect(page.locator('[data-testid="pending-user-row"]').filter({ hasText: pendingUser.name })).not.toBeVisible();
  });

  test('should handle bulk user approval', async ({ page }) => {
    // Navigate to user management
    await page.click('[data-testid="user-management-nav"]');
    
    // Select multiple users using checkboxes
    await page.click('[data-testid="select-all-checkbox"]');
    
    // Verify bulk actions become available
    await expect(page.locator('[data-testid="bulk-actions-toolbar"]')).toBeVisible();
    
    // Click bulk approve
    await page.click('[data-testid="bulk-approve-button"]');
    
    // Confirm bulk approval
    await expect(page.locator('[data-testid="bulk-confirmation-dialog"]')).toBeVisible();
    await page.click('[data-testid="confirm-bulk-approval"]');
    
    // Verify success notification with count
    await expect(page.locator('[data-testid="success-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-notification"]')).toContainText('users approved');
    
    // Verify pending list is cleared
    await expect(page.locator('[data-testid="empty-pending-list"]')).toBeVisible();
  });

  test('should filter and search users', async ({ page }) => {
    // Navigate to user management
    await page.click('[data-testid="user-management-nav"]');
    
    // Test role filter
    await page.click('[data-testid="role-filter-dropdown"]');
    await page.click('[data-testid="filter-staff-role"]');
    
    // Verify only staff users are shown
    const visibleUsers = page.locator('[data-testid="user-row"]');
    await expect(visibleUsers.first()).toBeVisible();
    
    // Test search functionality
    await page.fill('[data-testid="user-search-input"]', 'jane');
    await page.press('[data-testid="user-search-input"]', 'Enter');
    
    // Verify search results
    await expect(page.locator('[data-testid="user-row"]').filter({ hasText: 'Jane' })).toBeVisible();
    await expect(page.locator('[data-testid="user-row"]').filter({ hasText: 'John' })).not.toBeVisible();
  });

  test('should display user activity history', async ({ page }) => {
    // Navigate to user management
    await page.click('[data-testid="user-management-nav"]');
    
    // Click on approved users tab
    await page.click('[data-testid="approved-users-tab"]');
    
    // Click on a user to view details
    await page.click('[data-testid="approved-user-row"]');
    
    // Navigate to activity tab in user detail modal
    await page.click('[data-testid="user-activity-tab"]');
    
    // Verify activity history is displayed
    await expect(page.locator('[data-testid="activity-timeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-item"]')).toBeVisible();
    
    // Verify activity details
    await expect(page.locator('[data-testid="activity-timestamp"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="activity-action"]').first()).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/v1/admin/users/*/approve', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Navigate to user management
    await page.click('[data-testid="user-management-nav"]');
    
    // Try to approve a user
    await page.click('[data-testid="pending-user-row"]');
    await page.click('[data-testid="approve-user-button"]');
    await page.click('[data-testid="confirm-approval-button"]');
    
    // Verify error notification is displayed
    await expect(page.locator('[data-testid="error-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-notification"]')).toContainText('Failed to approve user');
    
    // Verify user remains in pending state
    await page.click('[data-testid="close-modal"]');
    await expect(page.locator('[data-testid="pending-user-row"]').filter({ hasText: pendingUser.name })).toBeVisible();
  });

  test('should maintain real-time updates', async ({ page, context }) => {
    // Open two admin sessions
    const adminPage2 = await context.newPage();
    
    // Login to second session
    await adminPage2.goto('/login');
    await adminPage2.fill('[data-testid="username-input"]', adminUser.username);
    await adminPage2.fill('[data-testid="password-input"]', 'test-password');
    await adminPage2.click('[data-testid="login-button"]');
    
    // Navigate both sessions to user management
    await page.click('[data-testid="user-management-nav"]');
    await adminPage2.click('[data-testid="user-management-nav"]');
    
    // Approve user in first session
    await page.click('[data-testid="pending-user-row"]');
    await page.click('[data-testid="approve-user-button"]');
    await page.click('[data-testid="confirm-approval-button"]');
    
    // Verify real-time update appears in second session
    await expect(adminPage2.locator('[data-testid="real-time-notification"]')).toBeVisible({ timeout: 5000 });
    await expect(adminPage2.locator('[data-testid="pending-user-row"]').filter({ hasText: pendingUser.name })).not.toBeVisible({ timeout: 5000 });
    
    await adminPage2.close();
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to user management
    await page.click('[data-testid="mobile-menu-toggle"]');
    await page.click('[data-testid="user-management-nav"]');
    
    // Verify mobile-optimized layout
    await expect(page.locator('[data-testid="mobile-user-card"]')).toBeVisible();
    
    // Test mobile user approval
    await page.click('[data-testid="mobile-user-card"]');
    await expect(page.locator('[data-testid="mobile-user-actions"]')).toBeVisible();
    
    await page.click('[data-testid="mobile-approve-button"]');
    await page.click('[data-testid="confirm-approval-button"]');
    
    // Verify success on mobile
    await expect(page.locator('[data-testid="mobile-success-toast"]')).toBeVisible();
  });
});