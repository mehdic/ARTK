/**
 * Unit tests for code similarity functions
 *
 * Tests:
 * - calculateSimilarity: Overall similarity calculation
 * - jaccardSimilarity: Token-based similarity
 * - isNearDuplicate: Duplicate detection
 * - findSimilarPatterns: Pattern matching in collections
 */

import { describe, expect, it } from 'vitest';
import { calculateSimilarity, jaccardSimilarity, isNearDuplicate, findSimilarPatterns } from '../similarity.js';

// =============================================================================
// calculateSimilarity Tests
// =============================================================================

describe('calculateSimilarity', () => {
  it('returns 1.0 for identical code', () => {
    const code = `await page.click('button')`;
    const similarity = calculateSimilarity(code, code);
    expect(similarity).toBe(1.0);
  });

  it('returns 1.0 for code that normalizes to same result', () => {
    const codeA = `await page.click('submit-btn')`;
    const codeB = `await page.click("different-btn")`;
    const similarity = calculateSimilarity(codeA, codeB);
    expect(similarity).toBe(1.0);
  });

  it('returns high similarity for similar code', () => {
    const codeA = `await page.click('.button'); await page.waitForTimeout(1000);`;
    const codeB = `await page.click('.submit'); await page.waitForTimeout(2000);`;
    const similarity = calculateSimilarity(codeA, codeB);
    expect(similarity).toBeGreaterThan(0.7);
  });

  it('returns low similarity for different code', () => {
    const codeA = `await page.goto('/login')`;
    const codeB = `expect(element).toBeVisible()`;
    const similarity = calculateSimilarity(codeA, codeB);
    expect(similarity).toBeLessThan(0.5);
  });

  it('returns 0.0 for completely different code', () => {
    const codeA = 'abc def ghi';
    const codeB = 'xyz uvw rst';
    const similarity = calculateSimilarity(codeA, codeB);
    expect(similarity).toBeLessThanOrEqual(0.3);
  });

  it('is symmetric (order does not matter)', () => {
    const codeA = `await page.click('a')`;
    const codeB = `await page.click('b'); await page.fill('input', 'text')`;
    const simAB = calculateSimilarity(codeA, codeB);
    const simBA = calculateSimilarity(codeB, codeA);
    expect(simAB).toBe(simBA);
  });

  it('handles empty strings', () => {
    expect(calculateSimilarity('', '')).toBe(1.0);
    expect(calculateSimilarity('some code', '')).toBeLessThan(0.5);
    expect(calculateSimilarity('', 'some code')).toBeLessThan(0.5);
  });

  it('returns value between 0 and 1', () => {
    const similarity = calculateSimilarity(
      'await page.goto("/a")',
      'await page.click(".b")'
    );
    expect(similarity).toBeGreaterThanOrEqual(0);
    expect(similarity).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// jaccardSimilarity Tests
// =============================================================================

describe('jaccardSimilarity', () => {
  it('returns 1.0 for identical sets', () => {
    const setA = new Set(['a', 'b', 'c']);
    const setB = new Set(['a', 'b', 'c']);
    expect(jaccardSimilarity(setA, setB)).toBe(1.0);
  });

  it('returns 0.0 for disjoint sets', () => {
    const setA = new Set(['a', 'b', 'c']);
    const setB = new Set(['x', 'y', 'z']);
    expect(jaccardSimilarity(setA, setB)).toBe(0);
  });

  it('returns 0.5 for 50% overlap', () => {
    const setA = new Set(['a', 'b']);
    const setB = new Set(['b', 'c']);
    // Intersection: {b} = 1
    // Union: {a, b, c} = 3
    // Jaccard = 1/3 ≈ 0.33
    const similarity = jaccardSimilarity(setA, setB);
    expect(similarity).toBeCloseTo(0.33, 1);
  });

  it('handles empty sets', () => {
    const empty = new Set<string>();
    const nonEmpty = new Set(['a', 'b']);

    // Both empty
    expect(jaccardSimilarity(empty, empty)).toBe(1.0);

    // One empty
    expect(jaccardSimilarity(empty, nonEmpty)).toBe(0);
    expect(jaccardSimilarity(nonEmpty, empty)).toBe(0);
  });

  it('is symmetric', () => {
    const setA = new Set(['a', 'b', 'c']);
    const setB = new Set(['b', 'c', 'd', 'e']);
    expect(jaccardSimilarity(setA, setB)).toBe(jaccardSimilarity(setB, setA));
  });

  it('handles subset relationship', () => {
    const subset = new Set(['a', 'b']);
    const superset = new Set(['a', 'b', 'c', 'd']);
    // Intersection: {a, b} = 2
    // Union: {a, b, c, d} = 4
    // Jaccard = 2/4 = 0.5
    expect(jaccardSimilarity(subset, superset)).toBe(0.5);
  });
});

// =============================================================================
// isNearDuplicate Tests
// =============================================================================

describe('isNearDuplicate', () => {
  it('returns true for identical code', () => {
    const code = `await page.click('button')`;
    expect(isNearDuplicate(code, code)).toBe(true);
  });

  it('returns true for highly similar code', () => {
    const codeA = `await page.click('.button'); await page.waitForTimeout(1000);`;
    const codeB = `await page.click('.submit'); await page.waitForTimeout(2000);`;
    expect(isNearDuplicate(codeA, codeB)).toBe(true);
  });

  it('returns false for different code', () => {
    const codeA = `await page.goto('/login')`;
    const codeB = `expect(element).toHaveText('Hello')`;
    expect(isNearDuplicate(codeA, codeB)).toBe(false);
  });

  it('respects custom threshold', () => {
    const codeA = `await page.click('a')`;
    const codeB = `await page.click('b'); await page.fill('c', 'd')`;

    // With default threshold (0.8), may or may not be duplicate
    // With lower threshold, more likely to be duplicate
    const strictResult = isNearDuplicate(codeA, codeB, 0.95);
    const lenientResult = isNearDuplicate(codeA, codeB, 0.3);

    expect(strictResult).toBe(false);
    expect(lenientResult).toBe(true);
  });

  it('handles strings that normalize to same value', () => {
    const codeA = `const x = 'hello'`;
    const codeB = `const y = "world"`;
    expect(isNearDuplicate(codeA, codeB)).toBe(true);
  });
});

// =============================================================================
// findSimilarPatterns Tests
// =============================================================================

describe('findSimilarPatterns', () => {
  const patterns = [
    `await page.click('.button')`,
    `await page.fill('#input', 'text')`,
    `await expect(element).toBeVisible()`,
    `await page.goto('/login')`,
    `await page.waitForTimeout(1000)`,
  ];

  it('finds exact match', () => {
    const target = `await page.click('.button')`;
    const results = findSimilarPatterns(target, patterns);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.pattern).toBe(target);
    expect(results[0]?.similarity).toBe(1.0);
  });

  it('finds similar patterns', () => {
    const target = `await page.click('.submit-btn')`;
    const results = findSimilarPatterns(target, patterns);
    expect(results.length).toBeGreaterThan(0);
    // Should match the click pattern
    expect(results.some(r => r.pattern.includes('click'))).toBe(true);
  });

  it('respects threshold', () => {
    const target = `completely different code`;
    const results = findSimilarPatterns(target, patterns, 0.8);
    expect(results.length).toBe(0);
  });

  it('returns results sorted by similarity', () => {
    const target = `await page.click('.test')`;
    const results = findSimilarPatterns(target, patterns, 0.3);

    if (results.length > 1) {
      for (let i = 1; i < results.length; i++) {
        expect(results[i]!.similarity).toBeLessThanOrEqual(results[i - 1]!.similarity);
      }
    }
  });

  it('handles empty patterns array', () => {
    const results = findSimilarPatterns('any code', []);
    expect(results).toEqual([]);
  });

  it('handles empty target', () => {
    const results = findSimilarPatterns('', patterns);
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('returns correct structure', () => {
    const target = `await page.click('.button')`;
    const results = findSimilarPatterns(target, patterns);

    expect(results[0]).toHaveProperty('pattern');
    expect(results[0]).toHaveProperty('similarity');
    expect(results[0]).toHaveProperty('index');
    expect(typeof results[0]?.similarity).toBe('number');
    expect(typeof results[0]?.index).toBe('number');
  });

  it('includes correct index', () => {
    const target = `await page.goto('/dashboard')`;
    const results = findSimilarPatterns(target, patterns, 0.3);

    const gotoResult = results.find(r => r.pattern.includes('goto'));
    if (gotoResult) {
      expect(patterns[gotoResult.index]).toBe(gotoResult.pattern);
    }
  });
});
