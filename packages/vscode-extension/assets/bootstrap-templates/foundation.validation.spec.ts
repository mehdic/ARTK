/**
 * ARTK Foundation Validation Tests
 *
 * These tests validate that ARTK is correctly configured after bootstrap.
 * They run without requiring the application to be running.
 *
 * Run with: npm run test:validation
 * Or: npx playwright test --project=validation
 */
import { test, expect } from '@playwright/test';

test.describe('ARTK Foundation Validation', () => {
  test.describe('Configuration', () => {
    test('baseURL is configured and valid', async ({ baseURL }) => {
      expect(baseURL).toBeTruthy();
      expect(baseURL).toMatch(/^https?:\/\/.+/);
    });

    test('baseURL is not a placeholder', async ({ baseURL }) => {
      // Ensure env var resolution worked
      expect(baseURL).not.toContain('${');
      expect(baseURL).not.toContain('undefined');
    });
  });

  test.describe('Navigation', () => {
    test('can reach baseURL when app is running', async ({ page, baseURL }) => {
      // Skip if no server - this test is opt-in
      test.skip(
        !process.env.ARTK_VALIDATE_NAVIGATION,
        'Set ARTK_VALIDATE_NAVIGATION=1 to test (requires app running)'
      );

      const response = await page.goto(baseURL!, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
    });

    test('page does not show connection error', async ({ page, baseURL }) => {
      test.skip(
        !process.env.ARTK_VALIDATE_NAVIGATION,
        'Set ARTK_VALIDATE_NAVIGATION=1 to test (requires app running)'
      );

      await page.goto(baseURL!, { waitUntil: 'domcontentloaded' });
      // Check for common browser error messages
      const title = await page.title();
      expect(title.toLowerCase()).not.toContain('cannot be reached');
      expect(title.toLowerCase()).not.toContain('refused');
      expect(title.toLowerCase()).not.toContain('not found');
    });
  });

  test.describe('Test Infrastructure', () => {
    test('Playwright is correctly installed', async ({ browserName }) => {
      expect(browserName).toBeTruthy();
      expect(['chromium', 'firefox', 'webkit']).toContain(browserName);
    });

    test('test fixtures are available', async ({ page, context, browser }) => {
      expect(page).toBeTruthy();
      expect(context).toBeTruthy();
      expect(browser).toBeTruthy();
    });
  });
});
