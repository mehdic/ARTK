"use strict";
/**
 * Data Factory Utilities
 *
 * Provides factory functions and sequenced factories for test data creation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFactory = createFactory;
exports.createSequencedFactory = createSequencedFactory;
exports.createCustomFactory = createCustomFactory;
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
function createFactory(defaults) {
    return (overrides) => {
        return {
            ...defaults,
            ...overrides,
        };
    };
}
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
function createSequencedFactory(defaults) {
    let sequence = 0;
    const replaceSequence = (value, seq) => {
        if (typeof value === 'string') {
            return value.replace(/\{\{seq\}\}/g, String(seq));
        }
        if (Array.isArray(value)) {
            return value.map((item) => replaceSequence(item, seq));
        }
        if (value !== null && typeof value === 'object') {
            const result = {};
            for (const [key, val] of Object.entries(value)) {
                result[key] = replaceSequence(val, seq);
            }
            return result;
        }
        return value;
    };
    return {
        create(overrides) {
            sequence += 1;
            const merged = {
                ...defaults,
                ...overrides,
            };
            return replaceSequence(merged, sequence);
        },
        reset() {
            sequence = 0;
        },
        count() {
            return sequence;
        },
    };
}
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
function createCustomFactory(initFn) {
    return (overrides) => {
        return initFn(overrides);
    };
}
//# sourceMappingURL=factories.js.map