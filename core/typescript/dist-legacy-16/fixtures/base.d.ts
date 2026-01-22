/**
 * Base Test Fixture with Config Loading (T049)
 *
 * Provides the base test fixture that loads ARTK configuration
 * and serves as the foundation for all other fixtures.
 *
 * @module fixtures/base
 * @see FR-005: Provide typed access to all configuration sections
 */
import { loadConfig } from '../config/loader.js';
import type { ARTKConfig } from '../config/types.js';
/**
 * Base fixtures with configuration only
 *
 * This is the foundation fixture that other fixtures depend on.
 * It ensures configuration is loaded before any test runs.
 */
export interface ConfigFixtures {
    /** Loaded ARTK configuration */
    readonly config: ARTKConfig;
}
/**
 * Base test extended with config fixture
 *
 * @example
 * ```typescript
 * import { testWithConfig } from '@artk/core/fixtures/base';
 *
 * testWithConfig('can access config', async ({ config }) => {
 *   console.log(`Testing ${config.app.name}`);
 * });
 * ```
 */
export declare const testWithConfig: import("@playwright/test").TestType<import("@playwright/test").PlaywrightTestArgs & import("@playwright/test").PlaywrightTestOptions & ConfigFixtures, import("@playwright/test").PlaywrightWorkerArgs & import("@playwright/test").PlaywrightWorkerOptions>;
/**
 * Ensure configuration is loaded
 *
 * Call this in globalSetup or before running tests to ensure
 * configuration is available.
 *
 * @param options - Optional load config options
 * @returns Loaded configuration
 *
 * @example
 * ```typescript
 * // In global-setup.ts
 * import { ensureConfigLoaded } from '@artk/core/fixtures/base';
 *
 * export default async function globalSetup() {
 *   await ensureConfigLoaded();
 * }
 * ```
 */
export declare function ensureConfigLoaded(options?: Parameters<typeof loadConfig>[0]): ARTKConfig;
/**
 * Get the storage state directory path from config
 *
 * @param config - ARTK configuration
 * @param baseDir - Optional base directory (defaults to cwd)
 * @returns Absolute path to storage state directory
 */
export declare function getStorageStateDirectory(config: ARTKConfig, baseDir?: string): string;
/**
 * Get the storage state file path for a role
 *
 * @param config - ARTK configuration
 * @param role - Role name
 * @param baseDir - Optional base directory
 * @returns Absolute path to storage state file
 */
export declare function getStorageStatePathForRole(config: ARTKConfig, role: string, baseDir?: string): string;
/**
 * Check if storage state exists and is valid for a role
 *
 * @param config - ARTK configuration
 * @param role - Role name
 * @param baseDir - Optional base directory
 * @returns true if storage state is valid
 */
export declare function isStorageStateValidForRole(config: ARTKConfig, role: string, baseDir?: string): Promise<boolean>;
//# sourceMappingURL=base.d.ts.map