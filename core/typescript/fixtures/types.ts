/**
 * Type Definitions for ARTK Test Fixtures (T048)
 *
 * Defines the type contracts for pre-built Playwright fixtures including:
 * - ARTKFixtures: All ARTK-specific fixtures
 * - TestDataManager: Cleanup registration interface
 * - APIContextOptions: API context configuration
 *
 * @module fixtures/types
 * @see fixtures.contract.ts for public API contract
 */

import type {
  APIRequestContext,
  Page,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  TestType,
} from '@playwright/test';

import type { ARTKConfig } from '../config/types.js';
import type { CleanupOptions } from '../data/types.js';

// =============================================================================
// Core Fixture Types
// =============================================================================

/**
 * Test data manager for cleanup registration and test isolation
 *
 * Provides unique run ID for namespacing and cleanup registration.
 * Used by the testData fixture.
 *
 * @example
 * ```typescript
 * test('creates order with cleanup', async ({ testData }) => {
 *   const order = await createOrder({ name: `Test Order [${testData.runId}]` });
 *   testData.cleanup(async () => {
 *     await deleteOrder(order.id);
 *   }, { priority: 10, label: 'Delete test order' });
 * });
 * ```
 */
export interface TestDataManager {
  /** Unique identifier for this test run (8-char hex) */
  readonly runId: string;

  /**
   * Register a cleanup function to run after the test
   *
   * @param fn - Async cleanup function
   * @param options - Optional priority and label
   */
  cleanup(fn: () => Promise<void>, options?: CleanupOptions): void;

  /**
   * Register an API-based cleanup
   *
   * @param method - HTTP method (DELETE, POST, etc.)
   * @param url - Endpoint URL
   * @param matcher - Optional request body/params
   */
  cleanupApi(method: string, url: string, matcher?: Record<string, unknown>): void;

  /**
   * Execute all registered cleanups (called by fixture teardown)
   * @internal
   */
  runCleanup(): Promise<void>;
}

/**
 * ARTK-specific fixtures added to Playwright's test
 *
 * These fixtures are automatically available in tests when using
 * the extended test from `@artk/core/fixtures`.
 *
 * @example
 * ```typescript
 * import { test, expect } from '@artk/core/fixtures';
 *
 * test('authenticated user workflow', async ({
 *   config,
 *   authenticatedPage,
 *   apiContext,
 *   testData,
 *   runId,
 * }) => {
 *   // All fixtures are automatically set up
 *   await authenticatedPage.goto('/dashboard');
 *   expect(testData.runId).toBe(runId);
 * });
 * ```
 */
export interface ARTKFixtures {
  /** Loaded ARTK configuration */
  readonly config: ARTKConfig;

  /** Page authenticated as the default role (from fixtures.defaultRole) */
  readonly authenticatedPage: Page;

  /** Page authenticated as admin role */
  readonly adminPage: Page;

  /** Page authenticated as standardUser role (or configured user role) */
  readonly userPage: Page;

  /** API request context with authentication headers */
  readonly apiContext: APIRequestContext;

  /** Test data manager for cleanup registration */
  readonly testData: TestDataManager;

  /** Unique run ID for test isolation (8-char hex) */
  readonly runId: string;
}

/**
 * Combined fixture type for the extended test
 */
export type ARTKTestArgs = PlaywrightTestArgs & PlaywrightTestOptions & ARTKFixtures;

/**
 * Combined worker options type
 */
export type ARTKWorkerArgs = PlaywrightWorkerArgs & PlaywrightWorkerOptions;

/**
 * Extended Playwright test type with ARTK fixtures
 */
export type ARTKTestType = TestType<ARTKTestArgs, ARTKWorkerArgs>;

// =============================================================================
// API Context Types
// =============================================================================

/**
 * Options for creating an authenticated API context
 */
export interface APIContextOptions {
  /** Base URL for API requests */
  readonly baseURL?: string;

  /** Extra HTTP headers to include in all requests */
  readonly extraHTTPHeaders?: Readonly<Record<string, string>>;

  /** Path to storage state file for cookie-based auth */
  readonly storageState?: string;
}

/**
 * Configuration for role-specific page fixtures
 */
export interface RolePageFixtureConfig {
  /** Role name from auth.roles in config */
  readonly role: string;

  /** Storage state path (resolved at runtime) */
  readonly storageStatePath?: string;
}

// =============================================================================
// Fixture Factory Types
// =============================================================================

/**
 * Fixture definition function signature
 */
export type FixtureDefinition<T, Args extends Record<string, unknown>> = (
  args: Args,
  use: (fixture: T) => Promise<void>
) => Promise<void>;

/**
 * Base fixture factory options
 */
export interface BaseFixtureOptions {
  /** ARTK configuration */
  readonly config: ARTKConfig;

  /** Base directory for storage states */
  readonly storageStateDir?: string;
}

/**
 * Authenticated page fixture options
 */
export interface AuthenticatedPageOptions extends BaseFixtureOptions {
  /** Role to authenticate as */
  readonly role: string;

  /** Browser context to use */
  readonly browser: unknown;
}

/**
 * API context fixture options
 */
export interface APIContextFixtureOptions extends BaseFixtureOptions {
  /** Role for authentication headers (optional) */
  readonly role?: string;

  /** Playwright request context factory */
  readonly playwright: unknown;
}
