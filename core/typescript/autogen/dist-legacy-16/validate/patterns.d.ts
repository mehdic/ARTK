/**
 * Forbidden Pattern Scanner - Detect anti-patterns in generated test code
 * @see T040 - Forbidden pattern scanner (waitForTimeout, force:true, etc.)
 */
import type { ValidationIssue, ValidationSeverity } from './journey.js';
/**
 * A forbidden pattern definition
 */
export interface ForbiddenPattern {
    /** Unique identifier */
    id: string;
    /** Pattern name */
    name: string;
    /** Regex to match the pattern */
    regex: RegExp;
    /** Severity of the issue */
    severity: ValidationSeverity;
    /** Why this pattern is forbidden */
    reason: string;
    /** Suggested alternative */
    suggestion: string;
    /** Whether to allow in specific contexts (e.g., setup/cleanup) */
    allowedContexts?: string[];
}
/**
 * Result of pattern scanning
 */
export interface PatternScanResult {
    /** Line number (1-based) */
    line: number;
    /** Column number (1-based) */
    column: number;
    /** The matched text */
    match: string;
    /** The full line content */
    lineContent: string;
    /** The pattern that was violated */
    pattern: ForbiddenPattern;
}
/**
 * Forbidden patterns that indicate flaky or brittle tests
 */
export declare const FORBIDDEN_PATTERNS: ForbiddenPattern[];
/**
 * Scan code for forbidden patterns
 */
export declare function scanForbiddenPatterns(code: string, patterns?: ForbiddenPattern[]): PatternScanResult[];
/**
 * Convert scan results to validation issues
 */
export declare function scanResultsToIssues(results: PatternScanResult[]): ValidationIssue[];
/**
 * Get pattern statistics
 */
export declare function getPatternStats(results: PatternScanResult[]): Record<string, number>;
/**
 * Check if code has any error-level violations
 */
export declare function hasErrorViolations(results: PatternScanResult[]): boolean;
/**
 * Filter results by severity
 */
export declare function filterBySeverity(results: PatternScanResult[], severity: ValidationSeverity): PatternScanResult[];
/**
 * Get a summary of violations by category
 */
export declare function getViolationSummary(results: PatternScanResult[]): {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    byPattern: Record<string, number>;
};
//# sourceMappingURL=patterns.d.ts.map