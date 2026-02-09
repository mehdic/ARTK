/**
 * Integration tests for F12 Discovery Flow
 *
 * Tests the complete pipeline:
 * 1. runDiscovery() - Detect frameworks and UI libraries
 * 2. generatePatterns() - Generate patterns from profile + signals
 * 3. generateAllPatterns() - Template-based pattern generation
 * 4. mergeDiscoveredPatterns() - Merge learned + discovered patterns
 * 5. applyAllQualityControls() - Quality validation
 * 6. createDiscoveredPatternsFile() / saveDiscoveredPatterns() / loadDiscoveredPatterns() - Persistence
 */

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import { type DiscoveredProfile, type DiscoveryResult, runDiscovery, type SelectorSignals } from '../discovery.js';

import {
  createDiscoveredPatternsFile,
  type DiscoveredPattern,
  type DiscoveredPatternsFile,
  generatePatterns,
  type LearnedPattern,
  loadDiscoveredPatterns,
  mergeDiscoveredPatterns,
  resetPatternIdCounter,
  saveDiscoveredPatterns,
} from '../pattern-generation.js';

import {
  createEntity,
  createForm,
  createModal,
  createRoute,
  createTable,
  type DiscoveredElements,
  generateAllPatterns,
} from '../template-generators.js';

import { applyAllQualityControls } from '../quality-controls.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockProfile(overrides: Partial<DiscoveredProfile> = {}): DiscoveredProfile {
  return {
    version: '1.0',
    generatedAt: '2026-02-05T10:00:00Z',
    projectRoot: '/test/project',
    frameworks: [{ name: 'react', confidence: 0.95, source: 'package.json' }],
    uiLibraries: [{ name: 'mui', confidence: 0.90, source: 'package.json' }],
    selectorSignals: {
      primaryAttribute: 'data-testid',
      namingConvention: 'kebab-case' as const,
      coverage: { 'data-testid': 0.8, 'role': 0.1, 'aria-label': 0.1 },
      totalComponentsAnalyzed: 20,
      sampleSelectors: ['login-button', 'user-table', 'submit-form'],
    },
    auth: {
      detected: true,
      type: 'oidc',
      loginRoute: '/login',
      bypassAvailable: false,
      selectors: {
        usernameField: 'input[data-testid="username"]',
        passwordField: 'input[data-testid="password"]',
        submitButton: 'button[data-testid="login-submit"]',
      },
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
    namingConvention: 'kebab-case' as const,
    coverage: { 'data-testid': 0.8, 'role': 0.1, 'aria-label': 0.1 },
    totalComponentsAnalyzed: 20,
    sampleSelectors: ['login-button', 'user-table'],
    ...overrides,
  };
}

// =============================================================================
// Discovery Detection Tests (uses temp project with real files)
// =============================================================================

describe('F12 Discovery Detection', () => {
  let testProjectRoot: string;

  beforeAll(async () => {
    testProjectRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'artk-discovery-'));
    // Create package.json with React + MUI
    const pkg = {
      name: 'test-app',
      version: '1.0.0',
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        '@mui/material': '^5.14.0',
      },
    };
    await fsp.writeFile(path.join(testProjectRoot, 'package.json'), JSON.stringify(pkg, null, 2));

    // Create source files with data-testid attributes
    const srcDir = path.join(testProjectRoot, 'src', 'components');
    await fsp.mkdir(srcDir, { recursive: true });
    await fsp.writeFile(
      path.join(srcDir, 'App.tsx'),
      `import React from 'react';
import { Button, TextField } from '@mui/material';
export default () => (
  <div data-testid="app">
    <TextField data-testid="search-input" />
    <Button data-testid="search-button">Search</Button>
  </div>
);`
    );
  });

  afterAll(async () => {
    await fsp.rm(testProjectRoot, { recursive: true, force: true });
  });

  test('runDiscovery detects frameworks and UI libraries from package.json', async () => {
    const result: DiscoveryResult = await runDiscovery(testProjectRoot);

    expect(result.success).toBe(true);
    expect(result.profile).not.toBeNull();

    const profile = result.profile!;
    expect(profile.frameworks.length).toBeGreaterThan(0);
    expect(profile.frameworks.map(f => f.name)).toContain('react');

    expect(profile.uiLibraries.length).toBeGreaterThan(0);
    expect(profile.uiLibraries.map(u => u.name)).toContain('mui');

    expect(profile.selectorSignals).toBeDefined();
    expect(profile.selectorSignals.primaryAttribute).toBeDefined();
  });
});

// =============================================================================
// Pattern Generation Integration Tests (uses mock profile for reliability)
// =============================================================================

describe('F12 Pattern Generation Integration', () => {
  let llkbRoot: string;

  beforeAll(async () => {
    llkbRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'artk-llkb-integ-'));
  });

  afterAll(async () => {
    await fsp.rm(llkbRoot, { recursive: true, force: true });
  });

  beforeEach(() => {
    resetPatternIdCounter();
  });

  test('generatePatterns creates patterns from profile + signals', () => {
    const profile = createMockProfile();
    const signals = createMockSignals();

    const patterns: DiscoveredPattern[] = generatePatterns(profile, signals);

    expect(patterns.length).toBeGreaterThan(0);

    // Should have auth patterns (since auth.detected = true)
    const authPatterns = patterns.filter(p => p.category === 'auth');
    expect(authPatterns.length).toBeGreaterThan(0);

    // Should have navigation patterns
    const navPatterns = patterns.filter(p => p.category === 'navigation');
    expect(navPatterns.length).toBeGreaterThan(0);

    // Should have UI library patterns (MUI)
    const uiPatterns = patterns.filter(p => p.category === 'ui-interaction');
    expect(uiPatterns.length).toBeGreaterThan(0);

    // All patterns should have valid structure
    for (const p of patterns) {
      expect(p.id).toBeDefined();
      expect(p.normalizedText).toBeDefined();
      expect(p.mappedPrimitive).toBeDefined();
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
      expect(p.layer).toBeDefined();
    }
  });

  test('generateAllPatterns creates template-based patterns from elements', () => {
    const elements: DiscoveredElements = {
      entities: [createEntity('User', ['name', 'email', 'role'])],
      routes: [createRoute('/login', 'Login', 'public')],
      forms: [createForm('UserForm', ['name', 'email'])],
      tables: [createTable('UserTable', ['name', 'email', 'actions'])],
      modals: [createModal('ConfirmDeleteModal', 'Are you sure?')],
    };

    const result = generateAllPatterns(elements);

    expect(result.patterns.length).toBeGreaterThan(0);
    expect(result.stats.totalPatterns).toBe(result.patterns.length);
    expect(result.stats.crudPatterns).toBeGreaterThan(0);
    expect(result.stats.formPatterns).toBeGreaterThan(0);
    expect(result.stats.tablePatterns).toBeGreaterThan(0);
    expect(result.stats.modalPatterns).toBeGreaterThan(0);
    expect(result.stats.navigationPatterns).toBeGreaterThan(0);

    // Verify template patterns have templateSource
    for (const p of result.patterns) {
      expect(p.templateSource).toBeDefined();
    }
    // Most patterns have entityName (some generic navigation patterns don't)
    const withEntity = result.patterns.filter(p => p.entityName !== undefined);
    expect(withEntity.length).toBeGreaterThan(0);
  });

  test('mergeDiscoveredPatterns merges learned patterns with discovered', () => {
    const existing: LearnedPattern[] = [
      {
        normalizedText: 'click login button',
        originalText: 'Click login button',
        irPrimitive: 'click',
        confidence: 0.9,
        successCount: 5,
        failCount: 0,
        sourceJourneys: ['JRN-001'],
        lastUpdated: '2026-02-05T10:00:00Z',
      },
    ];

    const discovered: DiscoveredPattern[] = [
      {
        id: 'DP-001',
        normalizedText: 'fill username field',
        originalText: 'Fill username field',
        mappedPrimitive: 'fill',
        selectorHints: [{ strategy: 'data-testid', value: 'username' }],
        confidence: 0.75,
        layer: 'app-specific',
        category: 'auth',
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
      },
      // Duplicate - same normalizedText+primitive as existing
      {
        id: 'DP-002',
        normalizedText: 'click login button',
        originalText: 'Click Login Button',
        mappedPrimitive: 'click',
        selectorHints: [],
        confidence: 0.8,
        layer: 'app-specific',
        category: 'auth',
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
      },
    ];

    const merged = mergeDiscoveredPatterns(existing, discovered);

    // Should have existing(1) + new(1) = 2 (duplicate skipped)
    expect(merged.length).toBe(2);
    // First should be original existing
    expect(merged[0].normalizedText).toBe('click login button');
    expect(merged[0].confidence).toBe(0.9); // Original confidence preserved
    // Second should be the new pattern
    expect(merged[1].normalizedText).toBe('fill username field');
  });

  test('applyAllQualityControls filters and validates patterns', () => {
    const profile = createMockProfile();
    const signals = createMockSignals();
    const patterns = generatePatterns(profile, signals);

    const { patterns: validated, result } = applyAllQualityControls(patterns);

    // Should have patterns after QC
    expect(validated.length).toBeGreaterThan(0);
    expect(validated.length).toBeLessThanOrEqual(patterns.length);

    // All remaining patterns should be valid
    for (const p of validated) {
      expect(p.id).toBeDefined();
      expect(p.normalizedText).toBeDefined();
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
    }

    // Result should have stats
    expect(result.inputCount).toBe(patterns.length);
    expect(result.outputCount).toBe(validated.length);
  });

  test('createDiscoveredPatternsFile wraps patterns with metadata', () => {
    const profile = createMockProfile();
    const signals = createMockSignals();
    const patterns = generatePatterns(profile, signals);

    const file: DiscoveredPatternsFile = createDiscoveredPatternsFile(patterns, profile, 1500);

    expect(file.version).toBe('1.0');
    expect(file.source).toBe('discover-foundation:F12');
    expect(file.generatedAt).toBeDefined();
    expect(file.patterns).toEqual(patterns);
    expect(file.metadata.frameworks).toEqual(['react']);
    expect(file.metadata.uiLibraries).toEqual(['mui']);
    expect(file.metadata.totalPatterns).toBe(patterns.length);
    expect(file.metadata.averageConfidence).toBeGreaterThan(0);
    expect(file.metadata.discoveryDuration).toBe(1500);
  });

  test('Save and load discovered patterns - round-trip integrity', () => {
    const profile = createMockProfile();
    const signals = createMockSignals();
    const patterns = generatePatterns(profile, signals);
    const file = createDiscoveredPatternsFile(patterns, profile);

    // Save
    saveDiscoveredPatterns(file, llkbRoot);

    const patternsPath = path.join(llkbRoot, 'discovered-patterns.json');
    expect(fs.existsSync(patternsPath)).toBe(true);

    // Load
    const loaded = loadDiscoveredPatterns(llkbRoot);
    expect(loaded).not.toBeNull();
    expect(loaded!.patterns.length).toBe(file.patterns.length);
    expect(loaded!.version).toBe(file.version);
    expect(loaded!.source).toBe(file.source);
    expect(loaded!.metadata.frameworks).toEqual(file.metadata.frameworks);
    expect(loaded!.metadata.uiLibraries).toEqual(file.metadata.uiLibraries);

    // Verify pattern content matches
    for (let i = 0; i < loaded!.patterns.length; i++) {
      expect(loaded!.patterns[i].id).toBe(file.patterns[i].id);
      expect(loaded!.patterns[i].normalizedText).toBe(file.patterns[i].normalizedText);
      expect(loaded!.patterns[i].mappedPrimitive).toBe(file.patterns[i].mappedPrimitive);
      expect(loaded!.patterns[i].confidence).toBe(file.patterns[i].confidence);
    }
  });

  test('End-to-end pipeline: discover → generate → template → QC → persist', () => {
    const profile = createMockProfile();
    const signals = createMockSignals();

    // Step 1: Generate discovery-based patterns
    const discoveryPatterns = generatePatterns(profile, signals);
    expect(discoveryPatterns.length).toBeGreaterThan(0);

    // Step 2: Generate template-based patterns
    const elements: DiscoveredElements = {
      entities: [createEntity('User', ['name', 'email'])],
      routes: [createRoute('/login', 'Login', 'public')],
      forms: [createForm('LoginForm', ['email', 'password'])],
      tables: [],
      modals: [],
    };
    const templateResult = generateAllPatterns(elements);
    expect(templateResult.patterns.length).toBeGreaterThan(0);

    // Step 3: Combine all patterns
    const allPatterns = [...discoveryPatterns, ...templateResult.patterns];

    // Step 4: Apply quality controls
    const { patterns: validated } = applyAllQualityControls(allPatterns);
    expect(validated.length).toBeGreaterThan(0);

    // Step 5: Create file and persist
    const file = createDiscoveredPatternsFile(validated, profile);
    saveDiscoveredPatterns(file, llkbRoot);

    // Step 6: Load and verify
    const loaded = loadDiscoveredPatterns(llkbRoot);
    expect(loaded).not.toBeNull();
    expect(loaded!.patterns.length).toBe(validated.length);

    // Verify mixed sources present
    const hasAuthPattern = loaded!.patterns.some(p => p.category === 'auth');
    const hasTemplatePattern = loaded!.patterns.some(p => p.templateSource !== undefined);
    expect(hasAuthPattern).toBe(true);
    expect(hasTemplatePattern).toBe(true);
  });

  test('Incremental pattern accumulation via merge', () => {
    const profile = createMockProfile();
    const signals = createMockSignals();

    // First run: Discovery patterns
    const firstRunPatterns = generatePatterns(profile, signals);
    const firstFile = createDiscoveredPatternsFile(firstRunPatterns, profile);
    saveDiscoveredPatterns(firstFile, llkbRoot);

    const afterFirstRun = loadDiscoveredPatterns(llkbRoot);
    expect(afterFirstRun).not.toBeNull();
    const firstRunCount = afterFirstRun!.patterns.length;

    // Convert first-run patterns to LearnedPattern format for merge
    const existingLearned: LearnedPattern[] = afterFirstRun!.patterns.map(p => ({
      normalizedText: p.normalizedText,
      originalText: p.originalText,
      irPrimitive: p.mappedPrimitive,
      confidence: p.confidence,
      successCount: p.successCount,
      failCount: p.failCount,
      sourceJourneys: p.sourceJourneys,
      lastUpdated: afterFirstRun!.generatedAt,
    }));

    // Second run: Add template patterns
    const elements: DiscoveredElements = {
      entities: [createEntity('Product', ['title', 'price'])],
      routes: [],
      forms: [],
      tables: [],
      modals: [],
    };
    const templateResult = generateAllPatterns(elements);

    // Merge: existing learned + new discovered
    const merged = mergeDiscoveredPatterns(existingLearned, templateResult.patterns);

    // Should accumulate (no duplicates since template patterns are different)
    expect(merged.length).toBeGreaterThan(firstRunCount);
  });
});
