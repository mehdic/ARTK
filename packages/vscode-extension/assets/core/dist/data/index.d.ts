import { N as NamespaceConfig, D as DataApiOptions, b as DataFactory, S as SequencedFactory } from '../cleanup-BAd6j0V-.js';
export { a as CleanupContext, c as CleanupEntry, C as CleanupManager, d as CleanupOptions, g as generateRunId, i as isNamespaced, n as namespace, p as parseNamespace } from '../cleanup-BAd6j0V-.js';

/**
 * Data Builder Base Class
 *
 * Abstract base class for test data builders with namespacing support.
 * See data-model.md section 2.5 for specification.
 */

/**
 * Abstract base class for test data builders
 *
 * Features:
 * - Fluent API with withNamespace()
 * - Automatic namespacing of string values
 * - Optional API representation via buildForApi()
 * - Type-safe with TypeScript generics
 *
 * @template T - The type of data object this builder creates
 *
 * @example
 * class UserBuilder extends DataBuilder<User> {
 *   private username = 'testuser';
 *   private email = 'test@example.com';
 *
 *   withUsername(username: string): this {
 *     this.username = username;
 *     return this;
 *   }
 *
 *   withEmail(email: string): this {
 *     this.email = email;
 *     return this;
 *   }
 *
 *   build(): User {
 *     return {
 *       username: this.namespacedValue(this.username),
 *       email: this.namespacedValue(this.email),
 *     };
 *   }
 * }
 *
 * const user = new UserBuilder()
 *   .withNamespace('abc123')
 *   .withUsername('john')
 *   .build();
 * // => { username: 'john [artk-abc123]', email: 'test@example.com [artk-abc123]' }
 */
declare abstract class DataBuilder<T> {
    protected runId?: string;
    protected namespaceConfig?: NamespaceConfig;
    /**
     * Set namespace run ID for test isolation
     *
     * @param runId - Unique run identifier
     * @param config - Optional namespace configuration
     * @returns This builder for chaining
     */
    withNamespace(runId: string, config?: NamespaceConfig): this;
    /**
     * Apply namespace to a string value if runId is set
     *
     * @param value - Original value
     * @returns Namespaced value if runId is set, otherwise original value
     *
     * @example
     * // Without namespace
     * this.namespacedValue('Test User');
     * // => "Test User"
     *
     * // With namespace
     * this.withNamespace('abc123');
     * this.namespacedValue('Test User');
     * // => "Test User [artk-abc123]"
     */
    protected namespacedValue(value: string): string;
    /**
     * Build the data object
     *
     * Must be implemented by subclasses to create the actual data instance.
     *
     * @returns Built data object
     */
    abstract build(): T;
    /**
     * Build API representation of the data
     *
     * Optional method for creating API request payloads.
     * Default implementation returns the same as build().
     *
     * @returns API-compatible representation
     */
    buildForApi?(): Record<string, unknown>;
}

/**
 * Data API Client
 *
 * HTTP client for test data operations via API endpoints.
 * Supports authenticated requests and cleanup registration.
 */

/**
 * HTTP client for test data creation and cleanup
 *
 * Features:
 * - RESTful API operations (GET, POST, PUT, DELETE)
 * - Automatic authentication header injection
 * - JSON request/response handling
 * - Error handling with detailed logging
 *
 * @example
 * const client = new DataApiClient({
 *   baseUrl: 'https://api.example.com',
 *   headers: { 'Authorization': 'Bearer token123' }
 * });
 *
 * const user = await client.post('/users', {
 *   username: 'testuser',
 *   email: 'test@example.com'
 * });
 *
 * await client.delete(`/users/${user.id}`);
 */
declare class DataApiClient {
    private readonly baseUrl;
    private readonly headers;
    /**
     * Create a new data API client
     *
     * @param options - Client configuration
     */
    constructor(options: DataApiOptions);
    /**
     * Perform GET request
     *
     * @param path - API endpoint path (e.g., '/users/123')
     * @returns Response data
     */
    get<T = unknown>(path: string): Promise<T>;
    /**
     * Perform POST request
     *
     * @param path - API endpoint path
     * @param data - Request body
     * @returns Response data
     */
    post<T = unknown>(path: string, data: Record<string, unknown>): Promise<T>;
    /**
     * Perform PUT request
     *
     * @param path - API endpoint path
     * @param data - Request body
     * @returns Response data
     */
    put<T = unknown>(path: string, data: Record<string, unknown>): Promise<T>;
    /**
     * Perform DELETE request
     *
     * @param path - API endpoint path
     * @param data - Optional request body
     * @returns Response data
     */
    delete<T = unknown>(path: string, data?: Record<string, unknown>): Promise<T>;
    /**
     * Perform HTTP request with error handling
     *
     * @param method - HTTP method
     * @param path - API endpoint path
     * @param data - Optional request body
     * @returns Response data
     * @throws {Error} If request fails
     */
    private request;
    /**
     * Create cleanup function for API-based resource deletion
     *
     * @param method - HTTP method (typically 'DELETE')
     * @param path - API endpoint path
     * @param matcher - Optional data matcher for conditional deletion
     * @returns Cleanup function
     *
     * @example
     * const cleanup = client.createCleanup('DELETE', '/users/123');
     * cleanupManager.register(cleanup, { label: 'Delete test user' });
     */
    createCleanup(method: string, path: string, matcher?: Record<string, unknown>): () => Promise<void>;
}

/**
 * Data Factory Utilities
 *
 * Provides factory functions and sequenced factories for test data creation.
 */

/**
 * Create a simple data factory function
 *
 * @param defaults - Default values for the data object
 * @returns Factory function that merges defaults with overrides
 *
 * @example
 * const createUser = createFactory({
 *   username: 'testuser',
 *   email: 'test@example.com',
 *   active: true
 * });
 *
 * const user1 = createUser();
 * // => { username: 'testuser', email: 'test@example.com', active: true }
 *
 * const user2 = createUser({ username: 'john' });
 * // => { username: 'john', email: 'test@example.com', active: true }
 */
declare function createFactory<T extends Record<string, unknown>>(defaults: T): DataFactory<T>;
/**
 * Create a sequenced factory that auto-increments values
 *
 * Features:
 * - Automatically increments counter for each create() call
 * - Supports template strings with {{seq}} placeholder
 * - Maintains separate counter per factory instance
 * - Can be reset via reset() method
 *
 * @param defaults - Default values (use "{{seq}}" for sequence number)
 * @returns Sequenced factory with create(), reset(), and count() methods
 *
 * @example
 * const createUser = createSequencedFactory({
 *   username: 'user{{seq}}',
 *   email: 'user{{seq}}@example.com',
 *   active: true
 * });
 *
 * const user1 = createUser.create();
 * // => { username: 'user1', email: 'user1@example.com', active: true }
 *
 * const user2 = createUser.create({ active: false });
 * // => { username: 'user2', email: 'user2@example.com', active: false }
 *
 * createUser.count();
 * // => 2
 *
 * createUser.reset();
 * createUser.count();
 * // => 0
 */
declare function createSequencedFactory<T extends Record<string, unknown>>(defaults: T): SequencedFactory<T>;
/**
 * Create a factory with custom initialization logic
 *
 * @param initFn - Function that creates a new instance
 * @returns Factory function
 *
 * @example
 * const createUser = createCustomFactory((overrides = {}) => {
 *   const defaults = {
 *     id: Math.random().toString(36).substr(2, 9),
 *     createdAt: new Date().toISOString(),
 *     username: 'testuser',
 *     ...overrides
 *   };
 *   return defaults;
 * });
 *
 * const user = createUser({ username: 'john' });
 * // => { id: 'abc123def', createdAt: '2025-12-29T...', username: 'john' }
 */
declare function createCustomFactory<T>(initFn: (overrides?: Partial<T>) => T): DataFactory<T>;

export { DataApiClient, DataApiOptions, DataBuilder, DataFactory, NamespaceConfig, SequencedFactory, createCustomFactory, createFactory, createSequencedFactory };
