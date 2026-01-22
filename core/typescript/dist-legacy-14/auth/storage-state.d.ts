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
import type { BrowserContext } from '@playwright/test';
import type { CleanupResult, StorageState, StorageStateMetadata } from './types.js';
import type { StorageStateConfig } from '../config/types.js';
/**
 * Default storage state configuration
 */
export declare const DEFAULT_STORAGE_STATE_CONFIG: StorageStateConfig;
/**
 * Maximum age in milliseconds for auto-cleanup (24 hours)
 * NFR-007: Delete storage state files older than 24 hours
 */
export declare const CLEANUP_MAX_AGE_MS: number;
/**
 * Options for storage state operations
 */
export interface StorageStateOptions {
    /** Directory to store state files (relative to project root) */
    readonly directory?: string;
    /** Maximum age in minutes before state is considered expired */
    readonly maxAgeMinutes?: number;
    /** File naming pattern */
    readonly filePattern?: string;
    /** Project root directory */
    readonly projectRoot?: string;
    /** Environment name for file pattern */
    readonly environment?: string;
}
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
export declare function saveStorageState(context: BrowserContext, role: string, options?: StorageStateOptions): Promise<string>;
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
export declare function loadStorageState(role: string, options?: StorageStateOptions): Promise<string | undefined>;
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
export declare function isStorageStateValid(role: string, options?: StorageStateOptions): Promise<boolean>;
/**
 * Get metadata about a storage state file
 *
 * @param role - Role name
 * @param options - Storage options
 * @returns Storage state metadata, or undefined if file doesn't exist
 */
export declare function getStorageStateMetadata(role: string, options?: StorageStateOptions): Promise<StorageStateMetadata | undefined>;
/**
 * Read and parse storage state from file
 *
 * @param role - Role name
 * @param options - Storage options
 * @returns Parsed storage state
 * @throws ARTKStorageStateError if file doesn't exist or is invalid
 */
export declare function readStorageState(role: string, options?: StorageStateOptions): Promise<StorageState>;
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
export declare function clearStorageState(role?: string, options?: StorageStateOptions): Promise<number>;
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
export declare function cleanupExpiredStorageStates(options?: StorageStateOptions): Promise<CleanupResult>;
/**
 * Clean up storage states older than a custom age
 *
 * @param maxAgeMs - Maximum age in milliseconds
 * @param options - Storage options
 * @returns Cleanup result
 */
export declare function cleanupStorageStatesOlderThan(maxAgeMs: number, options?: StorageStateOptions): Promise<CleanupResult>;
/**
 * Get role name from a storage state file path
 *
 * @param filePath - Path to storage state file
 * @param pattern - File naming pattern
 * @returns Role name or undefined if can't parse
 */
export declare function getRoleFromPath(filePath: string, pattern?: string): string | undefined;
/**
 * List all storage state files
 *
 * @param options - Storage options
 * @returns Array of storage state metadata
 */
export declare function listStorageStates(options?: StorageStateOptions): Promise<StorageStateMetadata[]>;
//# sourceMappingURL=storage-state.d.ts.map