/**
 * Reporters Module API Contract
 *
 * This contract defines the public API for the ARTK Reporters module.
 * Implementation must satisfy these type signatures.
 */

import type { Reporter, TestCase, TestResult as PWTestResult, FullResult, Suite } from '@playwright/test/reporter';
import type { Page } from '@playwright/test';

// =============================================================================
// ARTK Report Types
// =============================================================================

export interface ARTKReportResult {
  /** ISO timestamp of report generation */
  timestamp: string;
  /** Total test duration (ms) */
  duration: number;
  /** Test configuration */
  config: {
    app: string;
    environment: string;
    tier: string;
  };
  /** Summary statistics */
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
  };
  /** Journey mapping results */
  journeys: JourneyResult[];
  /** Individual test results */
  tests: TestResultEntry[];
}

export interface JourneyResult {
  /** Journey ID (e.g., 'JRN-0001') */
  id: string;
  /** Overall journey status */
  status: 'pass' | 'fail' | 'partial' | 'skipped';
  /** Test files implementing this journey */
  tests: string[];
}

export interface TestResultEntry {
  /** Test title (from test block) */
  title: string;
  /** Test file path */
  file: string;
  /** Extracted journey ID (from @JRN-#### tag) */
  journeyId?: string;
  /** Test outcome */
  status: 'pass' | 'fail' | 'skip' | 'flaky';
  /** Test duration (ms) */
  duration: number;
  /** Error message if failed */
  error?: string;
  /** Retry count if applicable */
  retry?: number;
}

// =============================================================================
// ARTK Reporter
// =============================================================================

/**
 * ARTK Custom Reporter
 *
 * Generates ARTK-formatted reports with journey mapping.
 *
 * @example
 * // In playwright.config.ts
 * reporter: [
 *   ['artk/.core/reporters', { outputFile: 'reports/artk-report.json' }]
 * ]
 */
export declare class ARTKReporter implements Reporter {
  constructor(options?: ARTKReporterOptions);

  onBegin(config: unknown, suite: Suite): void;
  onTestEnd(test: TestCase, result: PWTestResult): void;
  onEnd(result: FullResult): Promise<void>;
}

export interface ARTKReporterOptions {
  /** Output file path */
  outputFile?: string;
  /** Include journey mapping */
  includeJourneyMapping?: boolean;
  /** Custom journey ID pattern */
  journeyIdPattern?: RegExp;
}

// =============================================================================
// Journey Mapping
// =============================================================================

/**
 * Extract journey ID from test title
 *
 * Looks for @JRN-#### pattern.
 *
 * @param testTitle - Test title string
 * @returns Journey ID or null
 *
 * @example
 * mapTestToJourney('@JRN-0001 User can login')
 * // Returns: 'JRN-0001'
 */
export declare function mapTestToJourney(testTitle: string): string | null;

/**
 * Group test results by journey ID
 *
 * @param tests - Array of test results
 * @returns Map of journey ID to test results
 */
export declare function groupTestsByJourney(
  tests: TestResultEntry[]
): Map<string, TestResultEntry[]>;

/**
 * Calculate journey status from constituent tests
 *
 * - pass: All tests passed
 * - fail: Any test failed
 * - partial: Some passed, some skipped
 * - skipped: All skipped
 *
 * @param tests - Tests for a single journey
 * @returns Computed journey status
 */
export declare function calculateJourneyStatus(
  tests: TestResultEntry[]
): 'pass' | 'fail' | 'partial' | 'skipped';

// =============================================================================
// Artifact Management
// =============================================================================

export interface ScreenshotOptions {
  /** Apply PII masking */
  mask?: boolean;
  /** Custom PII selectors (overrides config) */
  piiSelectors?: string[];
  /** Full page screenshot */
  fullPage?: boolean;
}

/**
 * Save a screenshot with optional PII masking
 *
 * @param page - Playwright Page
 * @param name - Screenshot name
 * @param options - Screenshot options
 * @returns Path to saved screenshot
 *
 * @example
 * const path = await saveScreenshot(page, 'order-confirmation', { mask: true });
 */
export declare function saveScreenshot(
  page: Page,
  name: string,
  options?: ScreenshotOptions
): Promise<string>;

/**
 * Apply PII masking to an existing screenshot
 *
 * Masks elements matching configured PII selectors with solid blocks.
 *
 * @param screenshotPath - Path to screenshot file
 * @param selectors - CSS selectors to mask
 */
export declare function maskPiiInScreenshot(
  screenshotPath: string,
  selectors: string[]
): Promise<void>;

/**
 * Get configured PII selectors
 *
 * @returns Array of CSS selectors from config
 */
export declare function getPiiSelectors(): string[];

// =============================================================================
// Report Generation
// =============================================================================

/**
 * Generate ARTK report from test results
 *
 * @param suite - Playwright test suite
 * @param results - Test results
 * @returns ARTK report object
 */
export declare function generateARTKReport(
  suite: Suite,
  results: FullResult
): ARTKReportResult;

/**
 * Write ARTK report to file
 *
 * @param report - ARTK report object
 * @param outputPath - Output file path
 */
export declare function writeARTKReport(
  report: ARTKReportResult,
  outputPath: string
): Promise<void>;

// =============================================================================
// Logging
// =============================================================================

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  operation: string;
  timestamp: string;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Create a structured logger for a module
 *
 * @param module - Module name
 * @returns Logger instance
 *
 * @example
 * const log = createLogger('auth');
 * log.info('saveStorageState', 'Storage state saved', { role: 'admin' });
 */
export declare function createLogger(module: string): {
  debug(operation: string, message: string, context?: Record<string, unknown>): void;
  info(operation: string, message: string, context?: Record<string, unknown>): void;
  warn(operation: string, message: string, context?: Record<string, unknown>): void;
  error(operation: string, message: string, context?: Record<string, unknown>): void;
};

/**
 * Set global log level
 *
 * @param level - Minimum log level to output
 */
export declare function setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void;

/**
 * Get current log level
 *
 * @returns Current log level
 */
export declare function getLogLevel(): 'debug' | 'info' | 'warn' | 'error';
