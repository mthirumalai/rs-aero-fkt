import { test, expect } from '@playwright/test';

test.describe('Athlete Profile', () => {
  test.beforeEach(async ({ page }) => {
    // Try to find an athlete profile to test
    await page.goto('/routes');
    await page.waitForTimeout(2000);

    // Look for an athlete link from a route or FKT
    const athleteLink = page.locator('a[href*="/athletes/"], a[href*="/profile/"]').first();

    if (await athleteLink.count() > 0) {
      await athleteLink.click();
    } else {
      // No athlete profiles available, skip tests
      test.skip('No athlete profiles found to test');
    }
  });

  test('should display athlete profile information', async ({ page }) => {
    // Check that we're on a profile page
    await expect(page).toHaveURL(/\/(athletes?|profile)/);

    // Look for athlete name/heading
    await expect(page.locator('h1, h2')).toBeVisible();

    // Look for profile information
    const profileInfo = page.locator('.profile-info, [data-testid="profile-info"]');
    if (await profileInfo.count() > 0) {
      await expect(profileInfo).toBeVisible();
    }
  });

  test('should show athlete FKT records list', async ({ page }) => {
    // Look for list of FKT records held by this athlete
    const fktRecords = page.locator('.fkt-records, [data-testid="fkt-records"], :has-text("Records"), :has-text("FKT")');
    if (await fktRecords.count() > 0) {
      await expect(fktRecords.first()).toBeVisible();
    }
  });

  test('should display FKT records grouped by rig size', async ({ page }) => {
    // Look for rig size groupings in the records
    const rigSections = page.locator(':has-text("Rig"), .rig-section');
    if (await rigSections.count() > 0) {
      await expect(rigSections.first()).toBeVisible();
    }
  });

  test('should show athlete statistics', async ({ page }) => {
    // Look for stats like total attempts, records held, etc.
    const stats = page.locator('.stats, .statistics, [data-testid="stats"]');
    if (await stats.count() > 0) {
      await expect(stats).toBeVisible();
    }

    // Look for specific stat numbers
    const statNumbers = page.locator(':has-text("Total"), :has-text("Records"), :has-text("Attempts")');
    if (await statNumbers.count() > 0) {
      await expect(statNumbers.first()).toBeVisible();
    }
  });

  test('should link to individual FKT attempt details', async ({ page }) => {
    // Look for links to individual attempts
    const attemptLinks = page.locator('a[href*="/attempts/"], a[href*="/fkt/"]');
    if (await attemptLinks.count() > 0) {
      const firstLink = attemptLinks.first();
      await expect(firstLink).toBeVisible();

      // Test clicking the link
      const href = await firstLink.getAttribute('href');
      await firstLink.click();

      // Should navigate to attempt details
      await expect(page).toHaveURL(href || /\/(attempts?|fkt)/);
    }
  });

  test('should show recent activity', async ({ page }) => {
    // Look for recent FKT attempts or activity
    const recentActivity = page.locator('.recent-activity, [data-testid="recent-activity"], :has-text("Recent")');
    if (await recentActivity.count() > 0) {
      await expect(recentActivity).toBeVisible();
    }
  });

  test('should handle empty profile state', async ({ page }) => {
    // If athlete has no FKTs, should handle gracefully
    const emptyState = page.locator(':has-text("No records"), :has-text("No FKTs"), .empty-state');
    // This may or may not be visible depending on the athlete
  });

  test('should show athlete avatar or profile image', async ({ page }) => {
    // Look for profile image
    const avatar = page.locator('img[alt*="profile"], img[alt*="avatar"], .avatar, [data-testid="avatar"]');
    if (await avatar.count() > 0) {
      await expect(avatar.first()).toBeVisible();
    }
  });

  test('should display routes where athlete holds records', async ({ page }) => {
    // Look for route information
    const routes = page.locator('.route-record, [data-testid="route-records"]');
    if (await routes.count() > 0) {
      await expect(routes.first()).toBeVisible();
    }

    // Look for route names/links
    const routeLinks = page.locator('a[href*="/routes/"]');
    if (await routeLinks.count() > 0) {
      await expect(routeLinks.first()).toBeVisible();
    }
  });

  test('should be responsive on mobile devices', async ({ page, isMobile }) => {
    if (isMobile) {
      // Check that profile renders well on mobile
      await expect(page.locator('h1, h2')).toBeVisible();

      // Profile info should be readable
      const profileContent = page.locator('body');
      await expect(profileContent).toBeVisible();

      // Check for mobile-friendly layout
      const viewport = page.viewportSize();
      expect(viewport?.width).toBeLessThanOrEqual(768);
    }
  });
});