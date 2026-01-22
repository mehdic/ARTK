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
import type { Page } from '@playwright/test';
import type { AuthRetryOptions, Credentials, FormAuthProviderConfig } from '../types.js';
import { BaseAuthProvider } from './base.js';
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
export declare class FormAuthProvider extends BaseAuthProvider {
    private readonly config;
    private currentRole;
    /**
     * Create form auth provider
     *
     * @param config - Form auth configuration
     * @param retryOptions - Optional retry configuration
     */
    constructor(config: FormAuthProviderConfig, retryOptions?: AuthRetryOptions);
    /**
     * Set the role for error reporting
     */
    setRole(role: string): void;
    /**
     * Perform form-based login
     *
     * @param page - Playwright Page
     * @param credentials - User credentials
     * @throws ARTKAuthError on login failure
     */
    login(page: Page, credentials: Credentials): Promise<void>;
    /**
     * Navigate to the login page
     */
    private navigateToLogin;
    /**
     * Fill credentials in the login form
     */
    private fillCredentials;
    /**
     * Submit the login form
     */
    private submitForm;
    /**
     * Wait for successful login
     */
    private waitForSuccess;
    /**
     * Detect login error messages on page
     */
    private detectLoginError;
    /**
     * Check if current session is valid
     */
    isSessionValid(page: Page): Promise<boolean>;
    /**
     * Perform logout
     */
    logout(page: Page): Promise<void>;
    /**
     * Get the form auth configuration
     */
    getConfig(): FormAuthProviderConfig;
}
/**
 * Create form auth provider from config
 *
 * @param config - Form auth configuration
 * @param retryOptions - Optional retry configuration
 * @returns Form auth provider instance
 */
export declare function createFormAuthProvider(config: FormAuthProviderConfig, retryOptions?: AuthRetryOptions): FormAuthProvider;
//# sourceMappingURL=form.d.ts.map