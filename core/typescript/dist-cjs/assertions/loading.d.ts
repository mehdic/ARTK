/**
 * Loading state assertion helpers
 *
 * Provides assertions for verifying loading indicators and waiting for loading completion.
 * Implements FR-024: Loading state assertions with configurable selectors
 *
 * @module assertions/loading
 */
import { type Page } from '@playwright/test';
import type { LoadingStateOptions } from './types.js';
import type { ARTKConfig } from '../config/types.js';
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
export declare function expectLoading(page: Page, options?: LoadingStateOptions, config?: ARTKConfig): Promise<void>;
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
export declare function expectNotLoading(page: Page, options?: LoadingStateOptions, config?: ARTKConfig): Promise<void>;
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
export declare function waitForLoadingComplete(page: Page, options?: LoadingStateOptions, config?: ARTKConfig): Promise<void>;
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
export declare function waitForLoadingOperation(page: Page, operation: () => Promise<void>, options?: LoadingStateOptions, config?: ARTKConfig): Promise<void>;
//# sourceMappingURL=loading.d.ts.map