"use strict";
/**
 * Storage state management for ARTK Auth
 *
 * Handles persistence and validation of browser storage state across test runs.
 *
 * FR-007: System MUST persist authentication state to files and reuse valid state across test runs
 * FR-008: System MUST invalidate storage state based on configurable maximum age
 * NFR-007: System MUST automatically delete storage state files older than 24 hours on test run start
 * NFR-008: Auto-cleanup MUST run before auth setup to prevent stale state accumulation
 *
 * @module auth/storage-state
 * @example
 * ```typescript
 * import { saveStorageState, loadStorageState, isStorageStateValid } from './storage-state.js';
 *
 * // Save storage state after authentication
 * await saveStorageState(browserContext, 'admin', { directory: '.auth-states' });
 *
 * // Load and validate storage state
 * const statePath = await loadStorageState('admin', { directory: '.auth-states' });
 * if (statePath) {
 *   // Use existing state
 * } else {
 *   // Need fresh authentication
 * }
 * ```
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLEANUP_MAX_AGE_MS = exports.DEFAULT_STORAGE_STATE_CONFIG = void 0;
exports.saveStorageState = saveStorageState;
exports.loadStorageState = loadStorageState;
exports.isStorageStateValid = isStorageStateValid;
exports.getStorageStateMetadata = getStorageStateMetadata;
exports.readStorageState = readStorageState;
exports.clearStorageState = clearStorageState;
exports.cleanupExpiredStorageStates = cleanupExpiredStorageStates;
exports.cleanupStorageStatesOlderThan = cleanupStorageStatesOlderThan;
exports.getRoleFromPath = getRoleFromPath;
exports.listStorageStates = listStorageStates;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const storage_state_error_js_1 = require("../errors/storage-state-error.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('auth', 'storage-state');
// =============================================================================
// Configuration
// =============================================================================
/**
 * Default storage state configuration
 */
exports.DEFAULT_STORAGE_STATE_CONFIG = {
    directory: '.auth-states',
    maxAgeMinutes: 60,
    filePattern: '{role}.json',
};
/**
 * Maximum age in milliseconds for auto-cleanup (24 hours)
 * NFR-007: Delete storage state files older than 24 hours
 */
exports.CLEANUP_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// =============================================================================
// Core Functions
// =============================================================================
/**
 * Save browser context storage state for a role
 *
 * FR-007: Persist storage state to files
 *
 * @param context - Playwright BrowserContext
 * @param role - Role name (e.g., 'admin', 'standardUser')
 * @param options - Storage options
 * @returns Path to saved storage state file
 *
 * @example
 * ```typescript
 * const statePath = await saveStorageState(context, 'admin', {
 *   directory: '.auth-states',
 *   filePattern: '{role}-{env}.json',
 *   environment: 'staging'
 * });
 * console.log(`Saved to: ${statePath}`);
 * ```
 */
async function saveStorageState(context, role, options = {}) {
    const config = resolveOptions(options);
    const filePath = getStorageStatePath(role, config);
    logger.info('Saving storage state', { role, path: filePath });
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        // Save storage state
        await context.storageState({ path: filePath });
        logger.info('Storage state saved successfully', { role, path: filePath });
        return filePath;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Failed to save storage state', { role, path: filePath, error: message });
        throw new storage_state_error_js_1.ARTKStorageStateError(`Failed to save storage state for role "${role}": ${message}`, role, filePath, 'invalid');
    }
}
/**
 * Load storage state path for a role if valid
 *
 * FR-007: Reuse valid state across test runs
 * FR-008: Invalidate state based on maxAge
 *
 * @param role - Role name
 * @param options - Storage options
 * @returns Path to storage state file, or undefined if not valid
 *
 * @example
 * ```typescript
 * const statePath = await loadStorageState('admin');
 * if (statePath) {
 *   await context.addCookies(/* from file *\/);
 * }
 * ```
 */
async function loadStorageState(role, options = {}) {
    const config = resolveOptions(options);
    const filePath = getStorageStatePath(role, config);
    logger.debug('Loading storage state', { role, path: filePath });
    // Check if file exists and is valid
    const valid = await isStorageStateValid(role, config);
    if (!valid) {
        logger.debug('Storage state not valid or not found', { role, path: filePath });
        return undefined;
    }
    logger.info('Storage state loaded successfully', { role, path: filePath });
    return filePath;
}
/**
 * Check if storage state is valid for a role
 *
 * FR-008: Invalidate state based on configurable maximum age
 *
 * @param role - Role name
 * @param options - Storage options
 * @returns true if storage state exists and is not expired
 *
 * @example
 * ```typescript
 * if (await isStorageStateValid('admin', { maxAgeMinutes: 30 })) {
 *   // Reuse existing state
 * }
 * ```
 */
async function isStorageStateValid(role, options = {}) {
    const config = resolveOptions(options);
    const filePath = getStorageStatePath(role, config);
    const maxAgeMs = config.maxAgeMinutes * 60 * 1000;
    try {
        const stats = await fs.stat(filePath);
        const age = Date.now() - stats.mtimeMs;
        if (age > maxAgeMs) {
            logger.debug('Storage state expired', {
                role,
                path: filePath,
                ageMinutes: Math.round(age / 60000),
                maxAgeMinutes: config.maxAgeMinutes,
            });
            return false;
        }
        // Also verify file is valid JSON
        const content = await fs.readFile(filePath, 'utf-8');
        JSON.parse(content);
        logger.debug('Storage state is valid', {
            role,
            path: filePath,
            ageMinutes: Math.round(age / 60000),
        });
        return true;
    }
    catch (error) {
        // File doesn't exist or isn't valid JSON
        logger.debug('Storage state not found or invalid', { role, path: filePath });
        return false;
    }
}
/**
 * Get metadata about a storage state file
 *
 * @param role - Role name
 * @param options - Storage options
 * @returns Storage state metadata, or undefined if file doesn't exist
 */
async function getStorageStateMetadata(role, options = {}) {
    const config = resolveOptions(options);
    const filePath = getStorageStatePath(role, config);
    const maxAgeMs = config.maxAgeMinutes * 60 * 1000;
    try {
        const stats = await fs.stat(filePath);
        const age = Date.now() - stats.mtimeMs;
        return {
            role,
            createdAt: stats.mtime,
            path: filePath,
            isValid: age <= maxAgeMs,
        };
    }
    catch {
        return undefined;
    }
}
/**
 * Read and parse storage state from file
 *
 * @param role - Role name
 * @param options - Storage options
 * @returns Parsed storage state
 * @throws ARTKStorageStateError if file doesn't exist or is invalid
 */
async function readStorageState(role, options = {}) {
    const config = resolveOptions(options);
    const filePath = getStorageStatePath(role, config);
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const state = JSON.parse(content);
        // Basic validation
        if (!Array.isArray(state.cookies) || !Array.isArray(state.origins)) {
            throw new Error('Invalid storage state structure');
        }
        return state;
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            throw new storage_state_error_js_1.ARTKStorageStateError(`Storage state file not found for role "${role}"`, role, filePath, 'missing');
        }
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('JSON')) {
            throw new storage_state_error_js_1.ARTKStorageStateError(`Storage state file corrupted for role "${role}": ${message}`, role, filePath, 'corrupted');
        }
        throw new storage_state_error_js_1.ARTKStorageStateError(`Failed to read storage state for role "${role}": ${message}`, role, filePath, 'invalid');
    }
}
/**
 * Clear storage state files
 *
 * FR-009: Support multiple named roles with separate credentials and storage states
 *
 * @param role - Optional role to clear (clears all if not specified)
 * @param options - Storage options
 * @returns Number of files deleted
 *
 * @example
 * ```typescript
 * // Clear single role
 * await clearStorageState('admin');
 *
 * // Clear all storage states
 * await clearStorageState();
 * ```
 */
async function clearStorageState(role, options = {}) {
    const config = resolveOptions(options);
    const directory = getStorageStateDirectory(config);
    if (role) {
        // Clear single role
        const filePath = getStorageStatePath(role, config);
        try {
            await fs.unlink(filePath);
            logger.info('Storage state cleared', { role, path: filePath });
            return 1;
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                logger.warn('Failed to clear storage state', { role, error: String(error) });
            }
            return 0;
        }
    }
    // Clear all storage states
    try {
        const files = await fs.readdir(directory);
        let deletedCount = 0;
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    await fs.unlink(path.join(directory, file));
                    deletedCount++;
                }
                catch {
                    // Ignore errors for individual files
                }
            }
        }
        logger.info('All storage states cleared', { count: deletedCount });
        return deletedCount;
    }
    catch (error) {
        if (error.code !== 'ENOENT') {
            logger.warn('Failed to clear storage states', { error: String(error) });
        }
        return 0;
    }
}
// =============================================================================
// Cleanup Functions (T032)
// =============================================================================
/**
 * Clean up expired storage states (older than 24 hours)
 *
 * NFR-007: System MUST automatically delete storage state files older than 24 hours on test run start
 * NFR-008: Auto-cleanup MUST run before auth setup to prevent stale state accumulation
 * NFR-009: System MUST log cleanup actions at info verbosity level
 *
 * @param options - Storage options
 * @returns Cleanup result with counts and errors
 *
 * @example
 * ```typescript
 * // Run at test suite start
 * const result = await cleanupExpiredStorageStates();
 * console.log(`Deleted ${result.deletedCount} expired storage states`);
 * ```
 */
async function cleanupExpiredStorageStates(options = {}) {
    const config = resolveOptions(options);
    const directory = getStorageStateDirectory(config);
    const deletedFiles = [];
    const errors = [];
    logger.info('Starting storage state cleanup', { directory, maxAgeHours: 24 });
    try {
        // Check if directory exists
        try {
            await fs.access(directory);
        }
        catch {
            logger.debug('Storage state directory does not exist, nothing to clean up');
            return { deletedCount: 0, deletedFiles: [], errors: [] };
        }
        const files = await fs.readdir(directory);
        const now = Date.now();
        for (const file of files) {
            if (!file.endsWith('.json')) {
                continue;
            }
            const filePath = path.join(directory, file);
            try {
                const stats = await fs.stat(filePath);
                const age = now - stats.mtimeMs;
                if (age > exports.CLEANUP_MAX_AGE_MS) {
                    await fs.unlink(filePath);
                    deletedFiles.push(filePath);
                    logger.debug('Deleted expired storage state', {
                        path: filePath,
                        ageHours: Math.round(age / 3600000),
                    });
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                errors.push({ path: filePath, message });
                logger.warn('Failed to process file during cleanup', { path: filePath, error: message });
            }
        }
        logger.info('Storage state cleanup complete', {
            deletedCount: deletedFiles.length,
            errorCount: errors.length,
        });
        return {
            deletedCount: deletedFiles.length,
            deletedFiles,
            errors,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Storage state cleanup failed', { error: message });
        return {
            deletedCount: 0,
            deletedFiles: [],
            errors: [{ path: directory, message }],
        };
    }
}
/**
 * Clean up storage states older than a custom age
 *
 * @param maxAgeMs - Maximum age in milliseconds
 * @param options - Storage options
 * @returns Cleanup result
 */
async function cleanupStorageStatesOlderThan(maxAgeMs, options = {}) {
    const config = resolveOptions(options);
    const directory = getStorageStateDirectory(config);
    const deletedFiles = [];
    const errors = [];
    try {
        try {
            await fs.access(directory);
        }
        catch {
            return { deletedCount: 0, deletedFiles: [], errors: [] };
        }
        const files = await fs.readdir(directory);
        const now = Date.now();
        for (const file of files) {
            if (!file.endsWith('.json')) {
                continue;
            }
            const filePath = path.join(directory, file);
            try {
                const stats = await fs.stat(filePath);
                const age = now - stats.mtimeMs;
                if (age > maxAgeMs) {
                    await fs.unlink(filePath);
                    deletedFiles.push(filePath);
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                errors.push({ path: filePath, message });
            }
        }
        return { deletedCount: deletedFiles.length, deletedFiles, errors };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            deletedCount: 0,
            deletedFiles: [],
            errors: [{ path: directory, message }],
        };
    }
}
// =============================================================================
// Helper Functions
// =============================================================================
/**
 * Resolve storage state options with defaults
 */
function resolveOptions(options) {
    return {
        directory: options.directory ?? exports.DEFAULT_STORAGE_STATE_CONFIG.directory,
        maxAgeMinutes: options.maxAgeMinutes ?? exports.DEFAULT_STORAGE_STATE_CONFIG.maxAgeMinutes,
        filePattern: options.filePattern ?? exports.DEFAULT_STORAGE_STATE_CONFIG.filePattern,
        projectRoot: options.projectRoot ?? process.cwd(),
        environment: options.environment,
    };
}
/**
 * Get the full path to storage state directory
 */
function getStorageStateDirectory(config) {
    return path.join(config.projectRoot, config.directory);
}
/**
 * Get the full path to a storage state file
 */
function getStorageStatePath(role, config) {
    const directory = getStorageStateDirectory(config);
    let filename = config.filePattern
        .replace('{role}', role)
        .replace('{env}', config.environment ?? 'default');
    // Ensure .json extension
    if (!filename.endsWith('.json')) {
        filename += '.json';
    }
    return path.join(directory, filename);
}
/**
 * Get role name from a storage state file path
 *
 * @param filePath - Path to storage state file
 * @param pattern - File naming pattern
 * @returns Role name or undefined if can't parse
 */
function getRoleFromPath(filePath, pattern = '{role}.json') {
    const filename = path.basename(filePath);
    // Escape special regex characters first, then replace placeholders
    let patternRegex = pattern
        .replace(/\./g, '\\.') // Escape all dots first
        .replace('\\{role\\}', '([\\w-]+)') // Role: word chars and hyphens
        .replace('\\{env\\}', '[\\w-]+'); // Env: word chars and hyphens
    // Handle unescaped placeholders (in case dots weren't before them)
    patternRegex = patternRegex
        .replace('{role}', '([\\w-]+)')
        .replace('{env}', '[\\w-]+');
    const match = filename.match(new RegExp(`^${patternRegex}$`));
    return match?.[1];
}
/**
 * List all storage state files
 *
 * @param options - Storage options
 * @returns Array of storage state metadata
 */
async function listStorageStates(options = {}) {
    const config = resolveOptions(options);
    const directory = getStorageStateDirectory(config);
    const maxAgeMs = config.maxAgeMinutes * 60 * 1000;
    const results = [];
    try {
        const files = await fs.readdir(directory);
        for (const file of files) {
            if (!file.endsWith('.json')) {
                continue;
            }
            const filePath = path.join(directory, file);
            const role = getRoleFromPath(filePath, config.filePattern);
            if (!role) {
                continue;
            }
            try {
                const stats = await fs.stat(filePath);
                const age = Date.now() - stats.mtimeMs;
                results.push({
                    role,
                    createdAt: stats.mtime,
                    path: filePath,
                    isValid: age <= maxAgeMs,
                });
            }
            catch {
                // Skip files we can't stat
            }
        }
    }
    catch {
        // Directory doesn't exist
    }
    return results;
}
//# sourceMappingURL=storage-state.js.map