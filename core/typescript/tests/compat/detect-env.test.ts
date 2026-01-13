/**
 * Unit tests for runtime environment detection
 * T033: Unit test for getModuleSystem()
 */

import { describe, it, expect } from 'vitest';

// These will be implemented
import {
  getModuleSystem,
  isESM,
  isCommonJS,
} from '../../compat/detect-env.js';

describe('Runtime Environment Detection', () => {
  describe('getModuleSystem', () => {
    it('should return a valid module system identifier', () => {
      const result = getModuleSystem();
      expect(['commonjs', 'esm', 'unknown']).toContain(result);
    });

    it('should return consistent results on repeated calls', () => {
      const first = getModuleSystem();
      const second = getModuleSystem();
      expect(first).toBe(second);
    });

    // This test runs in ESM context (vitest uses ESM)
    it('should detect ESM in this test environment', () => {
      const result = getModuleSystem();
      // vitest runs in ESM mode
      expect(result).toBe('esm');
    });
  });

  describe('isESM', () => {
    it('should return a boolean', () => {
      const result = isESM();
      expect(typeof result).toBe('boolean');
    });

    it('should be consistent with getModuleSystem', () => {
      const isEsmResult = isESM();
      const moduleSystem = getModuleSystem();

      if (isEsmResult) {
        expect(moduleSystem).toBe('esm');
      } else {
        expect(moduleSystem).not.toBe('esm');
      }
    });

    // In vitest ESM context
    it('should return true in ESM context', () => {
      expect(isESM()).toBe(true);
    });
  });

  describe('isCommonJS', () => {
    it('should return a boolean', () => {
      const result = isCommonJS();
      expect(typeof result).toBe('boolean');
    });

    it('should be opposite of isESM (when not unknown)', () => {
      const moduleSystem = getModuleSystem();
      if (moduleSystem !== 'unknown') {
        expect(isCommonJS()).toBe(!isESM());
      }
    });

    // In vitest ESM context
    it('should return false in ESM context', () => {
      expect(isCommonJS()).toBe(false);
    });
  });
});
