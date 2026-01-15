/**
 * Failure Classifier - Categorize test failures for actionable remediation
 * @see T052 - Implement failure classifier (selector, timing, navigation, data, auth, env)
 */
import type { TestResult, TestError } from './parser.js';
/**
 * Failure category
 */
export type FailureCategory = 'selector' | 'timing' | 'navigation' | 'data' | 'auth' | 'env' | 'script' | 'unknown';
/**
 * Failure classification result
 */
export interface FailureClassification {
    /** Primary category */
    category: FailureCategory;
    /** Confidence level (0-1) */
    confidence: number;
    /** Human-readable explanation */
    explanation: string;
    /** Suggested fix */
    suggestion: string;
    /** Whether this is likely a test issue vs app issue */
    isTestIssue: boolean;
    /** Keywords that triggered classification */
    matchedKeywords: string[];
}
/**
 * Classify a single error message
 */
export declare function classifyError(error: TestError): FailureClassification;
/**
 * Classify a test result
 */
export declare function classifyTestResult(result: TestResult): FailureClassification;
/**
 * Classify multiple test results
 */
export declare function classifyTestResults(results: TestResult[]): Map<string, FailureClassification>;
/**
 * Get failure statistics by category
 */
export declare function getFailureStats(classifications: Map<string, FailureClassification>): Record<FailureCategory, number>;
/**
 * Check if failures are likely healable
 */
export declare function isHealable(classification: FailureClassification): boolean;
/**
 * Get healable failures
 */
export declare function getHealableFailures(classifications: Map<string, FailureClassification>): Map<string, FailureClassification>;
/**
 * Generate classification report
 */
export declare function generateClassificationReport(classifications: Map<string, FailureClassification>): string;
//# sourceMappingURL=classifier.d.ts.map