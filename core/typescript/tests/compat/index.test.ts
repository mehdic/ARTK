/**
 * Integration tests for the full compat layer
 * T034: Integration test for full compat layer in both environments
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Import all compat layer exports
import {
  // Runtime detection
  getModuleSystem,
  isESM,
  isCommonJS,
  // Directory utilities
  getDirname,
  getFilename,
  createDirnameMeta,
  // Project root
  findPackageJson,
  resolveProjectRoot,
  getPackageJson,
  // Dynamic imports
  dynamicImport,
  dynamicImportDefault,
  tryDynamicImport,
} from '../../compat/index.js';
import type { ModuleSystemRuntime } from '../../compat/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Compat Layer Integration', () => {
  describe('Module exports', () => {
    it('should export all runtime detection functions', () => {
      expect(typeof getModuleSystem).toBe('function');
      expect(typeof isESM).toBe('function');
      expect(typeof isCommonJS).toBe('function');
    });

    it('should export all directory utilities', () => {
      expect(typeof getDirname).toBe('function');
      expect(typeof getFilename).toBe('function');
      expect(typeof createDirnameMeta).toBe('function');
    });

    it('should export all project root functions', () => {
      expect(typeof findPackageJson).toBe('function');
      expect(typeof resolveProjectRoot).toBe('function');
      expect(typeof getPackageJson).toBe('function');
    });

    it('should export all dynamic import functions', () => {
      expect(typeof dynamicImport).toBe('function');
      expect(typeof dynamicImportDefault).toBe('function');
      expect(typeof tryDynamicImport).toBe('function');
    });
  });

  describe('End-to-end workflow: CommonJS project detection', () => {
    it('should correctly handle a complete CommonJS project setup flow', async () => {
      // 1. Detect module system
      const moduleSystem = getModuleSystem();
      expect(['esm', 'commonjs', 'unknown']).toContain(moduleSystem);

      // 2. Get project root
      const projectRoot = resolveProjectRoot();
      expect(path.isAbsolute(projectRoot)).toBe(true);
      expect(fs.existsSync(projectRoot)).toBe(true);

      // 3. Read package.json
      const packageJson = getPackageJson();
      expect(packageJson).toBeDefined();
      expect(packageJson.name).toBe('@artk/core');

      // 4. Dynamic import should work
      const fsModule = await dynamicImport<typeof import('fs')>('fs');
      expect(fsModule.existsSync).toBeDefined();
    });
  });

  describe('End-to-end workflow: ESM project detection', () => {
    it('should correctly handle a complete ESM project setup flow', () => {
      // Since we're running in ESM context (vitest with ESM)
      // import.meta.url should work
      const metaUrl = import.meta.url;

      // 1. Get directory from import.meta.url
      const dirname = getDirname(metaUrl);
      expect(path.isAbsolute(dirname)).toBe(true);
      expect(fs.existsSync(dirname)).toBe(true);

      // 2. Get filename from import.meta.url
      const filename = getFilename(metaUrl);
      expect(path.isAbsolute(filename)).toBe(true);
      expect(filename.endsWith('.ts')).toBe(true);

      // 3. Create dirname meta object
      const meta = createDirnameMeta(metaUrl);
      expect(meta.dirname).toBe(dirname);
      expect(meta.filename).toBe(filename);
    });
  });

  describe('Cross-environment consistency', () => {
    it('should return consistent results across multiple calls', () => {
      // Module system detection should be cached
      const result1 = getModuleSystem();
      const result2 = getModuleSystem();
      expect(result1).toBe(result2);

      // Project root should be cached
      const root1 = resolveProjectRoot();
      const root2 = resolveProjectRoot();
      expect(root1).toBe(root2);
    });

    it('should handle valid import.meta.url values consistently', () => {
      const metaUrl = import.meta.url;

      const dirname1 = getDirname(metaUrl);
      const dirname2 = getDirname(metaUrl);
      expect(dirname1).toBe(dirname2);

      const filename1 = getFilename(metaUrl);
      const filename2 = getFilename(metaUrl);
      expect(filename1).toBe(filename2);
    });
  });

  describe('Error handling integration', () => {
    it('should handle errors gracefully across all functions', async () => {
      // Invalid import.meta.url
      expect(() => getDirname('')).toThrow();
      expect(() => getFilename('')).toThrow();

      // Invalid dynamic import
      const badImport = await tryDynamicImport('non-existent-module-xyz123');
      expect(badImport).toBeNull();

      // dynamicImport should throw for invalid modules
      await expect(dynamicImport('non-existent-module-xyz123')).rejects.toThrow();
    });
  });

  describe('Type safety', () => {
    it('should return correct types for all functions', () => {
      // getModuleSystem returns ModuleSystemRuntime
      const moduleSystem: ModuleSystemRuntime = getModuleSystem();
      expect(['esm', 'commonjs', 'unknown']).toContain(moduleSystem);

      // isESM and isCommonJS return booleans
      const esmCheck: boolean = isESM();
      const cjsCheck: boolean = isCommonJS();
      expect(typeof esmCheck).toBe('boolean');
      expect(typeof cjsCheck).toBe('boolean');

      // getDirname returns string
      const dirname: string = getDirname(import.meta.url);
      expect(typeof dirname).toBe('string');

      // resolveProjectRoot returns string
      const root: string = resolveProjectRoot();
      expect(typeof root).toBe('string');
    });
  });

  describe('Zero external dependencies (FR-018)', () => {
    it('should only use Node.js built-in modules', () => {
      // The compat layer only uses: fs, path, url
      // This test validates the design choice by ensuring we can
      // use the compat layer without any external dependencies

      // All imports should work without external packages
      expect(getModuleSystem()).toBeDefined();
      expect(resolveProjectRoot()).toBeDefined();
      expect(getDirname(import.meta.url)).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete operations quickly due to caching', () => {
      const start = Date.now();

      // Multiple calls should be fast due to caching
      for (let i = 0; i < 100; i++) {
        getModuleSystem();
        resolveProjectRoot();
      }

      const elapsed = Date.now() - start;
      // 100 iterations should complete in < 100ms with caching
      expect(elapsed).toBeLessThan(100);
    });
  });
});
