/**
 * CJS Build Integration Tests
 *
 * These tests verify that the CJS build variants work correctly:
 * - dist-cjs/ (modern-cjs, Node 18+)
 * - dist-legacy-16/ (Node 16+)
 * - dist-legacy-14/ (Node 14+)
 *
 * The tests verify:
 * 1. CJS files can be required without ESM errors
 * 2. Type definitions (.d.ts) are present
 * 3. Core exports are accessible
 * 4. No import.meta references in CJS builds
 *
 * NOTE: Tests gracefully skip if build artifacts don't exist.
 * Run `npm run build:variants` to build all variants before running these tests.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const CORE_ROOT = join(__dirname, '../..');

const CJS_VARIANTS = [
  { name: 'modern-cjs', dir: 'dist-cjs', nodeVersion: '18' },
  { name: 'legacy-16', dir: 'dist-legacy-16', nodeVersion: '16' },
  { name: 'legacy-14', dir: 'dist-legacy-14', nodeVersion: '14' },
];

/**
 * Helper to check if a variant is built
 */
function isVariantBuilt(dir: string): boolean {
  const distDir = join(CORE_ROOT, dir);
  return existsSync(distDir) && existsSync(join(distDir, 'index.cjs'));
}

describe('CJS Build Variants', () => {
  describe.each(CJS_VARIANTS)('$name variant', ({ name, dir }) => {
    const distDir = join(CORE_ROOT, dir);
    const variantBuilt = isVariantBuilt(dir);

    it('should have dist directory', () => {
      if (!variantBuilt) {
        console.log(`Skipping: ${name} variant not built (run npm run build:variants)`);
        return;
      }
      expect(existsSync(distDir)).toBe(true);
    });

    it('should have index.cjs entry point', () => {
      if (!variantBuilt) return;
      const indexPath = join(distDir, 'index.cjs');
      expect(existsSync(indexPath)).toBe(true);
    });

    it('should have type definitions (index.d.ts)', () => {
      if (!variantBuilt) return;
      const dtsPath = join(distDir, 'index.d.ts');
      expect(existsSync(dtsPath)).toBe(true);
    });

    it('should not have unguarded import.meta in .cjs files (except compat/validation)', () => {
      if (!variantBuilt) return;

      const cjsFiles = findCjsFiles(distDir);
      if (cjsFiles.length === 0) return; // Skip if no CJS files

      const filesWithIssues: string[] = [];

      for (const file of cjsFiles) {
        // Skip modules that intentionally use import.meta with proper guards:
        // - compat: environment detection with try-catch
        // - validation: may use import.meta for module resolution
        if (file.includes('/compat/') || file.includes('/validation/')) {
          continue;
        }

        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const problemLines = lines.filter((line, idx) => {
          // Skip comments
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) return false;
          // Skip source maps
          if (line.includes('sourceMappingURL')) return false;
          // Skip error message strings
          if (line.includes('"import.meta') || line.includes("'import.meta")) return false;
          // Skip throw/Error statements (error messages)
          if (line.includes('throw') || line.includes('Error(')) return false;
          // Skip lines inside try blocks (look for nearby try)
          const nearbyLines = lines.slice(Math.max(0, idx - 5), idx + 1).join('\n');
          if (nearbyLines.includes('try {') || nearbyLines.includes('try{')) return false;
          // Look for actual import.meta.url calls
          return /\bimport\.meta\.url\b/.test(line);
        });

        if (problemLines.length > 0) {
          filesWithIssues.push(file);
        }
      }

      // Fail the test if unguarded import.meta found
      // The require() test below provides additional runtime verification
      expect(filesWithIssues).toEqual([]);
    });

    it('should be requireable by Node.js', () => {
      if (!variantBuilt) return;
      const indexPath = join(distDir, 'index.cjs');

      // Use child_process to test require in isolation
      const testScript = `
        try {
          const m = require('${indexPath.replace(/\\/g, '\\\\')}');
          const keys = Object.keys(m);
          if (keys.length === 0) {
            console.error('No exports found');
            process.exit(1);
          }
          console.log(JSON.stringify({ success: true, exportCount: keys.length }));
        } catch (e) {
          console.error(JSON.stringify({ success: false, error: e.message }));
          process.exit(1);
        }
      `;

      try {
        const result = execSync(`node -e "${testScript}"`, {
          encoding: 'utf-8',
          timeout: 10000,
        });
        const parsed = JSON.parse(result.trim());
        expect(parsed.success).toBe(true);
        expect(parsed.exportCount).toBeGreaterThan(0);
      } catch (error: any) {
        // If the command failed, try to parse the error
        const stderr = error.stderr?.toString() || error.message;
        throw new Error(`Failed to require ${name} variant: ${stderr}`);
      }
    });

    it('should export core functions', () => {
      if (!variantBuilt) return;
      const indexPath = join(distDir, 'index.cjs');

      // Check for expected exports
      const expectedExports = [
        'ARTKConfigError',
        'expect', // Re-exported from @playwright/test
      ];

      const testScript = `
        const m = require('${indexPath.replace(/\\/g, '\\\\')}');
        const exports = Object.keys(m);
        console.log(JSON.stringify(exports));
      `;

      try {
        const result = execSync(`node -e "${testScript}"`, {
          encoding: 'utf-8',
          timeout: 10000,
        });
        const exports = JSON.parse(result.trim());

        for (const expected of expectedExports) {
          expect(exports).toContain(expected);
        }
      } catch (error: any) {
        const stderr = error.stderr?.toString() || error.message;
        throw new Error(`Failed to check exports for ${name}: ${stderr}`);
      }
    });

    it('should have submodule exports', () => {
      if (!variantBuilt) return;
      const submodules = ['config', 'auth', 'fixtures', 'errors', 'llkb'];

      for (const submodule of submodules) {
        const submodulePath = join(distDir, submodule, 'index.cjs');
        if (existsSync(submodulePath)) {
          // Verify it's requireable
          const testScript = `
            try {
              require('${submodulePath.replace(/\\/g, '\\\\')}');
              console.log('ok');
            } catch (e) {
              console.error(e.message);
              process.exit(1);
            }
          `;

          try {
            const result = execSync(`node -e "${testScript}"`, {
              encoding: 'utf-8',
              timeout: 5000,
            });
            expect(result.trim()).toBe('ok');
          } catch (error: any) {
            const stderr = error.stderr?.toString() || error.message;
            throw new Error(`Failed to require ${name}/${submodule}: ${stderr}`);
          }
        }
      }
    });
  });
});

describe('Autogen CJS Build', () => {
  const autogenRoot = join(CORE_ROOT, 'autogen');

  describe.each(CJS_VARIANTS)('$name variant', ({ name, dir }) => {
    const distDir = join(autogenRoot, dir);

    it('should have dist directory', () => {
      // Skip if autogen doesn't have this variant built
      if (!existsSync(distDir)) {
        return;
      }
      expect(existsSync(distDir)).toBe(true);
    });

    it('should have CLI entry point', () => {
      const cliPath = join(distDir, 'cli', 'index.cjs');
      if (!existsSync(distDir)) {
        return; // Skip if variant not built
      }
      expect(existsSync(cliPath)).toBe(true);
    });

    it('should have CLI with --help option', () => {
      const cliPath = join(distDir, 'cli', 'index.cjs');
      if (!existsSync(cliPath)) {
        return; // Skip if not built
      }

      try {
        const result = execSync(`node "${cliPath}" --help`, {
          encoding: 'utf-8',
          timeout: 10000,
          cwd: autogenRoot,
        });
        expect(result).toContain('Usage:');
        expect(result).toContain('artk-autogen');
      } catch (error: any) {
        const stderr = error.stderr?.toString() || error.message;
        throw new Error(`CLI --help failed for ${name}: ${stderr}`);
      }
    });
  });
});

describe('Package.json Variant Files', () => {
  const variantPackageFiles = [
    { file: 'package-cjs.json', variant: 'modern-cjs' },
    { file: 'package-legacy-16.json', variant: 'legacy-16' },
    { file: 'package-legacy-14.json', variant: 'legacy-14' },
  ];

  describe.each(variantPackageFiles)('$file', ({ file, variant }) => {
    const filePath = join(CORE_ROOT, file);

    it('should exist', () => {
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have correct variant metadata', () => {
      if (!existsSync(filePath)) return;

      const content = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(content.artkVariant).toBeDefined();
      expect(content.artkVariant.id).toBe(variant);
      expect(content.artkVariant.moduleSystem).toBe('cjs');
    });

    it('should use .cjs file extensions in exports', () => {
      if (!existsSync(filePath)) return;

      const content = JSON.parse(readFileSync(filePath, 'utf-8'));

      // Check main field
      if (content.main) {
        expect(content.main).toMatch(/\.cjs$/);
      }

      // Check exports if present
      if (content.exports) {
        for (const [key, value] of Object.entries(content.exports)) {
          if (typeof value === 'object' && value !== null) {
            const exp = value as Record<string, string>;
            if (exp.require) {
              expect(exp.require).toMatch(/\.cjs$/);
            }
          }
        }
      }
    });

    it('should NOT have "type": "module"', () => {
      if (!existsSync(filePath)) return;

      const content = JSON.parse(readFileSync(filePath, 'utf-8'));
      // CJS variants should either not have "type" or have "type": "commonjs"
      if (content.type) {
        expect(content.type).toBe('commonjs');
      }
    });
  });
});

describe('Bootstrap Path Resolution', () => {
  /**
   * These tests verify that package.json files use paths that will work
   * AFTER bootstrap.sh copies variant dist to vendor/artk-core/dist/
   *
   * CRITICAL: bootstrap.sh always copies to ./dist/ regardless of variant:
   *   cp -r "$VARIANT_DIST_PATH"/* "$ARTK_E2E/vendor/artk-core/dist/"
   *
   * So all variant package.json files MUST use ./dist/ paths, not ./dist-legacy-XX/
   */

  const packageFiles = [
    { file: 'package-cjs.json', variant: 'modern-cjs' },
    { file: 'package-legacy-16.json', variant: 'legacy-16' },
    { file: 'package-legacy-14.json', variant: 'legacy-14' },
  ];

  describe.each(packageFiles)('$file paths for bootstrap', ({ file, variant }) => {
    const filePath = join(CORE_ROOT, file);

    it('should use ./dist/ paths (not ./dist-legacy-XX/) for bootstrap compatibility', () => {
      if (!existsSync(filePath)) return;

      const content = readFileSync(filePath, 'utf-8');
      const pkg = JSON.parse(content);

      // Check main field - must point to ./dist/
      expect(pkg.main).toMatch(/^\.\/dist\//);
      expect(pkg.main).not.toMatch(/dist-legacy/);

      // Check types field
      if (pkg.types) {
        expect(pkg.types).toMatch(/^\.\/dist\//);
        expect(pkg.types).not.toMatch(/dist-legacy/);
      }

      // Check exports - all paths must use ./dist/
      if (pkg.exports) {
        const exportPaths = JSON.stringify(pkg.exports);
        expect(exportPaths).not.toContain('dist-legacy-16');
        expect(exportPaths).not.toContain('dist-legacy-14');
      }

      // Check files field - should reference 'dist' not variant-specific dirs
      if (pkg.files) {
        const filesStr = JSON.stringify(pkg.files);
        expect(filesStr).not.toContain('dist-legacy-16');
        expect(filesStr).not.toContain('dist-legacy-14');
      }
    });

    it('should have "type": "commonjs" for CJS variants', () => {
      if (!existsSync(filePath)) return;

      const pkg = JSON.parse(readFileSync(filePath, 'utf-8'));

      // All CJS variants MUST have type: commonjs
      expect(pkg.type).toBe('commonjs');
    });

    it('should have consistent paths in main, types, and exports', () => {
      if (!existsSync(filePath)) return;

      const pkg = JSON.parse(readFileSync(filePath, 'utf-8'));

      // Main should match exports root
      if (pkg.exports?.['.']?.require) {
        expect(pkg.main).toBe(pkg.exports['.'].require);
      }

      // Types should match exports types
      if (pkg.exports?.['.']?.types) {
        expect(pkg.types).toBe(pkg.exports['.'].types);
      }
    });
  });

  describe('Autogen package files for bootstrap', () => {
    const autogenRoot = join(CORE_ROOT, 'autogen');
    const autogenPackageFiles = [
      { file: 'package-cjs.json', variant: 'modern-cjs' },
      { file: 'package-legacy-16.json', variant: 'legacy-16' },
      { file: 'package-legacy-14.json', variant: 'legacy-14' },
    ];

    describe.each(autogenPackageFiles)('autogen/$file', ({ file, variant }) => {
      const filePath = join(autogenRoot, file);

      it('should use dist/ paths (not dist-legacy-XX/)', () => {
        if (!existsSync(filePath)) return;

        const pkg = JSON.parse(readFileSync(filePath, 'utf-8'));

        // Main should use dist/ path
        expect(pkg.main).toMatch(/^dist\//);
        expect(pkg.main).not.toMatch(/dist-legacy/);

        // Bin paths should use dist/
        if (pkg.bin) {
          const binPaths = JSON.stringify(pkg.bin);
          expect(binPaths).not.toContain('dist-legacy');
        }
      });

      it('should have "type": "commonjs" for CJS variants', () => {
        if (!existsSync(filePath)) return;

        const pkg = JSON.parse(readFileSync(filePath, 'utf-8'));
        expect(pkg.type).toBe('commonjs');
      });
    });
  });
});

/**
 * Recursively find all .cjs files in a directory
 */
function findCjsFiles(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      findCjsFiles(fullPath, files);
    } else if (entry.name.endsWith('.cjs')) {
      files.push(fullPath);
    }
  }
  return files;
}
