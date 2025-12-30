/**
 * Loading state assertion helpers
 *
 * Provides assertions for verifying loading indicators and waiting for loading completion.
 * Implements FR-024: Loading state assertions with configurable selectors
 *
 * @module assertions/loading
 */

import { expect, type Page } from '@playwright/test';
import type { LoadingStateOptions } from './types.js';
import type { ARTKConfig } from '../config/types.js';

/**
 * Default loading indicator selectors
 *
 * Used when config is not provided or custom selectors are not specified.
 */
const DEFAULT_LOADING_SELECTORS = [
  '[data-loading="true"]',
  '.loading',
  '.spinner',
  '[aria-busy="true"]',
  '.loading-overlay',
  '[role="progressbar"]',
];

/**
 * Assert that a loading indicator is visible
 *
 * @param page - Playwright page object
 * @param options - Loading state options
 * @param config - ARTK configuration (optional)
 *
 * @example
 * ```typescript
 * // Assert any configured loading indicator is visible
 * await expectLoading(page);
 *
 * // With custom selectors
 * await expectLoading(page, {
 *   selectors: ['.custom-spinner', '#loading-overlay']
 * });
 *
 * // With custom timeout
 * await expectLoading(page, { timeout: 10000 });
 * ```
 */
export async function expectLoading(
  page: Page,
  options: LoadingStateOptions = {},
  config?: ARTKConfig
): Promise<void> {
  const { timeout = 5000, selectors } = options;

  // Get loading selectors from options, config, or defaults
  const loadingSelectors =
    selectors ??
    config?.assertions?.loading?.selectors ??
    DEFAULT_LOADING_SELECTORS;

  // Create a combined selector for any loading indicator
  const combinedSelector = loadingSelectors.join(', ');
  const loadingIndicator = page.locator(combinedSelector);

  // Assert at least one loading indicator is visible
  await expect(loadingIndicator.first()).toBeVisible({ timeout });
}

/**
 * Assert that no loading indicators are visible
 *
 * @param page - Playwright page object
 * @param options - Loading state options
 * @param config - ARTK configuration (optional)
 *
 * @example
 * ```typescript
 * // Assert no loading indicators are visible
 * await expectNotLoading(page);
 *
 * // With custom selectors
 * await expectNotLoading(page, {
 *   selectors: ['.custom-spinner']
 * });
 * ```
 */
export async function expectNotLoading(
  page: Page,
  options: LoadingStateOptions = {},
  config?: ARTKConfig
): Promise<void> {
  const { timeout = 5000, selectors } = options;

  // Get loading selectors from options, config, or defaults
  const loadingSelectors =
    selectors ??
    config?.assertions?.loading?.selectors ??
    DEFAULT_LOADING_SELECTORS;

  // Check each loading selector individually
  for (const selector of loadingSelectors) {
    const loadingIndicator = page.locator(selector);
    await expect(loadingIndicator).not.toBeVisible({ timeout });
  }
}

/**
 * Wait for all loading indicators to complete (disappear)
 *
 * This is the most commonly used loading assertion - it waits for the page
 * to finish loading before proceeding with test assertions.
 *
 * @param page - Playwright page object
 * @param options - Loading state options
 * @param config - ARTK configuration (optional)
 *
 * @example
 * ```typescript
 * // Wait for loading to complete
 * await waitForLoadingComplete(page);
 *
 * // With custom timeout (for slow operations)
 * await waitForLoadingComplete(page, { timeout: 30000 });
 *
 * // With custom loading selectors
 * await waitForLoadingComplete(page, {
 *   selectors: ['.data-grid-loading', '.chart-loading']
 * });
 * ```
 */
export async function waitForLoadingComplete(
  page: Page,
  options: LoadingStateOptions = {},
  config?: ARTKConfig
): Promise<void> {
  const { timeout = 30000, selectors } = options;

  // Get loading selectors from options, config, or defaults
  const loadingSelectors =
    selectors ??
    config?.assertions?.loading?.selectors ??
    DEFAULT_LOADING_SELECTORS;

  // First, optionally wait for loading to start (prevents race conditions)
  // We give it a short timeout since loading might already be in progress
  const combinedSelector = loadingSelectors.join(', ');
  const loadingIndicator = page.locator(combinedSelector);

  try {
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 1000 });
  } catch {
    // Loading might have already completed or never started - that's OK
  }

  // Now wait for all loading indicators to disappear
  for (const selector of loadingSelectors) {
    const indicator = page.locator(selector);
    await expect(indicator).not.toBeVisible({ timeout });
  }
}

/**
 * Wait for a specific loading operation to start and complete
 *
 * Useful for operations where you want to ensure loading actually occurred
 * (not just that loading is currently complete).
 *
 * @param page - Playwright page object
 * @param operation - Async function that triggers the loading operation
 * @param options - Loading state options
 * @param config - ARTK configuration (optional)
 *
 * @example
 * ```typescript
 * // Wait for save operation to complete
 * await waitForLoadingOperation(page, async () => {
 *   await page.getByRole('button', { name: 'Save' }).click();
 * });
 *
 * // With custom selectors
 * await waitForLoadingOperation(
 *   page,
 *   async () => { await page.getByRole('button', { name: 'Refresh' }).click(); },
 *   { selectors: ['.table-loading'] }
 * );
 * ```
 */
export async function waitForLoadingOperation(
  page: Page,
  operation: () => Promise<void>,
  options: LoadingStateOptions = {},
  config?: ARTKConfig
): Promise<void> {
  const { timeout = 30000, selectors } = options;

  // Get loading selectors from options, config, or defaults
  const loadingSelectors =
    selectors ??
    config?.assertions?.loading?.selectors ??
    DEFAULT_LOADING_SELECTORS;

  const combinedSelector = loadingSelectors.join(', ');
  const loadingIndicator = page.locator(combinedSelector);

  // Trigger the operation
  await operation();

  // Wait for loading to appear - use a reasonable timeout that won't exceed test timeout
  // Use half of the total timeout for waiting to appear, or 3s max
  const appearTimeout = Math.min(timeout / 2, 3000);
  await expect(loadingIndicator.first()).toBeVisible({ timeout: appearTimeout });

  // Wait for loading to complete
  await waitForLoadingComplete(page, { timeout, selectors }, config);
}
