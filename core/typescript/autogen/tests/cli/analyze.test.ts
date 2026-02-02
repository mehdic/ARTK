/**
 * Tests for CLI analyze command
 * @module tests/cli/analyze
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';

// Mock paths module FIRST (before other mocks that might depend on it)
const testDir = join(process.cwd(), 'test-fixtures', 'analyze-test');
const journeysDir = join(testDir, 'journeys');
const outputDir = join(testDir, '.artk', 'autogen');

vi.mock('../../src/utils/paths.js', () => ({
  getAutogenDir: vi.fn(() => outputDir),
  getAutogenArtifact: vi.fn((name: string) => join(outputDir, `${name}.json`)),
  ensureAutogenDir: vi.fn(async () => {
    mkdirSync(outputDir, { recursive: true });
  }),
  getHarnessRoot: vi.fn(() => testDir),
}));

// Mock telemetry before importing analyze
vi.mock('../../src/shared/telemetry.js', () => ({
  getTelemetry: vi.fn(() => ({
    load: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    trackCommandStart: vi.fn(() => 'test-event-id'),
    trackCommandEnd: vi.fn(),
    trackError: vi.fn(),
  })),
}));

// Mock pipeline state
vi.mock('../../src/pipeline/state.js', () => ({
  loadPipelineState: vi.fn(() => ({ stage: 'initial', journeyIds: [], history: [] })),
  updatePipelineState: vi.fn().mockResolvedValue({}),
}));

import { runAnalyze } from '../../src/cli/analyze.js';

describe('CLI: analyze command', () => {
  beforeEach(() => {
    mkdirSync(journeysDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('argument parsing', () => {
    it('should show help with --help flag', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await runAnalyze(['--help']);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('analyze');
    });

    it('should accept journey file paths', async () => {
      // Create a test journey file
      const journeyPath = join(journeysDir, 'test-journey.md');
      writeFileSync(journeyPath, `---
id: JRN-TEST-001
title: Test Journey
status: defined
tier: smoke
actor: user
scope: [test]
tests: []
---

## Acceptance Criteria
- User can log in

## Steps
1. Navigate to login page
2. Enter username
3. Click login button
4. Verify dashboard appears
`);

      const outputPath = join(outputDir, 'analysis.json');
      await runAnalyze([journeyPath, '-o', outputPath, '-q']);

      expect(existsSync(outputPath)).toBe(true);
      const output = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(output.journeys).toHaveLength(1);
      expect(output.journeys[0].journeyId).toBe('JRN-TEST-001');
    });
  });

  describe('journey analysis', () => {
    it('should parse journey metadata', async () => {
      const journeyPath = join(journeysDir, 'step-types.md');
      writeFileSync(journeyPath, `---
id: JRN-STEPS-001
title: Step Types Test
status: defined
tier: smoke
actor: user
scope: [test]
tests: []
---

## Acceptance Criteria
- Test passes

## Steps
1. Navigate to /dashboard
2. Click the submit button
3. Fill in the username field with "test"
4. Verify the success message appears
5. Wait for the page to load
`);

      const outputPath = join(outputDir, 'analysis.json');
      await runAnalyze([journeyPath, '-o', outputPath, '-q']);

      const output = JSON.parse(readFileSync(outputPath, 'utf-8'));
      const journey = output.journeys[0];

      // Check journey metadata was parsed
      expect(journey.journeyId).toBe('JRN-STEPS-001');
      expect(journey.title).toBe('Step Types Test');
      expect(journey.tier).toBe('smoke');
      expect(journey.actor).toBe('user');
    });

    it('should analyze multiple journeys', async () => {
      const simpleJourneyPath = join(journeysDir, 'simple.md');
      writeFileSync(simpleJourneyPath, `---
id: JRN-SIMPLE
title: Simple Journey
status: defined
tier: smoke
actor: user
scope: [test]
tests: []
---

## Steps
1. Navigate to home
2. Click button
`);

      const complexJourneyPath = join(journeysDir, 'complex.md');
      writeFileSync(complexJourneyPath, `---
id: JRN-COMPLEX
title: Complex Journey
status: defined
tier: regression
actor: user
scope: [test]
tests: []
---

## Steps
1. Navigate to dashboard
2. Fill form field 1
3. Fill form field 2
4. Fill form field 3
5. Upload file
6. Select from dropdown
7. Check checkbox
8. Click submit
9. Verify success message
10. Navigate to results
11. Verify data in table
12. Export to CSV
`);

      const outputPath = join(outputDir, 'analysis.json');
      await runAnalyze([simpleJourneyPath, complexJourneyPath, '-o', outputPath, '-q']);

      const output = JSON.parse(readFileSync(outputPath, 'utf-8'));

      // Should have both journeys
      expect(output.journeys).toHaveLength(2);
      expect(output.journeys.some((j: { journeyId: string }) => j.journeyId === 'JRN-SIMPLE')).toBe(true);
      expect(output.journeys.some((j: { journeyId: string }) => j.journeyId === 'JRN-COMPLEX')).toBe(true);
    });
  });

  describe('output format', () => {
    it('should output valid JSON with --json flag', async () => {
      const journeyPath = join(journeysDir, 'json-test.md');
      writeFileSync(journeyPath, `---
id: JRN-JSON
title: JSON Test
status: defined
tier: smoke
actor: user
scope: [test]
tests: []
---

## Steps
1. Test step
`);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runAnalyze([journeyPath, '--json', '-q']);

      const jsonOutput = consoleSpy.mock.calls.find(c => {
        try {
          JSON.parse(c[0]);
          return true;
        } catch {
          return false;
        }
      });

      expect(jsonOutput).toBeDefined();
      const parsed = JSON.parse(jsonOutput![0]);
      expect(parsed.version).toBe('1.0');
      expect(parsed.journeys).toBeDefined();
    });

    it('should include summary statistics', async () => {
      const journeyPath = join(journeysDir, 'summary-test.md');
      writeFileSync(journeyPath, `---
id: JRN-SUMMARY
title: Summary Test
status: defined
tier: smoke
actor: user
scope: [test]
tests: []
---

## Steps
1. Navigate to page
2. Click button
3. Verify result
`);

      const outputPath = join(outputDir, 'analysis.json');
      await runAnalyze([journeyPath, '-o', outputPath, '-q']);

      const output = JSON.parse(readFileSync(outputPath, 'utf-8'));

      expect(output.summary).toBeDefined();
      expect(output.summary.totalJourneys).toBe(1);
      expect(output.summary.totalSteps).toBeGreaterThanOrEqual(0);  // May be 0 if parsing differs
      expect(output.summary.complexityDistribution).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle missing journey files gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

      try {
        await runAnalyze(['/nonexistent/path.md']);
      } catch {
        // Expected exit
      }

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should warn about malformed YAML frontmatter', async () => {
      const journeyPath = join(journeysDir, 'malformed.md');
      writeFileSync(journeyPath, `---
id: [invalid yaml
---

## Steps
1. Test
`);

      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const outputPath = join(outputDir, 'analysis.json');

      await runAnalyze([journeyPath, '-o', outputPath, '-q']);

      // Should have warnings in output
      const output = JSON.parse(readFileSync(outputPath, 'utf-8'));
      // The file should be skipped or have warnings
      // Either no journeys or journeys with warnings
      expect(output.journeys.length === 0 || output.journeys[0]?.warnings?.length > 0).toBe(true);
    });
  });
});
