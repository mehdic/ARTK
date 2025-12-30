/**
 * Data Harness Type Definitions
 *
 * Provides types for test data isolation, namespacing, cleanup, and builders.
 * See data-model.md sections 2.3-2.5 for specification details.
 */

/**
 * Cleanup function entry with priority and optional label
 */
export interface CleanupEntry {
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
export interface CleanupOptions {
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
export interface CleanupContext {
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
export interface NamespaceConfig {
  /** Namespace prefix (default: '[artk-') */
  prefix: string;
  /** Namespace suffix (default: ']') */
  suffix: string;
}

/**
 * Data API client options
 */
export interface DataApiOptions {
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
export type DataFactory<T> = (overrides?: Partial<T>) => T;

/**
 * Sequenced factory that maintains counter for unique values
 */
export interface SequencedFactory<T> {
  /** Create instance with auto-incremented sequence number */
  create(overrides?: Partial<T>): T;
  /** Reset sequence counter to 0 */
  reset(): void;
  /** Get current sequence count */
  count(): number;
}
