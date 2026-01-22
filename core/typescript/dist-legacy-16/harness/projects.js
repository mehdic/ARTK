"use strict";
/**
 * Playwright Project Configuration Helpers (T103)
 *
 * Provides factory functions for creating Playwright project configurations:
 * - createAuthSetupProject: Creates auth setup project for a role
 * - createBrowserProjects: Creates browser projects with auth dependencies
 *
 * @module harness/projects
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthSetupProject = createAuthSetupProject;
exports.createAuthSetupProjects = createAuthSetupProjects;
exports.createBrowserProjects = createBrowserProjects;
exports.createBrowserProject = createBrowserProject;
exports.createUnauthenticatedBrowserProjects = createUnauthenticatedBrowserProjects;
exports.resolveStorageStateFilename = resolveStorageStateFilename;
exports.getStorageStatePathForRole = getStorageStatePathForRole;
exports.filterProjectsByBrowser = filterProjectsByBrowser;
exports.filterProjectsByRole = filterProjectsByRole;
exports.getAuthSetupProjects = getAuthSetupProjects;
exports.getBrowserProjects = getBrowserProjects;
const path = __importStar(require("node:path"));
// =============================================================================
// Constants
// =============================================================================
/**
 * Default test match pattern for auth setup
 */
const DEFAULT_AUTH_SETUP_PATTERN = '**/auth.setup.ts';
/**
 * Default storage state file pattern
 */
const DEFAULT_STORAGE_STATE_PATTERN = '{role}.json';
// =============================================================================
// Auth Setup Project Factory
// =============================================================================
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
function createAuthSetupProject(role, storageStatePath, testMatch = DEFAULT_AUTH_SETUP_PATTERN) {
    if (!role || typeof role !== 'string') {
        throw new Error('Role must be a non-empty string');
    }
    if (!storageStatePath || typeof storageStatePath !== 'string') {
        throw new Error('Storage state path must be a non-empty string');
    }
    return {
        name: `auth-setup-${role}`,
        testMatch,
        use: {
            storageState: undefined, // Auth setup starts without storage state
        },
    };
}
/**
 * Create auth setup projects for all roles
 *
 * @param roles - Array of role names
 * @param storageStateDir - Directory for storage state files
 * @param filePattern - File naming pattern (default: '{role}.json')
 * @param testMatch - Test file pattern
 * @returns Array of Playwright project configurations
 */
function createAuthSetupProjects(roles, storageStateDir, filePattern = DEFAULT_STORAGE_STATE_PATTERN, testMatch = DEFAULT_AUTH_SETUP_PATTERN) {
    return roles.map((role) => {
        const filename = resolveStorageStateFilename(role, filePattern);
        const storagePath = path.join(storageStateDir, filename);
        return createAuthSetupProject(role, storagePath, testMatch);
    });
}
// =============================================================================
// Browser Projects Factory
// =============================================================================
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
function createBrowserProjects(browsers, roles, storageStateDir, filePattern = DEFAULT_STORAGE_STATE_PATTERN, dependencies = []) {
    const projects = [];
    for (const browser of browsers) {
        // Create unauthenticated project for public pages
        projects.push(createBrowserProject(browser));
        // Create authenticated projects for each role
        for (const role of roles) {
            const filename = resolveStorageStateFilename(role, filePattern);
            const storageStatePath = path.join(storageStateDir, filename);
            const authDeps = [`auth-setup-${role}`, ...dependencies];
            projects.push(createBrowserProject(browser, role, storageStatePath, authDeps));
        }
    }
    return projects;
}
/**
 * Create a single browser project
 *
 * @param browser - Browser type
 * @param role - Optional role for authentication
 * @param storageStatePath - Path to storage state file
 * @param dependencies - Project dependencies
 * @returns Playwright project configuration
 */
function createBrowserProject(browser, role, storageStatePath, dependencies) {
    const name = role ? `${browser}-${role}` : browser;
    const project = {
        name,
        use: {
            browserName: browser,
            ...(storageStatePath && { storageState: storageStatePath }),
        },
        ...(dependencies && dependencies.length > 0 && { dependencies }),
    };
    return project;
}
/**
 * Create browser projects without authentication
 *
 * Useful for testing public pages or auth flows themselves.
 *
 * @param browsers - Array of browser types
 * @returns Array of unauthenticated browser projects
 */
function createUnauthenticatedBrowserProjects(browsers) {
    return browsers.map((browser) => createBrowserProject(browser));
}
// =============================================================================
// Storage State Helpers
// =============================================================================
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
function resolveStorageStateFilename(role, pattern, env = 'default') {
    let filename = pattern.replace('{role}', role);
    filename = filename.replace('{env}', env);
    // Ensure .json extension
    if (!filename.endsWith('.json')) {
        filename = `${filename}.json`;
    }
    return filename;
}
/**
 * Get storage state path for a role
 *
 * @param role - Role name
 * @param storageStateDir - Base directory
 * @param filePattern - File naming pattern
 * @param env - Environment name
 * @returns Full path to storage state file
 */
function getStorageStatePathForRole(role, storageStateDir, filePattern = DEFAULT_STORAGE_STATE_PATTERN, env) {
    const filename = resolveStorageStateFilename(role, filePattern, env);
    return path.join(storageStateDir, filename);
}
// =============================================================================
// Project Filtering Helpers
// =============================================================================
/**
 * Filter projects by browser type
 *
 * @param projects - Array of projects
 * @param browser - Browser type to filter by
 * @returns Filtered projects
 */
function filterProjectsByBrowser(projects, browser) {
    return projects.filter((p) => p.name === browser || p.name.startsWith(`${browser}-`));
}
/**
 * Filter projects by role
 *
 * @param projects - Array of projects
 * @param role - Role name to filter by
 * @returns Filtered projects
 */
function filterProjectsByRole(projects, role) {
    return projects.filter((p) => p.name.includes(role));
}
/**
 * Get auth setup projects only
 *
 * @param projects - Array of all projects
 * @returns Only auth setup projects
 */
function getAuthSetupProjects(projects) {
    return projects.filter((p) => p.name.startsWith('auth-setup-'));
}
/**
 * Get browser projects only (excludes auth setup)
 *
 * @param projects - Array of all projects
 * @returns Only browser projects
 */
function getBrowserProjects(projects) {
    return projects.filter((p) => !p.name.startsWith('auth-setup-'));
}
//# sourceMappingURL=projects.js.map