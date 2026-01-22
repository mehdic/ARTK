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
import type { TestDataManager } from './types.js';
import type { ARTKConfig } from '../config/types.js';
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
export declare function generateRunId(): string;
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
export declare function createTestDataManager(runId: string, _config: ARTKConfig): TestDataManager;
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
export declare const testWithData: import("playwright/test.js").TestType<import("playwright/test.js").PlaywrightTestArgs & import("playwright/test.js").PlaywrightTestOptions & import("./base.js").ConfigFixtures & import("./auth.js").AuthPageFixtures & import("./api.js").APIContextFixtures & DataFixtures, import("playwright/test.js").PlaywrightWorkerArgs & import("playwright/test.js").PlaywrightWorkerOptions>;
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
export declare function namespaceValue(value: string, runId: string, config: ARTKConfig): string;
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
export declare function createUniqueName(baseName: string, runId: string): string;
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
export declare function createUniqueEmail(prefix: string, runId: string, domain?: string): string;
/**
 * Check if cleanup should run based on config and test status
 *
 * @param config - ARTK configuration
 * @param testPassed - Whether the test passed
 * @returns true if cleanup should run
 */
export declare function shouldRunCleanup(config: ARTKConfig, testPassed: boolean): boolean;
//# sourceMappingURL=data.d.ts.map