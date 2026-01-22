"use strict";
/**
 * Shared escaping utilities for code generation.
 * Consolidates escapeRegex and escapeString from multiple locations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeRegex = escapeRegex;
exports.escapeString = escapeString;
exports.escapeSelector = escapeSelector;
/**
 * Escape special regex characters in a string.
 * Includes forward slash for URL patterns.
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
}
/**
 * Escape a string for use in generated JavaScript/TypeScript code.
 * Handles quotes, backslashes, newlines, and carriage returns.
 */
function escapeString(str) {
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
function escapeSelector(str) {
    return str.replace(/'/g, "\\'");
}
//# sourceMappingURL=escaping.js.map