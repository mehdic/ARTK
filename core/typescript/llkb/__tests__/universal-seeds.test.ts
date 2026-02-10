/**
 * Universal Seed Patterns Tests
 *
 * Validates the LLKB cold-start seed patterns used to bootstrap
 * learned-patterns.json during LLKB initialization.
 *
 * @module llkb/__tests__/universal-seeds.test.ts
 */

import { describe, expect, it } from 'vitest';
import { createUniversalSeedPatterns, VALID_IR_PRIMITIVES } from '../universal-seeds.js';

describe('createUniversalSeedPatterns', () => {
  const patterns = createUniversalSeedPatterns();

  it('returns exactly 39 patterns', () => {
    expect(patterns).toHaveLength(39);
  });

  it('all irPrimitive values are valid AutoGen IR types', () => {
    const validTypes = new Set([
      'goto', 'goBack', 'goForward', 'reload',
      'waitForVisible', 'waitForHidden', 'waitForURL', 'waitForNetworkIdle', 'waitForTimeout',
      'waitForResponse', 'waitForLoadingComplete',
      'click', 'dblclick', 'rightClick', 'fill', 'select', 'check', 'uncheck',
      'upload', 'press', 'hover', 'focus', 'clear',
      'expectVisible', 'expectNotVisible', 'expectHidden', 'expectText', 'expectValue',
      'expectChecked', 'expectEnabled', 'expectDisabled', 'expectURL', 'expectTitle',
      'expectCount', 'expectContainsText',
      'expectToast', 'dismissModal', 'acceptAlert', 'dismissAlert',
      'callModule', 'blocked',
    ]);

    for (const pattern of patterns) {
      expect(validTypes.has(pattern.irPrimitive), `Invalid IR primitive: ${pattern.irPrimitive}`).toBe(true);
    }
  });

  it('all confidence values are 0.80', () => {
    for (const pattern of patterns) {
      expect(pattern.confidence).toBe(0.80);
    }
  });

  it('all successCount are 1 (survives prune) and failCount are 0', () => {
    for (const pattern of patterns) {
      expect(pattern.successCount).toBe(1);
      expect(pattern.failCount).toBe(0);
    }
  });

  it('all normalizedText values are unique', () => {
    const texts = patterns.map((p) => p.normalizedText);
    const uniqueTexts = new Set(texts);
    expect(uniqueTexts.size).toBe(texts.length);
  });

  it('all patterns have lastUpdated timestamp', () => {
    for (const pattern of patterns) {
      expect(pattern.lastUpdated).toBeDefined();
      expect(typeof pattern.lastUpdated).toBe('string');
      // Should be valid ISO date
      expect(new Date(pattern.lastUpdated!).toISOString()).toBe(pattern.lastUpdated);
    }
  });

  it('all patterns have empty sourceJourneys', () => {
    for (const pattern of patterns) {
      expect(pattern.sourceJourneys).toEqual([]);
    }
  });

  it('covers all expected categories', () => {
    const primitives = patterns.map((p) => p.irPrimitive);
    // Navigation
    expect(primitives).toContain('goto');
    expect(primitives).toContain('goBack');
    expect(primitives).toContain('reload');
    // Interactions
    expect(primitives).toContain('click');
    expect(primitives).toContain('fill');
    expect(primitives).toContain('check');
    expect(primitives).toContain('select');
    expect(primitives).toContain('clear');
    expect(primitives).toContain('press');
    // Assertions
    expect(primitives).toContain('expectVisible');
    expect(primitives).toContain('expectText');
    expect(primitives).toContain('expectURL');
    expect(primitives).toContain('expectTitle');
    expect(primitives).toContain('expectHidden');
    // Waits
    expect(primitives).toContain('waitForVisible');
    expect(primitives).toContain('waitForURL');
    expect(primitives).toContain('waitForNetworkIdle');
    // Signals
    expect(primitives).toContain('expectToast');
    expect(primitives).toContain('dismissModal');
    expect(primitives).toContain('acceptAlert');
    expect(primitives).toContain('dismissAlert');
    expect(primitives).toContain('waitForHidden');
  });

  it('VALID_IR_PRIMITIVES export contains expected types', () => {
    expect(VALID_IR_PRIMITIVES).toContain('click');
    expect(VALID_IR_PRIMITIVES).toContain('fill');
    expect(VALID_IR_PRIMITIVES).toContain('goto');
    expect(VALID_IR_PRIMITIVES).toContain('expectVisible');
  });
});
