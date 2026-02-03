/**
 * Blocked Step Telemetry - Track steps that couldn't be mapped for pattern gap analysis
 * @see research/2026-02-03_multi-ai-debate-coverage-improvement.md
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { getAutogenDir } from '../utils/paths.js';

/**
 * A blocked step record for telemetry
 */
export interface BlockedStepRecord {
  /** Original step text */
  stepText: string;
  /** Journey ID where step was encountered */
  journeyId: string;
  /** Error type if from test failure */
  errorType?: string;
  /** Timestamp when recorded */
  timestamp: string;
  /** Normalized form of the step (if available) */
  normalizedText?: string;
  /** Reason step was blocked */
  reason?: string;
  /** Source of the blocked step (generate, run, refine) */
  source?: 'generate' | 'run' | 'refine';
}

/**
 * Aggregated pattern gap statistics
 */
export interface PatternGapStats {
  /** Total blocked steps recorded */
  totalBlocked: number;
  /** Blocked steps by error type */
  byErrorType: Record<string, number>;
  /** Blocked steps by journey */
  byJourney: Record<string, number>;
  /** Top 20 most common blocked step patterns */
  topPatterns: Array<{
    pattern: string;
    count: number;
    errorTypes: string[];
  }>;
  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * Storage file for blocked step telemetry
 */
const BLOCKED_STEPS_FILE = 'blocked-steps-telemetry.json';
const MAX_RECORDS = 10000; // Keep last 10k records to avoid unbounded growth

/**
 * In-memory buffer for batching writes
 */
let pendingRecords: BlockedStepRecord[] = [];
let flushTimeout: NodeJS.Timeout | null = null;
const FLUSH_INTERVAL_MS = 5000; // Flush every 5 seconds

/**
 * Get the path to the blocked steps telemetry file
 */
function getBlockedStepsFilePath(): string {
  const autogenDir = getAutogenDir();
  return join(autogenDir, BLOCKED_STEPS_FILE);
}

/**
 * Load existing blocked step records
 */
export function loadBlockedSteps(): BlockedStepRecord[] {
  const filePath = getBlockedStepsFilePath();

  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data.records) ? data.records : [];
  } catch {
    return [];
  }
}

/**
 * Save blocked step records to storage
 */
function saveBlockedSteps(records: BlockedStepRecord[]): void {
  const filePath = getBlockedStepsFilePath();
  const dir = dirname(filePath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Keep only the most recent records
  const trimmedRecords = records.slice(-MAX_RECORDS);

  const data = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    recordCount: trimmedRecords.length,
    records: trimmedRecords,
  };

  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Flush pending records to storage
 */
function flushPendingRecords(): void {
  if (pendingRecords.length === 0) return;

  const existing = loadBlockedSteps();
  const combined = [...existing, ...pendingRecords];
  saveBlockedSteps(combined);
  pendingRecords = [];

  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
}

/**
 * Track a blocked step for pattern gap analysis
 * Uses batched writes to avoid excessive disk I/O
 */
export function trackBlockedStep(record: BlockedStepRecord): void {
  pendingRecords.push({
    ...record,
    timestamp: record.timestamp || new Date().toISOString(),
  });

  // Schedule flush if not already scheduled
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushPendingRecords, FLUSH_INTERVAL_MS);
  }

  // Immediate flush if buffer is large
  if (pendingRecords.length >= 100) {
    flushPendingRecords();
  }
}

/**
 * Force flush any pending records (call before process exit)
 */
export function flushBlockedStepTelemetry(): void {
  flushPendingRecords();
}

/**
 * Normalize step text for pattern grouping
 */
function normalizeForGrouping(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove specific values in quotes
    .replace(/"[^"]+"/g, '"VALUE"')
    .replace(/'[^']+'/g, "'VALUE'")
    // Remove numbers
    .replace(/\d+/g, 'N')
    // Remove extra whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Analyze blocked steps and generate pattern gap statistics
 */
export function analyzePatternGaps(): PatternGapStats {
  // Flush any pending records first
  flushPendingRecords();

  const records = loadBlockedSteps();

  // Count by error type
  const byErrorType: Record<string, number> = {};
  for (const record of records) {
    const errorType = record.errorType || 'unknown';
    byErrorType[errorType] = (byErrorType[errorType] || 0) + 1;
  }

  // Count by journey
  const byJourney: Record<string, number> = {};
  for (const record of records) {
    byJourney[record.journeyId] = (byJourney[record.journeyId] || 0) + 1;
  }

  // Group by normalized pattern
  const patternGroups = new Map<string, {
    count: number;
    errorTypes: Set<string>;
    originalTexts: string[];
  }>();

  for (const record of records) {
    const normalizedPattern = normalizeForGrouping(record.stepText);
    const existing = patternGroups.get(normalizedPattern);

    if (existing) {
      existing.count++;
      if (record.errorType) {
        existing.errorTypes.add(record.errorType);
      }
      if (existing.originalTexts.length < 3) {
        existing.originalTexts.push(record.stepText);
      }
    } else {
      patternGroups.set(normalizedPattern, {
        count: 1,
        errorTypes: new Set(record.errorType ? [record.errorType] : []),
        originalTexts: [record.stepText],
      });
    }
  }

  // Get top 20 patterns
  const topPatterns = Array.from(patternGroups.entries())
    .map(([pattern, data]) => ({
      pattern,
      count: data.count,
      errorTypes: Array.from(data.errorTypes),
      examples: data.originalTexts,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    totalBlocked: records.length,
    byErrorType,
    byJourney,
    topPatterns,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Clear all blocked step telemetry (for testing)
 */
export function clearBlockedStepTelemetry(): void {
  const filePath = getBlockedStepsFilePath();
  if (existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify({ version: '1.0.0', records: [] }), 'utf-8');
  }
  pendingRecords = [];
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
}

/**
 * Get suggested patterns based on blocked step analysis
 * Returns regex patterns that could cover common blocked steps
 */
export function suggestNewPatterns(): Array<{
  suggestedRegex: string;
  coveredCount: number;
  examples: string[];
  confidence: number;
}> {
  const stats = analyzePatternGaps();
  const suggestions: Array<{
    suggestedRegex: string;
    coveredCount: number;
    examples: string[];
    confidence: number;
  }> = [];

  for (const pattern of stats.topPatterns) {
    // Only suggest patterns that appear frequently enough
    if (pattern.count < 3) continue;

    // Generate regex from the normalized pattern
    const regex = pattern.pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/"VALUE"/g, '"([^"]+)"')
      .replace(/'VALUE'/g, "'([^']+)'")
      .replace(/N/g, '\\d+');

    // Calculate confidence based on frequency and consistency
    const confidence = Math.min(0.9, 0.5 + (pattern.count / 50));

    suggestions.push({
      suggestedRegex: `^${regex}$`,
      coveredCount: pattern.count,
      examples: (pattern as { examples?: string[] }).examples || [],
      confidence,
    });
  }

  return suggestions.slice(0, 10); // Top 10 suggestions
}

/**
 * Register exit handlers to flush pending telemetry
 * Ensures no data loss on process termination
 */
function registerExitHandlers(): void {
  let registered = false;

  const handleExit = (): void => {
    if (!registered) {
      registered = true;
      flushBlockedStepTelemetry();
    }
  };

  // Handle normal exit
  process.on('beforeExit', handleExit);

  // Handle interrupt signals
  process.on('SIGINT', () => {
    handleExit();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    handleExit();
    process.exit(0);
  });
}

// Register exit handlers on module load
registerExitHandlers();
