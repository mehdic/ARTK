/**
 * Confidence Calculation for LLKB Lessons
 *
 * Provides functions to calculate and track lesson confidence scores.
 *
 * @module llkb/confidence
 */
import type { Lesson, ConfidenceHistoryEntry } from './types.js';
/**
 * Maximum entries to keep in confidence history
 * Prevents unbounded growth while preserving useful trend data
 */
export declare const MAX_CONFIDENCE_HISTORY_ENTRIES = 100;
/**
 * Number of days to retain in confidence history
 */
export declare const CONFIDENCE_HISTORY_RETENTION_DAYS = 90;
/**
 * Calculate the confidence score for a lesson
 *
 * The confidence formula combines:
 * - Base score from occurrence count (more uses = higher confidence)
 * - Recency factor (recent success = higher confidence)
 * - Success factor (higher success rate = higher confidence)
 * - Validation boost (human-reviewed lessons get a boost)
 *
 * @param lesson - The lesson to calculate confidence for
 * @returns Confidence score between 0.0 and 1.0
 *
 * @example
 * ```typescript
 * const confidence = calculateConfidence(lesson);
 * if (confidence >= 0.7) {
 *   // Auto-apply this lesson
 * }
 * ```
 */
export declare function calculateConfidence(lesson: Lesson): number;
/**
 * Detect if a lesson has declining confidence
 *
 * Compares current confidence to the 30-day rolling average.
 * A decline of 20% or more triggers this detection.
 *
 * @param lesson - The lesson to check
 * @returns true if confidence is declining significantly
 *
 * @example
 * ```typescript
 * if (detectDecliningConfidence(lesson)) {
 *   // Flag for review
 *   analytics.needsReview.decliningSuccessRate.push(lesson.id);
 * }
 * ```
 */
export declare function detectDecliningConfidence(lesson: Lesson): boolean;
/**
 * Update the confidence history for a lesson
 *
 * Adds the current confidence to the history and prunes old entries.
 *
 * @param lesson - The lesson to update
 * @returns Updated confidence history array
 */
export declare function updateConfidenceHistory(lesson: Lesson): ConfidenceHistoryEntry[];
/**
 * Get the confidence trend direction
 *
 * @param history - Confidence history entries
 * @returns 'increasing', 'decreasing', 'stable', or 'unknown'
 */
export declare function getConfidenceTrend(history: ConfidenceHistoryEntry[]): 'increasing' | 'decreasing' | 'stable' | 'unknown';
/**
 * Calculate the number of days between two dates
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days (can be fractional)
 */
export declare function daysBetween(date1: Date, date2: Date): number;
/**
 * Check if a lesson should be flagged for review based on confidence
 *
 * @param lesson - The lesson to check
 * @param threshold - Low confidence threshold (default 0.4)
 * @returns true if lesson needs review
 */
export declare function needsConfidenceReview(lesson: Lesson, threshold?: number): boolean;
//# sourceMappingURL=confidence.d.ts.map