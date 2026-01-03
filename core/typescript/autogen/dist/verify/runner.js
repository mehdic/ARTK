/**
 * Playwright CLI Runner Wrapper - Execute tests and capture results
 * @see T050 - Implement Playwright CLI runner wrapper
 */
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
/**
 * Check if Playwright is available
 */
export function isPlaywrightAvailable(cwd) {
    try {
        execSync('npx playwright --version', {
            cwd,
            stdio: 'pipe',
            encoding: 'utf-8',
        });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get Playwright version
 */
export function getPlaywrightVersion(cwd) {
    try {
        const result = execSync('npx playwright --version', {
            cwd,
            stdio: 'pipe',
            encoding: 'utf-8',
        });
        return result.trim();
    }
    catch {
        return null;
    }
}
/**
 * Build Playwright command arguments
 */
export function buildPlaywrightArgs(options) {
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
export function runPlaywrightSync(options = {}) {
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
    // Create temp dir for JSON report
    const tempDir = join(tmpdir(), `autogen-verify-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    const reportPath = join(tempDir, 'results.json');
    // Build command
    const args = buildPlaywrightArgs({
        ...options,
        reporter: `json,line`,
    });
    const command = `npx playwright ${args.join(' ')}`;
    const startTime = Date.now();
    try {
        const result = execSync(command, {
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
        return {
            success: true,
            exitCode: 0,
            stdout: result,
            stderr: '',
            reportPath: existsSync(reportPath) ? reportPath : undefined,
            duration: Date.now() - startTime,
            command,
        };
    }
    catch (error) {
        const execError = error;
        return {
            success: false,
            exitCode: execError.status || 1,
            stdout: execError.stdout || '',
            stderr: execError.stderr || String(error),
            reportPath: existsSync(reportPath) ? reportPath : undefined,
            duration: Date.now() - startTime,
            command,
        };
    }
}
/**
 * Run Playwright tests asynchronously
 */
export function runPlaywrightAsync(options = {}) {
    return new Promise((resolve) => {
        const { cwd = process.cwd(), env = {} } = options;
        // Create temp dir for JSON report
        const tempDir = join(tmpdir(), `autogen-verify-${Date.now()}`);
        mkdirSync(tempDir, { recursive: true });
        const reportPath = join(tempDir, 'results.json');
        // Build command
        const args = buildPlaywrightArgs({
            ...options,
            reporter: 'json,line',
        });
        const command = `npx playwright ${args.join(' ')}`;
        const startTime = Date.now();
        let stdout = '';
        let stderr = '';
        const child = spawn('npx', ['playwright', ...args], {
            cwd,
            env: {
                ...process.env,
                ...env,
                PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath,
            },
            shell: true,
        });
        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });
        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        child.on('close', (code) => {
            resolve({
                success: code === 0,
                exitCode: code || 1,
                stdout,
                stderr,
                reportPath: existsSync(reportPath) ? reportPath : undefined,
                duration: Date.now() - startTime,
                command,
            });
        });
        child.on('error', (error) => {
            resolve({
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
export function runTestFile(testFilePath, options = {}) {
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
export function runJourneyTests(journeyId, options = {}) {
    return runPlaywrightSync({
        ...options,
        grep: `@${journeyId}`,
    });
}
/**
 * Check if a test file compiles (syntax check)
 */
export function checkTestSyntax(testFilePath, cwd) {
    if (!existsSync(testFilePath)) {
        return false;
    }
    try {
        execSync(`npx tsc --noEmit ${testFilePath}`, {
            cwd: cwd || dirname(testFilePath),
            stdio: 'pipe',
        });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Write test file and run it
 */
export function writeAndRunTest(code, filename, options = {}) {
    const tempDir = join(tmpdir(), `autogen-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    const testPath = join(tempDir, filename);
    writeFileSync(testPath, code, 'utf-8');
    return runTestFile(testPath, options);
}
/**
 * Get test count from Playwright
 */
export function getTestCount(testFile, cwd) {
    try {
        const result = execSync(`npx playwright test --list ${testFile}`, {
            cwd,
            stdio: 'pipe',
            encoding: 'utf-8',
        });
        // Parse "Listing X tests" output
        const match = result.match(/Listing (\d+) tests?/);
        return match ? parseInt(match[1], 10) : 0;
    }
    catch {
        return 0;
    }
}
//# sourceMappingURL=runner.js.map