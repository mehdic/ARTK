/**
 * Cleanup Manager
 *
 * Manages cleanup operations for test data with priority ordering and error handling.
 * Implements FR-027 and FR-028 from spec.md.
 */

import { createLogger } from '../utils/logger.js';
import type { CleanupEntry, CleanupOptions } from './types.js';

/**
 * Polyfill for AggregateError for Node.js 14 (ES2020) compatibility.
 * AggregateError was introduced in ES2021/Node 15.
 */
declare const AggregateError: {
  new (errors: Iterable<unknown>, message?: string): Error & { errors: unknown[] };
} | undefined;

const AggregateErrorPolyfill: new (
  errors: Iterable<unknown>,
  message?: string,
) => Error & { errors: unknown[] } =
  typeof AggregateError !== 'undefined'
    ? AggregateError
    : class extends Error {
        errors: unknown[];
        constructor(errors: Iterable<unknown>, message?: string) {
          super(message);
          this.name = 'AggregateError';
          this.errors = Array.from(errors);
        }
      };

const logger = createLogger('data', 'CleanupManager');

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
export class CleanupManager {
  private readonly entries: CleanupEntry[] = [];
  private cleanupRun = false;

  /**
   * Register a cleanup function
   *
   * @param fn - Async cleanup function
   * @param options - Optional priority and label
   */
  register(fn: () => Promise<void>, options: CleanupOptions = {}): void {
    const { priority = 100, label } = options;

    if (this.cleanupRun) {
      logger.warn('Cleanup already run, new registration will be ignored', {
        label,
        priority,
      });
      return;
    }

    this.entries.push({
      fn,
      priority,
      label,
    });

    logger.debug('Cleanup registered', {
      priority,
      label: label ?? 'unlabeled',
      totalEntries: this.entries.length,
    });
  }

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
  async runAll(): Promise<void> {
    if (this.cleanupRun) {
      logger.warn('Cleanup already executed, skipping duplicate run');
      return;
    }

    this.cleanupRun = true;

    if (this.entries.length === 0) {
      logger.debug('No cleanup entries to execute');
      return;
    }

    // Sort by priority (lower values first)
    const sorted = [...this.entries].sort((a, b) => a.priority - b.priority);

    logger.info(`Executing ${sorted.length} cleanup operations`, {
      entries: sorted.map((e) => ({
        priority: e.priority,
        label: e.label ?? 'unlabeled',
      })),
    });

    const errors: Error[] = [];

    for (const entry of sorted) {
      const label = entry.label ?? 'unlabeled';

      try {
        logger.debug(`Running cleanup: ${label}`, {
          priority: entry.priority,
        });

        await entry.fn();

        logger.debug(`Cleanup succeeded: ${label}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        logger.error(`Cleanup failed: ${label}`, {
          priority: entry.priority,
          error: errorMessage,
        });

        errors.push(
          new Error(`Cleanup "${label}" (priority ${entry.priority}) failed: ${errorMessage}`),
        );

        // Continue with remaining cleanups despite error
      }
    }

    if (errors.length > 0) {
      logger.error(`${errors.length} cleanup operations failed`, {
        failedCount: errors.length,
        totalCount: sorted.length,
      });

      throw new AggregateErrorPolyfill(
        errors,
        `${errors.length} of ${sorted.length} cleanup operations failed`,
      );
    }

    logger.info('All cleanup operations completed successfully', {
      totalCount: sorted.length,
    });
  }

  /**
   * Get count of registered cleanups
   *
   * @returns Number of registered cleanup entries
   */
  count(): number {
    return this.entries.length;
  }

  /**
   * Check if cleanup has been executed
   *
   * @returns True if runAll() has been called
   */
  hasRun(): boolean {
    return this.cleanupRun;
  }

  /**
   * Clear all registered cleanups (useful for testing)
   *
   * NOTE: Does not reset cleanupRun flag
   */
  clear(): void {
    this.entries.length = 0;
    logger.debug('All cleanup entries cleared');
  }
}
