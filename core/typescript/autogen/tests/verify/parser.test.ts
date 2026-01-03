/**
 * Playwright Report Parser Tests
 * @see T047 - Unit test for JSON report parser
 */
import { describe, it, expect } from 'vitest';
import {
  parseReportContent,
  extractTestResults,
  getSummary,
  getFailedTests,
  getFlakyTests,
  findTestsByTitle,
  extractErrorMessages,
  getFailedStep,
  isReportSuccessful,
  formatTestResult,
  type PlaywrightReport,
  type TestResult,
} from '../../src/verify/parser.js';

// Sample Playwright report for testing
const SAMPLE_REPORT: PlaywrightReport = {
  config: {
    rootDir: '/test',
    projects: [{ name: 'chromium', testDir: '/test/tests' }],
  },
  suites: [
    {
      title: 'Login Tests',
      file: 'login.spec.ts',
      line: 1,
      column: 1,
      specs: [
        {
          title: 'should login successfully',
          ok: true,
          tags: ['@smoke', '@auth'],
          tests: [
            {
              expectedStatus: 'passed',
              status: 'passed',
              projectName: 'chromium',
              results: [
                {
                  title: 'should login successfully',
                  titlePath: ['Login Tests', 'should login successfully'],
                  location: { file: 'login.spec.ts', line: 5, column: 3 },
                  status: 'passed',
                  duration: 1000,
                  retry: 0,
                  errors: [],
                  steps: [],
                  attachments: [],
                  annotations: [],
                  tags: ['@smoke', '@auth'],
                },
              ],
            },
          ],
        },
        {
          title: 'should fail on invalid password',
          ok: false,
          tags: ['@auth'],
          tests: [
            {
              expectedStatus: 'passed',
              status: 'failed',
              projectName: 'chromium',
              results: [
                {
                  title: 'should fail on invalid password',
                  titlePath: ['Login Tests', 'should fail on invalid password'],
                  location: { file: 'login.spec.ts', line: 15, column: 3 },
                  status: 'failed',
                  duration: 2000,
                  retry: 0,
                  errors: [
                    {
                      message: 'Locator resolved to 0 elements',
                      stack: 'at login.spec.ts:20:5',
                    },
                  ],
                  steps: [
                    {
                      title: 'Click login button',
                      category: 'action',
                      duration: 500,
                      error: {
                        message: 'Locator resolved to 0 elements',
                      },
                    },
                  ],
                  attachments: [],
                  annotations: [],
                  tags: ['@auth'],
                },
              ],
            },
          ],
        },
      ],
      suites: [],
    },
  ],
  errors: [],
  stats: {
    startTime: '2024-01-01T12:00:00Z',
    duration: 3000,
    expected: 2,
    unexpected: 1,
    flaky: 0,
    skipped: 0,
  },
};

describe('parseReportContent', () => {
  it('should parse valid JSON report', () => {
    const report = parseReportContent(JSON.stringify(SAMPLE_REPORT));
    expect(report).not.toBeNull();
    expect(report?.suites.length).toBe(1);
  });

  it('should return null for invalid JSON', () => {
    const report = parseReportContent('not json');
    expect(report).toBeNull();
  });

  it('should return null for empty string', () => {
    const report = parseReportContent('');
    expect(report).toBeNull();
  });
});

describe('extractTestResults', () => {
  it('should extract all test results', () => {
    const results = extractTestResults(SAMPLE_REPORT);
    expect(results.length).toBe(2);
  });

  it('should preserve title path', () => {
    const results = extractTestResults(SAMPLE_REPORT);
    expect(results[0].titlePath).toContain('Login Tests');
  });
});

describe('getSummary', () => {
  it('should calculate correct totals', () => {
    const summary = getSummary(SAMPLE_REPORT);

    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
  });

  it('should extract duration', () => {
    const summary = getSummary(SAMPLE_REPORT);
    expect(summary.duration).toBe(3000);
  });

  it('should extract files', () => {
    const summary = getSummary(SAMPLE_REPORT);
    expect(summary.files).toContain('login.spec.ts');
  });

  it('should identify failed tests', () => {
    const summary = getSummary(SAMPLE_REPORT);
    expect(summary.failedTests.length).toBe(1);
  });
});

describe('getFailedTests', () => {
  it('should return only failed tests', () => {
    const failed = getFailedTests(SAMPLE_REPORT);

    expect(failed.length).toBe(1);
    expect(failed[0].status).toBe('failed');
  });

  it('should include error information', () => {
    const failed = getFailedTests(SAMPLE_REPORT);
    expect(failed[0].errors.length).toBeGreaterThan(0);
  });
});

describe('getFlakyTests', () => {
  it('should return tests that passed on retry', () => {
    const reportWithFlaky: PlaywrightReport = {
      ...SAMPLE_REPORT,
      suites: [
        {
          ...SAMPLE_REPORT.suites[0],
          specs: [
            {
              title: 'flaky test',
              ok: true,
              tags: [],
              tests: [
                {
                  expectedStatus: 'passed',
                  status: 'passed',
                  projectName: 'chromium',
                  results: [
                    {
                      title: 'flaky test',
                      titlePath: ['flaky test'],
                      location: { file: 'test.ts', line: 1, column: 1 },
                      status: 'passed',
                      duration: 1000,
                      retry: 1, // Passed on retry
                      errors: [],
                      steps: [],
                      attachments: [],
                      annotations: [],
                      tags: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const flaky = getFlakyTests(reportWithFlaky);
    expect(flaky.length).toBe(1);
    expect(flaky[0].retry).toBe(1);
  });
});

describe('findTestsByTitle', () => {
  it('should find tests by string pattern', () => {
    // Both specs have titles containing 'should' so should match 2 results
    const found = findTestsByTitle(SAMPLE_REPORT, 'should');
    expect(found.length).toBe(2);
  });

  it('should find tests by regex', () => {
    const found = findTestsByTitle(SAMPLE_REPORT, /invalid/i);
    expect(found.length).toBe(1);
  });

  it('should return empty for no matches', () => {
    const found = findTestsByTitle(SAMPLE_REPORT, 'nonexistent');
    expect(found.length).toBe(0);
  });
});

describe('extractErrorMessages', () => {
  it('should extract error messages from test result', () => {
    const failed = getFailedTests(SAMPLE_REPORT)[0];
    const messages = extractErrorMessages(failed);

    expect(messages.length).toBe(1);
    expect(messages[0]).toContain('Locator');
  });
});

describe('getFailedStep', () => {
  it('should find the step that failed', () => {
    const failed = getFailedTests(SAMPLE_REPORT)[0];
    const failedStep = getFailedStep(failed);

    expect(failedStep).not.toBeNull();
    expect(failedStep?.title).toBe('Click login button');
    expect(failedStep?.error).toBeDefined();
  });

  it('should return null if no step failed', () => {
    const passed = extractTestResults(SAMPLE_REPORT)[0];
    const failedStep = getFailedStep(passed);

    expect(failedStep).toBeNull();
  });
});

describe('isReportSuccessful', () => {
  it('should return false for report with failures', () => {
    expect(isReportSuccessful(SAMPLE_REPORT)).toBe(false);
  });

  it('should return true for successful report', () => {
    const successReport: PlaywrightReport = {
      ...SAMPLE_REPORT,
      stats: { ...SAMPLE_REPORT.stats, unexpected: 0 },
    };
    expect(isReportSuccessful(successReport)).toBe(true);
  });
});

describe('formatTestResult', () => {
  it('should format passed test result', () => {
    const result = extractTestResults(SAMPLE_REPORT)[0];
    const formatted = formatTestResult(result);

    expect(formatted).toContain('[PASSED]');
    expect(formatted).toContain('Login Tests');
  });

  it('should format failed test result with errors', () => {
    const result = getFailedTests(SAMPLE_REPORT)[0];
    const formatted = formatTestResult(result);

    expect(formatted).toContain('[FAILED]');
    expect(formatted).toContain('Errors:');
    expect(formatted).toContain('Locator');
  });
});
