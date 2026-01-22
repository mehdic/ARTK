/**
 * Journey mapping utilities for ARTK reporters
 *
 * This module provides functions to map Playwright test results back to
 * Journey definitions and calculate aggregated journey status.
 *
 * @module reporters/journey-reporter
 */
import type { TestCase, TestResult } from '@playwright/test/reporter';
import type { JourneyReport, JourneyStatus, JourneyTestMapping } from './types.js';
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
export declare function extractJourneyId(testCase: TestCase): string | null;
/**
 * Map a Playwright test case to a journey test mapping
 *
 * @param testCase - Playwright test case
 * @param result - Test result
 * @returns Journey test mapping
 */
export declare function mapTestToJourney(testCase: TestCase, result: TestResult): JourneyTestMapping;
/**
 * Group test mappings by journey ID
 *
 * @param mappings - Array of journey test mappings
 * @returns Map of journey ID to test mappings
 */
export declare function groupTestsByJourney(mappings: readonly JourneyTestMapping[]): ReadonlyMap<string, readonly JourneyTestMapping[]>;
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
export declare function calculateJourneyStatus(tests: readonly JourneyTestMapping[]): JourneyStatus;
/**
 * Create a journey report from grouped test mappings
 *
 * @param journeyId - Journey ID
 * @param tests - Test mappings for this journey
 * @returns Journey report
 */
export declare function createJourneyReport(journeyId: string, tests: readonly JourneyTestMapping[]): JourneyReport;
//# sourceMappingURL=journey-reporter.d.ts.map