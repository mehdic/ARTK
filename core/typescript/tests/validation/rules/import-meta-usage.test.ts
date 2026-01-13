/**
 * Unit tests for import-meta-usage validation rule
 * T046: Unit test for import-meta-usage rule
 *
 * This rule detects usage of import.meta in CommonJS environments
 * where it would cause runtime errors.
 */

import { describe, it, expect } from 'vitest';
import { ImportMetaUsageRule } from '../../../validation/rules/import-meta-usage.js';
import type { ValidationIssue } from '../../../types/validation-result.js';

describe('ImportMetaUsageRule', () => {
  const rule = new ImportMetaUsageRule();

  describe('config', () => {
    it('should have correct rule ID', () => {
      expect(rule.config.id).toBe('import-meta-usage');
    });

    it('should have correct name', () => {
      expect(rule.config.name).toBe('Import Meta Usage');
    });

    it('should have error as default strictness', () => {
      expect(rule.config.defaultStrictness).toBe('error');
    });
  });

  describe('validate in CommonJS environment', () => {
    const moduleSystem = 'commonjs';

    it('should detect import.meta.url usage', () => {
      const content = `
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].ruleId).toBe('import-meta-usage');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('import.meta');
    });

    it('should detect import.meta.dirname usage', () => {
      const content = `
        const dir = import.meta.dirname;
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].message).toContain('import.meta');
    });

    it('should detect import.meta.filename usage', () => {
      const content = `
        const file = import.meta.filename;
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBeGreaterThan(0);
    });

    it('should detect import.meta.resolve usage', () => {
      const content = `
        const resolved = import.meta.resolve('./module.js');
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBeGreaterThan(0);
    });

    it('should report correct line numbers', () => {
      const content = `line 1
line 2
const url = import.meta.url;
line 4`;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBe(1);
      expect(issues[0].line).toBe(3);
    });

    it('should report correct file path', () => {
      const content = `const url = import.meta.url;`;
      const filePath = '/absolute/path/to/module.ts';
      const issues = rule.validate(filePath, content, moduleSystem);

      expect(issues[0].file).toBe(filePath);
    });

    it('should provide suggested fix', () => {
      const content = `const url = import.meta.url;`;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues[0].suggestedFix).toBeTruthy();
      expect(issues[0].suggestedFix).toContain('getDirname');
    });

    it('should detect multiple import.meta usages', () => {
      const content = `
        const url = import.meta.url;
        const dir = import.meta.dirname;
        const file = import.meta.filename;
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBe(3);
    });

    it('should return empty array for code without import.meta', () => {
      const content = `
        const __dirname = path.resolve('.');
        const fs = require('fs');
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues).toEqual([]);
    });

    it('should not flag import.meta in comments', () => {
      const content = `
        // This uses import.meta.url in ESM
        /* import.meta.dirname is also available */
        const dir = __dirname;
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      // Comments should be filtered out
      expect(issues.length).toBe(0);
    });

    it('should not flag import.meta in string literals', () => {
      const content = `
        const docs = "Use import.meta.url for ESM";
        const template = \`import.meta.dirname\`;
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      // String literals should be filtered out
      expect(issues.length).toBe(0);
    });
  });

  describe('validate in ESM environment', () => {
    const moduleSystem = 'esm';

    it('should not flag import.meta.url usage', () => {
      const content = `
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues).toEqual([]);
    });

    it('should not flag import.meta.dirname usage', () => {
      const content = `
        const dir = import.meta.dirname;
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues).toEqual([]);
    });

    it('should allow all import.meta properties in ESM', () => {
      const content = `
        const url = import.meta.url;
        const dir = import.meta.dirname;
        const file = import.meta.filename;
        const resolved = import.meta.resolve('./module.js');
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues).toEqual([]);
    });
  });
});
