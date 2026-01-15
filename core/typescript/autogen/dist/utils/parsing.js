/**
 * Safe parsing utilities for CLI arguments and configuration values
 *
 * These utilities prevent common issues with parseInt/parseFloat:
 * - NaN propagation from invalid input
 * - Silent failures from unexpected input types
 * - Negative values where only positive are expected
 *
 * @see research/2026-01-15_code_quality_standards.md Category 4
 */
/**
 * Parse integer with validation and fallback
 *
 * @param value - String value to parse (or undefined)
 * @param name - Option name for error messages
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed integer or default value
 *
 * @example
 * ```typescript
 * // Basic usage
 * const timeout = parseIntSafe(args.timeout, 'timeout', 30000);
 *
 * // Handles invalid input gracefully
 * parseIntSafe('abc', 'count', 10); // Returns 10, logs warning
 * parseIntSafe('-5', 'count', 10);  // Returns 10, logs warning
 * parseIntSafe(undefined, 'count', 10); // Returns 10, no warning
 * ```
 */
export function parseIntSafe(value, name, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }
    // Use Number() instead of parseInt() to reject partial matches like "42px"
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || trimmed === '') {
        console.warn(`Warning: Invalid value '${value}' for --${name}, using default: ${defaultValue}`);
        return defaultValue;
    }
    if (parsed < 0) {
        console.warn(`Warning: Negative value '${value}' for --${name}, using default: ${defaultValue}`);
        return defaultValue;
    }
    return parsed;
}
/**
 * Parse integer allowing negative values
 *
 * @param value - String value to parse (or undefined)
 * @param name - Option name for error messages
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed integer or default value
 */
export function parseIntSafeAllowNegative(value, name, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }
    // Use Number() instead of parseInt() to reject partial matches like "42px"
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || trimmed === '') {
        console.warn(`Warning: Invalid value '${value}' for --${name}, using default: ${defaultValue}`);
        return defaultValue;
    }
    return parsed;
}
/**
 * Parse float with validation and fallback
 *
 * @param value - String value to parse (or undefined)
 * @param name - Option name for error messages
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed float or default value
 *
 * @example
 * ```typescript
 * const threshold = parseFloatSafe(args.threshold, 'threshold', 0.1);
 * ```
 */
export function parseFloatSafe(value, name, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }
    // Use Number() instead of parseFloat() to reject partial matches like "3.14abc"
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    if (isNaN(parsed) || trimmed === '') {
        console.warn(`Warning: Invalid value '${value}' for --${name}, using default: ${defaultValue}`);
        return defaultValue;
    }
    if (parsed < 0) {
        console.warn(`Warning: Negative value '${value}' for --${name}, using default: ${defaultValue}`);
        return defaultValue;
    }
    return parsed;
}
/**
 * Parse boolean from string with common truthy/falsy values
 *
 * @param value - String value to parse (or undefined)
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed boolean or default value
 *
 * @example
 * ```typescript
 * parseBoolSafe('true', false);  // Returns true
 * parseBoolSafe('yes', false);   // Returns true
 * parseBoolSafe('1', false);     // Returns true
 * parseBoolSafe('false', true);  // Returns false
 * parseBoolSafe('no', true);     // Returns false
 * parseBoolSafe('0', true);      // Returns false
 * parseBoolSafe('invalid', true); // Returns true (default)
 * ```
 */
export function parseBoolSafe(value, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }
    const normalized = value.toLowerCase().trim();
    if (['true', 'yes', '1', 'on'].includes(normalized)) {
        return true;
    }
    if (['false', 'no', '0', 'off'].includes(normalized)) {
        return false;
    }
    return defaultValue;
}
/**
 * Parse enum value with validation
 *
 * @param value - String value to parse (or undefined)
 * @param validValues - Array of valid enum values
 * @param name - Option name for error messages
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed enum value or default value
 *
 * @example
 * ```typescript
 * type LogLevel = 'debug' | 'info' | 'warn' | 'error';
 * const level = parseEnumSafe<LogLevel>(
 *   args.level,
 *   ['debug', 'info', 'warn', 'error'],
 *   'level',
 *   'info'
 * );
 * ```
 */
export function parseEnumSafe(value, validValues, name, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }
    const trimmed = value.trim();
    // Case-insensitive matching: find the valid value that matches
    const match = validValues.find(v => v.toLowerCase() === trimmed.toLowerCase());
    if (match !== undefined) {
        return match; // Return the actual valid value, not the input
    }
    console.warn(`Warning: Invalid value '${value}' for --${name}, valid values are: ${validValues.join(', ')}. Using default: ${defaultValue}`);
    return defaultValue;
}
/**
 * Parse a value with a custom parser function
 *
 * @param value - String value to parse (or undefined)
 * @param parser - Custom parser function
 * @param name - Option name for error messages
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed value or default value
 *
 * @example
 * ```typescript
 * const date = parseWithValidator(
 *   args.date,
 *   (v) => new Date(v),
 *   (d) => !isNaN(d.getTime()),
 *   'date',
 *   new Date()
 * );
 * ```
 */
export function parseWithValidator(value, parser, validator, name, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }
    try {
        const parsed = parser(value);
        if (validator(parsed)) {
            return parsed;
        }
        console.warn(`Warning: Invalid value '${value}' for --${name}, using default`);
        return defaultValue;
    }
    catch {
        console.warn(`Warning: Failed to parse '${value}' for --${name}, using default`);
        return defaultValue;
    }
}
//# sourceMappingURL=parsing.js.map