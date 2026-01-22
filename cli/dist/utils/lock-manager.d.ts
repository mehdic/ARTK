/**
 * ARTK Lock File Manager
 *
 * Prevents concurrent installations by managing a lock file.
 * Lock file: .artk/install.lock
 */
import type { LockFile, LockOperation } from './variant-types.js';
/**
 * Lock file manager class.
 */
export declare class LockManager {
    private lockPath;
    private artkDir;
    constructor(targetPath: string);
    /**
     * Ensure the .artk directory exists.
     */
    private ensureDirectory;
    /**
     * Read the current lock file.
     */
    private readLock;
    /**
     * Check if a process is still running.
     */
    private isProcessRunning;
    /**
     * Check if a lock is stale (process dead or timeout exceeded).
     */
    private isLockStale;
    /**
     * Try to acquire the lock atomically.
     *
     * Uses O_EXCL flag to prevent race conditions where two processes
     * might both pass the existence check simultaneously.
     *
     * Returns true if lock was acquired, false if another process holds it.
     */
    acquire(operation: LockOperation): {
        acquired: boolean;
        error?: string;
    };
    /**
     * Release the lock (delete the lock file).
     */
    release(): void;
    /**
     * Check if the lock is held by the current process.
     */
    isOwnLock(): boolean;
    /**
     * Check if any lock exists (owned by anyone).
     */
    isLocked(): boolean;
    /**
     * Get lock information.
     */
    getLockInfo(): {
        locked: boolean;
        lock?: LockFile;
        stale?: boolean;
    };
    /**
     * Force release (clear stale locks).
     */
    forceRelease(): void;
    /**
     * Get the lock file path.
     */
    getLockPath(): string;
}
/**
 * Create a lock manager for the given target path.
 */
export declare function createLockManager(targetPath: string): LockManager;
/**
 * Execute a function with lock protection.
 * Automatically acquires and releases the lock.
 */
export declare function withLock<T>(targetPath: string, operation: LockOperation, fn: () => Promise<T>): Promise<T>;
//# sourceMappingURL=lock-manager.d.ts.map