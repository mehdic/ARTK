"use strict";
/**
 * @module types/target
 * @description Target type definitions for ARTK E2E independent architecture.
 * Represents a frontend application to test in a monorepo.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArtkTarget = isArtkTarget;
exports.isValidTargetName = isValidTargetName;
exports.isValidRelativePath = isValidRelativePath;
/**
 * Type guard to check if a value is a valid ArtkTarget.
 */
function isArtkTarget(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const obj = value;
    return (typeof obj.name === 'string' &&
        typeof obj.path === 'string' &&
        typeof obj.type === 'string' &&
        ['react-spa', 'vue-spa', 'angular', 'next', 'nuxt', 'other'].includes(obj.type) &&
        Array.isArray(obj.detected_by) &&
        obj.detected_by.every((s) => typeof s === 'string'));
}
/**
 * Validates that a target name follows the lowercase-kebab-case pattern.
 */
function isValidTargetName(name) {
    return /^[a-z][a-z0-9-]*$/.test(name);
}
/**
 * Validates that a path is relative (not absolute, no ..).
 */
function isValidRelativePath(path) {
    // Must not start with / and must not contain ../ escaping
    return !path.startsWith('/') && !/(^|\/)\.\.(\/|$)/.test(path);
}
//# sourceMappingURL=target.js.map