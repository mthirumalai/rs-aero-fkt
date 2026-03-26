import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * This runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for RS Aero FKT E2E tests...');

  // Launch a browser to warm up and verify the app is running
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Check if the dev server is running
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

    console.log(`📡 Checking if app is available at ${baseURL}...`);

    // Try to access the homepage
    const response = await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30000 });

    if (!response?.ok()) {
      throw new Error(`App is not responding at ${baseURL}. Make sure your dev server is running with 'npm run dev'`);
    }

    console.log('✅ App is running and responsive');

    // Optionally, set up test data here
    // This could include:
    // - Creating test database entries
    // - Setting up mock S3 buckets
    // - Configuring test email settings

    console.log('🏁 Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;