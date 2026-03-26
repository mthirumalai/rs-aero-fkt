import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load landing page successfully', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads without errors
    await expect(page).toHaveTitle(/RS Aero FKT/i);

    // Check for key landing page elements
    await expect(page.locator('h1')).toBeVisible();

    // Verify navigation elements are present
    const navigation = page.locator('nav');
    await expect(navigation).toBeVisible();
  });

  test('should show routes navigation link', async ({ page }) => {
    await page.goto('/');

    // Look for routes link in navigation
    const routesLink = page.locator('a[href*="/routes"], a:has-text("Routes")');
    await expect(routesLink).toBeVisible();
  });

  test('should show authentication button', async ({ page }) => {
    await page.goto('/');

    // Look for sign in/login button
    const authButton = page.locator('button:has-text("Sign In"), button:has-text("Login"), a:has-text("Sign In"), a:has-text("Login")');
    await expect(authButton).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (isMobile) {
      await page.goto('/');

      // Check that the page renders properly on mobile
      await expect(page.locator('h1')).toBeVisible();

      // Verify mobile navigation works (if there's a hamburger menu)
      const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        // Check if navigation items are now visible
        const navigation = page.locator('nav');
        await expect(navigation).toBeVisible();
      }
    }
  });
});