/**
 * Unit tests for detection confidence scoring
 * T015: Unit test for confidence scoring
 */

import { describe, it, expect } from 'vitest';

// These will be implemented - tests should fail initially (TDD)
import {
  calculateConfidence,
  type DetectionSignals,
} from '../../detection/env/confidence.js';

describe('Detection Confidence Scoring', () => {
  describe('calculateConfidence', () => {
    it('should return "high" when package.json and tsconfig agree on CommonJS', () => {
      const signals: DetectionSignals = {
        packageJsonType: undefined, // No type = CommonJS
        tsconfigModule: 'commonjs',
      };

      const result = calculateConfidence(signals);
      expect(result.confidence).toBe('high');
    });

    it('should return "high" when package.json and tsconfig agree on ESM', () => {
      const signals: DetectionSignals = {
        packageJsonType: 'module',
        tsconfigModule: 'esnext',
      };

      const result = calculateConfidence(signals);
      expect(result.confidence).toBe('high');
    });

    it('should return "high" when only package.json is present', () => {
      const signals: DetectionSignals = {
        packageJsonType: 'module',
        tsconfigModule: null, // No tsconfig
      };

      const result = calculateConfidence(signals);
      expect(result.confidence).toBe('high');
    });

    it('should return "high" when only tsconfig is present', () => {
      const signals: DetectionSignals = {
        packageJsonType: undefined, // No package.json type
        tsconfigModule: 'esnext',
      };

      const result = calculateConfidence(signals);
      expect(result.confidence).toBe('high');
    });

    it('should return "medium" when package.json and tsconfig conflict (FR-008)', () => {
      const signals: DetectionSignals = {
        packageJsonType: 'module', // ESM
        tsconfigModule: 'commonjs', // CommonJS
      };

      const result = calculateConfidence(signals);
      expect(result.confidence).toBe('medium');
      expect(result.warnings.some((w: string) => w.toLowerCase().includes('conflict'))).toBe(true);
    });

    it('should return "high" when CommonJS package (implicit) + ESM tsconfig (no explicit conflict)', () => {
      // When packageJsonType is undefined, there's no explicit conflict - just tsconfig sets the module
      const signals: DetectionSignals = {
        packageJsonType: undefined, // CommonJS (default, implicit)
        tsconfigModule: 'esnext', // ESM
      };

      // No explicit package type means tsconfig determines the result
      const result = calculateConfidence(signals);
      expect(result.confidence).toBe('high');
    });

    it('should return "low" when fallback was used', () => {
      const signals: DetectionSignals = {
        packageJsonType: undefined,
        tsconfigModule: null,
        usedFallback: true,
      };

      const result = calculateConfidence(signals);
      expect(result.confidence).toBe('low');
    });

    it('should return "low" when detection timed out', () => {
      const signals: DetectionSignals = {
        packageJsonType: undefined,
        tsconfigModule: null,
        timedOut: true,
      };

      const result = calculateConfidence(signals);
      expect(result.confidence).toBe('low');
    });

    it('should include warnings in result', () => {
      const signals: DetectionSignals = {
        packageJsonType: 'module',
        tsconfigModule: 'commonjs',
      };

      const result = calculateConfidence(signals);
      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should prioritize TypeScript config for .ts files (Edge Case)', () => {
      const signals: DetectionSignals = {
        packageJsonType: 'module',
        tsconfigModule: 'commonjs',
      };

      const result = calculateConfidence(signals);
      // When there's a conflict, we should recommend using tsconfig for .ts files
      expect(result.recommendedModuleSystem).toBe('commonjs');
      expect(result.warnings.some((w: string) => w.toLowerCase().includes('typescript'))).toBe(true);
    });

    it('should handle nodenext as ESM-compatible', () => {
      const signals: DetectionSignals = {
        packageJsonType: 'module',
        tsconfigModule: 'nodenext',
      };

      const result = calculateConfidence(signals);
      expect(result.confidence).toBe('high'); // Both indicate ESM
    });

    it('should handle es2020/es2022 as ESM-compatible', () => {
      const signals: DetectionSignals = {
        packageJsonType: 'module',
        tsconfigModule: 'es2022',
      };

      const result = calculateConfidence(signals);
      expect(result.confidence).toBe('high');
    });
  });
});
