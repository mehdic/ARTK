/**
 * Unit tests for Template Migration
 * Tests migration from old templates to dual-template system
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { analyzeMigration, autoMigrate } from '../../src/templates/migrate';

describe('Template Migration', () => {
  const testRoot = path.join(__dirname, '../fixtures/migration-test');

  beforeEach(() => {
    // Create test directory
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

  describe('analyzeMigration', () => {
    it('should return needsMigration=false when no old templates exist', () => {
      const result = analyzeMigration(testRoot);

      expect(result.needsMigration).toBe(false);
      expect(result.oldTemplatesFound).toEqual([]);
      expect(result.migrationSteps).toEqual([]);
    });

    it('should detect old templates in artk-e2e/foundation/', () => {
      const oldTemplate = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');
      fs.mkdirSync(path.dirname(oldTemplate), { recursive: true });
      fs.writeFileSync(oldTemplate, 'export function login() { }', 'utf8');

      const result = analyzeMigration(testRoot);

      expect(result.needsMigration).toBe(true);
      expect(result.oldTemplatesFound).toContain('artk-e2e/foundation/auth/login.ts');
    });

    it('should detect old templates in artk-e2e/templates/', () => {
      const oldTemplate = path.join(testRoot, 'artk-e2e/templates/config/env.ts');
      fs.mkdirSync(path.dirname(oldTemplate), { recursive: true });
      fs.writeFileSync(oldTemplate, 'export function loadConfig() { }', 'utf8');

      const result = analyzeMigration(testRoot);

      expect(result.needsMigration).toBe(true);
      expect(result.oldTemplatesFound).toContain('artk-e2e/templates/config/env.ts');
    });

    it('should suggest CommonJS variant for templates with __dirname', () => {
      const oldTemplate = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');
      fs.mkdirSync(path.dirname(oldTemplate), { recursive: true });
      fs.writeFileSync(oldTemplate, 'const dir = __dirname; export function login() { }', 'utf8');

      const result = analyzeMigration(testRoot);

      expect(result.suggestedVariant).toBe('commonjs');
    });

    it('should suggest CommonJS variant for templates with require()', () => {
      const oldTemplate = path.join(testRoot, 'artk-e2e/templates/config/env.ts');
      fs.mkdirSync(path.dirname(oldTemplate), { recursive: true });
      fs.writeFileSync(oldTemplate, 'const yaml = require("yaml"); export function load() { }', 'utf8');

      const result = analyzeMigration(testRoot);

      expect(result.suggestedVariant).toBe('commonjs');
    });

    it('should suggest ESM variant for templates with import.meta', () => {
      const oldTemplate = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');
      fs.mkdirSync(path.dirname(oldTemplate), { recursive: true });
      fs.writeFileSync(oldTemplate, 'const url = import.meta.url; export function login() { }', 'utf8');

      const result = analyzeMigration(testRoot);

      expect(result.suggestedVariant).toBe('esm');
    });

    it('should suggest ESM variant for templates with dynamic import', () => {
      const oldTemplate = path.join(testRoot, 'artk-e2e/templates/config/env.ts');
      fs.mkdirSync(path.dirname(oldTemplate), { recursive: true });
      fs.writeFileSync(oldTemplate, 'const yaml = await import("yaml"); export function load() { }', 'utf8');

      const result = analyzeMigration(testRoot);

      expect(result.suggestedVariant).toBe('esm');
    });

    it('should suggest ESM variant for templates with import statements', () => {
      const oldTemplate = path.join(testRoot, 'artk-e2e/foundation/navigation/nav.ts');
      fs.mkdirSync(path.dirname(oldTemplate), { recursive: true });
      fs.writeFileSync(oldTemplate, 'import { Page } from "@playwright/test"; export function nav() { }', 'utf8');

      const result = analyzeMigration(testRoot);

      expect(result.suggestedVariant).toBe('esm');
    });

    it('should default to CommonJS when indicators are equal', () => {
      const oldTemplate = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');
      fs.mkdirSync(path.dirname(oldTemplate), { recursive: true });
      fs.writeFileSync(oldTemplate, 'export function login() { }', 'utf8');

      const result = analyzeMigration(testRoot);

      // No clear indicators, should default to CommonJS (safer)
      expect(result.suggestedVariant).toBe('commonjs');
    });

    it('should generate migration steps when old templates exist', () => {
      const oldTemplate = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');
      fs.mkdirSync(path.dirname(oldTemplate), { recursive: true });
      fs.writeFileSync(oldTemplate, 'export function login() { }', 'utf8');

      const result = analyzeMigration(testRoot);

      expect(result.migrationSteps.length).toBeGreaterThan(0);
      expect(result.migrationSteps.join('\n')).toContain('Backup');
      expect(result.migrationSteps.join('\n')).toContain('bootstrap');
    });

    it('should detect multiple old templates', () => {
      // Create multiple old templates
      const templates = [
        'artk-e2e/foundation/auth/login.ts',
        'artk-e2e/foundation/config/env.ts',
        'artk-e2e/templates/navigation/nav.ts'
      ];

      for (const templatePath of templates) {
        const fullPath = path.join(testRoot, templatePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, 'export function test() { }', 'utf8');
      }

      const result = analyzeMigration(testRoot);

      expect(result.oldTemplatesFound.length).toBe(3);
      expect(result.needsMigration).toBe(true);
    });
  });

  describe('autoMigrate', () => {
    it('should create backup directory', () => {
      const oldTemplate = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');
      fs.mkdirSync(path.dirname(oldTemplate), { recursive: true });
      fs.writeFileSync(oldTemplate, 'export function login() { }', 'utf8');

      autoMigrate(testRoot, 'commonjs');

      const backupDir = path.join(testRoot, 'artk-e2e/templates.backup');
      expect(fs.existsSync(backupDir)).toBe(true);
    });

    it('should copy old templates to backup', () => {
      const oldTemplate = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');
      fs.mkdirSync(path.dirname(oldTemplate), { recursive: true });
      fs.writeFileSync(oldTemplate, 'export function login() { }', 'utf8');

      autoMigrate(testRoot, 'commonjs');

      const backupFile = path.join(testRoot, 'artk-e2e/templates.backup/auth/login.ts');
      expect(fs.existsSync(backupFile)).toBe(true);
      const content = fs.readFileSync(backupFile, 'utf8');
      expect(content).toContain('export function login()');
    });

    it('should return success=true when backup succeeds', () => {
      const oldTemplate = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');
      fs.mkdirSync(path.dirname(oldTemplate), { recursive: true });
      fs.writeFileSync(oldTemplate, 'export function login() { }', 'utf8');

      const result = autoMigrate(testRoot, 'esm');

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle missing foundation directory gracefully', () => {
      const oldTemplate = path.join(testRoot, 'artk-e2e/templates/config/env.ts');
      fs.mkdirSync(path.dirname(oldTemplate), { recursive: true });
      fs.writeFileSync(oldTemplate, 'export function load() { }', 'utf8');

      const result = autoMigrate(testRoot, 'commonjs');

      expect(result.success).toBe(true);
    });

    it('should handle missing templates directory gracefully', () => {
      const oldTemplate = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');
      fs.mkdirSync(path.dirname(oldTemplate), { recursive: true });
      fs.writeFileSync(oldTemplate, 'export function login() { }', 'utf8');

      const result = autoMigrate(testRoot, 'esm');

      expect(result.success).toBe(true);
    });

    it('should backup files from both foundation and templates directories', () => {
      // Create templates in both old locations
      const foundationFile = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');
      const templatesFile = path.join(testRoot, 'artk-e2e/templates/config/env.ts');

      fs.mkdirSync(path.dirname(foundationFile), { recursive: true });
      fs.writeFileSync(foundationFile, 'export function login() { }', 'utf8');

      fs.mkdirSync(path.dirname(templatesFile), { recursive: true });
      fs.writeFileSync(templatesFile, 'export function loadEnv() { }', 'utf8');

      autoMigrate(testRoot, 'commonjs');

      // Both should be backed up
      const backupLogin = path.join(testRoot, 'artk-e2e/templates.backup/auth/login.ts');
      const backupEnv = path.join(testRoot, 'artk-e2e/templates.backup/config/env.ts');

      expect(fs.existsSync(backupLogin)).toBe(true);
      expect(fs.existsSync(backupEnv)).toBe(true);
    });

    it('should preserve directory structure in backup', () => {
      const nestedFile = path.join(testRoot, 'artk-e2e/foundation/auth/advanced/mfa.ts');
      fs.mkdirSync(path.dirname(nestedFile), { recursive: true });
      fs.writeFileSync(nestedFile, 'export function mfa() { }', 'utf8');

      autoMigrate(testRoot, 'esm');

      const backupFile = path.join(testRoot, 'artk-e2e/templates.backup/auth/advanced/mfa.ts');
      expect(fs.existsSync(backupFile)).toBe(true);
    });

    it('should not fail when no old templates exist', () => {
      const result = autoMigrate(testRoot, 'commonjs');

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Migration Integration', () => {
    it('should provide complete migration workflow', () => {
      // Setup old templates
      const oldTemplates = [
        'artk-e2e/foundation/auth/login.ts',
        'artk-e2e/foundation/config/env.ts',
        'artk-e2e/templates/navigation/nav.ts'
      ];

      for (const templatePath of oldTemplates) {
        const fullPath = path.join(testRoot, templatePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, 'const dir = __dirname; export function test() { }', 'utf8');
      }

      // 1. Analyze
      const analysis = analyzeMigration(testRoot);
      expect(analysis.needsMigration).toBe(true);
      expect(analysis.suggestedVariant).toBe('commonjs');

      // 2. Auto-migrate (backup)
      const migrationResult = autoMigrate(testRoot, analysis.suggestedVariant);
      expect(migrationResult.success).toBe(true);

      // 3. Verify backup exists
      const backupDir = path.join(testRoot, 'artk-e2e/templates.backup');
      expect(fs.existsSync(backupDir)).toBe(true);

      // 4. Verify original files still exist (migration only backs up, doesn't delete)
      for (const templatePath of oldTemplates) {
        const fullPath = path.join(testRoot, templatePath);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    });
  });
});
