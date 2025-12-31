/**
 * Unit tests for package.json scanning utilities
 *
 * @group unit
 * @group detection
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import {
  PackageScanner,
  scanPackageJson,
  hasPackageJson,
} from '../package-scanner.js';

// =============================================================================
// Mock Setup
// =============================================================================

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof fs>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof fsPromises>('node:fs/promises');
  return {
    ...actual,
    readFile: vi.fn(),
  };
});

// =============================================================================
// PackageScanner Tests
// =============================================================================

describe('PackageScanner', () => {
  let scanner: PackageScanner;

  beforeEach(() => {
    scanner = new PackageScanner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scan', () => {
    it('should return empty result when package.json not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(false);
      expect(result.packageJsonPath).toBeNull();
      expect(result.signals).toEqual([]);
      expect(result.detectedType).toBeNull();
    });

    it('should detect React from dependencies', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'test-app',
          dependencies: {
            react: '^18.0.0',
            'react-dom': '^18.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.packageName).toBe('test-app');
      expect(result.signals.some((s) => s.includes('react'))).toBe(true);
      expect(result.detectedType).toBe('react-spa');
    });

    it('should detect Vue from dependencies', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'vue-app',
          dependencies: {
            vue: '^3.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.detectedType).toBe('vue-spa');
    });

    it('should detect Angular from dependencies', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'angular-app',
          dependencies: {
            '@angular/core': '^17.0.0',
            '@angular/platform-browser': '^17.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.signals.some((s) => s.includes('@angular/core'))).toBe(true);
      expect(result.detectedType).toBe('angular');
    });

    it('should detect Next.js from dependencies', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'next-app',
          dependencies: {
            next: '^14.0.0',
            react: '^18.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.detectedType).toBe('next');
    });

    it('should detect Nuxt from dependencies', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'nuxt-app',
          dependencies: {
            nuxt: '^3.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.detectedType).toBe('nuxt');
    });

    it('should detect Nuxt3 alias from dependencies', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'nuxt-app',
          dependencies: {
            nuxt3: '^3.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.detectedType).toBe('nuxt');
    });

    it('should prioritize Next.js over React when both present', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'next-app',
          dependencies: {
            next: '^14.0.0',
            react: '^18.0.0',
            'react-dom': '^18.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.detectedType).toBe('next');
    });

    it('should detect Svelte as other', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'svelte-app',
          dependencies: {
            svelte: '^4.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.detectedType).toBe('other');
    });

    it('should detect Astro as other', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'astro-app',
          dependencies: {
            astro: '^4.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.detectedType).toBe('other');
    });

    it('should detect SolidJS as other', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'solid-app',
          dependencies: {
            'solid-js': '^1.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.detectedType).toBe('other');
    });

    it('should check devDependencies', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'test-app',
          devDependencies: {
            react: '^18.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.allDependencies).toContain('react');
    });

    it('should check peerDependencies', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'test-lib',
          peerDependencies: {
            react: '^18.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.allDependencies).toContain('react');
    });

    it('should detect scoped Angular packages', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'angular-app',
          dependencies: {
            '@angular/router': '^17.0.0',
            '@angular/forms': '^17.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.allDependencies).toContain('@angular/router');
    });

    it('should detect React via Vite plugin', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'vite-react-app',
          devDependencies: {
            vite: '^5.0.0',
            '@vitejs/plugin-react': '^4.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.detectedType).toBe('react-spa');
    });

    it('should detect Vue via Vite plugin', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'vite-vue-app',
          devDependencies: {
            vite: '^5.0.0',
            '@vitejs/plugin-vue': '^4.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.detectedType).toBe('vue-spa');
    });

    it('should detect React via Babel preset', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'react-app',
          devDependencies: {
            '@babel/preset-react': '^7.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.detectedType).toBe('react-spa');
    });

    it('should handle invalid JSON gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue('{ invalid json }');

      const result = await scanner.scan('/test/project');

      // Should not throw, should return partial result
      expect(result.found).toBe(false);
      expect(result.packageJsonPath).toBe('/test/project/package.json');
    });

    it('should handle read errors gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('Permission denied'));

      const result = await scanner.scan('/test/project');

      // Should not throw, should return partial result
      expect(result.found).toBe(false);
      expect(result.packageJsonPath).toBe('/test/project/package.json');
    });

    it('should handle empty package.json', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue('{}');

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.packageName).toBeNull();
      expect(result.signals).toEqual([]);
      expect(result.detectedType).toBeNull();
    });

    it('should return null for non-frontend package', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'backend-service',
          dependencies: {
            express: '^4.0.0',
            pg: '^8.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.detectedType).toBeNull();
      expect(result.signals).toEqual([]);
    });

    it('should calculate score from all detected signals', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'react-app',
          dependencies: {
            react: '^18.0.0',
            vite: '^5.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.score).toBeGreaterThan(0);
      expect(result.detailedSignals.length).toBeGreaterThan(0);
    });

    it('should detect scoped @vue packages', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'vue-app',
          dependencies: {
            '@vue/runtime-core': '^3.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.allDependencies).toContain('@vue/runtime-core');
    });

    it('should detect @remix-run scoped packages', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'remix-app',
          dependencies: {
            '@remix-run/react': '^2.0.0',
          },
        })
      );

      const result = await scanner.scan('/test/project');

      expect(result.found).toBe(true);
      expect(result.allDependencies).toContain('@remix-run/react');
    });
  });
});

// =============================================================================
// scanPackageJson Tests
// =============================================================================

describe('scanPackageJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use PackageScanner internally', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await scanPackageJson('/test/project');

    expect(result).toHaveProperty('found');
    expect(result).toHaveProperty('signals');
    expect(result).toHaveProperty('detectedType');
  });
});

// =============================================================================
// hasPackageJson Tests
// =============================================================================

describe('hasPackageJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true when package.json exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const result = hasPackageJson('/test/project');

    expect(result).toBe(true);
  });

  it('should return false when package.json does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = hasPackageJson('/test/project');

    expect(result).toBe(false);
  });
});
