import { parseReportFile, getSummary, getFailedTests } from './parser.js';
import { classifyTestResults, getFailureStats } from './classifier.js';
/**
 * Generate verification summary from runner result
 */
export function generateVerifySummary(runnerResult, options = {}) {
    const summary = {
        status: 'error',
        timestamp: new Date().toISOString(),
        duration: runnerResult.duration,
        counts: {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            flaky: 0,
        },
        failures: {
            tests: [],
            classifications: {},
            stats: {},
        },
        runner: {
            exitCode: runnerResult.exitCode,
            command: runnerResult.command,
        },
        reportPath: runnerResult.reportPath,
    };
    if (options.journeyId) {
        summary.journeyId = options.journeyId;
    }
    if (options.metadata) {
        summary.metadata = options.metadata;
    }
    // Parse report if available
    if (runnerResult.reportPath) {
        const report = parseReportFile(runnerResult.reportPath);
        if (report) {
            const parsed = getSummary(report);
            // Update counts
            summary.counts = {
                total: parsed.total,
                passed: parsed.passed,
                failed: parsed.failed,
                skipped: parsed.skipped,
                flaky: parsed.flaky,
            };
            // Get failed tests
            const failedTests = getFailedTests(report);
            summary.failures.tests = failedTests.map((t) => t.titlePath.join(' > '));
            // Classify failures
            const classifications = classifyTestResults(failedTests);
            summary.failures.classifications = Object.fromEntries(classifications);
            summary.failures.stats = getFailureStats(classifications);
            // Determine status
            if (parsed.failed === 0) {
                summary.status = parsed.flaky > 0 ? 'flaky' : 'passed';
            }
            else {
                summary.status = 'failed';
            }
        }
    }
    else {
        // No report - use runner result to determine status
        summary.status = runnerResult.success ? 'passed' : 'failed';
    }
    // Add stability info if provided
    if (options.stabilityResult) {
        summary.stability = {
            stable: options.stabilityResult.stable,
            flakyTests: options.stabilityResult.flakyTests,
            flakyRate: options.stabilityResult.flakyRate,
        };
        // Update status if unstable
        if (!options.stabilityResult.stable && summary.status === 'passed') {
            summary.status = 'flaky';
        }
    }
    return summary;
}
/**
 * Generate summary from Playwright report directly
 */
export function generateSummaryFromReport(report, options = {}) {
    const parsed = getSummary(report);
    const failedTests = getFailedTests(report);
    const classifications = classifyTestResults(failedTests);
    const summary = {
        status: parsed.failed === 0 ? (parsed.flaky > 0 ? 'flaky' : 'passed') : 'failed',
        timestamp: parsed.startTime.toISOString(),
        duration: parsed.duration,
        counts: {
            total: parsed.total,
            passed: parsed.passed,
            failed: parsed.failed,
            skipped: parsed.skipped,
            flaky: parsed.flaky,
        },
        failures: {
            tests: failedTests.map((t) => t.titlePath.join(' > ')),
            classifications: Object.fromEntries(classifications),
            stats: getFailureStats(classifications),
        },
        runner: {
            exitCode: parsed.failed > 0 ? 1 : 0,
            command: 'N/A',
        },
    };
    if (options.journeyId) {
        summary.journeyId = options.journeyId;
    }
    if (options.metadata) {
        summary.metadata = options.metadata;
    }
    return summary;
}
/**
 * Check if verification passed
 */
export function isVerificationPassed(summary) {
    return summary.status === 'passed';
}
/**
 * Check if verification has failures
 */
export function hasFailures(summary) {
    return summary.counts.failed > 0;
}
/**
 * Check if verification has flaky tests
 */
export function hasFlaky(summary) {
    return summary.counts.flaky > 0 || summary.stability?.flakyRate !== undefined && summary.stability.flakyRate > 0;
}
/**
 * Get actionable recommendations based on failures
 */
export function getRecommendations(summary) {
    const recommendations = [];
    if (summary.counts.failed > 0) {
        // Analyze failure categories
        const stats = summary.failures.stats;
        if (stats.selector > 0) {
            recommendations.push(`${stats.selector} selector issue(s): Update locators to use stable selectors (role, label, testid)`);
        }
        if (stats.timing > 0) {
            recommendations.push(`${stats.timing} timing issue(s): Add explicit waits or increase timeout`);
        }
        if (stats.auth > 0) {
            recommendations.push(`${stats.auth} auth issue(s): Check authentication state and credentials`);
        }
        if (stats.env > 0) {
            recommendations.push(`${stats.env} environment issue(s): Verify application is running and accessible`);
        }
        if (stats.data > 0) {
            recommendations.push(`${stats.data} data issue(s): Review test data and expected values`);
        }
    }
    if (summary.stability && !summary.stability.stable) {
        recommendations.push(`${summary.stability.flakyTests.length} flaky test(s) detected: Review for race conditions and add proper waits`);
    }
    return recommendations;
}
/**
 * Generate human-readable summary
 */
export function formatVerifySummary(summary) {
    const lines = [];
    // Status header
    const statusIcon = summary.status === 'passed'
        ? '✅'
        : summary.status === 'flaky'
            ? '⚠️'
            : '❌';
    lines.push(`${statusIcon} Verification ${summary.status.toUpperCase()}`);
    lines.push('');
    // Journey info
    if (summary.journeyId) {
        lines.push(`Journey: ${summary.journeyId}`);
    }
    lines.push(`Duration: ${Math.round(summary.duration / 1000)}s`);
    lines.push('');
    // Counts
    lines.push('## Results');
    lines.push(`- Total: ${summary.counts.total}`);
    lines.push(`- Passed: ${summary.counts.passed}`);
    lines.push(`- Failed: ${summary.counts.failed}`);
    lines.push(`- Skipped: ${summary.counts.skipped}`);
    lines.push(`- Flaky: ${summary.counts.flaky}`);
    lines.push('');
    // Failures
    if (summary.failures.tests.length > 0) {
        lines.push('## Failed Tests');
        for (const test of summary.failures.tests) {
            lines.push(`- ${test}`);
        }
        lines.push('');
    }
    // Stability
    if (summary.stability) {
        lines.push('## Stability');
        lines.push(`- Stable: ${summary.stability.stable ? 'Yes' : 'No'}`);
        lines.push(`- Flaky Rate: ${Math.round(summary.stability.flakyRate * 100)}%`);
        lines.push('');
    }
    // Recommendations
    const recommendations = getRecommendations(summary);
    if (recommendations.length > 0) {
        lines.push('## Recommendations');
        for (const rec of recommendations) {
            lines.push(`- ${rec}`);
        }
    }
    return lines.join('\n');
}
/**
 * Save summary to JSON file
 */
export function saveSummary(summary, outputPath) {
    const { writeFileSync, mkdirSync } = require('node:fs');
    const { dirname } = require('node:path');
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf-8');
}
//# sourceMappingURL=summary.js.map