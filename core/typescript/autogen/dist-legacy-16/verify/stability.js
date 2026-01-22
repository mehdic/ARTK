"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStability = checkStability;
exports.quickStabilityCheck = quickStabilityCheck;
exports.thoroughStabilityCheck = thoroughStabilityCheck;
exports.isTestStable = isTestStable;
exports.getFlakinessScore = getFlakinessScore;
exports.shouldQuarantine = shouldQuarantine;
exports.generateStabilityReport = generateStabilityReport;
/**
 * Stability Gate - Check for flaky tests with repeat execution
 * @see T053 - Implement stability gate (--repeat-each, --fail-on-flaky-tests)
 */
const runner_js_1 = require("./runner.js");
const parser_js_1 = require("./parser.js");
const DEFAULT_OPTIONS = {
    repeatCount: 3,
    maxFlakyRate: 0,
    stopOnFlaky: false,
};
/**
 * Run stability check on tests
 */
function checkStability(options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const result = {
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
    const runnerResult = (0, runner_js_1.runPlaywrightSync)({
        ...options,
        repeatEach: opts.repeatCount,
        failOnFlaky: true,
    });
    result.runnerResult = runnerResult;
    result.runsCompleted = opts.repeatCount;
    // Parse report if available
    if (runnerResult.reportPath) {
        const report = (0, parser_js_1.parseReportFile)(runnerResult.reportPath);
        if (report) {
            const summary = (0, parser_js_1.getSummary)(report);
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
function quickStabilityCheck(options = {}) {
    return checkStability({
        ...options,
        repeatCount: 2,
    });
}
/**
 * Thorough stability check (5 runs)
 */
function thoroughStabilityCheck(options = {}) {
    return checkStability({
        ...options,
        repeatCount: 5,
    });
}
/**
 * Check if a specific test is stable
 */
function isTestStable(testFile, testName, repeatCount = 3, options = {}) {
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
function getFlakinessScore(result) {
    if (result.runsCompleted === 0)
        return 0;
    return result.flakyRate;
}
/**
 * Determine if test should be quarantined based on stability
 */
function shouldQuarantine(result, threshold = 0.3) {
    return result.flakyRate > threshold;
}
/**
 * Generate stability report
 */
function generateStabilityReport(result) {
    const lines = [];
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
    }
    else {
        lines.push('## All Tests Stable');
        lines.push('');
        lines.push('No flakiness detected after repeated runs.');
    }
    return lines.join('\n');
}
//# sourceMappingURL=stability.js.map