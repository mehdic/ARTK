/**
 * File Utilities for LLKB
 *
 * Provides safe file operations including atomic writes and file locking
 * to prevent data corruption from concurrent access.
 *
 * @module llkb/file-utils
 */
import type { SaveResult, UpdateResult } from './types.js';
/**
 * Maximum wait time for acquiring a lock (in milliseconds)
 */
export declare const LOCK_MAX_WAIT_MS = 5000;
/**
 * Stale lock threshold (in milliseconds)
 * Locks older than this are considered abandoned
 */
export declare const STALE_LOCK_THRESHOLD_MS = 30000;
/**
 * Retry interval when waiting for a lock (in milliseconds)
 */
export declare const LOCK_RETRY_INTERVAL_MS = 50;
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
export declare function saveJSONAtomic(filePath: string, data: unknown): Promise<SaveResult>;
/**
 * Synchronous version of saveJSONAtomic
 *
 * @param filePath - Target file path
 * @param data - Data to write
 * @returns SaveResult indicating success or failure
 */
export declare function saveJSONAtomicSync(filePath: string, data: unknown): SaveResult;
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
export declare function updateJSONWithLock<T>(filePath: string, updateFn: (data: T) => T): Promise<UpdateResult>;
/**
 * Synchronous version of updateJSONWithLock
 *
 * @param filePath - Path to the JSON file
 * @param updateFn - Function that receives current data and returns updated data
 * @returns UpdateResult indicating success or failure
 */
export declare function updateJSONWithLockSync<T>(filePath: string, updateFn: (data: T) => T): UpdateResult;
/**
 * Load JSON file with error handling
 *
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON data or null if file doesn't exist
 * @throws Error if file exists but is invalid JSON
 */
export declare function loadJSON<T>(filePath: string): T | null;
/**
 * Ensure a directory exists
 *
 * @param dirPath - Directory path to ensure
 */
export declare function ensureDir(dirPath: string): void;
//# sourceMappingURL=file-utils.d.ts.map