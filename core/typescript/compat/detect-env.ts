/**
 * Runtime Environment Detection
 *
 * Detects whether code is running in CommonJS or ESM context at runtime.
 * Zero external dependencies (FR-018).
 *
 * @module @artk/core/compat/detect-env
 */

/**
 * Module system identifier
 */
export type ModuleSystemRuntime = 'commonjs' | 'esm' | 'unknown';

/**
 * Cached module system result for performance
 */
let cachedModuleSystem: ModuleSystemRuntime | null = null;

/**
 * Detects the current runtime module system (FR-015)
 *
 * Detection strategy:
 * 1. Check for import.meta (ESM indicator)
 * 2. Check for __dirname (CommonJS indicator)
 * 3. Return 'unknown' if neither available
 *
 * Results are cached for performance (< 1ms after first call).
 *
 * @returns Module system identifier: 'commonjs', 'esm', or 'unknown'
 *
 * @example
 * ```typescript
 * import { getModuleSystem } from '@artk/core/compat';
 *
 * const system = getModuleSystem();
 * if (system === 'esm') {
 *   console.log('Running in ESM mode');
 * }
 * ```
 */
export function getModuleSystem(): ModuleSystemRuntime {
  // Return cached result if available
  if (cachedModuleSystem !== null) {
    return cachedModuleSystem;
  }

  // Check for ESM - import.meta is only available in ESM
  // We use a try-catch because just referencing import.meta in CommonJS throws
  try {
    // @ts-expect-error import.meta is only available in ESM context
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      cachedModuleSystem = 'esm';
      return cachedModuleSystem;
    }
  } catch {
    // import.meta not available - not ESM
  }

  // Check for CommonJS - __dirname is only available in CommonJS
  try {
    // In ESM, __dirname is not defined
    // In CommonJS, it's always a string
    // @ts-expect-error __dirname is only available in CommonJS context
    if (typeof __dirname !== 'undefined' && typeof __dirname === 'string') {
      cachedModuleSystem = 'commonjs';
      return cachedModuleSystem;
    }
  } catch {
    // __dirname not available - not CommonJS
  }

  // Neither indicator found
  cachedModuleSystem = 'unknown';
  return cachedModuleSystem;
}

/**
 * Checks if code is running in ESM context
 *
 * @returns true if running in ESM, false otherwise
 *
 * @example
 * ```typescript
 * import { isESM } from '@artk/core/compat';
 *
 * if (isESM()) {
 *   // Use import.meta.url
 * } else {
 *   // Use __dirname
 * }
 * ```
 */
export function isESM(): boolean {
  return getModuleSystem() === 'esm';
}

/**
 * Checks if code is running in CommonJS context
 *
 * @returns true if running in CommonJS, false otherwise
 *
 * @example
 * ```typescript
 * import { isCommonJS } from '@artk/core/compat';
 *
 * if (isCommonJS()) {
 *   // Use require()
 * } else {
 *   // Use dynamic import()
 * }
 * ```
 */
export function isCommonJS(): boolean {
  return getModuleSystem() === 'commonjs';
}

/**
 * Resets the cached module system (for testing purposes only)
 * @internal
 */
export function _resetCache(): void {
  cachedModuleSystem = null;
}
