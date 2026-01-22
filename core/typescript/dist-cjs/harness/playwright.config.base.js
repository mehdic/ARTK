"use strict";
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
exports.getTierSettings = getTierSettings;
exports.getAllTierSettings = getAllTierSettings;
exports.getUseOptions = getUseOptions;
exports.createPlaywrightConfig = createPlaywrightConfig;
exports.createMinimalPlaywrightConfig = createMinimalPlaywrightConfig;
exports.mergePlaywrightConfigs = mergePlaywrightConfigs;
exports.createTierOverrides = createTierOverrides;
const path = __importStar(require("node:path"));
const projects_js_1 = require("./projects.js");
const reporters_js_1 = require("./reporters.js");
// =============================================================================
// Constants
// =============================================================================
/**
 * Default tier when not specified
 */
const DEFAULT_TIER = 'regression';
/**
 * Default test directory
 */
const DEFAULT_TEST_DIR = 'tests';
/**
 * Default output directory
 */
const DEFAULT_OUTPUT_DIR = 'test-results';
/**
 * Default expect timeout in ms
 */
const DEFAULT_EXPECT_TIMEOUT = 5000;
/**
 * Default tier settings when tier config is missing
 */
const DEFAULT_TIER_SETTINGS = {
    smoke: {
        retries: 0,
        workers: 1,
        timeout: 30000,
        tag: '@smoke',
    },
    release: {
        retries: 1,
        workers: 2,
        timeout: 60000,
        tag: '@release',
    },
    regression: {
        retries: 2,
        workers: 4,
        timeout: 120000,
        tag: '@regression',
    },
};
// =============================================================================
// Tier Settings Factory (T105)
// =============================================================================
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
function getTierSettings(config, tier = DEFAULT_TIER) {
    const tierConfig = config.tiers[tier];
    if (!tierConfig) {
        // Fall back to default tier settings
        return DEFAULT_TIER_SETTINGS[tier] ?? DEFAULT_TIER_SETTINGS.regression;
    }
    return {
        retries: tierConfig.retries,
        workers: tierConfig.workers,
        timeout: tierConfig.timeout,
        tag: tierConfig.tag,
    };
}
/**
 * Get all tier settings as a map
 *
 * @param config - ARTK configuration
 * @returns Map of tier name to settings
 */
function getAllTierSettings(config) {
    return {
        smoke: getTierSettings(config, 'smoke'),
        release: getTierSettings(config, 'release'),
        regression: getTierSettings(config, 'regression'),
    };
}
// =============================================================================
// Use Options Factory (T105)
// =============================================================================
/**
 * Map ARTK browser channel to Playwright channel option
 */
function mapBrowserChannel(channel) {
    if (!channel || channel === 'bundled') {
        return undefined;
    }
    return channel;
}
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
function getUseOptions(config, activeEnvironment) {
    // Determine base URL
    const envName = activeEnvironment ?? config.activeEnvironment;
    const envConfig = config.environments[envName];
    const baseURL = envConfig?.baseUrl ?? config.app.baseUrl;
    // Map screenshot mode
    const screenshotMode = mapScreenshotMode(config.artifacts.screenshots.mode);
    // Map video mode
    const videoMode = mapCaptureMode(config.artifacts.video.mode);
    // Map trace mode
    const traceMode = mapCaptureMode(config.artifacts.trace.mode);
    const playwrightChannel = mapBrowserChannel(config.browsers.channel);
    return {
        baseURL,
        viewport: {
            width: config.browsers.viewport.width,
            height: config.browsers.viewport.height,
        },
        headless: config.browsers.headless,
        ...(config.browsers.slowMo && { slowMo: config.browsers.slowMo }),
        ...(playwrightChannel && { channel: playwrightChannel }),
        screenshot: screenshotMode,
        video: videoMode,
        trace: traceMode,
        testIdAttribute: config.selectors.testIdAttribute,
    };
}
/**
 * Map ARTK screenshot mode to Playwright mode
 */
function mapScreenshotMode(mode) {
    return mode;
}
/**
 * Map ARTK capture mode to Playwright mode
 */
function mapCaptureMode(mode) {
    return mode;
}
// =============================================================================
// Playwright Config Factory (T102)
// =============================================================================
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
function createPlaywrightConfig(options) {
    const { config, activeEnvironment, tier = DEFAULT_TIER, projectRoot = process.cwd(), includeAuthSetup = true, testDir = DEFAULT_TEST_DIR, outputDir = DEFAULT_OUTPUT_DIR, additionalProjects = [], } = options;
    // Get tier settings
    const tierSettings = getTierSettings(config, tier);
    // Get use options
    const useOptions = getUseOptions(config, activeEnvironment);
    // Get reporter config
    const reporters = (0, reporters_js_1.getReporterConfig)(config);
    // Build projects
    const projects = buildProjects(config, projectRoot, includeAuthSetup, additionalProjects);
    // Determine if running in CI
    const isCI = Boolean(process.env.CI);
    return {
        testDir,
        outputDir: config.artifacts.outputDir ?? outputDir,
        fullyParallel: true,
        forbidOnly: isCI,
        retries: tierSettings.retries,
        workers: tierSettings.workers,
        timeout: tierSettings.timeout,
        expect: {
            timeout: DEFAULT_EXPECT_TIMEOUT,
        },
        reporter: reporters,
        use: useOptions,
        projects,
    };
}
/**
 * Build project array from configuration
 */
function buildProjects(config, projectRoot, includeAuthSetup, additionalProjects) {
    const projects = [];
    // Get roles and browsers from config
    const roles = Object.keys(config.auth.roles);
    const browsers = config.browsers.enabled;
    const storageStateDir = path.join(projectRoot, config.auth.storageState.directory);
    const filePattern = config.auth.storageState.filePattern;
    // Add auth setup projects
    if (includeAuthSetup && roles.length > 0) {
        const authProjects = (0, projects_js_1.createAuthSetupProjects)(roles, storageStateDir, filePattern);
        projects.push(...authProjects);
    }
    // Add browser projects
    const browserProjects = (0, projects_js_1.createBrowserProjects)(browsers, roles, storageStateDir, filePattern);
    projects.push(...browserProjects);
    // Add any additional custom projects
    projects.push(...additionalProjects);
    return projects;
}
/**
 * Create minimal Playwright configuration
 *
 * Useful for quick testing or simple setups without full ARTK config.
 *
 * @param baseURL - Base URL for tests
 * @param browsers - Browsers to test (default: ['chromium'])
 * @returns Minimal Playwright configuration
 */
function createMinimalPlaywrightConfig(baseURL, browsers = ['chromium']) {
    const projects = browsers.map((browser) => ({
        name: browser,
        use: {
            browserName: browser,
        },
    }));
    return {
        testDir: DEFAULT_TEST_DIR,
        outputDir: DEFAULT_OUTPUT_DIR,
        fullyParallel: true,
        forbidOnly: Boolean(process.env.CI),
        retries: 0,
        workers: 1,
        timeout: 30000,
        expect: {
            timeout: DEFAULT_EXPECT_TIMEOUT,
        },
        reporter: [['list']],
        use: {
            baseURL,
            viewport: { width: 1280, height: 720 },
            headless: true,
            screenshot: 'only-on-failure',
            video: 'off',
            trace: 'off',
            testIdAttribute: 'data-testid',
        },
        projects,
    };
}
/**
 * Merge Playwright configurations
 *
 * Combines a base configuration with overrides.
 *
 * @param base - Base configuration
 * @param overrides - Configuration overrides
 * @returns Merged configuration
 */
function mergePlaywrightConfigs(base, overrides) {
    return {
        ...base,
        ...overrides,
        use: {
            ...base.use,
            ...overrides.use,
        },
        projects: overrides.projects ?? base.projects,
        reporter: overrides.reporter ?? base.reporter ?? [],
    };
}
/**
 * Create a config override for a specific tier
 *
 * Useful for running different tiers with the same base config.
 *
 * @param config - ARTK configuration
 * @param tier - Tier to configure for
 * @returns Configuration overrides for the tier
 */
function createTierOverrides(config, tier) {
    const settings = getTierSettings(config, tier);
    return {
        retries: settings.retries,
        workers: settings.workers,
        timeout: settings.timeout,
    };
}
//# sourceMappingURL=playwright.config.base.js.map