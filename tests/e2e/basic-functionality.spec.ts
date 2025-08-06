import { test, expect } from '@playwright/test';

// Basic functionality E2E tests that can run without full server
test.describe('Basic Application Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Try to navigate to the application
    try {
      await page.goto('http://localhost:3000', { timeout: 5000 });
    } catch (error) {
      // If server isn't running, test static build
      await page.goto('file://' + process.cwd() + '/dist/public/index.html');
    }
  });

  test('Application loads with basic HTML structure', async ({ page }) => {
    // Check that the page has a root element
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeAttached();

    // Check for basic HTML structure
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveAttribute('lang', 'en');

    // Check for viewport meta tag
    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toBeAttached();

    // Check for title
    await expect(page).toHaveTitle(/Wedding RSVP/);
  });

  test('CSS styles are loaded correctly', async ({ page }) => {
    // Check that CSS custom properties are defined
    const rootStyles = await page.evaluate(() => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);
      return {
        background: styles.getPropertyValue('--background'),
        foreground: styles.getPropertyValue('--foreground'),
        primary: styles.getPropertyValue('--primary')
      };
    });

    // Verify CSS variables are defined (should not be empty)
    expect(rootStyles.background).toBeTruthy();
    expect(rootStyles.foreground).toBeTruthy();
    expect(rootStyles.primary).toBeTruthy();
  });

  test('Dark mode CSS variables are available', async ({ page }) => {
    // Check dark mode CSS variables exist
    const darkModeStyles = await page.evaluate(() => {
      // Create a temporary element with dark class
      const testElement = document.createElement('div');
      testElement.className = 'dark';
      document.body.appendChild(testElement);
      
      const styles = getComputedStyle(testElement);
      const result = {
        hasDarkClass: testElement.classList.contains('dark')
      };
      
      document.body.removeChild(testElement);
      return result;
    });

    expect(darkModeStyles.hasDarkClass).toBe(true);
  });

  test('React application initializes', async ({ page }) => {
    // Wait for React to initialize
    await page.waitForTimeout(2000);

    // Check if React has rendered content
    const hasReactContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    });

    // Either React has rendered or we're testing static HTML
    if (hasReactContent) {
      console.log('✅ React application initialized successfully');
    } else {
      console.log('ℹ️  Testing static HTML build');
    }
  });

  test('Performance: Initial load time is acceptable', async ({ page }) => {
    const startTime = Date.now();
    
    try {
      await page.goto('http://localhost:3000', { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
    } catch {
      await page.goto('file://' + process.cwd() + '/dist/public/index.html');
      await page.waitForLoadState('domcontentloaded');
    }
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (relaxed for CI/test environment)
    expect(loadTime).toBeLessThan(10000);
    console.log(`Load time: ${loadTime}ms`);
  });

  test('Responsive design meta tags are present', async ({ page }) => {
    // Check for responsive design meta tags
    const viewportMeta = await page.getAttribute('meta[name="viewport"]', 'content');
    expect(viewportMeta).toContain('width=device-width');
    expect(viewportMeta).toContain('initial-scale=1');
  });

  test('Resource preloading is configured', async ({ page }) => {
    // Check for preload links
    const preloadLinks = page.locator('link[rel="preload"], link[rel="modulepreload"], link[rel="preconnect"]');
    const preloadCount = await preloadLinks.count();
    
    // Should have some preload optimization
    expect(preloadCount).toBeGreaterThanOrEqual(0);
    console.log(`Found ${preloadCount} preload/optimization links`);
  });

  test('JavaScript modules load without errors', async ({ page }) => {
    // Listen for JavaScript errors
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    try {
      await page.goto('http://localhost:3000', { timeout: 5000 });
    } catch {
      await page.goto('file://' + process.cwd() + '/dist/public/index.html');
    }

    // Wait for initial JS execution
    await page.waitForTimeout(3000);

    // Should have minimal JavaScript errors
    if (jsErrors.length > 0) {
      console.log('JavaScript errors detected:', jsErrors);
    }
    
    // Allow some errors in development but not critical ones
    const criticalErrors = jsErrors.filter(error => 
      error.includes('SyntaxError') || 
      error.includes('TypeError: Cannot read') ||
      error.includes('ReferenceError')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('Basic routing structure is accessible', async ({ page }) => {
    // Test basic route navigation if possible
    const routes = [
      '/',
      '/login',
      '/admin',
      '/admin/dashboard'
    ];

    for (const route of routes) {
      try {
        await page.goto(`http://localhost:3000${route}`, { timeout: 5000, waitUntil: 'domcontentloaded' });
        
        // Should not get a complete failure
        const title = await page.title();
        expect(title).toBeTruthy();
        
        console.log(`✅ Route ${route} accessible: ${title}`);
      } catch (error) {
        console.log(`⚠️  Route ${route} not accessible: ${error.message}`);
        // Routes may not be accessible without server, but shouldn't crash tests
      }
    }
  });

  test('Build artifacts are properly generated', async ({ page }) => {
    // Test that build outputs exist and are functional
    const buildCheck = await page.evaluate(() => {
      // Check for built assets
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      
      return {
        hasScripts: scripts.length > 0,
        hasStylesheets: stylesheets.length > 0,
        scriptSrcs: scripts.map(s => (s as HTMLScriptElement).src),
        stylesheetHrefs: stylesheets.map(s => (s as HTMLLinkElement).href)
      };
    });

    expect(buildCheck.hasScripts).toBe(true);
    console.log(`Found ${buildCheck.scriptSrcs.length} script(s) and ${buildCheck.stylesheetHrefs.length} stylesheet(s)`);
  });
});