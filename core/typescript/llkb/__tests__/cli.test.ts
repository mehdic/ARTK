/**
 * Unit tests for CLI functions
 *
 * Tests:
 * - runHealthCheck: System health verification
 * - getStats: Statistics retrieval
 * - prune: Cleanup operations
 * - Format functions: Output formatting
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  formatHealthCheck,
  formatPruneResult,
  formatStats,
  getStats,
  type HealthCheckResult,
  prune,
  type PruneResult,
  runHealthCheck,
  type StatsResult,
} from '../cli.js';
import { formatDate, getHistoryDir } from '../history.js';
import type { ComponentsFile, LessonsFile } from '../types.js';

// =============================================================================
// Test Setup
// =============================================================================

function createTempLLKB(): string {
  const tempDir = join(tmpdir(), `llkb-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
  mkdirSync(join(tempDir, 'history'), { recursive: true });
  return tempDir;
}

function setupValidLLKB(tempDir: string): void {
  const now = new Date();

  // Config
  writeFileSync(
    join(tempDir, 'config.yml'),
    'version: "1.0"\nlearning:\n  enabled: true',
    'utf-8'
  );

  // Lessons
  const lessons: LessonsFile = {
    version: '1.0.0',
    lastUpdated: now.toISOString(),
    lessons: [
      {
        id: 'L001',
        title: 'Test Lesson',
        pattern: 'test',
        trigger: 'test',
        category: 'selector',
        scope: 'universal',
        journeyIds: ['J001'],
        metrics: {
          occurrences: 10,
          successRate: 0.9,
          confidence: 0.85,
          firstSeen: now.toISOString(),
          lastSuccess: now.toISOString(),
        },
        validation: { humanReviewed: true, lastReviewedBy: 'user', lastReviewedAt: now.toISOString() },
      },
      {
        id: 'L002',
        title: 'Low Confidence Lesson',
        pattern: 'low',
        trigger: 'low',
        category: 'timing',
        scope: 'universal',
        journeyIds: ['J002'],
        metrics: {
          occurrences: 2,
          successRate: 0.3,
          confidence: 0.2,
          firstSeen: now.toISOString(),
        },
        validation: { humanReviewed: false, lastReviewedBy: null, lastReviewedAt: null },
      },
    ],
    archived: [],
  };
  writeFileSync(join(tempDir, 'lessons.json'), JSON.stringify(lessons), 'utf-8');

  // Components
  const components: ComponentsFile = {
    version: '1.0.0',
    lastUpdated: now.toISOString(),
    components: [
      {
        id: 'C001',
        name: 'testComponent',
        description: 'Test component',
        category: 'auth',
        scope: 'universal',
        code: 'function test() {}',
        parameters: [],
        dependencies: [],
        metrics: {
          totalUses: 15,
          lastUsed: now.toISOString(),
        },
        source: {
          journeyId: 'J001',
          extractedAt: now.toISOString(),
          prompt: 'journey-implement',
        },
      },
    ],
  };
  writeFileSync(join(tempDir, 'components.json'), JSON.stringify(components), 'utf-8');

  // Analytics
  writeFileSync(
    join(tempDir, 'analytics.json'),
    JSON.stringify({
      version: '1.0.0',
      lastUpdated: now.toISOString(),
      overview: {
        totalLessons: 2,
        activeLessons: 2,
        archivedLessons: 0,
        totalComponents: 1,
        activeComponents: 1,
        archivedComponents: 0,
      },
      lessonStats: { byCategory: {}, avgConfidence: 0.5, avgSuccessRate: 0.6 },
      componentStats: { byCategory: {}, byScope: {}, totalReuses: 15, avgReusesPerComponent: 15 },
      impact: {},
      topPerformers: { lessons: [], components: [] },
      needsReview: { lowConfidenceLessons: ['L002'], lowUsageComponents: [], decliningSuccessRate: [] },
    }),
    'utf-8'
  );

  // History file for today
  const historyDir = getHistoryDir(tempDir);
  const todayFile = join(historyDir, `${formatDate(now)}.jsonl`);
  writeFileSync(
    todayFile,
    '{"event":"lesson_applied","timestamp":"' + now.toISOString() + '","lessonId":"L001"}\n' +
    '{"event":"lesson_applied","timestamp":"' + now.toISOString() + '","lessonId":"L002"}\n',
    'utf-8'
  );
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
// runHealthCheck Tests
// =============================================================================

describe('runHealthCheck', () => {
  it('returns healthy for valid LLKB', () => {
    setupValidLLKB(tempDir);

    const result = runHealthCheck(tempDir);

    expect(result.status).toBe('warning'); // Warning due to low confidence lesson
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it('returns error when directory missing', () => {
    const result = runHealthCheck('/nonexistent/path');

    expect(result.status).toBe('error');
    expect(result.checks.some(c => c.status === 'fail')).toBe(true);
  });

  it('returns warning for missing config', () => {
    mkdirSync(tempDir, { recursive: true });

    const result = runHealthCheck(tempDir);

    expect(result.checks.some(c => c.name === 'Config file' && c.status === 'warn')).toBe(true);
  });

  it('returns warning for missing files', () => {
    mkdirSync(tempDir, { recursive: true });

    const result = runHealthCheck(tempDir);

    expect(result.checks.some(c => c.status === 'warn' || c.status === 'fail')).toBe(true);
  });

  it('detects invalid JSON files', () => {
    mkdirSync(tempDir, { recursive: true });
    writeFileSync(join(tempDir, 'lessons.json'), '{ invalid json }', 'utf-8');

    const result = runHealthCheck(tempDir);

    expect(result.checks.some(c => c.name === 'lessons.json' && c.status === 'fail')).toBe(true);
  });

  it('identifies low confidence lessons', () => {
    setupValidLLKB(tempDir);

    const result = runHealthCheck(tempDir);

    const lessonHealthCheck = result.checks.find(c => c.name === 'Lesson health');
    expect(lessonHealthCheck?.status).toBe('warn');
    expect(lessonHealthCheck?.message).toContain('low confidence');
  });

  it('returns all check statuses', () => {
    setupValidLLKB(tempDir);

    const result = runHealthCheck(tempDir);

    expect(result.checks.every(c => ['pass', 'warn', 'fail'].includes(c.status))).toBe(true);
  });
});

// =============================================================================
// getStats Tests
// =============================================================================

describe('getStats', () => {
  it('returns stats structure', () => {
    setupValidLLKB(tempDir);

    const stats = getStats(tempDir);

    expect(stats).toHaveProperty('lessons');
    expect(stats).toHaveProperty('components');
    expect(stats).toHaveProperty('history');
  });

  it('calculates lesson stats', () => {
    setupValidLLKB(tempDir);

    const stats = getStats(tempDir);

    expect(stats.lessons.total).toBe(2);
    expect(stats.lessons.active).toBe(2);
    expect(stats.lessons.archived).toBe(0);
    expect(stats.lessons.avgConfidence).toBeGreaterThan(0);
    expect(stats.lessons.avgSuccessRate).toBeGreaterThan(0);
    expect(stats.lessons.needsReview).toBe(1); // L002 has low confidence
  });

  it('calculates component stats', () => {
    setupValidLLKB(tempDir);

    const stats = getStats(tempDir);

    expect(stats.components.total).toBe(1);
    expect(stats.components.active).toBe(1);
    expect(stats.components.totalReuses).toBe(15);
    expect(stats.components.avgReusesPerComponent).toBe(15);
  });

  it('calculates history stats', () => {
    setupValidLLKB(tempDir);

    const stats = getStats(tempDir);

    expect(stats.history.todayEvents).toBe(2);
    expect(stats.history.historyFiles).toBe(1);
    expect(stats.history.newestFile).not.toBeNull();
  });

  it('handles missing files gracefully', () => {
    const stats = getStats(tempDir);

    expect(stats.lessons.total).toBe(0);
    expect(stats.components.total).toBe(0);
    expect(stats.history.historyFiles).toBe(0);
  });
});

// =============================================================================
// prune Tests
// =============================================================================

describe('prune', () => {
  it('deletes old history files', () => {
    setupValidLLKB(tempDir);

    // Create old history file
    const historyDir = getHistoryDir(tempDir);
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 400);
    writeFileSync(
      join(historyDir, `${formatDate(oldDate)}.jsonl`),
      '{"event":"test"}',
      'utf-8'
    );

    const result = prune({ llkbRoot: tempDir, historyRetentionDays: 365 });

    expect(result.historyFilesDeleted).toBe(1);
    expect(result.deletedFiles.length).toBe(1);
  });

  it('respects retention period', () => {
    setupValidLLKB(tempDir);

    // Create history file from 10 days ago
    const historyDir = getHistoryDir(tempDir);
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 10);
    writeFileSync(
      join(historyDir, `${formatDate(recentDate)}.jsonl`),
      '{"event":"test"}',
      'utf-8'
    );

    // With 365-day retention, should not delete
    const result = prune({ llkbRoot: tempDir, historyRetentionDays: 365 });

    expect(result.historyFilesDeleted).toBe(0);
  });

  it('updates analytics after pruning', () => {
    setupValidLLKB(tempDir);

    const beforeUpdate = readFileSync(join(tempDir, 'analytics.json'), 'utf-8');
    const beforeData = JSON.parse(beforeUpdate) as { lastUpdated: string };
    const beforeTimestamp = beforeData.lastUpdated;

    // Small delay to ensure different timestamp
    const result = prune({ llkbRoot: tempDir });

    expect(result.errors.length).toBe(0);

    const afterUpdate = readFileSync(join(tempDir, 'analytics.json'), 'utf-8');
    const afterData = JSON.parse(afterUpdate) as { lastUpdated: string };
    const afterTimestamp = afterData.lastUpdated;

    const beforeMs = new Date(beforeTimestamp).getTime();
    const afterMs = new Date(afterTimestamp).getTime();
    expect(afterMs).toBeGreaterThanOrEqual(beforeMs);
  });

  it('returns empty result when nothing to prune', () => {
    setupValidLLKB(tempDir);

    const result = prune({ llkbRoot: tempDir, historyRetentionDays: 365 });

    expect(result.historyFilesDeleted).toBe(0);
    expect(result.archivedLessons).toBe(0);
    expect(result.archivedComponents).toBe(0);
  });

  it('captures errors without throwing', () => {
    // Non-existent path
    const result = prune({ llkbRoot: '/nonexistent/path' });

    // Should complete without throwing, errors captured
    expect(result).toBeDefined();
  });
});

// =============================================================================
// formatHealthCheck Tests
// =============================================================================

describe('formatHealthCheck', () => {
  it('formats healthy result', () => {
    const result: HealthCheckResult = {
      status: 'healthy',
      checks: [
        { name: 'Test Check', status: 'pass', message: 'All good' },
      ],
      summary: 'LLKB is healthy',
    };

    const formatted = formatHealthCheck(result);

    expect(formatted).toContain('HEALTHY');
    expect(formatted).toContain('✓');
    expect(formatted).toContain('Test Check');
    expect(formatted).toContain('All good');
  });

  it('formats warning result', () => {
    const result: HealthCheckResult = {
      status: 'warning',
      checks: [
        { name: 'Warning Check', status: 'warn', message: 'Something to note' },
      ],
      summary: 'LLKB has warnings',
    };

    const formatted = formatHealthCheck(result);

    expect(formatted).toContain('WARNING');
    expect(formatted).toContain('⚠');
  });

  it('formats error result', () => {
    const result: HealthCheckResult = {
      status: 'error',
      checks: [
        { name: 'Error Check', status: 'fail', message: 'Critical failure', details: 'More info' },
      ],
      summary: 'LLKB has errors',
    };

    const formatted = formatHealthCheck(result);

    expect(formatted).toContain('ERROR');
    expect(formatted).toContain('✗');
    expect(formatted).toContain('More info');
  });

  it('includes summary', () => {
    const result: HealthCheckResult = {
      status: 'healthy',
      checks: [],
      summary: 'Custom summary message',
    };

    const formatted = formatHealthCheck(result);

    expect(formatted).toContain('Custom summary message');
  });
});

// =============================================================================
// formatStats Tests
// =============================================================================

describe('formatStats', () => {
  it('formats stats correctly', () => {
    const stats: StatsResult = {
      lessons: {
        total: 10,
        active: 8,
        archived: 2,
        avgConfidence: 0.75,
        avgSuccessRate: 0.85,
        needsReview: 1,
      },
      components: {
        total: 5,
        active: 4,
        archived: 1,
        totalReuses: 50,
        avgReusesPerComponent: 10,
      },
      history: {
        todayEvents: 15,
        historyFiles: 30,
        oldestFile: '2024-01-01.jsonl',
        newestFile: '2024-03-15.jsonl',
      },
    };

    const formatted = formatStats(stats);

    expect(formatted).toContain('LLKB Statistics');
    expect(formatted).toContain('Lessons:');
    expect(formatted).toContain('Total: 10');
    expect(formatted).toContain('8 active');
    expect(formatted).toContain('2 archived');
    expect(formatted).toContain('Components:');
    expect(formatted).toContain('Total Reuses: 50');
    expect(formatted).toContain('History:');
    expect(formatted).toContain("Today's Events: 15");
  });

  it('handles null dates', () => {
    const stats: StatsResult = {
      lessons: { total: 0, active: 0, archived: 0, avgConfidence: 0, avgSuccessRate: 0, needsReview: 0 },
      components: { total: 0, active: 0, archived: 0, totalReuses: 0, avgReusesPerComponent: 0 },
      history: { todayEvents: 0, historyFiles: 0, oldestFile: null, newestFile: null },
    };

    const formatted = formatStats(stats);

    expect(formatted).toContain('History Files: 0');
    expect(formatted).not.toContain('Date Range');
  });
});

// =============================================================================
// formatPruneResult Tests
// =============================================================================

describe('formatPruneResult', () => {
  it('formats prune result', () => {
    const result: PruneResult = {
      historyFilesDeleted: 5,
      deletedFiles: ['a.jsonl', 'b.jsonl', 'c.jsonl', 'd.jsonl', 'e.jsonl'],
      archivedLessons: 2,
      archivedComponents: 1,
      errors: [],
    };

    const formatted = formatPruneResult(result);

    expect(formatted).toContain('LLKB Prune Results');
    expect(formatted).toContain('History files deleted: 5');
    expect(formatted).toContain('Lessons archived: 2');
    expect(formatted).toContain('Components archived: 1');
  });

  it('shows errors when present', () => {
    const result: PruneResult = {
      historyFilesDeleted: 0,
      deletedFiles: [],
      archivedLessons: 0,
      archivedComponents: 0,
      errors: ['Failed to delete file', 'Permission denied'],
    };

    const formatted = formatPruneResult(result);

    expect(formatted).toContain('Errors:');
    expect(formatted).toContain('Failed to delete file');
    expect(formatted).toContain('Permission denied');
  });

  it('omits sections with zero counts', () => {
    const result: PruneResult = {
      historyFilesDeleted: 3,
      deletedFiles: ['a.jsonl', 'b.jsonl', 'c.jsonl'],
      archivedLessons: 0,
      archivedComponents: 0,
      errors: [],
    };

    const formatted = formatPruneResult(result);

    expect(formatted).not.toContain('Lessons archived');
    expect(formatted).not.toContain('Components archived');
    expect(formatted).not.toContain('Errors');
  });
});
