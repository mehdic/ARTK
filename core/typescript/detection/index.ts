/**
 * @module detection
 * @description Frontend detection heuristics for ARTK E2E independent architecture.
 * Provides multi-signal detection with weighted scoring for frontend applications.
 *
 * @example
 * ```typescript
 * import { FrontendDetector, SubmoduleChecker } from '@artk/core/detection';
 *
 * const detector = new FrontendDetector();
 * const results = await detector.scan('/path/to/monorepo');
 *
 * const submoduleChecker = new SubmoduleChecker();
 * const submodules = await submoduleChecker.check('/path/to/monorepo');
 * ```
 */

// Signal scoring constants
export * from './signals.js';

// Detection components
export * from './package-scanner.js';
export * from './entry-detector.js';
export * from './directory-heuristics.js';

// Main detection classes
export * from './frontend-detector.js';
export * from './submodule-checker.js';
