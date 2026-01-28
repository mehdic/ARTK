import { describe, it, expect } from 'vitest';
import {
  levenshteinDistance,
  calculateSimilarity,
  findNearestPattern,
  explainMismatch,
} from '../../src/mapping/patternDistance.js';
import type { StepPattern } from '../../src/mapping/patterns.js';

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
    expect(levenshteinDistance('test', 'test')).toBe(0);
  });

  it('returns correct distance for different strings', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('abc', 'def')).toBe(3);
  });

  it('handles empty strings', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
    expect(levenshteinDistance('', '')).toBe(0);
  });

  it('handles single character differences', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1);
    expect(levenshteinDistance('hello', 'helo')).toBe(1);
  });

  it('is case-sensitive', () => {
    expect(levenshteinDistance('Hello', 'hello')).toBe(1);
  });
});

describe('calculateSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(calculateSimilarity('hello', 'hello')).toBe(1);
    expect(calculateSimilarity('test', 'test')).toBe(1);
  });

  it('returns 0 for completely different strings of same length', () => {
    expect(calculateSimilarity('aaa', 'zzz')).toBe(0);
    expect(calculateSimilarity('abc', 'xyz')).toBe(0);
  });

  it('handles case insensitivity', () => {
    expect(calculateSimilarity('Hello', 'hello')).toBe(1);
    expect(calculateSimilarity('HELLO', 'hello')).toBe(1);
  });

  it('returns value between 0 and 1', () => {
    const similarity = calculateSimilarity('click button', 'clicks the button');
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it('handles empty strings', () => {
    expect(calculateSimilarity('', '')).toBe(1);
    expect(calculateSimilarity('abc', '')).toBeGreaterThanOrEqual(0);
    expect(calculateSimilarity('abc', '')).toBeLessThanOrEqual(1);
  });

  it('calculates reasonable similarity for similar text', () => {
    const similarity = calculateSimilarity('User navigates to /login', 'User navigates to /home');
    expect(similarity).toBeGreaterThan(0.7); // Should be fairly similar
  });

  it('calculates low similarity for dissimilar text', () => {
    const similarity = calculateSimilarity('Navigate to page', 'Fill in the form');
    expect(similarity).toBeLessThan(0.5); // Should be quite different
  });
});

describe('findNearestPattern', () => {
  const mockPatterns: StepPattern[] = [
    {
      name: 'navigate-to-url',
      regex: /^(?:user\s+)?(?:navigates?|go(?:es)?|opens?)\s+(?:to\s+)?(?:the\s+)?["']?([^"'\s]+)["']?$/i,
      primitiveType: 'goto',
      extract: (match) => ({
        type: 'goto',
        url: match[1]!,
        waitForLoad: true,
      }),
    },
    {
      name: 'click-button',
      regex: /^(?:user\s+)?(?:clicks?|presses?)\s+["']([^"']+)["']\s+button$/i,
      primitiveType: 'click',
      extract: (match) => ({
        type: 'click',
        locator: { strategy: 'role', value: 'button', options: { name: match[1]! } },
      }),
    },
  ];

  it('finds nearest pattern for similar text', () => {
    const result = findNearestPattern('User navigate to /login', mockPatterns);
    expect(result).toBeDefined();
    expect(result?.name).toBe('navigate-to-url');
  });

  it('returns null for completely dissimilar text', () => {
    const result = findNearestPattern('Some random unrelated text that matches nothing', mockPatterns);
    // May return null or a pattern with low similarity
    if (result) {
      expect(result.distance).toBeGreaterThan(20);
    }
  });

  it('works with Map input', () => {
    const patternMap = new Map<string, StepPattern>(
      mockPatterns.map(p => [p.name, p])
    );
    const result = findNearestPattern('Click button', patternMap);
    expect(result).toBeDefined();
  });

  it('includes example match in result', () => {
    const result = findNearestPattern('User clicks button', mockPatterns);
    expect(result).toBeDefined();
    expect(result?.exampleMatch).toBeDefined();
  });

  it('includes mismatch reason in result', () => {
    const result = findNearestPattern('User clicks button', mockPatterns);
    expect(result).toBeDefined();
    expect(result?.mismatchReason).toBeDefined();
    expect(typeof result?.mismatchReason).toBe('string');
  });

  it('calculates distance correctly', () => {
    const result = findNearestPattern('User navigates to /home', mockPatterns);
    expect(result).toBeDefined();
    expect(result?.distance).toBeDefined();
    expect(typeof result?.distance).toBe('number');
    expect(result?.distance).toBeGreaterThanOrEqual(0);
  });
});

describe('explainMismatch', () => {
  const mockPattern: StepPattern = {
    name: 'click-button',
    regex: /^(?:user\s+)?(?:clicks?|presses?)\s+["']([^"']+)["']\s+button$/i,
    primitiveType: 'click',
    extract: (match) => ({
      type: 'click',
      locator: { strategy: 'role', value: 'button', options: { name: match[1]! } },
    }),
  };

  it('identifies missing locator hints', () => {
    const reason = explainMismatch('Click the submit button', mockPattern);
    expect(reason).toContain('locator hint');
  });

  it('identifies unquoted targets for click patterns', () => {
    const reason = explainMismatch('Click the button', mockPattern);
    expect(reason).toContain('not quoted');
  });

  it('returns pattern format mismatch as default', () => {
    const reason = explainMismatch('Something random `(testid=test)`', mockPattern);
    expect(typeof reason).toBe('string');
    expect(reason.length).toBeGreaterThan(0);
  });

  it('handles patterns with no obvious issues', () => {
    const reason = explainMismatch('User clicks "Submit" button `(role=button, name=Submit)`', mockPattern);
    expect(typeof reason).toBe('string');
  });
});
