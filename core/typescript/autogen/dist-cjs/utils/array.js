"use strict";
/**
 * Safe array access utilities
 *
 * These functions provide type-safe array access that works with TypeScript's
 * noUncheckedIndexedAccess compiler option.
 *
 * @see research/2026-01-15_remaining_issues_remediation_plan.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.at = at;
exports.atOrThrow = atOrThrow;
exports.first = first;
exports.firstOrThrow = firstOrThrow;
exports.last = last;
exports.lastOrThrow = lastOrThrow;
exports.matchGroup = matchGroup;
exports.matchGroupOrThrow = matchGroupOrThrow;
exports.isDefined = isDefined;
exports.isNotNullish = isNotNullish;
exports.assertDefined = assertDefined;
exports.assertNotNullish = assertNotNullish;
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
function at(arr, index) {
    return arr[index];
}
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
function atOrThrow(arr, index, message) {
    const item = arr[index];
    if (item === undefined) {
        throw new Error(message ?? `Index ${index} out of bounds (array length: ${arr.length})`);
    }
    return item;
}
/**
 * Get first element of array, returning undefined if empty
 *
 * @param arr - The array to access
 * @returns The first element or undefined
 */
function first(arr) {
    return arr[0];
}
/**
 * Get first element of array, throwing if empty
 *
 * @param arr - The array to access
 * @param message - Optional error message
 * @returns The first element (guaranteed to exist)
 * @throws Error if array is empty
 */
function firstOrThrow(arr, message) {
    return atOrThrow(arr, 0, message ?? 'Array is empty');
}
/**
 * Get last element of array, returning undefined if empty
 *
 * @param arr - The array to access
 * @returns The last element or undefined
 */
function last(arr) {
    return arr[arr.length - 1];
}
/**
 * Get last element of array, throwing if empty
 *
 * @param arr - The array to access
 * @param message - Optional error message
 * @returns The last element (guaranteed to exist)
 * @throws Error if array is empty
 */
function lastOrThrow(arr, message) {
    if (arr.length === 0) {
        throw new Error(message ?? 'Array is empty');
    }
    return arr[arr.length - 1];
}
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
function matchGroup(match, index) {
    return match?.[index];
}
/**
 * Get regex match group at index, throwing if missing
 *
 * @param match - The regex match array
 * @param index - The capture group index (0 = full match, 1 = first group)
 * @param message - Optional error message
 * @returns The group value (guaranteed to exist)
 * @throws Error if match is null or group is undefined
 */
function matchGroupOrThrow(match, index, message) {
    if (!match) {
        throw new Error(message ?? 'No regex match');
    }
    const group = match[index];
    if (group === undefined) {
        throw new Error(message ?? `Match group ${index} is undefined`);
    }
    return group;
}
/**
 * Type guard to check if a value is defined (not undefined)
 *
 * @param value - The value to check
 * @returns True if the value is not undefined
 */
function isDefined(value) {
    return value !== undefined;
}
/**
 * Type guard to check if a value is not null or undefined
 *
 * @param value - The value to check
 * @returns True if the value is not null or undefined
 */
function isNotNullish(value) {
    return value !== null && value !== undefined;
}
/**
 * Assert that a value is defined, throwing if undefined
 *
 * @param value - The value to check
 * @param message - Optional error message
 * @returns The value (guaranteed to be defined)
 * @throws Error if value is undefined
 */
function assertDefined(value, message) {
    if (value === undefined) {
        throw new Error(message ?? 'Value is undefined');
    }
    return value;
}
/**
 * Assert that a value is not nullish, throwing if null or undefined
 *
 * @param value - The value to check
 * @param message - Optional error message
 * @returns The value (guaranteed to be not null or undefined)
 * @throws Error if value is null or undefined
 */
function assertNotNullish(value, message) {
    if (value === null || value === undefined) {
        throw new Error(message ?? 'Value is null or undefined');
    }
    return value;
}
//# sourceMappingURL=array.js.map