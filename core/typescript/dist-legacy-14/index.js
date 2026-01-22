"use strict";
/**
 * ARTK Core v1 - Main Entry Point
 *
 * ARTK Core is designed for module-specific imports to avoid type conflicts
 * and keep bundle sizes small. Import from specific modules rather than this
 * main entry point.
 *
 * @example
 * ```typescript
 * // ✅ RECOMMENDED: Import from specific modules
 * import { loadConfig } from '@artk/core/config';
 * import { test, expect } from '@artk/core/fixtures';
 * import { OIDCAuthProvider } from '@artk/core/auth';
 * import { createPlaywrightConfig } from '@artk/core/harness';
 * import { locate } from '@artk/core/locators';
 * import { expectToast } from '@artk/core/assertions';
 * import { namespace } from '@artk/core/data';
 * import { ARTKReporter } from '@artk/core/reporters';
 *
 * // ⚠️ NOT RECOMMENDED: Importing from main entry (can cause type conflicts)
 * // import { loadConfig, test } from '@artk/core';
 * ```
 *
 * @packageDocumentation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = exports.createLogger = exports.ARTKStorageStateError = exports.ARTKAuthError = exports.ARTKConfigError = exports.DEFAULT_TIMEOUTS = exports.agGrid = exports.getUseOptions = exports.getTierSettings = exports.createPlaywrightConfig = exports.mapTestToJourney = exports.extractJourneyId = exports.ARTKReporter = exports.CleanupManager = exports.generateRunId = exports.namespace = exports.waitForLoadingComplete = exports.expectLoading = exports.expectFormFieldError = exports.expectTableToContainRow = exports.expectToast = exports.withinTable = exports.withinForm = exports.byTestId = exports.byLabel = exports.byRole = exports.locate = exports.expect = exports.test = exports.getCredentials = exports.loadStorageState = exports.saveStorageState = exports.TokenAuthProvider = exports.FormAuthProvider = exports.OIDCAuthProvider = exports.clearConfigCache = exports.getConfig = exports.loadConfig = exports.version = void 0;
// =============================================================================
// Version Information
// =============================================================================
/**
 * ARTK Core version information
 *
 * @example
 * ```typescript
 * import { version } from '@artk/core';
 * console.log(`ARTK Core v${version.version}`);
 * ```
 */
var version_json_1 = require("./version.json");
Object.defineProperty(exports, "version", { enumerable: true, get: function () { return __importDefault(version_json_1).default; } });
// =============================================================================
// Module Re-exports for Convenience
// =============================================================================
/**
 * Configuration Module (US1 - Config)
 * @see {@link config/index.ts} for full API
 */
var index_js_1 = require("./config/index.js");
Object.defineProperty(exports, "loadConfig", { enumerable: true, get: function () { return index_js_1.loadConfig; } });
Object.defineProperty(exports, "getConfig", { enumerable: true, get: function () { return index_js_1.getConfig; } });
Object.defineProperty(exports, "clearConfigCache", { enumerable: true, get: function () { return index_js_1.clearConfigCache; } });
/**
 * Authentication Module (US2 - Auth)
 * @see {@link auth/index.ts} for full API
 */
var index_js_2 = require("./auth/index.js");
Object.defineProperty(exports, "OIDCAuthProvider", { enumerable: true, get: function () { return index_js_2.OIDCAuthProvider; } });
Object.defineProperty(exports, "FormAuthProvider", { enumerable: true, get: function () { return index_js_2.FormAuthProvider; } });
Object.defineProperty(exports, "TokenAuthProvider", { enumerable: true, get: function () { return index_js_2.TokenAuthProvider; } });
Object.defineProperty(exports, "saveStorageState", { enumerable: true, get: function () { return index_js_2.saveStorageState; } });
Object.defineProperty(exports, "loadStorageState", { enumerable: true, get: function () { return index_js_2.loadStorageState; } });
Object.defineProperty(exports, "getCredentials", { enumerable: true, get: function () { return index_js_2.getCredentials; } });
/**
 * Fixtures Module (US3 - Fixtures)
 * @see {@link fixtures/index.ts} for full API
 */
var index_js_3 = require("./fixtures/index.js");
Object.defineProperty(exports, "test", { enumerable: true, get: function () { return index_js_3.test; } });
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return index_js_3.expect; } });
/**
 * Locators Module (US4 - Locators)
 * @see {@link locators/index.ts} for full API
 */
var index_js_4 = require("./locators/index.js");
Object.defineProperty(exports, "locate", { enumerable: true, get: function () { return index_js_4.locate; } });
Object.defineProperty(exports, "byRole", { enumerable: true, get: function () { return index_js_4.byRole; } });
Object.defineProperty(exports, "byLabel", { enumerable: true, get: function () { return index_js_4.byLabel; } });
Object.defineProperty(exports, "byTestId", { enumerable: true, get: function () { return index_js_4.byTestId; } });
Object.defineProperty(exports, "withinForm", { enumerable: true, get: function () { return index_js_4.withinForm; } });
Object.defineProperty(exports, "withinTable", { enumerable: true, get: function () { return index_js_4.withinTable; } });
/**
 * Assertions Module (US5 - Assertions)
 * @see {@link assertions/index.ts} for full API
 */
var index_js_5 = require("./assertions/index.js");
Object.defineProperty(exports, "expectToast", { enumerable: true, get: function () { return index_js_5.expectToast; } });
Object.defineProperty(exports, "expectTableToContainRow", { enumerable: true, get: function () { return index_js_5.expectTableToContainRow; } });
Object.defineProperty(exports, "expectFormFieldError", { enumerable: true, get: function () { return index_js_5.expectFormFieldError; } });
Object.defineProperty(exports, "expectLoading", { enumerable: true, get: function () { return index_js_5.expectLoading; } });
Object.defineProperty(exports, "waitForLoadingComplete", { enumerable: true, get: function () { return index_js_5.waitForLoadingComplete; } });
/**
 * Data Module (US6 - Data)
 * @see {@link data/index.ts} for full API
 */
var index_js_6 = require("./data/index.js");
Object.defineProperty(exports, "namespace", { enumerable: true, get: function () { return index_js_6.namespace; } });
Object.defineProperty(exports, "generateRunId", { enumerable: true, get: function () { return index_js_6.generateRunId; } });
Object.defineProperty(exports, "CleanupManager", { enumerable: true, get: function () { return index_js_6.CleanupManager; } });
/**
 * Reporters Module (US7 - Reporters)
 * @see {@link reporters/index.ts} for full API
 */
var index_js_7 = require("./reporters/index.js");
Object.defineProperty(exports, "ARTKReporter", { enumerable: true, get: function () { return index_js_7.ARTKReporter; } });
Object.defineProperty(exports, "extractJourneyId", { enumerable: true, get: function () { return index_js_7.extractJourneyId; } });
Object.defineProperty(exports, "mapTestToJourney", { enumerable: true, get: function () { return index_js_7.mapTestToJourney; } });
/**
 * Harness Module (US8 - Harness)
 * @see {@link harness/index.ts} for full API
 */
var index_js_8 = require("./harness/index.js");
Object.defineProperty(exports, "createPlaywrightConfig", { enumerable: true, get: function () { return index_js_8.createPlaywrightConfig; } });
Object.defineProperty(exports, "getTierSettings", { enumerable: true, get: function () { return index_js_8.getTierSettings; } });
Object.defineProperty(exports, "getUseOptions", { enumerable: true, get: function () { return index_js_8.getUseOptions; } });
/**
 * Grid Module (AG Grid Testing)
 * @see {@link grid/index.ts} for full API
 */
var index_js_9 = require("./grid/index.js");
Object.defineProperty(exports, "agGrid", { enumerable: true, get: function () { return index_js_9.agGrid; } });
Object.defineProperty(exports, "DEFAULT_TIMEOUTS", { enumerable: true, get: function () { return index_js_9.DEFAULT_TIMEOUTS; } });
/**
 * Error Classes
 * @see {@link errors/index.ts} for full API
 */
var index_js_10 = require("./errors/index.js");
Object.defineProperty(exports, "ARTKConfigError", { enumerable: true, get: function () { return index_js_10.ARTKConfigError; } });
Object.defineProperty(exports, "ARTKAuthError", { enumerable: true, get: function () { return index_js_10.ARTKAuthError; } });
Object.defineProperty(exports, "ARTKStorageStateError", { enumerable: true, get: function () { return index_js_10.ARTKStorageStateError; } });
/**
 * Utilities
 * @see {@link utils/index.ts} for full API
 */
var index_js_11 = require("./utils/index.js");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return index_js_11.createLogger; } });
Object.defineProperty(exports, "withRetry", { enumerable: true, get: function () { return index_js_11.withRetry; } });
// =============================================================================
// Module Guide
// =============================================================================
/**
 * # ARTK Core Modules
 *
 * ## Available Modules
 *
 * | Module | Import Path | Description |
 * |--------|-------------|-------------|
 * | **Config** | `@artk/core/config` | Configuration loading and management |
 * | **Auth** | `@artk/core/auth` | Authentication (OIDC, form, token) |
 * | **Fixtures** | `@artk/core/fixtures` | Playwright test fixtures |
 * | **Locators** | `@artk/core/locators` | Accessibility-first locators |
 * | **Assertions** | `@artk/core/assertions` | UI assertion helpers |
 * | **Data** | `@artk/core/data` | Test data and cleanup |
 * | **Reporters** | `@artk/core/reporters` | Custom reporters |
 * | **Harness** | `@artk/core/harness` | Playwright config generation |
 * | **Grid** | `@artk/core/grid` | AG Grid testing helpers |
 * | **Errors** | `@artk/core/errors` | Error classes |
 * | **Utils** | `@artk/core/utils` | Utilities (logging, retry) |
 *
 * ## Usage Pattern
 *
 * Always prefer module-specific imports to avoid type conflicts and reduce bundle size:
 *
 * ```typescript
 * // config module
 * import { loadConfig, getConfig } from '@artk/core/config';
 *
 * // fixtures module
 * import { test, expect } from '@artk/core/fixtures';
 *
 * // locators module
 * import { locate, byRole } from '@artk/core/locators';
 * ```
 *
 * @see quickstart.md for complete usage examples
 */
//# sourceMappingURL=index.js.map