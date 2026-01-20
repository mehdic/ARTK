import { f as AppType, g as StorageStateConfig, M as MFAType, L as LocatorStrategy, S as SelectorsConfig, c as AssertionsConfig, D as DataConfig, T as TierConfig, h as ReporterOpenMode, R as ReportersConfig, i as ScreenshotMode, C as CaptureMode, d as ArtifactsConfig, B as BrowsersConfig, J as JourneysConfig } from '../types-BBdYxuqU.js';
export { A as ARTKConfig, a as AppConfig, P as ArtkReporterConfig, b as AuthConfig, j as AuthProviderType, e as BrowserType, y as CleanupConfig, l as CredentialsEnvConfig, z as DataApiConfig, E as EnvironmentConfig, G as FixturesApiConfig, F as FixturesConfig, x as FormAssertionConfig, s as FormAuthConfig, t as FormAuthSelectors, u as FormAuthSuccessConfig, H as HtmlReporterConfig, Z as JourneyBacklogConfig, $ as JourneyGroupBy, Y as JourneyIdConfig, _ as JourneyLayout, I as JsonReporterConfig, K as JunitReporterConfig, w as LoadingAssertionConfig, r as MFAConfig, N as NamespaceConfig, O as OIDCConfig, o as OIDCIdpSelectors, m as OIDCIdpType, q as OIDCLogoutConfig, n as OIDCSuccessConfig, p as OIDCTimeouts, k as RoleConfig, Q as ScreenshotsConfig, v as ToastAssertionConfig, U as TraceConfig, V as VideoConfig, W as VideoSize, X as ViewportSize } from '../types-BBdYxuqU.js';
export { C as CONFIG_FILE_NAMES, D as DEFAULT_CONFIG_PATH, L as LoadConfigOptions, A as LoadConfigResult, c as clearConfigCache, f as findConfigFile, b as formatZodError, w as getApiUrl, d as getAppConfig, q as getArtifactsConfig, j as getAssertionsConfig, e as getAuthConfig, v as getBaseUrl, r as getBrowsersConfig, g as getConfig, k as getDataConfig, t as getEnvironmentConfig, u as getEnvironmentsConfig, m as getFixturesConfig, s as getJourneysConfig, p as getReportersConfig, h as getSelectorsConfig, x as getStorageStateDir, y as getStorageStatePath, n as getTierConfig, o as getTiersConfig, i as isConfigLoaded, l as loadConfig, a as loadYamlFile, z as zodErrorToConfigError } from '../loader-BxbOTPv0.js';
import { A as ARTKConfigError } from '../config-error-CJ71r7TC.js';
import { z } from 'zod';

/**
 * Environment variable resolver for ARTK configuration
 *
 * Supports resolving environment variables in configuration values using:
 * - ${VAR_NAME} - Simple variable reference (throws if undefined)
 * - ${VAR_NAME:-default} - Variable with default value
 *
 * This implements FR-003: Resolve env vars using ${VAR_NAME} and ${VAR_NAME:-default} syntax
 *
 * @module config/env
 */

/**
 * Regular expression to match environment variable patterns:
 * - ${VAR_NAME} - Simple reference
 * - ${VAR_NAME:-default} - With default value
 *
 * Groups:
 * - Group 1: Variable name
 * - Group 2: Default value (optional, includes the leading :-)
 *
 * Note: We don't use a global constant regex here because global regexes
 * maintain state (lastIndex) which can cause issues with repeated calls.
 */
/**
 * Error thrown when a required environment variable is not defined
 */
declare class EnvVarNotFoundError extends Error {
    readonly varName: string;
    readonly fieldPath?: string | undefined;
    constructor(varName: string, fieldPath?: string | undefined);
}
/**
 * Result of parsing an environment variable reference
 */
interface EnvVarRef {
    /** Original match (e.g., "${VAR_NAME:-default}") */
    readonly match: string;
    /** Variable name */
    readonly varName: string;
    /** Default value if specified */
    readonly defaultValue?: string;
    /** Whether a default value was specified */
    readonly hasDefault: boolean;
}
/**
 * Parse an environment variable reference string
 *
 * @param ref - The reference string (e.g., "${VAR_NAME:-default}")
 * @returns Parsed reference or undefined if not a valid env var reference
 *
 * @example
 * ```typescript
 * parseEnvVarRef("${BASE_URL}")
 * // { match: "${BASE_URL}", varName: "BASE_URL", hasDefault: false }
 *
 * parseEnvVarRef("${PORT:-8080}")
 * // { match: "${PORT:-8080}", varName: "PORT", defaultValue: "8080", hasDefault: true }
 * ```
 */
declare function parseEnvVarRef(ref: string): EnvVarRef | undefined;
/**
 * Find all environment variable references in a string
 *
 * @param value - String to search for env var references
 * @returns Array of parsed references
 *
 * @example
 * ```typescript
 * findEnvVarRefs("http://${HOST:-localhost}:${PORT}")
 * // [
 * //   { match: "${HOST:-localhost}", varName: "HOST", defaultValue: "localhost", hasDefault: true },
 * //   { match: "${PORT}", varName: "PORT", hasDefault: false }
 * // ]
 * ```
 */
declare function findEnvVarRefs(value: string): readonly EnvVarRef[];
/**
 * Options for resolving environment variables
 */
interface ResolveOptions {
    /**
     * Field path for error messages (e.g., "auth.oidc.loginUrl")
     */
    fieldPath?: string;
    /**
     * Custom environment object (defaults to process.env)
     */
    env?: Record<string, string | undefined>;
    /**
     * Whether to throw on missing variables without defaults
     * @default true
     */
    throwOnMissing?: boolean;
}
/**
 * Resolve a single environment variable reference
 *
 * @param ref - Parsed env var reference
 * @param options - Resolution options
 * @returns Resolved value
 * @throws EnvVarNotFoundError if variable is not defined and has no default
 *
 * @example
 * ```typescript
 * // With env: { PORT: "3000" }
 * resolveEnvVarRef({ varName: "PORT", hasDefault: false, match: "${PORT}" })
 * // "3000"
 *
 * // With env: {} (PORT not defined)
 * resolveEnvVarRef({ varName: "PORT", hasDefault: true, defaultValue: "8080", match: "${PORT:-8080}" })
 * // "8080"
 * ```
 */
declare function resolveEnvVarRef(ref: EnvVarRef, options?: ResolveOptions): string;
/**
 * Resolve all environment variable references in a string
 *
 * Replaces ${VAR_NAME} and ${VAR_NAME:-default} patterns with their values.
 *
 * @param value - String containing env var references
 * @param options - Resolution options
 * @returns String with all env vars resolved
 * @throws EnvVarNotFoundError if any variable is not defined and has no default
 *
 * @example
 * ```typescript
 * // With env: { HOST: "api.example.com", PORT: "3000" }
 * resolveEnvVars("https://${HOST}:${PORT:-8080}/api")
 * // "https://api.example.com:3000/api"
 *
 * // With env: { HOST: "api.example.com" }
 * resolveEnvVars("https://${HOST}:${PORT:-8080}/api")
 * // "https://api.example.com:8080/api"
 * ```
 */
declare function resolveEnvVars(value: string, options?: ResolveOptions): string;
/**
 * Check if a string contains environment variable references
 *
 * @param value - String to check
 * @returns True if the string contains env var references
 *
 * @example
 * ```typescript
 * hasEnvVarRefs("${BASE_URL}/api")  // true
 * hasEnvVarRefs("https://example.com")  // false
 * ```
 */
declare function hasEnvVarRefs(value: string): boolean;
/**
 * Recursively resolve environment variables in an object
 *
 * Walks through all string values in an object (including nested objects
 * and arrays) and resolves environment variable references.
 *
 * @param obj - Object to resolve
 * @param options - Resolution options
 * @param currentPath - Current path in the object (for error messages)
 * @returns New object with all env vars resolved
 *
 * @example
 * ```typescript
 * // With env: { DB_HOST: "localhost", DB_PORT: "5432" }
 * resolveEnvVarsInObject({
 *   database: {
 *     host: "${DB_HOST}",
 *     port: "${DB_PORT:-5432}"
 *   }
 * })
 * // {
 * //   database: {
 * //     host: "localhost",
 * //     port: "5432"
 * //   }
 * // }
 * ```
 */
declare function resolveEnvVarsInObject<T>(obj: T, options?: ResolveOptions, currentPath?: string): T;
/**
 * Get all missing environment variables from a string or object
 *
 * Useful for validation before attempting to load configuration.
 *
 * @param value - String or object to check
 * @param env - Environment object (defaults to process.env)
 * @returns Array of missing variable names with their field paths
 *
 * @example
 * ```typescript
 * // With env: { DB_HOST: "localhost" } (DB_PORT not defined)
 * getMissingEnvVars({
 *   host: "${DB_HOST}",
 *   port: "${DB_PORT}"  // No default
 * })
 * // [{ varName: "DB_PORT", fieldPath: "port" }]
 * ```
 */
declare function getMissingEnvVars(value: unknown, env?: Record<string, string | undefined>): readonly {
    varName: string;
    fieldPath: string;
}[];
/**
 * Convert missing env vars to ARTKConfigError
 *
 * @param missing - Array of missing variables
 * @returns ARTKConfigError with details
 */
declare function createMissingEnvVarsError(missing: readonly {
    varName: string;
    fieldPath: string;
}[]): ARTKConfigError;

/**
 * Zod validation schemas for ARTK configuration
 *
 * Provides runtime type checking and validation for configuration loaded
 * from artk.config.yml. All validation errors include field paths for
 * easy debugging (FR-002).
 *
 * @module config/schema
 */

/** Application configuration schema */
declare const AppConfigSchema: z.ZodObject<{
    name: z.ZodString;
    baseUrl: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["spa", "ssr", "hybrid"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    baseUrl: string;
    type: "spa" | "ssr" | "hybrid";
}, {
    name: string;
    baseUrl: string;
    type?: "spa" | "ssr" | "hybrid" | undefined;
}>;
/** Environment configuration schema */
declare const EnvironmentConfigSchema: z.ZodObject<{
    baseUrl: z.ZodString;
    apiUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
    apiUrl?: string | undefined;
}, {
    baseUrl: string;
    apiUrl?: string | undefined;
}>;
/** Environments record schema */
declare const EnvironmentsSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    baseUrl: z.ZodString;
    apiUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
    apiUrl?: string | undefined;
}, {
    baseUrl: string;
    apiUrl?: string | undefined;
}>>;
/** Storage state configuration schema */
declare const StorageStateConfigSchema: z.ZodObject<{
    directory: z.ZodDefault<z.ZodString>;
    maxAgeMinutes: z.ZodDefault<z.ZodNumber>;
    filePattern: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    directory: string;
    maxAgeMinutes: number;
    filePattern: string;
}, {
    directory?: string | undefined;
    maxAgeMinutes?: number | undefined;
    filePattern?: string | undefined;
}>;
/** Credentials environment variable schema */
declare const CredentialsEnvConfigSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
}, {
    username: string;
    password: string;
}>;
/** OIDC success configuration schema */
declare const OIDCSuccessConfigSchema: z.ZodEffects<z.ZodObject<{
    url: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
    timeout: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timeout: number;
    url?: string | undefined;
    selector?: string | undefined;
}, {
    url?: string | undefined;
    selector?: string | undefined;
    timeout?: number | undefined;
}>, {
    timeout: number;
    url?: string | undefined;
    selector?: string | undefined;
}, {
    url?: string | undefined;
    selector?: string | undefined;
    timeout?: number | undefined;
}>;
/** OIDC IdP selectors schema */
declare const OIDCIdpSelectorsSchema: z.ZodOptional<z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    submit: z.ZodOptional<z.ZodString>;
    staySignedInNo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    username?: string | undefined;
    password?: string | undefined;
    submit?: string | undefined;
    staySignedInNo?: string | undefined;
}, {
    username?: string | undefined;
    password?: string | undefined;
    submit?: string | undefined;
    staySignedInNo?: string | undefined;
}>>;
/** MFA configuration schema */
declare const MFAConfigSchema: z.ZodOptional<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
    totpSecretEnv: z.ZodOptional<z.ZodString>;
    pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    type: "none" | "totp" | "push" | "sms";
    pushTimeoutMs: number;
    totpSecretEnv?: string | undefined;
}, {
    enabled?: boolean | undefined;
    type?: "none" | "totp" | "push" | "sms" | undefined;
    totpSecretEnv?: string | undefined;
    pushTimeoutMs?: number | undefined;
}>>;
/** OIDC timeouts schema */
declare const OIDCTimeoutsSchema: z.ZodOptional<z.ZodObject<{
    loginFlowMs: z.ZodDefault<z.ZodNumber>;
    idpRedirectMs: z.ZodDefault<z.ZodNumber>;
    callbackMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    loginFlowMs: number;
    idpRedirectMs: number;
    callbackMs: number;
}, {
    loginFlowMs?: number | undefined;
    idpRedirectMs?: number | undefined;
    callbackMs?: number | undefined;
}>>;
/** OIDC logout schema */
declare const OIDCLogoutConfigSchema: z.ZodOptional<z.ZodObject<{
    url: z.ZodOptional<z.ZodString>;
    idpLogout: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    url?: string | undefined;
    idpLogout?: boolean | undefined;
}, {
    url?: string | undefined;
    idpLogout?: boolean | undefined;
}>>;
/** OIDC configuration schema */
declare const OIDCConfigSchema: z.ZodOptional<z.ZodObject<{
    idpType: z.ZodEnum<["keycloak", "azure-ad", "okta", "auth0", "generic"]>;
    loginUrl: z.ZodString;
    idpLoginUrl: z.ZodOptional<z.ZodString>;
    success: z.ZodEffects<z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        timeout: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        timeout: number;
        url?: string | undefined;
        selector?: string | undefined;
    }, {
        url?: string | undefined;
        selector?: string | undefined;
        timeout?: number | undefined;
    }>, {
        timeout: number;
        url?: string | undefined;
        selector?: string | undefined;
    }, {
        url?: string | undefined;
        selector?: string | undefined;
        timeout?: number | undefined;
    }>;
    idpSelectors: z.ZodOptional<z.ZodObject<{
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        submit: z.ZodOptional<z.ZodString>;
        staySignedInNo: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        username?: string | undefined;
        password?: string | undefined;
        submit?: string | undefined;
        staySignedInNo?: string | undefined;
    }, {
        username?: string | undefined;
        password?: string | undefined;
        submit?: string | undefined;
        staySignedInNo?: string | undefined;
    }>>;
    mfa: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
        totpSecretEnv: z.ZodOptional<z.ZodString>;
        pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        type: "none" | "totp" | "push" | "sms";
        pushTimeoutMs: number;
        totpSecretEnv?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        type?: "none" | "totp" | "push" | "sms" | undefined;
        totpSecretEnv?: string | undefined;
        pushTimeoutMs?: number | undefined;
    }>>;
    timeouts: z.ZodOptional<z.ZodObject<{
        loginFlowMs: z.ZodDefault<z.ZodNumber>;
        idpRedirectMs: z.ZodDefault<z.ZodNumber>;
        callbackMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        loginFlowMs: number;
        idpRedirectMs: number;
        callbackMs: number;
    }, {
        loginFlowMs?: number | undefined;
        idpRedirectMs?: number | undefined;
        callbackMs?: number | undefined;
    }>>;
    logout: z.ZodOptional<z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
        idpLogout: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        url?: string | undefined;
        idpLogout?: boolean | undefined;
    }, {
        url?: string | undefined;
        idpLogout?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
    loginUrl: string;
    success: {
        timeout: number;
        url?: string | undefined;
        selector?: string | undefined;
    };
    mfa?: {
        enabled: boolean;
        type: "none" | "totp" | "push" | "sms";
        pushTimeoutMs: number;
        totpSecretEnv?: string | undefined;
    } | undefined;
    idpLoginUrl?: string | undefined;
    idpSelectors?: {
        username?: string | undefined;
        password?: string | undefined;
        submit?: string | undefined;
        staySignedInNo?: string | undefined;
    } | undefined;
    timeouts?: {
        loginFlowMs: number;
        idpRedirectMs: number;
        callbackMs: number;
    } | undefined;
    logout?: {
        url?: string | undefined;
        idpLogout?: boolean | undefined;
    } | undefined;
}, {
    idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
    loginUrl: string;
    success: {
        url?: string | undefined;
        selector?: string | undefined;
        timeout?: number | undefined;
    };
    mfa?: {
        enabled?: boolean | undefined;
        type?: "none" | "totp" | "push" | "sms" | undefined;
        totpSecretEnv?: string | undefined;
        pushTimeoutMs?: number | undefined;
    } | undefined;
    idpLoginUrl?: string | undefined;
    idpSelectors?: {
        username?: string | undefined;
        password?: string | undefined;
        submit?: string | undefined;
        staySignedInNo?: string | undefined;
    } | undefined;
    timeouts?: {
        loginFlowMs?: number | undefined;
        idpRedirectMs?: number | undefined;
        callbackMs?: number | undefined;
    } | undefined;
    logout?: {
        url?: string | undefined;
        idpLogout?: boolean | undefined;
    } | undefined;
}>>;
/** Form auth selectors schema */
declare const FormAuthSelectorsSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
    submit: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
    submit: string;
}, {
    username: string;
    password: string;
    submit: string;
}>;
/** Form auth success schema */
declare const FormAuthSuccessConfigSchema: z.ZodObject<{
    url: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url?: string | undefined;
    selector?: string | undefined;
}, {
    url?: string | undefined;
    selector?: string | undefined;
}>;
/** Form auth configuration schema */
declare const FormAuthConfigSchema: z.ZodOptional<z.ZodObject<{
    loginUrl: z.ZodString;
    selectors: z.ZodObject<{
        username: z.ZodString;
        password: z.ZodString;
        submit: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        username: string;
        password: string;
        submit: string;
    }, {
        username: string;
        password: string;
        submit: string;
    }>;
    success: z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url?: string | undefined;
        selector?: string | undefined;
    }, {
        url?: string | undefined;
        selector?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    loginUrl: string;
    success: {
        url?: string | undefined;
        selector?: string | undefined;
    };
    selectors: {
        username: string;
        password: string;
        submit: string;
    };
}, {
    loginUrl: string;
    success: {
        url?: string | undefined;
        selector?: string | undefined;
    };
    selectors: {
        username: string;
        password: string;
        submit: string;
    };
}>>;
/** Role configuration schema */
declare const RoleConfigSchema: z.ZodObject<{
    credentialsEnv: z.ZodObject<{
        username: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        username: string;
        password: string;
    }, {
        username: string;
        password: string;
    }>;
    description: z.ZodOptional<z.ZodString>;
    oidcOverrides: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        idpType: z.ZodEnum<["keycloak", "azure-ad", "okta", "auth0", "generic"]>;
        loginUrl: z.ZodString;
        idpLoginUrl: z.ZodOptional<z.ZodString>;
        success: z.ZodEffects<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            selector: z.ZodOptional<z.ZodString>;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        }, {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        }>, {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        }, {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        }>;
        idpSelectors: z.ZodOptional<z.ZodObject<{
            username: z.ZodOptional<z.ZodString>;
            password: z.ZodOptional<z.ZodString>;
            submit: z.ZodOptional<z.ZodString>;
            staySignedInNo: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        }, {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        }>>;
        mfa: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
            totpSecretEnv: z.ZodOptional<z.ZodString>;
            pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        }, {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        }>>;
        timeouts: z.ZodOptional<z.ZodObject<{
            loginFlowMs: z.ZodDefault<z.ZodNumber>;
            idpRedirectMs: z.ZodDefault<z.ZodNumber>;
            callbackMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        }, {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        }>>;
        logout: z.ZodOptional<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            idpLogout: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        }, {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        };
        mfa?: {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    }, {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        };
        mfa?: {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    credentialsEnv: {
        username: string;
        password: string;
    };
    description?: string | undefined;
    oidcOverrides?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        };
        mfa?: {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
}, {
    credentialsEnv: {
        username: string;
        password: string;
    };
    description?: string | undefined;
    oidcOverrides?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        };
        mfa?: {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
}>;
/** Roles record schema */
declare const RolesSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    credentialsEnv: z.ZodObject<{
        username: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        username: string;
        password: string;
    }, {
        username: string;
        password: string;
    }>;
    description: z.ZodOptional<z.ZodString>;
    oidcOverrides: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        idpType: z.ZodEnum<["keycloak", "azure-ad", "okta", "auth0", "generic"]>;
        loginUrl: z.ZodString;
        idpLoginUrl: z.ZodOptional<z.ZodString>;
        success: z.ZodEffects<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            selector: z.ZodOptional<z.ZodString>;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        }, {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        }>, {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        }, {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        }>;
        idpSelectors: z.ZodOptional<z.ZodObject<{
            username: z.ZodOptional<z.ZodString>;
            password: z.ZodOptional<z.ZodString>;
            submit: z.ZodOptional<z.ZodString>;
            staySignedInNo: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        }, {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        }>>;
        mfa: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
            totpSecretEnv: z.ZodOptional<z.ZodString>;
            pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        }, {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        }>>;
        timeouts: z.ZodOptional<z.ZodObject<{
            loginFlowMs: z.ZodDefault<z.ZodNumber>;
            idpRedirectMs: z.ZodDefault<z.ZodNumber>;
            callbackMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        }, {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        }>>;
        logout: z.ZodOptional<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            idpLogout: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        }, {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        };
        mfa?: {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    }, {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        };
        mfa?: {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    credentialsEnv: {
        username: string;
        password: string;
    };
    description?: string | undefined;
    oidcOverrides?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        };
        mfa?: {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
}, {
    credentialsEnv: {
        username: string;
        password: string;
    };
    description?: string | undefined;
    oidcOverrides?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        };
        mfa?: {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
}>>;
/** Auth configuration schema with provider-specific validation */
declare const AuthConfigSchema: z.ZodEffects<z.ZodObject<{
    provider: z.ZodEnum<["oidc", "form", "token", "custom"]>;
    storageState: z.ZodDefault<z.ZodObject<{
        directory: z.ZodDefault<z.ZodString>;
        maxAgeMinutes: z.ZodDefault<z.ZodNumber>;
        filePattern: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        directory: string;
        maxAgeMinutes: number;
        filePattern: string;
    }, {
        directory?: string | undefined;
        maxAgeMinutes?: number | undefined;
        filePattern?: string | undefined;
    }>>;
    roles: z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodObject<{
        credentialsEnv: z.ZodObject<{
            username: z.ZodString;
            password: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            username: string;
            password: string;
        }, {
            username: string;
            password: string;
        }>;
        description: z.ZodOptional<z.ZodString>;
        oidcOverrides: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            idpType: z.ZodEnum<["keycloak", "azure-ad", "okta", "auth0", "generic"]>;
            loginUrl: z.ZodString;
            idpLoginUrl: z.ZodOptional<z.ZodString>;
            success: z.ZodEffects<z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
                selector: z.ZodOptional<z.ZodString>;
                timeout: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            }, {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            }>, {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            }, {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            }>;
            idpSelectors: z.ZodOptional<z.ZodObject<{
                username: z.ZodOptional<z.ZodString>;
                password: z.ZodOptional<z.ZodString>;
                submit: z.ZodOptional<z.ZodString>;
                staySignedInNo: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            }, {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            }>>;
            mfa: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
                totpSecretEnv: z.ZodOptional<z.ZodString>;
                pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            }, {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            }>>;
            timeouts: z.ZodOptional<z.ZodObject<{
                loginFlowMs: z.ZodDefault<z.ZodNumber>;
                idpRedirectMs: z.ZodDefault<z.ZodNumber>;
                callbackMs: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            }, {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            }>>;
            logout: z.ZodOptional<z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
                idpLogout: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            }, {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        }, {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>>, Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>, Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>>;
    bypass: z.ZodOptional<z.ZodObject<{
        mode: z.ZodDefault<z.ZodEnum<["none", "identityless", "mock-identity", "unknown"]>>;
        toggle: z.ZodOptional<z.ZodString>;
        environments: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        mode: "none" | "identityless" | "mock-identity" | "unknown";
        toggle?: string | undefined;
        environments?: string[] | undefined;
    }, {
        mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
        toggle?: string | undefined;
        environments?: string[] | undefined;
    }>>;
    oidc: z.ZodOptional<z.ZodObject<{
        idpType: z.ZodEnum<["keycloak", "azure-ad", "okta", "auth0", "generic"]>;
        loginUrl: z.ZodString;
        idpLoginUrl: z.ZodOptional<z.ZodString>;
        success: z.ZodEffects<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            selector: z.ZodOptional<z.ZodString>;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        }, {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        }>, {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        }, {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        }>;
        idpSelectors: z.ZodOptional<z.ZodObject<{
            username: z.ZodOptional<z.ZodString>;
            password: z.ZodOptional<z.ZodString>;
            submit: z.ZodOptional<z.ZodString>;
            staySignedInNo: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        }, {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        }>>;
        mfa: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
            totpSecretEnv: z.ZodOptional<z.ZodString>;
            pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        }, {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        }>>;
        timeouts: z.ZodOptional<z.ZodObject<{
            loginFlowMs: z.ZodDefault<z.ZodNumber>;
            idpRedirectMs: z.ZodDefault<z.ZodNumber>;
            callbackMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        }, {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        }>>;
        logout: z.ZodOptional<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            idpLogout: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        }, {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        };
        mfa?: {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    }, {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        };
        mfa?: {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    }>>;
    form: z.ZodOptional<z.ZodObject<{
        loginUrl: z.ZodString;
        selectors: z.ZodObject<{
            username: z.ZodString;
            password: z.ZodString;
            submit: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            username: string;
            password: string;
            submit: string;
        }, {
            username: string;
            password: string;
            submit: string;
        }>;
        success: z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            selector: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url?: string | undefined;
            selector?: string | undefined;
        }, {
            url?: string | undefined;
            selector?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
        };
        selectors: {
            username: string;
            password: string;
            submit: string;
        };
    }, {
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
        };
        selectors: {
            username: string;
            password: string;
            submit: string;
        };
    }>>;
}, "strip", z.ZodTypeAny, {
    provider: "oidc" | "form" | "token" | "custom";
    storageState: {
        directory: string;
        maxAgeMinutes: number;
        filePattern: string;
    };
    roles: Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>;
    oidc?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        };
        mfa?: {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
    form?: {
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
        };
        selectors: {
            username: string;
            password: string;
            submit: string;
        };
    } | undefined;
    bypass?: {
        mode: "none" | "identityless" | "mock-identity" | "unknown";
        toggle?: string | undefined;
        environments?: string[] | undefined;
    } | undefined;
}, {
    provider: "oidc" | "form" | "token" | "custom";
    roles: Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>;
    oidc?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        };
        mfa?: {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
    form?: {
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
        };
        selectors: {
            username: string;
            password: string;
            submit: string;
        };
    } | undefined;
    storageState?: {
        directory?: string | undefined;
        maxAgeMinutes?: number | undefined;
        filePattern?: string | undefined;
    } | undefined;
    bypass?: {
        mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
        toggle?: string | undefined;
        environments?: string[] | undefined;
    } | undefined;
}>, {
    provider: "oidc" | "form" | "token" | "custom";
    storageState: {
        directory: string;
        maxAgeMinutes: number;
        filePattern: string;
    };
    roles: Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>;
    oidc?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        };
        mfa?: {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
    form?: {
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
        };
        selectors: {
            username: string;
            password: string;
            submit: string;
        };
    } | undefined;
    bypass?: {
        mode: "none" | "identityless" | "mock-identity" | "unknown";
        toggle?: string | undefined;
        environments?: string[] | undefined;
    } | undefined;
}, {
    provider: "oidc" | "form" | "token" | "custom";
    roles: Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>;
    oidc?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        };
        mfa?: {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
    form?: {
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
        };
        selectors: {
            username: string;
            password: string;
            submit: string;
        };
    } | undefined;
    storageState?: {
        directory?: string | undefined;
        maxAgeMinutes?: number | undefined;
        filePattern?: string | undefined;
    } | undefined;
    bypass?: {
        mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
        toggle?: string | undefined;
        environments?: string[] | undefined;
    } | undefined;
}>;
/** Selectors configuration schema */
declare const SelectorsConfigSchema: z.ZodObject<{
    testIdAttribute: z.ZodDefault<z.ZodString>;
    strategy: z.ZodDefault<z.ZodArray<z.ZodEnum<["role", "label", "placeholder", "testid", "text", "css"]>, "many">>;
    customTestIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    testIdAttribute: string;
    strategy: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[];
    customTestIds?: string[] | undefined;
}, {
    testIdAttribute?: string | undefined;
    strategy?: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[] | undefined;
    customTestIds?: string[] | undefined;
}>;
/** Toast assertion schema */
declare const ToastAssertionConfigSchema: z.ZodObject<{
    containerSelector: z.ZodString;
    messageSelector: z.ZodString;
    typeAttribute: z.ZodString;
    timeout: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timeout: number;
    containerSelector: string;
    messageSelector: string;
    typeAttribute: string;
}, {
    containerSelector: string;
    messageSelector: string;
    typeAttribute: string;
    timeout?: number | undefined;
}>;
/** Loading assertion schema */
declare const LoadingAssertionConfigSchema: z.ZodObject<{
    selectors: z.ZodArray<z.ZodString, "many">;
    timeout: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timeout: number;
    selectors: string[];
}, {
    selectors: string[];
    timeout?: number | undefined;
}>;
/** Form assertion schema */
declare const FormAssertionConfigSchema: z.ZodObject<{
    errorSelector: z.ZodString;
    formErrorSelector: z.ZodString;
}, "strip", z.ZodTypeAny, {
    errorSelector: string;
    formErrorSelector: string;
}, {
    errorSelector: string;
    formErrorSelector: string;
}>;
/** Assertions configuration schema */
declare const AssertionsConfigSchema: z.ZodObject<{
    toast: z.ZodDefault<z.ZodObject<{
        containerSelector: z.ZodString;
        messageSelector: z.ZodString;
        typeAttribute: z.ZodString;
        timeout: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        timeout: number;
        containerSelector: string;
        messageSelector: string;
        typeAttribute: string;
    }, {
        containerSelector: string;
        messageSelector: string;
        typeAttribute: string;
        timeout?: number | undefined;
    }>>;
    loading: z.ZodDefault<z.ZodObject<{
        selectors: z.ZodArray<z.ZodString, "many">;
        timeout: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        timeout: number;
        selectors: string[];
    }, {
        selectors: string[];
        timeout?: number | undefined;
    }>>;
    form: z.ZodDefault<z.ZodObject<{
        errorSelector: z.ZodString;
        formErrorSelector: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        errorSelector: string;
        formErrorSelector: string;
    }, {
        errorSelector: string;
        formErrorSelector: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    form: {
        errorSelector: string;
        formErrorSelector: string;
    };
    toast: {
        timeout: number;
        containerSelector: string;
        messageSelector: string;
        typeAttribute: string;
    };
    loading: {
        timeout: number;
        selectors: string[];
    };
}, {
    form?: {
        errorSelector: string;
        formErrorSelector: string;
    } | undefined;
    toast?: {
        containerSelector: string;
        messageSelector: string;
        typeAttribute: string;
        timeout?: number | undefined;
    } | undefined;
    loading?: {
        selectors: string[];
        timeout?: number | undefined;
    } | undefined;
}>;
/** Namespace configuration schema */
declare const NamespaceConfigSchema: z.ZodObject<{
    prefix: z.ZodDefault<z.ZodString>;
    suffix: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prefix: string;
    suffix: string;
}, {
    prefix?: string | undefined;
    suffix?: string | undefined;
}>;
/** Cleanup configuration schema */
declare const CleanupConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    onFailure: z.ZodDefault<z.ZodBoolean>;
    parallel: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    onFailure: boolean;
    parallel: boolean;
}, {
    enabled?: boolean | undefined;
    onFailure?: boolean | undefined;
    parallel?: boolean | undefined;
}>;
/** Data API configuration schema */
declare const DataApiConfigSchema: z.ZodOptional<z.ZodObject<{
    baseUrl: z.ZodString;
    useMainAuth: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
    useMainAuth: boolean;
}, {
    baseUrl: string;
    useMainAuth?: boolean | undefined;
}>>;
/** Data configuration schema */
declare const DataConfigSchema: z.ZodObject<{
    namespace: z.ZodDefault<z.ZodObject<{
        prefix: z.ZodDefault<z.ZodString>;
        suffix: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        prefix: string;
        suffix: string;
    }, {
        prefix?: string | undefined;
        suffix?: string | undefined;
    }>>;
    cleanup: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        onFailure: z.ZodDefault<z.ZodBoolean>;
        parallel: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        onFailure: boolean;
        parallel: boolean;
    }, {
        enabled?: boolean | undefined;
        onFailure?: boolean | undefined;
        parallel?: boolean | undefined;
    }>>;
    api: z.ZodOptional<z.ZodObject<{
        baseUrl: z.ZodString;
        useMainAuth: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        baseUrl: string;
        useMainAuth: boolean;
    }, {
        baseUrl: string;
        useMainAuth?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    namespace: {
        prefix: string;
        suffix: string;
    };
    cleanup: {
        enabled: boolean;
        onFailure: boolean;
        parallel: boolean;
    };
    api?: {
        baseUrl: string;
        useMainAuth: boolean;
    } | undefined;
}, {
    namespace?: {
        prefix?: string | undefined;
        suffix?: string | undefined;
    } | undefined;
    cleanup?: {
        enabled?: boolean | undefined;
        onFailure?: boolean | undefined;
        parallel?: boolean | undefined;
    } | undefined;
    api?: {
        baseUrl: string;
        useMainAuth?: boolean | undefined;
    } | undefined;
}>;
/** Fixtures API configuration schema */
declare const FixturesApiConfigSchema: z.ZodOptional<z.ZodObject<{
    baseURL: z.ZodString;
    extraHTTPHeaders: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    baseURL: string;
    extraHTTPHeaders?: Record<string, string> | undefined;
}, {
    baseURL: string;
    extraHTTPHeaders?: Record<string, string> | undefined;
}>>;
/** Fixtures configuration schema */
declare const FixturesConfigSchema: z.ZodObject<{
    defaultRole: z.ZodString;
    roleFixtures: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    api: z.ZodOptional<z.ZodObject<{
        baseURL: z.ZodString;
        extraHTTPHeaders: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        baseURL: string;
        extraHTTPHeaders?: Record<string, string> | undefined;
    }, {
        baseURL: string;
        extraHTTPHeaders?: Record<string, string> | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    defaultRole: string;
    roleFixtures: string[];
    api?: {
        baseURL: string;
        extraHTTPHeaders?: Record<string, string> | undefined;
    } | undefined;
}, {
    defaultRole: string;
    api?: {
        baseURL: string;
        extraHTTPHeaders?: Record<string, string> | undefined;
    } | undefined;
    roleFixtures?: string[] | undefined;
}>;
/** Tier configuration schema */
declare const TierConfigSchema: z.ZodObject<{
    retries: z.ZodNumber;
    workers: z.ZodNumber;
    timeout: z.ZodNumber;
    tag: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timeout: number;
    retries: number;
    workers: number;
    tag: string;
}, {
    timeout: number;
    retries: number;
    workers: number;
    tag: string;
}>;
/** Tiers record schema */
declare const TiersSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    retries: z.ZodNumber;
    workers: z.ZodNumber;
    timeout: z.ZodNumber;
    tag: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timeout: number;
    retries: number;
    workers: number;
    tag: string;
}, {
    timeout: number;
    retries: number;
    workers: number;
    tag: string;
}>>;
/** HTML reporter schema */
declare const HtmlReporterConfigSchema: z.ZodOptional<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    outputFolder: z.ZodDefault<z.ZodString>;
    open: z.ZodDefault<z.ZodEnum<["always", "never", "on-failure"]>>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    outputFolder: string;
    open: "always" | "never" | "on-failure";
}, {
    enabled?: boolean | undefined;
    outputFolder?: string | undefined;
    open?: "always" | "never" | "on-failure" | undefined;
}>>;
/** JSON reporter schema */
declare const JsonReporterConfigSchema: z.ZodOptional<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    outputFile: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    outputFile: string;
}, {
    enabled?: boolean | undefined;
    outputFile?: string | undefined;
}>>;
/** JUnit reporter schema */
declare const JunitReporterConfigSchema: z.ZodOptional<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    outputFile: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    outputFile: string;
}, {
    enabled?: boolean | undefined;
    outputFile?: string | undefined;
}>>;
/** ARTK reporter schema */
declare const ArtkReporterConfigSchema: z.ZodOptional<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    outputFile: z.ZodDefault<z.ZodString>;
    includeJourneyMapping: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    outputFile: string;
    includeJourneyMapping: boolean;
}, {
    enabled?: boolean | undefined;
    outputFile?: string | undefined;
    includeJourneyMapping?: boolean | undefined;
}>>;
/** Reporters configuration schema */
declare const ReportersConfigSchema: z.ZodObject<{
    html: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        outputFolder: z.ZodDefault<z.ZodString>;
        open: z.ZodDefault<z.ZodEnum<["always", "never", "on-failure"]>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        outputFolder: string;
        open: "always" | "never" | "on-failure";
    }, {
        enabled?: boolean | undefined;
        outputFolder?: string | undefined;
        open?: "always" | "never" | "on-failure" | undefined;
    }>>;
    json: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        outputFile: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        outputFile: string;
    }, {
        enabled?: boolean | undefined;
        outputFile?: string | undefined;
    }>>;
    junit: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        outputFile: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        outputFile: string;
    }, {
        enabled?: boolean | undefined;
        outputFile?: string | undefined;
    }>>;
    artk: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        outputFile: z.ZodDefault<z.ZodString>;
        includeJourneyMapping: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        outputFile: string;
        includeJourneyMapping: boolean;
    }, {
        enabled?: boolean | undefined;
        outputFile?: string | undefined;
        includeJourneyMapping?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    json?: {
        enabled: boolean;
        outputFile: string;
    } | undefined;
    html?: {
        enabled: boolean;
        outputFolder: string;
        open: "always" | "never" | "on-failure";
    } | undefined;
    junit?: {
        enabled: boolean;
        outputFile: string;
    } | undefined;
    artk?: {
        enabled: boolean;
        outputFile: string;
        includeJourneyMapping: boolean;
    } | undefined;
}, {
    json?: {
        enabled?: boolean | undefined;
        outputFile?: string | undefined;
    } | undefined;
    html?: {
        enabled?: boolean | undefined;
        outputFolder?: string | undefined;
        open?: "always" | "never" | "on-failure" | undefined;
    } | undefined;
    junit?: {
        enabled?: boolean | undefined;
        outputFile?: string | undefined;
    } | undefined;
    artk?: {
        enabled?: boolean | undefined;
        outputFile?: string | undefined;
        includeJourneyMapping?: boolean | undefined;
    } | undefined;
}>;
/** Video size schema */
declare const VideoSizeSchema: z.ZodOptional<z.ZodObject<{
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
}, {
    width: number;
    height: number;
}>>;
/** Screenshots configuration schema */
declare const ScreenshotsConfigSchema: z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["off", "on", "only-on-failure"]>>;
    fullPage: z.ZodDefault<z.ZodBoolean>;
    maskPii: z.ZodDefault<z.ZodBoolean>;
    piiSelectors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    mode: "off" | "on" | "only-on-failure";
    fullPage: boolean;
    maskPii: boolean;
    piiSelectors: string[];
}, {
    mode?: "off" | "on" | "only-on-failure" | undefined;
    fullPage?: boolean | undefined;
    maskPii?: boolean | undefined;
    piiSelectors?: string[] | undefined;
}>;
/** Video configuration schema */
declare const VideoConfigSchema: z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["off", "on", "retain-on-failure", "on-first-retry"]>>;
    size: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
    size?: {
        width: number;
        height: number;
    } | undefined;
}, {
    mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
    size?: {
        width: number;
        height: number;
    } | undefined;
}>;
/** Trace configuration schema */
declare const TraceConfigSchema: z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["off", "on", "retain-on-failure", "on-first-retry"]>>;
    screenshots: z.ZodDefault<z.ZodBoolean>;
    snapshots: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
    screenshots: boolean;
    snapshots: boolean;
}, {
    mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
    screenshots?: boolean | undefined;
    snapshots?: boolean | undefined;
}>;
/** Artifacts configuration schema */
declare const ArtifactsConfigSchema: z.ZodObject<{
    outputDir: z.ZodDefault<z.ZodString>;
    screenshots: z.ZodDefault<z.ZodObject<{
        mode: z.ZodDefault<z.ZodEnum<["off", "on", "only-on-failure"]>>;
        fullPage: z.ZodDefault<z.ZodBoolean>;
        maskPii: z.ZodDefault<z.ZodBoolean>;
        piiSelectors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        mode: "off" | "on" | "only-on-failure";
        fullPage: boolean;
        maskPii: boolean;
        piiSelectors: string[];
    }, {
        mode?: "off" | "on" | "only-on-failure" | undefined;
        fullPage?: boolean | undefined;
        maskPii?: boolean | undefined;
        piiSelectors?: string[] | undefined;
    }>>;
    video: z.ZodDefault<z.ZodObject<{
        mode: z.ZodDefault<z.ZodEnum<["off", "on", "retain-on-failure", "on-first-retry"]>>;
        size: z.ZodOptional<z.ZodObject<{
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            width: number;
            height: number;
        }, {
            width: number;
            height: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
        size?: {
            width: number;
            height: number;
        } | undefined;
    }, {
        mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
        size?: {
            width: number;
            height: number;
        } | undefined;
    }>>;
    trace: z.ZodDefault<z.ZodObject<{
        mode: z.ZodDefault<z.ZodEnum<["off", "on", "retain-on-failure", "on-first-retry"]>>;
        screenshots: z.ZodDefault<z.ZodBoolean>;
        snapshots: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
        screenshots: boolean;
        snapshots: boolean;
    }, {
        mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
        screenshots?: boolean | undefined;
        snapshots?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    screenshots: {
        mode: "off" | "on" | "only-on-failure";
        fullPage: boolean;
        maskPii: boolean;
        piiSelectors: string[];
    };
    outputDir: string;
    video: {
        mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
        size?: {
            width: number;
            height: number;
        } | undefined;
    };
    trace: {
        mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
        screenshots: boolean;
        snapshots: boolean;
    };
}, {
    screenshots?: {
        mode?: "off" | "on" | "only-on-failure" | undefined;
        fullPage?: boolean | undefined;
        maskPii?: boolean | undefined;
        piiSelectors?: string[] | undefined;
    } | undefined;
    outputDir?: string | undefined;
    video?: {
        mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
        size?: {
            width: number;
            height: number;
        } | undefined;
    } | undefined;
    trace?: {
        mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
        screenshots?: boolean | undefined;
        snapshots?: boolean | undefined;
    } | undefined;
}>;
/** Viewport size schema */
declare const ViewportSizeSchema: z.ZodObject<{
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
}, {
    width: number;
    height: number;
}>;
/** Browsers configuration schema */
declare const BrowsersConfigSchema: z.ZodEffects<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodArray<z.ZodEnum<["chromium", "firefox", "webkit"]>, "many">>;
    channel: z.ZodDefault<z.ZodOptional<z.ZodEnum<["bundled", "msedge", "chrome", "chrome-beta", "chrome-dev"]>>>;
    strategy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["auto", "prefer-bundled", "prefer-system", "bundled-only", "system-only"]>>>;
    viewport: z.ZodDefault<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>;
    headless: z.ZodDefault<z.ZodBoolean>;
    slowMo: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    enabled: ("chromium" | "firefox" | "webkit")[];
    strategy: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only";
    channel: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev";
    viewport: {
        width: number;
        height: number;
    };
    headless: boolean;
    slowMo?: number | undefined;
}, {
    enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
    strategy?: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only" | undefined;
    channel?: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev" | undefined;
    viewport?: {
        width: number;
        height: number;
    } | undefined;
    headless?: boolean | undefined;
    slowMo?: number | undefined;
}>, {
    enabled: ("chromium" | "firefox" | "webkit")[];
    strategy: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only";
    channel: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev";
    viewport: {
        width: number;
        height: number;
    };
    headless: boolean;
    slowMo?: number | undefined;
}, {
    enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
    strategy?: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only" | undefined;
    channel?: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev" | undefined;
    viewport?: {
        width: number;
        height: number;
    } | undefined;
    headless?: boolean | undefined;
    slowMo?: number | undefined;
}>;
/** Journey ID configuration schema */
declare const JourneyIdConfigSchema: z.ZodObject<{
    prefix: z.ZodDefault<z.ZodString>;
    width: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    prefix: string;
    width: number;
}, {
    prefix?: string | undefined;
    width?: number | undefined;
}>;
/** Journey backlog configuration schema */
declare const JourneyBacklogConfigSchema: z.ZodObject<{
    groupBy: z.ZodDefault<z.ZodEnum<["tier", "status", "scope"]>>;
    thenBy: z.ZodOptional<z.ZodEnum<["tier", "status", "scope"]>>;
}, "strip", z.ZodTypeAny, {
    groupBy: "tier" | "status" | "scope";
    thenBy?: "tier" | "status" | "scope" | undefined;
}, {
    groupBy?: "tier" | "status" | "scope" | undefined;
    thenBy?: "tier" | "status" | "scope" | undefined;
}>;
/** Journeys configuration schema */
declare const JourneysConfigSchema: z.ZodObject<{
    id: z.ZodDefault<z.ZodObject<{
        prefix: z.ZodDefault<z.ZodString>;
        width: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        prefix: string;
        width: number;
    }, {
        prefix?: string | undefined;
        width?: number | undefined;
    }>>;
    layout: z.ZodDefault<z.ZodEnum<["flat", "staged"]>>;
    backlog: z.ZodDefault<z.ZodObject<{
        groupBy: z.ZodDefault<z.ZodEnum<["tier", "status", "scope"]>>;
        thenBy: z.ZodOptional<z.ZodEnum<["tier", "status", "scope"]>>;
    }, "strip", z.ZodTypeAny, {
        groupBy: "tier" | "status" | "scope";
        thenBy?: "tier" | "status" | "scope" | undefined;
    }, {
        groupBy?: "tier" | "status" | "scope" | undefined;
        thenBy?: "tier" | "status" | "scope" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: {
        prefix: string;
        width: number;
    };
    layout: "flat" | "staged";
    backlog: {
        groupBy: "tier" | "status" | "scope";
        thenBy?: "tier" | "status" | "scope" | undefined;
    };
}, {
    id?: {
        prefix?: string | undefined;
        width?: number | undefined;
    } | undefined;
    layout?: "flat" | "staged" | undefined;
    backlog?: {
        groupBy?: "tier" | "status" | "scope" | undefined;
        thenBy?: "tier" | "status" | "scope" | undefined;
    } | undefined;
}>;
/**
 * Root configuration schema with all validation rules
 *
 * Validates:
 * - version must equal SUPPORTED_CONFIG_VERSION (currently 1)
 * - app.baseUrl must be present (validated after env var resolution)
 * - auth.roles must have at least one role
 * - activeEnvironment must match a key in environments or be env var template
 * - Provider-specific configuration must be present
 */
declare const ARTKConfigSchema: z.ZodEffects<z.ZodObject<{
    version: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    app: z.ZodObject<{
        name: z.ZodString;
        baseUrl: z.ZodString;
        type: z.ZodDefault<z.ZodEnum<["spa", "ssr", "hybrid"]>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        baseUrl: string;
        type: "spa" | "ssr" | "hybrid";
    }, {
        name: string;
        baseUrl: string;
        type?: "spa" | "ssr" | "hybrid" | undefined;
    }>;
    environments: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        baseUrl: z.ZodString;
        apiUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }>>>;
    activeEnvironment: z.ZodDefault<z.ZodString>;
    auth: z.ZodEffects<z.ZodObject<{
        provider: z.ZodEnum<["oidc", "form", "token", "custom"]>;
        storageState: z.ZodDefault<z.ZodObject<{
            directory: z.ZodDefault<z.ZodString>;
            maxAgeMinutes: z.ZodDefault<z.ZodNumber>;
            filePattern: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            directory: string;
            maxAgeMinutes: number;
            filePattern: string;
        }, {
            directory?: string | undefined;
            maxAgeMinutes?: number | undefined;
            filePattern?: string | undefined;
        }>>;
        roles: z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodObject<{
            credentialsEnv: z.ZodObject<{
                username: z.ZodString;
                password: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                username: string;
                password: string;
            }, {
                username: string;
                password: string;
            }>;
            description: z.ZodOptional<z.ZodString>;
            oidcOverrides: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                idpType: z.ZodEnum<["keycloak", "azure-ad", "okta", "auth0", "generic"]>;
                loginUrl: z.ZodString;
                idpLoginUrl: z.ZodOptional<z.ZodString>;
                success: z.ZodEffects<z.ZodObject<{
                    url: z.ZodOptional<z.ZodString>;
                    selector: z.ZodOptional<z.ZodString>;
                    timeout: z.ZodDefault<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                }, {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                }>, {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                }, {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                }>;
                idpSelectors: z.ZodOptional<z.ZodObject<{
                    username: z.ZodOptional<z.ZodString>;
                    password: z.ZodOptional<z.ZodString>;
                    submit: z.ZodOptional<z.ZodString>;
                    staySignedInNo: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                }, {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                }>>;
                mfa: z.ZodOptional<z.ZodObject<{
                    enabled: z.ZodDefault<z.ZodBoolean>;
                    type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
                    totpSecretEnv: z.ZodOptional<z.ZodString>;
                    pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                }, {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                }>>;
                timeouts: z.ZodOptional<z.ZodObject<{
                    loginFlowMs: z.ZodDefault<z.ZodNumber>;
                    idpRedirectMs: z.ZodDefault<z.ZodNumber>;
                    callbackMs: z.ZodDefault<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                }, {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                }>>;
                logout: z.ZodOptional<z.ZodObject<{
                    url: z.ZodOptional<z.ZodString>;
                    idpLogout: z.ZodOptional<z.ZodBoolean>;
                }, "strip", z.ZodTypeAny, {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                }, {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                };
                mfa?: {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            }, {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                };
                mfa?: {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                };
                mfa?: {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                };
                mfa?: {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>>, Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                };
                mfa?: {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>, Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                };
                mfa?: {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>>;
        bypass: z.ZodOptional<z.ZodObject<{
            mode: z.ZodDefault<z.ZodEnum<["none", "identityless", "mock-identity", "unknown"]>>;
            toggle: z.ZodOptional<z.ZodString>;
            environments: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            mode: "none" | "identityless" | "mock-identity" | "unknown";
            toggle?: string | undefined;
            environments?: string[] | undefined;
        }, {
            mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
            toggle?: string | undefined;
            environments?: string[] | undefined;
        }>>;
        oidc: z.ZodOptional<z.ZodObject<{
            idpType: z.ZodEnum<["keycloak", "azure-ad", "okta", "auth0", "generic"]>;
            loginUrl: z.ZodString;
            idpLoginUrl: z.ZodOptional<z.ZodString>;
            success: z.ZodEffects<z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
                selector: z.ZodOptional<z.ZodString>;
                timeout: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            }, {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            }>, {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            }, {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            }>;
            idpSelectors: z.ZodOptional<z.ZodObject<{
                username: z.ZodOptional<z.ZodString>;
                password: z.ZodOptional<z.ZodString>;
                submit: z.ZodOptional<z.ZodString>;
                staySignedInNo: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            }, {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            }>>;
            mfa: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
                totpSecretEnv: z.ZodOptional<z.ZodString>;
                pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            }, {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            }>>;
            timeouts: z.ZodOptional<z.ZodObject<{
                loginFlowMs: z.ZodDefault<z.ZodNumber>;
                idpRedirectMs: z.ZodDefault<z.ZodNumber>;
                callbackMs: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            }, {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            }>>;
            logout: z.ZodOptional<z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
                idpLogout: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            }, {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        }, {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        }>>;
        form: z.ZodOptional<z.ZodObject<{
            loginUrl: z.ZodString;
            selectors: z.ZodObject<{
                username: z.ZodString;
                password: z.ZodString;
                submit: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                username: string;
                password: string;
                submit: string;
            }, {
                username: string;
                password: string;
                submit: string;
            }>;
            success: z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
                selector: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                url?: string | undefined;
                selector?: string | undefined;
            }, {
                url?: string | undefined;
                selector?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        }, {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        }>>;
    }, "strip", z.ZodTypeAny, {
        provider: "oidc" | "form" | "token" | "custom";
        storageState: {
            directory: string;
            maxAgeMinutes: number;
            filePattern: string;
        };
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                };
                mfa?: {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        bypass?: {
            mode: "none" | "identityless" | "mock-identity" | "unknown";
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    }, {
        provider: "oidc" | "form" | "token" | "custom";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                };
                mfa?: {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        storageState?: {
            directory?: string | undefined;
            maxAgeMinutes?: number | undefined;
            filePattern?: string | undefined;
        } | undefined;
        bypass?: {
            mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    }>, {
        provider: "oidc" | "form" | "token" | "custom";
        storageState: {
            directory: string;
            maxAgeMinutes: number;
            filePattern: string;
        };
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                };
                mfa?: {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        bypass?: {
            mode: "none" | "identityless" | "mock-identity" | "unknown";
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    }, {
        provider: "oidc" | "form" | "token" | "custom";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                };
                mfa?: {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        storageState?: {
            directory?: string | undefined;
            maxAgeMinutes?: number | undefined;
            filePattern?: string | undefined;
        } | undefined;
        bypass?: {
            mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    }>;
    selectors: z.ZodDefault<z.ZodObject<{
        testIdAttribute: z.ZodDefault<z.ZodString>;
        strategy: z.ZodDefault<z.ZodArray<z.ZodEnum<["role", "label", "placeholder", "testid", "text", "css"]>, "many">>;
        customTestIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        testIdAttribute: string;
        strategy: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[];
        customTestIds?: string[] | undefined;
    }, {
        testIdAttribute?: string | undefined;
        strategy?: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[] | undefined;
        customTestIds?: string[] | undefined;
    }>>;
    assertions: z.ZodDefault<z.ZodObject<{
        toast: z.ZodDefault<z.ZodObject<{
            containerSelector: z.ZodString;
            messageSelector: z.ZodString;
            typeAttribute: z.ZodString;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            timeout: number;
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
        }, {
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
            timeout?: number | undefined;
        }>>;
        loading: z.ZodDefault<z.ZodObject<{
            selectors: z.ZodArray<z.ZodString, "many">;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            timeout: number;
            selectors: string[];
        }, {
            selectors: string[];
            timeout?: number | undefined;
        }>>;
        form: z.ZodDefault<z.ZodObject<{
            errorSelector: z.ZodString;
            formErrorSelector: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            errorSelector: string;
            formErrorSelector: string;
        }, {
            errorSelector: string;
            formErrorSelector: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        form: {
            errorSelector: string;
            formErrorSelector: string;
        };
        toast: {
            timeout: number;
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
        };
        loading: {
            timeout: number;
            selectors: string[];
        };
    }, {
        form?: {
            errorSelector: string;
            formErrorSelector: string;
        } | undefined;
        toast?: {
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
            timeout?: number | undefined;
        } | undefined;
        loading?: {
            selectors: string[];
            timeout?: number | undefined;
        } | undefined;
    }>>;
    data: z.ZodDefault<z.ZodObject<{
        namespace: z.ZodDefault<z.ZodObject<{
            prefix: z.ZodDefault<z.ZodString>;
            suffix: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            prefix: string;
            suffix: string;
        }, {
            prefix?: string | undefined;
            suffix?: string | undefined;
        }>>;
        cleanup: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            onFailure: z.ZodDefault<z.ZodBoolean>;
            parallel: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            onFailure: boolean;
            parallel: boolean;
        }, {
            enabled?: boolean | undefined;
            onFailure?: boolean | undefined;
            parallel?: boolean | undefined;
        }>>;
        api: z.ZodOptional<z.ZodObject<{
            baseUrl: z.ZodString;
            useMainAuth: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            baseUrl: string;
            useMainAuth: boolean;
        }, {
            baseUrl: string;
            useMainAuth?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        namespace: {
            prefix: string;
            suffix: string;
        };
        cleanup: {
            enabled: boolean;
            onFailure: boolean;
            parallel: boolean;
        };
        api?: {
            baseUrl: string;
            useMainAuth: boolean;
        } | undefined;
    }, {
        namespace?: {
            prefix?: string | undefined;
            suffix?: string | undefined;
        } | undefined;
        cleanup?: {
            enabled?: boolean | undefined;
            onFailure?: boolean | undefined;
            parallel?: boolean | undefined;
        } | undefined;
        api?: {
            baseUrl: string;
            useMainAuth?: boolean | undefined;
        } | undefined;
    }>>;
    fixtures: z.ZodObject<{
        defaultRole: z.ZodString;
        roleFixtures: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        api: z.ZodOptional<z.ZodObject<{
            baseURL: z.ZodString;
            extraHTTPHeaders: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        }, {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        defaultRole: string;
        roleFixtures: string[];
        api?: {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        } | undefined;
    }, {
        defaultRole: string;
        api?: {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        } | undefined;
        roleFixtures?: string[] | undefined;
    }>;
    tiers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        retries: z.ZodNumber;
        workers: z.ZodNumber;
        timeout: z.ZodNumber;
        tag: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timeout: number;
        retries: number;
        workers: number;
        tag: string;
    }, {
        timeout: number;
        retries: number;
        workers: number;
        tag: string;
    }>>>;
    reporters: z.ZodDefault<z.ZodObject<{
        html: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            outputFolder: z.ZodDefault<z.ZodString>;
            open: z.ZodDefault<z.ZodEnum<["always", "never", "on-failure"]>>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            outputFolder: string;
            open: "always" | "never" | "on-failure";
        }, {
            enabled?: boolean | undefined;
            outputFolder?: string | undefined;
            open?: "always" | "never" | "on-failure" | undefined;
        }>>;
        json: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            outputFile: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            outputFile: string;
        }, {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        }>>;
        junit: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            outputFile: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            outputFile: string;
        }, {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        }>>;
        artk: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            outputFile: z.ZodDefault<z.ZodString>;
            includeJourneyMapping: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            outputFile: string;
            includeJourneyMapping: boolean;
        }, {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
            includeJourneyMapping?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        json?: {
            enabled: boolean;
            outputFile: string;
        } | undefined;
        html?: {
            enabled: boolean;
            outputFolder: string;
            open: "always" | "never" | "on-failure";
        } | undefined;
        junit?: {
            enabled: boolean;
            outputFile: string;
        } | undefined;
        artk?: {
            enabled: boolean;
            outputFile: string;
            includeJourneyMapping: boolean;
        } | undefined;
    }, {
        json?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        } | undefined;
        html?: {
            enabled?: boolean | undefined;
            outputFolder?: string | undefined;
            open?: "always" | "never" | "on-failure" | undefined;
        } | undefined;
        junit?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        } | undefined;
        artk?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
            includeJourneyMapping?: boolean | undefined;
        } | undefined;
    }>>;
    artifacts: z.ZodDefault<z.ZodObject<{
        outputDir: z.ZodDefault<z.ZodString>;
        screenshots: z.ZodDefault<z.ZodObject<{
            mode: z.ZodDefault<z.ZodEnum<["off", "on", "only-on-failure"]>>;
            fullPage: z.ZodDefault<z.ZodBoolean>;
            maskPii: z.ZodDefault<z.ZodBoolean>;
            piiSelectors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            mode: "off" | "on" | "only-on-failure";
            fullPage: boolean;
            maskPii: boolean;
            piiSelectors: string[];
        }, {
            mode?: "off" | "on" | "only-on-failure" | undefined;
            fullPage?: boolean | undefined;
            maskPii?: boolean | undefined;
            piiSelectors?: string[] | undefined;
        }>>;
        video: z.ZodDefault<z.ZodObject<{
            mode: z.ZodDefault<z.ZodEnum<["off", "on", "retain-on-failure", "on-first-retry"]>>;
            size: z.ZodOptional<z.ZodObject<{
                width: z.ZodNumber;
                height: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                width: number;
                height: number;
            }, {
                width: number;
                height: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            size?: {
                width: number;
                height: number;
            } | undefined;
        }, {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            size?: {
                width: number;
                height: number;
            } | undefined;
        }>>;
        trace: z.ZodDefault<z.ZodObject<{
            mode: z.ZodDefault<z.ZodEnum<["off", "on", "retain-on-failure", "on-first-retry"]>>;
            screenshots: z.ZodDefault<z.ZodBoolean>;
            snapshots: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            screenshots: boolean;
            snapshots: boolean;
        }, {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            screenshots?: boolean | undefined;
            snapshots?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        screenshots: {
            mode: "off" | "on" | "only-on-failure";
            fullPage: boolean;
            maskPii: boolean;
            piiSelectors: string[];
        };
        outputDir: string;
        video: {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            size?: {
                width: number;
                height: number;
            } | undefined;
        };
        trace: {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            screenshots: boolean;
            snapshots: boolean;
        };
    }, {
        screenshots?: {
            mode?: "off" | "on" | "only-on-failure" | undefined;
            fullPage?: boolean | undefined;
            maskPii?: boolean | undefined;
            piiSelectors?: string[] | undefined;
        } | undefined;
        outputDir?: string | undefined;
        video?: {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            size?: {
                width: number;
                height: number;
            } | undefined;
        } | undefined;
        trace?: {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            screenshots?: boolean | undefined;
            snapshots?: boolean | undefined;
        } | undefined;
    }>>;
    browsers: z.ZodDefault<z.ZodEffects<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodArray<z.ZodEnum<["chromium", "firefox", "webkit"]>, "many">>;
        channel: z.ZodDefault<z.ZodOptional<z.ZodEnum<["bundled", "msedge", "chrome", "chrome-beta", "chrome-dev"]>>>;
        strategy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["auto", "prefer-bundled", "prefer-system", "bundled-only", "system-only"]>>>;
        viewport: z.ZodDefault<z.ZodObject<{
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            width: number;
            height: number;
        }, {
            width: number;
            height: number;
        }>>;
        headless: z.ZodDefault<z.ZodBoolean>;
        slowMo: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: ("chromium" | "firefox" | "webkit")[];
        strategy: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only";
        channel: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev";
        viewport: {
            width: number;
            height: number;
        };
        headless: boolean;
        slowMo?: number | undefined;
    }, {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        strategy?: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only" | undefined;
        channel?: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev" | undefined;
        viewport?: {
            width: number;
            height: number;
        } | undefined;
        headless?: boolean | undefined;
        slowMo?: number | undefined;
    }>, {
        enabled: ("chromium" | "firefox" | "webkit")[];
        strategy: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only";
        channel: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev";
        viewport: {
            width: number;
            height: number;
        };
        headless: boolean;
        slowMo?: number | undefined;
    }, {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        strategy?: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only" | undefined;
        channel?: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev" | undefined;
        viewport?: {
            width: number;
            height: number;
        } | undefined;
        headless?: boolean | undefined;
        slowMo?: number | undefined;
    }>>;
    journeys: z.ZodDefault<z.ZodObject<{
        id: z.ZodDefault<z.ZodObject<{
            prefix: z.ZodDefault<z.ZodString>;
            width: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            prefix: string;
            width: number;
        }, {
            prefix?: string | undefined;
            width?: number | undefined;
        }>>;
        layout: z.ZodDefault<z.ZodEnum<["flat", "staged"]>>;
        backlog: z.ZodDefault<z.ZodObject<{
            groupBy: z.ZodDefault<z.ZodEnum<["tier", "status", "scope"]>>;
            thenBy: z.ZodOptional<z.ZodEnum<["tier", "status", "scope"]>>;
        }, "strip", z.ZodTypeAny, {
            groupBy: "tier" | "status" | "scope";
            thenBy?: "tier" | "status" | "scope" | undefined;
        }, {
            groupBy?: "tier" | "status" | "scope" | undefined;
            thenBy?: "tier" | "status" | "scope" | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: {
            prefix: string;
            width: number;
        };
        layout: "flat" | "staged";
        backlog: {
            groupBy: "tier" | "status" | "scope";
            thenBy?: "tier" | "status" | "scope" | undefined;
        };
    }, {
        id?: {
            prefix?: string | undefined;
            width?: number | undefined;
        } | undefined;
        layout?: "flat" | "staged" | undefined;
        backlog?: {
            groupBy?: "tier" | "status" | "scope" | undefined;
            thenBy?: "tier" | "status" | "scope" | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    auth: {
        provider: "oidc" | "form" | "token" | "custom";
        storageState: {
            directory: string;
            maxAgeMinutes: number;
            filePattern: string;
        };
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                };
                mfa?: {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        bypass?: {
            mode: "none" | "identityless" | "mock-identity" | "unknown";
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    };
    selectors: {
        testIdAttribute: string;
        strategy: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[];
        customTestIds?: string[] | undefined;
    };
    environments: Record<string, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }>;
    version: number;
    app: {
        name: string;
        baseUrl: string;
        type: "spa" | "ssr" | "hybrid";
    };
    activeEnvironment: string;
    assertions: {
        form: {
            errorSelector: string;
            formErrorSelector: string;
        };
        toast: {
            timeout: number;
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
        };
        loading: {
            timeout: number;
            selectors: string[];
        };
    };
    data: {
        namespace: {
            prefix: string;
            suffix: string;
        };
        cleanup: {
            enabled: boolean;
            onFailure: boolean;
            parallel: boolean;
        };
        api?: {
            baseUrl: string;
            useMainAuth: boolean;
        } | undefined;
    };
    fixtures: {
        defaultRole: string;
        roleFixtures: string[];
        api?: {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        } | undefined;
    };
    tiers: Record<string, {
        timeout: number;
        retries: number;
        workers: number;
        tag: string;
    }>;
    reporters: {
        json?: {
            enabled: boolean;
            outputFile: string;
        } | undefined;
        html?: {
            enabled: boolean;
            outputFolder: string;
            open: "always" | "never" | "on-failure";
        } | undefined;
        junit?: {
            enabled: boolean;
            outputFile: string;
        } | undefined;
        artk?: {
            enabled: boolean;
            outputFile: string;
            includeJourneyMapping: boolean;
        } | undefined;
    };
    artifacts: {
        screenshots: {
            mode: "off" | "on" | "only-on-failure";
            fullPage: boolean;
            maskPii: boolean;
            piiSelectors: string[];
        };
        outputDir: string;
        video: {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            size?: {
                width: number;
                height: number;
            } | undefined;
        };
        trace: {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            screenshots: boolean;
            snapshots: boolean;
        };
    };
    browsers: {
        enabled: ("chromium" | "firefox" | "webkit")[];
        strategy: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only";
        channel: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev";
        viewport: {
            width: number;
            height: number;
        };
        headless: boolean;
        slowMo?: number | undefined;
    };
    journeys: {
        id: {
            prefix: string;
            width: number;
        };
        layout: "flat" | "staged";
        backlog: {
            groupBy: "tier" | "status" | "scope";
            thenBy?: "tier" | "status" | "scope" | undefined;
        };
    };
}, {
    auth: {
        provider: "oidc" | "form" | "token" | "custom";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                };
                mfa?: {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        storageState?: {
            directory?: string | undefined;
            maxAgeMinutes?: number | undefined;
            filePattern?: string | undefined;
        } | undefined;
        bypass?: {
            mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    };
    app: {
        name: string;
        baseUrl: string;
        type?: "spa" | "ssr" | "hybrid" | undefined;
    };
    fixtures: {
        defaultRole: string;
        api?: {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        } | undefined;
        roleFixtures?: string[] | undefined;
    };
    selectors?: {
        testIdAttribute?: string | undefined;
        strategy?: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[] | undefined;
        customTestIds?: string[] | undefined;
    } | undefined;
    environments?: Record<string, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }> | undefined;
    version?: number | undefined;
    activeEnvironment?: string | undefined;
    assertions?: {
        form?: {
            errorSelector: string;
            formErrorSelector: string;
        } | undefined;
        toast?: {
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
            timeout?: number | undefined;
        } | undefined;
        loading?: {
            selectors: string[];
            timeout?: number | undefined;
        } | undefined;
    } | undefined;
    data?: {
        namespace?: {
            prefix?: string | undefined;
            suffix?: string | undefined;
        } | undefined;
        cleanup?: {
            enabled?: boolean | undefined;
            onFailure?: boolean | undefined;
            parallel?: boolean | undefined;
        } | undefined;
        api?: {
            baseUrl: string;
            useMainAuth?: boolean | undefined;
        } | undefined;
    } | undefined;
    tiers?: Record<string, {
        timeout: number;
        retries: number;
        workers: number;
        tag: string;
    }> | undefined;
    reporters?: {
        json?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        } | undefined;
        html?: {
            enabled?: boolean | undefined;
            outputFolder?: string | undefined;
            open?: "always" | "never" | "on-failure" | undefined;
        } | undefined;
        junit?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        } | undefined;
        artk?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
            includeJourneyMapping?: boolean | undefined;
        } | undefined;
    } | undefined;
    artifacts?: {
        screenshots?: {
            mode?: "off" | "on" | "only-on-failure" | undefined;
            fullPage?: boolean | undefined;
            maskPii?: boolean | undefined;
            piiSelectors?: string[] | undefined;
        } | undefined;
        outputDir?: string | undefined;
        video?: {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            size?: {
                width: number;
                height: number;
            } | undefined;
        } | undefined;
        trace?: {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            screenshots?: boolean | undefined;
            snapshots?: boolean | undefined;
        } | undefined;
    } | undefined;
    browsers?: {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        strategy?: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only" | undefined;
        channel?: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev" | undefined;
        viewport?: {
            width: number;
            height: number;
        } | undefined;
        headless?: boolean | undefined;
        slowMo?: number | undefined;
    } | undefined;
    journeys?: {
        id?: {
            prefix?: string | undefined;
            width?: number | undefined;
        } | undefined;
        layout?: "flat" | "staged" | undefined;
        backlog?: {
            groupBy?: "tier" | "status" | "scope" | undefined;
            thenBy?: "tier" | "status" | "scope" | undefined;
        } | undefined;
    } | undefined;
}>, {
    auth: {
        provider: "oidc" | "form" | "token" | "custom";
        storageState: {
            directory: string;
            maxAgeMinutes: number;
            filePattern: string;
        };
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                };
                mfa?: {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        bypass?: {
            mode: "none" | "identityless" | "mock-identity" | "unknown";
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    };
    selectors: {
        testIdAttribute: string;
        strategy: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[];
        customTestIds?: string[] | undefined;
    };
    environments: Record<string, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }>;
    version: number;
    app: {
        name: string;
        baseUrl: string;
        type: "spa" | "ssr" | "hybrid";
    };
    activeEnvironment: string;
    assertions: {
        form: {
            errorSelector: string;
            formErrorSelector: string;
        };
        toast: {
            timeout: number;
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
        };
        loading: {
            timeout: number;
            selectors: string[];
        };
    };
    data: {
        namespace: {
            prefix: string;
            suffix: string;
        };
        cleanup: {
            enabled: boolean;
            onFailure: boolean;
            parallel: boolean;
        };
        api?: {
            baseUrl: string;
            useMainAuth: boolean;
        } | undefined;
    };
    fixtures: {
        defaultRole: string;
        roleFixtures: string[];
        api?: {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        } | undefined;
    };
    tiers: Record<string, {
        timeout: number;
        retries: number;
        workers: number;
        tag: string;
    }>;
    reporters: {
        json?: {
            enabled: boolean;
            outputFile: string;
        } | undefined;
        html?: {
            enabled: boolean;
            outputFolder: string;
            open: "always" | "never" | "on-failure";
        } | undefined;
        junit?: {
            enabled: boolean;
            outputFile: string;
        } | undefined;
        artk?: {
            enabled: boolean;
            outputFile: string;
            includeJourneyMapping: boolean;
        } | undefined;
    };
    artifacts: {
        screenshots: {
            mode: "off" | "on" | "only-on-failure";
            fullPage: boolean;
            maskPii: boolean;
            piiSelectors: string[];
        };
        outputDir: string;
        video: {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            size?: {
                width: number;
                height: number;
            } | undefined;
        };
        trace: {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            screenshots: boolean;
            snapshots: boolean;
        };
    };
    browsers: {
        enabled: ("chromium" | "firefox" | "webkit")[];
        strategy: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only";
        channel: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev";
        viewport: {
            width: number;
            height: number;
        };
        headless: boolean;
        slowMo?: number | undefined;
    };
    journeys: {
        id: {
            prefix: string;
            width: number;
        };
        layout: "flat" | "staged";
        backlog: {
            groupBy: "tier" | "status" | "scope";
            thenBy?: "tier" | "status" | "scope" | undefined;
        };
    };
}, {
    auth: {
        provider: "oidc" | "form" | "token" | "custom";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                };
                mfa?: {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        storageState?: {
            directory?: string | undefined;
            maxAgeMinutes?: number | undefined;
            filePattern?: string | undefined;
        } | undefined;
        bypass?: {
            mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    };
    app: {
        name: string;
        baseUrl: string;
        type?: "spa" | "ssr" | "hybrid" | undefined;
    };
    fixtures: {
        defaultRole: string;
        api?: {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        } | undefined;
        roleFixtures?: string[] | undefined;
    };
    selectors?: {
        testIdAttribute?: string | undefined;
        strategy?: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[] | undefined;
        customTestIds?: string[] | undefined;
    } | undefined;
    environments?: Record<string, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }> | undefined;
    version?: number | undefined;
    activeEnvironment?: string | undefined;
    assertions?: {
        form?: {
            errorSelector: string;
            formErrorSelector: string;
        } | undefined;
        toast?: {
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
            timeout?: number | undefined;
        } | undefined;
        loading?: {
            selectors: string[];
            timeout?: number | undefined;
        } | undefined;
    } | undefined;
    data?: {
        namespace?: {
            prefix?: string | undefined;
            suffix?: string | undefined;
        } | undefined;
        cleanup?: {
            enabled?: boolean | undefined;
            onFailure?: boolean | undefined;
            parallel?: boolean | undefined;
        } | undefined;
        api?: {
            baseUrl: string;
            useMainAuth?: boolean | undefined;
        } | undefined;
    } | undefined;
    tiers?: Record<string, {
        timeout: number;
        retries: number;
        workers: number;
        tag: string;
    }> | undefined;
    reporters?: {
        json?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        } | undefined;
        html?: {
            enabled?: boolean | undefined;
            outputFolder?: string | undefined;
            open?: "always" | "never" | "on-failure" | undefined;
        } | undefined;
        junit?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        } | undefined;
        artk?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
            includeJourneyMapping?: boolean | undefined;
        } | undefined;
    } | undefined;
    artifacts?: {
        screenshots?: {
            mode?: "off" | "on" | "only-on-failure" | undefined;
            fullPage?: boolean | undefined;
            maskPii?: boolean | undefined;
            piiSelectors?: string[] | undefined;
        } | undefined;
        outputDir?: string | undefined;
        video?: {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            size?: {
                width: number;
                height: number;
            } | undefined;
        } | undefined;
        trace?: {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            screenshots?: boolean | undefined;
            snapshots?: boolean | undefined;
        } | undefined;
    } | undefined;
    browsers?: {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        strategy?: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only" | undefined;
        channel?: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev" | undefined;
        viewport?: {
            width: number;
            height: number;
        } | undefined;
        headless?: boolean | undefined;
        slowMo?: number | undefined;
    } | undefined;
    journeys?: {
        id?: {
            prefix?: string | undefined;
            width?: number | undefined;
        } | undefined;
        layout?: "flat" | "staged" | undefined;
        backlog?: {
            groupBy?: "tier" | "status" | "scope" | undefined;
            thenBy?: "tier" | "status" | "scope" | undefined;
        } | undefined;
    } | undefined;
}>;
/** Inferred type from ARTKConfigSchema */
type ARTKConfigInput = z.input<typeof ARTKConfigSchema>;
/** Validated ARTKConfig type */
type ARTKConfigOutput = z.output<typeof ARTKConfigSchema>;

/**
 * Default values for optional configuration fields
 *
 * These defaults are applied when fields are not explicitly specified
 * in the artk.config.yml file.
 *
 * @module config/defaults
 */

/** Default application type */
declare const DEFAULT_APP_TYPE: AppType;
/** Default storage state configuration */
declare const DEFAULT_STORAGE_STATE: StorageStateConfig;
/** Default OIDC success timeout in ms */
declare const DEFAULT_OIDC_SUCCESS_TIMEOUT: 5000;
/** Default MFA type */
declare const DEFAULT_MFA_TYPE: MFAType;
/** Default MFA enabled state */
declare const DEFAULT_MFA_ENABLED = false;
/** Default push timeout in ms */
declare const DEFAULT_PUSH_TIMEOUT_MS: 60000;
/** Default OIDC login flow timeout in ms */
declare const DEFAULT_LOGIN_FLOW_MS: 30000;
/** Default IdP redirect timeout in ms */
declare const DEFAULT_IDP_REDIRECT_MS: 10000;
/** Default callback timeout in ms */
declare const DEFAULT_CALLBACK_MS: 5000;
/** Default locator strategy order */
declare const DEFAULT_LOCATOR_STRATEGY: readonly LocatorStrategy[];
/** Default test ID attribute */
declare const DEFAULT_TEST_ID_ATTRIBUTE = "data-testid";
/** Default selectors configuration */
declare const DEFAULT_SELECTORS: SelectorsConfig;
/** Default toast timeout in ms */
declare const DEFAULT_TOAST_TIMEOUT: 5000;
/** Default loading timeout in ms */
declare const DEFAULT_LOADING_TIMEOUT: 30000;
/** Default assertions configuration */
declare const DEFAULT_ASSERTIONS: AssertionsConfig;
/** Default namespace prefix */
declare const DEFAULT_NAMESPACE_PREFIX = "[artk-";
/** Default namespace suffix */
declare const DEFAULT_NAMESPACE_SUFFIX = "]";
/** Default data configuration */
declare const DEFAULT_DATA: DataConfig;
/** Default tier configurations */
declare const DEFAULT_TIERS: Readonly<Record<string, TierConfig>>;
/** Default reporter open mode */
declare const DEFAULT_REPORTER_OPEN: ReporterOpenMode;
/** Default reporters configuration */
declare const DEFAULT_REPORTERS: ReportersConfig;
/** Default screenshot mode */
declare const DEFAULT_SCREENSHOT_MODE: ScreenshotMode;
/** Default video/trace capture mode */
declare const DEFAULT_CAPTURE_MODE: CaptureMode;
/** Default artifacts configuration */
declare const DEFAULT_ARTIFACTS: ArtifactsConfig;
/** Default viewport width */
declare const DEFAULT_VIEWPORT_WIDTH = 1280;
/** Default viewport height */
declare const DEFAULT_VIEWPORT_HEIGHT = 720;
/** Default browsers configuration */
declare const DEFAULT_BROWSERS: BrowsersConfig;
/** Default journey ID prefix */
declare const DEFAULT_JOURNEY_ID_PREFIX = "JRN";
/** Default journey ID width */
declare const DEFAULT_JOURNEY_ID_WIDTH = 4;
/** Default journeys configuration */
declare const DEFAULT_JOURNEYS: JourneysConfig;
/** Supported configuration schema version */
declare const SUPPORTED_CONFIG_VERSION = 1;

export { type ARTKConfigInput, type ARTKConfigOutput, ARTKConfigSchema, AppConfigSchema, AppType, ArtifactsConfig, ArtifactsConfigSchema, ArtkReporterConfigSchema, AssertionsConfig, AssertionsConfigSchema, AuthConfigSchema, BrowsersConfig, BrowsersConfigSchema, CaptureMode, CleanupConfigSchema, CredentialsEnvConfigSchema, DEFAULT_APP_TYPE, DEFAULT_ARTIFACTS, DEFAULT_ASSERTIONS, DEFAULT_BROWSERS, DEFAULT_CALLBACK_MS, DEFAULT_CAPTURE_MODE, DEFAULT_DATA, DEFAULT_IDP_REDIRECT_MS, DEFAULT_JOURNEYS, DEFAULT_JOURNEY_ID_PREFIX, DEFAULT_JOURNEY_ID_WIDTH, DEFAULT_LOADING_TIMEOUT, DEFAULT_LOCATOR_STRATEGY, DEFAULT_LOGIN_FLOW_MS, DEFAULT_MFA_ENABLED, DEFAULT_MFA_TYPE, DEFAULT_NAMESPACE_PREFIX, DEFAULT_NAMESPACE_SUFFIX, DEFAULT_OIDC_SUCCESS_TIMEOUT, DEFAULT_PUSH_TIMEOUT_MS, DEFAULT_REPORTERS, DEFAULT_REPORTER_OPEN, DEFAULT_SCREENSHOT_MODE, DEFAULT_SELECTORS, DEFAULT_STORAGE_STATE, DEFAULT_TEST_ID_ATTRIBUTE, DEFAULT_TIERS, DEFAULT_TOAST_TIMEOUT, DEFAULT_VIEWPORT_HEIGHT, DEFAULT_VIEWPORT_WIDTH, DataApiConfigSchema, DataConfig, DataConfigSchema, EnvVarNotFoundError, type EnvVarRef, EnvironmentConfigSchema, EnvironmentsSchema, FixturesApiConfigSchema, FixturesConfigSchema, FormAssertionConfigSchema, FormAuthConfigSchema, FormAuthSelectorsSchema, FormAuthSuccessConfigSchema, HtmlReporterConfigSchema, JourneyBacklogConfigSchema, JourneyIdConfigSchema, JourneysConfig, JourneysConfigSchema, JsonReporterConfigSchema, JunitReporterConfigSchema, LoadingAssertionConfigSchema, LocatorStrategy, MFAConfigSchema, MFAType, NamespaceConfigSchema, OIDCConfigSchema, OIDCIdpSelectorsSchema, OIDCLogoutConfigSchema, OIDCSuccessConfigSchema, OIDCTimeoutsSchema, ReporterOpenMode, ReportersConfig, ReportersConfigSchema, type ResolveOptions, RoleConfigSchema, RolesSchema, SUPPORTED_CONFIG_VERSION, ScreenshotMode, ScreenshotsConfigSchema, SelectorsConfig, SelectorsConfigSchema, StorageStateConfig, StorageStateConfigSchema, TierConfig, TierConfigSchema, TiersSchema, ToastAssertionConfigSchema, TraceConfigSchema, VideoConfigSchema, VideoSizeSchema, ViewportSizeSchema, createMissingEnvVarsError, findEnvVarRefs, getMissingEnvVars, hasEnvVarRefs, parseEnvVarRef, resolveEnvVarRef, resolveEnvVars, resolveEnvVarsInObject };
