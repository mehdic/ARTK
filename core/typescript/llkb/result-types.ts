/**
 * Standardized Result Types for LLKB Operations
 *
 * Provides consistent error handling and result types across all LLKB modules.
 * All operations return LLKBResult<T> with success flag, optional data, errors, and warnings.
 *
 * @module llkb/result-types
 */

/**
 * Standardized result type for LLKB operations
 *
 * @template T - The type of data returned on success
 */
export interface LLKBResult<T> {
  /** Whether the operation succeeded */
  success: boolean;

  /** Data returned on success (undefined on failure) */
  data?: T;

  /** Error message on failure (undefined on success) */
  error?: string;

  /** Non-fatal warnings (present on success or failure) */
  warnings: string[];
}

/**
 * Create a successful result with data
 *
 * @template T - The type of data being returned
 * @param data - The successful result data
 * @param warnings - Optional non-fatal warnings
 * @returns LLKBResult indicating success
 *
 * @example
 * ```typescript
 * const result = ok({ count: 5 }, ['Item A skipped']);
 * // { success: true, data: { count: 5 }, warnings: ['Item A skipped'] }
 * ```
 */
export function ok<T>(data: T, warnings: string[] = []): LLKBResult<T> {
  return {
    success: true,
    data,
    warnings,
  };
}

/**
 * Create a failed result with error
 *
 * @template T - The type that would have been returned on success
 * @param error - The error message describing the failure
 * @param warnings - Optional non-fatal warnings
 * @returns LLKBResult indicating failure
 *
 * @example
 * ```typescript
 * const result = fail<number>('File not found');
 * // { success: false, error: 'File not found', warnings: [] }
 * ```
 */
export function fail<T>(error: string, warnings: string[] = []): LLKBResult<T> {
  return {
    success: false,
    error,
    warnings,
  };
}

/**
 * Create a result from a try-catch block
 *
 * @template T - The type of data being returned
 * @param fn - The function to execute
 * @param errorMessage - Optional custom error message prefix
 * @returns LLKBResult with success or failure
 *
 * @example
 * ```typescript
 * const result = tryCatch(
 *   () => JSON.parse(text),
 *   'Failed to parse JSON'
 * );
 * ```
 */
export function tryCatch<T>(
  fn: () => T,
  errorMessage?: string
): LLKBResult<T> {
  try {
    const data = fn();
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fullMessage = errorMessage ? `${errorMessage}: ${message}` : message;
    return fail(fullMessage);
  }
}

/**
 * Map a successful result to a new type
 *
 * @template T - Original data type
 * @template U - New data type
 * @param result - The result to map
 * @param mapper - Function to transform the data
 * @returns New LLKBResult with mapped data or original error
 *
 * @example
 * ```typescript
 * const numResult: LLKBResult<number> = ok(5);
 * const strResult = mapResult(numResult, n => n.toString());
 * // { success: true, data: '5', warnings: [] }
 * ```
 */
export function mapResult<T, U>(
  result: LLKBResult<T>,
  mapper: (data: T) => U
): LLKBResult<U> {
  if (!result.success) {
    return {
      success: false,
      error: result.error,
      warnings: result.warnings,
    };
  }

  try {
    const mappedData = mapper(result.data as T);
    return ok(mappedData, result.warnings);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(`Mapping failed: ${message}`, result.warnings);
  }
}

/**
 * Combine multiple results into one
 *
 * If any result fails, returns the first failure.
 * If all succeed, combines data into an array.
 * Warnings are accumulated from all results.
 *
 * @template T - The type of data in the results
 * @param results - Array of results to combine
 * @returns Combined result with all data or first error
 *
 * @example
 * ```typescript
 * const r1 = ok(1);
 * const r2 = ok(2, ['warning']);
 * const combined = combineResults([r1, r2]);
 * // { success: true, data: [1, 2], warnings: ['warning'] }
 * ```
 */
export function combineResults<T>(
  results: Array<LLKBResult<T>>
): LLKBResult<T[]> {
  const allWarnings: string[] = [];
  const allData: T[] = [];

  for (const result of results) {
    allWarnings.push(...result.warnings);

    if (!result.success) {
      return fail(result.error ?? 'Unknown error', allWarnings);
    }

    if (result.data !== undefined) {
      allData.push(result.data);
    }
  }

  return ok(allData, allWarnings);
}

/**
 * Check if a result is successful and has data
 *
 * Type guard that narrows the result type to successful with data.
 *
 * @template T - The type of data in the result
 * @param result - The result to check
 * @returns True if successful with data, false otherwise
 *
 * @example
 * ```typescript
 * const result = ok(5);
 * if (isOk(result)) {
 *   console.log(result.data); // TypeScript knows data is defined
 * }
 * ```
 */
export function isOk<T>(result: LLKBResult<T>): result is LLKBResult<T> & { data: T } {
  return result.success && result.data !== undefined;
}

/**
 * Check if a result is a failure
 *
 * Type guard that narrows the result type to failed with error.
 *
 * @template T - The type of data in the result
 * @param result - The result to check
 * @returns True if failed with error, false otherwise
 *
 * @example
 * ```typescript
 * const result = fail<number>('Error');
 * if (isFail(result)) {
 *   console.error(result.error); // TypeScript knows error is defined
 * }
 * ```
 */
export function isFail<T>(result: LLKBResult<T>): result is LLKBResult<T> & { error: string } {
  return !result.success && result.error !== undefined;
}
