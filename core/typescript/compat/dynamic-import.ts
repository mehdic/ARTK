/**
 * Dynamic Import Compatibility
 *
 * Provides cross-environment dynamic module loading.
 * Works in both CommonJS (require) and ESM (import()) contexts.
 * Zero external dependencies (FR-018).
 *
 * @module @artk/core/compat/dynamic-import
 */

/**
 * Dynamically imports a module (FR-014)
 *
 * Provides a unified API for dynamic imports that works in both
 * CommonJS and ESM environments. Uses native `import()` which is
 * available in Node 12+ for CommonJS and all versions of ESM.
 *
 * @param specifier - Module specifier (e.g., './config', '@artk/core', 'fs')
 * @returns Promise that resolves to the imported module
 * @throws Error if module cannot be loaded
 *
 * @example
 * ```typescript
 * import { dynamicImport } from '@artk/core/compat';
 *
 * // Import a built-in module
 * const fs = await dynamicImport<typeof import('fs')>('fs');
 *
 * // Import a package
 * const yaml = await dynamicImport('yaml');
 *
 * // Import a relative module
 * const config = await dynamicImport('./config.js');
 * ```
 */
export async function dynamicImport<T = unknown>(specifier: string): Promise<T> {
  if (!specifier) {
    throw new Error('Module specifier is required');
  }

  try {
    // Native dynamic import works in both CommonJS (Node 12+) and ESM
    const module = await import(specifier);
    return module as T;
  } catch (error) {
    // Provide a more helpful error message
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to import module "${specifier}": ${message}`);
  }
}

/**
 * Dynamically imports a module and returns its default export
 *
 * Convenience function for modules that primarily use default exports.
 *
 * @param specifier - Module specifier
 * @returns Promise that resolves to the default export
 * @throws Error if module cannot be loaded or has no default export
 *
 * @example
 * ```typescript
 * import { dynamicImportDefault } from '@artk/core/compat';
 *
 * const yaml = await dynamicImportDefault('yaml');
 * const parsed = yaml.parse('key: value');
 * ```
 */
export async function dynamicImportDefault<T = unknown>(specifier: string): Promise<T> {
  const module = await dynamicImport<{ default?: T }>(specifier);

  if ('default' in module) {
    return module.default as T;
  }

  // Some modules don't use default exports, return the whole module
  return module as unknown as T;
}

/**
 * Safely tries to import a module, returning null if not found
 *
 * Useful for optional dependencies or feature detection.
 *
 * @param specifier - Module specifier
 * @returns Promise that resolves to the module or null if not found
 *
 * @example
 * ```typescript
 * import { tryDynamicImport } from '@artk/core/compat';
 *
 * const optionalDep = await tryDynamicImport('optional-package');
 * if (optionalDep) {
 *   // Use the optional dependency
 * }
 * ```
 */
export async function tryDynamicImport<T = unknown>(
  specifier: string
): Promise<T | null> {
  try {
    return await dynamicImport<T>(specifier);
  } catch {
    return null;
  }
}
