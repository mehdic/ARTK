"use strict";
/**
 * Auth Setup Factory
 *
 * Creates Playwright auth setup project configurations for each role.
 * These projects run before browser tests to establish authenticated sessions.
 *
 * FR-007: Persist authentication state to files and reuse valid state across test runs
 * FR-009: Support multiple named roles with separate credentials and storage states
 *
 * @module auth/setup-factory
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
exports.createAuthSetup = createAuthSetup;
exports.createAllAuthSetups = createAllAuthSetups;
exports.generateAuthSetupCode = generateAuthSetupCode;
exports.generateAuthProjects = generateAuthProjects;
exports.createAuthProviderFromConfig = createAuthProviderFromConfig;
exports.getRoleNames = getRoleNames;
exports.getStorageStateDirectory = getStorageStateDirectory;
exports.hasRole = hasRole;
exports.getRoleConfig = getRoleConfig;
const path = __importStar(require("node:path"));
const storage_state_js_1 = require("./storage-state.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('auth', 'setup-factory');
// =============================================================================
// Default Configuration
// =============================================================================
/**
 * Default auth setup options
 */
const DEFAULT_AUTH_SETUP_OPTIONS = {
    outputDir: storage_state_js_1.DEFAULT_STORAGE_STATE_CONFIG.directory,
    filePattern: storage_state_js_1.DEFAULT_STORAGE_STATE_CONFIG.filePattern,
    forceReauth: false,
};
// =============================================================================
// Auth Setup Factory
// =============================================================================
/**
 * Create Playwright auth setup project configuration for a role
 *
 * Creates a project configuration that:
 * 1. Runs before browser tests
 * 2. Checks for valid existing storage state
 * 3. Authenticates and saves storage state if needed
 *
 * @param role - Role name (e.g., 'admin', 'standardUser')
 * @param authConfig - Authentication configuration
 * @param options - Optional setup configuration
 * @returns Playwright project configuration with name, testMatch, and setup paths
 */
function createAuthSetup(role, authConfig, _options = {}) {
    logger.debug('Creating auth setup for role', { role });
    // Validate role exists
    const roleConfig = authConfig.roles[role];
    if (!roleConfig) {
        throw new Error(`Role "${role}" not found in auth configuration`);
    }
    // Generate project name
    const projectName = `auth-setup-${role}`;
    return {
        name: projectName,
        testMatch: '**/auth.setup.ts',
        setup: `auth/setup/${role}.setup.ts`,
    };
}
/**
 * Create auth setup projects for all configured roles
 *
 * FR-009: Support multiple named roles with separate credentials and storage states
 *
 * @param authConfig - Authentication configuration
 * @param options - Optional setup configuration
 * @returns Array of Playwright project configurations for all roles
 */
function createAllAuthSetups(authConfig, options = {}) {
    const roles = Object.keys(authConfig.roles);
    logger.debug('Creating auth setups for all roles', { roles });
    return roles.map((role) => createAuthSetup(role, authConfig, options));
}
/**
 * Create auth setup code for a role
 *
 * Generates the TypeScript code for an auth setup file that can be
 * imported into Playwright's globalSetup.
 *
 * @param role - Role name
 * @param authConfig - Authentication configuration
 * @returns TypeScript code as string
 */
function generateAuthSetupCode(role, authConfig) {
    const roleConfig = authConfig.roles[role];
    if (!roleConfig) {
        throw new Error(`Role "${role}" not found in auth configuration`);
    }
    return `/**
 * Auth Setup for role: ${role}
 *
 * This file is auto-generated by ARTK.
 * It runs before browser tests to establish an authenticated session.
 */

import { chromium } from '@playwright/test';
import {
  getCredentials,
  saveStorageState,
  loadStorageState,
  cleanupExpiredStorageStates,
  createAuthProviderFromConfig,
} from '@artk/core/auth';
import { loadConfig } from '@artk/core/config';

async function setup() {
  // Load configuration
  const config = await loadConfig();

  // Cleanup expired storage states (NFR-007)
  await cleanupExpiredStorageStates();

  // Check for valid existing storage state
  const existingState = await loadStorageState('${role}', {
    directory: config.auth.storageState.directory,
    maxAgeMinutes: config.auth.storageState.maxAgeMinutes,
  });

  if (existingState) {
    console.log('Reusing existing storage state for role: ${role}');
    return;
  }

  console.log('Authenticating for role: ${role}');

  // Get credentials
  const credentials = getCredentials('${role}', config.auth);

  // Create auth provider
  const provider = createAuthProviderFromConfig(config.auth, '${role}');

  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Perform login
    await provider.login(page, credentials);

    // Save storage state
    await saveStorageState(context, '${role}', {
      directory: config.auth.storageState.directory,
      filePattern: config.auth.storageState.filePattern,
    });

    console.log('Authentication successful for role: ${role}');
  } finally {
    await browser.close();
  }
}

export default setup;
`;
}
// =============================================================================
// Playwright Config Integration
// =============================================================================
/**
 * Generate Playwright project configurations for auth setup
 *
 * Creates the full project configuration array needed for playwright.config.ts
 * including dependencies between auth setups and browser tests.
 *
 * Use these projects in playwright.config.ts by spreading them into the projects
 * array and setting browser test projects to depend on them.
 *
 * @param config - Full ARTK configuration
 * @returns Array of Playwright project configurations with name, testMatch, and metadata
 */
function generateAuthProjects(config) {
    const authConfig = config.auth;
    const roles = Object.keys(authConfig.roles);
    return roles.map((role) => ({
        name: `auth-setup-${role}`,
        testMatch: /auth\.setup\.ts$/,
        metadata: {
            role,
            storageStatePath: getStorageStatePath(role, {
                outputDir: authConfig.storageState.directory,
                filePattern: authConfig.storageState.filePattern,
            }),
        },
    }));
}
/**
 * Get storage state file path for a role
 */
function getStorageStatePath(role, options) {
    const directory = options.outputDir ?? DEFAULT_AUTH_SETUP_OPTIONS.outputDir;
    const pattern = options.filePattern ?? DEFAULT_AUTH_SETUP_OPTIONS.filePattern;
    const filename = pattern.replace('{role}', role).replace('{env}', 'default');
    return path.join(directory, filename.endsWith('.json') ? filename : `${filename}.json`);
}
// =============================================================================
// Auth Provider Factory
// =============================================================================
/**
 * Create an auth provider from configuration
 *
 * Factory function that creates the appropriate AuthProvider based on
 * the configuration's provider type.
 *
 * @param authConfig - Authentication configuration
 * @param role - Role name for provider setup
 * @returns AuthProvider instance
 */
function createAuthProviderFromConfig(authConfig, role) {
    const roleConfig = authConfig.roles[role];
    if (!roleConfig) {
        throw new Error(`Role "${role}" not found in auth configuration`);
    }
    const providerType = authConfig.provider;
    // Lazy import to avoid circular dependencies
    switch (providerType) {
        case 'oidc': {
            // Dynamic import would be ideal, but for now we return a factory pattern
            return {
                type: 'oidc',
                role,
                config: authConfig.oidc,
                roleOverrides: roleConfig.oidcOverrides,
            };
        }
        case 'form': {
            return {
                type: 'form',
                role,
                config: authConfig.form,
            };
        }
        case 'token': {
            return {
                type: 'token',
                role,
                // Token config would be in a similar structure
            };
        }
        case 'custom': {
            return {
                type: 'custom',
                role,
            };
        }
        default:
            throw new Error(`Unknown auth provider type: ${providerType}`);
    }
}
// =============================================================================
// Helper Functions
// =============================================================================
/**
 * Get all configured role names
 */
function getRoleNames(authConfig) {
    return Object.keys(authConfig.roles);
}
/**
 * Get storage state directory path
 */
function getStorageStateDirectory(authConfig, projectRoot = process.cwd()) {
    return path.join(projectRoot, authConfig.storageState.directory);
}
/**
 * Check if a role is configured
 */
function hasRole(role, authConfig) {
    return role in authConfig.roles;
}
/**
 * Get role configuration
 */
function getRoleConfig(role, authConfig) {
    return authConfig.roles[role];
}
//# sourceMappingURL=setup-factory.js.map