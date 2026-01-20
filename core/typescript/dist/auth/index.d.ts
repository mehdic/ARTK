import { a as OIDCAuthProviderConfig, C as Credentials, I as IdpHandler, b as AuthPhase, c as OIDCIdpSelectors, B as BaseAuthProvider, d as AuthRetryOptions, e as AuthSetupOptions, f as AuthSetupProject } from '../token-kwTz9xzZ.js';
export { A as AuthProvider, m as AuthProviderFactory, k as AuthProviderType, X as CLEANUP_MAX_AGE_MS, D as CleanupError, z as CleanupResult, a0 as DEFAULT_AUTH_RETRY_OPTIONS, _ as DEFAULT_STORAGE_STATE_CONFIG, F as FormAuthProvider, t as FormAuthProviderConfig, u as FormAuthSelectors, v as FormAuthSuccessConfig, w as FormAuthTimeoutsConfig, K as GetCredentialsOptions, L as LocalStorageEntry, a1 as LoginOptions, a2 as LogoutOptions, M as MFAType, N as MissingCredential, O as OIDCAuthProvider, n as OIDCIdpType, r as OIDCLogoutConfig, p as OIDCMfaConfig, o as OIDCSuccessConfig, q as OIDCTimeoutsConfig, h as StorageState, i as StorageStateCookie, S as StorageStateMetadata, $ as StorageStateOptions, j as StorageStateOrigin, T as TokenAuthProvider, x as TokenAuthProviderConfig, y as TokenAuthRequestBody, V as cleanupExpiredStorageStates, W as cleanupStorageStatesOlderThan, U as clearStorageState, a5 as createFormAuthProvider, a3 as createOIDCAuthProvider, a6 as createTokenAuthProvider, H as formatMissingCredentialsError, g as getCredentials, E as getCredentialsFromRoleConfig, a4 as getIdpHandler, Y as getRoleFromPath, Q as getStorageStateMetadata, a7 as getStoredToken, J as hasCredentials, P as isStorageStateValid, Z as listStorageStates, l as loadStorageState, R as readStorageState, s as saveStorageState, G as validateCredentials } from '../token-kwTz9xzZ.js';
import { Page } from '@playwright/test';
import { A as ARTKAuthError } from '../storage-state-error-X2x3H8gy.js';
export { a as ARTKStorageStateError } from '../storage-state-error-X2x3H8gy.js';
import { b as AuthConfig, A as ARTKConfig, k as RoleConfig } from '../types-BBdYxuqU.js';
import '../logger-BXhqSaOe.js';

/**
 * Generic OIDC flow handler
 *
 * Orchestrates the complete OIDC authentication flow:
 * 1. Navigate to app login URL
 * 2. Handle IdP redirect
 * 3. Fill credentials on IdP page
 * 4. Handle MFA (if enabled)
 * 5. Handle callback redirect
 * 6. Verify successful authentication
 *
 * FR-006: System MUST support OIDC with configurable Identity Provider handlers
 * FR-010: System MUST handle TOTP-based MFA by generating codes from configured secret
 *
 * @module auth/oidc/flow
 */

/**
 * Generate TOTP code from a secret stored in environment variable
 *
 * FR-010: Handle TOTP-based MFA by generating codes from configured secret
 *
 * @param secretEnvVar - Name of environment variable containing TOTP secret
 * @param env - Environment variables (defaults to process.env)
 * @returns 6-digit TOTP code
 * @throws ARTKAuthError if env var not set or secret invalid
 *
 * @example
 * ```typescript
 * // Given: MFA_SECRET_ADMIN=JBSWY3DPEHPK3PXP
 * const code = generateTOTPCode('MFA_SECRET_ADMIN');
 * // Returns: '123456' (time-based code)
 * ```
 */
declare function generateTOTPCode(secretEnvVar: string, env?: Record<string, string | undefined>): string;
/**
 * Verify a TOTP code against a secret
 *
 * @param code - 6-digit TOTP code to verify
 * @param secretEnvVar - Environment variable containing TOTP secret
 * @param env - Environment variables
 * @returns true if code is valid
 */
declare function verifyTOTPCode(code: string, secretEnvVar: string, env?: Record<string, string | undefined>): boolean;
/**
 * Get time until next TOTP code window
 *
 * Useful for waiting if a code is about to expire.
 *
 * @returns Seconds until next TOTP window (0-30)
 */
declare function getTimeUntilNextTOTPWindow(): number;
/**
 * Wait for next TOTP window if current code is about to expire
 *
 * @param thresholdSeconds - If less than this many seconds remain, wait for next window
 * @returns Whether we waited
 */
declare function waitForFreshTOTPWindow(thresholdSeconds?: number): Promise<boolean>;
/**
 * Options for OIDC flow execution
 */
interface OIDCFlowOptions {
    /** IdP-specific handler */
    readonly idpHandler: IdpHandler;
    /** Whether to skip IdP redirect (for direct IdP login) */
    readonly skipIdpRedirect?: boolean;
    /** Custom role name for error messages */
    readonly role?: string;
}
/**
 * Result of OIDC flow execution
 */
interface OIDCFlowResult {
    /** Whether authentication succeeded */
    readonly success: boolean;
    /** Final URL after authentication */
    readonly finalUrl: string;
    /** Duration of the flow in milliseconds */
    readonly durationMs: number;
    /** Phase where flow completed or failed */
    readonly phase: AuthPhase;
    /** Error if authentication failed */
    readonly error?: ARTKAuthError;
}
/**
 * Execute complete OIDC authentication flow
 *
 * FR-006: Support OIDC with configurable Identity Provider handlers
 *
 * @param page - Playwright Page
 * @param config - OIDC provider configuration
 * @param credentials - User credentials
 * @param options - Flow options including IdP handler
 * @returns Flow result
 *
 * @example
 * ```typescript
 * const result = await executeOIDCFlow(
 *   page,
 *   oidcConfig,
 *   { username: 'admin', password: 'secret' },
 *   { idpHandler: keycloakHandler }
 * );
 *
 * if (!result.success) {
 *   throw result.error;
 * }
 * ```
 */
declare function executeOIDCFlow(page: Page, config: OIDCAuthProviderConfig, credentials: Credentials, options: OIDCFlowOptions): Promise<OIDCFlowResult>;
/**
 * Check if current session is valid by looking for success indicators
 *
 * @param page - Playwright Page
 * @param config - OIDC configuration
 * @returns true if session appears valid
 */
declare function isOIDCSessionValid(page: Page, config: OIDCAuthProviderConfig): Promise<boolean>;

/**
 * Keycloak IdP handler
 *
 * Handles Keycloak-specific login page interactions.
 * Keycloak is the primary IdP for ITSS and many enterprise applications.
 *
 * FR-006: Support OIDC with configurable Identity Provider handlers (Keycloak primary)
 *
 * @module auth/oidc/providers/keycloak
 */

/**
 * Keycloak Identity Provider handler
 *
 * Handles:
 * - Standard username/password login
 * - Two-step login (username then password)
 * - TOTP-based MFA
 * - Required actions (update password, verify email, etc.)
 */
declare const keycloakHandler: IdpHandler;
/**
 * Check if current page is a Keycloak login page
 */
declare function isKeycloakLoginPage(page: Page): boolean;
/**
 * Check if Keycloak shows an error message
 */
declare function getKeycloakErrorMessage(page: Page): Promise<string | undefined>;

/**
 * Azure AD / Entra ID handler
 *
 * Handles Microsoft Azure Active Directory (now Entra ID) login page interactions.
 *
 * FR-006: Support OIDC with configurable Identity Provider handlers (Azure AD)
 *
 * @module auth/oidc/providers/azure-ad
 */

/**
 * Azure AD / Entra ID handler
 *
 * Handles:
 * - Multi-step username/password login
 * - "Stay signed in?" prompt
 * - TOTP-based MFA
 * - Conditional Access prompts
 */
declare const azureAdHandler: IdpHandler;
/**
 * Check if current page is an Azure AD login page
 */
declare function isAzureAdLoginPage(page: Page): boolean;
/**
 * Check if Azure AD shows an error message
 */
declare function getAzureAdErrorMessage(page: Page): Promise<string | undefined>;
/**
 * Check if Azure AD requires MFA
 */
declare function isAzureAdMfaRequired(page: Page): Promise<boolean>;

/**
 * Okta IdP handler
 *
 * Handles Okta-specific login page interactions.
 *
 * FR-006: Support OIDC with configurable Identity Provider handlers (Okta)
 *
 * @module auth/oidc/providers/okta
 */

/**
 * Okta Identity Provider handler
 *
 * Handles:
 * - Standard username/password login
 * - Okta Identity Engine flows
 * - TOTP-based MFA
 * - Push notification MFA (with timeout)
 */
declare const oktaHandler: IdpHandler;
/**
 * Check if current page is an Okta login page
 */
declare function isOktaLoginPage(page: Page): boolean;
/**
 * Check if Okta shows an error message
 */
declare function getOktaErrorMessage(page: Page): Promise<string | undefined>;
/**
 * Check if Okta requires MFA factor selection
 */
declare function isOktaFactorSelectionRequired(page: Page): Promise<boolean>;

/**
 * Generic OIDC IdP handler
 *
 * Handles generic OIDC providers that don't have a specific handler.
 * Uses configurable selectors to interact with any OIDC login page.
 *
 * FR-006: Support OIDC with configurable Identity Provider handlers (Generic)
 *
 * @module auth/oidc/providers/generic
 */

/**
 * Generic OIDC Identity Provider handler
 *
 * Provides a flexible handler that works with most OIDC providers
 * using common selector patterns. Custom selectors can be provided
 * via configuration to handle specific IdP quirks.
 *
 * Handles:
 * - Single-page and two-step login flows
 * - TOTP-based MFA
 * - Common error detection
 */
declare const genericHandler: IdpHandler;
/**
 * Create a generic handler with custom selectors
 *
 * @param customSelectors - Custom selectors to merge with defaults
 * @returns Customized IdP handler
 *
 * @example
 * ```typescript
 * const myIdpHandler = createGenericHandler({
 *   username: '#my-username-field',
 *   password: '#my-password-field',
 *   submit: '#my-submit-button',
 * });
 * ```
 */
declare function createGenericHandler(customSelectors: OIDCIdpSelectors): IdpHandler;
/**
 * Try to detect which IdP type based on URL patterns
 *
 * @param page - Playwright Page
 * @returns Detected IdP type or 'generic'
 */
declare function detectIdpType(page: Page): string;
/**
 * Get generic error message from page
 */
declare function getGenericErrorMessage(page: Page): Promise<string | undefined>;

/**
 * Custom Authentication Provider Abstract Base
 *
 * Provides an abstract base class for implementing project-specific
 * authentication flows. Extend this class when the built-in providers
 * (OIDC, Form, Token) don't meet your needs.
 *
 * @module auth/providers/custom
 */

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
declare abstract class CustomAuthProvider extends BaseAuthProvider {
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
declare class ExampleCustomAuthProvider extends CustomAuthProvider {
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

/**
 * Auth Setup Factory
 *
 * Creates Playwright auth setup project configurations for each role.
 * These projects run before browser tests to establish authenticated sessions.
 *
 * FR-007: Persist authentication state to files and reuse valid state across test runs
 * FR-009: Support multiple named roles with separate credentials and storage states
 *
 * @module auth/setup-factory
 */

/**
 * Create Playwright auth setup project configuration for a role
 *
 * Creates a project configuration that:
 * 1. Runs before browser tests
 * 2. Checks for valid existing storage state
 * 3. Authenticates and saves storage state if needed
 *
 * @param role - Role name (e.g., 'admin', 'standardUser')
 * @param authConfig - Authentication configuration
 * @param options - Optional setup configuration
 * @returns Playwright project configuration with name, testMatch, and setup paths
 */
declare function createAuthSetup(role: string, authConfig: AuthConfig, _options?: AuthSetupOptions): AuthSetupProject;
/**
 * Create auth setup projects for all configured roles
 *
 * FR-009: Support multiple named roles with separate credentials and storage states
 *
 * @param authConfig - Authentication configuration
 * @param options - Optional setup configuration
 * @returns Array of Playwright project configurations for all roles
 */
declare function createAllAuthSetups(authConfig: AuthConfig, options?: AuthSetupOptions): AuthSetupProject[];
/**
 * Create auth setup code for a role
 *
 * Generates the TypeScript code for an auth setup file that can be
 * imported into Playwright's globalSetup.
 *
 * @param role - Role name
 * @param authConfig - Authentication configuration
 * @returns TypeScript code as string
 */
declare function generateAuthSetupCode(role: string, authConfig: AuthConfig): string;
/**
 * Generate Playwright project configurations for auth setup
 *
 * Creates the full project configuration array needed for playwright.config.ts
 * including dependencies between auth setups and browser tests.
 *
 * Use these projects in playwright.config.ts by spreading them into the projects
 * array and setting browser test projects to depend on them.
 *
 * @param config - Full ARTK configuration
 * @returns Array of Playwright project configurations with name, testMatch, and metadata
 */
declare function generateAuthProjects(config: ARTKConfig): PlaywrightAuthProject[];
/**
 * Playwright project configuration for auth
 */
interface PlaywrightAuthProject {
    name: string;
    testMatch: RegExp;
    metadata: {
        role: string;
        storageStatePath: string;
    };
}
/**
 * Create an auth provider from configuration
 *
 * Factory function that creates the appropriate AuthProvider based on
 * the configuration's provider type.
 *
 * @param authConfig - Authentication configuration
 * @param role - Role name for provider setup
 * @returns AuthProvider instance
 */
declare function createAuthProviderFromConfig(authConfig: AuthConfig, role: string): AuthProviderLike;
/**
 * Auth provider-like object for lazy instantiation
 */
interface AuthProviderLike {
    type: 'oidc' | 'form' | 'token' | 'custom';
    role: string;
    config?: unknown;
    roleOverrides?: unknown;
}
/**
 * Get all configured role names
 */
declare function getRoleNames(authConfig: AuthConfig): string[];
/**
 * Get storage state directory path
 */
declare function getStorageStateDirectory(authConfig: AuthConfig, projectRoot?: string): string;
/**
 * Check if a role is configured
 */
declare function hasRole(role: string, authConfig: AuthConfig): boolean;
/**
 * Get role configuration
 */
declare function getRoleConfig(role: string, authConfig: AuthConfig): RoleConfig | undefined;

export { ARTKAuthError, AuthPhase, type AuthProviderLike, AuthRetryOptions, AuthSetupOptions, AuthSetupProject, BaseAuthProvider, Credentials, CustomAuthProvider, ExampleCustomAuthProvider, IdpHandler, OIDCAuthProviderConfig, type OIDCFlowOptions, type OIDCFlowResult, OIDCIdpSelectors, type PlaywrightAuthProject, azureAdHandler, createAllAuthSetups, createAuthProviderFromConfig, createAuthSetup, createGenericHandler, detectIdpType, executeOIDCFlow, generateAuthProjects, generateAuthSetupCode, generateTOTPCode, genericHandler, getAzureAdErrorMessage, getGenericErrorMessage, getKeycloakErrorMessage, getOktaErrorMessage, getRoleConfig, getRoleNames, getStorageStateDirectory, getTimeUntilNextTOTPWindow, hasRole, isAzureAdLoginPage, isAzureAdMfaRequired, isKeycloakLoginPage, isOIDCSessionValid, isOktaFactorSelectionRequired, isOktaLoginPage, keycloakHandler, oktaHandler, verifyTOTPCode, waitForFreshTOTPWindow };
