/**
 * Unit tests for history logging functions
 *
 * Tests:
 * - appendToHistory: Event logging
 * - readHistoryFile / readTodayHistory: Reading events
 * - countTodayEvents: Event counting
 * - Rate limiting functions
 * - cleanupOldHistoryFiles: History pruning
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  appendToHistory,
  readHistoryFile,
  readTodayHistory,
  countTodayEvents,
  countPredictiveExtractionsToday,
  countJourneyExtractionsToday,
  isDailyRateLimitReached,
  isJourneyRateLimitReached,
  getHistoryFilesInRange,
  cleanupOldHistoryFiles,
  getHistoryDir,
  getHistoryFilePath,
  formatDate,
  DEFAULT_LLKB_ROOT,
} from '../history.js';
import type { HistoryEvent, LLKBConfig } from '../types.js';

// =============================================================================
// Test Setup
// =============================================================================

function createTempLLKB(): string {
  const tempDir = join(tmpdir(), `llkb-hist-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(join(tempDir, 'history'), { recursive: true });
  return tempDir;
}

function createMockConfig(overrides: Partial<LLKBConfig> = {}): LLKBConfig {
  return {
    version: '1.0',
    learning: {
      enabled: true,
      minConfidence: 0.7,
      autoApplyThreshold: 0.9,
    },
    extraction: {
      predictiveEnabled: true,
      maxPredictivePerDay: 5,
      maxPredictivePerJourney: 2,
      minSuccessRate: 0.6,
    },
    analytics: {
      enabled: true,
      retentionDays: 90,
    },
    history: {
      retentionDays: 365,
    },
    ...overrides,
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
// formatDate Tests
// =============================================================================

describe('formatDate', () => {
  it('formats date as YYYY-MM-DD', () => {
    const date = new Date('2024-03-15T10:30:00Z');
    const formatted = formatDate(date);
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatted).toBe('2024-03-15');
  });

  it('pads month and day with zeros', () => {
    const date = new Date('2024-01-05');
    const formatted = formatDate(date);
    expect(formatted).toBe('2024-01-05');
  });

  it('handles December correctly', () => {
    const date = new Date('2024-12-31');
    const formatted = formatDate(date);
    expect(formatted).toBe('2024-12-31');
  });
});

// =============================================================================
// getHistoryDir Tests
// =============================================================================

describe('getHistoryDir', () => {
  it('returns history subdirectory', () => {
    const dir = getHistoryDir('/my/llkb');
    expect(dir).toBe('/my/llkb/history');
  });

  it('uses default root when not specified', () => {
    const dir = getHistoryDir();
    expect(dir).toBe(join(DEFAULT_LLKB_ROOT, 'history'));
  });
});

// =============================================================================
// getHistoryFilePath Tests
// =============================================================================

describe('getHistoryFilePath', () => {
  it('returns path with date suffix', () => {
    const path = getHistoryFilePath(new Date('2024-03-15'), '/my/llkb');
    expect(path).toBe('/my/llkb/history/2024-03-15.jsonl');
  });

  it('uses current date when not specified', () => {
    const path = getHistoryFilePath(undefined, tempDir);
    const today = formatDate(new Date());
    expect(path).toBe(join(tempDir, 'history', `${today}.jsonl`));
  });
});

// =============================================================================
// appendToHistory Tests
// =============================================================================

describe('appendToHistory', () => {
  it('creates history file if not exists', () => {
    const event: HistoryEvent = {
      event: 'lesson_applied',
      timestamp: new Date().toISOString(),
      lessonId: 'L001',
      success: true,
      prompt: 'test-prompt',
    };

    const result = appendToHistory(event, tempDir);

    expect(result).toBe(true);

    const historyDir = getHistoryDir(tempDir);
    const files = require('fs').readdirSync(historyDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/\.jsonl$/);
  });

  it('appends event as JSON line', () => {
    const event1: HistoryEvent = {
      event: 'lesson_applied',
      timestamp: new Date().toISOString(),
      lessonId: 'L001',
      success: true,
      prompt: 'test',
    };
    const event2: HistoryEvent = {
      event: 'lesson_applied',
      timestamp: new Date().toISOString(),
      lessonId: 'L002',
      success: false,
      prompt: 'test',
    };

    appendToHistory(event1, tempDir);
    appendToHistory(event2, tempDir);

    const filePath = getHistoryFilePath(new Date(), tempDir);
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0]!).lessonId).toBe('L001');
    expect(JSON.parse(lines[1]!).lessonId).toBe('L002');
  });

  it('handles component_extracted event', () => {
    const event: HistoryEvent = {
      event: 'component_extracted',
      timestamp: new Date().toISOString(),
      componentId: 'C001',
      journeyId: 'J001',
      prompt: 'journey-implement',
    };

    const result = appendToHistory(event, tempDir);
    expect(result).toBe(true);
  });
});

// =============================================================================
// readHistoryFile Tests
// =============================================================================

describe('readHistoryFile', () => {
  it('returns empty array for non-existent file', () => {
    const events = readHistoryFile('/nonexistent/path.jsonl');
    expect(events).toEqual([]);
  });

  it('reads and parses JSONL file', () => {
    const filePath = join(tempDir, 'history', 'test.jsonl');
    const events = [
      { event: 'lesson_applied', timestamp: '2024-01-01', lessonId: 'L001' },
      { event: 'lesson_applied', timestamp: '2024-01-02', lessonId: 'L002' },
    ];
    writeFileSync(filePath, events.map(e => JSON.stringify(e)).join('\n'), 'utf-8');

    const result = readHistoryFile(filePath);

    expect(result.length).toBe(2);
    expect(result[0]?.lessonId).toBe('L001');
    expect(result[1]?.lessonId).toBe('L002');
  });

  it('skips empty lines', () => {
    const filePath = join(tempDir, 'history', 'sparse.jsonl');
    const content = '{"event":"test"}\n\n{"event":"test2"}\n\n';
    writeFileSync(filePath, content, 'utf-8');

    const result = readHistoryFile(filePath);
    expect(result.length).toBe(2);
  });
});

// =============================================================================
// readTodayHistory Tests
// =============================================================================

describe('readTodayHistory', () => {
  it('reads today\'s events', () => {
    const event: HistoryEvent = {
      event: 'lesson_applied',
      timestamp: new Date().toISOString(),
      lessonId: 'L001',
      success: true,
      prompt: 'test',
    };

    appendToHistory(event, tempDir);

    const events = readTodayHistory(tempDir);
    expect(events.length).toBe(1);
    expect(events[0]?.lessonId).toBe('L001');
  });

  it('returns empty array when no events today', () => {
    const events = readTodayHistory(tempDir);
    expect(events).toEqual([]);
  });
});

// =============================================================================
// countTodayEvents Tests
// =============================================================================

describe('countTodayEvents', () => {
  beforeEach(() => {
    // Add some test events
    appendToHistory({
      event: 'lesson_applied',
      timestamp: new Date().toISOString(),
      lessonId: 'L001',
      success: true,
      prompt: 'test',
    }, tempDir);
    appendToHistory({
      event: 'lesson_applied',
      timestamp: new Date().toISOString(),
      lessonId: 'L002',
      success: false,
      prompt: 'test',
    }, tempDir);
    appendToHistory({
      event: 'component_extracted',
      timestamp: new Date().toISOString(),
      componentId: 'C001',
      journeyId: 'J001',
      prompt: 'journey-implement',
    }, tempDir);
  });

  it('counts events by type', () => {
    const lessonCount = countTodayEvents('lesson_applied', undefined, tempDir);
    expect(lessonCount).toBe(2);

    const componentCount = countTodayEvents('component_extracted', undefined, tempDir);
    expect(componentCount).toBe(1);
  });

  it('applies filter function', () => {
    const successCount = countTodayEvents(
      'lesson_applied',
      (e) => e.event === 'lesson_applied' && e.success === true,
      tempDir
    );
    expect(successCount).toBe(1);
  });

  it('returns 0 for non-existent event type', () => {
    const count = countTodayEvents('analytics_updated', undefined, tempDir);
    expect(count).toBe(0);
  });
});

// =============================================================================
// countPredictiveExtractionsToday Tests
// =============================================================================

describe('countPredictiveExtractionsToday', () => {
  it('counts only journey-implement extractions', () => {
    appendToHistory({
      event: 'component_extracted',
      timestamp: new Date().toISOString(),
      componentId: 'C001',
      journeyId: 'J001',
      prompt: 'journey-implement',
    }, tempDir);
    appendToHistory({
      event: 'component_extracted',
      timestamp: new Date().toISOString(),
      componentId: 'C002',
      journeyId: 'J002',
      prompt: 'journey-implement',
    }, tempDir);
    appendToHistory({
      event: 'component_extracted',
      timestamp: new Date().toISOString(),
      componentId: 'C003',
      journeyId: 'J003',
      prompt: 'other-prompt',
    }, tempDir);

    const count = countPredictiveExtractionsToday(tempDir);
    expect(count).toBe(2);
  });
});

// =============================================================================
// countJourneyExtractionsToday Tests
// =============================================================================

describe('countJourneyExtractionsToday', () => {
  it('counts extractions for specific journey', () => {
    appendToHistory({
      event: 'component_extracted',
      timestamp: new Date().toISOString(),
      componentId: 'C001',
      journeyId: 'J001',
      prompt: 'journey-implement',
    }, tempDir);
    appendToHistory({
      event: 'component_extracted',
      timestamp: new Date().toISOString(),
      componentId: 'C002',
      journeyId: 'J001',
      prompt: 'journey-implement',
    }, tempDir);
    appendToHistory({
      event: 'component_extracted',
      timestamp: new Date().toISOString(),
      componentId: 'C003',
      journeyId: 'J002',
      prompt: 'journey-implement',
    }, tempDir);

    const j1Count = countJourneyExtractionsToday('J001', tempDir);
    const j2Count = countJourneyExtractionsToday('J002', tempDir);

    expect(j1Count).toBe(2);
    expect(j2Count).toBe(1);
  });
});

// =============================================================================
// Rate Limiting Tests
// =============================================================================

describe('isDailyRateLimitReached', () => {
  it('returns false when under limit', () => {
    const config = createMockConfig({ extraction: { ...createMockConfig().extraction, maxPredictivePerDay: 5 } });

    // Add 3 extractions
    for (let i = 0; i < 3; i++) {
      appendToHistory({
        event: 'component_extracted',
        timestamp: new Date().toISOString(),
        componentId: `C00${i}`,
        journeyId: 'J001',
        prompt: 'journey-implement',
      }, tempDir);
    }

    expect(isDailyRateLimitReached(config, tempDir)).toBe(false);
  });

  it('returns true when at limit', () => {
    const config = createMockConfig({ extraction: { ...createMockConfig().extraction, maxPredictivePerDay: 3 } });

    // Add exactly 3 extractions
    for (let i = 0; i < 3; i++) {
      appendToHistory({
        event: 'component_extracted',
        timestamp: new Date().toISOString(),
        componentId: `C00${i}`,
        journeyId: 'J001',
        prompt: 'journey-implement',
      }, tempDir);
    }

    expect(isDailyRateLimitReached(config, tempDir)).toBe(true);
  });
});

describe('isJourneyRateLimitReached', () => {
  it('returns false when under limit', () => {
    const config = createMockConfig({ extraction: { ...createMockConfig().extraction, maxPredictivePerJourney: 2 } });

    appendToHistory({
      event: 'component_extracted',
      timestamp: new Date().toISOString(),
      componentId: 'C001',
      journeyId: 'J001',
      prompt: 'journey-implement',
    }, tempDir);

    expect(isJourneyRateLimitReached('J001', config, tempDir)).toBe(false);
  });

  it('returns true when at limit', () => {
    const config = createMockConfig({ extraction: { ...createMockConfig().extraction, maxPredictivePerJourney: 2 } });

    for (let i = 0; i < 2; i++) {
      appendToHistory({
        event: 'component_extracted',
        timestamp: new Date().toISOString(),
        componentId: `C00${i}`,
        journeyId: 'J001',
        prompt: 'journey-implement',
      }, tempDir);
    }

    expect(isJourneyRateLimitReached('J001', config, tempDir)).toBe(true);
  });

  it('tracks journeys independently', () => {
    const config = createMockConfig({ extraction: { ...createMockConfig().extraction, maxPredictivePerJourney: 2 } });

    // Max out J001
    for (let i = 0; i < 2; i++) {
      appendToHistory({
        event: 'component_extracted',
        timestamp: new Date().toISOString(),
        componentId: `C00${i}`,
        journeyId: 'J001',
        prompt: 'journey-implement',
      }, tempDir);
    }

    expect(isJourneyRateLimitReached('J001', config, tempDir)).toBe(true);
    expect(isJourneyRateLimitReached('J002', config, tempDir)).toBe(false);
  });
});

// =============================================================================
// getHistoryFilesInRange Tests
// =============================================================================

describe('getHistoryFilesInRange', () => {
  beforeEach(() => {
    const historyDir = getHistoryDir(tempDir);

    // Create history files for different dates
    writeFileSync(join(historyDir, '2024-01-01.jsonl'), '{}', 'utf-8');
    writeFileSync(join(historyDir, '2024-01-15.jsonl'), '{}', 'utf-8');
    writeFileSync(join(historyDir, '2024-01-31.jsonl'), '{}', 'utf-8');
    writeFileSync(join(historyDir, '2024-02-15.jsonl'), '{}', 'utf-8');
  });

  it('returns files in date range', () => {
    const files = getHistoryFilesInRange(
      new Date('2024-01-10'),
      new Date('2024-02-01'),
      tempDir
    );

    expect(files.length).toBe(2);
    expect(files[0]).toContain('2024-01-15');
    expect(files[1]).toContain('2024-01-31');
  });

  it('returns empty array for empty range', () => {
    const files = getHistoryFilesInRange(
      new Date('2025-01-01'),
      new Date('2025-12-31'),
      tempDir
    );

    expect(files).toEqual([]);
  });

  it('returns sorted results', () => {
    const files = getHistoryFilesInRange(
      new Date('2024-01-01'),
      new Date('2024-12-31'),
      tempDir
    );

    for (let i = 1; i < files.length; i++) {
      expect(files[i]!.localeCompare(files[i - 1]!)).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// cleanupOldHistoryFiles Tests
// =============================================================================

describe('cleanupOldHistoryFiles', () => {
  it('deletes files older than retention period', () => {
    const historyDir = getHistoryDir(tempDir);

    // Create old file (400 days ago)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 400);
    const oldFileName = formatDate(oldDate) + '.jsonl';
    writeFileSync(join(historyDir, oldFileName), '{}', 'utf-8');

    // Create recent file
    const recentFileName = formatDate(new Date()) + '.jsonl';
    writeFileSync(join(historyDir, recentFileName), '{}', 'utf-8');

    const deleted = cleanupOldHistoryFiles(365, tempDir);

    expect(deleted.length).toBe(1);
    expect(deleted[0]).toContain(oldFileName);
    expect(existsSync(join(historyDir, recentFileName))).toBe(true);
    expect(existsSync(join(historyDir, oldFileName))).toBe(false);
  });

  it('respects custom retention period', () => {
    const historyDir = getHistoryDir(tempDir);

    // Create file from 10 days ago
    const date = new Date();
    date.setDate(date.getDate() - 10);
    const fileName = formatDate(date) + '.jsonl';
    writeFileSync(join(historyDir, fileName), '{}', 'utf-8');

    // With 30-day retention, should keep
    let deleted = cleanupOldHistoryFiles(30, tempDir);
    expect(deleted.length).toBe(0);

    // With 5-day retention, should delete
    deleted = cleanupOldHistoryFiles(5, tempDir);
    expect(deleted.length).toBe(1);
  });

  it('returns empty array when no files to delete', () => {
    const deleted = cleanupOldHistoryFiles(365, tempDir);
    expect(deleted).toEqual([]);
  });

  it('handles non-existent history directory', () => {
    rmSync(getHistoryDir(tempDir), { recursive: true });

    const deleted = cleanupOldHistoryFiles(365, tempDir);
    expect(deleted).toEqual([]);
  });
});
