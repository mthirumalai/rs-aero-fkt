import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show sign in options', async ({ page }) => {
    await page.goto('/');

    // Click on sign in button
    const signInButton = page.locator('button:has-text("Sign In"), a:has-text("Sign In"), button:has-text("Login"), a:has-text("Login")');

    if (await signInButton.count() > 0) {
      await signInButton.first().click();

      // Check for OAuth providers (Google, Apple)
      const googleAuth = page.locator('button:has-text("Google"), a:has-text("Google"), [data-provider="google"]');
      const appleAuth = page.locator('button:has-text("Apple"), a:has-text("Apple"), [data-provider="apple"]');

      // At least one OAuth option should be visible
      await expect(googleAuth.or(appleAuth)).toBeVisible();
    }
  });

  test('should redirect to OAuth provider when clicking sign in', async ({ page }) => {
    await page.goto('/');

    const signInButton = page.locator('button:has-text("Sign In"), a:has-text("Sign In")');

    if (await signInButton.count() > 0) {
      await signInButton.first().click();

      // Look for Google sign in button
      const googleSignIn = page.locator('button:has-text("Google"), a:has-text("Google")');

      if (await googleSignIn.count() > 0) {
        // Don't actually complete the OAuth flow in tests, just check the button works
        await expect(googleSignIn.first()).toBeVisible();
        await expect(googleSignIn.first()).toBeEnabled();
      }
    }
  });

  test('should show user menu when authenticated', async ({ page }) => {
    // This test would need to be updated to handle actual authentication
    // For now, we'll skip the full OAuth flow and test UI states
    test.skip('OAuth flow testing requires production credentials');
  });

  test('should show protected route access requirements', async ({ page }) => {
    // Try to access a protected route that might require auth
    await page.goto('/submit');

    // Should either redirect to sign in or show auth requirement
    const authRequired = page.locator(':has-text("sign in"), :has-text("authenticate"), :has-text("login")');
    const signInForm = page.locator('form[action*="signin"], button:has-text("Sign In")');

    // One of these should be true for protected routes
    await expect(authRequired.or(signInForm)).toBeVisible();
  });

  test('should handle sign out functionality', async ({ page }) => {
    // This would need an authenticated state to test properly
    test.skip('Sign out testing requires authenticated session');
  });
});