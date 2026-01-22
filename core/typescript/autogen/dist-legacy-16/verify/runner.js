"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlaywrightAvailable = isPlaywrightAvailable;
exports.getPlaywrightVersion = getPlaywrightVersion;
exports.buildPlaywrightArgs = buildPlaywrightArgs;
exports.runPlaywrightSync = runPlaywrightSync;
exports.runPlaywrightAsync = runPlaywrightAsync;
exports.runTestFile = runTestFile;
exports.runJourneyTests = runJourneyTests;
exports.checkTestSyntax = checkTestSyntax;
exports.writeAndRunTest = writeAndRunTest;
exports.getTestCount = getTestCount;
/**
 * Playwright CLI Runner Wrapper - Execute tests and capture results
 * @see T050 - Implement Playwright CLI runner wrapper
 */
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
/**
 * Check if Playwright is available
 */
function isPlaywrightAvailable(cwd) {
    try {
        (0, node_child_process_1.execSync)('npx playwright --version', {
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
function getPlaywrightVersion(cwd) {
    try {
        const result = (0, node_child_process_1.execSync)('npx playwright --version', {
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
function buildPlaywrightArgs(options) {
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
function runPlaywrightSync(options = {}) {
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
    const tempDir = (0, node_path_1.join)((0, node_os_1.tmpdir)(), `autogen-verify-${Date.now()}`);
    (0, node_fs_1.mkdirSync)(tempDir, { recursive: true });
    const reportPath = (0, node_path_1.join)(tempDir, 'results.json');
    // Build command
    const args = buildPlaywrightArgs({
        ...options,
        reporter: `json,line`,
    });
    const command = `npx playwright ${args.join(' ')}`;
    const startTime = Date.now();
    try {
        const result = (0, node_child_process_1.execSync)(command, {
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
            reportPath: (0, node_fs_1.existsSync)(reportPath) ? reportPath : undefined,
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
            reportPath: (0, node_fs_1.existsSync)(reportPath) ? reportPath : undefined,
            duration: Date.now() - startTime,
            command,
        };
    }
}
/**
 * Run Playwright tests asynchronously
 */
function runPlaywrightAsync(options = {}) {
    return new Promise((resolve) => {
        const { cwd = process.cwd(), env = {} } = options;
        // Create temp dir for JSON report
        const tempDir = (0, node_path_1.join)((0, node_os_1.tmpdir)(), `autogen-verify-${Date.now()}`);
        (0, node_fs_1.mkdirSync)(tempDir, { recursive: true });
        const reportPath = (0, node_path_1.join)(tempDir, 'results.json');
        // Build command
        const args = buildPlaywrightArgs({
            ...options,
            reporter: 'json,line',
        });
        const command = `npx playwright ${args.join(' ')}`;
        const startTime = Date.now();
        let stdout = '';
        let stderr = '';
        const child = (0, node_child_process_1.spawn)('npx', ['playwright', ...args], {
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
                reportPath: (0, node_fs_1.existsSync)(reportPath) ? reportPath : undefined,
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
function runTestFile(testFilePath, options = {}) {
    if (!(0, node_fs_1.existsSync)(testFilePath)) {
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
        cwd: options.cwd || (0, node_path_1.dirname)(testFilePath),
    });
}
/**
 * Run tests by journey ID tag
 */
function runJourneyTests(journeyId, options = {}) {
    return runPlaywrightSync({
        ...options,
        grep: `@${journeyId}`,
    });
}
/**
 * Check if a test file compiles (syntax check)
 */
function checkTestSyntax(testFilePath, cwd) {
    if (!(0, node_fs_1.existsSync)(testFilePath)) {
        return false;
    }
    try {
        (0, node_child_process_1.execSync)(`npx tsc --noEmit ${testFilePath}`, {
            cwd: cwd || (0, node_path_1.dirname)(testFilePath),
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
function writeAndRunTest(code, filename, options = {}) {
    const tempDir = (0, node_path_1.join)((0, node_os_1.tmpdir)(), `autogen-test-${Date.now()}`);
    (0, node_fs_1.mkdirSync)(tempDir, { recursive: true });
    const testPath = (0, node_path_1.join)(tempDir, filename);
    (0, node_fs_1.writeFileSync)(testPath, code, 'utf-8');
    return runTestFile(testPath, options);
}
/**
 * Get test count from Playwright
 */
function getTestCount(testFile, cwd) {
    try {
        const result = (0, node_child_process_1.execSync)(`npx playwright test --list ${testFile}`, {
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