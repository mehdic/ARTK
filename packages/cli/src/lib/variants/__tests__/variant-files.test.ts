/**
 * Tests for variant-files.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  getArtkVersion,
  getVariantDistPath,
  validateVariantBuildFiles,
  generateVariantFeatures,
  generateReadonlyMarker,
  generateAiIgnore,
  generateCopilotInstructions,
  checkVariantNodeCompatibility,
} from '../variant-files.js';
import { getVariantDefinition } from '../variant-definitions.js';
import type { ArtkContext } from '../variant-types.js';

// Mock fs module
vi.mock('fs');

describe('variant-files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getArtkVersion', () => {
    it('should return a version string', () => {
      const version = getArtkVersion();
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
      // Should be a valid semver-like format
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should return fallback version when package.json not found', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const version = getArtkVersion();
      expect(version).toBe('1.0.0');
    });
  });

  describe('getVariantDistPath', () => {
    it('should return correct dist path for modern-esm', () => {
      const result = getVariantDistPath('/path/to/core', 'modern-esm');
      expect(result).toBe(path.join('/path/to/core', 'dist'));
    });

    it('should return correct dist path for modern-cjs', () => {
      const result = getVariantDistPath('/path/to/core', 'modern-cjs');
      expect(result).toBe(path.join('/path/to/core', 'dist-cjs'));
    });

    it('should return correct dist path for legacy-16', () => {
      const result = getVariantDistPath('/path/to/core', 'legacy-16');
      expect(result).toBe(path.join('/path/to/core', 'dist-legacy-16'));
    });

    it('should return correct dist path for legacy-14', () => {
      const result = getVariantDistPath('/path/to/core', 'legacy-14');
      expect(result).toBe(path.join('/path/to/core', 'dist-legacy-14'));
    });
  });

  describe('validateVariantBuildFiles', () => {
    it('should return invalid when core path not found', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const result = validateVariantBuildFiles('modern-esm');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('ARTK core not found');
    });
  });

  describe('generateVariantFeatures', () => {
    it('should generate features for modern-esm', () => {
      const features = generateVariantFeatures('modern-esm');
      expect(features.variant).toBe('modern-esm');
      expect(features.playwrightVersion).toBe('1.57.x');
      expect(features.moduleSystem).toBe('esm');
      expect(features.features).toBeDefined();
      // ESM-specific features
      expect((features.features as Record<string, unknown>).esm_imports).toEqual({ available: true });
      expect((features.features as Record<string, unknown>).top_level_await).toEqual({ available: true });
    });

    it('should generate features for modern-cjs', () => {
      const features = generateVariantFeatures('modern-cjs');
      expect(features.variant).toBe('modern-cjs');
      expect(features.moduleSystem).toBe('cjs');
      // CJS doesn't have ESM features
      const esmImports = (features.features as Record<string, unknown>).esm_imports as { available: boolean };
      expect(esmImports.available).toBe(false);
    });

    it('should generate features for legacy-14 with limitations', () => {
      const features = generateVariantFeatures('legacy-14');
      expect(features.variant).toBe('legacy-14');
      expect(features.playwrightVersion).toBe('1.33.x');
      // Legacy-14 should have unavailable features
      const ariaSnapshots = (features.features as Record<string, unknown>).aria_snapshots as { available: boolean; alternative?: string };
      expect(ariaSnapshots.available).toBe(false);
      expect(ariaSnapshots.alternative).toBeDefined();
    });

    it('should include generation metadata', () => {
      const features = generateVariantFeatures('modern-esm');
      expect(features.generatedAt).toBeDefined();
      expect(features.generatedBy).toContain('ARTK CLI');
    });

    it('should include common features for all variants', () => {
      const variants = ['modern-esm', 'modern-cjs', 'legacy-16', 'legacy-14'] as const;
      for (const variant of variants) {
        const features = generateVariantFeatures(variant);
        const featuresObj = features.features as Record<string, { available: boolean }>;
        expect(featuresObj.locator_filter.available).toBe(true);
        expect(featuresObj.web_first_assertions.available).toBe(true);
        expect(featuresObj.trace_viewer.available).toBe(true);
      }
    });
  });

  describe('generateReadonlyMarker', () => {
    const mockContext: ArtkContext = {
      variant: 'modern-esm',
      variantInstalledAt: '2025-01-19T12:00:00Z',
      nodeVersion: 20,
      moduleSystem: 'esm',
      playwrightVersion: '1.57.x',
      artkVersion: '1.0.0',
      installMethod: 'cli',
      overrideUsed: false,
    };

    it('should generate markdown content with variant info', () => {
      const variantDef = getVariantDefinition('modern-esm');
      const content = generateReadonlyMarker(variantDef, mockContext);
      expect(content).toContain('DO NOT MODIFY');
      expect(content).toContain('modern-esm');
      expect(content).toContain('Modern ESM');
      expect(content).toContain('1.57.x');
      expect(content).toContain('ES2022');
    });

    it('should include error handling instructions', () => {
      const variantDef = getVariantDefinition('modern-esm');
      const content = generateReadonlyMarker(variantDef, mockContext);
      expect(content).toContain('ERR_REQUIRE_ESM');
      expect(content).toContain('artk init');
    });

    it('should include AI agent instructions', () => {
      const variantDef = getVariantDefinition('modern-esm');
      const content = generateReadonlyMarker(variantDef, mockContext);
      expect(content).toContain('For AI Agents');
      expect(content).toContain('GitHub Copilot');
      expect(content).toContain('NEVER patch or modify');
    });

    it('should include previous variant when present', () => {
      const contextWithPrevious: ArtkContext = {
        ...mockContext,
        previousVariant: 'legacy-16',
      };
      const variantDef = getVariantDefinition('modern-esm');
      const content = generateReadonlyMarker(variantDef, contextWithPrevious);
      expect(content).toContain('Previous Variant');
      expect(content).toContain('legacy-16');
    });
  });

  describe('generateAiIgnore', () => {
    it('should generate .ai-ignore content', () => {
      const content = generateAiIgnore('modern-esm');
      expect(content).toContain('DO NOT MODIFY');
      expect(content).toContain('modern-esm');
      expect(content).toContain('artk upgrade');
    });

    it('should include variant-specific timestamp', () => {
      const content = generateAiIgnore('legacy-16');
      expect(content).toContain('legacy-16');
      expect(content).toContain('Generated:');
    });
  });

  describe('generateCopilotInstructions', () => {
    it('should generate Copilot instructions for modern-esm', () => {
      const content = generateCopilotInstructions('modern-esm');
      expect(content).toContain('modern-esm');
      expect(content).toContain('Modern ESM');
      expect(content).toContain('DO NOT modify');
      expect(content).toContain('variant-features.json');
    });

    it('should include ESM import patterns for modern-esm', () => {
      const content = generateCopilotInstructions('modern-esm');
      expect(content).toContain('Import Patterns (ESM)');
      expect(content).toContain("import { test, expect } from '@playwright/test'");
    });

    it('should include CJS import patterns for modern-cjs', () => {
      const content = generateCopilotInstructions('modern-cjs');
      expect(content).toContain('Import Patterns (CommonJS)');
      expect(content).toContain("require('@playwright/test')");
      expect(content).toContain('DO NOT use ESM import syntax');
    });

    it('should include legacy limitations for legacy-14', () => {
      const content = generateCopilotInstructions('legacy-14');
      expect(content).toContain('Legacy Variant Limitations');
      expect(content).toContain('1.33.x');
      expect(content).toContain('aria_snapshots');
      expect(content).toContain('clock_api');
    });

    it('should include legacy limitations for legacy-16', () => {
      const content = generateCopilotInstructions('legacy-16');
      expect(content).toContain('Legacy Variant Limitations');
    });

    it('should not include legacy limitations for modern variants', () => {
      const esmContent = generateCopilotInstructions('modern-esm');
      const cjsContent = generateCopilotInstructions('modern-cjs');
      expect(esmContent).not.toContain('Legacy Variant Limitations');
      expect(cjsContent).not.toContain('Legacy Variant Limitations');
    });

    it('should include error handling guidance', () => {
      const content = generateCopilotInstructions('modern-esm');
      expect(content).toContain('When You Encounter Errors');
      expect(content).toContain('Module/Import Errors');
      expect(content).toContain('Feature Not Found');
    });

    it('should have valid frontmatter', () => {
      const content = generateCopilotInstructions('modern-esm');
      expect(content).toMatch(/^---\nname: artk\.variant-info\n/);
    });
  });

  describe('checkVariantNodeCompatibility', () => {
    it('should return compatible for valid combinations', () => {
      // modern-esm supports 18, 20, 22
      expect(checkVariantNodeCompatibility('modern-esm', 18).compatible).toBe(true);
      expect(checkVariantNodeCompatibility('modern-esm', 20).compatible).toBe(true);
      expect(checkVariantNodeCompatibility('modern-esm', 22).compatible).toBe(true);

      // legacy-16 supports 16, 18, 20
      expect(checkVariantNodeCompatibility('legacy-16', 16).compatible).toBe(true);
      expect(checkVariantNodeCompatibility('legacy-16', 18).compatible).toBe(true);

      // legacy-14 supports 14, 16, 18
      expect(checkVariantNodeCompatibility('legacy-14', 14).compatible).toBe(true);
      expect(checkVariantNodeCompatibility('legacy-14', 16).compatible).toBe(true);
    });

    it('should return incompatible for invalid combinations', () => {
      // modern-esm doesn't support Node 14 or 16
      expect(checkVariantNodeCompatibility('modern-esm', 14).compatible).toBe(false);
      expect(checkVariantNodeCompatibility('modern-esm', 16).compatible).toBe(false);

      // legacy-14 doesn't support Node 20
      expect(checkVariantNodeCompatibility('legacy-14', 20).compatible).toBe(false);
    });

    it('should include error message for incompatible combinations', () => {
      const result = checkVariantNodeCompatibility('modern-esm', 14);
      expect(result.compatible).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Variant 'modern-esm'");
      expect(result.error).toContain('Node.js 14');
    });

    it('should include supported range in result', () => {
      const result = checkVariantNodeCompatibility('modern-esm', 20);
      expect(result.supportedRange).toEqual(['18', '20', '22']);
    });

    it('should include variant and nodeVersion in result', () => {
      const result = checkVariantNodeCompatibility('legacy-16', 18);
      expect(result.variant).toBe('legacy-16');
      expect(result.nodeVersion).toBe(18);
    });
  });
});
