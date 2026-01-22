/**
 * Playwright Project Configuration Helpers (T103)
 *
 * Provides factory functions for creating Playwright project configurations:
 * - createAuthSetupProject: Creates auth setup project for a role
 * - createBrowserProjects: Creates browser projects with auth dependencies
 *
 * @module harness/projects
 */
import type { BrowserType } from '../config/types.js';
import type { PlaywrightProject } from './types.js';
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
export declare function createAuthSetupProject(role: string, storageStatePath: string, testMatch?: string): PlaywrightProject;
/**
 * Create auth setup projects for all roles
 *
 * @param roles - Array of role names
 * @param storageStateDir - Directory for storage state files
 * @param filePattern - File naming pattern (default: '{role}.json')
 * @param testMatch - Test file pattern
 * @returns Array of Playwright project configurations
 */
export declare function createAuthSetupProjects(roles: readonly string[], storageStateDir: string, filePattern?: string, testMatch?: string): readonly PlaywrightProject[];
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
export declare function createBrowserProjects(browsers: readonly BrowserType[], roles: readonly string[], storageStateDir: string, filePattern?: string, dependencies?: readonly string[]): readonly PlaywrightProject[];
/**
 * Create a single browser project
 *
 * @param browser - Browser type
 * @param role - Optional role for authentication
 * @param storageStatePath - Path to storage state file
 * @param dependencies - Project dependencies
 * @returns Playwright project configuration
 */
export declare function createBrowserProject(browser: BrowserType, role?: string, storageStatePath?: string, dependencies?: readonly string[]): PlaywrightProject;
/**
 * Create browser projects without authentication
 *
 * Useful for testing public pages or auth flows themselves.
 *
 * @param browsers - Array of browser types
 * @returns Array of unauthenticated browser projects
 */
export declare function createUnauthenticatedBrowserProjects(browsers: readonly BrowserType[]): readonly PlaywrightProject[];
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
export declare function resolveStorageStateFilename(role: string, pattern: string, env?: string): string;
/**
 * Get storage state path for a role
 *
 * @param role - Role name
 * @param storageStateDir - Base directory
 * @param filePattern - File naming pattern
 * @param env - Environment name
 * @returns Full path to storage state file
 */
export declare function getStorageStatePathForRole(role: string, storageStateDir: string, filePattern?: string, env?: string): string;
/**
 * Filter projects by browser type
 *
 * @param projects - Array of projects
 * @param browser - Browser type to filter by
 * @returns Filtered projects
 */
export declare function filterProjectsByBrowser(projects: readonly PlaywrightProject[], browser: BrowserType): readonly PlaywrightProject[];
/**
 * Filter projects by role
 *
 * @param projects - Array of projects
 * @param role - Role name to filter by
 * @returns Filtered projects
 */
export declare function filterProjectsByRole(projects: readonly PlaywrightProject[], role: string): readonly PlaywrightProject[];
/**
 * Get auth setup projects only
 *
 * @param projects - Array of all projects
 * @returns Only auth setup projects
 */
export declare function getAuthSetupProjects(projects: readonly PlaywrightProject[]): readonly PlaywrightProject[];
/**
 * Get browser projects only (excludes auth setup)
 *
 * @param projects - Array of all projects
 * @returns Only browser projects
 */
export declare function getBrowserProjects(projects: readonly PlaywrightProject[]): readonly PlaywrightProject[];
//# sourceMappingURL=projects.d.ts.map