/**
 * Verify Summary Generator - Generate structured JSON summary of test runs
 * @see T055 - Implement verify summary JSON generator
 */
import type { RunnerResult } from './runner.js';
import type { PlaywrightReport } from './parser.js';
import type { FailureClassification } from './classifier.js';
import type { StabilityResult } from './stability.js';
/**
 * Verification summary
 */
export interface VerifySummary {
    /** Overall verification status */
    status: 'passed' | 'failed' | 'flaky' | 'error';
    /** Journey ID if available */
    journeyId?: string;
    /** Timestamp */
    timestamp: string;
    /** Duration in ms */
    duration: number;
    /** Test counts */
    counts: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        flaky: number;
    };
    /** Failure analysis */
    failures: {
        tests: string[];
        classifications: Record<string, FailureClassification>;
        stats: Record<string, number>;
    };
    /** Stability information */
    stability?: {
        stable: boolean;
        flakyTests: string[];
        flakyRate: number;
    };
    /** Raw runner result */
    runner: {
        exitCode: number;
        command: string;
    };
    /** Path to detailed report */
    reportPath?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Options for generating summary
 */
export interface SummaryOptions {
    /** Journey ID to associate */
    journeyId?: string;
    /** Include stability results */
    stabilityResult?: StabilityResult;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Generate verification summary from runner result
 */
export declare function generateVerifySummary(runnerResult: RunnerResult, options?: SummaryOptions): VerifySummary;
/**
 * Generate summary from Playwright report directly
 */
export declare function generateSummaryFromReport(report: PlaywrightReport, options?: SummaryOptions): VerifySummary;
/**
 * Check if verification passed
 */
export declare function isVerificationPassed(summary: VerifySummary): boolean;
/**
 * Check if verification has failures
 */
export declare function hasFailures(summary: VerifySummary): boolean;
/**
 * Check if verification has flaky tests
 */
export declare function hasFlaky(summary: VerifySummary): boolean;
/**
 * Get actionable recommendations based on failures
 */
export declare function getRecommendations(summary: VerifySummary): string[];
/**
 * Generate human-readable summary
 */
export declare function formatVerifySummary(summary: VerifySummary): string;
/**
 * Save summary to JSON file
 */
export declare function saveSummary(summary: VerifySummary, outputPath: string): void;
//# sourceMappingURL=summary.d.ts.map