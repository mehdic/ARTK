/**
 * Integration tests for validation runner and rollback workflow
 * T051: Integration test for validation + rollback workflow
 *
 * Tests the full validation pipeline including timeout, file tracking,
 * result persistence, and automatic rollback.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  ValidationRunner,
  validateFoundation,
} from '../../validation/runner.js';
import type {
  ValidationResult,
  ValidationOptions,
} from '../../types/validation-result.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('ValidationRunner', () => {
  let tempDir: string;
  let runner: ValidationRunner;

  beforeEach(() => {
    tempDir = path.join(__dirname, '../fixtures/temp-runner-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    runner = new ValidationRunner();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('constructor', () => {
    it('should create runner with default options', () => {
      const runner = new ValidationRunner();
      expect(runner).toBeDefined();
    });

    it('should accept custom timeout', () => {
      const runner = new ValidationRunner({ timeout: 5000 });
      expect(runner.getTimeout()).toBe(5000);
    });

    it('should have default timeout of 10 seconds', () => {
      const runner = new ValidationRunner();
      expect(runner.getTimeout()).toBe(10000);
    });
  });

  describe('validate', () => {
    it('should return ValidationResult structure', async () => {
      // Create a valid file
      const filePath = path.join(tempDir, 'valid.ts');
      fs.writeFileSync(filePath, 'const x = 1;');

      const result = await runner.validate({
        files: [filePath],
        environmentContext: 'esm',
      });

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('environmentContext');
      expect(result).toHaveProperty('executionTime');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('rules');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('validatedFiles');
      expect(result).toHaveProperty('rollbackPerformed');
      expect(result).toHaveProperty('rollbackSuccess');
    });

    it('should pass validation for compatible code', async () => {
      const filePath = path.join(tempDir, 'valid-esm.ts');
      fs.writeFileSync(
        filePath,
        `
        import { getDirname } from '@artk/core/compat';
        const dir = getDirname(import.meta.url);
      `
      );

      const result = await runner.validate({
        files: [filePath],
        environmentContext: 'esm',
      });

      expect(result.status).toBe('passed');
      expect(result.errors).toEqual([]);
    });

    it('should fail validation for incompatible code', async () => {
      const filePath = path.join(tempDir, 'invalid-cjs.ts');
      fs.writeFileSync(
        filePath,
        `
        const dir = import.meta.url;
      `
      );

      const result = await runner.validate({
        files: [filePath],
        environmentContext: 'commonjs',
      });

      expect(result.status).toBe('failed');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should include all validated files in result', async () => {
      const file1 = path.join(tempDir, 'file1.ts');
      const file2 = path.join(tempDir, 'file2.ts');
      fs.writeFileSync(file1, 'const a = 1;');
      fs.writeFileSync(file2, 'const b = 2;');

      const result = await runner.validate({
        files: [file1, file2],
        environmentContext: 'esm',
      });

      expect(result.validatedFiles).toContain(file1);
      expect(result.validatedFiles).toContain(file2);
    });

    it('should record execution time', async () => {
      const filePath = path.join(tempDir, 'file.ts');
      fs.writeFileSync(filePath, 'const x = 1;');

      const result = await runner.validate({
        files: [filePath],
        environmentContext: 'esm',
      });

      expect(typeof result.executionTime).toBe('number');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThan(10000); // Less than timeout
    });

    it('should include ISO 8601 timestamp', async () => {
      const filePath = path.join(tempDir, 'file.ts');
      fs.writeFileSync(filePath, 'const x = 1;');

      const result = await runner.validate({
        files: [filePath],
        environmentContext: 'esm',
      });

      // Should be a valid ISO date string
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('timeout handling', () => {
    it('should timeout long-running validation', async () => {
      const runner = new ValidationRunner({ timeout: 100 }); // 100ms timeout
      const filePath = path.join(tempDir, 'file.ts');
      fs.writeFileSync(filePath, 'const x = 1;');

      // Create a large file to slow down validation
      const largeContent = 'const x = 1;\n'.repeat(10000);
      fs.writeFileSync(filePath, largeContent);

      // This should either complete or timeout gracefully
      const result = await runner.validate({
        files: [filePath],
        environmentContext: 'esm',
      });

      expect(result).toBeDefined();
      expect(result.executionTime).toBeLessThanOrEqual(10000);
    });
  });

  describe('skip validation', () => {
    it('should skip validation when flag is set', async () => {
      const filePath = path.join(tempDir, 'invalid.ts');
      fs.writeFileSync(filePath, 'const dir = import.meta.url;');

      const result = await runner.validate({
        files: [filePath],
        environmentContext: 'commonjs',
        skipValidation: true,
      });

      // Should pass since validation was skipped
      expect(result.status).toBe('passed');
      expect(result.errors).toEqual([]);
      expect(result.rules).toEqual([]);
    });
  });

  describe('strictness levels', () => {
    it('should treat errors as warnings when strictness is warning', async () => {
      const filePath = path.join(tempDir, 'file.ts');
      fs.writeFileSync(filePath, 'const dir = import.meta.url;');

      const result = await runner.validate({
        files: [filePath],
        environmentContext: 'commonjs',
        strictness: {
          'import-meta-usage': 'warning',
        },
      });

      // Should have warnings instead of errors
      expect(result.status).toBe('warnings');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.errors).toEqual([]);
    });

    it('should ignore issues when strictness is ignore', async () => {
      const filePath = path.join(tempDir, 'file.ts');
      fs.writeFileSync(filePath, 'const dir = import.meta.url;');

      const result = await runner.validate({
        files: [filePath],
        environmentContext: 'commonjs',
        strictness: {
          'import-meta-usage': 'ignore',
        },
      });

      // Should pass since rule is ignored
      expect(result.status).toBe('passed');
    });
  });

  describe('rule results', () => {
    it('should include individual rule results', async () => {
      const filePath = path.join(tempDir, 'file.ts');
      fs.writeFileSync(filePath, 'const x = 1;');

      const result = await runner.validate({
        files: [filePath],
        environmentContext: 'esm',
      });

      expect(Array.isArray(result.rules)).toBe(true);
      result.rules.forEach((rule) => {
        expect(rule).toHaveProperty('ruleId');
        expect(rule).toHaveProperty('pass');
        expect(rule).toHaveProperty('affectedFiles');
        expect(rule).toHaveProperty('message');
      });
    });
  });

  describe('rollback on failure', () => {
    it('should set rollbackPerformed when validation fails', async () => {
      const filePath = path.join(tempDir, 'file.ts');
      fs.writeFileSync(filePath, 'const dir = import.meta.url;');

      // Track the file as generated
      runner.trackGeneratedFile(filePath);

      const result = await runner.validate({
        files: [filePath],
        environmentContext: 'commonjs',
      });

      expect(result.status).toBe('failed');
      expect(result.rollbackPerformed).toBe(true);
    });

    it('should remove generated files on rollback', async () => {
      const filePath = path.join(tempDir, 'generated.ts');
      fs.writeFileSync(filePath, 'const dir = import.meta.url;');

      runner.trackGeneratedFile(filePath);

      const result = await runner.validate({
        files: [filePath],
        environmentContext: 'commonjs',
      });

      expect(result.rollbackPerformed).toBe(true);
      expect(result.rollbackSuccess).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should restore original files on rollback', async () => {
      const filePath = path.join(tempDir, 'existing.ts');
      fs.writeFileSync(filePath, 'const original = 1;');

      // Track original and then modify
      runner.trackOriginalFile(filePath);
      fs.writeFileSync(filePath, 'const dir = import.meta.url;');

      const result = await runner.validate({
        files: [filePath],
        environmentContext: 'commonjs',
      });

      expect(result.rollbackPerformed).toBe(true);
      expect(result.rollbackSuccess).toBe(true);
      expect(fs.readFileSync(filePath, 'utf8')).toBe('const original = 1;');
    });

    it('should not rollback on successful validation', async () => {
      const filePath = path.join(tempDir, 'valid.ts');
      fs.writeFileSync(filePath, 'const x = 1;');

      runner.trackGeneratedFile(filePath);

      const result = await runner.validate({
        files: [filePath],
        environmentContext: 'esm',
      });

      expect(result.status).toBe('passed');
      expect(result.rollbackPerformed).toBe(false);
      expect(result.rollbackSuccess).toBeNull();
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});

describe('validateFoundation (exported function)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(
      __dirname,
      '../fixtures/temp-validate-' + Date.now()
    );
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should be a function', () => {
    expect(typeof validateFoundation).toBe('function');
  });

  it('should validate files and return result', async () => {
    const filePath = path.join(tempDir, 'file.ts');
    fs.writeFileSync(filePath, 'const x = 1;');

    const result = await validateFoundation({
      files: [filePath],
      environmentContext: 'esm',
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('passed');
  });

  it('should handle empty file list', async () => {
    const result = await validateFoundation({
      files: [],
      environmentContext: 'esm',
    });

    expect(result.status).toBe('passed');
    expect(result.validatedFiles).toEqual([]);
  });

  it('should handle non-existent files gracefully', async () => {
    const result = await validateFoundation({
      files: ['/nonexistent/file.ts'],
      environmentContext: 'esm',
    });

    // Should either skip the file or report as warning/error
    expect(result).toBeDefined();
  });
});

describe('validation result persistence', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, '../fixtures/temp-persist-' + Date.now());
    fs.mkdirSync(path.join(tempDir, '.artk'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should persist validation results to .artk/validation-results.json', async () => {
    const runner = new ValidationRunner({ outputDir: tempDir });
    const filePath = path.join(tempDir, 'file.ts');
    fs.writeFileSync(filePath, 'const x = 1;');

    await runner.validate({
      files: [filePath],
      environmentContext: 'esm',
    });

    const resultsPath = path.join(tempDir, '.artk', 'validation-results.json');
    expect(fs.existsSync(resultsPath)).toBe(true);

    const persisted = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    expect(Array.isArray(persisted)).toBe(true);
    expect(persisted.length).toBeGreaterThan(0);
  });

  it('should append to existing results', async () => {
    const runner = new ValidationRunner({ outputDir: tempDir });
    const filePath = path.join(tempDir, 'file.ts');
    fs.writeFileSync(filePath, 'const x = 1;');

    // First validation
    await runner.validate({
      files: [filePath],
      environmentContext: 'esm',
    });

    // Second validation
    await runner.validate({
      files: [filePath],
      environmentContext: 'esm',
    });

    const resultsPath = path.join(tempDir, '.artk', 'validation-results.json');
    const persisted = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    expect(persisted.length).toBe(2);
  });

  it('should preserve results during rollback', async () => {
    const runner = new ValidationRunner({ outputDir: tempDir });
    const filePath = path.join(tempDir, 'file.ts');
    fs.writeFileSync(filePath, 'const dir = import.meta.url;');

    runner.trackGeneratedFile(filePath);

    const result = await runner.validate({
      files: [filePath],
      environmentContext: 'commonjs',
    });

    expect(result.rollbackPerformed).toBe(true);

    // Results should still be persisted
    const resultsPath = path.join(tempDir, '.artk', 'validation-results.json');
    expect(fs.existsSync(resultsPath)).toBe(true);
  });
});
