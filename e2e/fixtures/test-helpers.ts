import { Page, expect } from '@playwright/test';

/**
 * Helper functions for E2E tests
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for the app to be ready (no loading spinners, etc.)
   */
  async waitForAppReady() {
    // Wait for any loading spinners to disappear
    const loadingSpinner = this.page.locator('.loading, .spinner, [data-testid="loading"]');
    if (await loadingSpinner.count() > 0) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Wait for main content to be visible
    await this.page.locator('main, body').waitFor({ state: 'visible' });
  }

  /**
   * Navigate and wait for page to be ready
   */
  async navigateAndWait(url: string) {
    await this.page.goto(url);
    await this.waitForAppReady();
  }

  /**
   * Check if user appears to be authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const authIndicators = this.page.locator(
      'button:has-text("Sign Out"), [data-testid="user-menu"], .user-avatar'
    );
    return (await authIndicators.count()) > 0;
  }

  /**
   * Mock authentication state if needed
   */
  async mockAuthentication(userData = { name: 'Test User', email: 'test@example.com' }) {
    // This would set up mock auth state
    await this.page.addInitScript((user) => {
      // Mock authenticated state
      window.localStorage.setItem('mockUser', JSON.stringify(user));
    }, userData);
  }

  /**
   * Wait for map to load (Leaflet)
   */
  async waitForMapReady() {
    const map = this.page.locator('.leaflet-container');
    await map.waitFor({ state: 'visible', timeout: 10000 });

    // Wait for map tiles to load
    await this.page.waitForFunction(() => {
      const container = document.querySelector('.leaflet-container');
      if (!container) return false;

      const tiles = container.querySelectorAll('.leaflet-tile');
      return tiles.length > 0;
    }, { timeout: 15000 });
  }

  /**
   * Generate a mock GPX file for testing
   */
  createMockGPXFile(name: string = 'test-track.gpx'): string {
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <metadata>
    <name>Test Track</name>
  </metadata>
  <trk>
    <name>Test Route</name>
    <trkseg>
      <trkpt lat="50.0000" lon="-1.0000">
        <time>2024-01-01T10:00:00Z</time>
      </trkpt>
      <trkpt lat="50.0010" lon="-1.0010">
        <time>2024-01-01T10:01:00Z</time>
      </trkpt>
      <trkpt lat="50.0020" lon="-1.0020">
        <time>2024-01-01T10:02:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;
    return gpxContent;
  }

  /**
   * Upload a file to a file input
   */
  async uploadFile(selector: string, fileName: string, content: string, mimeType: string = 'text/plain') {
    const fileInput = this.page.locator(selector);
    await expect(fileInput).toBeVisible();

    await fileInput.setInputFiles({
      name: fileName,
      mimeType: mimeType,
      buffer: Buffer.from(content)
    });
  }

  /**
   * Wait for form submission to complete
   */
  async waitForFormSubmission() {
    // Wait for any loading states
    const loadingStates = this.page.locator('.submitting, [data-testid="submitting"], button:disabled');
    if (await loadingStates.count() > 0) {
      await loadingStates.first().waitFor({ state: 'hidden', timeout: 30000 });
    }
  }

  /**
   * Check for error messages
   */
  async expectNoErrors() {
    const errorMessages = this.page.locator('.error, .alert-error, [role="alert"]');
    if (await errorMessages.count() > 0) {
      const errorText = await errorMessages.first().textContent();
      throw new Error(`Unexpected error found: ${errorText}`);
    }
  }

  /**
   * Wait for charts to render (Recharts)
   */
  async waitForChartReady() {
    const chart = this.page.locator('.recharts-wrapper');
    if (await chart.count() > 0) {
      await chart.waitFor({ state: 'visible', timeout: 10000 });

      // Wait for chart data to render
      await this.page.waitForFunction(() => {
        const chartWrapper = document.querySelector('.recharts-wrapper');
        if (!chartWrapper) return false;

        const paths = chartWrapper.querySelectorAll('path, rect, circle');
        return paths.length > 0;
      }, { timeout: 15000 });
    }
  }

  /**
   * Test responsive behavior
   */
  async testMobileLayout() {
    await this.page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await this.page.waitForTimeout(500); // Let layout settle
  }

  async testTabletLayout() {
    await this.page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await this.page.waitForTimeout(500);
  }

  async testDesktopLayout() {
    await this.page.setViewportSize({ width: 1280, height: 720 }); // Desktop
    await this.page.waitForTimeout(500);
  }
}