import { Page, expect } from '@playwright/test';

export class VisualVerificationHelper {
  constructor(private page: Page) {}

  /**
   * Check if the RS Aero FKT navigation header is properly implemented
   */
  async verifyNavigationHeader() {
    // Verify logo presence and link
    const logo = this.page.locator('img[alt*="RS Aero FKT"], [alt*="RS Aero"]');
    await expect(logo).toBeVisible();

    const logoLink = this.page.locator('a').filter({ has: logo });
    await expect(logoLink).toHaveAttribute('href', '/');

    // Verify all required navigation items
    const requiredNavItems = ['FKTs', 'Courses', 'Guidelines', 'Contact'];
    for (const item of requiredNavItems) {
      const navLink = this.page.locator(`nav a:has-text("${item}"), a[href*="/${item.toLowerCase()}"]`);
      await expect(navLink).toBeVisible();
    }

    // Verify user/auth section exists
    const userSection = this.page.locator('button:has-text("Sign In"), [data-testid="user-menu"], button[aria-label*="user"]');
    await expect(userSection).toBeVisible();
  }

  /**
   * Verify admin menu is present (visibility is acceptable)
   * Note: Real security protection should be at functional level
   */
  async verifyAdminMenuPresence() {
    const adminMenu = this.page.locator('button:has-text("Admin"), [data-testid="admin-menu"]');
    await expect(adminMenu).toBeVisible();

    // Note: Security should be enforced at:
    // - Course approval/rejection actions
    // - Editing start/finish/turning points functionality
    // - Course revocation functionality
  }

  /**
   * Verify mobile navigation functionality
   */
  async verifyMobileNavigation() {
    const mobileMenuButton = this.page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"], .hamburger');
    const mainNav = this.page.locator('nav');

    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await expect(mainNav).toBeVisible();
    } else {
      // If no mobile menu, main nav items should still be accessible
      const navItems = this.page.locator('nav a');
      const visibleNavItems = await navItems.count();
      if (visibleNavItems === 0) {
        throw new Error('Mobile navigation issue: No navigation items accessible on mobile');
      }
    }
  }

  /**
   * Verify map LayersControl implementation
   */
  async verifyMapLayersControl() {
    await this.page.waitForTimeout(2000); // Wait for map to load

    const layersControl = this.page.locator('.leaflet-control-layers');

    if (await layersControl.isVisible()) {
      await layersControl.click(); // Open the layers panel

      // Verify Marine Chart is default (checked)
      const marineChartChecked = this.page.locator('.leaflet-control-layers input[type="radio"]:checked + span:has-text("Marine")');
      await expect(marineChartChecked).toBeVisible();

      // Verify Street Map option exists
      const streetMapOption = this.page.locator('.leaflet-control-layers span:has-text("Street")');
      await expect(streetMapOption).toBeVisible();

      // Verify Nautical Information overlay is checked by default
      const nauticalOverlay = this.page.locator('.leaflet-control-layers input[type="checkbox"]:checked + span:has-text("Nautical")');
      await expect(nauticalOverlay).toBeVisible();

      return true;
    }
    return false;
  }

  /**
   * Check for horizontal scrolling issues
   */
  async checkForHorizontalScrolling() {
    const bodyScrollWidth = await this.page.evaluate(() => document.body.scrollWidth);
    const bodyClientWidth = await this.page.evaluate(() => document.body.clientWidth);

    if (bodyScrollWidth > bodyClientWidth + 5) { // 5px tolerance
      throw new Error(`Horizontal scrolling detected! ScrollWidth: ${bodyScrollWidth}, ClientWidth: ${bodyClientWidth}`);
    }
  }

  /**
   * Check for content overlap with header
   */
  async checkContentOverlap() {
    const header = this.page.locator('header');
    const mainContent = this.page.locator('main').first();

    if (await header.isVisible() && await mainContent.isVisible()) {
      const headerBox = await header.boundingBox();
      const mainBox = await mainContent.boundingBox();

      if (headerBox && mainBox && mainBox.y < headerBox.y + headerBox.height) {
        throw new Error('Content overlap detected! Header overlaps main content.');
      }
    }
  }

  /**
   * Capture and filter console errors
   */
  setupConsoleErrorCapture(): string[] {
    const errors: string[] = [];

    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`Console Error: ${msg.text()}`);
      }
    });

    this.page.on('pageerror', (error) => {
      errors.push(`Page Error: ${error.message}`);
    });

    return errors;
  }

  /**
   * Filter out non-critical console errors
   */
  filterCriticalErrors(errors: string[]): string[] {
    return errors.filter(error =>
      !error.includes('favicon.ico') &&
      !error.includes('Manifest') &&
      !error.includes('ServiceWorker') &&
      !error.includes('GoogleAnalytics') &&
      !error.includes('gtag')
    );
  }

  /**
   * Capture failed network requests for critical resources
   */
  setupNetworkMonitoring(): string[] {
    const failedRequests: string[] = [];

    this.page.on('response', (response) => {
      if (response.status() >= 400) {
        const url = response.url();
        // Only flag critical resources
        if (url.includes('.css') || url.includes('.js') || url.includes('/api/') || url.includes('.png') || url.includes('.jpg')) {
          failedRequests.push(`${response.status()} - ${url}`);
        }
      }
    });

    return failedRequests;
  }

  /**
   * Test page across multiple viewport sizes
   */
  async testResponsiveLayout(viewports: Array<{width: number, height: number, name: string}>) {
    const results = [];

    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
      await this.page.waitForTimeout(500); // Allow layout to settle

      try {
        await this.checkForHorizontalScrolling();
        await this.checkContentOverlap();
        results.push({ viewport: viewport.name, success: true });
      } catch (error) {
        results.push({
          viewport: viewport.name,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * Hide dynamic content for consistent screenshots
   */
  async hideDynamicContent() {
    await this.page.addStyleTag({
      content: `
        .animate-spin { animation: none !important; }
        [data-testid="timestamp"] { visibility: hidden !important; }
        [data-testid="live-data"] { visibility: hidden !important; }
        .loading { display: none !important; }
      `
    });
  }

  /**
   * Verify track color coding for FKT maps
   */
  async verifyTrackColorCoding() {
    await this.page.waitForTimeout(3000); // Wait for map and track to load

    const trackPolylines = this.page.locator('.leaflet-overlay-pane svg path[stroke]');
    const polylineCount = await trackPolylines.count();

    if (polylineCount > 0) {
      // Check that we have polylines with expected colors
      const expectedColors = ['#0ea5e9', '#6b7280', 'blue', 'gray', 'grey'];
      let hasValidColors = false;

      for (let i = 0; i < Math.min(3, polylineCount); i++) {
        const strokeColor = await trackPolylines.nth(i).getAttribute('stroke');
        if (strokeColor && expectedColors.some(color => strokeColor.includes(color))) {
          hasValidColors = true;
          break;
        }
      }

      if (!hasValidColors) {
        throw new Error('Track color coding issue: No expected colors found in track polylines');
      }
    }

    return polylineCount > 0;
  }
}

export const STANDARD_VIEWPORTS = [
  { width: 1440, height: 900, name: 'desktop' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 390, height: 844, name: 'mobile' }
];

export const RS_AERO_FKT_PAGES = [
  { url: '/', name: 'landing' },
  { url: '/fkts', name: 'fkts' },
  { url: '/courses', name: 'courses' },
  { url: '/stats', name: 'stats' },
  { url: '/guidelines', name: 'guidelines' },
  { url: '/contact', name: 'contact' },
  { url: '/courses/submit', name: 'submit-course' },
  { url: '/auth/signin', name: 'signin' }
];