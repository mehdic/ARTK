/**
 * Stability Gate - Check for flaky tests with repeat execution
 * @see T053 - Implement stability gate (--repeat-each, --fail-on-flaky-tests)
 */
import { type RunnerOptions, type RunnerResult } from './runner.js';
import { type ParsedSummary } from './parser.js';
/**
 * Stability check options
 */
export interface StabilityOptions extends Omit<RunnerOptions, 'repeatEach' | 'failOnFlaky'> {
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
export interface StabilityResult {
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
export declare function checkStability(options?: StabilityOptions): StabilityResult;
/**
 * Quick stability check (2 runs)
 */
export declare function quickStabilityCheck(options?: Omit<StabilityOptions, 'repeatCount'>): StabilityResult;
/**
 * Thorough stability check (5 runs)
 */
export declare function thoroughStabilityCheck(options?: Omit<StabilityOptions, 'repeatCount'>): StabilityResult;
/**
 * Check if a specific test is stable
 */
export declare function isTestStable(testFile: string, testName: string, repeatCount?: number, options?: Omit<StabilityOptions, 'repeatCount' | 'testFile' | 'grep'>): boolean;
/**
 * Get flakiness score (0 = stable, 1 = always flaky)
 */
export declare function getFlakinessScore(result: StabilityResult): number;
/**
 * Determine if test should be quarantined based on stability
 */
export declare function shouldQuarantine(result: StabilityResult, threshold?: number): boolean;
/**
 * Generate stability report
 */
export declare function generateStabilityReport(result: StabilityResult): string;
//# sourceMappingURL=stability.d.ts.map