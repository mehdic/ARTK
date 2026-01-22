"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackageRoot = getPackageRoot;
exports.getTemplatesDir = getTemplatesDir;
exports.getTemplatePath = getTemplatePath;
exports.clearPathCache = clearPathCache;
/**
 * Cross-module-system path utilities
 *
 * Provides directory resolution that works in both ESM and CJS environments.
 *
 * IMPORTANT: This module uses a dual-strategy approach:
 * - In CJS: Uses __dirname (injected by Node.js module wrapper)
 * - In ESM: Uses import.meta.url (only available in ESM)
 *
 * The TypeScript source uses import.meta.url, which works for ESM builds.
 * For CJS builds, we detect that __dirname is available and use it instead.
 */
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const node_url_1 = require("node:url");
/**
 * Cached package root to avoid repeated lookups
 */
let cachedPackageRoot;
/**
 * Cached module directory
 */
let cachedModuleDir;
/**
 * Get the directory where this module file is located.
 * Works in both ESM and CJS environments.
 */
function getModuleDir() {
    if (cachedModuleDir) {
        return cachedModuleDir;
    }
    // In CJS, __dirname is injected by Node.js module wrapper
    // It will be undefined in ESM context
    if (typeof __dirname === 'string' && __dirname.length > 0) {
        cachedModuleDir = __dirname;
        return cachedModuleDir;
    }
    // In ESM, use import.meta.url directly
    // For CJS builds, this block is removed by post-build script (not needed since __dirname works)
    // ESM-specific code removed for CJS build
// Fallback: try to find via require.resolve (CJS only)
    try {
        if (typeof require !== 'undefined' && require?.resolve) {
            const resolved = require.resolve('@artk/core-autogen/package.json');
            cachedModuleDir = (0, node_path_1.dirname)(resolved);
            return cachedModuleDir;
        }
    }
    catch {
        // Package not found via require.resolve
    }
    // Last resort: use process.cwd()
    // This is unreliable but better than crashing
    cachedModuleDir = process.cwd();
    return cachedModuleDir;
}
/**
 * Get the package root directory.
 *
 * Strategy:
 * 1. Check ARTK_AUTOGEN_ROOT env var (for testing/override)
 * 2. Use module location to find package root
 * 3. Fallback to cwd-based search
 */
function getPackageRoot() {
    if (cachedPackageRoot) {
        return cachedPackageRoot;
    }
    // 1. Check environment variable override
    const envRoot = process.env['ARTK_AUTOGEN_ROOT'];
    if (envRoot && (0, node_fs_1.existsSync)((0, node_path_1.join)(envRoot, 'package.json'))) {
        cachedPackageRoot = envRoot;
        return cachedPackageRoot;
    }
    // 2. Find package root from module location
    // This file is at: <package-root>/dist[-variant]/utils/paths.js
    // So we go up 2 levels to find package root
    const moduleDir = getModuleDir();
    const possibleRoots = [
        (0, node_path_1.join)(moduleDir, '..', '..'), // from dist/utils/ or dist-cjs/utils/
        (0, node_path_1.join)(moduleDir, '..'), // from dist/ directly
        moduleDir, // if already at root
    ];
    for (const root of possibleRoots) {
        const pkgPath = (0, node_path_1.join)(root, 'package.json');
        if ((0, node_fs_1.existsSync)(pkgPath)) {
            try {
                const pkg = JSON.parse((0, node_fs_1.readFileSync)(pkgPath, 'utf-8'));
                if (pkg.name === '@artk/core-autogen') {
                    cachedPackageRoot = root;
                    return cachedPackageRoot;
                }
            }
            catch {
                // Continue searching
            }
        }
    }
    // 3. Fallback to cwd-based search (for vendored installations)
    const cwdPaths = [
        (0, node_path_1.join)(process.cwd(), 'node_modules', '@artk', 'core-autogen'),
        (0, node_path_1.join)(process.cwd(), 'artk-e2e', 'vendor', 'artk-core-autogen'),
        process.cwd(),
    ];
    for (const searchPath of cwdPaths) {
        const pkgPath = (0, node_path_1.join)(searchPath, 'package.json');
        if ((0, node_fs_1.existsSync)(pkgPath)) {
            try {
                const pkg = JSON.parse((0, node_fs_1.readFileSync)(pkgPath, 'utf-8'));
                if (pkg.name === '@artk/core-autogen') {
                    cachedPackageRoot = searchPath;
                    return cachedPackageRoot;
                }
            }
            catch {
                // Continue searching
            }
        }
    }
    // Final fallback - use module directory's parent
    cachedPackageRoot = (0, node_path_1.join)(moduleDir, '..', '..');
    return cachedPackageRoot;
}
/**
 * Get the templates directory path.
 *
 * Templates are copied to dist/codegen/templates/ during build.
 * When installed, only one dist variant exists.
 */
function getTemplatesDir() {
    const root = getPackageRoot();
    const moduleDir = getModuleDir();
    // First, try relative to the module itself (most reliable)
    // Module is at dist[-variant]/utils/paths.js
    // Templates are at dist[-variant]/codegen/templates/
    const relativeToModule = (0, node_path_1.join)(moduleDir, '..', 'codegen', 'templates');
    if ((0, node_fs_1.existsSync)(relativeToModule)) {
        return relativeToModule;
    }
    // Fallback: check standard locations from package root
    const possiblePaths = [
        (0, node_path_1.join)(root, 'dist', 'codegen', 'templates'),
        (0, node_path_1.join)(root, 'dist-cjs', 'codegen', 'templates'),
        (0, node_path_1.join)(root, 'dist-legacy-16', 'codegen', 'templates'),
        (0, node_path_1.join)(root, 'dist-legacy-14', 'codegen', 'templates'),
    ];
    for (const templatesPath of possiblePaths) {
        if ((0, node_fs_1.existsSync)(templatesPath)) {
            return templatesPath;
        }
    }
    // Final fallback
    return possiblePaths[0] ?? (0, node_path_1.join)(root, 'dist', 'codegen', 'templates');
}
/**
 * Get the path to a specific template file.
 */
function getTemplatePath(templateName) {
    return (0, node_path_1.join)(getTemplatesDir(), templateName);
}
/**
 * Clear cached paths (for testing)
 */
function clearPathCache() {
    cachedPackageRoot = undefined;
    cachedModuleDir = undefined;
}
//# sourceMappingURL=paths.js.map