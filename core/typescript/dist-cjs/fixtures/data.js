"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.testWithData = void 0;
exports.generateRunId = generateRunId;
exports.createTestDataManager = createTestDataManager;
exports.namespaceValue = namespaceValue;
exports.createUniqueName = createUniqueName;
exports.createUniqueEmail = createUniqueEmail;
exports.shouldRunCleanup = shouldRunCleanup;
const api_js_1 = require("./api.js");
const namespace_js_1 = require("../data/namespace.js");
const cleanup_js_1 = require("../data/cleanup.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('fixtures', 'data');
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
function generateRunId() {
    return (0, namespace_js_1.generateRunId)();
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
function createTestDataManager(runId, _config) {
    const cleanupManager = new cleanup_js_1.CleanupManager();
    const pendingApiCleanups = [];
    return {
        runId,
        cleanup(fn, options) {
            cleanupManager.register(fn, options);
            logger.debug('Cleanup registered', {
                runId,
                label: options?.label ?? 'unlabeled',
                priority: options?.priority ?? 100,
            });
        },
        cleanupApi(method, url, matcher) {
            pendingApiCleanups.push({ method, url, matcher });
            logger.debug('API cleanup registered', {
                runId,
                method,
                url,
            });
        },
        async runCleanup() {
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
exports.testWithData = api_js_1.testWithAPIContext.extend({
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
        }
        finally {
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
                }
                catch (error) {
                    // Log but don't fail the test if cleanup fails
                    logger.error('Cleanup failed', {
                        runId,
                        error: String(error),
                    });
                }
            }
            else {
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
function namespaceValue(value, runId, config) {
    return (0, namespace_js_1.namespace)(value, runId, {
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
function createUniqueName(baseName, runId) {
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
function createUniqueEmail(prefix, runId, domain = 'test.example.com') {
    return `${prefix}-${runId}@${domain}`;
}
/**
 * Check if cleanup should run based on config and test status
 *
 * @param config - ARTK configuration
 * @param testPassed - Whether the test passed
 * @returns true if cleanup should run
 */
function shouldRunCleanup(config, testPassed) {
    if (!config.data.cleanup.enabled) {
        return false;
    }
    if (!testPassed && !config.data.cleanup.onFailure) {
        return false;
    }
    return true;
}
//# sourceMappingURL=data.js.map