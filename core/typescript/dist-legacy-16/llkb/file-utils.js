"use strict";
/**
 * File Utilities for LLKB
 *
 * Provides safe file operations including atomic writes and file locking
 * to prevent data corruption from concurrent access.
 *
 * @module llkb/file-utils
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
exports.LOCK_RETRY_INTERVAL_MS = exports.STALE_LOCK_THRESHOLD_MS = exports.LOCK_MAX_WAIT_MS = void 0;
exports.saveJSONAtomic = saveJSONAtomic;
exports.saveJSONAtomicSync = saveJSONAtomicSync;
exports.updateJSONWithLock = updateJSONWithLock;
exports.updateJSONWithLockSync = updateJSONWithLockSync;
exports.loadJSON = loadJSON;
exports.ensureDir = ensureDir;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Maximum wait time for acquiring a lock (in milliseconds)
 */
exports.LOCK_MAX_WAIT_MS = 5000;
/**
 * Stale lock threshold (in milliseconds)
 * Locks older than this are considered abandoned
 */
exports.STALE_LOCK_THRESHOLD_MS = 30000;
/**
 * Retry interval when waiting for a lock (in milliseconds)
 */
exports.LOCK_RETRY_INTERVAL_MS = 50;
/**
 * Generate a random ID for temporary files
 */
function generateRandomId() {
    return Math.random().toString(36).substring(2, 15);
}
/**
 * Save JSON data atomically
 *
 * Writes to a temporary file first, then renames to the target path.
 * This ensures the file is either fully written or not written at all.
 *
 * @param filePath - Target file path
 * @param data - Data to write
 * @returns SaveResult indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await saveJSONAtomic('.artk/llkb/lessons.json', lessons);
 * if (!result.success) {
 *   console.error('Failed to save:', result.error);
 * }
 * ```
 */
async function saveJSONAtomic(filePath, data) {
    const tempPath = `${filePath}.tmp.${generateRandomId()}`;
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // Write to temp file
        const content = JSON.stringify(data, null, 2);
        fs.writeFileSync(tempPath, content, 'utf-8');
        // Atomic rename
        fs.renameSync(tempPath, filePath);
        return { success: true };
    }
    catch (error) {
        // Clean up temp file if it exists
        try {
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        }
        catch {
            // Ignore cleanup errors
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Synchronous version of saveJSONAtomic
 *
 * @param filePath - Target file path
 * @param data - Data to write
 * @returns SaveResult indicating success or failure
 */
function saveJSONAtomicSync(filePath, data) {
    const tempPath = `${filePath}.tmp.${generateRandomId()}`;
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // Write to temp file
        const content = JSON.stringify(data, null, 2);
        fs.writeFileSync(tempPath, content, 'utf-8');
        // Atomic rename
        fs.renameSync(tempPath, filePath);
        return { success: true };
    }
    catch (error) {
        // Clean up temp file if it exists
        try {
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        }
        catch {
            // Ignore cleanup errors
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Acquire a file lock
 *
 * Creates a .lock file to prevent concurrent access.
 * Handles stale locks from crashed processes.
 *
 * @param filePath - Path of the file to lock
 * @returns true if lock was acquired, false otherwise
 */
function acquireLock(filePath) {
    const lockPath = `${filePath}.lock`;
    const now = Date.now();
    try {
        // Check if lock exists
        if (fs.existsSync(lockPath)) {
            const lockStat = fs.statSync(lockPath);
            const lockAge = now - lockStat.mtimeMs;
            // Check if lock is stale
            if (lockAge > exports.STALE_LOCK_THRESHOLD_MS) {
                // Remove stale lock
                fs.unlinkSync(lockPath);
            }
            else {
                // Lock is active
                return false;
            }
        }
        // Create lock file with exclusive flag
        fs.writeFileSync(lockPath, String(now), { flag: 'wx' });
        return true;
    }
    catch (error) {
        // EEXIST means another process created the lock
        if (error.code === 'EEXIST') {
            return false;
        }
        throw error;
    }
}
/**
 * Release a file lock
 *
 * @param filePath - Path of the file to unlock
 */
function releaseLock(filePath) {
    const lockPath = `${filePath}.lock`;
    try {
        if (fs.existsSync(lockPath)) {
            fs.unlinkSync(lockPath);
        }
    }
    catch {
        // Ignore errors - lock may have been removed by another process
    }
}
/**
 * Update a JSON file with locking
 *
 * Reads the file, applies an update function, and saves atomically.
 * Uses file locking to prevent concurrent modifications.
 *
 * @param filePath - Path to the JSON file
 * @param updateFn - Function that receives current data and returns updated data
 * @returns UpdateResult indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await updateJSONWithLock(
 *   '.artk/llkb/lessons.json',
 *   (lessons) => {
 *     lessons.lessons.push(newLesson);
 *     return lessons;
 *   }
 * );
 * ```
 */
async function updateJSONWithLock(filePath, updateFn) {
    const startTime = Date.now();
    let retriesNeeded = 0;
    // Try to acquire lock with timeout
    while (Date.now() - startTime < exports.LOCK_MAX_WAIT_MS) {
        if (acquireLock(filePath)) {
            try {
                // Read current data
                let data;
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    data = JSON.parse(content);
                }
                else {
                    // File doesn't exist - updateFn must handle this
                    data = {};
                }
                // Apply update
                const updated = updateFn(data);
                // Save atomically
                const saveResult = await saveJSONAtomic(filePath, updated);
                if (!saveResult.success) {
                    return {
                        success: false,
                        error: saveResult.error,
                        retriesNeeded,
                    };
                }
                return { success: true, retriesNeeded };
            }
            finally {
                releaseLock(filePath);
            }
        }
        // Wait before retry
        retriesNeeded++;
        await sleep(exports.LOCK_RETRY_INTERVAL_MS);
    }
    return {
        success: false,
        error: `Could not acquire lock within ${exports.LOCK_MAX_WAIT_MS}ms`,
        retriesNeeded,
    };
}
/**
 * Synchronous version of updateJSONWithLock
 *
 * @param filePath - Path to the JSON file
 * @param updateFn - Function that receives current data and returns updated data
 * @returns UpdateResult indicating success or failure
 */
function updateJSONWithLockSync(filePath, updateFn) {
    const startTime = Date.now();
    let retriesNeeded = 0;
    // Try to acquire lock with timeout
    while (Date.now() - startTime < exports.LOCK_MAX_WAIT_MS) {
        if (acquireLock(filePath)) {
            try {
                // Read current data
                let data;
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    data = JSON.parse(content);
                }
                else {
                    data = {};
                }
                // Apply update
                const updated = updateFn(data);
                // Save atomically
                const saveResult = saveJSONAtomicSync(filePath, updated);
                if (!saveResult.success) {
                    return {
                        success: false,
                        error: saveResult.error,
                        retriesNeeded,
                    };
                }
                return { success: true, retriesNeeded };
            }
            finally {
                releaseLock(filePath);
            }
        }
        // Wait before retry (synchronous)
        retriesNeeded++;
        sleepSync(exports.LOCK_RETRY_INTERVAL_MS);
    }
    return {
        success: false,
        error: `Could not acquire lock within ${exports.LOCK_MAX_WAIT_MS}ms`,
        retriesNeeded,
    };
}
/**
 * Load JSON file with error handling
 *
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON data or null if file doesn't exist
 * @throws Error if file exists but is invalid JSON
 */
function loadJSON(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        throw new Error(`Failed to load JSON from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Ensure a directory exists
 *
 * @param dirPath - Directory path to ensure
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
/**
 * Sleep for a given number of milliseconds (async)
 *
 * @param ms - Milliseconds to sleep
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Sleep synchronously
 *
 * Note: This blocks the event loop. Use sparingly.
 *
 * @param ms - Milliseconds to sleep
 */
function sleepSync(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
        // Busy wait
    }
}
//# sourceMappingURL=file-utils.js.map