/**
 * Test Data Namespacing Utilities
 *
 * Provides unique run ID generation and namespacing functions for test isolation.
 * Implements FR-025 and FR-026 from spec.md.
 */

import { randomBytes } from 'node:crypto';
import type { NamespaceConfig } from './types.js';

/**
 * Default namespace configuration
 */
const DEFAULT_CONFIG: NamespaceConfig = {
  prefix: '[artk-',
  suffix: ']',
};

/**
 * Generate a unique run ID for test isolation
 *
 * @returns Unique identifier (8 character hex string)
 *
 * @example
 * const runId = generateRunId();
 * // => "a1b2c3d4"
 */
export function generateRunId(): string {
  return randomBytes(4).toString('hex');
}

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
export function namespace(
  value: string,
  runId: string,
  config: NamespaceConfig = DEFAULT_CONFIG,
): string {
  return `${value} ${config.prefix}${runId}${config.suffix}`;
}

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
export function parseNamespace(
  namespacedValue: string,
  config: NamespaceConfig = DEFAULT_CONFIG,
): { value: string; runId: string } | null {
  // Escape special regex characters in prefix and suffix
  const escapeRegex = (str: string): string =>
    str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const escapedPrefix = escapeRegex(config.prefix);
  const escapedSuffix = escapeRegex(config.suffix);

  // Pattern: "anything space prefix runId suffix" at end of string
  const pattern = new RegExp(
    `^(.+)\\s${escapedPrefix}([a-f0-9]+)${escapedSuffix}$`,
  );

  const match = namespacedValue.match(pattern);

  if (!match) {
    return null;
  }

  return {
    value: match[1],
    runId: match[2],
  };
}

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
export function isNamespaced(
  value: string,
  config: NamespaceConfig = DEFAULT_CONFIG,
): boolean {
  return parseNamespace(value, config) !== null;
}
