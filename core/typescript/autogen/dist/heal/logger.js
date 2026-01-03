/**
 * Healing Attempt Logger - Track healing attempts in heal-log.json
 * @see T066 - Implement healing attempt logger (heal-log.json)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
/**
 * Healing logger class
 */
export class HealingLogger {
    log;
    outputPath;
    constructor(journeyId, outputDir, maxAttempts = 3) {
        this.outputPath = join(outputDir, `${journeyId}.heal-log.json`);
        this.log = {
            journeyId,
            sessionStart: new Date().toISOString(),
            maxAttempts,
            status: 'in_progress',
            attempts: [],
        };
    }
    /**
     * Log a healing attempt
     */
    logAttempt(attempt) {
        this.log.attempts.push({
            ...attempt,
            timestamp: new Date().toISOString(),
        });
        this.save();
    }
    /**
     * Mark healing as complete (success)
     */
    markHealed() {
        this.log.status = 'healed';
        this.log.sessionEnd = new Date().toISOString();
        this.calculateSummary();
        this.save();
    }
    /**
     * Mark healing as failed (gave up)
     */
    markFailed(recommendation) {
        this.log.status = 'failed';
        this.log.sessionEnd = new Date().toISOString();
        this.calculateSummary();
        if (recommendation && this.log.summary) {
            this.log.summary.recommendation = recommendation;
        }
        this.save();
    }
    /**
     * Mark healing as exhausted (all attempts used)
     */
    markExhausted(recommendation) {
        this.log.status = 'exhausted';
        this.log.sessionEnd = new Date().toISOString();
        this.calculateSummary();
        if (recommendation && this.log.summary) {
            this.log.summary.recommendation = recommendation;
        }
        this.save();
    }
    /**
     * Get current log
     */
    getLog() {
        return { ...this.log };
    }
    /**
     * Get last attempt
     */
    getLastAttempt() {
        return this.log.attempts[this.log.attempts.length - 1] || null;
    }
    /**
     * Get attempt count
     */
    getAttemptCount() {
        return this.log.attempts.length;
    }
    /**
     * Check if max attempts reached
     */
    isMaxAttemptsReached() {
        return this.log.attempts.length >= this.log.maxAttempts;
    }
    /**
     * Calculate summary statistics
     */
    calculateSummary() {
        const attempts = this.log.attempts;
        this.log.summary = {
            totalAttempts: attempts.length,
            successfulFixes: attempts.filter((a) => a.result === 'pass').length,
            failedAttempts: attempts.filter((a) => a.result === 'fail' || a.result === 'error').length,
            totalDuration: attempts.reduce((sum, a) => sum + a.duration, 0),
            fixTypesAttempted: [...new Set(attempts.map((a) => a.fixType))],
        };
    }
    /**
     * Save log to file
     */
    save() {
        const dir = dirname(this.outputPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(this.outputPath, JSON.stringify(this.log, null, 2), 'utf-8');
    }
    /**
     * Get output path
     */
    getOutputPath() {
        return this.outputPath;
    }
}
/**
 * Load existing healing log
 */
export function loadHealingLog(filePath) {
    if (!existsSync(filePath)) {
        return null;
    }
    try {
        const content = readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
/**
 * Format healing log for display
 */
export function formatHealingLog(log) {
    const lines = [];
    // Header
    lines.push(`# Healing Log: ${log.journeyId}`);
    lines.push('');
    lines.push(`Status: ${log.status.toUpperCase()}`);
    lines.push(`Started: ${log.sessionStart}`);
    if (log.sessionEnd) {
        lines.push(`Ended: ${log.sessionEnd}`);
    }
    lines.push('');
    // Attempts
    lines.push('## Attempts');
    lines.push('');
    for (const attempt of log.attempts) {
        const icon = attempt.result === 'pass' ? '✅' : '❌';
        lines.push(`### Attempt ${attempt.attempt} ${icon}`);
        lines.push('');
        lines.push(`- **Fix Type**: ${attempt.fixType}`);
        lines.push(`- **Failure Type**: ${attempt.failureType}`);
        lines.push(`- **File**: ${attempt.file}`);
        lines.push(`- **Duration**: ${attempt.duration}ms`);
        lines.push(`- **Result**: ${attempt.result}`);
        if (attempt.errorMessage) {
            lines.push(`- **Error**: ${attempt.errorMessage}`);
        }
        if (attempt.change) {
            lines.push(`- **Change**: ${attempt.change}`);
        }
        if (attempt.evidence.length > 0) {
            lines.push(`- **Evidence**: ${attempt.evidence.join(', ')}`);
        }
        lines.push('');
    }
    // Summary
    if (log.summary) {
        lines.push('## Summary');
        lines.push('');
        lines.push(`- Total Attempts: ${log.summary.totalAttempts}`);
        lines.push(`- Successful Fixes: ${log.summary.successfulFixes}`);
        lines.push(`- Failed Attempts: ${log.summary.failedAttempts}`);
        lines.push(`- Total Duration: ${log.summary.totalDuration}ms`);
        lines.push(`- Fix Types Tried: ${log.summary.fixTypesAttempted.join(', ')}`);
        if (log.summary.recommendation) {
            lines.push('');
            lines.push(`**Recommendation**: ${log.summary.recommendation}`);
        }
    }
    return lines.join('\n');
}
/**
 * Create healing report summary
 */
export function createHealingReport(log) {
    const lastSuccessfulAttempt = log.attempts.find((a) => a.result === 'pass');
    return {
        success: log.status === 'healed',
        attemptCount: log.attempts.length,
        fixApplied: lastSuccessfulAttempt?.fixType,
        recommendation: log.summary?.recommendation,
    };
}
/**
 * Aggregate healing logs from multiple journeys
 */
export function aggregateHealingLogs(logs) {
    const fixCounts = new Map();
    const failureCounts = new Map();
    let totalAttempts = 0;
    for (const log of logs) {
        for (const attempt of log.attempts) {
            totalAttempts++;
            fixCounts.set(attempt.fixType, (fixCounts.get(attempt.fixType) || 0) + 1);
            failureCounts.set(attempt.failureType, (failureCounts.get(attempt.failureType) || 0) + 1);
        }
    }
    const mostCommonFixes = [...fixCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([fix, count]) => ({ fix, count }));
    const mostCommonFailures = [...failureCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([failure, count]) => ({ failure, count }));
    return {
        totalJourneys: logs.length,
        healed: logs.filter((l) => l.status === 'healed').length,
        failed: logs.filter((l) => l.status === 'failed').length,
        exhausted: logs.filter((l) => l.status === 'exhausted').length,
        totalAttempts,
        mostCommonFixes,
        mostCommonFailures,
    };
}
//# sourceMappingURL=logger.js.map