/**
 * Toast/notification assertion helpers
 *
 * Provides assertions for verifying toast notifications including type detection.
 * Implements FR-021: Toast/notification assertions with type detection
 *
 * @module assertions/toast
 */
import { type Page } from '@playwright/test';
import type { ToastAssertionOptions } from './types.js';
import type { ARTKConfig } from '../config/types.js';
/**
 * Assert that a toast notification with the given message appears
 *
 * @param page - Playwright page object
 * @param message - Expected toast message (supports partial match by default)
 * @param options - Toast assertion options
 * @param config - ARTK configuration (optional, will load from global if not provided)
 *
 * @example
 * ```typescript
 * // Basic toast assertion
 * await expectToast(page, 'Order created successfully');
 *
 * // Toast with type detection
 * await expectToast(page, 'Order created', { type: 'success' });
 *
 * // Exact message match
 * await expectToast(page, 'Order created successfully', { exact: true });
 *
 * // Custom timeout
 * await expectToast(page, 'Processing...', { timeout: 10000 });
 * ```
 */
export declare function expectToast(page: Page, message: string, options?: ToastAssertionOptions, config?: ARTKConfig): Promise<void>;
/**
 * Assert that no toast notification is currently visible
 *
 * @param page - Playwright page object
 * @param config - ARTK configuration (optional, will load from global if not provided)
 * @param timeout - Timeout in milliseconds (default: 5000)
 *
 * @example
 * ```typescript
 * // Assert no toasts are displayed
 * await expectNoToast(page);
 *
 * // With custom config
 * await expectNoToast(page, config);
 *
 * // With custom timeout
 * await expectNoToast(page, undefined, 2000);
 * ```
 */
export declare function expectNoToast(page: Page, config?: ARTKConfig, timeout?: number): Promise<void>;
/**
 * Wait for a toast to appear and then disappear
 *
 * Useful for transient notifications that auto-dismiss.
 *
 * @param page - Playwright page object
 * @param message - Expected toast message
 * @param options - Toast assertion options
 * @param config - ARTK configuration (optional, will load from global if not provided)
 *
 * @example
 * ```typescript
 * // Wait for success toast to appear and disappear
 * await waitForToastDismiss(page, 'Saved successfully', { type: 'success' });
 * ```
 */
export declare function waitForToastDismiss(page: Page, message: string, options?: ToastAssertionOptions, config?: ARTKConfig): Promise<void>;
//# sourceMappingURL=toast.d.ts.map