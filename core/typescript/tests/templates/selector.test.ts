/**
 * Unit tests for Template Selector
 * Tests template variant selection based on environment detection
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import {
  selectTemplateVariant,
  getRecommendedVariant,
  readTemplateOverride,
  saveTemplateVariant
} from '../../src/templates/selector';
import type { EnvironmentContext } from '../../types/environment-context';

/**
 * Helper to create a valid EnvironmentContext for testing
 */
function createTestContext(overrides: {
  moduleSystem?: 'commonjs' | 'esm';
  detectionConfidence?: 'high' | 'medium' | 'low';
  nodeVersion?: string;
}): EnvironmentContext {
  const moduleSystem = overrides.moduleSystem ?? 'commonjs';
  return {
    moduleSystem,
    nodeVersion: overrides.nodeVersion ?? '18.0.0',
    nodeVersionParsed: { major: 18, minor: 0, patch: 0 },
    tsModule: moduleSystem === 'esm' ? 'ESNext' : 'CommonJS',
    supportsImportMeta: moduleSystem === 'esm',
    supportsBuiltinDirname: false,
    templateVariant: moduleSystem,
    templateSource: 'bundled',
    detectionTimestamp: new Date().toISOString(),
    detectionConfidence: overrides.detectionConfidence ?? 'high',
    detectionMethod: 'package.json',
    warnings: []
  };
}

describe('Template Selector', () => {
  const testRoot = path.join(__dirname, '../fixtures/selector-test');
  const artkDir = path.join(testRoot, '.artk');
  const contextPath = path.join(artkDir, 'context.json');

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
    vi.restoreAllMocks();
  });

  describe('selectTemplateVariant', () => {
    it('should select ESM variant when module system is ESM', () => {
      const context = createTestContext({
        moduleSystem: 'esm',
        detectionConfidence: 'high'
      });

      const result = selectTemplateVariant(context);
      expect(result).toBe('esm');
    });

    it('should select CommonJS variant when module system is CommonJS', () => {
      const context = createTestContext({
        moduleSystem: 'commonjs',
        detectionConfidence: 'high'
      });

      const result = selectTemplateVariant(context);
      expect(result).toBe('commonjs');
    });

    it('should default to CommonJS when module system is unknown', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create a context with 'unknown' module system by casting
      const context = {
        ...createTestContext({ detectionConfidence: 'low' }),
        moduleSystem: 'unknown' as 'commonjs' | 'esm'
      };

      const result = selectTemplateVariant(context);
      expect(result).toBe('commonjs');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Module system detection returned \'unknown\'')
      );
    });

    it('should use manual override when provided', () => {
      const context = createTestContext({
        moduleSystem: 'commonjs',
        detectionConfidence: 'high'
      });

      const result = selectTemplateVariant(context, 'esm');
      expect(result).toBe('esm');
    });

    it('should warn when manual override conflicts with high-confidence detection', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const context = createTestContext({
        moduleSystem: 'esm',
        detectionConfidence: 'high'
      });

      selectTemplateVariant(context, 'commonjs');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Template variant mismatch detected')
      );
    });

    it('should not warn on mismatch when confidence is not high', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const context = createTestContext({
        moduleSystem: 'esm',
        detectionConfidence: 'medium'
      });

      selectTemplateVariant(context, 'commonjs');
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Template variant mismatch')
      );
    });
  });

  describe('getRecommendedVariant', () => {
    it('should recommend ESM for ESM projects', () => {
      const context = createTestContext({
        moduleSystem: 'esm',
        detectionConfidence: 'high'
      });

      const result = getRecommendedVariant(context);
      expect(result.variant).toBe('esm');
      expect(result.confidence).toBe('high');
      expect(result.reason).toContain('ESM module system');
    });

    it('should recommend CommonJS for CommonJS projects', () => {
      const context = createTestContext({
        moduleSystem: 'commonjs',
        detectionConfidence: 'high'
      });

      const result = getRecommendedVariant(context);
      expect(result.variant).toBe('commonjs');
      expect(result.confidence).toBe('high');
      expect(result.reason).toContain('CommonJS module system');
    });

    it('should recommend CommonJS with low confidence for unknown projects', () => {
      // Create a context with 'unknown' module system by casting
      const context = {
        ...createTestContext({ detectionConfidence: 'low' }),
        moduleSystem: 'unknown' as 'commonjs' | 'esm'
      };

      const result = getRecommendedVariant(context);
      expect(result.variant).toBe('commonjs');
      expect(result.confidence).toBe('low');
      expect(result.reason).toContain('Could not determine module system');
    });
  });

  describe('readTemplateOverride', () => {
    it('should return undefined when .artk/context.json does not exist', () => {
      const result = readTemplateOverride(testRoot);
      expect(result).toBeUndefined();
    });

    it('should return undefined when templateVariant is not set', () => {
      fs.mkdirSync(artkDir, { recursive: true });
      fs.writeFileSync(contextPath, JSON.stringify({ someOtherField: 'value' }), 'utf8');

      const result = readTemplateOverride(testRoot);
      expect(result).toBeUndefined();
    });

    it('should return templateVariant when set to commonjs', () => {
      fs.mkdirSync(artkDir, { recursive: true });
      fs.writeFileSync(contextPath, JSON.stringify({ templateVariant: 'commonjs' }), 'utf8');

      const result = readTemplateOverride(testRoot);
      expect(result).toBe('commonjs');
    });

    it('should return templateVariant when set to esm', () => {
      fs.mkdirSync(artkDir, { recursive: true });
      fs.writeFileSync(contextPath, JSON.stringify({ templateVariant: 'esm' }), 'utf8');

      const result = readTemplateOverride(testRoot);
      expect(result).toBe('esm');
    });

    it('should return undefined when templateVariant has invalid value', () => {
      fs.mkdirSync(artkDir, { recursive: true });
      fs.writeFileSync(contextPath, JSON.stringify({ templateVariant: 'invalid' }), 'utf8');

      const result = readTemplateOverride(testRoot);
      expect(result).toBeUndefined();
    });

    it('should return undefined and warn when context.json is invalid JSON', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      fs.mkdirSync(artkDir, { recursive: true });
      fs.writeFileSync(contextPath, 'invalid json{', 'utf8');

      const result = readTemplateOverride(testRoot);
      expect(result).toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('saveTemplateVariant', () => {
    it('should create .artk directory if it does not exist', () => {
      expect(fs.existsSync(artkDir)).toBe(false);

      saveTemplateVariant(testRoot, 'commonjs');

      expect(fs.existsSync(artkDir)).toBe(true);
    });

    it('should create context.json with templateVariant', () => {
      saveTemplateVariant(testRoot, 'esm');

      expect(fs.existsSync(contextPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
      expect(content.templateVariant).toBe('esm');
    });

    it('should update existing context.json without removing other fields', () => {
      fs.mkdirSync(artkDir, { recursive: true });
      fs.writeFileSync(contextPath, JSON.stringify({ existingField: 'value' }), 'utf8');

      saveTemplateVariant(testRoot, 'commonjs');

      const content = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
      expect(content.templateVariant).toBe('commonjs');
      expect(content.existingField).toBe('value');
    });

    it('should overwrite existing templateVariant', () => {
      fs.mkdirSync(artkDir, { recursive: true });
      fs.writeFileSync(contextPath, JSON.stringify({ templateVariant: 'esm' }), 'utf8');

      saveTemplateVariant(testRoot, 'commonjs');

      const content = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
      expect(content.templateVariant).toBe('commonjs');
    });

    it('should handle corrupted context.json by creating new', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      fs.mkdirSync(artkDir, { recursive: true });
      fs.writeFileSync(contextPath, 'corrupted{json', 'utf8');

      saveTemplateVariant(testRoot, 'esm');

      const content = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
      expect(content.templateVariant).toBe('esm');
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('FR-036: Auto-select variant based on detected module system', () => {
    it('should auto-select ESM when package.json has type:module', () => {
      const context = createTestContext({
        moduleSystem: 'esm',
        detectionConfidence: 'high'
      });

      const variant = selectTemplateVariant(context);
      expect(variant).toBe('esm');
    });

    it('should auto-select CommonJS when package.json has type:commonjs', () => {
      const context = createTestContext({
        moduleSystem: 'commonjs',
        detectionConfidence: 'high'
      });

      const variant = selectTemplateVariant(context);
      expect(variant).toBe('commonjs');
    });
  });

  describe('FR-037: Manual override support', () => {
    it('should allow manual override via function parameter', () => {
      const context = createTestContext({
        moduleSystem: 'commonjs',
        detectionConfidence: 'high'
      });

      const variant = selectTemplateVariant(context, 'esm');
      expect(variant).toBe('esm');
    });

    it('should read manual override from .artk/context.json', () => {
      fs.mkdirSync(artkDir, { recursive: true });
      fs.writeFileSync(contextPath, JSON.stringify({ templateVariant: 'esm' }), 'utf8');

      const override = readTemplateOverride(testRoot);
      expect(override).toBe('esm');
    });

    it('should save manual override to .artk/context.json', () => {
      saveTemplateVariant(testRoot, 'commonjs');

      const override = readTemplateOverride(testRoot);
      expect(override).toBe('commonjs');
    });
  });
});
