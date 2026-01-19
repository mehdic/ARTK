/**
 * ARTK Lock File Manager
 *
 * Prevents concurrent installations by managing a lock file.
 * Lock file: .artk/install.lock
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LockFile, LockOperation } from './variant-types.js';
import { LockFileSchema } from './variant-schemas.js';

/**
 * Lock timeout in milliseconds (10 minutes).
 * Locks older than this are considered stale.
 */
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Lock file manager class.
 */
export class LockManager {
  private lockPath: string;
  private artkDir: string;

  constructor(targetPath: string) {
    this.artkDir = path.join(targetPath, '.artk');
    this.lockPath = path.join(this.artkDir, 'install.lock');
  }

  /**
   * Ensure the .artk directory exists.
   */
  private ensureDirectory(): void {
    if (!fs.existsSync(this.artkDir)) {
      fs.mkdirSync(this.artkDir, { recursive: true });
    }
  }

  /**
   * Read the current lock file.
   */
  private readLock(): LockFile | null {
    if (!fs.existsSync(this.lockPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.lockPath, 'utf-8');
      const data = JSON.parse(content);
      const result = LockFileSchema.safeParse(data);

      if (result.success) {
        return result.data;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if a process is still running.
   */
  private isProcessRunning(pid: number): boolean {
    try {
      // Sending signal 0 checks if process exists without killing it
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a lock is stale (process dead or timeout exceeded).
   */
  private isLockStale(lock: LockFile): boolean {
    // Check if process is still running
    if (!this.isProcessRunning(lock.pid)) {
      return true;
    }

    // Check if lock is too old
    const lockTime = new Date(lock.startedAt).getTime();
    const now = Date.now();

    if (now - lockTime > LOCK_TIMEOUT_MS) {
      return true;
    }

    return false;
  }

  /**
   * Try to acquire the lock.
   *
   * Returns true if lock was acquired, false if another process holds it.
   * Throws if there's an unexpected error.
   */
  acquire(operation: LockOperation): { acquired: boolean; error?: string } {
    this.ensureDirectory();

    const existingLock = this.readLock();

    if (existingLock) {
      if (this.isLockStale(existingLock)) {
        // Stale lock, remove it
        this.release();
      } else {
        // Another process is running
        const startedAt = new Date(existingLock.startedAt).toLocaleString();
        return {
          acquired: false,
          error: `Another ${existingLock.operation} operation is in progress (PID: ${existingLock.pid}, started: ${startedAt}). ` +
            `Please wait for it to complete or remove the lock file at ${this.lockPath}`,
        };
      }
    }

    // Create new lock
    const lock: LockFile = {
      pid: process.pid,
      startedAt: new Date().toISOString(),
      operation,
    };

    try {
      fs.writeFileSync(this.lockPath, JSON.stringify(lock, null, 2), 'utf-8');
      return { acquired: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        acquired: false,
        error: `Failed to create lock file: ${message}`,
      };
    }
  }

  /**
   * Release the lock (delete the lock file).
   */
  release(): void {
    try {
      if (fs.existsSync(this.lockPath)) {
        fs.unlinkSync(this.lockPath);
      }
    } catch {
      // Ignore errors when deleting lock file
    }
  }

  /**
   * Check if the lock is held by the current process.
   */
  isOwnLock(): boolean {
    const lock = this.readLock();
    return lock !== null && lock.pid === process.pid;
  }

  /**
   * Check if any lock exists (owned by anyone).
   */
  isLocked(): boolean {
    const lock = this.readLock();

    if (!lock) {
      return false;
    }

    // If stale, consider it unlocked
    return !this.isLockStale(lock);
  }

  /**
   * Get lock information.
   */
  getLockInfo(): { locked: boolean; lock?: LockFile; stale?: boolean } {
    const lock = this.readLock();

    if (!lock) {
      return { locked: false };
    }

    const stale = this.isLockStale(lock);

    return {
      locked: !stale,
      lock,
      stale,
    };
  }

  /**
   * Force release (clear stale locks).
   */
  forceRelease(): void {
    this.release();
  }

  /**
   * Get the lock file path.
   */
  getLockPath(): string {
    return this.lockPath;
  }
}

/**
 * Create a lock manager for the given target path.
 */
export function createLockManager(targetPath: string): LockManager {
  return new LockManager(targetPath);
}

/**
 * Execute a function with lock protection.
 * Automatically acquires and releases the lock.
 */
export async function withLock<T>(
  targetPath: string,
  operation: LockOperation,
  fn: () => Promise<T>
): Promise<T> {
  const lockManager = createLockManager(targetPath);
  const { acquired, error } = lockManager.acquire(operation);

  if (!acquired) {
    throw new Error(error || 'Failed to acquire lock');
  }

  try {
    return await fn();
  } finally {
    lockManager.release();
  }
}
