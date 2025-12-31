/**
 * Unit tests for entry file detection utilities
 *
 * @group unit
 * @group detection
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import {
  ENTRY_FILE_PATTERNS,
  EntryFileDetector,
  detectEntryFiles,
  hasEntryFiles,
  getAllEntryPatterns,
} from '../entry-detector.js';

// =============================================================================
// Mock Setup
// =============================================================================

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof fs>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    statSync: vi.fn(),
  };
});

// =============================================================================
// ENTRY_FILE_PATTERNS Tests
// =============================================================================

describe('ENTRY_FILE_PATTERNS', () => {
  it('should have react entry patterns', () => {
    expect(ENTRY_FILE_PATTERNS.react).toContain('src/App.tsx');
    expect(ENTRY_FILE_PATTERNS.react).toContain('src/App.jsx');
    expect(ENTRY_FILE_PATTERNS.react).toContain('src/main.tsx');
    expect(ENTRY_FILE_PATTERNS.react).toContain('src/index.tsx');
  });

  it('should have vue entry patterns', () => {
    expect(ENTRY_FILE_PATTERNS.vue).toContain('src/App.vue');
    expect(ENTRY_FILE_PATTERNS.vue).toContain('src/main.ts');
    expect(ENTRY_FILE_PATTERNS.vue).toContain('src/main.js');
    expect(ENTRY_FILE_PATTERNS.vue).toContain('vue.config.js');
  });

  it('should have next-app router patterns', () => {
    expect(ENTRY_FILE_PATTERNS['next-app']).toContain('app/page.tsx');
    expect(ENTRY_FILE_PATTERNS['next-app']).toContain('app/layout.tsx');
  });

  it('should have next-pages router patterns', () => {
    expect(ENTRY_FILE_PATTERNS['next-pages']).toContain('pages/index.tsx');
    expect(ENTRY_FILE_PATTERNS['next-pages']).toContain('pages/_app.tsx');
    expect(ENTRY_FILE_PATTERNS['next-pages']).toContain('pages/_document.tsx');
  });

  it('should have nuxt patterns', () => {
    expect(ENTRY_FILE_PATTERNS.nuxt).toContain('pages/index.vue');
    expect(ENTRY_FILE_PATTERNS.nuxt).toContain('app.vue');
    expect(ENTRY_FILE_PATTERNS.nuxt).toContain('nuxt.config.ts');
  });

  it('should have angular patterns', () => {
    expect(ENTRY_FILE_PATTERNS.angular).toContain('src/app/app.component.ts');
    expect(ENTRY_FILE_PATTERNS.angular).toContain('src/app/app.module.ts');
    expect(ENTRY_FILE_PATTERNS.angular).toContain('angular.json');
  });

  it('should have config file patterns', () => {
    expect(ENTRY_FILE_PATTERNS.config).toContain('vite.config.ts');
    expect(ENTRY_FILE_PATTERNS.config).toContain('webpack.config.js');
    expect(ENTRY_FILE_PATTERNS.config).toContain('next.config.js');
    expect(ENTRY_FILE_PATTERNS.config).toContain('svelte.config.js');
    expect(ENTRY_FILE_PATTERNS.config).toContain('astro.config.mjs');
  });
});

// =============================================================================
// EntryFileDetector Tests
// =============================================================================

describe('EntryFileDetector', () => {
  let detector: EntryFileDetector;

  beforeEach(() => {
    detector = new EntryFileDetector();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detect', () => {
    it('should return empty result when no entry files found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await detector.detect('/test/project');

      expect(result.foundFiles).toEqual([]);
      expect(result.signals).toEqual([]);
      expect(result.score).toBe(0);
      expect(result.detectedType).toBeNull();
    });

    it('should detect React entry files', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return (
          filePath === '/test/project/src/App.tsx' ||
          filePath === '/test/project/src/main.tsx'
        );
      });
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);

      const result = await detector.detect('/test/project');

      expect(result.foundFiles).toContain('src/App.tsx');
      expect(result.foundFiles).toContain('src/main.tsx');
      expect(result.signals.some((s) => s.includes('entry-file:src/App.tsx'))).toBe(true);
      expect(result.detectedType).toBe('react-spa');
    });

    it('should detect Next.js App Router', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return (
          filePath === '/test/project/app/page.tsx' ||
          filePath === '/test/project/app/layout.tsx'
        );
      });
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);

      const result = await detector.detect('/test/project');

      expect(result.foundFiles).toContain('app/page.tsx');
      expect(result.foundFiles).toContain('app/layout.tsx');
      expect(result.detectedType).toBe('next');
    });

    it('should detect Next.js Pages Router', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return (
          filePath === '/test/project/pages/index.tsx' ||
          filePath === '/test/project/pages/_app.tsx'
        );
      });
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);

      const result = await detector.detect('/test/project');

      expect(result.foundFiles).toContain('pages/index.tsx');
      expect(result.detectedType).toBe('next');
    });

    it('should detect Next.js via config file', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return filePath === '/test/project/next.config.js';
      });
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);

      const result = await detector.detect('/test/project');

      expect(result.foundFiles).toContain('next.config.js');
      expect(result.detectedType).toBe('next');
    });

    it('should detect Nuxt via entry files', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return (
          filePath === '/test/project/pages/index.vue' ||
          filePath === '/test/project/nuxt.config.ts'
        );
      });
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);

      const result = await detector.detect('/test/project');

      expect(result.foundFiles).toContain('pages/index.vue');
      expect(result.detectedType).toBe('nuxt');
    });

    it('should detect Angular via entry files', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return (
          filePath === '/test/project/src/app/app.component.ts' ||
          filePath === '/test/project/angular.json'
        );
      });
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);

      const result = await detector.detect('/test/project');

      expect(result.foundFiles).toContain('angular.json');
      expect(result.detectedType).toBe('angular');
    });

    it('should detect Vue via entry files', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return filePath === '/test/project/src/App.vue';
      });
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);

      const result = await detector.detect('/test/project');

      expect(result.foundFiles).toContain('src/App.vue');
      expect(result.detectedType).toBe('vue-spa');
    });

    it('should detect Vue 2 CLI via vue.config.js', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return (
          filePath === '/test/project/vue.config.js' ||
          filePath === '/test/project/src/main.js'
        );
      });
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);

      const result = await detector.detect('/test/project');

      expect(result.foundFiles).toContain('vue.config.js');
      expect(result.detectedType).toBe('vue-spa');
    });

    it('should detect Angular via app.module.ts (legacy NgModules)', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return (
          filePath === '/test/project/src/app/app.module.ts' ||
          filePath === '/test/project/angular.json'
        );
      });
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);

      const result = await detector.detect('/test/project');

      expect(result.foundFiles).toContain('src/app/app.module.ts');
      expect(result.foundFiles).toContain('angular.json');
      expect(result.detectedType).toBe('angular');
    });

    it('should prioritize Next.js over React when both patterns present', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return (
          filePath === '/test/project/src/App.tsx' ||
          filePath === '/test/project/app/page.tsx'
        );
      });
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);

      const result = await detector.detect('/test/project');

      // Next.js should take priority
      expect(result.detectedType).toBe('next');
    });

    it('should prioritize Nuxt over Vue when both patterns present', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return (
          filePath === '/test/project/src/App.vue' ||
          filePath === '/test/project/pages/index.vue'
        );
      });
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);

      const result = await detector.detect('/test/project');

      // Nuxt should take priority
      expect(result.detectedType).toBe('nuxt');
    });

    it('should calculate score from all detected signals', async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return (
          filePath === '/test/project/src/App.tsx' ||
          filePath === '/test/project/vite.config.ts'
        );
      });
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);

      const result = await detector.detect('/test/project');

      expect(result.score).toBeGreaterThan(0);
      expect(result.detailedSignals.length).toBeGreaterThan(0);
    });

    it('should handle directory stat errors gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await detector.detect('/test/project');

      expect(result.foundFiles).toEqual([]);
    });

    it('should not include directories as entry files', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => false } as any);

      const result = await detector.detect('/test/project');

      expect(result.foundFiles).toEqual([]);
    });
  });
});

// =============================================================================
// detectEntryFiles Tests
// =============================================================================

describe('detectEntryFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use EntryFileDetector internally', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await detectEntryFiles('/test/project');

    expect(result).toHaveProperty('foundFiles');
    expect(result).toHaveProperty('signals');
    expect(result).toHaveProperty('detectedType');
  });
});

// =============================================================================
// hasEntryFiles Tests
// =============================================================================

describe('hasEntryFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true when entry files found', async () => {
    vi.mocked(fs.existsSync).mockImplementation((filePath) => {
      return filePath === '/test/project/src/App.tsx';
    });
    vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);

    const result = await hasEntryFiles('/test/project');

    expect(result).toBe(true);
  });

  it('should return false when no entry files found', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await hasEntryFiles('/test/project');

    expect(result).toBe(false);
  });
});

// =============================================================================
// getAllEntryPatterns Tests
// =============================================================================

describe('getAllEntryPatterns', () => {
  it('should return flat list of all patterns', () => {
    const patterns = getAllEntryPatterns();

    expect(Array.isArray(patterns)).toBe(true);
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns).toContain('src/App.tsx');
    expect(patterns).toContain('app/page.tsx');
    expect(patterns).toContain('vite.config.ts');
  });

  it('should include patterns from all categories', () => {
    const patterns = getAllEntryPatterns();

    // React patterns
    expect(patterns).toContain('src/App.tsx');
    // Vue patterns
    expect(patterns).toContain('src/App.vue');
    // Next.js patterns
    expect(patterns).toContain('app/page.tsx');
    // Angular patterns
    expect(patterns).toContain('angular.json');
    // Config patterns
    expect(patterns).toContain('webpack.config.js');
  });
});
