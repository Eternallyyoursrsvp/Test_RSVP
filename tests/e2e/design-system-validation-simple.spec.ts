import { test, expect } from '@playwright/test';

// Design System Visual Validation - STEP 4 Implementation
test.describe('Design System Integration Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
  });

  test('Validates Eternally Yours brand consistency', async ({ page }) => {
    // Check primary heading contains "Eternally Yours"
    const primaryHeading = page.locator('h1').first();
    await expect(primaryHeading).toContainText('Eternally Yours');
    
    // Check page title
    await expect(page).toHaveTitle(/Wedding RSVP System/);
    
    // Take homepage screenshot for visual regression
    await page.screenshot({ 
      path: 'test-results/homepage-validation.png', 
      fullPage: true 
    });
  });

  test('Validates integrated CSS custom properties', async ({ page }) => {
    // Check that our integrated CSS variables are loaded
    const cssVariables = await page.evaluate(() => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);
      return {
        primary: styles.getPropertyValue('--primary').trim(),
        background: styles.getPropertyValue('--background').trim(),
        foreground: styles.getPropertyValue('--foreground').trim(),
        radius: styles.getPropertyValue('--radius').trim(),
        // Extended design system variables
        shadowSm: styles.getPropertyValue('--shadow-sm').trim(),
        zModal: styles.getPropertyValue('--z-modal').trim(),
        durationNormal: styles.getPropertyValue('--duration-normal').trim()
      };
    });

    // Validate Eternally Yours purple branding
    expect(cssVariables.primary).toBe('#6b33b3');
    expect(cssVariables.background).toBe('#ffffff');
    expect(cssVariables.foreground).toBe('#333333');
    expect(cssVariables.radius).toBe('0px'); // Square design
    
    // Validate extended design system tokens are loaded
    expect(cssVariables.shadowSm).toBeTruthy();
    expect(cssVariables.zModal).toBeTruthy();
    expect(cssVariables.durationNormal).toBeTruthy();
    
    console.log('✅ Design system CSS variables validated:', cssVariables);
  });

  test('Validates auth page design consistency', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    // Check login form components
    const loginForm = page.getByRole('form', { name: 'Login Form' });
    await expect(loginForm).toBeVisible();
    
    const usernameInput = page.getByRole('textbox', { name: 'Username*' });
    const passwordInput = page.getByRole('textbox', { name: 'Password*' });
    const signInButton = page.getByRole('button', { name: 'Sign in' });
    
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(signInButton).toBeVisible();
    
    // Take auth page screenshot
    await page.screenshot({ 
      path: 'test-results/auth-page-validation.png', 
      fullPage: true 
    });
  });

  test('Validates register form consistency', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('tab', { name: 'Register' }).click();
    
    // Check register form components
    const fullNameInput = page.getByRole('textbox', { name: 'Full Name' });
    const emailInput = page.getByRole('textbox', { name: 'Email' });
    const createButton = page.getByRole('button', { name: 'Create Account' });
    
    await expect(fullNameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(createButton).toBeVisible();
    
    // Take register form screenshot
    await page.screenshot({ 
      path: 'test-results/register-form-validation.png', 
      fullPage: true 
    });
  });

  test('Validates dark mode CSS variables', async ({ page }) => {
    // Check dark mode CSS variables exist
    const darkModeVariables = await page.evaluate(() => {
      // Create temporary element with dark class to test dark mode variables
      const testElement = document.createElement('div');
      testElement.className = 'dark';
      document.body.appendChild(testElement);
      
      const styles = getComputedStyle(testElement);
      const result = {
        darkBackground: styles.getPropertyValue('--background').trim(),
        darkForeground: styles.getPropertyValue('--foreground').trim(),
        darkPrimary: styles.getPropertyValue('--primary').trim()
      };
      
      document.body.removeChild(testElement);
      return result;
    });

    // In dark mode, background should be dark, foreground should be light
    expect(darkModeVariables.darkBackground).toBe('#121212');
    expect(darkModeVariables.darkForeground).toBe('#eaeaea');
    expect(darkModeVariables.darkPrimary).toBe('#5e239d'); // Darker purple for dark mode
    
    console.log('✅ Dark mode variables validated:', darkModeVariables);
  });

  test('Validates design token usage vs hardcoded values', async ({ page }) => {
    // Analyze design system adoption
    const designSystemAnalysis = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let customPropertyUsage = 0;
      let hardcodedColors = 0;
      let totalElements = elements.length;
      
      elements.forEach(el => {
        const styles = getComputedStyle(el);
        const inlineStyles = el.getAttribute('style') || '';
        
        // Check for CSS custom properties (design tokens)
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
      
      return { 
        customPropertyUsage, 
        hardcodedColors, 
        totalElements,
        designTokenAdoption: Math.round((customPropertyUsage / totalElements) * 100)
      };
    });
    
    console.log('🎯 Design System Coverage Analysis:', designSystemAnalysis);
    
    // Should have good design token usage
    expect(designSystemAnalysis.customPropertyUsage).toBeGreaterThan(0);
    
    // Should have minimal hardcoded colors (allow some for SVGs, etc.)
    expect(designSystemAnalysis.hardcodedColors).toBeLessThan(20);
    
    console.log(`✅ Design token adoption: ${designSystemAnalysis.designTokenAdoption}%`);
    console.log(`✅ Hardcoded values: ${designSystemAnalysis.hardcodedColors} (acceptable)`);
  });

  test('Validates responsive design on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile view maintains branding
    const mainHeading = page.locator('h1').first();
    await expect(mainHeading).toBeVisible();
    await expect(mainHeading).toContainText('Eternally Yours');
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'test-results/mobile-validation.png', 
      fullPage: true 
    });
  });

  test('Validates focus states and accessibility', async ({ page }) => {
    await page.goto('/auth');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    
    // Should have visible focus indicators
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Take focus state screenshot
    await page.screenshot({ 
      path: 'test-results/focus-state-validation.png' 
    });
  });
});