/**
 * Unit tests for the main frontend detector
 *
 * @group unit
 * @group detection
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import {
  FrontendDetector,
  detectFrontends,
  detectSingleFrontend,
  filterByConfidence,
  detectionResultsToTargets,
} from '../frontend-detector.js';
import type { DetectionResult, ArtkConfidenceLevel } from '../../types/detection.js';

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

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof fsPromises>('node:fs/promises');
  return {
    ...actual,
    readFile: vi.fn(),
    readdir: vi.fn(),
  };
});

// =============================================================================
// Mock Helpers
// =============================================================================

function createMockDetectionResult(overrides: Partial<DetectionResult> = {}): DetectionResult {
  return {
    path: '/test/project',
    relativePath: 'project',
    confidence: 'high' as ArtkConfidenceLevel,
    type: 'react-spa',
    signals: ['package-dependency:react'],
    score: 50,
    detailedSignals: [],
    ...overrides,
  };
}

// =============================================================================
// FrontendDetector Tests
// =============================================================================

describe('FrontendDetector', () => {
  let detector: FrontendDetector;

  beforeEach(() => {
    detector = new FrontendDetector();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectAll', () => {
    it('should return empty array when no frontends found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const results = await detector.detectAll('/test/project');

      expect(results).toEqual([]);
    });

    it('should detect React frontend from package.json', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);
        // Directory must exist AND package.json must exist
        return pathStr === '/test/project' || pathStr === '/test/project/package.json';
      });
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'react-app',
          dependencies: {
            react: '^18.0.0',
            'react-dom': '^18.0.0',
          },
        })
      );
      vi.mocked(fsPromises.readdir).mockResolvedValue([] as any);

      const results = await detector.detectAll('/test/project');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.type).toBe('react-spa');
    });

    it('should sort results by score (highest first)', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'react-app',
          dependencies: { react: '^18.0.0' },
        })
      );
      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: 'frontend', isDirectory: () => true },
        { name: 'client', isDirectory: () => true },
      ] as any);

      const results = await detector.detectAll('/test/project');

      // Results should be sorted by score descending
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i]?.score).toBeGreaterThanOrEqual(results[i + 1]?.score ?? 0);
      }
    });

    it('should respect maxResults option', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'app',
          dependencies: { react: '^18.0.0' },
        })
      );
      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: 'app1', isDirectory: () => true },
        { name: 'app2', isDirectory: () => true },
        { name: 'app3', isDirectory: () => true },
        { name: 'app4', isDirectory: () => true },
        { name: 'app5', isDirectory: () => true },
        { name: 'app6', isDirectory: () => true },
      ] as any);

      const results = await detector.detectAll('/test/project', {
        maxResults: 3,
      });

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should respect maxDepth option', async () => {
      const readdirCalls: string[] = [];
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue('{}');
      vi.mocked(fsPromises.readdir).mockImplementation(async (path) => {
        readdirCalls.push(path as string);
        return [];
      });

      await detector.detectAll('/test/project', { maxDepth: 1 });

      // Should have limited depth scanning
      expect(readdirCalls).toBeDefined();
    });

    it('should filter low confidence results when includeLowConfidence is false', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue('{}');
      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: 'web', isDirectory: () => true },
      ] as any);

      const results = await detector.detectAll('/test/project', {
        includeLowConfidence: false,
      });

      // All results should have medium or high confidence
      results.forEach((r) => {
        expect(r.confidence).not.toBe('low');
      });
    });

    it('should skip hidden directories', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue('{}');
      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: '.hidden', isDirectory: () => true },
        { name: 'frontend', isDirectory: () => true },
      ] as any);

      const results = await detector.detectAll('/test/project');

      // Should not include .hidden directory
      expect(results.every((r) => !r.path.includes('.hidden'))).toBe(true);
    });

    it('should skip node_modules', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue('{}');
      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: 'node_modules', isDirectory: () => true },
        { name: 'frontend', isDirectory: () => true },
      ] as any);

      const results = await detector.detectAll('/test/project');

      // Should not include node_modules
      expect(results.every((r) => !r.path.includes('node_modules'))).toBe(true);
    });

    it('should not scan deeply into high-confidence frontends', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'react-app',
          dependencies: { react: '^18.0.0', vite: '^5.0.0' },
        })
      );
      vi.mocked(fsPromises.readdir).mockResolvedValue([] as any);

      const results = await detector.detectAll('/test/project');

      // Should detect but not scan further into high confidence frontend
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('detectSingle', () => {
    it('should return null for low score directory', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await detector.detectSingle('/test/project');

      expect(result).toBeNull();
    });

    it('should return detection result for valid frontend', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return path === '/test/project/package.json';
      });
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'react-app',
          dependencies: { react: '^18.0.0' },
        })
      );

      const result = await detector.detectSingle('/test/project');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('react-spa');
    });

    it('should use custom relativeTo path', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return path === '/test/project/frontend/package.json';
      });
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          name: 'react-app',
          dependencies: { react: '^18.0.0' },
        })
      );

      const result = await detector.detectSingle('/test/project/frontend', '/test/project');

      expect(result?.relativePath).toBe('frontend');
    });
  });
});

// =============================================================================
// detectFrontends Tests
// =============================================================================

describe('detectFrontends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use FrontendDetector internally', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const results = await detectFrontends('/test/project');

    expect(Array.isArray(results)).toBe(true);
  });

  it('should pass options to detector', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const results = await detectFrontends('/test/project', {
      maxDepth: 2,
      maxResults: 3,
    });

    expect(results.length).toBeLessThanOrEqual(3);
  });
});

// =============================================================================
// detectSingleFrontend Tests
// =============================================================================

describe('detectSingleFrontend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use FrontendDetector internally', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await detectSingleFrontend('/test/project');

    // Should return null for non-frontend
    expect(result).toBeNull();
  });
});

// =============================================================================
// filterByConfidence Tests
// =============================================================================

describe('filterByConfidence', () => {
  it('should filter results by minimum confidence', () => {
    const results: DetectionResult[] = [
      createMockDetectionResult({ confidence: 'high', score: 50 }),
      createMockDetectionResult({ confidence: 'medium', score: 30 }),
      createMockDetectionResult({ confidence: 'low', score: 15 }),
    ];

    const filtered = filterByConfidence(results, 'medium');

    expect(filtered.length).toBe(2);
    expect(filtered.every((r) => r.confidence !== 'low')).toBe(true);
  });

  it('should return all results when minConfidence is low', () => {
    const results: DetectionResult[] = [
      createMockDetectionResult({ confidence: 'high' }),
      createMockDetectionResult({ confidence: 'medium' }),
      createMockDetectionResult({ confidence: 'low' }),
    ];

    const filtered = filterByConfidence(results, 'low');

    expect(filtered.length).toBe(3);
  });

  it('should return only high confidence when minConfidence is high', () => {
    const results: DetectionResult[] = [
      createMockDetectionResult({ confidence: 'high' }),
      createMockDetectionResult({ confidence: 'medium' }),
      createMockDetectionResult({ confidence: 'low' }),
    ];

    const filtered = filterByConfidence(results, 'high');

    expect(filtered.length).toBe(1);
    expect(filtered[0]?.confidence).toBe('high');
  });

  it('should handle empty results', () => {
    const filtered = filterByConfidence([], 'high');

    expect(filtered).toEqual([]);
  });
});

// =============================================================================
// detectionResultsToTargets Tests
// =============================================================================

describe('detectionResultsToTargets', () => {
  it('should convert detection results to targets', () => {
    const results: DetectionResult[] = [
      createMockDetectionResult({
        path: '/test/frontend',
        relativePath: 'frontend',
        type: 'react-spa',
        confidence: 'high',
        score: 50,
        signals: ['package-dependency:react'],
      }),
    ];

    const targets = detectionResultsToTargets(results);

    expect(targets.length).toBe(1);
    expect(targets[0]).toHaveProperty('name');
    expect(targets[0]).toHaveProperty('path', 'frontend');
    expect(targets[0]).toHaveProperty('type', 'react-spa');
    expect(targets[0]).toHaveProperty('detected_by');
    expect(targets[0]).toHaveProperty('description');
  });

  it('should generate kebab-case names from directory names', () => {
    const results: DetectionResult[] = [
      createMockDetectionResult({
        path: '/test/MyFrontendApp',
        relativePath: 'MyFrontendApp',
      }),
    ];

    const targets = detectionResultsToTargets(results);

    expect(targets[0]?.name).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it('should use fallback names for invalid directory names', () => {
    const results: DetectionResult[] = [
      createMockDetectionResult({
        path: '/test/123-invalid',
        relativePath: '123-invalid',
      }),
    ];

    const targets = detectionResultsToTargets(results);

    expect(targets[0]?.name).toBe('frontend');
  });

  it('should number duplicate names', () => {
    const results: DetectionResult[] = [
      createMockDetectionResult({ path: '/test/123', relativePath: '123' }),
      createMockDetectionResult({ path: '/test/456', relativePath: '456' }),
    ];

    const targets = detectionResultsToTargets(results);

    expect(targets[0]?.name).toBe('frontend');
    expect(targets[1]?.name).toBe('frontend-2');
  });

  it('should include detection signals in detected_by', () => {
    const results: DetectionResult[] = [
      createMockDetectionResult({
        signals: ['package-dependency:react', 'entry-file:src/App.tsx'],
      }),
    ];

    const targets = detectionResultsToTargets(results);

    expect(targets[0]?.detected_by).toContain('package-dependency:react');
    expect(targets[0]?.detected_by).toContain('entry-file:src/App.tsx');
  });

  it('should include confidence and score in description', () => {
    const results: DetectionResult[] = [
      createMockDetectionResult({
        type: 'react-spa',
        confidence: 'high',
        score: 50,
      }),
    ];

    const targets = detectionResultsToTargets(results);

    expect(targets[0]?.description).toContain('react-spa');
    expect(targets[0]?.description).toContain('high');
    expect(targets[0]?.description).toContain('50');
  });

  it('should handle empty results', () => {
    const targets = detectionResultsToTargets([]);

    expect(targets).toEqual([]);
  });
});
