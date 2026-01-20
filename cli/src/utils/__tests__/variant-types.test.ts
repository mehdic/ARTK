/**
 * Tests for variant-types.ts
 */

import { describe, it, expect } from 'vitest';
import { isVariantId, isModuleSystem } from '../variant-types.js';

describe('variant-types', () => {
  describe('isVariantId', () => {
    it('should return true for valid variant IDs', () => {
      expect(isVariantId('modern-esm')).toBe(true);
      expect(isVariantId('modern-cjs')).toBe(true);
      expect(isVariantId('legacy-16')).toBe(true);
      expect(isVariantId('legacy-14')).toBe(true);
    });

    it('should return false for invalid variant IDs', () => {
      expect(isVariantId('invalid')).toBe(false);
      expect(isVariantId('')).toBe(false);
      expect(isVariantId('modern')).toBe(false);
      expect(isVariantId('esm')).toBe(false);
      expect(isVariantId('MODERN-ESM')).toBe(false); // case sensitive
    });
  });

  describe('isModuleSystem', () => {
    it('should return true for valid module systems', () => {
      expect(isModuleSystem('esm')).toBe(true);
      expect(isModuleSystem('cjs')).toBe(true);
    });

    it('should return false for invalid module systems', () => {
      expect(isModuleSystem('invalid')).toBe(false);
      expect(isModuleSystem('')).toBe(false);
      expect(isModuleSystem('commonjs')).toBe(false);
      expect(isModuleSystem('module')).toBe(false);
      expect(isModuleSystem('ESM')).toBe(false); // case sensitive
    });
  });
});
