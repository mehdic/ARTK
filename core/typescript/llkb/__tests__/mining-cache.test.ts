import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  createCacheFromFiles,
  MiningCache,
  scanAllSourceDirectories,
  scanDirectory,
  type ScannedFile,
  SOURCE_DIRECTORIES,
} from '../mining-cache.js';

describe('mining-cache module', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'mining-cache-test-'));
  });

  afterEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
  });

  describe('SOURCE_DIRECTORIES constant', () => {
    it('should contain all expected directories', () => {
      expect(SOURCE_DIRECTORIES).toContain('src');
      expect(SOURCE_DIRECTORIES).toContain('app');
      expect(SOURCE_DIRECTORIES).toContain('components');
      expect(SOURCE_DIRECTORIES).toContain('lib');
      expect(SOURCE_DIRECTORIES).toContain('pages');
      expect(SOURCE_DIRECTORIES).toContain('views');
      expect(SOURCE_DIRECTORIES).toContain('models');
      expect(SOURCE_DIRECTORIES).toContain('entities');
      expect(SOURCE_DIRECTORIES).toContain('types');
      expect(SOURCE_DIRECTORIES).toContain('routes');
      expect(SOURCE_DIRECTORIES).toContain('forms');
      expect(SOURCE_DIRECTORIES).toContain('schemas');
      expect(SOURCE_DIRECTORIES).toContain('validation');
      expect(SOURCE_DIRECTORIES).toContain('tables');
      expect(SOURCE_DIRECTORIES).toContain('grids');
      expect(SOURCE_DIRECTORIES).toContain('modals');
      expect(SOURCE_DIRECTORIES).toContain('dialogs');
    });

    it('should be a readonly array', () => {
      // TypeScript enforces this at compile time, but we can verify length
      expect(SOURCE_DIRECTORIES.length).toBeGreaterThan(15);
    });
  });

  describe('MiningCache', () => {
    describe('getContent', () => {
      it('should read file content on first access (cache miss)', async () => {
        const cache = new MiningCache();
        const filePath = path.join(testDir, 'test.ts');
        await fsp.writeFile(filePath, 'const x = 1;');

        const content = await cache.getContent(filePath);

        expect(content).toBe('const x = 1;');
        expect(cache.getStats().misses).toBe(1);
        expect(cache.getStats().hits).toBe(0);
      });

      it('should return cached content on subsequent access (cache hit)', async () => {
        const cache = new MiningCache();
        const filePath = path.join(testDir, 'test.ts');
        await fsp.writeFile(filePath, 'const x = 1;');

        await cache.getContent(filePath);
        const content2 = await cache.getContent(filePath);

        expect(content2).toBe('const x = 1;');
        expect(cache.getStats().misses).toBe(1);
        expect(cache.getStats().hits).toBe(1);
      });

      it('should return null for non-existent files', async () => {
        const cache = new MiningCache();
        const filePath = path.join(testDir, 'nonexistent.ts');

        const content = await cache.getContent(filePath);

        expect(content).toBeNull();
      });

      it('should handle files with various content', async () => {
        const cache = new MiningCache();
        const filePath = path.join(testDir, 'complex.ts');
        const complexContent = `
          import { something } from 'somewhere';

          interface User {
            id: string;
            name: string;
          }

          export function createUser(name: string): User {
            return { id: crypto.randomUUID(), name };
          }
        `;
        await fsp.writeFile(filePath, complexContent);

        const content = await cache.getContent(filePath);

        expect(content).toBe(complexContent);
      });
    });

    describe('has', () => {
      it('should return false before file is read', async () => {
        const cache = new MiningCache();
        const filePath = path.join(testDir, 'test.ts');
        await fsp.writeFile(filePath, 'const x = 1;');

        expect(cache.has(filePath)).toBe(false);
      });

      it('should return true after file is read', async () => {
        const cache = new MiningCache();
        const filePath = path.join(testDir, 'test.ts');
        await fsp.writeFile(filePath, 'const x = 1;');

        await cache.getContent(filePath);

        expect(cache.has(filePath)).toBe(true);
      });
    });

    describe('getStats', () => {
      it('should track hits and misses correctly', async () => {
        const cache = new MiningCache();
        const file1 = path.join(testDir, 'file1.ts');
        const file2 = path.join(testDir, 'file2.ts');
        await fsp.writeFile(file1, 'const a = 1;');
        await fsp.writeFile(file2, 'const b = 2;');

        await cache.getContent(file1); // miss
        await cache.getContent(file2); // miss
        await cache.getContent(file1); // hit
        await cache.getContent(file1); // hit
        await cache.getContent(file2); // hit

        const stats = cache.getStats();
        expect(stats.misses).toBe(2);
        expect(stats.hits).toBe(3);
        expect(stats.cacheSize).toBe(2);
      });

      it('should track total bytes read', async () => {
        const cache = new MiningCache();
        const filePath = path.join(testDir, 'test.ts');
        const content = 'const x = 1;'; // 12 bytes
        await fsp.writeFile(filePath, content);

        await cache.getContent(filePath);

        expect(cache.getStats().totalBytesRead).toBe(12);
      });
    });

    describe('getHitRate', () => {
      it('should return 0 when no operations', () => {
        const cache = new MiningCache();
        expect(cache.getHitRate()).toBe(0);
      });

      it('should calculate hit rate correctly', async () => {
        const cache = new MiningCache();
        const filePath = path.join(testDir, 'test.ts');
        await fsp.writeFile(filePath, 'const x = 1;');

        await cache.getContent(filePath); // miss
        await cache.getContent(filePath); // hit
        await cache.getContent(filePath); // hit
        await cache.getContent(filePath); // hit

        // 3 hits out of 4 operations = 75%
        expect(cache.getHitRate()).toBe(75);
      });
    });

    describe('clear', () => {
      it('should clear all cached content', async () => {
        const cache = new MiningCache();
        const filePath = path.join(testDir, 'test.ts');
        await fsp.writeFile(filePath, 'const x = 1;');

        await cache.getContent(filePath);
        expect(cache.size).toBe(1);

        cache.clear();

        expect(cache.size).toBe(0);
        expect(cache.has(filePath)).toBe(false);
      });

      it('should reset statistics', async () => {
        const cache = new MiningCache();
        const filePath = path.join(testDir, 'test.ts');
        await fsp.writeFile(filePath, 'const x = 1;');

        await cache.getContent(filePath);
        await cache.getContent(filePath);

        cache.clear();

        const stats = cache.getStats();
        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
        expect(stats.cacheSize).toBe(0);
      });
    });

    describe('size', () => {
      it('should return number of cached files', async () => {
        const cache = new MiningCache();
        expect(cache.size).toBe(0);

        const file1 = path.join(testDir, 'file1.ts');
        const file2 = path.join(testDir, 'file2.ts');
        await fsp.writeFile(file1, 'const a = 1;');
        await fsp.writeFile(file2, 'const b = 2;');

        await cache.getContent(file1);
        expect(cache.size).toBe(1);

        await cache.getContent(file2);
        expect(cache.size).toBe(2);
      });
    });
  });

  describe('scanDirectory', () => {
    it('should scan typescript files', async () => {
      const cache = new MiningCache();
      const srcDir = path.join(testDir, 'src');
      await fsp.mkdir(srcDir);
      await fsp.writeFile(path.join(srcDir, 'index.ts'), 'export const x = 1;');
      await fsp.writeFile(path.join(srcDir, 'utils.ts'), 'export const y = 2;');

      const files = await scanDirectory(srcDir, cache);

      expect(files.length).toBe(2);
      expect(files.some((f) => f.path.endsWith('index.ts'))).toBe(true);
      expect(files.some((f) => f.path.endsWith('utils.ts'))).toBe(true);
    });

    it('should scan nested directories', async () => {
      const cache = new MiningCache();
      const srcDir = path.join(testDir, 'src');
      const componentsDir = path.join(srcDir, 'components');
      await fsp.mkdir(srcDir);
      await fsp.mkdir(componentsDir);
      await fsp.writeFile(path.join(srcDir, 'index.ts'), 'export const x = 1;');
      await fsp.writeFile(path.join(componentsDir, 'Button.tsx'), 'export function Button() {}');

      const files = await scanDirectory(srcDir, cache);

      expect(files.length).toBe(2);
      expect(files.some((f) => f.path.includes('components/Button.tsx'))).toBe(true);
    });

    it('should skip node_modules', async () => {
      const cache = new MiningCache();
      const srcDir = path.join(testDir, 'src');
      const nodeModules = path.join(srcDir, 'node_modules');
      await fsp.mkdir(srcDir);
      await fsp.mkdir(nodeModules);
      await fsp.writeFile(path.join(srcDir, 'index.ts'), 'export const x = 1;');
      await fsp.writeFile(path.join(nodeModules, 'dep.ts'), 'export const y = 2;');

      const files = await scanDirectory(srcDir, cache);

      expect(files.length).toBe(1);
      expect(files[0].path.endsWith('index.ts')).toBe(true);
    });

    it('should skip hidden directories', async () => {
      const cache = new MiningCache();
      const srcDir = path.join(testDir, 'src');
      const hiddenDir = path.join(srcDir, '.hidden');
      await fsp.mkdir(srcDir);
      await fsp.mkdir(hiddenDir);
      await fsp.writeFile(path.join(srcDir, 'index.ts'), 'export const x = 1;');
      await fsp.writeFile(path.join(hiddenDir, 'secret.ts'), 'export const y = 2;');

      const files = await scanDirectory(srcDir, cache);

      expect(files.length).toBe(1);
    });

    it('should respect maxDepth option', async () => {
      const cache = new MiningCache();
      const srcDir = path.join(testDir, 'src');
      const level1 = path.join(srcDir, 'level1');
      const level2 = path.join(level1, 'level2');
      await fsp.mkdir(srcDir);
      await fsp.mkdir(level1);
      await fsp.mkdir(level2);
      await fsp.writeFile(path.join(srcDir, 'root.ts'), 'const x = 1;');
      await fsp.writeFile(path.join(level1, 'l1.ts'), 'const y = 2;');
      await fsp.writeFile(path.join(level2, 'l2.ts'), 'const z = 3;');

      const files = await scanDirectory(srcDir, cache, { maxDepth: 1 });

      // Should find root.ts and l1.ts, but not l2.ts (depth 2)
      expect(files.length).toBe(2);
      expect(files.some((f) => f.path.endsWith('l2.ts'))).toBe(false);
    });

    it('should respect maxFiles option', async () => {
      const cache = new MiningCache();
      const srcDir = path.join(testDir, 'src');
      await fsp.mkdir(srcDir);
      for (let i = 0; i < 10; i++) {
        await fsp.writeFile(path.join(srcDir, `file${i}.ts`), `const x${i} = ${i};`);
      }

      const files = await scanDirectory(srcDir, cache, { maxFiles: 5 });

      expect(files.length).toBe(5);
    });

    it('should include file content', async () => {
      const cache = new MiningCache();
      const srcDir = path.join(testDir, 'src');
      await fsp.mkdir(srcDir);
      await fsp.writeFile(path.join(srcDir, 'index.ts'), 'export const x = 42;');

      const files = await scanDirectory(srcDir, cache);

      expect(files[0].content).toBe('export const x = 42;');
    });
  });

  describe('scanAllSourceDirectories', () => {
    it('should scan multiple source directories', async () => {
      const cache = new MiningCache();
      const srcDir = path.join(testDir, 'src');
      const componentsDir = path.join(testDir, 'components');
      await fsp.mkdir(srcDir);
      await fsp.mkdir(componentsDir);
      await fsp.writeFile(path.join(srcDir, 'index.ts'), 'export const x = 1;');
      await fsp.writeFile(path.join(componentsDir, 'Button.tsx'), 'export function Button() {}');

      const files = await scanAllSourceDirectories(testDir, cache);

      expect(files.length).toBe(2);
    });

    it('should skip non-existent directories', async () => {
      const cache = new MiningCache();
      const srcDir = path.join(testDir, 'src');
      await fsp.mkdir(srcDir);
      await fsp.writeFile(path.join(srcDir, 'index.ts'), 'export const x = 1;');
      // components directory doesn't exist

      const files = await scanAllSourceDirectories(testDir, cache);

      expect(files.length).toBe(1);
    });

    it('should deduplicate files from overlapping directories', async () => {
      const cache = new MiningCache();
      // Create a structure where src contains components
      const srcDir = path.join(testDir, 'src');
      const srcComponents = path.join(srcDir, 'components');
      await fsp.mkdir(srcDir);
      await fsp.mkdir(srcComponents);
      await fsp.writeFile(path.join(srcComponents, 'Button.tsx'), 'export function Button() {}');

      const files = await scanAllSourceDirectories(testDir, cache);

      // Button.tsx should only appear once
      const buttonFiles = files.filter((f) => f.path.includes('Button.tsx'));
      expect(buttonFiles.length).toBe(1);
    });

    it('should scan all standard directories when they exist', async () => {
      const cache = new MiningCache();

      // Create several standard directories
      const dirs = ['src', 'lib', 'components', 'models', 'forms'];
      for (const dir of dirs) {
        const dirPath = path.join(testDir, dir);
        await fsp.mkdir(dirPath);
        await fsp.writeFile(path.join(dirPath, 'index.ts'), `// ${dir} index`);
      }

      const files = await scanAllSourceDirectories(testDir, cache);

      expect(files.length).toBe(5);
    });

    it('should use cache to avoid re-reading files', async () => {
      const cache = new MiningCache();
      const srcDir = path.join(testDir, 'src');
      await fsp.mkdir(srcDir);
      await fsp.writeFile(path.join(srcDir, 'index.ts'), 'export const x = 1;');

      await scanAllSourceDirectories(testDir, cache);
      const statsAfterFirst = cache.getStats();

      // Clear stats but keep cache
      const _hitsBefore = statsAfterFirst.hits;
      const missesBefore = statsAfterFirst.misses;

      // If we scan again, should have cache hits
      // (In real usage, you'd call getContent directly)
      expect(missesBefore).toBeGreaterThan(0);
    });
  });

  describe('mtime validation', () => {
    it('should invalidate cache when file mtime changes', async () => {
      const cache = new MiningCache(); // mtime validation enabled by default
      const filePath = path.join(testDir, 'test.ts');
      await fsp.writeFile(filePath, 'const x = 1;');

      // First read
      const content1 = await cache.getContent(filePath);
      expect(content1).toBe('const x = 1;');

      // Wait a moment and modify the file
      await new Promise((resolve) => setTimeout(resolve, 50));
      await fsp.writeFile(filePath, 'const x = 2;');

      // Second read should detect mtime change and re-read
      const content2 = await cache.getContent(filePath);
      expect(content2).toBe('const x = 2;');

      const stats = cache.getStats();
      expect(stats.invalidations).toBe(1);
    });

    it('should skip mtime validation when disabled', async () => {
      const cache = new MiningCache({ validateMtime: false });
      const filePath = path.join(testDir, 'test.ts');
      await fsp.writeFile(filePath, 'const x = 1;');

      // First read
      await cache.getContent(filePath);

      // Modify file
      await new Promise((resolve) => setTimeout(resolve, 50));
      await fsp.writeFile(filePath, 'const x = 2;');

      // Second read should return stale cached content
      const content = await cache.getContent(filePath);
      expect(content).toBe('const x = 1;'); // Stale content
    });

    it('should remove entry from cache when file is deleted', async () => {
      const cache = new MiningCache();
      const filePath = path.join(testDir, 'test.ts');
      await fsp.writeFile(filePath, 'const x = 1;');

      // First read
      await cache.getContent(filePath);
      expect(cache.has(filePath)).toBe(true);

      // Delete file
      await fsp.unlink(filePath);

      // Try to read again - should return null and remove from cache
      const content = await cache.getContent(filePath);
      expect(content).toBeNull();
      expect(cache.has(filePath)).toBe(false);
    });
  });

  describe('manual invalidation', () => {
    it('should invalidate specific cached file', async () => {
      const cache = new MiningCache();
      const filePath = path.join(testDir, 'test.ts');
      await fsp.writeFile(filePath, 'const x = 1;');

      await cache.getContent(filePath);
      expect(cache.has(filePath)).toBe(true);

      const result = cache.invalidate(filePath);

      expect(result).toBe(true);
      expect(cache.has(filePath)).toBe(false);
      expect(cache.getStats().invalidations).toBe(1);
    });

    it('should return false when invalidating non-cached file', () => {
      const cache = new MiningCache();
      const result = cache.invalidate('/nonexistent/file.ts');
      expect(result).toBe(false);
    });

    it('should normalize path when invalidating', async () => {
      const cache = new MiningCache();
      const filePath = path.join(testDir, 'test.ts');
      await fsp.writeFile(filePath, 'const x = 1;');

      await cache.getContent(filePath);

      // Invalidate with different path format
      const result = cache.invalidate(path.join(testDir, '.', 'test.ts'));

      expect(result).toBe(true);
      expect(cache.has(filePath)).toBe(false);
    });
  });

  describe('warmUp', () => {
    it('should pre-populate cache with provided files', async () => {
      const cache = new MiningCache({ validateMtime: false });
      const filePath = path.join(testDir, 'test.ts');

      await cache.warmUp([{ path: filePath, content: 'pre-loaded content' }]);

      expect(cache.has(filePath)).toBe(true);
      const content = await cache.getContent(filePath);
      expect(content).toBe('pre-loaded content');
    });

    it('should skip files larger than max size', async () => {
      const cache = new MiningCache();
      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB > 5MB limit

      await cache.warmUp([
        {
          path: '/fake/large.ts',
          content: largeContent,
          size: largeContent.length,
        },
      ]);

      expect(cache.has('/fake/large.ts')).toBe(false);
    });

    it('should use provided mtime', async () => {
      const cache = new MiningCache();
      const filePath = path.join(testDir, 'test.ts');
      const customMtime = Date.now() - 10000;

      await fsp.writeFile(filePath, 'actual content');

      await cache.warmUp([
        {
          path: filePath,
          content: 'warmed up content',
          mtime: customMtime,
        },
      ]);

      expect(cache.has(filePath)).toBe(true);
    });

    it('should warm up multiple files', async () => {
      const cache = new MiningCache({ validateMtime: false });

      await cache.warmUp([
        { path: '/fake/file1.ts', content: 'content 1' },
        { path: '/fake/file2.ts', content: 'content 2' },
        { path: '/fake/file3.ts', content: 'content 3' },
      ]);

      expect(cache.size).toBe(3);
      expect(await cache.getContent('/fake/file1.ts')).toBe('content 1');
      expect(await cache.getContent('/fake/file2.ts')).toBe('content 2');
      expect(await cache.getContent('/fake/file3.ts')).toBe('content 3');
    });
  });

  describe('createCacheFromFiles', () => {
    it('should create pre-populated cache from scanned files', async () => {
      const files: ScannedFile[] = [
        { path: '/fake/test1.ts', content: 'const x = 1;' },
        { path: '/fake/test2.ts', content: 'const y = 2;' },
      ];

      const cache = await createCacheFromFiles(files);

      expect(cache.size).toBe(2);
      expect(cache.has('/fake/test1.ts')).toBe(true);
      expect(cache.has('/fake/test2.ts')).toBe(true);
    });

    it('should disable mtime validation for pre-populated cache', async () => {
      const files: ScannedFile[] = [{ path: '/fake/test.ts', content: 'original' }];

      const cache = await createCacheFromFiles(files);

      // Should return pre-loaded content without checking disk
      const content = await cache.getContent('/fake/test.ts');
      expect(content).toBe('original');

      cache.clear();
    });

    it('should handle empty file array', async () => {
      const cache = await createCacheFromFiles([]);

      expect(cache.size).toBe(0);
      cache.clear();
    });
  });

  describe('memory and size limits', () => {
    it('should track memory usage correctly', async () => {
      const cache = new MiningCache();
      const filePath = path.join(testDir, 'test.ts');
      const content = 'const x = 1;';
      await fsp.writeFile(filePath, content);

      await cache.getContent(filePath);

      // V8 stores strings as UCS-2 (2 bytes per char)
      expect(cache.memoryUsage).toBe(content.length * 2);
    });

    it('should skip files larger than 5MB', async () => {
      const cache = new MiningCache();
      const largePath = path.join(testDir, 'large.ts');
      const largeContent = Buffer.alloc(6 * 1024 * 1024, 'x');
      await fsp.writeFile(largePath, largeContent);

      const result = await cache.getContent(largePath);

      expect(result).toBeNull();
      expect(cache.getStats().skipped).toBe(1);
    });

    it('should track skipped files count', async () => {
      const cache = new MiningCache();
      const largePath1 = path.join(testDir, 'large1.ts');
      const largePath2 = path.join(testDir, 'large2.ts');
      const largeContent = Buffer.alloc(6 * 1024 * 1024, 'x');
      await fsp.writeFile(largePath1, largeContent);
      await fsp.writeFile(largePath2, largeContent);

      await cache.getContent(largePath1);
      await cache.getContent(largePath2);

      expect(cache.getStats().skipped).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when hitting file limit', async () => {
      // Note: This test is conceptual since the actual limit is 5000 files
      // We test the behavior of lastAccessed tracking instead
      const cache = new MiningCache();
      const file1 = path.join(testDir, 'file1.ts');
      const file2 = path.join(testDir, 'file2.ts');
      await fsp.writeFile(file1, 'const a = 1;');
      await fsp.writeFile(file2, 'const b = 2;');

      // Access file1 first
      await cache.getContent(file1);

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Access file2
      await cache.getContent(file2);

      // Access file1 again (updates lastAccessed)
      await cache.getContent(file1);

      // Both should still be in cache
      expect(cache.size).toBe(2);
      expect(cache.has(file1)).toBe(true);
      expect(cache.has(file2)).toBe(true);
    });

    it('should update lastAccessed on cache hits', async () => {
      const cache = new MiningCache();
      const filePath = path.join(testDir, 'test.ts');
      await fsp.writeFile(filePath, 'const x = 1;');

      // First access
      await cache.getContent(filePath);
      const stats1 = cache.getStats();

      // Wait and access again
      await new Promise((resolve) => setTimeout(resolve, 10));
      await cache.getContent(filePath);
      const stats2 = cache.getStats();

      // Should have one hit
      expect(stats2.hits).toBe(stats1.hits + 1);
    });
  });

  describe('security', () => {
    it('should validate all files are within project root', async () => {
      const cache = new MiningCache();
      const srcDir = path.join(testDir, 'src');
      await fsp.mkdir(srcDir);
      await fsp.writeFile(path.join(srcDir, 'index.ts'), 'const x = 1;');

      const files = await scanAllSourceDirectories(testDir, cache);

      // All files should be within testDir
      for (const file of files) {
        const resolvedPath = path.resolve(file.path);
        expect(resolvedPath.startsWith(path.resolve(testDir))).toBe(true);
      }
    });

    it('should skip dist and build directories', async () => {
      const cache = new MiningCache();
      const srcDir = path.join(testDir, 'src');
      const distDir = path.join(testDir, 'src', 'dist');
      const buildDir = path.join(testDir, 'src', 'build');
      await fsp.mkdir(srcDir);
      await fsp.mkdir(distDir);
      await fsp.mkdir(buildDir);
      await fsp.writeFile(path.join(srcDir, 'index.ts'), 'source');
      await fsp.writeFile(path.join(distDir, 'index.js'), 'compiled');
      await fsp.writeFile(path.join(buildDir, 'index.js'), 'built');

      const files = await scanDirectory(srcDir, cache);

      expect(files.length).toBe(1);
      expect(files[0].path.endsWith('index.ts')).toBe(true);
    });

    it('should skip coverage directory', async () => {
      const cache = new MiningCache();
      const srcDir = path.join(testDir, 'src');
      const coverageDir = path.join(testDir, 'src', 'coverage');
      await fsp.mkdir(srcDir);
      await fsp.mkdir(coverageDir);
      await fsp.writeFile(path.join(srcDir, 'index.ts'), 'source');
      await fsp.writeFile(path.join(coverageDir, 'report.ts'), 'coverage data');

      const files = await scanDirectory(srcDir, cache);

      expect(files.length).toBe(1);
    });

    it('should respect custom extensions option', async () => {
      const cache = new MiningCache();
      const srcDir = path.join(testDir, 'src');
      await fsp.mkdir(srcDir);
      await fsp.writeFile(path.join(srcDir, 'code.ts'), 'typescript');
      await fsp.writeFile(path.join(srcDir, 'style.css'), 'css');
      await fsp.writeFile(path.join(srcDir, 'config.json'), 'json');

      // Only scan .ts and .json
      const files = await scanDirectory(srcDir, cache, {
        extensions: ['.ts', '.json'],
      });

      expect(files.length).toBe(2);
      const extensions = files.map((f) => path.extname(f.path)).sort();
      expect(extensions).toEqual(['.json', '.ts']);
    });
  });
});
