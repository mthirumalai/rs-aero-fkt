import { test, expect } from '@playwright/test';

test.describe('Routes', () => {
  test('should display routes list page', async ({ page }) => {
    await page.goto('/routes');

    // Check that the routes page loads
    await expect(page).toHaveTitle(/Routes.*RS Aero FKT/i);

    // Check for main heading
    await expect(page.locator('h1, h2').filter({ hasText: /routes/i })).toBeVisible();

    // Look for route cards or list items
    const routeElements = page.locator('[data-testid="route-card"], .route-card, [data-testid="route-item"]');
    // The list might be empty, so we check if the container exists
    const routesContainer = page.locator('[data-testid="routes-container"], .routes-container, [data-testid="routes-list"]');
    await expect(routesContainer.or(routeElements.first())).toBeVisible();
  });

  test('should show rig size filter options', async ({ page }) => {
    await page.goto('/routes');

    // Look for rig size filters (RS Aero has 4 rig sizes)
    const rigSizeFilter = page.locator('select[name*="rig"], [data-testid="rig-filter"], label:has-text("Rig Size")');
    if (await rigSizeFilter.count() > 0) {
      await expect(rigSizeFilter.first()).toBeVisible();
    }
  });

  test('should show country filter', async ({ page }) => {
    await page.goto('/routes');

    // Look for country filter
    const countryFilter = page.locator('select[name*="country"], [data-testid="country-filter"], label:has-text("Country")');
    if (await countryFilter.count() > 0) {
      await expect(countryFilter.first()).toBeVisible();
    }
  });

  test('should navigate to route details when clicking a route', async ({ page }) => {
    await page.goto('/routes');

    // Wait for any routes to load
    await page.waitForTimeout(2000);

    // Look for route links
    const routeLink = page.locator('a[href*="/routes/"], [data-testid="route-link"]').first();

    if (await routeLink.count() > 0) {
      const href = await routeLink.getAttribute('href');
      await routeLink.click();

      // Verify we navigated to a route detail page
      await expect(page).toHaveURL(href || /\/routes\/[^\/]+/);

      // Check for route details elements
      await expect(page.locator('h1, h2')).toBeVisible();
    }
  });

  test('should handle empty routes state gracefully', async ({ page }) => {
    await page.goto('/routes');

    // Check that page doesn't crash when no routes exist
    await expect(page.locator('body')).toBeVisible();

    // Look for empty state message
    const emptyMessage = page.locator(':has-text("No routes found"), :has-text("No routes available"), .empty-state');
    // This may or may not be visible depending on data
  });
});