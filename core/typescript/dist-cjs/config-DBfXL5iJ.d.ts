import { a as ArtkTargetType } from './target-BGR8NLDg.js';

/**
 * @module types/auth
 * @description Authentication type definitions for ARTK E2E independent architecture.
 * Defines authentication provider configuration and role definitions.
 */
/**
 * Supported authentication provider types.
 */
type ArtkAuthProvider = 'oidc' | 'saml' | 'basic' | 'custom';
/**
 * Supported identity provider types for OIDC authentication.
 */
type ArtkIdpType = 'keycloak' | 'auth0' | 'okta' | 'azure-ad' | 'other';
/**
 * Credentials configuration using environment variables.
 */
interface ArtkCredentialsEnv {
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
interface ArtkRole {
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
interface ArtkAuthEnvironmentUrls {
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
interface ArtkAuthConfig {
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
declare function isArtkRole(value: unknown): value is ArtkRole;
/**
 * Validates that an environment variable name follows the expected pattern.
 * @pattern ^[A-Z][A-Z0-9_]*$
 */
declare function isValidEnvVarName(name: string): boolean;
/**
 * Type guard to check if a value is a valid ArtkAuthConfig.
 */
declare function isArtkAuthConfig(value: unknown): value is ArtkAuthConfig;
/**
 * Default storage state directory.
 */
declare const DEFAULT_STORAGE_STATE_DIR = ".auth-states";

/**
 * @module types/config
 * @description Configuration type definitions for ARTK E2E independent architecture.
 * Defines the main configuration file schema (artk.config.yml).
 */

/**
 * Config schema version.
 * Update this when making breaking changes to the config schema.
 */
declare const CONFIG_SCHEMA_VERSION: "2.0";
/**
 * Supported browser types.
 */
type ArtkBrowserType = 'chromium' | 'firefox' | 'webkit';
/**
 * Environment-specific URLs for a target.
 */
interface ArtkEnvironmentUrls {
    /**
     * Base URL for the environment.
     * @format uri
     */
    baseUrl: string;
    /**
     * Optional API URL if different from baseUrl.
     * @format uri
     */
    apiUrl?: string;
}
/**
 * Extended target configuration with per-environment URLs.
 * Used in artk.config.yml.
 */
interface ArtkConfigTarget {
    /**
     * Unique identifier for the target.
     * Must be lowercase-kebab-case.
     * @pattern ^[a-z][a-z0-9-]*$
     */
    name: string;
    /**
     * Relative path to frontend directory from artk-e2e/.
     */
    path: string;
    /**
     * Application type.
     */
    type: ArtkTargetType;
    /**
     * Optional human-readable description.
     */
    description?: string;
    /**
     * Environment-specific URLs.
     * Keys are environment names (e.g., 'local', 'staging', 'production').
     */
    environments: Record<string, ArtkEnvironmentUrls>;
}
/**
 * Browser configuration settings.
 */
interface ArtkBrowserConfig {
    /**
     * Enabled browser types.
     * @default ['chromium']
     */
    enabled: ArtkBrowserType[];
    /**
     * Whether to run in headless mode.
     * @default true
     */
    headless: boolean;
}
/**
 * Timeout configuration in milliseconds.
 */
interface ArtkTimeoutConfig {
    /**
     * Default timeout for operations.
     * @default 30000
     * @minimum 1000
     */
    default: number;
    /**
     * Navigation timeout.
     * @default 60000
     * @minimum 1000
     */
    navigation: number;
    /**
     * Authentication timeout.
     * @default 120000
     * @minimum 1000
     */
    auth: number;
}
/**
 * Main configuration file for ARTK E2E suite (artk.config.yml).
 *
 * @example
 * ```yaml
 * schemaVersion: "2.0"
 *
 * project:
 *   name: my-project
 *   description: E2E tests for my project
 *
 * targets:
 *   - name: user-portal
 *     path: ../iss-frontend
 *     type: react-spa
 *     environments:
 *       local:
 *         baseUrl: http://localhost:3000
 *       staging:
 *         baseUrl: https://staging.example.com
 *
 * defaults:
 *   target: user-portal
 *   environment: local
 * ```
 */
interface ArtkConfig {
    /**
     * Schema version for backward compatibility.
     * Always '2.0' for this version.
     */
    schemaVersion: typeof CONFIG_SCHEMA_VERSION;
    /**
     * Project metadata.
     */
    project: {
        /**
         * Project name.
         */
        name: string;
        /**
         * Optional project description.
         */
        description?: string;
    };
    /**
     * Frontend targets with environment URLs.
     * Must have 1-5 elements.
     */
    targets: ArtkConfigTarget[];
    /**
     * Default settings.
     */
    defaults: {
        /**
         * Default target name.
         * Must match a targets[].name.
         */
        target: string;
        /**
         * Default environment name.
         * Must exist in all targets' environments.
         */
        environment: string;
    };
    /**
     * Optional authentication configuration.
     */
    auth?: ArtkAuthConfig;
    /**
     * Optional browser configuration.
     */
    browsers?: ArtkBrowserConfig;
    /**
     * Optional timeout configuration.
     */
    timeouts?: ArtkTimeoutConfig;
}
/**
 * Type guard to check if a value is a valid ArtkConfig.
 */
declare function isArtkConfig(value: unknown): value is ArtkConfig;
/**
 * Default browser configuration.
 */
declare const DEFAULT_BROWSER_CONFIG: ArtkBrowserConfig;
/**
 * Default timeout configuration.
 */
declare const DEFAULT_TIMEOUT_CONFIG: ArtkTimeoutConfig;

export { type ArtkBrowserType as A, CONFIG_SCHEMA_VERSION as C, DEFAULT_BROWSER_CONFIG as D, type ArtkEnvironmentUrls as a, type ArtkConfigTarget as b, type ArtkBrowserConfig as c, type ArtkTimeoutConfig as d, type ArtkConfig as e, DEFAULT_TIMEOUT_CONFIG as f, type ArtkAuthProvider as g, type ArtkIdpType as h, isArtkConfig as i, type ArtkCredentialsEnv as j, type ArtkRole as k, type ArtkAuthEnvironmentUrls as l, type ArtkAuthConfig as m, isArtkRole as n, isValidEnvVarName as o, isArtkAuthConfig as p, DEFAULT_STORAGE_STATE_DIR as q };
