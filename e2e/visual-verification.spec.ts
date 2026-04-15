import { test, expect } from '@playwright/test';

test.describe('Visual Verification - Critical UI Components', () => {

  test.describe('Navigation & Header', () => {
    test('should display RS Aero FKT logo in header', async ({ page }) => {
      await page.goto('/');

      // Check for logo presence and functionality
      const logo = page.locator('img[alt*="RS Aero FKT"], [alt*="RS Aero"]');
      await expect(logo).toBeVisible();

      // Verify logo links to home page
      const logoLink = page.locator('a').filter({ has: logo });
      await expect(logoLink).toHaveAttribute('href', '/');
    });

    test('should show all required navigation items', async ({ page }) => {
      await page.goto('/');

      // Check for required navigation items
      const navItems = ['FKTs', 'Courses', 'Guidelines', 'Contact'];

      for (const item of navItems) {
        const navLink = page.locator(`nav a:has-text("${item}"), a[href*="/${item.toLowerCase()}"]`);
        await expect(navLink).toBeVisible();
      }

      // Check for User/Auth section
      const userSection = page.locator('button:has-text("Sign In"), [data-testid="user-menu"], button[aria-label*="user"]');
      await expect(userSection).toBeVisible();
    });

    test('should show admin menu (visibility is acceptable)', async ({ page }) => {
      await page.goto('/');

      // Admin menu visibility is acceptable per user requirements
      // Real security protection should be at the functional level (page/action protection)
      const adminMenu = page.locator('button:has-text("Admin"), [data-testid="admin-menu"]');

      // Just verify the menu exists (visibility is OK)
      await expect(adminMenu).toBeVisible();

      // Note: Actual security should be enforced at:
      // - Course approval/rejection actions
      // - Editing start/finish/turning points functionality
      // - Course revocation functionality
    });

    test('should have responsive navigation on mobile', async ({ page, isMobile }) => {
      if (isMobile) {
        await page.goto('/');

        // On mobile, navigation should be accessible
        // This tests for the missing mobile menu implementation found in Nav.tsx
        const mobileMenuButton = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"], .hamburger');
        const mainNav = page.locator('nav');

        if (await mobileMenuButton.isVisible()) {
          // If there's a mobile menu button, it should work
          await mobileMenuButton.click();
          await expect(mainNav).toBeVisible();
        } else {
          // If no mobile menu, main nav should still be accessible
          const navItems = page.locator('nav a');
          await expect(navItems.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Map Components - LayersControl Verification', () => {
    test('should have proper map layer controls on course pages', async ({ page }) => {
      // Test on a course page (you may need to adjust the URL based on actual data)
      await page.goto('/courses');

      // Wait for the page to load
      await page.waitForTimeout(2000);

      // Check for Leaflet LayersControl
      const layersControl = page.locator('.leaflet-control-layers');

      if (await layersControl.isVisible()) {
        // Verify Marine Chart option exists and is checked by default
        await layersControl.click(); // Open the layers panel

        const marineChartOption = page.locator('.leaflet-control-layers input[type="radio"]:checked + span:has-text("Marine")');
        await expect(marineChartOption).toBeVisible();

        // Verify Street Map option exists
        const streetMapOption = page.locator('.leaflet-control-layers span:has-text("Street")');
        await expect(streetMapOption).toBeVisible();

        // Verify Nautical Information overlay is present and checked
        const nauticalOverlay = page.locator('.leaflet-control-layers input[type="checkbox"]:checked + span:has-text("Nautical")');
        await expect(nauticalOverlay).toBeVisible();
      }
    });

    test('should verify track map has proper color coding', async ({ page }) => {
      // This would test the track color regression issue mentioned in memory
      await page.goto('/fkts');

      // Wait for any FKT attempts to load
      await page.waitForTimeout(2000);

      // Look for track details page links and test one
      const fktLink = page.locator('a[href*="/fkts/"]').first();
      if (await fktLink.isVisible()) {
        await fktLink.click();

        // Wait for map and track to load
        await page.waitForTimeout(3000);

        // Check for track polylines with different colors
        const trackPolylines = page.locator('.leaflet-overlay-pane svg path[stroke]');

        if ((await trackPolylines.count()) > 0) {
          // Verify we have polylines with different stroke colors (blue for race, grey for pre/post)
          const firstPolyline = trackPolylines.first();
          const strokeColor = await firstPolyline.getAttribute('stroke');
          expect(strokeColor).toBeDefined();
          expect(['#0ea5e9', '#6b7280', 'blue', 'gray']).toContain(strokeColor);
        }
      }
    });
  });

  test.describe('Layout & Responsive Design', () => {
    const viewports = [
      { name: 'Desktop', width: 1440, height: 900 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 390, height: 844 }
    ];

    for (const viewport of viewports) {
      test(`should render properly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');

        // Check for horizontal scrolling (should not exist)
        const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
        const bodyClientWidth = await page.evaluate(() => document.body.clientWidth);

        if (bodyScrollWidth > bodyClientWidth + 5) { // 5px tolerance
          throw new Error(`Horizontal scrolling detected on ${viewport.name}! ScrollWidth: ${bodyScrollWidth}, ClientWidth: ${bodyClientWidth}`);
        }

        // Verify header is visible and properly positioned
        const header = page.locator('header');
        await expect(header).toBeVisible();

        // Verify main content doesn't overlap with header
        const headerBox = await header.boundingBox();
        const mainContent = page.locator('main').first();

        if (await mainContent.isVisible()) {
          const mainBox = await mainContent.boundingBox();
          if (headerBox && mainBox && mainBox.y < headerBox.y + headerBox.height) {
            throw new Error(`Content overlap detected on ${viewport.name}! Header overlaps main content.`);
          }
        }
      });
    }
  });

  test.describe('Console Errors & Network Issues', () => {
    test('should not have JavaScript console errors', async ({ page }) => {
      const errors: string[] = [];

      // Capture console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(`Console Error: ${msg.text()}`);
        }
      });

      // Capture page errors
      page.on('pageerror', (error) => {
        errors.push(`Page Error: ${error.message}`);
      });

      await page.goto('/');
      await page.waitForTimeout(3000); // Wait for JS to execute

      // Filter out known non-critical errors (like failed optional resources)
      const criticalErrors = errors.filter(error =>
        !error.includes('favicon.ico') &&
        !error.includes('Manifest') &&
        !error.includes('ServiceWorker')
      );

      if (criticalErrors.length > 0) {
        throw new Error(`JavaScript errors detected:\n${criticalErrors.join('\n')}`);
      }
    });

    test('should not have failed network requests for critical resources', async ({ page }) => {
      const failedRequests: string[] = [];

      page.on('response', (response) => {
        if (response.status() >= 400) {
          const url = response.url();
          // Only flag critical resources
          if (url.includes('.css') || url.includes('.js') || url.includes('/api/')) {
            failedRequests.push(`${response.status()} - ${url}`);
          }
        }
      });

      await page.goto('/');
      await page.waitForTimeout(3000);

      if (failedRequests.length > 0) {
        throw new Error(`Failed critical resource requests:\n${failedRequests.join('\n')}`);
      }
    });
  });

  test.describe('Visual Regression - Screenshots', () => {
    test('should match landing page screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);

      // Hide dynamic content that changes between runs
      await page.addStyleTag({
        content: `
          .animate-spin { animation: none !important; }
          [data-testid="timestamp"] { visibility: hidden !important; }
        `
      });

      await expect(page).toHaveScreenshot('landing-page.png');
    });

    test('should match navigation header across viewport sizes', async ({ page }) => {
      const viewports = [
        { width: 1440, height: 900, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 390, height: 844, name: 'mobile' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/');
        await page.waitForTimeout(1000);

        const header = page.locator('header');
        await expect(header).toHaveScreenshot(`header-${viewport.name}.png`);
      }
    });
  });
});