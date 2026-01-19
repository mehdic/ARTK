import { A as ARTKConfig, e as BrowserType } from './types-BBdYxuqU.js';
import { ReporterDescription } from '@playwright/test';

/**
 * Type definitions for ARTK Playwright Harness (T101)
 *
 * Defines the type contracts for Playwright configuration generation including:
 * - HarnessConfig: Configuration for harness creation
 * - ProjectConfig: Playwright project configuration
 * - PlaywrightConfigOptions: Generated Playwright config structure
 *
 * @module harness/types
 * @see playwright.config.base.ts for implementation
 */

/**
 * Tier names supported by ARTK
 */
type TierName = 'smoke' | 'release' | 'regression';
/**
 * Tier-specific settings for Playwright configuration
 */
interface TierSettings {
    /** Number of retries for failed tests */
    readonly retries: number;
    /** Number of parallel workers */
    readonly workers: number;
    /** Global timeout in milliseconds */
    readonly timeout: number;
    /** Tag filter for tests (e.g., '@smoke') */
    readonly tag: string;
}
/**
 * Auth setup project configuration
 *
 * Creates a project that runs before browser tests to establish
 * authenticated sessions for a specific role.
 */
interface AuthSetupProjectConfig {
    /** Project name (e.g., 'auth-setup-admin') */
    readonly name: string;
    /** Test file pattern for auth setup */
    readonly testMatch: string | RegExp;
    /** Role this project authenticates */
    readonly role: string;
    /** Path to save storage state */
    readonly storageStatePath: string;
}
/**
 * Browser project configuration
 *
 * Creates a project for running tests in a specific browser with
 * optional authentication dependency.
 */
interface BrowserProjectConfig {
    /** Project name (e.g., 'chromium-admin') */
    readonly name: string;
    /** Browser type to use */
    readonly browser: BrowserType;
    /** Role for authentication (determines storage state) */
    readonly role?: string;
    /** Projects this depends on (auth setup projects) */
    readonly dependencies?: readonly string[];
    /** Storage state path (for authenticated tests) */
    readonly storageStatePath?: string;
    /** Test file pattern */
    readonly testMatch?: string | RegExp;
    /** Test file ignore pattern */
    readonly testIgnore?: string | RegExp;
}
/**
 * Combined project configuration
 */
type ProjectConfig = AuthSetupProjectConfig | BrowserProjectConfig;
/**
 * Reporter configuration options
 */
interface ReporterConfigOptions {
    /** Enable HTML reporter */
    readonly html?: boolean;
    /** HTML reporter output folder */
    readonly htmlOutputFolder?: string;
    /** When to open HTML report ('always', 'never', 'on-failure') */
    readonly htmlOpen?: 'always' | 'never' | 'on-failure';
    /** Enable JSON reporter */
    readonly json?: boolean;
    /** JSON reporter output file */
    readonly jsonOutputFile?: string;
    /** Enable JUnit reporter */
    readonly junit?: boolean;
    /** JUnit reporter output file */
    readonly junitOutputFile?: string;
    /** Enable ARTK reporter */
    readonly artk?: boolean;
    /** ARTK reporter output file */
    readonly artkOutputFile?: string;
    /** Include journey mapping in ARTK report */
    readonly includeJourneyMapping?: boolean;
    /** Enable list reporter (console output) */
    readonly list?: boolean;
    /** Enable dot reporter (minimal console output) */
    readonly dot?: boolean;
}
/**
 * Generated reporter array for Playwright config
 */
type ReporterArray = ReporterDescription[];
/**
 * Playwright 'use' configuration options generated from ARTK config
 */
interface UseOptions {
    /** Base URL for navigation */
    readonly baseURL: string;
    /** Browser viewport size */
    readonly viewport: {
        readonly width: number;
        readonly height: number;
    };
    /** Run tests in headless mode */
    readonly headless: boolean;
    /** Slow down operations by this amount (ms) */
    readonly slowMo?: number;
    /** Browser channel selection */
    readonly channel?: string;
    /** Screenshot capture mode */
    readonly screenshot: 'off' | 'on' | 'only-on-failure';
    /** Video capture mode */
    readonly video: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
    /** Trace capture mode */
    readonly trace: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
    /** Test ID attribute for locators */
    readonly testIdAttribute: string;
}
/**
 * Options for creating the Playwright harness configuration
 */
interface HarnessOptions {
    /** ARTK configuration (loaded from artk.config.yml) */
    readonly config: ARTKConfig;
    /** Active environment name */
    readonly activeEnvironment?: string;
    /** Tier to configure for (default: 'regression') */
    readonly tier?: TierName;
    /** Project root directory */
    readonly projectRoot?: string;
    /** Include auth setup projects */
    readonly includeAuthSetup?: boolean;
    /** Custom test directory */
    readonly testDir?: string;
    /** Custom output directory */
    readonly outputDir?: string;
    /** Additional projects to include */
    readonly additionalProjects?: readonly PlaywrightProject[];
}
/**
 * Generated Playwright configuration structure
 *
 * This is the complete configuration object that can be exported
 * from playwright.config.ts
 */
interface PlaywrightConfigOutput {
    /** Test directory path */
    readonly testDir: string;
    /** Test output directory */
    readonly outputDir: string;
    /** Fully parallel execution */
    readonly fullyParallel: boolean;
    /** Forbid test.only in CI */
    readonly forbidOnly: boolean;
    /** Number of retries */
    readonly retries: number;
    /** Number of workers */
    readonly workers: number;
    /** Global timeout in ms */
    readonly timeout: number;
    /** Expect timeout in ms */
    readonly expect: {
        readonly timeout: number;
    };
    /** Reporter configuration */
    readonly reporter: ReporterArray;
    /** Shared settings for all projects */
    readonly use: UseOptions;
    /** Project definitions */
    readonly projects: readonly PlaywrightProject[];
    /** Global setup file */
    readonly globalSetup?: string;
    /** Global teardown file */
    readonly globalTeardown?: string;
}
/**
 * Playwright project definition
 */
interface PlaywrightProject {
    /** Project name */
    readonly name: string;
    /** Browser to use (for browser projects) */
    readonly use?: {
        readonly browserName?: BrowserType;
        readonly storageState?: string;
        readonly viewport?: {
            width: number;
            height: number;
        };
        readonly headless?: boolean;
    };
    /** Test file pattern */
    readonly testMatch?: string | RegExp;
    /** Test file ignore pattern */
    readonly testIgnore?: string | RegExp;
    /** Project dependencies */
    readonly dependencies?: readonly string[];
    /** Project-specific timeout */
    readonly timeout?: number;
}
/**
 * Factory function signature for creating Playwright config
 */
type CreatePlaywrightConfigFn = (options: HarnessOptions) => PlaywrightConfigOutput;
/**
 * Factory function signature for creating auth setup projects
 */
type CreateAuthSetupProjectFn = (role: string, storageStatePath: string, testMatch?: string) => PlaywrightProject;
/**
 * Factory function signature for creating browser projects
 */
type CreateBrowserProjectsFn = (browsers: readonly BrowserType[], roles: readonly string[], storageStateDir: string, filePattern: string, dependencies?: readonly string[]) => readonly PlaywrightProject[];
/**
 * Factory function signature for getting reporter config
 */
type GetReporterConfigFn = (config: ARTKConfig) => ReporterArray;
/**
 * Factory function signature for getting tier settings
 */
type GetTierSettingsFn = (config: ARTKConfig, tier: TierName) => TierSettings;
/**
 * Factory function signature for getting use options
 */
type GetUseOptionsFn = (config: ARTKConfig, activeEnvironment?: string) => UseOptions;

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
declare function getTierSettings(config: ARTKConfig, tier?: TierName): TierSettings;
/**
 * Get all tier settings as a map
 *
 * @param config - ARTK configuration
 * @returns Map of tier name to settings
 */
declare function getAllTierSettings(config: ARTKConfig): Record<TierName, TierSettings>;
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
declare function getUseOptions(config: ARTKConfig, activeEnvironment?: string): UseOptions;
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
declare function createPlaywrightConfig(options: HarnessOptions): PlaywrightConfigOutput;
/**
 * Create minimal Playwright configuration
 *
 * Useful for quick testing or simple setups without full ARTK config.
 *
 * @param baseURL - Base URL for tests
 * @param browsers - Browsers to test (default: ['chromium'])
 * @returns Minimal Playwright configuration
 */
declare function createMinimalPlaywrightConfig(baseURL: string, browsers?: BrowserType[]): Partial<PlaywrightConfigOutput>;
/**
 * Merge Playwright configurations
 *
 * Combines a base configuration with overrides.
 *
 * @param base - Base configuration
 * @param overrides - Configuration overrides
 * @returns Merged configuration
 */
declare function mergePlaywrightConfigs(base: Partial<PlaywrightConfigOutput>, overrides: Partial<PlaywrightConfigOutput>): Partial<PlaywrightConfigOutput>;
/**
 * Create a config override for a specific tier
 *
 * Useful for running different tiers with the same base config.
 *
 * @param config - ARTK configuration
 * @param tier - Tier to configure for
 * @returns Configuration overrides for the tier
 */
declare function createTierOverrides(config: ARTKConfig, tier: TierName): Partial<PlaywrightConfigOutput>;

export { type AuthSetupProjectConfig as A, type BrowserProjectConfig as B, type CreatePlaywrightConfigFn as C, type GetReporterConfigFn as G, type HarnessOptions as H, type PlaywrightProject as P, type ReporterArray as R, type TierName as T, type UseOptions as U, getUseOptions as a, type ReporterConfigOptions as b, createPlaywrightConfig as c, type TierSettings as d, type ProjectConfig as e, type PlaywrightConfigOutput as f, getTierSettings as g, type CreateAuthSetupProjectFn as h, type CreateBrowserProjectsFn as i, type GetTierSettingsFn as j, type GetUseOptionsFn as k, getAllTierSettings as l, createMinimalPlaywrightConfig as m, mergePlaywrightConfigs as n, createTierOverrides as o };
