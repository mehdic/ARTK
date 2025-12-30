/**
 * Base Test Fixture with Config Loading (T049)
 *
 * Provides the base test fixture that loads ARTK configuration
 * and serves as the foundation for all other fixtures.
 *
 * @module fixtures/base
 * @see FR-005: Provide typed access to all configuration sections
 */

import { test as base } from '@playwright/test';
import { getConfig, isConfigLoaded, loadConfig } from '../config/loader.js';
import type { ARTKConfig } from '../config/types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('fixtures', 'base');

// =============================================================================
// Config Fixture
// =============================================================================

/**
 * Base fixtures with configuration only
 *
 * This is the foundation fixture that other fixtures depend on.
 * It ensures configuration is loaded before any test runs.
 */
export interface ConfigFixtures {
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
export const testWithConfig = base.extend<ConfigFixtures>({
  config: async ({}, use) => {
    logger.debug('Loading ARTK configuration');

    // Load config if not already loaded
    if (!isConfigLoaded()) {
      loadConfig();
    }

    const config = getConfig();
    logger.info('Configuration loaded', {
      appName: config.app.name,
      environment: config.activeEnvironment,
      roles: Object.keys(config.auth.roles),
    });

    await use(config);
  },
});

// =============================================================================
// Config Loading Utilities
// =============================================================================

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
export function ensureConfigLoaded(options?: Parameters<typeof loadConfig>[0]): ARTKConfig {
  if (!isConfigLoaded()) {
    loadConfig(options);
  }
  return getConfig();
}

/**
 * Get the storage state directory path from config
 *
 * @param config - ARTK configuration
 * @param baseDir - Optional base directory (defaults to cwd)
 * @returns Absolute path to storage state directory
 */
export function getStorageStateDirectory(
  config: ARTKConfig,
  baseDir: string = process.cwd()
): string {
  const { resolve } = require('node:path') as typeof import('node:path');
  return resolve(baseDir, config.auth.storageState.directory);
}

/**
 * Get the storage state file path for a role
 *
 * @param config - ARTK configuration
 * @param role - Role name
 * @param baseDir - Optional base directory
 * @returns Absolute path to storage state file
 */
export function getStorageStatePathForRole(
  config: ARTKConfig,
  role: string,
  baseDir?: string
): string {
  const { join } = require('node:path') as typeof import('node:path');
  const directory = getStorageStateDirectory(config, baseDir);
  const pattern = config.auth.storageState.filePattern;
  const fileName = pattern
    .replace('{role}', role)
    .replace('{env}', config.activeEnvironment);

  return join(directory, fileName);
}

/**
 * Check if storage state exists and is valid for a role
 *
 * @param config - ARTK configuration
 * @param role - Role name
 * @param baseDir - Optional base directory
 * @returns true if storage state is valid
 */
export async function isStorageStateValidForRole(
  config: ARTKConfig,
  role: string,
  baseDir?: string
): Promise<boolean> {
  const { existsSync, statSync } = require('node:fs') as typeof import('node:fs');
  const filePath = getStorageStatePathForRole(config, role, baseDir);

  try {
    if (!existsSync(filePath)) {
      return false;
    }

    const stats = statSync(filePath);
    const age = Date.now() - stats.mtimeMs;
    const maxAge = config.auth.storageState.maxAgeMinutes * 60 * 1000;

    return age <= maxAge;
  } catch {
    return false;
  }
}
