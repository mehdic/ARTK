/**
 * Cleanup Manager
 *
 * Manages cleanup operations for test data with priority ordering and error handling.
 * Implements FR-027 and FR-028 from spec.md.
 */
import type { CleanupOptions } from './types.js';
/**
 * Manages cleanup operations for test data lifecycle
 *
 * Features:
 * - Priority-based execution (lower priority runs first)
 * - Continues execution even when cleanup functions fail
 * - Logs all cleanup operations and errors
 * - Supports labeled cleanups for debugging
 *
 * @example
 * const manager = new CleanupManager();
 *
 * manager.register(async () => {
 *   await deleteUser(userId);
 * }, { priority: 10, label: 'Delete user' });
 *
 * manager.register(async () => {
 *   await deleteOrganization(orgId);
 * }, { priority: 20, label: 'Delete organization' });
 *
 * await manager.runAll(); // Deletes user first (priority 10), then org (priority 20)
 */
export declare class CleanupManager {
    private readonly entries;
    private cleanupRun;
    /**
     * Register a cleanup function
     *
     * @param fn - Async cleanup function
     * @param options - Optional priority and label
     */
    register(fn: () => Promise<void>, options?: CleanupOptions): void;
    /**
     * Execute all registered cleanup functions
     *
     * - Runs in priority order (lower values first)
     * - Continues execution even if individual cleanups fail
     * - Logs success and failure for each cleanup
     * - Throws aggregate error if any cleanups failed
     *
     * @throws {AggregateError} If any cleanup functions fail (after all have run)
     */
    runAll(): Promise<void>;
    /**
     * Get count of registered cleanups
     *
     * @returns Number of registered cleanup entries
     */
    count(): number;
    /**
     * Check if cleanup has been executed
     *
     * @returns True if runAll() has been called
     */
    hasRun(): boolean;
    /**
     * Clear all registered cleanups (useful for testing)
     *
     * NOTE: Does not reset cleanupRun flag
     */
    clear(): void;
}
//# sourceMappingURL=cleanup.d.ts.map