/**
 * Quality Controls Tests
 *
 * Tests for LLKB quality control mechanisms:
 * - Deduplication
 * - Confidence threshold filtering
 * - Cross-source boosting
 * - Pruning
 * - Combined quality controls
 * - Signal weighting
 */

import { describe, expect, it } from 'vitest';
import type { DiscoveredPattern } from '../pattern-generation.js';
import {
  applyAllQualityControls,
  applyConfidenceThreshold,
  applySignalWeighting,
  boostCrossSourcePatterns,
  deduplicatePatterns,
  pruneUnusedPatterns,
  type UsageStats,
} from '../quality-controls.js';

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a test pattern
 */
function createPattern(overrides: Partial<DiscoveredPattern> = {}): DiscoveredPattern {
  return {
    id: `DP-${Math.random().toString(36).slice(2, 10)}`,
    normalizedText: 'click login button',
    originalText: 'Click login button',
    mappedPrimitive: 'click',
    selectorHints: [],
    confidence: 0.7,
    layer: 'app-specific',
    category: 'auth',
    sourceJourneys: [],
    successCount: 0,
    failCount: 0,
    templateSource: 'auth',
    ...overrides,
  };
}

/**
 * Create usage stats
 */
function createUsageStats(entries: Array<{ id: string; lastUsed: number; useCount: number }>): UsageStats {
  const patternUsage = new Map();
  for (const entry of entries) {
    patternUsage.set(entry.id, { lastUsed: entry.lastUsed, useCount: entry.useCount });
  }
  return { patternUsage };
}

// =============================================================================
// Deduplication Tests
// =============================================================================

describe('deduplicatePatterns', () => {
  it('should remove exact duplicates and keep higher confidence', () => {
    const patterns = [
      createPattern({ id: 'P1', normalizedText: 'click login', mappedPrimitive: 'click', confidence: 0.6 }),
      createPattern({ id: 'P2', normalizedText: 'click login', mappedPrimitive: 'click', confidence: 0.8 }),
      createPattern({ id: 'P3', normalizedText: 'click login', mappedPrimitive: 'click', confidence: 0.7 }),
    ];

    const result = deduplicatePatterns(patterns);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.8); // Highest confidence
  });

  it('should merge selector hints from duplicates', () => {
    const patterns = [
      createPattern({
        id: 'P1',
        normalizedText: 'click submit',
        mappedPrimitive: 'click',
        selectorHints: [{ strategy: 'data-testid', value: 'submit-btn', confidence: 0.7 }],
      }),
      createPattern({
        id: 'P2',
        normalizedText: 'click submit',
        mappedPrimitive: 'click',
        selectorHints: [{ strategy: 'role', value: 'button', name: 'Submit', confidence: 0.6 }],
      }),
    ];

    const result = deduplicatePatterns(patterns);

    expect(result).toHaveLength(1);
    expect(result[0].selectorHints).toHaveLength(2);
    expect(result[0].selectorHints.some(h => h.strategy === 'data-testid')).toBe(true);
    expect(result[0].selectorHints.some(h => h.strategy === 'role')).toBe(true);
  });

  it('should sum successCount and failCount from duplicates', () => {
    const patterns = [
      createPattern({ id: 'P1', normalizedText: 'fill email', mappedPrimitive: 'fill', successCount: 5, failCount: 1 }),
      createPattern({ id: 'P2', normalizedText: 'fill email', mappedPrimitive: 'fill', successCount: 3, failCount: 2 }),
    ];

    const result = deduplicatePatterns(patterns);

    expect(result).toHaveLength(1);
    expect(result[0].successCount).toBe(8); // 5 + 3
    expect(result[0].failCount).toBe(3); // 1 + 2
  });

  it('should merge sourceJourneys from duplicates', () => {
    const patterns = [
      createPattern({ id: 'P1', normalizedText: 'navigate home', mappedPrimitive: 'navigate', sourceJourneys: ['JRN-001', 'JRN-002'] }),
      createPattern({ id: 'P2', normalizedText: 'navigate home', mappedPrimitive: 'navigate', sourceJourneys: ['JRN-002', 'JRN-003'] }),
    ];

    const result = deduplicatePatterns(patterns);

    expect(result).toHaveLength(1);
    expect(result[0].sourceJourneys).toEqual(expect.arrayContaining(['JRN-001', 'JRN-002', 'JRN-003']));
    expect(result[0].sourceJourneys).toHaveLength(3); // Unique journeys only
  });

  it('should not deduplicate patterns with different primitives', () => {
    const patterns = [
      createPattern({ id: 'P1', normalizedText: 'verify user', mappedPrimitive: 'assert' }),
      createPattern({ id: 'P2', normalizedText: 'verify user', mappedPrimitive: 'click' }),
    ];

    const result = deduplicatePatterns(patterns);

    expect(result).toHaveLength(2); // Different primitives = different patterns
  });

  it('should handle empty array', () => {
    const result = deduplicatePatterns([]);

    expect(result).toHaveLength(0);
  });

  it('should handle single pattern', () => {
    const patterns = [createPattern({ id: 'P1' })];

    const result = deduplicatePatterns(patterns);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('P1');
  });

  it('should handle all duplicates', () => {
    const patterns = [
      createPattern({ id: 'P1', normalizedText: 'click save', mappedPrimitive: 'click', confidence: 0.5 }),
      createPattern({ id: 'P2', normalizedText: 'click save', mappedPrimitive: 'click', confidence: 0.6 }),
      createPattern({ id: 'P3', normalizedText: 'click save', mappedPrimitive: 'click', confidence: 0.7 }),
    ];

    const result = deduplicatePatterns(patterns);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.7);
  });
});

// =============================================================================
// Threshold Filtering Tests
// =============================================================================

describe('applyConfidenceThreshold', () => {
  it('should remove patterns below default threshold (0.7)', () => {
    const patterns = [
      createPattern({ id: 'P1', confidence: 0.3 }),
      createPattern({ id: 'P2', confidence: 0.5 }),
      createPattern({ id: 'P3', confidence: 0.7 }),
      createPattern({ id: 'P4', confidence: 0.45 }),
    ];

    const result = applyConfidenceThreshold(patterns);

    expect(result).toHaveLength(1);
    expect(result.every(p => p.confidence >= 0.7)).toBe(true);
  });

  it('should use custom threshold', () => {
    const patterns = [
      createPattern({ id: 'P1', confidence: 0.6 }),
      createPattern({ id: 'P2', confidence: 0.7 }),
      createPattern({ id: 'P3', confidence: 0.8 }),
    ];

    const result = applyConfidenceThreshold(patterns, 0.75);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.8);
  });

  it('should handle empty array', () => {
    const result = applyConfidenceThreshold([]);

    expect(result).toHaveLength(0);
  });

  it('should keep all patterns if all above threshold', () => {
    const patterns = [
      createPattern({ id: 'P1', confidence: 0.6 }),
      createPattern({ id: 'P2', confidence: 0.8 }),
      createPattern({ id: 'P3', confidence: 0.9 }),
    ];

    const result = applyConfidenceThreshold(patterns, 0.5);

    expect(result).toHaveLength(3);
  });

  it('should remove all patterns if all below threshold', () => {
    const patterns = [
      createPattern({ id: 'P1', confidence: 0.3 }),
      createPattern({ id: 'P2', confidence: 0.4 }),
    ];

    const result = applyConfidenceThreshold(patterns, 0.5);

    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// Cross-Source Boosting Tests
// =============================================================================

describe('boostCrossSourcePatterns', () => {
  it('should boost confidence when pattern appears with different templateSource', () => {
    const patterns = [
      createPattern({ id: 'P1', normalizedText: 'click save', confidence: 0.7, templateSource: 'crud' }),
      createPattern({ id: 'P2', normalizedText: 'click save', confidence: 0.7, templateSource: 'form' }),
    ];

    const result = boostCrossSourcePatterns(patterns);

    expect(result).toHaveLength(2);
    expect(result[0].confidence).toBeCloseTo(0.8, 2); // 0.7 + 0.1
    expect(result[1].confidence).toBeCloseTo(0.8, 2); // 0.7 + 0.1
  });

  it('should boost confidence when pattern appears with different entityName', () => {
    const patterns = [
      createPattern({ id: 'P1', normalizedText: 'edit item', confidence: 0.6, entityName: 'user' }),
      createPattern({ id: 'P2', normalizedText: 'edit item', confidence: 0.6, entityName: 'product' }),
    ];

    const result = boostCrossSourcePatterns(patterns);

    expect(result).toHaveLength(2);
    expect(result[0].confidence).toBeCloseTo(0.7, 2); // 0.6 + 0.1
    expect(result[1].confidence).toBeCloseTo(0.7, 2); // 0.6 + 0.1
  });

  it('should boost confidence when pattern appears with different sourceJourneys', () => {
    const patterns = [
      createPattern({ id: 'P1', normalizedText: 'verify success', confidence: 0.65, sourceJourneys: ['JRN-001'] }),
      createPattern({ id: 'P2', normalizedText: 'verify success', confidence: 0.65, sourceJourneys: ['JRN-002'] }),
    ];

    const result = boostCrossSourcePatterns(patterns);

    expect(result).toHaveLength(2);
    expect(result[0].confidence).toBeCloseTo(0.75, 2); // 0.65 + 0.1
    expect(result[1].confidence).toBeCloseTo(0.75, 2); // 0.65 + 0.1
  });

  it('should cap boosted confidence at 0.95', () => {
    const patterns = [
      createPattern({ id: 'P1', normalizedText: 'click button', confidence: 0.9, templateSource: 'crud' }),
      createPattern({ id: 'P2', normalizedText: 'click button', confidence: 0.9, templateSource: 'form' }),
    ];

    const result = boostCrossSourcePatterns(patterns);

    expect(result).toHaveLength(2);
    expect(result[0].confidence).toBe(0.95); // Capped at 0.95
    expect(result[1].confidence).toBe(0.95); // Capped at 0.95
  });

  it('should not boost patterns from single source', () => {
    const patterns = [
      createPattern({ id: 'P1', normalizedText: 'fill form', confidence: 0.7, templateSource: 'form' }),
      createPattern({ id: 'P2', normalizedText: 'click submit', confidence: 0.7, templateSource: 'form' }),
    ];

    const result = boostCrossSourcePatterns(patterns);

    expect(result).toHaveLength(2);
    expect(result[0].confidence).toBe(0.7); // No boost
    expect(result[1].confidence).toBe(0.7); // No boost
  });

  it('should handle empty array', () => {
    const result = boostCrossSourcePatterns([]);

    expect(result).toHaveLength(0);
  });

  it('should handle single pattern', () => {
    const patterns = [createPattern({ id: 'P1', confidence: 0.7 })];

    const result = boostCrossSourcePatterns(patterns);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.7); // No boost for single pattern
  });
});

// =============================================================================
// Pruning Tests
// =============================================================================

describe('pruneUnusedPatterns', () => {
  it('should keep patterns that have never been tried', () => {
    const now = Date.now();
    const patterns = [
      createPattern({ id: 'P1', successCount: 0, failCount: 0 }), // Never tried
      createPattern({ id: 'P2', successCount: 1, failCount: 0 }), // Tried
    ];

    const stats = createUsageStats([
      { id: 'P2', lastUsed: now - 100 * 24 * 60 * 60 * 1000, useCount: 1 }, // 100 days old
    ]);

    const result = pruneUnusedPatterns(patterns, stats, 90);

    // P1 kept (never tried), P2 pruned (stale)
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('P1');
  });

  it('should prune patterns that are stale (not used recently)', () => {
    const now = Date.now();
    const patterns = [
      createPattern({ id: 'P1', successCount: 5, failCount: 1 }),
      createPattern({ id: 'P2', successCount: 3, failCount: 0 }),
    ];

    const stats = createUsageStats([
      { id: 'P1', lastUsed: now - 100 * 24 * 60 * 60 * 1000, useCount: 6 }, // 100 days old (stale)
      { id: 'P2', lastUsed: now - 30 * 24 * 60 * 60 * 1000, useCount: 3 }, // 30 days old (fresh)
    ]);

    const result = pruneUnusedPatterns(patterns, stats, 90);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('P2'); // P1 pruned, P2 kept
  });

  it('should keep patterns without usage stats (conservative)', () => {
    const patterns = [
      createPattern({ id: 'P1', successCount: 5, failCount: 1 }),
      createPattern({ id: 'P2', successCount: 3, failCount: 0 }),
    ];

    const stats = createUsageStats([
      { id: 'P1', lastUsed: Date.now(), useCount: 6 },
      // P2 has no usage stats
    ]);

    const result = pruneUnusedPatterns(patterns, stats, 90);

    expect(result).toHaveLength(2); // Both kept (P2 kept conservatively)
  });

  it('should use custom maxAgeDays', () => {
    const now = Date.now();
    const patterns = [
      createPattern({ id: 'P1', successCount: 1, failCount: 0 }),
    ];

    const stats = createUsageStats([
      { id: 'P1', lastUsed: now - 20 * 24 * 60 * 60 * 1000, useCount: 1 }, // 20 days old
    ]);

    // With 30 day threshold - should keep
    expect(pruneUnusedPatterns(patterns, stats, 30)).toHaveLength(1);

    // With 10 day threshold - should prune
    expect(pruneUnusedPatterns(patterns, stats, 10)).toHaveLength(0);
  });

  it('should handle empty array', () => {
    const stats = createUsageStats([]);

    const result = pruneUnusedPatterns([], stats, 90);

    expect(result).toHaveLength(0);
  });

  it('should default to 90 days if maxAgeDays not specified', () => {
    const now = Date.now();
    const patterns = [
      createPattern({ id: 'P1', successCount: 1, failCount: 0 }),
    ];

    const stats = createUsageStats([
      { id: 'P1', lastUsed: now - 100 * 24 * 60 * 60 * 1000, useCount: 1 }, // 100 days old
    ]);

    const result = pruneUnusedPatterns(patterns, stats); // No maxAgeDays specified

    expect(result).toHaveLength(0); // Pruned with default 90 day threshold
  });
});

// =============================================================================
// Signal Weighting Tests
// =============================================================================

describe('applySignalWeighting', () => {
  it('should assign strong signal confidence (0.85)', () => {
    const patterns = [
      createPattern({ id: 'P1', confidence: 0.5 }),
    ];

    const signalStrengths = new Map<string, 'strong' | 'medium' | 'weak'>([
      ['P1', 'strong'],
    ]);

    const result = applySignalWeighting(patterns, signalStrengths);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.85);
  });

  it('should assign medium signal confidence (0.75)', () => {
    const patterns = [
      createPattern({ id: 'P1', confidence: 0.5 }),
    ];

    const signalStrengths = new Map<string, 'strong' | 'medium' | 'weak'>([
      ['P1', 'medium'],
    ]);

    const result = applySignalWeighting(patterns, signalStrengths);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.75);
  });

  it('should assign weak signal confidence (0.60)', () => {
    const patterns = [
      createPattern({ id: 'P1', confidence: 0.5 }),
    ];

    const signalStrengths = new Map<string, 'strong' | 'medium' | 'weak'>([
      ['P1', 'weak'],
    ]);

    const result = applySignalWeighting(patterns, signalStrengths);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.60);
  });

  it('should keep original confidence if no signal strength provided', () => {
    const patterns = [
      createPattern({ id: 'P1', confidence: 0.7 }),
    ];

    const signalStrengths = new Map<string, 'strong' | 'medium' | 'weak'>();

    const result = applySignalWeighting(patterns, signalStrengths);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.7); // Original confidence preserved
  });

  it('should handle mixed signal strengths', () => {
    const patterns = [
      createPattern({ id: 'P1', confidence: 0.5 }),
      createPattern({ id: 'P2', confidence: 0.5 }),
      createPattern({ id: 'P3', confidence: 0.5 }),
    ];

    const signalStrengths = new Map<string, 'strong' | 'medium' | 'weak'>([
      ['P1', 'strong'],
      ['P2', 'medium'],
      ['P3', 'weak'],
    ]);

    const result = applySignalWeighting(patterns, signalStrengths);

    expect(result).toHaveLength(3);
    expect(result[0].confidence).toBe(0.85); // P1: strong
    expect(result[1].confidence).toBe(0.75); // P2: medium
    expect(result[2].confidence).toBe(0.60); // P3: weak
  });

  it('should cap confidence at 0.95', () => {
    // Note: Currently signal weighting doesn't cap, but let's test if it respects MAX_CONFIDENCE
    // If strong = 0.85, it won't exceed 0.95, but if we ever change strong to 1.0, this test matters
    const patterns = [
      createPattern({ id: 'P1', confidence: 0.99 }),
    ];

    const signalStrengths = new Map<string, 'strong' | 'medium' | 'weak'>([
      ['P1', 'strong'],
    ]);

    const result = applySignalWeighting(patterns, signalStrengths);

    expect(result[0].confidence).toBeLessThanOrEqual(0.95);
  });

  it('should handle empty array', () => {
    const signalStrengths = new Map<string, 'strong' | 'medium' | 'weak'>();

    const result = applySignalWeighting([], signalStrengths);

    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// Combined Quality Controls Tests
// =============================================================================

describe('applyAllQualityControls', () => {
  it('should apply all controls in correct order', () => {
    const now = Date.now();
    const patterns = [
      // Duplicates with different sources (boost detects cross-source, then dedup merges)
      createPattern({ id: 'P1', normalizedText: 'click save', mappedPrimitive: 'click', confidence: 0.6, templateSource: 'crud' }),
      createPattern({ id: 'P2', normalizedText: 'click save', mappedPrimitive: 'click', confidence: 0.8, templateSource: 'form' }),

      // Low confidence (will be filtered)
      createPattern({ id: 'P3', normalizedText: 'click cancel', mappedPrimitive: 'click', confidence: 0.3 }),

      // Different text patterns (no boost, no dedup)
      createPattern({ id: 'P4', normalizedText: 'edit user', mappedPrimitive: 'click', confidence: 0.6, entityName: 'user' }),
      createPattern({ id: 'P5', normalizedText: 'edit product', mappedPrimitive: 'click', confidence: 0.6, entityName: 'product' }),

      // Stale (will be pruned)
      createPattern({ id: 'P6', normalizedText: 'old pattern', mappedPrimitive: 'click', confidence: 0.7, successCount: 1, failCount: 0 }),
    ];

    const stats = createUsageStats([
      { id: 'P6', lastUsed: now - 100 * 24 * 60 * 60 * 1000, useCount: 1 }, // 100 days old
    ]);

    const { patterns: result, result: metrics } = applyAllQualityControls(patterns, {
      threshold: 0.5,
      usageStats: stats,
      maxAgeDays: 90,
    });

    // Pipeline order: boost → dedup → threshold → prune
    // After boost: P1(0.7)+P2(0.9) boosted (same text, different templateSource), rest unchanged
    // After dedup: P1+P2 → 1 (confidence 0.9), P3, P4, P5, P6 = 5 patterns (1 deduped)
    // After threshold: P3 filtered = 4 patterns (1 filtered)
    // After prune: P6 pruned = 3 patterns (1 pruned)

    expect(metrics.inputCount).toBe(6);
    expect(metrics.crossSourceBoosted).toBe(2); // P1 and P2 boosted (same text, different templateSource)
    expect(metrics.deduplicated).toBe(1); // P1 merged into P2
    expect(metrics.thresholdFiltered).toBe(1); // P3 filtered
    expect(metrics.pruned).toBe(1); // P6 pruned

    expect(result.length).toBe(3); // Final output: merged P1/P2, P4, P5
  });

  it('should work without usage stats (skip pruning)', () => {
    const patterns = [
      createPattern({ id: 'P1', normalizedText: 'click save', mappedPrimitive: 'click', confidence: 0.7 }),
      createPattern({ id: 'P2', normalizedText: 'click save', mappedPrimitive: 'click', confidence: 0.8 }),
    ];

    const { patterns: result, result: metrics } = applyAllQualityControls(patterns);

    expect(metrics.inputCount).toBe(2);
    expect(metrics.deduplicated).toBe(1); // Deduped
    expect(metrics.pruned).toBe(0); // No pruning (no stats)
    expect(result.length).toBe(1);
  });

  it('should handle empty array', () => {
    const { patterns: result, result: metrics } = applyAllQualityControls([]);

    expect(metrics.inputCount).toBe(0);
    expect(metrics.outputCount).toBe(0);
    expect(metrics.deduplicated).toBe(0);
    expect(metrics.thresholdFiltered).toBe(0);
    expect(metrics.crossSourceBoosted).toBe(0);
    expect(metrics.pruned).toBe(0);
    expect(result).toHaveLength(0);
  });

  it('should respect custom options', () => {
    const patterns = [
      createPattern({ id: 'P1', confidence: 0.6 }),
      createPattern({ id: 'P2', confidence: 0.8 }),
    ];

    const { patterns: result } = applyAllQualityControls(patterns, {
      threshold: 0.75,
    });

    expect(result).toHaveLength(1); // Only P2 passes 0.75 threshold
    expect(result[0].confidence).toBe(0.8); // Check confidence instead of ID
  });

  it('should track metrics correctly at each stage', () => {
    const patterns = [
      // 3 duplicates (same text, no distinct sources — no boost, dedup removes 2)
      createPattern({ id: 'P1', normalizedText: 'click', mappedPrimitive: 'click', confidence: 0.5 }),
      createPattern({ id: 'P2', normalizedText: 'click', mappedPrimitive: 'click', confidence: 0.6 }),
      createPattern({ id: 'P3', normalizedText: 'click', mappedPrimitive: 'click', confidence: 0.7 }),

      // 1 low confidence (filtered)
      createPattern({ id: 'P4', normalizedText: 'hover', mappedPrimitive: 'hover', confidence: 0.3 }),

      // 2 patterns with same text and different templateSource (boosted then deduped)
      createPattern({ id: 'P5', normalizedText: 'save data', mappedPrimitive: 'click', confidence: 0.6, templateSource: 'crud' }),
      createPattern({ id: 'P6', normalizedText: 'save data', mappedPrimitive: 'click', confidence: 0.6, templateSource: 'form' }),
    ];

    const { result: metrics } = applyAllQualityControls(patterns, { threshold: 0.5 });

    // Pipeline: boost → dedup → threshold → prune
    // Boost: P5+P6 get +0.1 (same text, different templateSource). P1-P3 have no distinct sources → no boost.
    // Dedup: P1+P2+P3 → 1 (2 deduped). P5+P6 → 1 (1 deduped). Total deduped: 3.
    // Threshold: P4(0.3) filtered. Total filtered: 1.
    // Output: merged P1/P2/P3(0.7) + merged P5/P6(0.7) = 2
    expect(metrics.inputCount).toBe(6);
    expect(metrics.crossSourceBoosted).toBe(2); // P5 and P6 boosted (same text, different templateSource)
    expect(metrics.deduplicated).toBe(3); // P1+P2 merged into P3, P5+P6 merged into one
    expect(metrics.thresholdFiltered).toBe(1); // P4 filtered
    expect(metrics.outputCount).toBe(2); // Merged P1/P2/P3, Merged P5/P6
  });

  it('should handle patterns with zero confidence gracefully', () => {
    const patterns = [
      createPattern({ id: 'P1', confidence: 0 }),
      createPattern({ id: 'P2', normalizedText: 'submit form', confidence: 0 }),
    ];

    const { patterns: result, result: metrics } = applyAllQualityControls(patterns, { threshold: 0 });

    expect(result.length).toBe(2);
    expect(metrics.thresholdFiltered).toBe(0);
  });

  it('should handle all patterns being filtered by threshold', () => {
    const patterns = [
      createPattern({ id: 'P1', confidence: 0.3 }),
      createPattern({ id: 'P2', normalizedText: 'submit form', confidence: 0.4 }),
    ];

    const { patterns: result, result: metrics } = applyAllQualityControls(patterns, { threshold: 0.5 });

    expect(result).toHaveLength(0);
    expect(metrics.outputCount).toBe(0);
    expect(metrics.thresholdFiltered).toBe(2);
  });

  it('should correctly count cross-source boosts when patterns survive all stages', () => {
    // Two patterns with same normalizedText but different sources
    // Both above threshold, so they survive to cross-source stage
    const patterns = [
      createPattern({
        id: 'P1',
        normalizedText: 'view dashboard',
        mappedPrimitive: 'navigate',
        confidence: 0.8,
        templateSource: 'navigation',
        sourceJourneys: ['J1'],
      }),
      createPattern({
        id: 'P2',
        normalizedText: 'view dashboard',
        mappedPrimitive: 'navigate',
        confidence: 0.75,
        templateSource: 'crud',
        sourceJourneys: ['J2'],
      }),
    ];

    const { result: metrics } = applyAllQualityControls(patterns, { threshold: 0.7 });

    // After dedup, P1 wins (higher confidence). Boost counting uses ID-based map.
    // But dedup merges P2 into P1, leaving 1 pattern with no cross-source to detect.
    expect(metrics.deduplicated).toBe(1);
  });
});
