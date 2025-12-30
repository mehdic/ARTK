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

import { expect } from '@playwright/test';
import { testWithData } from './data.js';
import type { ARTKTestType } from './types.js';

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
export const test: ARTKTestType = testWithData;

/**
 * Re-exported expect from Playwright
 *
 * Use this expect for consistency with the extended test.
 */
export { expect };

// =============================================================================
// Type Exports
// =============================================================================

export type {
  // Core fixture types
  ARTKFixtures,
  ARTKTestArgs,
  ARTKTestType,
  ARTKWorkerArgs,
  TestDataManager,
  APIContextOptions,
  RolePageFixtureConfig,
  FixtureDefinition,
  BaseFixtureOptions,
  AuthenticatedPageOptions,
  APIContextFixtureOptions,
} from './types.js';

// =============================================================================
// Base Fixture Exports
// =============================================================================

export {
  // Base test with config only
  testWithConfig,
  type ConfigFixtures,

  // Config utilities
  ensureConfigLoaded,
  getStorageStateDirectory,
  getStorageStatePathForRole,
  isStorageStateValidForRole,
} from './base.js';

// =============================================================================
// Auth Fixture Exports
// =============================================================================

export {
  // Test with authenticated pages
  testWithAuthPages,
  type AuthPageFixtures,

  // Fixture factories
  createRolePageFixture,
  createDynamicRoleFixtures,
  getAvailableRoles,
} from './auth.js';

// =============================================================================
// API Context Exports
// =============================================================================

export {
  // Test with API context
  testWithAPIContext,
  type APIContextFixtures,

  // API context creation
  createAPIContext,
  createCustomAPIContext,
  createAPIContextWithToken,

  // Utilities
  extractAuthToken,
} from './api.js';

// =============================================================================
// Data Fixture Exports
// =============================================================================

export {
  // Test with data fixtures
  testWithData,
  type DataFixtures,

  // Run ID generation
  generateRunId,

  // Test data manager factory
  createTestDataManager,

  // Utilities
  namespaceValue,
  createUniqueName,
  createUniqueEmail,
  shouldRunCleanup,
} from './data.js';

// =============================================================================
// Re-exports from Core Modules
// =============================================================================

// Re-export namespace utilities from data module
export { namespace, parseNamespace, isNamespaced } from '../data/namespace.js';

// Re-export CleanupManager from data module
export { CleanupManager } from '../data/cleanup.js';

// Re-export config types commonly used with fixtures
export type {
  ARTKConfig,
  FixturesConfig,
  FixturesApiConfig,
  AuthConfig,
  RoleConfig,
} from '../config/types.js';
