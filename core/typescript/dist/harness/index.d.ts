import { P as PlaywrightProject, R as ReporterArray, b as ReporterConfigOptions } from '../playwright.config.base-O1HF5UXE.js';
export { A as AuthSetupProjectConfig, B as BrowserProjectConfig, h as CreateAuthSetupProjectFn, i as CreateBrowserProjectsFn, C as CreatePlaywrightConfigFn, G as GetReporterConfigFn, j as GetTierSettingsFn, k as GetUseOptionsFn, H as HarnessOptions, f as PlaywrightConfigOutput, e as ProjectConfig, T as TierName, d as TierSettings, U as UseOptions, m as createMinimalPlaywrightConfig, c as createPlaywrightConfig, o as createTierOverrides, l as getAllTierSettings, g as getTierSettings, a as getUseOptions, n as mergePlaywrightConfigs } from '../playwright.config.base-O1HF5UXE.js';
import { a0 as BrowserChannel, e as BrowserType, A as ARTKConfig } from '../types-BBdYxuqU.js';
export { T as TierConfig } from '../types-BBdYxuqU.js';
import '@playwright/test';

interface BrowserValidationResult {
    available: boolean;
    version?: string;
    path?: string;
    reason?: string;
}
/**
 * Validate that the configured browser channel is available on the system.
 */
declare function validateBrowserChannel(channel?: BrowserChannel): Promise<BrowserValidationResult>;

/**
 * Playwright Project Configuration Helpers (T103)
 *
 * Provides factory functions for creating Playwright project configurations:
 * - createAuthSetupProject: Creates auth setup project for a role
 * - createBrowserProjects: Creates browser projects with auth dependencies
 *
 * @module harness/projects
 */

/**
 * Create a Playwright project configuration for auth setup
 *
 * Auth setup projects run before browser tests to establish
 * authenticated sessions. Each role gets its own setup project.
 *
 * @param role - Role name (e.g., 'admin', 'standardUser')
 * @param storageStatePath - Path to save storage state file
 * @param testMatch - Test file pattern (default: 'auth.setup.ts' glob pattern)
 * @returns Playwright project configuration
 *
 * @example
 * ```typescript
 * const adminSetup = createAuthSetupProject(
 *   'admin',
 *   '.auth-states/admin.json'
 * );
 * // Returns: { name: 'auth-setup-admin', testMatch: '**\/auth.setup.ts' }
 * ```
 */
declare function createAuthSetupProject(role: string, storageStatePath: string, testMatch?: string): PlaywrightProject;
/**
 * Create auth setup projects for all roles
 *
 * @param roles - Array of role names
 * @param storageStateDir - Directory for storage state files
 * @param filePattern - File naming pattern (default: '{role}.json')
 * @param testMatch - Test file pattern
 * @returns Array of Playwright project configurations
 */
declare function createAuthSetupProjects(roles: readonly string[], storageStateDir: string, filePattern?: string, testMatch?: string): readonly PlaywrightProject[];
/**
 * Create Playwright project configurations for browser testing
 *
 * Creates projects for each combination of browser and role.
 * Projects depend on their corresponding auth setup projects.
 *
 * @param browsers - Array of browser types to create projects for
 * @param roles - Array of role names
 * @param storageStateDir - Directory containing storage state files
 * @param filePattern - Storage state file naming pattern
 * @param dependencies - Additional project dependencies
 * @returns Array of Playwright project configurations
 *
 * @example
 * ```typescript
 * const projects = createBrowserProjects(
 *   ['chromium', 'firefox'],
 *   ['admin', 'standardUser'],
 *   '.auth-states',
 *   '{role}.json'
 * );
 * // Creates 4 projects: chromium-admin, chromium-standardUser,
 * // firefox-admin, firefox-standardUser
 * ```
 */
declare function createBrowserProjects(browsers: readonly BrowserType[], roles: readonly string[], storageStateDir: string, filePattern?: string, dependencies?: readonly string[]): readonly PlaywrightProject[];
/**
 * Create a single browser project
 *
 * @param browser - Browser type
 * @param role - Optional role for authentication
 * @param storageStatePath - Path to storage state file
 * @param dependencies - Project dependencies
 * @returns Playwright project configuration
 */
declare function createBrowserProject(browser: BrowserType, role?: string, storageStatePath?: string, dependencies?: readonly string[]): PlaywrightProject;
/**
 * Create browser projects without authentication
 *
 * Useful for testing public pages or auth flows themselves.
 *
 * @param browsers - Array of browser types
 * @returns Array of unauthenticated browser projects
 */
declare function createUnauthenticatedBrowserProjects(browsers: readonly BrowserType[]): readonly PlaywrightProject[];
/**
 * Resolve storage state filename from pattern
 *
 * Replaces {role} and {env} placeholders in the pattern.
 *
 * @param role - Role name
 * @param pattern - File pattern (e.g., '{role}.json', '{role}-{env}.json')
 * @param env - Environment name (default: 'default')
 * @returns Resolved filename
 */
declare function resolveStorageStateFilename(role: string, pattern: string, env?: string): string;
/**
 * Get storage state path for a role
 *
 * @param role - Role name
 * @param storageStateDir - Base directory
 * @param filePattern - File naming pattern
 * @param env - Environment name
 * @returns Full path to storage state file
 */
declare function getStorageStatePathForRole(role: string, storageStateDir: string, filePattern?: string, env?: string): string;
/**
 * Filter projects by browser type
 *
 * @param projects - Array of projects
 * @param browser - Browser type to filter by
 * @returns Filtered projects
 */
declare function filterProjectsByBrowser(projects: readonly PlaywrightProject[], browser: BrowserType): readonly PlaywrightProject[];
/**
 * Filter projects by role
 *
 * @param projects - Array of projects
 * @param role - Role name to filter by
 * @returns Filtered projects
 */
declare function filterProjectsByRole(projects: readonly PlaywrightProject[], role: string): readonly PlaywrightProject[];
/**
 * Get auth setup projects only
 *
 * @param projects - Array of all projects
 * @returns Only auth setup projects
 */
declare function getAuthSetupProjects(projects: readonly PlaywrightProject[]): readonly PlaywrightProject[];
/**
 * Get browser projects only (excludes auth setup)
 *
 * @param projects - Array of all projects
 * @returns Only browser projects
 */
declare function getBrowserProjects(projects: readonly PlaywrightProject[]): readonly PlaywrightProject[];

/**
 * Reporter Configuration Helper (T104)
 *
 * Generates Playwright reporter configurations from ARTK config.
 *
 * @module harness/reporters
 */

/**
 * Generate Playwright reporter configuration from ARTK config
 *
 * Creates an array of reporter descriptions based on the reporters
 * section in artk.config.yml.
 *
 * @param config - ARTK configuration
 * @returns Array of Playwright reporter descriptions
 *
 * @example
 * ```typescript
 * import { loadConfig } from '@artk/core/config';
 * import { getReporterConfig } from '@artk/core/harness';
 *
 * const { config } = loadConfig();
 * const reporters = getReporterConfig(config);
 * // [['html', {...}], ['json', {...}], ...]
 * ```
 */
declare function getReporterConfig(config: ARTKConfig): ReporterArray;
/**
 * Generate reporter configuration from options object
 *
 * Alternative to using ARTK config, useful for testing or custom setups.
 *
 * @param options - Reporter configuration options
 * @returns Array of Playwright reporter descriptions
 */
declare function getReporterConfigFromOptions(options?: Partial<ReporterConfigOptions>): ReporterArray;
/**
 * Create minimal reporter configuration
 *
 * Returns just the list reporter for quick local development.
 *
 * @returns Minimal reporter array
 */
declare function getMinimalReporterConfig(): ReporterArray;
/**
 * Create CI-optimized reporter configuration
 *
 * Includes JUnit for CI integration and JSON for processing.
 *
 * @param junitPath - Path for JUnit output
 * @param jsonPath - Path for JSON output
 * @returns CI-optimized reporter array
 */
declare function getCIReporterConfig(junitPath?: string, jsonPath?: string): ReporterArray;
/**
 * Merge reporter configurations
 *
 * Combines multiple reporter arrays, deduplicating by reporter type.
 *
 * @param configs - Reporter arrays to merge
 * @returns Merged reporter array
 */
declare function mergeReporterConfigs(...configs: ReporterArray[]): ReporterArray;
/**
 * Check if a reporter type is enabled in the configuration
 *
 * @param reporters - Reporter array to check
 * @param type - Reporter type (e.g., 'html', 'json')
 * @returns True if the reporter type is in the array
 */
declare function hasReporter(reporters: ReporterArray, type: string): boolean;

export { ARTKConfig, BrowserType, type BrowserValidationResult, PlaywrightProject, ReporterArray, ReporterConfigOptions, createAuthSetupProject, createAuthSetupProjects, createBrowserProject, createBrowserProjects, createUnauthenticatedBrowserProjects, filterProjectsByBrowser, filterProjectsByRole, getAuthSetupProjects, getBrowserProjects, getCIReporterConfig, getMinimalReporterConfig, getReporterConfig, getReporterConfigFromOptions, getStorageStatePathForRole, hasReporter, mergeReporterConfigs, resolveStorageStateFilename, validateBrowserChannel };
