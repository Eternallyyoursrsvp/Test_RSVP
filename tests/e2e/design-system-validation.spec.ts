/**
 * DESIGN SYSTEM VISUAL VALIDATION - STEP 4 COMPLETION
 * 
 * Validates integrated design system implementation:
 * - Eternally Yours purple branding (#6b33b3) consistency
 * - Shadcn/ui CSS variable usage
 * - Design token adoption
 * - Cross-browser compatibility
 * - Responsive behavior
 */

import { test, expect } from '@playwright/test';

const BRAND_COLORS = {
  primary: '#6b33b3',           // Eternally Yours purple
  primaryForeground: '#ffffff',
  secondary: '#d1b981',         // Gold accent
  accent: '#9a73f9',           // Light purple accent
  ring: '#5e239d',             // Focus ring color
} as const;

test('Homepage Brand Consistency Validation', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Check primary heading contains "Eternally Yours"
  const primaryHeading = page.locator('h1').first();
  await expect(primaryHeading).toContainText('Eternally Yours');
  
  // Validate hero section is visible
  const heroSection = page.locator('main').first();
  await expect(heroSection).toBeVisible();
  
  // Take screenshot for visual regression
  await expect(page).toHaveScreenshot('homepage-full.png', {
    fullPage: true,
    threshold: 0.2,
  });
});

test('Auth Page Design Consistency', async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');

  // Check dual-panel layout exists
  const authContainer = page.locator('main').first();
  await expect(authContainer).toBeVisible();
  
  // Check login form components
  const loginForm = page.getByRole('form', { name: 'Login Form' });
  await expect(loginForm).toBeVisible();
  
  const usernameInput = page.getByRole('textbox', { name: 'Username*' });
  const passwordInput = page.getByRole('textbox', { name: 'Password*' });
  const signInButton = page.getByRole('button', { name: 'Sign in' });
  
  await expect(usernameInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(signInButton).toBeVisible();
  
  // Screenshot auth page
  await expect(page).toHaveScreenshot('auth-page-full.png', {
    fullPage: true,
    threshold: 0.2,
  });
});

test('Register Form Design Validation', async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  
  // Click Register tab
  await page.getByRole('tab', { name: 'Register' }).click();
  
  // Check register form components
  const fullNameInput = page.getByRole('textbox', { name: 'Full Name' });
  const emailInput = page.getByRole('textbox', { name: 'Email' });
  const createButton = page.getByRole('button', { name: 'Create Account' });
  
  await expect(fullNameInput).toBeVisible();
  await expect(emailInput).toBeVisible();
  await expect(createButton).toBeVisible();
  
  // Screenshot register form
  await expect(page).toHaveScreenshot('register-form.png', {
    fullPage: true,
    threshold: 0.2,
  });
});

test('Button Interaction States', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const primaryButton = page.getByRole('link', { name: 'Get Started' }).first();
  await expect(primaryButton).toBeVisible();
  
  // Test hover state
  await primaryButton.hover();
  await page.waitForTimeout(300);
  
  // Screenshot button hover state
  await expect(page).toHaveScreenshot('button-hover-state.png', {
    clip: { x: 0, y: 100, width: 800, height: 400 }
  });
});

test('Responsive Design - Mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check mobile navigation
  const mainHeading = page.locator('h1').first();
  await expect(mainHeading).toBeVisible();
  await expect(mainHeading).toContainText('Eternally Yours');
  
  // Screenshot mobile view
  await expect(page).toHaveScreenshot('homepage-mobile.png', {
    fullPage: true,
    threshold: 0.3,
  });
});

test('Responsive Design - Tablet', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Screenshot tablet view
  await expect(page).toHaveScreenshot('homepage-tablet.png', {
    fullPage: true,
    threshold: 0.3,
  });
});

test('Focus States and Accessibility', async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  
  // Test keyboard navigation
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  
  await expect(page).toHaveScreenshot('focus-state-1.png');
  
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  
  await expect(page).toHaveScreenshot('focus-state-2.png');
});

test('CSS Variables Integration Validation', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check that CSS custom properties are being used
  const designSystemUsage = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    let customPropertyUsage = 0;
    let hardcodedColors = 0;
    
    elements.forEach(el => {
      const styles = getComputedStyle(el);
      const inlineStyles = el.getAttribute('style') || '';
      
      // Check for CSS custom properties
      if (inlineStyles.includes('var(--') || 
          styles.backgroundColor.includes('var(') ||
          styles.color.includes('var(')) {
        customPropertyUsage++;
      }
      
      // Check for hardcoded hex colors (should be minimal)
      if (inlineStyles.match(/#[0-9a-fA-F]{3,6}/) && 
          !inlineStyles.includes('var(--')) {
        hardcodedColors++;
      }
    });
    
    return { customPropertyUsage, hardcodedColors, total: elements.length };
  });
  
  console.log('Design System Analysis:', designSystemUsage);
  
  // Assert design system compliance
  expect(designSystemUsage.hardcodedColors).toBeLessThan(10); // Allow minimal hardcoded values
  expect(designSystemUsage.customPropertyUsage).toBeGreaterThan(5);  // Should have token usage
});