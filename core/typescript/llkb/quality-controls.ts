/**
 * LLKB Quality Controls Module
 *
 * Provides quality control mechanisms for discovered patterns:
 * - Deduplication (remove duplicates, keep higher confidence)
 * - Confidence threshold filtering
 * - Cross-source boosting (patterns found in multiple sources)
 * - Pruning (remove stale patterns)
 * - Signal weighting (assign base confidence based on source strength)
 *
 * @module llkb/quality-controls
 */

import type { DiscoveredPattern } from './pattern-generation.js';

// =============================================================================
// Constants
// =============================================================================

/** Default confidence threshold for filtering (spec AC3: >= 0.7) */
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/** Default maximum age in days for pruning */
const DEFAULT_MAX_AGE_DAYS = 90;

/** Confidence boost for cross-source patterns */
const CROSS_SOURCE_BOOST = 0.1;

/** Maximum confidence cap */
const MAX_CONFIDENCE = 0.95;

/** Milliseconds per day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Signal strength base confidences */
const SIGNAL_CONFIDENCES = {
  strong: 0.85,
  medium: 0.75,
  weak: 0.60,
};

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Usage statistics for pruning
 */
export interface UsageStats {
  /** Map of pattern ID to usage metadata */
  patternUsage: Map<string, { lastUsed: number; useCount: number }>;
}

/**
 * Quality control result with before/after metrics
 */
export interface QualityControlResult {
  /** Number of patterns before quality controls */
  inputCount: number;
  /** Number of patterns after quality controls */
  outputCount: number;
  /** Number of patterns removed by deduplication */
  deduplicated: number;
  /** Number of patterns removed by threshold filtering */
  thresholdFiltered: number;
  /** Number of patterns boosted by cross-source detection */
  crossSourceBoosted: number;
  /** Number of patterns removed by pruning */
  pruned: number;
}

// =============================================================================
// Deduplication
// =============================================================================

/**
 * Remove duplicate patterns by normalized text + IR primitive.
 * When duplicates found, keep the one with higher confidence.
 *
 * Deduplication key: `${pattern.normalizedText}::${pattern.mappedPrimitive}`
 * When merging duplicates:
 * - Take the higher confidence
 * - Merge selectorHints (union)
 * - Sum successCount and failCount
 * - Preserve all unique templateSource and entityName values (for cross-source detection)
 *
 * @param patterns - Array of patterns (potentially with duplicates)
 * @returns Deduplicated array (higher confidence patterns preferred)
 */
export function deduplicatePatterns(patterns: DiscoveredPattern[]): DiscoveredPattern[] {
  const seen = new Map<string, DiscoveredPattern>();

  for (const pattern of patterns) {
    const key = `${pattern.normalizedText.toLowerCase()}::${pattern.mappedPrimitive}`;
    const existing = seen.get(key);

    if (!existing) {
      // First occurrence - store it with metadata preserved
      seen.set(key, {
        ...pattern,
        // Store original templateSource and entityName in a way that cross-source can detect
        // We'll keep the first one's values, but cross-source boosting will look at all patterns
      });
    } else {
      // Duplicate found - merge with existing
      const merged: DiscoveredPattern = {
        ...existing,
        confidence: Math.max(existing.confidence, pattern.confidence),
        successCount: existing.successCount + pattern.successCount,
        failCount: existing.failCount + pattern.failCount,
        sourceJourneys: Array.from(new Set([...existing.sourceJourneys, ...pattern.sourceJourneys])),
        selectorHints: mergeSelectors(existing.selectorHints, pattern.selectorHints),
        // Keep existing templateSource and entityName (first wins)
        // Cross-source boosting happens AFTER dedup, so it won't see these merged patterns as cross-source
      };

      seen.set(key, merged);
    }
  }

  return Array.from(seen.values());
}

/**
 * Merge selector hints from two patterns (union, deduplicated by value)
 */
function mergeSelectors(
  hints1: DiscoveredPattern['selectorHints'],
  hints2: DiscoveredPattern['selectorHints']
): DiscoveredPattern['selectorHints'] {
  const seen = new Map<string, DiscoveredPattern['selectorHints'][0]>();

  for (const hint of [...hints1, ...hints2]) {
    const key = `${hint.strategy}:${hint.value}`;
    const existing = seen.get(key);

    if (!existing || (hint.confidence && (!existing.confidence || hint.confidence > existing.confidence))) {
      seen.set(key, hint);
    }
  }

  return Array.from(seen.values());
}

// =============================================================================
// Confidence Threshold Filtering
// =============================================================================

/**
 * Filter patterns below the confidence threshold.
 *
 * @param patterns - Array of patterns
 * @param threshold - Minimum confidence threshold (default: 0.7 per spec AC3)
 * @returns Filtered array
 */
export function applyConfidenceThreshold(
  patterns: DiscoveredPattern[],
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): DiscoveredPattern[] {
  return patterns.filter(p => p.confidence >= threshold);
}

// =============================================================================
// Cross-Source Boosting
// =============================================================================

/**
 * Boost confidence of patterns found in multiple sources.
 * If a pattern text appears with different sourceJourneys or entityNames,
 * boost confidence by 0.1 (capped at 0.95).
 *
 * Cross-source boost: group by normalizedText, if same text appears from
 * 2+ different templateSource or entityName values, boost by 0.1
 *
 * @param patterns - Array of patterns
 * @returns Patterns with boosted confidence where applicable
 */
export function boostCrossSourcePatterns(patterns: DiscoveredPattern[]): DiscoveredPattern[] {
  // Group by normalized text
  const groups = new Map<string, DiscoveredPattern[]>();

  for (const pattern of patterns) {
    const key = pattern.normalizedText;
    const group = groups.get(key) || [];
    group.push(pattern);
    groups.set(key, group);
  }

  const boosted: DiscoveredPattern[] = [];

  // Convert Map values to array for iteration
  const groupsArray = Array.from(groups.values());

  for (const group of groupsArray) {
    if (group.length === 1) {
      // Single pattern - no boost needed
      boosted.push({ ...group[0] } as DiscoveredPattern);
      continue;
    }

    // Check if patterns come from different sources
    const templateSources = new Set(group.map(p => p.templateSource).filter(Boolean));
    const entityNames = new Set(group.map(p => p.entityName).filter(Boolean));
    const sourceJourneys = new Set(group.flatMap(p => p.sourceJourneys));

    // Calculate unique sources count
    const uniqueSources = Math.max(templateSources.size, entityNames.size, sourceJourneys.size);

    // If patterns come from 2+ different sources, boost confidence
    if (uniqueSources >= 2) {
      for (const pattern of group) {
        const newConfidence = Math.min(pattern.confidence + CROSS_SOURCE_BOOST, MAX_CONFIDENCE);
        boosted.push({ ...pattern, confidence: newConfidence });
      }
    } else {
      // No boost - just copy
      for (const pattern of group) {
        boosted.push({ ...pattern });
      }
    }
  }

  return boosted;
}

// =============================================================================
// Pruning
// =============================================================================

/**
 * Remove patterns that haven't been used in the specified time period.
 * Only prune patterns with successCount + failCount > 0 (i.e., patterns that
 * HAVE been tried but aren't being used anymore).
 * Never prune patterns that haven't been tried yet.
 *
 * @param patterns - Array of patterns
 * @param usageStats - Usage statistics with lastUsed timestamps
 * @param maxAgeDays - Maximum age in days before pruning (default: 90)
 * @returns Filtered array with stale patterns removed
 */
export function pruneUnusedPatterns(
  patterns: DiscoveredPattern[],
  usageStats: UsageStats,
  maxAgeDays: number = DEFAULT_MAX_AGE_DAYS
): DiscoveredPattern[] {
  const now = Date.now();
  const maxAgeMs = maxAgeDays * MS_PER_DAY;

  return patterns.filter(pattern => {
    const totalAttempts = pattern.successCount + pattern.failCount;

    // Never prune patterns that haven't been tried yet
    if (totalAttempts === 0) {
      return true;
    }

    // Check usage stats
    const usage = usageStats.patternUsage.get(pattern.id);

    if (!usage) {
      // No usage stats - keep the pattern (conservative approach)
      return true;
    }

    const age = now - usage.lastUsed;
    const isStale = age > maxAgeMs;

    // Keep if not stale
    return !isStale;
  });
}

// =============================================================================
// Signal Weighting
// =============================================================================

/**
 * Signal weighting: assign base confidence based on source strength.
 * Strong signals (routes, schemas): 0.85
 * Medium signals (i18n, component patterns): 0.75
 * Weak signals (string literals, guesses): 0.60
 *
 * @param patterns - Array of patterns
 * @param signalStrengths - Map of pattern ID to signal strength
 * @returns Patterns with confidence adjusted based on signal strength
 */
export function applySignalWeighting(
  patterns: DiscoveredPattern[],
  signalStrengths: Map<string, 'strong' | 'medium' | 'weak'>
): DiscoveredPattern[] {
  return patterns.map(pattern => {
    const strength = signalStrengths.get(pattern.id);

    if (!strength) {
      // No signal strength info - keep original confidence
      return { ...pattern };
    }

    const baseConfidence = SIGNAL_CONFIDENCES[strength];

    // Raise confidence to signal baseline if lower; never lower a pattern that
    // already has higher confidence (e.g., from learning/success accumulation)
    return {
      ...pattern,
      confidence: Math.min(Math.max(pattern.confidence, baseConfidence), MAX_CONFIDENCE),
    };
  });
}

// =============================================================================
// Combined Quality Controls
// =============================================================================

/**
 * Apply all quality controls in sequence.
 * Order: crossSource boost → deduplicate → threshold → prune
 *
 * Boost runs BEFORE dedup so that cross-source signal (templateSource, entityName)
 * is preserved when boost evaluates source diversity. Dedup then merges duplicates
 * with their already-boosted confidence. Threshold runs after boost so borderline
 * patterns that receive a cross-source boost can survive filtering.
 *
 * @param patterns - Array of patterns to process
 * @param options - Quality control options
 * @returns Object with processed patterns and result metrics
 */
export function applyAllQualityControls(
  patterns: DiscoveredPattern[],
  options?: {
    threshold?: number;
    usageStats?: UsageStats;
    maxAgeDays?: number;
  }
): { patterns: DiscoveredPattern[]; result: QualityControlResult } {
  const inputCount = patterns.length;

  // Step 1: Cross-source boosting (BEFORE dedup to preserve source diversity)
  const preboostConfidence = new Map<string, number>();
  for (const p of patterns) {
    preboostConfidence.set(p.id, p.confidence);
  }
  const afterBoost = boostCrossSourcePatterns(patterns);
  const crossSourceBoosted = afterBoost.filter(p => {
    const before = preboostConfidence.get(p.id);
    return before !== undefined && p.confidence > before;
  }).length;

  // Step 2: Deduplication (after boost, so merged patterns keep boosted confidence)
  const afterDedup = deduplicatePatterns(afterBoost);
  const deduplicated = afterBoost.length - afterDedup.length;

  // Step 3: Threshold filtering (after boost, so boosted patterns survive)
  const afterThreshold = applyConfidenceThreshold(afterDedup, options?.threshold);
  const thresholdFiltered = afterDedup.length - afterThreshold.length;

  // Step 4: Pruning (if usage stats provided)
  let afterPrune = afterThreshold;
  let pruned = 0;

  if (options?.usageStats) {
    afterPrune = pruneUnusedPatterns(afterThreshold, options.usageStats, options?.maxAgeDays);
    pruned = afterThreshold.length - afterPrune.length;
  }

  const outputCount = afterPrune.length;

  return {
    patterns: afterPrune,
    result: {
      inputCount,
      outputCount,
      deduplicated,
      thresholdFiltered,
      crossSourceBoosted,
      pruned,
    },
  };
}
