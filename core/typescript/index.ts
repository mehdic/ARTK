/**
 * ARTK Core v1 - Main Entry Point
 *
 * ARTK Core is designed for module-specific imports to avoid type conflicts
 * and keep bundle sizes small. Import from specific modules rather than this
 * main entry point.
 *
 * @example
 * ```typescript
 * // ✅ RECOMMENDED: Import from specific modules
 * import { loadConfig } from '@artk/core/config';
 * import { test, expect } from '@artk/core/fixtures';
 * import { OIDCAuthProvider } from '@artk/core/auth';
 * import { createPlaywrightConfig } from '@artk/core/harness';
 * import { locate } from '@artk/core/locators';
 * import { expectToast } from '@artk/core/assertions';
 * import { namespace } from '@artk/core/data';
 * import { ARTKReporter } from '@artk/core/reporters';
 *
 * // ⚠️ NOT RECOMMENDED: Importing from main entry (can cause type conflicts)
 * // import { loadConfig, test } from '@artk/core';
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Version Information
// =============================================================================

/**
 * ARTK Core version information
 *
 * @example
 * ```typescript
 * import { version } from '@artk/core';
 * console.log(`ARTK Core v${version.version}`);
 * ```
 */
export { default as version } from './version.json';

// =============================================================================
// Module Re-exports for Convenience
// =============================================================================

/**
 * Configuration Module (US1 - Config)
 * @see {@link config/index.ts} for full API
 */
export { loadConfig, getConfig, clearConfigCache, type ARTKConfig } from './config/index.js';

/**
 * Authentication Module (US2 - Auth)
 * @see {@link auth/index.ts} for full API
 */
export {
  OIDCAuthProvider,
  FormAuthProvider,
  TokenAuthProvider,
  saveStorageState,
  loadStorageState,
  getCredentials,
  type AuthProvider,
  type Credentials,
} from './auth/index.js';

/**
 * Fixtures Module (US3 - Fixtures)
 * @see {@link fixtures/index.ts} for full API
 */
export {
  test,
  expect,
  type ARTKTestType,
  type ARTKFixtures,
  type TestDataManager,
} from './fixtures/index.js';

/**
 * Locators Module (US4 - Locators)
 * @see {@link locators/index.ts} for full API
 */
export { locate, byRole, byLabel, byTestId, withinForm, withinTable } from './locators/index.js';

/**
 * Assertions Module (US5 - Assertions)
 * @see {@link assertions/index.ts} for full API
 */
export {
  expectToast,
  expectTableToContainRow,
  expectFormFieldError,
  expectLoading,
  waitForLoadingComplete,
} from './assertions/index.js';

/**
 * Data Module (US6 - Data)
 * @see {@link data/index.ts} for full API
 */
export {
  namespace,
  generateRunId,
  CleanupManager,
  type CleanupContext,
} from './data/index.js';

/**
 * Reporters Module (US7 - Reporters)
 * @see {@link reporters/index.ts} for full API
 */
export { ARTKReporter, extractJourneyId, mapTestToJourney } from './reporters/index.js';

/**
 * Harness Module (US8 - Harness)
 * @see {@link harness/index.ts} for full API
 */
export { createPlaywrightConfig, getTierSettings, getUseOptions } from './harness/index.js';

/**
 * Grid Module (AG Grid Testing)
 * @see {@link grid/index.ts} for full API
 */
export {
  agGrid,
  DEFAULT_TIMEOUTS,
  type AgGridConfig,
  type AgGridHelper,
  type RowMatcher,
  type AgGridRowData,
  type AgGridState,
} from './grid/index.js';

/**
 * Error Classes
 * @see {@link errors/index.ts} for full API
 */
export { ARTKConfigError, ARTKAuthError, ARTKStorageStateError } from './errors/index.js';

/**
 * Utilities
 * @see {@link utils/index.ts} for full API
 */
export { createLogger, withRetry, type Logger } from './utils/index.js';

// =============================================================================
// Module Guide
// =============================================================================

/**
 * # ARTK Core Modules
 *
 * ## Available Modules
 *
 * | Module | Import Path | Description |
 * |--------|-------------|-------------|
 * | **Config** | `@artk/core/config` | Configuration loading and management |
 * | **Auth** | `@artk/core/auth` | Authentication (OIDC, form, token) |
 * | **Fixtures** | `@artk/core/fixtures` | Playwright test fixtures |
 * | **Locators** | `@artk/core/locators` | Accessibility-first locators |
 * | **Assertions** | `@artk/core/assertions` | UI assertion helpers |
 * | **Data** | `@artk/core/data` | Test data and cleanup |
 * | **Reporters** | `@artk/core/reporters` | Custom reporters |
 * | **Harness** | `@artk/core/harness` | Playwright config generation |
 * | **Grid** | `@artk/core/grid` | AG Grid testing helpers |
 * | **Errors** | `@artk/core/errors` | Error classes |
 * | **Utils** | `@artk/core/utils` | Utilities (logging, retry) |
 *
 * ## Usage Pattern
 *
 * Always prefer module-specific imports to avoid type conflicts and reduce bundle size:
 *
 * ```typescript
 * // config module
 * import { loadConfig, getConfig } from '@artk/core/config';
 *
 * // fixtures module
 * import { test, expect } from '@artk/core/fixtures';
 *
 * // locators module
 * import { locate, byRole } from '@artk/core/locators';
 * ```
 *
 * @see quickstart.md for complete usage examples
 */
