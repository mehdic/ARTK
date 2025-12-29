/**
 * Fixtures Module API Contract
 *
 * This contract defines the public API for the ARTK Fixtures module.
 * Implementation must satisfy these type signatures.
 */

import type {
  Page,
  APIRequestContext,
  TestType,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
} from '@playwright/test';

import type { ARTKConfig } from './config.contract';

// =============================================================================
// Fixture Types
// =============================================================================

/**
 * Test data manager for cleanup registration
 */
export interface TestDataManager {
  /** Unique identifier for this test run */
  readonly runId: string;

  /**
   * Register a cleanup function to run after the test
   *
   * @param fn - Async cleanup function
   * @param options - Optional priority and label
   *
   * @example
   * testData.cleanup(async () => {
   *   await api.deleteOrder(orderId);
   * });
   */
  cleanup(
    fn: () => Promise<void>,
    options?: { priority?: number; label?: string }
  ): void;

  /**
   * Register an API-based cleanup
   *
   * @param method - HTTP method
   * @param url - Endpoint URL
   * @param matcher - Optional request body/params
   */
  cleanupApi(method: string, url: string, matcher?: Record<string, unknown>): void;
}

/**
 * ARTK-specific fixtures added to Playwright's test
 */
export interface ARTKFixtures {
  /** Loaded ARTK configuration */
  config: ARTKConfig;

  /** Page authenticated as the default role */
  authenticatedPage: Page;

  /** Page authenticated as admin role */
  adminPage: Page;

  /** Page authenticated as standardUser role (or configured user role) */
  userPage: Page;

  /** API request context with authentication */
  apiContext: APIRequestContext;

  /** Test data manager for cleanup registration */
  testData: TestDataManager;

  /** Unique run ID for test isolation */
  runId: string;
}

// =============================================================================
// Test Export
// =============================================================================

/**
 * Extended Playwright test with ARTK fixtures.
 *
 * Use this instead of importing directly from @playwright/test.
 *
 * @example
 * import { test, expect } from 'artk/.core/fixtures';
 *
 * test('user can see dashboard', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/dashboard');
 *   await expect(authenticatedPage.locator('h1')).toHaveText('Dashboard');
 * });
 */
export declare const test: TestType<
  PlaywrightTestArgs & PlaywrightTestOptions & ARTKFixtures,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
>;

/**
 * Re-exported expect from Playwright
 */
export { expect } from '@playwright/test';

// =============================================================================
// Fixture Utilities
// =============================================================================

/**
 * Generate a unique run ID for test isolation
 *
 * Format: artk-{shortId}-{timestamp}
 *
 * @returns Unique identifier string
 *
 * @example
 * generateRunId() // 'artk-a1b2c3-1703850000'
 */
export declare function generateRunId(): string;

/**
 * Create a test data manager instance
 *
 * @param runId - Run ID for namespacing
 * @returns TestDataManager instance
 */
export declare function createTestDataManager(runId: string): TestDataManager;

// =============================================================================
// Dynamic Role Fixtures
// =============================================================================

/**
 * Create a page fixture for a specific role
 *
 * Used internally to generate `adminPage`, `userPage`, etc.
 *
 * @param role - Role name from config
 * @returns Fixture definition for use in test.extend()
 */
export declare function createRolePageFixture(
  role: string
): (
  { browser }: { browser: unknown },
  use: (page: Page) => Promise<void>
) => Promise<void>;

// =============================================================================
// API Context Factory
// =============================================================================

export interface APIContextOptions {
  baseURL?: string;
  extraHTTPHeaders?: Record<string, string>;
  storageState?: string;
}

/**
 * Create an API request context with authentication
 *
 * @param options - Context configuration
 * @returns APIRequestContext instance
 */
export declare function createAPIContext(
  options: APIContextOptions
): Promise<APIRequestContext>;
