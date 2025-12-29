/**
 * Journey mapping utilities for ARTK reporters
 *
 * This module provides functions to map Playwright test results back to
 * Journey definitions and calculate aggregated journey status.
 *
 * @module reporters/journey-reporter
 */

import type { TestCase, TestResult } from '@playwright/test/reporter';
import type {
  JourneyReport,
  JourneyStatus,
  JourneyTestMapping,
  TestArtifacts,
  TestStatus,
} from './types.js';

// =============================================================================
// Journey ID Extraction
// =============================================================================

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
export function extractJourneyId(testCase: TestCase): string | null {
  // Check annotations
  for (const annotation of testCase.annotations) {
    if (annotation.type === 'journey') {
      return annotation.description ?? null;
    }
  }

  // Check tags (format: @JRN-0001)
  const journeyTagRegex = /^@(JRN-\d+)$/;
  for (const tag of testCase.tags) {
    const match = journeyTagRegex.exec(tag);
    if (match?.[1]) {
      return match[1];
    }
  }

  // Check title (format: "JRN-0001: Test description")
  const titleRegex = /^(JRN-\d+):/;
  const titleMatch = titleRegex.exec(testCase.title);
  if (titleMatch?.[1]) {
    return titleMatch[1];
  }

  return null;
}

// =============================================================================
// Test to Journey Mapping
// =============================================================================

/**
 * Map a Playwright test case to a journey test mapping
 *
 * @param testCase - Playwright test case
 * @param result - Test result
 * @returns Journey test mapping
 */
export function mapTestToJourney(testCase: TestCase, result: TestResult): JourneyTestMapping {
  const artifacts = extractTestArtifacts(result);

  return {
    journeyId: extractJourneyId(testCase) ?? 'UNMAPPED',
    testTitle: testCase.titlePath().join(' › '),
    testFile: testCase.location.file,
    status: result.status as TestStatus,
    duration: result.duration,
    retries: result.retry,
    error: result.error?.message,
    artifacts,
  };
}

/**
 * Extract test artifacts from result
 *
 * @param result - Test result
 * @returns Test artifacts
 */
function extractTestArtifacts(result: TestResult): TestArtifacts {
  const screenshots: string[] = [];
  let video: string | undefined;
  let trace: string | undefined;

  for (const attachment of result.attachments) {
    if (attachment.name === 'screenshot' && attachment.path) {
      screenshots.push(attachment.path);
    } else if (attachment.name === 'video' && attachment.path) {
      video = attachment.path;
    } else if (attachment.name === 'trace' && attachment.path) {
      trace = attachment.path;
    }
  }

  return {
    screenshots,
    video,
    trace,
  };
}

// =============================================================================
// Group Tests by Journey
// =============================================================================

/**
 * Group test mappings by journey ID
 *
 * @param mappings - Array of journey test mappings
 * @returns Map of journey ID to test mappings
 */
export function groupTestsByJourney(
  mappings: readonly JourneyTestMapping[]
): ReadonlyMap<string, readonly JourneyTestMapping[]> {
  const groups = new Map<string, JourneyTestMapping[]>();

  for (const mapping of mappings) {
    const existing = groups.get(mapping.journeyId) ?? [];
    groups.set(mapping.journeyId, [...existing, mapping]);
  }

  // Convert to readonly
  const readonlyGroups = new Map<string, readonly JourneyTestMapping[]>();
  for (const entry of Array.from(groups.entries())) {
    const [journeyId, tests] = entry;
    readonlyGroups.set(journeyId, tests);
  }

  return readonlyGroups;
}

// =============================================================================
// Journey Status Calculation
// =============================================================================

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
export function calculateJourneyStatus(tests: readonly JourneyTestMapping[]): JourneyStatus {
  if (tests.length === 0) {
    return 'not-run';
  }

  let hasFailed = false;
  let hasFlaky = false;
  let allSkipped = true;

  for (const test of tests) {
    if (test.status === 'failed' || test.status === 'timedOut' || test.status === 'interrupted') {
      hasFailed = true;
      allSkipped = false;
    } else if (test.status === 'passed') {
      allSkipped = false;
      if (test.retries > 0) {
        hasFlaky = true;
      }
    } else if (test.status !== 'skipped') {
      allSkipped = false;
    }
  }

  if (hasFailed) {
    return 'failed';
  }

  if (allSkipped) {
    return 'skipped';
  }

  if (hasFlaky) {
    return 'flaky';
  }

  return 'passed';
}

/**
 * Create a journey report from grouped test mappings
 *
 * @param journeyId - Journey ID
 * @param tests - Test mappings for this journey
 * @returns Journey report
 */
export function createJourneyReport(
  journeyId: string,
  tests: readonly JourneyTestMapping[]
): JourneyReport {
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;
  let flakyTests = 0;
  let totalDuration = 0;

  for (const test of tests) {
    totalDuration += test.duration;

    if (test.status === 'passed') {
      if (test.retries > 0) {
        flakyTests++;
      } else {
        passedTests++;
      }
    } else if (test.status === 'failed' || test.status === 'timedOut' || test.status === 'interrupted') {
      failedTests++;
    } else if (test.status === 'skipped') {
      skippedTests++;
    }
  }

  const status = calculateJourneyStatus(tests);

  return {
    journeyId,
    status,
    totalTests: tests.length,
    passedTests,
    failedTests,
    skippedTests,
    flakyTests,
    totalDuration,
    tests,
  };
}
