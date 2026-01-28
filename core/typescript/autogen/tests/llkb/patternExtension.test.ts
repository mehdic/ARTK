/**
 * Tests for patternExtension.ts - LLKB pattern learning and promotion
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 4
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadLearnedPatterns,
  saveLearnedPatterns,
  generatePatternId,
  calculateConfidence,
  recordPatternSuccess,
  recordPatternFailure,
  matchLlkbPattern,
  generateRegexFromText,
  getPromotablePatterns,
  markPatternsPromoted,
  prunePatterns,
  getPatternStats,
  exportPatternsToConfig,
  clearLearnedPatterns,
  type LearnedPattern,
} from '../../src/llkb/patternExtension.js';

describe('LLKB Pattern Extension', () => {
  let tempDir: string;
  let llkbRoot: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'llkb-test-'));
    llkbRoot = join(tempDir, '.artk', 'llkb');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('generatePatternId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generatePatternId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate IDs starting with LP', () => {
      const id = generatePatternId();
      expect(id).toMatch(/^LP[A-Z0-9]+$/);
    });
  });

  describe('calculateConfidence', () => {
    it('should return 0.5 for no data', () => {
      expect(calculateConfidence(0, 0)).toBe(0.5);
    });

    it('should return high confidence for many successes', () => {
      expect(calculateConfidence(100, 0)).toBeGreaterThan(0.9);
    });

    it('should return low confidence for many failures', () => {
      expect(calculateConfidence(0, 100)).toBeLessThan(0.1);
    });

    it('should return moderate confidence for mixed results', () => {
      const confidence = calculateConfidence(50, 50);
      expect(confidence).toBeGreaterThan(0.4);
      expect(confidence).toBeLessThan(0.6);
    });

    it('should be conservative with small sample sizes', () => {
      // With small samples, confidence should be pulled toward 0.5
      const smallSample = calculateConfidence(2, 0);
      const largeSample = calculateConfidence(20, 0);
      expect(smallSample).toBeLessThan(largeSample);
    });
  });

  describe('loadLearnedPatterns and saveLearnedPatterns', () => {
    it('should return empty array for non-existent file', () => {
      const patterns = loadLearnedPatterns({ llkbRoot });
      expect(patterns).toEqual([]);
    });

    it('should save and load patterns', () => {
      const pattern: LearnedPattern = {
        id: 'LP123',
        originalText: 'Click the button',
        normalizedText: 'click button',
        mappedPrimitive: { type: 'click', locator: { strategy: 'text', value: 'button' } },
        confidence: 0.8,
        sourceJourneys: ['JRN-001'],
        successCount: 5,
        failCount: 1,
        lastUsed: '2026-01-27T00:00:00Z',
        createdAt: '2026-01-26T00:00:00Z',
        promotedToCore: false,
      };

      saveLearnedPatterns([pattern], { llkbRoot });
      const loaded = loadLearnedPatterns({ llkbRoot });

      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toMatchObject({
        id: 'LP123',
        originalText: 'Click the button',
        confidence: 0.8,
      });
    });
  });

  describe('recordPatternSuccess', () => {
    it('should create a new pattern on first success', () => {
      const pattern = recordPatternSuccess(
        'Click the submit button',
        { type: 'click', locator: { strategy: 'text', value: 'submit' } },
        'JRN-001',
        { llkbRoot }
      );

      expect(pattern.originalText).toBe('Click the submit button');
      expect(pattern.successCount).toBe(1);
      expect(pattern.failCount).toBe(0);
      expect(pattern.sourceJourneys).toEqual(['JRN-001']);
    });

    it('should update existing pattern on subsequent success', () => {
      // First success
      recordPatternSuccess(
        'Click the submit button',
        { type: 'click', locator: { strategy: 'text', value: 'submit' } },
        'JRN-001',
        { llkbRoot }
      );

      // Second success
      const pattern = recordPatternSuccess(
        'Click the submit button',
        { type: 'click', locator: { strategy: 'text', value: 'submit' } },
        'JRN-002',
        { llkbRoot }
      );

      expect(pattern.successCount).toBe(2);
      expect(pattern.sourceJourneys).toEqual(['JRN-001', 'JRN-002']);
    });

    it('should not duplicate journey IDs', () => {
      recordPatternSuccess(
        'Click button',
        { type: 'click', locator: { strategy: 'text', value: 'button' } },
        'JRN-001',
        { llkbRoot }
      );

      const pattern = recordPatternSuccess(
        'Click button',
        { type: 'click', locator: { strategy: 'text', value: 'button' } },
        'JRN-001',
        { llkbRoot }
      );

      expect(pattern.sourceJourneys).toEqual(['JRN-001']);
    });
  });

  describe('recordPatternFailure', () => {
    it('should return null for non-existent pattern', () => {
      const result = recordPatternFailure('Non-existent step', 'JRN-001', { llkbRoot });
      expect(result).toBeNull();
    });

    it('should increment fail count for existing pattern', () => {
      recordPatternSuccess(
        'Click button',
        { type: 'click', locator: { strategy: 'text', value: 'button' } },
        'JRN-001',
        { llkbRoot }
      );

      const pattern = recordPatternFailure('Click button', 'JRN-002', { llkbRoot });

      expect(pattern).not.toBeNull();
      expect(pattern!.failCount).toBe(1);
      expect(pattern!.successCount).toBe(1);
    });
  });

  describe('matchLlkbPattern', () => {
    beforeEach(() => {
      // Create a high-confidence pattern
      // Note: normalizedText must match glossary normalizer output (which keeps articles)
      const pattern: LearnedPattern = {
        id: 'LP123',
        originalText: 'Click the submit button',
        normalizedText: 'click the submit button',
        mappedPrimitive: { type: 'click', locator: { strategy: 'text', value: 'submit' } },
        confidence: 0.9,
        sourceJourneys: ['JRN-001'],
        successCount: 10,
        failCount: 1,
        lastUsed: '2026-01-27T00:00:00Z',
        createdAt: '2026-01-26T00:00:00Z',
        promotedToCore: false,
      };
      saveLearnedPatterns([pattern], { llkbRoot });
    });

    it('should match exact normalized text', () => {
      const match = matchLlkbPattern('Click the submit button', { llkbRoot });

      expect(match).not.toBeNull();
      expect(match!.patternId).toBe('LP123');
      expect(match!.primitive.type).toBe('click');
    });

    it('should not match if confidence is below threshold', () => {
      // Create low-confidence pattern
      const pattern: LearnedPattern = {
        id: 'LP456',
        originalText: 'Low confidence step',
        normalizedText: 'low confidence step',
        mappedPrimitive: { type: 'click', locator: { strategy: 'text', value: 'low' } },
        confidence: 0.3,
        sourceJourneys: ['JRN-001'],
        successCount: 1,
        failCount: 2,
        lastUsed: '2026-01-27T00:00:00Z',
        createdAt: '2026-01-26T00:00:00Z',
        promotedToCore: false,
      };
      const existing = loadLearnedPatterns({ llkbRoot });
      saveLearnedPatterns([...existing, pattern], { llkbRoot });

      const match = matchLlkbPattern('Low confidence step', { llkbRoot, minConfidence: 0.7 });
      expect(match).toBeNull();
    });

    it('should not match promoted patterns', () => {
      const patterns = loadLearnedPatterns({ llkbRoot });
      patterns[0]!.promotedToCore = true;
      saveLearnedPatterns(patterns, { llkbRoot });

      const match = matchLlkbPattern('Click the submit button', { llkbRoot });
      expect(match).toBeNull();
    });
  });

  describe('generateRegexFromText', () => {
    it('should escape special regex characters', () => {
      const regex = generateRegexFromText('Click (the) button');
      expect(regex).toContain('\\(');
      expect(regex).toContain('\\)');
    });

    it('should make articles optional', () => {
      const regex = generateRegexFromText('Click the button');
      expect(regex).toContain('(?:the\\s+)?');
    });

    it('should make user prefix optional', () => {
      const regex = generateRegexFromText('User clicks button');
      expect(regex).toContain('(?:user\\s+)?');
    });

    it('should replace quoted values with capture groups', () => {
      const regex = generateRegexFromText('Enter "value" in field');
      expect(regex).toContain('([^"]+)');
    });
  });

  describe('getPromotablePatterns', () => {
    it('should return empty array when no patterns qualify', () => {
      const promotable = getPromotablePatterns({ llkbRoot });
      expect(promotable).toEqual([]);
    });

    it('should return patterns meeting all criteria', () => {
      const pattern: LearnedPattern = {
        id: 'LP123',
        originalText: 'Click submit',
        normalizedText: 'click submit',
        mappedPrimitive: { type: 'click', locator: { strategy: 'text', value: 'submit' } },
        confidence: 0.95,
        sourceJourneys: ['JRN-001', 'JRN-002'],
        successCount: 10,
        failCount: 0,
        lastUsed: '2026-01-27T00:00:00Z',
        createdAt: '2026-01-26T00:00:00Z',
        promotedToCore: false,
      };
      saveLearnedPatterns([pattern], { llkbRoot });

      const promotable = getPromotablePatterns({ llkbRoot });
      expect(promotable).toHaveLength(1);
      expect(promotable[0]!.pattern.id).toBe('LP123');
      expect(promotable[0]!.generatedRegex).toBeDefined();
    });

    it('should not return already promoted patterns', () => {
      const pattern: LearnedPattern = {
        id: 'LP123',
        originalText: 'Click submit',
        normalizedText: 'click submit',
        mappedPrimitive: { type: 'click', locator: { strategy: 'text', value: 'submit' } },
        confidence: 0.95,
        sourceJourneys: ['JRN-001', 'JRN-002'],
        successCount: 10,
        failCount: 0,
        lastUsed: '2026-01-27T00:00:00Z',
        createdAt: '2026-01-26T00:00:00Z',
        promotedToCore: true,
        promotedAt: '2026-01-27T00:00:00Z',
      };
      saveLearnedPatterns([pattern], { llkbRoot });

      const promotable = getPromotablePatterns({ llkbRoot });
      expect(promotable).toHaveLength(0);
    });
  });

  describe('markPatternsPromoted', () => {
    it('should mark patterns as promoted', () => {
      const pattern: LearnedPattern = {
        id: 'LP123',
        originalText: 'Click submit',
        normalizedText: 'click submit',
        mappedPrimitive: { type: 'click', locator: { strategy: 'text', value: 'submit' } },
        confidence: 0.95,
        sourceJourneys: ['JRN-001'],
        successCount: 10,
        failCount: 0,
        lastUsed: '2026-01-27T00:00:00Z',
        createdAt: '2026-01-26T00:00:00Z',
        promotedToCore: false,
      };
      saveLearnedPatterns([pattern], { llkbRoot });

      markPatternsPromoted(['LP123'], { llkbRoot });

      const patterns = loadLearnedPatterns({ llkbRoot });
      expect(patterns[0]!.promotedToCore).toBe(true);
      expect(patterns[0]!.promotedAt).toBeDefined();
    });
  });

  describe('prunePatterns', () => {
    it('should remove low-confidence patterns', () => {
      const patterns: LearnedPattern[] = [
        {
          id: 'LP1',
          originalText: 'High confidence',
          normalizedText: 'high confidence',
          mappedPrimitive: { type: 'click', locator: { strategy: 'text', value: 'high' } },
          confidence: 0.9,
          sourceJourneys: ['JRN-001'],
          successCount: 10,
          failCount: 1,
          lastUsed: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          promotedToCore: false,
        },
        {
          id: 'LP2',
          originalText: 'Low confidence',
          normalizedText: 'low confidence',
          mappedPrimitive: { type: 'click', locator: { strategy: 'text', value: 'low' } },
          confidence: 0.2,
          sourceJourneys: ['JRN-001'],
          successCount: 1,
          failCount: 4,
          lastUsed: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          promotedToCore: false,
        },
      ];
      saveLearnedPatterns(patterns, { llkbRoot });

      const result = prunePatterns({ llkbRoot, minConfidence: 0.3 });

      expect(result.removed).toBe(1);
      expect(result.remaining).toBe(1);

      const remaining = loadLearnedPatterns({ llkbRoot });
      expect(remaining[0]!.id).toBe('LP1');
    });

    it('should not remove promoted patterns', () => {
      const pattern: LearnedPattern = {
        id: 'LP1',
        originalText: 'Promoted',
        normalizedText: 'promoted',
        mappedPrimitive: { type: 'click', locator: { strategy: 'text', value: 'promoted' } },
        confidence: 0.1, // Low confidence but promoted
        sourceJourneys: ['JRN-001'],
        successCount: 0,
        failCount: 10,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        promotedToCore: true,
      };
      saveLearnedPatterns([pattern], { llkbRoot });

      const result = prunePatterns({ llkbRoot, minConfidence: 0.5 });

      expect(result.removed).toBe(0);
      expect(result.remaining).toBe(1);
    });
  });

  describe('getPatternStats', () => {
    it('should return zeros for empty storage', () => {
      const stats = getPatternStats({ llkbRoot });
      expect(stats.total).toBe(0);
      expect(stats.avgConfidence).toBe(0);
    });

    it('should calculate correct statistics', () => {
      const patterns: LearnedPattern[] = [
        {
          id: 'LP1',
          originalText: 'Pattern 1',
          normalizedText: 'pattern 1',
          mappedPrimitive: { type: 'click', locator: { strategy: 'text', value: '1' } },
          confidence: 0.8,
          sourceJourneys: ['JRN-001'],
          successCount: 8,
          failCount: 2,
          lastUsed: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          promotedToCore: true,
        },
        {
          id: 'LP2',
          originalText: 'Pattern 2',
          normalizedText: 'pattern 2',
          mappedPrimitive: { type: 'click', locator: { strategy: 'text', value: '2' } },
          confidence: 0.2,
          sourceJourneys: ['JRN-001'],
          successCount: 1,
          failCount: 4,
          lastUsed: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          promotedToCore: false,
        },
      ];
      saveLearnedPatterns(patterns, { llkbRoot });

      const stats = getPatternStats({ llkbRoot });

      expect(stats.total).toBe(2);
      expect(stats.promoted).toBe(1);
      expect(stats.highConfidence).toBe(1);
      expect(stats.lowConfidence).toBe(1);
      expect(stats.totalSuccesses).toBe(9);
      expect(stats.totalFailures).toBe(6);
      expect(stats.avgConfidence).toBe(0.5);
    });
  });

  describe('exportPatternsToConfig', () => {
    it('should export patterns to JSON file', () => {
      const pattern: LearnedPattern = {
        id: 'LP123',
        originalText: 'Click submit',
        normalizedText: 'click submit',
        mappedPrimitive: { type: 'click', locator: { strategy: 'text', value: 'submit' } },
        confidence: 0.8,
        sourceJourneys: ['JRN-001'],
        successCount: 5,
        failCount: 1,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        promotedToCore: false,
      };
      saveLearnedPatterns([pattern], { llkbRoot });

      const result = exportPatternsToConfig({ llkbRoot, minConfidence: 0.7 });

      expect(result.exported).toBe(1);
      expect(result.path).toContain('autogen-patterns.json');
    });

    it('should not export promoted patterns', () => {
      const pattern: LearnedPattern = {
        id: 'LP123',
        originalText: 'Click submit',
        normalizedText: 'click submit',
        mappedPrimitive: { type: 'click', locator: { strategy: 'text', value: 'submit' } },
        confidence: 0.9,
        sourceJourneys: ['JRN-001'],
        successCount: 5,
        failCount: 0,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        promotedToCore: true,
      };
      saveLearnedPatterns([pattern], { llkbRoot });

      const result = exportPatternsToConfig({ llkbRoot });

      expect(result.exported).toBe(0);
    });
  });

  describe('clearLearnedPatterns', () => {
    it('should remove all patterns', () => {
      const pattern: LearnedPattern = {
        id: 'LP123',
        originalText: 'Pattern',
        normalizedText: 'pattern',
        mappedPrimitive: { type: 'click', locator: { strategy: 'text', value: 'pattern' } },
        confidence: 0.8,
        sourceJourneys: ['JRN-001'],
        successCount: 5,
        failCount: 1,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        promotedToCore: false,
      };
      saveLearnedPatterns([pattern], { llkbRoot });

      clearLearnedPatterns({ llkbRoot });

      const patterns = loadLearnedPatterns({ llkbRoot });
      expect(patterns).toHaveLength(0);
    });

    it('should not error on empty storage', () => {
      expect(() => clearLearnedPatterns({ llkbRoot })).not.toThrow();
    });
  });
});
