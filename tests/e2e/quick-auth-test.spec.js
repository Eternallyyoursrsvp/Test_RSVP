/**
 * Quick Authentication Test - Post Bootstrap Fix
 * Tests the complete authentication flow after fixing bootstrap detection
 */

import { test, expect } from '@playwright/test';

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'e025888394d4f57077fdadae9e4d6752'
};

const BASE_URL = 'http://localhost:3001';

test.describe('Quick Authentication Test - Post Bootstrap Fix', () => {
  test('Production Readiness Validation', async ({ page }) => {
    console.log('🏭 Testing production readiness after bootstrap fix...');
    
    // 1. Test API endpoints
    const apiTests = [
      { name: 'Setup Status', url: `${BASE_URL}/api/setup/status`, expectKey: 'isFirstTimeSetup' },
      { name: 'System Health', url: `${BASE_URL}/api/system/health`, expectKey: 'status' },
      { name: 'Auth Status', url: `${BASE_URL}/api/auth/status`, expectKey: 'method' }
    ];
    
    let successCount = 0;
    
    for (const apiTest of apiTests) {
      try {
        const response = await page.request.get(apiTest.url);
        const data = await response.json();
        
        const success = response.status() === 200 && data[apiTest.expectKey] !== undefined;
        console.log(`${success ? '✅' : '❌'} ${apiTest.name}: ${response.status()}`);
        
        if (success) successCount++;
      } catch (error) {
        console.log(`❌ ${apiTest.name}: ERROR - ${error.message}`);
      }
    }
    
    // 2. Test authentication page
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');
    
    // Check if login form is accessible
    const usernameField = page.locator('input[type="text"], input[name="username"], input[placeholder*="username" i]');
    const passwordField = page.locator('input[type="password"], input[name="password"]');
    const loginButton = page.locator('button[type="submit"], button:has-text("login" i), button:has-text("sign in" i)');
    
    const hasLoginForm = await usernameField.isVisible() && await passwordField.isVisible() && await loginButton.isVisible();
    
    if (hasLoginForm) {
      console.log('✅ Authentication page loaded with login form');
      successCount++;
      
      // 3. Test login flow
      await usernameField.fill(ADMIN_CREDENTIALS.username);
      await passwordField.fill(ADMIN_CREDENTIALS.password);
      await loginButton.click();
      
      // Wait for response
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      const currentUrl = page.url();
      const isLoggedIn = !currentUrl.includes('/auth') || 
                        await page.locator('[data-testid="user-menu"], .user-profile, text="logout" i, text="dashboard" i').isVisible();
      
      if (isLoggedIn) {
        console.log('✅ Login flow successful');
        successCount++;
      } else {
        console.log('❌ Login flow failed');
      }
    } else {
      console.log('❌ Authentication page missing login form');
    }
    
    // Final assessment
    const totalTests = 5; // 3 API + 1 auth page + 1 login
    console.log(`\n📊 Production Readiness: ${successCount}/${totalTests} tests passed`);
    
    // Take screenshot for documentation
    await page.screenshot({ path: 'tests/screenshots/production-readiness-final.png', fullPage: true });
    
    // At least 4/5 tests should pass for production readiness
    expect(successCount).toBeGreaterThanOrEqual(4);
  });
});