/**
 * Unit tests for module system detection
 * T013: Unit test for package.json module detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// These will be implemented - tests should fail initially (TDD)
import {
  detectModuleSystem,
  parsePackageJson,
  getModuleSystemFromType,
} from '../../detection/env/module-system.js';

// Test fixtures directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, '../fixtures/module-system');

describe('Module System Detection', () => {
  describe('getModuleSystemFromType', () => {
    it('should return "commonjs" when type field is absent', () => {
      expect(getModuleSystemFromType(undefined)).toBe('commonjs');
    });

    it('should return "commonjs" when type is "commonjs"', () => {
      expect(getModuleSystemFromType('commonjs')).toBe('commonjs');
    });

    it('should return "esm" when type is "module"', () => {
      expect(getModuleSystemFromType('module')).toBe('esm');
    });

    it('should return "commonjs" for any other value (fallback)', () => {
      expect(getModuleSystemFromType('invalid')).toBe('commonjs');
    });
  });

  describe('parsePackageJson', () => {
    it('should parse valid package.json with type field', () => {
      const mockContent = JSON.stringify({
        name: 'test-package',
        type: 'module',
        version: '1.0.0',
      });

      const result = parsePackageJson(mockContent);
      expect(result).toEqual({
        name: 'test-package',
        type: 'module',
        version: '1.0.0',
      });
    });

    it('should parse package.json without type field', () => {
      const mockContent = JSON.stringify({
        name: 'test-package',
        version: '1.0.0',
      });

      const result = parsePackageJson(mockContent);
      expect(result.type).toBeUndefined();
    });

    it('should throw for invalid JSON', () => {
      expect(() => parsePackageJson('{ invalid json')).toThrow();
    });

    it('should handle empty package.json', () => {
      const result = parsePackageJson('{}');
      expect(result).toEqual({});
    });
  });

  describe('detectModuleSystem', () => {
    let tempDir: string;

    beforeEach(() => {
      // Create a temp directory for test projects
      tempDir = path.join(__dirname, '../fixtures/temp-' + Date.now());
      fs.mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
      // Clean up temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    it('should detect CommonJS when package.json has no type field (FR-002)', () => {
      // Create package.json without type field
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' })
      );

      const result = detectModuleSystem(tempDir);
      expect(result.moduleSystem).toBe('commonjs');
      expect(result.detectionMethod).toBe('package.json');
    });

    it('should detect CommonJS when type is "commonjs" (FR-002)', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', type: 'commonjs', version: '1.0.0' })
      );

      const result = detectModuleSystem(tempDir);
      expect(result.moduleSystem).toBe('commonjs');
    });

    it('should detect ESM when type is "module" (FR-002)', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', type: 'module', version: '1.0.0' })
      );

      const result = detectModuleSystem(tempDir);
      expect(result.moduleSystem).toBe('esm');
      expect(result.detectionMethod).toBe('package.json');
    });

    it('should return fallback when package.json is missing', () => {
      const result = detectModuleSystem(tempDir);
      expect(result.moduleSystem).toBe('commonjs'); // Default fallback
      expect(result.detectionMethod).toBe('fallback');
      expect(result.warnings.some((w: string) => w.toLowerCase().includes('package.json'))).toBe(true);
    });

    it('should handle malformed package.json gracefully', () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{ invalid json');

      const result = detectModuleSystem(tempDir);
      expect(result.moduleSystem).toBe('commonjs'); // Fallback
      expect(result.warnings.some((w: string) => w.toLowerCase().includes('parse') || w.toLowerCase().includes('failed'))).toBe(true);
    });

    it('should return high confidence when detection is unambiguous', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', type: 'module', version: '1.0.0' })
      );

      const result = detectModuleSystem(tempDir);
      expect(result.confidence).toBe('high');
    });
  });
});
