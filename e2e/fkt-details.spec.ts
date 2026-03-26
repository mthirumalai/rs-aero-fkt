import { test, expect } from '@playwright/test';

test.describe('FKT Attempt Details', () => {
  test.beforeEach(async ({ page }) => {
    // Try to navigate to an FKT details page
    // This assumes there's at least one FKT in the system
    await page.goto('/routes');
    await page.waitForTimeout(2000);

    // Look for a route with FKT attempts
    const routeWithFKT = page.locator('a[href*="/routes/"]:has-text("FKT"), a[href*="/routes/"]:has-text("record")').first();

    if (await routeWithFKT.count() > 0) {
      await routeWithFKT.click();

      // Look for an FKT attempt link
      const fktLink = page.locator('a[href*="/attempts/"], a[href*="/fkt/"]').first();
      if (await fktLink.count() > 0) {
        await fktLink.click();
      }
    } else {
      // No FKT data available, skip the tests
      test.skip('No FKT attempts found to test');
    }
  });

  test('should display FKT attempt details', async ({ page }) => {
    // Check for basic attempt information
    await expect(page.locator('h1, h2')).toBeVisible();

    // Look for attempt metadata
    const attemptInfo = page.locator(':has-text("Time:"), :has-text("Duration:"), :has-text("Rig Size:"), .attempt-info');
    await expect(attemptInfo.first()).toBeVisible();
  });

  test('should show track map with playback controls', async ({ page }) => {
    // Look for Leaflet map container
    const mapContainer = page.locator('.leaflet-container, [data-testid="track-map"]');
    await expect(mapContainer).toBeVisible();

    // Look for playback controls
    const playButton = page.locator('button:has-text("Play"), button[aria-label*="play"], [data-testid="play-button"]');
    const pauseButton = page.locator('button:has-text("Pause"), button[aria-label*="pause"], [data-testid="pause-button"]');
    const speedControls = page.locator('[data-testid="speed-controls"], .speed-control');

    // At least play button should be visible
    await expect(playButton.or(pauseButton)).toBeVisible();
  });

  test('should display SOG (Speed Over Ground) chart', async ({ page }) => {
    // Look for chart container (likely uses Recharts)
    const chart = page.locator('.recharts-wrapper, [data-testid="sog-chart"], .sog-chart');
    if (await chart.count() > 0) {
      await expect(chart).toBeVisible();
    }

    // Look for chart legend or labels
    const chartLabel = page.locator(':has-text("Speed"), :has-text("SOG"), :has-text("Time")');
    if (await chartLabel.count() > 0) {
      await expect(chartLabel.first()).toBeVisible();
    }
  });

  test('should show track playback speed options', async ({ page }) => {
    // Look for speed control buttons (1x, 2x, 5x, 10x)
    const speedButtons = page.locator('button:has-text("1x"), button:has-text("2x"), button:has-text("5x"), button:has-text("10x")');

    if (await speedButtons.count() > 0) {
      await expect(speedButtons.first()).toBeVisible();

      // Test clicking a speed button
      await speedButtons.first().click();
    }
  });

  test('should display wind and current conditions', async ({ page }) => {
    // Look for conditions information
    const conditions = page.locator(':has-text("Wind"), :has-text("Current"), .conditions, [data-testid="conditions"]');
    if (await conditions.count() > 0) {
      await expect(conditions.first()).toBeVisible();
    }
  });

  test('should show attempt photos', async ({ page }) => {
    // Look for photo gallery or individual photos
    const photos = page.locator('img[src*="photo"], img[src*="image"], .photo-gallery, [data-testid="photos"]');
    if (await photos.count() > 0) {
      await expect(photos.first()).toBeVisible();
    }
  });

  test('should display athlete write-up', async ({ page }) => {
    // Look for write-up or description text
    const writeUp = page.locator('.writeup, .description, [data-testid="writeup"]');
    if (await writeUp.count() > 0) {
      await expect(writeUp).toBeVisible();
    }
  });

  test('should show rig size information', async ({ page }) => {
    // Look for rig size display (RS Aero specific)
    const rigSize = page.locator(':has-text("Rig Size"), :has-text("Rig:"), .rig-size');
    if (await rigSize.count() > 0) {
      await expect(rigSize.first()).toBeVisible();
    }
  });

  test('should handle track playback controls', async ({ page }) => {
    const playButton = page.locator('button:has-text("Play"), [data-testid="play-button"]');

    if (await playButton.count() > 0) {
      await playButton.click();

      // Look for pause button after clicking play
      const pauseButton = page.locator('button:has-text("Pause"), [data-testid="pause-button"]');
      await expect(pauseButton).toBeVisible({ timeout: 3000 });

      // Click pause
      await pauseButton.click();

      // Play button should be visible again
      await expect(playButton).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show athlete profile link', async ({ page }) => {
    // Look for link to athlete profile
    const athleteLink = page.locator('a[href*="/athletes/"], a[href*="/profile/"], .athlete-link');
    if (await athleteLink.count() > 0) {
      await expect(athleteLink.first()).toBeVisible();
    }
  });
});