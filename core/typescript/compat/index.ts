/**
 * Compatibility Layer for Node.js Module Systems
 *
 * Provides environment-agnostic utilities that work in both CommonJS and ESM.
 * Zero external dependencies (FR-018).
 *
 * @module @artk/core/compat
 *
 * @example
 * ```typescript
 * import {
 *   getDirname,
 *   getFilename,
 *   resolveProjectRoot,
 *   dynamicImport,
 *   getModuleSystem,
 *   isESM,
 *   isCommonJS
 * } from '@artk/core/compat';
 *
 * // Get current directory (ESM equivalent of __dirname)
 * const __dirname = getDirname(import.meta.url);
 *
 * // Find project root
 * const projectRoot = resolveProjectRoot();
 *
 * // Dynamic imports that work everywhere
 * const fs = await dynamicImport<typeof import('fs')>('fs');
 *
 * // Check runtime environment
 * if (isESM()) {
 *   console.log('Running in ESM mode');
 * }
 * ```
 */

// Runtime environment detection
export {
  getModuleSystem,
  isESM,
  isCommonJS,
  type ModuleSystemRuntime,
} from './detect-env.js';

// Directory name utilities
export {
  getDirname,
  getFilename,
  createDirnameMeta,
} from './dirname.js';

// Project root resolution
export {
  findPackageJson,
  resolveProjectRoot,
  getPackageJson,
} from './project-root.js';

// Dynamic imports
export {
  dynamicImport,
  dynamicImportDefault,
  tryDynamicImport,
} from './dynamic-import.js';
