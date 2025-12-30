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

import type { ReporterDescription } from '@playwright/test';

import type { ARTKConfig, BrowserType, TierConfig } from '../config/types.js';

// =============================================================================
// Tier Types
// =============================================================================

/**
 * Tier names supported by ARTK
 */
export type TierName = 'smoke' | 'release' | 'regression';

/**
 * Tier-specific settings for Playwright configuration
 */
export interface TierSettings {
  /** Number of retries for failed tests */
  readonly retries: number;

  /** Number of parallel workers */
  readonly workers: number;

  /** Global timeout in milliseconds */
  readonly timeout: number;

  /** Tag filter for tests (e.g., '@smoke') */
  readonly tag: string;
}

// =============================================================================
// Project Configuration Types
// =============================================================================

/**
 * Auth setup project configuration
 *
 * Creates a project that runs before browser tests to establish
 * authenticated sessions for a specific role.
 */
export interface AuthSetupProjectConfig {
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
export interface BrowserProjectConfig {
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
export type ProjectConfig = AuthSetupProjectConfig | BrowserProjectConfig;

// =============================================================================
// Reporter Configuration Types
// =============================================================================

/**
 * Reporter configuration options
 */
export interface ReporterConfigOptions {
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
export type ReporterArray = ReporterDescription[];

// =============================================================================
// Use Options Types
// =============================================================================

/**
 * Playwright 'use' configuration options generated from ARTK config
 */
export interface UseOptions {
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

  /** Screenshot capture mode */
  readonly screenshot: 'off' | 'on' | 'only-on-failure';

  /** Video capture mode */
  readonly video: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';

  /** Trace capture mode */
  readonly trace: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';

  /** Test ID attribute for locators */
  readonly testIdAttribute: string;
}

// =============================================================================
// Harness Configuration Types
// =============================================================================

/**
 * Options for creating the Playwright harness configuration
 */
export interface HarnessOptions {
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
export interface PlaywrightConfigOutput {
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
export interface PlaywrightProject {
  /** Project name */
  readonly name: string;

  /** Browser to use (for browser projects) */
  readonly use?: {
    readonly browserName?: BrowserType;
    readonly storageState?: string;
    readonly viewport?: { width: number; height: number };
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

// =============================================================================
// Factory Function Types
// =============================================================================

/**
 * Factory function signature for creating Playwright config
 */
export type CreatePlaywrightConfigFn = (options: HarnessOptions) => PlaywrightConfigOutput;

/**
 * Factory function signature for creating auth setup projects
 */
export type CreateAuthSetupProjectFn = (
  role: string,
  storageStatePath: string,
  testMatch?: string
) => PlaywrightProject;

/**
 * Factory function signature for creating browser projects
 */
export type CreateBrowserProjectsFn = (
  browsers: readonly BrowserType[],
  roles: readonly string[],
  storageStateDir: string,
  filePattern: string,
  dependencies?: readonly string[]
) => readonly PlaywrightProject[];

/**
 * Factory function signature for getting reporter config
 */
export type GetReporterConfigFn = (config: ARTKConfig) => ReporterArray;

/**
 * Factory function signature for getting tier settings
 */
export type GetTierSettingsFn = (config: ARTKConfig, tier: TierName) => TierSettings;

/**
 * Factory function signature for getting use options
 */
export type GetUseOptionsFn = (
  config: ARTKConfig,
  activeEnvironment?: string
) => UseOptions;

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type { ARTKConfig, TierConfig, BrowserType };
