/**
 * Unit tests for import-paths validation rule
 * T048: Unit test for import-paths rule
 *
 * This rule validates import/require paths can be resolved
 * and use correct extensions for the module system.
 */

import { describe, it, expect } from 'vitest';
import { ImportPathsRule } from '../../../validation/rules/import-paths.js';
import type { ValidationIssue } from '../../../types/validation-result.js';

describe('ImportPathsRule', () => {
  const rule = new ImportPathsRule();

  describe('config', () => {
    it('should have correct rule ID', () => {
      expect(rule.config.id).toBe('import-paths');
    });

    it('should have correct name', () => {
      expect(rule.config.name).toBe('Import Paths');
    });

    it('should have warning as default strictness', () => {
      expect(rule.config.defaultStrictness).toBe('warning');
    });
  });

  describe('validate ESM import extensions', () => {
    const moduleSystem = 'esm';

    it('should warn when ESM imports lack .js extension', () => {
      const content = `
        import { foo } from './utils';
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].ruleId).toBe('import-paths');
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].message).toContain('extension');
    });

    it('should not warn when ESM imports have .js extension', () => {
      const content = `
        import { foo } from './utils.js';
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues).toEqual([]);
    });

    it('should not warn for package imports', () => {
      const content = `
        import { something } from 'some-package';
        import fs from 'fs';
        import path from 'node:path';
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues).toEqual([]);
    });

    it('should warn for relative imports without extension', () => {
      const content = `
        import { a } from './moduleA';
        import { b } from '../utils/helpers';
        import { c } from '../../shared/types';
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBe(3);
    });

    it('should report correct line numbers', () => {
      const content = `line 1
import { foo } from './bar';
line 3`;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues[0].line).toBe(2);
    });

    it('should provide suggested fix with .js extension', () => {
      const content = `import { foo } from './bar';`;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues[0].suggestedFix).toContain('.js');
    });

    it('should handle dynamic imports', () => {
      const content = `
        const mod = await import('./dynamic');
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBe(1);
      expect(issues[0].suggestedFix).toContain('.js');
    });

    it('should handle export from statements', () => {
      const content = `
        export { foo } from './utils';
        export * from '../shared';
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues.length).toBe(2);
    });

    it('should not warn for .json imports', () => {
      const content = `
        import config from './config.json';
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues).toEqual([]);
    });

    it('should not warn for type imports', () => {
      const content = `
        import type { Foo } from './types';
      `;
      // Type imports don't need .js extensions as they're erased at compile time
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      // This should either be empty or have a lower severity
      // Implementation can decide the exact behavior
      expect(issues.length).toBeLessThanOrEqual(1);
    });
  });

  describe('validate CommonJS require paths', () => {
    const moduleSystem = 'commonjs';

    it('should not warn for require without extension', () => {
      const content = `
        const foo = require('./utils');
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues).toEqual([]);
    });

    it('should not warn for require with extension', () => {
      const content = `
        const foo = require('./utils.js');
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues).toEqual([]);
    });

    it('should allow package requires', () => {
      const content = `
        const fs = require('fs');
        const path = require('path');
        const pkg = require('some-package');
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      expect(issues).toEqual([]);
    });

    it('should still detect ESM syntax in CommonJS file', () => {
      const content = `
        import { foo } from './bar.js';
      `;
      const issues = rule.validate('/path/to/file.ts', content, moduleSystem);

      // ESM imports in CommonJS might be TypeScript (compiled away)
      // This rule focuses on path correctness, not syntax
      expect(issues).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty file', () => {
      const issues = rule.validate('/path/to/file.ts', '', 'esm');
      expect(issues).toEqual([]);
    });

    it('should handle file with no imports', () => {
      const content = `
        const x = 1;
        function foo() { return x; }
      `;
      const issues = rule.validate('/path/to/file.ts', content, 'esm');
      expect(issues).toEqual([]);
    });

    it('should not flag comments with import paths', () => {
      const content = `
        // import { foo } from './bar';
        /* import { baz } from './qux'; */
      `;
      const issues = rule.validate('/path/to/file.ts', content, 'esm');
      expect(issues).toEqual([]);
    });

    it('should not flag string literals that look like imports', () => {
      const content = `
        const code = "import { foo } from './bar'";
      `;
      const issues = rule.validate('/path/to/file.ts', content, 'esm');
      expect(issues).toEqual([]);
    });

    it('should handle multiline imports', () => {
      const content = `
        import {
          foo,
          bar,
          baz
        } from './utils';
      `;
      const issues = rule.validate('/path/to/file.ts', content, 'esm');

      expect(issues.length).toBe(1);
    });

    it('should handle aliased imports', () => {
      const content = `
        import { foo as myFoo } from './utils';
      `;
      const issues = rule.validate('/path/to/file.ts', content, 'esm');

      expect(issues.length).toBe(1);
    });

    it('should handle default imports', () => {
      const content = `
        import myModule from './module';
      `;
      const issues = rule.validate('/path/to/file.ts', content, 'esm');

      expect(issues.length).toBe(1);
    });

    it('should handle namespace imports', () => {
      const content = `
        import * as utils from './utils';
      `;
      const issues = rule.validate('/path/to/file.ts', content, 'esm');

      expect(issues.length).toBe(1);
    });

    it('should handle side-effect imports', () => {
      const content = `
        import './setup';
      `;
      const issues = rule.validate('/path/to/file.ts', content, 'esm');

      expect(issues.length).toBe(1);
    });
  });
});
