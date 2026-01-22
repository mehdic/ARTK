"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseReportFile = parseReportFile;
exports.parseReportContent = parseReportContent;
exports.extractTestResults = extractTestResults;
exports.getSummary = getSummary;
exports.getFailedTests = getFailedTests;
exports.getFlakyTests = getFlakyTests;
exports.findTestsByTitle = findTestsByTitle;
exports.findTestsByTag = findTestsByTag;
exports.extractErrorMessages = extractErrorMessages;
exports.extractErrorStacks = extractErrorStacks;
exports.getFailedStep = getFailedStep;
exports.isReportSuccessful = isReportSuccessful;
exports.hasFlaky = hasFlaky;
exports.formatTestResult = formatTestResult;
exports.generateMarkdownSummary = generateMarkdownSummary;
/**
 * Playwright JSON Report Parser - Parse test results from JSON reporter
 * @see T051 - Implement JSON report parser for test results
 */
const node_fs_1 = require("node:fs");
/**
 * Parse Playwright JSON report from file
 */
function parseReportFile(filePath) {
    if (!(0, node_fs_1.existsSync)(filePath)) {
        return null;
    }
    try {
        const content = (0, node_fs_1.readFileSync)(filePath, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
/**
 * Parse Playwright JSON report from string
 */
function parseReportContent(content) {
    try {
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
/**
 * Extract all test results from report
 */
function extractTestResults(report) {
    const results = [];
    function extractFromSuite(suite, titlePath = []) {
        const currentPath = [...titlePath, suite.title].filter(Boolean);
        for (const spec of suite.specs) {
            for (const test of spec.tests) {
                for (const result of test.results) {
                    results.push({
                        ...result,
                        titlePath: [...currentPath, spec.title],
                    });
                }
            }
        }
        for (const childSuite of suite.suites) {
            extractFromSuite(childSuite, currentPath);
        }
    }
    for (const suite of report.suites) {
        extractFromSuite(suite);
    }
    return results;
}
/**
 * Get summary from Playwright report
 */
function getSummary(report) {
    const allResults = extractTestResults(report);
    const failedTests = allResults.filter((r) => r.status === 'failed');
    const passedTests = allResults.filter((r) => r.status === 'passed');
    const skippedTests = allResults.filter((r) => r.status === 'skipped');
    // Flaky tests: passed on retry
    const flakyTests = allResults.filter((r) => r.status === 'passed' && r.retry > 0);
    // Extract unique file paths
    const files = [...new Set(allResults.map((r) => r.location.file))];
    return {
        total: allResults.length,
        passed: passedTests.length,
        failed: failedTests.length,
        skipped: skippedTests.length,
        flaky: flakyTests.length,
        duration: report.stats.duration,
        startTime: new Date(report.stats.startTime),
        files,
        failedTests,
        flakyTests,
    };
}
/**
 * Get failed test details
 */
function getFailedTests(report) {
    return extractTestResults(report).filter((r) => r.status === 'failed');
}
/**
 * Get flaky test details
 */
function getFlakyTests(report) {
    return extractTestResults(report).filter((r) => r.status === 'passed' && r.retry > 0);
}
/**
 * Get test by title pattern
 */
function findTestsByTitle(report, pattern) {
    const allResults = extractTestResults(report);
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    return allResults.filter((r) => regex.test(r.title));
}
/**
 * Get tests by tag
 */
function findTestsByTag(report, tag) {
    const allResults = extractTestResults(report);
    return allResults.filter((r) => r.tags.includes(tag));
}
/**
 * Extract error messages from test result
 */
function extractErrorMessages(result) {
    return result.errors.map((e) => e.message);
}
/**
 * Extract error stack from test result
 */
function extractErrorStacks(result) {
    return result.errors
        .map((e) => e.stack)
        .filter((s) => s !== undefined);
}
/**
 * Get step that failed
 */
function getFailedStep(result) {
    function findFailedStep(steps) {
        for (const step of steps) {
            if (step.error) {
                return step;
            }
            if (step.steps) {
                const found = findFailedStep(step.steps);
                if (found)
                    return found;
            }
        }
        return null;
    }
    return findFailedStep(result.steps);
}
/**
 * Check if report indicates overall success
 */
function isReportSuccessful(report) {
    return report.stats.unexpected === 0;
}
/**
 * Check if report has flaky tests
 */
function hasFlaky(report) {
    return report.stats.flaky > 0;
}
/**
 * Format test result for display
 */
function formatTestResult(result) {
    const status = result.status.toUpperCase();
    const title = result.titlePath.join(' > ');
    const duration = `${result.duration}ms`;
    const retry = result.retry > 0 ? ` (retry ${result.retry})` : '';
    let output = `[${status}] ${title} (${duration})${retry}`;
    if (result.errors.length > 0) {
        output += '\n  Errors:';
        for (const error of result.errors) {
            output += `\n    - ${error.message}`;
        }
    }
    return output;
}
/**
 * Generate markdown summary
 */
function generateMarkdownSummary(report) {
    const summary = getSummary(report);
    const lines = [];
    lines.push('# Test Results Summary');
    lines.push('');
    lines.push(`**Status**: ${summary.failed === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push(`**Duration**: ${Math.round(summary.duration / 1000)}s`);
    lines.push('');
    lines.push('## Stats');
    lines.push('');
    lines.push(`- Total: ${summary.total}`);
    lines.push(`- Passed: ${summary.passed}`);
    lines.push(`- Failed: ${summary.failed}`);
    lines.push(`- Skipped: ${summary.skipped}`);
    lines.push(`- Flaky: ${summary.flaky}`);
    if (summary.failedTests.length > 0) {
        lines.push('');
        lines.push('## Failed Tests');
        lines.push('');
        for (const test of summary.failedTests) {
            lines.push(`### ${test.titlePath.join(' > ')}`);
            for (const error of test.errors) {
                lines.push('');
                lines.push('```');
                lines.push(error.message);
                lines.push('```');
            }
        }
    }
    if (summary.flakyTests.length > 0) {
        lines.push('');
        lines.push('## Flaky Tests');
        lines.push('');
        for (const test of summary.flakyTests) {
            lines.push(`- ${test.titlePath.join(' > ')} (passed on retry ${test.retry})`);
        }
    }
    return lines.join('\n');
}
//# sourceMappingURL=parser.js.map