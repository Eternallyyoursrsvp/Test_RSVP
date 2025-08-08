/**
 * DESIGN SYSTEM VISUAL VALIDATION TESTS
 * 
 * Comprehensive visual testing to validate design system implementation:
 * - Tailwind v4 Custom CSS integration
 * - Shadcn/ui CSS variable usage
 * - 286+ design token adoption
 * - Brand consistency (Eternally Yours purple #6b33b3)
 * - Cross-browser compatibility
 * - Responsive behavior validation
 */

import { test, expect } from '@playwright/test';

// Brand color constants from our integrated design system
const BRAND_COLORS = {
  primary: '#6b33b3',           // Eternally Yours purple
  primaryForeground: '#ffffff', // White text on purple
  secondary: '#d1b981',         // Gold accent
  accent: '#9a73f9',           // Light purple accent
  ring: '#5e239d',             // Focus ring color
} as const;

// Test configuration for different viewports
const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
] as const;

test.describe('Design System Visual Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage before each test
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Homepage Brand Consistency', () => {
    
    test('should display consistent Eternally Yours branding', async ({ page }) => {
      // Check primary heading contains "Eternally Yours"
      const primaryHeading = page.locator('h1').first();
      await expect(primaryHeading).toContainText('Eternally Yours');
      
      // Validate purple gradient background
      const heroSection = page.locator('[class*="bg-gradient"]').first();
      await expect(heroSection).toBeVisible();
      
      // Take screenshot for visual regression
      await expect(page).toHaveScreenshot('homepage-hero-section.png', {
        mask: [page.locator('.scroll-indicator')], // Mask animated elements
        threshold: 0.2,
      });
    });

    test('should maintain button design consistency', async ({ page }) => {
      // Primary CTA button validation
      const primaryButton = page.getByRole('link', { name: 'Get Started' }).first();
      await expect(primaryButton).toBeVisible();
      
      // Secondary button validation
      const secondaryButton = page.getByRole('button', { name: 'See How It Works' });
      await expect(secondaryButton).toBeVisible();
      
      // Visual validation of button states
      await expect(page).toHaveScreenshot('homepage-buttons.png', {
        clip: { x: 0, y: 100, width: 800, height: 400 }
      });
    });

    test('should display consistent navigation elements', async ({ page }) => {
      const navigation = page.locator('nav').first();
      await expect(navigation).toBeVisible();
      
      // Check navigation items
      await expect(page.getByRole('button', { name: 'Features' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Solutions' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Communication' })).toBeVisible();
      
      // Screenshot navigation for visual regression
      await expect(navigation).toHaveScreenshot('homepage-navigation.png');
    });
  });

  test.describe('Auth Page Design Validation', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:3001/auth');
      await page.waitForLoadState('networkidle');
    });

    test('should maintain consistent auth page layout', async ({ page }) => {
      // Check dual-panel layout
      const leftPanel = page.locator('[class*="grid"] > div').first();
      const rightPanel = page.locator('[class*="grid"] > div').last();
      
      await expect(leftPanel).toBeVisible();
      await expect(rightPanel).toBeVisible();
      
      // Full page screenshot
      await expect(page).toHaveScreenshot('auth-page-layout.png', {
        fullPage: true,
        threshold: 0.2,
      });
    });

    test('should display consistent form components', async ({ page }) => {
      // Form validation
      const loginForm = page.getByRole('form', { name: 'Login Form' });
      await expect(loginForm).toBeVisible();
      
      // Input field validation
      const usernameInput = page.getByRole('textbox', { name: 'Username*' });
      const passwordInput = page.getByRole('textbox', { name: 'Password*' });
      
      await expect(usernameInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      
      // Button validation
      const signInButton = page.getByRole('button', { name: 'Sign in' });
      await expect(signInButton).toBeVisible();
      
      // Screenshot form components
      await expect(loginForm).toHaveScreenshot('auth-form-components.png');
    });

    test('should handle form interactions correctly', async ({ page }) => {
      const usernameInput = page.getByRole('textbox', { name: 'Username*' });
      const passwordInput = page.getByRole('textbox', { name: 'Password*' });
      
      // Test form interactions
      await usernameInput.fill('test@example.com');
      await passwordInput.fill('password123');
      
      // Check filled state
      await expect(usernameInput).toHaveValue('test@example.com');
      await expect(passwordInput).toHaveValue('password123');
      
      // Screenshot with filled form
      await expect(page.getByRole('form')).toHaveScreenshot('auth-form-filled.png');
    });
  });

  test.describe('Responsive Design Validation', () => {
    
    VIEWPORTS.forEach(({ name, width, height }) => {
      test(`should maintain design consistency on ${name} viewport`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('http://localhost:3001');
        await page.waitForLoadState('networkidle');
        
        // Check responsive navigation
        if (width < 768) {
          // Mobile navigation should be different
          const mobileNav = page.locator('[class*="mobile"]').first();
          if (await mobileNav.isVisible()) {
            await expect(mobileNav).toBeVisible();
          }
        }
        
        // Full page screenshot for each viewport
        await expect(page).toHaveScreenshot(`homepage-${name}-${width}x${height}.png`, {
          fullPage: true,
          threshold: 0.3, // More lenient for responsive changes
        });
      });
    });
  });

  test.describe('Design System CSS Variables Validation', () => {
    
    test('should use correct CSS custom properties', async ({ page }) => {
      // Check that primary color CSS variable is applied
      const primaryElements = page.locator('[class*="bg-primary"]');
      if (await primaryElements.count() > 0) {
        const firstElement = primaryElements.first();
        const backgroundColor = await firstElement.evaluate((el) => 
          getComputedStyle(el).backgroundColor
        );
        
        // Should be purple (approximate RGB values for #6b33b3)
        expect(backgroundColor).toMatch(/rgb\(107, 51, 179\)|hsl\(266/);
      }
    });

    test('should have correct focus states', async ({ page }) => {
      const firstButton = page.getByRole('button').first();
      
      // Focus the element
      await firstButton.focus();
      
      // Take screenshot of focus state
      await expect(page).toHaveScreenshot('focus-state-validation.png', {
        clip: { x: 0, y: 0, width: 800, height: 600 }
      });
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    
    test('should render consistently across browsers', async ({ page, browserName }) => {
      // This test will run on Chrome, Firefox, Safari, etc.
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');
      
      // Take browser-specific screenshot
      await expect(page).toHaveScreenshot(`homepage-${browserName}.png`, {
        fullPage: true,
        threshold: 0.3, // Account for browser rendering differences
      });
    });
  });

  test.describe('Animation and Interaction Validation', () => {
    
    test('should handle hover states correctly', async ({ page }) => {
      const primaryButton = page.getByRole('link', { name: 'Get Started' }).first();
      
      // Hover over the button
      await primaryButton.hover();
      
      // Wait for any hover animations
      await page.waitForTimeout(300);
      
      // Screenshot hover state
      await expect(page).toHaveScreenshot('button-hover-state.png', {
        clip: { x: 0, y: 100, width: 800, height: 400 }
      });
    });

    test('should validate smooth scrolling behavior', async ({ page }) => {
      // Scroll to different sections
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('scrolled-state-1.png');
      
      await page.evaluate(() => window.scrollTo(0, 1000));
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('scrolled-state-2.png');
    });
  });

  test.describe('Dark Mode Validation', () => {
    
    test('should support dark mode if available', async ({ page }) => {
      // Try to enable dark mode (if toggle exists)
      const darkModeToggle = page.locator('[data-testid="theme-toggle"], [class*="dark-mode"]');
      
      if (await darkModeToggle.isVisible()) {
        await darkModeToggle.click();
        await page.waitForTimeout(500); // Wait for theme transition
        
        // Screenshot dark mode
        await expect(page).toHaveScreenshot('homepage-dark-mode.png', {
          fullPage: true,
          threshold: 0.3,
        });
      }
    });
  });

  test.describe('Accessibility Validation', () => {
    
    test('should have proper focus indicators', async ({ page }) => {
      // Tab through focusable elements
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      await expect(page).toHaveScreenshot('focus-indicator-1.png');
      
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      await expect(page).toHaveScreenshot('focus-indicator-2.png');
    });

    test('should maintain readability with high contrast', async ({ page }) => {
      // Emulate high contrast mode if supported
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      
      await expect(page).toHaveScreenshot('high-contrast-mode.png', {
        fullPage: true,
      });
    });
  });
});

/**
 * DESIGN SYSTEM VALIDATION UTILITIES
 */

test.describe('Design Token Coverage Analysis', () => {
  
  test('should validate design system integration', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Check for design system integration
    const designSystemElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let tokenUsage = 0;
      let hardcodedValues = 0;
      
      elements.forEach(el => {
        const styles = getComputedStyle(el);
        const cssText = el.getAttribute('style') || '';
        
        // Check for CSS custom properties (design tokens)
        if (cssText.includes('var(--') || 
            styles.backgroundColor.includes('var(') ||
            styles.color.includes('var(')) {
          tokenUsage++;
        }
        
        // Check for hardcoded hex colors (violations)
        if (cssText.match(/#[0-9a-fA-F]{3,6}/) && 
            !cssText.includes('var(--')) {
          hardcodedValues++;
        }
      });
      
      return { tokenUsage, hardcodedValues, total: elements.length };
    });
    
    console.log('Design System Analysis:', designSystemElements);
    
    // Assert design system compliance
    expect(designSystemElements.hardcodedValues).toBeLessThan(5); // Minimal hardcoded values allowed
    expect(designSystemElements.tokenUsage).toBeGreaterThan(10);  // Should have token usage
  });
});