"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCode = normalizeCode;
exports.hashCode = hashCode;
exports.tokenize = tokenize;
exports.countLines = countLines;
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
function normalizeCode(code) {
    let normalized = code;
    // Remove single-quoted string literals (replace with <STRING>)
    normalized = normalized.replace(/'[^']*'/g, '<STRING>');
    // Remove double-quoted string literals (replace with <STRING>)
    normalized = normalized.replace(/"[^"]*"/g, '<STRING>');
    // Remove template literals (replace with <STRING>)
    normalized = normalized.replace(/`[^`]*`/g, '<STRING>');
    // Remove numbers (replace with <NUMBER>)
    // Match integers and decimals, but not numbers in identifiers
    normalized = normalized.replace(/\b\d+(?:\.\d+)?\b/g, '<NUMBER>');
    // Remove variable names in const declarations
    normalized = normalized.replace(/\bconst\s+(\w+)/g, 'const <VAR>');
    // Remove variable names in let declarations
    normalized = normalized.replace(/\blet\s+(\w+)/g, 'let <VAR>');
    // Remove variable names in var declarations
    normalized = normalized.replace(/\bvar\s+(\w+)/g, 'var <VAR>');
    // Normalize whitespace (collapse multiple spaces to single)
    normalized = normalized.replace(/\s+/g, ' ');
    // Trim leading/trailing whitespace
    normalized = normalized.trim();
    return normalized;
}
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
function hashCode(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        // hash * 33 + char
        hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16);
}
/**
 * Tokenize code for Jaccard similarity calculation
 *
 * Splits code into meaningful tokens for comparison.
 *
 * @param code - The code to tokenize
 * @returns Set of tokens
 */
function tokenize(code) {
    // Split on whitespace and punctuation, keep meaningful tokens
    const tokens = code
        .split(/[\s.,;:(){}[\]<>]+/)
        .filter((token) => token.length > 0);
    return new Set(tokens);
}
/**
 * Count lines in a code string
 *
 * @param code - The code to count lines in
 * @returns Number of lines
 */
function countLines(code) {
    if (!code || code.length === 0) {
        return 0;
    }
    return code.split('\n').length;
}
//# sourceMappingURL=normalize.js.map