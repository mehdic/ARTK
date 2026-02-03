/**
 * Options for running Playwright tests
 */
interface RunnerOptions {
    /** Working directory */
    cwd?: string;
    /** Test file or pattern to run */
    testFile?: string;
    /** Specific test to run (grep pattern) */
    grep?: string;
    /** Project to run (from playwright.config.ts) */
    project?: string;
    /** Number of workers */
    workers?: number;
    /** Retries on failure */
    retries?: number;
    /** Repeat each test N times (for flakiness check) */
    repeatEach?: number;
    /** Fail on flaky tests */
    failOnFlaky?: boolean;
    /** Timeout per test in ms */
    timeout?: number;
    /** Reporter to use */
    reporter?: string;
    /** Output directory for results */
    outputDir?: string;
    /** Environment variables */
    env?: Record<string, string>;
    /** Headed mode */
    headed?: boolean;
    /** Enable debug mode */
    debug?: boolean;
    /** Update snapshots */
    updateSnapshots?: boolean;
}
/**
 * Result of running Playwright tests
 */
interface RunnerResult {
    /** Whether the run succeeded (all tests passed) */
    success: boolean;
    /** Exit code from Playwright */
    exitCode: number;
    /** Stdout output */
    stdout: string;
    /** Stderr output */
    stderr: string;
    /** Path to JSON report (if generated) */
    reportPath?: string;
    /** Duration in milliseconds */
    duration: number;
    /** Command that was executed */
    command: string;
}
/**
 * Check if Playwright is available
 */
declare function isPlaywrightAvailable(cwd?: string): boolean;
/**
 * Get Playwright version
 */
declare function getPlaywrightVersion(cwd?: string): string | null;
/**
 * Build Playwright command arguments
 */
declare function buildPlaywrightArgs(options: RunnerOptions): string[];
/**
 * Run Playwright tests synchronously
 */
declare function runPlaywrightSync(options?: RunnerOptions): RunnerResult;
/**
 * Run Playwright tests asynchronously
 */
declare function runPlaywrightAsync(options?: RunnerOptions): Promise<RunnerResult>;
/**
 * Run a single test file
 */
declare function runTestFile(testFilePath: string, options?: Omit<RunnerOptions, 'testFile'>): RunnerResult;
/**
 * Run tests by journey ID tag
 */
declare function runJourneyTests(journeyId: string, options?: Omit<RunnerOptions, 'grep'>): RunnerResult;
/**
 * Check if a test file compiles (syntax check)
 */
declare function checkTestSyntax(testFilePath: string, cwd?: string): boolean;
/**
 * Write test file and run it
 */
declare function writeAndRunTest(code: string, filename: string, options?: RunnerOptions): RunnerResult;
/**
 * Get test count from Playwright
 */
declare function getTestCount(testFile: string, cwd?: string): number;

/**
 * Test status from Playwright
 */
type TestStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
/**
 * Error attachment from Playwright
 */
interface ErrorAttachment {
    name: string;
    contentType: string;
    path?: string;
    body?: string;
}
/**
 * Test error details
 */
interface TestError {
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
interface ReportStep {
    title: string;
    category: string;
    duration: number;
    error?: TestError;
    steps?: ReportStep[];
}
/**
 * Single test result from Playwright report
 */
interface TestResult {
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
interface TestSuite {
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
interface TestSpec {
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
interface PlaywrightReport {
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
interface ParsedSummary {
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
declare function parseReportFile(filePath: string): PlaywrightReport | null;
/**
 * Parse Playwright JSON report from string
 */
declare function parseReportContent(content: string): PlaywrightReport | null;
/**
 * Extract all test results from report
 */
declare function extractTestResults(report: PlaywrightReport): TestResult[];
/**
 * Get summary from Playwright report
 */
declare function getSummary(report: PlaywrightReport): ParsedSummary;
/**
 * Get failed test details
 */
declare function getFailedTests(report: PlaywrightReport): TestResult[];
/**
 * Get flaky test details
 */
declare function getFlakyTests(report: PlaywrightReport): TestResult[];
/**
 * Get test by title pattern
 */
declare function findTestsByTitle(report: PlaywrightReport, pattern: string | RegExp): TestResult[];
/**
 * Get tests by tag
 */
declare function findTestsByTag(report: PlaywrightReport, tag: string): TestResult[];
/**
 * Extract error messages from test result
 */
declare function extractErrorMessages(result: TestResult): string[];
/**
 * Extract error stack from test result
 */
declare function extractErrorStacks(result: TestResult): string[];
/**
 * Get step that failed
 */
declare function getFailedStep(result: TestResult): ReportStep | null;
/**
 * Check if report indicates overall success
 */
declare function isReportSuccessful(report: PlaywrightReport): boolean;
/**
 * Check if report has flaky tests
 */
declare function reportHasFlaky(report: PlaywrightReport): boolean;
/**
 * Format test result for display
 */
declare function formatTestResult(result: TestResult): string;
/**
 * Generate markdown summary
 */
declare function generateMarkdownSummary(report: PlaywrightReport): string;

/**
 * Failure Classifier - Categorize test failures for actionable remediation
 * @see T052 - Implement failure classifier (selector, timing, navigation, data, auth, env)
 */

/**
 * Failure category
 */
type FailureCategory = 'selector' | 'timing' | 'navigation' | 'data' | 'auth' | 'env' | 'script' | 'unknown';
/**
 * Failure classification result
 */
interface FailureClassification {
    /** Primary category */
    category: FailureCategory;
    /** Confidence level (0-1) */
    confidence: number;
    /** Human-readable explanation */
    explanation: string;
    /** Suggested fix */
    suggestion: string;
    /** Whether this is likely a test issue vs app issue */
    isTestIssue: boolean;
    /** Keywords that triggered classification */
    matchedKeywords: string[];
}
/**
 * Classify a single error message
 */
declare function classifyError(error: TestError): FailureClassification;
/**
 * Classify a test result
 */
declare function classifyTestResult(result: TestResult): FailureClassification;
/**
 * Classify multiple test results
 */
declare function classifyTestResults(results: TestResult[]): Map<string, FailureClassification>;
/**
 * Get failure statistics by category
 */
declare function getFailureStats(classifications: Map<string, FailureClassification>): Record<FailureCategory, number>;
/**
 * Check if failures are likely healable
 */
declare function isHealable(classification: FailureClassification): boolean;
/**
 * Get healable failures
 */
declare function getHealableFailures(classifications: Map<string, FailureClassification>): Map<string, FailureClassification>;
/**
 * Generate classification report
 */
declare function generateClassificationReport(classifications: Map<string, FailureClassification>): string;

/**
 * Stability Gate - Check for flaky tests with repeat execution
 * @see T053 - Implement stability gate (--repeat-each, --fail-on-flaky-tests)
 */

/**
 * Stability check options
 */
interface StabilityOptions extends Omit<RunnerOptions, 'repeatEach' | 'failOnFlaky'> {
    /** Number of times to repeat each test */
    repeatCount?: number;
    /** Maximum allowed flaky rate (0-1) */
    maxFlakyRate?: number;
    /** Whether to stop on first flaky detection */
    stopOnFlaky?: boolean;
}
/**
 * Stability check result
 */
interface StabilityResult {
    /** Whether all tests are stable */
    stable: boolean;
    /** Number of runs completed */
    runsCompleted: number;
    /** Flaky tests detected */
    flakyTests: string[];
    /** Flaky rate (flaky / total) */
    flakyRate: number;
    /** Summary of each run */
    runSummaries: ParsedSummary[];
    /** Runner result from final run */
    runnerResult: RunnerResult;
}
/**
 * Run stability check on tests
 */
declare function checkStability(options?: StabilityOptions): StabilityResult;
/**
 * Quick stability check (2 runs)
 */
declare function quickStabilityCheck(options?: Omit<StabilityOptions, 'repeatCount'>): StabilityResult;
/**
 * Thorough stability check (5 runs)
 */
declare function thoroughStabilityCheck(options?: Omit<StabilityOptions, 'repeatCount'>): StabilityResult;
/**
 * Check if a specific test is stable
 */
declare function isTestStable(testFile: string, testName: string, repeatCount?: number, options?: Omit<StabilityOptions, 'repeatCount' | 'testFile' | 'grep'>): boolean;
/**
 * Get flakiness score (0 = stable, 1 = always flaky)
 */
declare function getFlakinessScore(result: StabilityResult): number;
/**
 * Determine if test should be quarantined based on stability
 */
declare function shouldQuarantine(result: StabilityResult, threshold?: number): boolean;
/**
 * Generate stability report
 */
declare function generateStabilityReport(result: StabilityResult): string;

/**
 * Verification summary
 */
interface VerifySummary {
    /** Overall verification status */
    status: 'passed' | 'failed' | 'flaky' | 'error';
    /** Journey ID if available */
    journeyId?: string;
    /** Timestamp */
    timestamp: string;
    /** Duration in ms */
    duration: number;
    /** Test counts */
    counts: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        flaky: number;
    };
    /** Failure analysis */
    failures: {
        tests: string[];
        classifications: Record<string, FailureClassification>;
        stats: Record<string, number>;
    };
    /** Stability information */
    stability?: {
        stable: boolean;
        flakyTests: string[];
        flakyRate: number;
    };
    /** Raw runner result */
    runner: {
        exitCode: number;
        command: string;
    };
    /** Path to detailed report */
    reportPath?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Options for generating summary
 */
interface SummaryOptions {
    /** Journey ID to associate */
    journeyId?: string;
    /** Include stability results */
    stabilityResult?: StabilityResult;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Generate verification summary from runner result
 */
declare function generateVerifySummary(runnerResult: RunnerResult, options?: SummaryOptions): VerifySummary;
/**
 * Generate summary from Playwright report directly
 */
declare function generateSummaryFromReport(report: PlaywrightReport, options?: SummaryOptions): VerifySummary;
/**
 * Check if verification passed
 */
declare function isVerificationPassed(summary: VerifySummary): boolean;
/**
 * Check if verification has failures
 */
declare function hasFailures(summary: VerifySummary): boolean;
/**
 * Check if verification has flaky tests
 */
declare function summaryHasFlaky(summary: VerifySummary): boolean;
/**
 * Get actionable recommendations based on failures
 */
declare function getRecommendations(summary: VerifySummary): string[];
/**
 * Generate human-readable summary
 */
declare function formatVerifySummary(summary: VerifySummary): string;
/**
 * Save summary to JSON file
 */
declare function saveSummary(summary: VerifySummary, outputPath: string): void;

export { shouldQuarantine as $, extractErrorStacks as A, getFailedStep as B, isReportSuccessful as C, reportHasFlaky as D, type ErrorAttachment as E, formatTestResult as F, generateMarkdownSummary as G, type FailureCategory as H, type FailureClassification as I, classifyError as J, classifyTestResult as K, classifyTestResults as L, getFailureStats as M, isHealable as N, getHealableFailures as O, type PlaywrightReport as P, generateClassificationReport as Q, type RunnerOptions as R, type StabilityOptions as S, type TestStatus as T, type StabilityResult as U, type VerifySummary as V, checkStability as W, quickStabilityCheck as X, thoroughStabilityCheck as Y, isTestStable as Z, getFlakinessScore as _, type RunnerResult as a, generateStabilityReport as a0, type SummaryOptions as a1, generateVerifySummary as a2, generateSummaryFromReport as a3, isVerificationPassed as a4, hasFailures as a5, summaryHasFlaky as a6, getRecommendations as a7, formatVerifySummary as a8, saveSummary as a9, buildPlaywrightArgs as b, runPlaywrightAsync as c, runTestFile as d, runJourneyTests as e, checkTestSyntax as f, getPlaywrightVersion as g, getTestCount as h, isPlaywrightAvailable as i, type TestError as j, type ReportStep as k, type TestResult as l, type TestSuite as m, type TestSpec as n, type ParsedSummary as o, parseReportFile as p, parseReportContent as q, runPlaywrightSync as r, extractTestResults as s, getSummary as t, getFailedTests as u, getFlakyTests as v, writeAndRunTest as w, findTestsByTitle as x, findTestsByTag as y, extractErrorMessages as z };
