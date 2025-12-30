/**
 * Data Fixtures (T053, T054)
 *
 * Provides test data isolation and cleanup fixtures:
 * - runId: Unique identifier for test isolation
 * - testData: Manager for cleanup registration
 *
 * @module fixtures/data
 * @see FR-025: Unique run ID generation
 * @see FR-026: Namespacing utilities
 * @see FR-027: Cleanup registration
 * @see FR-028: Cleanup execution
 */

import { testWithAPIContext } from './api.js';
import type { TestDataManager } from './types.js';
import type { ARTKConfig } from '../config/types.js';
import type { CleanupOptions } from '../data/types.js';
import { namespace as dataNamespace, generateRunId as generateDataRunId } from '../data/namespace.js';
import { CleanupManager } from '../data/cleanup.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('fixtures', 'data');

// =============================================================================
// Data Fixtures
// =============================================================================

/**
 * Fixtures providing test data isolation and cleanup
 */
export interface DataFixtures {
  /** Unique run ID for test isolation (8-char hex) */
  runId: string;

  /** Test data manager for cleanup registration */
  testData: TestDataManager;
}

/**
 * Generate a unique run ID for test isolation
 *
 * Format: 8 character hexadecimal string
 *
 * @returns Unique identifier string
 *
 * @example
 * ```typescript
 * const runId = generateRunId(); // 'a1b2c3d4'
 * ```
 */
export function generateRunId(): string {
  return generateDataRunId();
}

/**
 * Create a test data manager instance
 *
 * @param runId - Run ID for namespacing
 * @param config - ARTK configuration
 * @returns TestDataManager instance
 *
 * @example
 * ```typescript
 * const manager = createTestDataManager('abc123', config);
 * manager.cleanup(async () => { await deleteOrder(orderId); });
 * await manager.runCleanup();
 * ```
 */
export function createTestDataManager(
  runId: string,
  _config: ARTKConfig
): TestDataManager {
  const cleanupManager = new CleanupManager();
  const pendingApiCleanups: Array<{
    method: string;
    url: string;
    matcher?: Record<string, unknown>;
  }> = [];

  return {
    runId,

    cleanup(fn: () => Promise<void>, options?: CleanupOptions): void {
      cleanupManager.register(fn, options);
      logger.debug('Cleanup registered', {
        runId,
        label: options?.label ?? 'unlabeled',
        priority: options?.priority ?? 100,
      });
    },

    cleanupApi(method: string, url: string, matcher?: Record<string, unknown>): void {
      pendingApiCleanups.push({ method, url, matcher });
      logger.debug('API cleanup registered', {
        runId,
        method,
        url,
      });
    },

    async runCleanup(): Promise<void> {
      logger.info('Running cleanups', {
        runId,
        registeredCount: cleanupManager.count(),
        apiCleanupCount: pendingApiCleanups.length,
      });

      // Run API cleanups first (converted to regular cleanup functions)
      // Note: API cleanups would need an API context to execute
      // For now, we log a warning if there are pending API cleanups
      if (pendingApiCleanups.length > 0) {
        logger.warn('API cleanups registered but not executed', {
          count: pendingApiCleanups.length,
          hint: 'Use cleanup() with async function for actual API calls',
        });
      }

      // Run registered cleanups
      await cleanupManager.runAll();
    },
  };
}

/**
 * Test extended with data fixtures
 *
 * @example
 * ```typescript
 * import { testWithData } from '@artk/core/fixtures/data';
 *
 * testWithData('creates order with cleanup', async ({ testData, runId }) => {
 *   const orderName = `Test Order [${runId}]`;
 *   const order = await createOrder({ name: orderName });
 *
 *   testData.cleanup(async () => {
 *     await deleteOrder(order.id);
 *   }, { priority: 10, label: 'Delete order' });
 *
 *   // Test assertions...
 * });
 * ```
 */
export const testWithData = testWithAPIContext.extend<DataFixtures>({
  // Unique run ID per test
  runId: async ({}, use) => {
    const id = generateRunId();
    logger.debug('Generated run ID', { runId: id });
    await use(id);
  },

  // Test data manager with cleanup registration
  testData: async ({ runId, config }, use) => {
    const manager = createTestDataManager(runId, config);

    logger.info('Test data manager created', { runId });

    try {
      await use(manager);
    } finally {
      // Always run cleanup, even if test failed
      const shouldCleanup = config.data.cleanup.enabled;
      const cleanupOnFailure = config.data.cleanup.onFailure;

      if (shouldCleanup) {
        logger.debug('Running cleanup after test', {
          runId,
          cleanupEnabled: shouldCleanup,
          cleanupOnFailure,
        });

        try {
          await manager.runCleanup();
        } catch (error) {
          // Log but don't fail the test if cleanup fails
          logger.error('Cleanup failed', {
            runId,
            error: String(error),
          });
        }
      } else {
        logger.debug('Cleanup disabled in config', { runId });
      }
    }
  },
});

// =============================================================================
// Test Data Utilities
// =============================================================================

/**
 * Namespace a value with the run ID
 *
 * @param value - Original value
 * @param runId - Run ID
 * @param config - ARTK configuration (for namespace settings)
 * @returns Namespaced value
 *
 * @example
 * ```typescript
 * const name = namespaceValue('Test Order', runId, config);
 * // Returns: 'Test Order [artk-abc123]'
 * ```
 */
export function namespaceValue(
  value: string,
  runId: string,
  config: ARTKConfig
): string {
  return dataNamespace(value, runId, {
    prefix: config.data.namespace.prefix,
    suffix: config.data.namespace.suffix,
  });
}

/**
 * Create a unique test name with run ID
 *
 * @param baseName - Base name for the test item
 * @param runId - Run ID
 * @returns Unique name including run ID
 *
 * @example
 * ```typescript
 * const uniqueName = createUniqueName('Order', runId);
 * // Returns: 'Order-abc123'
 * ```
 */
export function createUniqueName(baseName: string, runId: string): string {
  return `${baseName}-${runId}`;
}

/**
 * Create a unique email address for test data
 *
 * @param prefix - Email prefix
 * @param runId - Run ID
 * @param domain - Email domain (default: 'test.example.com')
 * @returns Unique email address
 *
 * @example
 * ```typescript
 * const email = createUniqueEmail('user', runId);
 * // Returns: 'user-abc123@test.example.com'
 * ```
 */
export function createUniqueEmail(
  prefix: string,
  runId: string,
  domain: string = 'test.example.com'
): string {
  return `${prefix}-${runId}@${domain}`;
}

/**
 * Check if cleanup should run based on config and test status
 *
 * @param config - ARTK configuration
 * @param testPassed - Whether the test passed
 * @returns true if cleanup should run
 */
export function shouldRunCleanup(config: ARTKConfig, testPassed: boolean): boolean {
  if (!config.data.cleanup.enabled) {
    return false;
  }

  if (!testPassed && !config.data.cleanup.onFailure) {
    return false;
  }

  return true;
}
