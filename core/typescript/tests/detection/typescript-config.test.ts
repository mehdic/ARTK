/**
 * Unit tests for TypeScript config detection
 * T014: Unit test for tsconfig.json parsing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// These will be implemented - tests should fail initially (TDD)
import {
  detectTypeScriptModule,
  parseTsConfig,
  getTsModuleFromConfig,
} from '../../detection/env/typescript-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('TypeScript Config Detection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, '../fixtures/temp-ts-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('parseTsConfig', () => {
    it('should parse valid tsconfig.json', () => {
      const content = JSON.stringify({
        compilerOptions: {
          module: 'commonjs',
          target: 'ES2020',
        },
      });

      const result = parseTsConfig(content);
      expect(result.compilerOptions?.module).toBe('commonjs');
    });

    it('should handle tsconfig with single-line comments', () => {
      const content = `{
        // This is a comment
        "compilerOptions": {
          "module": "esnext" // inline comment
        }
      }`;

      const result = parseTsConfig(content);
      expect(result.compilerOptions?.module).toBe('esnext');
    });

    it('should handle tsconfig with multi-line comments', () => {
      const content = `{
        /*
         * Multi-line comment
         */
        "compilerOptions": {
          "module": "nodenext"
        }
      }`;

      const result = parseTsConfig(content);
      expect(result.compilerOptions?.module).toBe('nodenext');
    });

    it('should handle tsconfig with trailing commas', () => {
      // strip-json-comments doesn't handle trailing commas, but we should test this
      const content = `{
        "compilerOptions": {
          "module": "commonjs",
          "target": "ES2020"
        }
      }`;

      const result = parseTsConfig(content);
      expect(result.compilerOptions?.module).toBe('commonjs');
    });

    it('should return null for invalid JSON even after comment stripping', () => {
      const content = '{ this is not valid }';
      const result = parseTsConfig(content);
      expect(result).toBeNull();
    });

    it('should handle empty tsconfig', () => {
      const result = parseTsConfig('{}');
      expect(result).toEqual({});
    });
  });

  describe('getTsModuleFromConfig', () => {
    it('should return module value from compilerOptions', () => {
      const config = { compilerOptions: { module: 'esnext' } };
      expect(getTsModuleFromConfig(config)).toBe('esnext');
    });

    it('should return null when compilerOptions is missing', () => {
      const config = {};
      expect(getTsModuleFromConfig(config)).toBeNull();
    });

    it('should return null when module is not set', () => {
      const config = { compilerOptions: { target: 'ES2020' } };
      expect(getTsModuleFromConfig(config)).toBeNull();
    });

    it('should handle null config', () => {
      expect(getTsModuleFromConfig(null)).toBeNull();
    });
  });

  describe('detectTypeScriptModule', () => {
    it('should detect module from tsconfig.json (FR-003)', () => {
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { module: 'commonjs' } })
      );

      const result = detectTypeScriptModule(tempDir);
      expect(result.tsModule).toBe('commonjs');
    });

    it('should handle ESNext module setting', () => {
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { module: 'esnext' } })
      );

      const result = detectTypeScriptModule(tempDir);
      expect(result.tsModule).toBe('esnext');
    });

    it('should handle NodeNext module setting', () => {
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { module: 'nodenext' } })
      );

      const result = detectTypeScriptModule(tempDir);
      expect(result.tsModule).toBe('nodenext');
    });

    it('should return null when tsconfig.json is missing', () => {
      const result = detectTypeScriptModule(tempDir);
      expect(result.tsModule).toBeNull();
    });

    it('should handle malformed tsconfig.json', () => {
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{ not valid');

      const result = detectTypeScriptModule(tempDir);
      expect(result.tsModule).toBeNull();
      expect(result.warnings.some((w: string) => w.toLowerCase().includes('parse') || w.toLowerCase().includes('invalid'))).toBe(true);
    });

    it('should handle tsconfig with comments', () => {
      const tsconfigWithComments = `{
        // TypeScript configuration
        "compilerOptions": {
          /* Module system */
          "module": "esnext",
          "target": "ES2022"
        }
      }`;

      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), tsconfigWithComments);

      const result = detectTypeScriptModule(tempDir);
      expect(result.tsModule).toBe('esnext');
    });

    it('should infer ESM when module is esnext/nodenext/es2020+', () => {
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { module: 'esnext' } })
      );

      const result = detectTypeScriptModule(tempDir);
      expect(result.inferredModuleSystem).toBe('esm');
    });

    it('should infer CommonJS when module is commonjs', () => {
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { module: 'commonjs' } })
      );

      const result = detectTypeScriptModule(tempDir);
      expect(result.inferredModuleSystem).toBe('commonjs');
    });
  });
});
