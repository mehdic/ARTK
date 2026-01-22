/**
 * API Context Fixtures (T052)
 *
 * Provides pre-authenticated API request context for making
 * authenticated API calls in tests.
 *
 * @module fixtures/api
 * @see FR-021: API context with authentication headers
 */
import { type APIRequestContext } from '@playwright/test';
import type { ARTKConfig } from '../config/types.js';
/**
 * Fixtures providing authenticated API context
 */
export interface APIContextFixtures {
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
export declare function createAPIContext(config: ARTKConfig, storageStatePath?: string): Promise<APIRequestContext>;
/**
 * Create a new API context with custom options
 *
 * @param options - Custom API context options
 * @returns New APIRequestContext with custom configuration
 */
export declare function createCustomAPIContext(options: MutableAPIContextOptions): Promise<APIRequestContext>;
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
export declare const testWithAPIContext: import("@playwright/test").TestType<import("@playwright/test").PlaywrightTestArgs & import("@playwright/test").PlaywrightTestOptions & import("./base.js").ConfigFixtures & import("./auth.js").AuthPageFixtures & APIContextFixtures, import("@playwright/test").PlaywrightWorkerArgs & import("@playwright/test").PlaywrightWorkerOptions>;
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
export declare function extractAuthToken(storageStatePath: string, tokenKey?: string): Promise<string | undefined>;
/**
 * Create API context with Bearer token authentication
 *
 * @param config - ARTK configuration
 * @param token - Bearer token
 * @returns APIRequestContext with Bearer auth header
 */
export declare function createAPIContextWithToken(config: ARTKConfig, token: string): Promise<APIRequestContext>;
export {};
//# sourceMappingURL=api.d.ts.map