/**
 * Unit tests for detection type definitions and type guards
 *
 * @group unit
 * @group types
 */

import { describe, expect, it } from 'vitest';
import { isDetectionResult } from '../detection.js';
import type { DetectionResult, DetectionSignal } from '../detection.js';

// =============================================================================
// isDetectionResult Tests
// =============================================================================

describe('isDetectionResult', () => {
  // Helper to create a valid DetectionResult for testing
  const createValidResult = (): DetectionResult => ({
    path: '/absolute/path/to/frontend',
    relativePath: '../frontend',
    confidence: 'high',
    type: 'react-spa',
    signals: ['package-dependency:react', 'entry-file:src/App.tsx'],
    score: 50,
    detailedSignals: [
      {
        type: 'package-dependency',
        source: 'package-dependency:react',
        weight: 30,
        description: 'Found react in dependencies',
      },
      {
        type: 'entry-file',
        source: 'entry-file:src/App.tsx',
        weight: 20,
      },
    ],
  });

  describe('valid inputs', () => {
    it('should return true for a valid DetectionResult', () => {
      const result = createValidResult();
      expect(isDetectionResult(result)).toBe(true);
    });

    it('should return true for a result with empty signals array', () => {
      const result = createValidResult();
      result.signals = [];
      result.detailedSignals = [];
      result.score = 0;
      expect(isDetectionResult(result)).toBe(true);
    });

    it('should return true for all valid confidence levels', () => {
      const result = createValidResult();

      result.confidence = 'high';
      expect(isDetectionResult(result)).toBe(true);

      result.confidence = 'medium';
      expect(isDetectionResult(result)).toBe(true);

      result.confidence = 'low';
      expect(isDetectionResult(result)).toBe(true);
    });

    it('should return true for all valid target types', () => {
      const result = createValidResult();
      const validTypes = ['react-spa', 'vue-spa', 'angular', 'next', 'nuxt', 'other'] as const;

      for (const type of validTypes) {
        result.type = type;
        expect(isDetectionResult(result)).toBe(true);
      }
    });

    it('should return true for detailedSignals without optional description', () => {
      const result = createValidResult();
      result.detailedSignals = [
        { type: 'package-dependency', source: 'package-dependency:react', weight: 30 },
      ];
      expect(isDetectionResult(result)).toBe(true);
    });

    it('should return true for score of 0', () => {
      const result = createValidResult();
      result.score = 0;
      expect(isDetectionResult(result)).toBe(true);
    });

    it('should return true for negative score', () => {
      const result = createValidResult();
      result.score = -10;
      expect(isDetectionResult(result)).toBe(true);
    });
  });

  describe('invalid inputs - basic types', () => {
    it('should return false for null', () => {
      expect(isDetectionResult(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isDetectionResult(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isDetectionResult('string')).toBe(false);
      expect(isDetectionResult(123)).toBe(false);
      expect(isDetectionResult(true)).toBe(false);
    });

    it('should return false for array', () => {
      expect(isDetectionResult([])).toBe(false);
      expect(isDetectionResult([createValidResult()])).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isDetectionResult({})).toBe(false);
    });
  });

  describe('invalid inputs - missing required fields', () => {
    it('should return false when path is missing', () => {
      const result = createValidResult();
      delete (result as any).path;
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when relativePath is missing', () => {
      const result = createValidResult();
      delete (result as any).relativePath;
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when confidence is missing', () => {
      const result = createValidResult();
      delete (result as any).confidence;
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when type is missing', () => {
      const result = createValidResult();
      delete (result as any).type;
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when signals is missing', () => {
      const result = createValidResult();
      delete (result as any).signals;
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when score is missing', () => {
      const result = createValidResult();
      delete (result as any).score;
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when detailedSignals is missing', () => {
      const result = createValidResult();
      delete (result as any).detailedSignals;
      expect(isDetectionResult(result)).toBe(false);
    });
  });

  describe('invalid inputs - wrong field types', () => {
    it('should return false when path is not a string', () => {
      const result = createValidResult();
      (result as any).path = 123;
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when relativePath is not a string', () => {
      const result = createValidResult();
      (result as any).relativePath = null;
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when confidence is invalid', () => {
      const result = createValidResult();
      (result as any).confidence = 'invalid';
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when type is invalid', () => {
      const result = createValidResult();
      (result as any).type = 'svelte-spa';
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when signals is not an array', () => {
      const result = createValidResult();
      (result as any).signals = 'not-an-array';
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when signals contains non-strings', () => {
      const result = createValidResult();
      (result as any).signals = ['valid', 123, 'also-valid'];
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when score is not a number', () => {
      const result = createValidResult();
      (result as any).score = '50';
      expect(isDetectionResult(result)).toBe(false);
    });
  });

  describe('invalid inputs - detailedSignals validation', () => {
    it('should return false when detailedSignals is not an array', () => {
      const result = createValidResult();
      (result as any).detailedSignals = 'not-an-array';
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when detailedSignals contains null', () => {
      const result = createValidResult();
      (result as any).detailedSignals = [null];
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when detailedSignals contains non-objects', () => {
      const result = createValidResult();
      (result as any).detailedSignals = ['string-not-object'];
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when signal is missing type', () => {
      const result = createValidResult();
      (result as any).detailedSignals = [
        { source: 'package-dependency:react', weight: 30 },
      ];
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when signal is missing source', () => {
      const result = createValidResult();
      (result as any).detailedSignals = [
        { type: 'package-dependency', weight: 30 },
      ];
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when signal is missing weight', () => {
      const result = createValidResult();
      (result as any).detailedSignals = [
        { type: 'package-dependency', source: 'package-dependency:react' },
      ];
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when signal type is not a string', () => {
      const result = createValidResult();
      (result as any).detailedSignals = [
        { type: 123, source: 'package-dependency:react', weight: 30 },
      ];
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when signal source is not a string', () => {
      const result = createValidResult();
      (result as any).detailedSignals = [
        { type: 'package-dependency', source: 123, weight: 30 },
      ];
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return false when signal weight is not a number', () => {
      const result = createValidResult();
      (result as any).detailedSignals = [
        { type: 'package-dependency', source: 'package-dependency:react', weight: '30' },
      ];
      expect(isDetectionResult(result)).toBe(false);
    });

    it('should return true when one signal is valid in array of multiple', () => {
      const result = createValidResult();
      result.detailedSignals = [
        { type: 'package-dependency', source: 'package-dependency:react', weight: 30 },
      ];
      expect(isDetectionResult(result)).toBe(true);
    });

    it('should return false when any signal in array is invalid', () => {
      const result = createValidResult();
      (result as any).detailedSignals = [
        { type: 'package-dependency', source: 'package-dependency:react', weight: 30 },
        { type: 'invalid', source: null, weight: 'bad' }, // Invalid
      ];
      expect(isDetectionResult(result)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return true for result with extra properties', () => {
      const result = createValidResult() as any;
      result.extraProperty = 'should be ignored';
      result.anotherExtra = { nested: true };
      expect(isDetectionResult(result)).toBe(true);
    });

    it('should return true for empty string path', () => {
      const result = createValidResult();
      result.path = '';
      expect(isDetectionResult(result)).toBe(true);
    });

    it('should return true for empty string relativePath', () => {
      const result = createValidResult();
      result.relativePath = '';
      expect(isDetectionResult(result)).toBe(true);
    });

    it('should handle very large signal arrays', () => {
      const result = createValidResult();
      result.signals = Array(1000).fill('package-dependency:react');
      result.detailedSignals = Array(1000).fill({
        type: 'package-dependency',
        source: 'package-dependency:react',
        weight: 30,
      });
      expect(isDetectionResult(result)).toBe(true);
    });
  });
});
