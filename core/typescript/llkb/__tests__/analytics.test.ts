/**
 * Unit tests for analytics functions
 *
 * Tests:
 * - updateAnalytics: Full analytics recalculation
 * - updateAnalyticsWithData: Analytics from provided data
 * - createEmptyAnalytics: Default structure
 * - getAnalyticsSummary: Formatted summary
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  updateAnalytics,
  updateAnalyticsWithData,
  createEmptyAnalytics,
  getAnalyticsSummary,
} from '../analytics.js';
import type { LessonsFile, ComponentsFile, AnalyticsFile } from '../types.js';

// =============================================================================
// Test Setup
// =============================================================================

function createTempLLKB(): string {
  const tempDir = join(tmpdir(), `llkb-analytics-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

function createMockLessons(): LessonsFile {
  const now = new Date();
  return {
    version: '1.0.0',
    lastUpdated: now.toISOString(),
    lessons: [
      {
        id: 'L001',
        title: 'Wait for element',
        pattern: 'await element.waitFor()',
        trigger: 'element interaction',
        category: 'timing',
        scope: 'universal',
        journeyIds: ['J001', 'J002'],
        metrics: {
          occurrences: 15,
          successRate: 0.9,
          confidence: 0.85,
          firstSeen: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          lastSuccess: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        validation: { humanReviewed: true, lastReviewedBy: 'user', lastReviewedAt: now.toISOString() },
      },
      {
        id: 'L002',
        title: 'Use testid selectors',
        pattern: 'getByTestId',
        trigger: 'selector',
        category: 'selector',
        scope: 'universal',
        journeyIds: ['J003'],
        metrics: {
          occurrences: 8,
          successRate: 0.75,
          confidence: 0.6,
          firstSeen: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          lastSuccess: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        validation: { humanReviewed: false, lastReviewedBy: null, lastReviewedAt: null },
      },
      {
        id: 'L003',
        title: 'Low confidence lesson',
        pattern: 'some pattern',
        trigger: 'some trigger',
        category: 'assertion',
        scope: 'app-specific',
        journeyIds: ['J004'],
        metrics: {
          occurrences: 2,
          successRate: 0.3,
          confidence: 0.25,
          firstSeen: now.toISOString(),
        },
        validation: { humanReviewed: false, lastReviewedBy: null, lastReviewedAt: null },
      },
    ],
    archived: [
      {
        id: 'L004',
        title: 'Archived lesson',
        pattern: 'old pattern',
        trigger: 'old trigger',
        category: 'quirk',
        scope: 'universal',
        journeyIds: ['J005'],
        metrics: {
          occurrences: 1,
          successRate: 0.5,
          confidence: 0.1,
          firstSeen: now.toISOString(),
        },
        validation: { humanReviewed: false, lastReviewedBy: null, lastReviewedAt: null },
        archived: true,
      },
    ],
  };
}

function createMockComponents(): ComponentsFile {
  const now = new Date();
  return {
    version: '1.0.0',
    lastUpdated: now.toISOString(),
    components: [
      {
        id: 'C001',
        name: 'loginFlow',
        description: 'Login authentication flow',
        category: 'auth',
        scope: 'universal',
        code: 'async function loginFlow() { ... }',
        parameters: ['username', 'password'],
        dependencies: [],
        metrics: {
          totalUses: 25,
          lastUsed: now.toISOString(),
        },
        source: {
          journeyId: 'J001',
          extractedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          prompt: 'journey-implement',
        },
      },
      {
        id: 'C002',
        name: 'waitForToast',
        description: 'Wait for toast notification',
        category: 'timing',
        scope: 'framework:angular',
        code: 'async function waitForToast() { ... }',
        parameters: ['message'],
        dependencies: [],
        metrics: {
          totalUses: 10,
          lastUsed: now.toISOString(),
        },
        source: {
          journeyId: 'J002',
          extractedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          prompt: 'journey-implement',
        },
      },
      {
        id: 'C003',
        name: 'oldComponent',
        description: 'Low usage component',
        category: 'navigation',
        scope: 'app-specific',
        code: 'function oldComponent() { ... }',
        parameters: [],
        dependencies: [],
        metrics: {
          totalUses: 1,
          lastUsed: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
        source: {
          journeyId: 'J003',
          extractedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          prompt: 'journey-implement',
        },
      },
    ],
  };
}

let tempDir: string;

beforeEach(() => {
  tempDir = createTempLLKB();
});

afterEach(() => {
  if (tempDir && existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// =============================================================================
// createEmptyAnalytics Tests
// =============================================================================

describe('createEmptyAnalytics', () => {
  it('returns valid analytics structure', () => {
    const analytics = createEmptyAnalytics();

    expect(analytics).toHaveProperty('version');
    expect(analytics).toHaveProperty('lastUpdated');
    expect(analytics).toHaveProperty('overview');
    expect(analytics).toHaveProperty('lessonStats');
    expect(analytics).toHaveProperty('componentStats');
    expect(analytics).toHaveProperty('impact');
    expect(analytics).toHaveProperty('topPerformers');
    expect(analytics).toHaveProperty('needsReview');
  });

  it('initializes overview with zeros', () => {
    const analytics = createEmptyAnalytics();

    expect(analytics.overview.totalLessons).toBe(0);
    expect(analytics.overview.activeLessons).toBe(0);
    expect(analytics.overview.archivedLessons).toBe(0);
    expect(analytics.overview.totalComponents).toBe(0);
    expect(analytics.overview.activeComponents).toBe(0);
    expect(analytics.overview.archivedComponents).toBe(0);
  });

  it('initializes all categories in lessonStats', () => {
    const analytics = createEmptyAnalytics();
    const categories = ['selector', 'timing', 'quirk', 'auth', 'data', 'assertion', 'navigation', 'ui-interaction'];

    for (const category of categories) {
      expect(analytics.lessonStats.byCategory).toHaveProperty(category);
      expect(analytics.lessonStats.byCategory[category as keyof typeof analytics.lessonStats.byCategory]).toBe(0);
    }
  });

  it('initializes all scopes in componentStats', () => {
    const analytics = createEmptyAnalytics();
    const scopes = ['universal', 'framework:angular', 'framework:react', 'framework:vue', 'framework:ag-grid', 'app-specific'];

    for (const scope of scopes) {
      expect(analytics.componentStats.byScope).toHaveProperty(scope);
    }
  });

  it('initializes empty arrays for top performers and needs review', () => {
    const analytics = createEmptyAnalytics();

    expect(analytics.topPerformers.lessons).toEqual([]);
    expect(analytics.topPerformers.components).toEqual([]);
    expect(analytics.needsReview.lowConfidenceLessons).toEqual([]);
    expect(analytics.needsReview.lowUsageComponents).toEqual([]);
    expect(analytics.needsReview.decliningSuccessRate).toEqual([]);
  });

  it('sets current timestamp', () => {
    const before = new Date().toISOString();
    const analytics = createEmptyAnalytics();
    const after = new Date().toISOString();

    expect(analytics.lastUpdated >= before).toBe(true);
    expect(analytics.lastUpdated <= after).toBe(true);
  });
});

// =============================================================================
// updateAnalyticsWithData Tests
// =============================================================================

describe('updateAnalyticsWithData', () => {
  it('calculates overview correctly', () => {
    const lessons = createMockLessons();
    const components = createMockComponents();
    const analyticsPath = join(tempDir, 'analytics.json');

    updateAnalyticsWithData(lessons, components, analyticsPath);

    const analytics = JSON.parse(readFileSync(analyticsPath, 'utf-8')) as AnalyticsFile;

    expect(analytics.overview.totalLessons).toBe(3);
    expect(analytics.overview.activeLessons).toBe(3);
    expect(analytics.overview.archivedLessons).toBe(1);
    expect(analytics.overview.totalComponents).toBe(3);
    expect(analytics.overview.activeComponents).toBe(3);
  });

  it('calculates lesson stats by category', () => {
    const lessons = createMockLessons();
    const components = createMockComponents();
    const analyticsPath = join(tempDir, 'analytics.json');

    updateAnalyticsWithData(lessons, components, analyticsPath);

    const analytics = JSON.parse(readFileSync(analyticsPath, 'utf-8')) as AnalyticsFile;

    expect(analytics.lessonStats.byCategory.timing).toBe(1);
    expect(analytics.lessonStats.byCategory.selector).toBe(1);
    expect(analytics.lessonStats.byCategory.assertion).toBe(1);
  });

  it('calculates average confidence and success rate', () => {
    const lessons = createMockLessons();
    const components = createMockComponents();
    const analyticsPath = join(tempDir, 'analytics.json');

    updateAnalyticsWithData(lessons, components, analyticsPath);

    const analytics = JSON.parse(readFileSync(analyticsPath, 'utf-8')) as AnalyticsFile;

    // Average of 0.85, 0.6, 0.25 = 0.567
    expect(analytics.lessonStats.avgConfidence).toBeCloseTo(0.57, 1);
    // Average of 0.9, 0.75, 0.3 = 0.65
    expect(analytics.lessonStats.avgSuccessRate).toBeCloseTo(0.65, 1);
  });

  it('calculates component stats by scope', () => {
    const lessons = createMockLessons();
    const components = createMockComponents();
    const analyticsPath = join(tempDir, 'analytics.json');

    updateAnalyticsWithData(lessons, components, analyticsPath);

    const analytics = JSON.parse(readFileSync(analyticsPath, 'utf-8')) as AnalyticsFile;

    expect(analytics.componentStats.byScope.universal).toBe(1);
    expect(analytics.componentStats.byScope['framework:angular']).toBe(1);
    expect(analytics.componentStats.byScope['app-specific']).toBe(1);
  });

  it('calculates total and average reuses', () => {
    const lessons = createMockLessons();
    const components = createMockComponents();
    const analyticsPath = join(tempDir, 'analytics.json');

    updateAnalyticsWithData(lessons, components, analyticsPath);

    const analytics = JSON.parse(readFileSync(analyticsPath, 'utf-8')) as AnalyticsFile;

    // 25 + 10 + 1 = 36
    expect(analytics.componentStats.totalReuses).toBe(36);
    // 36 / 3 = 12
    expect(analytics.componentStats.avgReusesPerComponent).toBe(12);
  });

  it('identifies top performers', () => {
    const lessons = createMockLessons();
    const components = createMockComponents();
    const analyticsPath = join(tempDir, 'analytics.json');

    updateAnalyticsWithData(lessons, components, analyticsPath);

    const analytics = JSON.parse(readFileSync(analyticsPath, 'utf-8')) as AnalyticsFile;

    expect(analytics.topPerformers.lessons.length).toBeGreaterThan(0);
    expect(analytics.topPerformers.components.length).toBeGreaterThan(0);

    // Top lesson by (successRate * occurrences): L001 = 0.9 * 15 = 13.5
    expect(analytics.topPerformers.lessons[0]?.id).toBe('L001');

    // Top component by totalUses: C001 = 25
    expect(analytics.topPerformers.components[0]?.id).toBe('C001');
  });

  it('identifies items needing review', () => {
    const lessons = createMockLessons();
    const components = createMockComponents();
    const analyticsPath = join(tempDir, 'analytics.json');

    updateAnalyticsWithData(lessons, components, analyticsPath);

    const analytics = JSON.parse(readFileSync(analyticsPath, 'utf-8')) as AnalyticsFile;

    // L003 has confidence 0.25 (< 0.4)
    expect(analytics.needsReview.lowConfidenceLessons).toContain('L003');

    // C003 has 1 use and is 60 days old
    expect(analytics.needsReview.lowUsageComponents).toContain('C003');
  });

  it('returns true on success', () => {
    const lessons = createMockLessons();
    const components = createMockComponents();
    const analyticsPath = join(tempDir, 'analytics.json');

    const result = updateAnalyticsWithData(lessons, components, analyticsPath);
    expect(result).toBe(true);
  });
});

// =============================================================================
// updateAnalytics Tests
// =============================================================================

describe('updateAnalytics', () => {
  beforeEach(() => {
    // Setup LLKB files
    writeFileSync(
      join(tempDir, 'lessons.json'),
      JSON.stringify(createMockLessons()),
      'utf-8'
    );
    writeFileSync(
      join(tempDir, 'components.json'),
      JSON.stringify(createMockComponents()),
      'utf-8'
    );
  });

  it('creates analytics from lessons and components files', () => {
    const result = updateAnalytics(tempDir);

    expect(result).toBe(true);
    expect(existsSync(join(tempDir, 'analytics.json'))).toBe(true);
  });

  it('returns false when lessons file missing', () => {
    rmSync(join(tempDir, 'lessons.json'));

    const result = updateAnalytics(tempDir);
    expect(result).toBe(false);
  });

  it('returns false when components file missing', () => {
    rmSync(join(tempDir, 'components.json'));

    const result = updateAnalytics(tempDir);
    expect(result).toBe(false);
  });

  it('creates analytics file if not exists', () => {
    expect(existsSync(join(tempDir, 'analytics.json'))).toBe(false);

    updateAnalytics(tempDir);

    expect(existsSync(join(tempDir, 'analytics.json'))).toBe(true);
  });

  it('updates existing analytics file', () => {
    // Create initial analytics with old version
    writeFileSync(
      join(tempDir, 'analytics.json'),
      JSON.stringify({ version: '0.0.0', lastUpdated: '2020-01-01' }),
      'utf-8'
    );

    updateAnalytics(tempDir);

    const analytics = JSON.parse(readFileSync(join(tempDir, 'analytics.json'), 'utf-8')) as AnalyticsFile;
    // Note: updateAnalytics preserves existing version from file
    // Only lastUpdated is changed
    expect(analytics.lastUpdated).not.toBe('2020-01-01');
  });
});

// =============================================================================
// getAnalyticsSummary Tests
// =============================================================================

describe('getAnalyticsSummary', () => {
  it('returns formatted summary string', () => {
    writeFileSync(
      join(tempDir, 'lessons.json'),
      JSON.stringify(createMockLessons()),
      'utf-8'
    );
    writeFileSync(
      join(tempDir, 'components.json'),
      JSON.stringify(createMockComponents()),
      'utf-8'
    );
    updateAnalytics(tempDir);

    const summary = getAnalyticsSummary(tempDir);

    expect(typeof summary).toBe('string');
    expect(summary).toContain('LLKB Analytics');
    expect(summary).toContain('Lessons:');
    expect(summary).toContain('Components:');
    expect(summary).toContain('Avg Confidence');
    expect(summary).toContain('Total Reuses');
  });

  it('returns unavailable message when analytics not found', () => {
    const summary = getAnalyticsSummary(tempDir);
    expect(summary).toBe('Analytics not available');
  });

  it('shows correct counts', () => {
    writeFileSync(
      join(tempDir, 'lessons.json'),
      JSON.stringify(createMockLessons()),
      'utf-8'
    );
    writeFileSync(
      join(tempDir, 'components.json'),
      JSON.stringify(createMockComponents()),
      'utf-8'
    );
    updateAnalytics(tempDir);

    const summary = getAnalyticsSummary(tempDir);

    expect(summary).toContain('3 active');
    expect(summary).toContain('1 archived');
    expect(summary).toContain('36');
  });
});
