"use strict";
/**
 * Authenticated Page Fixtures (T050, T051)
 *
 * Provides pre-authenticated page fixtures for different roles:
 * - authenticatedPage: Page for default role
 * - adminPage: Page for admin role
 * - userPage: Page for standardUser role
 *
 * @module fixtures/auth
 * @see FR-006: OIDC authentication support
 * @see FR-007: Storage state persistence
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
exports.testWithAuthPages = void 0;
exports.createRolePageFixture = createRolePageFixture;
exports.createDynamicRoleFixtures = createDynamicRoleFixtures;
exports.getAvailableRoles = getAvailableRoles;
const base_js_1 = require("./base.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('fixtures', 'auth');
/**
 * Create an authenticated browser context for a role
 *
 * @param browser - Playwright Browser instance
 * @param config - ARTK configuration
 * @param role - Role to authenticate as
 * @returns Authenticated BrowserContext
 */
async function createAuthenticatedContext(browser, config, role) {
    const storageStatePath = (0, base_js_1.getStorageStatePathForRole)(config, role);
    const isValid = await (0, base_js_1.isStorageStateValidForRole)(config, role);
    if (!isValid) {
        logger.warn('Storage state not valid or missing for role', {
            role,
            path: storageStatePath,
            suggestion: 'Run auth setup before tests',
        });
    }
    logger.debug('Creating authenticated context', { role, storageStatePath });
    // Try to use storage state if it exists
    const { existsSync } = await Promise.resolve().then(() => __importStar(require('node:fs')));
    const contextOptions = {};
    if (existsSync(storageStatePath)) {
        contextOptions.storageState = storageStatePath;
        logger.info('Using storage state for role', { role, path: storageStatePath });
    }
    else {
        logger.warn('Storage state file not found', {
            role,
            path: storageStatePath,
            hint: 'Tests may fail if authentication is required',
        });
    }
    // Apply browser configuration from config
    if (config.browsers) {
        contextOptions.viewport = config.browsers.viewport;
    }
    return browser.newContext(contextOptions);
}
/**
 * Create an authenticated page for a role
 *
 * @param browser - Playwright Browser instance
 * @param config - ARTK configuration
 * @param role - Role to authenticate as
 * @returns Object with page and cleanup function
 */
async function createAuthenticatedPage(browser, config, role) {
    const context = await createAuthenticatedContext(browser, config, role);
    const page = await context.newPage();
    return {
        page,
        cleanup: async () => {
            await page.close();
            await context.close();
        },
    };
}
/**
 * Create a role-specific page fixture
 *
 * This factory creates fixture definitions for specific roles.
 * Used internally to generate adminPage, userPage, etc.
 *
 * @param role - Role name from config
 * @returns Fixture definition for use in test.extend()
 *
 * @example
 * ```typescript
 * // Creating a custom role fixture
 * const managerPageFixture = createRolePageFixture('manager');
 *
 * const test = baseTest.extend({
 *   managerPage: managerPageFixture,
 * });
 * ```
 */
function createRolePageFixture(role) {
    return async ({ browser, config }, use) => {
        // Validate role exists in config
        if (!config.auth.roles[role]) {
            const availableRoles = Object.keys(config.auth.roles).join(', ');
            throw new Error(`Role "${role}" not found in auth configuration. Available roles: ${availableRoles}`);
        }
        logger.debug('Creating page fixture for role', { role });
        const { page, cleanup } = await createAuthenticatedPage(browser, config, role);
        try {
            await use(page);
        }
        finally {
            await cleanup();
        }
    };
}
/**
 * Test extended with authenticated page fixtures
 *
 * @example
 * ```typescript
 * import { testWithAuthPages } from '@artk/core/fixtures/auth';
 *
 * testWithAuthPages('admin can access dashboard', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/dashboard');
 * });
 *
 * testWithAuthPages('admin vs user comparison', async ({ adminPage, userPage }) => {
 *   // Both pages are authenticated with different roles
 * });
 * ```
 */
exports.testWithAuthPages = base_js_1.testWithConfig.extend({
    // Default authenticated page - uses fixtures.defaultRole from config
    authenticatedPage: async ({ browser, config }, use) => {
        const defaultRole = config.fixtures.defaultRole;
        if (!config.auth.roles[defaultRole]) {
            throw new Error(`Default role "${defaultRole}" not found in auth.roles. ` +
                `Update fixtures.defaultRole in your config to a valid role.`);
        }
        const { page, cleanup } = await createAuthenticatedPage(browser, config, defaultRole);
        try {
            await use(page);
        }
        finally {
            await cleanup();
        }
    },
    // Admin page fixture
    adminPage: async ({ browser, config }, use) => {
        const role = 'admin';
        // Check if admin role exists, fall back to first available role if not
        const effectiveRole = config.auth.roles[role] ? role : Object.keys(config.auth.roles)[0];
        if (!effectiveRole) {
            throw new Error('No roles defined in auth configuration');
        }
        if (effectiveRole !== role) {
            logger.warn('admin role not found, using fallback', { fallback: effectiveRole });
        }
        const { page, cleanup } = await createAuthenticatedPage(browser, config, effectiveRole);
        try {
            await use(page);
        }
        finally {
            await cleanup();
        }
    },
    // User page fixture (standardUser or similar)
    userPage: async ({ browser, config }, use) => {
        // Try common user role names
        const userRoleNames = ['standardUser', 'user', 'viewer', 'member'];
        let effectiveRole;
        for (const roleName of userRoleNames) {
            if (config.auth.roles[roleName]) {
                effectiveRole = roleName;
                break;
            }
        }
        // Fall back to any non-admin role, or admin if nothing else
        if (!effectiveRole) {
            const availableRoles = Object.keys(config.auth.roles);
            effectiveRole = availableRoles.find(r => r !== 'admin') ?? availableRoles[0];
        }
        if (!effectiveRole) {
            throw new Error('No roles defined in auth configuration');
        }
        logger.debug('Using user role', { role: effectiveRole });
        const { page, cleanup } = await createAuthenticatedPage(browser, config, effectiveRole);
        try {
            await use(page);
        }
        finally {
            await cleanup();
        }
    },
});
// =============================================================================
// Dynamic Role Fixture Factory
// =============================================================================
/**
 * Create fixtures for all configured role fixtures
 *
 * Uses fixtures.roleFixtures from config to generate named page fixtures.
 *
 * @param config - ARTK configuration
 * @returns Object with fixture definitions for each role
 *
 * @example
 * ```typescript
 * const roleFixtures = createDynamicRoleFixtures(config);
 * // Returns { adminPage: fixture, viewerPage: fixture, ... }
 * ```
 */
function createDynamicRoleFixtures(config) {
    const fixtures = {};
    // Get configured role fixtures
    const roleFixtureNames = config.fixtures.roleFixtures ?? [];
    for (const role of roleFixtureNames) {
        // Create PascalCase fixture name: admin -> adminPage
        const fixtureName = `${role}Page`;
        fixtures[fixtureName] = createRolePageFixture(role);
    }
    return fixtures;
}
/**
 * Get all available role names from config
 *
 * @param config - ARTK configuration
 * @returns Array of role names
 */
function getAvailableRoles(config) {
    return Object.keys(config.auth.roles);
}
//# sourceMappingURL=auth.js.map