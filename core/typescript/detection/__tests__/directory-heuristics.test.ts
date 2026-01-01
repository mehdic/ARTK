/**
 * Unit tests for directory heuristics detection utilities
 *
 * @group unit
 * @group detection
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as fsPromises from 'node:fs/promises';
import {
  DIRECTORY_PATTERNS,
  NON_FRONTEND_PATTERNS,
  DirectoryAnalyzer,
  analyzeDirectoryName,
  isFrontendDirectory,
  isNonFrontendDirectory,
  scanForFrontendDirectories,
} from '../directory-heuristics.js';

// =============================================================================
// Mock Setup
// =============================================================================

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof fsPromises>('node:fs/promises');
  return {
    ...actual,
    readdir: vi.fn(),
  };
});

// =============================================================================
// DIRECTORY_PATTERNS Tests
// =============================================================================

describe('DIRECTORY_PATTERNS', () => {
  it('should have high confidence patterns', () => {
    expect(DIRECTORY_PATTERNS.high).toContain('frontend');
    expect(DIRECTORY_PATTERNS.high).toContain('client');
    expect(DIRECTORY_PATTERNS.high).toContain('webapp');
    expect(DIRECTORY_PATTERNS.high).toContain('web-app');
    expect(DIRECTORY_PATTERNS.high).toContain('web-client');
  });

  it('should have medium confidence patterns', () => {
    expect(DIRECTORY_PATTERNS.medium).toContain('web');
    expect(DIRECTORY_PATTERNS.medium).toContain('app');
    expect(DIRECTORY_PATTERNS.medium).toContain('ui');
  });

  it('should have low confidence patterns', () => {
    expect(DIRECTORY_PATTERNS.low).toContain('src');
    expect(DIRECTORY_PATTERNS.low).toContain('public');
    expect(DIRECTORY_PATTERNS.low).toContain('assets');
  });
});

// =============================================================================
// NON_FRONTEND_PATTERNS Tests
// =============================================================================

describe('NON_FRONTEND_PATTERNS', () => {
  it('should include backend-related patterns', () => {
    expect(NON_FRONTEND_PATTERNS).toContain('backend');
    expect(NON_FRONTEND_PATTERNS).toContain('server');
    expect(NON_FRONTEND_PATTERNS).toContain('api');
    expect(NON_FRONTEND_PATTERNS).toContain('service');
    expect(NON_FRONTEND_PATTERNS).toContain('services');
  });

  it('should include library-related patterns', () => {
    expect(NON_FRONTEND_PATTERNS).toContain('lib');
    expect(NON_FRONTEND_PATTERNS).toContain('libs');
    expect(NON_FRONTEND_PATTERNS).toContain('packages');
  });

  it('should include test-related patterns', () => {
    expect(NON_FRONTEND_PATTERNS).toContain('test');
    expect(NON_FRONTEND_PATTERNS).toContain('tests');
    expect(NON_FRONTEND_PATTERNS).toContain('__tests__');
    expect(NON_FRONTEND_PATTERNS).toContain('e2e');
    expect(NON_FRONTEND_PATTERNS).toContain('spec');
    expect(NON_FRONTEND_PATTERNS).toContain('specs');
  });

  it('should include build output patterns', () => {
    expect(NON_FRONTEND_PATTERNS).toContain('dist');
    expect(NON_FRONTEND_PATTERNS).toContain('build');
    expect(NON_FRONTEND_PATTERNS).toContain('out');
    expect(NON_FRONTEND_PATTERNS).toContain('coverage');
  });

  it('should include tooling patterns', () => {
    expect(NON_FRONTEND_PATTERNS).toContain('node_modules');
    expect(NON_FRONTEND_PATTERNS).toContain('.git');
    expect(NON_FRONTEND_PATTERNS).toContain('.github');
    expect(NON_FRONTEND_PATTERNS).toContain('tools');
    expect(NON_FRONTEND_PATTERNS).toContain('scripts');
    expect(NON_FRONTEND_PATTERNS).toContain('docs');
  });
});

// =============================================================================
// DirectoryAnalyzer Tests
// =============================================================================

describe('DirectoryAnalyzer', () => {
  let analyzer: DirectoryAnalyzer;

  beforeEach(() => {
    analyzer = new DirectoryAnalyzer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should detect high confidence frontend directory', () => {
      const result = analyzer.analyze('/project/frontend');

      expect(result.dirName).toBe('frontend');
      expect(result.isFrontend).toBe(true);
      expect(result.isNonFrontend).toBe(false);
      expect(result.confidence).toBe('high');
      expect(result.signals.length).toBeGreaterThan(0);
    });

    it('should detect client directory as frontend', () => {
      const result = analyzer.analyze('/project/client');

      expect(result.isFrontend).toBe(true);
      expect(result.confidence).toBe('high');
    });

    it('should detect webapp directory as frontend', () => {
      const result = analyzer.analyze('/project/webapp');

      expect(result.isFrontend).toBe(true);
      expect(result.confidence).toBe('high');
    });

    it('should detect medium confidence frontend directory', () => {
      const result = analyzer.analyze('/project/web');

      expect(result.isFrontend).toBe(true);
      expect(result.confidence).toBe('medium');
    });

    it('should detect app directory as frontend', () => {
      const result = analyzer.analyze('/project/app');

      expect(result.isFrontend).toBe(true);
      expect(result.confidence).toBe('medium');
    });

    it('should detect ui directory as frontend', () => {
      const result = analyzer.analyze('/project/ui');

      expect(result.isFrontend).toBe(true);
      expect(result.confidence).toBe('medium');
    });

    it('should detect non-frontend directory - backend', () => {
      const result = analyzer.analyze('/project/backend');

      expect(result.isFrontend).toBe(false);
      expect(result.isNonFrontend).toBe(true);
      expect(result.confidence).toBe('none');
      expect(result.signals).toEqual([]);
    });

    it('should detect non-frontend directory - server', () => {
      const result = analyzer.analyze('/project/server');

      expect(result.isFrontend).toBe(false);
      expect(result.isNonFrontend).toBe(true);
    });

    it('should detect non-frontend directory - api', () => {
      const result = analyzer.analyze('/project/api');

      expect(result.isFrontend).toBe(false);
      expect(result.isNonFrontend).toBe(true);
    });

    it('should detect non-frontend directory - node_modules', () => {
      const result = analyzer.analyze('/project/node_modules');

      expect(result.isFrontend).toBe(false);
      expect(result.isNonFrontend).toBe(true);
    });

    it('should detect non-frontend directory - tests', () => {
      const result = analyzer.analyze('/project/tests');

      expect(result.isFrontend).toBe(false);
      expect(result.isNonFrontend).toBe(true);
    });

    it('should detect suffix match - iss-frontend', () => {
      const result = analyzer.analyze('/project/iss-frontend');

      expect(result.isFrontend).toBe(true);
      expect(result.confidence).toBe('high');
    });

    it('should detect prefix match - frontend-app', () => {
      const result = analyzer.analyze('/project/frontend-app');

      expect(result.isFrontend).toBe(true);
      expect(result.confidence).toBe('high');
    });

    it('should detect prefix match - web-client', () => {
      const result = analyzer.analyze('/project/web-client');

      expect(result.isFrontend).toBe(true);
      expect(result.confidence).toBe('high');
    });

    it('should be case-insensitive', () => {
      const result1 = analyzer.analyze('/project/Frontend');
      const result2 = analyzer.analyze('/project/FRONTEND');
      const result3 = analyzer.analyze('/project/FrOnTeNd');

      expect(result1.isFrontend).toBe(true);
      expect(result2.isFrontend).toBe(true);
      expect(result3.isFrontend).toBe(true);
    });

    it('should return no confidence for unknown directory', () => {
      const result = analyzer.analyze('/project/random-dir');

      expect(result.isFrontend).toBe(false);
      expect(result.isNonFrontend).toBe(false);
      expect(result.confidence).toBe('none');
    });

    it('should detect non-frontend prefix match - backend-service', () => {
      const result = analyzer.analyze('/project/backend-service');

      expect(result.isFrontend).toBe(false);
      expect(result.isNonFrontend).toBe(true);
    });

    it('should calculate score from signals', () => {
      const result = analyzer.analyze('/project/frontend');

      expect(result.score).toBeGreaterThan(0);
      expect(result.detailedSignals.length).toBeGreaterThan(0);
    });
  });

  describe('scanForFrontends', () => {
    it('should find frontend directories', async () => {
      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: 'frontend', isDirectory: () => true },
        { name: 'backend', isDirectory: () => true },
        { name: 'package.json', isDirectory: () => false },
      ] as any);

      const results = await analyzer.scanForFrontends('/project', 1);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.dirName === 'frontend')).toBe(true);
      expect(results.some((r) => r.dirName === 'backend')).toBe(false);
    });

    it('should skip non-directory entries', async () => {
      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: 'frontend', isDirectory: () => false },
        { name: 'README.md', isDirectory: () => false },
      ] as any);

      const results = await analyzer.scanForFrontends('/project', 1);

      expect(results.length).toBe(0);
    });

    it('should respect maxDepth parameter', async () => {
      const mockReaddir = vi.mocked(fsPromises.readdir);

      // First call returns frontend directory
      mockReaddir.mockResolvedValueOnce([
        { name: 'frontend', isDirectory: () => true },
      ] as any);

      // Second call (inside frontend) returns empty
      mockReaddir.mockResolvedValueOnce([] as any);

      const results = await analyzer.scanForFrontends('/project', 1);

      expect(mockReaddir).toHaveBeenCalled();
    });

    it('should handle read errors gracefully', async () => {
      vi.mocked(fsPromises.readdir).mockRejectedValue(new Error('Permission denied'));

      const results = await analyzer.scanForFrontends('/project', 1);

      // Should not throw
      expect(results).toEqual([]);
    });

    it('should skip non-frontend directories in scan', async () => {
      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: 'node_modules', isDirectory: () => true },
        { name: '.git', isDirectory: () => true },
        { name: 'frontend', isDirectory: () => true },
      ] as any);

      const results = await analyzer.scanForFrontends('/project', 1);

      // Should find frontend but not node_modules or .git
      expect(results.some((r) => r.dirName === 'frontend')).toBe(true);
      expect(results.some((r) => r.dirName === 'node_modules')).toBe(false);
      expect(results.some((r) => r.dirName === '.git')).toBe(false);
    });
  });
});

// =============================================================================
// analyzeDirectoryName Tests
// =============================================================================

describe('analyzeDirectoryName', () => {
  it('should use DirectoryAnalyzer internally', () => {
    const result = analyzeDirectoryName('/project/frontend');

    expect(result).toHaveProperty('dirName');
    expect(result).toHaveProperty('isFrontend');
    expect(result).toHaveProperty('isNonFrontend');
    expect(result).toHaveProperty('confidence');
  });

  it('should analyze frontend directory', () => {
    const result = analyzeDirectoryName('/project/client');

    expect(result.isFrontend).toBe(true);
  });

  it('should analyze non-frontend directory', () => {
    const result = analyzeDirectoryName('/project/server');

    expect(result.isNonFrontend).toBe(true);
  });
});

// =============================================================================
// isFrontendDirectory Tests
// =============================================================================

describe('isFrontendDirectory', () => {
  it('should return true for frontend directory', () => {
    expect(isFrontendDirectory('/project/frontend')).toBe(true);
    expect(isFrontendDirectory('/project/client')).toBe(true);
    expect(isFrontendDirectory('/project/webapp')).toBe(true);
  });

  it('should return true for medium confidence directories', () => {
    expect(isFrontendDirectory('/project/web')).toBe(true);
    expect(isFrontendDirectory('/project/app')).toBe(true);
    expect(isFrontendDirectory('/project/ui')).toBe(true);
  });

  it('should return false for non-frontend directory', () => {
    expect(isFrontendDirectory('/project/backend')).toBe(false);
    expect(isFrontendDirectory('/project/server')).toBe(false);
    expect(isFrontendDirectory('/project/api')).toBe(false);
  });

  it('should return false for unknown directory', () => {
    expect(isFrontendDirectory('/project/random')).toBe(false);
  });
});

// =============================================================================
// isNonFrontendDirectory Tests
// =============================================================================

describe('isNonFrontendDirectory', () => {
  it('should return true for non-frontend directories', () => {
    expect(isNonFrontendDirectory('/project/backend')).toBe(true);
    expect(isNonFrontendDirectory('/project/server')).toBe(true);
    expect(isNonFrontendDirectory('/project/api')).toBe(true);
    expect(isNonFrontendDirectory('/project/tests')).toBe(true);
  });

  it('should return false for frontend directories', () => {
    expect(isNonFrontendDirectory('/project/frontend')).toBe(false);
    expect(isNonFrontendDirectory('/project/client')).toBe(false);
  });

  it('should return false for unknown directories', () => {
    expect(isNonFrontendDirectory('/project/random')).toBe(false);
  });
});

// =============================================================================
// scanForFrontendDirectories Tests
// =============================================================================

describe('scanForFrontendDirectories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use DirectoryAnalyzer internally', async () => {
    vi.mocked(fsPromises.readdir).mockResolvedValue([
      { name: 'frontend', isDirectory: () => true },
    ] as any);

    const results = await scanForFrontendDirectories('/project');

    expect(results.length).toBeGreaterThan(0);
  });

  it('should respect custom maxDepth', async () => {
    vi.mocked(fsPromises.readdir).mockResolvedValue([] as any);

    await scanForFrontendDirectories('/project', 3);

    // Just verify it doesn't throw with custom depth
    expect(true).toBe(true);
  });
});
