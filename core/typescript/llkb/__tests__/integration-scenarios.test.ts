/**
 * Integration Scenario Tests for F12 Pipeline (N1/N2/N3 Fixes)
 *
 * Verifies that signal weighting, pipeline classification, unmapped primitives,
 * confidence flow, and notification templates work correctly end-to-end.
 *
 * Fixes verified:
 * - N1: keyboard→press, drag→null in createIRPrimitiveFromDiscovered
 * - N2: applySignalWeighting uses Math.max — never lowers confidence
 * - N3: Template patterns reclassified from strongIds to mediumIds in pipeline.ts
 */

import { describe, expect, it } from 'vitest';
import type { DiscoveredPattern } from '../pattern-generation.js';
import {
  applyAllQualityControls,
  applySignalWeighting,
} from '../quality-controls.js';
import {
  createEntity,
  createModal,
  createRoute,
  createTable,
  type DiscoveredElements,
  generateAllPatterns,
  generateModalPatterns,
  generateNotificationPatterns,
  generateTablePatterns,
  NOTIFICATION_TEMPLATES,
} from '../template-generators.js';

// =============================================================================
// Test Utilities
// =============================================================================

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

// =============================================================================
// S1: Signal Weighting Math.max (N2)
// =============================================================================

describe('S1: Signal weighting Math.max', () => {
  it('should NOT lower a 0.90 pattern with strong signal (0.85)', () => {
    const pattern = createPattern({ id: 'P1', confidence: 0.90 });
    const strengths = new Map<string, 'strong' | 'medium' | 'weak'>([['P1', 'strong']]);
    const result = applySignalWeighting([pattern], strengths);

    expect(result[0].confidence).toBe(0.90);
  });

  it('should RAISE a 0.50 pattern to 0.85 with strong signal', () => {
    const pattern = createPattern({ id: 'P1', confidence: 0.50 });
    const strengths = new Map<string, 'strong' | 'medium' | 'weak'>([['P1', 'strong']]);
    const result = applySignalWeighting([pattern], strengths);

    expect(result[0].confidence).toBe(0.85);
  });

  it('should NOT lower a 0.80 pattern with weak signal (0.60)', () => {
    const pattern = createPattern({ id: 'P1', confidence: 0.80 });
    const strengths = new Map<string, 'strong' | 'medium' | 'weak'>([['P1', 'weak']]);
    const result = applySignalWeighting([pattern], strengths);

    expect(result[0].confidence).toBe(0.80);
  });

  it('should cap at 0.95 even when original is 0.96', () => {
    const pattern = createPattern({ id: 'P1', confidence: 0.96 });
    const strengths = new Map<string, 'strong' | 'medium' | 'weak'>([['P1', 'strong']]);
    const result = applySignalWeighting([pattern], strengths);

    expect(result[0].confidence).toBe(0.95);
  });
});

// =============================================================================
// S2: Pipeline Signal Classification (N3)
// =============================================================================

describe('S2: Pipeline signal classification', () => {
  it('template patterns should receive medium signal (0.75) not strong', () => {
    // Simulate pipeline: generate template patterns, classify as medium
    const elements: DiscoveredElements = {
      entities: [createEntity('user')],
      routes: [],
      forms: [],
      tables: [],
      modals: [],
    };
    const templateResult = generateAllPatterns(elements);
    const templatePatterns = templateResult.patterns;

    // Classify as medium (what pipeline.ts does after N3 fix)
    const mediumIds = templatePatterns.map(p => p.id);
    const strengths = new Map<string, 'strong' | 'medium' | 'weak'>();
    for (const id of mediumIds) {strengths.set(id, 'medium');}

    const weighted = applySignalWeighting(templatePatterns, strengths);

    // All template patterns should be at least 0.75 (medium base)
    for (const p of weighted) {
      expect(p.confidence).toBeGreaterThanOrEqual(0.75);
    }
  });

  it('discovery patterns should receive strong signal (0.85)', () => {
    const discoveryPattern = createPattern({
      id: 'DISC-1',
      confidence: 0.70,
      templateSource: 'auth',
    });
    const strengths = new Map<string, 'strong' | 'medium' | 'weak'>([['DISC-1', 'strong']]);
    const weighted = applySignalWeighting([discoveryPattern], strengths);

    expect(weighted[0].confidence).toBe(0.85);
  });

  it('framework pack patterns should receive medium signal (0.75)', () => {
    const packPattern = createPattern({
      id: 'PACK-1',
      confidence: 0.65,
      layer: 'framework',
    });
    const strengths = new Map<string, 'strong' | 'medium' | 'weak'>([['PACK-1', 'medium']]);
    const weighted = applySignalWeighting([packPattern], strengths);

    expect(weighted[0].confidence).toBe(0.75);
  });
});

// =============================================================================
// S3: Unmapped Primitives in Templates (N1)
// =============================================================================

describe('S3: Unmapped primitives in templates', () => {
  it('modal templates should generate keyboard patterns', () => {
    const modals = [createModal('Delete Confirmation')];
    const patterns = generateModalPatterns(modals);

    const keyboardPatterns = patterns.filter(p => p.mappedPrimitive === 'keyboard');
    expect(keyboardPatterns.length).toBeGreaterThan(0);

    // Verify the Escape-close template was expanded
    const escapePattern = keyboardPatterns.find(p =>
      p.normalizedText.includes('press escape')
    );
    expect(escapePattern).toBeDefined();
  });

  it('table templates should generate drag patterns', () => {
    const tables = [createTable('Orders', ['Name', 'Date', 'Amount'])];
    const patterns = generateTablePatterns(tables);

    const dragPatterns = patterns.filter(p => p.mappedPrimitive === 'drag');
    expect(dragPatterns.length).toBeGreaterThan(0);

    // Verify column resize template was expanded
    const resizePattern = dragPatterns.find(p =>
      p.normalizedText.includes('resize')
    );
    expect(resizePattern).toBeDefined();
  });

  it('keyboard patterns survive QC with medium confidence', () => {
    const modals = [createModal('Settings')];
    const patterns = generateModalPatterns(modals);

    // Classify as medium (pipeline behavior)
    const strengths = new Map<string, 'strong' | 'medium' | 'weak'>();
    for (const p of patterns) {strengths.set(p.id, 'medium');}
    const weighted = applySignalWeighting(patterns, strengths);

    const { patterns: qcPatterns } = applyAllQualityControls(weighted);
    const keyboardAfterQC = qcPatterns.filter(p => p.mappedPrimitive === 'keyboard');

    expect(keyboardAfterQC.length).toBeGreaterThan(0);
  });

  it('drag patterns survive QC with medium confidence', () => {
    const tables = [createTable('Products', ['SKU', 'Price'])];
    const patterns = generateTablePatterns(tables);

    // Classify as medium
    const strengths = new Map<string, 'strong' | 'medium' | 'weak'>();
    for (const p of patterns) {strengths.set(p.id, 'medium');}
    const weighted = applySignalWeighting(patterns, strengths);

    const { patterns: qcPatterns } = applyAllQualityControls(weighted);
    const dragAfterQC = qcPatterns.filter(p => p.mappedPrimitive === 'drag');

    expect(dragAfterQC.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// S4: End-to-End Confidence Flow (N2+N3)
// =============================================================================

describe('S4: End-to-end confidence flow', () => {
  it('pattern below threshold gets boosted by signal weighting to survive', () => {
    // A pattern at 0.65 (below 0.7 threshold) classified as medium (0.75 base)
    const pattern = createPattern({
      id: 'P-BELOW',
      confidence: 0.65,
      normalizedText: 'fill search field',
      mappedPrimitive: 'fill',
    });

    // Apply medium signal → raises to 0.75
    const strengths = new Map<string, 'strong' | 'medium' | 'weak'>([['P-BELOW', 'medium']]);
    const weighted = applySignalWeighting([pattern], strengths);
    expect(weighted[0].confidence).toBe(0.75);

    // QC threshold at default 0.7 → should survive
    const { patterns: qcPatterns } = applyAllQualityControls(weighted);
    expect(qcPatterns).toHaveLength(1);
    expect(qcPatterns[0].confidence).toBe(0.75);
  });

  it('cross-source boost + signal weighting combine correctly', () => {
    // Two patterns with same text from different sources at 0.65
    const p1 = createPattern({
      id: 'P1',
      confidence: 0.65,
      normalizedText: 'click submit',
      entityName: 'form-A',
      templateSource: 'form',
    });
    const p2 = createPattern({
      id: 'P2',
      confidence: 0.65,
      normalizedText: 'click submit',
      entityName: 'form-B',
      templateSource: 'crud',
    });

    // Apply medium signal → raises to 0.75
    const strengths = new Map<string, 'strong' | 'medium' | 'weak'>([
      ['P1', 'medium'],
      ['P2', 'medium'],
    ]);
    const weighted = applySignalWeighting([p1, p2], strengths);
    expect(weighted[0].confidence).toBe(0.75);
    expect(weighted[1].confidence).toBe(0.75);

    // QC: cross-source boost (+0.1) → 0.85, then dedup, then threshold
    const { patterns: qcPatterns, result } = applyAllQualityControls(weighted);

    // After dedup, one pattern remaining
    expect(qcPatterns).toHaveLength(1);
    // Should have been boosted by cross-source (+0.1 from 0.75 = 0.85)
    expect(qcPatterns[0].confidence).toBe(0.85);
    expect(result.crossSourceBoosted).toBeGreaterThan(0);
  });

  it('full QC pipeline preserves correct order: boost → dedup → threshold → prune', () => {
    // Pattern at 0.65 with cross-source signal
    const p1 = createPattern({
      id: 'CS1',
      confidence: 0.65,
      normalizedText: 'verify success message',
      entityName: 'toast-handler',
      templateSource: 'static',
    });
    const p2 = createPattern({
      id: 'CS2',
      confidence: 0.65,
      normalizedText: 'verify success message',
      entityName: 'notification-service',
      templateSource: 'form',
    });

    // Without boost-first ordering, this pattern would be deduped to 0.65
    // then filtered by 0.7 threshold. With boost-first, it gets +0.1 to 0.75,
    // deduped keeping 0.75, and survives threshold.
    const { patterns: qcPatterns } = applyAllQualityControls([p1, p2]);

    expect(qcPatterns).toHaveLength(1);
    expect(qcPatterns[0].confidence).toBe(0.75);
  });
});

// =============================================================================
// S5: Notification Templates in Empty Project
// =============================================================================

describe('S5: Notification templates in empty project', () => {
  it('generateAllPatterns with empty elements still produces notification patterns', () => {
    const emptyElements: DiscoveredElements = {
      entities: [],
      routes: [],
      forms: [],
      tables: [],
      modals: [],
    };

    const result = generateAllPatterns(emptyElements);

    expect(result.patterns.length).toBeGreaterThan(0);
    expect(result.stats.notificationPatterns).toBeGreaterThan(0);
    // Only notification patterns should exist
    expect(result.stats.crudPatterns).toBe(0);
    expect(result.stats.formPatterns).toBe(0);
    expect(result.stats.tablePatterns).toBe(0);
    expect(result.stats.modalPatterns).toBe(0);
  });

  it('notification patterns have correct count (20)', () => {
    const patterns = generateNotificationPatterns();

    expect(patterns).toHaveLength(NOTIFICATION_TEMPLATES.length);
    expect(patterns).toHaveLength(20);
  });

  it('notification patterns all have templateSource: static', () => {
    const patterns = generateNotificationPatterns();

    for (const p of patterns) {
      expect(p.templateSource).toBe('static');
    }
  });
});

// =============================================================================
// S6: Full Pipeline Confidence Distribution (N2+N3)
// =============================================================================

describe('S6: Full pipeline confidence distribution', () => {
  it('all output patterns have confidence >= 0.7 after QC at default threshold', () => {
    const elements: DiscoveredElements = {
      entities: [createEntity('user'), createEntity('order')],
      routes: [createRoute('/dashboard', 'Dashboard')],
      forms: [],
      tables: [createTable('Users', ['Name', 'Email'])],
      modals: [createModal('Confirm')],
    };

    const templateResult = generateAllPatterns(elements);

    // Classify as medium (pipeline behavior for templates after N3)
    const strengths = new Map<string, 'strong' | 'medium' | 'weak'>();
    for (const p of templateResult.patterns) {strengths.set(p.id, 'medium');}
    const weighted = applySignalWeighting(templateResult.patterns, strengths);

    const { patterns: final } = applyAllQualityControls(weighted);

    for (const p of final) {
      expect(p.confidence).toBeGreaterThanOrEqual(0.7);
    }
  });

  it('discovery patterns have higher avg confidence than template patterns after weighting', () => {
    // Discovery patterns with strong signal (use DISC- prefix to distinguish)
    const discoveryPatterns = [
      createPattern({ id: 'DISC-1', confidence: 0.70, normalizedText: 'click login', templateSource: 'auth' }),
      createPattern({ id: 'DISC-2', confidence: 0.85, normalizedText: 'enter username', templateSource: 'auth', mappedPrimitive: 'fill' }),
    ];

    // Template patterns with medium signal
    const elements: DiscoveredElements = {
      entities: [createEntity('product')],
      routes: [],
      forms: [],
      tables: [],
      modals: [],
    };
    const templateResult = generateAllPatterns(elements);

    // Collect discovery and template IDs for classification
    const discoveryIds = new Set(discoveryPatterns.map(p => p.id));
    const strengths = new Map<string, 'strong' | 'medium' | 'weak'>();
    for (const p of discoveryPatterns) {strengths.set(p.id, 'strong');}
    for (const p of templateResult.patterns) {strengths.set(p.id, 'medium');}

    const all = [...discoveryPatterns, ...templateResult.patterns];
    const weighted = applySignalWeighting(all, strengths);

    const weightedDiscovery = weighted.filter(p => discoveryIds.has(p.id));
    const weightedTemplate = weighted.filter(p => !discoveryIds.has(p.id));

    const avgDiscovery = weightedDiscovery.reduce((s, p) => s + p.confidence, 0) / weightedDiscovery.length;
    const avgTemplate = weightedTemplate.reduce((s, p) => s + p.confidence, 0) / weightedTemplate.length;

    expect(avgDiscovery).toBeGreaterThan(avgTemplate);
  });

  it('pattern sources are tracked correctly in stats', () => {
    const elements: DiscoveredElements = {
      entities: [createEntity('item')],
      routes: [createRoute('/home', 'Home')],
      forms: [],
      tables: [],
      modals: [createModal('Alert')],
    };

    const result = generateAllPatterns(elements);

    expect(result.stats.crudPatterns).toBeGreaterThan(0);
    expect(result.stats.navigationPatterns).toBeGreaterThan(0);
    expect(result.stats.modalPatterns).toBeGreaterThan(0);
    expect(result.stats.notificationPatterns).toBe(20);
    expect(result.stats.totalPatterns).toBe(
      result.stats.crudPatterns +
      result.stats.formPatterns +
      result.stats.tablePatterns +
      result.stats.modalPatterns +
      result.stats.navigationPatterns +
      result.stats.notificationPatterns
    );
  });

  it('weak signal patterns (analytics/ff) are filtered by default threshold', () => {
    // Simulate weak-signal patterns at default 0.65 confidence
    const weakPatterns = [
      createPattern({ id: 'W1', confidence: 0.55, normalizedText: 'track page view' }),
      createPattern({ id: 'W2', confidence: 0.50, normalizedText: 'check feature flag' }),
    ];

    const strengths = new Map<string, 'strong' | 'medium' | 'weak'>([
      ['W1', 'weak'],
      ['W2', 'weak'],
    ]);

    const weighted = applySignalWeighting(weakPatterns, strengths);

    // Weak base is 0.60, so 0.55→0.60 and 0.50→0.60 (both raised to base)
    expect(weighted[0].confidence).toBe(0.60);
    expect(weighted[1].confidence).toBe(0.60);

    // Default QC threshold is 0.7 → both should be filtered
    const { patterns: final } = applyAllQualityControls(weighted);
    expect(final).toHaveLength(0);
  });
});
