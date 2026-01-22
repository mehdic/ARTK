"use strict";
/**
 * Form-based Authentication Provider
 *
 * Implements the AuthProvider interface for direct form login (no OIDC redirect).
 * Useful for local development environments with basic auth.
 *
 * **MFA Support:** This provider does NOT support multi-factor authentication (MFA).
 * For applications requiring MFA (TOTP, push notifications, etc.), use the
 * OIDCAuthProvider instead, which supports MFA flows including TOTP generation
 * and push notification handling.
 *
 * **Use Cases:**
 * - Local development with basic username/password auth
 * - Simple authentication forms without OIDC
 * - Custom login pages in staging environments
 *
 * @module auth/providers/form
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormAuthProvider = void 0;
exports.createFormAuthProvider = createFormAuthProvider;
const base_js_1 = require("./base.js");
const auth_error_js_1 = require("../../errors/auth-error.js");
// =============================================================================
// Default Configuration
// =============================================================================
/**
 * Default timeouts for form auth
 */
const DEFAULT_TIMEOUTS = {
    navigationMs: 30000,
    submitMs: 10000,
    successMs: 5000,
};
// =============================================================================
// Form Auth Provider
// =============================================================================
/**
 * Form-based Authentication Provider
 *
 * Handles direct form login without OIDC redirect flows.
 * Suitable for:
 * - Local development environments
 * - Basic authentication forms
 * - Custom login pages
 *
 * @example
 * ```typescript
 * const provider = new FormAuthProvider({
 *   loginUrl: 'https://localhost:3000/login',
 *   selectors: {
 *     username: '#username',
 *     password: '#password',
 *     submit: 'button[type="submit"]',
 *   },
 *   success: { url: '/dashboard' },
 * });
 *
 * await provider.login(page, credentials);
 * ```
 */
class FormAuthProvider extends base_js_1.BaseAuthProvider {
    config;
    currentRole = 'unknown';
    /**
     * Create form auth provider
     *
     * @param config - Form auth configuration
     * @param retryOptions - Optional retry configuration
     */
    constructor(config, retryOptions = {}) {
        super('form', retryOptions);
        this.config = config;
    }
    /**
     * Set the role for error reporting
     */
    setRole(role) {
        this.currentRole = role;
    }
    /**
     * Perform form-based login
     *
     * @param page - Playwright Page
     * @param credentials - User credentials
     * @throws ARTKAuthError on login failure
     */
    async login(page, credentials) {
        let lastError;
        for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
            try {
                // Navigate to login page
                await this.navigateToLogin(page);
                // Fill credentials
                await this.fillCredentials(page, credentials);
                // Submit form
                await this.submitForm(page);
                // Wait for success
                await this.waitForSuccess(page);
                this.logger.info('Form login successful', {
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
                    this.logger.warn(`Form login attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
                        role: this.currentRole,
                        attempt: attempt + 1,
                        delayMs: delay,
                        error: lastError.message,
                    });
                    await this.sleep(delay);
                }
            }
        }
        this.logger.error('Form login failed after all retries', {
            role: this.currentRole,
            maxRetries: this.retryOptions.maxRetries,
            error: lastError?.message,
        });
        throw new auth_error_js_1.ARTKAuthError(`Form login failed after ${this.retryOptions.maxRetries + 1} attempts: ${lastError?.message ?? 'Unknown error'}`, this.currentRole, lastError?.phase ?? 'credentials', undefined, `Verify credentials for role "${this.currentRole}" are correct. Check login URL and form selectors.`);
    }
    /**
     * Navigate to the login page
     */
    async navigateToLogin(page) {
        const timeout = this.config.timeouts?.navigationMs ?? DEFAULT_TIMEOUTS.navigationMs;
        this.logger.debug('Navigating to login page', { url: this.config.loginUrl });
        try {
            await page.goto(this.config.loginUrl, {
                waitUntil: 'domcontentloaded',
                timeout,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new auth_error_js_1.ARTKAuthError(`Failed to navigate to login page: ${message}`, this.currentRole, 'navigation', undefined, `Verify the login URL is correct and accessible: ${this.config.loginUrl}`);
        }
    }
    /**
     * Fill credentials in the login form
     */
    async fillCredentials(page, credentials) {
        const { selectors } = this.config;
        this.logger.debug('Filling credentials');
        try {
            // Wait for and fill username
            await this.fillField(page, selectors.username, credentials.username);
            // Wait for and fill password
            await this.fillField(page, selectors.password, credentials.password);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new auth_error_js_1.ARTKAuthError(`Failed to fill credentials: ${message}`, this.currentRole, 'credentials', undefined, 'Check that username and password selectors are correct');
        }
    }
    /**
     * Submit the login form
     */
    async submitForm(page) {
        const { selectors } = this.config;
        this.logger.debug('Submitting login form');
        try {
            await this.clickElement(page, selectors.submit);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new auth_error_js_1.ARTKAuthError(`Failed to submit login form: ${message}`, this.currentRole, 'credentials', undefined, 'Check that submit button selector is correct');
        }
    }
    /**
     * Wait for successful login
     */
    async waitForSuccess(page) {
        const { success } = this.config;
        const timeout = success.timeout ?? DEFAULT_TIMEOUTS.successMs;
        this.logger.debug('Waiting for login success');
        try {
            await this.waitForLoginSuccess(page, {
                url: success.url,
                selector: success.selector,
                timeout,
            });
        }
        catch (error) {
            // Check for error messages on page
            const errorText = await this.detectLoginError(page);
            throw new auth_error_js_1.ARTKAuthError('Login failed - success condition not met', this.currentRole, 'callback', errorText, 'Verify credentials are correct and success URL/selector configuration');
        }
    }
    /**
     * Detect login error messages on page
     */
    async detectLoginError(page) {
        const errorSelectors = [
            '.error-message',
            '.alert-danger',
            '.error',
            '[role="alert"]',
            '.login-error',
            '#error',
        ];
        for (const selector of errorSelectors) {
            try {
                const element = page.locator(selector).first();
                if (await element.isVisible({ timeout: 500 })) {
                    return await element.textContent() ?? undefined;
                }
            }
            catch {
                // Continue
            }
        }
        return undefined;
    }
    /**
     * Check if current session is valid
     */
    async isSessionValid(page) {
        const { success } = this.config;
        const currentUrl = page.url();
        // Check if on login page
        if (currentUrl.includes(this.config.loginUrl)) {
            return false;
        }
        // Check URL match
        if (success.url && !currentUrl.includes(success.url)) {
            return false;
        }
        // Check selector presence
        if (success.selector) {
            try {
                await page.waitForSelector(success.selector, { state: 'visible', timeout: 1000 });
            }
            catch {
                return false;
            }
        }
        return true;
    }
    /**
     * Perform logout
     */
    async logout(page) {
        this.logger.debug('Performing form auth logout');
        // Try common logout URLs
        const baseUrl = new URL(this.config.loginUrl).origin;
        const logoutUrls = [
            `${baseUrl}/logout`,
            `${baseUrl}/api/logout`,
            `${baseUrl}/signout`,
        ];
        for (const url of logoutUrls) {
            try {
                const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 5000 });
                if (response?.ok()) {
                    this.logger.debug('Logout successful', { url });
                    return;
                }
            }
            catch {
                // Try next
            }
        }
        // Clear cookies as fallback
        await page.context().clearCookies();
        this.logger.debug('Cleared cookies as logout fallback');
    }
    /**
     * Get the form auth configuration
     */
    getConfig() {
        return this.config;
    }
}
exports.FormAuthProvider = FormAuthProvider;
// =============================================================================
// Factory Function
// =============================================================================
/**
 * Create form auth provider from config
 *
 * @param config - Form auth configuration
 * @param retryOptions - Optional retry configuration
 * @returns Form auth provider instance
 */
function createFormAuthProvider(config, retryOptions) {
    return new FormAuthProvider(config, retryOptions);
}
//# sourceMappingURL=form.js.map