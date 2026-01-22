/**
 * Code Normalization for LLKB Pattern Matching
 *
 * Normalizes code strings for comparison by:
 * - Replacing string literals with placeholders
 * - Replacing numbers with placeholders
 * - Replacing variable names with placeholders
 * - Normalizing whitespace
 *
 * @module llkb/normalize
 */
/**
 * Normalize code for pattern comparison
 *
 * This function transforms code into a canonical form that allows
 * comparing the structure of code rather than specific values.
 *
 * @param code - The source code to normalize
 * @returns Normalized code string
 *
 * @example
 * ```typescript
 * const code1 = `const user = "john"; const count = 5;`;
 * const code2 = `const admin = "jane"; const total = 10;`;
 *
 * normalizeCode(code1) === normalizeCode(code2) // true
 * // Both become: "const <VAR> = <STRING>; const <VAR> = <NUMBER>;"
 * ```
 */
export declare function normalizeCode(code: string): string;
/**
 * Generate a simple hash code from a string
 *
 * Uses a variant of the djb2 algorithm for fast hashing.
 * Not cryptographically secure, but good for deduplication.
 *
 * @param str - The string to hash
 * @returns A hash code as a hex string
 *
 * @example
 * ```typescript
 * hashCode("hello world") // "5e01db3e"
 * ```
 */
export declare function hashCode(str: string): string;
/**
 * Tokenize code for Jaccard similarity calculation
 *
 * Splits code into meaningful tokens for comparison.
 *
 * @param code - The code to tokenize
 * @returns Set of tokens
 */
export declare function tokenize(code: string): Set<string>;
/**
 * Count lines in a code string
 *
 * @param code - The code to count lines in
 * @returns Number of lines
 */
export declare function countLines(code: string): number;
//# sourceMappingURL=normalize.d.ts.map