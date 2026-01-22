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
import type { Credentials } from './types.js';
import type { AuthConfig, RoleConfig } from '../config/types.js';
/**
 * Options for credential loading
 */
export interface GetCredentialsOptions {
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
export declare function getCredentials(role: string, authConfig: AuthConfig, options?: GetCredentialsOptions): Credentials;
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
export declare function getCredentialsFromRoleConfig(role: string, roleConfig: RoleConfig, options?: GetCredentialsOptions): Credentials;
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
export declare function validateCredentials(roles: readonly string[], authConfig: AuthConfig, env?: Record<string, string | undefined>): ReadonlyArray<MissingCredential>;
/**
 * Information about missing credentials
 */
export interface MissingCredential {
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
export declare function formatMissingCredentialsError(missing: ReadonlyArray<MissingCredential>): string;
/**
 * Check if credentials are available for a role (without throwing)
 *
 * @param role - Role name
 * @param authConfig - Auth configuration
 * @param env - Environment variables
 * @returns true if credentials are available
 */
export declare function hasCredentials(role: string, authConfig: AuthConfig, env?: Record<string, string | undefined>): boolean;
/**
 * Validate that credentials environment variables are set for all roles
 *
 * This function checks that all required environment variables for role credentials
 * are present at config load time, providing early failure with clear error messages.
 *
 * @param roles - Record of role configurations from auth config
 * @param env - Environment variables to check (defaults to process.env)
 * @throws ARTKAuthError if any required environment variables are missing
 *
 * @example
 * ```typescript
 * // Validate all roles from config
 * validateCredentialsConfig(config.auth.roles);
 *
 * // Skip validation (for dry-run scenarios)
 * // Don't call this function
 * ```
 */
export declare function validateCredentialsConfig(roles: Record<string, RoleConfig>, env?: Record<string, string | undefined>): void;
//# sourceMappingURL=credentials.d.ts.map