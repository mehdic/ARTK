/**
 * Reporters module barrel export for ARTK Core v1
 *
 * This module provides:
 * - ARTKReporter: Custom Playwright reporter with journey mapping
 * - Journey mapping utilities: Map tests to Journey definitions
 * - Artifact utilities: Save screenshots with PII masking
 * - PII masking utilities: Mask sensitive data in screenshots
 *
 * @module reporters
 */

// Reporter types
export type {
  JourneyStatus,
  TestStatus,
  JourneyTestMapping,
  TestArtifacts,
  JourneyReport,
  ARTKReport,
  RunSummary,
  ARTKReporterOptions,
  ScreenshotOptions,
  MaskingOptions,
} from './types.js';

// Journey mapping
export {
  extractJourneyId,
  mapTestToJourney,
  groupTestsByJourney,
  calculateJourneyStatus,
  createJourneyReport,
} from './journey-reporter.js';

// ARTK Reporter
export {
  ARTKReporter,
  generateARTKReport,
  writeARTKReport,
} from './artk-reporter.js';

// Artifact utilities
export {
  saveScreenshot,
  ensureArtifactDir,
  getArtifactExtension,
  validateArtifactPath,
} from './artifacts.js';

// PII masking
export {
  maskPiiInScreenshot,
  removePiiMasking,
  validatePiiSelectors,
  sanitizePiiSelectors,
} from './masking.js';
