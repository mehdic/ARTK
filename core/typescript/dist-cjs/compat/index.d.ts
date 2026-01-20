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
type ModuleSystemRuntime = 'commonjs' | 'esm' | 'unknown';
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
declare function getModuleSystem(): ModuleSystemRuntime;
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
declare function isESM(): boolean;
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
declare function isCommonJS(): boolean;

/**
 * Directory Name Compatibility
 *
 * Provides cross-environment utilities for getting directory and file paths.
 * Works in both CommonJS (__dirname) and ESM (import.meta.url) contexts.
 * Zero external dependencies (FR-018).
 *
 * @module @artk/core/compat/dirname
 */
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
declare function getDirname(metaUrl: string): string;
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
declare function getFilename(metaUrl: string): string;
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
declare function createDirnameMeta(metaUrl: string): {
    dirname: string;
    filename: string;
};

/**
 * Project Root Resolution
 *
 * Utilities for finding the project root directory by locating package.json.
 * Works in both CommonJS and ESM contexts.
 * Zero external dependencies (FR-018).
 *
 * @module @artk/core/compat/project-root
 */
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
declare function findPackageJson(startDir: string): string | null;
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
declare function resolveProjectRoot(startDir?: string): string;
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
declare function getPackageJson(startDir?: string): Record<string, unknown>;

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
declare function dynamicImport<T = unknown>(specifier: string): Promise<T>;
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
declare function dynamicImportDefault<T = unknown>(specifier: string): Promise<T>;
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
declare function tryDynamicImport<T = unknown>(specifier: string): Promise<T | null>;

export { type ModuleSystemRuntime, createDirnameMeta, dynamicImport, dynamicImportDefault, findPackageJson, getDirname, getFilename, getModuleSystem, getPackageJson, isCommonJS, isESM, resolveProjectRoot, tryDynamicImport };
