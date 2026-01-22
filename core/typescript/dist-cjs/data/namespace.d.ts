/**
 * Test Data Namespacing Utilities
 *
 * Provides unique run ID generation and namespacing functions for test isolation.
 * Implements FR-025 and FR-026 from spec.md.
 */
import type { NamespaceConfig } from './types.js';
/**
 * Generate a unique run ID for test isolation
 *
 * @returns Unique identifier (8 character hex string)
 *
 * @example
 * const runId = generateRunId();
 * // => "a1b2c3d4"
 */
export declare function generateRunId(): string;
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
export declare function namespace(value: string, runId: string, config?: NamespaceConfig): string;
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
export declare function parseNamespace(namespacedValue: string, config?: NamespaceConfig): {
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
export declare function isNamespaced(value: string, config?: NamespaceConfig): boolean;
//# sourceMappingURL=namespace.d.ts.map