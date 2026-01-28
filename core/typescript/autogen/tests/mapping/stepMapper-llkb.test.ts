/**
 * Step Mapper LLKB Integration Tests
 * Tests the learning loop integration between stepMapper and LLKB patternExtension
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 4
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  mapStepText,
  getMappingStats,
  initializeLlkb,
  isLlkbAvailable,
} from '../../src/mapping/stepMapper.js';
import {
  saveLearnedPatterns,
  loadLearnedPatterns,
  clearLearnedPatterns,
  matchLlkbPattern,
  type LearnedPattern,
} from '../../src/llkb/patternExtension.js';
import { normalizeStepText } from '../../src/mapping/glossary.js';

describe('stepMapper LLKB Integration', () => {
  const testDir = join(tmpdir(), `stepMapper-llkb-test-${Date.now()}`);
  const llkbRoot = join(testDir, '.artk', 'llkb');

  beforeEach(() => {
    // Create test directories
    mkdirSync(llkbRoot, { recursive: true });
    // Clear any existing patterns
    clearLearnedPatterns({ llkbRoot });
  });

  afterEach(() => {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('initializeLlkb', () => {
    it('should initialize LLKB module', async () => {
      const result = await initializeLlkb();
      expect(result).toBe(true);
    });

    it('should make isLlkbAvailable return true after init', async () => {
      await initializeLlkb();
      expect(isLlkbAvailable()).toBe(true);
    });
  });

  describe('LLKB pattern matching', () => {
    beforeEach(async () => {
      // Initialize LLKB
      await initializeLlkb();
    });

    it('should match LLKB patterns when core pattern does not match', () => {
      // Create a custom pattern that won't match core patterns
      const pattern: LearnedPattern = {
        id: 'LP-CUSTOM-001',
        originalText: 'Activate the special widget',
        normalizedText: 'activate the special widget',
        mappedPrimitive: {
          type: 'click',
          locator: { strategy: 'testid', value: 'special-widget' },
        },
        confidence: 0.95,
        sourceJourneys: ['JRN-TEST-001'],
        successCount: 10,
        failCount: 0,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        promotedToCore: false,
      };
      saveLearnedPatterns([pattern], { llkbRoot });

      const result = mapStepText('Activate the special widget', {
        useLlkb: true,
        llkbRoot,
        llkbMinConfidence: 0.7,
      });

      expect(result.primitive).not.toBeNull();
      expect(result.matchSource).toBe('llkb');
      expect(result.llkbPatternId).toBe('LP-CUSTOM-001');
      expect(result.llkbConfidence).toBe(0.95);
    });

    it('should prefer core patterns over LLKB patterns', () => {
      // Create an LLKB pattern that overlaps with a core pattern
      const pattern: LearnedPattern = {
        id: 'LP-OVERLAP-001',
        originalText: 'User clicks "Submit" button',
        normalizedText: 'user click "Submit" button', // after glossary normalization
        mappedPrimitive: {
          type: 'hover', // Different from core which would be 'click'
          locator: { strategy: 'testid', value: 'submit' },
        },
        confidence: 0.99,
        sourceJourneys: ['JRN-TEST-002'],
        successCount: 100,
        failCount: 0,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        promotedToCore: false,
      };
      saveLearnedPatterns([pattern], { llkbRoot });

      const result = mapStepText('User clicks "Submit" button', {
        useLlkb: true,
        llkbRoot,
      });

      // Core pattern should win (click, not hover)
      expect(result.primitive).not.toBeNull();
      expect(result.matchSource).toBe('pattern');
      expect(result.primitive?.type).toBe('click');
    });

    it('should not use LLKB when useLlkb is false', () => {
      const pattern: LearnedPattern = {
        id: 'LP-DISABLED-001',
        originalText: 'Custom action xyz',
        normalizedText: 'custom action xyz',
        mappedPrimitive: {
          type: 'click',
          locator: { strategy: 'testid', value: 'xyz' },
        },
        confidence: 0.95,
        sourceJourneys: ['JRN-TEST-003'],
        successCount: 10,
        failCount: 0,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        promotedToCore: false,
      };
      saveLearnedPatterns([pattern], { llkbRoot });

      const result = mapStepText('Custom action xyz', {
        useLlkb: false,
        llkbRoot,
      });

      // Should not match since LLKB is disabled
      expect(result.primitive).toBeNull();
      expect(result.matchSource).toBe('none');
    });

    it('should not match when confidence is below threshold', () => {
      // Ensure clean slate for this test
      clearLearnedPatterns({ llkbRoot });

      // Create a low-confidence pattern
      const pattern: LearnedPattern = {
        id: 'LP-LOWCONF-001',
        originalText: 'Moderate confidence action xyz',
        normalizedText: 'moderate confidence action xyz',
        mappedPrimitive: {
          type: 'click',
          locator: { strategy: 'testid', value: 'low' },
        },
        confidence: 0.5, // Below default threshold of 0.7
        sourceJourneys: ['JRN-TEST-004'],
        successCount: 2,
        failCount: 2,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        promotedToCore: false,
      };
      saveLearnedPatterns([pattern], { llkbRoot });

      // Should not match with default threshold (0.7 > 0.5)
      const result = mapStepText('Moderate confidence action xyz', {
        useLlkb: true,
        llkbRoot,
      });
      expect(result.primitive).toBeNull();
    });

    it('should match when confidence exceeds custom threshold', async () => {
      // Ensure clean slate for this test
      clearLearnedPatterns({ llkbRoot });

      // Re-initialize LLKB to ensure module is loaded
      const llkbReady = await initializeLlkb();
      expect(llkbReady).toBe(true);
      expect(isLlkbAvailable()).toBe(true);

      // Create a medium-confidence pattern
      // Note: Using words that aren't synonyms in the glossary to avoid normalization surprises
      const pattern: LearnedPattern = {
        id: 'LP-MEDCONF-001',
        originalText: 'Medium confidence level abc',
        normalizedText: 'medium confidence level abc',
        mappedPrimitive: {
          type: 'click',
          locator: { strategy: 'testid', value: 'med' },
        },
        confidence: 0.5, // Above custom threshold of 0.4
        sourceJourneys: ['JRN-TEST-005'],
        successCount: 2,
        failCount: 2,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        promotedToCore: false,
      };
      saveLearnedPatterns([pattern], { llkbRoot });

      // Verify patterns are saved
      const savedPatterns = loadLearnedPatterns({ llkbRoot });
      expect(savedPatterns).toHaveLength(1);
      expect(savedPatterns[0]?.normalizedText).toBe('medium confidence level abc');

      // Verify normalization matches
      const normalizedText = normalizeStepText('Medium confidence level abc');
      expect(normalizedText).toBe('medium confidence level abc');

      // Verify direct pattern matching works (bypassing stepMapper)
      const directMatch = matchLlkbPattern('Medium confidence level abc', {
        llkbRoot,
        minConfidence: 0.4,
      });
      expect(directMatch).not.toBeNull();
      expect(directMatch?.patternId).toBe('LP-MEDCONF-001');

      // Now test through stepMapper
      const result = mapStepText('Medium confidence level abc', {
        useLlkb: true,
        llkbRoot,
        llkbMinConfidence: 0.4,
      });
      expect(result.primitive).not.toBeNull();
      expect(result.matchSource).toBe('llkb');
    });
  });

  describe('Learning loop (recordPatternSuccess)', () => {
    beforeEach(async () => {
      await initializeLlkb();
    });

    it('should record success when journeyId is provided', () => {
      // Create an initial pattern
      const pattern: LearnedPattern = {
        id: 'LP-LEARN-001',
        originalText: 'Trigger the learning loop',
        normalizedText: 'trigger the learning loop',
        mappedPrimitive: {
          type: 'click',
          locator: { strategy: 'testid', value: 'learn' },
        },
        confidence: 0.8,
        sourceJourneys: ['JRN-INITIAL'],
        successCount: 5,
        failCount: 1,
        lastUsed: '2026-01-01T00:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
        promotedToCore: false,
      };
      saveLearnedPatterns([pattern], { llkbRoot });

      // Map with journeyId to trigger learning
      const result = mapStepText('Trigger the learning loop', {
        useLlkb: true,
        llkbRoot,
        journeyId: 'JRN-NEW-001',
      });

      expect(result.primitive).not.toBeNull();
      expect(result.matchSource).toBe('llkb');

      // Check that the pattern was updated (successCount increased)
      const patterns = loadLearnedPatterns({ llkbRoot });
      const updatedPattern = patterns.find((p) => p.id === 'LP-LEARN-001');

      expect(updatedPattern).toBeDefined();
      expect(updatedPattern!.successCount).toBe(6); // Increased from 5
      expect(updatedPattern!.sourceJourneys).toContain('JRN-NEW-001');
    });

    it('should not record success when journeyId is not provided', () => {
      // Note: normalizedText must be all lowercase (normalizeStepText lowercases everything)
      const pattern: LearnedPattern = {
        id: 'LP-NOLEARN-001',
        originalText: 'No learning without journey identifier',
        normalizedText: 'no learning without journey identifier',
        mappedPrimitive: {
          type: 'click',
          locator: { strategy: 'testid', value: 'nolearn' },
        },
        confidence: 0.8,
        sourceJourneys: ['JRN-INITIAL'],
        successCount: 5,
        failCount: 0,
        lastUsed: '2026-01-01T00:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
        promotedToCore: false,
      };
      saveLearnedPatterns([pattern], { llkbRoot });

      // Map WITHOUT journeyId
      const result = mapStepText('No learning without journey identifier', {
        useLlkb: true,
        llkbRoot,
        // journeyId not provided
      });

      expect(result.primitive).not.toBeNull();
      expect(result.matchSource).toBe('llkb');

      // Check that successCount was NOT increased
      const patterns = loadLearnedPatterns({ llkbRoot });
      const unchangedPattern = patterns.find((p) => p.id === 'LP-NOLEARN-001');

      expect(unchangedPattern).toBeDefined();
      expect(unchangedPattern!.successCount).toBe(5); // Unchanged
    });
  });

  describe('getMappingStats with LLKB', () => {
    it('should track LLKB matches in stats', () => {
      const mappings = [
        {
          primitive: { type: 'click' as const, locator: { strategy: 'text' as const, value: 'x' } },
          sourceText: 'click',
          isAssertion: false,
          matchSource: 'pattern' as const,
        },
        {
          primitive: { type: 'click' as const, locator: { strategy: 'testid' as const, value: 'y' } },
          sourceText: 'llkb match',
          isAssertion: false,
          matchSource: 'llkb' as const,
          llkbPatternId: 'LP-001',
          llkbConfidence: 0.9,
        },
        {
          primitive: { type: 'expectVisible' as const, locator: { strategy: 'text' as const, value: 'z' } },
          sourceText: 'hints match',
          isAssertion: true,
          matchSource: 'hints' as const,
        },
        {
          primitive: null,
          sourceText: 'blocked',
          isAssertion: false,
          message: 'unmapped',
          matchSource: 'none' as const,
        },
      ];

      const stats = getMappingStats(mappings);

      expect(stats.total).toBe(4);
      expect(stats.patternMatches).toBe(1);
      expect(stats.llkbMatches).toBe(1);
      expect(stats.hintMatches).toBe(1);
    });
  });
});
