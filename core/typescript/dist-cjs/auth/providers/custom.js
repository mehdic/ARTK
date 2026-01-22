"use strict";
/**
 * Custom Authentication Provider Abstract Base
 *
 * Provides an abstract base class for implementing project-specific
 * authentication flows. Extend this class when the built-in providers
 * (OIDC, Form, Token) don't meet your needs.
 *
 * @module auth/providers/custom
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleCustomAuthProvider = exports.CustomAuthProvider = void 0;
const base_js_1 = require("./base.js");
// =============================================================================
// Custom Auth Provider
// =============================================================================
/**
 * Abstract base class for custom authentication providers
 *
 * Extend this class to implement project-specific auth flows.
 * The base class provides:
 * - Retry configuration
 * - Logging
 * - Helper methods for common operations
 *
 * @example
 * ```typescript
 * class MyCustomAuthProvider extends CustomAuthProvider {
 *   constructor() {
 *     super('my-custom-auth', { maxRetries: 3 });
 *   }
 *
 *   async performLogin(page: Page, credentials: Credentials): Promise<void> {
 *     // 1. Navigate to custom login page
 *     await page.goto('https://example.com/special-login');
 *
 *     // 2. Perform custom authentication steps
 *     await page.fill('#custom-user', credentials.username);
 *     await page.fill('#custom-pass', credentials.password);
 *
 *     // 3. Handle custom challenge (e.g., captcha, security question)
 *     await this.handleSecurityQuestion(page);
 *
 *     // 4. Submit and verify
 *     await page.click('#login-button');
 *     await page.waitForURL('/dashboard');
 *   }
 *
 *   async checkSessionValidity(page: Page): Promise<boolean> {
 *     // Check for session indicator
 *     return await page.isVisible('.user-profile-icon');
 *   }
 *
 *   async performLogout(page: Page): Promise<void> {
 *     await page.click('#logout-button');
 *   }
 *
 *   private async handleSecurityQuestion(page: Page): Promise<void> {
 *     // Custom logic for security questions
 *   }
 * }
 * ```
 */
class CustomAuthProvider extends base_js_1.BaseAuthProvider {
    currentRole = 'unknown';
    /**
     * Create a custom auth provider
     *
     * @param providerName - Name for logging
     * @param retryOptions - Retry configuration
     */
    constructor(providerName = 'custom', retryOptions = {}) {
        super(providerName, retryOptions);
    }
    /**
     * Set the role for error reporting
     */
    setRole(role) {
        this.currentRole = role;
    }
    /**
     * Get the current role
     */
    getRole() {
        return this.currentRole;
    }
    // ===========================================================================
    // Interface Implementation (with retry)
    // ===========================================================================
    /**
     * Login with retry support
     *
     * Calls performLogin() with automatic retry on failure.
     */
    async login(page, credentials) {
        let lastError;
        for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
            try {
                await this.performLogin(page, credentials);
                this.logger.info('Custom login successful', {
                    role: this.currentRole,
                    attempts: attempt + 1,
                });
                return;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < this.retryOptions.maxRetries && this.shouldRetry(lastError)) {
                    const delay = this.calculateRetryDelay(attempt);
                    this.logger.warn(`Custom login attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
                        role: this.currentRole,
                        attempt: attempt + 1,
                        delayMs: delay,
                        error: lastError.message,
                    });
                    await this.sleep(delay);
                }
            }
        }
        this.logger.error('Custom login failed after all retries', {
            role: this.currentRole,
            maxRetries: this.retryOptions.maxRetries,
            error: lastError?.message,
        });
        throw lastError;
    }
    /**
     * Check session validity
     */
    async isSessionValid(page) {
        try {
            return await this.checkSessionValidity(page);
        }
        catch (error) {
            this.logger.debug('Session validation error', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
    /**
     * Perform logout
     */
    async logout(page) {
        try {
            await this.performLogout(page);
            this.logger.debug('Custom logout completed');
        }
        catch (error) {
            this.logger.warn('Custom logout error', {
                error: error instanceof Error ? error.message : String(error),
            });
            // Clear cookies as fallback
            await page.context().clearCookies();
        }
    }
}
exports.CustomAuthProvider = CustomAuthProvider;
// =============================================================================
// Example Implementation
// =============================================================================
/**
 * Example custom auth provider for reference
 *
 * This demonstrates how to extend CustomAuthProvider.
 * Copy and modify for your specific needs.
 */
class ExampleCustomAuthProvider extends CustomAuthProvider {
    loginUrl;
    successUrl;
    constructor(options) {
        super('example-custom');
        this.loginUrl = options.loginUrl;
        this.successUrl = options.successUrl;
    }
    async performLogin(page, credentials) {
        // Navigate to login page
        await page.goto(this.loginUrl);
        // Fill credentials
        await page.fill('input[name="username"]', credentials.username);
        await page.fill('input[name="password"]', credentials.password);
        // Submit
        await page.click('button[type="submit"]');
        // Wait for success
        await page.waitForURL(this.successUrl);
    }
    async checkSessionValidity(page) {
        // Using Promise.resolve to make the async meaningful
        return Promise.resolve(!page.url().includes(this.loginUrl));
    }
    async performLogout(page) {
        await page.goto(`${new URL(this.loginUrl).origin}/logout`);
    }
}
exports.ExampleCustomAuthProvider = ExampleCustomAuthProvider;
//# sourceMappingURL=custom.js.map