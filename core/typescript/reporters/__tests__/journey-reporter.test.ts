/**
 * Unit tests for journey mapping utilities
 *
 * Tests journey ID extraction, test mapping, grouping, and status calculation.
 */

import { describe, expect, it } from 'vitest';
import type { TestCase, TestResult } from '@playwright/test/reporter';
import {
  calculateJourneyStatus,
  createJourneyReport,
  extractJourneyId,
  groupTestsByJourney,
  mapTestToJourney,
} from '../journey-reporter.js';
import type { JourneyTestMapping } from '../types.js';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock test case
 */
function createMockTestCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    title: overrides.title ?? 'Test Case',
    titlePath: () => [overrides.title ?? 'Test Case'],
    tags: overrides.tags ?? [],
    annotations: overrides.annotations ?? [],
    location: overrides.location ?? { file: 'test.spec.ts', line: 1, column: 1 },
    ...overrides,
  } as TestCase;
}

/**
 * Create a mock test result
 */
function createMockTestResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    status: overrides.status ?? 'passed',
    duration: overrides.duration ?? 1000,
    retry: overrides.retry ?? 0,
    error: overrides.error,
    attachments: overrides.attachments ?? [],
    ...overrides,
  } as TestResult;
}

// =============================================================================
// extractJourneyId Tests
// =============================================================================

describe('extractJourneyId', () => {
  it('should extract journey ID from annotation', () => {
    const testCase = createMockTestCase({
      annotations: [{ type: 'journey', description: 'JRN-0001' }],
    });

    expect(extractJourneyId(testCase)).toBe('JRN-0001');
  });

  it('should extract journey ID from tag', () => {
    const testCase = createMockTestCase({
      tags: ['@smoke', '@JRN-0042', '@regression'],
    });

    expect(extractJourneyId(testCase)).toBe('JRN-0042');
  });

  it('should extract journey ID from title', () => {
    const testCase = createMockTestCase({
      title: 'JRN-0123: User login journey',
    });

    expect(extractJourneyId(testCase)).toBe('JRN-0123');
  });

  it('should prioritize annotation over tag', () => {
    const testCase = createMockTestCase({
      annotations: [{ type: 'journey', description: 'JRN-0001' }],
      tags: ['@JRN-0002'],
    });

    expect(extractJourneyId(testCase)).toBe('JRN-0001');
  });

  it('should prioritize annotation over title', () => {
    const testCase = createMockTestCase({
      annotations: [{ type: 'journey', description: 'JRN-0001' }],
      title: 'JRN-0002: Test',
    });

    expect(extractJourneyId(testCase)).toBe('JRN-0001');
  });

  it('should return null if no journey ID found', () => {
    const testCase = createMockTestCase({
      title: 'Regular test without journey ID',
    });

    expect(extractJourneyId(testCase)).toBeNull();
  });

  it('should handle empty annotations array', () => {
    const testCase = createMockTestCase({
      annotations: [],
    });

    expect(extractJourneyId(testCase)).toBeNull();
  });
});

// =============================================================================
// mapTestToJourney Tests
// =============================================================================

describe('mapTestToJourney', () => {
  it('should map test with journey ID', () => {
    const testCase = createMockTestCase({
      title: 'JRN-0001: Login test',
      location: { file: 'auth.spec.ts', line: 10, column: 1 },
    });
    const result = createMockTestResult({
      status: 'passed',
      duration: 2500,
    });

    const mapping = mapTestToJourney(testCase, result);

    expect(mapping).toMatchObject({
      journeyId: 'JRN-0001',
      testTitle: 'JRN-0001: Login test',
      testFile: 'auth.spec.ts',
      status: 'passed',
      duration: 2500,
      retries: 0,
    });
  });

  it('should map test without journey ID to UNMAPPED', () => {
    const testCase = createMockTestCase({
      title: 'Standalone test',
    });
    const result = createMockTestResult();

    const mapping = mapTestToJourney(testCase, result);

    expect(mapping.journeyId).toBe('UNMAPPED');
  });

  it('should include error message for failed tests', () => {
    const testCase = createMockTestCase();
    const result = createMockTestResult({
      status: 'failed',
      error: { message: 'Expected element not found' },
    });

    const mapping = mapTestToJourney(testCase, result);

    expect(mapping.error).toBe('Expected element not found');
  });

  it('should extract screenshot artifacts', () => {
    const testCase = createMockTestCase();
    const result = createMockTestResult({
      attachments: [
        { name: 'screenshot', contentType: 'image/png', path: '/screenshots/test1.png' },
        { name: 'screenshot', contentType: 'image/png', path: '/screenshots/test2.png' },
      ],
    });

    const mapping = mapTestToJourney(testCase, result);

    expect(mapping.artifacts.screenshots).toEqual([
      '/screenshots/test1.png',
      '/screenshots/test2.png',
    ]);
  });

  it('should extract video and trace artifacts', () => {
    const testCase = createMockTestCase();
    const result = createMockTestResult({
      attachments: [
        { name: 'video', contentType: 'video/webm', path: '/videos/test.webm' },
        { name: 'trace', contentType: 'application/zip', path: '/traces/test.zip' },
      ],
    });

    const mapping = mapTestToJourney(testCase, result);

    expect(mapping.artifacts.video).toBe('/videos/test.webm');
    expect(mapping.artifacts.trace).toBe('/traces/test.zip');
  });
});

// =============================================================================
// groupTestsByJourney Tests
// =============================================================================

describe('groupTestsByJourney', () => {
  it('should group tests by journey ID', () => {
    const mappings: JourneyTestMapping[] = [
      {
        journeyId: 'JRN-0001',
        testTitle: 'Test 1',
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        retries: 0,
        artifacts: { screenshots: [] },
      },
      {
        journeyId: 'JRN-0001',
        testTitle: 'Test 2',
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        retries: 0,
        artifacts: { screenshots: [] },
      },
      {
        journeyId: 'JRN-0002',
        testTitle: 'Test 3',
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        retries: 0,
        artifacts: { screenshots: [] },
      },
    ];

    const grouped = groupTestsByJourney(mappings);

    expect(grouped.size).toBe(2);
    expect(grouped.get('JRN-0001')).toHaveLength(2);
    expect(grouped.get('JRN-0002')).toHaveLength(1);
  });

  it('should handle empty mappings array', () => {
    const grouped = groupTestsByJourney([]);

    expect(grouped.size).toBe(0);
  });

  it('should separate UNMAPPED tests', () => {
    const mappings: JourneyTestMapping[] = [
      {
        journeyId: 'JRN-0001',
        testTitle: 'Test 1',
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        retries: 0,
        artifacts: { screenshots: [] },
      },
      {
        journeyId: 'UNMAPPED',
        testTitle: 'Test 2',
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        retries: 0,
        artifacts: { screenshots: [] },
      },
    ];

    const grouped = groupTestsByJourney(mappings);

    expect(grouped.get('JRN-0001')).toHaveLength(1);
    expect(grouped.get('UNMAPPED')).toHaveLength(1);
  });
});

// =============================================================================
// calculateJourneyStatus Tests
// =============================================================================

describe('calculateJourneyStatus', () => {
  it('should return "passed" when all tests passed on first attempt', () => {
    const tests: JourneyTestMapping[] = [
      {
        journeyId: 'JRN-0001',
        testTitle: 'Test 1',
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        retries: 0,
        artifacts: { screenshots: [] },
      },
      {
        journeyId: 'JRN-0001',
        testTitle: 'Test 2',
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        retries: 0,
        artifacts: { screenshots: [] },
      },
    ];

    expect(calculateJourneyStatus(tests)).toBe('passed');
  });

  it('should return "flaky" when tests passed after retries', () => {
    const tests: JourneyTestMapping[] = [
      {
        journeyId: 'JRN-0001',
        testTitle: 'Test 1',
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        retries: 1,
        artifacts: { screenshots: [] },
      },
    ];

    expect(calculateJourneyStatus(tests)).toBe('flaky');
  });

  it('should return "failed" when any test failed', () => {
    const tests: JourneyTestMapping[] = [
      {
        journeyId: 'JRN-0001',
        testTitle: 'Test 1',
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        retries: 0,
        artifacts: { screenshots: [] },
      },
      {
        journeyId: 'JRN-0001',
        testTitle: 'Test 2',
        testFile: 'test.spec.ts',
        status: 'failed',
        duration: 1000,
        retries: 0,
        artifacts: { screenshots: [] },
      },
    ];

    expect(calculateJourneyStatus(tests)).toBe('failed');
  });

  it('should return "skipped" when all tests skipped', () => {
    const tests: JourneyTestMapping[] = [
      {
        journeyId: 'JRN-0001',
        testTitle: 'Test 1',
        testFile: 'test.spec.ts',
        status: 'skipped',
        duration: 0,
        retries: 0,
        artifacts: { screenshots: [] },
      },
    ];

    expect(calculateJourneyStatus(tests)).toBe('skipped');
  });

  it('should return "not-run" when tests array is empty', () => {
    expect(calculateJourneyStatus([])).toBe('not-run');
  });

  it('should return "failed" for timedOut tests', () => {
    const tests: JourneyTestMapping[] = [
      {
        journeyId: 'JRN-0001',
        testTitle: 'Test 1',
        testFile: 'test.spec.ts',
        status: 'timedOut',
        duration: 30000,
        retries: 0,
        artifacts: { screenshots: [] },
      },
    ];

    expect(calculateJourneyStatus(tests)).toBe('failed');
  });
});

// =============================================================================
// createJourneyReport Tests
// =============================================================================

describe('createJourneyReport', () => {
  it('should create journey report with correct counts', () => {
    const tests: JourneyTestMapping[] = [
      {
        journeyId: 'JRN-0001',
        testTitle: 'Test 1',
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        retries: 0,
        artifacts: { screenshots: [] },
      },
      {
        journeyId: 'JRN-0001',
        testTitle: 'Test 2',
        testFile: 'test.spec.ts',
        status: 'failed',
        duration: 2000,
        retries: 0,
        artifacts: { screenshots: [] },
      },
      {
        journeyId: 'JRN-0001',
        testTitle: 'Test 3',
        testFile: 'test.spec.ts',
        status: 'skipped',
        duration: 0,
        retries: 0,
        artifacts: { screenshots: [] },
      },
      {
        journeyId: 'JRN-0001',
        testTitle: 'Test 4',
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 1500,
        retries: 1,
        artifacts: { screenshots: [] },
      },
    ];

    const report = createJourneyReport('JRN-0001', tests);

    expect(report).toMatchObject({
      journeyId: 'JRN-0001',
      status: 'failed',
      totalTests: 4,
      passedTests: 1,
      failedTests: 1,
      skippedTests: 1,
      flakyTests: 1,
      totalDuration: 4500,
    });
    expect(report.tests).toHaveLength(4);
  });

  it('should handle empty tests array', () => {
    const report = createJourneyReport('JRN-0001', []);

    expect(report).toMatchObject({
      journeyId: 'JRN-0001',
      status: 'not-run',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      flakyTests: 0,
      totalDuration: 0,
    });
  });
});
