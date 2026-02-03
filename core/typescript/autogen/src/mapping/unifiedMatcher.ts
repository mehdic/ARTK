/**
 * Unified Pattern Matcher - Single entry point for all pattern matching
 * Combines core patterns (patterns.ts) with LLKB learned patterns and fuzzy matching
 *
 * Coverage Flow: Normalization → Core Patterns → LLKB → Fuzzy → LLM → TODO
 *
 * This eliminates duplicate pattern logic in plan.ts and ensures consistent
 * pattern matching behavior across the entire system.
 *
 * @see research/2026-02-03_unified-pattern-matching-plan.md Phase 2
 * @see research/2026-02-03_multi-ai-debate-coverage-improvement.md
 */
import { allPatterns, type StepPattern } from './patterns.js';
import { matchLlkbPattern, loadLearnedPatterns } from '../llkb/patternExtension.js';
import { fuzzyMatch } from './fuzzyMatcher.js';
import type { IRPrimitive } from '../ir/types.js';

/**
 * Options for unified pattern matching
 */
export interface UnifiedMatchOptions {
  /** Use LLKB learned patterns as fallback (default: true) */
  useLlkb?: boolean;
  /** LLKB root directory (auto-detected if not provided) */
  llkbRoot?: string;
  /** Minimum confidence for LLKB patterns (default: 0.7) */
  minLlkbConfidence?: number;
  /** Use fuzzy matching as final fallback before TODO (default: true) */
  useFuzzy?: boolean;
  /** Minimum similarity for fuzzy matching (default: 0.85) */
  minFuzzySimilarity?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Result of unified pattern matching
 */
export interface UnifiedMatchResult {
  /** The matched IR primitive, or null if no match */
  primitive: IRPrimitive | null;
  /** Source of the match */
  source: 'core' | 'llkb' | 'fuzzy' | 'none';
  /** Pattern name that matched (if core or fuzzy) */
  patternName?: string;
  /** LLKB pattern ID (if LLKB) */
  llkbPatternId?: string;
  /** LLKB confidence (if LLKB) */
  llkbConfidence?: number;
  /** Fuzzy match similarity score (if fuzzy) */
  fuzzySimilarity?: number;
  /** Fuzzy matched example (if fuzzy) */
  fuzzyMatchedExample?: string;
}

/**
 * Match step text against unified pattern system
 *
 * Priority order (Coverage Flow):
 * 1. Core patterns from patterns.ts (84+ patterns)
 * 2. LLKB learned patterns (dynamic, confidence-filtered)
 * 3. Fuzzy matching (high similarity threshold, 0.85+)
 * 4. No match → TODO (or LLM fallback in future)
 *
 * @param text - Step text to match
 * @param options - Matching options
 * @returns Match result with primitive and source
 */
export function unifiedMatch(
  text: string,
  options: UnifiedMatchOptions = {}
): UnifiedMatchResult {
  const {
    useLlkb = true,
    llkbRoot,
    minLlkbConfidence = 0.7,
    useFuzzy = true,
    minFuzzySimilarity = 0.85,
    debug = false,
  } = options;

  const trimmedText = text.trim();

  // 1. Try core patterns first (highest priority)
  for (const pattern of allPatterns) {
    const match = trimmedText.match(pattern.regex);
    if (match) {
      const primitive = pattern.extract(match);
      if (primitive) {
        if (debug) {
          console.log(`[UnifiedMatcher] Core match: ${pattern.name} for "${trimmedText}"`);
        }
        return {
          primitive,
          source: 'core',
          patternName: pattern.name,
        };
      }
    }
  }

  // 2. Try LLKB patterns as fallback
  if (useLlkb) {
    try {
      const llkbMatch = matchLlkbPattern(trimmedText, {
        llkbRoot,
        minConfidence: minLlkbConfidence,
      });

      if (llkbMatch) {
        if (debug) {
          console.log(
            `[UnifiedMatcher] LLKB match: ${llkbMatch.patternId} (confidence: ${llkbMatch.confidence}) for "${trimmedText}"`
          );
        }
        return {
          primitive: llkbMatch.primitive,
          source: 'llkb',
          llkbPatternId: llkbMatch.patternId,
          llkbConfidence: llkbMatch.confidence,
        };
      }
    } catch (err) {
      // LLKB might not be initialized - continue without it
      if (debug) {
        console.log(`[UnifiedMatcher] LLKB lookup failed: ${err}`);
      }
    }
  }

  // 3. Try fuzzy matching as final fallback before TODO
  if (useFuzzy) {
    try {
      const fuzzyResult = fuzzyMatch(trimmedText, {
        minSimilarity: minFuzzySimilarity,
        useNormalization: true,
        debug,
      });

      if (fuzzyResult) {
        if (debug) {
          console.log(
            `[UnifiedMatcher] Fuzzy match: ${fuzzyResult.patternName} (similarity: ${(fuzzyResult.similarity * 100).toFixed(1)}%) for "${trimmedText}"`
          );
        }
        return {
          primitive: fuzzyResult.primitive,
          source: 'fuzzy',
          patternName: fuzzyResult.patternName,
          fuzzySimilarity: fuzzyResult.similarity,
          fuzzyMatchedExample: fuzzyResult.matchedExample,
        };
      }
    } catch (err) {
      // Fuzzy matching failed - continue without it
      if (debug) {
        console.log(`[UnifiedMatcher] Fuzzy matching failed: ${err}`);
      }
    }
  }

  // 4. No match found → TODO (or LLM fallback in future)
  if (debug) {
    console.log(`[UnifiedMatcher] No match for: "${trimmedText}"`);
  }

  return {
    primitive: null,
    source: 'none',
  };
}

/**
 * Match step text and return all potential matches (for debugging)
 */
export function unifiedMatchAll(
  text: string,
  options: UnifiedMatchOptions = {}
): Array<{ source: 'core' | 'llkb' | 'fuzzy'; name: string; primitive: IRPrimitive; confidence?: number; similarity?: number }> {
  const trimmedText = text.trim();
  const matches: Array<{ source: 'core' | 'llkb' | 'fuzzy'; name: string; primitive: IRPrimitive; confidence?: number; similarity?: number }> = [];

  // Core patterns
  for (const pattern of allPatterns) {
    const match = trimmedText.match(pattern.regex);
    if (match) {
      const primitive = pattern.extract(match);
      if (primitive) {
        matches.push({
          source: 'core',
          name: pattern.name,
          primitive,
        });
      }
    }
  }

  // LLKB patterns
  if (options.useLlkb !== false) {
    try {
      const llkbMatch = matchLlkbPattern(trimmedText, {
        llkbRoot: options.llkbRoot,
        minConfidence: 0, // Get all LLKB matches for debugging
      });

      if (llkbMatch) {
        matches.push({
          source: 'llkb',
          name: llkbMatch.patternId,
          primitive: llkbMatch.primitive,
          confidence: llkbMatch.confidence,
        });
      }
    } catch {
      // Ignore LLKB errors in debug mode
    }
  }

  // Fuzzy matches
  if (options.useFuzzy !== false) {
    try {
      const fuzzyResult = fuzzyMatch(trimmedText, {
        minSimilarity: 0.5, // Lower threshold for debugging (show more candidates)
        useNormalization: true,
      });

      if (fuzzyResult) {
        matches.push({
          source: 'fuzzy',
          name: fuzzyResult.patternName,
          primitive: fuzzyResult.primitive,
          similarity: fuzzyResult.similarity,
        });
      }
    } catch {
      // Ignore fuzzy errors in debug mode
    }
  }

  return matches;
}

/**
 * Get statistics about the unified matcher
 */
export function getUnifiedMatcherStats(options?: { llkbRoot?: string }): {
  corePatternCount: number;
  llkbPatternCount: number;
  totalPatterns: number;
  coreCategories: Record<string, number>;
} {
  let llkbPatternCount = 0;

  try {
    const llkbPatterns = loadLearnedPatterns({ llkbRoot: options?.llkbRoot });
    llkbPatternCount = llkbPatterns.length;
  } catch {
    // LLKB might not be available
  }

  // Count core patterns by category
  const coreCategories: Record<string, number> = {};
  for (const pattern of allPatterns) {
    const category = pattern.name.split('-')[0] || 'other';
    coreCategories[category] = (coreCategories[category] || 0) + 1;
  }

  return {
    corePatternCount: allPatterns.length,
    llkbPatternCount,
    totalPatterns: allPatterns.length + llkbPatternCount,
    coreCategories,
  };
}

/**
 * Warm up the pattern cache for better performance
 * Call this before batch processing
 */
export async function warmUpUnifiedMatcher(options?: { llkbRoot?: string }): Promise<void> {
  // Load LLKB patterns into cache
  try {
    loadLearnedPatterns({ llkbRoot: options?.llkbRoot, bypassCache: true });
  } catch {
    // LLKB might not be available
  }
}

/**
 * Check if text matches any pattern (without extracting)
 * Useful for quick filtering
 */
export function hasPatternMatch(text: string, options: UnifiedMatchOptions = {}): boolean {
  const result = unifiedMatch(text, options);
  return result.primitive !== null;
}

/**
 * Get pattern name for matched text (for telemetry/logging)
 */
export function getMatchedPatternName(text: string, options: UnifiedMatchOptions = {}): string | null {
  const result = unifiedMatch(text, options);

  if (result.source === 'core' && result.patternName) {
    return result.patternName;
  }

  if (result.source === 'llkb' && result.llkbPatternId) {
    return `llkb:${result.llkbPatternId}`;
  }

  return null;
}

/**
 * Export for testing - get all core patterns
 */
export function getCorePatterns(): StepPattern[] {
  return [...allPatterns];
}
