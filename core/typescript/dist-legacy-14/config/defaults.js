"use strict";
/**
 * Default values for optional configuration fields
 *
 * These defaults are applied when fields are not explicitly specified
 * in the artk.config.yml file.
 *
 * @module config/defaults
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_CONFIG_VERSION = exports.DEFAULT_JOURNEYS = exports.DEFAULT_JOURNEY_ID_WIDTH = exports.DEFAULT_JOURNEY_ID_PREFIX = exports.DEFAULT_BROWSERS = exports.DEFAULT_VIEWPORT_HEIGHT = exports.DEFAULT_VIEWPORT_WIDTH = exports.DEFAULT_ARTIFACTS = exports.DEFAULT_CAPTURE_MODE = exports.DEFAULT_SCREENSHOT_MODE = exports.DEFAULT_REPORTERS = exports.DEFAULT_REPORTER_OPEN = exports.DEFAULT_TIERS = exports.DEFAULT_DATA = exports.DEFAULT_NAMESPACE_SUFFIX = exports.DEFAULT_NAMESPACE_PREFIX = exports.DEFAULT_ASSERTIONS = exports.DEFAULT_LOADING_TIMEOUT = exports.DEFAULT_TOAST_TIMEOUT = exports.DEFAULT_SELECTORS = exports.DEFAULT_TEST_ID_ATTRIBUTE = exports.DEFAULT_LOCATOR_STRATEGY = exports.DEFAULT_CALLBACK_MS = exports.DEFAULT_IDP_REDIRECT_MS = exports.DEFAULT_LOGIN_FLOW_MS = exports.DEFAULT_PUSH_TIMEOUT_MS = exports.DEFAULT_MFA_ENABLED = exports.DEFAULT_MFA_TYPE = exports.DEFAULT_OIDC_SUCCESS_TIMEOUT = exports.DEFAULT_STORAGE_STATE = exports.DEFAULT_APP_TYPE = void 0;
const timeouts_js_1 = require("./timeouts.js");
// =============================================================================
// Application Defaults
// =============================================================================
/** Default application type */
exports.DEFAULT_APP_TYPE = 'spa';
// =============================================================================
// Storage State Defaults
// =============================================================================
/** Default storage state configuration */
exports.DEFAULT_STORAGE_STATE = {
    directory: '.auth-states',
    maxAgeMinutes: 60,
    filePattern: '{role}.json',
};
// =============================================================================
// OIDC Defaults
// =============================================================================
/** Default OIDC success timeout in ms */
exports.DEFAULT_OIDC_SUCCESS_TIMEOUT = timeouts_js_1.TIMEOUTS.OIDC_SUCCESS_MS;
/** Default MFA type */
exports.DEFAULT_MFA_TYPE = 'none';
/** Default MFA enabled state */
exports.DEFAULT_MFA_ENABLED = false;
/** Default push timeout in ms */
exports.DEFAULT_PUSH_TIMEOUT_MS = timeouts_js_1.TIMEOUTS.AUTH_MFA_PUSH_MS;
/** Default OIDC login flow timeout in ms */
exports.DEFAULT_LOGIN_FLOW_MS = timeouts_js_1.TIMEOUTS.AUTH_LOGIN_FLOW_MS;
/** Default IdP redirect timeout in ms */
exports.DEFAULT_IDP_REDIRECT_MS = timeouts_js_1.TIMEOUTS.AUTH_IDP_REDIRECT_MS;
/** Default callback timeout in ms */
exports.DEFAULT_CALLBACK_MS = timeouts_js_1.TIMEOUTS.AUTH_CALLBACK_MS;
// =============================================================================
// Selectors Defaults
// =============================================================================
/** Default locator strategy order */
exports.DEFAULT_LOCATOR_STRATEGY = [
    'role',
    'label',
    'placeholder',
    'testid',
    'text',
    'css',
];
/** Default test ID attribute */
exports.DEFAULT_TEST_ID_ATTRIBUTE = 'data-testid';
/** Default selectors configuration */
exports.DEFAULT_SELECTORS = {
    testIdAttribute: exports.DEFAULT_TEST_ID_ATTRIBUTE,
    strategy: exports.DEFAULT_LOCATOR_STRATEGY,
};
// =============================================================================
// Assertions Defaults
// =============================================================================
/** Default toast timeout in ms */
exports.DEFAULT_TOAST_TIMEOUT = timeouts_js_1.TIMEOUTS.TOAST_DEFAULT_MS;
/** Default loading timeout in ms */
exports.DEFAULT_LOADING_TIMEOUT = timeouts_js_1.TIMEOUTS.LOADING_DEFAULT_MS;
/** Default assertions configuration */
exports.DEFAULT_ASSERTIONS = {
    toast: {
        containerSelector: '[role="alert"], .toast, .notification',
        messageSelector: '.toast-message, .notification-message',
        typeAttribute: 'data-type',
        timeout: exports.DEFAULT_TOAST_TIMEOUT,
    },
    loading: {
        selectors: ['.loading', '.spinner', '[data-loading="true"]'],
        timeout: exports.DEFAULT_LOADING_TIMEOUT,
    },
    form: {
        errorSelector: '[data-error="{field}"], .field-error[data-field="{field}"]',
        formErrorSelector: '.form-error, [role="alert"].form-error',
    },
};
// =============================================================================
// Data Defaults
// =============================================================================
/** Default namespace prefix */
exports.DEFAULT_NAMESPACE_PREFIX = '[artk-';
/** Default namespace suffix */
exports.DEFAULT_NAMESPACE_SUFFIX = ']';
/** Default data configuration */
exports.DEFAULT_DATA = {
    namespace: {
        prefix: exports.DEFAULT_NAMESPACE_PREFIX,
        suffix: exports.DEFAULT_NAMESPACE_SUFFIX,
    },
    cleanup: {
        enabled: true,
        onFailure: true,
        parallel: false,
    },
};
// =============================================================================
// Tier Defaults
// =============================================================================
/** Default tier configurations */
exports.DEFAULT_TIERS = {
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
// Reporters Defaults
// =============================================================================
/** Default reporter open mode */
exports.DEFAULT_REPORTER_OPEN = 'on-failure';
/** Default reporters configuration */
exports.DEFAULT_REPORTERS = {
    html: {
        enabled: true,
        outputFolder: 'playwright-report',
        open: exports.DEFAULT_REPORTER_OPEN,
    },
    json: {
        enabled: false,
        outputFile: 'test-results.json',
    },
    junit: {
        enabled: false,
        outputFile: 'junit.xml',
    },
    artk: {
        enabled: true,
        outputFile: 'artk-report.json',
        includeJourneyMapping: true,
    },
};
// =============================================================================
// Artifacts Defaults
// =============================================================================
/** Default screenshot mode */
exports.DEFAULT_SCREENSHOT_MODE = 'only-on-failure';
/** Default video/trace capture mode */
exports.DEFAULT_CAPTURE_MODE = 'retain-on-failure';
/** Default artifacts configuration */
exports.DEFAULT_ARTIFACTS = {
    outputDir: 'test-results',
    screenshots: {
        mode: exports.DEFAULT_SCREENSHOT_MODE,
        fullPage: true,
        maskPii: false,
        piiSelectors: [
            // Common PII input patterns
            'input[type="password"]',
            'input[name*="ssn"]',
            'input[name*="social"]',
            'input[name*="credit"]',
            'input[name*="card"]',
            'input[name*="cvv"]',
            'input[name*="account"]',
            'input[autocomplete="cc-number"]',
            'input[autocomplete="cc-csc"]',
            // Data attribute markers
            '[data-pii]',
            '[data-sensitive]',
            '[data-mask]',
            // Common class patterns
            '.pii-field',
            '.sensitive-data',
        ],
    },
    video: {
        mode: exports.DEFAULT_CAPTURE_MODE,
    },
    trace: {
        mode: exports.DEFAULT_CAPTURE_MODE,
        screenshots: true,
        snapshots: true,
    },
};
// =============================================================================
// Browsers Defaults
// =============================================================================
/** Default viewport width */
exports.DEFAULT_VIEWPORT_WIDTH = 1280;
/** Default viewport height */
exports.DEFAULT_VIEWPORT_HEIGHT = 720;
/** Default browsers configuration */
exports.DEFAULT_BROWSERS = {
    enabled: ['chromium'],
    channel: 'bundled',
    strategy: 'auto',
    viewport: {
        width: exports.DEFAULT_VIEWPORT_WIDTH,
        height: exports.DEFAULT_VIEWPORT_HEIGHT,
    },
    headless: true,
};
// =============================================================================
// Journeys Defaults
// =============================================================================
/** Default journey ID prefix */
exports.DEFAULT_JOURNEY_ID_PREFIX = 'JRN';
/** Default journey ID width */
exports.DEFAULT_JOURNEY_ID_WIDTH = 4;
/** Default journeys configuration */
exports.DEFAULT_JOURNEYS = {
    id: {
        prefix: exports.DEFAULT_JOURNEY_ID_PREFIX,
        width: exports.DEFAULT_JOURNEY_ID_WIDTH,
    },
    layout: 'flat',
    backlog: {
        groupBy: 'tier',
    },
};
// =============================================================================
// Config Version
// =============================================================================
/** Supported configuration schema version */
exports.SUPPORTED_CONFIG_VERSION = 1;
//# sourceMappingURL=defaults.js.map