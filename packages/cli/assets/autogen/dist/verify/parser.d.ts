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
    annotations: Array<{
        type: string;
        description?: string;
    }>;
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
export declare function parseReportFile(filePath: string): PlaywrightReport | null;
/**
 * Parse Playwright JSON report from string
 */
export declare function parseReportContent(content: string): PlaywrightReport | null;
/**
 * Extract all test results from report
 */
export declare function extractTestResults(report: PlaywrightReport): TestResult[];
/**
 * Get summary from Playwright report
 */
export declare function getSummary(report: PlaywrightReport): ParsedSummary;
/**
 * Get failed test details
 */
export declare function getFailedTests(report: PlaywrightReport): TestResult[];
/**
 * Get flaky test details
 */
export declare function getFlakyTests(report: PlaywrightReport): TestResult[];
/**
 * Get test by title pattern
 */
export declare function findTestsByTitle(report: PlaywrightReport, pattern: string | RegExp): TestResult[];
/**
 * Get tests by tag
 */
export declare function findTestsByTag(report: PlaywrightReport, tag: string): TestResult[];
/**
 * Extract error messages from test result
 */
export declare function extractErrorMessages(result: TestResult): string[];
/**
 * Extract error stack from test result
 */
export declare function extractErrorStacks(result: TestResult): string[];
/**
 * Get step that failed
 */
export declare function getFailedStep(result: TestResult): ReportStep | null;
/**
 * Check if report indicates overall success
 */
export declare function isReportSuccessful(report: PlaywrightReport): boolean;
/**
 * Check if report has flaky tests
 */
export declare function hasFlaky(report: PlaywrightReport): boolean;
/**
 * Format test result for display
 */
export declare function formatTestResult(result: TestResult): string;
/**
 * Generate markdown summary
 */
export declare function generateMarkdownSummary(report: PlaywrightReport): string;
//# sourceMappingURL=parser.d.ts.map