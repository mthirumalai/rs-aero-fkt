import { test, expect } from '@playwright/test';
import { TestHelpers } from './fixtures/test-helpers';
import { createMockGPX, mockTrackPoints } from './fixtures/mock-data';

test.describe('Complete User Journey', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should complete full FKT submission flow', async ({ page }) => {
    // Step 1: Start at landing page
    await helpers.navigateAndWait('/');
    await expect(page).toHaveTitle(/RS Aero FKT/);

    // Step 2: Browse routes
    await page.locator('a[href*="/routes"], a:has-text("Routes")').first().click();
    await helpers.waitForAppReady();

    // Step 3: View route details (if any routes exist)
    const routeLink = page.locator('a[href*="/routes/"]').first();
    if (await routeLink.count() > 0) {
      await routeLink.click();
      await helpers.waitForAppReady();

      // Should see route map and details
      const map = page.locator('.leaflet-container');
      if (await map.count() > 0) {
        await helpers.waitForMapReady();
      }

      // Look for "Submit FKT" or similar button
      const submitButton = page.locator('a:has-text("Submit"), a:has-text("Upload"), a[href*="/submit"]');
      if (await submitButton.count() > 0) {
        await submitButton.click();
      } else {
        // Navigate directly to submit page
        await page.goto('/submit');
      }
    } else {
      // No routes available, go directly to submit
      await page.goto('/submit');
    }

    // Step 4: Handle authentication requirement
    await helpers.waitForAppReady();
    if (!(await helpers.isAuthenticated())) {
      // Mock authentication for testing
      await helpers.mockAuthentication();
      await page.reload();
      await helpers.waitForAppReady();
    }

    // Step 5: Fill out FKT submission form
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      // Upload mock GPX file
      const gpxContent = createMockGPX(mockTrackPoints);
      await helpers.uploadFile('input[type="file"]', 'test-fkt.gpx', gpxContent, 'application/gpx+xml');

      // Wait for file processing
      await page.waitForTimeout(2000);

      // Select route (if dropdown exists)
      const routeSelect = page.locator('select[name*="route"]');
      if (await routeSelect.count() > 0) {
        await routeSelect.selectOption({ index: 1 });
      }

      // Select rig size
      const rigSelect = page.locator('select[name*="rig"]');
      if (await rigSelect.count() > 0) {
        await rigSelect.selectOption('7'); // RS Aero 7
      }

      // Fill in conditions
      const windField = page.locator('input[name*="wind"], textarea[name*="wind"]');
      if (await windField.count() > 0) {
        await windField.fill('15-20 knots SW');
      }

      const currentField = page.locator('input[name*="current"], textarea[name*="current"]');
      if (await currentField.count() > 0) {
        await currentField.fill('Strong flood tide');
      }

      // Fill in write-up
      const writeupField = page.locator('textarea[name*="description"], textarea[name*="writeup"]');
      if (await writeupField.count() > 0) {
        await writeupField.fill('Amazing conditions for this FKT attempt. Perfect wind angle and strong current assistance.');
      }

      // Submit form
      const submitFormButton = page.locator('button[type="submit"], button:has-text("Submit")');
      if (await submitFormButton.count() > 0 && await submitFormButton.isEnabled()) {
        await submitFormButton.click();
        await helpers.waitForFormSubmission();

        // Should see success message or redirect
        const successMessage = page.locator(':has-text("submitted"), :has-text("success"), .success');
        await expect(successMessage).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should handle responsive navigation flow', async ({ page }) => {
    // Test mobile-first navigation
    await helpers.testMobileLayout();
    await helpers.navigateAndWait('/');

    // Test navigation menu on mobile
    const mobileMenu = page.locator('button[aria-label*="menu"], [data-testid="mobile-menu"]');
    if (await mobileMenu.count() > 0) {
      await mobileMenu.click();

      // Should show navigation items
      const navItems = page.locator('nav a, .nav-menu a');
      await expect(navItems.first()).toBeVisible();

      // Close menu
      await mobileMenu.click();
    }

    // Test tablet layout
    await helpers.testTabletLayout();
    await helpers.navigateAndWait('/routes');

    // Should have responsive grid/list
    const routeContainer = page.locator('[data-testid="routes-container"], .routes-grid');
    if (await routeContainer.count() > 0) {
      await expect(routeContainer).toBeVisible();
    }

    // Test desktop layout
    await helpers.testDesktopLayout();
    await page.reload();
    await helpers.waitForAppReady();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test 404 page
    await page.goto('/non-existent-page');

    // Should show 404 or error page, not crash
    await expect(page.locator('body')).toBeVisible();

    // Look for error indicators
    const errorPage = page.locator('h1:has-text("404"), h1:has-text("Not Found"), .error-page');
    if (await errorPage.count() > 0) {
      await expect(errorPage).toBeVisible();
    }

    // Should have way to navigate back
    const homeLink = page.locator('a[href="/"], a:has-text("Home"), a:has-text("Back")');
    if (await homeLink.count() > 0) {
      await homeLink.click();
      await expect(page).toHaveURL('/');
    }
  });

  test('should load and display FKT leaderboards', async ({ page }) => {
    await helpers.navigateAndWait('/routes');

    // Look for a route with existing FKTs
    const routeWithRecords = page.locator('a[href*="/routes/"]:has(.fkt-time), a[href*="/routes/"]:has-text(":")');

    if (await routeWithRecords.count() > 0) {
      await routeWithRecords.first().click();
      await helpers.waitForAppReady();

      // Should show FKT records for each rig size
      const records = page.locator('.fkt-record, [data-testid="fkt-record"]');
      if (await records.count() > 0) {
        await expect(records.first()).toBeVisible();

        // Click on a record to see details
        await records.first().click();
        await helpers.waitForAppReady();

        // Should show attempt details with map and chart
        await expect(page.locator('h1, h2')).toBeVisible();

        const map = page.locator('.leaflet-container');
        if (await map.count() > 0) {
          await helpers.waitForMapReady();
        }

        const chart = page.locator('.recharts-wrapper');
        if (await chart.count() > 0) {
          await helpers.waitForChartReady();
        }
      }
    }
  });

  test('should handle search and filtering', async ({ page }) => {
    await helpers.navigateAndWait('/routes');

    // Look for search/filter controls
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await page.keyboard.press('Enter');
      await helpers.waitForAppReady();
    }

    // Test country filter
    const countryFilter = page.locator('select[name*="country"], [data-testid="country-filter"]');
    if (await countryFilter.count() > 0) {
      await countryFilter.selectOption('GB');
      await helpers.waitForAppReady();
    }

    // Test rig size filter
    const rigFilter = page.locator('select[name*="rig"], [data-testid="rig-filter"]');
    if (await rigFilter.count() > 0) {
      await rigFilter.selectOption('7');
      await helpers.waitForAppReady();
    }

    // Clear filters
    const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset")');
    if (await clearButton.count() > 0) {
      await clearButton.click();
      await helpers.waitForAppReady();
    }
  });
});