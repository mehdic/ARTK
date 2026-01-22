"use strict";
/**
 * Toast/notification assertion helpers
 *
 * Provides assertions for verifying toast notifications including type detection.
 * Implements FR-021: Toast/notification assertions with type detection
 *
 * @module assertions/toast
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectToast = expectToast;
exports.expectNoToast = expectNoToast;
exports.waitForToastDismiss = waitForToastDismiss;
const test_1 = require("@playwright/test");
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
async function expectToast(page, message, options = {}, config) {
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
    await (0, test_1.expect)(toastContainer).toBeVisible({ timeout });
    // Check message content
    if (exact) {
        await (0, test_1.expect)(toastContainer).toHaveText(message, { timeout });
    }
    else {
        await (0, test_1.expect)(toastContainer).toContainText(message, { timeout });
    }
    // Check toast type if specified
    if (type !== undefined) {
        const actualType = await toastContainer.getAttribute(typeAttribute);
        if (actualType !== type) {
            throw new Error(`Expected toast type "${type}" but got "${actualType ?? 'none'}"`);
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
async function expectNoToast(page, config, timeout = 5000) {
    // Load config if not provided
    const toastConfig = config?.assertions?.toast ?? {
        containerSelector: '[role="alert"], .toast, .notification',
        messageSelector: '.toast-message, .notification-message',
        typeAttribute: 'data-type',
    };
    const { containerSelector } = toastConfig;
    // Assert toast container is not visible
    const toastContainer = page.locator(containerSelector);
    await (0, test_1.expect)(toastContainer).not.toBeVisible({ timeout });
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
async function waitForToastDismiss(page, message, options = {}, config) {
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
    await (0, test_1.expect)(toastContainer).not.toBeVisible({ timeout: timeout * 2 });
}
//# sourceMappingURL=toast.js.map