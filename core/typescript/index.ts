/**
 * ARTK Core v1 - Main Entry Point
 *
 * This is the barrel export file for ARTK Core. It exports all public APIs
 * from the various modules. Project-specific code should import from this
 * file or from specific module exports (e.g., '@artk/core/config').
 *
 * @example
 * ```typescript
 * // Import from main entry
 * import { loadConfig, createPlaywrightConfig } from '@artk/core';
 *
 * // Import from specific module
 * import { loadConfig } from '@artk/core/config';
 * import { test, expect } from '@artk/core/fixtures';
 * ```
 */

// Version information
export { default as version } from './version.json';

// Config module exports will be added in Phase 3 (US1)
// export * from './config/index.js';

// Auth module exports will be added in Phase 4 (US2)
// export * from './auth/index.js';

// Fixtures module exports will be added in Phase 5 (US3)
// export * from './fixtures/index.js';

// Locators module exports will be added in Phase 6 (US4)
// export * from './locators/index.js';

// Assertions module exports will be added in Phase 7 (US5)
// export * from './assertions/index.js';

// Data module exports will be added in Phase 8 (US6)
// export * from './data/index.js';

// Reporters module exports will be added in Phase 9 (US7)
// export * from './reporters/index.js';

// Harness module exports will be added in Phase 10
// export * from './harness/index.js';

// Error classes
// export * from './errors/index.js';

// Shared utilities
// export * from './utils/index.js';

// Shared types
// export * from './types/index.js';
