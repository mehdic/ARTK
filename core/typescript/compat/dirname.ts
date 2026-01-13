/**
 * Directory Name Compatibility
 *
 * Provides cross-environment utilities for getting directory and file paths.
 * Works in both CommonJS (__dirname) and ESM (import.meta.url) contexts.
 * Zero external dependencies (FR-018).
 *
 * @module @artk/core/compat/dirname
 */

import { fileURLToPath } from 'url';
import * as path from 'path';

/**
 * Gets the directory name from an import.meta.url (FR-012)
 *
 * This is the ESM equivalent of __dirname. Use this in ESM modules
 * to get the directory containing the current file.
 *
 * Note: In Node 20.11.0+, you can use import.meta.dirname directly.
 * This function provides compatibility for Node 18+.
 *
 * @param metaUrl - The import.meta.url of the calling module
 * @returns Absolute path to the directory containing the module
 * @throws Error if metaUrl is invalid or empty
 *
 * @example
 * ```typescript
 * // In an ESM module
 * import { getDirname } from '@artk/core/compat';
 *
 * const __dirname = getDirname(import.meta.url);
 * const configPath = path.join(__dirname, 'config.json');
 * ```
 */
export function getDirname(metaUrl: string): string {
  if (!metaUrl) {
    throw new Error('import.meta.url is required to get dirname');
  }

  // Handle file:// URLs
  if (metaUrl.startsWith('file://')) {
    try {
      const filePath = fileURLToPath(metaUrl);
      return path.dirname(filePath);
    } catch (error) {
      throw new Error(
        `Failed to convert URL to path: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Handle already-converted paths (shouldn't happen but be defensive)
  if (path.isAbsolute(metaUrl)) {
    return path.dirname(metaUrl);
  }

  throw new Error(
    `Invalid import.meta.url: "${metaUrl}". Expected a file:// URL.`
  );
}

/**
 * Gets the filename from an import.meta.url
 *
 * This is the ESM equivalent of __filename. Use this in ESM modules
 * to get the full path to the current file.
 *
 * @param metaUrl - The import.meta.url of the calling module
 * @returns Absolute path to the module file
 * @throws Error if metaUrl is invalid or empty
 *
 * @example
 * ```typescript
 * // In an ESM module
 * import { getFilename } from '@artk/core/compat';
 *
 * const __filename = getFilename(import.meta.url);
 * console.log(`Running: ${__filename}`);
 * ```
 */
export function getFilename(metaUrl: string): string {
  if (!metaUrl) {
    throw new Error('import.meta.url is required to get filename');
  }

  // Handle file:// URLs
  if (metaUrl.startsWith('file://')) {
    try {
      return fileURLToPath(metaUrl);
    } catch (error) {
      throw new Error(
        `Failed to convert URL to path: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Handle already-converted paths
  if (path.isAbsolute(metaUrl)) {
    return metaUrl;
  }

  throw new Error(
    `Invalid import.meta.url: "${metaUrl}". Expected a file:// URL.`
  );
}

/**
 * Creates __dirname and __filename equivalents for an ESM module
 *
 * Convenience function that returns both values at once.
 *
 * @param metaUrl - The import.meta.url of the calling module
 * @returns Object with dirname and filename
 *
 * @example
 * ```typescript
 * import { createDirnameMeta } from '@artk/core/compat';
 *
 * const { dirname, filename } = createDirnameMeta(import.meta.url);
 * // dirname === path.dirname(__filename)
 * // filename === full path to current file
 * ```
 */
export function createDirnameMeta(metaUrl: string): {
  dirname: string;
  filename: string;
} {
  const filename = getFilename(metaUrl);
  return {
    dirname: path.dirname(filename),
    filename,
  };
}
