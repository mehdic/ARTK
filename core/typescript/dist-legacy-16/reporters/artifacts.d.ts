/**
 * Artifact management utilities for reporters
 *
 * This module provides functions for saving test artifacts with optional
 * PII masking for screenshots.
 *
 * @module reporters/artifacts
 */
import type { Page } from '@playwright/test';
import type { ScreenshotOptions } from './types.js';
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
export declare function saveScreenshot(page: Page, options: ScreenshotOptions): Promise<void>;
/**
 * Ensure directory exists for artifact storage
 *
 * @param dirPath - Directory path
 * @returns Promise that resolves when directory exists
 */
export declare function ensureArtifactDir(dirPath: string): Promise<void>;
/**
 * Get artifact file extension from path
 *
 * @param filePath - File path
 * @returns File extension (e.g., 'png', 'json', 'webm')
 */
export declare function getArtifactExtension(filePath: string): string;
/**
 * Validate artifact path
 *
 * Ensures path is safe and doesn't contain path traversal attempts.
 *
 * @param filePath - File path to validate
 * @returns True if path is valid
 */
export declare function validateArtifactPath(filePath: string): boolean;
//# sourceMappingURL=artifacts.d.ts.map