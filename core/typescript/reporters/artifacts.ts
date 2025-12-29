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
import { maskPiiInScreenshot, removePiiMasking } from './masking.js';
import { promises as fs } from 'fs';
import { dirname } from 'path';

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
export async function saveScreenshot(
  page: Page,
  options: ScreenshotOptions
): Promise<void> {
  // Ensure output directory exists
  const outputDir = dirname(options.path);
  await fs.mkdir(outputDir, { recursive: true });

  // Apply PII masking if requested
  if (options.maskPii && options.piiSelectors && options.piiSelectors.length > 0) {
    await maskPiiInScreenshot(page, {
      selectors: options.piiSelectors,
    });

    try {
      // Take screenshot with masking applied
      await page.screenshot({
        path: options.path,
        fullPage: true,
      });
    } finally {
      // Always remove masking to restore page state
      await removePiiMasking(page);
    }
  } else {
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
export async function ensureArtifactDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Get artifact file extension from path
 *
 * @param filePath - File path
 * @returns File extension (e.g., 'png', 'json', 'webm')
 */
export function getArtifactExtension(filePath: string): string {
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
export function validateArtifactPath(filePath: string): boolean {
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
