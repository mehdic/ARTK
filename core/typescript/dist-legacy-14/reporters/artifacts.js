"use strict";
/**
 * Artifact management utilities for reporters
 *
 * This module provides functions for saving test artifacts with optional
 * PII masking for screenshots.
 *
 * @module reporters/artifacts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveScreenshot = saveScreenshot;
exports.ensureArtifactDir = ensureArtifactDir;
exports.getArtifactExtension = getArtifactExtension;
exports.validateArtifactPath = validateArtifactPath;
const masking_js_1 = require("./masking.js");
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Save a screenshot with optional PII masking
 *
 * This function:
 * 1. Optionally applies PII masking to specified selectors
 * 2. Takes the screenshot
 * 3. Removes masking to restore page state
 * 4. Saves the screenshot to the specified path
 *
 * @param page - Playwright page instance
 * @param options - Screenshot save options
 * @returns Promise that resolves when screenshot is saved
 *
 * @example
 * ```typescript
 * await saveScreenshot(page, {
 *   path: './screenshots/test-result.png',
 *   maskPii: true,
 *   piiSelectors: ['.user-email', '.ssn']
 * });
 * ```
 */
async function saveScreenshot(page, options) {
    // Ensure output directory exists
    const outputDir = (0, path_1.dirname)(options.path);
    await fs_1.promises.mkdir(outputDir, { recursive: true });
    // Apply PII masking if requested
    if (options.maskPii && options.piiSelectors && options.piiSelectors.length > 0) {
        await (0, masking_js_1.maskPiiInScreenshot)(page, {
            selectors: options.piiSelectors,
        });
        try {
            // Take screenshot with masking applied
            await page.screenshot({
                path: options.path,
                fullPage: true,
            });
        }
        finally {
            // Always remove masking to restore page state
            await (0, masking_js_1.removePiiMasking)(page);
        }
    }
    else {
        // Take screenshot without masking
        await page.screenshot({
            path: options.path,
            fullPage: true,
        });
    }
}
/**
 * Ensure directory exists for artifact storage
 *
 * @param dirPath - Directory path
 * @returns Promise that resolves when directory exists
 */
async function ensureArtifactDir(dirPath) {
    await fs_1.promises.mkdir(dirPath, { recursive: true });
}
/**
 * Get artifact file extension from path
 *
 * @param filePath - File path
 * @returns File extension (e.g., 'png', 'json', 'webm')
 */
function getArtifactExtension(filePath) {
    const parts = filePath.split('.');
    return parts[parts.length - 1] ?? '';
}
/**
 * Validate artifact path
 *
 * Ensures path is safe and doesn't contain path traversal attempts.
 *
 * @param filePath - File path to validate
 * @returns True if path is valid
 */
function validateArtifactPath(filePath) {
    // Check for path traversal attempts
    if (filePath.includes('..')) {
        return false;
    }
    // Check for absolute paths (we want relative paths)
    if (filePath.startsWith('/') || /^[A-Z]:/i.test(filePath)) {
        return false;
    }
    return true;
}
//# sourceMappingURL=artifacts.js.map