/**
 * Unit tests for dependency-compat validation rule
 * T049: Unit test for dependency-compat rule
 *
 * This rule checks that project dependencies are compatible
 * with the detected module system (e.g., nanoid v5 is ESM-only).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { DependencyCompatRule } from '../../../validation/rules/dependency-compat.js';
import type { ValidationIssue } from '../../../types/validation-result.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('DependencyCompatRule', () => {
  const rule = new DependencyCompatRule();

  describe('config', () => {
    it('should have correct rule ID', () => {
      expect(rule.config.id).toBe('dependency-compat');
    });

    it('should have correct name', () => {
      expect(rule.config.name).toBe('Dependency Compatibility');
    });

    it('should have warning as default strictness', () => {
      expect(rule.config.defaultStrictness).toBe('warning');
    });
  });

  describe('ESM-only packages detection', () => {
    it('should know about common ESM-only packages', () => {
      // The rule should have a list of known ESM-only packages
      expect(rule.getEsmOnlyPackages()).toContain('nanoid');
      expect(rule.getEsmOnlyPackages()).toContain('chalk');
      expect(rule.getEsmOnlyPackages()).toContain('execa');
      expect(rule.getEsmOnlyPackages()).toContain('got');
      expect(rule.getEsmOnlyPackages()).toContain('p-limit');
    });

    it('should include version constraints for ESM-only packages', () => {
      const constraints = rule.getEsmOnlyConstraints();
      // nanoid v5+ is ESM-only
      expect(constraints.nanoid).toBe('>=5.0.0');
      // chalk v5+ is ESM-only
      expect(constraints.chalk).toBe('>=5.0.0');
    });
  });

  describe('validate package.json dependencies', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = path.join(__dirname, '../../fixtures/temp-deps-' + Date.now());
      fs.mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    it('should detect ESM-only package in CommonJS project', () => {
      const packageJson = {
        name: 'test-project',
        type: 'commonjs',
        dependencies: {
          nanoid: '^5.0.0',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const issues = rule.validateDependencies(tempDir, 'commonjs');

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].ruleId).toBe('dependency-compat');
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].message).toContain('nanoid');
      expect(issues[0].message).toContain('ESM-only');
    });

    it('should not flag ESM-only package in ESM project', () => {
      const packageJson = {
        name: 'test-project',
        type: 'module',
        dependencies: {
          nanoid: '^5.0.0',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const issues = rule.validateDependencies(tempDir, 'esm');

      expect(issues).toEqual([]);
    });

    it('should not flag older versions of packages', () => {
      const packageJson = {
        name: 'test-project',
        type: 'commonjs',
        dependencies: {
          nanoid: '^4.0.0', // v4 is CommonJS compatible
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const issues = rule.validateDependencies(tempDir, 'commonjs');

      expect(issues).toEqual([]);
    });

    it('should detect multiple ESM-only packages', () => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          nanoid: '^5.0.0',
          chalk: '^5.0.0',
          execa: '^8.0.0',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const issues = rule.validateDependencies(tempDir, 'commonjs');

      expect(issues.length).toBe(3);
    });

    it('should check devDependencies too', () => {
      const packageJson = {
        name: 'test-project',
        devDependencies: {
          nanoid: '^5.0.0',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const issues = rule.validateDependencies(tempDir, 'commonjs');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('should provide suggested fix with compatible version', () => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          nanoid: '^5.0.0',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const issues = rule.validateDependencies(tempDir, 'commonjs');

      expect(issues[0].suggestedFix).toBeTruthy();
      // Should suggest downgrading to v4 or using alternative
      expect(
        issues[0].suggestedFix?.includes('4') ||
          issues[0].suggestedFix?.includes('alternative')
      ).toBe(true);
    });

    it('should handle missing package.json gracefully', () => {
      const issues = rule.validateDependencies(tempDir, 'commonjs');

      // Should return empty or a single issue about missing package.json
      expect(issues.length).toBeLessThanOrEqual(1);
    });

    it('should handle invalid package.json gracefully', () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), 'not valid json');

      const issues = rule.validateDependencies(tempDir, 'commonjs');

      // Should return empty or a single issue about invalid package.json
      expect(issues.length).toBeLessThanOrEqual(1);
    });

    it('should report correct file path', () => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          nanoid: '^5.0.0',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const issues = rule.validateDependencies(tempDir, 'commonjs');

      expect(issues[0].file).toBe(path.join(tempDir, 'package.json'));
    });
  });

  describe('validate method (file-based)', () => {
    it('should detect imports of ESM-only packages in CommonJS', () => {
      const content = `
        import { nanoid } from 'nanoid';
        const id = nanoid();
      `;

      const issues = rule.validate('/path/to/file.ts', content, 'commonjs');

      // This should detect the import of an ESM-only package
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].message).toContain('nanoid');
    });

    it('should detect require of ESM-only packages in CommonJS', () => {
      const content = `
        const { nanoid } = require('nanoid');
      `;

      const issues = rule.validate('/path/to/file.ts', content, 'commonjs');

      expect(issues.length).toBeGreaterThan(0);
    });

    it('should not flag ESM-only package imports in ESM', () => {
      const content = `
        import { nanoid } from 'nanoid';
      `;

      const issues = rule.validate('/path/to/file.ts', content, 'esm');

      expect(issues).toEqual([]);
    });

    it('should not flag non-ESM-only packages', () => {
      const content = `
        import { z } from 'zod';
        import fs from 'fs';
      `;

      const issues = rule.validate('/path/to/file.ts', content, 'commonjs');

      expect(issues).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty file', () => {
      const issues = rule.validate('/path/to/file.ts', '', 'commonjs');
      expect(issues).toEqual([]);
    });

    it('should handle files with no imports', () => {
      const content = `
        const x = 1;
        export default x;
      `;
      const issues = rule.validate('/path/to/file.ts', content, 'commonjs');
      expect(issues).toEqual([]);
    });

    it('should handle dynamic imports of ESM-only packages', () => {
      const content = `
        const nanoid = await import('nanoid');
      `;
      const issues = rule.validate('/path/to/file.ts', content, 'commonjs');

      // Dynamic imports might work in CommonJS if wrapped properly
      // but should still warn
      expect(issues.length).toBeLessThanOrEqual(1);
    });
  });
});
