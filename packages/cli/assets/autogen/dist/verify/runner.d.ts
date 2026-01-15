/**
 * Options for running Playwright tests
 */
export interface RunnerOptions {
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
export interface RunnerResult {
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
export declare function isPlaywrightAvailable(cwd?: string): boolean;
/**
 * Get Playwright version
 */
export declare function getPlaywrightVersion(cwd?: string): string | null;
/**
 * Build Playwright command arguments
 */
export declare function buildPlaywrightArgs(options: RunnerOptions): string[];
/**
 * Run Playwright tests synchronously
 */
export declare function runPlaywrightSync(options?: RunnerOptions): RunnerResult;
/**
 * Run Playwright tests asynchronously
 */
export declare function runPlaywrightAsync(options?: RunnerOptions): Promise<RunnerResult>;
/**
 * Run a single test file
 */
export declare function runTestFile(testFilePath: string, options?: Omit<RunnerOptions, 'testFile'>): RunnerResult;
/**
 * Run tests by journey ID tag
 */
export declare function runJourneyTests(journeyId: string, options?: Omit<RunnerOptions, 'grep'>): RunnerResult;
/**
 * Check if a test file compiles (syntax check)
 */
export declare function checkTestSyntax(testFilePath: string, cwd?: string): boolean;
/**
 * Write test file and run it
 */
export declare function writeAndRunTest(code: string, filename: string, options?: RunnerOptions): RunnerResult;
/**
 * Get test count from Playwright
 */
export declare function getTestCount(testFile: string, cwd?: string): number;
//# sourceMappingURL=runner.d.ts.map