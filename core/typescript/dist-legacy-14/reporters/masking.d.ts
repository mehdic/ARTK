/**
 * PII masking utilities for screenshots
 *
 * This module provides functions to mask Personally Identifiable Information (PII)
 * in screenshots before saving them to artifacts.
 *
 * @module reporters/masking
 */
import type { Page } from '@playwright/test';
import type { MaskingOptions } from './types.js';
/**
 * Mask PII in a screenshot by applying CSS-based masking to specified selectors
 *
 * This function works by:
 * 1. Injecting CSS to hide/mask elements matching PII selectors
 * 2. Taking the screenshot with masked elements
 * 3. Removing the injected CSS to restore page state
 *
 * @param page - Playwright page instance
 * @param options - Masking options with selectors
 * @returns Promise that resolves when masking is applied
 *
 * @example
 * ```typescript
 * await maskPiiInScreenshot(page, {
 *   selectors: ['.user-email', '.ssn', '[data-testid="personal-info"]'],
 *   maskColor: '#000000'
 * });
 * ```
 */
export declare function maskPiiInScreenshot(page: Page, options: MaskingOptions): Promise<void>;
/**
 * Remove PII masking from page
 *
 * This is a best-effort cleanup. Since addStyleTag returns a handle,
 * we rely on the caller to manage cleanup or page reload.
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when masking is removed
 */
export declare function removePiiMasking(page: Page): Promise<void>;
/**
 * Validate PII selectors
 *
 * Ensures all selectors are valid CSS selectors before attempting to mask.
 *
 * @param selectors - Array of CSS selectors
 * @returns True if all selectors are valid
 */
export declare function validatePiiSelectors(selectors: readonly string[]): boolean;
/**
 * Sanitize PII selectors
 *
 * Removes invalid selectors and returns only valid ones.
 *
 * @param selectors - Array of CSS selectors
 * @returns Array of valid CSS selectors
 */
export declare function sanitizePiiSelectors(selectors: readonly string[]): readonly string[];
//# sourceMappingURL=masking.d.ts.map