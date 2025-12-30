/**
 * Toast/notification assertion helpers
 *
 * Provides assertions for verifying toast notifications including type detection.
 * Implements FR-021: Toast/notification assertions with type detection
 *
 * @module assertions/toast
 */

import { expect, type Page } from '@playwright/test';
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
export async function expectToast(
  page: Page,
  message: string,
  options: ToastAssertionOptions = {},
  config?: ARTKConfig
): Promise<void> {
  const { type, timeout = 5000, exact = false } = options;

  // Load config if not provided
  const toastConfig = config?.assertions?.toast ?? {
    containerSelector: '[role="alert"], .toast, .notification',
    messageSelector: '.toast-message, .notification-message',
    typeAttribute: 'data-type',
  };

  const { containerSelector, typeAttribute } = toastConfig;

  // Wait for toast container to appear
  const toastContainer = page.locator(containerSelector);
  await expect(toastContainer).toBeVisible({ timeout });

  // Check message content
  if (exact) {
    await expect(toastContainer).toHaveText(message, { timeout });
  } else {
    await expect(toastContainer).toContainText(message, { timeout });
  }

  // Check toast type if specified
  if (type !== undefined) {
    const actualType = await toastContainer.getAttribute(typeAttribute);
    if (actualType !== type) {
      throw new Error(
        `Expected toast type "${type}" but got "${actualType ?? 'none'}"`
      );
    }
  }
}

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
export async function expectNoToast(
  page: Page,
  config?: ARTKConfig,
  timeout: number = 5000
): Promise<void> {
  // Load config if not provided
  const toastConfig = config?.assertions?.toast ?? {
    containerSelector: '[role="alert"], .toast, .notification',
    messageSelector: '.toast-message, .notification-message',
    typeAttribute: 'data-type',
  };

  const { containerSelector } = toastConfig;

  // Assert toast container is not visible
  const toastContainer = page.locator(containerSelector);
  await expect(toastContainer).not.toBeVisible({ timeout });
}

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
export async function waitForToastDismiss(
  page: Page,
  message: string,
  options: ToastAssertionOptions = {},
  config?: ARTKConfig
): Promise<void> {
  // First assert toast appears
  await expectToast(page, message, options, config);

  // Load config if not provided
  const toastConfig = config?.assertions?.toast ?? {
    containerSelector: '[role="alert"], .toast, .notification',
    messageSelector: '.toast-message, .notification-message',
    typeAttribute: 'data-type',
  };

  const { containerSelector } = toastConfig;
  const { timeout = 5000 } = options;

  // Wait for toast to disappear
  const toastContainer = page.locator(containerSelector);
  await expect(toastContainer).not.toBeVisible({ timeout: timeout * 2 });
}
