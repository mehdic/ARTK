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
export type Result<T, E = string> = {
    success: true;
    value: T;
    warnings?: string[];
} | {
    success: false;
    error: E;
};
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
export declare function ok<T>(value: T, warnings?: string[]): Result<T, never>;
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
export declare function err<E>(error: E): Result<never, E>;
/**
 * Check if a result is successful
 *
 * @param result - The result to check
 * @returns True if the result is successful
 */
export declare function isOk<T, E>(result: Result<T, E>): result is {
    success: true;
    value: T;
    warnings?: string[];
};
/**
 * Check if a result is a failure
 *
 * @param result - The result to check
 * @returns True if the result is a failure
 */
export declare function isErr<T, E>(result: Result<T, E>): result is {
    success: false;
    error: E;
};
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
export declare function unwrap<T, E>(result: Result<T, E>, errorMessage?: string): T;
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
export declare function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T;
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
export declare function map<T, U, E>(result: Result<T, E>, fn: (_value: T) => U): Result<U, E>;
/**
 * Map a failed result to a new error
 *
 * @param result - The result to map
 * @param fn - The error mapping function
 * @returns A new result with the mapped error
 */
export declare function mapErr<T, E, F>(result: Result<T, E>, fn: (_error: E) => F): Result<T, F>;
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
export declare function andThen<T, U, E>(result: Result<T, E>, fn: (_value: T) => Result<U, E>): Result<U, E>;
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
export declare function collect<T, E>(results: Result<T, E>[]): Result<T[], E>;
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
export declare function partition<T, E>(results: Result<T, E>[]): {
    values: T[];
    errors: E[];
    warnings: string[];
};
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
export declare function tryCatch<T>(fn: () => T): Result<T, Error>;
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
export declare function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>>;
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
export declare class CodedError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown>;
    constructor(code: string, message: string, details?: Record<string, unknown>);
    /**
     * Create a CodedError (convenience factory, same as constructor)
     */
    static create(code: string, message: string, details?: Record<string, unknown>): CodedError;
    /**
     * Convert to plain object (for serialization/logging)
     */
    toJSON(): {
        code: string;
        message: string;
        details?: Record<string, unknown>;
        stack?: string;
    };
    /**
     * Format error for display
     */
    toString(): string;
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
export declare function codedError(code: string, message: string, details?: Record<string, unknown>): CodedError;
//# sourceMappingURL=result.d.ts.map