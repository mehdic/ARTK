/**
 * OIDC Authentication Provider
 *
 * Implements the AuthProvider interface for OIDC authentication flows.
 * Supports multiple IdPs (Keycloak, Azure AD, Okta, generic) with retry logic.
 *
 * FR-006: Support OIDC with configurable Identity Provider handlers
 * NFR-010: Retry authentication failures up to 2 times with exponential backoff
 * NFR-011: After retry exhaustion, fail with actionable error message
 * NFR-012: Log each retry attempt at warn level
 *
 * @module auth/providers/oidc
 */
import type { Page } from '@playwright/test';
import type { AuthRetryOptions, Credentials, IdpHandler, OIDCAuthProviderConfig } from '../types.js';
import { BaseAuthProvider } from './base.js';
/**
 * Get IdP handler for a given type
 *
 * @param idpType - Type of IdP
 * @returns IdP handler
 */
export declare function getIdpHandler(idpType: string): IdpHandler;
/**
 * OIDC Authentication Provider
 *
 * Handles OIDC login flows for various Identity Providers with:
 * - Automatic IdP handler selection based on type
 * - Retry logic with exponential backoff
 * - MFA handling (TOTP)
 * - Session validation
 *
 * @example
 * ```typescript
 * const provider = new OIDCAuthProvider({
 *   idpType: 'keycloak',
 *   loginUrl: 'https://app.example.com/login',
 *   success: { url: 'https://app.example.com/dashboard' },
 * });
 *
 * await provider.login(page, credentials);
 * ```
 */
export declare class OIDCAuthProvider extends BaseAuthProvider {
    private readonly config;
    private readonly idpHandler;
    private currentRole;
    /**
     * Create OIDC auth provider
     *
     * @param config - OIDC configuration
     * @param retryOptions - Optional retry configuration
     */
    constructor(config: OIDCAuthProviderConfig, retryOptions?: AuthRetryOptions);
    /**
     * Set the role for error reporting
     *
     * @param role - Role name
     */
    setRole(role: string): void;
    /**
     * Perform OIDC login with retry
     *
     * NFR-010: Retry authentication failures up to 2 times with exponential backoff
     * NFR-011: After retry exhaustion, fail with actionable error message
     * NFR-012: Log each retry attempt at warn level
     *
     * @param page - Playwright Page
     * @param credentials - User credentials
     * @throws ARTKAuthError on login failure
     */
    login(page: Page, credentials: Credentials): Promise<void>;
    /**
     * Check if current session is valid
     *
     * @param page - Playwright Page
     * @returns true if session is valid
     */
    isSessionValid(page: Page): Promise<boolean>;
    /**
     * Attempt to refresh the session
     *
     * OIDC sessions are typically refreshed via silent renewal.
     * This method attempts a simple page refresh to trigger token refresh.
     *
     * @param page - Playwright Page
     * @returns true if session is still valid after refresh
     */
    refreshSession(page: Page): Promise<boolean>;
    /**
     * Perform logout
     *
     * @param page - Playwright Page
     */
    logout(page: Page): Promise<void>;
    /**
     * Get the configured IdP handler
     */
    getIdpHandler(): IdpHandler;
    /**
     * Get the OIDC configuration
     */
    getConfig(): OIDCAuthProviderConfig;
}
/**
 * Create OIDC auth provider from config
 *
 * @param config - OIDC configuration
 * @param retryOptions - Optional retry configuration
 * @returns OIDC auth provider instance
 */
export declare function createOIDCAuthProvider(config: OIDCAuthProviderConfig, retryOptions?: AuthRetryOptions): OIDCAuthProvider;
//# sourceMappingURL=oidc.d.ts.map