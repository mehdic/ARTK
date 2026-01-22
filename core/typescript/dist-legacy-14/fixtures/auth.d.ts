/**
 * Authenticated Page Fixtures (T050, T051)
 *
 * Provides pre-authenticated page fixtures for different roles:
 * - authenticatedPage: Page for default role
 * - adminPage: Page for admin role
 * - userPage: Page for standardUser role
 *
 * @module fixtures/auth
 * @see FR-006: OIDC authentication support
 * @see FR-007: Storage state persistence
 */
import type { Browser, Page } from '@playwright/test';
import type { ARTKConfig } from '../config/types.js';
/**
 * Fixtures providing authenticated pages for different roles
 */
export interface AuthPageFixtures {
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
export declare function createRolePageFixture(role: string): ({ browser, config }: {
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
export declare const testWithAuthPages: import("@playwright/test").TestType<import("@playwright/test").PlaywrightTestArgs & import("@playwright/test").PlaywrightTestOptions & import("./base.js").ConfigFixtures & AuthPageFixtures, import("@playwright/test").PlaywrightWorkerArgs & import("@playwright/test").PlaywrightWorkerOptions>;
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
export declare function createDynamicRoleFixtures(config: ARTKConfig): Record<string, ReturnType<typeof createRolePageFixture>>;
/**
 * Get all available role names from config
 *
 * @param config - ARTK configuration
 * @returns Array of role names
 */
export declare function getAvailableRoles(config: ARTKConfig): readonly string[];
//# sourceMappingURL=auth.d.ts.map