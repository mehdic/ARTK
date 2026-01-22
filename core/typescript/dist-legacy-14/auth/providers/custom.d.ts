/**
 * Custom Authentication Provider Abstract Base
 *
 * Provides an abstract base class for implementing project-specific
 * authentication flows. Extend this class when the built-in providers
 * (OIDC, Form, Token) don't meet your needs.
 *
 * @module auth/providers/custom
 */
import type { Page } from '@playwright/test';
import type { AuthRetryOptions, Credentials } from '../types.js';
import { BaseAuthProvider } from './base.js';
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
export declare abstract class CustomAuthProvider extends BaseAuthProvider {
    private currentRole;
    /**
     * Create a custom auth provider
     *
     * @param providerName - Name for logging
     * @param retryOptions - Retry configuration
     */
    constructor(providerName?: string, retryOptions?: AuthRetryOptions);
    /**
     * Set the role for error reporting
     */
    setRole(role: string): void;
    /**
     * Get the current role
     */
    protected getRole(): string;
    /**
     * Perform the actual login implementation
     *
     * Override this method with your custom authentication logic.
     * This method is called by login() which handles retries.
     *
     * @param page - Playwright Page
     * @param credentials - User credentials
     * @throws Error on login failure
     */
    protected abstract performLogin(page: Page, credentials: Credentials): Promise<void>;
    /**
     * Check if the session is currently valid
     *
     * Override this method to implement custom session validation.
     *
     * @param page - Playwright Page
     * @returns true if session is valid
     */
    protected abstract checkSessionValidity(page: Page): Promise<boolean>;
    /**
     * Perform the actual logout implementation
     *
     * Override this method with your custom logout logic.
     *
     * @param page - Playwright Page
     */
    protected abstract performLogout(page: Page): Promise<void>;
    /**
     * Login with retry support
     *
     * Calls performLogin() with automatic retry on failure.
     */
    login(page: Page, credentials: Credentials): Promise<void>;
    /**
     * Check session validity
     */
    isSessionValid(page: Page): Promise<boolean>;
    /**
     * Perform logout
     */
    logout(page: Page): Promise<void>;
}
/**
 * Example custom auth provider for reference
 *
 * This demonstrates how to extend CustomAuthProvider.
 * Copy and modify for your specific needs.
 */
export declare class ExampleCustomAuthProvider extends CustomAuthProvider {
    private readonly loginUrl;
    private readonly successUrl;
    constructor(options: {
        loginUrl: string;
        successUrl: string;
    });
    protected performLogin(page: Page, credentials: Credentials): Promise<void>;
    protected checkSessionValidity(page: Page): Promise<boolean>;
    protected performLogout(page: Page): Promise<void>;
}
//# sourceMappingURL=custom.d.ts.map