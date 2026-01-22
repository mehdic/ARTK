"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORBIDDEN_PATTERNS = void 0;
exports.scanForbiddenPatterns = scanForbiddenPatterns;
exports.scanResultsToIssues = scanResultsToIssues;
exports.getPatternStats = getPatternStats;
exports.hasErrorViolations = hasErrorViolations;
exports.filterBySeverity = filterBySeverity;
exports.getViolationSummary = getViolationSummary;
/**
 * Forbidden patterns that indicate flaky or brittle tests
 */
exports.FORBIDDEN_PATTERNS = [
    {
        id: 'WAIT_TIMEOUT',
        name: 'waitForTimeout',
        regex: /\bpage\.waitForTimeout\s*\(\s*\d+\s*\)/g,
        severity: 'error',
        reason: 'Hard-coded waits cause flakiness and slow down tests',
        suggestion: 'Use waitForSelector, waitForLoadState, or assertion auto-wait',
    },
    {
        id: 'WAIT_ARBITRARY',
        name: 'arbitrary-wait',
        regex: /\bawait\s+new\s+Promise\s*\(\s*(?:resolve|r)\s*=>\s*setTimeout/g,
        severity: 'error',
        reason: 'Custom setTimeout-based waits cause flakiness',
        suggestion: 'Use Playwright auto-wait assertions instead',
    },
    {
        id: 'FORCE_CLICK',
        name: 'force-click',
        regex: /\.click\s*\([^)]*\{\s*force\s*:\s*true/g,
        severity: 'warning',
        reason: 'Force clicking bypasses visibility checks and masks issues',
        suggestion: 'Ensure element is visible and actionable, or use scrollIntoView',
    },
    {
        id: 'FORCE_FILL',
        name: 'force-fill',
        regex: /\.fill\s*\(\s*[^,]+,\s*\{\s*force\s*:\s*true/g,
        severity: 'warning',
        reason: 'Force filling bypasses visibility checks',
        suggestion: 'Ensure input is visible and enabled',
    },
    {
        id: 'CSS_SELECTOR_CLASS',
        name: 'css-class-selector',
        regex: /(?:page|locator)\s*\.\s*(?:locator|querySelector)\s*\(\s*['"][^'"]*\.[a-z][a-z0-9_-]*(?:\s|['">\[])/gi,
        severity: 'warning',
        reason: 'CSS class selectors are fragile and may change',
        suggestion: 'Use role, label, placeholder, text, or testid locators',
    },
    {
        id: 'CSS_SELECTOR_TAG',
        name: 'css-tag-selector',
        regex: /(?:page|locator)\s*\.\s*locator\s*\(\s*['"](?:div|span|p|h[1-6]|section|header|footer|main|nav|aside|article)(?:\s*>|\s*\[|['"])/gi,
        severity: 'warning',
        reason: 'Generic tag selectors are too broad and fragile',
        suggestion: 'Use more specific selectors like role, label, or testid',
    },
    {
        id: 'XPATH_SELECTOR',
        name: 'xpath-selector',
        regex: /(?:page|locator)\s*\.\s*locator\s*\(\s*['"]\/\/[^'"]+['"]/g,
        severity: 'warning',
        reason: 'XPath selectors are verbose and often fragile',
        suggestion: 'Use role, label, or testid locators instead',
    },
    {
        id: 'NTH_CHILD',
        name: 'nth-child-selector',
        regex: /:nth-child\s*\(\s*\d+\s*\)/g,
        severity: 'warning',
        reason: 'nth-child selectors break when DOM order changes',
        suggestion: 'Use unique identifiers like testid or text content',
    },
    {
        id: 'INDEX_LOCATOR',
        name: 'index-based-locator',
        regex: /\.(?:first|last|nth)\s*\(\s*(?:\d+)?\s*\)/g,
        severity: 'info',
        reason: 'Index-based locators may break when list order changes',
        suggestion: 'Consider filtering by unique content or attributes',
    },
    {
        id: 'HARDCODED_URL',
        name: 'hardcoded-url',
        regex: /\bpage\.goto\s*\(\s*['"]https?:\/\/[^'"]+['"]/g,
        severity: 'warning',
        reason: 'Hardcoded URLs make tests environment-specific',
        suggestion: 'Use baseURL from config or relative paths',
    },
    {
        id: 'HARDCODED_CREDENTIALS',
        name: 'hardcoded-credentials',
        regex: /(?:password|secret|apikey|api_key|token)\s*[=:]\s*['"][^'"]+['"]/gi,
        severity: 'error',
        reason: 'Credentials should not be hardcoded in test files',
        suggestion: 'Use environment variables or secure config',
    },
    {
        id: 'CONSOLE_LOG',
        name: 'console-log',
        regex: /\bconsole\.(log|info|warn|error)\s*\(/g,
        severity: 'info',
        reason: 'Console statements should be removed from production tests',
        suggestion: 'Use test reporter or remove debug statements',
    },
    {
        id: 'MISSING_AWAIT',
        name: 'missing-await-locator',
        regex: /(?<!await\s+)page\.(?:click|fill|type|check|uncheck|selectOption|press|hover|focus)\s*\(/g,
        severity: 'error',
        reason: 'Playwright actions must be awaited',
        suggestion: 'Add await before the action',
    },
    {
        id: 'SKIP_TEST',
        name: 'test-skip',
        regex: /\btest\.skip\s*\(/g,
        severity: 'info',
        reason: 'Skipped tests may be forgotten',
        suggestion: 'Remove skip or convert to fixme with issue link',
    },
    {
        id: 'TEST_ONLY',
        name: 'test-only',
        regex: /\btest\.only\s*\(/g,
        severity: 'error',
        reason: 'test.only excludes all other tests',
        suggestion: 'Remove .only before committing',
    },
    {
        id: 'ELEMENT_HANDLE',
        name: 'element-handle',
        regex: /\.\$\s*\(|\.\$\$\s*\(/g,
        severity: 'warning',
        reason: 'ElementHandle is deprecated, use locators instead',
        suggestion: 'Use page.locator() instead of page.$() or page.$$()',
    },
    {
        id: 'EVAL_SELECTOR',
        name: 'eval-selector',
        regex: /\.\$eval\s*\(|\.\$\$eval\s*\(/g,
        severity: 'warning',
        reason: 'eval methods are fragile and hard to debug',
        suggestion: 'Use locator methods like textContent(), getAttribute()',
    },
    {
        id: 'SLEEP_IMPORT',
        name: 'sleep-import',
        regex: /import\s*\{[^}]*sleep[^}]*\}|require\s*\(['"'][^'"]*sleep/gi,
        severity: 'warning',
        reason: 'Sleep utilities encourage flaky tests',
        suggestion: 'Use Playwright auto-wait mechanisms',
    },
];
/**
 * Scan code for forbidden patterns
 */
function scanForbiddenPatterns(code, patterns = exports.FORBIDDEN_PATTERNS) {
    const results = [];
    const lines = code.split('\n');
    for (const pattern of patterns) {
        // Reset regex state for global patterns
        pattern.regex.lastIndex = 0;
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let match;
            // Clone regex to avoid state issues with global flag
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            while ((match = regex.exec(line)) !== null) {
                results.push({
                    line: lineIndex + 1,
                    column: match.index + 1,
                    match: match[0],
                    lineContent: line.trim(),
                    pattern,
                });
                // Prevent infinite loop for zero-length matches
                if (match.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
            }
        }
    }
    // Sort by line number, then column
    results.sort((a, b) => a.line - b.line || a.column - b.column);
    return results;
}
/**
 * Convert scan results to validation issues
 */
function scanResultsToIssues(results) {
    return results.map((result) => ({
        code: result.pattern.id,
        message: `Line ${result.line}: ${result.pattern.name} - ${result.pattern.reason}`,
        severity: result.pattern.severity,
        suggestion: result.pattern.suggestion,
    }));
}
/**
 * Get pattern statistics
 */
function getPatternStats(results) {
    const stats = {};
    for (const result of results) {
        stats[result.pattern.id] = (stats[result.pattern.id] || 0) + 1;
    }
    return stats;
}
/**
 * Check if code has any error-level violations
 */
function hasErrorViolations(results) {
    return results.some((r) => r.pattern.severity === 'error');
}
/**
 * Filter results by severity
 */
function filterBySeverity(results, severity) {
    return results.filter((r) => r.pattern.severity === severity);
}
/**
 * Get a summary of violations by category
 */
function getViolationSummary(results) {
    return {
        total: results.length,
        errors: filterBySeverity(results, 'error').length,
        warnings: filterBySeverity(results, 'warning').length,
        info: filterBySeverity(results, 'info').length,
        byPattern: getPatternStats(results),
    };
}
//# sourceMappingURL=patterns.js.map