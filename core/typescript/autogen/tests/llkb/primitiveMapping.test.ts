/**
 * Primitive Mapping Integration Tests
 *
 * Tests createIRPrimitiveFromDiscovered indirectly via matchLlkbPattern
 * and discovered-patterns.json. Verifies that discovered patterns with string
 * primitive names are correctly converted to IRPrimitive objects.
 *
 * IMPORTANT: matchLlkbPattern normalizes input via normalizeStepText which applies
 * glossary synonyms (press→click, select→click, go→navigate, check→checkbox).
 * The normalizedText stored in discovered-patterns.json MUST match what
 * normalizeStepText would produce from the lookup text.
 *
 * Fixes verified:
 * - N1: keyboard→{type:'press', key:'Escape'}, drag→null
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  matchLlkbPattern,
  invalidateDiscoveredPatternCache,
} from '../../src/llkb/patternExtension.js';
import { normalizeStepText } from '../../src/mapping/glossary.js';

// =============================================================================
// Test Utilities
// =============================================================================

let tempDir: string;
let llkbRoot: string;

/**
 * Write a discovered-patterns.json file with the given patterns.
 * normalizedText is computed from originalText using normalizeStepText
 * so that matchLlkbPattern can find exact matches.
 */
function writeDiscoveredPatterns(
  patterns: Array<{
    id: string;
    originalText: string;
    mappedPrimitive: string;
    confidence: number;
    layer: 'app-specific' | 'framework' | 'universal';
    category?: string;
    selectorHints?: Array<{ strategy: string; value: string; confidence?: number }>;
  }>
): void {
  const file = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    source: 'test',
    patterns: patterns.map(p => ({
      ...p,
      normalizedText: normalizeStepText(p.originalText),
    })),
    metadata: {
      frameworks: [],
      uiLibraries: [],
      totalPatterns: patterns.length,
      byCategory: {},
      byTemplate: {},
      averageConfidence: 0.7,
    },
  };
  writeFileSync(join(llkbRoot, 'discovered-patterns.json'), JSON.stringify(file, null, 2));
}

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'llkb-prim-'));
  llkbRoot = join(tempDir, '.artk', 'llkb');
  mkdirSync(llkbRoot, { recursive: true });
  invalidateDiscoveredPatternCache();
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  invalidateDiscoveredPatternCache();
});

// =============================================================================
// N1: keyboard → press mapping
// =============================================================================

describe('keyboard → press mapping', () => {
  it('should map keyboard primitive to press with key Escape', () => {
    writeDiscoveredPatterns([{
      id: 'DP-KEY-01',
      originalText: 'use keyboard escape to dismiss confirmation',
      mappedPrimitive: 'keyboard',
      confidence: 0.80,
      layer: 'app-specific',
      category: 'ui-interaction',
    }]);

    const match = matchLlkbPattern('use keyboard escape to dismiss confirmation', { llkbRoot });

    expect(match).not.toBeNull();
    expect(match!.primitive.type).toBe('press');
    if (match!.primitive.type === 'press') {
      expect(match!.primitive.key).toBe('Escape');
    }
  });
});

// =============================================================================
// N1: drag → null mapping
// =============================================================================

describe('drag → null mapping', () => {
  it('should return null for drag primitive (unmappable)', () => {
    writeDiscoveredPatterns([{
      id: 'DP-DRAG-01',
      originalText: 'resize name column',
      mappedPrimitive: 'drag',
      confidence: 0.80,
      layer: 'app-specific',
      category: 'ui-interaction',
    }]);

    const match = matchLlkbPattern('resize name column', { llkbRoot });

    // drag returns null from createIRPrimitiveFromDiscovered, so no match
    expect(match).toBeNull();
  });
});

// =============================================================================
// Other primitive mappings
// =============================================================================

describe('upload primitive mapping', () => {
  it('should map upload primitive correctly', () => {
    writeDiscoveredPatterns([{
      id: 'DP-UPL-01',
      originalText: 'upload file to avatar',
      mappedPrimitive: 'upload',
      confidence: 0.80,
      layer: 'app-specific',
      category: 'data',
      selectorHints: [{ strategy: 'data-testid', value: 'avatar-upload', confidence: 0.9 }],
    }]);

    const match = matchLlkbPattern('upload file to avatar', { llkbRoot });

    expect(match).not.toBeNull();
    expect(match!.primitive.type).toBe('upload');
    if (match!.primitive.type === 'upload') {
      expect(match!.primitive.files).toBeDefined();
      expect(match!.primitive.locator.value).toBe('avatar-upload');
    }
  });
});

describe('all 19 supported primitives map correctly', () => {
  // Use text that avoids glossary synonym collisions.
  // The normalizedText is computed by normalizeStepText in writeDiscoveredPatterns.
  const SUPPORTED_PRIMITIVES: Array<{
    input: string;
    expectedType: string;
    lookupText: string;
  }> = [
    { input: 'click', expectedType: 'click', lookupText: 'click the save action' },
    { input: 'dblclick', expectedType: 'dblclick', lookupText: 'dblclick the cell item' },
    { input: 'fill', expectedType: 'fill', lookupText: 'fill the username area' },
    { input: 'check', expectedType: 'check', lookupText: 'check the terms agreement' },
    { input: 'uncheck', expectedType: 'uncheck', lookupText: 'uncheck the newsletter preference' },
    { input: 'select', expectedType: 'select', lookupText: 'select the country value' },
    { input: 'hover', expectedType: 'hover', lookupText: 'hover over the menu row' },
    { input: 'clear', expectedType: 'clear', lookupText: 'clear the search area' },
    { input: 'press', expectedType: 'press', lookupText: 'press the enter key firmly' },
    { input: 'navigate', expectedType: 'goto', lookupText: 'navigate to the dashboard page' },
    { input: 'goto', expectedType: 'goto', lookupText: 'goto the settings panel' },
    { input: 'goBack', expectedType: 'goBack', lookupText: 'goBack to the previous view' },
    { input: 'reload', expectedType: 'reload', lookupText: 'reload the current page display' },
    { input: 'assert', expectedType: 'expectVisible', lookupText: 'assert the success badge is there' },
    { input: 'expectVisible', expectedType: 'expectVisible', lookupText: 'expectVisible for the banner' },
    { input: 'expectText', expectedType: 'expectText', lookupText: 'expectText of the greeting line' },
    { input: 'expectURL', expectedType: 'expectURL', lookupText: 'expectURL contains the home path' },
    { input: 'waitForVisible', expectedType: 'waitForVisible', lookupText: 'waitForVisible on the spinner widget' },
    { input: 'upload', expectedType: 'upload', lookupText: 'upload the document attachment' },
  ];

  for (const { input, expectedType, lookupText } of SUPPORTED_PRIMITIVES) {
    it(`should map '${input}' → '${expectedType}'`, () => {
      writeDiscoveredPatterns([{
        id: `DP-${input.toUpperCase()}-01`,
        originalText: lookupText,
        mappedPrimitive: input,
        confidence: 0.80,
        layer: 'app-specific',
      }]);

      const match = matchLlkbPattern(lookupText, { llkbRoot });

      expect(match).not.toBeNull();
      expect(match!.primitive.type).toBe(expectedType);
    });
  }
});

describe('unknown primitive mapping', () => {
  it('should return null for unknown primitive type', () => {
    writeDiscoveredPatterns([{
      id: 'DP-UNK-01',
      originalText: 'swipe left on card',
      mappedPrimitive: 'swipe',
      confidence: 0.80,
      layer: 'app-specific',
    }]);

    const match = matchLlkbPattern('swipe left on card', { llkbRoot });

    expect(match).toBeNull();
  });
});

// =============================================================================
// keyboard vs press special cases (N1 confirmation)
// =============================================================================

describe('keyboard is distinct from press', () => {
  it('keyboard maps to press with Escape key (template convention)', () => {
    writeDiscoveredPatterns([{
      id: 'DP-KB-01',
      originalText: 'use keyboard shortcut to dismiss dialog',
      mappedPrimitive: 'keyboard',
      confidence: 0.80,
      layer: 'app-specific',
    }]);

    const match = matchLlkbPattern('use keyboard shortcut to dismiss dialog', { llkbRoot });

    expect(match).not.toBeNull();
    expect(match!.primitive.type).toBe('press');
    if (match!.primitive.type === 'press') {
      // keyboard always maps to Escape (template-generators convention)
      expect(match!.primitive.key).toBe('Escape');
    }
  });

  it('press maps to press with Enter key (default)', () => {
    writeDiscoveredPatterns([{
      id: 'DP-PR-01',
      originalText: 'press the enter key to continue',
      mappedPrimitive: 'press',
      confidence: 0.80,
      layer: 'app-specific',
    }]);

    const match = matchLlkbPattern('press the enter key to continue', { llkbRoot });

    expect(match).not.toBeNull();
    expect(match!.primitive.type).toBe('press');
    if (match!.primitive.type === 'press') {
      // press defaults to Enter key
      expect(match!.primitive.key).toBe('Enter');
    }
  });
});
