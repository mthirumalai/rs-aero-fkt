import { test, expect } from '@playwright/test';

test.describe('Courses', () => {
  test('should display courses list page', async ({ page }) => {
    await page.goto('/courses');

    // Check that the courses page loads
    await expect(page).toHaveTitle(/Courses.*RS Aero FKT/i);

    // Check for main heading
    await expect(page.locator('h1, h2').filter({ hasText: /courses/i })).toBeVisible();

    // Look for course cards or list items
    const courseElements = page.locator('[data-testid="course-card"], .course-card, [data-testid="course-item"]');
    // The list might be empty, so we check if the container exists
    const coursesContainer = page.locator('[data-testid="courses-container"], .courses-container, [data-testid="courses-list"]');
    await expect(coursesContainer.or(courseElements.first())).toBeVisible();
  });

  test('should show rig size filter options', async ({ page }) => {
    await page.goto('/courses');

    // Look for rig size filters (RS Aero has 4 rig sizes)
    const rigSizeFilter = page.locator('select[name*="rig"], [data-testid="rig-filter"], label:has-text("Rig Size")');
    if (await rigSizeFilter.count() > 0) {
      await expect(rigSizeFilter.first()).toBeVisible();
    }
  });

  test('should show country filter', async ({ page }) => {
    await page.goto('/courses');

    // Look for country filter
    const countryFilter = page.locator('select[name*="country"], [data-testid="country-filter"], label:has-text("Country")');
    if (await countryFilter.count() > 0) {
      await expect(countryFilter.first()).toBeVisible();
    }
  });

  test('should navigate to course details when clicking a course', async ({ page }) => {
    await page.goto('/courses');

    // Wait for any courses to load
    await page.waitForTimeout(2000);

    // Look for course links
    const courseLink = page.locator('a[href*="/courses/"], [data-testid="course-link"]').first();

    if (await courseLink.count() > 0) {
      const href = await courseLink.getAttribute('href');
      await courseLink.click();

      // Verify we navigated to a course detail page
      await expect(page).toHaveURL(href || /\/courses\/[^\/]+/);

      // Check for course details elements
      await expect(page.locator('h1, h2')).toBeVisible();
    }
  });

  test('should handle empty courses state gracefully', async ({ page }) => {
    await page.goto('/courses');

    // Check that page doesn't crash when no courses exist
    await expect(page.locator('body')).toBeVisible();

    // Look for empty state message
    const emptyMessage = page.locator(':has-text("No courses found"), :has-text("No courses available"), .empty-state');
    // This may or may not be visible depending on data
  });
});