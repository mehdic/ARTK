/**
 * Playwright CLI Runner Wrapper - Execute tests and capture results
 * @see T050 - Implement Playwright CLI runner wrapper
 */
import { execSync, spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

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
export function isPlaywrightAvailable(cwd?: string): boolean {
  try {
    execSync('npx playwright --version', {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Playwright version
 */
export function getPlaywrightVersion(cwd?: string): string | null {
  try {
    const result = execSync('npx playwright --version', {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Build Playwright command arguments
 */
export function buildPlaywrightArgs(options: RunnerOptions): string[] {
  const args = ['test'];

  if (options.testFile) {
    args.push(options.testFile);
  }

  if (options.grep) {
    args.push('--grep', options.grep);
  }

  if (options.project) {
    args.push('--project', options.project);
  }

  if (options.workers !== undefined) {
    args.push('--workers', String(options.workers));
  }

  if (options.retries !== undefined) {
    args.push('--retries', String(options.retries));
  }

  if (options.repeatEach !== undefined) {
    args.push('--repeat-each', String(options.repeatEach));
  }

  if (options.failOnFlaky) {
    args.push('--fail-on-flaky-tests');
  }

  if (options.timeout !== undefined) {
    args.push('--timeout', String(options.timeout));
  }

  if (options.reporter) {
    args.push('--reporter', options.reporter);
  }

  if (options.outputDir) {
    args.push('--output', options.outputDir);
  }

  if (options.headed) {
    args.push('--headed');
  }

  if (options.debug) {
    args.push('--debug');
  }

  if (options.updateSnapshots) {
    args.push('--update-snapshots');
  }

  return args;
}

/**
 * Run Playwright tests synchronously
 */
export function runPlaywrightSync(options: RunnerOptions = {}): RunnerResult {
  const { cwd = process.cwd(), env = {} } = options;

  // Ensure Playwright is available
  if (!isPlaywrightAvailable(cwd)) {
    return {
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: 'Playwright is not installed',
      duration: 0,
      command: 'npx playwright test',
    };
  }

  // Create temp dir for JSON report (using mkdtempSync for unpredictable names)
  const tempDir = mkdtempSync(join(tmpdir(), 'autogen-verify-'));
  const reportPath = join(tempDir, 'results.json');

  // Build command args
  const args = buildPlaywrightArgs({
    ...options,
    reporter: `json,line`,
  });

  // Command string for logging only
  const command = `npx playwright ${args.join(' ')}`;
  const startTime = Date.now();

  try {
    // SECURITY: Use spawnSync with array args to prevent command injection
    // This avoids shell interpretation of special characters in file paths
    const result = spawnSync('npx', ['playwright', ...args], {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
      env: {
        ...process.env,
        ...env,
        PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath,
      },
      timeout: options.timeout ? options.timeout * 10 : 600000, // 10x test timeout or 10 min
    });

    const success = result.status === 0;
    return {
      success,
      exitCode: result.status ?? 1,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      reportPath: existsSync(reportPath) ? reportPath : undefined,
      duration: Date.now() - startTime,
      command,
    };
  } finally {
    // Always cleanup temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Run Playwright tests asynchronously
 */
export function runPlaywrightAsync(
  options: RunnerOptions = {}
): Promise<RunnerResult> {
  return new Promise((resolve) => {
    const { cwd = process.cwd(), env = {} } = options;

    // Create temp dir for JSON report (using mkdtempSync for unpredictable names)
    const tempDir = mkdtempSync(join(tmpdir(), 'autogen-verify-'));
    const reportPath = join(tempDir, 'results.json');

    // Build command args
    const args = buildPlaywrightArgs({
      ...options,
      reporter: 'json,line',
    });

    // Command string for logging only
    const command = `npx playwright ${args.join(' ')}`;
    const startTime = Date.now();

    let stdout = '';
    let stderr = '';

    // Helper to cleanup and resolve
    const cleanupAndResolve = (result: RunnerResult) => {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
      resolve(result);
    };

    // SECURITY: shell: false (default) prevents command injection via args
    // Node.js v14.18+ handles .cmd/.bat files on Windows automatically
    const child: ChildProcess = spawn('npx', ['playwright', ...args], {
      cwd,
      env: {
        ...process.env,
        ...env,
        PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath,
      },
    });

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code: number | null) => {
      cleanupAndResolve({
        success: code === 0,
        exitCode: code || 1,
        stdout,
        stderr,
        reportPath: existsSync(reportPath) ? reportPath : undefined,
        duration: Date.now() - startTime,
        command,
      });
    });

    child.on('error', (error: Error) => {
      cleanupAndResolve({
        success: false,
        exitCode: 1,
        stdout,
        stderr: error.message,
        duration: Date.now() - startTime,
        command,
      });
    });
  });
}

/**
 * Run a single test file
 */
export function runTestFile(
  testFilePath: string,
  options: Omit<RunnerOptions, 'testFile'> = {}
): RunnerResult {
  if (!existsSync(testFilePath)) {
    return {
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: `Test file not found: ${testFilePath}`,
      duration: 0,
      command: '',
    };
  }

  return runPlaywrightSync({
    ...options,
    testFile: testFilePath,
    cwd: options.cwd || dirname(testFilePath),
  });
}

/**
 * Run tests by journey ID tag
 */
export function runJourneyTests(
  journeyId: string,
  options: Omit<RunnerOptions, 'grep'> = {}
): RunnerResult {
  return runPlaywrightSync({
    ...options,
    grep: `@${journeyId}`,
  });
}

/**
 * Check if a test file compiles (syntax check)
 */
export function checkTestSyntax(testFilePath: string, cwd?: string): boolean {
  if (!existsSync(testFilePath)) {
    return false;
  }

  // SECURITY: Use spawnSync with array args to prevent command injection
  // This avoids shell interpretation of special characters in testFilePath
  const result = spawnSync('npx', ['tsc', '--noEmit', testFilePath], {
    cwd: cwd || dirname(testFilePath),
    stdio: 'pipe',
  });
  return result.status === 0;
}

/**
 * Write test file and run it
 */
export function writeAndRunTest(
  code: string,
  filename: string,
  options: RunnerOptions = {}
): RunnerResult {
  // Use mkdtempSync for unpredictable temp directory names
  const tempDir = mkdtempSync(join(tmpdir(), 'autogen-test-'));

  const testPath = join(tempDir, filename);
  writeFileSync(testPath, code, 'utf-8');

  try {
    return runTestFile(testPath, options);
  } finally {
    // Cleanup temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get test count from Playwright
 */
export function getTestCount(testFile: string, cwd?: string): number {
  // SECURITY: Use spawnSync with array args to prevent command injection
  // This avoids shell interpretation of special characters in testFile
  const result = spawnSync('npx', ['playwright', 'test', '--list', testFile], {
    cwd,
    stdio: 'pipe',
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    return 0;
  }

  // Parse "Listing X tests" output
  const output = result.stdout || '';
  const match = output.match(/Listing (\d+) tests?/);
  return match ? parseInt(match[1]!, 10) : 0;
}
