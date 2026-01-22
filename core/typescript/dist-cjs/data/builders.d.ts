/**
 * Data Builder Base Class
 *
 * Abstract base class for test data builders with namespacing support.
 * See data-model.md section 2.5 for specification.
 */
import type { NamespaceConfig } from './types.js';
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
export declare abstract class DataBuilder<T> {
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
//# sourceMappingURL=builders.d.ts.map