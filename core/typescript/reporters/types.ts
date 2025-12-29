/**
 * Reporter types for ARTK Core v1
 *
 * This module defines types for test reporters that map Playwright test results
 * back to Journey definitions, enabling journey-aware reporting.
 *
 * @module reporters/types
 */

// Type imports are only used for documentation - exports are inferred from usage
// TestCase, TestResult, and FullResult are used in other modules that import from this file

// =============================================================================
// Journey Status Types
// =============================================================================

/**
 * Journey status based on aggregated test results
 */
export type JourneyStatus = 'passed' | 'failed' | 'flaky' | 'skipped' | 'not-run';

/**
 * Test result status (subset of Playwright's TestStatus)
 */
export type TestStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';

// =============================================================================
// Journey Test Mapping Types
// =============================================================================

/**
 * Mapping between a test and its Journey
 */
export interface JourneyTestMapping {
  /** Journey ID extracted from test tags or annotations */
  readonly journeyId: string;

  /** Full test title path */
  readonly testTitle: string;

  /** Test file path */
  readonly testFile: string;

  /** Test result status */
  readonly status: TestStatus;

  /** Test duration in milliseconds */
  readonly duration: number;

  /** Number of retry attempts */
  readonly retries: number;

  /** Error message if failed */
  readonly error?: string;

  /** Artifact paths */
  readonly artifacts: TestArtifacts;
}

/**
 * Test artifacts (screenshots, videos, traces)
 */
export interface TestArtifacts {
  /** Screenshot paths */
  readonly screenshots: readonly string[];

  /** Video path (if enabled) */
  readonly video?: string;

  /** Trace path (if enabled) */
  readonly trace?: string;
}

// =============================================================================
// Journey Report Types
// =============================================================================

/**
 * Aggregated results for a single Journey
 */
export interface JourneyReport {
  /** Journey ID */
  readonly journeyId: string;

  /** Overall journey status */
  readonly status: JourneyStatus;

  /** Total tests mapped to this journey */
  readonly totalTests: number;

  /** Number of passed tests */
  readonly passedTests: number;

  /** Number of failed tests */
  readonly failedTests: number;

  /** Number of skipped tests */
  readonly skippedTests: number;

  /** Number of flaky tests (passed on retry) */
  readonly flakyTests: number;

  /** Total duration across all tests in ms */
  readonly totalDuration: number;

  /** Individual test mappings */
  readonly tests: readonly JourneyTestMapping[];
}

/**
 * ARTK report structure
 */
export interface ARTKReport {
  /** Report generation timestamp */
  readonly timestamp: string;

  /** Playwright run summary */
  readonly summary: RunSummary;

  /** Journey-mapped results */
  readonly journeys: readonly JourneyReport[];

  /** Tests not mapped to any journey */
  readonly unmappedTests: readonly JourneyTestMapping[];
}

/**
 * Playwright test run summary
 */
export interface RunSummary {
  /** Total tests executed */
  readonly totalTests: number;

  /** Total passed tests */
  readonly passed: number;

  /** Total failed tests */
  readonly failed: number;

  /** Total skipped tests */
  readonly skipped: number;

  /** Total flaky tests */
  readonly flaky: number;

  /** Total run duration in ms */
  readonly duration: number;

  /** Test run status */
  readonly status: 'passed' | 'failed' | 'timedout' | 'interrupted';
}

// =============================================================================
// Reporter Configuration Types
// =============================================================================

/**
 * ARTK Reporter options
 */
export interface ARTKReporterOptions {
  /** Output file path for ARTK report */
  readonly outputFile: string;

  /** Include journey mapping (if false, generates basic report) */
  readonly includeJourneyMapping: boolean;

  /** PII masking enabled for screenshots */
  readonly maskPii?: boolean;

  /** PII selectors to mask in screenshots */
  readonly piiSelectors?: readonly string[];
}

/**
 * Screenshot save options
 */
export interface ScreenshotOptions {
  /** Output file path */
  readonly path: string;

  /** Mask PII in screenshot */
  readonly maskPii?: boolean;

  /** Selectors to mask */
  readonly piiSelectors?: readonly string[];
}

/**
 * PII masking options
 */
export interface MaskingOptions {
  /** Selectors to mask */
  readonly selectors: readonly string[];

  /** Mask color (CSS color value) */
  readonly maskColor?: string;

  /** Blur radius in pixels (alternative to solid mask) */
  readonly blurRadius?: number;
}
