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
import { ARTKConfigError } from '../errors/config-error.js';
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
export declare class EnvVarNotFoundError extends Error {
    readonly varName: string;
    readonly fieldPath?: string | undefined;
    constructor(varName: string, fieldPath?: string | undefined);
}
/**
 * Result of parsing an environment variable reference
 */
export interface EnvVarRef {
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
export declare function parseEnvVarRef(ref: string): EnvVarRef | undefined;
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
export declare function findEnvVarRefs(value: string): readonly EnvVarRef[];
/**
 * Options for resolving environment variables
 */
export interface ResolveOptions {
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
export declare function resolveEnvVarRef(ref: EnvVarRef, options?: ResolveOptions): string;
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
export declare function resolveEnvVars(value: string, options?: ResolveOptions): string;
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
export declare function hasEnvVarRefs(value: string): boolean;
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
export declare function resolveEnvVarsInObject<T>(obj: T, options?: ResolveOptions, currentPath?: string): T;
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
export declare function getMissingEnvVars(value: unknown, env?: Record<string, string | undefined>): readonly {
    varName: string;
    fieldPath: string;
}[];
/**
 * Convert missing env vars to ARTKConfigError
 *
 * @param missing - Array of missing variables
 * @returns ARTKConfigError with details
 */
export declare function createMissingEnvVarsError(missing: readonly {
    varName: string;
    fieldPath: string;
}[]): ARTKConfigError;
//# sourceMappingURL=env.d.ts.map