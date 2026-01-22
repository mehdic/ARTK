"use strict";
/**
 * Base Test Fixture with Config Loading (T049)
 *
 * Provides the base test fixture that loads ARTK configuration
 * and serves as the foundation for all other fixtures.
 *
 * @module fixtures/base
 * @see FR-005: Provide typed access to all configuration sections
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testWithConfig = void 0;
exports.ensureConfigLoaded = ensureConfigLoaded;
exports.getStorageStateDirectory = getStorageStateDirectory;
exports.getStorageStatePathForRole = getStorageStatePathForRole;
exports.isStorageStateValidForRole = isStorageStateValidForRole;
const test_1 = require("@playwright/test");
const loader_js_1 = require("../config/loader.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('fixtures', 'base');
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
exports.testWithConfig = test_1.test.extend({
    config: async ({}, use) => {
        logger.debug('Loading ARTK configuration');
        // Load config if not already loaded
        if (!(0, loader_js_1.isConfigLoaded)()) {
            (0, loader_js_1.loadConfig)();
        }
        const config = (0, loader_js_1.getConfig)();
        logger.info('Configuration loaded', {
            appName: config.app.name,
            environment: config.activeEnvironment,
            roles: Object.keys(config.auth.roles),
        });
        await use(config);
    },
});
// =============================================================================
// Config Loading Utilities
// =============================================================================
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
function ensureConfigLoaded(options) {
    if (!(0, loader_js_1.isConfigLoaded)()) {
        (0, loader_js_1.loadConfig)(options);
    }
    return (0, loader_js_1.getConfig)();
}
/**
 * Get the storage state directory path from config
 *
 * @param config - ARTK configuration
 * @param baseDir - Optional base directory (defaults to cwd)
 * @returns Absolute path to storage state directory
 */
function getStorageStateDirectory(config, baseDir = process.cwd()) {
    const { resolve } = require('node:path');
    return resolve(baseDir, config.auth.storageState.directory);
}
/**
 * Get the storage state file path for a role
 *
 * @param config - ARTK configuration
 * @param role - Role name
 * @param baseDir - Optional base directory
 * @returns Absolute path to storage state file
 */
function getStorageStatePathForRole(config, role, baseDir) {
    const { join } = require('node:path');
    const directory = getStorageStateDirectory(config, baseDir);
    const pattern = config.auth.storageState.filePattern;
    const fileName = pattern
        .replace('{role}', role)
        .replace('{env}', config.activeEnvironment);
    return join(directory, fileName);
}
/**
 * Check if storage state exists and is valid for a role
 *
 * @param config - ARTK configuration
 * @param role - Role name
 * @param baseDir - Optional base directory
 * @returns true if storage state is valid
 */
async function isStorageStateValidForRole(config, role, baseDir) {
    const { existsSync, statSync } = require('node:fs');
    const filePath = getStorageStatePathForRole(config, role, baseDir);
    try {
        if (!existsSync(filePath)) {
            return false;
        }
        const stats = statSync(filePath);
        const age = Date.now() - stats.mtimeMs;
        const maxAge = config.auth.storageState.maxAgeMinutes * 60 * 1000;
        return age <= maxAge;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=base.js.map