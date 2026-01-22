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
export declare function parseIntSafe(value: string | undefined, name: string, defaultValue: number): number;
/**
 * Parse integer allowing negative values
 *
 * @param value - String value to parse (or undefined)
 * @param name - Option name for error messages
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed integer or default value
 */
export declare function parseIntSafeAllowNegative(value: string | undefined, name: string, defaultValue: number): number;
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
export declare function parseFloatSafe(value: string | undefined, name: string, defaultValue: number): number;
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
export declare function parseBoolSafe(value: string | undefined, defaultValue: boolean): boolean;
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
export declare function parseEnumSafe<T extends string>(value: string | undefined, validValues: readonly T[], name: string, defaultValue: T): T;
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
export declare function parseWithValidator<T>(value: string | undefined, parser: (_value: string) => T, validator: (_parsed: T) => boolean, name: string, defaultValue: T): T;
//# sourceMappingURL=parsing.d.ts.map