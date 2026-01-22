/**
 * Token-based Authentication Provider
 *
 * Implements the AuthProvider interface for API-based token acquisition.
 * Stores token in browser local storage for reuse across test requests.
 *
 * @module auth/providers/token
 */
import type { Page } from '@playwright/test';
import type { AuthRetryOptions, Credentials, TokenAuthProviderConfig } from '../types.js';
import { BaseAuthProvider } from './base.js';
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
export declare class TokenAuthProvider extends BaseAuthProvider {
    private readonly config;
    private currentRole;
    private cachedToken;
    /**
     * Create token auth provider
     *
     * @param config - Token auth configuration
     * @param retryOptions - Optional retry configuration
     */
    constructor(config: TokenAuthProviderConfig, retryOptions?: AuthRetryOptions);
    /**
     * Set the role for error reporting
     */
    setRole(role: string): void;
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
    login(page: Page, credentials: Credentials): Promise<void>;
    /**
     * Acquire token from endpoint
     */
    private acquireToken;
    /**
     * Store token in browser local storage
     */
    private storeToken;
    /**
     * Check if current session is valid
     */
    isSessionValid(page: Page): Promise<boolean>;
    /**
     * Perform logout - clear stored token
     */
    logout(page: Page): Promise<void>;
    /**
     * Get the current cached token
     */
    getToken(): string | undefined;
    /**
     * Get the token auth configuration
     */
    getConfig(): TokenAuthProviderConfig;
    /**
     * Get the authorization header value
     */
    getAuthHeader(): string | undefined;
    /**
     * Get the header name for authorization
     */
    getHeaderName(): string;
}
/**
 * Create token auth provider from config
 *
 * @param config - Token auth configuration
 * @param retryOptions - Optional retry configuration
 * @returns Token auth provider instance
 */
export declare function createTokenAuthProvider(config: TokenAuthProviderConfig, retryOptions?: AuthRetryOptions): TokenAuthProvider;
/**
 * Get stored token from page local storage
 *
 * @param page - Playwright Page
 * @returns Stored token data or undefined
 */
export declare function getStoredToken(page: Page): Promise<{
    token: string;
    headerName: string;
    headerPrefix: string;
    timestamp: number;
} | undefined>;
//# sourceMappingURL=token.d.ts.map