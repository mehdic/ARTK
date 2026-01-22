/**
 * @module types/auth
 * @description Authentication type definitions for ARTK E2E independent architecture.
 * Defines authentication provider configuration and role definitions.
 */
/**
 * Supported authentication provider types.
 */
export type ArtkAuthProvider = 'oidc' | 'saml' | 'basic' | 'custom';
/**
 * Supported identity provider types for OIDC authentication.
 */
export type ArtkIdpType = 'keycloak' | 'auth0' | 'okta' | 'azure-ad' | 'other';
/**
 * Credentials configuration using environment variables.
 */
export interface ArtkCredentialsEnv {
    /**
     * Environment variable name for username.
     * @pattern ^[A-Z][A-Z0-9_]*$
     * @example 'ISS_USER'
     */
    username: string;
    /**
     * Environment variable name for password.
     * @pattern ^[A-Z][A-Z0-9_]*$
     * @example 'ISS_PASSWORD'
     */
    password: string;
}
/**
 * A user role with credentials from environment variables.
 *
 * @example
 * ```typescript
 * const adminRole: ArtkRole = {
 *   credentialsEnv: {
 *     username: 'ADMIN_USER',
 *     password: 'ADMIN_PASSWORD'
 *   },
 *   totpSecretEnv: 'ADMIN_TOTP_SECRET',
 *   storageState: {
 *     'user-portal': '.auth-states/user-portal/admin.json'
 *   }
 * };
 * ```
 */
export interface ArtkRole {
    /**
     * Environment variable names for credentials.
     */
    credentialsEnv: ArtkCredentialsEnv;
    /**
     * TOTP secret environment variable (if MFA enabled).
     * @pattern ^[A-Z][A-Z0-9_]*$
     */
    totpSecretEnv?: string;
    /**
     * Per-target storage state path overrides.
     * Keys are target names, values are relative paths to storage state files.
     */
    storageState?: Record<string, string>;
}
/**
 * Per-environment authentication URLs.
 */
export interface ArtkAuthEnvironmentUrls {
    /**
     * Login URL for this environment.
     * @format uri
     */
    loginUrl: string;
    /**
     * Optional logout URL for this environment.
     * @format uri
     */
    logoutUrl?: string;
}
/**
 * Authentication provider configuration.
 *
 * @example
 * ```typescript
 * const authConfig: ArtkAuthConfig = {
 *   provider: 'oidc',
 *   idpType: 'keycloak',
 *   storageStateDir: '.auth-states',
 *   environments: {
 *     local: {
 *       loginUrl: 'http://localhost:8080/auth/realms/main/protocol/openid-connect/auth'
 *     },
 *     staging: {
 *       loginUrl: 'https://auth.staging.example.com/login',
 *       logoutUrl: 'https://auth.staging.example.com/logout'
 *     }
 *   },
 *   roles: {
 *     admin: {
 *       credentialsEnv: { username: 'ADMIN_USER', password: 'ADMIN_PASSWORD' },
 *       totpSecretEnv: 'ADMIN_TOTP'
 *     },
 *     user: {
 *       credentialsEnv: { username: 'USER_NAME', password: 'USER_PASSWORD' }
 *     }
 *   }
 * };
 * ```
 */
export interface ArtkAuthConfig {
    /**
     * Authentication provider type.
     */
    provider: ArtkAuthProvider;
    /**
     * Identity provider type (for OIDC provider).
     */
    idpType?: ArtkIdpType;
    /**
     * Directory for storage states (relative to artk-e2e/).
     * @default '.auth-states'
     */
    storageStateDir: string;
    /**
     * Per-environment authentication URLs.
     * Keys are environment names (e.g., 'local', 'staging', 'production').
     */
    environments: Record<string, ArtkAuthEnvironmentUrls>;
    /**
     * Role definitions.
     * Keys are role names (e.g., 'admin', 'user', 'readonly').
     */
    roles: Record<string, ArtkRole>;
}
/**
 * Type guard to check if a value is a valid ArtkRole.
 */
export declare function isArtkRole(value: unknown): value is ArtkRole;
/**
 * Validates that an environment variable name follows the expected pattern.
 * @pattern ^[A-Z][A-Z0-9_]*$
 */
export declare function isValidEnvVarName(name: string): boolean;
/**
 * Type guard to check if a value is a valid ArtkAuthConfig.
 */
export declare function isArtkAuthConfig(value: unknown): value is ArtkAuthConfig;
/**
 * Default storage state directory.
 */
export declare const DEFAULT_STORAGE_STATE_DIR = ".auth-states";
//# sourceMappingURL=auth.d.ts.map