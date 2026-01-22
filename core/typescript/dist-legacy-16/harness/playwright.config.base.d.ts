/**
 * Playwright Configuration Factory (T102, T105)
 *
 * Creates complete Playwright configurations from ARTK config.
 *
 * Key Features:
 * - createPlaywrightConfig: Main factory function
 * - getTierSettings: Tier-specific settings (smoke, release, regression)
 * - getUseOptions: Shared 'use' configuration
 *
 * @module harness/playwright.config.base
 *
 * @example
 * ```typescript
 * // playwright.config.ts
 * import { loadConfig } from '@artk/core/config';
 * import { createPlaywrightConfig } from '@artk/core/harness';
 *
 * const { config, activeEnvironment } = loadConfig();
 *
 * export default createPlaywrightConfig({
 *   config,
 *   activeEnvironment,
 *   tier: 'regression',
 * });
 * ```
 */
import type { ARTKConfig, BrowserType } from '../config/types.js';
import type { HarnessOptions, PlaywrightConfigOutput, TierName, TierSettings, UseOptions } from './types.js';
/**
 * Get tier-specific settings from ARTK config
 *
 * Returns configuration values (retries, workers, timeout, tag) for
 * the specified tier. Falls back to defaults if tier not configured.
 *
 * @param config - ARTK configuration
 * @param tier - Tier name ('smoke', 'release', 'regression')
 * @returns Tier settings object
 *
 * @example
 * ```typescript
 * const settings = getTierSettings(config, 'smoke');
 * // { retries: 0, workers: 1, timeout: 30000, tag: '@smoke' }
 * ```
 */
export declare function getTierSettings(config: ARTKConfig, tier?: TierName): TierSettings;
/**
 * Get all tier settings as a map
 *
 * @param config - ARTK configuration
 * @returns Map of tier name to settings
 */
export declare function getAllTierSettings(config: ARTKConfig): Record<TierName, TierSettings>;
/**
 * Generate Playwright 'use' configuration from ARTK config
 *
 * Creates the shared settings object that applies to all projects.
 *
 * @param config - ARTK configuration
 * @param activeEnvironment - Optional active environment name
 * @returns UseOptions object for Playwright config
 *
 * @example
 * ```typescript
 * const useOptions = getUseOptions(config, 'staging');
 * // { baseURL: 'https://staging.example.com', viewport: {...}, ... }
 * ```
 */
export declare function getUseOptions(config: ARTKConfig, activeEnvironment?: string): UseOptions;
/**
 * Create a complete Playwright configuration from ARTK config
 *
 * This is the main entry point for generating playwright.config.ts
 * contents. It combines all ARTK settings into a valid Playwright
 * configuration object.
 *
 * @param options - Harness configuration options
 * @returns Complete Playwright configuration object
 *
 * @example
 * ```typescript
 * // playwright.config.ts
 * import { loadConfig } from '@artk/core/config';
 * import { createPlaywrightConfig } from '@artk/core/harness';
 *
 * const { config, activeEnvironment } = loadConfig();
 *
 * export default createPlaywrightConfig({
 *   config,
 *   activeEnvironment,
 *   tier: 'smoke', // Optional: defaults to 'regression'
 *   testDir: 'e2e', // Optional: defaults to 'tests'
 * });
 * ```
 */
export declare function createPlaywrightConfig(options: HarnessOptions): PlaywrightConfigOutput;
/**
 * Create minimal Playwright configuration
 *
 * Useful for quick testing or simple setups without full ARTK config.
 *
 * @param baseURL - Base URL for tests
 * @param browsers - Browsers to test (default: ['chromium'])
 * @returns Minimal Playwright configuration
 */
export declare function createMinimalPlaywrightConfig(baseURL: string, browsers?: BrowserType[]): Partial<PlaywrightConfigOutput>;
/**
 * Merge Playwright configurations
 *
 * Combines a base configuration with overrides.
 *
 * @param base - Base configuration
 * @param overrides - Configuration overrides
 * @returns Merged configuration
 */
export declare function mergePlaywrightConfigs(base: Partial<PlaywrightConfigOutput>, overrides: Partial<PlaywrightConfigOutput>): Partial<PlaywrightConfigOutput>;
/**
 * Create a config override for a specific tier
 *
 * Useful for running different tiers with the same base config.
 *
 * @param config - ARTK configuration
 * @param tier - Tier to configure for
 * @returns Configuration overrides for the tier
 */
export declare function createTierOverrides(config: ARTKConfig, tier: TierName): Partial<PlaywrightConfigOutput>;
//# sourceMappingURL=playwright.config.base.d.ts.map