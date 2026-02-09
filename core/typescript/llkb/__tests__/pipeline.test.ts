/**
 * Integration tests for F12 Full Discovery Pipeline
 *
 * Tests the complete orchestration flow:
 * runFullDiscoveryPipeline() → discovery + mining + packs + mining modules + QC + persistence
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import { type PipelineResult, runFullDiscoveryPipeline } from '../pipeline.js';
import { loadDiscoveredPatterns } from '../pattern-generation.js';

// =============================================================================
// Test Fixtures
// =============================================================================

describe('runFullDiscoveryPipeline', () => {
  let testProjectRoot: string;
  let llkbDir: string;

  beforeAll(async () => {
    testProjectRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'artk-pipeline-'));
    llkbDir = path.join(testProjectRoot, '.artk', 'llkb');

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
    await fsp.writeFile(
      path.join(testProjectRoot, 'package.json'),
      JSON.stringify(pkg, null, 2)
    );

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

    // Create a simple form schema (Zod) so mining finds a form
    await fsp.writeFile(
      path.join(srcDir, 'LoginForm.tsx'),
      `import { z } from 'zod';
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export const LoginForm = () => <form data-testid="login-form">...</form>;`
    );

    // Create a route file so mining finds routes
    const routesDir = path.join(testProjectRoot, 'src', 'routes');
    await fsp.mkdir(routesDir, { recursive: true });
    await fsp.writeFile(
      path.join(routesDir, 'index.tsx'),
      `import { Route } from 'react-router-dom';
export const routes = [
  { path: '/login', element: <Login /> },
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/users', element: <Users /> },
];`
    );
  });

  afterAll(async () => {
    await fsp.rm(testProjectRoot, { recursive: true, force: true });
  });

  test('orchestrates all phases and produces patterns', async () => {
    const result: PipelineResult = await runFullDiscoveryPipeline(
      testProjectRoot,
      llkbDir
    );

    // Pipeline should succeed
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);

    // Profile should be generated
    expect(result.profile).not.toBeNull();
    expect(result.profile!.frameworks.length).toBeGreaterThan(0);
    expect(result.profile!.frameworks.map(f => f.name)).toContain('react');

    // Patterns should be generated
    expect(result.patternsFile).not.toBeNull();
    expect(result.patternsFile!.patterns.length).toBeGreaterThan(0);

    // Statistics should track pattern sources
    expect(result.stats.patternSources.discovery).toBeGreaterThan(0);
    // Framework packs should contribute (React + MUI detected)
    expect(result.stats.patternSources.frameworkPacks).toBeGreaterThan(0);

    // Quality controls should have been applied
    expect(result.stats.qualityControls).not.toBeNull();
    expect(result.stats.totalBeforeQC).toBeGreaterThanOrEqual(result.stats.totalAfterQC);

    // Duration should be tracked
    expect(result.stats.durationMs).toBeGreaterThan(0);
  });

  test('persists discovered-patterns.json and discovered-profile.json', async () => {
    // Run pipeline (may already have run from previous test, but re-run to be sure)
    await runFullDiscoveryPipeline(testProjectRoot, llkbDir);

    // Check discovered-patterns.json exists
    const patternsPath = path.join(llkbDir, 'discovered-patterns.json');
    expect(fs.existsSync(patternsPath)).toBe(true);

    // Load and verify
    const loaded = loadDiscoveredPatterns(llkbDir);
    expect(loaded).not.toBeNull();
    expect(loaded!.patterns.length).toBeGreaterThan(0);
    expect(loaded!.version).toBe('1.0');
    expect(loaded!.source).toBe('discover-foundation:F12');

    // Check discovered-profile.json exists (separate from manually-authored app-profile.json)
    const profilePath = path.join(llkbDir, 'discovered-profile.json');
    expect(fs.existsSync(profilePath)).toBe(true);
  });

  test('includes framework pack patterns for detected frameworks', async () => {
    const result = await runFullDiscoveryPipeline(testProjectRoot, llkbDir);

    // With React + MUI detected, packs should contribute patterns before QC
    expect(result.stats.patternSources.frameworkPacks).toBeGreaterThan(0);

    // At lower threshold, pack patterns (confidence 0.65) survive QC
    const lowThresholdResult = await runFullDiscoveryPipeline(testProjectRoot, llkbDir, {
      confidenceThreshold: 0.5,
    });
    const packPatterns = lowThresholdResult.patternsFile!.patterns.filter(
      p => p.layer === 'framework' && p.templateSource === 'static'
    );
    expect(packPatterns.length).toBeGreaterThan(0);
  });

  test('applies confidence threshold of 0.7 by default', async () => {
    const result = await runFullDiscoveryPipeline(testProjectRoot, llkbDir);

    // All final patterns should have confidence >= 0.7
    for (const p of result.patternsFile!.patterns) {
      expect(p.confidence).toBeGreaterThanOrEqual(0.7);
    }

    // QC should have filtered some patterns
    expect(result.stats.qualityControls!.thresholdFiltered).toBeGreaterThanOrEqual(0);
  });

  test('respects custom confidence threshold', async () => {
    const result = await runFullDiscoveryPipeline(testProjectRoot, llkbDir, {
      confidenceThreshold: 0.5,
    });

    // More patterns should survive at lower threshold
    const defaultResult = await runFullDiscoveryPipeline(testProjectRoot, llkbDir);

    expect(result.patternsFile!.patterns.length).toBeGreaterThanOrEqual(
      defaultResult.patternsFile!.patterns.length
    );
  });

  test('handles skipPacks and skipMiningModules options', async () => {
    const result = await runFullDiscoveryPipeline(testProjectRoot, llkbDir, {
      skipPacks: true,
      skipMiningModules: true,
    });

    expect(result.success).toBe(true);
    expect(result.stats.patternSources.frameworkPacks).toBe(0);
    expect(result.stats.patternSources.i18n).toBe(0);
    expect(result.stats.patternSources.analytics).toBe(0);
    expect(result.stats.patternSources.featureFlags).toBe(0);
  });

  test('gracefully handles empty project', async () => {
    const emptyDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'artk-empty-'));
    const emptyLlkb = path.join(emptyDir, '.artk', 'llkb');

    try {
      const result = await runFullDiscoveryPipeline(emptyDir, emptyLlkb);

      // Should succeed (graceful degradation)
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    } finally {
      await fsp.rm(emptyDir, { recursive: true, force: true });
    }
  });

  test('mining stats are populated when elements are found', async () => {
    const result = await runFullDiscoveryPipeline(testProjectRoot, llkbDir);

    expect(result.stats.mining).not.toBeNull();
    expect(result.stats.mining!.filesScanned).toBeGreaterThan(0);
  });
});
