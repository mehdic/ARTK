"use strict";
/**
 * Token-based Authentication Provider
 *
 * Implements the AuthProvider interface for API-based token acquisition.
 * Stores token in browser local storage for reuse across test requests.
 *
 * @module auth/providers/token
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenAuthProvider = void 0;
exports.createTokenAuthProvider = createTokenAuthProvider;
exports.getStoredToken = getStoredToken;
const base_js_1 = require("./base.js");
const auth_error_js_1 = require("../../errors/auth-error.js");
// =============================================================================
// Default Configuration
// =============================================================================
/**
 * Default token auth configuration
 */
const DEFAULT_TOKEN_CONFIG = {
    headerName: 'Authorization',
    headerPrefix: 'Bearer ',
    tokenField: 'access_token',
    timeoutMs: 10000,
    usernameField: 'username',
    passwordField: 'password',
};
/**
 * Local storage key for storing token
 */
const TOKEN_STORAGE_KEY = 'artk_auth_token';
// =============================================================================
// Token Auth Provider
// =============================================================================
/**
 * Token-based Authentication Provider
 *
 * Handles API-based token acquisition:
 * 1. POST credentials to token endpoint
 * 2. Extract access token from response
 * 3. Store token in browser local storage
 *
 * The stored token can be used by apiContext fixtures for authenticated requests.
 *
 * @example
 * ```typescript
 * const provider = new TokenAuthProvider({
 *   tokenEndpoint: 'https://api.example.com/auth/token',
 *   headerName: 'Authorization',
 *   headerPrefix: 'Bearer ',
 * });
 *
 * await provider.login(page, credentials);
 * // Token is now stored in local storage
 * ```
 */
class TokenAuthProvider extends base_js_1.BaseAuthProvider {
    /**
     * Create token auth provider
     *
     * @param config - Token auth configuration
     * @param retryOptions - Optional retry configuration
     */
    constructor(config, retryOptions = {}) {
        super('token', retryOptions);
        this.currentRole = 'unknown';
        this.config = config;
    }
    /**
     * Set the role for error reporting
     */
    setRole(role) {
        this.currentRole = role;
    }
    /**
     * Perform token-based login
     *
     * Acquires an access token from the token endpoint and stores it
     * in the browser's local storage for use by test fixtures.
     *
     * @param page - Playwright Page
     * @param credentials - User credentials
     * @throws ARTKAuthError on login failure
     */
    async login(page, credentials) {
        let lastError;
        for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
            try {
                // Acquire token
                const token = await this.acquireToken(page, credentials);
                // Store token in local storage
                await this.storeToken(page, token);
                // Cache token for isSessionValid
                this.cachedToken = token;
                this.logger.info('Token login successful', {
                    role: this.currentRole,
                    attempts: attempt + 1,
                });
                return;
            }
            catch (error) {
                lastError = error instanceof auth_error_js_1.ARTKAuthError
                    ? error
                    : new auth_error_js_1.ARTKAuthError(error instanceof Error ? error.message : String(error), this.currentRole, 'credentials');
                if (attempt < this.retryOptions.maxRetries && this.shouldRetry(lastError)) {
                    const delay = this.calculateRetryDelay(attempt);
                    this.logger.warn(`Token login attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
                        role: this.currentRole,
                        attempt: attempt + 1,
                        delayMs: delay,
                        error: lastError.message,
                    });
                    await this.sleep(delay);
                }
            }
        }
        this.logger.error('Token login failed after all retries', {
            role: this.currentRole,
            maxRetries: this.retryOptions.maxRetries,
            error: lastError?.message,
        });
        throw new auth_error_js_1.ARTKAuthError(`Token login failed after ${this.retryOptions.maxRetries + 1} attempts: ${lastError?.message ?? 'Unknown error'}`, this.currentRole, lastError?.phase ?? 'credentials', undefined, `Verify credentials for role "${this.currentRole}" are correct. Check token endpoint configuration.`);
    }
    /**
     * Acquire token from endpoint
     */
    async acquireToken(page, credentials) {
        const { tokenEndpoint, tokenField = DEFAULT_TOKEN_CONFIG.tokenField, timeoutMs = DEFAULT_TOKEN_CONFIG.timeoutMs, requestBody, } = this.config;
        const usernameField = requestBody?.usernameField ?? DEFAULT_TOKEN_CONFIG.usernameField;
        const passwordField = requestBody?.passwordField ?? DEFAULT_TOKEN_CONFIG.passwordField;
        this.logger.debug('Acquiring token', { endpoint: tokenEndpoint });
        try {
            // Build request body
            const body = {
                [usernameField]: credentials.username,
                [passwordField]: credentials.password,
                ...requestBody?.additionalFields,
            };
            // Use page.evaluate to make the request (works around CORS)
            // Or use Playwright's request context
            const response = await page.evaluate(async ({ endpoint, body, timeout }) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                try {
                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(body),
                        signal: controller.signal,
                    });
                    clearTimeout(timeoutId);
                    if (!res.ok) {
                        const text = await res.text().catch(() => '');
                        return { error: `HTTP ${res.status}: ${text}` };
                    }
                    return { data: await res.json() };
                }
                catch (e) {
                    clearTimeout(timeoutId);
                    return { error: e instanceof Error ? e.message : String(e) };
                }
            }, { endpoint: tokenEndpoint, body, timeout: timeoutMs });
            if (response.error) {
                throw new auth_error_js_1.ARTKAuthError(`Token request failed: ${response.error}`, this.currentRole, 'credentials', response.error, 'Check credentials and token endpoint configuration');
            }
            // Extract token from response
            const token = response.data?.[tokenField];
            if (!token) {
                throw new auth_error_js_1.ARTKAuthError(`Token not found in response (expected field: ${tokenField})`, this.currentRole, 'callback', JSON.stringify(response.data).slice(0, 200), `Check that token endpoint returns token in "${tokenField}" field`);
            }
            return token;
        }
        catch (error) {
            if (error instanceof auth_error_js_1.ARTKAuthError) {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            throw new auth_error_js_1.ARTKAuthError(`Token acquisition failed: ${message}`, this.currentRole, 'credentials', undefined, 'Check token endpoint URL and network connectivity');
        }
    }
    /**
     * Store token in browser local storage
     */
    async storeToken(page, token) {
        const { headerName = DEFAULT_TOKEN_CONFIG.headerName, headerPrefix = DEFAULT_TOKEN_CONFIG.headerPrefix, } = this.config;
        // Store token and header config
        await page.evaluate(({ key, token, headerName, headerPrefix }) => {
            localStorage.setItem(key, JSON.stringify({
                token,
                headerName,
                headerPrefix,
                timestamp: Date.now(),
            }));
        }, { key: TOKEN_STORAGE_KEY, token, headerName, headerPrefix });
        this.logger.debug('Token stored in local storage');
    }
    /**
     * Check if current session is valid
     */
    async isSessionValid(page) {
        try {
            const stored = await page.evaluate((key) => {
                const data = localStorage.getItem(key);
                if (!data) {
                    return null;
                }
                return JSON.parse(data);
            }, TOKEN_STORAGE_KEY);
            if (!stored?.token) {
                return false;
            }
            // Token exists - could add JWT expiry check here
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Perform logout - clear stored token
     */
    async logout(page) {
        this.logger.debug('Performing token auth logout');
        await page.evaluate((key) => {
            localStorage.removeItem(key);
        }, TOKEN_STORAGE_KEY);
        this.cachedToken = undefined;
        this.logger.debug('Token cleared from local storage');
    }
    /**
     * Get the current cached token
     */
    getToken() {
        return this.cachedToken;
    }
    /**
     * Get the token auth configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Get the authorization header value
     */
    getAuthHeader() {
        if (!this.cachedToken) {
            return undefined;
        }
        const prefix = this.config.headerPrefix ?? DEFAULT_TOKEN_CONFIG.headerPrefix;
        return `${prefix}${this.cachedToken}`;
    }
    /**
     * Get the header name for authorization
     */
    getHeaderName() {
        return this.config.headerName ?? DEFAULT_TOKEN_CONFIG.headerName;
    }
}
exports.TokenAuthProvider = TokenAuthProvider;
// =============================================================================
// Factory Function
// =============================================================================
/**
 * Create token auth provider from config
 *
 * @param config - Token auth configuration
 * @param retryOptions - Optional retry configuration
 * @returns Token auth provider instance
 */
function createTokenAuthProvider(config, retryOptions) {
    return new TokenAuthProvider(config, retryOptions);
}
// =============================================================================
// Utility Functions
// =============================================================================
/**
 * Get stored token from page local storage
 *
 * @param page - Playwright Page
 * @returns Stored token data or undefined
 */
async function getStoredToken(page) {
    try {
        const stored = await page.evaluate((key) => {
            const data = localStorage.getItem(key);
            if (!data) {
                return null;
            }
            return JSON.parse(data);
        }, TOKEN_STORAGE_KEY);
        return stored ?? undefined;
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=token.js.map