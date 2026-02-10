/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unused-vars, sort-imports */
/**
 * Integration tests for LLKB module
 *
 * Tests end-to-end workflows across multiple modules:
 * - Lesson lifecycle (create → normalize → calculate confidence → save → history)
 * - Component extraction and similarity detection
 * - Analytics updates based on lesson/component changes
 * - Prune workflow with analytics refresh
 * - Rate limiting across history and extraction
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Import from all modules to test integration
import {
  // Types
  type Lesson,
  type Component,
  type LessonsFile,
  type ComponentsFile,
  type HistoryEvent,
  type LLKBConfig,
  // Normalize
  normalizeCode,
  hashCode,
  tokenize,
  // Similarity
  calculateSimilarity,
  isNearDuplicate,
  findSimilarPatterns,
  // Inference
  inferCategory,
  inferCategoryWithConfidence,
  // Confidence
  calculateConfidence,
  updateConfidenceHistory,
  needsConfidenceReview,
  // File utils
  saveJSONAtomicSync,
  loadJSON,
  updateJSONWithLockSync,
  ensureDir,
  // History
  appendToHistory,
  readTodayHistory,
  countTodayEvents,
  countPredictiveExtractionsToday,
  countJourneyExtractionsToday,
  isDailyRateLimitReached,
  isJourneyRateLimitReached,
  getHistoryDir,
  formatDate,
  // Analytics
  updateAnalytics,
  updateAnalyticsWithData,
  // CLI
  runHealthCheck,
  getStats,
  prune,
} from '../index.js';

// Helper to create a mock config for rate limiting tests
function createMockConfig(maxPredictivePerDay: number, maxPredictivePerJourney: number): LLKBConfig {
  return {
    version: '1.0',
    learning: { enabled: true, autoExtract: true, confidenceThreshold: 0.6 },
    extraction: {
      maxPredictivePerDay,
      maxPredictivePerJourney,
      similarityThreshold: 0.8,
      deferIfRecent: 7,
    },
    retention: {
      minConfidence: 0.3,
      minOccurrences: 2,
      archiveAfterDays: 90,
    },
    history: { retentionDays: 365, maxFileSizeMB: 10 },
    injection: { maxLessonsPerPrompt: 5, maxComponentsPerPrompt: 3 },
    scopes: {
      'framework:ag-grid': { enabled: true },
      'framework:angular': { enabled: true },
      'framework:react': { enabled: true },
      'framework:vue': { enabled: true },
      'app-specific': { enabled: true },
      universal: { enabled: true },
    },
    overrides: {},
  };
}

// =============================================================================
// Test Setup
// =============================================================================

function createTempLLKB(): string {
  const tempDir = join(tmpdir(), `llkb-integration-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
  mkdirSync(join(tempDir, 'history'), { recursive: true });
  return tempDir;
}

function initializeLLKB(tempDir: string): void {
  // Config
  writeFileSync(
    join(tempDir, 'config.yml'),
    'version: "1.0"\nlearning:\n  enabled: true',
    'utf-8'
  );

  // Empty lessons file
  const lessonsFile: LessonsFile = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    lessons: [],
    archived: [],
  };
  writeFileSync(join(tempDir, 'lessons.json'), JSON.stringify(lessonsFile, null, 2), 'utf-8');

  // Empty components file
  const componentsFile: ComponentsFile = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    components: [],
  };
  writeFileSync(join(tempDir, 'components.json'), JSON.stringify(componentsFile, null, 2), 'utf-8');

  // Empty analytics
  writeFileSync(
    join(tempDir, 'analytics.json'),
    JSON.stringify({
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      overview: {
        totalLessons: 0,
        activeLessons: 0,
        archivedLessons: 0,
        totalComponents: 0,
        activeComponents: 0,
        archivedComponents: 0,
      },
      lessonStats: { byCategory: {}, avgConfidence: 0, avgSuccessRate: 0 },
      componentStats: { byCategory: {}, byScope: {}, totalReuses: 0, avgReusesPerComponent: 0 },
      impact: {},
      topPerformers: { lessons: [], components: [] },
      needsReview: { lowConfidenceLessons: [], lowUsageComponents: [], decliningSuccessRate: [] },
    }),
    'utf-8'
  );
}

let tempDir: string;

beforeEach(() => {
  tempDir = createTempLLKB();
  initializeLLKB(tempDir);
});

afterEach(() => {
  if (tempDir && existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// =============================================================================
// Lesson Lifecycle Integration Tests
// =============================================================================

describe('Lesson Lifecycle Integration', () => {
  it('creates a lesson from code pattern and tracks in history', () => {
    const now = new Date();
    // Use code that matches 'timing' pattern (contains 'wait')
    const code = `await page.waitForSelector('.btn-primary');`;

    // Step 1: Normalize and analyze the code
    const normalizedCode = normalizeCode(code);
    const codeHash = hashCode(normalizedCode);
    const tokens = tokenize(normalizedCode);

    expect(normalizedCode).toContain('STRING');
    expect(codeHash).toMatch(/^[a-f0-9]{8}$/);
    expect(tokens.size).toBeGreaterThan(0); // tokenize returns a Set, use .size

    // Step 2: Infer category - 'wait' pattern has higher priority, so it matches 'timing'
    const categoryResult = inferCategoryWithConfidence(code);
    expect(categoryResult.category).toBe('timing'); // 'wait' matches timing (higher priority than selector)
    expect(categoryResult.confidence).toBeGreaterThan(0);

    // Step 3: Create lesson object (category will be 'timing')
    const lesson: Lesson = {
      id: 'L001',
      title: 'Wait for primary button',
      pattern: normalizedCode,
      trigger: 'button wait',
      category: 'timing', // Use literal since we know it's timing
      scope: 'universal',
      journeyIds: ['J001'],
      metrics: {
        occurrences: 1,
        successRate: 1.0,
        confidence: 0.5,
        firstSeen: now.toISOString(),
        lastSuccess: now.toISOString(),
        confidenceHistory: [],
      },
      validation: {
        humanReviewed: false,
        lastReviewedBy: null,
        lastReviewedAt: null,
      },
    };

    // Step 4: Calculate confidence
    const confidence = calculateConfidence(lesson);
    lesson.metrics.confidence = confidence;
    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(1);

    // Step 5: Save lesson to file
    const lessonsFile = loadJSON<LessonsFile>(join(tempDir, 'lessons.json'))!;
    lessonsFile.lessons.push(lesson);
    lessonsFile.lastUpdated = now.toISOString();
    const saveResult = saveJSONAtomicSync(join(tempDir, 'lessons.json'), lessonsFile);
    expect(saveResult.success).toBe(true);

    // Step 6: Log to history (event first, then directory)
    const historyEvent: HistoryEvent = {
      event: 'lesson_created',
      timestamp: now.toISOString(),
      lessonId: lesson.id,
      journeyId: 'J001',
    };
    appendToHistory(historyEvent, tempDir);

    // Step 7: Verify history logged
    const todayEvents = readTodayHistory(tempDir);
    expect(todayEvents.length).toBe(1);
    expect(todayEvents[0]?.lessonId).toBe('L001');

    // Step 8: Update analytics
    updateAnalytics(tempDir);

    // Step 9: Verify analytics updated (load from file since getAnalyticsSummary returns string)
    const analytics = loadJSON<{ overview: { totalLessons: number; activeLessons: number } }>(join(tempDir, 'analytics.json'));
    expect(analytics?.overview.totalLessons).toBe(1);
    expect(analytics?.overview.activeLessons).toBe(1);
  });

  it('updates lesson confidence over multiple applications', () => {
    const now = new Date();

    // Create initial lesson
    const lesson: Lesson = {
      id: 'L001',
      title: 'Test Lesson',
      pattern: 'test pattern',
      trigger: 'test',
      category: 'selector',
      scope: 'universal',
      journeyIds: ['J001'],
      metrics: {
        occurrences: 1,
        successRate: 0.5,
        confidence: 0.3,
        firstSeen: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastSuccess: now.toISOString(),
        confidenceHistory: [],
      },
      validation: { humanReviewed: false, lastReviewedBy: null, lastReviewedAt: null },
    };

    // Simulate multiple successful applications
    for (let i = 0; i < 5; i++) {
      lesson.metrics.occurrences++;
      lesson.metrics.successRate = (lesson.metrics.successRate * (lesson.metrics.occurrences - 1) + 1) / lesson.metrics.occurrences;
      lesson.metrics.lastSuccess = now.toISOString();

      // Recalculate confidence
      const newConfidence = calculateConfidence(lesson);
      lesson.metrics.confidenceHistory = updateConfidenceHistory(lesson);
      lesson.metrics.confidence = newConfidence;

      // Log application event (event first, then directory)
      appendToHistory({
        event: 'lesson_applied',
        timestamp: now.toISOString(),
        lessonId: lesson.id,
        journeyId: `J00${i + 1}`,
        success: true,
      }, tempDir);
    }

    // Verify confidence increased
    expect(lesson.metrics.confidence).toBeGreaterThan(0.3);
    expect(lesson.metrics.occurrences).toBe(6);
    expect(lesson.metrics.successRate).toBeGreaterThan(0.8);

    // Verify history has all events
    const todayEvents = readTodayHistory(tempDir);
    expect(todayEvents.length).toBe(5);

    // Verify confidence history tracked
    expect(lesson.metrics.confidenceHistory?.length).toBeGreaterThan(0);
  });

  it('marks lesson for review when confidence drops', () => {
    const lesson: Lesson = {
      id: 'L001',
      title: 'Low Confidence Lesson',
      pattern: 'test',
      trigger: 'test',
      category: 'timing',
      scope: 'universal',
      journeyIds: ['J001'],
      metrics: {
        occurrences: 2,
        successRate: 0.3,
        confidence: 0.25,
        firstSeen: new Date().toISOString(),
      },
      validation: { humanReviewed: false, lastReviewedBy: null, lastReviewedAt: null },
    };

    // Check if needs review
    expect(needsConfidenceReview(lesson)).toBe(true);

    // Save and update analytics
    const lessonsFile = loadJSON<LessonsFile>(join(tempDir, 'lessons.json'))!;
    lessonsFile.lessons.push(lesson);
    saveJSONAtomicSync(join(tempDir, 'lessons.json'), lessonsFile);
    updateAnalytics(tempDir);

    // Verify analytics flags for review (load from file)
    const analytics = loadJSON<{ needsReview: { lowConfidenceLessons: string[] } }>(join(tempDir, 'analytics.json'));
    expect(analytics?.needsReview.lowConfidenceLessons).toContain('L001');
  });
});

// =============================================================================
// Component Extraction Integration Tests
// =============================================================================

describe('Component Extraction Integration', () => {
  it('extracts component and detects similar patterns', () => {
    const now = new Date();

    // Create first component
    const code1 = `
      async function loginUser(page, username, password) {
        await page.fill('#username', username);
        await page.fill('#password', password);
        await page.click('#login-btn');
      }
    `;

    const component1: Component = {
      id: 'C001',
      name: 'loginUser',
      description: 'Login helper function',
      category: 'auth',
      scope: 'universal',
      code: code1,
      parameters: [
        { name: 'page', type: 'Page', description: 'Playwright page' },
        { name: 'username', type: 'string', description: 'Username' },
        { name: 'password', type: 'string', description: 'Password' },
      ],
      dependencies: [],
      metrics: { totalUses: 5, lastUsed: now.toISOString() },
      source: { journeyId: 'J001', extractedAt: now.toISOString(), prompt: 'journey-implement' },
    };

    // Save first component
    const componentsFile = loadJSON<ComponentsFile>(join(tempDir, 'components.json'))!;
    componentsFile.components.push(component1);
    saveJSONAtomicSync(join(tempDir, 'components.json'), componentsFile);

    // Create similar code pattern
    const code2 = `
      async function loginAdmin(page, adminUser, adminPass) {
        await page.fill('#username', adminUser);
        await page.fill('#password', adminPass);
        await page.click('#login-btn');
      }
    `;

    // Normalize both and check similarity
    const normalized1 = normalizeCode(code1);
    const normalized2 = normalizeCode(code2);

    const similarity = calculateSimilarity(normalized1, normalized2);
    expect(similarity).toBeGreaterThan(0.6); // Similar patterns (normalization affects similarity)

    // Check near-duplicate detection with lower threshold
    const isDuplicate = isNearDuplicate(normalized1, normalized2, 0.6);
    expect(isDuplicate).toBe(true);

    // Find similar patterns with adjusted threshold
    const patterns = [normalized1];
    const similar = findSimilarPatterns(normalized2, patterns, 0.6);
    expect(similar.length).toBe(1);
    expect(similar[0]?.similarity).toBeGreaterThan(0.6);
  });

  it('tracks component usage across journeys', () => {
    const now = new Date();

    const component: Component = {
      id: 'C001',
      name: 'waitForNetworkIdle',
      description: 'Wait for network to be idle',
      category: 'navigation',
      scope: 'universal',
      code: 'await page.waitForLoadState("networkidle");',
      parameters: [],
      dependencies: [],
      metrics: { totalUses: 0, lastUsed: now.toISOString() },
      source: { journeyId: 'J001', extractedAt: now.toISOString(), prompt: 'journey-implement' },
    };

    // Save component
    const componentsFile = loadJSON<ComponentsFile>(join(tempDir, 'components.json'))!;
    componentsFile.components.push(component);
    saveJSONAtomicSync(join(tempDir, 'components.json'), componentsFile);

    // Simulate usage across multiple journeys
    const journeys = ['J001', 'J002', 'J003', 'J004', 'J005'];
    for (const journeyId of journeys) {
      component.metrics.totalUses++;
      component.metrics.lastUsed = now.toISOString();

      appendToHistory({
        event: 'component_used',
        timestamp: now.toISOString(),
        componentId: component.id,
        journeyId,
      }, tempDir);
    }

    // Update file with new metrics
    componentsFile.components[0] = component;
    saveJSONAtomicSync(join(tempDir, 'components.json'), componentsFile);

    // Update analytics
    updateAnalytics(tempDir);

    // Verify stats
    const stats = getStats(tempDir);
    expect(stats.components.total).toBe(1);
    expect(stats.components.totalReuses).toBe(5);

    const todayEvents = readTodayHistory(tempDir);
    expect(todayEvents.length).toBe(5);
  });
});

// =============================================================================
// Rate Limiting Integration Tests
// =============================================================================

describe('Rate Limiting Integration', () => {
  it('enforces daily extraction rate limit', () => {
    // Simulate hitting daily limit - use component_extracted with journey-implement prompt
    for (let i = 0; i < 10; i++) {
      appendToHistory({
        event: 'component_extracted',
        timestamp: new Date().toISOString(),
        componentId: `C00${i}`,
        journeyId: `J00${i}`,
        prompt: 'journey-implement',
      }, tempDir);
    }

    // Check if limit reached using config object
    const config10 = createMockConfig(10, 3);
    const limitReached = isDailyRateLimitReached(config10, tempDir);
    expect(limitReached).toBe(true);

    // Lower limit should also be reached
    const config5 = createMockConfig(5, 3);
    const lowerLimitReached = isDailyRateLimitReached(config5, tempDir);
    expect(lowerLimitReached).toBe(true);

    // Higher limit should not be reached
    const config15 = createMockConfig(15, 3);
    const higherLimitNotReached = isDailyRateLimitReached(config15, tempDir);
    expect(higherLimitNotReached).toBe(false);
  });

  it('enforces per-journey extraction rate limit', () => {
    const journeyId = 'J001';

    // Simulate extracting from same journey with journey-implement prompt
    for (let i = 0; i < 3; i++) {
      appendToHistory({
        event: 'component_extracted',
        timestamp: new Date().toISOString(),
        componentId: `C00${i}`,
        journeyId,
        prompt: 'journey-implement',
      }, tempDir);
    }

    // Check journey limit using config object (journeyId first, then config, then dir)
    const config3 = createMockConfig(10, 3);
    const limitReached = isJourneyRateLimitReached(journeyId, config3, tempDir);
    expect(limitReached).toBe(true);

    // Different journey should not be limited
    const otherJourneyLimited = isJourneyRateLimitReached('J002', config3, tempDir);
    expect(otherJourneyLimited).toBe(false);
  });

  it('counts events correctly for rate limiting', () => {
    const now = new Date();

    // Add various event types
    appendToHistory({ event: 'lesson_created', timestamp: now.toISOString(), lessonId: 'L001' }, tempDir);
    appendToHistory({ event: 'lesson_applied', timestamp: now.toISOString(), lessonId: 'L001' }, tempDir);
    appendToHistory({ event: 'component_extracted', timestamp: now.toISOString(), componentId: 'C001', prompt: 'journey-implement' }, tempDir);
    appendToHistory({ event: 'component_used', timestamp: now.toISOString(), componentId: 'C001' }, tempDir);

    // Count specific event type (countTodayEvents requires event type)
    const lessonAppliedCount = countTodayEvents('lesson_applied', undefined, tempDir);
    expect(lessonAppliedCount).toBe(1);

    const lessonCreatedCount = countTodayEvents('lesson_created', undefined, tempDir);
    expect(lessonCreatedCount).toBe(1);

    // Events should be readable
    const events = readTodayHistory(tempDir);
    expect(events.length).toBe(4);
    expect(events.map(e => e.event)).toContain('component_extracted');
  });
});

// =============================================================================
// Analytics Integration Tests
// =============================================================================

describe('Analytics Integration', () => {
  it('calculates comprehensive analytics from lessons and components', () => {
    const now = new Date();

    // Add multiple lessons with different categories
    const lessons: Lesson[] = [
      {
        id: 'L001', title: 'Selector Lesson', pattern: '.btn', trigger: 'button',
        category: 'selector', scope: 'universal', journeyIds: ['J001'],
        metrics: { occurrences: 10, successRate: 0.9, confidence: 0.85, firstSeen: now.toISOString() },
        validation: { humanReviewed: true, lastReviewedBy: 'user', lastReviewedAt: now.toISOString() },
      },
      {
        id: 'L002', title: 'Timing Lesson', pattern: 'wait', trigger: 'wait',
        category: 'timing', scope: 'universal', journeyIds: ['J002'],
        metrics: { occurrences: 5, successRate: 0.8, confidence: 0.7, firstSeen: now.toISOString() },
        validation: { humanReviewed: false, lastReviewedBy: null, lastReviewedAt: null },
      },
      {
        id: 'L003', title: 'Low Confidence', pattern: 'test', trigger: 'test',
        category: 'assertion', scope: 'app-specific', journeyIds: ['J003'],
        metrics: { occurrences: 2, successRate: 0.4, confidence: 0.25, firstSeen: now.toISOString() },
        validation: { humanReviewed: false, lastReviewedBy: null, lastReviewedAt: null },
      },
    ];

    // Add components
    const components: Component[] = [
      {
        id: 'C001', name: 'login', description: 'Login helper',
        category: 'auth', scope: 'universal', code: 'login()', parameters: [], dependencies: [],
        metrics: { totalUses: 20, lastUsed: now.toISOString() },
        source: { journeyId: 'J001', extractedAt: now.toISOString(), prompt: 'journey-implement' },
      },
      {
        id: 'C002', name: 'navigate', description: 'Nav helper',
        category: 'navigation', scope: 'app-specific', code: 'nav()', parameters: [], dependencies: [],
        metrics: { totalUses: 15, lastUsed: now.toISOString() },
        source: { journeyId: 'J002', extractedAt: now.toISOString(), prompt: 'journey-implement' },
      },
    ];

    // Save to files
    const lessonsFile: LessonsFile = {
      version: '1.0.0', lastUpdated: now.toISOString(), lessons, archived: [],
    };
    saveJSONAtomicSync(join(tempDir, 'lessons.json'), lessonsFile);

    const componentsFile: ComponentsFile = {
      version: '1.0.0', lastUpdated: now.toISOString(), components,
    };
    saveJSONAtomicSync(join(tempDir, 'components.json'), componentsFile);

    // Update analytics
    updateAnalytics(tempDir);

    // Verify comprehensive analytics (load from file)
    type AnalyticsData = {
      overview: { totalLessons: number; totalComponents: number };
      lessonStats: { avgConfidence: number; avgSuccessRate: number };
      componentStats: { totalReuses: number };
      needsReview: { lowConfidenceLessons: string[] };
    };
    const analytics = loadJSON<AnalyticsData>(join(tempDir, 'analytics.json'));

    expect(analytics?.overview.totalLessons).toBe(3);
    expect(analytics?.overview.totalComponents).toBe(2);
    expect(analytics?.lessonStats.avgConfidence).toBeGreaterThan(0);
    expect(analytics?.lessonStats.avgSuccessRate).toBeGreaterThan(0);
    expect(analytics?.componentStats.totalReuses).toBe(35);
    expect(analytics?.needsReview.lowConfidenceLessons).toContain('L003');
  });

  it('updates analytics after prune operation', () => {
    const now = new Date();

    // Add a lesson
    const lessonsFile = loadJSON<LessonsFile>(join(tempDir, 'lessons.json'))!;
    lessonsFile.lessons.push({
      id: 'L001', title: 'Test', pattern: 'test', trigger: 'test',
      category: 'selector', scope: 'universal', journeyIds: ['J001'],
      metrics: { occurrences: 5, successRate: 0.8, confidence: 0.7, firstSeen: now.toISOString() },
      validation: { humanReviewed: false, lastReviewedBy: null, lastReviewedAt: null },
    });
    saveJSONAtomicSync(join(tempDir, 'lessons.json'), lessonsFile);

    // Add old history file
    const historyDir = getHistoryDir(tempDir);
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 400);
    writeFileSync(
      join(historyDir, `${formatDate(oldDate)}.jsonl`),
      '{"event":"old_event"}\n',
      'utf-8'
    );

    // Run prune
    const pruneResult = prune({ llkbRoot: tempDir, historyRetentionDays: 365 });

    expect(pruneResult.historyFilesDeleted).toBe(1);
    expect(pruneResult.errors.length).toBe(0);

    // Verify analytics were updated by prune (load from file)
    const analytics = loadJSON<{ overview: { totalLessons: number } }>(join(tempDir, 'analytics.json'));
    expect(analytics?.overview.totalLessons).toBe(1);
  });
});

// =============================================================================
// CLI Integration Tests
// =============================================================================

describe('CLI Integration', () => {
  it('health check reflects actual LLKB state', () => {
    const now = new Date();

    // Add a low-confidence lesson
    const lessonsFile = loadJSON<LessonsFile>(join(tempDir, 'lessons.json'))!;
    lessonsFile.lessons.push({
      id: 'L001', title: 'Low Confidence', pattern: 'test', trigger: 'test',
      category: 'timing', scope: 'universal', journeyIds: ['J001'],
      metrics: { occurrences: 1, successRate: 0.3, confidence: 0.2, firstSeen: now.toISOString() },
      validation: { humanReviewed: false, lastReviewedBy: null, lastReviewedAt: null },
    });
    saveJSONAtomicSync(join(tempDir, 'lessons.json'), lessonsFile);

    // Run health check
    const health = runHealthCheck(tempDir);

    expect(health.status).toBe('warning');
    expect(health.checks.some(c => c.name === 'Lesson health' && c.status === 'warn')).toBe(true);
  });

  it('stats reflect accurate counts after operations', () => {
    const now = new Date();

    // Add lessons
    const lessonsFile = loadJSON<LessonsFile>(join(tempDir, 'lessons.json'))!;
    for (let i = 1; i <= 5; i++) {
      lessonsFile.lessons.push({
        id: `L00${i}`, title: `Lesson ${i}`, pattern: `pattern${i}`, trigger: `trigger${i}`,
        category: 'selector', scope: 'universal', journeyIds: [`J00${i}`],
        metrics: { occurrences: i * 2, successRate: 0.8, confidence: 0.7, firstSeen: now.toISOString() },
        validation: { humanReviewed: false, lastReviewedBy: null, lastReviewedAt: null },
      });
    }
    saveJSONAtomicSync(join(tempDir, 'lessons.json'), lessonsFile);

    // Add components
    const componentsFile = loadJSON<ComponentsFile>(join(tempDir, 'components.json'))!;
    for (let i = 1; i <= 3; i++) {
      componentsFile.components.push({
        id: `C00${i}`, name: `comp${i}`, description: `Component ${i}`,
        category: 'auth', scope: 'universal', code: `code${i}()`, parameters: [], dependencies: [],
        metrics: { totalUses: i * 5, lastUsed: now.toISOString() },
        source: { journeyId: `J00${i}`, extractedAt: now.toISOString(), prompt: 'journey-implement' },
      });
    }
    saveJSONAtomicSync(join(tempDir, 'components.json'), componentsFile);

    // Add history events
    for (let i = 0; i < 10; i++) {
      appendToHistory({
        event: 'lesson_applied',
        timestamp: now.toISOString(),
        lessonId: `L00${(i % 5) + 1}`,
      }, tempDir);
    }

    // Get stats
    const stats = getStats(tempDir);

    expect(stats.lessons.total).toBe(5);
    expect(stats.lessons.active).toBe(5);
    expect(stats.components.total).toBe(3);
    expect(stats.components.totalReuses).toBe(30); // 5 + 10 + 15
    expect(stats.history.todayEvents).toBe(10);
  });
});

// =============================================================================
// Concurrent Operations Integration Tests
// =============================================================================

describe('Concurrent Operations', () => {
  it('handles concurrent history appends', async () => {
    const promises: Promise<void>[] = [];

    // Simulate concurrent appends
    for (let i = 0; i < 20; i++) {
      promises.push(
        new Promise<void>((resolve) => {
          appendToHistory({
            event: 'lesson_applied',
            timestamp: new Date().toISOString(),
            lessonId: `L${String(i).padStart(3, '0')}`,
          }, tempDir);
          resolve();
        })
      );
    }

    await Promise.all(promises);

    // Verify all events were logged
    const events = readTodayHistory(tempDir);
    expect(events.length).toBe(20);
  });

  it('handles locked file updates', () => {
    const filePath = join(tempDir, 'test-lock.json');
    writeFileSync(filePath, JSON.stringify({ counter: 0 }), 'utf-8');

    // Perform multiple sequential updates
    for (let i = 0; i < 10; i++) {
      const result = updateJSONWithLockSync<{ counter: number }>(filePath, (data) => ({
        counter: data.counter + 1,
      }));
      expect(result.success).toBe(true);
    }

    // Verify final state
    const finalData = loadJSON<{ counter: number }>(filePath);
    expect(finalData?.counter).toBe(10);
  });
});

// =============================================================================
// End-to-End Workflow Tests
// =============================================================================

describe('End-to-End Workflows', () => {
  it('complete lesson extraction workflow', () => {
    const now = new Date();

    // 1. Detect code pattern during journey implementation
    // Note: 'data-testid' contains 'data' which matches data category (higher priority)
    // and 'wait' matches timing. Using a pattern that matches timing.
    const codePattern = `
      await page.waitForSelector('[data-testid="submit-btn"]');
      await page.click('[data-testid="submit-btn"]');
    `;

    // 2. Normalize and analyze
    const normalized = normalizeCode(codePattern);
    const category = inferCategory(codePattern);

    // 'data' pattern has higher priority than 'selector', 'wait' also matches timing
    // The first match in priority order is 'data' (from 'data-testid')
    expect(category).toBe('data');

    // 3. Check for duplicates against existing lessons
    const lessonsFile = loadJSON<LessonsFile>(join(tempDir, 'lessons.json'))!;
    const existingPatterns = lessonsFile.lessons.map(l => l.pattern);
    const duplicates = findSimilarPatterns(normalized, existingPatterns, 0.9);

    expect(duplicates.length).toBe(0); // No duplicates yet

    // 4. Create new lesson
    const newLesson: Lesson = {
      id: `L${String(lessonsFile.lessons.length + 1).padStart(3, '0')}`,
      title: 'Wait and click submit button',
      pattern: normalized,
      trigger: 'submit button',
      category,
      scope: 'universal',
      journeyIds: ['J001'],
      metrics: {
        occurrences: 1,
        successRate: 1.0,
        confidence: calculateConfidence({
          id: 'temp',
          title: 'temp',
          pattern: normalized,
          trigger: 'temp',
          category,
          scope: 'universal',
          journeyIds: ['J001'],
          metrics: { occurrences: 1, successRate: 1.0, confidence: 0.5, firstSeen: now.toISOString() },
          validation: { humanReviewed: false, lastReviewedBy: null, lastReviewedAt: null },
        }),
        firstSeen: now.toISOString(),
        lastSuccess: now.toISOString(),
        confidenceHistory: [],
      },
      validation: { humanReviewed: false, lastReviewedBy: null, lastReviewedAt: null },
    };

    // 5. Save lesson
    lessonsFile.lessons.push(newLesson);
    lessonsFile.lastUpdated = now.toISOString();
    saveJSONAtomicSync(join(tempDir, 'lessons.json'), lessonsFile);

    // 6. Log extraction event
    appendToHistory({
      event: 'lesson_extracted',
      timestamp: now.toISOString(),
      lessonId: newLesson.id,
      journeyId: 'J001',
    }, tempDir);

    // 7. Update analytics
    updateAnalytics(tempDir);

    // 8. Verify complete state
    const finalStats = getStats(tempDir);
    expect(finalStats.lessons.total).toBe(1);
    expect(finalStats.history.todayEvents).toBe(1);

    const health = runHealthCheck(tempDir);
    expect(['healthy', 'warning']).toContain(health.status);
  });

  it('complete maintenance workflow', () => {
    const now = new Date();

    // Setup: Create LLKB with lessons, components, and history
    const lessonsFile = loadJSON<LessonsFile>(join(tempDir, 'lessons.json'))!;
    lessonsFile.lessons = [
      {
        id: 'L001', title: 'Good Lesson', pattern: 'good', trigger: 'good',
        category: 'selector', scope: 'universal', journeyIds: ['J001'],
        metrics: { occurrences: 10, successRate: 0.95, confidence: 0.9, firstSeen: now.toISOString() },
        validation: { humanReviewed: true, lastReviewedBy: 'user', lastReviewedAt: now.toISOString() },
      },
      {
        id: 'L002', title: 'Bad Lesson', pattern: 'bad', trigger: 'bad',
        category: 'timing', scope: 'universal', journeyIds: ['J002'],
        metrics: { occurrences: 2, successRate: 0.2, confidence: 0.15, firstSeen: now.toISOString() },
        validation: { humanReviewed: false, lastReviewedBy: null, lastReviewedAt: null },
      },
    ];
    saveJSONAtomicSync(join(tempDir, 'lessons.json'), lessonsFile);

    const componentsFile = loadJSON<ComponentsFile>(join(tempDir, 'components.json'))!;
    componentsFile.components = [
      {
        id: 'C001', name: 'activeComponent', description: 'Active',
        category: 'auth', scope: 'universal', code: 'active()', parameters: [], dependencies: [],
        metrics: { totalUses: 25, lastUsed: now.toISOString() },
        source: { journeyId: 'J001', extractedAt: now.toISOString(), prompt: 'journey-implement' },
      },
    ];
    saveJSONAtomicSync(join(tempDir, 'components.json'), componentsFile);

    // Add old history
    const historyDir = getHistoryDir(tempDir);
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 400);
    writeFileSync(join(historyDir, `${formatDate(oldDate)}.jsonl`), '{"event":"old"}\n', 'utf-8');

    // Add recent history
    appendToHistory({ event: 'lesson_applied', timestamp: now.toISOString(), lessonId: 'L001' }, tempDir);

    // 1. Run health check
    const health = runHealthCheck(tempDir);
    expect(health.status).toBe('warning'); // L002 has low confidence

    // 2. Get stats
    const stats = getStats(tempDir);
    expect(stats.lessons.total).toBe(2);
    expect(stats.lessons.needsReview).toBe(1);

    // 3. Run prune
    const pruneResult = prune({ llkbRoot: tempDir, historyRetentionDays: 365 });
    expect(pruneResult.historyFilesDeleted).toBe(1);

    // 4. Verify post-prune state
    const postPruneStats = getStats(tempDir);
    expect(postPruneStats.history.historyFiles).toBe(1); // Only today's file remains

    // 5. Final health check
    const finalHealth = runHealthCheck(tempDir);
    expect(finalHealth.checks.every(c => c.status !== 'fail')).toBe(true);
  });
});

// =============================================================================
// initializeLLKB Seed Creation Tests
// =============================================================================

describe('initializeLLKB seed creation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `llkb-seed-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates learned-patterns.json with 39 universal seed patterns', async () => {
    // Import the actual initializeLLKB from migration module
    const { initializeLLKB } = await import('../migration.js');

    const result = await initializeLLKB(tempDir);
    expect(result.success).toBe(true);

    // Verify learned-patterns.json was created
    const patternsPath = join(tempDir, 'learned-patterns.json');
    expect(existsSync(patternsPath)).toBe(true);

    // Verify contents
    const data = JSON.parse(readFileSync(patternsPath, 'utf-8')) as {
      version: string;
      patterns: Array<{ normalizedText: string; originalText: string; irPrimitive: string; confidence: number; successCount: number; failCount: number; sourceJourneys: string[] }>;
      metadata: { source: string; totalPatterns: number };
    };
    expect(data.version).toBe('1.0.0');
    expect(data.patterns).toHaveLength(39);
    expect(data.metadata.source).toBe('universal-seeds');
    expect(data.metadata.totalPatterns).toBe(39);

    // Verify pattern structure (persistence format)
    const first = data.patterns[0];
    expect(first.normalizedText).toBeDefined();
    expect(first.originalText).toBeDefined();
    expect(typeof first.irPrimitive).toBe('string');
    expect(first.confidence).toBe(0.80);
    expect(first.successCount).toBe(1);
    expect(first.failCount).toBe(0);
    expect(first.sourceJourneys).toEqual([]);
  });

  it('does not overwrite existing learned-patterns.json on re-init', async () => {
    const { initializeLLKB } = await import('../migration.js');

    // First init — creates seeds
    await initializeLLKB(tempDir);

    // Write a custom pattern to the file
    const patternsPath = join(tempDir, 'learned-patterns.json');
    const data = JSON.parse(readFileSync(patternsPath, 'utf-8')) as {
      patterns: Array<Record<string, unknown>>;
    };
    data.patterns.push({
      normalizedText: 'custom test pattern',
      originalText: 'Custom Test Pattern',
      irPrimitive: 'click',
      confidence: 0.99,
      successCount: 10,
      failCount: 0,
      sourceJourneys: ['JRN-0001'],
    });
    writeFileSync(patternsPath, JSON.stringify(data, null, 2), 'utf-8');

    // Re-init — should NOT overwrite
    await initializeLLKB(tempDir);

    const reloaded = JSON.parse(readFileSync(patternsPath, 'utf-8')) as {
      patterns: Array<Record<string, unknown>>;
    };
    expect(reloaded.patterns).toHaveLength(40); // 39 seeds + 1 custom
    expect(reloaded.patterns.some((p) => p.normalizedText === 'custom test pattern')).toBe(true);
  });
});
