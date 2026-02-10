/**
 * LLKB Pattern Extension - Learning and promotion of patterns from LLKB
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 4
 * @see Task 2 - Fuzzy matching support added 2026-02-04
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, renameSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { IRPrimitive } from '../ir/types.js';
// Use the same normalizer as stepMapper for consistent pattern matching
// This ensures patterns learned during recording match during lookup
import { normalizeStepText } from '../mapping/glossary.js';
import { getLlkbRoot as getInferredLlkbRoot } from '../utils/paths.js';
import { calculateSimilarity } from '../mapping/patternDistance.js';

/**
 * Layer priority order for discovered patterns.
 * app-specific beats framework beats universal.
 */
const LAYER_PRIORITY: Record<string, number> = {
  'app-specific': 3,
  'framework': 2,
  'universal': 1,
};

/**
 * Map selector hint strategies to Playwright LocatorStrategy names.
 */
const SELECTOR_STRATEGY_MAP: Record<string, import('../ir/types.js').LocatorStrategy> = {
  'data-testid': 'testid',
  'data-cy': 'testid',
  'data-test': 'testid',
  'role': 'role',
  'aria-label': 'label',
  'css': 'css',
  'text': 'text',
  'xpath': 'css', // fallback — xpath not directly supported in LocatorStrategy
};

/**
 * Create a best-effort IRPrimitive from a string type name and optional selector hints.
 *
 * Discovered patterns store `mappedPrimitive` as a string (e.g., "click", "fill").
 * This function constructs a valid IRPrimitive object so discovered patterns can
 * participate in AutoGen matching and code generation.
 *
 * Returns null only for unrecognized type names.
 */
function createIRPrimitiveFromDiscovered(
  typeName: string,
  selectorHints?: Array<{ strategy: string; value: string; confidence?: number }>
): IRPrimitive | null {
  // Build a LocatorSpec from the best selector hint
  const locator = buildLocatorFromHints(selectorHints);

  switch (typeName) {
    // Interactions
    case 'click':
      return { type: 'click', locator };
    case 'dblclick':
      return { type: 'dblclick', locator };
    case 'fill':
      return { type: 'fill', locator, value: { type: 'literal', value: '{{input}}' } };
    case 'check':
      return { type: 'check', locator };
    case 'uncheck':
      return { type: 'uncheck', locator };
    case 'select':
      return { type: 'select', locator, option: '{{option}}' };
    case 'hover':
      return { type: 'hover', locator };
    case 'clear':
      return { type: 'clear', locator };
    case 'press':
      return { type: 'press', key: 'Enter', locator };

    // Navigation
    case 'navigate':
    case 'goto':
      return { type: 'goto', url: '{{url}}' };
    case 'goBack':
      return { type: 'goBack' };
    case 'reload':
      return { type: 'reload' };

    // Assertions
    case 'assert':
    case 'expectVisible':
      return { type: 'expectVisible', locator };
    case 'expectNotVisible':
      return { type: 'expectNotVisible', locator };
    case 'expectHidden':
      return { type: 'expectHidden', locator };
    case 'expectText':
      return { type: 'expectText', locator, text: '{{text}}' };
    case 'expectURL':
      return { type: 'expectURL', pattern: '{{pattern}}' };
    case 'expectTitle':
      return { type: 'expectTitle', title: '{{title}}' };
    case 'expectValue':
      return { type: 'expectValue', locator, value: '{{value}}' };
    case 'expectChecked':
      return { type: 'expectChecked', locator };
    case 'expectEnabled':
      return { type: 'expectEnabled', locator };
    case 'expectDisabled':
      return { type: 'expectDisabled', locator };
    case 'expectCount':
      return { type: 'expectCount', locator, count: 0 };
    case 'expectContainsText':
      return { type: 'expectContainsText', locator, text: '{{text}}' };

    // Signals (toasts, modals, alerts)
    case 'expectToast':
      return { type: 'expectToast', toastType: 'success' };
    case 'dismissModal':
      return { type: 'dismissModal' };
    case 'acceptAlert':
      return { type: 'acceptAlert' };
    case 'dismissAlert':
      return { type: 'dismissAlert' };

    // Wait
    case 'waitForVisible':
      return { type: 'waitForVisible', locator };
    case 'waitForHidden':
      return { type: 'waitForHidden', locator };
    case 'waitForURL':
      return { type: 'waitForURL', pattern: '{{pattern}}' };
    case 'waitForNetworkIdle':
      return { type: 'waitForNetworkIdle' };
    case 'waitForTimeout':
      return { type: 'waitForTimeout', ms: 1000 };
    case 'waitForResponse':
      return { type: 'waitForResponse', urlPattern: '{{pattern}}' };
    case 'waitForLoadingComplete':
      return { type: 'waitForLoadingComplete' };

    // Navigation (additional)
    case 'goForward':
      return { type: 'goForward' };

    // File upload
    case 'upload':
      return { type: 'upload', locator, files: ['{{file}}'] };

    // Additional interactions
    case 'rightClick':
      return { type: 'rightClick', locator };
    case 'focus':
      return { type: 'focus', locator };

    // Keyboard shortcut (template-generators uses 'keyboard' for modal Escape etc.)
    case 'keyboard':
      return { type: 'press', key: 'Escape', locator };

    // Drag has no IR type — patterns using 'drag' (e.g., column resize) cannot
    // be mapped to code generation yet. Return null so they are skipped gracefully.
    case 'drag':
      return null;

    default:
      return null;
  }
}

/**
 * Build a LocatorSpec from discovered pattern selector hints.
 * Falls back to a generic testid locator if no hints available.
 */
function buildLocatorFromHints(
  hints?: Array<{ strategy: string; value: string; confidence?: number }>
): import('../ir/types.js').LocatorSpec {
  if (!hints || hints.length === 0) {
    return { strategy: 'testid', value: '{{locator}}' };
  }

  // Sort by confidence descending, pick the best
  const sorted = [...hints].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  const best = sorted[0]!;

  const strategy = SELECTOR_STRATEGY_MAP[best.strategy] ?? 'testid';
  return { strategy, value: best.value };
}

// =============================================================================
// File Locking (inline implementation for autogen package)
// Prevents lost writes when concurrent generate calls race on learned-patterns.json
// =============================================================================

const LOCK_MAX_WAIT_MS = 5000;
const STALE_LOCK_THRESHOLD_MS = 30000;
const LOCK_RETRY_INTERVAL_MS = 50;

function acquireFileLock(filePath: string): boolean {
  const lockPath = `${filePath}.lock`;
  try {
    // Ensure parent directory exists before creating lock file
    const dir = dirname(lockPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (existsSync(lockPath)) {
      const lockAge = Date.now() - statSync(lockPath).mtimeMs;
      if (lockAge > STALE_LOCK_THRESHOLD_MS) {
        unlinkSync(lockPath);
      } else {
        return false;
      }
    }
    writeFileSync(lockPath, String(Date.now()), { flag: 'wx' });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  }
}

function releaseFileLock(filePath: string): void {
  const lockPath = `${filePath}.lock`;
  try { if (existsSync(lockPath)) unlinkSync(lockPath); } catch { /* ignore */ }
}

function withFileLockSync<T>(filePath: string, fn: () => T): T {
  const start = Date.now();
  while (Date.now() - start < LOCK_MAX_WAIT_MS) {
    if (acquireFileLock(filePath)) {
      try {
        return fn();
      } finally {
        releaseFileLock(filePath);
      }
    }
    // Busy-wait retry
    const end = Date.now() + LOCK_RETRY_INTERVAL_MS;
    while (Date.now() < end) { /* spin */ }
  }
  // Timeout — proceed without lock rather than failing silently
  console.warn(`[LLKB] Could not acquire lock on ${filePath} within ${LOCK_MAX_WAIT_MS}ms, proceeding without lock`);
  return fn();
}

/**
 * Type guard: check if a value is a valid IRPrimitive object.
 * Discovered patterns store mappedPrimitive as a string type name ("click", "fill"),
 * while learned patterns store the full IRPrimitive object ({type: 'click', locator: ...}).
 * This guard distinguishes the two cases safely.
 */
function isIRPrimitiveObject(value: unknown): value is IRPrimitive {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as Record<string, unknown>).type === 'string'
  );
}

/**
 * A discovered pattern loaded from discovered-patterns.json
 */
interface DiscoveredPatternEntry {
  id: string;
  normalizedText: string;
  originalText: string;
  mappedPrimitive: string;
  confidence: number;
  layer: 'app-specific' | 'framework' | 'universal';
  category?: string;
  selectorHints?: Array<{ strategy: string; value: string; confidence?: number }>;
  sourceJourneys?: string[];
  successCount?: number;
  failCount?: number;
}

/**
 * Cache for discovered patterns (separate from learned patterns cache)
 */
interface DiscoveredPatternCache {
  patterns: DiscoveredPatternEntry[];
  llkbRoot: string;
  loadedAt: number;
}

let discoveredPatternCache: DiscoveredPatternCache | null = null;
const DISCOVERED_CACHE_TTL_MS = 10_000; // 10 second cache TTL (less volatile than learned patterns)

/**
 * Load discovered patterns from discovered-patterns.json
 */
function loadDiscoveredPatternsForMatching(llkbRoot: string): DiscoveredPatternEntry[] {
  const now = Date.now();

  // Check cache
  if (
    discoveredPatternCache &&
    discoveredPatternCache.llkbRoot === llkbRoot &&
    now - discoveredPatternCache.loadedAt < DISCOVERED_CACHE_TTL_MS
  ) {
    return discoveredPatternCache.patterns;
  }

  const filePath = join(llkbRoot, 'discovered-patterns.json');
  if (!existsSync(filePath)) {
    discoveredPatternCache = { patterns: [], llkbRoot, loadedAt: now };
    return [];
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    // SEC-F03: Runtime shape validation after JSON.parse
    if (typeof data !== 'object' || data === null) {
      console.warn(`[LLKB] Invalid discovered patterns shape in ${filePath}`);
      discoveredPatternCache = { patterns: [], llkbRoot, loadedAt: now };
      return [];
    }
    const patterns: DiscoveredPatternEntry[] = Array.isArray(data.patterns) ? data.patterns : [];

    discoveredPatternCache = { patterns, llkbRoot, loadedAt: now };
    return patterns;
  } catch (err) {
    console.warn(`[LLKB] Failed to load discovered patterns from ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
    discoveredPatternCache = { patterns: [], llkbRoot, loadedAt: now };
    return [];
  }
}

/**
 * Invalidate the discovered pattern cache
 */
export function invalidateDiscoveredPatternCache(): void {
  discoveredPatternCache = null;
}

/**
 * A pattern learned from successful step mappings (runtime matching format).
 *
 * This is the rich runtime type used by AutoGen for pattern matching during
 * test generation. It stores `mappedPrimitive` as a full `IRPrimitive` object.
 *
 * NOTE: This is distinct from core LLKB's `LearnedPattern` (aka `LearnedPatternEntry`)
 * in pattern-generation.ts, which stores `irPrimitive` as a string type name for
 * persistence/merge operations. See I-01 in the review for context.
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

/**
 * Pattern cache for performance optimization
 * Avoids repeated file reads during step mapping
 */
interface PatternCache {
  patterns: LearnedPattern[];
  llkbRoot: string;
  loadedAt: number;
}

let patternCache: PatternCache | null = null;
const CACHE_TTL_MS = 5000; // 5 second cache TTL

/**
 * Invalidate the pattern cache
 * Call this after any write operation
 */
export function invalidatePatternCache(): void {
  patternCache = null;
}

/**
 * Get the path to the patterns file.
 *
 * Automatically infers the correct LLKB directory location by:
 * 1. Using explicit llkbRoot if provided
 * 2. Finding artk-e2e/.artk/llkb from project root
 * 3. Finding .artk/llkb in current directory if inside harness
 *
 * @param llkbRoot - Optional explicit LLKB root directory override
 * @returns Path to the patterns file
 */
export function getPatternsFilePath(llkbRoot?: string): string {
  const root = getInferredLlkbRoot(llkbRoot);
  return join(root, PATTERNS_FILE);
}

/**
 * Generate a unique pattern ID
 */
export function generatePatternId(): string {
  return `LP${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

/**
 * Load learned patterns from storage (with caching for performance)
 */
export function loadLearnedPatterns(options: { llkbRoot?: string; bypassCache?: boolean } = {}): LearnedPattern[] {
  const llkbRoot = getInferredLlkbRoot(options.llkbRoot);
  const now = Date.now();

  // Check cache validity (same llkbRoot and not expired)
  if (
    !options.bypassCache &&
    patternCache &&
    patternCache.llkbRoot === llkbRoot &&
    now - patternCache.loadedAt < CACHE_TTL_MS
  ) {
    return patternCache.patterns;
  }

  const filePath = getPatternsFilePath(options.llkbRoot);

  if (!existsSync(filePath)) {
    // Cache empty result
    patternCache = { patterns: [], llkbRoot, loadedAt: now };
    return [];
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    // SEC-F03: Runtime shape validation after JSON.parse
    if (typeof data !== 'object' || data === null) {
      console.warn(`[LLKB] Invalid learned patterns shape in ${filePath}`);
      patternCache = { patterns: [], llkbRoot, loadedAt: now };
      return [];
    }
    const rawPatterns = Array.isArray(data.patterns) ? data.patterns : [];

    // Normalize persistence-format patterns (from universal seeds or mergeDiscoveredPatterns)
    // into runtime format. Persistence format has `irPrimitive: string` instead of
    // `mappedPrimitive: IRPrimitive` and may lack `id`, `lastUsed`, `createdAt`, `promotedToCore`.
    const patterns: LearnedPattern[] = rawPatterns.map((p: Record<string, unknown>) => {
      // Already in runtime format — has mappedPrimitive object
      if (p.mappedPrimitive && typeof p.mappedPrimitive === 'object') {
        return p as unknown as LearnedPattern;
      }
      // Persistence format — needs conversion
      if (typeof p.irPrimitive === 'string') {
        const primitive = createIRPrimitiveFromDiscovered(p.irPrimitive);
        if (!primitive) {
          return null; // Unrecognized IR type — skip
        }
        const nowIso = new Date().toISOString();
        return {
          id: (p.id as string) || generatePatternId(),
          originalText: (p.originalText as string) || '',
          normalizedText: (p.normalizedText as string) || '',
          mappedPrimitive: primitive,
          confidence: typeof p.confidence === 'number' ? p.confidence : 0.5,
          sourceJourneys: Array.isArray(p.sourceJourneys) ? p.sourceJourneys as string[] : [],
          successCount: typeof p.successCount === 'number' ? p.successCount : 0,
          failCount: typeof p.failCount === 'number' ? p.failCount : 0,
          lastUsed: (p.lastUpdated as string) || (p.lastUsed as string) || nowIso,
          createdAt: (p.createdAt as string) || nowIso,
          promotedToCore: (p.promotedToCore as boolean) || false,
        } satisfies LearnedPattern;
      }
      // Unknown format — skip
      return null;
    }).filter((p: LearnedPattern | null): p is LearnedPattern => p !== null);

    // Update cache
    patternCache = { patterns, llkbRoot, loadedAt: now };
    return patterns;
  } catch (err) {
    console.warn(`[LLKB] Failed to load learned patterns from ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
    patternCache = { patterns: [], llkbRoot, loadedAt: now };
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

  // SEC-F08: Use atomic write via temp file + rename to prevent corruption
  const content = JSON.stringify(data, null, 2);
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  try {
    writeFileSync(tempPath, content, 'utf-8');
    renameSync(tempPath, filePath);
  } catch (err) {
    // Clean up temp file on failure
    try { if (existsSync(tempPath)) unlinkSync(tempPath); } catch { /* ignore */ }
    throw err;
  }

  // Invalidate cache after write
  invalidatePatternCache();
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
  const filePath = getPatternsFilePath(options.llkbRoot);

  return withFileLockSync(filePath, () => {
    // Re-load inside lock to prevent lost-write race condition
    const patterns = loadLearnedPatterns({ ...options, bypassCache: true });
    const normalizedText = normalizeStepText(originalText);

    let pattern = patterns.find((p) => p.normalizedText === normalizedText);

    if (pattern) {
      pattern.successCount++;
      pattern.confidence = calculateConfidence(pattern.successCount, pattern.failCount);
      pattern.lastUsed = new Date().toISOString();
      if (!pattern.sourceJourneys.includes(journeyId)) {
        pattern.sourceJourneys.push(journeyId);
      }
    } else {
      pattern = {
        id: generatePatternId(),
        originalText,
        normalizedText,
        mappedPrimitive: primitive,
        confidence: 0.5,
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
  });
}

/**
 * Record a failed pattern use
 */
export function recordPatternFailure(
  originalText: string,
  _journeyId: string,
  options: { llkbRoot?: string } = {}
): LearnedPattern | null {
  const filePath = getPatternsFilePath(options.llkbRoot);

  return withFileLockSync(filePath, () => {
    // Re-load inside lock to prevent lost-write race condition
    const patterns = loadLearnedPatterns({ ...options, bypassCache: true });
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
  });
}

/**
 * Options for LLKB pattern matching
 */
export interface LlkbMatchOptions {
  /** LLKB root directory */
  llkbRoot?: string;
  /** Minimum pattern confidence to consider (default: 0.5) */
  minConfidence?: number;
  /** Minimum text similarity for fuzzy match (default: 0.7) */
  minSimilarity?: number;
  /** Whether to use fuzzy matching (default: true) */
  useFuzzyMatch?: boolean;
}

/**
 * Match text against learned LLKB patterns and discovered patterns.
 *
 * Search order with layer priority:
 * 1. Learned patterns (exact match, then fuzzy match)
 * 2. Discovered patterns (exact match, then fuzzy match)
 *    - Layer priority: app-specific > framework > universal
 *
 * When both sources return a match, the higher-layer discovered pattern
 * wins if it has equal or higher confidence than the learned pattern match.
 */
export function matchLlkbPattern(
  text: string,
  options: LlkbMatchOptions = {}
): LlkbPatternMatch | null {
  const normalizedText = normalizeStepText(text);
  const minConfidence = options.minConfidence ?? 0.5;
  const minSimilarity = options.minSimilarity ?? 0.7;
  const useFuzzyMatch = options.useFuzzyMatch ?? true;

  // --- Phase 1: Search learned patterns ---
  const learnedMatch = matchLearnedPatterns(normalizedText, minConfidence, minSimilarity, useFuzzyMatch, options);

  // --- Phase 2: Search discovered patterns (layer-priority) ---
  const discoveredMatch = matchDiscoveredPatterns(normalizedText, minConfidence, minSimilarity, useFuzzyMatch, options);

  // No matches at all
  if (!learnedMatch && !discoveredMatch) {
    return null;
  }

  // Only one source matched
  if (!discoveredMatch) return learnedMatch;
  if (!learnedMatch) return discoveredMatch;

  // Both matched - discovered pattern with higher layer priority wins on ties
  if (discoveredMatch.confidence >= learnedMatch.confidence) {
    return discoveredMatch;
  }

  return learnedMatch;
}

/**
 * Match against learned patterns (original logic extracted)
 */
function matchLearnedPatterns(
  normalizedText: string,
  minConfidence: number,
  minSimilarity: number,
  useFuzzyMatch: boolean,
  options: LlkbMatchOptions
): LlkbPatternMatch | null {
  const patterns = loadLearnedPatterns(options);

  // Exact match (fast path)
  const exactMatch = patterns.find(
    (p) => p.normalizedText === normalizedText && p.confidence >= minConfidence && !p.promotedToCore
  );

  if (exactMatch) {
    return {
      patternId: exactMatch.id,
      primitive: exactMatch.mappedPrimitive,
      confidence: exactMatch.confidence,
    };
  }

  // Fuzzy match
  if (useFuzzyMatch) {
    let bestMatch: LearnedPattern | null = null;
    let bestSimilarity = 0;

    for (const pattern of patterns) {
      if (pattern.promotedToCore || pattern.confidence < minConfidence) {
        continue;
      }

      const similarity = calculateSimilarity(normalizedText, pattern.normalizedText);

      if (similarity >= minSimilarity && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = pattern;
      }
    }

    if (bestMatch) {
      return {
        patternId: bestMatch.id,
        primitive: bestMatch.mappedPrimitive,
        confidence: bestMatch.confidence * bestSimilarity,
      };
    }
  }

  return null;
}

/**
 * Match against discovered patterns with layer priority.
 * Among exact matches, the highest-layer pattern wins.
 * Falls back to fuzzy matching if no exact match found.
 */
function matchDiscoveredPatterns(
  normalizedText: string,
  minConfidence: number,
  minSimilarity: number,
  useFuzzyMatch: boolean,
  options: LlkbMatchOptions
): LlkbPatternMatch | null {
  const llkbRoot = getInferredLlkbRoot(options.llkbRoot);
  const patterns = loadDiscoveredPatternsForMatching(llkbRoot);

  if (patterns.length === 0) return null;

  // Exact matches - collect all, pick highest layer priority
  const exactMatches = patterns.filter(
    (p) => p.normalizedText === normalizedText && p.confidence >= minConfidence
  );

  if (exactMatches.length > 0) {
    // Sort by layer priority (highest first), then by confidence
    exactMatches.sort((a, b) => {
      const layerDiff = (LAYER_PRIORITY[b.layer] ?? 0) - (LAYER_PRIORITY[a.layer] ?? 0);
      return layerDiff !== 0 ? layerDiff : b.confidence - a.confidence;
    });

    const best = exactMatches[0]!;
    // Discovered patterns store type name strings; learned patterns store full IR objects.
    let primitive: IRPrimitive | null;
    if (isIRPrimitiveObject(best.mappedPrimitive)) {
      primitive = best.mappedPrimitive;
    } else {
      // Convert string type name (e.g. "click") to a full IRPrimitive object
      primitive = createIRPrimitiveFromDiscovered(
        best.mappedPrimitive as unknown as string,
        best.selectorHints
      );
    }
    if (!primitive) return null; // unrecognized type name
    return {
      patternId: best.id,
      primitive,
      confidence: best.confidence,
    };
  }

  // Fuzzy match with layer priority
  if (useFuzzyMatch) {
    let bestMatch: DiscoveredPatternEntry | null = null;
    let bestSimilarity = 0;
    let bestLayerPriority = 0;

    for (const pattern of patterns) {
      if (pattern.confidence < minConfidence) continue;

      const similarity = calculateSimilarity(normalizedText, pattern.normalizedText);

      if (similarity < minSimilarity) continue;

      const layerPriority = LAYER_PRIORITY[pattern.layer] ?? 0;

      // Prefer higher layer, then higher similarity
      if (
        layerPriority > bestLayerPriority ||
        (layerPriority === bestLayerPriority && similarity > bestSimilarity)
      ) {
        bestMatch = pattern;
        bestSimilarity = similarity;
        bestLayerPriority = layerPriority;
      }
    }

    if (bestMatch) {
      // Discovered patterns store type name strings; learned patterns store full IR objects.
      let primitive: IRPrimitive | null;
      if (isIRPrimitiveObject(bestMatch.mappedPrimitive)) {
        primitive = bestMatch.mappedPrimitive;
      } else {
        primitive = createIRPrimitiveFromDiscovered(
          bestMatch.mappedPrimitive as unknown as string,
          bestMatch.selectorHints
        );
      }
      if (!primitive) return null; // unrecognized type name
      return {
        patternId: bestMatch.id,
        primitive,
        confidence: bestMatch.confidence * bestSimilarity,
      };
    }
  }

  return null;
}

/**
 * Generate a regex pattern from a learned text pattern
 * This is a heuristic approach - complex patterns may need manual refinement
 */
export function generateRegexFromText(text: string): string {
  const pattern = text
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
    unlinkSync(filePath);
  }
  // Invalidate cache when clearing patterns
  invalidatePatternCache();
}
