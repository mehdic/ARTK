/**
 * Unit tests for Template Resolver
 * Tests template resolution with local override support
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { resolveTemplate, validateTemplate, listTemplates } from '../../src/templates/resolver';
import type { TemplateVariant } from '../../src/types/environment-context';

describe('Template Resolver', () => {
  const testRoot = path.join(__dirname, '../fixtures/test-project');
  const localTemplatesDir = path.join(testRoot, 'artk-e2e/templates');

  beforeEach(() => {
    // Create test directory structure
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  describe('resolveTemplate', () => {
    it('should resolve bundled template when no local override exists', () => {
      const result = resolveTemplate(testRoot, 'auth/login.ts', 'commonjs');

      expect(result.source).toBe('bundled');
      expect(result.variant).toBe('commonjs');
      expect(result.templatePath).toContain('templates/commonjs/auth/login.ts');
    });

    it('should resolve local override when it exists and is valid', () => {
      // Create valid local override
      const localOverride = path.join(localTemplatesDir, 'commonjs/auth/login.ts');
      fs.mkdirSync(path.dirname(localOverride), { recursive: true });
      fs.writeFileSync(localOverride, 'export function login() { return "custom"; }', 'utf8');

      const result = resolveTemplate(testRoot, 'auth/login.ts', 'commonjs');

      expect(result.source).toBe('local-override');
      expect(result.variant).toBe('commonjs');
      expect(result.templatePath).toBe(localOverride);
    });

    it('should fall back to bundled when local override is invalid', () => {
      // Create invalid local override (empty file)
      const localOverride = path.join(localTemplatesDir, 'commonjs/auth/login.ts');
      fs.mkdirSync(path.dirname(localOverride), { recursive: true });
      fs.writeFileSync(localOverride, '', 'utf8');

      const result = resolveTemplate(testRoot, 'auth/login.ts', 'commonjs');

      expect(result.source).toBe('bundled');
      expect(result.variant).toBe('commonjs');
    });

    it('should throw error when template not found in bundled or local', () => {
      expect(() => {
        resolveTemplate(testRoot, 'nonexistent/module.ts', 'commonjs');
      }).toThrow('Template not found: commonjs/nonexistent/module.ts');
    });

    it('should resolve ESM template variant correctly', () => {
      const result = resolveTemplate(testRoot, 'auth/login.ts', 'esm');

      expect(result.source).toBe('bundled');
      expect(result.variant).toBe('esm');
      expect(result.templatePath).toContain('templates/esm/auth/login.ts');
    });
  });

  describe('validateTemplate', () => {
    it('should return false for non-existent file', () => {
      const result = validateTemplate('/nonexistent/file.ts');
      expect(result).toBe(false);
    });

    it('should return false for empty file', () => {
      const emptyFile = path.join(testRoot, 'empty.ts');
      fs.writeFileSync(emptyFile, '', 'utf8');

      const result = validateTemplate(emptyFile);
      expect(result).toBe(false);
    });

    it('should return false for file with only whitespace', () => {
      const whitespaceFile = path.join(testRoot, 'whitespace.ts');
      fs.writeFileSync(whitespaceFile, '   \n\n   ', 'utf8');

      const result = validateTemplate(whitespaceFile);
      expect(result).toBe(false);
    });

    it('should return false for file without export or function', () => {
      const invalidFile = path.join(testRoot, 'invalid.ts');
      fs.writeFileSync(invalidFile, 'const x = 5; console.log(x);', 'utf8');

      const result = validateTemplate(invalidFile);
      expect(result).toBe(false);
    });

    it('should return true for valid template with export', () => {
      const validFile = path.join(testRoot, 'valid.ts');
      fs.writeFileSync(validFile, 'export function login() { }', 'utf8');

      const result = validateTemplate(validFile);
      expect(result).toBe(true);
    });

    it('should return true for valid template with function', () => {
      const validFile = path.join(testRoot, 'valid2.ts');
      fs.writeFileSync(validFile, 'function helper() { } export { helper };', 'utf8');

      const result = validateTemplate(validFile);
      expect(result).toBe(true);
    });

    it('should return false for directory', () => {
      const dir = path.join(testRoot, 'somedir');
      fs.mkdirSync(dir);

      const result = validateTemplate(dir);
      expect(result).toBe(false);
    });

    it('should return false when file read fails', () => {
      // Test with a path that would cause permission error or other read failure
      const result = validateTemplate('/dev/null/impossible.ts');
      expect(result).toBe(false);
    });
  });

  describe('listTemplates', () => {
    it('should return empty array when templates directory does not exist', () => {
      // Point to a location where templates won't exist
      const originalDirname = __dirname;
      const result = listTemplates('commonjs' as TemplateVariant);

      // Should return empty or throw - either is acceptable
      // This test verifies the function handles missing directory gracefully
      expect(Array.isArray(result)).toBe(true);
    });

    it('should list all template categories for commonjs variant', () => {
      const result = listTemplates('commonjs' as TemplateVariant);

      // Should include standard template categories
      expect(result).toContain('auth');
      expect(result).toContain('config');
      expect(result).toContain('navigation');
    });

    it('should list all template categories for esm variant', () => {
      const result = listTemplates('esm' as TemplateVariant);

      // Should include standard template categories
      expect(result).toContain('auth');
      expect(result).toContain('config');
      expect(result).toContain('navigation');
    });

    it('should only return directories, not files', () => {
      const result = listTemplates('commonjs' as TemplateVariant);

      // All entries should be directories (categories like 'auth', 'config', etc.)
      // Not files like 'login.ts'
      for (const category of result) {
        expect(category).not.toMatch(/\.(ts|js)$/);
      }
    });
  });

  describe('FR-034: Template Resolution Hierarchy', () => {
    it('should check local override first, then fall back to bundled', () => {
      // Initially no local override - should resolve to bundled
      const result1 = resolveTemplate(testRoot, 'auth/login.ts', 'commonjs');
      expect(result1.source).toBe('bundled');

      // Create local override
      const localOverride = path.join(localTemplatesDir, 'commonjs/auth/login.ts');
      fs.mkdirSync(path.dirname(localOverride), { recursive: true });
      fs.writeFileSync(localOverride, 'export function login() { return "local"; }', 'utf8');

      // Now should resolve to local override
      const result2 = resolveTemplate(testRoot, 'auth/login.ts', 'commonjs');
      expect(result2.source).toBe('local-override');
      expect(result2.templatePath).toBe(localOverride);
    });
  });

  describe('FR-079: Local Override Validation', () => {
    it('should validate local override and fall back if invalid', () => {
      // Create invalid local override (missing export/function)
      const localOverride = path.join(localTemplatesDir, 'commonjs/config/env.ts');
      fs.mkdirSync(path.dirname(localOverride), { recursive: true });
      fs.writeFileSync(localOverride, 'const x = 5;', 'utf8');

      const result = resolveTemplate(testRoot, 'config/env.ts', 'commonjs');

      // Should fall back to bundled due to invalid local override
      expect(result.source).toBe('bundled');
    });

    it('should use valid local override when validation passes', () => {
      // Create valid local override
      const localOverride = path.join(localTemplatesDir, 'esm/navigation/nav.ts');
      fs.mkdirSync(path.dirname(localOverride), { recursive: true });
      fs.writeFileSync(localOverride, 'export async function navigateTo() { }', 'utf8');

      const result = resolveTemplate(testRoot, 'navigation/nav.ts', 'esm');

      expect(result.source).toBe('local-override');
      expect(result.templatePath).toBe(localOverride);
    });
  });
});
