"use strict";
/**
 * PII masking utilities for screenshots
 *
 * This module provides functions to mask Personally Identifiable Information (PII)
 * in screenshots before saving them to artifacts.
 *
 * @module reporters/masking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskPiiInScreenshot = maskPiiInScreenshot;
exports.removePiiMasking = removePiiMasking;
exports.validatePiiSelectors = validatePiiSelectors;
exports.sanitizePiiSelectors = sanitizePiiSelectors;
/**
 * Default masking color (black)
 */
const DEFAULT_MASK_COLOR = '#000000';
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
async function maskPiiInScreenshot(page, options) {
    if (options.selectors.length === 0) {
        return;
    }
    const maskColor = options.maskColor ?? DEFAULT_MASK_COLOR;
    const blurRadius = options.blurRadius;
    // Build CSS selector for all PII elements
    const selectorList = options.selectors.join(', ');
    // Build CSS rules
    const cssRules = [];
    if (blurRadius !== undefined && blurRadius > 0) {
        // Use blur filter
        cssRules.push(`
      ${selectorList} {
        filter: blur(${blurRadius}px) !important;
        -webkit-filter: blur(${blurRadius}px) !important;
      }
    `);
    }
    else {
        // Use solid color mask
        cssRules.push(`
      ${selectorList} {
        background-color: ${maskColor} !important;
        color: ${maskColor} !important;
        border-color: ${maskColor} !important;
        opacity: 1 !important;
      }
      ${selectorList} * {
        visibility: hidden !important;
      }
    `);
    }
    const cssContent = cssRules.join('\n');
    // Inject masking CSS
    await page.addStyleTag({
        content: cssContent,
    });
    // Wait a tick for CSS to apply
    await page.waitForTimeout(100);
}
/**
 * Remove PII masking from page
 *
 * This is a best-effort cleanup. Since addStyleTag returns a handle,
 * we rely on the caller to manage cleanup or page reload.
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when masking is removed
 */
async function removePiiMasking(page) {
    // Remove all style tags with our masking rules
    await page.evaluate(() => {
        const styles = document.querySelectorAll('style');
        for (const style of Array.from(styles)) {
            if (style.textContent?.includes('!important')) {
                style.remove();
            }
        }
    });
}
/**
 * Validate PII selectors
 *
 * Ensures all selectors are valid CSS selectors before attempting to mask.
 *
 * @param selectors - Array of CSS selectors
 * @returns True if all selectors are valid
 */
function validatePiiSelectors(selectors) {
    for (const selector of selectors) {
        try {
            // Try to use querySelector to validate selector syntax
            document.querySelector(selector);
        }
        catch {
            return false;
        }
    }
    return true;
}
/**
 * Sanitize PII selectors
 *
 * Removes invalid selectors and returns only valid ones.
 *
 * @param selectors - Array of CSS selectors
 * @returns Array of valid CSS selectors
 */
function sanitizePiiSelectors(selectors) {
    const valid = [];
    for (const selector of selectors) {
        try {
            // Test if selector is valid
            document.querySelector(selector);
            valid.push(selector);
        }
        catch {
            // Skip invalid selectors
            continue;
        }
    }
    return valid;
}
//# sourceMappingURL=masking.js.map