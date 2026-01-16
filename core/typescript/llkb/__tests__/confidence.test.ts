/**
 * Unit tests for confidence calculation functions
 *
 * Tests:
 * - calculateConfidence: Main confidence formula
 * - detectDecliningConfidence: Trend detection
 * - updateConfidenceHistory: History management
 * - getConfidenceTrend: Trend direction
 * - daysBetween: Date calculation
 * - needsConfidenceReview: Review flagging
 */

import { describe, expect, it } from 'vitest';
import {
  calculateConfidence,
  detectDecliningConfidence,
  updateConfidenceHistory,
  getConfidenceTrend,
  daysBetween,
  needsConfidenceReview,
  MAX_CONFIDENCE_HISTORY_ENTRIES,
  CONFIDENCE_HISTORY_RETENTION_DAYS,
} from '../confidence.js';
import type { Lesson, ConfidenceHistoryEntry } from '../types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createLesson(overrides: Partial<Lesson> = {}): Lesson {
  const now = new Date();
  return {
    id: 'L001',
    title: 'Test Lesson',
    pattern: 'test pattern',
    trigger: 'test trigger',
    category: 'selector',
    scope: 'universal',
    journeyIds: ['J001'],
    metrics: {
      occurrences: 5,
      successRate: 0.8,
      confidence: 0.7,
      firstSeen: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      lastSuccess: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      confidenceHistory: [],
    },
    validation: {
      humanReviewed: false,
      lastReviewedBy: null,
      lastReviewedAt: null,
    },
    ...overrides,
  };
}

function createConfidenceHistory(
  entries: Array<{ daysAgo: number; value: number }>
): ConfidenceHistoryEntry[] {
  const now = new Date();
  return entries.map(({ daysAgo, value }) => ({
    date: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    value,
  }));
}

// =============================================================================
// calculateConfidence Tests
// =============================================================================

describe('calculateConfidence', () => {
  it('returns value between 0 and 1', () => {
    const lesson = createLesson();
    const confidence = calculateConfidence(lesson);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it('increases with more occurrences', () => {
    const lowOccurrences = createLesson({ metrics: { ...createLesson().metrics, occurrences: 2 } });
    const highOccurrences = createLesson({ metrics: { ...createLesson().metrics, occurrences: 10 } });

    const lowConf = calculateConfidence(lowOccurrences);
    const highConf = calculateConfidence(highOccurrences);

    expect(highConf).toBeGreaterThan(lowConf);
  });

  it('caps base score at 10 occurrences', () => {
    const tenOccurrences = createLesson({ metrics: { ...createLesson().metrics, occurrences: 10 } });
    const twentyOccurrences = createLesson({ metrics: { ...createLesson().metrics, occurrences: 20 } });

    const tenConf = calculateConfidence(tenOccurrences);
    const twentyConf = calculateConfidence(twentyOccurrences);

    // Should be very close (both capped)
    expect(Math.abs(tenConf - twentyConf)).toBeLessThan(0.01);
  });

  it('decreases with lower success rate', () => {
    const highSuccess = createLesson({ metrics: { ...createLesson().metrics, successRate: 1.0 } });
    const lowSuccess = createLesson({ metrics: { ...createLesson().metrics, successRate: 0.3 } });

    const highConf = calculateConfidence(highSuccess);
    const lowConf = calculateConfidence(lowSuccess);

    expect(highConf).toBeGreaterThan(lowConf);
  });

  it('applies validation boost for human-reviewed lessons', () => {
    const notReviewed = createLesson();
    const reviewed = createLesson({
      validation: {
        humanReviewed: true,
        lastReviewedBy: 'user@example.com',
        lastReviewedAt: new Date().toISOString(),
      },
    });

    const notReviewedConf = calculateConfidence(notReviewed);
    const reviewedConf = calculateConfidence(reviewed);

    expect(reviewedConf).toBeGreaterThan(notReviewedConf);
  });

  it('decreases for lessons not used recently', () => {
    const now = new Date();
    const recent = createLesson({
      metrics: {
        ...createLesson().metrics,
        lastSuccess: now.toISOString(),
      },
    });
    const old = createLesson({
      metrics: {
        ...createLesson().metrics,
        lastSuccess: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
      },
    });

    const recentConf = calculateConfidence(recent);
    const oldConf = calculateConfidence(old);

    expect(recentConf).toBeGreaterThan(oldConf);
  });

  it('returns rounded value (2 decimal places)', () => {
    const lesson = createLesson();
    const confidence = calculateConfidence(lesson);
    const rounded = Math.round(confidence * 100) / 100;
    expect(confidence).toBe(rounded);
  });

  it('handles lesson with no lastSuccess', () => {
    const lesson = createLesson({
      metrics: {
        ...createLesson().metrics,
        lastSuccess: undefined,
      },
    });

    const confidence = calculateConfidence(lesson);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// detectDecliningConfidence Tests
// =============================================================================

describe('detectDecliningConfidence', () => {
  it('returns false with no history', () => {
    const lesson = createLesson();
    expect(detectDecliningConfidence(lesson)).toBe(false);
  });

  it('returns false with single history entry', () => {
    const lesson = createLesson({
      metrics: {
        ...createLesson().metrics,
        confidenceHistory: createConfidenceHistory([{ daysAgo: 0, value: 0.8 }]),
      },
    });
    expect(detectDecliningConfidence(lesson)).toBe(false);
  });

  it('returns true when confidence dropped 20%+', () => {
    const lesson = createLesson({
      metrics: {
        ...createLesson().metrics,
        confidence: 0.6, // Current confidence
        confidenceHistory: createConfidenceHistory([
          { daysAgo: 10, value: 0.9 },
          { daysAgo: 8, value: 0.88 },
          { daysAgo: 6, value: 0.85 },
          { daysAgo: 4, value: 0.82 },
          { daysAgo: 2, value: 0.8 },
        ]),
      },
    });
    expect(detectDecliningConfidence(lesson)).toBe(true);
  });

  it('returns false when confidence is stable', () => {
    const lesson = createLesson({
      metrics: {
        ...createLesson().metrics,
        confidence: 0.8,
        confidenceHistory: createConfidenceHistory([
          { daysAgo: 10, value: 0.8 },
          { daysAgo: 8, value: 0.81 },
          { daysAgo: 6, value: 0.79 },
          { daysAgo: 4, value: 0.8 },
          { daysAgo: 2, value: 0.8 },
        ]),
      },
    });
    expect(detectDecliningConfidence(lesson)).toBe(false);
  });

  it('returns false when confidence is increasing', () => {
    const lesson = createLesson({
      metrics: {
        ...createLesson().metrics,
        confidence: 0.9,
        confidenceHistory: createConfidenceHistory([
          { daysAgo: 10, value: 0.6 },
          { daysAgo: 8, value: 0.7 },
          { daysAgo: 6, value: 0.75 },
          { daysAgo: 4, value: 0.8 },
          { daysAgo: 2, value: 0.85 },
        ]),
      },
    });
    expect(detectDecliningConfidence(lesson)).toBe(false);
  });
});

// =============================================================================
// updateConfidenceHistory Tests
// =============================================================================

describe('updateConfidenceHistory', () => {
  it('adds current confidence to history', () => {
    const lesson = createLesson({
      metrics: {
        ...createLesson().metrics,
        confidence: 0.75,
        confidenceHistory: [],
      },
    });

    const history = updateConfidenceHistory(lesson);

    expect(history.length).toBe(1);
    expect(history[0]?.value).toBe(0.75);
  });

  it('preserves existing history', () => {
    const existingHistory = createConfidenceHistory([
      { daysAgo: 10, value: 0.7 },
      { daysAgo: 5, value: 0.72 },
    ]);

    const lesson = createLesson({
      metrics: {
        ...createLesson().metrics,
        confidence: 0.75,
        confidenceHistory: existingHistory,
      },
    });

    const history = updateConfidenceHistory(lesson);

    expect(history.length).toBe(3);
    expect(history[history.length - 1]?.value).toBe(0.75);
  });

  it('removes entries older than retention period', () => {
    const oldEntry = {
      date: new Date(Date.now() - (CONFIDENCE_HISTORY_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString(),
      value: 0.5,
    };
    const recentEntry = {
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      value: 0.7,
    };

    const lesson = createLesson({
      metrics: {
        ...createLesson().metrics,
        confidence: 0.75,
        confidenceHistory: [oldEntry, recentEntry],
      },
    });

    const history = updateConfidenceHistory(lesson);

    // Should have recent entry + new entry, but not old entry
    expect(history.length).toBe(2);
    expect(history.some(e => e.value === 0.5)).toBe(false);
    expect(history.some(e => e.value === 0.7)).toBe(true);
    expect(history.some(e => e.value === 0.75)).toBe(true);
  });

  it('caps history at MAX_CONFIDENCE_HISTORY_ENTRIES', () => {
    const manyEntries = Array.from({ length: MAX_CONFIDENCE_HISTORY_ENTRIES + 10 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      value: 0.7 + (i % 10) / 100,
    }));

    const lesson = createLesson({
      metrics: {
        ...createLesson().metrics,
        confidence: 0.75,
        confidenceHistory: manyEntries,
      },
    });

    const history = updateConfidenceHistory(lesson);

    expect(history.length).toBeLessThanOrEqual(MAX_CONFIDENCE_HISTORY_ENTRIES);
  });
});

// =============================================================================
// getConfidenceTrend Tests
// =============================================================================

describe('getConfidenceTrend', () => {
  it('returns unknown with insufficient data', () => {
    expect(getConfidenceTrend([])).toBe('unknown');
    expect(getConfidenceTrend([{ date: new Date().toISOString(), value: 0.7 }])).toBe('unknown');
    expect(getConfidenceTrend([
      { date: new Date().toISOString(), value: 0.7 },
      { date: new Date().toISOString(), value: 0.8 },
    ])).toBe('unknown');
  });

  it('detects increasing trend', () => {
    const history = createConfidenceHistory([
      { daysAgo: 20, value: 0.5 },
      { daysAgo: 15, value: 0.55 },
      { daysAgo: 10, value: 0.6 },
      { daysAgo: 5, value: 0.7 },
      { daysAgo: 2, value: 0.75 },
      { daysAgo: 0, value: 0.8 },
    ]);

    expect(getConfidenceTrend(history)).toBe('increasing');
  });

  it('detects decreasing trend', () => {
    const history = createConfidenceHistory([
      { daysAgo: 20, value: 0.9 },
      { daysAgo: 15, value: 0.85 },
      { daysAgo: 10, value: 0.8 },
      { daysAgo: 5, value: 0.7 },
      { daysAgo: 2, value: 0.65 },
      { daysAgo: 0, value: 0.6 },
    ]);

    expect(getConfidenceTrend(history)).toBe('decreasing');
  });

  it('detects stable trend', () => {
    const history = createConfidenceHistory([
      { daysAgo: 20, value: 0.75 },
      { daysAgo: 15, value: 0.76 },
      { daysAgo: 10, value: 0.74 },
      { daysAgo: 5, value: 0.75 },
      { daysAgo: 2, value: 0.75 },
      { daysAgo: 0, value: 0.76 },
    ]);

    expect(getConfidenceTrend(history)).toBe('stable');
  });
});

// =============================================================================
// daysBetween Tests
// =============================================================================

describe('daysBetween', () => {
  it('returns 0 for same date', () => {
    const date = new Date();
    expect(daysBetween(date, date)).toBe(0);
  });

  it('returns 1 for consecutive days', () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    expect(daysBetween(today, yesterday)).toBeCloseTo(1, 5);
  });

  it('returns 30 for month difference', () => {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(daysBetween(now, monthAgo)).toBeCloseTo(30, 5);
  });

  it('is symmetric (order does not matter)', () => {
    const dateA = new Date('2024-01-01');
    const dateB = new Date('2024-01-15');
    expect(daysBetween(dateA, dateB)).toBe(daysBetween(dateB, dateA));
  });

  it('returns absolute value (always positive)', () => {
    const earlier = new Date('2024-01-01');
    const later = new Date('2024-01-15');
    expect(daysBetween(earlier, later)).toBeGreaterThan(0);
    expect(daysBetween(later, earlier)).toBeGreaterThan(0);
  });

  it('handles fractional days', () => {
    const now = new Date();
    const halfDayAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    expect(daysBetween(now, halfDayAgo)).toBeCloseTo(0.5, 5);
  });
});

// =============================================================================
// needsConfidenceReview Tests
// =============================================================================

describe('needsConfidenceReview', () => {
  it('returns true for confidence below default threshold', () => {
    const lesson = createLesson({
      metrics: { ...createLesson().metrics, confidence: 0.3 },
    });
    expect(needsConfidenceReview(lesson)).toBe(true);
  });

  it('returns false for confidence above default threshold', () => {
    const lesson = createLesson({
      metrics: { ...createLesson().metrics, confidence: 0.6 },
    });
    expect(needsConfidenceReview(lesson)).toBe(false);
  });

  it('returns true at exactly threshold', () => {
    const lesson = createLesson({
      metrics: { ...createLesson().metrics, confidence: 0.39 },
    });
    expect(needsConfidenceReview(lesson)).toBe(true);
  });

  it('returns false at exactly threshold', () => {
    const lesson = createLesson({
      metrics: { ...createLesson().metrics, confidence: 0.4 },
    });
    expect(needsConfidenceReview(lesson)).toBe(false);
  });

  it('respects custom threshold', () => {
    const lesson = createLesson({
      metrics: { ...createLesson().metrics, confidence: 0.5 },
    });

    expect(needsConfidenceReview(lesson, 0.3)).toBe(false);
    expect(needsConfidenceReview(lesson, 0.6)).toBe(true);
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe('Constants', () => {
  it('MAX_CONFIDENCE_HISTORY_ENTRIES is reasonable', () => {
    expect(MAX_CONFIDENCE_HISTORY_ENTRIES).toBeGreaterThan(0);
    expect(MAX_CONFIDENCE_HISTORY_ENTRIES).toBeLessThanOrEqual(1000);
  });

  it('CONFIDENCE_HISTORY_RETENTION_DAYS is reasonable', () => {
    expect(CONFIDENCE_HISTORY_RETENTION_DAYS).toBeGreaterThan(0);
    expect(CONFIDENCE_HISTORY_RETENTION_DAYS).toBeLessThanOrEqual(365);
  });
});
