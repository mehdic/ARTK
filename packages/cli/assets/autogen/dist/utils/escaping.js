/**
 * Shared escaping utilities for code generation.
 * Consolidates escapeRegex and escapeString from multiple locations.
 */
/**
 * Escape special regex characters in a string.
 * Includes forward slash for URL patterns.
 */
export function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
}
/**
 * Escape a string for use in generated JavaScript/TypeScript code.
 * Handles quotes, backslashes, newlines, and carriage returns.
 */
export function escapeString(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}
/**
 * Escape a selector string for use in Playwright locators.
 * Handles quotes that would break the selector syntax.
 */
export function escapeSelector(str) {
    return str.replace(/'/g, "\\'");
}
//# sourceMappingURL=escaping.js.map