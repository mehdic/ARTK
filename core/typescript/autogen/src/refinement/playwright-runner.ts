/**
 * @module refinement/playwright-runner
 * @description Playwright test runner for refinement and verification
 *
 * Provides a reusable interface for running Playwright tests and
 * capturing structured results for the orchestrating LLM.
 *
 * @see research/2026-02-02_autogen-enhancement-implementation-plan.md
 */
import { spawn, type SpawnOptions } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getHarnessRoot } from '../utils/paths.js';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PlaywrightRunOptions {
  /** Test file(s) to run */
  testFiles: string[];
  /** Working directory (default: harness root) */
  cwd?: string;
  /** Timeout per test in ms (default: 30000) */
  timeout?: number;
  /** Number of retries (default: 0) */
  retries?: number;
  /** Run in headed mode */
  headed?: boolean;
  /** Run in debug mode (pause on failure) */
  debug?: boolean;
  /** Custom reporter (default: list) */
  reporter?: string;
  /** Additional Playwright args */
  extraArgs?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Grep filter for test names */
  grep?: string;
  /** Project to run */
  project?: string;
  /** Number of workers (default: 1 for sequential) */
  workers?: number;
}

export interface PlaywrightRunResult {
  /** Overall status */
  status: 'passed' | 'failed' | 'timeout' | 'error';
  /** Exit code from Playwright */
  exitCode: number;
  /** Total duration in ms */
  duration: number;
  /** Test counts */
  counts: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
  };
  /** Parsed test failures */
  failures: TestFailure[];
  /** Raw stdout */
  stdout: string;
  /** Raw stderr */
  stderr: string;
  /** Path to generated report (if any) */
  reportPath?: string;
  /** Path to trace file (if any) */
  tracePath?: string;
}

export interface TestFailure {
  /** Test title */
  title: string;
  /** Full test path */
  fullTitle: string;
  /** File path */
  file: string;
  /** Line number */
  line?: number;
  /** Error message */
  error: string;
  /** Error type classification */
  errorType: ErrorType;
  /** Stack trace excerpt */
  stack?: string;
  /** Duration of failed test */
  duration?: number;
  /** Retry count when failed */
  retryCount?: number;
}

export type ErrorType =
  | 'selector'
  | 'timeout'
  | 'assertion'
  | 'navigation'
  | 'typescript'
  | 'network'
  | 'unknown';

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════

const ERROR_PATTERNS: Array<{ type: ErrorType; patterns: RegExp[] }> = [
  {
    type: 'selector',
    patterns: [
      /locator.*not found/i,
      /element.*not found/i,
      /strict mode violation/i,
      /resolved to \d+ elements/i,
      /waiting for locator/i,
    ],
  },
  {
    type: 'timeout',
    patterns: [
      /timeout.*exceeded/i,
      /test.*timeout/i,
      /exceeded.*timeout/i,
      /timed out/i,
    ],
  },
  {
    type: 'assertion',
    patterns: [
      /expect.*received/i,
      /assertion.*failed/i,
      /toequal.*failed/i,
      /tobehave.*failed/i,
      /expected.*but got/i,
    ],
  },
  {
    type: 'navigation',
    patterns: [
      /page\.goto/i,
      /navigation.*failed/i,
      /net::ERR/i,
      /NS_ERROR/i,
      /navigating to/i,
    ],
  },
  {
    type: 'typescript',
    patterns: [
      /syntaxerror/i,
      /typeerror/i,
      /referenceerror/i,
      /ts\(\d+\)/i,
      /cannot find module/i,
    ],
  },
  {
    type: 'network',
    patterns: [
      /ECONNREFUSED/i,
      /ENOTFOUND/i,
      /network.*error/i,
      /fetch.*failed/i,
    ],
  },
];

function classifyError(message: string): ErrorType {
  for (const { type, patterns } of ERROR_PATTERNS) {
    if (patterns.some(p => p.test(message))) {
      return type;
    }
  }
  return 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT PARSING
// ═══════════════════════════════════════════════════════════════════════════

function parseTestCounts(output: string): PlaywrightRunResult['counts'] {
  const counts = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
  };

  // Try to parse Playwright summary line
  // Format: "X passed, Y failed, Z skipped"
  const summaryMatch = output.match(/(\d+)\s+passed.*?(\d+)\s+failed.*?(\d+)\s+skipped/i);
  if (summaryMatch) {
    counts.passed = parseInt(summaryMatch[1], 10);
    counts.failed = parseInt(summaryMatch[2], 10);
    counts.skipped = parseInt(summaryMatch[3], 10);
    counts.total = counts.passed + counts.failed + counts.skipped;
    return counts;
  }

  // Alternative: count individual test results
  const passedMatches = output.match(/✓|✔|passed/gi);
  const failedMatches = output.match(/✗|✘|failed/gi);
  const skippedMatches = output.match(/⊘|skipped/gi);

  counts.passed = passedMatches?.length || 0;
  counts.failed = failedMatches?.length || 0;
  counts.skipped = skippedMatches?.length || 0;
  counts.total = counts.passed + counts.failed + counts.skipped;

  // Check for flaky tests
  const flakyMatch = output.match(/(\d+)\s+flaky/i);
  if (flakyMatch) {
    counts.flaky = parseInt(flakyMatch[1], 10);
  }

  return counts;
}

function parseFailures(stdout: string, stderr: string): TestFailure[] {
  const failures: TestFailure[] = [];
  const combined = `${stdout}\n${stderr}`;

  // Split by error markers
  const errorBlocks = combined.split(/(?=\d+\)\s+\[|Error:|✘\s+\d+\s+)/);

  for (const block of errorBlocks) {
    if (!block.trim() || block.length < 30) continue;

    // Skip non-error blocks
    if (!block.includes('Error') && !block.includes('✘') && !block.includes('failed')) {
      continue;
    }

    // Extract test title
    const titleMatch = block.match(/(?:✘|✗|\d+\))\s+(?:\[.*?\])?\s*(.+?)(?:\(|at\s|Error)/);
    const title = titleMatch?.[1]?.trim() || 'Unknown test';

    // Extract file location
    const fileMatch = block.match(/([^\s:]+\.(?:ts|js)):(\d+)/);
    const file = fileMatch?.[1] || '';
    const line = fileMatch?.[2] ? parseInt(fileMatch[2], 10) : undefined;

    // Extract error message
    const errorMatch = block.match(/Error:\s*([^\n]+)/);
    const error = errorMatch?.[1]?.trim() || block.split('\n')[0]?.trim() || 'Unknown error';

    // Extract stack trace (first few lines)
    const stackLines = block.split('\n')
      .filter(l => l.trim().startsWith('at '))
      .slice(0, 5);
    const stack = stackLines.length > 0 ? stackLines.join('\n') : undefined;

    // Extract duration if available
    const durationMatch = block.match(/(\d+(?:\.\d+)?)\s*(?:ms|s)/);
    const duration = durationMatch
      ? parseFloat(durationMatch[1]) * (durationMatch[0].includes('s') && !durationMatch[0].includes('ms') ? 1000 : 1)
      : undefined;

    failures.push({
      title,
      fullTitle: title,
      file,
      line,
      error: error.substring(0, 500),
      errorType: classifyError(error),
      stack,
      duration,
    });
  }

  return failures;
}

// ═══════════════════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run Playwright tests and return structured results
 */
export async function runPlaywright(options: PlaywrightRunOptions): Promise<PlaywrightRunResult> {
  const {
    testFiles,
    cwd = getHarnessRoot(),
    timeout = 30000,
    retries = 0,
    headed = false,
    debug = false,
    reporter = 'list',
    extraArgs = [],
    env = {},
    grep,
    project,
    workers = 1,
  } = options;

  const startTime = Date.now();

  // Build command args
  const args = [
    'playwright', 'test',
    ...testFiles,
    `--timeout=${timeout}`,
    `--retries=${retries}`,
    `--reporter=${reporter}`,
    `--workers=${workers}`,
  ];

  if (headed) args.push('--headed');
  if (debug) args.push('--debug');
  if (grep) args.push(`--grep=${grep}`);
  if (project) args.push(`--project=${project}`);
  args.push(...extraArgs);

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const spawnOptions: SpawnOptions = {
      cwd,
      shell: true,
      env: {
        ...process.env,
        ...env,
        FORCE_COLOR: '1', // Force colored output for better parsing
      },
    };

    const proc = spawn('npx', args, spawnOptions);

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      const duration = Date.now() - startTime;
      const exitCode = code ?? 1;

      // Parse results
      const counts = parseTestCounts(stdout);
      const failures = parseFailures(stdout, stderr);

      // Determine overall status
      let status: PlaywrightRunResult['status'] = 'passed';
      if (exitCode !== 0) {
        if (stdout.includes('timeout') || stderr.includes('timeout')) {
          status = 'timeout';
        } else if (failures.length > 0) {
          status = 'failed';
        } else {
          status = 'error';
        }
      }

      // Find report/trace paths
      let reportPath: string | undefined;
      let tracePath: string | undefined;

      const reportDir = join(cwd, 'playwright-report');
      if (existsSync(join(reportDir, 'index.html'))) {
        reportPath = join(reportDir, 'index.html');
      }

      const testResultsDir = join(cwd, 'test-results');
      if (existsSync(testResultsDir)) {
        // Look for trace files
        const traceFile = join(testResultsDir, 'trace.zip');
        if (existsSync(traceFile)) {
          tracePath = traceFile;
        }
      }

      resolve({
        status,
        exitCode,
        duration,
        counts,
        failures,
        stdout: stdout.substring(0, 50000), // Limit size
        stderr: stderr.substring(0, 50000),
        reportPath,
        tracePath,
      });
    });

    proc.on('error', (err) => {
      resolve({
        status: 'error',
        exitCode: 1,
        duration: Date.now() - startTime,
        counts: { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 },
        failures: [{
          title: 'Runner Error',
          fullTitle: 'Runner Error',
          file: '',
          error: `Failed to spawn Playwright: ${err.message}`,
          errorType: 'unknown',
        }],
        stdout: '',
        stderr: err.message,
      });
    });
  });
}

/**
 * Run a single test file and return results
 */
export async function runSingleTest(
  testFile: string,
  options: Omit<PlaywrightRunOptions, 'testFiles'> = {}
): Promise<PlaywrightRunResult> {
  return runPlaywright({
    ...options,
    testFiles: [testFile],
  });
}

/**
 * Quick check if a test passes (minimal output)
 */
export async function quickCheck(testFile: string, cwd?: string): Promise<boolean> {
  const result = await runSingleTest(testFile, {
    cwd,
    timeout: 60000,
    retries: 0,
    workers: 1,
  });
  return result.status === 'passed';
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if Playwright is installed and accessible
 */
export async function checkPlaywrightInstalled(cwd?: string): Promise<{
  installed: boolean;
  version?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['playwright', '--version'], {
      cwd: cwd || getHarnessRoot(),
      shell: true,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        // Extract version from output (format: "Version X.Y.Z")
        const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
        resolve({
          installed: true,
          version: versionMatch?.[1],
        });
      } else {
        resolve({
          installed: false,
          error: stderr || 'Playwright not found. Run: npx playwright install',
        });
      }
    });

    proc.on('error', (err) => {
      resolve({
        installed: false,
        error: `Failed to check Playwright: ${err.message}`,
      });
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      proc.kill();
      resolve({
        installed: false,
        error: 'Playwright check timed out',
      });
    }, 10000);
  });
}

/**
 * Format failures for display
 */
export function formatFailures(failures: TestFailure[]): string {
  return failures.map((f, i) => {
    const lines = [
      `${i + 1}) ${f.title}`,
      `   File: ${f.file}${f.line ? `:${f.line}` : ''}`,
      `   Error [${f.errorType}]: ${f.error}`,
    ];
    if (f.stack) {
      lines.push(`   Stack:\n${f.stack.split('\n').map(l => `      ${l}`).join('\n')}`);
    }
    return lines.join('\n');
  }).join('\n\n');
}

/**
 * Get summary string
 */
export function formatSummary(result: PlaywrightRunResult): string {
  const { counts, duration, status } = result;
  const durationSec = (duration / 1000).toFixed(1);

  let summary = `Status: ${status.toUpperCase()}\n`;
  summary += `Duration: ${durationSec}s\n`;
  summary += `Tests: ${counts.passed}/${counts.total} passed`;

  if (counts.failed > 0) {
    summary += `, ${counts.failed} failed`;
  }
  if (counts.skipped > 0) {
    summary += `, ${counts.skipped} skipped`;
  }
  if (counts.flaky > 0) {
    summary += `, ${counts.flaky} flaky`;
  }

  return summary;
}
