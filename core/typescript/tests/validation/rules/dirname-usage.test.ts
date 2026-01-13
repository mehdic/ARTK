/**
 * Unit tests for dirname-usage validation rule
 * T047: Unit test for dirname-usage rule
 *
 * This rule detects usage of __dirname/__filename in ESM environments
 * where they are not available.
 */

import { describe, it, expect } from 'vitest';
import { DirnameUsageRule } from '../../../validation/rules/dirname-usage.js';
import type { ValidationIssue } from '../../../types/validation-result.js';

describe('DirnameUsageRule', () => {
  const rule = new DirnameUsageRule();

  describe('config', () => {
    it('should have correct rule ID', () => {
      expect(rule.config.id).toBe('dirname-usage');
    });

    it('should have correct name', () => {
      expect(rule.config.name).toBe('Dirname Usage');
    });

    it('should have error as default strictness', () => {
      expect(rule.config.defaultStrictness).toBe('error');
    });
  });

  describe('validate in ESM environment', () => {
    const moduleSystem = 'esm';

    it('should detect __dirname usage', () => {
      const content = `
        const configPath = path.join(__dirname, 'config.json');
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].ruleId).toBe('dirname-usage');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('__dirname');
    });

    it('should detect __filename usage', () => {
      const content = `
        console.log('Running:', __filename);
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].message).toContain('__filename');
    });

    it('should report correct line numbers', () => {
      const content = `line 1
line 2
const dir = __dirname;
line 4`;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBe(1);
      expect(issues[0].line).toBe(3);
    });

    it('should report correct file path', () => {
      const content = `const dir = __dirname;`;
      const filePath = '/absolute/path/to/module.ts';
      const issues = rule.validate(filePath, content, moduleSystem);

      expect(issues[0].file).toBe(filePath);
    });

    it('should provide suggested fix', () => {
      const content = `const dir = __dirname;`;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues[0].suggestedFix).toBeTruthy();
      expect(issues[0].suggestedFix).toContain('getDirname');
    });

    it('should detect both __dirname and __filename', () => {
      const content = `
        console.log(__dirname);
        console.log(__filename);
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBe(2);
    });

    it('should detect multiple occurrences on same line', () => {
      const content = `const x = path.join(__dirname, __filename);`;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBe(2);
    });

    it('should return empty array for code without __dirname/__filename', () => {
      const content = `
        import { getDirname } from '@artk/core/compat';
        const __dirname = getDirname(import.meta.url);
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      // This should be empty because __dirname here is a local variable declaration,
      // not the global CommonJS __dirname
      expect(issues.length).toBe(0);
    });

    it('should not flag __dirname in comments', () => {
      const content = `
        // Use __dirname for CommonJS
        /* __filename is the current file */
        import { getDirname } from '@artk/core/compat';
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBe(0);
    });

    it('should not flag __dirname in string literals', () => {
      const content = `
        const msg = "Use __dirname in CommonJS";
        const template = \`__filename is deprecated in ESM\`;
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBe(0);
    });

    it('should detect __dirname in function calls', () => {
      const content = `
        fs.readFileSync(path.join(__dirname, 'data.json'));
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBe(1);
    });

    it('should detect __dirname used as variable value', () => {
      const content = `
        const baseDir = __dirname;
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBe(1);
    });
  });

  describe('validate in CommonJS environment', () => {
    const moduleSystem = 'commonjs';

    it('should not flag __dirname usage', () => {
      const content = `
        const configPath = path.join(__dirname, 'config.json');
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues).toEqual([]);
    });

    it('should not flag __filename usage', () => {
      const content = `
        console.log('Running:', __filename);
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues).toEqual([]);
    });

    it('should allow all CommonJS globals', () => {
      const content = `
        const dir = __dirname;
        const file = __filename;
        const fs = require('fs');
        module.exports = { dir, file };
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty file', () => {
      const issues = rule.validate('/path/to/file.ts', '', 'esm');
      expect(issues).toEqual([]);
    });

    it('should handle file with only whitespace', () => {
      const issues = rule.validate('/path/to/file.ts', '   \n\n   ', 'esm');
      expect(issues).toEqual([]);
    });

    it('should handle variables named similarly to __dirname', () => {
      const content = `
        const my__dirname = 'custom';
        const ___dirname = 'also custom';
      `;
      // These should NOT be flagged as they're not the actual __dirname global
      const issues = rule.validate('/path/to/file.ts', content, 'esm');
      expect(issues.length).toBe(0);
    });
  });
});
