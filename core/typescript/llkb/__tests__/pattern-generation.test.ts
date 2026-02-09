/**
 * Pattern Generation Module Tests
 *
 * Tests for the LLKB pattern generation module that creates patterns
 * from discovered app profiles and selector signals.
 *
 * @module llkb/__tests__/pattern-generation.test.ts
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  AUTH_PATTERN_TEMPLATES,
  createDiscoveredPatternsFile,
  deduplicatePatterns,
  type DiscoveredPattern,
  type DiscoveredPatternsFile,
  generatePatterns,
  type LearnedPattern,
  loadDiscoveredPatterns,
  mergeDiscoveredPatterns,
  NAVIGATION_PATTERN_TEMPLATES,
  resetPatternIdCounter,
  saveDiscoveredPatterns,
  UI_LIBRARY_PATTERNS,
} from '../pattern-generation.js';

import type { AuthHints, DiscoveredProfile, SelectorSignals } from '../discovery.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockProfile(overrides: Partial<DiscoveredProfile> = {}): DiscoveredProfile {
  return {
    version: '1.0',
    generatedAt: '2026-02-05T10:00:00Z',
    projectRoot: '/test/project',
    frameworks: [],
    uiLibraries: [],
    selectorSignals: {
      primaryAttribute: 'data-testid',
      namingConvention: 'kebab-case',
      coverage: {
        'data-testid': 0.5,
        'role': 0.3,
        'aria-label': 0.2,
      },
      totalComponentsAnalyzed: 18,
      sampleSelectors: ['login-button', 'submit-form'],
    },
    auth: {
      detected: false,
    },
    runtime: {
      validated: false,
      scanUrl: null,
      domSampleCount: 0,
    },
    ...overrides,
  };
}

function createMockSignals(overrides: Partial<SelectorSignals> = {}): SelectorSignals {
  return {
    primaryAttribute: 'data-testid',
    namingConvention: 'kebab-case',
    coverage: {
      'data-testid': 0.5,
      'data-cy': 0,
      'data-test': 0,
      'role': 0.3,
      'aria-label': 0.2,
    },
    totalComponentsAnalyzed: 18,
    sampleSelectors: ['login-button', 'submit-form', 'user-menu'],
    ...overrides,
  };
}

function createMockAuth(overrides: Partial<AuthHints> = {}): AuthHints {
  return {
    detected: true,
    type: 'oidc',
    loginRoute: '/login',
    bypassAvailable: false,
    selectors: {
      usernameField: 'input[data-testid="username"]',
      passwordField: 'input[data-testid="password"]',
      submitButton: 'button[data-testid="login-submit"]',
    },
    ...overrides,
  };
}

function createMockDiscoveredPattern(overrides: Partial<DiscoveredPattern> = {}): DiscoveredPattern {
  return {
    id: 'DP-test1234',
    normalizedText: 'click login button',
    originalText: 'Click login button',
    mappedPrimitive: 'click',
    selectorHints: [],
    confidence: 0.8,
    layer: 'app-specific',
    category: 'auth',
    sourceJourneys: [],
    successCount: 0,
    failCount: 0,
    ...overrides,
  };
}

function createMockLearnedPattern(overrides: Partial<LearnedPattern> = {}): LearnedPattern {
  return {
    normalizedText: 'click submit button',
    originalText: 'Click submit button',
    irPrimitive: 'click',
    confidence: 0.9,
    successCount: 5,
    failCount: 0,
    sourceJourneys: ['JRN-001'],
    lastUpdated: '2026-02-05T10:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// generatePatterns Tests
// =============================================================================

describe('generatePatterns', () => {
  it('should return empty array when no auth and no UI libraries', () => {
    const profile = createMockProfile();
    const signals = createMockSignals();

    const patterns = generatePatterns(profile, signals);

    // Should only have navigation patterns
    expect(patterns.length).toBe(NAVIGATION_PATTERN_TEMPLATES.length);
    expect(patterns.every(p => p.category === 'navigation')).toBe(true);
  });

  it('should generate auth patterns when auth is detected', () => {
    const profile = createMockProfile({
      auth: createMockAuth(),
    });
    const signals = createMockSignals();

    const patterns = generatePatterns(profile, signals);

    const authPatterns = patterns.filter(p => p.category === 'auth');
    expect(authPatterns.length).toBe(AUTH_PATTERN_TEMPLATES.length);
  });

  it('should assign high confidence to auth patterns with selectors', () => {
    const profile = createMockProfile({
      auth: createMockAuth({
        selectors: {
          submitButton: 'button[data-testid="login"]',
        },
      }),
    });
    const signals = createMockSignals();

    const patterns = generatePatterns(profile, signals);
    const loginPattern = patterns.find(p => p.normalizedText === 'click login button');

    expect(loginPattern).toBeDefined();
    expect(loginPattern!.confidence).toBe(0.85); // HIGH_CONFIDENCE_AUTH
  });

  it('should assign medium confidence to auth patterns without selectors', () => {
    const profile = createMockProfile({
      auth: createMockAuth({
        selectors: {},
      }),
    });
    const signals = createMockSignals();

    const patterns = generatePatterns(profile, signals);
    const loginPattern = patterns.find(p => p.normalizedText === 'click login button');

    expect(loginPattern).toBeDefined();
    expect(loginPattern!.confidence).toBe(0.70); // MEDIUM_CONFIDENCE_AUTH
  });

  it('should generate UI library patterns when detected', () => {
    const profile = createMockProfile({
      uiLibraries: [
        { name: 'mui', confidence: 0.9, evidence: [] },
      ],
    });
    const signals = createMockSignals();

    const patterns = generatePatterns(profile, signals);

    const muiPatterns = patterns.filter(p => p.normalizedText.includes('mui'));
    expect(muiPatterns.length).toBe(UI_LIBRARY_PATTERNS['mui'].length);
  });

  it('should cap UI pattern confidence at MAX_UI_PATTERN_CONFIDENCE', () => {
    const profile = createMockProfile({
      uiLibraries: [
        { name: 'mui', confidence: 0.99, evidence: [] },
      ],
    });
    const signals = createMockSignals();

    const patterns = generatePatterns(profile, signals);
    const muiPatterns = patterns.filter(p => p.normalizedText.includes('mui'));

    expect(muiPatterns.every(p => p.confidence <= 0.75)).toBe(true);
  });

  it('should generate patterns for multiple UI libraries', () => {
    const profile = createMockProfile({
      uiLibraries: [
        { name: 'mui', confidence: 0.8, evidence: [] },
        { name: 'ag-grid', confidence: 0.9, evidence: [] },
      ],
    });
    const signals = createMockSignals();

    const patterns = generatePatterns(profile, signals);

    const muiPatterns = patterns.filter(p => p.normalizedText.includes('mui'));
    const agGridPatterns = patterns.filter(p => p.normalizedText.includes('ag grid'));

    expect(muiPatterns.length).toBe(UI_LIBRARY_PATTERNS['mui'].length);
    expect(agGridPatterns.length).toBe(UI_LIBRARY_PATTERNS['ag-grid'].length);
  });

  it('should generate unique pattern IDs', () => {
    const profile = createMockProfile({
      auth: createMockAuth(),
      uiLibraries: [
        { name: 'mui', confidence: 0.8, evidence: [] },
      ],
    });
    const signals = createMockSignals();

    const patterns = generatePatterns(profile, signals);
    const ids = patterns.map(p => p.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should set correct template source for auth patterns', () => {
    const profile = createMockProfile({
      auth: createMockAuth(),
    });
    const signals = createMockSignals();

    const patterns = generatePatterns(profile, signals);
    const authPatterns = patterns.filter(p => p.category === 'auth');

    expect(authPatterns.every(p => p.templateSource === 'auth')).toBe(true);
  });

  it('should set correct template source for navigation patterns', () => {
    const profile = createMockProfile();
    const signals = createMockSignals();

    const patterns = generatePatterns(profile, signals);
    const navPatterns = patterns.filter(p => p.category === 'navigation');

    expect(navPatterns.every(p => p.templateSource === 'navigation')).toBe(true);
  });

  it('should include selector hints in auth patterns with known selectors', () => {
    const profile = createMockProfile({
      auth: createMockAuth({
        selectors: {
          usernameField: 'input[data-testid="email"]',
        },
      }),
    });
    const signals = createMockSignals();

    const patterns = generatePatterns(profile, signals);
    const usernamePattern = patterns.find(p => p.normalizedText === 'enter username');

    expect(usernamePattern).toBeDefined();
    expect(usernamePattern!.selectorHints.length).toBeGreaterThan(0);
    expect(usernamePattern!.selectorHints[0].value).toBe('input[data-testid="email"]');
  });

  it('should set layer to app-specific for auth and navigation patterns', () => {
    const profile = createMockProfile({
      auth: createMockAuth(),
    });
    const signals = createMockSignals();

    const patterns = generatePatterns(profile, signals);
    const appSpecific = patterns.filter(p =>
      p.category === 'auth' || p.category === 'navigation'
    );

    expect(appSpecific.every(p => p.layer === 'app-specific')).toBe(true);
  });

  it('should set layer to framework for UI library patterns', () => {
    const profile = createMockProfile({
      uiLibraries: [
        { name: 'antd', confidence: 0.8, evidence: [] },
      ],
    });
    const signals = createMockSignals();

    const patterns = generatePatterns(profile, signals);
    const uiPatterns = patterns.filter(p => p.category === 'ui-interaction');

    expect(uiPatterns.every(p => p.layer === 'framework')).toBe(true);
  });
});

// =============================================================================
// mergeDiscoveredPatterns Tests
// =============================================================================

describe('mergeDiscoveredPatterns', () => {
  it('should return copy of existing when discovered is empty', () => {
    const existing: LearnedPattern[] = [createMockLearnedPattern()];
    const discovered: DiscoveredPattern[] = [];

    const merged = mergeDiscoveredPatterns(existing, discovered);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual(existing[0]);
    // Verify it's a copy, not the same reference
    expect(merged).not.toBe(existing);
  });

  it('should add new patterns when no overlap', () => {
    const existing: LearnedPattern[] = [
      createMockLearnedPattern({ normalizedText: 'existing pattern' }),
    ];
    const discovered: DiscoveredPattern[] = [
      createMockDiscoveredPattern({ normalizedText: 'new pattern' }),
    ];

    const merged = mergeDiscoveredPatterns(existing, discovered);

    expect(merged).toHaveLength(2);
    expect(merged.find(p => p.normalizedText === 'existing pattern')).toBeDefined();
    expect(merged.find(p => p.normalizedText === 'new pattern')).toBeDefined();
  });

  it('should NOT modify existing patterns when duplicates found (non-destructive)', () => {
    const existing: LearnedPattern[] = [
      createMockLearnedPattern({
        normalizedText: 'click login button',
        irPrimitive: 'click',
        confidence: 0.95,
        successCount: 10,
      }),
    ];
    const discovered: DiscoveredPattern[] = [
      createMockDiscoveredPattern({
        normalizedText: 'click login button',
        mappedPrimitive: 'click',
        confidence: 0.5, // Lower confidence
        successCount: 0,
      }),
    ];

    const merged = mergeDiscoveredPatterns(existing, discovered);

    expect(merged).toHaveLength(1);
    // Existing pattern should be UNCHANGED
    expect(merged[0].confidence).toBe(0.95);
    expect(merged[0].successCount).toBe(10);
  });

  it('should be case-insensitive when detecting duplicates', () => {
    const existing: LearnedPattern[] = [
      createMockLearnedPattern({ normalizedText: 'Click Login Button', irPrimitive: 'click' }),
    ];
    const discovered: DiscoveredPattern[] = [
      createMockDiscoveredPattern({ normalizedText: 'click login button', mappedPrimitive: 'click' }),
    ];

    const merged = mergeDiscoveredPatterns(existing, discovered);

    expect(merged).toHaveLength(1); // Should recognize as duplicate
  });

  it('should treat different primitives as different patterns', () => {
    const existing: LearnedPattern[] = [
      createMockLearnedPattern({ normalizedText: 'login button', irPrimitive: 'click' }),
    ];
    const discovered: DiscoveredPattern[] = [
      createMockDiscoveredPattern({ normalizedText: 'login button', mappedPrimitive: 'assert' }),
    ];

    const merged = mergeDiscoveredPatterns(existing, discovered);

    expect(merged).toHaveLength(2); // Different primitives = different patterns
  });

  it('should preserve all fields when adding new patterns', () => {
    const existing: LearnedPattern[] = [];
    const discovered: DiscoveredPattern[] = [
      createMockDiscoveredPattern({
        normalizedText: 'test pattern',
        originalText: 'Test Pattern',
        mappedPrimitive: 'fill',
        confidence: 0.75,
        successCount: 3,
        failCount: 1,
        sourceJourneys: ['JRN-001', 'JRN-002'],
      }),
    ];

    const merged = mergeDiscoveredPatterns(existing, discovered);

    expect(merged).toHaveLength(1);
    const added = merged[0];
    expect(added.normalizedText).toBe('test pattern');
    expect(added.originalText).toBe('Test Pattern');
    expect(added.irPrimitive).toBe('fill');
    expect(added.confidence).toBe(0.75);
    expect(added.successCount).toBe(3);
    expect(added.failCount).toBe(1);
    expect(added.sourceJourneys).toEqual(['JRN-001', 'JRN-002']);
    expect(added.lastUpdated).toBeDefined();
  });

  it('should handle large arrays efficiently (O(n+m) complexity)', () => {
    // Create 1000 existing patterns
    const existing: LearnedPattern[] = Array.from({ length: 1000 }, (_, i) =>
      createMockLearnedPattern({
        normalizedText: `existing pattern ${i}`,
        irPrimitive: 'click',
      })
    );

    // Create 1000 discovered patterns (500 new, 500 duplicates)
    const discovered: DiscoveredPattern[] = Array.from({ length: 1000 }, (_, i) =>
      createMockDiscoveredPattern({
        normalizedText: i < 500 ? `existing pattern ${i}` : `new pattern ${i}`,
        mappedPrimitive: 'click',
      })
    );

    const startTime = Date.now();
    const merged = mergeDiscoveredPatterns(existing, discovered);
    const endTime = Date.now();

    // Should complete quickly (under 100ms for 2000 patterns)
    expect(endTime - startTime).toBeLessThan(100);
    // Should have 1000 existing + 500 new = 1500
    expect(merged).toHaveLength(1500);
  });

  it('should not mutate original arrays', () => {
    const existing: LearnedPattern[] = [createMockLearnedPattern()];
    const discovered: DiscoveredPattern[] = [
      createMockDiscoveredPattern({ normalizedText: 'new one' }),
    ];

    const originalExistingLength = existing.length;
    const originalDiscoveredLength = discovered.length;

    mergeDiscoveredPatterns(existing, discovered);

    expect(existing.length).toBe(originalExistingLength);
    expect(discovered.length).toBe(originalDiscoveredLength);
  });
});

// =============================================================================
// createDiscoveredPatternsFile Tests
// =============================================================================

describe('createDiscoveredPatternsFile', () => {
  it('should create valid file structure', () => {
    const patterns: DiscoveredPattern[] = [
      createMockDiscoveredPattern({ category: 'auth', templateSource: 'auth' }),
    ];
    const profile = createMockProfile();

    const file = createDiscoveredPatternsFile(patterns, profile);

    expect(file.version).toBe('1.0');
    expect(file.source).toBe('discover-foundation:F12');
    expect(file.generatedAt).toBeDefined();
    expect(file.patterns).toBe(patterns);
    expect(file.metadata).toBeDefined();
  });

  it('should calculate category counts correctly', () => {
    const patterns: DiscoveredPattern[] = [
      createMockDiscoveredPattern({ category: 'auth' }),
      createMockDiscoveredPattern({ category: 'auth' }),
      createMockDiscoveredPattern({ category: 'navigation' }),
    ];
    const profile = createMockProfile();

    const file = createDiscoveredPatternsFile(patterns, profile);

    expect(file.metadata.byCategory['auth']).toBe(2);
    expect(file.metadata.byCategory['navigation']).toBe(1);
  });

  it('should calculate template source counts correctly', () => {
    const patterns: DiscoveredPattern[] = [
      createMockDiscoveredPattern({ templateSource: 'auth' }),
      createMockDiscoveredPattern({ templateSource: 'auth' }),
      createMockDiscoveredPattern({ templateSource: 'navigation' }),
      createMockDiscoveredPattern({ templateSource: 'crud' }),
    ];
    const profile = createMockProfile();

    const file = createDiscoveredPatternsFile(patterns, profile);

    expect(file.metadata.byTemplate['auth']).toBe(2);
    expect(file.metadata.byTemplate['navigation']).toBe(1);
    expect(file.metadata.byTemplate['crud']).toBe(1);
  });

  it('should calculate average confidence correctly', () => {
    const patterns: DiscoveredPattern[] = [
      createMockDiscoveredPattern({ confidence: 0.8 }),
      createMockDiscoveredPattern({ confidence: 0.6 }),
      createMockDiscoveredPattern({ confidence: 0.7 }),
    ];
    const profile = createMockProfile();

    const file = createDiscoveredPatternsFile(patterns, profile);

    // Average: (0.8 + 0.6 + 0.7) / 3 = 0.7
    expect(file.metadata.averageConfidence).toBe(0.7);
  });

  it('should handle empty patterns array', () => {
    const patterns: DiscoveredPattern[] = [];
    const profile = createMockProfile();

    const file = createDiscoveredPatternsFile(patterns, profile);

    expect(file.metadata.totalPatterns).toBe(0);
    expect(file.metadata.averageConfidence).toBe(0);
    expect(file.metadata.byCategory).toEqual({});
    expect(file.metadata.byTemplate).toEqual({});
  });

  it('should include framework and UI library names from profile', () => {
    const profile = createMockProfile({
      frameworks: [
        { name: 'react', version: '18.0.0', confidence: 0.95, evidence: [] },
        { name: 'next', version: '14.0.0', confidence: 0.9, evidence: [] },
      ],
      uiLibraries: [
        { name: 'mui', confidence: 0.85, evidence: [] },
      ],
    });
    const patterns: DiscoveredPattern[] = [];

    const file = createDiscoveredPatternsFile(patterns, profile);

    expect(file.metadata.frameworks).toEqual(['react', 'next']);
    expect(file.metadata.uiLibraries).toEqual(['mui']);
  });

  it('should include discovery duration when provided', () => {
    const patterns: DiscoveredPattern[] = [];
    const profile = createMockProfile();

    const file = createDiscoveredPatternsFile(patterns, profile, 1234);

    expect(file.metadata.discoveryDuration).toBe(1234);
  });

  it('should leave discoveryDuration undefined when not provided', () => {
    const patterns: DiscoveredPattern[] = [];
    const profile = createMockProfile();

    const file = createDiscoveredPatternsFile(patterns, profile);

    expect(file.metadata.discoveryDuration).toBeUndefined();
  });
});

// =============================================================================
// deduplicatePatterns Tests
// =============================================================================

describe('deduplicatePatterns', () => {
  it('should return same array when no duplicates', () => {
    const patterns: DiscoveredPattern[] = [
      createMockDiscoveredPattern({ normalizedText: 'pattern one', mappedPrimitive: 'click' }),
      createMockDiscoveredPattern({ normalizedText: 'pattern two', mappedPrimitive: 'click' }),
    ];

    const result = deduplicatePatterns(patterns);

    expect(result).toHaveLength(2);
  });

  it('should remove duplicates with same text and primitive', () => {
    const patterns: DiscoveredPattern[] = [
      createMockDiscoveredPattern({ normalizedText: 'click button', mappedPrimitive: 'click' }),
      createMockDiscoveredPattern({ normalizedText: 'click button', mappedPrimitive: 'click' }),
    ];

    const result = deduplicatePatterns(patterns);

    expect(result).toHaveLength(1);
  });

  it('should keep pattern with higher confidence', () => {
    const patterns: DiscoveredPattern[] = [
      createMockDiscoveredPattern({
        normalizedText: 'click button',
        mappedPrimitive: 'click',
        confidence: 0.5,
      }),
      createMockDiscoveredPattern({
        normalizedText: 'click button',
        mappedPrimitive: 'click',
        confidence: 0.9,
      }),
    ];

    const result = deduplicatePatterns(patterns);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.9);
  });

  it('should be case-insensitive', () => {
    const patterns: DiscoveredPattern[] = [
      createMockDiscoveredPattern({ normalizedText: 'Click Button', mappedPrimitive: 'click' }),
      createMockDiscoveredPattern({ normalizedText: 'click button', mappedPrimitive: 'click' }),
    ];

    const result = deduplicatePatterns(patterns);

    expect(result).toHaveLength(1);
  });

  it('should treat different primitives as unique', () => {
    const patterns: DiscoveredPattern[] = [
      createMockDiscoveredPattern({ normalizedText: 'button', mappedPrimitive: 'click' }),
      createMockDiscoveredPattern({ normalizedText: 'button', mappedPrimitive: 'assert' }),
    ];

    const result = deduplicatePatterns(patterns);

    expect(result).toHaveLength(2);
  });

  it('should handle empty array', () => {
    const result = deduplicatePatterns([]);

    expect(result).toHaveLength(0);
  });

  it('should preserve pattern order (first occurrence position)', () => {
    const patterns: DiscoveredPattern[] = [
      createMockDiscoveredPattern({ normalizedText: 'first', mappedPrimitive: 'click' }),
      createMockDiscoveredPattern({ normalizedText: 'duplicate', mappedPrimitive: 'click', confidence: 0.5 }),
      createMockDiscoveredPattern({ normalizedText: 'second', mappedPrimitive: 'fill' }),
      createMockDiscoveredPattern({ normalizedText: 'duplicate', mappedPrimitive: 'click', confidence: 0.9 }),
      createMockDiscoveredPattern({ normalizedText: 'third', mappedPrimitive: 'assert' }),
    ];

    const result = deduplicatePatterns(patterns);

    expect(result).toHaveLength(4);
    // Order should have duplicate where it was updated (after higher confidence found)
    expect(result.map(p => p.normalizedText)).toContain('first');
    expect(result.map(p => p.normalizedText)).toContain('second');
    expect(result.map(p => p.normalizedText)).toContain('third');
    expect(result.map(p => p.normalizedText)).toContain('duplicate');
  });
});

// =============================================================================
// saveDiscoveredPatterns / loadDiscoveredPatterns Tests
// =============================================================================

describe('saveDiscoveredPatterns', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llkb-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should save patterns file to disk', () => {
    const patternsFile: DiscoveredPatternsFile = {
      version: '1.0',
      generatedAt: '2026-02-05T10:00:00Z',
      source: 'test',
      patterns: [createMockDiscoveredPattern()],
      metadata: {
        frameworks: [],
        uiLibraries: [],
        totalPatterns: 1,
        byCategory: {},
        byTemplate: {},
        averageConfidence: 0.8,
      },
    };

    saveDiscoveredPatterns(patternsFile, tempDir);

    const savedPath = path.join(tempDir, 'discovered-patterns.json');
    expect(fs.existsSync(savedPath)).toBe(true);
  });

  it('should save valid JSON', () => {
    const patternsFile: DiscoveredPatternsFile = {
      version: '1.0',
      generatedAt: '2026-02-05T10:00:00Z',
      source: 'test',
      patterns: [createMockDiscoveredPattern()],
      metadata: {
        frameworks: ['react'],
        uiLibraries: ['mui'],
        totalPatterns: 1,
        byCategory: { auth: 1 },
        byTemplate: { auth: 1 },
        averageConfidence: 0.8,
      },
    };

    saveDiscoveredPatterns(patternsFile, tempDir);

    const savedPath = path.join(tempDir, 'discovered-patterns.json');
    const content = fs.readFileSync(savedPath, 'utf-8');
    const parsed = JSON.parse(content) as DiscoveredPatternsFile;

    expect(parsed.version).toBe('1.0');
    expect(parsed.patterns).toHaveLength(1);
    expect(parsed.metadata.frameworks).toEqual(['react']);
  });

  it('should create directory if it does not exist', () => {
    const nestedDir = path.join(tempDir, 'nested', 'dir', 'structure');
    const patternsFile: DiscoveredPatternsFile = {
      version: '1.0',
      generatedAt: '2026-02-05T10:00:00Z',
      source: 'test',
      patterns: [],
      metadata: {
        frameworks: [],
        uiLibraries: [],
        totalPatterns: 0,
        byCategory: {},
        byTemplate: {},
        averageConfidence: 0,
      },
    };

    saveDiscoveredPatterns(patternsFile, nestedDir);

    const savedPath = path.join(nestedDir, 'discovered-patterns.json');
    expect(fs.existsSync(savedPath)).toBe(true);
  });
});

describe('loadDiscoveredPatterns', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llkb-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return null when file does not exist', () => {
    const result = loadDiscoveredPatterns(tempDir);

    expect(result).toBeNull();
  });

  it('should load saved patterns file', () => {
    const patternsFile: DiscoveredPatternsFile = {
      version: '1.0',
      generatedAt: '2026-02-05T10:00:00Z',
      source: 'test',
      patterns: [createMockDiscoveredPattern()],
      metadata: {
        frameworks: ['next'],
        uiLibraries: ['chakra'],
        totalPatterns: 1,
        byCategory: { auth: 1 },
        byTemplate: { auth: 1 },
        averageConfidence: 0.85,
      },
    };

    saveDiscoveredPatterns(patternsFile, tempDir);
    const loaded = loadDiscoveredPatterns(tempDir);

    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe('1.0');
    expect(loaded!.patterns).toHaveLength(1);
    expect(loaded!.metadata.frameworks).toEqual(['next']);
  });

  it('should return null for invalid JSON', () => {
    const patternsPath = path.join(tempDir, 'discovered-patterns.json');
    fs.writeFileSync(patternsPath, 'not valid json {{{', 'utf-8');

    const result = loadDiscoveredPatterns(tempDir);

    expect(result).toBeNull();
  });

  it('should handle empty file', () => {
    const patternsPath = path.join(tempDir, 'discovered-patterns.json');
    fs.writeFileSync(patternsPath, '', 'utf-8');

    const result = loadDiscoveredPatterns(tempDir);

    expect(result).toBeNull();
  });

  it('should return null for valid JSON with invalid shape (SEC-F03: missing patterns array)', () => {
    const patternsPath = path.join(tempDir, 'discovered-patterns.json');
    fs.writeFileSync(patternsPath, JSON.stringify({ version: '1.0' }), 'utf-8');

    const result = loadDiscoveredPatterns(tempDir);

    expect(result).toBeNull();
  });

  it('should return null for valid JSON with invalid shape (SEC-F03: missing version)', () => {
    const patternsPath = path.join(tempDir, 'discovered-patterns.json');
    fs.writeFileSync(patternsPath, JSON.stringify({ patterns: [] }), 'utf-8');

    const result = loadDiscoveredPatterns(tempDir);

    expect(result).toBeNull();
  });

  it('should return null for JSON array instead of object (SEC-F03)', () => {
    const patternsPath = path.join(tempDir, 'discovered-patterns.json');
    fs.writeFileSync(patternsPath, JSON.stringify([1, 2, 3]), 'utf-8');

    const result = loadDiscoveredPatterns(tempDir);

    expect(result).toBeNull();
  });

  it('should return null for JSON primitive value (SEC-F03)', () => {
    const patternsPath = path.join(tempDir, 'discovered-patterns.json');
    fs.writeFileSync(patternsPath, '"just a string"', 'utf-8');

    const result = loadDiscoveredPatterns(tempDir);

    expect(result).toBeNull();
  });
});

// =============================================================================
// resetPatternIdCounter Tests
// =============================================================================

describe('resetPatternIdCounter', () => {
  it('should be a no-op (UUID-based IDs do not need reset)', () => {
    // This function exists for backward compatibility but does nothing
    expect(() => resetPatternIdCounter()).not.toThrow();
  });

  it('should still generate unique IDs after reset', () => {
    resetPatternIdCounter();

    const profile = createMockProfile({ auth: createMockAuth() });
    const signals = createMockSignals();

    const patterns1 = generatePatterns(profile, signals);
    const patterns2 = generatePatterns(profile, signals);

    const allIds = [...patterns1.map(p => p.id), ...patterns2.map(p => p.id)];
    const uniqueIds = new Set(allIds);

    expect(uniqueIds.size).toBe(allIds.length);
  });
});

// =============================================================================
// Template Constants Tests
// =============================================================================

describe('AUTH_PATTERN_TEMPLATES', () => {
  it('should have required auth templates', () => {
    const requiredTexts = [
      'click login button',
      'enter username',
      'enter password',
    ];

    for (const text of requiredTexts) {
      const found = AUTH_PATTERN_TEMPLATES.find(t => t.text === text);
      expect(found).toBeDefined();
    }
  });

  it('should have valid primitives', () => {
    const validPrimitives = ['click', 'fill', 'assert', 'check', 'navigate'];

    for (const template of AUTH_PATTERN_TEMPLATES) {
      expect(validPrimitives).toContain(template.primitive);
    }
  });
});

describe('NAVIGATION_PATTERN_TEMPLATES', () => {
  it('should have required navigation templates', () => {
    const requiredTexts = [
      'navigate to {route}',
      'go to {route}',
    ];

    for (const text of requiredTexts) {
      const found = NAVIGATION_PATTERN_TEMPLATES.find(t => t.text === text);
      expect(found).toBeDefined();
    }
  });

  it('should use navigate or click primitives', () => {
    for (const template of NAVIGATION_PATTERN_TEMPLATES) {
      expect(['navigate', 'click']).toContain(template.primitive);
    }
  });
});

describe('UI_LIBRARY_PATTERNS', () => {
  it('should have patterns for common UI libraries', () => {
    expect(UI_LIBRARY_PATTERNS['mui']).toBeDefined();
    expect(UI_LIBRARY_PATTERNS['antd']).toBeDefined();
    expect(UI_LIBRARY_PATTERNS['chakra']).toBeDefined();
    expect(UI_LIBRARY_PATTERNS['ag-grid']).toBeDefined();
  });

  it('should have component references for UI patterns', () => {
    const muiPatterns = UI_LIBRARY_PATTERNS['mui'];

    for (const pattern of muiPatterns) {
      expect(pattern.component).toBeDefined();
      expect(typeof pattern.component).toBe('string');
    }
  });

  it('should have valid primitives for all UI library patterns', () => {
    const validPrimitives = ['click', 'fill', 'assert', 'check', 'navigate', 'select'];

    for (const [_lib, patterns] of Object.entries(UI_LIBRARY_PATTERNS)) {
      for (const pattern of patterns) {
        expect(validPrimitives).toContain(pattern.primitive);
      }
    }
  });
});

// =============================================================================
// Edge Cases and Integration Tests
// =============================================================================

describe('Pattern Generation Integration', () => {
  it('should generate, deduplicate, and save patterns end-to-end', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llkb-integration-'));

    try {
      // Generate patterns
      const profile = createMockProfile({
        auth: createMockAuth(),
        uiLibraries: [
          { name: 'mui', confidence: 0.85, evidence: [] },
        ],
      });
      const signals = createMockSignals();

      const patterns = generatePatterns(profile, signals);
      expect(patterns.length).toBeGreaterThan(0);

      // Deduplicate (should not change count if no duplicates)
      const deduplicated = deduplicatePatterns(patterns);
      expect(deduplicated.length).toBe(patterns.length);

      // Create file
      const file = createDiscoveredPatternsFile(deduplicated, profile, 500);
      expect(file.metadata.discoveryDuration).toBe(500);

      // Save
      saveDiscoveredPatterns(file, tempDir);

      // Load and verify
      const loaded = loadDiscoveredPatterns(tempDir);
      expect(loaded).not.toBeNull();
      expect(loaded!.patterns.length).toBe(patterns.length);

    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should merge discovered patterns with existing LLKB patterns', () => {
    // Simulate existing LLKB patterns
    const existing: LearnedPattern[] = [
      createMockLearnedPattern({
        normalizedText: 'click login button',
        irPrimitive: 'click',
        confidence: 0.95,
        successCount: 50,
      }),
    ];

    // Generate new patterns (includes auth which has 'click login button')
    const profile = createMockProfile({ auth: createMockAuth() });
    const signals = createMockSignals();
    const discovered = generatePatterns(profile, signals);

    // Merge
    const merged = mergeDiscoveredPatterns(existing, discovered);

    // Should not duplicate 'click login button'
    const loginPatterns = merged.filter(p =>
      p.normalizedText === 'click login button' && p.irPrimitive === 'click'
    );
    expect(loginPatterns.length).toBe(1);

    // Existing pattern should be preserved unchanged
    expect(loginPatterns[0].confidence).toBe(0.95);
    expect(loginPatterns[0].successCount).toBe(50);
  });

  it('should handle profile with all features enabled', () => {
    const profile = createMockProfile({
      frameworks: [
        { name: 'react', version: '18.0.0', confidence: 0.95, evidence: [] },
        { name: 'next', version: '14.0.0', confidence: 0.9, evidence: [] },
      ],
      uiLibraries: [
        { name: 'mui', confidence: 0.85, evidence: [] },
        { name: 'ag-grid', confidence: 0.8, evidence: [] },
      ],
      auth: createMockAuth(),
    });
    const signals = createMockSignals();

    const patterns = generatePatterns(profile, signals);

    // Should have auth + navigation + mui + ag-grid patterns
    const expectedMinPatterns =
      AUTH_PATTERN_TEMPLATES.length +
      NAVIGATION_PATTERN_TEMPLATES.length +
      UI_LIBRARY_PATTERNS['mui'].length +
      UI_LIBRARY_PATTERNS['ag-grid'].length;

    expect(patterns.length).toBe(expectedMinPatterns);

    // Verify each category is represented
    expect(patterns.some(p => p.category === 'auth')).toBe(true);
    expect(patterns.some(p => p.category === 'navigation')).toBe(true);
    expect(patterns.some(p => p.category === 'ui-interaction')).toBe(true);
  });
});
