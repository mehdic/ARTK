"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyError = classifyError;
exports.classifyTestResult = classifyTestResult;
exports.classifyTestResults = classifyTestResults;
exports.getFailureStats = getFailureStats;
exports.isHealable = isHealable;
exports.getHealableFailures = getHealableFailures;
exports.generateClassificationReport = generateClassificationReport;
/**
 * Patterns for classifying failures
 */
const CLASSIFICATION_PATTERNS = [
    // Selector issues
    {
        category: 'selector',
        keywords: [
            /locator\s+resolved\s+to\s+\d+\s+elements/i,
            /locator\.click:\s+Error/i,
            /waiting\s+for\s+locator/i,
            /element\s+is\s+not\s+visible/i,
            /element\s+is\s+not\s+attached/i,
            /element\s+is\s+not\s+enabled/i,
            /getBy\w+\s*\([^)]+\)/i,
            /strict\s+mode\s+violation/i,
            /No\s+element\s+matches\s+selector/i,
            /Target\s+closed/i,
            /element\s+is\s+outside\s+of\s+the\s+viewport/i,
        ],
        explanation: 'Element locator failed to find or interact with element',
        suggestion: 'Update selector to use more stable locator strategy (role, label, testid)',
        isTestIssue: true,
    },
    // Timing issues
    {
        category: 'timing',
        keywords: [
            /timeout\s+\d+ms\s+exceeded/i,
            /exceeded\s+while\s+waiting/i,
            /timed?\s*out/i,
            /waiting\s+for\s+navigation/i,
            /waiting\s+for\s+load\s+state/i,
            /response\s+took\s+too\s+long/i,
            /expect\.\w+:\s+Timeout/i,
            /navigation\s+was\s+interrupted/i,
        ],
        explanation: 'Operation timed out waiting for element or network',
        suggestion: 'Increase timeout or add explicit wait for expected state',
        isTestIssue: true,
    },
    // Navigation issues
    {
        category: 'navigation',
        keywords: [
            /expected\s+url.*to.*match/i,
            /expected.*toHaveURL/i,
            /page\s+has\s+been\s+closed/i,
            /navigation\s+failed/i,
            /net::ERR_/i,
            /ERR_CONNECTION/i,
            /ERR_NAME_NOT_RESOLVED/i,
            /redirect/i,
            /page\.goto:\s+Error/i,
            /URL\s+is\s+not\s+valid/i,
        ],
        explanation: 'Navigation to URL failed or URL mismatch',
        suggestion: 'Check URL configuration and network connectivity',
        isTestIssue: false,
    },
    // Data/assertion issues
    {
        category: 'data',
        keywords: [
            /expected.*to\s+(?:be|equal|match|contain|have)/i,
            /received.*but\s+expected/i,
            /toEqual/i,
            /toBe\(/i,
            /toContain/i,
            /toHaveText/i,
            /toHaveValue/i,
            /assertion\s+failed/i,
            /expected\s+value/i,
            /does\s+not\s+match/i,
        ],
        explanation: 'Assertion failed due to unexpected data',
        suggestion: 'Verify test data matches expected application state',
        isTestIssue: false,
    },
    // Auth issues
    {
        category: 'auth',
        keywords: [
            /401\s+Unauthorized/i,
            /403\s+Forbidden/i,
            /authentication\s+failed/i,
            /login\s+failed/i,
            /session\s+expired/i,
            /token\s+invalid/i,
            /access\s+denied/i,
            /not\s+authenticated/i,
            /sign\s*in\s+required/i,
            /invalid\s+credentials/i,
        ],
        explanation: 'Authentication or authorization failed',
        suggestion: 'Check authentication state and credentials',
        isTestIssue: false,
    },
    // Environment issues
    {
        category: 'env',
        keywords: [
            /ECONNREFUSED/i,
            /ENOTFOUND/i,
            /ETIMEDOUT/i,
            /connection\s+refused/i,
            /network\s+error/i,
            /502\s+Bad\s+Gateway/i,
            /503\s+Service\s+Unavailable/i,
            /504\s+Gateway\s+Timeout/i,
            /server\s+error/i,
            /browser\s+has\s+been\s+closed/i,
            /browser\s+crash/i,
            /context\s+closed/i,
        ],
        explanation: 'Environment or infrastructure issue',
        suggestion: 'Check application availability and environment configuration',
        isTestIssue: false,
    },
    // Script errors
    {
        category: 'script',
        keywords: [
            /SyntaxError/i,
            /TypeError/i,
            /ReferenceError/i,
            /undefined\s+is\s+not/i,
            /is\s+not\s+a\s+function/i,
            /Cannot\s+read\s+propert/i,
            /null\s+is\s+not/i,
            /is\s+not\s+defined/i,
            /Unexpected\s+token/i,
        ],
        explanation: 'Test script has a code error',
        suggestion: 'Fix the JavaScript/TypeScript error in the test',
        isTestIssue: true,
    },
];
/**
 * Classify a single error message
 */
function classifyError(error) {
    const errorText = `${error.message} ${error.stack || ''}`;
    const matchedKeywords = [];
    let bestMatch = null;
    let maxMatches = 0;
    for (const pattern of CLASSIFICATION_PATTERNS) {
        let matches = 0;
        const patternMatches = [];
        for (const keyword of pattern.keywords) {
            if (keyword.test(errorText)) {
                matches++;
                patternMatches.push(keyword.source);
            }
        }
        if (matches > maxMatches) {
            maxMatches = matches;
            bestMatch = pattern;
            matchedKeywords.length = 0;
            matchedKeywords.push(...patternMatches);
        }
    }
    if (bestMatch && maxMatches > 0) {
        return {
            category: bestMatch.category,
            confidence: Math.min(maxMatches / 3, 1), // Normalize to 0-1
            explanation: bestMatch.explanation,
            suggestion: bestMatch.suggestion,
            isTestIssue: bestMatch.isTestIssue,
            matchedKeywords,
        };
    }
    return {
        category: 'unknown',
        confidence: 0,
        explanation: 'Unable to classify failure',
        suggestion: 'Review error details manually',
        isTestIssue: false,
        matchedKeywords: [],
    };
}
/**
 * Classify a test result
 */
function classifyTestResult(result) {
    if (result.status !== 'failed' || result.errors.length === 0) {
        return {
            category: 'unknown',
            confidence: 0,
            explanation: 'Test did not fail or has no errors',
            suggestion: 'N/A',
            isTestIssue: false,
            matchedKeywords: [],
        };
    }
    // Classify each error and aggregate
    const classifications = result.errors.map(classifyError);
    // Find the most confident classification
    const best = classifications.reduce((prev, curr) => curr.confidence > prev.confidence ? curr : prev);
    return best;
}
/**
 * Classify multiple test results
 */
function classifyTestResults(results) {
    const classified = new Map();
    for (const result of results) {
        if (result.status === 'failed') {
            const key = result.titlePath.join(' > ');
            classified.set(key, classifyTestResult(result));
        }
    }
    return classified;
}
/**
 * Get failure statistics by category
 */
function getFailureStats(classifications) {
    const stats = {
        selector: 0,
        timing: 0,
        navigation: 0,
        data: 0,
        auth: 0,
        env: 0,
        script: 0,
        unknown: 0,
    };
    for (const classification of classifications.values()) {
        stats[classification.category]++;
    }
    return stats;
}
/**
 * Check if failures are likely healable
 */
function isHealable(classification) {
    // Selector and timing issues are typically healable
    return (classification.category === 'selector' ||
        classification.category === 'timing');
}
/**
 * Get healable failures
 */
function getHealableFailures(classifications) {
    const healable = new Map();
    for (const [key, classification] of classifications.entries()) {
        if (isHealable(classification)) {
            healable.set(key, classification);
        }
    }
    return healable;
}
/**
 * Generate classification report
 */
function generateClassificationReport(classifications) {
    const lines = [];
    const stats = getFailureStats(classifications);
    lines.push('# Failure Classification Report');
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    for (const [category, count] of Object.entries(stats)) {
        if (count > 0) {
            lines.push(`- ${category}: ${count}`);
        }
    }
    lines.push('');
    lines.push('## Detailed Classifications');
    lines.push('');
    for (const [testName, classification] of classifications.entries()) {
        lines.push(`### ${testName}`);
        lines.push('');
        lines.push(`- **Category**: ${classification.category}`);
        lines.push(`- **Confidence**: ${Math.round(classification.confidence * 100)}%`);
        lines.push(`- **Explanation**: ${classification.explanation}`);
        lines.push(`- **Suggestion**: ${classification.suggestion}`);
        lines.push(`- **Is Test Issue**: ${classification.isTestIssue ? 'Yes' : 'No'}`);
        lines.push('');
    }
    return lines.join('\n');
}
//# sourceMappingURL=classifier.js.map