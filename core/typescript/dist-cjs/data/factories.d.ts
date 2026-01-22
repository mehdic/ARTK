/**
 * Data Factory Utilities
 *
 * Provides factory functions and sequenced factories for test data creation.
 */
import type { DataFactory, SequencedFactory } from './types.js';
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
export declare function createFactory<T extends Record<string, unknown>>(defaults: T): DataFactory<T>;
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
export declare function createSequencedFactory<T extends Record<string, unknown>>(defaults: T): SequencedFactory<T>;
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
export declare function createCustomFactory<T>(initFn: (overrides?: Partial<T>) => T): DataFactory<T>;
//# sourceMappingURL=factories.d.ts.map