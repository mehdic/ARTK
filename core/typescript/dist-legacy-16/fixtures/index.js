"use strict";
/**
 * ARTK Fixtures Module (T055)
 *
 * Provides pre-built Playwright fixtures for authenticated testing.
 *
 * Key Features:
 * - config: ARTK configuration access
 * - authenticatedPage: Page with default role authentication
 * - adminPage / userPage: Role-specific authenticated pages
 * - apiContext: Authenticated API request context
 * - testData: Cleanup registration with unique run ID
 * - runId: Unique identifier for test isolation
 *
 * @module fixtures
 * @see fixtures.contract.ts for public API contract
 *
 * @example
 * ```typescript
 * // Import the extended test and expect
 * import { test, expect } from '@artk/core/fixtures';
 *
 * test('authenticated user can see dashboard', async ({ authenticatedPage, config }) => {
 *   await authenticatedPage.goto('/dashboard');
 *   await expect(authenticatedPage.locator('h1')).toHaveText(`Welcome to ${config.app.name}`);
 * });
 *
 * test('create order with cleanup', async ({ testData, runId, apiContext }) => {
 *   const order = await apiContext.post('/api/orders', {
 *     data: { name: `Test Order ${runId}` }
 *   });
 *
 *   testData.cleanup(async () => {
 *     await apiContext.delete(`/api/orders/${order.id}`);
 *   });
 *
 *   expect(order.ok()).toBe(true);
 * });
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupManager = exports.isNamespaced = exports.parseNamespace = exports.namespace = exports.shouldRunCleanup = exports.createUniqueEmail = exports.createUniqueName = exports.namespaceValue = exports.createTestDataManager = exports.generateRunId = exports.testWithData = exports.extractAuthToken = exports.createAPIContextWithToken = exports.createCustomAPIContext = exports.createAPIContext = exports.testWithAPIContext = exports.getAvailableRoles = exports.createDynamicRoleFixtures = exports.createRolePageFixture = exports.testWithAuthPages = exports.isStorageStateValidForRole = exports.getStorageStatePathForRole = exports.getStorageStateDirectory = exports.ensureConfigLoaded = exports.testWithConfig = exports.expect = exports.test = void 0;
const test_1 = require("@playwright/test");
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return test_1.expect; } });
const data_js_1 = require("./data.js");
// =============================================================================
// Extended Test Export
// =============================================================================
/**
 * Extended Playwright test with all ARTK fixtures
 *
 * This is the primary test export that includes:
 * - config: ARTK configuration
 * - authenticatedPage: Page authenticated as default role
 * - adminPage: Page authenticated as admin role
 * - userPage: Page authenticated as user role
 * - apiContext: Authenticated API request context
 * - testData: Test data manager with cleanup
 * - runId: Unique test run identifier
 *
 * @example
 * ```typescript
 * import { test, expect } from '@artk/core/fixtures';
 *
 * test.describe('Dashboard', () => {
 *   test('shows user info', async ({ authenticatedPage }) => {
 *     await authenticatedPage.goto('/dashboard');
 *     await expect(authenticatedPage.locator('[data-testid="user-name"]')).toBeVisible();
 *   });
 * });
 * ```
 */
exports.test = data_js_1.testWithData;
// =============================================================================
// Base Fixture Exports
// =============================================================================
var base_js_1 = require("./base.js");
// Base test with config only
Object.defineProperty(exports, "testWithConfig", { enumerable: true, get: function () { return base_js_1.testWithConfig; } });
// Config utilities
Object.defineProperty(exports, "ensureConfigLoaded", { enumerable: true, get: function () { return base_js_1.ensureConfigLoaded; } });
Object.defineProperty(exports, "getStorageStateDirectory", { enumerable: true, get: function () { return base_js_1.getStorageStateDirectory; } });
Object.defineProperty(exports, "getStorageStatePathForRole", { enumerable: true, get: function () { return base_js_1.getStorageStatePathForRole; } });
Object.defineProperty(exports, "isStorageStateValidForRole", { enumerable: true, get: function () { return base_js_1.isStorageStateValidForRole; } });
// =============================================================================
// Auth Fixture Exports
// =============================================================================
var auth_js_1 = require("./auth.js");
// Test with authenticated pages
Object.defineProperty(exports, "testWithAuthPages", { enumerable: true, get: function () { return auth_js_1.testWithAuthPages; } });
// Fixture factories
Object.defineProperty(exports, "createRolePageFixture", { enumerable: true, get: function () { return auth_js_1.createRolePageFixture; } });
Object.defineProperty(exports, "createDynamicRoleFixtures", { enumerable: true, get: function () { return auth_js_1.createDynamicRoleFixtures; } });
Object.defineProperty(exports, "getAvailableRoles", { enumerable: true, get: function () { return auth_js_1.getAvailableRoles; } });
// =============================================================================
// API Context Exports
// =============================================================================
var api_js_1 = require("./api.js");
// Test with API context
Object.defineProperty(exports, "testWithAPIContext", { enumerable: true, get: function () { return api_js_1.testWithAPIContext; } });
// API context creation
Object.defineProperty(exports, "createAPIContext", { enumerable: true, get: function () { return api_js_1.createAPIContext; } });
Object.defineProperty(exports, "createCustomAPIContext", { enumerable: true, get: function () { return api_js_1.createCustomAPIContext; } });
Object.defineProperty(exports, "createAPIContextWithToken", { enumerable: true, get: function () { return api_js_1.createAPIContextWithToken; } });
// Utilities
Object.defineProperty(exports, "extractAuthToken", { enumerable: true, get: function () { return api_js_1.extractAuthToken; } });
// =============================================================================
// Data Fixture Exports
// =============================================================================
var data_js_2 = require("./data.js");
// Test with data fixtures
Object.defineProperty(exports, "testWithData", { enumerable: true, get: function () { return data_js_2.testWithData; } });
// Run ID generation
Object.defineProperty(exports, "generateRunId", { enumerable: true, get: function () { return data_js_2.generateRunId; } });
// Test data manager factory
Object.defineProperty(exports, "createTestDataManager", { enumerable: true, get: function () { return data_js_2.createTestDataManager; } });
// Utilities
Object.defineProperty(exports, "namespaceValue", { enumerable: true, get: function () { return data_js_2.namespaceValue; } });
Object.defineProperty(exports, "createUniqueName", { enumerable: true, get: function () { return data_js_2.createUniqueName; } });
Object.defineProperty(exports, "createUniqueEmail", { enumerable: true, get: function () { return data_js_2.createUniqueEmail; } });
Object.defineProperty(exports, "shouldRunCleanup", { enumerable: true, get: function () { return data_js_2.shouldRunCleanup; } });
// =============================================================================
// Re-exports from Core Modules
// =============================================================================
// Re-export namespace utilities from data module
var namespace_js_1 = require("../data/namespace.js");
Object.defineProperty(exports, "namespace", { enumerable: true, get: function () { return namespace_js_1.namespace; } });
Object.defineProperty(exports, "parseNamespace", { enumerable: true, get: function () { return namespace_js_1.parseNamespace; } });
Object.defineProperty(exports, "isNamespaced", { enumerable: true, get: function () { return namespace_js_1.isNamespaced; } });
// Re-export CleanupManager from data module
var cleanup_js_1 = require("../data/cleanup.js");
Object.defineProperty(exports, "CleanupManager", { enumerable: true, get: function () { return cleanup_js_1.CleanupManager; } });
//# sourceMappingURL=index.js.map