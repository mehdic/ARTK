/**
 * Data Harness Module API Contract
 *
 * This contract defines the public API for the ARTK Data Harness module.
 * Implementation must satisfy these type signatures.
 */

// =============================================================================
// Run ID and Namespacing
// =============================================================================

/**
 * Generate a unique run ID for test isolation
 *
 * Format: artk-{shortId}-{timestamp}
 *
 * @returns Unique identifier string
 *
 * @example
 * generateRunId() // 'artk-a1b2c3-1703850000'
 */
export declare function generateRunId(): string;

/**
 * Add namespace suffix to a value for test isolation
 *
 * Uses configured prefix/suffix from data.namespace.
 *
 * @param value - Original value
 * @param runId - Run ID to append
 * @returns Namespaced value
 *
 * @example
 * namespace('Test Order', 'artk-abc123')
 * // Returns: 'Test Order [artk-abc123]'
 */
export declare function namespace(value: string, runId: string): string;

/**
 * Parse a namespaced value to extract original and run ID
 *
 * @param value - Namespaced value
 * @returns Object with original value and run ID
 *
 * @example
 * parseNamespace('Test Order [artk-abc123]')
 * // Returns: { original: 'Test Order', runId: 'artk-abc123' }
 */
export declare function parseNamespace(value: string): {
  original: string;
  runId: string | null;
};

/**
 * Check if a value contains a namespace suffix
 *
 * @param value - Value to check
 * @returns true if value is namespaced
 */
export declare function isNamespaced(value: string): boolean;

// =============================================================================
// Cleanup Manager
// =============================================================================

export interface CleanupOptions {
  /** Lower priority runs first (default: 100) */
  priority?: number;
  /** Label for logging */
  label?: string;
}

/**
 * Cleanup manager for registering and executing cleanup functions
 */
export declare class CleanupManager {
  /**
   * Register a cleanup function
   *
   * @param fn - Async cleanup function
   * @param options - Optional priority and label
   *
   * @example
   * cleanup.register(async () => {
   *   await api.deleteOrder(orderId);
   * }, { label: 'delete test order' });
   */
  register(fn: () => Promise<void>, options?: CleanupOptions): void;

  /**
   * Register an API-based cleanup
   *
   * Convenience method for REST API cleanup operations.
   *
   * @param method - HTTP method (DELETE, POST, etc.)
   * @param url - Endpoint URL
   * @param matcher - Optional request body/params
   *
   * @example
   * cleanup.registerApi('DELETE', '/api/orders/123');
   * cleanup.registerApi('POST', '/api/cleanup', { runId: 'artk-abc123' });
   */
  registerApi(method: string, url: string, matcher?: Record<string, unknown>): void;

  /**
   * Execute all registered cleanup functions
   *
   * Runs in priority order. Continues on error, logging failures.
   *
   * @returns Array of errors (empty if all succeeded)
   */
  runAll(): Promise<Error[]>;

  /**
   * Clear all registered cleanups without running them
   */
  clear(): void;

  /**
   * Get count of registered cleanups
   */
  get count(): number;
}

// =============================================================================
// Data Builder Base
// =============================================================================

/**
 * Abstract base class for test data builders
 *
 * @example
 * class OrderBuilder extends DataBuilder<Order> {
 *   private name = 'Test Order';
 *   private items: OrderItem[] = [];
 *
 *   withName(name: string) {
 *     this.name = name;
 *     return this;
 *   }
 *
 *   withItem(item: OrderItem) {
 *     this.items.push(item);
 *     return this;
 *   }
 *
 *   build(): Order {
 *     return {
 *       name: this.namespacedValue(this.name),
 *       items: this.items,
 *     };
 *   }
 *
 *   buildForApi(): Record<string, unknown> {
 *     return this.build();
 *   }
 * }
 *
 * // Usage:
 * const order = new OrderBuilder()
 *   .withName('My Order')
 *   .withNamespace(runId)
 *   .build();
 */
export declare abstract class DataBuilder<T> {
  protected runId?: string;

  /**
   * Set the run ID for namespacing
   *
   * @param runId - Run ID to use for namespacing
   * @returns this (for chaining)
   */
  withNamespace(runId: string): this;

  /**
   * Apply namespace to a value if runId is set
   *
   * @param value - Value to namespace
   * @returns Namespaced value if runId set, otherwise original
   */
  protected namespacedValue(value: string): string;

  /**
   * Build the data object
   *
   * @returns Built data object
   */
  abstract build(): T;

  /**
   * Build the data object for API submission
   *
   * May differ from build() if API expects different format.
   *
   * @returns API-ready data object
   */
  buildForApi?(): Record<string, unknown>;
}

// =============================================================================
// Data API Client
// =============================================================================

export interface DataApiClientConfig {
  baseUrl: string;
  authToken?: string;
  extraHeaders?: Record<string, string>;
}

/**
 * Base API client for data operations (create, delete, query)
 */
export declare class DataApiClient {
  constructor(config: DataApiClientConfig);

  /**
   * Create a new resource
   *
   * @param endpoint - API endpoint (e.g., '/orders')
   * @param data - Resource data
   * @returns Created resource with ID
   *
   * @example
   * const order = await client.create('/orders', { name: 'Test Order' });
   * console.log(order.id); // '123'
   */
  create<T>(endpoint: string, data: T): Promise<T & { id: string }>;

  /**
   * Delete a resource by ID
   *
   * @param endpoint - API endpoint
   * @param id - Resource ID
   */
  delete(endpoint: string, id: string): Promise<void>;

  /**
   * Delete resources matching a filter
   *
   * Useful for cleanup by run ID.
   *
   * @param endpoint - API endpoint
   * @param filter - Filter criteria
   * @returns Number of deleted resources
   *
   * @example
   * // Delete all orders with names containing the run ID
   * const count = await client.deleteWhere('/orders', {
   *   nameContains: runId
   * });
   */
  deleteWhere(endpoint: string, filter: Record<string, unknown>): Promise<number>;

  /**
   * Query resources
   *
   * @param endpoint - API endpoint
   * @param query - Query parameters
   * @returns Array of matching resources
   */
  query<T>(endpoint: string, query?: Record<string, unknown>): Promise<T[]>;

  /**
   * Get a single resource by ID
   *
   * @param endpoint - API endpoint
   * @param id - Resource ID
   * @returns Resource or null if not found
   */
  get<T>(endpoint: string, id: string): Promise<T | null>;
}

// =============================================================================
// Factory Pattern Utilities
// =============================================================================

/**
 * Factory function type for creating test data
 */
export type DataFactory<T> = (overrides?: Partial<T>) => T;

/**
 * Create a data factory function
 *
 * @param defaults - Default values for the data
 * @returns Factory function
 *
 * @example
 * const createUser = createFactory<User>({
 *   name: 'Test User',
 *   email: 'test@example.com',
 *   role: 'user'
 * });
 *
 * const user1 = createUser(); // Uses all defaults
 * const admin = createUser({ role: 'admin' }); // Override role
 */
export declare function createFactory<T extends Record<string, unknown>>(
  defaults: T
): DataFactory<T>;

/**
 * Create a sequenced data factory (for unique values)
 *
 * @param generator - Function that takes sequence number and returns data
 * @returns Factory function
 *
 * @example
 * const createUser = createSequencedFactory<User>((n) => ({
 *   name: `User ${n}`,
 *   email: `user${n}@example.com`,
 * }));
 *
 * const user1 = createUser(); // { name: 'User 1', email: 'user1@example.com' }
 * const user2 = createUser(); // { name: 'User 2', email: 'user2@example.com' }
 */
export declare function createSequencedFactory<T>(
  generator: (sequence: number) => T
): DataFactory<T>;
