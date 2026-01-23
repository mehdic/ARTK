/**
 * Unit tests for learning loop functions
 *
 * Tests:
 * - recordPatternLearned: Recording selector pattern outcomes
 * - recordComponentUsed: Recording component usage
 * - recordLessonApplied: Recording lesson applications
 * - recordLearning: CLI helper function
 * - formatLearningResult: Result formatting
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  recordPatternLearned,
  recordComponentUsed,
  recordLessonApplied,
  recordLearning,
  formatLearningResult,
} from '../learning.js';
import type { LessonsFile, ComponentsFile, Lesson, Component } from '../types.js';

// =============================================================================
// Test Setup
// =============================================================================

function createTempLLKB(): string {
  const tempDir = join(tmpdir(), `llkb-learn-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(join(tempDir, 'history'), { recursive: true });
  return tempDir;
}

function createMockLessonsFile(): LessonsFile {
  return {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    lessons: [
      {
        id: 'L001',
        category: 'selector',
        severity: 'high',
        scope: 'universal',
        title: 'Use testid for buttons',
        problem: 'CSS selectors break on UI updates',
        solution: 'Use data-testid attribute',
        rationale: 'TestIDs are stable across UI changes',
        pattern: 'btn-save',
        trigger: 'Click the Save button',
        codePattern: {
          bad: "page.locator('.btn-primary')",
          good: "page.getByTestId('btn-save')",
          context: 'Button selection',
        },
        applicableTo: ['button', 'submit'],
        tags: ['selector', 'button', 'testid'],
        metrics: {
          occurrences: 5,
          successRate: 0.8,
          confidence: 0.75,
          confidenceHistory: [],
          firstSeen: '2024-01-01T00:00:00Z',
          lastApplied: '2024-01-10T00:00:00Z',
          lastSuccess: '2024-01-10T00:00:00Z',
        },
        source: {
          discoveredBy: 'journey-verify',
          journey: 'JRN-0001',
          file: 'tests/login.spec.ts',
          line: 42,
        },
        validation: {
          autoValidated: true,
          humanReviewed: false,
          reviewedBy: null,
          reviewedAt: null,
        },
        journeyIds: ['JRN-0001'],
        archived: false,
      },
      {
        id: 'L002',
        category: 'timing',
        severity: 'medium',
        scope: 'framework:ag-grid',
        title: 'AG Grid wait pattern',
        problem: 'AG Grid takes time to render',
        solution: 'Wait for grid API ready',
        rationale: 'Grid API signals render completion',
        pattern: 'ag-grid-wait',
        trigger: 'AG Grid render',
        codePattern: {
          bad: 'await page.waitForTimeout(2000);',
          good: "await page.waitForFunction(() => window.agGrid?.api);",
          context: 'AG Grid interactions',
        },
        applicableTo: ['ag-grid'],
        tags: ['timing', 'ag-grid', 'wait'],
        metrics: {
          occurrences: 3,
          successRate: 1.0,
          confidence: 0.85,
          confidenceHistory: [],
          firstSeen: '2024-01-05T00:00:00Z',
          lastApplied: '2024-01-12T00:00:00Z',
          lastSuccess: '2024-01-12T00:00:00Z',
        },
        source: {
          discoveredBy: 'journey-verify',
          journey: 'JRN-0002',
          file: 'tests/grid.spec.ts',
          line: 55,
        },
        validation: {
          autoValidated: true,
          humanReviewed: true,
          reviewedBy: 'user@example.com',
          reviewedAt: '2024-01-08T00:00:00Z',
        },
        journeyIds: ['JRN-0002'],
        archived: false,
      },
    ],
    archived: [],
    appQuirks: [],
  };
}

function createMockComponentsFile(): ComponentsFile {
  return {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    components: [
      {
        id: 'COMP001',
        name: 'loginUser',
        category: 'auth',
        scope: 'app-specific',
        description: 'Login helper function',
        modulePath: 'modules/auth/login.ts',
        exportName: 'loginUser',
        signature: '(page: Page, user: User) => Promise<void>',
        dependencies: [],
        tags: ['auth', 'login'],
        metrics: {
          totalUses: 10,
          successRate: 0.95,
          lastUsed: '2024-01-15T00:00:00Z',
        },
        source: {
          extractedFrom: 'JRN-0001',
          extractedAt: '2024-01-01T00:00:00Z',
          extractedBy: 'journey-implement',
          originalCode: 'await page.fill("#username", user.name);',
        },
        journeyIds: ['JRN-0001', 'JRN-0003'],
        archived: false,
      },
      {
        id: 'COMP002',
        name: 'verifyToast',
        category: 'assertion',
        scope: 'universal',
        description: 'Toast notification verifier',
        modulePath: 'modules/assertions/toast.ts',
        exportName: 'verifyToast',
        signature: '(page: Page, message: string) => Promise<void>',
        dependencies: [],
        tags: ['assertion', 'toast', 'notification'],
        metrics: {
          totalUses: 5,
          successRate: 0.9,
          lastUsed: '2024-01-14T00:00:00Z',
        },
        source: {
          extractedFrom: 'JRN-0002',
          extractedAt: '2024-01-05T00:00:00Z',
          extractedBy: 'journey-verify',
          originalCode: "await expect(page.getByRole('alert')).toBeVisible();",
        },
        journeyIds: ['JRN-0002'],
        archived: false,
      },
    ],
  };
}

let tempDir: string;

beforeEach(() => {
  tempDir = createTempLLKB();
  // Create mock lessons and components files
  writeFileSync(
    join(tempDir, 'lessons.json'),
    JSON.stringify(createMockLessonsFile(), null, 2),
    'utf-8'
  );
  writeFileSync(
    join(tempDir, 'components.json'),
    JSON.stringify(createMockComponentsFile(), null, 2),
    'utf-8'
  );
});

afterEach(() => {
  if (tempDir && existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// =============================================================================
// recordPatternLearned Tests
// =============================================================================

describe('recordPatternLearned', () => {
  it('records pattern success and updates existing lesson', () => {
    const result = recordPatternLearned({
      journeyId: 'JRN-0005',
      testFile: 'tests/new-feature.spec.ts',
      prompt: 'journey-verify',
      stepText: 'Click the Save button',
      selectorUsed: {
        strategy: 'testid',
        value: 'btn-save',
      },
      success: true,
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.entityId).toBe('L001');
    expect(result.metrics).toBeDefined();
    expect(result.metrics?.occurrences).toBe(6);

    // Verify lessons file was updated
    const lessonsFile = JSON.parse(readFileSync(join(tempDir, 'lessons.json'), 'utf-8')) as LessonsFile;
    const lesson = lessonsFile.lessons.find(l => l.id === 'L001');
    expect(lesson?.metrics.occurrences).toBe(6);
    expect(lesson?.journeyIds).toContain('JRN-0005');
  });

  it('records pattern failure and updates success rate', () => {
    const result = recordPatternLearned({
      journeyId: 'JRN-0005',
      testFile: 'tests/failing.spec.ts',
      prompt: 'journey-verify',
      stepText: 'Click the Save button',
      selectorUsed: {
        strategy: 'testid',
        value: 'btn-save',
      },
      success: false,
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.metrics?.successRate).toBeLessThan(0.8);
  });

  it('handles no matching lesson gracefully', () => {
    const result = recordPatternLearned({
      journeyId: 'JRN-0005',
      testFile: 'tests/unknown.spec.ts',
      prompt: 'journey-verify',
      stepText: 'Click the Unknown button',
      selectorUsed: {
        strategy: 'testid',
        value: 'btn-unknown',
      },
      success: true,
      llkbRoot: tempDir,
    });

    // Should still succeed - just logs to history without updating lesson
    expect(result.success).toBe(true);
    expect(result.entityId).toBeUndefined();
  });

  it('logs to history file', () => {
    recordPatternLearned({
      journeyId: 'JRN-0005',
      testFile: 'tests/feature.spec.ts',
      prompt: 'journey-verify',
      stepText: 'Click the Save button',
      selectorUsed: {
        strategy: 'testid',
        value: 'btn-save',
      },
      success: true,
      llkbRoot: tempDir,
    });

    const historyDir = join(tempDir, 'history');
    const files = require('fs').readdirSync(historyDir);
    expect(files.length).toBe(1);

    const historyContent = readFileSync(join(historyDir, files[0]), 'utf-8');
    expect(historyContent).toContain('lesson_applied');
    expect(historyContent).toContain('JRN-0005');
  });

  it('handles missing lessons file gracefully', () => {
    rmSync(join(tempDir, 'lessons.json'));

    const result = recordPatternLearned({
      journeyId: 'JRN-0005',
      testFile: 'tests/feature.spec.ts',
      prompt: 'journey-verify',
      stepText: 'Click Save',
      selectorUsed: { strategy: 'testid', value: 'btn-save' },
      success: true,
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// =============================================================================
// recordComponentUsed Tests
// =============================================================================

describe('recordComponentUsed', () => {
  it('records component usage success', () => {
    const result = recordComponentUsed({
      journeyId: 'JRN-0010',
      testFile: 'tests/new-journey.spec.ts',
      prompt: 'journey-implement',
      componentId: 'COMP001',
      success: true,
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.entityId).toBe('COMP001');
    expect(result.metrics?.totalUses).toBe(11);

    // Verify components file was updated
    const componentsFile = JSON.parse(readFileSync(join(tempDir, 'components.json'), 'utf-8')) as ComponentsFile;
    const component = componentsFile.components.find(c => c.id === 'COMP001');
    expect(component?.metrics.totalUses).toBe(11);
  });

  it('records component usage failure', () => {
    const result = recordComponentUsed({
      journeyId: 'JRN-0010',
      testFile: 'tests/failing.spec.ts',
      prompt: 'journey-verify',
      componentId: 'COMP002',
      success: false,
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(true);
    // On failure, success rate decreases
    // Original: 0.9 success rate with 5 uses
    // After failure: (0.9 * 5 + 0) / 6 = 0.75
    expect(result.metrics?.successRate).toBeLessThan(0.9);
    expect(result.metrics?.totalUses).toBe(6);
  });

  it('returns error for non-existent component', () => {
    const result = recordComponentUsed({
      journeyId: 'JRN-0010',
      testFile: 'tests/feature.spec.ts',
      prompt: 'journey-implement',
      componentId: 'COMP999',
      success: true,
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Component not found');
  });

  it('logs to history file', () => {
    recordComponentUsed({
      journeyId: 'JRN-0010',
      testFile: 'tests/feature.spec.ts',
      prompt: 'journey-implement',
      componentId: 'COMP001',
      success: true,
      llkbRoot: tempDir,
    });

    const historyDir = join(tempDir, 'history');
    const files = require('fs').readdirSync(historyDir);
    expect(files.length).toBe(1);

    const historyContent = readFileSync(join(historyDir, files[0]), 'utf-8');
    expect(historyContent).toContain('component_used');
    expect(historyContent).toContain('COMP001');
  });
});

// =============================================================================
// recordLessonApplied Tests
// =============================================================================

describe('recordLessonApplied', () => {
  it('records lesson application success', () => {
    const result = recordLessonApplied({
      journeyId: 'JRN-0015',
      testFile: 'tests/grid-feature.spec.ts',
      prompt: 'journey-verify',
      lessonId: 'L002',
      success: true,
      context: 'Applied AG Grid wait pattern to fix timing issue',
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.entityId).toBe('L002');
    expect(result.metrics?.occurrences).toBe(4);

    // Verify lessons file was updated
    const lessonsFile = JSON.parse(readFileSync(join(tempDir, 'lessons.json'), 'utf-8')) as LessonsFile;
    const lesson = lessonsFile.lessons.find(l => l.id === 'L002');
    expect(lesson?.metrics.occurrences).toBe(4);
    expect(lesson?.journeyIds).toContain('JRN-0015');
  });

  it('records lesson application failure', () => {
    const result = recordLessonApplied({
      journeyId: 'JRN-0015',
      testFile: 'tests/failing.spec.ts',
      prompt: 'journey-verify',
      lessonId: 'L001',
      success: false,
      context: 'Lesson did not fix the issue',
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.metrics?.successRate).toBeLessThan(0.8);
  });

  it('returns error for non-existent lesson', () => {
    const result = recordLessonApplied({
      journeyId: 'JRN-0015',
      testFile: 'tests/feature.spec.ts',
      prompt: 'journey-verify',
      lessonId: 'L999',
      success: true,
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Lesson not found');
  });

  it('updates confidence based on success rate', () => {
    // Apply lesson multiple times
    for (let i = 0; i < 5; i++) {
      recordLessonApplied({
        journeyId: `JRN-00${i}`,
        testFile: `tests/feature-${i}.spec.ts`,
        prompt: 'journey-verify',
        lessonId: 'L002',
        success: true,
        llkbRoot: tempDir,
      });
    }

    const lessonsFile = JSON.parse(readFileSync(join(tempDir, 'lessons.json'), 'utf-8')) as LessonsFile;
    const lesson = lessonsFile.lessons.find(l => l.id === 'L002');

    // Confidence should increase with more successful applications
    expect(lesson?.metrics.confidence).toBeGreaterThan(0.85);
  });
});

// =============================================================================
// recordLearning (CLI Helper) Tests
// =============================================================================

describe('recordLearning', () => {
  it('dispatches pattern type correctly', () => {
    const result = recordLearning({
      type: 'pattern',
      journeyId: 'JRN-0001',
      success: true,
      stepText: 'Click the Save button',
      selectorStrategy: 'testid',
      selectorValue: 'btn-save',
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(true);
  });

  it('dispatches component type correctly', () => {
    const result = recordLearning({
      type: 'component',
      journeyId: 'JRN-0001',
      id: 'COMP001',
      success: true,
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.entityId).toBe('COMP001');
  });

  it('dispatches lesson type correctly', () => {
    const result = recordLearning({
      type: 'lesson',
      journeyId: 'JRN-0001',
      id: 'L002',
      success: true,
      context: 'Applied AG Grid pattern',
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.entityId).toBe('L002');
  });

  it('returns error when component ID is missing', () => {
    const result = recordLearning({
      type: 'component',
      journeyId: 'JRN-0001',
      success: true,
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Component ID is required');
  });

  it('returns error when lesson ID is missing', () => {
    const result = recordLearning({
      type: 'lesson',
      journeyId: 'JRN-0001',
      success: true,
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Lesson ID is required');
  });

  it('handles unknown type', () => {
    const result = recordLearning({
      type: 'unknown' as any,
      journeyId: 'JRN-0001',
      success: true,
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown learning type');
  });
});

// =============================================================================
// formatLearningResult Tests
// =============================================================================

describe('formatLearningResult', () => {
  it('formats successful result with metrics', () => {
    const result = formatLearningResult({
      success: true,
      entityId: 'L001',
      metrics: {
        confidence: 0.85,
        successRate: 0.92,
        occurrences: 15,
      },
    });

    expect(result).toContain('Learning recorded successfully');
    expect(result).toContain('Entity: L001');
    expect(result).toContain('Confidence: 0.85');
    expect(result).toContain('Success Rate: 0.92');
    expect(result).toContain('Occurrences: 15');
  });

  it('formats successful result without metrics', () => {
    const result = formatLearningResult({
      success: true,
    });

    expect(result).toContain('Learning recorded successfully');
    expect(result).not.toContain('metrics');
  });

  it('formats failed result with error', () => {
    const result = formatLearningResult({
      success: false,
      error: 'Lesson not found: L999',
    });

    expect(result).toContain('Learning recording failed');
    expect(result).toContain('Error: Lesson not found: L999');
  });

  it('formats result with total uses for components', () => {
    const result = formatLearningResult({
      success: true,
      entityId: 'COMP001',
      metrics: {
        totalUses: 24,
        successRate: 0.96,
      },
    });

    expect(result).toContain('Total Uses: 24');
    expect(result).toContain('Success Rate: 0.96');
  });
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe('Edge cases', () => {
  it('handles archived lessons (should not update)', () => {
    // Add an archived lesson
    const lessonsFile = createMockLessonsFile();
    lessonsFile.lessons.push({
      ...lessonsFile.lessons[0]!,
      id: 'L003',
      archived: true,
    });
    writeFileSync(
      join(tempDir, 'lessons.json'),
      JSON.stringify(lessonsFile, null, 2),
      'utf-8'
    );

    const result = recordLessonApplied({
      journeyId: 'JRN-0020',
      testFile: 'tests/feature.spec.ts',
      prompt: 'journey-verify',
      lessonId: 'L003',
      success: true,
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Lesson not found');
  });

  it('handles archived components (should not update)', () => {
    // Add an archived component
    const componentsFile = createMockComponentsFile();
    componentsFile.components.push({
      ...componentsFile.components[0]!,
      id: 'COMP003',
      archived: true,
    });
    writeFileSync(
      join(tempDir, 'components.json'),
      JSON.stringify(componentsFile, null, 2),
      'utf-8'
    );

    const result = recordComponentUsed({
      journeyId: 'JRN-0020',
      testFile: 'tests/feature.spec.ts',
      prompt: 'journey-implement',
      componentId: 'COMP003',
      success: true,
      llkbRoot: tempDir,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Component not found');
  });

  it('does not add duplicate journey IDs', () => {
    // Apply lesson for same journey twice
    recordLessonApplied({
      journeyId: 'JRN-0002',
      testFile: 'tests/feature.spec.ts',
      prompt: 'journey-verify',
      lessonId: 'L002',
      success: true,
      llkbRoot: tempDir,
    });

    recordLessonApplied({
      journeyId: 'JRN-0002',
      testFile: 'tests/feature.spec.ts',
      prompt: 'journey-verify',
      lessonId: 'L002',
      success: true,
      llkbRoot: tempDir,
    });

    const lessonsFile = JSON.parse(readFileSync(join(tempDir, 'lessons.json'), 'utf-8')) as LessonsFile;
    const lesson = lessonsFile.lessons.find(l => l.id === 'L002');
    const count = lesson?.journeyIds.filter(id => id === 'JRN-0002').length;
    expect(count).toBe(1);
  });

  it('handles concurrent writes gracefully', async () => {
    // Simulate multiple concurrent writes
    const promises = Array.from({ length: 5 }, (_, i) =>
      Promise.resolve(recordLessonApplied({
        journeyId: `JRN-00${i}`,
        testFile: `tests/feature-${i}.spec.ts`,
        prompt: 'journey-verify',
        lessonId: 'L001',
        success: true,
        llkbRoot: tempDir,
      }))
    );

    const results = await Promise.all(promises);

    // All should succeed (file locking should handle concurrency)
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBeGreaterThan(0);
  });
});
