"use strict";
/**
 * API Context Fixtures (T052)
 *
 * Provides pre-authenticated API request context for making
 * authenticated API calls in tests.
 *
 * @module fixtures/api
 * @see FR-021: API context with authentication headers
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
exports.testWithAPIContext = void 0;
exports.createAPIContext = createAPIContext;
exports.createCustomAPIContext = createCustomAPIContext;
exports.extractAuthToken = extractAuthToken;
exports.createAPIContextWithToken = createAPIContextWithToken;
const test_1 = require("@playwright/test");
const auth_js_1 = require("./auth.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('fixtures', 'api');
/**
 * Create API context options from config
 *
 * @param config - ARTK configuration
 * @param storageStatePath - Optional path to storage state for cookie auth
 * @returns API context options
 */
function createAPIContextOptions(config, storageStatePath) {
    const options = {};
    // Use fixtures.api.baseURL if configured, otherwise use data.api.baseUrl or app.baseUrl
    if (config.fixtures.api?.baseURL) {
        options.baseURL = config.fixtures.api.baseURL;
    }
    else if (config.data.api?.baseUrl) {
        options.baseURL = config.data.api.baseUrl;
    }
    else {
        // Resolve base URL from active environment or app config
        const envConfig = config.environments[config.activeEnvironment];
        options.baseURL = envConfig?.apiUrl ?? envConfig?.baseUrl ?? config.app.baseUrl;
    }
    // Merge extra HTTP headers
    const headers = {};
    if (config.fixtures.api?.extraHTTPHeaders) {
        Object.assign(headers, config.fixtures.api.extraHTTPHeaders);
    }
    if (Object.keys(headers).length > 0) {
        options.extraHTTPHeaders = headers;
    }
    // Add storage state for cookie-based auth
    if (storageStatePath) {
        options.storageState = storageStatePath;
    }
    return options;
}
/**
 * Create an authenticated API context
 *
 * @param config - ARTK configuration
 * @param storageStatePath - Optional storage state path
 * @returns APIRequestContext instance
 *
 * @example
 * ```typescript
 * const apiContext = await createAPIContext(config, storageStatePath);
 * const response = await apiContext.get('/api/users');
 * await apiContext.dispose();
 * ```
 */
async function createAPIContext(config, storageStatePath) {
    const options = createAPIContextOptions(config, storageStatePath);
    logger.debug('Creating API context', {
        baseURL: options.baseURL,
        hasStorageState: !!options.storageState,
        headerCount: Object.keys(options.extraHTTPHeaders ?? {}).length,
    });
    return test_1.request.newContext({
        baseURL: options.baseURL,
        extraHTTPHeaders: options.extraHTTPHeaders,
        storageState: options.storageState,
    });
}
/**
 * Create a new API context with custom options
 *
 * @param options - Custom API context options
 * @returns New APIRequestContext with custom configuration
 */
async function createCustomAPIContext(options) {
    logger.debug('Creating custom API context', {
        baseURL: options.baseURL,
        hasStorageState: !!options.storageState,
    });
    return test_1.request.newContext({
        baseURL: options.baseURL,
        extraHTTPHeaders: options.extraHTTPHeaders,
        storageState: options.storageState,
    });
}
/**
 * Test extended with API context fixture
 *
 * @example
 * ```typescript
 * import { testWithAPIContext } from '@artk/core/fixtures/api';
 *
 * testWithAPIContext('can call API', async ({ apiContext }) => {
 *   const response = await apiContext.get('/api/status');
 *   expect(response.ok()).toBe(true);
 * });
 * ```
 */
exports.testWithAPIContext = auth_js_1.testWithAuthPages.extend({
    apiContext: async ({ config }, use) => {
        // Get storage state path for default role (for cookie-based auth)
        const { getStorageStatePathForRole } = await Promise.resolve().then(() => __importStar(require('./base.js')));
        const { existsSync } = await Promise.resolve().then(() => __importStar(require('node:fs')));
        const defaultRole = config.fixtures.defaultRole;
        const storageStatePath = getStorageStatePathForRole(config, defaultRole);
        const storageStateExists = existsSync(storageStatePath);
        // Resolve base URL
        const envConfig = config.environments[config.activeEnvironment];
        const apiBaseUrl = config.fixtures.api?.baseURL
            ?? config.data.api?.baseUrl
            ?? envConfig?.apiUrl
            ?? envConfig?.baseUrl
            ?? config.app.baseUrl;
        // Build context options
        const contextOptions = {
            baseURL: apiBaseUrl,
        };
        // Add extra headers if configured
        if (config.fixtures.api?.extraHTTPHeaders) {
            contextOptions.extraHTTPHeaders = config.fixtures.api.extraHTTPHeaders;
        }
        // Add storage state for cookie-based auth
        if (storageStateExists) {
            contextOptions.storageState = storageStatePath;
        }
        logger.info('Creating API context', {
            baseURL: apiBaseUrl,
            hasStorageState: storageStateExists,
            role: defaultRole,
        });
        const apiContext = await test_1.request.newContext({
            baseURL: contextOptions.baseURL,
            extraHTTPHeaders: contextOptions.extraHTTPHeaders,
            storageState: contextOptions.storageState,
        });
        try {
            await use(apiContext);
        }
        finally {
            await apiContext.dispose();
        }
    },
});
// =============================================================================
// API Helper Functions
// =============================================================================
/**
 * Extract auth token from storage state
 *
 * Useful for APIs that require Bearer token authentication
 * rather than cookie-based auth.
 *
 * @param storageStatePath - Path to storage state file
 * @param tokenKey - Key to look for in localStorage (default: 'auth_token')
 * @returns Token string or undefined if not found
 */
async function extractAuthToken(storageStatePath, tokenKey = 'auth_token') {
    const { readFile } = await Promise.resolve().then(() => __importStar(require('node:fs/promises')));
    try {
        const content = await readFile(storageStatePath, 'utf-8');
        const state = JSON.parse(content);
        // Search localStorage in all origins
        for (const origin of state.origins ?? []) {
            const tokenEntry = origin.localStorage.find(item => item.name === tokenKey);
            if (tokenEntry) {
                return tokenEntry.value;
            }
        }
        return undefined;
    }
    catch (error) {
        logger.warn('Failed to extract auth token', {
            path: storageStatePath,
            error: String(error),
        });
        return undefined;
    }
}
/**
 * Create API context with Bearer token authentication
 *
 * @param config - ARTK configuration
 * @param token - Bearer token
 * @returns APIRequestContext with Bearer auth header
 */
async function createAPIContextWithToken(config, token) {
    const options = createAPIContextOptions(config);
    // Add Authorization header
    const headers = {
        ...(options.extraHTTPHeaders ?? {}),
        Authorization: `Bearer ${token}`,
    };
    logger.debug('Creating API context with token auth');
    return test_1.request.newContext({
        baseURL: options.baseURL,
        extraHTTPHeaders: headers,
    });
}
//# sourceMappingURL=api.js.map