/**
 * TypeScript types and interfaces for ARTK Auth module
 *
 * Defines core authentication types including:
 * - Credentials: Username/password pair from environment variables
 * - StorageStateMetadata: Metadata for persisted browser state
 * - AuthProvider: Interface for authentication implementations
 * - Provider-specific configurations
 *
 * @module auth/types
 * @see data-model.md Section 2.1-2.5
 * @see spec.md FR-006 to FR-011
 */
import type { Page } from '@playwright/test';
/**
 * Credentials loaded from environment variables
 *
 * FR-011: Credentials from env vars only
 */
export interface Credentials {
    readonly username: string;
    readonly password: string;
}
/**
 * Metadata for persisted storage state
 *
 * FR-007: Persist storage state to files
 * FR-008: Invalidate state based on maxAge
 */
export interface StorageStateMetadata {
    /** Role name associated with this storage state */
    readonly role: string;
    /** When the storage state was created */
    readonly createdAt: Date;
    /** File path to the storage state */
    readonly path: string;
    /** Whether the storage state is still valid (not expired) */
    readonly isValid: boolean;
}
/**
 * Playwright storage state structure
 *
 * This matches Playwright's BrowserContext.storageState() output
 */
export interface StorageState {
    /** Cookies for the browser context */
    readonly cookies: ReadonlyArray<StorageStateCookie>;
    /** Local storage entries grouped by origin */
    readonly origins: ReadonlyArray<StorageStateOrigin>;
}
/**
 * Cookie in storage state
 */
export interface StorageStateCookie {
    readonly name: string;
    readonly value: string;
    readonly domain: string;
    readonly path: string;
    readonly expires: number;
    readonly httpOnly: boolean;
    readonly secure: boolean;
    readonly sameSite: 'Strict' | 'Lax' | 'None';
}
/**
 * Local storage entries for an origin
 */
export interface StorageStateOrigin {
    readonly origin: string;
    readonly localStorage: ReadonlyArray<LocalStorageEntry>;
}
/**
 * Single local storage entry
 */
export interface LocalStorageEntry {
    readonly name: string;
    readonly value: string;
}
/**
 * Abstract interface for authentication providers
 *
 * All auth providers (OIDC, Form, Token, Custom) must implement this interface.
 * This enables polymorphic authentication handling across different auth mechanisms.
 *
 * FR-006: Support OIDC with Keycloak, Azure AD, Okta, generic providers
 *
 * @see data-model.md Section 2.1
 */
export interface AuthProvider {
    /**
     * Perform full login flow
     *
     * @param page - Playwright Page object
     * @param credentials - Username and password
     * @throws ARTKAuthError on login failure
     */
    login(page: Page, credentials: Credentials): Promise<void>;
    /**
     * Check if current session is still valid
     *
     * Used to determine if storage state can be reused.
     *
     * @param page - Playwright Page object
     * @returns true if session is valid and usable
     */
    isSessionValid(page: Page): Promise<boolean>;
    /**
     * Attempt to refresh the session (optional)
     *
     * Not all providers support session refresh.
     *
     * @param page - Playwright Page object
     * @returns true if refresh succeeded, false if login required
     */
    refreshSession?(page: Page): Promise<boolean>;
    /**
     * Perform logout
     *
     * @param page - Playwright Page object
     */
    logout(page: Page): Promise<void>;
}
/**
 * Supported OIDC identity provider types
 *
 * FR-006: Support at least Keycloak, Azure AD, Okta, and generic OIDC providers
 */
export type OIDCIdpType = 'keycloak' | 'azure-ad' | 'okta' | 'auth0' | 'generic';
/**
 * MFA types supported by ARTK
 *
 * FR-010: Handle TOTP-based MFA by generating codes from configured secret
 */
export type MFAType = 'totp' | 'push' | 'sms' | 'none';
/**
 * Authentication phase for error reporting
 */
export type AuthPhase = 'navigation' | 'credentials' | 'mfa' | 'callback';
/**
 * OIDC authentication provider configuration
 *
 * @see data-model.md Section 1.5
 */
export interface OIDCAuthProviderConfig {
    /** IdP type for provider-specific handling */
    readonly idpType: OIDCIdpType;
    /** App's login initiation URL */
    readonly loginUrl: string;
    /** Direct IdP URL (alternative to loginUrl) */
    readonly idpLoginUrl?: string;
    /** Success detection configuration */
    readonly success: OIDCSuccessConfig;
    /** IdP-specific form selectors */
    readonly idpSelectors?: OIDCIdpSelectors;
    /** MFA configuration */
    readonly mfa?: OIDCMfaConfig;
    /** Timeout settings */
    readonly timeouts?: OIDCTimeoutsConfig;
    /** Logout configuration */
    readonly logout?: OIDCLogoutConfig;
}
/**
 * Success detection configuration for OIDC login
 */
export interface OIDCSuccessConfig {
    /** URL to wait for after login */
    readonly url?: string;
    /** Element to wait for after login */
    readonly selector?: string;
    /** Success detection timeout in ms (default: 5000) */
    readonly timeout?: number;
}
/**
 * IdP-specific form selectors
 */
export interface OIDCIdpSelectors {
    /** Username input selector */
    readonly username?: string;
    /** Password input selector */
    readonly password?: string;
    /** Submit button selector */
    readonly submit?: string;
    /** "No" to stay signed in prompt (Azure AD specific) */
    readonly staySignedInNo?: string;
    /** TOTP input selector */
    readonly totpInput?: string;
    /** TOTP submit button selector */
    readonly totpSubmit?: string;
}
/**
 * MFA configuration for OIDC
 */
export interface OIDCMfaConfig {
    /** Whether MFA is active */
    readonly enabled: boolean;
    /** MFA type */
    readonly type: MFAType;
    /** Env var for TOTP secret (for totp type) */
    readonly totpSecretEnv?: string;
    /** Push approval timeout in ms (default: 30000) */
    readonly pushTimeoutMs?: number;
    /** Selector for TOTP input field */
    readonly totpInputSelector?: string;
    /** Selector for TOTP submit button */
    readonly totpSubmitSelector?: string;
}
/**
 * OIDC timeout settings
 */
export interface OIDCTimeoutsConfig {
    /** Total flow timeout in ms (default: 30000) */
    readonly loginFlowMs?: number;
    /** IdP redirect wait in ms (default: 10000) */
    readonly idpRedirectMs?: number;
    /** App callback wait in ms (default: 10000) */
    readonly callbackMs?: number;
}
/**
 * OIDC logout configuration
 */
export interface OIDCLogoutConfig {
    /** App's logout URL */
    readonly url?: string;
    /** Also logout from IdP */
    readonly idpLogout?: boolean;
}
/**
 * Form-based authentication provider configuration
 */
export interface FormAuthProviderConfig {
    /** Login page URL */
    readonly loginUrl: string;
    /** Form field selectors */
    readonly selectors: FormAuthSelectors;
    /** Success detection */
    readonly success: FormAuthSuccessConfig;
    /** Timeout settings */
    readonly timeouts?: FormAuthTimeoutsConfig;
}
/**
 * Form authentication selectors
 */
export interface FormAuthSelectors {
    /** Username field selector */
    readonly username: string;
    /** Password field selector */
    readonly password: string;
    /** Submit button selector */
    readonly submit: string;
}
/**
 * Form authentication success detection
 */
export interface FormAuthSuccessConfig {
    /** URL to wait for after login */
    readonly url?: string;
    /** Element to wait for after login */
    readonly selector?: string;
    /** Success detection timeout in ms (default: 5000) */
    readonly timeout?: number;
}
/**
 * Form auth timeout settings
 */
export interface FormAuthTimeoutsConfig {
    /** Navigation timeout in ms (default: 30000) */
    readonly navigationMs?: number;
    /** Form submission timeout in ms (default: 10000) */
    readonly submitMs?: number;
}
/**
 * Token-based authentication provider configuration
 */
export interface TokenAuthProviderConfig {
    /** Token endpoint URL */
    readonly tokenEndpoint: string;
    /** Header name for token (default: 'Authorization') */
    readonly headerName?: string;
    /** Header prefix (default: 'Bearer ') */
    readonly headerPrefix?: string;
    /** Field name in response for access token (default: 'access_token') */
    readonly tokenField?: string;
    /** Request body fields */
    readonly requestBody?: TokenAuthRequestBody;
    /** Timeout in ms (default: 10000) */
    readonly timeoutMs?: number;
}
/**
 * Token request body configuration
 */
export interface TokenAuthRequestBody {
    /** Username field name in request (default: 'username') */
    readonly usernameField?: string;
    /** Password field name in request (default: 'password') */
    readonly passwordField?: string;
    /** Additional fields to include in request */
    readonly additionalFields?: Readonly<Record<string, string>>;
}
/**
 * Playwright auth setup project configuration
 *
 * Used by createAuthSetup() and createAllAuthSetups()
 */
export interface AuthSetupProject {
    /** Project name (e.g., 'auth-setup-admin') */
    readonly name: string;
    /** Test file pattern to match */
    readonly testMatch: string;
    /** Path to setup file */
    readonly setup: string;
    /** Dependencies on other projects */
    readonly dependencies?: readonly string[];
}
/**
 * Auth setup options
 */
export interface AuthSetupOptions {
    /** Output directory for storage state files */
    readonly outputDir?: string;
    /** Storage state file pattern */
    readonly filePattern?: string;
    /** Whether to force re-authentication */
    readonly forceReauth?: boolean;
}
/**
 * IdP-specific login handler interface
 *
 * Implementations handle the IdP-specific login page interactions
 */
export interface IdpHandler {
    /** IdP type this handler supports */
    readonly idpType: OIDCIdpType;
    /**
     * Fill credentials on IdP login page
     *
     * @param page - Playwright Page on IdP login page
     * @param credentials - Username and password
     * @param selectors - Optional custom selectors
     */
    fillCredentials(page: Page, credentials: Credentials, selectors?: OIDCIdpSelectors): Promise<void>;
    /**
     * Submit the login form
     *
     * @param page - Playwright Page on IdP login page
     * @param selectors - Optional custom selectors
     */
    submitForm(page: Page, selectors?: OIDCIdpSelectors): Promise<void>;
    /**
     * Handle post-login prompts (e.g., "Stay signed in?" for Azure AD)
     *
     * @param page - Playwright Page
     * @param selectors - Optional custom selectors
     */
    handlePostLoginPrompts?(page: Page, selectors?: OIDCIdpSelectors): Promise<void>;
    /**
     * Handle MFA challenge
     *
     * @param page - Playwright Page on MFA page
     * @param mfaConfig - MFA configuration
     */
    handleMFA?(page: Page, mfaConfig: OIDCMfaConfig): Promise<void>;
    /**
     * Get default selectors for this IdP
     */
    getDefaultSelectors(): OIDCIdpSelectors;
}
/**
 * Storage state cleanup result
 */
export interface CleanupResult {
    /** Number of files deleted */
    readonly deletedCount: number;
    /** Paths of deleted files */
    readonly deletedFiles: readonly string[];
    /** Errors encountered during cleanup */
    readonly errors: readonly CleanupError[];
}
/**
 * Error during cleanup
 */
export interface CleanupError {
    /** Path that failed to delete */
    readonly path: string;
    /** Error message */
    readonly message: string;
}
/**
 * Authentication retry options
 *
 * NFR-010: Retry authentication failures up to 2 times with exponential backoff
 * NFR-011: After retry exhaustion, fail with actionable error message
 * NFR-012: Log each retry attempt at warn level
 */
export interface AuthRetryOptions {
    /** Maximum number of retry attempts (default: 2) */
    readonly maxRetries?: number;
    /** Initial delay in ms (default: 1000) */
    readonly initialDelayMs?: number;
    /** Maximum delay in ms (default: 10000) */
    readonly maxDelayMs?: number;
    /** Backoff multiplier (default: 2) */
    readonly backoffMultiplier?: number;
    /** Whether to retry on timeout errors (default: true) */
    readonly retryOnTimeout?: boolean;
    /** Whether to retry on network errors (default: true) */
    readonly retryOnNetworkError?: boolean;
}
/**
 * Authentication provider type
 */
export type AuthProviderType = 'oidc' | 'form' | 'token' | 'custom';
/**
 * Factory function type for creating auth providers
 */
export type AuthProviderFactory = (config: unknown) => AuthProvider;
//# sourceMappingURL=types.d.ts.map