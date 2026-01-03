/**
 * Playwright JSON Report Parser - Parse test results from JSON reporter
 * @see T051 - Implement JSON report parser for test results
 */
import { readFileSync, existsSync } from 'node:fs';

/**
 * Test status from Playwright
 */
export type TestStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';

/**
 * Error attachment from Playwright
 */
export interface ErrorAttachment {
  name: string;
  contentType: string;
  path?: string;
  body?: string;
}

/**
 * Test error details
 */
export interface TestError {
  message: string;
  stack?: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
  snippet?: string;
}

/**
 * Test step from Playwright report
 */
export interface ReportStep {
  title: string;
  category: string;
  duration: number;
  error?: TestError;
  steps?: ReportStep[];
}

/**
 * Single test result from Playwright report
 */
export interface TestResult {
  /** Test title */
  title: string;
  /** Full title path */
  titlePath: string[];
  /** Test location */
  location: {
    file: string;
    line: number;
    column: number;
  };
  /** Test status */
  status: TestStatus;
  /** Test duration in ms */
  duration: number;
  /** Retry number (0 = first attempt) */
  retry: number;
  /** Errors if failed */
  errors: TestError[];
  /** Test steps */
  steps: ReportStep[];
  /** Attachments */
  attachments: ErrorAttachment[];
  /** Annotations */
  annotations: Array<{ type: string; description?: string }>;
  /** Tags */
  tags: string[];
}

/**
 * Suite from Playwright report
 */
export interface TestSuite {
  title: string;
  file: string;
  line: number;
  column: number;
  specs: TestSpec[];
  suites: TestSuite[];
}

/**
 * Test spec from Playwright report
 */
export interface TestSpec {
  title: string;
  ok: boolean;
  tags: string[];
  tests: Array<{
    expectedStatus: TestStatus;
    status: TestStatus;
    projectName: string;
    results: TestResult[];
  }>;
}

/**
 * Full Playwright JSON report
 */
export interface PlaywrightReport {
  config: {
    rootDir: string;
    projects: Array<{
      name: string;
      testDir: string;
    }>;
  };
  suites: TestSuite[];
  errors: TestError[];
  stats: {
    startTime: string;
    duration: number;
    expected: number;
    unexpected: number;
    flaky: number;
    skipped: number;
  };
}

/**
 * Parsed test summary
 */
export interface ParsedSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  duration: number;
  startTime: Date;
  files: string[];
  failedTests: TestResult[];
  flakyTests: TestResult[];
}

/**
 * Parse Playwright JSON report from file
 */
export function parseReportFile(filePath: string): PlaywrightReport | null {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as PlaywrightReport;
  } catch {
    return null;
  }
}

/**
 * Parse Playwright JSON report from string
 */
export function parseReportContent(content: string): PlaywrightReport | null {
  try {
    return JSON.parse(content) as PlaywrightReport;
  } catch {
    return null;
  }
}

/**
 * Extract all test results from report
 */
export function extractTestResults(report: PlaywrightReport): TestResult[] {
  const results: TestResult[] = [];

  function extractFromSuite(suite: TestSuite, titlePath: string[] = []): void {
    const currentPath = [...titlePath, suite.title].filter(Boolean);

    for (const spec of suite.specs) {
      for (const test of spec.tests) {
        for (const result of test.results) {
          results.push({
            ...result,
            titlePath: [...currentPath, spec.title],
          });
        }
      }
    }

    for (const childSuite of suite.suites) {
      extractFromSuite(childSuite, currentPath);
    }
  }

  for (const suite of report.suites) {
    extractFromSuite(suite);
  }

  return results;
}

/**
 * Get summary from Playwright report
 */
export function getSummary(report: PlaywrightReport): ParsedSummary {
  const allResults = extractTestResults(report);

  const failedTests = allResults.filter((r) => r.status === 'failed');
  const passedTests = allResults.filter((r) => r.status === 'passed');
  const skippedTests = allResults.filter((r) => r.status === 'skipped');

  // Flaky tests: passed on retry
  const flakyTests = allResults.filter((r) => r.status === 'passed' && r.retry > 0);

  // Extract unique file paths
  const files = [...new Set(allResults.map((r) => r.location.file))];

  return {
    total: allResults.length,
    passed: passedTests.length,
    failed: failedTests.length,
    skipped: skippedTests.length,
    flaky: flakyTests.length,
    duration: report.stats.duration,
    startTime: new Date(report.stats.startTime),
    files,
    failedTests,
    flakyTests,
  };
}

/**
 * Get failed test details
 */
export function getFailedTests(report: PlaywrightReport): TestResult[] {
  return extractTestResults(report).filter((r) => r.status === 'failed');
}

/**
 * Get flaky test details
 */
export function getFlakyTests(report: PlaywrightReport): TestResult[] {
  return extractTestResults(report).filter(
    (r) => r.status === 'passed' && r.retry > 0
  );
}

/**
 * Get test by title pattern
 */
export function findTestsByTitle(
  report: PlaywrightReport,
  pattern: string | RegExp
): TestResult[] {
  const allResults = extractTestResults(report);
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;

  return allResults.filter((r) => regex.test(r.title));
}

/**
 * Get tests by tag
 */
export function findTestsByTag(
  report: PlaywrightReport,
  tag: string
): TestResult[] {
  const allResults = extractTestResults(report);
  return allResults.filter((r) => r.tags.includes(tag));
}

/**
 * Extract error messages from test result
 */
export function extractErrorMessages(result: TestResult): string[] {
  return result.errors.map((e) => e.message);
}

/**
 * Extract error stack from test result
 */
export function extractErrorStacks(result: TestResult): string[] {
  return result.errors
    .map((e) => e.stack)
    .filter((s): s is string => s !== undefined);
}

/**
 * Get step that failed
 */
export function getFailedStep(result: TestResult): ReportStep | null {
  function findFailedStep(steps: ReportStep[]): ReportStep | null {
    for (const step of steps) {
      if (step.error) {
        return step;
      }
      if (step.steps) {
        const found = findFailedStep(step.steps);
        if (found) return found;
      }
    }
    return null;
  }

  return findFailedStep(result.steps);
}

/**
 * Check if report indicates overall success
 */
export function isReportSuccessful(report: PlaywrightReport): boolean {
  return report.stats.unexpected === 0;
}

/**
 * Check if report has flaky tests
 */
export function hasFlaky(report: PlaywrightReport): boolean {
  return report.stats.flaky > 0;
}

/**
 * Format test result for display
 */
export function formatTestResult(result: TestResult): string {
  const status = result.status.toUpperCase();
  const title = result.titlePath.join(' > ');
  const duration = `${result.duration}ms`;
  const retry = result.retry > 0 ? ` (retry ${result.retry})` : '';

  let output = `[${status}] ${title} (${duration})${retry}`;

  if (result.errors.length > 0) {
    output += '\n  Errors:';
    for (const error of result.errors) {
      output += `\n    - ${error.message}`;
    }
  }

  return output;
}

/**
 * Generate markdown summary
 */
export function generateMarkdownSummary(report: PlaywrightReport): string {
  const summary = getSummary(report);
  const lines: string[] = [];

  lines.push('# Test Results Summary');
  lines.push('');
  lines.push(`**Status**: ${summary.failed === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  lines.push(`**Duration**: ${Math.round(summary.duration / 1000)}s`);
  lines.push('');
  lines.push('## Stats');
  lines.push('');
  lines.push(`- Total: ${summary.total}`);
  lines.push(`- Passed: ${summary.passed}`);
  lines.push(`- Failed: ${summary.failed}`);
  lines.push(`- Skipped: ${summary.skipped}`);
  lines.push(`- Flaky: ${summary.flaky}`);

  if (summary.failedTests.length > 0) {
    lines.push('');
    lines.push('## Failed Tests');
    lines.push('');
    for (const test of summary.failedTests) {
      lines.push(`### ${test.titlePath.join(' > ')}`);
      for (const error of test.errors) {
        lines.push('');
        lines.push('```');
        lines.push(error.message);
        lines.push('```');
      }
    }
  }

  if (summary.flakyTests.length > 0) {
    lines.push('');
    lines.push('## Flaky Tests');
    lines.push('');
    for (const test of summary.flakyTests) {
      lines.push(`- ${test.titlePath.join(' > ')} (passed on retry ${test.retry})`);
    }
  }

  return lines.join('\n');
}
