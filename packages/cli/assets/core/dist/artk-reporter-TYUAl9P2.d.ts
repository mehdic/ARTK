import { TestCase, TestResult, Reporter, FullConfig, Suite, FullResult } from '@playwright/test/reporter';

/**
 * Reporter types for ARTK Core v1
 *
 * This module defines types for test reporters that map Playwright test results
 * back to Journey definitions, enabling journey-aware reporting.
 *
 * @module reporters/types
 */
/**
 * Journey status based on aggregated test results
 */
type JourneyStatus = 'passed' | 'failed' | 'flaky' | 'skipped' | 'not-run';
/**
 * Test result status (subset of Playwright's TestStatus)
 */
type TestStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
/**
 * Mapping between a test and its Journey
 */
interface JourneyTestMapping {
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
interface TestArtifacts {
    /** Screenshot paths */
    readonly screenshots: readonly string[];
    /** Video path (if enabled) */
    readonly video?: string;
    /** Trace path (if enabled) */
    readonly trace?: string;
}
/**
 * Aggregated results for a single Journey
 */
interface JourneyReport {
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
interface ARTKReport {
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
interface RunSummary {
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
/**
 * ARTK Reporter options
 */
interface ARTKReporterOptions {
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
interface ScreenshotOptions {
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
interface MaskingOptions {
    /** Selectors to mask */
    readonly selectors: readonly string[];
    /** Mask color (CSS color value) */
    readonly maskColor?: string;
    /** Blur radius in pixels (alternative to solid mask) */
    readonly blurRadius?: number;
}

/**
 * Journey mapping utilities for ARTK reporters
 *
 * This module provides functions to map Playwright test results back to
 * Journey definitions and calculate aggregated journey status.
 *
 * @module reporters/journey-reporter
 */

/**
 * Extract journey ID from test case
 *
 * Looks for journey ID in:
 * 1. Test annotations (@journey JRN-0001)
 * 2. Test tags (@JRN-0001)
 * 3. Test title (JRN-0001: ...)
 *
 * @param testCase - Playwright test case
 * @returns Journey ID or null if not found
 */
declare function extractJourneyId(testCase: TestCase): string | null;
/**
 * Map a Playwright test case to a journey test mapping
 *
 * @param testCase - Playwright test case
 * @param result - Test result
 * @returns Journey test mapping
 */
declare function mapTestToJourney(testCase: TestCase, result: TestResult): JourneyTestMapping;
/**
 * Group test mappings by journey ID
 *
 * @param mappings - Array of journey test mappings
 * @returns Map of journey ID to test mappings
 */
declare function groupTestsByJourney(mappings: readonly JourneyTestMapping[]): ReadonlyMap<string, readonly JourneyTestMapping[]>;
/**
 * Calculate journey status from test results
 *
 * Logic:
 * - 'failed': Any test failed (even after retries)
 * - 'flaky': All tests passed, but some required retries
 * - 'passed': All tests passed on first attempt
 * - 'skipped': All tests skipped
 * - 'not-run': No tests executed
 *
 * @param tests - Test mappings for a journey
 * @returns Journey status
 */
declare function calculateJourneyStatus(tests: readonly JourneyTestMapping[]): JourneyStatus;
/**
 * Create a journey report from grouped test mappings
 *
 * @param journeyId - Journey ID
 * @param tests - Test mappings for this journey
 * @returns Journey report
 */
declare function createJourneyReport(journeyId: string, tests: readonly JourneyTestMapping[]): JourneyReport;

/**
 * ARTK custom reporter for Playwright
 *
 * This reporter maps test results to Journey definitions and generates
 * ARTK-specific reports with journey status aggregation.
 *
 * @module reporters/artk-reporter
 */

/**
 * ARTK Reporter implementation
 *
 * Usage in playwright.config.ts:
 * ```typescript
 * import { ARTKReporter } from '@artk/core/reporters';
 *
 * export default defineConfig({
 *   reporter: [
 *     ['@artk/core/reporters', {
 *       outputFile: './test-results/artk-report.json',
 *       includeJourneyMapping: true
 *     }]
 *   ]
 * });
 * ```
 */
declare class ARTKReporter implements Reporter {
    private readonly options;
    private readonly testMappings;
    private startTime;
    private endTime;
    constructor(options: ARTKReporterOptions);
    /**
     * Called once before running tests
     */
    onBegin(_config: FullConfig, _suite: Suite): void;
    /**
     * Called for each test after it finishes
     */
    onTestEnd(test: TestCase, result: TestResult): void;
    /**
     * Called after all tests finish
     */
    onEnd(result: FullResult): Promise<void>;
    /**
     * Generate ARTK report from collected test mappings
     */
    private generateARTKReport;
    /**
     * Create run summary from full result
     */
    private createRunSummary;
    /**
     * Create journey reports from test mappings
     */
    private createJourneyReports;
    /**
     * Write ARTK report to file
     */
    private writeARTKReport;
    /**
     * Print summary to console
     */
    private printSummary;
}
/**
 * Generate ARTK report from test mappings (standalone function)
 *
 * @param mappings - Array of journey test mappings
 * @param includeJourneyMapping - Whether to include journey mapping
 * @returns ARTK report
 */
declare function generateARTKReport(mappings: readonly JourneyTestMapping[], includeJourneyMapping?: boolean): ARTKReport;
/**
 * Write ARTK report to file (standalone function)
 *
 * @param report - ARTK report
 * @param outputFile - Output file path
 * @returns Promise that resolves when report is written
 */
declare function writeARTKReport(report: ARTKReport, outputFile: string): Promise<void>;

export { ARTKReporter as A, type JourneyStatus as J, type MaskingOptions as M, type RunSummary as R, type ScreenshotOptions as S, type TestStatus as T, type JourneyTestMapping as a, type TestArtifacts as b, type JourneyReport as c, type ARTKReport as d, extractJourneyId as e, type ARTKReporterOptions as f, groupTestsByJourney as g, calculateJourneyStatus as h, createJourneyReport as i, generateARTKReport as j, mapTestToJourney as m, writeARTKReport as w };
