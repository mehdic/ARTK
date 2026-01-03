/**
 * Healing Attempt Logger - Track healing attempts in heal-log.json
 * @see T066 - Implement healing attempt logger (heal-log.json)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
export class HealingLogger {
  private log: HealingLog;
  private outputPath: string;

  constructor(journeyId: string, outputDir: string, maxAttempts: number = 3) {
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
  logAttempt(attempt: Omit<HealingAttempt, 'timestamp'>): void {
    this.log.attempts.push({
      ...attempt,
      timestamp: new Date().toISOString(),
    });
    this.save();
  }

  /**
   * Mark healing as complete (success)
   */
  markHealed(): void {
    this.log.status = 'healed';
    this.log.sessionEnd = new Date().toISOString();
    this.calculateSummary();
    this.save();
  }

  /**
   * Mark healing as failed (gave up)
   */
  markFailed(recommendation?: string): void {
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
  markExhausted(recommendation?: string): void {
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
  getLog(): HealingLog {
    return { ...this.log };
  }

  /**
   * Get last attempt
   */
  getLastAttempt(): HealingAttempt | null {
    return this.log.attempts[this.log.attempts.length - 1] || null;
  }

  /**
   * Get attempt count
   */
  getAttemptCount(): number {
    return this.log.attempts.length;
  }

  /**
   * Check if max attempts reached
   */
  isMaxAttemptsReached(): boolean {
    return this.log.attempts.length >= this.log.maxAttempts;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(): void {
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
  private save(): void {
    const dir = dirname(this.outputPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.outputPath, JSON.stringify(this.log, null, 2), 'utf-8');
  }

  /**
   * Get output path
   */
  getOutputPath(): string {
    return this.outputPath;
  }
}

/**
 * Load existing healing log
 */
export function loadHealingLog(filePath: string): HealingLog | null {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as HealingLog;
  } catch {
    return null;
  }
}

/**
 * Format healing log for display
 */
export function formatHealingLog(log: HealingLog): string {
  const lines: string[] = [];

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
export function createHealingReport(log: HealingLog): {
  success: boolean;
  attemptCount: number;
  fixApplied?: HealFixType;
  recommendation?: string;
} {
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
export function aggregateHealingLogs(logs: HealingLog[]): {
  totalJourneys: number;
  healed: number;
  failed: number;
  exhausted: number;
  totalAttempts: number;
  mostCommonFixes: Array<{ fix: HealFixType; count: number }>;
  mostCommonFailures: Array<{ failure: FailureCategory; count: number }>;
} {
  const fixCounts = new Map<HealFixType, number>();
  const failureCounts = new Map<FailureCategory, number>();
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
