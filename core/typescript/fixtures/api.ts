/**
 * API Context Fixtures (T052)
 *
 * Provides pre-authenticated API request context for making
 * authenticated API calls in tests.
 *
 * @module fixtures/api
 * @see FR-021: API context with authentication headers
 */

import { type APIRequestContext, request as playwrightRequest } from '@playwright/test';
import { testWithAuthPages } from './auth.js';
import type { ARTKConfig } from '../config/types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('fixtures', 'api');

// =============================================================================
// API Context Fixtures
// =============================================================================

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
 * Create API context options from config
 *
 * @param config - ARTK configuration
 * @param storageStatePath - Optional path to storage state for cookie auth
 * @returns API context options
 */
function createAPIContextOptions(
  config: ARTKConfig,
  storageStatePath?: string
): MutableAPIContextOptions {
  const options: MutableAPIContextOptions = {};

  // Use fixtures.api.baseURL if configured, otherwise use data.api.baseUrl or app.baseUrl
  if (config.fixtures.api?.baseURL) {
    options.baseURL = config.fixtures.api.baseURL;
  } else if (config.data.api?.baseUrl) {
    options.baseURL = config.data.api.baseUrl;
  } else {
    // Resolve base URL from active environment or app config
    const envConfig = config.environments[config.activeEnvironment];
    options.baseURL = envConfig?.apiUrl ?? envConfig?.baseUrl ?? config.app.baseUrl;
  }

  // Merge extra HTTP headers
  const headers: Record<string, string> = {};

  if (config.fixtures.api?.extraHTTPHeaders) {
    Object.assign(headers, config.fixtures.api.extraHTTPHeaders);
  }

  if (Object.keys(headers).length > 0) {
    options.extraHTTPHeaders = headers;
  }

  // Add storage state for cookie-based auth
  if (storageStatePath) {
    options.storageState = storageStatePath;
  }

  return options;
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
export async function createAPIContext(
  config: ARTKConfig,
  storageStatePath?: string
): Promise<APIRequestContext> {
  const options = createAPIContextOptions(config, storageStatePath);

  logger.debug('Creating API context', {
    baseURL: options.baseURL,
    hasStorageState: !!options.storageState,
    headerCount: Object.keys(options.extraHTTPHeaders ?? {}).length,
  });

  return playwrightRequest.newContext({
    baseURL: options.baseURL,
    extraHTTPHeaders: options.extraHTTPHeaders,
    storageState: options.storageState,
  });
}

/**
 * Create a new API context with custom options
 *
 * @param options - Custom API context options
 * @returns New APIRequestContext with custom configuration
 */
export async function createCustomAPIContext(
  options: MutableAPIContextOptions
): Promise<APIRequestContext> {
  logger.debug('Creating custom API context', {
    baseURL: options.baseURL,
    hasStorageState: !!options.storageState,
  });

  return playwrightRequest.newContext({
    baseURL: options.baseURL,
    extraHTTPHeaders: options.extraHTTPHeaders,
    storageState: options.storageState,
  });
}

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
export const testWithAPIContext = testWithAuthPages.extend<APIContextFixtures>({
  apiContext: async ({ config }, use) => {
    // Get storage state path for default role (for cookie-based auth)
    const { getStorageStatePathForRole } = await import('./base.js');
    const { existsSync } = await import('node:fs');

    const defaultRole = config.fixtures.defaultRole;
    const storageStatePath = getStorageStatePathForRole(config, defaultRole);
    const storageStateExists = existsSync(storageStatePath);

    // Resolve base URL
    const envConfig = config.environments[config.activeEnvironment];
    const apiBaseUrl = config.fixtures.api?.baseURL
      ?? config.data.api?.baseUrl
      ?? envConfig?.apiUrl
      ?? envConfig?.baseUrl
      ?? config.app.baseUrl;

    // Build context options
    const contextOptions: MutableAPIContextOptions = {
      baseURL: apiBaseUrl,
    };

    // Add extra headers if configured
    if (config.fixtures.api?.extraHTTPHeaders) {
      contextOptions.extraHTTPHeaders = config.fixtures.api.extraHTTPHeaders as Record<string, string>;
    }

    // Add storage state for cookie-based auth
    if (storageStateExists) {
      contextOptions.storageState = storageStatePath;
    }

    logger.info('Creating API context', {
      baseURL: apiBaseUrl,
      hasStorageState: storageStateExists,
      role: defaultRole,
    });

    const apiContext = await playwrightRequest.newContext({
      baseURL: contextOptions.baseURL,
      extraHTTPHeaders: contextOptions.extraHTTPHeaders,
      storageState: contextOptions.storageState,
    });

    try {
      await use(apiContext);
    } finally {
      await apiContext.dispose();
    }
  },
});

// =============================================================================
// API Helper Functions
// =============================================================================

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
export async function extractAuthToken(
  storageStatePath: string,
  tokenKey: string = 'auth_token'
): Promise<string | undefined> {
  const { readFile } = await import('node:fs/promises');

  try {
    const content = await readFile(storageStatePath, 'utf-8');
    const state = JSON.parse(content) as {
      origins?: Array<{
        origin: string;
        localStorage: Array<{ name: string; value: string }>;
      }>;
    };

    // Search localStorage in all origins
    for (const origin of state.origins ?? []) {
      const tokenEntry = origin.localStorage.find(item => item.name === tokenKey);
      if (tokenEntry) {
        return tokenEntry.value;
      }
    }

    return undefined;
  } catch (error) {
    logger.warn('Failed to extract auth token', {
      path: storageStatePath,
      error: String(error),
    });
    return undefined;
  }
}

/**
 * Create API context with Bearer token authentication
 *
 * @param config - ARTK configuration
 * @param token - Bearer token
 * @returns APIRequestContext with Bearer auth header
 */
export async function createAPIContextWithToken(
  config: ARTKConfig,
  token: string
): Promise<APIRequestContext> {
  const options = createAPIContextOptions(config);

  // Add Authorization header
  const headers = {
    ...(options.extraHTTPHeaders ?? {}),
    Authorization: `Bearer ${token}`,
  };

  logger.debug('Creating API context with token auth');

  return playwrightRequest.newContext({
    baseURL: options.baseURL,
    extraHTTPHeaders: headers,
  });
}
