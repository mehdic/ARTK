/**
 * History Logging for LLKB
 *
 * Provides functions for logging LLKB events to history files.
 * History files are append-only JSONL (JSON Lines) format.
 *
 * @module llkb/history
 */
import type { HistoryEvent, LLKBConfig } from './types.js';
/**
 * Default LLKB root directory
 */
export declare const DEFAULT_LLKB_ROOT = ".artk/llkb";
/**
 * Get the history directory path
 *
 * @param llkbRoot - Root LLKB directory (default: .artk/llkb)
 * @returns Path to the history directory
 */
export declare function getHistoryDir(llkbRoot?: string): string;
/**
 * Get the history file path for a specific date
 *
 * @param date - The date for the history file
 * @param llkbRoot - Root LLKB directory
 * @returns Path to the history file (YYYY-MM-DD.jsonl)
 */
export declare function getHistoryFilePath(date?: Date, llkbRoot?: string): string;
/**
 * Format a date as YYYY-MM-DD
 *
 * @param date - The date to format
 * @returns Formatted date string
 */
export declare function formatDate(date: Date): string;
/**
 * Append an event to the history file
 *
 * Creates the history directory and file if they don't exist.
 * Uses graceful degradation - logs warning but doesn't throw on failure.
 *
 * @param event - The event to log
 * @param llkbRoot - Root LLKB directory
 * @returns true if successful, false otherwise
 *
 * @example
 * ```typescript
 * appendToHistory({
 *   event: 'lesson_applied',
 *   timestamp: new Date().toISOString(),
 *   lessonId: 'L001',
 *   success: true,
 *   prompt: 'journey-implement'
 * });
 * ```
 */
export declare function appendToHistory(event: HistoryEvent, llkbRoot?: string): boolean;
/**
 * Read events from a history file
 *
 * @param filePath - Path to the history file
 * @returns Array of events, or empty array if file doesn't exist
 */
export declare function readHistoryFile(filePath: string): HistoryEvent[];
/**
 * Read today's history events
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Array of today's events
 */
export declare function readTodayHistory(llkbRoot?: string): HistoryEvent[];
/**
 * Count events of a specific type from today's history
 *
 * @param eventType - The event type to count
 * @param filter - Optional additional filter function
 * @param llkbRoot - Root LLKB directory
 * @returns Count of matching events
 */
export declare function countTodayEvents(eventType: HistoryEvent['event'], filter?: (event: HistoryEvent) => boolean, llkbRoot?: string): number;
/**
 * Count predictive extractions for today
 *
 * Used for rate limiting in journey-implement.
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Number of predictive extractions today
 *
 * @example
 * ```typescript
 * const count = countPredictiveExtractionsToday();
 * if (count >= config.extraction.maxPredictivePerDay) {
 *   // Rate limit reached
 * }
 * ```
 */
export declare function countPredictiveExtractionsToday(llkbRoot?: string): number;
/**
 * Count predictive extractions for a specific journey today
 *
 * @param journeyId - The journey ID to check
 * @param llkbRoot - Root LLKB directory
 * @returns Number of extractions for this journey today
 */
export declare function countJourneyExtractionsToday(journeyId: string, llkbRoot?: string): number;
/**
 * Check if daily extraction rate limit is reached
 *
 * @param config - LLKB configuration
 * @param llkbRoot - Root LLKB directory
 * @returns true if rate limit is reached
 */
export declare function isDailyRateLimitReached(config: LLKBConfig, llkbRoot?: string): boolean;
/**
 * Check if journey extraction rate limit is reached
 *
 * @param journeyId - The journey ID to check
 * @param config - LLKB configuration
 * @param llkbRoot - Root LLKB directory
 * @returns true if rate limit is reached
 */
export declare function isJourneyRateLimitReached(journeyId: string, config: LLKBConfig, llkbRoot?: string): boolean;
/**
 * Get all history files in date range
 *
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @param llkbRoot - Root LLKB directory
 * @returns Array of history file paths
 */
export declare function getHistoryFilesInRange(startDate: Date, endDate: Date, llkbRoot?: string): string[];
/**
 * Clean up old history files
 *
 * Deletes history files older than the retention period.
 *
 * @param retentionDays - Number of days to retain (default: 365)
 * @param llkbRoot - Root LLKB directory
 * @returns Array of deleted file paths
 */
export declare function cleanupOldHistoryFiles(retentionDays?: number, llkbRoot?: string): string[];
//# sourceMappingURL=history.d.ts.map