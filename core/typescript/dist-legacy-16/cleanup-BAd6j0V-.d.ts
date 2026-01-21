/**
 * Data Harness Type Definitions
 *
 * Provides types for test data isolation, namespacing, cleanup, and builders.
 * See data-model.md sections 2.3-2.5 for specification details.
 */
/**
 * Cleanup function entry with priority and optional label
 */
interface CleanupEntry {
    /** Async cleanup function to execute */
    fn: () => Promise<void>;
    /** Lower priority runs first (default: 100) */
    priority: number;
    /** Optional label for logging */
    label?: string;
}
/**
 * Options for registering cleanup functions
 */
interface CleanupOptions {
    /** Priority for cleanup execution (lower runs first) */
    priority?: number;
    /** Label for logging and debugging */
    label?: string;
}
/**
 * Cleanup context interface for data harness
 *
 * Provides cleanup registration and unique run ID for test isolation.
 * Note: This is the internal data module interface. For fixtures, use
 * TestDataManager from fixtures/types.ts instead.
 */
interface CleanupContext {
    /** Unique run ID for this test */
    readonly runId: string;
    /** Register cleanup function */
    cleanup(fn: () => Promise<void>, options?: CleanupOptions): void;
    /** Register API-based cleanup */
    cleanupApi(method: string, url: string, matcher?: Record<string, unknown>): void;
    /** Execute all registered cleanups (called by fixture teardown) */
    runCleanup(): Promise<void>;
}
/**
 * Configuration for data namespacing
 */
interface NamespaceConfig {
    /** Namespace prefix (default: '[artk-') */
    prefix: string;
    /** Namespace suffix (default: ']') */
    suffix: string;
}
/**
 * Data API client options
 */
interface DataApiOptions {
    /** Base URL for data API */
    baseUrl: string;
    /** Use main authentication for API calls */
    useMainAuth?: boolean;
    /** Extra HTTP headers */
    headers?: Record<string, string>;
}
/**
 * Factory function for creating test data instances
 */
type DataFactory<T> = (overrides?: Partial<T>) => T;
/**
 * Sequenced factory that maintains counter for unique values
 */
interface SequencedFactory<T> {
    /** Create instance with auto-incremented sequence number */
    create(overrides?: Partial<T>): T;
    /** Reset sequence counter to 0 */
    reset(): void;
    /** Get current sequence count */
    count(): number;
}

/**
 * Test Data Namespacing Utilities
 *
 * Provides unique run ID generation and namespacing functions for test isolation.
 * Implements FR-025 and FR-026 from spec.md.
 */

/**
 * Generate a unique run ID for test isolation
 *
 * @returns Unique identifier (8 character hex string)
 *
 * @example
 * const runId = generateRunId();
 * // => "a1b2c3d4"
 */
declare function generateRunId(): string;
/**
 * Append namespace identifier to a value for test isolation
 *
 * @param value - Original value to namespace
 * @param runId - Unique run ID
 * @param config - Optional namespace configuration
 * @returns Namespaced value with run ID
 *
 * @example
 * namespace('Test Order', 'abc123');
 * // => "Test Order [artk-abc123]"
 *
 * namespace('Test Order', 'abc123', { prefix: '(test-', suffix: ')' });
 * // => "Test Order (test-abc123)"
 */
declare function namespace(value: string, runId: string, config?: NamespaceConfig): string;
/**
 * Parse namespaced value to extract original value and run ID
 *
 * @param namespacedValue - Value with namespace identifier
 * @param config - Optional namespace configuration
 * @returns Object with original value and run ID, or null if not namespaced
 *
 * @example
 * parseNamespace('Test Order [artk-abc123]');
 * // => { value: 'Test Order', runId: 'abc123' }
 *
 * parseNamespace('Test Order');
 * // => null
 */
declare function parseNamespace(namespacedValue: string, config?: NamespaceConfig): {
    value: string;
    runId: string;
} | null;
/**
 * Check if a value is namespaced
 *
 * @param value - Value to check
 * @param config - Optional namespace configuration
 * @returns True if value contains namespace identifier
 *
 * @example
 * isNamespaced('Test Order [artk-abc123]');
 * // => true
 *
 * isNamespaced('Test Order');
 * // => false
 */
declare function isNamespaced(value: string, config?: NamespaceConfig): boolean;

/**
 * Cleanup Manager
 *
 * Manages cleanup operations for test data with priority ordering and error handling.
 * Implements FR-027 and FR-028 from spec.md.
 */

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
declare class CleanupManager {
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

export { CleanupManager as C, type DataApiOptions as D, type NamespaceConfig as N, type SequencedFactory as S, type CleanupContext as a, type DataFactory as b, type CleanupEntry as c, type CleanupOptions as d, generateRunId as g, isNamespaced as i, namespace as n, parseNamespace as p };
