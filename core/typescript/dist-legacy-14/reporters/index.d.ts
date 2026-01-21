import { S as ScreenshotOptions, M as MaskingOptions } from '../artk-reporter-TYUAl9P2.js';
export { d as ARTKReport, A as ARTKReporter, f as ARTKReporterOptions, c as JourneyReport, J as JourneyStatus, a as JourneyTestMapping, R as RunSummary, b as TestArtifacts, T as TestStatus, h as calculateJourneyStatus, i as createJourneyReport, e as extractJourneyId, j as generateARTKReport, g as groupTestsByJourney, m as mapTestToJourney, w as writeARTKReport } from '../artk-reporter-TYUAl9P2.js';
import { Page } from '@playwright/test';
import '@playwright/test/reporter';

/**
 * Artifact management utilities for reporters
 *
 * This module provides functions for saving test artifacts with optional
 * PII masking for screenshots.
 *
 * @module reporters/artifacts
 */

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
declare function saveScreenshot(page: Page, options: ScreenshotOptions): Promise<void>;
/**
 * Ensure directory exists for artifact storage
 *
 * @param dirPath - Directory path
 * @returns Promise that resolves when directory exists
 */
declare function ensureArtifactDir(dirPath: string): Promise<void>;
/**
 * Get artifact file extension from path
 *
 * @param filePath - File path
 * @returns File extension (e.g., 'png', 'json', 'webm')
 */
declare function getArtifactExtension(filePath: string): string;
/**
 * Validate artifact path
 *
 * Ensures path is safe and doesn't contain path traversal attempts.
 *
 * @param filePath - File path to validate
 * @returns True if path is valid
 */
declare function validateArtifactPath(filePath: string): boolean;

/**
 * PII masking utilities for screenshots
 *
 * This module provides functions to mask Personally Identifiable Information (PII)
 * in screenshots before saving them to artifacts.
 *
 * @module reporters/masking
 */

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
declare function maskPiiInScreenshot(page: Page, options: MaskingOptions): Promise<void>;
/**
 * Remove PII masking from page
 *
 * This is a best-effort cleanup. Since addStyleTag returns a handle,
 * we rely on the caller to manage cleanup or page reload.
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when masking is removed
 */
declare function removePiiMasking(page: Page): Promise<void>;
/**
 * Validate PII selectors
 *
 * Ensures all selectors are valid CSS selectors before attempting to mask.
 *
 * @param selectors - Array of CSS selectors
 * @returns True if all selectors are valid
 */
declare function validatePiiSelectors(selectors: readonly string[]): boolean;
/**
 * Sanitize PII selectors
 *
 * Removes invalid selectors and returns only valid ones.
 *
 * @param selectors - Array of CSS selectors
 * @returns Array of valid CSS selectors
 */
declare function sanitizePiiSelectors(selectors: readonly string[]): readonly string[];

export { MaskingOptions, ScreenshotOptions, ensureArtifactDir, getArtifactExtension, maskPiiInScreenshot, removePiiMasking, sanitizePiiSelectors, saveScreenshot, validateArtifactPath, validatePiiSelectors };
