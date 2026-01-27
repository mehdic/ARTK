/**
 * LLKB Pattern Extension - Learning and promotion of patterns from LLKB
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 4
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { IRPrimitive } from '../ir/types.js';
import { normalizeStepText } from '../mapping/telemetry.js';

/**
 * A pattern learned from successful step mappings
 */
export interface LearnedPattern {
  /** Unique identifier */
  id: string;
  /** Original step text that was learned from */
  originalText: string;
  /** Normalized form for matching */
  normalizedText: string;
  /** The IR primitive this text maps to */
  mappedPrimitive: IRPrimitive;
  /** Confidence score (0-1) */
  confidence: number;
  /** Journey IDs where this pattern was used */
  sourceJourneys: string[];
  /** Number of successful uses */
  successCount: number;
  /** Number of failed uses */
  failCount: number;
  /** Timestamp of last use */
  lastUsed: string;
  /** Timestamp when created */
  createdAt: string;
  /** Whether this pattern has been promoted to core */
  promotedToCore: boolean;
  /** Promotion timestamp if promoted */
  promotedAt?: string;
}

/**
 * Pattern ready for promotion to core
 */
export interface PromotedPattern {
  /** The learned pattern being promoted */
  pattern: LearnedPattern;
  /** Generated regex string for the pattern */
  generatedRegex: string;
  /** Priority score for ordering */
  priority: number;
}

/**
 * LLKB pattern match result
 */
export interface LlkbPatternMatch {
  /** Pattern ID that matched */
  patternId: string;
  /** The IR primitive */
  primitive: IRPrimitive;
  /** Confidence of the match */
  confidence: number;
}

/**
 * Options for pruning patterns
 */
export interface PruneOptions {
  /** Minimum confidence to keep */
  minConfidence?: number;
  /** Minimum success count to keep */
  minSuccess?: number;
  /** Maximum age in days to keep */
  maxAgeDays?: number;
}

/**
 * Storage file for learned patterns
 */
const PATTERNS_FILE = 'learned-patterns.json';
const DEFAULT_LLKB_ROOT = '.artk/llkb';

/**
 * Get the path to the patterns file
 */
export function getPatternsFilePath(llkbRoot?: string): string {
  const root = llkbRoot || join(process.cwd(), DEFAULT_LLKB_ROOT);
  return join(root, PATTERNS_FILE);
}

/**
 * Generate a unique pattern ID
 */
export function generatePatternId(): string {
  return `LP${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

/**
 * Load learned patterns from storage
 */
export function loadLearnedPatterns(options: { llkbRoot?: string } = {}): LearnedPattern[] {
  const filePath = getPatternsFilePath(options.llkbRoot);

  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data.patterns) ? data.patterns : [];
  } catch {
    return [];
  }
}

/**
 * Save learned patterns to storage
 */
export function saveLearnedPatterns(
  patterns: LearnedPattern[],
  options: { llkbRoot?: string } = {}
): void {
  const filePath = getPatternsFilePath(options.llkbRoot);
  const dir = dirname(filePath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const data = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    patterns,
  };

  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Calculate confidence from success/fail counts
 * Uses Wilson score interval for small sample sizes
 */
export function calculateConfidence(successCount: number, failCount: number): number {
  const total = successCount + failCount;
  if (total === 0) return 0.5;

  const p = successCount / total;
  const z = 1.96; // 95% confidence
  const n = total;

  // Wilson score lower bound
  const denominator = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);

  return Math.max(0, Math.min(1, (center - spread) / denominator));
}

/**
 * Record a successful pattern transformation
 */
export function recordPatternSuccess(
  originalText: string,
  primitive: IRPrimitive,
  journeyId: string,
  options: { llkbRoot?: string } = {}
): LearnedPattern {
  const patterns = loadLearnedPatterns(options);
  const normalizedText = normalizeStepText(originalText);

  // Find existing pattern
  let pattern = patterns.find((p) => p.normalizedText === normalizedText);

  if (pattern) {
    // Update existing
    pattern.successCount++;
    pattern.confidence = calculateConfidence(pattern.successCount, pattern.failCount);
    pattern.lastUsed = new Date().toISOString();
    if (!pattern.sourceJourneys.includes(journeyId)) {
      pattern.sourceJourneys.push(journeyId);
    }
  } else {
    // Create new
    pattern = {
      id: generatePatternId(),
      originalText,
      normalizedText,
      mappedPrimitive: primitive,
      confidence: 0.5, // Initial confidence
      sourceJourneys: [journeyId],
      successCount: 1,
      failCount: 0,
      lastUsed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      promotedToCore: false,
    };
    patterns.push(pattern);
  }

  saveLearnedPatterns(patterns, options);
  return pattern;
}

/**
 * Record a failed pattern use
 */
export function recordPatternFailure(
  originalText: string,
  journeyId: string,
  options: { llkbRoot?: string } = {}
): LearnedPattern | null {
  const patterns = loadLearnedPatterns(options);
  const normalizedText = normalizeStepText(originalText);

  const pattern = patterns.find((p) => p.normalizedText === normalizedText);

  if (pattern) {
    pattern.failCount++;
    pattern.confidence = calculateConfidence(pattern.successCount, pattern.failCount);
    pattern.lastUsed = new Date().toISOString();
    saveLearnedPatterns(patterns, options);
    return pattern;
  }

  return null;
}

/**
 * Match text against learned LLKB patterns
 */
export function matchLlkbPattern(
  text: string,
  options: { llkbRoot?: string; minConfidence?: number } = {}
): LlkbPatternMatch | null {
  const patterns = loadLearnedPatterns(options);
  const normalizedText = normalizeStepText(text);
  const minConfidence = options.minConfidence ?? 0.7;

  // Find exact normalized match with sufficient confidence
  const match = patterns.find(
    (p) => p.normalizedText === normalizedText && p.confidence >= minConfidence && !p.promotedToCore
  );

  if (match) {
    return {
      patternId: match.id,
      primitive: match.mappedPrimitive,
      confidence: match.confidence,
    };
  }

  return null;
}

/**
 * Generate a regex pattern from a learned text pattern
 * This is a heuristic approach - complex patterns may need manual refinement
 */
export function generateRegexFromText(text: string): string {
  let pattern = text
    .toLowerCase()
    // Escape special regex chars
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Replace quoted values with capture groups
    .replace(/"[^"]+"/g, '"([^"]+)"')
    .replace(/'[^']+'/g, "'([^']+)'")
    // Make articles optional
    .replace(/\b(the|a|an)\b/g, '(?:$1\\s+)?')
    // Make "user" prefix optional
    .replace(/^user\s+/, '(?:user\\s+)?')
    // Handle common verbs
    .replace(/\bclicks?\b/g, 'clicks?')
    .replace(/\bfills?\b/g, 'fills?')
    .replace(/\bselects?\b/g, 'selects?')
    .replace(/\btypes?\b/g, 'types?')
    .replace(/\bsees?\b/g, 'sees?')
    .replace(/\bwaits?\b/g, 'waits?');

  return `^${pattern}$`;
}

/**
 * Get patterns ready for promotion to core
 */
export function getPromotablePatterns(options: { llkbRoot?: string } = {}): PromotedPattern[] {
  const patterns = loadLearnedPatterns(options);

  const promotable = patterns.filter(
    (p) =>
      p.confidence >= 0.9 &&
      p.successCount >= 5 &&
      p.sourceJourneys.length >= 2 &&
      !p.promotedToCore
  );

  return promotable.map((pattern) => ({
    pattern,
    generatedRegex: generateRegexFromText(pattern.originalText),
    priority: pattern.successCount * pattern.confidence,
  }));
}

/**
 * Mark patterns as promoted
 */
export function markPatternsPromoted(
  patternIds: string[],
  options: { llkbRoot?: string } = {}
): void {
  const patterns = loadLearnedPatterns(options);
  const now = new Date().toISOString();

  for (const pattern of patterns) {
    if (patternIds.includes(pattern.id)) {
      pattern.promotedToCore = true;
      pattern.promotedAt = now;
    }
  }

  saveLearnedPatterns(patterns, options);
}

/**
 * Prune low-quality patterns
 */
export function prunePatterns(options: PruneOptions & { llkbRoot?: string } = {}): {
  removed: number;
  remaining: number;
} {
  const patterns = loadLearnedPatterns(options);
  const now = Date.now();
  const maxAge = (options.maxAgeDays ?? 90) * 24 * 60 * 60 * 1000;
  const minConfidence = options.minConfidence ?? 0.3;
  const minSuccess = options.minSuccess ?? 1;

  const filtered = patterns.filter((p) => {
    // Keep if already promoted
    if (p.promotedToCore) return true;

    // Remove if below minimum confidence
    if (p.confidence < minConfidence) return false;

    // Remove if no successes and required
    if (minSuccess > 0 && p.successCount < minSuccess) return false;

    // Remove if too old and never successful
    const age = now - new Date(p.createdAt).getTime();
    if (age > maxAge && p.successCount === 0) return false;

    return true;
  });

  const removed = patterns.length - filtered.length;

  if (removed > 0) {
    saveLearnedPatterns(filtered, options);
  }

  return {
    removed,
    remaining: filtered.length,
  };
}

/**
 * Get pattern statistics
 */
export function getPatternStats(options: { llkbRoot?: string } = {}): {
  total: number;
  promoted: number;
  highConfidence: number;
  lowConfidence: number;
  avgConfidence: number;
  totalSuccesses: number;
  totalFailures: number;
} {
  const patterns = loadLearnedPatterns(options);

  if (patterns.length === 0) {
    return {
      total: 0,
      promoted: 0,
      highConfidence: 0,
      lowConfidence: 0,
      avgConfidence: 0,
      totalSuccesses: 0,
      totalFailures: 0,
    };
  }

  const promoted = patterns.filter((p) => p.promotedToCore).length;
  const highConfidence = patterns.filter((p) => p.confidence >= 0.7).length;
  const lowConfidence = patterns.filter((p) => p.confidence < 0.3).length;
  const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0);
  const totalSuccesses = patterns.reduce((sum, p) => sum + p.successCount, 0);
  const totalFailures = patterns.reduce((sum, p) => sum + p.failCount, 0);

  return {
    total: patterns.length,
    promoted,
    highConfidence,
    lowConfidence,
    avgConfidence: totalConfidence / patterns.length,
    totalSuccesses,
    totalFailures,
  };
}

/**
 * Export learned patterns to LLKB config format
 */
export function exportPatternsToConfig(options: {
  llkbRoot?: string;
  outputPath?: string;
  minConfidence?: number;
}): { exported: number; path: string } {
  const patterns = loadLearnedPatterns(options);
  const minConfidence = options.minConfidence ?? 0.7;

  const exportable = patterns.filter((p) => p.confidence >= minConfidence && !p.promotedToCore);

  const config = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    patterns: exportable.map((p) => ({
      id: p.id,
      trigger: generateRegexFromText(p.originalText),
      primitive: p.mappedPrimitive,
      confidence: p.confidence,
      sourceCount: p.sourceJourneys.length,
    })),
  };

  const outputPath =
    options.outputPath || join(dirname(getPatternsFilePath(options.llkbRoot)), 'autogen-patterns.json');

  writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf-8');

  return {
    exported: exportable.length,
    path: outputPath,
  };
}

/**
 * Clear all learned patterns (for testing)
 */
export function clearLearnedPatterns(options: { llkbRoot?: string } = {}): void {
  const filePath = getPatternsFilePath(options.llkbRoot);
  if (existsSync(filePath)) {
    const { unlinkSync } = require('node:fs');
    unlinkSync(filePath);
  }
}
