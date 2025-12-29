/**
 * Auth Module API Contract
 *
 * This contract defines the public API for the ARTK Auth module.
 * Implementation must satisfy these type signatures.
 */

import type { Page, BrowserContext } from '@playwright/test';

// =============================================================================
// Types
// =============================================================================

export interface Credentials {
  username: string;
  password: string;
}

export interface StorageStateMetadata {
  role: string;
  createdAt: Date;
  path: string;
  isValid: boolean;
}

// =============================================================================
// Errors
// =============================================================================

export class ARTKAuthError extends Error {
  constructor(
    message: string,
    public readonly role: string,
    public readonly phase: 'navigation' | 'credentials' | 'mfa' | 'callback',
    public readonly idpResponse?: string,
    public readonly remediation?: string
  ) {
    super(message);
    this.name = 'ARTKAuthError';
  }
}

export class ARTKStorageStateError extends Error {
  constructor(
    message: string,
    public readonly role: string,
    public readonly path: string,
    public readonly cause: 'missing' | 'expired' | 'corrupted' | 'invalid'
  ) {
    super(message);
    this.name = 'ARTKStorageStateError';
  }
}

// =============================================================================
// AuthProvider Interface
// =============================================================================

/**
 * Abstract interface for authentication providers.
 * All auth providers (OIDC, Form, Token, Custom) must implement this interface.
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
   * @param page - Playwright Page object
   * @returns true if session is valid and usable
   */
  isSessionValid(page: Page): Promise<boolean>;

  /**
   * Attempt to refresh the session (optional)
   *
   * @param page - Playwright Page object
   * @returns true if refresh succeeded
   */
  refreshSession?(page: Page): Promise<boolean>;

  /**
   * Perform logout
   *
   * @param page - Playwright Page object
   */
  logout(page: Page): Promise<void>;
}

// =============================================================================
// OIDC Provider
// =============================================================================

export interface OIDCAuthProviderConfig {
  idpType: 'keycloak' | 'azure-ad' | 'okta' | 'auth0' | 'generic';
  loginUrl: string;
  idpLoginUrl?: string;
  success: {
    url?: string;
    selector?: string;
    timeout?: number;
  };
  idpSelectors?: {
    username?: string;
    password?: string;
    submit?: string;
    staySignedInNo?: string;
  };
  mfa?: {
    enabled: boolean;
    type: 'totp' | 'push' | 'sms' | 'none';
    totpSecretEnv?: string;
    pushTimeoutMs?: number;
  };
  timeouts?: {
    loginFlowMs?: number;
    idpRedirectMs?: number;
    callbackMs?: number;
  };
}

/**
 * OIDC Authentication Provider
 *
 * Handles OIDC login flows for various Identity Providers:
 * - Keycloak (primary, ITSS uses this)
 * - Azure AD / Entra ID
 * - Okta
 * - Auth0
 * - Generic OIDC
 */
export declare class OIDCAuthProvider implements AuthProvider {
  constructor(config: OIDCAuthProviderConfig);

  login(page: Page, credentials: Credentials): Promise<void>;
  isSessionValid(page: Page): Promise<boolean>;
  refreshSession(page: Page): Promise<boolean>;
  logout(page: Page): Promise<void>;
}

// =============================================================================
// Form Provider
// =============================================================================

export interface FormAuthProviderConfig {
  loginUrl: string;
  selectors: {
    username: string;
    password: string;
    submit: string;
  };
  success: {
    url?: string;
    selector?: string;
  };
}

/**
 * Form-based Authentication Provider
 *
 * Handles direct form login (no OIDC redirect).
 * Useful for local development with basic auth.
 */
export declare class FormAuthProvider implements AuthProvider {
  constructor(config: FormAuthProviderConfig);

  login(page: Page, credentials: Credentials): Promise<void>;
  isSessionValid(page: Page): Promise<boolean>;
  logout(page: Page): Promise<void>;
}

// =============================================================================
// Token Provider
// =============================================================================

export interface TokenAuthProviderConfig {
  tokenEndpoint: string;
  headerName?: string; // Default: 'Authorization'
  headerPrefix?: string; // Default: 'Bearer '
}

/**
 * Token-based Authentication Provider
 *
 * Handles API-based token acquisition.
 * Stores token in local storage for reuse.
 */
export declare class TokenAuthProvider implements AuthProvider {
  constructor(config: TokenAuthProviderConfig);

  login(page: Page, credentials: Credentials): Promise<void>;
  isSessionValid(page: Page): Promise<boolean>;
  logout(page: Page): Promise<void>;
}

// =============================================================================
// Custom Provider (Abstract)
// =============================================================================

/**
 * Abstract base class for custom auth providers.
 * Extend this class to implement project-specific auth flows.
 */
export declare abstract class CustomAuthProvider implements AuthProvider {
  abstract login(page: Page, credentials: Credentials): Promise<void>;
  abstract isSessionValid(page: Page): Promise<boolean>;
  abstract logout(page: Page): Promise<void>;
}

// =============================================================================
// Credential Management
// =============================================================================

/**
 * Get credentials for a role from environment variables
 *
 * @param role - Role name as defined in config
 * @returns Credentials object with username and password
 * @throws Error if env vars are not set
 *
 * @example
 * // Given config: roles.admin.credentialsEnv.username = 'ADMIN_USER'
 * getCredentials('admin') // { username: process.env.ADMIN_USER, password: ... }
 */
export declare function getCredentials(role: string): Credentials;

// =============================================================================
// Storage State Management
// =============================================================================

/**
 * Save browser context storage state for a role
 *
 * @param context - Playwright BrowserContext
 * @param role - Role name
 * @returns Path to saved storage state file
 */
export declare function saveStorageState(
  context: BrowserContext,
  role: string
): Promise<string>;

/**
 * Load storage state path for a role (if valid)
 *
 * @param role - Role name
 * @returns Path to storage state file, or undefined if not valid
 */
export declare function loadStorageState(role: string): Promise<string | undefined>;

/**
 * Check if storage state is valid for a role
 *
 * @param role - Role name
 * @param maxAgeMs - Maximum age in milliseconds (default from config)
 * @returns true if storage state exists and is not expired
 */
export declare function isStorageStateValid(
  role: string,
  maxAgeMs?: number
): Promise<boolean>;

/**
 * Clear storage state files
 *
 * @param role - Optional role to clear (clears all if not specified)
 */
export declare function clearStorageState(role?: string): Promise<void>;

/**
 * Clean up expired storage states (older than 24 hours)
 *
 * Called automatically on test run start (NFR-007/008).
 *
 * @returns Number of files deleted
 */
export declare function cleanupExpiredStorageStates(): Promise<number>;

// =============================================================================
// Auth Setup Factory
// =============================================================================

export interface AuthSetupProject {
  name: string;       // e.g., 'auth-setup-admin'
  testMatch: string;  // e.g., '**/setup/*.auth.ts'
  setup: string;      // Setup file path
}

/**
 * Create Playwright auth setup project configuration
 *
 * @param role - Role name to create setup for
 * @returns Playwright project configuration
 */
export declare function createAuthSetup(role: string): AuthSetupProject;

/**
 * Create auth setup projects for all configured roles
 *
 * @returns Array of Playwright project configurations
 */
export declare function createAllAuthSetups(): AuthSetupProject[];

// =============================================================================
// TOTP Helper
// =============================================================================

/**
 * Generate TOTP code from secret
 *
 * @param secretEnvVar - Environment variable name containing TOTP secret
 * @returns 6-digit TOTP code
 * @throws Error if env var not set or secret invalid
 */
export declare function generateTOTPCode(secretEnvVar: string): string;
