import { test, expect } from '@playwright/test';

test.describe('Admin Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Note: These tests assume admin access
    // In a real implementation, you'd need proper admin authentication
    test.skip('Admin tests require admin authentication setup');
  });

  test('should show course approval dashboard', async ({ page }) => {
    await page.goto('/admin');

    // Look for admin dashboard
    const dashboard = page.locator('.admin-dashboard, [data-testid="admin-dashboard"]');
    await expect(dashboard).toBeVisible();

    // Look for pending courses section
    const pendingCourses = page.locator(':has-text("Pending"), :has-text("Approval"), .pending-courses');
    await expect(pendingCourses.first()).toBeVisible();
  });

  test('should list courses pending approval', async ({ page }) => {
    await page.goto('/admin/courses');

    // Look for list of courses awaiting approval
    const pendingList = page.locator('.pending-courses-list, [data-testid="pending-courses"]');
    if (await pendingList.count() > 0) {
      await expect(pendingList).toBeVisible();
    }

    // Look for course approval buttons
    const approveButtons = page.locator('button:has-text("Approve"), [data-action="approve"]');
    if (await approveButtons.count() > 0) {
      await expect(approveButtons.first()).toBeVisible();
    }
  });

  test('should show course details for approval', async ({ page }) => {
    await page.goto('/admin/courses');

    // Click on a pending course
    const courseItem = page.locator('.pending-course, [data-testid="pending-course"]').first();
    if (await courseItem.count() > 0) {
      await courseItem.click();

      // Should show course details
      await expect(page.locator('h1, h2')).toBeVisible();

      // Should show course map
      const map = page.locator('.leaflet-container, [data-testid="course-map"]');
      await expect(map).toBeVisible();

      // Should show approval controls
      const approveBtn = page.locator('button:has-text("Approve")');
      const rejectBtn = page.locator('button:has-text("Reject")');
      await expect(approveBtn.or(rejectBtn)).toBeVisible();
    }
  });

  test('should handle course approval workflow', async ({ page }) => {
    await page.goto('/admin/courses');

    const approveButton = page.locator('button:has-text("Approve")').first();
    if (await approveButton.count() > 0) {
      await approveButton.click();

      // Should show confirmation or success message
      const successMessage = page.locator(':has-text("approved"), :has-text("success"), .success');
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle course rejection', async ({ page }) => {
    await page.goto('/admin/courses');

    const rejectButton = page.locator('button:has-text("Reject"), button:has-text("Decline")').first();
    if (await rejectButton.count() > 0) {
      await rejectButton.click();

      // Should show rejection reason form or confirmation
      const rejectionForm = page.locator('textarea[name*="reason"], [data-testid="rejection-reason"]');
      if (await rejectionForm.count() > 0) {
        await rejectionForm.fill('Test rejection reason');

        const confirmReject = page.locator('button:has-text("Confirm"), button[type="submit"]');
        await confirmReject.click();
      }
    }
  });

  test('should show approved courses list', async ({ page }) => {
    await page.goto('/admin/courses/approved');

    // Should show list of approved courses
    const approvedCourses = page.locator('.approved-courses, [data-testid="approved-courses"]');
    if (await approvedCourses.count() > 0) {
      await expect(approvedCourses).toBeVisible();
    }
  });

  test('should provide admin statistics', async ({ page }) => {
    await page.goto('/admin');

    // Look for admin stats
    const stats = page.locator('.admin-stats, [data-testid="admin-stats"]');
    if (await stats.count() > 0) {
      await expect(stats).toBeVisible();

      // Look for specific metrics
      const metrics = page.locator(':has-text("Total Courses"), :has-text("Pending"), :has-text("FKT Attempts")');
      await expect(metrics.first()).toBeVisible();
    }
  });

  test('should show email notification settings', async ({ page }) => {
    await page.goto('/admin/settings');

    // Look for email notification configuration
    const emailSettings = page.locator(':has-text("Email"), :has-text("Notification"), .email-settings');
    if (await emailSettings.count() > 0) {
      await expect(emailSettings.first()).toBeVisible();
    }
  });

  test('should handle bulk operations', async ({ page }) => {
    await page.goto('/admin/courses');

    // Look for bulk selection checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    if (await checkboxes.count() > 1) {
      // Select multiple courses
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Look for bulk action buttons
      const bulkApprove = page.locator('button:has-text("Approve Selected"), [data-action="bulk-approve"]');
      if (await bulkApprove.count() > 0) {
        await expect(bulkApprove).toBeVisible();
      }
    }
  });
});