/**
 * Unit tests for LLKB Adapter Module
 *
 * Tests:
 * - Transform functions (lessons to patterns, components to modules)
 * - Export configuration generation
 * - Glossary generation
 * - Edge cases and error handling
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Transform functions
import {
  componentNameToTrigger,
  componentToGlossaryEntries,
  componentToModule,
  generateNameVariations,
  lessonToGlossaryEntries,
  lessonToPattern,
  lessonToSelectorOverride,
  lessonToTimingHint,
  triggerToRegex,
} from '../adapter-transforms.js';

// Main adapter
import { exportForAutogen, formatExportResult } from '../adapter.js';

// Types
import type { Component, ComponentsFile, Lesson, LessonsFile } from '../types.js';
import type { LLKBAdapterResult } from '../adapter-types.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 'L001',
    title: 'Test Lesson',
    pattern: 'Use data-testid="submit-btn" instead of CSS class',
    trigger: 'clicking the submit button',
    category: 'selector',
    scope: 'universal',
    journeyIds: ['J001'],
    metrics: {
      occurrences: 10,
      successRate: 0.9,
      confidence: 0.85,
      firstSeen: '2026-01-01T00:00:00Z',
      lastSuccess: '2026-01-20T00:00:00Z',
      lastApplied: '2026-01-20T00:00:00Z',
    },
    validation: {
      humanReviewed: false,
    },
    ...overrides,
  };
}

function createTestComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: 'COMP001',
    name: 'waitForAgGridLoad',
    description: 'Wait for AG Grid to finish loading',
    category: 'timing',
    scope: 'framework:ag-grid',
    filePath: 'artk-e2e/modules/ag-grid.ts',
    metrics: {
      totalUses: 15,
      successRate: 0.95,
      lastUsed: '2026-01-20T00:00:00Z',
    },
    source: {
      originalCode: 'await page.waitForSelector(".ag-root");',
      extractedFrom: 'J002',
      extractedBy: 'journey-implement',
      extractedAt: '2026-01-15T00:00:00Z',
    },
    ...overrides,
  };
}

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Type assertion helper to avoid non-null assertions
 */
function assertDefined<T>(value: T | undefined | null, message?: string): asserts value is T {
  expect(value).toBeDefined();
  if (value === undefined || value === null) {
    throw new Error(message || 'Expected value to be defined');
  }
}

// =============================================================================
// triggerToRegex Tests
// =============================================================================

describe('triggerToRegex', () => {
  it('converts simple trigger to regex', () => {
    const regex = triggerToRegex('clicking the submit button');
    expect(regex).not.toBeNull();
    expect(regex).toContain('clicking');
    expect(regex).toContain('submit');
    expect(regex).toContain('button');
  });

  it('escapes special regex characters', () => {
    const regex = triggerToRegex('use (click) method');
    expect(regex).not.toBeNull();
    // Should escape parentheses
    expect(regex).toContain('\\(');
    expect(regex).toContain('\\)');
  });

  it('handles flexible whitespace', () => {
    const regex = triggerToRegex('click the button');
    expect(regex).not.toBeNull();
    expect(regex).toContain('\\s+');
  });

  it('returns null for empty string', () => {
    const regex = triggerToRegex('');
    expect(regex).toBeNull();
  });

  it('returns null for whitespace only', () => {
    const regex = triggerToRegex('   ');
    expect(regex).toBeNull();
  });

  it('includes case-insensitive flag', () => {
    const regex = triggerToRegex('Click Button');
    expect(regex).not.toBeNull();
    expect(regex).toContain('(?i)');
  });
});

// =============================================================================
// componentNameToTrigger Tests
// =============================================================================

describe('componentNameToTrigger', () => {
  it('converts camelCase to trigger pattern', () => {
    const trigger = componentNameToTrigger('waitForPageLoad');
    expect(trigger).toContain('wait');
    expect(trigger).toContain('for');
    expect(trigger).toContain('page');
    expect(trigger).toContain('load');
  });

  it('handles AG Grid naming', () => {
    const trigger = componentNameToTrigger('waitForAgGridLoad');
    // Should convert "ag" to flexible ag-grid pattern
    expect(trigger).toContain('grid');
  });

  it('handles single word names', () => {
    const trigger = componentNameToTrigger('login');
    expect(trigger).toContain('login');
  });

  it('wraps in non-capturing group', () => {
    const trigger = componentNameToTrigger('clickButton');
    expect(trigger).toMatch(/^\(\?:/);
    expect(trigger).toMatch(/\)$/);
  });
});

// =============================================================================
// generateNameVariations Tests
// =============================================================================

describe('generateNameVariations', () => {
  it('generates basic form', () => {
    const variations = generateNameVariations('clickButton');
    expect(variations).toContain('click button');
  });

  it('generates "the" prefix form', () => {
    const variations = generateNameVariations('clickButton');
    expect(variations).toContain('the click button');
  });

  it('handles grid variations', () => {
    const variations = generateNameVariations('waitForGridLoad');
    expect(variations.some((v) => v.includes('ag-grid'))).toBe(true);
    expect(variations.some((v) => v.includes('ag grid'))).toBe(true);
  });

  it('handles wait for variations', () => {
    const variations = generateNameVariations('waitForDataToLoad');
    // Should include "data loads" and "data is loaded" forms
    expect(variations.length).toBeGreaterThan(2);
  });

  it('removes duplicates', () => {
    const variations = generateNameVariations('test');
    const uniqueCount = new Set(variations).size;
    expect(variations.length).toBe(uniqueCount);
  });
});

// =============================================================================
// lessonToPattern Tests
// =============================================================================

describe('lessonToPattern', () => {
  it('converts selector lesson to pattern', () => {
    const lesson = createTestLesson({ category: 'selector' });
    const pattern = lessonToPattern(lesson);

    expect(pattern).not.toBeNull();
    expect(pattern?.name).toBe('llkb-l001');
    expect(pattern?.primitiveType).toBe('click');
    expect(pattern?.source.lessonId).toBe('L001');
    expect(pattern?.source.confidence).toBe(0.85);
  });

  it('converts navigation lesson to navigate primitive', () => {
    const lesson = createTestLesson({
      category: 'navigation',
      trigger: 'navigating to dashboard',
    });
    const pattern = lessonToPattern(lesson);

    expect(pattern).not.toBeNull();
    expect(pattern?.primitiveType).toBe('navigate');
  });

  it('converts timing lesson to wait primitive', () => {
    const lesson = createTestLesson({
      category: 'timing',
      trigger: 'waiting for animation',
    });
    const pattern = lessonToPattern(lesson);

    expect(pattern).not.toBeNull();
    expect(pattern?.primitiveType).toBe('wait');
  });

  it('returns null for quirk category', () => {
    const lesson = createTestLesson({ category: 'quirk' });
    const pattern = lessonToPattern(lesson);
    expect(pattern).toBeNull();
  });

  it('returns null for low confidence', () => {
    const lesson = createTestLesson({
      metrics: {
        ...createTestLesson().metrics,
        confidence: 0.3,
      },
    });
    const pattern = lessonToPattern(lesson);
    expect(pattern).toBeNull();
  });
});

// =============================================================================
// lessonToSelectorOverride Tests
// =============================================================================

describe('lessonToSelectorOverride', () => {
  it('extracts testid selector', () => {
    const lesson = createTestLesson({
      pattern: 'Use data-testid="submit-btn" instead of CSS class',
    });
    const override = lessonToSelectorOverride(lesson);

    expect(override).not.toBeNull();
    expect(override?.override.strategy).toBe('testid');
    expect(override?.override.value).toBe('submit-btn');
    expect(override?.pattern).toBe('clicking the submit button');
  });

  it('extracts role selector', () => {
    const lesson = createTestLesson({
      pattern: 'Use role="button" for better accessibility',
    });
    const override = lessonToSelectorOverride(lesson);

    expect(override).not.toBeNull();
    expect(override?.override.strategy).toBe('role');
    expect(override?.override.value).toBe('button');
  });

  it('extracts aria-label selector', () => {
    const lesson = createTestLesson({
      pattern: 'Use aria-label="Close dialog" for the X button',
    });
    const override = lessonToSelectorOverride(lesson);

    expect(override).not.toBeNull();
    expect(override?.override.strategy).toBe('label');
    expect(override?.override.value).toBe('Close');
  });

  it('returns null for non-selector category', () => {
    const lesson = createTestLesson({ category: 'timing' });
    const override = lessonToSelectorOverride(lesson);
    expect(override).toBeNull();
  });

  it('returns null when no selector can be extracted', () => {
    const lesson = createTestLesson({
      pattern: 'Wait for the element to be visible',
    });
    const override = lessonToSelectorOverride(lesson);
    expect(override).toBeNull();
  });
});

// =============================================================================
// lessonToTimingHint Tests
// =============================================================================

describe('lessonToTimingHint', () => {
  it('extracts explicit wait time', () => {
    const lesson = createTestLesson({
      category: 'timing',
      trigger: 'after modal opens',
      pattern: 'Wait for 500ms after modal animation',
    });
    const hint = lessonToTimingHint(lesson);

    expect(hint).not.toBeNull();
    expect(hint?.waitMs).toBe(500);
    expect(hint?.trigger).toBe('after modal opens');
  });

  it('extracts timeout value', () => {
    const lesson = createTestLesson({
      category: 'timing',
      pattern: 'Use timeout of 2000 milliseconds for slow API',
    });
    const hint = lessonToTimingHint(lesson);

    expect(hint).not.toBeNull();
    expect(hint?.waitMs).toBe(2000);
  });

  it('infers animation timing', () => {
    const lesson = createTestLesson({
      category: 'timing',
      pattern: 'Wait for the animation to complete',
    });
    const hint = lessonToTimingHint(lesson);

    expect(hint).not.toBeNull();
    expect(hint?.waitMs).toBe(300);
  });

  it('infers load timing', () => {
    const lesson = createTestLesson({
      category: 'timing',
      pattern: 'Wait for page to fully load',
    });
    const hint = lessonToTimingHint(lesson);

    expect(hint).not.toBeNull();
    expect(hint?.waitMs).toBe(1000);
  });

  it('infers network timing', () => {
    const lesson = createTestLesson({
      category: 'timing',
      pattern: 'Wait for network request to complete',
    });
    const hint = lessonToTimingHint(lesson);

    expect(hint).not.toBeNull();
    expect(hint?.waitMs).toBe(2000);
  });

  it('returns null for non-timing category', () => {
    const lesson = createTestLesson({ category: 'selector' });
    const hint = lessonToTimingHint(lesson);
    expect(hint).toBeNull();
  });

  it('returns null when timing cannot be determined', () => {
    const lesson = createTestLesson({
      category: 'timing',
      pattern: 'Check the element state',
    });
    const hint = lessonToTimingHint(lesson);
    expect(hint).toBeNull();
  });
});

// =============================================================================
// componentToModule Tests
// =============================================================================

describe('componentToModule', () => {
  it('creates module mapping from component', () => {
    const component = createTestComponent();
    const module = componentToModule(component);

    expect(module.name).toBe('waitForAgGridLoad');
    expect(module.componentId).toBe('COMP001');
    expect(module.importPath).toBe('artk-e2e/modules/ag-grid.ts');
    expect(module.confidence).toBe(0.95);
  });

  it('generates trigger pattern from name', () => {
    const component = createTestComponent({ name: 'clickSaveButton' });
    const module = componentToModule(component);

    expect(module.trigger).toContain('click');
    expect(module.trigger).toContain('save');
    expect(module.trigger).toContain('button');
  });
});

// =============================================================================
// componentToGlossaryEntries Tests
// =============================================================================

describe('componentToGlossaryEntries', () => {
  it('creates multiple glossary entries', () => {
    const component = createTestComponent();
    const entries = componentToGlossaryEntries(component);

    expect(entries.length).toBeGreaterThan(1);
  });

  it('all entries reference the same component', () => {
    const component = createTestComponent();
    const entries = componentToGlossaryEntries(component);

    for (const entry of entries) {
      expect(entry.sourceId).toBe('COMP001');
      expect(entry.confidence).toBe(0.95);
    }
  });

  it('uses callModule primitive type', () => {
    const component = createTestComponent();
    const entries = componentToGlossaryEntries(component);

    for (const entry of entries) {
      expect(entry.primitive.type).toBe('callModule');
    }
  });

  it('infers module from category', () => {
    const component = createTestComponent({ category: 'auth' });
    const entries = componentToGlossaryEntries(component);

    expect(entries[0]?.primitive.module).toBe('auth');
  });

  it('sets method to component name', () => {
    const component = createTestComponent({ name: 'loginUser' });
    const entries = componentToGlossaryEntries(component);

    expect(entries[0]?.primitive.method).toBe('loginUser');
  });
});

// =============================================================================
// lessonToGlossaryEntries Tests
// =============================================================================

describe('lessonToGlossaryEntries', () => {
  it('creates glossary entry for navigation lesson', () => {
    const lesson = createTestLesson({
      category: 'navigation',
      trigger: 'go to dashboard',
    });
    const entries = lessonToGlossaryEntries(lesson);

    expect(entries.length).toBe(1);
    expect(entries[0]?.phrase).toBe('go to dashboard');
    expect(entries[0]?.primitive.type).toBe('navigate');
  });

  it('creates glossary entry for ui-interaction lesson', () => {
    const lesson = createTestLesson({
      category: 'ui-interaction',
      trigger: 'click the save button',
    });
    const entries = lessonToGlossaryEntries(lesson);

    expect(entries.length).toBe(1);
    expect(entries[0]?.primitive.type).toBe('click');
  });

  it('creates glossary entry for assertion lesson', () => {
    const lesson = createTestLesson({
      category: 'assertion',
      trigger: 'verify success message',
    });
    const entries = lessonToGlossaryEntries(lesson);

    expect(entries.length).toBe(1);
    expect(entries[0]?.primitive.type).toBe('assert');
  });

  it('returns empty for selector category', () => {
    const lesson = createTestLesson({ category: 'selector' });
    const entries = lessonToGlossaryEntries(lesson);
    expect(entries).toEqual([]);
  });

  it('returns empty for timing category', () => {
    const lesson = createTestLesson({ category: 'timing' });
    const entries = lessonToGlossaryEntries(lesson);
    expect(entries).toEqual([]);
  });

  it('returns empty for empty trigger', () => {
    const lesson = createTestLesson({
      category: 'navigation',
      trigger: '',
    });
    const entries = lessonToGlossaryEntries(lesson);
    expect(entries).toEqual([]);
  });
});

// =============================================================================
// exportForAutogen Tests
// =============================================================================

describe('exportForAutogen', () => {
  let testDir: string;
  let llkbRoot: string;
  let outputDir: string;

  beforeEach(() => {
    // Create temp directories
    testDir = join(tmpdir(), `llkb-adapter-test-${Date.now()}`);
    llkbRoot = join(testDir, '.artk', 'llkb');
    outputDir = join(testDir, 'output');

    mkdirSync(llkbRoot, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  function setupLLKB(lessons: Lesson[] = [], components: Component[] = []): void {
    // Write config.yml
    writeFileSync(
      join(llkbRoot, 'config.yml'),
      'version: "1.0.0"\nenabled: true\n',
      'utf-8'
    );

    // Write lessons.json
    const lessonsFile: LessonsFile = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      lessons,
      archived: [],
      globalRules: [],
      appQuirks: [],
    };
    writeFileSync(join(llkbRoot, 'lessons.json'), JSON.stringify(lessonsFile, null, 2), 'utf-8');

    // Write components.json
    const componentsFile: ComponentsFile = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      components,
      componentsByCategory: {
        selector: [],
        timing: [],
        auth: [],
        data: [],
        assertion: [],
        navigation: [],
        'ui-interaction': [],
      },
      componentsByScope: {
        universal: [],
        'framework:angular': [],
        'framework:react': [],
        'framework:vue': [],
        'framework:ag-grid': [],
        'app-specific': [],
      },
    };
    writeFileSync(
      join(llkbRoot, 'components.json'),
      JSON.stringify(componentsFile, null, 2),
      'utf-8'
    );
  }

  it('returns warning when LLKB does not exist', async () => {
    const result = await exportForAutogen({
      llkbRoot: join(testDir, 'nonexistent'),
      outputDir,
    });

    expect(result.configPath).toBeNull();
    expect(result.glossaryPath).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('LLKB not found');
  });

  it('returns warning when LLKB is disabled', async () => {
    mkdirSync(join(testDir, 'disabled', '.artk', 'llkb'), { recursive: true });
    writeFileSync(
      join(testDir, 'disabled', '.artk', 'llkb', 'config.yml'),
      'version: "1.0.0"\nenabled: false\n',
      'utf-8'
    );

    const result = await exportForAutogen({
      llkbRoot: join(testDir, 'disabled', '.artk', 'llkb'),
      outputDir,
    });

    expect(result.configPath).toBeNull();
    expect(result.warnings.some((w) => w.includes('disabled'))).toBe(true);
  });

  it('exports empty LLKB with warning', async () => {
    setupLLKB([], []);

    const result = await exportForAutogen({
      llkbRoot,
      outputDir,
    });

    expect(result.stats.patternsExported).toBe(0);
    expect(result.stats.modulesExported).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('exports lessons as patterns', async () => {
    const lessons = [
      createTestLesson({ id: 'L001', category: 'selector' }),
      createTestLesson({ id: 'L002', category: 'timing' }),
    ];
    setupLLKB(lessons, []);

    const result = await exportForAutogen({
      llkbRoot,
      outputDir,
      minConfidence: 0.5,
    });

    expect(result.stats.patternsExported).toBeGreaterThan(0);
    expect(result.configPath).not.toBeNull();
  });

  it('exports components as modules', async () => {
    const components = [createTestComponent()];
    setupLLKB([], components);

    const result = await exportForAutogen({
      llkbRoot,
      outputDir,
      minConfidence: 0.5,
    });

    expect(result.stats.modulesExported).toBe(1);
  });

  it('generates YAML config file by default', async () => {
    setupLLKB([createTestLesson()], [createTestComponent()]);

    const result = await exportForAutogen({
      llkbRoot,
      outputDir,
      minConfidence: 0.5,
    });

    expect(result.configPath).not.toBeNull();
    expect(result.configPath).toContain('.yml');
    assertDefined(result.configPath, 'Expected configPath to be defined');
    expect(existsSync(result.configPath)).toBe(true);

    const content = readFileSync(result.configPath, 'utf-8');
    expect(content).toContain('version:');
    expect(content).toContain('additionalPatterns:');
  });

  it('generates JSON config file when specified', async () => {
    setupLLKB([createTestLesson()], [createTestComponent()]);

    const result = await exportForAutogen({
      llkbRoot,
      outputDir,
      minConfidence: 0.5,
      configFormat: 'json',
    });

    expect(result.configPath).not.toBeNull();
    expect(result.configPath).toContain('.json');
    assertDefined(result.configPath, 'Expected configPath to be defined');
    expect(existsSync(result.configPath)).toBe(true);

    const content = readFileSync(result.configPath, 'utf-8');
    const parsed = JSON.parse(content) as { version: number };
    expect(parsed.version).toBe(1);
  });

  it('generates glossary file', async () => {
    setupLLKB([], [createTestComponent()]);

    const result = await exportForAutogen({
      llkbRoot,
      outputDir,
      minConfidence: 0.5,
      generateGlossary: true,
    });

    expect(result.glossaryPath).not.toBeNull();
    assertDefined(result.glossaryPath, 'Expected glossaryPath to be defined');
    expect(existsSync(result.glossaryPath)).toBe(true);

    const content = readFileSync(result.glossaryPath, 'utf-8');
    expect(content).toContain('llkbGlossary');
    expect(content).toContain('IRPrimitive');
  });

  it('skips glossary when generateGlossary is false', async () => {
    setupLLKB([], [createTestComponent()]);

    const result = await exportForAutogen({
      llkbRoot,
      outputDir,
      minConfidence: 0.5,
      generateGlossary: false,
    });

    expect(result.glossaryPath).toBeNull();
  });

  it('respects minConfidence filter', async () => {
    const lessons = [
      createTestLesson({
        id: 'HIGH',
        metrics: { ...createTestLesson().metrics, confidence: 0.9 },
      }),
      createTestLesson({
        id: 'LOW',
        metrics: { ...createTestLesson().metrics, confidence: 0.3 },
      }),
    ];
    setupLLKB(lessons, []);

    const result = await exportForAutogen({
      llkbRoot,
      outputDir,
      minConfidence: 0.7,
    });

    expect(result.stats.lessonsSkipped).toBe(1);
  });

  it('tracks export timestamp', async () => {
    setupLLKB([createTestLesson()], []);

    const before = new Date().toISOString();
    const result = await exportForAutogen({
      llkbRoot,
      outputDir,
      minConfidence: 0.5,
    });
    const after = new Date().toISOString();

    expect(result.exportedAt).toBeDefined();
    expect(result.exportedAt >= before).toBe(true);
    expect(result.exportedAt <= after).toBe(true);
  });
});

// =============================================================================
// formatExportResult Tests
// =============================================================================

describe('formatExportResult', () => {
  it('formats successful export', () => {
    const result: LLKBAdapterResult = {
      configPath: '/output/autogen-llkb.config.yml',
      glossaryPath: '/output/llkb-glossary.ts',
      stats: {
        patternsExported: 5,
        selectorsExported: 3,
        timingHintsExported: 2,
        modulesExported: 4,
        glossaryEntriesExported: 10,
        lessonsSkipped: 1,
        componentsSkipped: 0,
      },
      warnings: [],
      exportedAt: '2026-01-23T10:00:00Z',
    };

    const output = formatExportResult(result);

    expect(output).toContain('LLKB Export for AutoGen');
    expect(output).toContain('Exported patterns: 5');
    expect(output).toContain('Exported modules: 4');
    expect(output).toContain('/output/autogen-llkb.config.yml');
    expect(output).toContain('/output/llkb-glossary.ts');
  });

  it('includes warnings in output', () => {
    const result: LLKBAdapterResult = {
      configPath: null,
      glossaryPath: null,
      stats: {
        patternsExported: 0,
        selectorsExported: 0,
        timingHintsExported: 0,
        modulesExported: 0,
        glossaryEntriesExported: 0,
        lessonsSkipped: 0,
        componentsSkipped: 0,
      },
      warnings: ['LLKB not found'],
      exportedAt: '2026-01-23T10:00:00Z',
    };

    const output = formatExportResult(result);

    expect(output).toContain('Warnings:');
    expect(output).toContain('LLKB not found');
  });

  it('shows skipped items', () => {
    const result: LLKBAdapterResult = {
      configPath: '/output/config.yml',
      glossaryPath: null,
      stats: {
        patternsExported: 1,
        selectorsExported: 0,
        timingHintsExported: 0,
        modulesExported: 0,
        glossaryEntriesExported: 0,
        lessonsSkipped: 5,
        componentsSkipped: 3,
      },
      warnings: [],
      exportedAt: '2026-01-23T10:00:00Z',
    };

    const output = formatExportResult(result);

    expect(output).toContain('Skipped (low confidence)');
    expect(output).toContain('Lessons: 5');
    expect(output).toContain('Components: 3');
  });
});
