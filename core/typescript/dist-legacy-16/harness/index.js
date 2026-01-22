"use strict";
/**
 * ARTK Harness Module (T106)
 *
 * Provides Playwright configuration generation from ARTK config.
 *
 * Key Features:
 * - createPlaywrightConfig: Generate complete Playwright config
 * - getTierSettings: Get tier-specific settings (retries, workers, timeout)
 * - getUseOptions: Get shared 'use' configuration
 * - getReporterConfig: Generate reporter configuration
 * - createAuthSetupProject: Create auth setup projects
 * - createBrowserProjects: Create browser test projects
 *
 * @module harness
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBrowserChannel = exports.hasReporter = exports.mergeReporterConfigs = exports.getCIReporterConfig = exports.getMinimalReporterConfig = exports.getReporterConfigFromOptions = exports.getReporterConfig = exports.getBrowserProjects = exports.getAuthSetupProjects = exports.filterProjectsByRole = exports.filterProjectsByBrowser = exports.getStorageStatePathForRole = exports.resolveStorageStateFilename = exports.createUnauthenticatedBrowserProjects = exports.createBrowserProject = exports.createBrowserProjects = exports.createAuthSetupProjects = exports.createAuthSetupProject = exports.createTierOverrides = exports.mergePlaywrightConfigs = exports.createMinimalPlaywrightConfig = exports.getUseOptions = exports.getAllTierSettings = exports.getTierSettings = exports.createPlaywrightConfig = void 0;
// =============================================================================
// Configuration Factory Exports
// =============================================================================
var playwright_config_base_js_1 = require("./playwright.config.base.js");
// Main factory
Object.defineProperty(exports, "createPlaywrightConfig", { enumerable: true, get: function () { return playwright_config_base_js_1.createPlaywrightConfig; } });
// Tier settings
Object.defineProperty(exports, "getTierSettings", { enumerable: true, get: function () { return playwright_config_base_js_1.getTierSettings; } });
Object.defineProperty(exports, "getAllTierSettings", { enumerable: true, get: function () { return playwright_config_base_js_1.getAllTierSettings; } });
// Use options
Object.defineProperty(exports, "getUseOptions", { enumerable: true, get: function () { return playwright_config_base_js_1.getUseOptions; } });
// Config utilities
Object.defineProperty(exports, "createMinimalPlaywrightConfig", { enumerable: true, get: function () { return playwright_config_base_js_1.createMinimalPlaywrightConfig; } });
Object.defineProperty(exports, "mergePlaywrightConfigs", { enumerable: true, get: function () { return playwright_config_base_js_1.mergePlaywrightConfigs; } });
Object.defineProperty(exports, "createTierOverrides", { enumerable: true, get: function () { return playwright_config_base_js_1.createTierOverrides; } });
// =============================================================================
// Project Factory Exports
// =============================================================================
var projects_js_1 = require("./projects.js");
// Auth setup projects
Object.defineProperty(exports, "createAuthSetupProject", { enumerable: true, get: function () { return projects_js_1.createAuthSetupProject; } });
Object.defineProperty(exports, "createAuthSetupProjects", { enumerable: true, get: function () { return projects_js_1.createAuthSetupProjects; } });
// Browser projects
Object.defineProperty(exports, "createBrowserProjects", { enumerable: true, get: function () { return projects_js_1.createBrowserProjects; } });
Object.defineProperty(exports, "createBrowserProject", { enumerable: true, get: function () { return projects_js_1.createBrowserProject; } });
Object.defineProperty(exports, "createUnauthenticatedBrowserProjects", { enumerable: true, get: function () { return projects_js_1.createUnauthenticatedBrowserProjects; } });
// Storage state helpers
Object.defineProperty(exports, "resolveStorageStateFilename", { enumerable: true, get: function () { return projects_js_1.resolveStorageStateFilename; } });
Object.defineProperty(exports, "getStorageStatePathForRole", { enumerable: true, get: function () { return projects_js_1.getStorageStatePathForRole; } });
// Project filtering
Object.defineProperty(exports, "filterProjectsByBrowser", { enumerable: true, get: function () { return projects_js_1.filterProjectsByBrowser; } });
Object.defineProperty(exports, "filterProjectsByRole", { enumerable: true, get: function () { return projects_js_1.filterProjectsByRole; } });
Object.defineProperty(exports, "getAuthSetupProjects", { enumerable: true, get: function () { return projects_js_1.getAuthSetupProjects; } });
Object.defineProperty(exports, "getBrowserProjects", { enumerable: true, get: function () { return projects_js_1.getBrowserProjects; } });
// =============================================================================
// Reporter Configuration Exports
// =============================================================================
var reporters_js_1 = require("./reporters.js");
// Main reporter config
Object.defineProperty(exports, "getReporterConfig", { enumerable: true, get: function () { return reporters_js_1.getReporterConfig; } });
Object.defineProperty(exports, "getReporterConfigFromOptions", { enumerable: true, get: function () { return reporters_js_1.getReporterConfigFromOptions; } });
// Preset configurations
Object.defineProperty(exports, "getMinimalReporterConfig", { enumerable: true, get: function () { return reporters_js_1.getMinimalReporterConfig; } });
Object.defineProperty(exports, "getCIReporterConfig", { enumerable: true, get: function () { return reporters_js_1.getCIReporterConfig; } });
// Utilities
Object.defineProperty(exports, "mergeReporterConfigs", { enumerable: true, get: function () { return reporters_js_1.mergeReporterConfigs; } });
Object.defineProperty(exports, "hasReporter", { enumerable: true, get: function () { return reporters_js_1.hasReporter; } });
var browser_validator_js_1 = require("./browser-validator.js");
Object.defineProperty(exports, "validateBrowserChannel", { enumerable: true, get: function () { return browser_validator_js_1.validateBrowserChannel; } });
//# sourceMappingURL=index.js.map