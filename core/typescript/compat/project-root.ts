/**
 * Project Root Resolution
 *
 * Utilities for finding the project root directory by locating package.json.
 * Works in both CommonJS and ESM contexts.
 * Zero external dependencies (FR-018).
 *
 * @module @artk/core/compat/project-root
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Cached project root for performance
 */
let cachedProjectRoot: string | null = null;

/**
 * Finds the nearest package.json by walking up the directory tree
 *
 * @param startDir - Directory to start searching from
 * @returns Absolute path to package.json, or null if not found
 *
 * @example
 * ```typescript
 * import { findPackageJson } from '@artk/core/compat';
 *
 * const pkgPath = findPackageJson('/path/to/project/src/deep/module');
 * // Returns '/path/to/project/package.json' if it exists
 * ```
 */
export function findPackageJson(startDir: string): string | null {
  // Normalize and make absolute
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const packageJsonPath = path.join(currentDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      return packageJsonPath;
    }

    // Move up one directory
    const parentDir = path.dirname(currentDir);

    // Check if we've reached the root
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  // Check root directory as well
  const rootPackageJson = path.join(root, 'package.json');
  if (fs.existsSync(rootPackageJson)) {
    return rootPackageJson;
  }

  return null;
}

/**
 * Resolves the project root directory (FR-013)
 *
 * Finds the nearest directory containing package.json by walking up
 * from the current working directory. Results are cached for performance.
 *
 * @param startDir - Optional starting directory (defaults to cwd)
 * @returns Absolute path to project root
 * @throws Error if no package.json found
 *
 * @example
 * ```typescript
 * import { resolveProjectRoot } from '@artk/core/compat';
 *
 * const root = resolveProjectRoot();
 * const configPath = path.join(root, 'artk.config.yml');
 * ```
 */
export function resolveProjectRoot(startDir?: string): string {
  // Use cache for default (cwd) case
  if (!startDir && cachedProjectRoot !== null) {
    return cachedProjectRoot;
  }

  const searchStart = startDir || process.cwd();
  const packageJsonPath = findPackageJson(searchStart);

  if (!packageJsonPath) {
    throw new Error(
      `Cannot determine project root: No package.json found starting from "${searchStart}". ` +
      'Make sure you are running from within a Node.js project.'
    );
  }

  const projectRoot = path.dirname(packageJsonPath);

  // Cache only for default (cwd) case
  if (!startDir) {
    cachedProjectRoot = projectRoot;
  }

  return projectRoot;
}

/**
 * Gets the project's package.json contents
 *
 * @param startDir - Optional starting directory
 * @returns Parsed package.json contents
 * @throws Error if package.json not found or invalid
 *
 * @example
 * ```typescript
 * import { getPackageJson } from '@artk/core/compat';
 *
 * const pkg = getPackageJson();
 * console.log(`Project: ${pkg.name}@${pkg.version}`);
 * ```
 */
export function getPackageJson(startDir?: string): Record<string, unknown> {
  const root = resolveProjectRoot(startDir);
  const packageJsonPath = path.join(root, 'package.json');

  try {
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to read package.json at "${packageJsonPath}": ` +
      `${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Resets the cached project root (for testing purposes only)
 * @internal
 */
export function _resetCache(): void {
  cachedProjectRoot = null;
}
