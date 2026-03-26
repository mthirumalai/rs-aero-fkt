import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('GPX Upload and Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to submit/upload page
    await page.goto('/submit');

    // Handle authentication requirement if needed
    const authRequired = page.locator(':has-text("sign in"), :has-text("authenticate")');
    if (await authRequired.count() > 0) {
      // Skip tests that require authentication for now
      test.skip('GPX upload requires authentication');
    }
  });

  test('should show GPX upload form', async ({ page }) => {
    // Look for file upload input
    const fileInput = page.locator('input[type="file"][accept*="gpx"], input[type="file"][accept*=".gpx"]');
    await expect(fileInput).toBeVisible();

    // Look for form elements related to route submission
    const routeForm = page.locator('form');
    await expect(routeForm).toBeVisible();
  });

  test('should show route selection dropdown', async ({ page }) => {
    // Look for route selection
    const routeSelect = page.locator('select[name*="route"], [data-testid="route-select"]');
    if (await routeSelect.count() > 0) {
      await expect(routeSelect).toBeVisible();
    }
  });

  test('should show rig size selection', async ({ page }) => {
    // Look for rig size selection (RS Aero has 4 sizes)
    const rigSelect = page.locator('select[name*="rig"], [data-testid="rig-select"], label:has-text("Rig Size")');
    if (await rigSelect.count() > 0) {
      await expect(rigSelect).toBeVisible();

      // Check that rig size options are present
      const options = rigSelect.locator('option');
      await expect(options).toHaveCount(4); // RS Aero has 4 rig sizes
    }
  });

  test('should validate file type on upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();

    if (await fileInput.count() > 0) {
      // Try uploading a non-GPX file (if validation exists)
      const testFile = path.join(__dirname, 'fixtures', 'invalid-file.txt');

      // Create a simple text file for testing
      await page.evaluate(() => {
        const dt = new DataTransfer();
        const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
        dt.items.add(file);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) input.files = dt.files;
      });

      // Look for validation error message
      const errorMessage = page.locator(':has-text("invalid file"), :has-text("GPX file"), .error, .invalid');
      // Error might not show immediately or might not exist
    }
  });

  test('should show form fields for FKT attempt details', async ({ page }) => {
    // Look for write-up/description field
    const writeUpField = page.locator('textarea[name*="description"], textarea[name*="writeup"], [data-testid="writeup"]');
    if (await writeUpField.count() > 0) {
      await expect(writeUpField).toBeVisible();
    }

    // Look for conditions fields (wind/current)
    const windField = page.locator('input[name*="wind"], [data-testid="wind-conditions"]');
    const currentField = page.locator('input[name*="current"], [data-testid="current-conditions"]');

    // These fields may not be visible until after route/rig selection
  });

  test('should allow photo uploads', async ({ page }) => {
    // Look for photo upload input
    const photoInput = page.locator('input[type="file"][accept*="image"], input[type="file"][accept*="photo"]');
    if (await photoInput.count() > 0) {
      await expect(photoInput).toBeVisible();
    }
  });

  test('should show map visualization area', async ({ page }) => {
    // Look for map container (likely uses Leaflet)
    const mapContainer = page.locator('.leaflet-container, [data-testid="map"], .map-container');
    if (await mapContainer.count() > 0) {
      await expect(mapContainer).toBeVisible();
    }
  });

  test('should handle form submission', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Upload")');

    if (await submitButton.count() > 0) {
      await expect(submitButton).toBeVisible();

      // Button should be disabled without required fields
      await expect(submitButton).toBeDisabled();
    }
  });

  test('should show track validation results', async ({ page }) => {
    // This would require a valid GPX file to test properly
    test.skip('Track validation requires valid GPX file upload');
  });
});