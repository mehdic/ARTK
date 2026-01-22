"use strict";
/**
 * Confidence Calculation for LLKB Lessons
 *
 * Provides functions to calculate and track lesson confidence scores.
 *
 * @module llkb/confidence
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIDENCE_HISTORY_RETENTION_DAYS = exports.MAX_CONFIDENCE_HISTORY_ENTRIES = void 0;
exports.calculateConfidence = calculateConfidence;
exports.detectDecliningConfidence = detectDecliningConfidence;
exports.updateConfidenceHistory = updateConfidenceHistory;
exports.getConfidenceTrend = getConfidenceTrend;
exports.daysBetween = daysBetween;
exports.needsConfidenceReview = needsConfidenceReview;
/**
 * Maximum entries to keep in confidence history
 * Prevents unbounded growth while preserving useful trend data
 */
exports.MAX_CONFIDENCE_HISTORY_ENTRIES = 100;
/**
 * Number of days to retain in confidence history
 */
exports.CONFIDENCE_HISTORY_RETENTION_DAYS = 90;
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
function calculateConfidence(lesson) {
    const metrics = lesson.metrics;
    // STEP 1: Calculate base score (occurrence-based)
    // More occurrences = higher base confidence
    // Caps at 1.0 after 10 occurrences
    const occurrences = metrics.occurrences;
    const baseScore = Math.min(occurrences / 10.0, 1.0);
    // STEP 2: Calculate recency factor (time decay)
    // Lessons not used recently lose confidence
    // Decays by 30% over 90 days, floors at 0.7
    let recencyFactor;
    if (metrics.lastSuccess) {
        const daysSinceLastSuccess = daysBetween(new Date(), new Date(metrics.lastSuccess));
        recencyFactor = Math.max(1.0 - (daysSinceLastSuccess / 90.0) * 0.3, 0.7);
    }
    else {
        // Never succeeded yet - use creation date
        const daysSinceCreation = daysBetween(new Date(), new Date(metrics.firstSeen));
        recencyFactor = Math.max(1.0 - (daysSinceCreation / 30.0) * 0.5, 0.5);
    }
    // STEP 3: Calculate success factor (effectiveness)
    // Square root dampens the impact of low success rates
    // e.g., 0.64 success rate → 0.8 factor
    const successRate = metrics.successRate;
    const successFactor = Math.sqrt(successRate);
    // STEP 4: Apply validation boost (human review)
    // Human-reviewed lessons get 20% confidence boost
    const validationBoost = lesson.validation.humanReviewed ? 1.2 : 1.0;
    // STEP 5: Calculate final confidence
    const rawConfidence = baseScore * recencyFactor * successFactor * validationBoost;
    // Clamp to valid range [0.0, 1.0]
    const confidence = Math.min(Math.max(rawConfidence, 0.0), 1.0);
    return Math.round(confidence * 100) / 100;
}
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
function detectDecliningConfidence(lesson) {
    const history = lesson.metrics.confidenceHistory;
    if (!history || history.length < 2) {
        return false; // Not enough data to detect trend
    }
    const currentConfidence = lesson.metrics.confidence;
    // Get last 30 entries (or all if fewer)
    const recentHistory = history.slice(-30);
    // Calculate historical average
    const sum = recentHistory.reduce((acc, entry) => acc + entry.value, 0);
    const historicalAverage = sum / recentHistory.length;
    // Check for 20% decline
    return currentConfidence < historicalAverage * 0.8;
}
/**
 * Update the confidence history for a lesson
 *
 * Adds the current confidence to the history and prunes old entries.
 *
 * @param lesson - The lesson to update
 * @returns Updated confidence history array
 */
function updateConfidenceHistory(lesson) {
    const history = lesson.metrics.confidenceHistory ?? [];
    const now = new Date();
    // Add current confidence to history
    const newEntry = {
        date: now.toISOString(),
        value: lesson.metrics.confidence,
    };
    history.push(newEntry);
    // Keep only entries within retention period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - exports.CONFIDENCE_HISTORY_RETENTION_DAYS);
    const filtered = history.filter((entry) => new Date(entry.date) >= cutoffDate);
    // Cap at MAX_CONFIDENCE_HISTORY_ENTRIES
    return filtered.slice(-exports.MAX_CONFIDENCE_HISTORY_ENTRIES);
}
/**
 * Get the confidence trend direction
 *
 * @param history - Confidence history entries
 * @returns 'increasing', 'decreasing', 'stable', or 'unknown'
 */
function getConfidenceTrend(history) {
    if (!history || history.length < 3) {
        return 'unknown';
    }
    // Compare first third average to last third average
    const third = Math.floor(history.length / 3);
    const firstThird = history.slice(0, third);
    const lastThird = history.slice(-third);
    const firstAvg = firstThird.reduce((acc, e) => acc + e.value, 0) / firstThird.length;
    const lastAvg = lastThird.reduce((acc, e) => acc + e.value, 0) / lastThird.length;
    const change = (lastAvg - firstAvg) / firstAvg;
    if (change > 0.1) {
        return 'increasing';
    }
    else if (change < -0.1) {
        return 'decreasing';
    }
    else {
        return 'stable';
    }
}
/**
 * Calculate the number of days between two dates
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days (can be fractional)
 */
function daysBetween(date1, date2) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.abs(date1.getTime() - date2.getTime()) / msPerDay;
}
/**
 * Check if a lesson should be flagged for review based on confidence
 *
 * @param lesson - The lesson to check
 * @param threshold - Low confidence threshold (default 0.4)
 * @returns true if lesson needs review
 */
function needsConfidenceReview(lesson, threshold = 0.4) {
    return lesson.metrics.confidence < threshold;
}
//# sourceMappingURL=confidence.js.map