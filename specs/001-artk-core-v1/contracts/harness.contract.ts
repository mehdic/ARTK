/**
 * Playwright Harness Module API Contract
 *
 * This contract defines the public API for the ARTK Harness module.
 * Implementation must satisfy these type signatures.
 */

import type { PlaywrightTestConfig, Project } from '@playwright/test';

// =============================================================================
// Types
// =============================================================================

export interface CreatePlaywrightConfigOptions {
  /** Extend base config with custom settings */
  extend?: Partial<PlaywrightTestConfig>;
  /** Override tier (default: detected from ARTK_TIER env var) */
  tier?: 'smoke' | 'release' | 'regression';
}

export interface BrowserProjectOptions {
  /** Browsers to include */
  browsers: ('chromium' | 'firefox' | 'webkit')[];
  /** Auth roles to set up dependencies */
  authRoles: string[];
}

// =============================================================================
// Main Config Factory
// =============================================================================

/**
 * Create Playwright configuration from ARTK config
 *
 * Generates a complete Playwright config including:
 * - baseURL from config (with env var support)
 * - Tier-based settings (timeouts, retries, workers)
 * - Auth setup projects per role
 * - Browser projects with auth dependencies
 * - Reporter configuration
 * - Artifact settings (screenshots, video, trace)
 *
 * @param options - Optional customization
 * @returns Complete Playwright configuration
 *
 * @example
 * // artk/playwright.config.ts
 * import { createPlaywrightConfig } from './.core/harness';
 *
 * export default createPlaywrightConfig();
 *
 * // With extensions:
 * export default createPlaywrightConfig({
 *   extend: {
 *     testDir: './custom-tests',
 *   },
 *   tier: 'smoke',
 * });
 */
export declare function createPlaywrightConfig(
  options?: CreatePlaywrightConfigOptions
): PlaywrightTestConfig;

// =============================================================================
// Project Factories
// =============================================================================

/**
 * Create an auth setup project for a specific role
 *
 * @param role - Role name from config
 * @returns Playwright Project configuration
 *
 * @example
 * const adminSetup = createAuthSetupProject('admin');
 * // { name: 'auth-setup-admin', testMatch: '**/auth.setup.ts', ... }
 */
export declare function createAuthSetupProject(role: string): Project;

/**
 * Create browser projects with auth dependencies
 *
 * @param options - Browser and auth role configuration
 * @returns Array of Playwright Project configurations
 *
 * @example
 * const projects = createBrowserProjects({
 *   browsers: ['chromium', 'firefox'],
 *   authRoles: ['admin', 'standardUser'],
 * });
 */
export declare function createBrowserProjects(options: BrowserProjectOptions): Project[];

/**
 * Create all auth setup projects for configured roles
 *
 * @returns Array of auth setup Project configurations
 */
export declare function createAllAuthSetupProjects(): Project[];

// =============================================================================
// Reporter Configuration
// =============================================================================

export interface ReporterEntry {
  type: string;
  options?: Record<string, unknown>;
}

/**
 * Get reporter configuration from ARTK config
 *
 * Transforms reporters config into Playwright reporter format.
 *
 * @returns Array of reporter configurations
 *
 * @example
 * const reporters = getReporterConfig();
 * // [['html', { outputFolder: '...' }], ['json', { outputFile: '...' }], ...]
 */
export declare function getReporterConfig(): ReporterEntry[];

// =============================================================================
// Tier Configuration
// =============================================================================

/**
 * Get current test tier from environment or config
 *
 * Checks ARTK_TIER env var, falls back to 'regression'.
 *
 * @returns Current tier name
 */
export declare function getCurrentTier(): 'smoke' | 'release' | 'regression';

/**
 * Get tier-specific Playwright settings
 *
 * @param tier - Tier name
 * @returns Playwright settings (timeout, retries, workers)
 */
export declare function getTierSettings(tier: string): {
  timeout: number;
  retries: number;
  workers: number;
};

// =============================================================================
// Use Options
// =============================================================================

/**
 * Get Playwright use options from ARTK config
 *
 * Includes:
 * - baseURL
 * - viewport
 * - trace
 * - video
 * - screenshot
 * - testIdAttribute
 *
 * @returns Playwright use options
 */
export declare function getUseOptions(): Record<string, unknown>;

// =============================================================================
// Web Server Configuration
// =============================================================================

export interface WebServerConfig {
  command: string;
  url: string;
  reuseExistingServer?: boolean;
  timeout?: number;
}

/**
 * Create web server configuration (optional)
 *
 * For local development where app needs to be started.
 *
 * @param config - Web server settings
 * @returns Playwright webServer config
 *
 * @example
 * const webServer = createWebServerConfig({
 *   command: 'npm run dev',
 *   url: 'http://localhost:3000',
 * });
 */
export declare function createWebServerConfig(config: WebServerConfig): WebServerConfig;
