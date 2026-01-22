import type { HealFixType } from './rules.js';
import type { FailureCategory } from '../verify/classifier.js';
/**
 * Single healing attempt record
 */
export interface HealingAttempt {
    /** Attempt number (1-based) */
    attempt: number;
    /** Timestamp of the attempt */
    timestamp: string;
    /** Type of failure being healed */
    failureType: FailureCategory;
    /** Fix type applied */
    fixType: HealFixType;
    /** File that was modified */
    file: string;
    /** Diff or description of the change */
    change: string;
    /** Evidence files (traces, screenshots) */
    evidence: string[];
    /** Result of the attempt */
    result: 'pass' | 'fail' | 'error';
    /** Error message if failed */
    errorMessage?: string;
    /** Duration in ms */
    duration: number;
}
/**
 * Complete healing log for a journey
 */
export interface HealingLog {
    /** Journey ID */
    journeyId: string;
    /** Session start time */
    sessionStart: string;
    /** Session end time */
    sessionEnd?: string;
    /** Maximum attempts allowed */
    maxAttempts: number;
    /** Final status */
    status: 'in_progress' | 'healed' | 'failed' | 'exhausted';
    /** All healing attempts */
    attempts: HealingAttempt[];
    /** Summary statistics */
    summary?: HealingSummary;
}
/**
 * Summary statistics
 */
export interface HealingSummary {
    /** Total attempts made */
    totalAttempts: number;
    /** Successful fixes */
    successfulFixes: number;
    /** Failed attempts */
    failedAttempts: number;
    /** Total healing duration in ms */
    totalDuration: number;
    /** Fix types attempted */
    fixTypesAttempted: HealFixType[];
    /** Final recommendation if not healed */
    recommendation?: string;
}
/**
 * Healing logger class
 */
export declare class HealingLogger {
    private log;
    private outputPath;
    constructor(journeyId: string, outputDir: string, maxAttempts?: number);
    /**
     * Log a healing attempt
     */
    logAttempt(attempt: Omit<HealingAttempt, 'timestamp'>): void;
    /**
     * Mark healing as complete (success)
     */
    markHealed(): void;
    /**
     * Mark healing as failed (gave up)
     */
    markFailed(recommendation?: string): void;
    /**
     * Mark healing as exhausted (all attempts used)
     */
    markExhausted(recommendation?: string): void;
    /**
     * Get current log
     */
    getLog(): HealingLog;
    /**
     * Get last attempt
     */
    getLastAttempt(): HealingAttempt | null;
    /**
     * Get attempt count
     */
    getAttemptCount(): number;
    /**
     * Check if max attempts reached
     */
    isMaxAttemptsReached(): boolean;
    /**
     * Calculate summary statistics
     */
    private calculateSummary;
    /**
     * Save log to file
     */
    private save;
    /**
     * Get output path
     */
    getOutputPath(): string;
}
/**
 * Load existing healing log
 */
export declare function loadHealingLog(filePath: string): HealingLog | null;
/**
 * Format healing log for display
 */
export declare function formatHealingLog(log: HealingLog): string;
/**
 * Create healing report summary
 */
export declare function createHealingReport(log: HealingLog): {
    success: boolean;
    attemptCount: number;
    fixApplied?: HealFixType;
    recommendation?: string;
};
/**
 * Aggregate healing logs from multiple journeys
 */
export declare function aggregateHealingLogs(logs: HealingLog[]): {
    totalJourneys: number;
    healed: number;
    failed: number;
    exhausted: number;
    totalAttempts: number;
    mostCommonFixes: Array<{
        fix: HealFixType;
        count: number;
    }>;
    mostCommonFailures: Array<{
        failure: FailureCategory;
        count: number;
    }>;
};
//# sourceMappingURL=logger.d.ts.map