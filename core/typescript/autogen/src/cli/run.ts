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
  validatePath,
  PathTraversalError,
} from '../utils/paths.js';
import { updatePipelineState, loadPipelineState, canProceedTo } from '../pipeline/state.js';
import { getTelemetry } from '../shared/telemetry.js';
import { checkPlaywrightInstalled } from '../refinement/playwright-runner.js';
import { recordPatternFailure } from '../llkb/patternExtension.js';
import { trackBlockedStep } from '../shared/blocked-step-telemetry.js';

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
  -f, --force            Skip pipeline state validation
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

/**
 * Maximum length for truncated error message fragments.
 * Messages shorter than this ending with ':' are likely split artifacts
 * from the error block parsing (e.g., "Error: locator.click:").
 */
const TRUNCATED_MESSAGE_MAX_LENGTH = 80;

// Export for testing
export function parseErrorType(message: string): ErrorType {
  const lower = message.toLowerCase();

  // Check for TypeScript/JavaScript errors FIRST (most specific)
  // These are compilation/syntax issues
  if (lower.includes('ts(') || lower.includes('error ts') ||
      /\berror\s+ts\d+\b/.test(lower)) {
    return 'typescript';
  }
  if (lower.includes('syntaxerror:') || lower.includes('syntax error')) {
    return 'typescript';
  }

  // Check for assertion errors (expect, toHave, assertion)
  // Must come before selector check because "expect(locator)" contains "locator"
  if (lower.includes('expect(') || lower.includes('tohave') ||
      lower.includes('tocontain') || lower.includes('tobe') ||
      lower.includes('assertion') || lower.includes('expected string:') ||
      lower.includes('received string:')) {
    return 'assertion';
  }

  // Check for timeout errors
  // "Timeout" followed by time is very specific
  if (/timeout\s+\d+ms/i.test(message) || lower.includes('timeout exceeded') ||
      lower.includes('exceeded time')) {
    return 'timeout';
  }

  // Check for navigation errors
  if (lower.includes('page.goto') || lower.includes('net::err') ||
      lower.includes('navigation') || lower.includes('err_name_not_resolved') ||
      lower.includes('err_connection')) {
    return 'navigation';
  }

  // Check for selector/locator errors
  // These typically have "strict mode violation" or "resolved to 0 elements"
  if (lower.includes('strict mode violation') || lower.includes('resolved to 0 elements') ||
      lower.includes('locator.click:') || lower.includes('locator.fill:') ||
      (lower.includes('locator') && !lower.includes('expect'))) {
    return 'selector';
  }

  // Check for TypeError (runtime JS error)
  if (lower.includes('typeerror:') || lower.includes('referenceerror:')) {
    return 'runtime';
  }

  // Generic error patterns last
  if (lower.includes('error:') || lower.includes('exception')) {
    return 'runtime';
  }

  return 'unknown';
}

// Export for testing
export function parseErrorLocation(message: string): ErrorLocation | undefined {
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

// Export for testing
export function suggestFix(errorType: ErrorType, message: string): string | undefined {
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

// Export for testing
export function parseErrors(stdout: string, stderr: string): TestError[] {
  const errors: TestError[] = [];
  const combined = `${stdout}\n${stderr}`;

  // Parse Playwright error format - include TypeScript error patterns (lowercase "error TS")
  const errorBlocks = combined.split(/(?=Error:|✘|FAILED|AssertionError|\berror TS\d+)/);

  for (const block of errorBlocks) {
    if (!block.trim() || block.length < 20) continue;

    const lowerBlock = block.toLowerCase();

    // Skip non-error blocks - case insensitive check for "error"
    if (!lowerBlock.includes('error') && !block.includes('✘') && !lowerBlock.includes('failed')) {
      continue;
    }

    const lines = block.split('\n');

    // Extract error message - use more lines for better context
    const message = lines.slice(0, 5).join(' ').trim().substring(0, 500);

    if (!message) continue;

    const errorType = parseErrorType(message);
    const location = parseErrorLocation(block);

    // Extract code snippet if available
    const snippetMatch = block.match(/>\s*\d+\s*\|(.+)/);
    const snippet = snippetMatch?.[1]?.trim();

    // Skip truncated blocks that appear to be artifacts of aggressive splitting.
    // A truncated block typically:
    // - Has no location and no snippet (no useful context)
    // - Is very short and ends with a colon (incomplete message like "Error: locator.click:")
    // We preserve the more complete block that contains the actual error details.
    // Note: We don't check errorType here because even known error types can appear
    // as truncated fragments (e.g., "Error: locator.click:" is split from the full message).
    if (!location && !snippet) {
      const trimmedMsg = message.trim();
      // Skip if message is clearly incomplete (ends with : and is short)
      // This catches split artifacts like "Error: locator.click:"
      if (trimmedMsg.endsWith(':') && trimmedMsg.length < TRUNCATED_MESSAGE_MAX_LENGTH) {
        continue;
      }
    }

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
      force: { type: 'boolean', short: 'f', default: false },
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
  const force = values.force;

  // Validate pipeline state transition (unless --force)
  if (!force) {
    const currentState = await loadPipelineState();
    const transition = canProceedTo(currentState, 'tested');
    if (!transition.allowed) {
      console.error(`Error: ${transition.reason}`);
      console.error('Use --force to bypass state validation.');
      process.exit(1);
    }
  } else if (!quiet && !outputJson) {
    console.log('Warning: Bypassing pipeline state validation (--force)');
  }

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
    // SECURITY: Validate path to prevent directory traversal attacks
    let fullPath: string;
    try {
      fullPath = validatePath(testPath, harnessRoot);
    } catch (error) {
      if (error instanceof PathTraversalError) {
        console.error(`Error: Path traversal detected: "${testPath}"`);
        console.error(`  Paths must be within harness root: ${harnessRoot}`);
        results.push({
          version: '1.0',
          testPath,
          status: 'error',
          duration: 0,
          errors: [{ message: `Path traversal blocked: ${testPath}`, type: 'runtime' }],
          output: { stdout: '', stderr: '', exitCode: 1 },
          artifacts: {},
          executedAt: new Date().toISOString(),
        });
        continue;
      }
      throw error;
    }

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

  // ═══════════════════════════════════════════════════════════════════════════
  // LLKB FEEDBACK LOOP: Record pattern failures for confidence adjustment
  // Fire-and-forget: don't block main pipeline, just log errors
  // @see research/2026-02-03_multi-ai-debate-llkb-feedback.md
  // ═══════════════════════════════════════════════════════════════════════════
  if (!allPassed) {
    for (const result of results) {
      if (result.status !== 'passed' && result.journeyId) {
        // Record each error type as a pattern failure for LLKB learning
        for (const error of result.errors) {
          // Fire-and-forget: async call without await, catch errors silently
          Promise.resolve().then(() => {
            try {
              // Record failure to decrease pattern confidence
              recordPatternFailure(
                error.message.substring(0, 500), // Truncate for pattern matching
                result.journeyId!
              );
              // Track blocked step for telemetry analysis
              trackBlockedStep({
                stepText: error.message.substring(0, 500),
                journeyId: result.journeyId!,
                errorType: error.type,
                timestamp: new Date().toISOString(),
              });
            } catch (e) {
              // Silent catch - LLKB failures should never crash the pipeline
              if (!quiet) {
                console.warn(`LLKB recording skipped: ${e instanceof Error ? e.message : 'unknown error'}`);
              }
            }
          });
        }
      }
    }
  }

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
