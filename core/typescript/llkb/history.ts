/**
 * History Logging for LLKB
 *
 * Provides functions for logging LLKB events to history files.
 * History files are append-only JSONL (JSON Lines) format.
 *
 * @module llkb/history
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HistoryEvent, LLKBConfig } from './types.js';
import { ensureDir } from './file-utils.js';

/**
 * Default LLKB root directory
 */
export const DEFAULT_LLKB_ROOT = '.artk/llkb';

/**
 * Get the history directory path
 *
 * @param llkbRoot - Root LLKB directory (default: .artk/llkb)
 * @returns Path to the history directory
 */
export function getHistoryDir(llkbRoot: string = DEFAULT_LLKB_ROOT): string {
  return path.join(llkbRoot, 'history');
}

/**
 * Get the history file path for a specific date
 *
 * @param date - The date for the history file
 * @param llkbRoot - Root LLKB directory
 * @returns Path to the history file (YYYY-MM-DD.jsonl)
 */
export function getHistoryFilePath(
  date: Date = new Date(),
  llkbRoot: string = DEFAULT_LLKB_ROOT
): string {
  const dateStr = formatDate(date);
  return path.join(getHistoryDir(llkbRoot), `${dateStr}.jsonl`);
}

/**
 * Format a date as YYYY-MM-DD
 *
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
export function appendToHistory(
  event: HistoryEvent,
  llkbRoot: string = DEFAULT_LLKB_ROOT
): boolean {
  try {
    const historyDir = getHistoryDir(llkbRoot);
    ensureDir(historyDir);

    const filePath = getHistoryFilePath(new Date(), llkbRoot);
    const line = JSON.stringify(event) + '\n';

    fs.appendFileSync(filePath, line, 'utf-8');
    return true;
  } catch (error) {
    // Graceful degradation - log warning but don't crash
    console.warn(
      `[LLKB] Failed to append to history: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

/**
 * Read events from a history file
 *
 * @param filePath - Path to the history file
 * @returns Array of events, or empty array if file doesn't exist
 */
export function readHistoryFile(filePath: string): HistoryEvent[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim().length > 0);

  return lines.map((line) => JSON.parse(line) as HistoryEvent);
}

/**
 * Read today's history events
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Array of today's events
 */
export function readTodayHistory(llkbRoot: string = DEFAULT_LLKB_ROOT): HistoryEvent[] {
  const filePath = getHistoryFilePath(new Date(), llkbRoot);
  return readHistoryFile(filePath);
}

/**
 * Count events of a specific type from today's history
 *
 * @param eventType - The event type to count
 * @param filter - Optional additional filter function
 * @param llkbRoot - Root LLKB directory
 * @returns Count of matching events
 */
export function countTodayEvents(
  eventType: HistoryEvent['event'],
  filter?: (event: HistoryEvent) => boolean,
  llkbRoot: string = DEFAULT_LLKB_ROOT
): number {
  const events = readTodayHistory(llkbRoot);

  return events.filter((e) => {
    if (e.event !== eventType) {
      return false;
    }
    return filter ? filter(e) : true;
  }).length;
}

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
export function countPredictiveExtractionsToday(
  llkbRoot: string = DEFAULT_LLKB_ROOT
): number {
  return countTodayEvents(
    'component_extracted',
    (e) => e.event === 'component_extracted' && e.prompt === 'journey-implement',
    llkbRoot
  );
}

/**
 * Count predictive extractions for a specific journey today
 *
 * @param journeyId - The journey ID to check
 * @param llkbRoot - Root LLKB directory
 * @returns Number of extractions for this journey today
 */
export function countJourneyExtractionsToday(
  journeyId: string,
  llkbRoot: string = DEFAULT_LLKB_ROOT
): number {
  return countTodayEvents(
    'component_extracted',
    (e) =>
      e.event === 'component_extracted' &&
      e.prompt === 'journey-implement' &&
      e.journeyId === journeyId,
    llkbRoot
  );
}

/**
 * Check if daily extraction rate limit is reached
 *
 * @param config - LLKB configuration
 * @param llkbRoot - Root LLKB directory
 * @returns true if rate limit is reached
 */
export function isDailyRateLimitReached(
  config: LLKBConfig,
  llkbRoot: string = DEFAULT_LLKB_ROOT
): boolean {
  const count = countPredictiveExtractionsToday(llkbRoot);
  return count >= config.extraction.maxPredictivePerDay;
}

/**
 * Check if journey extraction rate limit is reached
 *
 * @param journeyId - The journey ID to check
 * @param config - LLKB configuration
 * @param llkbRoot - Root LLKB directory
 * @returns true if rate limit is reached
 */
export function isJourneyRateLimitReached(
  journeyId: string,
  config: LLKBConfig,
  llkbRoot: string = DEFAULT_LLKB_ROOT
): boolean {
  const count = countJourneyExtractionsToday(journeyId, llkbRoot);
  return count >= config.extraction.maxPredictivePerJourney;
}

/**
 * Get all history files in date range
 *
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @param llkbRoot - Root LLKB directory
 * @returns Array of history file paths
 */
export function getHistoryFilesInRange(
  startDate: Date,
  endDate: Date,
  llkbRoot: string = DEFAULT_LLKB_ROOT
): string[] {
  const historyDir = getHistoryDir(llkbRoot);

  if (!fs.existsSync(historyDir)) {
    return [];
  }

  const files = fs.readdirSync(historyDir).filter((f) => f.endsWith('.jsonl'));
  const results: string[] = [];

  for (const file of files) {
    const match = file.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (match?.[1]) {
      const fileDate = new Date(match[1]);
      if (fileDate >= startDate && fileDate <= endDate) {
        results.push(path.join(historyDir, file));
      }
    }
  }

  return results.sort();
}

/**
 * Clean up old history files
 *
 * Deletes history files older than the retention period.
 *
 * @param retentionDays - Number of days to retain (default: 365)
 * @param llkbRoot - Root LLKB directory
 * @returns Array of deleted file paths
 */
export function cleanupOldHistoryFiles(
  retentionDays: number = 365,
  llkbRoot: string = DEFAULT_LLKB_ROOT
): string[] {
  const historyDir = getHistoryDir(llkbRoot);

  if (!fs.existsSync(historyDir)) {
    return [];
  }

  const files = fs.readdirSync(historyDir).filter((f) => f.endsWith('.jsonl'));
  const now = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(now.getDate() - retentionDays);

  const deleted: string[] = [];

  for (const file of files) {
    const match = file.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (match?.[1]) {
      const fileDate = new Date(match[1]);
      if (fileDate < cutoffDate) {
        const filePath = path.join(historyDir, file);
        fs.unlinkSync(filePath);
        deleted.push(filePath);
      }
    }
  }

  return deleted;
}
