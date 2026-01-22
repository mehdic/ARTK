"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodedError = void 0;
exports.ok = ok;
exports.err = err;
exports.isOk = isOk;
exports.isErr = isErr;
exports.unwrap = unwrap;
exports.unwrapOr = unwrapOr;
exports.map = map;
exports.mapErr = mapErr;
exports.andThen = andThen;
exports.collect = collect;
exports.partition = partition;
exports.tryCatch = tryCatch;
exports.tryCatchAsync = tryCatchAsync;
exports.codedError = codedError;
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
function ok(value, warnings) {
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
function err(error) {
    return { success: false, error };
}
/**
 * Check if a result is successful
 *
 * @param result - The result to check
 * @returns True if the result is successful
 */
function isOk(result) {
    return result.success;
}
/**
 * Check if a result is a failure
 *
 * @param result - The result to check
 * @returns True if the result is a failure
 */
function isErr(result) {
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
function unwrap(result, errorMessage) {
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
function unwrapOr(result, defaultValue) {
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
function map(result, fn) {
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
function mapErr(result, fn) {
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
function andThen(result, fn) {
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
function collect(results) {
    const values = [];
    const allWarnings = [];
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
function partition(results) {
    const values = [];
    const errors = [];
    const warnings = [];
    for (const result of results) {
        if (result.success) {
            values.push(result.value);
            if (result.warnings) {
                warnings.push(...result.warnings);
            }
        }
        else {
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
function tryCatch(fn) {
    try {
        return ok(fn());
    }
    catch (error) {
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
async function tryCatchAsync(fn) {
    try {
        return ok(await fn());
    }
    catch (error) {
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
class CodedError extends Error {
    code;
    details;
    constructor(code, message, details) {
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
    static create(code, message, details) {
        return new CodedError(code, message, details);
    }
    /**
     * Convert to plain object (for serialization/logging)
     */
    toJSON() {
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
    toString() {
        const base = `[${this.code}] ${this.message}`;
        if (this.details) {
            return `${base} ${JSON.stringify(this.details)}`;
        }
        return base;
    }
}
exports.CodedError = CodedError;
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
function codedError(code, message, details) {
    return new CodedError(code, message, details);
}
//# sourceMappingURL=result.js.map