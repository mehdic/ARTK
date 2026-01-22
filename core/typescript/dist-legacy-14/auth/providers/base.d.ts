/**
 * Base AuthProvider abstract class
 *
 * Provides common functionality for all authentication providers including:
 * - Logging setup
 * - Retry configuration
 * - Session validation helpers
 *
 * @module auth/providers/base
 * @see data-model.md Section 2.1
 */
import type { Page } from '@playwright/test';
import type { AuthProvider, AuthRetryOptions, Credentials } from '../types.js';
import { type Logger } from '../../utils/logger.js';
/**
 * Default retry options for authentication
 *
 * NFR-010: Retry authentication failures up to 2 times with exponential backoff
 */
export declare const DEFAULT_AUTH_RETRY_OPTIONS: Required<AuthRetryOptions>;
/**
 * Abstract base class for authentication providers
 *
 * Provides common functionality that all auth providers inherit:
 * - Logger instance
 * - Retry configuration
 * - Helper methods for common operations
 *
 * @example
 * ```typescript
 * class MyAuthProvider extends BaseAuthProvider {
 *   constructor() {
 *     super('my-auth');
 *   }
 *
 *   async login(page: Page, credentials: Credentials): Promise<void> {
 *     this.logger.info('Starting login');
 *     // Implementation...
 *   }
 * }
 * ```
 */
export declare abstract class BaseAuthProvider implements AuthProvider {
    /**
     * Logger instance for this provider
     */
    protected readonly logger: Logger;
    /**
     * Retry options for authentication operations
     */
    protected readonly retryOptions: Required<AuthRetryOptions>;
    /**
     * Provider name for logging
     */
    protected readonly providerName: string;
    /**
     * Create a new base auth provider
     *
     * @param providerName - Name for logging (e.g., 'oidc', 'form', 'token')
     * @param retryOptions - Optional retry configuration override
     */
    constructor(providerName: string, retryOptions?: AuthRetryOptions);
    /**
     * Perform full login flow
     *
     * @param page - Playwright Page object
     * @param credentials - Username and password
     */
    abstract login(page: Page, credentials: Credentials): Promise<void>;
    /**
     * Check if current session is still valid
     *
     * @param page - Playwright Page object
     * @returns true if session is valid
     */
    abstract isSessionValid(page: Page): Promise<boolean>;
    /**
     * Perform logout
     *
     * @param page - Playwright Page object
     */
    abstract logout(page: Page): Promise<void>;
    /**
     * Attempt to refresh the session (optional)
     *
     * Default implementation returns false (refresh not supported).
     * Override in subclasses that support session refresh.
     *
     * @param page - Playwright Page object
     * @returns true if refresh succeeded, false if login required
     */
    refreshSession(_page: Page): Promise<boolean>;
    /**
     * Wait for successful navigation after login
     *
     * Waits for either a URL pattern or element selector to indicate success.
     *
     * @param page - Playwright Page
     * @param options - Success detection options
     */
    protected waitForLoginSuccess(page: Page, options: {
        url?: string;
        selector?: string;
        timeout?: number;
    }): Promise<void>;
    /**
     * Fill a form field with retry on failure
     *
     * @param page - Playwright Page
     * @param selector - Field selector
     * @param value - Value to fill
     * @param options - Fill options
     */
    protected fillField(page: Page, selector: string, value: string, options?: {
        timeout?: number;
        clearFirst?: boolean;
    }): Promise<void>;
    /**
     * Click an element with retry on failure
     *
     * @param page - Playwright Page
     * @param selector - Element selector
     * @param options - Click options
     */
    protected clickElement(page: Page, selector: string, options?: {
        timeout?: number;
        force?: boolean;
    }): Promise<void>;
    /**
     * Check if an element is visible on page
     *
     * @param page - Playwright Page
     * @param selector - Element selector
     * @param timeout - How long to check for visibility
     * @returns true if element is visible
     */
    protected isElementVisible(page: Page, selector: string, timeout?: number): Promise<boolean>;
    /**
     * Get the current page URL
     *
     * @param page - Playwright Page
     * @returns Current URL
     */
    protected getCurrentUrl(page: Page): string;
    /**
     * Check if current URL matches a pattern
     *
     * @param page - Playwright Page
     * @param pattern - URL pattern (string or RegExp)
     * @returns true if URL matches
     */
    protected urlMatches(page: Page, pattern: string | RegExp): boolean;
    /**
     * Calculate delay for retry attempt using exponential backoff
     *
     * @param attempt - Current attempt number (0-indexed)
     * @returns Delay in milliseconds
     */
    protected calculateRetryDelay(attempt: number): number;
    /**
     * Determine if an error should trigger a retry
     *
     * @param error - Error that occurred
     * @returns true if should retry
     */
    protected shouldRetry(error: Error): boolean;
    /**
     * Sleep for a specified duration
     *
     * @param ms - Duration in milliseconds
     */
    protected sleep(ms: number): Promise<void>;
}
/**
 * Options for login operations
 */
export interface LoginOptions {
    /** Timeout for the entire login flow in ms */
    readonly timeout?: number;
    /** Whether to skip session validation after login */
    readonly skipValidation?: boolean;
}
/**
 * Options for logout operations
 */
export interface LogoutOptions {
    /** Timeout for logout in ms */
    readonly timeout?: number;
    /** Whether to also logout from IdP (for OIDC) */
    readonly idpLogout?: boolean;
}
//# sourceMappingURL=base.d.ts.map