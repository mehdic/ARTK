/**
 * Unit tests for node-version detection
 * T012: Unit test for node-version parsing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// These will be implemented - tests should fail initially (TDD)
import {
  getNodeVersion,
  parseNodeVersion,
  determineESMCompatibility,
  validateNodeVersion,
} from '../../detection/env/node-version.js';

describe('Node Version Detection', () => {
  describe('parseNodeVersion', () => {
    it('should parse valid semver version string', () => {
      const result = parseNodeVersion('v18.12.1');
      expect(result).toEqual({
        major: 18,
        minor: 12,
        patch: 1,
        raw: '18.12.1',
      });
    });

    it('should parse version without "v" prefix', () => {
      const result = parseNodeVersion('20.0.0');
      expect(result).toEqual({
        major: 20,
        minor: 0,
        patch: 0,
        raw: '20.0.0',
      });
    });

    it('should parse Node 18.0.0 (minimum supported)', () => {
      const result = parseNodeVersion('v18.0.0');
      expect(result).toEqual({
        major: 18,
        minor: 0,
        patch: 0,
        raw: '18.0.0',
      });
    });

    it('should parse Node 20.11.0 (import.meta.dirname support)', () => {
      const result = parseNodeVersion('v20.11.0');
      expect(result).toEqual({
        major: 20,
        minor: 11,
        patch: 0,
        raw: '20.11.0',
      });
    });

    it('should throw for invalid version format', () => {
      expect(() => parseNodeVersion('invalid')).toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => parseNodeVersion('')).toThrow();
    });

    it('should handle pre-release versions', () => {
      // Node pre-release versions should still work
      const result = parseNodeVersion('v21.0.0-nightly');
      expect(result.major).toBe(21);
    });
  });

  describe('getNodeVersion', () => {
    it('should return the current Node.js version', () => {
      const result = getNodeVersion();

      // Should have the expected structure
      expect(result).toHaveProperty('major');
      expect(result).toHaveProperty('minor');
      expect(result).toHaveProperty('patch');
      expect(result).toHaveProperty('raw');

      // Should be valid numbers
      expect(typeof result.major).toBe('number');
      expect(typeof result.minor).toBe('number');
      expect(typeof result.patch).toBe('number');
      expect(typeof result.raw).toBe('string');
    });

    it('should return version >= 18.0.0 (current runtime)', () => {
      const result = getNodeVersion();
      // Test is running on Node 18+
      expect(result.major).toBeGreaterThanOrEqual(18);
    });
  });

  describe('validateNodeVersion', () => {
    it('should pass for Node >= 18.0.0', () => {
      expect(() =>
        validateNodeVersion({ major: 18, minor: 0, patch: 0, raw: '18.0.0' })
      ).not.toThrow();
    });

    it('should pass for Node 20.x', () => {
      expect(() =>
        validateNodeVersion({ major: 20, minor: 11, patch: 0, raw: '20.11.0' })
      ).not.toThrow();
    });

    it('should throw for Node < 18.0.0 (FR-009)', () => {
      expect(() =>
        validateNodeVersion({ major: 16, minor: 20, patch: 0, raw: '16.20.0' })
      ).toThrow(/Node.js version must be/);
    });

    it('should throw for Node 17.x', () => {
      expect(() =>
        validateNodeVersion({ major: 17, minor: 9, patch: 0, raw: '17.9.0' })
      ).toThrow(/Node.js version must be/);
    });
  });

  describe('determineESMCompatibility', () => {
    it('should return basic ESM support for Node 18.x (FR-004)', () => {
      const result = determineESMCompatibility({ major: 18, minor: 12, patch: 1, raw: '18.12.1' });
      expect(result).toEqual({
        supportsESM: true,
        supportsFullESM: false,
        supportsImportMeta: true,
        supportsBuiltinDirname: false,
      });
    });

    it('should return full ESM support for Node 20.x (FR-004)', () => {
      const result = determineESMCompatibility({ major: 20, minor: 0, patch: 0, raw: '20.0.0' });
      expect(result).toEqual({
        supportsESM: true,
        supportsFullESM: true,
        supportsImportMeta: true,
        supportsBuiltinDirname: false, // Requires 20.11.0+
      });
    });

    it('should return import.meta.dirname support for Node 20.11.0+', () => {
      const result = determineESMCompatibility({ major: 20, minor: 11, patch: 0, raw: '20.11.0' });
      expect(result).toEqual({
        supportsESM: true,
        supportsFullESM: true,
        supportsImportMeta: true,
        supportsBuiltinDirname: true,
      });
    });

    it('should return import.meta.dirname support for Node 22.x', () => {
      const result = determineESMCompatibility({ major: 22, minor: 0, patch: 0, raw: '22.0.0' });
      expect(result.supportsBuiltinDirname).toBe(true);
    });

    it('should not support ESM for Node < 18', () => {
      const result = determineESMCompatibility({ major: 16, minor: 20, patch: 0, raw: '16.20.0' });
      expect(result.supportsESM).toBe(false);
    });
  });
});
