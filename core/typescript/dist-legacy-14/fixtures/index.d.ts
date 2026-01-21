import { TestType, PlaywrightTestArgs, PlaywrightTestOptions, Page, APIRequestContext, PlaywrightWorkerArgs, PlaywrightWorkerOptions, Browser } from '@playwright/test';
export { expect } from '@playwright/test';
import { A as ARTKConfig } from '../types-BBdYxuqU.js';
export { b as AuthConfig, G as FixturesApiConfig, F as FixturesConfig, k as RoleConfig } from '../types-BBdYxuqU.js';
import { d as CleanupOptions } from '../cleanup-BAd6j0V-.js';
export { C as CleanupManager, i as isNamespaced, n as namespace, p as parseNamespace } from '../cleanup-BAd6j0V-.js';
import * as playwright_test from 'playwright/test';
import { l as loadConfig } from '../loader-BxbOTPv0.js';
import 'zod';
import '../config-error-CJ71r7TC.js';

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
interface TestDataManager {
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
interface ARTKFixtures {
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
type ARTKTestArgs = PlaywrightTestArgs & PlaywrightTestOptions & ARTKFixtures;
/**
 * Combined worker options type
 */
type ARTKWorkerArgs = PlaywrightWorkerArgs & PlaywrightWorkerOptions;
/**
 * Extended Playwright test type with ARTK fixtures
 */
type ARTKTestType = TestType<ARTKTestArgs, ARTKWorkerArgs>;
/**
 * Options for creating an authenticated API context
 */
interface APIContextOptions {
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
interface RolePageFixtureConfig {
    /** Role name from auth.roles in config */
    readonly role: string;
    /** Storage state path (resolved at runtime) */
    readonly storageStatePath?: string;
}
/**
 * Fixture definition function signature
 */
type FixtureDefinition<T, Args extends Record<string, unknown>> = (args: Args, use: (fixture: T) => Promise<void>) => Promise<void>;
/**
 * Base fixture factory options
 */
interface BaseFixtureOptions {
    /** ARTK configuration */
    readonly config: ARTKConfig;
    /** Base directory for storage states */
    readonly storageStateDir?: string;
}
/**
 * Authenticated page fixture options
 */
interface AuthenticatedPageOptions extends BaseFixtureOptions {
    /** Role to authenticate as */
    readonly role: string;
    /** Browser context to use */
    readonly browser: unknown;
}
/**
 * API context fixture options
 */
interface APIContextFixtureOptions extends BaseFixtureOptions {
    /** Role for authentication headers (optional) */
    readonly role?: string;
    /** Playwright request context factory */
    readonly playwright: unknown;
}

/**
 * Base fixtures with configuration only
 *
 * This is the foundation fixture that other fixtures depend on.
 * It ensures configuration is loaded before any test runs.
 */
interface ConfigFixtures {
    /** Loaded ARTK configuration */
    readonly config: ARTKConfig;
}
/**
 * Base test extended with config fixture
 *
 * @example
 * ```typescript
 * import { testWithConfig } from '@artk/core/fixtures/base';
 *
 * testWithConfig('can access config', async ({ config }) => {
 *   console.log(`Testing ${config.app.name}`);
 * });
 * ```
 */
declare const testWithConfig: playwright_test.TestType<playwright_test.PlaywrightTestArgs & playwright_test.PlaywrightTestOptions & ConfigFixtures, playwright_test.PlaywrightWorkerArgs & playwright_test.PlaywrightWorkerOptions>;
/**
 * Ensure configuration is loaded
 *
 * Call this in globalSetup or before running tests to ensure
 * configuration is available.
 *
 * @param options - Optional load config options
 * @returns Loaded configuration
 *
 * @example
 * ```typescript
 * // In global-setup.ts
 * import { ensureConfigLoaded } from '@artk/core/fixtures/base';
 *
 * export default async function globalSetup() {
 *   await ensureConfigLoaded();
 * }
 * ```
 */
declare function ensureConfigLoaded(options?: Parameters<typeof loadConfig>[0]): ARTKConfig;
/**
 * Get the storage state directory path from config
 *
 * @param config - ARTK configuration
 * @param baseDir - Optional base directory (defaults to cwd)
 * @returns Absolute path to storage state directory
 */
declare function getStorageStateDirectory(config: ARTKConfig, baseDir?: string): string;
/**
 * Get the storage state file path for a role
 *
 * @param config - ARTK configuration
 * @param role - Role name
 * @param baseDir - Optional base directory
 * @returns Absolute path to storage state file
 */
declare function getStorageStatePathForRole(config: ARTKConfig, role: string, baseDir?: string): string;
/**
 * Check if storage state exists and is valid for a role
 *
 * @param config - ARTK configuration
 * @param role - Role name
 * @param baseDir - Optional base directory
 * @returns true if storage state is valid
 */
declare function isStorageStateValidForRole(config: ARTKConfig, role: string, baseDir?: string): Promise<boolean>;

/**
 * Fixtures providing authenticated pages for different roles
 */
interface AuthPageFixtures {
    /** Page authenticated as the default role (from fixtures.defaultRole) */
    authenticatedPage: Page;
    /** Page authenticated as admin role */
    adminPage: Page;
    /** Page authenticated as standardUser role */
    userPage: Page;
}
/**
 * Create a role-specific page fixture
 *
 * This factory creates fixture definitions for specific roles.
 * Used internally to generate adminPage, userPage, etc.
 *
 * @param role - Role name from config
 * @returns Fixture definition for use in test.extend()
 *
 * @example
 * ```typescript
 * // Creating a custom role fixture
 * const managerPageFixture = createRolePageFixture('manager');
 *
 * const test = baseTest.extend({
 *   managerPage: managerPageFixture,
 * });
 * ```
 */
declare function createRolePageFixture(role: string): ({ browser, config }: {
    browser: Browser;
    config: ARTKConfig;
}, use: (page: Page) => Promise<void>) => Promise<void>;
/**
 * Test extended with authenticated page fixtures
 *
 * @example
 * ```typescript
 * import { testWithAuthPages } from '@artk/core/fixtures/auth';
 *
 * testWithAuthPages('admin can access dashboard', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/dashboard');
 * });
 *
 * testWithAuthPages('admin vs user comparison', async ({ adminPage, userPage }) => {
 *   // Both pages are authenticated with different roles
 * });
 * ```
 */
declare const testWithAuthPages: playwright_test.TestType<playwright_test.PlaywrightTestArgs & playwright_test.PlaywrightTestOptions & ConfigFixtures & AuthPageFixtures, playwright_test.PlaywrightWorkerArgs & playwright_test.PlaywrightWorkerOptions>;
/**
 * Create fixtures for all configured role fixtures
 *
 * Uses fixtures.roleFixtures from config to generate named page fixtures.
 *
 * @param config - ARTK configuration
 * @returns Object with fixture definitions for each role
 *
 * @example
 * ```typescript
 * const roleFixtures = createDynamicRoleFixtures(config);
 * // Returns { adminPage: fixture, viewerPage: fixture, ... }
 * ```
 */
declare function createDynamicRoleFixtures(config: ARTKConfig): Record<string, ReturnType<typeof createRolePageFixture>>;
/**
 * Get all available role names from config
 *
 * @param config - ARTK configuration
 * @returns Array of role names
 */
declare function getAvailableRoles(config: ARTKConfig): readonly string[];

/**
 * Fixtures providing authenticated API context
 */
interface APIContextFixtures {
    /** API request context with authentication */
    apiContext: APIRequestContext;
}
/**
 * Options for creating an API context (mutable version for internal use)
 */
interface MutableAPIContextOptions {
    baseURL?: string;
    extraHTTPHeaders?: Record<string, string>;
    storageState?: string;
}
/**
 * Create an authenticated API context
 *
 * @param config - ARTK configuration
 * @param storageStatePath - Optional storage state path
 * @returns APIRequestContext instance
 *
 * @example
 * ```typescript
 * const apiContext = await createAPIContext(config, storageStatePath);
 * const response = await apiContext.get('/api/users');
 * await apiContext.dispose();
 * ```
 */
declare function createAPIContext(config: ARTKConfig, storageStatePath?: string): Promise<APIRequestContext>;
/**
 * Create a new API context with custom options
 *
 * @param options - Custom API context options
 * @returns New APIRequestContext with custom configuration
 */
declare function createCustomAPIContext(options: MutableAPIContextOptions): Promise<APIRequestContext>;
/**
 * Test extended with API context fixture
 *
 * @example
 * ```typescript
 * import { testWithAPIContext } from '@artk/core/fixtures/api';
 *
 * testWithAPIContext('can call API', async ({ apiContext }) => {
 *   const response = await apiContext.get('/api/status');
 *   expect(response.ok()).toBe(true);
 * });
 * ```
 */
declare const testWithAPIContext: playwright_test.TestType<playwright_test.PlaywrightTestArgs & playwright_test.PlaywrightTestOptions & ConfigFixtures & AuthPageFixtures & APIContextFixtures, playwright_test.PlaywrightWorkerArgs & playwright_test.PlaywrightWorkerOptions>;
/**
 * Extract auth token from storage state
 *
 * Useful for APIs that require Bearer token authentication
 * rather than cookie-based auth.
 *
 * @param storageStatePath - Path to storage state file
 * @param tokenKey - Key to look for in localStorage (default: 'auth_token')
 * @returns Token string or undefined if not found
 */
declare function extractAuthToken(storageStatePath: string, tokenKey?: string): Promise<string | undefined>;
/**
 * Create API context with Bearer token authentication
 *
 * @param config - ARTK configuration
 * @param token - Bearer token
 * @returns APIRequestContext with Bearer auth header
 */
declare function createAPIContextWithToken(config: ARTKConfig, token: string): Promise<APIRequestContext>;

/**
 * Fixtures providing test data isolation and cleanup
 */
interface DataFixtures {
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
declare function generateRunId(): string;
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
declare function createTestDataManager(runId: string, _config: ARTKConfig): TestDataManager;
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
declare const testWithData: playwright_test.TestType<playwright_test.PlaywrightTestArgs & playwright_test.PlaywrightTestOptions & ConfigFixtures & AuthPageFixtures & APIContextFixtures & DataFixtures, playwright_test.PlaywrightWorkerArgs & playwright_test.PlaywrightWorkerOptions>;
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
declare function namespaceValue(value: string, runId: string, config: ARTKConfig): string;
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
declare function createUniqueName(baseName: string, runId: string): string;
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
declare function createUniqueEmail(prefix: string, runId: string, domain?: string): string;
/**
 * Check if cleanup should run based on config and test status
 *
 * @param config - ARTK configuration
 * @param testPassed - Whether the test passed
 * @returns true if cleanup should run
 */
declare function shouldRunCleanup(config: ARTKConfig, testPassed: boolean): boolean;

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
declare const test: ARTKTestType;

export { type APIContextFixtureOptions, type APIContextFixtures, type APIContextOptions, ARTKConfig, type ARTKFixtures, type ARTKTestArgs, type ARTKTestType, type ARTKWorkerArgs, type AuthPageFixtures, type AuthenticatedPageOptions, type BaseFixtureOptions, type ConfigFixtures, type DataFixtures, type FixtureDefinition, type RolePageFixtureConfig, type TestDataManager, createAPIContext, createAPIContextWithToken, createCustomAPIContext, createDynamicRoleFixtures, createRolePageFixture, createTestDataManager, createUniqueEmail, createUniqueName, ensureConfigLoaded, extractAuthToken, generateRunId, getAvailableRoles, getStorageStateDirectory, getStorageStatePathForRole, isStorageStateValidForRole, namespaceValue, shouldRunCleanup, test, testWithAPIContext, testWithAuthPages, testWithConfig, testWithData };
