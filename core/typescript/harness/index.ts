/**
 * ARTK Harness Module (T106)
 *
 * Provides Playwright configuration generation from ARTK config.
 *
 * Key Features:
 * - createPlaywrightConfig: Generate complete Playwright config
 * - getTierSettings: Get tier-specific settings (retries, workers, timeout)
 * - getUseOptions: Get shared 'use' configuration
 * - getReporterConfig: Generate reporter configuration
 * - createAuthSetupProject: Create auth setup projects
 * - createBrowserProjects: Create browser test projects
 *
 * @module harness
 *
 * @example
 * ```typescript
 * // playwright.config.ts
 * import { loadConfig } from '@artk/core/config';
 * import { createPlaywrightConfig } from '@artk/core/harness';
 *
 * const { config, activeEnvironment } = loadConfig();
 *
 * export default createPlaywrightConfig({
 *   config,
 *   activeEnvironment,
 *   tier: 'regression',
 * });
 * ```
 */

// =============================================================================
// Type Exports
// =============================================================================

export type {
  // Tier types
  TierName,
  TierSettings,

  // Project types
  AuthSetupProjectConfig,
  BrowserProjectConfig,
  ProjectConfig,

  // Reporter types
  ReporterConfigOptions,
  ReporterArray,

  // Use options
  UseOptions,

  // Harness configuration
  HarnessOptions,
  PlaywrightConfigOutput,
  PlaywrightProject,

  // Factory function types
  CreatePlaywrightConfigFn,
  CreateAuthSetupProjectFn,
  CreateBrowserProjectsFn,
  GetReporterConfigFn,
  GetTierSettingsFn,
  GetUseOptionsFn,

  // Re-exports
  ARTKConfig,
  TierConfig,
  BrowserType,
} from './types.js';

export type { BrowserValidationResult } from './browser-validator.js';

// =============================================================================
// Configuration Factory Exports
// =============================================================================

export {
  // Main factory
  createPlaywrightConfig,

  // Tier settings
  getTierSettings,
  getAllTierSettings,

  // Use options
  getUseOptions,

  // Config utilities
  createMinimalPlaywrightConfig,
  mergePlaywrightConfigs,
  createTierOverrides,
} from './playwright.config.base.js';

// =============================================================================
// Project Factory Exports
// =============================================================================

export {
  // Auth setup projects
  createAuthSetupProject,
  createAuthSetupProjects,

  // Browser projects
  createBrowserProjects,
  createBrowserProject,
  createUnauthenticatedBrowserProjects,

  // Storage state helpers
  resolveStorageStateFilename,
  getStorageStatePathForRole,

  // Project filtering
  filterProjectsByBrowser,
  filterProjectsByRole,
  getAuthSetupProjects,
  getBrowserProjects,
} from './projects.js';

// =============================================================================
// Reporter Configuration Exports
// =============================================================================

export {
  // Main reporter config
  getReporterConfig,
  getReporterConfigFromOptions,

  // Preset configurations
  getMinimalReporterConfig,
  getCIReporterConfig,

  // Utilities
  mergeReporterConfigs,
  hasReporter,
} from './reporters.js';

export { validateBrowserChannel } from './browser-validator.js';
