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
export function isArtkRole(value: unknown): value is ArtkRole {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Check credentialsEnv
  if (typeof obj.credentialsEnv !== 'object' || obj.credentialsEnv === null)
    return false;
  const creds = obj.credentialsEnv as Record<string, unknown>;
  if (typeof creds.username !== 'string' || creds.username.length === 0)
    return false;
  if (typeof creds.password !== 'string' || creds.password.length === 0)
    return false;

  // Check totpSecretEnv (optional)
  if (
    obj.totpSecretEnv !== undefined &&
    typeof obj.totpSecretEnv !== 'string'
  ) {
    return false;
  }

  // Check storageState (optional)
  if (obj.storageState !== undefined) {
    if (typeof obj.storageState !== 'object' || obj.storageState === null) {
      return false;
    }
    const storage = obj.storageState as Record<string, unknown>;
    for (const [, v] of Object.entries(storage)) {
      if (typeof v !== 'string') return false;
    }
  }

  return true;
}

/**
 * Validates that an environment variable name follows the expected pattern.
 * @pattern ^[A-Z][A-Z0-9_]*$
 */
export function isValidEnvVarName(name: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(name);
}

/**
 * Type guard to check if a value is a valid ArtkAuthConfig.
 */
export function isArtkAuthConfig(value: unknown): value is ArtkAuthConfig {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Check provider
  if (
    !['oidc', 'saml', 'basic', 'custom'].includes(obj.provider as string)
  ) {
    return false;
  }

  // Check idpType (optional)
  if (obj.idpType !== undefined) {
    if (
      !['keycloak', 'auth0', 'okta', 'azure-ad', 'other'].includes(
        obj.idpType as string
      )
    ) {
      return false;
    }
  }

  // Check storageStateDir
  if (typeof obj.storageStateDir !== 'string') return false;

  // Check environments
  if (typeof obj.environments !== 'object' || obj.environments === null) {
    return false;
  }
  const envs = obj.environments as Record<string, unknown>;
  for (const [, env] of Object.entries(envs)) {
    if (typeof env !== 'object' || env === null) return false;
    const envObj = env as Record<string, unknown>;
    if (typeof envObj.loginUrl !== 'string') return false;
    if (
      envObj.logoutUrl !== undefined &&
      typeof envObj.logoutUrl !== 'string'
    ) {
      return false;
    }
  }

  // Check roles
  if (typeof obj.roles !== 'object' || obj.roles === null) return false;
  const roles = obj.roles as Record<string, unknown>;
  for (const [, role] of Object.entries(roles)) {
    if (!isArtkRole(role)) return false;
  }

  return true;
}

/**
 * Default storage state directory.
 */
export const DEFAULT_STORAGE_STATE_DIR = '.auth-states';
