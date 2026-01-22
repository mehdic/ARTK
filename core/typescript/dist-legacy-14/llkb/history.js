"use strict";
/**
 * History Logging for LLKB
 *
 * Provides functions for logging LLKB events to history files.
 * History files are append-only JSONL (JSON Lines) format.
 *
 * @module llkb/history
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LLKB_ROOT = void 0;
exports.getHistoryDir = getHistoryDir;
exports.getHistoryFilePath = getHistoryFilePath;
exports.formatDate = formatDate;
exports.appendToHistory = appendToHistory;
exports.readHistoryFile = readHistoryFile;
exports.readTodayHistory = readTodayHistory;
exports.countTodayEvents = countTodayEvents;
exports.countPredictiveExtractionsToday = countPredictiveExtractionsToday;
exports.countJourneyExtractionsToday = countJourneyExtractionsToday;
exports.isDailyRateLimitReached = isDailyRateLimitReached;
exports.isJourneyRateLimitReached = isJourneyRateLimitReached;
exports.getHistoryFilesInRange = getHistoryFilesInRange;
exports.cleanupOldHistoryFiles = cleanupOldHistoryFiles;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const file_utils_js_1 = require("./file-utils.js");
/**
 * Default LLKB root directory
 */
exports.DEFAULT_LLKB_ROOT = '.artk/llkb';
/**
 * Get the history directory path
 *
 * @param llkbRoot - Root LLKB directory (default: .artk/llkb)
 * @returns Path to the history directory
 */
function getHistoryDir(llkbRoot = exports.DEFAULT_LLKB_ROOT) {
    return path.join(llkbRoot, 'history');
}
/**
 * Get the history file path for a specific date
 *
 * @param date - The date for the history file
 * @param llkbRoot - Root LLKB directory
 * @returns Path to the history file (YYYY-MM-DD.jsonl)
 */
function getHistoryFilePath(date = new Date(), llkbRoot = exports.DEFAULT_LLKB_ROOT) {
    const dateStr = formatDate(date);
    return path.join(getHistoryDir(llkbRoot), `${dateStr}.jsonl`);
}
/**
 * Format a date as YYYY-MM-DD
 *
 * @param date - The date to format
 * @returns Formatted date string
 */
function formatDate(date) {
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
function appendToHistory(event, llkbRoot = exports.DEFAULT_LLKB_ROOT) {
    try {
        const historyDir = getHistoryDir(llkbRoot);
        (0, file_utils_js_1.ensureDir)(historyDir);
        const filePath = getHistoryFilePath(new Date(), llkbRoot);
        const line = JSON.stringify(event) + '\n';
        fs.appendFileSync(filePath, line, 'utf-8');
        return true;
    }
    catch (error) {
        // Graceful degradation - log warning but don't crash
        console.warn(`[LLKB] Failed to append to history: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}
/**
 * Read events from a history file
 *
 * @param filePath - Path to the history file
 * @returns Array of events, or empty array if file doesn't exist
 */
function readHistoryFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);
    return lines.map((line) => JSON.parse(line));
}
/**
 * Read today's history events
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Array of today's events
 */
function readTodayHistory(llkbRoot = exports.DEFAULT_LLKB_ROOT) {
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
function countTodayEvents(eventType, filter, llkbRoot = exports.DEFAULT_LLKB_ROOT) {
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
function countPredictiveExtractionsToday(llkbRoot = exports.DEFAULT_LLKB_ROOT) {
    return countTodayEvents('component_extracted', (e) => e.event === 'component_extracted' && e.prompt === 'journey-implement', llkbRoot);
}
/**
 * Count predictive extractions for a specific journey today
 *
 * @param journeyId - The journey ID to check
 * @param llkbRoot - Root LLKB directory
 * @returns Number of extractions for this journey today
 */
function countJourneyExtractionsToday(journeyId, llkbRoot = exports.DEFAULT_LLKB_ROOT) {
    return countTodayEvents('component_extracted', (e) => e.event === 'component_extracted' &&
        e.prompt === 'journey-implement' &&
        e.journeyId === journeyId, llkbRoot);
}
/**
 * Check if daily extraction rate limit is reached
 *
 * @param config - LLKB configuration
 * @param llkbRoot - Root LLKB directory
 * @returns true if rate limit is reached
 */
function isDailyRateLimitReached(config, llkbRoot = exports.DEFAULT_LLKB_ROOT) {
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
function isJourneyRateLimitReached(journeyId, config, llkbRoot = exports.DEFAULT_LLKB_ROOT) {
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
function getHistoryFilesInRange(startDate, endDate, llkbRoot = exports.DEFAULT_LLKB_ROOT) {
    const historyDir = getHistoryDir(llkbRoot);
    if (!fs.existsSync(historyDir)) {
        return [];
    }
    const files = fs.readdirSync(historyDir).filter((f) => f.endsWith('.jsonl'));
    const results = [];
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
function cleanupOldHistoryFiles(retentionDays = 365, llkbRoot = exports.DEFAULT_LLKB_ROOT) {
    const historyDir = getHistoryDir(llkbRoot);
    if (!fs.existsSync(historyDir)) {
        return [];
    }
    const files = fs.readdirSync(historyDir).filter((f) => f.endsWith('.jsonl'));
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - retentionDays);
    const deleted = [];
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
//# sourceMappingURL=history.js.map