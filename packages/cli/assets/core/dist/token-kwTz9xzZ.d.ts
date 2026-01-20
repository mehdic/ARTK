import { b as AuthConfig, k as RoleConfig, g as StorageStateConfig } from './types-BBdYxuqU.js';
import { Page, BrowserContext } from '@playwright/test';
import { L as Logger } from './logger-BXhqSaOe.js';

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

/**
 * Credentials loaded from environment variables
 *
 * FR-011: Credentials from env vars only
 */
interface Credentials {
    readonly username: string;
    readonly password: string;
}
/**
 * Metadata for persisted storage state
 *
 * FR-007: Persist storage state to files
 * FR-008: Invalidate state based on maxAge
 */
interface StorageStateMetadata {
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
interface StorageState {
    /** Cookies for the browser context */
    readonly cookies: ReadonlyArray<StorageStateCookie>;
    /** Local storage entries grouped by origin */
    readonly origins: ReadonlyArray<StorageStateOrigin>;
}
/**
 * Cookie in storage state
 */
interface StorageStateCookie {
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
interface StorageStateOrigin {
    readonly origin: string;
    readonly localStorage: ReadonlyArray<LocalStorageEntry>;
}
/**
 * Single local storage entry
 */
interface LocalStorageEntry {
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
interface AuthProvider {
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
type OIDCIdpType = 'keycloak' | 'azure-ad' | 'okta' | 'auth0' | 'generic';
/**
 * MFA types supported by ARTK
 *
 * FR-010: Handle TOTP-based MFA by generating codes from configured secret
 */
type MFAType = 'totp' | 'push' | 'sms' | 'none';
/**
 * Authentication phase for error reporting
 */
type AuthPhase = 'navigation' | 'credentials' | 'mfa' | 'callback';
/**
 * OIDC authentication provider configuration
 *
 * @see data-model.md Section 1.5
 */
interface OIDCAuthProviderConfig {
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
interface OIDCSuccessConfig {
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
interface OIDCIdpSelectors {
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
interface OIDCMfaConfig {
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
interface OIDCTimeoutsConfig {
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
interface OIDCLogoutConfig {
    /** App's logout URL */
    readonly url?: string;
    /** Also logout from IdP */
    readonly idpLogout?: boolean;
}
/**
 * Form-based authentication provider configuration
 */
interface FormAuthProviderConfig {
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
interface FormAuthSelectors {
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
interface FormAuthSuccessConfig {
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
interface FormAuthTimeoutsConfig {
    /** Navigation timeout in ms (default: 30000) */
    readonly navigationMs?: number;
    /** Form submission timeout in ms (default: 10000) */
    readonly submitMs?: number;
}
/**
 * Token-based authentication provider configuration
 */
interface TokenAuthProviderConfig {
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
interface TokenAuthRequestBody {
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
interface AuthSetupProject {
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
interface AuthSetupOptions {
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
interface IdpHandler {
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
interface CleanupResult {
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
interface CleanupError {
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
interface AuthRetryOptions {
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
type AuthProviderType = 'oidc' | 'form' | 'token' | 'custom';
/**
 * Factory function type for creating auth providers
 */
type AuthProviderFactory = (config: unknown) => AuthProvider;

/**
 * Credential management for ARTK Auth
 *
 * Provides secure credential loading from environment variables.
 *
 * FR-011: System MUST read credentials from environment variables (never hardcoded)
 *
 * @module auth/credentials
 * @example
 * ```typescript
 * import { getCredentials } from './credentials.js';
 *
 * // Given config: roles.admin.credentialsEnv = { username: 'ADMIN_USER', password: 'ADMIN_PASS' }
 * const creds = getCredentials('admin', config);
 * // Returns: { username: process.env.ADMIN_USER, password: process.env.ADMIN_PASS }
 * ```
 */

/**
 * Options for credential loading
 */
interface GetCredentialsOptions {
    /**
     * Environment variables to read from
     * @default process.env
     */
    readonly env?: Record<string, string | undefined>;
    /**
     * Whether to mask password in logs
     * @default true
     */
    readonly maskPassword?: boolean;
}
/**
 * Get credentials for a role from environment variables
 *
 * Reads the environment variable names from the role configuration
 * and returns the actual credential values from the environment.
 *
 * @param role - Role name as defined in config (e.g., 'admin', 'standardUser')
 * @param authConfig - Authentication configuration containing role definitions
 * @param options - Optional configuration
 * @returns Credentials object with username and password
 * @throws ARTKAuthError if role is not found or env vars are not set
 *
 * @example
 * ```typescript
 * // Config defines:
 * // auth.roles.admin.credentialsEnv = { username: 'ADMIN_USER', password: 'ADMIN_PASS' }
 *
 * // Environment has:
 * // ADMIN_USER=admin@example.com
 * // ADMIN_PASS=secret123
 *
 * const creds = getCredentials('admin', authConfig);
 * // Returns: { username: 'admin@example.com', password: 'secret123' }
 * ```
 */
declare function getCredentials(role: string, authConfig: AuthConfig, options?: GetCredentialsOptions): Credentials;
/**
 * Get credentials for a role using role config directly
 *
 * Lower-level function that takes role config instead of full auth config.
 *
 * @param role - Role name for error messages
 * @param roleConfig - Role configuration with credentialsEnv
 * @param options - Optional configuration
 * @returns Credentials object
 * @throws ARTKAuthError if env vars are not set
 */
declare function getCredentialsFromRoleConfig(role: string, roleConfig: RoleConfig, options?: GetCredentialsOptions): Credentials;
/**
 * Validate that all required credentials are available for a set of roles
 *
 * Checks all roles without throwing, returns list of missing credentials.
 *
 * @param roles - Array of role names to validate
 * @param authConfig - Authentication configuration
 * @param env - Environment variables (defaults to process.env)
 * @returns Array of missing credential info (empty if all valid)
 *
 * @example
 * ```typescript
 * const missing = validateCredentials(['admin', 'user'], authConfig);
 * if (missing.length > 0) {
 *   console.error('Missing credentials:', missing);
 * }
 * ```
 */
declare function validateCredentials(roles: readonly string[], authConfig: AuthConfig, env?: Record<string, string | undefined>): ReadonlyArray<MissingCredential>;
/**
 * Information about missing credentials
 */
interface MissingCredential {
    /** Role name */
    readonly role: string;
    /** Type of missing item */
    readonly type: 'role' | 'username' | 'password';
    /** Environment variable name (if applicable) */
    readonly envVar?: string;
    /** Human-readable message */
    readonly message: string;
}
/**
 * Create a formatted error message for missing credentials
 *
 * @param missing - Array of missing credentials from validateCredentials
 * @returns Formatted error message
 */
declare function formatMissingCredentialsError(missing: ReadonlyArray<MissingCredential>): string;
/**
 * Check if credentials are available for a role (without throwing)
 *
 * @param role - Role name
 * @param authConfig - Auth configuration
 * @param env - Environment variables
 * @returns true if credentials are available
 */
declare function hasCredentials(role: string, authConfig: AuthConfig, env?: Record<string, string | undefined>): boolean;

/**
 * Storage state management for ARTK Auth
 *
 * Handles persistence and validation of browser storage state across test runs.
 *
 * FR-007: System MUST persist authentication state to files and reuse valid state across test runs
 * FR-008: System MUST invalidate storage state based on configurable maximum age
 * NFR-007: System MUST automatically delete storage state files older than 24 hours on test run start
 * NFR-008: Auto-cleanup MUST run before auth setup to prevent stale state accumulation
 *
 * @module auth/storage-state
 * @example
 * ```typescript
 * import { saveStorageState, loadStorageState, isStorageStateValid } from './storage-state.js';
 *
 * // Save storage state after authentication
 * await saveStorageState(browserContext, 'admin', { directory: '.auth-states' });
 *
 * // Load and validate storage state
 * const statePath = await loadStorageState('admin', { directory: '.auth-states' });
 * if (statePath) {
 *   // Use existing state
 * } else {
 *   // Need fresh authentication
 * }
 * ```
 */

/**
 * Default storage state configuration
 */
declare const DEFAULT_STORAGE_STATE_CONFIG: StorageStateConfig;
/**
 * Maximum age in milliseconds for auto-cleanup (24 hours)
 * NFR-007: Delete storage state files older than 24 hours
 */
declare const CLEANUP_MAX_AGE_MS: number;
/**
 * Options for storage state operations
 */
interface StorageStateOptions {
    /** Directory to store state files (relative to project root) */
    readonly directory?: string;
    /** Maximum age in minutes before state is considered expired */
    readonly maxAgeMinutes?: number;
    /** File naming pattern */
    readonly filePattern?: string;
    /** Project root directory */
    readonly projectRoot?: string;
    /** Environment name for file pattern */
    readonly environment?: string;
}
/**
 * Save browser context storage state for a role
 *
 * FR-007: Persist storage state to files
 *
 * @param context - Playwright BrowserContext
 * @param role - Role name (e.g., 'admin', 'standardUser')
 * @param options - Storage options
 * @returns Path to saved storage state file
 *
 * @example
 * ```typescript
 * const statePath = await saveStorageState(context, 'admin', {
 *   directory: '.auth-states',
 *   filePattern: '{role}-{env}.json',
 *   environment: 'staging'
 * });
 * console.log(`Saved to: ${statePath}`);
 * ```
 */
declare function saveStorageState(context: BrowserContext, role: string, options?: StorageStateOptions): Promise<string>;
/**
 * Load storage state path for a role if valid
 *
 * FR-007: Reuse valid state across test runs
 * FR-008: Invalidate state based on maxAge
 *
 * @param role - Role name
 * @param options - Storage options
 * @returns Path to storage state file, or undefined if not valid
 *
 * @example
 * ```typescript
 * const statePath = await loadStorageState('admin');
 * if (statePath) {
 *   await context.addCookies(/* from file *\/);
 * }
 * ```
 */
declare function loadStorageState(role: string, options?: StorageStateOptions): Promise<string | undefined>;
/**
 * Check if storage state is valid for a role
 *
 * FR-008: Invalidate state based on configurable maximum age
 *
 * @param role - Role name
 * @param options - Storage options
 * @returns true if storage state exists and is not expired
 *
 * @example
 * ```typescript
 * if (await isStorageStateValid('admin', { maxAgeMinutes: 30 })) {
 *   // Reuse existing state
 * }
 * ```
 */
declare function isStorageStateValid(role: string, options?: StorageStateOptions): Promise<boolean>;
/**
 * Get metadata about a storage state file
 *
 * @param role - Role name
 * @param options - Storage options
 * @returns Storage state metadata, or undefined if file doesn't exist
 */
declare function getStorageStateMetadata(role: string, options?: StorageStateOptions): Promise<StorageStateMetadata | undefined>;
/**
 * Read and parse storage state from file
 *
 * @param role - Role name
 * @param options - Storage options
 * @returns Parsed storage state
 * @throws ARTKStorageStateError if file doesn't exist or is invalid
 */
declare function readStorageState(role: string, options?: StorageStateOptions): Promise<StorageState>;
/**
 * Clear storage state files
 *
 * FR-009: Support multiple named roles with separate credentials and storage states
 *
 * @param role - Optional role to clear (clears all if not specified)
 * @param options - Storage options
 * @returns Number of files deleted
 *
 * @example
 * ```typescript
 * // Clear single role
 * await clearStorageState('admin');
 *
 * // Clear all storage states
 * await clearStorageState();
 * ```
 */
declare function clearStorageState(role?: string, options?: StorageStateOptions): Promise<number>;
/**
 * Clean up expired storage states (older than 24 hours)
 *
 * NFR-007: System MUST automatically delete storage state files older than 24 hours on test run start
 * NFR-008: Auto-cleanup MUST run before auth setup to prevent stale state accumulation
 * NFR-009: System MUST log cleanup actions at info verbosity level
 *
 * @param options - Storage options
 * @returns Cleanup result with counts and errors
 *
 * @example
 * ```typescript
 * // Run at test suite start
 * const result = await cleanupExpiredStorageStates();
 * console.log(`Deleted ${result.deletedCount} expired storage states`);
 * ```
 */
declare function cleanupExpiredStorageStates(options?: StorageStateOptions): Promise<CleanupResult>;
/**
 * Clean up storage states older than a custom age
 *
 * @param maxAgeMs - Maximum age in milliseconds
 * @param options - Storage options
 * @returns Cleanup result
 */
declare function cleanupStorageStatesOlderThan(maxAgeMs: number, options?: StorageStateOptions): Promise<CleanupResult>;
/**
 * Get role name from a storage state file path
 *
 * @param filePath - Path to storage state file
 * @param pattern - File naming pattern
 * @returns Role name or undefined if can't parse
 */
declare function getRoleFromPath(filePath: string, pattern?: string): string | undefined;
/**
 * List all storage state files
 *
 * @param options - Storage options
 * @returns Array of storage state metadata
 */
declare function listStorageStates(options?: StorageStateOptions): Promise<StorageStateMetadata[]>;

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

/**
 * Default retry options for authentication
 *
 * NFR-010: Retry authentication failures up to 2 times with exponential backoff
 */
declare const DEFAULT_AUTH_RETRY_OPTIONS: Required<AuthRetryOptions>;
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
declare abstract class BaseAuthProvider implements AuthProvider {
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
interface LoginOptions {
    /** Timeout for the entire login flow in ms */
    readonly timeout?: number;
    /** Whether to skip session validation after login */
    readonly skipValidation?: boolean;
}
/**
 * Options for logout operations
 */
interface LogoutOptions {
    /** Timeout for logout in ms */
    readonly timeout?: number;
    /** Whether to also logout from IdP (for OIDC) */
    readonly idpLogout?: boolean;
}

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

/**
 * Get IdP handler for a given type
 *
 * @param idpType - Type of IdP
 * @returns IdP handler
 */
declare function getIdpHandler(idpType: string): IdpHandler;
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
declare class OIDCAuthProvider extends BaseAuthProvider {
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
declare function createOIDCAuthProvider(config: OIDCAuthProviderConfig, retryOptions?: AuthRetryOptions): OIDCAuthProvider;

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
declare class FormAuthProvider extends BaseAuthProvider {
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
declare function createFormAuthProvider(config: FormAuthProviderConfig, retryOptions?: AuthRetryOptions): FormAuthProvider;

/**
 * Token-based Authentication Provider
 *
 * Implements the AuthProvider interface for API-based token acquisition.
 * Stores token in browser local storage for reuse across test requests.
 *
 * @module auth/providers/token
 */

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
declare class TokenAuthProvider extends BaseAuthProvider {
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
declare function createTokenAuthProvider(config: TokenAuthProviderConfig, retryOptions?: AuthRetryOptions): TokenAuthProvider;
/**
 * Get stored token from page local storage
 *
 * @param page - Playwright Page
 * @returns Stored token data or undefined
 */
declare function getStoredToken(page: Page): Promise<{
    token: string;
    headerName: string;
    headerPrefix: string;
    timestamp: number;
} | undefined>;

export { type StorageStateOptions as $, type AuthProvider as A, BaseAuthProvider as B, type Credentials as C, type CleanupError as D, getCredentialsFromRoleConfig as E, FormAuthProvider as F, validateCredentials as G, formatMissingCredentialsError as H, type IdpHandler as I, hasCredentials as J, type GetCredentialsOptions as K, type LocalStorageEntry as L, type MFAType as M, type MissingCredential as N, OIDCAuthProvider as O, isStorageStateValid as P, getStorageStateMetadata as Q, readStorageState as R, type StorageStateMetadata as S, TokenAuthProvider as T, clearStorageState as U, cleanupExpiredStorageStates as V, cleanupStorageStatesOlderThan as W, CLEANUP_MAX_AGE_MS as X, getRoleFromPath as Y, listStorageStates as Z, DEFAULT_STORAGE_STATE_CONFIG as _, type OIDCAuthProviderConfig as a, DEFAULT_AUTH_RETRY_OPTIONS as a0, type LoginOptions as a1, type LogoutOptions as a2, createOIDCAuthProvider as a3, getIdpHandler as a4, createFormAuthProvider as a5, createTokenAuthProvider as a6, getStoredToken as a7, type AuthPhase as b, type OIDCIdpSelectors as c, type AuthRetryOptions as d, type AuthSetupOptions as e, type AuthSetupProject as f, getCredentials as g, type StorageState as h, type StorageStateCookie as i, type StorageStateOrigin as j, type AuthProviderType as k, loadStorageState as l, type AuthProviderFactory as m, type OIDCIdpType as n, type OIDCSuccessConfig as o, type OIDCMfaConfig as p, type OIDCTimeoutsConfig as q, type OIDCLogoutConfig as r, saveStorageState as s, type FormAuthProviderConfig as t, type FormAuthSelectors as u, type FormAuthSuccessConfig as v, type FormAuthTimeoutsConfig as w, type TokenAuthProviderConfig as x, type TokenAuthRequestBody as y, type CleanupResult as z };
