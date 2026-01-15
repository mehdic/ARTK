/**
 * Result type pattern for structured error handling
 *
 * Replaces boolean returns with structured results that include:
 * - Success/failure status
 * - Value on success
 * - Error information on failure
 * - Optional warnings for partial success cases
 *
 * @see research/2026-01-15_code_quality_standards.md Category 2 (Silent Failures)
 */

/**
 * A Result type representing either success with a value or failure with an error
 *
 * @example
 * ```typescript
 * function parseConfig(path: string): Result<Config, ConfigError> {
 *   if (!fileExists(path)) {
 *     return { success: false, error: { code: 'NOT_FOUND', message: 'Config file not found' } };
 *   }
 *   const config = JSON.parse(readFile(path));
 *   return { success: true, value: config };
 * }
 *
 * const result = parseConfig('config.json');
 * if (result.success) {
 *   console.log(result.value); // Config object
 * } else {
 *   console.error(result.error); // ConfigError
 * }
 * ```
 */
export type Result<T, E = string> =
  | { success: true; value: T; warnings?: string[] }
  | { success: false; error: E };

/**
 * Create a successful result
 *
 * @param value - The success value
 * @param warnings - Optional warnings to include
 * @returns A success Result
 *
 * @example
 * ```typescript
 * return ok({ name: 'test', count: 5 });
 * return ok(true, ['Some warning about the operation']);
 * ```
 */
export function ok<T>(value: T, warnings?: string[]): Result<T, never> {
  return warnings?.length
    ? { success: true, value, warnings }
    : { success: true, value };
}

/**
 * Create a failed result
 *
 * @param error - The error information
 * @returns A failure Result
 *
 * @example
 * ```typescript
 * return err('File not found');
 * return err({ code: 'NOT_FOUND', path: '/missing.txt' });
 * ```
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Check if a result is successful
 *
 * @param result - The result to check
 * @returns True if the result is successful
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; value: T; warnings?: string[] } {
  return result.success;
}

/**
 * Check if a result is a failure
 *
 * @param result - The result to check
 * @returns True if the result is a failure
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

/**
 * Unwrap a result, throwing if it's a failure
 *
 * @param result - The result to unwrap
 * @param errorMessage - Optional custom error message
 * @returns The success value
 * @throws Error if the result is a failure
 *
 * @example
 * ```typescript
 * const config = unwrap(parseConfig('config.json'));
 * // Throws if parsing failed
 * ```
 */
export function unwrap<T, E>(result: Result<T, E>, errorMessage?: string): T {
  if (result.success) {
    return result.value;
  }
  const message = errorMessage
    ? `${errorMessage}: ${String(result.error)}`
    : String(result.error);
  throw new Error(message);
}

/**
 * Unwrap a result or return a default value
 *
 * @param result - The result to unwrap
 * @param defaultValue - The default value to return on failure
 * @returns The success value or default
 *
 * @example
 * ```typescript
 * const config = unwrapOr(parseConfig('config.json'), defaultConfig);
 * ```
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.success ? result.value : defaultValue;
}

/**
 * Map a successful result to a new value
 *
 * @param result - The result to map
 * @param fn - The mapping function
 * @returns A new result with the mapped value
 *
 * @example
 * ```typescript
 * const nameResult = map(parseConfig('config.json'), config => config.name);
 * ```
 */
export function map<T, U, E>(result: Result<T, E>, fn: (_value: T) => U): Result<U, E> {
  if (result.success) {
    return ok(fn(result.value), result.warnings);
  }
  return result;
}

/**
 * Map a failed result to a new error
 *
 * @param result - The result to map
 * @param fn - The error mapping function
 * @returns A new result with the mapped error
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (_error: E) => F): Result<T, F> {
  if (!result.success) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Chain result operations (flatMap)
 *
 * @param result - The result to chain from
 * @param fn - The function returning a new result
 * @returns The chained result
 *
 * @example
 * ```typescript
 * const result = andThen(
 *   parseConfig('config.json'),
 *   config => validateConfig(config)
 * );
 * ```
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (_value: T) => Result<U, E>
): Result<U, E> {
  if (result.success) {
    const newResult = fn(result.value);
    // Merge warnings
    if (newResult.success && result.warnings?.length) {
      return ok(newResult.value, [
        ...result.warnings,
        ...(newResult.warnings || []),
      ]);
    }
    return newResult;
  }
  return result;
}

/**
 * Collect an array of results into a result of an array
 *
 * @param results - Array of results to collect
 * @returns A single result containing all values or the first error
 *
 * @example
 * ```typescript
 * const configs = collect([
 *   parseConfig('a.json'),
 *   parseConfig('b.json'),
 *   parseConfig('c.json'),
 * ]);
 * // Either Result<Config[], E> with all configs or first error
 * ```
 */
export function collect<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  const allWarnings: string[] = [];

  for (const result of results) {
    if (!result.success) {
      return result;
    }
    values.push(result.value);
    if (result.warnings) {
      allWarnings.push(...result.warnings);
    }
  }

  return allWarnings.length > 0
    ? ok(values, allWarnings)
    : ok(values);
}

/**
 * Partition an array of results into successes and failures
 *
 * @param results - Array of results to partition
 * @returns Object with values and errors arrays
 *
 * @example
 * ```typescript
 * const { values, errors } = partition([
 *   parseConfig('a.json'),
 *   parseConfig('b.json'),
 *   parseConfig('c.json'),
 * ]);
 * console.log(`${values.length} succeeded, ${errors.length} failed`);
 * ```
 */
export function partition<T, E>(
  results: Result<T, E>[]
): { values: T[]; errors: E[]; warnings: string[] } {
  const values: T[] = [];
  const errors: E[] = [];
  const warnings: string[] = [];

  for (const result of results) {
    if (result.success) {
      values.push(result.value);
      if (result.warnings) {
        warnings.push(...result.warnings);
      }
    } else {
      errors.push(result.error);
    }
  }

  return { values, errors, warnings };
}

/**
 * Try to execute a function and wrap the result
 *
 * @param fn - Function to execute
 * @returns Result with the return value or caught error
 *
 * @example
 * ```typescript
 * const result = tryCatch(() => JSON.parse(jsonString));
 * if (result.success) {
 *   console.log(result.value);
 * } else {
 *   console.error('Parse failed:', result.error);
 * }
 * ```
 */
export function tryCatch<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Try to execute an async function and wrap the result
 *
 * @param fn - Async function to execute
 * @returns Promise of Result with the return value or caught error
 *
 * @example
 * ```typescript
 * const result = await tryCatchAsync(() => fetch('/api/data').then(r => r.json()));
 * ```
 */
export async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try {
    return ok(await fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Error class with code, message, and optional details.
 *
 * Can be used both with Result type and thrown directly.
 * Extends Error to provide proper stack traces and instanceof checks.
 *
 * @example
 * ```typescript
 * // With Result type
 * return err(new CodedError('NOT_FOUND', 'File not found', { path: '/missing.txt' }));
 *
 * // Thrown directly
 * throw new CodedError('VALIDATION_ERROR', 'Invalid input');
 *
 * // Caught with instanceof
 * try {
 *   riskyOperation();
 * } catch (error) {
 *   if (error instanceof CodedError) {
 *     console.error(`[${error.code}] ${error.message}`);
 *   }
 * }
 * ```
 */
export class CodedError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'CodedError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace in V8 environments (Node.js, Chrome)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CodedError);
    }
  }

  /**
   * Create a CodedError (convenience factory, same as constructor)
   */
  static create(code: string, message: string, details?: Record<string, unknown>): CodedError {
    return new CodedError(code, message, details);
  }

  /**
   * Convert to plain object (for serialization/logging)
   */
  toJSON(): { code: string; message: string; details?: Record<string, unknown>; stack?: string } {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
      ...(this.stack && { stack: this.stack }),
    };
  }

  /**
   * Format error for display
   */
  toString(): string {
    const base = `[${this.code}] ${this.message}`;
    if (this.details) {
      return `${base} ${JSON.stringify(this.details)}`;
    }
    return base;
  }
}

/**
 * Create a coded error (convenience factory function)
 *
 * @param code - Error code (e.g., 'NOT_FOUND', 'VALIDATION_ERROR')
 * @param message - Human-readable error message
 * @param details - Optional additional details
 * @returns A CodedError instance
 *
 * @example
 * ```typescript
 * return err(codedError('PARSE_ERROR', 'Invalid JSON', { line: 42 }));
 * ```
 */
export function codedError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): CodedError {
  return new CodedError(code, message, details);
}
