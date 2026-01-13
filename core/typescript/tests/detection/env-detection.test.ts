/**
 * Integration tests for full environment detection workflow
 * T016: Integration test for full detection workflow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// These will be implemented - tests should fail initially (TDD)
import {
  detectEnvironment,
  type DetectionOptions,
} from '../../detection/env/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Environment Detection - Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, '../fixtures/temp-env-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('detectEnvironment', () => {
    it('should detect CommonJS environment (Node 18 style)', () => {
      // Create a typical Node 18 CommonJS project
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'node18-cjs-project',
          version: '1.0.0',
          // No "type" field = CommonJS
        })
      );

      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            module: 'commonjs',
            target: 'ES2020',
          },
        })
      );

      const result = detectEnvironment({ projectRoot: tempDir });

      expect(result.context.moduleSystem).toBe('commonjs');
      expect(result.context.templateVariant).toBe('commonjs');
      expect(result.context.detectionConfidence).toBe('high');
      expect(result.context.supportsImportMeta).toBe(false);
    });

    it('should detect ESM environment (Node 20 style)', () => {
      // Create a typical Node 20+ ESM project
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'node20-esm-project',
          version: '1.0.0',
          type: 'module',
        })
      );

      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            module: 'esnext',
            target: 'ES2022',
          },
        })
      );

      const result = detectEnvironment({ projectRoot: tempDir });

      expect(result.context.moduleSystem).toBe('esm');
      expect(result.context.templateVariant).toBe('esm');
      expect(result.context.detectionConfidence).toBe('high');
    });

    it('should handle hybrid setup with medium confidence', () => {
      // ESM package.json + CommonJS tsconfig (conflicting)
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'hybrid-project',
          version: '1.0.0',
          type: 'module', // ESM
        })
      );

      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            module: 'commonjs', // CommonJS
          },
        })
      );

      const result = detectEnvironment({ projectRoot: tempDir });

      expect(result.context.detectionConfidence).toBe('medium');
      expect(result.context.warnings.length).toBeGreaterThan(0);
      // TypeScript config should be prioritized for .ts files
      expect(result.context.moduleSystem).toBe('commonjs');
    });

    it('should complete within 5 second timeout', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' })
      );

      const startTime = Date.now();
      const result = detectEnvironment({
        projectRoot: tempDir,
        timeout: 5000,
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(5000);
      expect(result.detectionTime).toBeLessThan(5000);
    });

    it('should cache results to .artk/context.json (FR-005)', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', type: 'module', version: '1.0.0' })
      );

      const result = detectEnvironment({ projectRoot: tempDir });

      // Check that context was cached
      const contextPath = path.join(tempDir, '.artk', 'context.json');
      expect(fs.existsSync(contextPath)).toBe(true);

      const cached = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
      expect(cached.moduleSystem).toBe('esm');
    });

    it('should reuse cached results by default (FR-006)', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', type: 'module', version: '1.0.0' })
      );

      // First detection
      const first = detectEnvironment({ projectRoot: tempDir });
      expect(first.fromCache).toBe(false);

      // Second detection should use cache
      const second = detectEnvironment({ projectRoot: tempDir });
      expect(second.fromCache).toBe(true);
      expect(second.context.moduleSystem).toBe(first.context.moduleSystem);
    });

    it('should bypass cache with --force-detect (FR-006)', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', type: 'module', version: '1.0.0' })
      );

      // First detection
      detectEnvironment({ projectRoot: tempDir });

      // Change the config
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' }) // Now CommonJS
      );

      // Force re-detection
      const result = detectEnvironment({
        projectRoot: tempDir,
        forceDetect: true,
      });

      expect(result.fromCache).toBe(false);
      expect(result.context.moduleSystem).toBe('commonjs');
    });

    it('should include Node version info', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' })
      );

      const result = detectEnvironment({ projectRoot: tempDir });

      expect(result.context.nodeVersion).toMatch(/^\d+\.\d+\.\d+$/);
      expect(result.context.nodeVersionParsed.major).toBeGreaterThanOrEqual(18);
    });

    it('should include detection timestamp', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' })
      );

      const result = detectEnvironment({ projectRoot: tempDir });

      expect(result.context.detectionTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should set templateSource to "bundled" by default', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' })
      );

      const result = detectEnvironment({ projectRoot: tempDir });

      expect(result.context.templateSource).toBe('bundled');
    });

    it('should handle missing package.json with fallback', () => {
      // No files in tempDir

      const result = detectEnvironment({ projectRoot: tempDir });

      expect(result.context.moduleSystem).toBe('commonjs'); // Fallback
      expect(result.context.detectionConfidence).toBe('low');
      expect(result.context.detectionMethod).toBe('fallback');
    });

    it('should fail fast for non-existent directory', () => {
      expect(() =>
        detectEnvironment({ projectRoot: '/non/existent/path' })
      ).toThrow(/directory.*not.*exist/i);
    });

    it('should return full EnvironmentContext structure', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', type: 'module', version: '1.0.0' })
      );

      const result = detectEnvironment({ projectRoot: tempDir });

      // Verify all required fields are present
      const context = result.context;
      expect(context).toHaveProperty('moduleSystem');
      expect(context).toHaveProperty('nodeVersion');
      expect(context).toHaveProperty('nodeVersionParsed');
      expect(context).toHaveProperty('tsModule');
      expect(context).toHaveProperty('supportsImportMeta');
      expect(context).toHaveProperty('supportsBuiltinDirname');
      expect(context).toHaveProperty('templateVariant');
      expect(context).toHaveProperty('templateSource');
      expect(context).toHaveProperty('detectionTimestamp');
      expect(context).toHaveProperty('detectionConfidence');
      expect(context).toHaveProperty('detectionMethod');
      expect(context).toHaveProperty('warnings');
    });
  });
});
