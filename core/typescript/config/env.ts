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
import { createLogger } from '../utils/logger.js';

const logger = createLogger('config', 'envResolver');

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
export class EnvVarNotFoundError extends Error {
  constructor(
    public readonly varName: string,
    public readonly fieldPath?: string
  ) {
    super(`Environment variable "${varName}" is not defined`);
    this.name = 'EnvVarNotFoundError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnvVarNotFoundError);
    }
  }
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
export function parseEnvVarRef(ref: string): EnvVarRef | undefined {
  const singleMatch = /^\$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}$/i.exec(ref);

  if (!singleMatch) {
    return undefined;
  }

  const varName = singleMatch[1];
  const defaultValue = singleMatch[3];

  if (varName === undefined) {
    return undefined;
  }

  return {
    match: ref,
    varName,
    defaultValue,
    hasDefault: singleMatch[2] !== undefined,
  };
}

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
export function findEnvVarRefs(value: string): readonly EnvVarRef[] {
  const refs: EnvVarRef[] = [];
  const pattern = /\$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value)) !== null) {
    const varName = match[1];

    if (varName === undefined) {
      continue;
    }

    refs.push({
      match: match[0],
      varName,
      defaultValue: match[3],
      hasDefault: match[2] !== undefined,
    });
  }

  return refs;
}

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
export function resolveEnvVarRef(
  ref: EnvVarRef,
  options: ResolveOptions = {}
): string {
  const { env = process.env, fieldPath, throwOnMissing = true } = options;
  const value = env[ref.varName];

  if (value !== undefined && value !== '') {
    logger.debug(`Resolved env var ${ref.varName}`, {
      fieldPath,
      hasValue: true,
    });
    return value;
  }

  if (ref.hasDefault && ref.defaultValue !== undefined) {
    logger.debug(`Using default for ${ref.varName}`, {
      fieldPath,
      defaultValue: ref.defaultValue,
    });
    return ref.defaultValue;
  }

  if (throwOnMissing) {
    throw new EnvVarNotFoundError(ref.varName, fieldPath);
  }

  return ref.match;
}

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
export function resolveEnvVars(
  value: string,
  options: ResolveOptions = {}
): string {
  const refs = findEnvVarRefs(value);

  if (refs.length === 0) {
    return value;
  }

  let result = value;

  for (const ref of refs) {
    const resolved = resolveEnvVarRef(ref, options);
    result = result.replace(ref.match, resolved);
  }

  return result;
}

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
export function hasEnvVarRefs(value: string): boolean {
  // Create a new regex to avoid global state issues with lastIndex
  const pattern = /\$\{[A-Z_][A-Z0-9_]*(:-[^}]*)?\}/i;
  return pattern.test(value);
}

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
export function resolveEnvVarsInObject<T>(
  obj: T,
  options: ResolveOptions = {},
  currentPath: string = ''
): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return resolveEnvVars(obj, {
      ...options,
      fieldPath: currentPath || options.fieldPath,
    }) as T;
  }

  if (Array.isArray(obj)) {
    const resolved: unknown[] = obj.map((item: unknown, index: number) =>
      resolveEnvVarsInObject(item, options, `${currentPath}[${index}]`)
    );
    return resolved as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const path = currentPath ? `${currentPath}.${key}` : key;
      result[key] = resolveEnvVarsInObject(value, options, path);
    }

    return result as T;
  }

  return obj;
}

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
export function getMissingEnvVars(
  value: unknown,
  env: Record<string, string | undefined> = process.env
): readonly { varName: string; fieldPath: string }[] {
  const missing: { varName: string; fieldPath: string }[] = [];

  function check(val: unknown, path: string): void {
    if (typeof val === 'string') {
      const refs = findEnvVarRefs(val);
      for (const ref of refs) {
        if (!ref.hasDefault && (env[ref.varName] === undefined || env[ref.varName] === '')) {
          missing.push({ varName: ref.varName, fieldPath: path });
        }
      }
    } else if (Array.isArray(val)) {
      val.forEach((item, index) => check(item, `${path}[${index}]`));
    } else if (val !== null && typeof val === 'object') {
      for (const [key, childVal] of Object.entries(val)) {
        check(childVal, path ? `${path}.${key}` : key);
      }
    }
  }

  check(value, '');
  return missing;
}

/**
 * Convert missing env vars to ARTKConfigError
 *
 * @param missing - Array of missing variables
 * @returns ARTKConfigError with details
 */
export function createMissingEnvVarsError(
  missing: readonly { varName: string; fieldPath: string }[]
): ARTKConfigError {
  const varNames = [...new Set(missing.map((m) => m.varName))];
  const fieldPaths = missing.map((m) => m.fieldPath);

  const firstMissing = missing[0];
  const message =
    missing.length === 1 && firstMissing
      ? `Missing required environment variable: ${firstMissing.varName}`
      : `Missing required environment variables: ${varNames.join(', ')}`;

  const suggestion =
    missing.length === 1 && firstMissing
      ? `Set the ${firstMissing.varName} environment variable or provide a default value using \${${firstMissing.varName}:-default}`
      : `Set these environment variables or provide default values using \${VAR:-default} syntax`;

  return new ARTKConfigError(message, fieldPaths.join(', '), suggestion);
}
