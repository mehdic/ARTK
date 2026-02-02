/**
 * CLI Run Command - Execute test via Playwright
 *
 * Part of the Hybrid Agentic architecture. Executes a generated test
 * and outputs structured results for the orchestrating LLM to analyze.
 *
 * @see research/2026-02-02_autogen-enhancement-implementation-plan.md
 */
import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import {
  getHarnessRoot,
  getAutogenArtifact,
  ensureAutogenDir,
} from '../utils/paths.js';
import { updatePipelineState } from '../pipeline/state.js';
import { getTelemetry } from '../shared/telemetry.js';
import { checkPlaywrightInstalled } from '../refinement/playwright-runner.js';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TestRunResult {
  version: '1.0';
  testPath: string;
  journeyId?: string;
  status: 'passed' | 'failed' | 'timeout' | 'error';
  duration: number; // ms
  errors: TestError[];
  output: TestOutput;
  artifacts: TestArtifacts;
  executedAt: string;
}

export interface TestError {
  message: string;
  type: ErrorType;
  location?: ErrorLocation;
  snippet?: string;
  suggestion?: string;
}

export type ErrorType =
  | 'selector'      // Element not found
  | 'timeout'       // Action timed out
  | 'assertion'     // Assertion failed
  | 'navigation'    // Page navigation failed
  | 'typescript'    // TypeScript/syntax error
  | 'runtime'       // Runtime error
  | 'unknown';

export interface ErrorLocation {
  file: string;
  line: number;
  column?: number;
}

export interface TestOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface TestArtifacts {
  screenshot?: string;
  video?: string;
  trace?: string;
  report?: string;
}

export interface RunOutput {
  version: '1.0';
  results: TestRunResult[];
  summary: RunSummary;
  harnessRoot: string;
  executedAt: string;
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  timeout: number;
  error: number;
  totalDuration: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE
// ═══════════════════════════════════════════════════════════════════════════

const USAGE = `
Usage: artk-autogen run [options] <test-files...>

Execute Playwright tests and output structured results.

Arguments:
  test-files       Test file paths or glob patterns

Options:
  -o, --output <path>    Output path for results.json (default: .artk/autogen/results.json)
  --timeout <ms>         Test timeout in milliseconds (default: 30000)
  --retries <n>          Number of retries for failed tests (default: 0)
  --headed               Run in headed mode
  --debug                Run with debug mode (pause on failure)
  --json                 Output JSON to stdout instead of file
  -q, --quiet            Suppress output except errors
  -h, --help             Show this help message

Examples:
  artk-autogen run tests/login.spec.ts
  artk-autogen run "tests/*.spec.ts"
  artk-autogen run tests/login.spec.ts --headed --debug
  artk-autogen run tests/login.spec.ts --json
`;

// ═══════════════════════════════════════════════════════════════════════════
// ERROR PARSING
// ═══════════════════════════════════════════════════════════════════════════

function parseErrorType(message: string): ErrorType {
  const lower = message.toLowerCase();

  if (lower.includes('timeout') || lower.includes('exceeded')) {
    return 'timeout';
  }
  if (lower.includes('locator') || lower.includes('element') || lower.includes('selector')) {
    return 'selector';
  }
  if (lower.includes('expect') || lower.includes('assertion') || lower.includes('tobehave')) {
    return 'assertion';
  }
  if (lower.includes('navigation') || lower.includes('page.goto') || lower.includes('net::')) {
    return 'navigation';
  }
  if (lower.includes('syntaxerror') || lower.includes('typeerror') || lower.includes('ts(')) {
    return 'typescript';
  }
  if (lower.includes('error:') || lower.includes('exception')) {
    return 'runtime';
  }

  return 'unknown';
}

function parseErrorLocation(message: string): ErrorLocation | undefined {
  // Try to parse file:line:column format
  const match = message.match(/([^\s:]+\.(ts|js)):(\d+):?(\d+)?/);
  if (match && match[1] && match[3]) {
    return {
      file: match[1],
      line: parseInt(match[3], 10),
      column: match[4] ? parseInt(match[4], 10) : undefined,
    };
  }
  return undefined;
}

function suggestFix(errorType: ErrorType, message: string): string | undefined {
  switch (errorType) {
    case 'selector':
      if (message.includes('locator')) {
        return 'Check selector - element may not exist, have different selector, or need explicit wait';
      }
      return 'Element not found - verify selector or add explicit wait';

    case 'timeout':
      return 'Increase timeout or check if element/action is correct';

    case 'assertion':
      return 'Check expected vs actual value - may need to adjust assertion or fix test data';

    case 'navigation':
      return 'Check URL is correct and accessible - may need auth or network configuration';

    case 'typescript':
      return 'Fix TypeScript syntax error before re-running';

    case 'runtime':
      return 'Check test logic and error stack trace for root cause';

    default:
      return undefined;
  }
}

function parseErrors(stdout: string, stderr: string): TestError[] {
  const errors: TestError[] = [];
  const combined = `${stdout}\n${stderr}`;

  // Parse Playwright error format
  const errorBlocks = combined.split(/(?=Error:|✘|FAILED|AssertionError)/);

  for (const block of errorBlocks) {
    if (!block.trim() || block.length < 20) continue;

    // Skip non-error blocks
    if (!block.includes('Error') && !block.includes('✘') && !block.includes('FAILED')) {
      continue;
    }

    const lines = block.split('\n');

    // Extract error message
    const message = lines.slice(0, 3).join(' ').trim().substring(0, 500);

    if (!message) continue;

    const errorType = parseErrorType(message);
    const location = parseErrorLocation(block);

    // Extract code snippet if available
    const snippetMatch = block.match(/>\s*\d+\s*\|(.+)/);
    const snippet = snippetMatch?.[1]?.trim();

    errors.push({
      message,
      type: errorType,
      location,
      snippet,
      suggestion: suggestFix(errorType, message),
    });
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAYWRIGHT RUNNER
// ═══════════════════════════════════════════════════════════════════════════

async function runPlaywrightTest(
  testPath: string,
  options: {
    timeout: number;
    retries: number;
    headed: boolean;
    debug: boolean;
  }
): Promise<TestRunResult> {
  const harnessRoot = getHarnessRoot();
  const startTime = Date.now();

  // Build playwright command
  const args = [
    'playwright', 'test',
    testPath,
    '--reporter=list',
    `--timeout=${options.timeout}`,
    `--retries=${options.retries}`,
  ];

  if (options.headed) {
    args.push('--headed');
  }
  if (options.debug) {
    args.push('--debug');
  }

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    // SECURITY: shell: false (default) prevents command injection via test paths
    // Node.js v14.18+ handles .cmd/.bat files on Windows automatically
    const proc = spawn('npx', args, {
      cwd: harnessRoot,
      env: {
        ...process.env,
        // Force color output for better error parsing
        FORCE_COLOR: '1',
      },
    });

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      const duration = Date.now() - startTime;
      const exitCode = code ?? 1;

      // Determine status
      let status: TestRunResult['status'] = 'passed';
      if (exitCode !== 0) {
        if (stdout.includes('timeout') || stderr.includes('timeout')) {
          status = 'timeout';
        } else if (stderr.includes('Error:') || stdout.includes('FAILED')) {
          status = 'failed';
        } else {
          status = 'error';
        }
      }

      // Parse errors
      const errors = status !== 'passed' ? parseErrors(stdout, stderr) : [];

      // Find artifacts
      const artifacts: TestArtifacts = {};
      const testResultsDir = join(harnessRoot, 'test-results');
      const testName = basename(testPath, '.spec.ts');

      // Check for common artifact locations
      const possibleScreenshot = join(testResultsDir, testName, 'test-failed-1.png');
      if (existsSync(possibleScreenshot)) {
        artifacts.screenshot = possibleScreenshot;
      }

      const possibleTrace = join(testResultsDir, testName, 'trace.zip');
      if (existsSync(possibleTrace)) {
        artifacts.trace = possibleTrace;
      }

      // Extract journey ID from test file if possible
      let journeyId: string | undefined;
      try {
        const testContent = readFileSync(testPath, 'utf-8');
        const journeyMatch = testContent.match(/@journey\s+(\S+)/);
        if (journeyMatch) {
          journeyId = journeyMatch[1];
        }
      } catch {
        // Ignore read errors
      }

      // Truncate output with indicator if too long
      // Uses UTF-8 safe truncation to avoid splitting surrogate pairs (emoji, etc.)
      const MAX_OUTPUT_SIZE = 10000;
      const truncateWithIndicator = (text: string, name: string): string => {
        if (text.length <= MAX_OUTPUT_SIZE) return text;
        // Find a safe truncation point that doesn't split a surrogate pair
        // Surrogate pairs: high surrogate (0xD800-0xDBFF) followed by low surrogate (0xDC00-0xDFFF)
        let truncateAt = MAX_OUTPUT_SIZE;
        const code = text.charCodeAt(truncateAt - 1);
        // If we're about to cut in the middle of a surrogate pair, back up one character
        if (code >= 0xD800 && code <= 0xDBFF) {
          truncateAt--;
        }
        const truncated = text.slice(0, truncateAt);
        return `${truncated}\n\n[${name} TRUNCATED - ${text.length - truncateAt} more characters]`;
      };

      resolve({
        version: '1.0',
        testPath,
        journeyId,
        status,
        duration,
        errors,
        output: {
          stdout: truncateWithIndicator(stdout, 'STDOUT'),
          stderr: truncateWithIndicator(stderr, 'STDERR'),
          exitCode,
        },
        artifacts,
        executedAt: new Date().toISOString(),
      });
    });

    proc.on('error', (err) => {
      resolve({
        version: '1.0',
        testPath,
        status: 'error',
        duration: Date.now() - startTime,
        errors: [{
          message: `Failed to spawn playwright: ${err.message}`,
          type: 'runtime',
        }],
        output: {
          stdout,
          stderr,
          exitCode: 1,
        },
        artifacts: {},
        executedAt: new Date().toISOString(),
      });
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMMAND
// ═══════════════════════════════════════════════════════════════════════════

export async function runRun(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: 'string', short: 'o' },
      timeout: { type: 'string', default: '30000' },
      retries: { type: 'string', default: '0' },
      headed: { type: 'boolean', default: false },
      debug: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      quiet: { type: 'boolean', short: 'q', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(USAGE);
    return;
  }

  if (positionals.length === 0) {
    console.error('Error: No test files specified');
    console.log(USAGE);
    process.exit(1);
  }

  const quiet = values.quiet;
  const outputJson = values.json;

  // Validate timeout and retries
  const timeout = parseInt(values.timeout, 10);
  const retries = parseInt(values.retries, 10);

  if (isNaN(timeout) || timeout <= 0) {
    console.error(`Error: Invalid timeout value "${values.timeout}". Must be a positive number.`);
    process.exit(1);
  }

  if (isNaN(retries) || retries < 0) {
    console.error(`Error: Invalid retries value "${values.retries}". Must be a non-negative number.`);
    process.exit(1);
  }

  // Initialize telemetry
  const telemetry = getTelemetry();
  await telemetry.load();
  const eventId = telemetry.trackCommandStart('run');

  // Check if Playwright is installed
  if (!quiet && !outputJson) {
    console.log('Checking Playwright installation...');
  }

  const playwrightCheck = await checkPlaywrightInstalled();
  if (!playwrightCheck.installed) {
    console.error(`Error: Playwright is not installed or not accessible.`);
    console.error(`  ${playwrightCheck.error}`);
    console.error('\nTo install Playwright, run:');
    console.error('  npx playwright install');
    telemetry.trackError('run', 'playwright_not_installed', playwrightCheck.error || 'Unknown');
    telemetry.trackCommandEnd(eventId, false, { error: 'playwright_not_installed' });
    await telemetry.save();
    process.exit(1);
  }

  if (!quiet && !outputJson) {
    console.log(`Running ${positionals.length} test file(s) with Playwright ${playwrightCheck.version || 'unknown'}...`);
  }

  const harnessRoot = getHarnessRoot();
  const results: TestRunResult[] = [];

  // Run each test file
  for (const testPath of positionals) {
    const fullPath = testPath.startsWith('/') ? testPath : join(harnessRoot, testPath);

    if (!existsSync(fullPath)) {
      console.error(`Warning: Test file not found: ${fullPath}`);
      results.push({
        version: '1.0',
        testPath: fullPath,
        status: 'error',
        duration: 0,
        errors: [{ message: `File not found: ${fullPath}`, type: 'runtime' }],
        output: { stdout: '', stderr: '', exitCode: 1 },
        artifacts: {},
        executedAt: new Date().toISOString(),
      });
      continue;
    }

    if (!quiet && !outputJson) {
      console.log(`\nRunning: ${basename(fullPath)}`);
    }

    const result = await runPlaywrightTest(fullPath, {
      timeout,
      retries,
      headed: values.headed,
      debug: values.debug,
    });

    results.push(result);

    if (!quiet && !outputJson) {
      const icon = result.status === 'passed' ? '✓' : '✗';
      console.log(`  ${icon} ${result.status} (${result.duration}ms)`);
      if (result.errors.length > 0) {
        console.log(`    Errors: ${result.errors.length}`);
        for (const err of result.errors.slice(0, 3)) {
          console.log(`    - [${err.type}] ${err.message.substring(0, 100)}`);
        }
      }
    }
  }

  // Calculate summary
  const summary: RunSummary = {
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    timeout: results.filter(r => r.status === 'timeout').length,
    error: results.filter(r => r.status === 'error').length,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
  };

  const output: RunOutput = {
    version: '1.0',
    results,
    summary,
    harnessRoot,
    executedAt: new Date().toISOString(),
  };

  // Output
  if (outputJson) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    // Write to file
    const outputPath = values.output || getAutogenArtifact('results');
    await ensureAutogenDir();
    writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    if (!quiet) {
      console.log(`\nResults:`);
      console.log(`  Passed: ${summary.passed}`);
      console.log(`  Failed: ${summary.failed}`);
      console.log(`  Timeout: ${summary.timeout}`);
      console.log(`  Error: ${summary.error}`);
      console.log(`  Duration: ${Math.round(summary.totalDuration / 1000)}s`);
      console.log(`\nOutput: ${outputPath}`);
    }
  }

  // Determine pipeline stage based on results
  const allPassed = summary.failed === 0 && summary.error === 0 && summary.timeout === 0;
  const pipelineStage = allPassed ? 'completed' : 'tested';

  // Update pipeline state
  await updatePipelineState('run', pipelineStage, allPassed, {
    testPaths: positionals,
  });

  // Track command completion
  telemetry.trackCommandEnd(eventId, allPassed, {
    passed: summary.passed,
    failed: summary.failed,
    timeout: summary.timeout,
    error: summary.error,
    duration: summary.totalDuration,
  });
  await telemetry.save();

  // Exit with error if any tests failed
  if (!allPassed) {
    process.exit(1);
  }
}
