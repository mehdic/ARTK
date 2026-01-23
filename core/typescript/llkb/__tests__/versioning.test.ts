/**
 * Unit tests for LLKB Versioning Module
 *
 * Tests:
 * - extractLlkbVersionFromTest: Extract @llkb-version from test content
 * - extractLlkbEntriesFromTest: Extract @llkb-entries from test content
 * - updateTestLlkbVersion: Update @llkb-version header
 * - getCurrentLlkbVersion: Get current LLKB version
 * - countNewEntriesSince: Count new lessons/components
 * - compareVersions: Compare test version with current LLKB
 * - checkUpdates: Check multiple tests for updates
 * - Format functions: Output formatting
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  checkUpdates,
  compareVersions,
  countNewEntriesSince,
  extractLlkbEntriesFromTest,
  extractLlkbVersionFromTest,
  formatUpdateCheckResult,
  formatVersionComparison,
  getCurrentLlkbVersion,
  type UpdateCheckResult,
  updateTestLlkbVersion,
  type VersionComparison,
} from '../versioning.js';

// =============================================================================
// Test Setup
// =============================================================================

function createTempDir(): string {
  const tempDir = join(tmpdir(), `llkb-versioning-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

function setupLLKB(llkbRoot: string, overrides: Partial<{
  lastUpdated: string;
  lessons: Array<{
    id: string;
    metrics: { firstSeen: string };
  }>;
  components: Array<{
    id: string;
    source: { extractedAt: string };
  }>;
}> = {}): void {
  const now = new Date();
  const lastUpdated = overrides.lastUpdated ?? now.toISOString();

  // Analytics - simplified for tests (loadJSON reads this as plain object)
  const analytics = {
    version: '1.0.0',
    lastUpdated,
    overview: {
      totalLessons: overrides.lessons?.length ?? 2,
      activeLessons: overrides.lessons?.length ?? 2,
      archivedLessons: 0,
      totalComponents: overrides.components?.length ?? 1,
      activeComponents: overrides.components?.length ?? 1,
      archivedComponents: 0,
    },
    lessonStats: {
      byCategory: {},
      avgConfidence: 0.8,
      avgSuccessRate: 0.9,
    },
    componentStats: {
      byCategory: {},
      byScope: {},
      totalReuses: 10,
      avgReusesPerComponent: 10,
    },
    impact: {},
    topPerformers: { lessons: [], components: [] },
    needsReview: { lowConfidenceLessons: [], lowUsageComponents: [], decliningSuccessRate: [] },
  };
  writeFileSync(join(llkbRoot, 'analytics.json'), JSON.stringify(analytics), 'utf-8');

  // Lessons - simplified for tests
  const defaultLessons = [
    {
      id: 'L001',
      title: 'Test Lesson 1',
      pattern: 'test1',
      trigger: 'test1',
      category: 'selector',
      scope: 'universal',
      journeyIds: ['J001'],
      metrics: {
        occurrences: 10,
        successRate: 0.9,
        confidence: 0.85,
        firstSeen: '2026-01-01T00:00:00Z',
        lastSuccess: now.toISOString(),
        lastApplied: null,
      },
      validation: { humanReviewed: true, reviewedBy: 'user', reviewedAt: now.toISOString() },
    },
    {
      id: 'L002',
      title: 'Test Lesson 2',
      pattern: 'test2',
      trigger: 'test2',
      category: 'timing',
      scope: 'universal',
      journeyIds: ['J002'],
      metrics: {
        occurrences: 5,
        successRate: 0.8,
        confidence: 0.7,
        firstSeen: '2026-01-15T00:00:00Z',
        lastSuccess: now.toISOString(),
        lastApplied: null,
      },
      validation: { humanReviewed: false },
    },
  ];

  const lessons = {
    version: '1.0.0',
    lastUpdated,
    lessons: overrides.lessons ?? defaultLessons,
    archived: [],
    globalRules: [],
    appQuirks: [],
  };
  writeFileSync(join(llkbRoot, 'lessons.json'), JSON.stringify(lessons), 'utf-8');

  // Components - simplified for tests
  const defaultComponents = [
    {
      id: 'C001',
      name: 'testComponent',
      description: 'Test component',
      category: 'auth',
      scope: 'universal',
      filePath: 'modules/auth.ts',
      metrics: {
        totalUses: 15,
        successRate: 0.95,
        lastUsed: now.toISOString(),
      },
      source: {
        originalCode: 'function test() {}',
        extractedFrom: 'J001',
        extractedBy: 'journey-implement',
        extractedAt: '2026-01-10T00:00:00Z',
      },
    },
  ];

  const components = {
    version: '1.0.0',
    lastUpdated,
    components: overrides.components ?? defaultComponents,
    componentsByCategory: {},
    componentsByScope: {},
  };
  writeFileSync(join(llkbRoot, 'components.json'), JSON.stringify(components), 'utf-8');
}

function createTestFile(dir: string, filename: string, llkbVersion?: string): string {
  const filePath = join(dir, filename);

  let content = `/**
 * Test Journey
 * Journey: JRN-001
 *
 * @generated by @artk/core-autogen v1.0.0
 * @timestamp 2026-01-01T00:00:00Z`;

  if (llkbVersion) {
    content += `
 * @llkb-version ${llkbVersion}`;
  }

  content += `
 * @tags smoke
 * @tier smoke
 * @scope app
 * @actor user
 */
import { test, expect } from '@playwright/test';

test('JRN-001: Test Journey', async ({ page }) => {
  await page.goto('/');
});
`;

  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

let tempDir: string;
let llkbRoot: string;
let testsDir: string;

beforeEach(() => {
  tempDir = createTempDir();
  llkbRoot = join(tempDir, '.artk', 'llkb');
  testsDir = join(tempDir, 'tests');
  mkdirSync(llkbRoot, { recursive: true });
  mkdirSync(testsDir, { recursive: true });
});

afterEach(() => {
  if (tempDir && existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// =============================================================================
// extractLlkbVersionFromTest Tests
// =============================================================================

describe('extractLlkbVersionFromTest', () => {
  it('extracts version from test content', () => {
    const content = `
/**
 * @llkb-version 2026-01-23T10:00:00Z
 */
import { test } from '@playwright/test';
`;
    const version = extractLlkbVersionFromTest(content);
    expect(version).toBe('2026-01-23T10:00:00Z');
  });

  it('extracts version without Z suffix', () => {
    const content = `// @llkb-version 2026-01-23T10:00:00`;
    const version = extractLlkbVersionFromTest(content);
    expect(version).toBe('2026-01-23T10:00:00');
  });

  it('extracts version with milliseconds', () => {
    const content = `// @llkb-version 2026-01-23T10:00:00.123Z`;
    const version = extractLlkbVersionFromTest(content);
    expect(version).toBe('2026-01-23T10:00:00.123Z');
  });

  it('returns null when no version present', () => {
    const content = `
/**
 * @generated by @artk/core-autogen
 */
import { test } from '@playwright/test';
`;
    const version = extractLlkbVersionFromTest(content);
    expect(version).toBeNull();
  });

  it('handles star comment format', () => {
    const content = `
/**
 * @generated by @artk/core-autogen v1.0.0
 * @timestamp 2026-01-20T00:00:00Z
 * @llkb-version 2026-01-15T00:00:00Z
 * @tags smoke
 */
`;
    const version = extractLlkbVersionFromTest(content);
    expect(version).toBe('2026-01-15T00:00:00Z');
  });
});

// =============================================================================
// extractLlkbEntriesFromTest Tests
// =============================================================================

describe('extractLlkbEntriesFromTest', () => {
  it('extracts entry count from test content', () => {
    const content = `
/**
 * @llkb-version 2026-01-23T10:00:00Z
 * @llkb-entries 42
 */
`;
    const entries = extractLlkbEntriesFromTest(content);
    expect(entries).toBe(42);
  });

  it('returns null when no entries present', () => {
    const content = `// @llkb-version 2026-01-23T10:00:00Z`;
    const entries = extractLlkbEntriesFromTest(content);
    expect(entries).toBeNull();
  });

  it('handles zero entries', () => {
    const content = `// @llkb-entries 0`;
    const entries = extractLlkbEntriesFromTest(content);
    expect(entries).toBe(0);
  });
});

// =============================================================================
// updateTestLlkbVersion Tests
// =============================================================================

describe('updateTestLlkbVersion', () => {
  it('updates existing version', () => {
    const content = `
/**
 * @llkb-version 2026-01-01T00:00:00Z
 */
`;
    const updated = updateTestLlkbVersion(content, '2026-01-23T10:00:00Z');
    expect(updated).toContain('@llkb-version 2026-01-23T10:00:00Z');
    expect(updated).not.toContain('2026-01-01T00:00:00Z');
  });

  it('adds version after timestamp if not present', () => {
    const content = `
/**
 * @timestamp 2026-01-20T00:00:00Z
 * @tags smoke
 */
`;
    const updated = updateTestLlkbVersion(content, '2026-01-23T10:00:00Z');
    expect(updated).toContain('@llkb-version 2026-01-23T10:00:00Z');
    // Should be after timestamp
    const timestampIndex = updated.indexOf('@timestamp');
    const versionIndex = updated.indexOf('@llkb-version');
    expect(versionIndex).toBeGreaterThan(timestampIndex);
  });

  it('updates entry count when provided', () => {
    const content = `
/**
 * @llkb-version 2026-01-01T00:00:00Z
 * @llkb-entries 10
 */
`;
    const updated = updateTestLlkbVersion(content, '2026-01-23T10:00:00Z', 25);
    expect(updated).toContain('@llkb-entries 25');
    expect(updated).not.toContain('@llkb-entries 10');
  });

  it('adds entry count if not present', () => {
    const content = `
/**
 * @llkb-version 2026-01-01T00:00:00Z
 */
`;
    const updated = updateTestLlkbVersion(content, '2026-01-23T10:00:00Z', 15);
    expect(updated).toContain('@llkb-entries 15');
  });
});

// =============================================================================
// getCurrentLlkbVersion Tests
// =============================================================================

describe('getCurrentLlkbVersion', () => {
  it('returns version from analytics.json', () => {
    setupLLKB(llkbRoot, { lastUpdated: '2026-01-20T12:00:00Z' });

    const version = getCurrentLlkbVersion(llkbRoot);
    expect(version).toBe('2026-01-20T12:00:00Z');
  });

  it('returns current time if analytics missing', () => {
    // Don't set up LLKB
    const version = getCurrentLlkbVersion(llkbRoot);

    // Should be a valid ISO timestamp close to now
    const timestamp = new Date(version);
    expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 10000);
    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });
});

// =============================================================================
// countNewEntriesSince Tests
// =============================================================================

describe('countNewEntriesSince', () => {
  it('counts lessons added after timestamp', () => {
    setupLLKB(llkbRoot);

    // L001 firstSeen: 2026-01-01, L002 firstSeen: 2026-01-15
    // Count lessons since 2026-01-10
    const count = countNewEntriesSince('2026-01-10T00:00:00Z', 'lessons', llkbRoot);
    expect(count).toBe(1); // Only L002
  });

  it('counts all lessons if timestamp is old', () => {
    setupLLKB(llkbRoot);

    const count = countNewEntriesSince('2020-01-01T00:00:00Z', 'lessons', llkbRoot);
    expect(count).toBe(2); // Both lessons
  });

  it('returns 0 for null timestamp', () => {
    setupLLKB(llkbRoot);

    const count = countNewEntriesSince(null, 'lessons', llkbRoot);
    expect(count).toBe(0);
  });

  it('counts components added after timestamp', () => {
    setupLLKB(llkbRoot);

    // C001 extractedAt: 2026-01-10
    const count = countNewEntriesSince('2026-01-05T00:00:00Z', 'components', llkbRoot);
    expect(count).toBe(1);
  });

  it('returns 0 for future timestamp', () => {
    setupLLKB(llkbRoot);

    const count = countNewEntriesSince('2030-01-01T00:00:00Z', 'lessons', llkbRoot);
    expect(count).toBe(0);
  });

  it('handles missing files gracefully', () => {
    // No LLKB setup
    const count = countNewEntriesSince('2026-01-01T00:00:00Z', 'lessons', llkbRoot);
    expect(count).toBe(0);
  });
});

// =============================================================================
// compareVersions Tests
// =============================================================================

describe('compareVersions', () => {
  it('detects outdated test', () => {
    setupLLKB(llkbRoot, { lastUpdated: '2026-01-20T00:00:00Z' });
    const testPath = createTestFile(testsDir, 'test1.spec.ts', '2026-01-01T00:00:00Z');

    const result = compareVersions(testPath, llkbRoot);

    expect(result.isOutdated).toBe(true);
    expect(result.testLlkbVersion).toBe('2026-01-01T00:00:00Z');
    expect(result.currentLlkbVersion).toBe('2026-01-20T00:00:00Z');
  });

  it('detects up-to-date test', () => {
    setupLLKB(llkbRoot, { lastUpdated: '2026-01-20T00:00:00Z' });
    const testPath = createTestFile(testsDir, 'test1.spec.ts', '2026-01-20T00:00:00Z');

    const result = compareVersions(testPath, llkbRoot);

    expect(result.isOutdated).toBe(false);
  });

  it('treats test without version as outdated', () => {
    setupLLKB(llkbRoot, { lastUpdated: '2026-01-20T00:00:00Z' });
    const testPath = createTestFile(testsDir, 'test1.spec.ts'); // No LLKB version

    const result = compareVersions(testPath, llkbRoot);

    expect(result.isOutdated).toBe(true);
    expect(result.testLlkbVersion).toBeNull();
  });

  it('calculates days since update', () => {
    setupLLKB(llkbRoot, { lastUpdated: '2026-01-20T00:00:00Z' });
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const testPath = createTestFile(testsDir, 'test1.spec.ts', tenDaysAgo.toISOString());

    const result = compareVersions(testPath, llkbRoot);

    expect(result.daysSinceUpdate).toBeGreaterThanOrEqual(10);
    expect(result.daysSinceUpdate).toBeLessThan(12);
  });

  it('counts new patterns available', () => {
    setupLLKB(llkbRoot, { lastUpdated: '2026-01-20T00:00:00Z' });
    // Test version is 2026-01-05, L002 firstSeen is 2026-01-15
    const testPath = createTestFile(testsDir, 'test1.spec.ts', '2026-01-05T00:00:00Z');

    const result = compareVersions(testPath, llkbRoot);

    expect(result.newPatternsAvailable).toBe(1); // L002
  });

  it('provides recommendation based on changes', () => {
    setupLLKB(llkbRoot, { lastUpdated: '2026-01-20T00:00:00Z' });

    // Test with many new patterns should recommend update
    const testPath = createTestFile(testsDir, 'test1.spec.ts', '2020-01-01T00:00:00Z');

    const result = compareVersions(testPath, llkbRoot);

    // With 2 lessons since 2020 (both L001 and L002), should recommend update
    expect(['update', 'review']).toContain(result.recommendation);
  });
});

// =============================================================================
// checkUpdates Tests
// =============================================================================

describe('checkUpdates', () => {
  it('categorizes tests correctly', () => {
    setupLLKB(llkbRoot, { lastUpdated: '2026-01-20T00:00:00Z' });
    createTestFile(testsDir, 'outdated.spec.ts', '2026-01-01T00:00:00Z');
    createTestFile(testsDir, 'current.spec.ts', '2026-01-20T00:00:00Z');

    const result = checkUpdates(testsDir, llkbRoot);

    expect(result.outdated.length).toBe(1);
    expect(result.upToDate.length).toBe(1);
    expect(result.summary.total).toBe(2);
    expect(result.summary.outdated).toBe(1);
  });

  it('handles empty directory', () => {
    const result = checkUpdates(testsDir, llkbRoot);

    expect(result.summary.total).toBe(0);
    expect(result.outdated.length).toBe(0);
  });

  it('handles non-existent directory', () => {
    const result = checkUpdates('/nonexistent/path', llkbRoot);

    expect(result.summary.total).toBe(0);
  });

  it('filters by pattern', () => {
    setupLLKB(llkbRoot, { lastUpdated: '2026-01-20T00:00:00Z' });
    createTestFile(testsDir, 'test.spec.ts', '2026-01-01T00:00:00Z');
    createTestFile(testsDir, 'test.test.ts', '2026-01-01T00:00:00Z');

    const specResult = checkUpdates(testsDir, llkbRoot, '*.spec.ts');
    expect(specResult.summary.total).toBe(1);

    const testResult = checkUpdates(testsDir, llkbRoot, '*.test.ts');
    expect(testResult.summary.total).toBe(1);
  });

  it('searches subdirectories', () => {
    setupLLKB(llkbRoot, { lastUpdated: '2026-01-20T00:00:00Z' });
    const subDir = join(testsDir, 'auth');
    mkdirSync(subDir, { recursive: true });
    createTestFile(testsDir, 'root.spec.ts', '2026-01-01T00:00:00Z');
    createTestFile(subDir, 'auth.spec.ts', '2026-01-01T00:00:00Z');

    const result = checkUpdates(testsDir, llkbRoot);

    expect(result.summary.total).toBe(2);
  });

  it('provides summary recommendation', () => {
    setupLLKB(llkbRoot, { lastUpdated: '2026-01-20T00:00:00Z' });
    createTestFile(testsDir, 'test1.spec.ts', '2026-01-01T00:00:00Z');
    createTestFile(testsDir, 'test2.spec.ts', '2026-01-01T00:00:00Z');

    const result = checkUpdates(testsDir, llkbRoot);

    expect(result.summary.recommendation).toContain('2 tests');
  });
});

// =============================================================================
// formatVersionComparison Tests
// =============================================================================

describe('formatVersionComparison', () => {
  it('formats outdated test', () => {
    const comparison: VersionComparison = {
      testLlkbVersion: '2026-01-01T10:00:00Z',
      currentLlkbVersion: '2026-01-20T10:00:00Z',
      isOutdated: true,
      daysSinceUpdate: 19,
      newPatternsAvailable: 3,
      newComponentsAvailable: 1,
      recommendation: 'update',
    };

    const formatted = formatVersionComparison('tests/login.spec.ts', comparison);

    expect(formatted).toContain('!'); // Outdated indicator
    expect(formatted).toContain('login.spec.ts');
    expect(formatted).toContain('+3 patterns');
    expect(formatted).toContain('+1 components');
  });

  it('formats up-to-date test', () => {
    const comparison: VersionComparison = {
      testLlkbVersion: '2026-01-20T10:00:00Z',
      currentLlkbVersion: '2026-01-20T10:00:00Z',
      isOutdated: false,
      daysSinceUpdate: 0,
      newPatternsAvailable: 0,
      newComponentsAvailable: 0,
      recommendation: 'skip',
    };

    const formatted = formatVersionComparison('tests/login.spec.ts', comparison);

    expect(formatted).toContain('✓'); // Up to date indicator
    expect(formatted).not.toContain('+');
  });

  it('handles missing version', () => {
    const comparison: VersionComparison = {
      testLlkbVersion: null,
      currentLlkbVersion: '2026-01-20T10:00:00Z',
      isOutdated: true,
      daysSinceUpdate: Infinity,
      newPatternsAvailable: 0,
      newComponentsAvailable: 0,
      recommendation: 'review',
    };

    const formatted = formatVersionComparison('tests/login.spec.ts', comparison);

    expect(formatted).toContain('none');
  });
});

// =============================================================================
// formatUpdateCheckResult Tests
// =============================================================================

describe('formatUpdateCheckResult', () => {
  it('formats result with outdated tests', () => {
    const result: UpdateCheckResult = {
      outdated: [{
        testFile: 'tests/login.spec.ts',
        comparison: {
          testLlkbVersion: '2026-01-01T00:00:00Z',
          currentLlkbVersion: '2026-01-20T00:00:00Z',
          isOutdated: true,
          daysSinceUpdate: 19,
          newPatternsAvailable: 2,
          newComponentsAvailable: 0,
          recommendation: 'update',
        },
      }],
      upToDate: [],
      errors: [],
      summary: {
        total: 1,
        outdated: 1,
        upToDate: 0,
        errors: 0,
        recommendation: '1 test should be updated',
      },
    };

    const formatted = formatUpdateCheckResult(result);

    expect(formatted).toContain('LLKB Version Check');
    expect(formatted).toContain('Tests needing LLKB update');
    expect(formatted).toContain('login.spec.ts');
    expect(formatted).toContain('Total: 1 tests');
    expect(formatted).toContain('1 test should be updated');
  });

  it('formats all up-to-date result', () => {
    const result: UpdateCheckResult = {
      outdated: [],
      upToDate: [{
        testFile: 'tests/login.spec.ts',
        comparison: {
          testLlkbVersion: '2026-01-20T00:00:00Z',
          currentLlkbVersion: '2026-01-20T00:00:00Z',
          isOutdated: false,
          daysSinceUpdate: 0,
          newPatternsAvailable: 0,
          newComponentsAvailable: 0,
          recommendation: 'skip',
        },
      }],
      errors: [],
      summary: {
        total: 1,
        outdated: 0,
        upToDate: 1,
        errors: 0,
        recommendation: 'All tests are up to date',
      },
    };

    const formatted = formatUpdateCheckResult(result);

    expect(formatted).toContain('All tests are up to date');
  });

  it('formats errors', () => {
    const result: UpdateCheckResult = {
      outdated: [],
      upToDate: [],
      errors: [{
        testFile: 'tests/broken.spec.ts',
        error: 'File not found',
      }],
      summary: {
        total: 1,
        outdated: 0,
        upToDate: 0,
        errors: 1,
        recommendation: '',
      },
    };

    const formatted = formatUpdateCheckResult(result);

    expect(formatted).toContain('Errors');
    expect(formatted).toContain('broken.spec.ts');
    expect(formatted).toContain('File not found');
  });
});
