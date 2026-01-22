/**
 * Safe array access utilities
 *
 * These functions provide type-safe array access that works with TypeScript's
 * noUncheckedIndexedAccess compiler option.
 *
 * @see research/2026-01-15_remaining_issues_remediation_plan.md
 */
/**
 * Get array element at index, returning undefined if out of bounds
 *
 * @param arr - The array to access
 * @param index - The index to retrieve
 * @returns The element or undefined
 *
 * @example
 * ```typescript
 * const item = at(items, 0);
 * if (item !== undefined) {
 *   // item is typed correctly
 * }
 * ```
 */
export declare function at<T>(arr: readonly T[], index: number): T | undefined;
/**
 * Get array element at index, throwing if out of bounds
 *
 * @param arr - The array to access
 * @param index - The index to retrieve
 * @param message - Optional error message
 * @returns The element (guaranteed to exist)
 * @throws Error if index is out of bounds
 *
 * @example
 * ```typescript
 * const item = atOrThrow(items, 0); // throws if empty
 * // item is typed as T, not T | undefined
 * ```
 */
export declare function atOrThrow<T>(arr: readonly T[], index: number, message?: string): T;
/**
 * Get first element of array, returning undefined if empty
 *
 * @param arr - The array to access
 * @returns The first element or undefined
 */
export declare function first<T>(arr: readonly T[]): T | undefined;
/**
 * Get first element of array, throwing if empty
 *
 * @param arr - The array to access
 * @param message - Optional error message
 * @returns The first element (guaranteed to exist)
 * @throws Error if array is empty
 */
export declare function firstOrThrow<T>(arr: readonly T[], message?: string): T;
/**
 * Get last element of array, returning undefined if empty
 *
 * @param arr - The array to access
 * @returns The last element or undefined
 */
export declare function last<T>(arr: readonly T[]): T | undefined;
/**
 * Get last element of array, throwing if empty
 *
 * @param arr - The array to access
 * @param message - Optional error message
 * @returns The last element (guaranteed to exist)
 * @throws Error if array is empty
 */
export declare function lastOrThrow<T>(arr: readonly T[], message?: string): T;
/**
 * Get regex match group at index, with safe type
 *
 * This is specifically for working with RegExpMatchArray where
 * groups may or may not exist.
 *
 * @param match - The regex match array
 * @param index - The capture group index (0 = full match, 1 = first group)
 * @returns The group value or undefined
 */
export declare function matchGroup(match: RegExpMatchArray | null, index: number): string | undefined;
/**
 * Get regex match group at index, throwing if missing
 *
 * @param match - The regex match array
 * @param index - The capture group index (0 = full match, 1 = first group)
 * @param message - Optional error message
 * @returns The group value (guaranteed to exist)
 * @throws Error if match is null or group is undefined
 */
export declare function matchGroupOrThrow(match: RegExpMatchArray | null, index: number, message?: string): string;
/**
 * Type guard to check if a value is defined (not undefined)
 *
 * @param value - The value to check
 * @returns True if the value is not undefined
 */
export declare function isDefined<T>(value: T | undefined): value is T;
/**
 * Type guard to check if a value is not null or undefined
 *
 * @param value - The value to check
 * @returns True if the value is not null or undefined
 */
export declare function isNotNullish<T>(value: T | null | undefined): value is T;
/**
 * Assert that a value is defined, throwing if undefined
 *
 * @param value - The value to check
 * @param message - Optional error message
 * @returns The value (guaranteed to be defined)
 * @throws Error if value is undefined
 */
export declare function assertDefined<T>(value: T | undefined, message?: string): T;
/**
 * Assert that a value is not nullish, throwing if null or undefined
 *
 * @param value - The value to check
 * @param message - Optional error message
 * @returns The value (guaranteed to be not null or undefined)
 * @throws Error if value is null or undefined
 */
export declare function assertNotNullish<T>(value: T | null | undefined, message?: string): T;
//# sourceMappingURL=array.d.ts.map