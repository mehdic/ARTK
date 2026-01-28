/**
 * Telemetry for blocked steps - Records blocked steps for pattern analysis
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 3
 */
import { existsSync, readFileSync, appendFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { getArtkDir } from '../utils/paths.js';

/**
 * Record for a blocked step
 */
export interface BlockedStepRecord {
  /** ISO timestamp when the step was blocked */
  timestamp: string;
  /** Journey ID where this step was found */
  journeyId: string;
  /** Original step text that was blocked */
  stepText: string;
  /** Normalized text (lowercase, trimmed) */
  normalizedText: string;
  /** Category of the step */
  category: 'navigation' | 'interaction' | 'assertion' | 'wait' | 'unknown';
  /** Reason the step was blocked */
  reason: string;
  /** Suggested fix from the system */
  suggestedFix?: string;
  /** User's manual fix (if captured) */
  userFix?: string;
  /** Nearest pattern that almost matched */
  nearestPattern?: string;
  /** Distance to nearest pattern */
  nearestDistance?: number;
}

/**
 * Pattern gap identified from telemetry analysis
 */
export interface PatternGap {
  /** Example text that represents this gap */
  exampleText: string;
  /** Normalized form of the text */
  normalizedText: string;
  /** Number of times this gap was encountered */
  count: number;
  /** Category of the gap */
  category: string;
  /** All unique step texts that fall into this gap */
  variants: string[];
  /** Suggested regex pattern to add */
  suggestedPattern?: string;
  /** First occurrence timestamp */
  firstSeen: string;
  /** Last occurrence timestamp */
  lastSeen: string;
}

/**
 * Telemetry statistics
 */
export interface TelemetryStats {
  /** Total number of blocked steps recorded */
  totalRecords: number;
  /** Unique patterns identified */
  uniquePatterns: number;
  /** Records by category */
  byCategory: Record<string, number>;
  /** Date range of records */
  dateRange: {
    earliest: string;
    latest: string;
  };
}

/**
 * Telemetry file name
 */
const TELEMETRY_FILE = 'blocked-steps-telemetry.jsonl';

/**
 * Get the telemetry file path.
 *
 * Automatically infers the correct .artk directory location by:
 * 1. Using explicit baseDir if provided
 * 2. Finding artk-e2e/.artk from project root
 * 3. Finding .artk in current directory if inside harness
 *
 * @param baseDir - Optional explicit base directory override
 * @returns Path to the telemetry file
 */
export function getTelemetryPath(baseDir?: string): string {
  const artkDir = getArtkDir(baseDir);
  return join(artkDir, TELEMETRY_FILE);
}

/**
 * Ensure the telemetry directory exists
 */
function ensureTelemetryDir(telemetryPath: string): void {
  const dir = dirname(telemetryPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Normalize step text for telemetry comparison
 * (Simpler normalization than glossary - for deduplication purposes)
 */
export function normalizeStepTextForTelemetry(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove common articles
    .replace(/\b(the|a|an)\b/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove quoted values but keep structure
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''")
    .trim();
}

/**
 * Categorize a step based on its text
 */
export function categorizeStepText(text: string): BlockedStepRecord['category'] {
  const lower = text.toLowerCase();

  if (
    lower.includes('navigate') ||
    lower.includes('go to') ||
    lower.includes('open') ||
    lower.includes('visit')
  ) {
    return 'navigation';
  }

  if (
    lower.includes('click') ||
    lower.includes('fill') ||
    lower.includes('enter') ||
    lower.includes('type') ||
    lower.includes('select') ||
    lower.includes('check') ||
    lower.includes('press') ||
    lower.includes('submit') ||
    lower.includes('input')
  ) {
    return 'interaction';
  }

  if (
    lower.includes('see') ||
    lower.includes('visible') ||
    lower.includes('verify') ||
    lower.includes('assert') ||
    lower.includes('confirm') ||
    lower.includes('should') ||
    lower.includes('ensure') ||
    lower.includes('expect') ||
    lower.includes('display')
  ) {
    return 'assertion';
  }

  if (lower.includes('wait') || lower.includes('load') || lower.includes('until')) {
    return 'wait';
  }

  return 'unknown';
}

/**
 * Record a blocked step to the telemetry file
 */
export function recordBlockedStep(
  record: Omit<BlockedStepRecord, 'timestamp' | 'normalizedText' | 'category'> & {
    category?: BlockedStepRecord['category'];
  },
  options: { baseDir?: string } = {}
): void {
  const telemetryPath = getTelemetryPath(options.baseDir);
  ensureTelemetryDir(telemetryPath);

  const fullRecord: BlockedStepRecord = {
    ...record,
    timestamp: new Date().toISOString(),
    normalizedText: normalizeStepTextForTelemetry(record.stepText),
    category: record.category || categorizeStepText(record.stepText),
  };

  appendFileSync(telemetryPath, JSON.stringify(fullRecord) + '\n');
}

/**
 * Read all blocked step records from the telemetry file
 */
export function readBlockedStepRecords(options: { baseDir?: string } = {}): BlockedStepRecord[] {
  const telemetryPath = getTelemetryPath(options.baseDir);

  if (!existsSync(telemetryPath)) {
    return [];
  }

  try {
    const content = readFileSync(telemetryPath, 'utf-8');
    return content
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as BlockedStepRecord;
        } catch {
          return null;
        }
      })
      .filter((record): record is BlockedStepRecord => record !== null);
  } catch {
    return [];
  }
}

/**
 * Calculate similarity between two normalized texts
 * Uses simple token-based Jaccard similarity
 */
function calculateTokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.split(' ').filter(Boolean));
  const tokensB = new Set(b.split(' ').filter(Boolean));

  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);

  return intersection.size / union.size;
}

/**
 * Group blocked step records by similarity
 */
function groupBySimilarity(
  records: BlockedStepRecord[],
  threshold: number = 0.7
): Map<string, BlockedStepRecord[]> {
  const groups = new Map<string, BlockedStepRecord[]>();
  const processed = new Set<number>();

  for (let i = 0; i < records.length; i++) {
    if (processed.has(i)) continue;

    const record = records[i]!;
    const normalized = record.normalizedText;
    const group: BlockedStepRecord[] = [record];
    processed.add(i);

    // Find similar records
    for (let j = i + 1; j < records.length; j++) {
      if (processed.has(j)) continue;

      const other = records[j]!;
      const similarity = calculateTokenSimilarity(normalized, other.normalizedText);

      if (similarity >= threshold) {
        group.push(other);
        processed.add(j);
      }
    }

    groups.set(normalized, group);
  }

  return groups;
}

/**
 * Analyze blocked steps to find top pattern gaps
 */
export function analyzeBlockedPatterns(options: { baseDir?: string; limit?: number } = {}): PatternGap[] {
  const records = readBlockedStepRecords(options);

  if (records.length === 0) {
    return [];
  }

  const groups = groupBySimilarity(records);
  const gaps: PatternGap[] = [];

  for (const [normalizedText, groupRecords] of groups) {
    const timestamps = groupRecords.map((r) => r.timestamp).sort();
    const variants = [...new Set(groupRecords.map((r) => r.stepText))];

    gaps.push({
      exampleText: groupRecords[0]!.stepText,
      normalizedText,
      count: groupRecords.length,
      category: groupRecords[0]!.category,
      variants,
      suggestedPattern: generateSuggestedPattern(variants),
      firstSeen: timestamps[0]!,
      lastSeen: timestamps[timestamps.length - 1]!,
    });
  }

  // Sort by count (most frequent first)
  gaps.sort((a, b) => b.count - a.count);

  return options.limit ? gaps.slice(0, options.limit) : gaps;
}

/**
 * Generate a suggested regex pattern from examples
 */
function generateSuggestedPattern(variants: string[]): string | undefined {
  if (variants.length === 0) return undefined;

  // Find common prefix and suffix
  const example = variants[0]!.toLowerCase();

  // Extract quoted values and replace with placeholders
  const pattern = example
    .replace(/"[^"]+"/g, '"([^"]+)"')
    .replace(/'[^']+'/g, "'([^']+)'")
    // Escape special regex chars (except those we use)
    .replace(/[.*+?^${}()|[\]\\]/g, (char) => {
      if (char === '(' || char === ')' || char === '[' || char === ']' || char === '+') {
        return char;
      }
      return '\\' + char;
    });

  return `^(?:user\\s+)?${pattern}$`;
}

/**
 * Get telemetry statistics
 */
export function getTelemetryStats(options: { baseDir?: string } = {}): TelemetryStats {
  const records = readBlockedStepRecords(options);

  if (records.length === 0) {
    return {
      totalRecords: 0,
      uniquePatterns: 0,
      byCategory: {},
      dateRange: {
        earliest: '',
        latest: '',
      },
    };
  }

  const byCategory: Record<string, number> = {};
  const normalizedSet = new Set<string>();
  const timestamps = records.map((r) => r.timestamp).sort();

  for (const record of records) {
    byCategory[record.category] = (byCategory[record.category] || 0) + 1;
    normalizedSet.add(record.normalizedText);
  }

  return {
    totalRecords: records.length,
    uniquePatterns: normalizedSet.size,
    byCategory,
    dateRange: {
      earliest: timestamps[0]!,
      latest: timestamps[timestamps.length - 1]!,
    },
  };
}

/**
 * Record a user fix for a previously blocked step
 */
export function recordUserFix(
  originalStepText: string,
  userFixedText: string,
  options: { baseDir?: string } = {}
): void {
  const records = readBlockedStepRecords(options);
  const normalizedOriginal = normalizeStepTextForTelemetry(originalStepText);

  // Find matching record and update it (append new record with fix)
  const matchingRecord = records.find((r) => r.normalizedText === normalizedOriginal && !r.userFix);

  if (matchingRecord) {
    // Record the user fix - timestamp and normalizedText will be set by recordBlockedStep
    // eslint-disable-next-line no-unused-vars
    const { timestamp: _t, normalizedText: _n, ...recordWithoutTimestamp } = matchingRecord;
    recordBlockedStep(
      {
        ...recordWithoutTimestamp,
        userFix: userFixedText,
      },
      options
    );
  }
}

/**
 * Clear telemetry data (for testing or reset)
 */
export function clearTelemetry(options: { baseDir?: string } = {}): void {
  const telemetryPath = getTelemetryPath(options.baseDir);
  if (existsSync(telemetryPath)) {
    unlinkSync(telemetryPath);
  }
}
