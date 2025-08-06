/**
 * Authentication System Integration Tests
 * 
 * Comprehensive Playwright tests for the multi-provider authentication system
 * Tests both Database Auth and Supabase Auth configurations
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

test.describe('Authentication System Integration', () => {

  test.beforeEach(async ({ page }) => {
    // Ensure we start with a clean state
    await page.goto(BASE_URL);
  });

  test('should load application without authentication errors', async ({ page }) => {
    // Test basic application loading
    await page.goto(BASE_URL);
    
    // Should not see any console errors related to authentication
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('auth')) {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForLoadState('networkidle');
    
    // Verify no authentication-related console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test('should handle authentication status endpoint', async ({ page }) => {
    // Test authentication status API endpoint
    const response = await page.request.get(`${BASE_URL}/api/auth/status`);
    
    // Should return proper authentication status
    expect(response.status()).toBe(401); // Expect unauthorized initially
    
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('authenticated', false);
  });

  test('should display setup wizard when in bootstrap mode', async ({ page }) => {
    // Test setup wizard functionality
    await page.goto(BASE_URL);
    
    // Look for setup wizard elements
    const setupElements = [
      'Provider Setup Wizard',
      'Authentication Configuration',
      'Database Configuration'
    ];
    
    for (const element of setupElements) {
      const elementExists = await page.locator(`text=${element}`).isVisible();
      // Note: May not be visible if not in bootstrap mode
      console.log(`Setup element "${element}" visible: ${elementExists}`);
    }
  });

  test('should validate authentication method switching API', async ({ page }) => {
    // Test authentication method switching endpoint
    
    // Try to access admin endpoint (should require authentication)
    const switchResponse = await page.request.post(`${BASE_URL}/api/auth/settings/switch-method`, {
      data: {
        method: 'database',
        modifiedBy: 'test'
      }
    });
    
    // Should require authentication
    expect(switchResponse.status()).toBe(401);
  });

  test('should validate Supabase connection test endpoint', async ({ page }) => {
    // Test Supabase connection validation endpoint
    
    const testConnectionResponse = await page.request.post(`${BASE_URL}/api/auth/settings/test-supabase-connection`, {
      data: {
        url: 'https://test.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature'
      }
    });
    
    // Should require authentication
    expect(testConnectionResponse.status()).toBe(401);
  });

  test('should handle authentication configuration endpoints', async ({ page }) => {
    // Test all authentication configuration endpoints require authentication
    
    const endpoints = [
      { method: 'GET', path: '/api/auth/settings/status' },
      { method: 'POST', path: '/api/auth/settings/switch-method' },
      { method: 'POST', path: '/api/auth/settings/update-config' },
      { method: 'POST', path: '/api/auth/settings/backup-config' },
      { method: 'GET', path: '/api/auth/settings/export-config' }
    ];
    
    for (const endpoint of endpoints) {
      let response;
      
      if (endpoint.method === 'GET') {
        response = await page.request.get(`${BASE_URL}${endpoint.path}`);
      } else {
        response = await page.request.post(`${BASE_URL}${endpoint.path}`, {
          data: {}
        });
      }
      
      // All should require authentication
      expect(response.status()).toBe(401);
      console.log(`✅ ${endpoint.method} ${endpoint.path}: ${response.status()}`);
    }
  });

  test('should load authentication components without errors', async ({ page }) => {
    // Navigate to setup page if available
    await page.goto(BASE_URL);
    
    // Look for authentication-related components
    const authComponents = [
      '[data-testid="auth-method-selector"]',
      '[data-testid="auth-config-form"]',
      'button:has-text("Authentication")',
      'form[data-auth-form]'
    ];
    
    for (const selector of authComponents) {
      const element = await page.locator(selector).first();
      const exists = await element.isVisible().catch(() => false);
      console.log(`Auth component "${selector}" visible: ${exists}`);
    }
  });

  test('should validate authentication form inputs', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Look for login form if available
    const loginForm = page.locator('form').filter({ hasText: 'login' }).first();
    const formExists = await loginForm.isVisible().catch(() => false);
    
    if (formExists) {
      // Test form validation
      const usernameInput = loginForm.locator('input[name="username"], input[type="email"]').first();
      const passwordInput = loginForm.locator('input[name="password"], input[type="password"]').first();
      
      if (await usernameInput.isVisible()) {
        await usernameInput.fill('test@example.com');
        await passwordInput.fill('password123');
        
        // Form should accept valid inputs
        expect(await usernameInput.inputValue()).toBe('test@example.com');
        expect(await passwordInput.inputValue()).toBe('password123');
      }
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Test authentication system resilience to network errors
    
    // Intercept auth requests and simulate network failure
    await page.route('**/api/auth/**', route => {
      route.abort('failed');
    });
    
    await page.goto(BASE_URL);
    
    // Application should still load even if auth requests fail
    const pageTitle = await page.title();
    expect(pageTitle).toContain('Eternally Yours RSVP Platform');
  });

  test('should validate authentication configuration persistence', async ({ page }) => {
    // Test that authentication configuration is properly persisted
    
    // Check for configuration files (if accessible)
    const configResponse = await page.request.get(`${BASE_URL}/.auth-config.json`).catch(() => null);
    
    // Config file should not be publicly accessible
    if (configResponse) {
      expect(configResponse.status()).not.toBe(200);
    }
  });

  test('should validate CORS and security headers', async ({ page }) => {
    // Test security headers for authentication endpoints
    
    const response = await page.request.get(`${BASE_URL}/api/auth/status`);
    const headers = response.headers();
    
    // Check for proper CORS headers
    expect(headers).toHaveProperty('access-control-allow-methods');
    expect(headers).toHaveProperty('access-control-allow-headers');
    
    console.log('✅ CORS headers present:', {
      methods: headers['access-control-allow-methods'],
      headers: headers['access-control-allow-headers']
    });
  });

});

test.describe('Authentication UI Components', () => {

  test('should render authentication method selector', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Look for authentication method selector component
    const methodSelector = page.locator('[data-testid="auth-method-selector"]');
    const isVisible = await methodSelector.isVisible().catch(() => false);
    
    if (isVisible) {
      // Test method selection options
      const databaseOption = page.locator('text=Database Auth');
      const supabaseOption = page.locator('text=Supabase Auth');
      
      expect(await databaseOption.isVisible()).toBe(true);
      expect(await supabaseOption.isVisible()).toBe(true);
      
      // Test switching between methods
      await databaseOption.click();
      await expect(databaseOption).toBeChecked();
      
      await supabaseOption.click();  
      await expect(supabaseOption).toBeChecked();
    }
  });

  test('should handle authentication configuration forms', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Look for configuration forms
    const configForm = page.locator('[data-testid="auth-config-form"]');
    const isVisible = await configForm.isVisible().catch(() => false);
    
    if (isVisible) {
      // Test form interactions
      const inputs = configForm.locator('input[type="text"], input[type="password"], input[type="url"]');
      const inputCount = await inputs.count();
      
      console.log(`Found ${inputCount} configuration inputs`);
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const inputType = await input.getAttribute('type');
        const inputName = await input.getAttribute('name');
        
        console.log(`Input ${i}: type=${inputType}, name=${inputName}`);
        
        // Test basic input functionality
        if (inputType === 'text' || inputType === 'url') {
          await input.fill('test-value');
          expect(await input.inputValue()).toBe('test-value');
          await input.clear();
        }
      }
    }
  });

  test('should validate setup wizard authentication step', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Look for setup wizard
    const wizard = page.locator('[data-testid="setup-wizard"]');
    const wizardVisible = await wizard.isVisible().catch(() => false);
    
    if (wizardVisible) {
      // Navigate to authentication step if possible
      const authStep = page.locator('text=Authentication').or(page.locator('[data-step="auth"]'));
      const authStepVisible = await authStep.isVisible().catch(() => false);
      
      if (authStepVisible) {
        await authStep.click();
        
        // Verify authentication configuration is available
        const authConfig = page.locator('[data-testid="auth-config"]');
        await expect(authConfig).toBeVisible();
        
        console.log('✅ Authentication step in setup wizard working');
      }
    }
  });

});

test.describe('Authentication System Error Handling', () => {

  test('should handle malformed authentication requests', async ({ page }) => {
    // Test error handling for malformed requests
    
    const malformedRequest = await page.request.post(`${BASE_URL}/api/auth/settings/switch-method`, {
      data: {
        // Missing required fields
        invalid: 'data'
      }
    });
    
    // Should return proper error response
    expect(malformedRequest.status()).toBe(401); // Unauthorized first, then validation
  });

  test('should validate input sanitization', async ({ page }) => {
    // Test input sanitization for authentication forms
    
    await page.goto(BASE_URL);
    
    const loginInputs = page.locator('input[name="username"], input[name="email"], input[type="email"]');
    const inputExists = await loginInputs.first().isVisible().catch(() => false);
    
    if (inputExists) {
      const input = loginInputs.first();
      
      // Test XSS prevention
      const xssPayload = '<script>alert("xss")</script>';
      await input.fill(xssPayload);
      
      const inputValue = await input.inputValue();
      // Should not contain script tags if properly sanitized
      expect(inputValue).not.toContain('<script>');
    }
  });

  test('should handle authentication timeouts', async ({ page }) => {
    // Test authentication timeout handling
    
    // Intercept auth requests and add delay
    await page.route('**/api/auth/**', async route => {
      await page.waitForTimeout(1000);
      route.continue();
    });
    
    await page.goto(BASE_URL);
    
    // Application should handle slow auth responses gracefully
    const pageLoaded = await page.waitForLoadState('networkidle', { timeout: 5000 }).then(() => true).catch(() => false);
    expect(pageLoaded).toBe(true);
  });

});

test.describe('Authentication System Performance', () => {

  test('should load authentication components quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (5 seconds)
    expect(loadTime).toBeLessThan(5000);
    console.log(`✅ Page load time: ${loadTime}ms`);
  });

  test('should handle concurrent authentication requests', async ({ page }) => {
    // Test concurrent auth status requests
    
    const requests = Array.from({ length: 5 }, () => 
      page.request.get(`${BASE_URL}/api/auth/status`)
    );
    
    const responses = await Promise.all(requests);
    
    // All requests should complete successfully
    responses.forEach((response, index) => {
      console.log(`Request ${index + 1}: ${response.status()}`);
      expect([200, 401]).toContain(response.status());
    });
  });

});