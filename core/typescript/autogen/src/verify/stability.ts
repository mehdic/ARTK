/**
 * Stability Gate - Check for flaky tests with repeat execution
 * @see T053 - Implement stability gate (--repeat-each, --fail-on-flaky-tests)
 */
import { runPlaywrightSync, type RunnerOptions, type RunnerResult } from './runner.js';
import { parseReportFile, getSummary, type ParsedSummary } from './parser.js';

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

const DEFAULT_OPTIONS: Required<Pick<StabilityOptions, 'repeatCount' | 'maxFlakyRate' | 'stopOnFlaky'>> = {
  repeatCount: 3,
  maxFlakyRate: 0,
  stopOnFlaky: false,
};

/**
 * Run stability check on tests
 */
export function checkStability(
  options: StabilityOptions = {}
): StabilityResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const result: StabilityResult = {
    stable: true,
    runsCompleted: 0,
    flakyTests: [],
    flakyRate: 0,
    runSummaries: [],
    runnerResult: {
      success: false,
      exitCode: 0,
      stdout: '',
      stderr: '',
      duration: 0,
      command: '',
    },
  };

  // Run tests with repeat-each
  const runnerResult = runPlaywrightSync({
    ...options,
    repeatEach: opts.repeatCount,
    failOnFlaky: true,
  });

  result.runnerResult = runnerResult;
  result.runsCompleted = opts.repeatCount;

  // Parse report if available
  if (runnerResult.reportPath) {
    const report = parseReportFile(runnerResult.reportPath);
    if (report) {
      const summary = getSummary(report);
      result.runSummaries.push(summary);

      // Extract flaky tests
      result.flakyTests = summary.flakyTests.map((t) => t.titlePath.join(' > '));

      // Calculate flaky rate
      result.flakyRate = summary.total > 0 ? summary.flaky / summary.total : 0;

      // Check stability
      result.stable = result.flakyRate <= opts.maxFlakyRate;
    }
  }

  // If runner failed and no report, check stdout for flaky indication
  if (!runnerResult.success && result.flakyTests.length === 0) {
    if (runnerResult.stdout.includes('flaky') || runnerResult.stderr.includes('flaky')) {
      result.stable = false;
    }
  }

  return result;
}

/**
 * Quick stability check (2 runs)
 */
export function quickStabilityCheck(
  options: Omit<StabilityOptions, 'repeatCount'> = {}
): StabilityResult {
  return checkStability({
    ...options,
    repeatCount: 2,
  });
}

/**
 * Thorough stability check (5 runs)
 */
export function thoroughStabilityCheck(
  options: Omit<StabilityOptions, 'repeatCount'> = {}
): StabilityResult {
  return checkStability({
    ...options,
    repeatCount: 5,
  });
}

/**
 * Check if a specific test is stable
 */
export function isTestStable(
  testFile: string,
  testName: string,
  repeatCount: number = 3,
  options: Omit<StabilityOptions, 'repeatCount' | 'testFile' | 'grep'> = {}
): boolean {
  const result = checkStability({
    ...options,
    testFile,
    grep: testName,
    repeatCount,
  });

  return result.stable;
}

/**
 * Get flakiness score (0 = stable, 1 = always flaky)
 */
export function getFlakinessScore(result: StabilityResult): number {
  if (result.runsCompleted === 0) return 0;
  return result.flakyRate;
}

/**
 * Determine if test should be quarantined based on stability
 */
export function shouldQuarantine(
  result: StabilityResult,
  threshold: number = 0.3
): boolean {
  return result.flakyRate > threshold;
}

/**
 * Generate stability report
 */
export function generateStabilityReport(result: StabilityResult): string {
  const lines: string[] = [];

  lines.push('# Stability Check Report');
  lines.push('');
  lines.push(`**Status**: ${result.stable ? '✅ STABLE' : '⚠️ UNSTABLE'}`);
  lines.push(`**Runs Completed**: ${result.runsCompleted}`);
  lines.push(`**Flaky Rate**: ${Math.round(result.flakyRate * 100)}%`);
  lines.push('');

  if (result.flakyTests.length > 0) {
    lines.push('## Flaky Tests Detected');
    lines.push('');
    for (const test of result.flakyTests) {
      lines.push(`- ${test}`);
    }
    lines.push('');
    lines.push('### Recommendations');
    lines.push('');
    lines.push('1. Review test steps for race conditions');
    lines.push('2. Add explicit waits for expected states');
    lines.push('3. Check for shared state between tests');
    lines.push('4. Consider isolation improvements');
  } else {
    lines.push('## All Tests Stable');
    lines.push('');
    lines.push('No flakiness detected after repeated runs.');
  }

  return lines.join('\n');
}
