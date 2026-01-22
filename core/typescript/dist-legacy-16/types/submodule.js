"use strict";
/**
 * @module types/submodule
 * @description Submodule type definitions for ARTK E2E independent architecture.
 * Defines types for Git submodule state during /init.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSubmoduleStatus = isSubmoduleStatus;
exports.isSubmoduleScanResult = isSubmoduleScanResult;
exports.createEmptySubmoduleScanResult = createEmptySubmoduleScanResult;
/**
 * Type guard to check if a value is a valid SubmoduleStatus.
 */
function isSubmoduleStatus(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const obj = value;
    // Check path
    if (typeof obj.path !== 'string')
        return false;
    // Check initialized
    if (typeof obj.initialized !== 'boolean')
        return false;
    // Check commit (optional)
    if (obj.commit !== undefined && typeof obj.commit !== 'string')
        return false;
    // Check url (optional)
    if (obj.url !== undefined && typeof obj.url !== 'string')
        return false;
    // Check warning (optional)
    if (obj.warning !== undefined && typeof obj.warning !== 'string') {
        return false;
    }
    return true;
}
/**
 * Type guard to check if a value is a valid SubmoduleScanResult.
 */
function isSubmoduleScanResult(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const obj = value;
    // Check isSubmodule (required)
    if (typeof obj.isSubmodule !== 'boolean')
        return false;
    // Check path (required)
    if (typeof obj.path !== 'string')
        return false;
    // Check relativePath (optional)
    if (obj.relativePath !== undefined && typeof obj.relativePath !== 'string') {
        return false;
    }
    // Check status (optional)
    if (obj.status !== undefined && !isSubmoduleStatus(obj.status))
        return false;
    // Check submodules (optional)
    if (obj.submodules !== undefined) {
        if (!Array.isArray(obj.submodules))
            return false;
        if (!obj.submodules.every(isSubmoduleStatus))
            return false;
    }
    // Check warnings (optional)
    if (obj.warnings !== undefined) {
        if (!Array.isArray(obj.warnings))
            return false;
        if (!obj.warnings.every((w) => typeof w === 'string'))
            return false;
    }
    return true;
}
/**
 * Creates an empty submodule scan result.
 */
function createEmptySubmoduleScanResult(dirPath) {
    return {
        isSubmodule: false,
        path: dirPath,
        submodules: [],
        warnings: [],
    };
}
//# sourceMappingURL=submodule.js.map