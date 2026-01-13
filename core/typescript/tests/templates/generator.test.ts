/**
 * Unit tests for Template Generator
 * Tests template-based code generation
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  generateFromTemplate,
  generateBatch,
  generateFoundationModules
} from '../../src/templates/generator';
import { createTemplateContext } from '../../src/templates/processor';
import type { TemplateContext } from '../../src/templates/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Template Generator', () => {
  const testRoot = path.join(__dirname, '../fixtures/generator-test');
  let testContext: TemplateContext;

  beforeEach(() => {
    // Create test directory
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(testRoot, { recursive: true });

    // Create test context
    testContext = createTemplateContext({
      projectName: 'test-generator',
      projectRoot: testRoot,
      artkRoot: 'artk-e2e',
      moduleSystem: 'esm',
      templateVariant: 'esm',
      baseURL: 'http://localhost:4000',
      authProvider: 'oidc',
      artkCorePath: '@artk/core',
      configPath: 'artk-e2e/config',
      authStatePath: '.auth-states'
    });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  describe('generateFromTemplate', () => {
    it('should generate file from template', async () => {
      const targetPath = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');

      const result = await generateFromTemplate(
        'auth/login.ts',
        'esm',
        targetPath,
        testContext
      );

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(targetPath);
      expect(fs.existsSync(targetPath)).toBe(true);
    });

    it('should substitute variables in generated code', async () => {
      const targetPath = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');

      const result = await generateFromTemplate(
        'auth/login.ts',
        'esm',
        targetPath,
        testContext
      );

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content).toContain('test-generator');
      expect(result.content).toContain(testRoot);
      expect(result.content).not.toContain('{{projectName}}');
      expect(result.content).not.toContain('{{projectRoot}}');
    });

    it('should create target directory if it does not exist', async () => {
      const targetPath = path.join(testRoot, 'artk-e2e/deep/nested/path/file.ts');

      const result = await generateFromTemplate(
        'auth/login.ts',
        'esm',
        targetPath,
        testContext
      );

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.dirname(targetPath))).toBe(true);
    });

    it('should create backup when overwriting existing file', async () => {
      const targetPath = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');

      // Create original file
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, 'original content', 'utf8');

      const result = await generateFromTemplate(
        'auth/login.ts',
        'esm',
        targetPath,
        testContext,
        { createBackup: true }
      );

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('backup');

      // Check backup exists
      const backups = fs.readdirSync(path.dirname(targetPath))
        .filter(f => f.startsWith('login.ts.backup.'));
      expect(backups.length).toBe(1);
    });

    it('should fail if overwrite is false and file exists', async () => {
      const targetPath = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');

      // Create original file
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, 'original', 'utf8');

      const result = await generateFromTemplate(
        'auth/login.ts',
        'esm',
        targetPath,
        testContext,
        { overwrite: false }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should not write file in dry-run mode', async () => {
      const targetPath = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');

      const result = await generateFromTemplate(
        'auth/login.ts',
        'esm',
        targetPath,
        testContext,
        { dryRun: true }
      );

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(fs.existsSync(targetPath)).toBe(false);
    });

    it('should fail for missing template', async () => {
      const targetPath = path.join(testRoot, 'output.ts');

      const result = await generateFromTemplate(
        'nonexistent/template.ts',
        'esm',
        targetPath,
        testContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail for missing required variables', async () => {
      // Don't use createTemplateContext - create a truly incomplete context
      const incompleteContext = {
        projectName: 'test',
        // Missing all other required fields
      } as unknown as TemplateContext;

      const targetPath = path.join(testRoot, 'output.ts');

      const result = await generateFromTemplate(
        'auth/login.ts',
        'esm',
        targetPath,
        incompleteContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy(); // Will fail due to missing context fields
    });
  });

  describe('generateBatch', () => {
    it('should generate multiple files', async () => {
      const templates = [
        { moduleName: 'auth/login.ts', targetPath: 'foundation/auth/login.ts' },
        { moduleName: 'config/env.ts', targetPath: 'foundation/config/env.ts' },
        { moduleName: 'navigation/nav.ts', targetPath: 'foundation/navigation/nav.ts' }
      ];

      const result = await generateBatch(
        templates,
        'esm',
        path.join(testRoot, 'artk-e2e'),
        testContext
      );

      expect(result.success).toBe(true);
      expect(result.filesGenerated).toHaveLength(3);
      expect(result.filesFailed).toHaveLength(0);

      // Verify all files exist
      for (const { targetPath } of templates) {
        const fullPath = path.join(testRoot, 'artk-e2e', targetPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    });

    it('should continue on error when continueOnError is true', async () => {
      const templates = [
        { moduleName: 'auth/login.ts', targetPath: 'foundation/auth/login.ts' },
        { moduleName: 'nonexistent.ts', targetPath: 'foundation/bad.ts' },
        { moduleName: 'config/env.ts', targetPath: 'foundation/config/env.ts' }
      ];

      const result = await generateBatch(
        templates,
        'esm',
        path.join(testRoot, 'artk-e2e'),
        testContext,
        { continueOnError: true }
      );

      expect(result.success).toBe(false);
      expect(result.filesGenerated).toHaveLength(2);
      expect(result.filesFailed).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should stop on first error when continueOnError is false', async () => {
      const templates = [
        { moduleName: 'nonexistent.ts', targetPath: 'foundation/bad.ts' },
        { moduleName: 'auth/login.ts', targetPath: 'foundation/auth/login.ts' },
        { moduleName: 'config/env.ts', targetPath: 'foundation/config/env.ts' }
      ];

      const result = await generateBatch(
        templates,
        'esm',
        path.join(testRoot, 'artk-e2e'),
        testContext,
        { continueOnError: false, rollbackOnFailure: false }
      );

      expect(result.success).toBe(false);
      expect(result.filesGenerated).toHaveLength(0);
      expect(result.filesFailed).toHaveLength(1);
    });

    it('should rollback on failure when rollbackOnFailure is true', async () => {
      const templates = [
        { moduleName: 'auth/login.ts', targetPath: 'foundation/auth/login.ts' },
        { moduleName: 'nonexistent.ts', targetPath: 'foundation/bad.ts' }
      ];

      const result = await generateBatch(
        templates,
        'esm',
        path.join(testRoot, 'artk-e2e'),
        testContext,
        { continueOnError: false, rollbackOnFailure: true }
      );

      expect(result.success).toBe(false);
      expect(result.warnings.some(w => w.includes('rolled back'))).toBe(true);

      // First file should be rolled back
      const firstFile = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');
      expect(fs.existsSync(firstFile)).toBe(false);
    });
  });

  describe('generateFoundationModules', () => {
    it('should generate all foundation modules', async () => {
      const result = await generateFoundationModules(
        testRoot,
        'esm',
        testContext
      );

      expect(result.success).toBe(true);
      expect(result.filesGenerated.length).toBeGreaterThan(0);

      // Check that foundation directory was created
      const foundationDir = path.join(testRoot, 'artk-e2e/foundation');
      expect(fs.existsSync(foundationDir)).toBe(true);
    });

    it('should generate correct variant templates', async () => {
      const result = await generateFoundationModules(
        testRoot,
        'esm',
        testContext
      );

      expect(result.success).toBe(true);

      // Check ESM-specific code exists
      const authFile = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');
      const content = fs.readFileSync(authFile, 'utf8');

      expect(content).toContain('import.meta'); // ESM-specific
      expect(content).not.toContain('__dirname'); // CommonJS-specific
    });

    it('should generate CommonJS variant correctly', async () => {
      const cjsContext = createTemplateContext({
        ...testContext,
        moduleSystem: 'commonjs',
        templateVariant: 'commonjs'
      });

      const result = await generateFoundationModules(
        testRoot,
        'commonjs',
        cjsContext
      );

      expect(result.success).toBe(true);

      // Check CommonJS-specific code exists
      const authFile = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');
      const content = fs.readFileSync(authFile, 'utf8');

      expect(content).toContain('__dirname'); // CommonJS-specific
      expect(content).not.toContain('import.meta'); // ESM-specific
    });

    it('should display verbose output when verbose is true', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await generateFoundationModules(
        testRoot,
        'esm',
        testContext,
        { verbose: true }
      );

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some(call =>
        call[0]?.includes('Generating Foundation Modules')
      )).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('Template Content Validation', () => {
    it('should generate valid TypeScript code', async () => {
      const targetPath = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');

      const result = await generateFromTemplate(
        'auth/login.ts',
        'esm',
        targetPath,
        testContext
      );

      expect(result.success).toBe(true);

      // Basic syntax checks
      const content = result.content!;
      expect(content).toContain('export');
      expect(content).toContain('function');
      expect(content).not.toContain('{{'); // No unprocessed variables
      expect(content).not.toContain('}}');
    });

    it('should generate importable module', async () => {
      const targetPath = path.join(testRoot, 'artk-e2e/foundation/auth/login.ts');

      await generateFromTemplate(
        'auth/login.ts',
        'esm',
        targetPath,
        testContext
      );

      // File should exist and be readable
      expect(fs.existsSync(targetPath)).toBe(true);
      const content = fs.readFileSync(targetPath, 'utf8');

      // Should have proper imports and exports
      expect(content).toMatch(/import.*from/);
      expect(content).toMatch(/export (async )?function/);
    });
  });
});
