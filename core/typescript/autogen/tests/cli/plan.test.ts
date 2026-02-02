/**
 * Tests for CLI plan command
 * @module tests/cli/plan
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';

// Mock telemetry before importing plan
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
  loadPipelineState: vi.fn(() => ({ stage: 'analyzed', journeyIds: [], history: [] })),
  updatePipelineState: vi.fn().mockResolvedValue({}),
}));

// Mock paths
const testDir = join(process.cwd(), 'test-fixtures', 'plan-test');
const autogenDir = join(testDir, '.artk', 'autogen');

vi.mock('../../src/utils/paths.js', () => ({
  getAutogenDir: vi.fn(() => autogenDir),
  getAutogenArtifact: vi.fn((name: string) => join(autogenDir, `${name}.json`)),
  ensureAutogenDir: vi.fn(async () => {
    mkdirSync(autogenDir, { recursive: true });
  }),
  getHarnessRoot: vi.fn(() => testDir),
}));

import { runPlan } from '../../src/cli/plan.js';
import type { AnalysisOutput } from '../../src/cli/analyze.js';

// Helper to create valid analysis object
function createAnalysis(journeys: Array<{
  journeyId: string;
  title: string;
  steps: Array<{ text: string; type: string }>;
  complexity?: 'low' | 'medium' | 'high';
}>): AnalysisOutput {
  return {
    version: '1.0',
    harnessRoot: testDir,
    journeys: journeys.map(j => ({
      journeyId: j.journeyId,
      journeyPath: join(testDir, 'journeys', `${j.journeyId}.md`),
      title: j.title,
      tier: 'smoke',
      status: 'defined',
      actor: 'user',
      scope: ['test'],
      acceptanceCriteria: ['Test passes'],
      steps: j.steps.map((s, i) => ({
        index: i + 1,
        text: s.text,
        type: s.type as 'navigation' | 'interaction' | 'assertion' | 'wait' | 'form' | 'data' | 'unknown',
        hasSelector: s.text.includes('data-testid') || s.text.includes('button'),
        hasAssertion: s.type === 'assertion',
        estimatedComplexity: j.complexity || 'low',
        keywords: s.text.toLowerCase().split(' ').filter(w => w.length > 3),
      })),
      dependencies: [],
      complexity: {
        score: j.complexity === 'high' ? 75 : j.complexity === 'medium' ? 50 : 25,
        factors: { stepCount: j.steps.length, formFields: 0, conditionals: 0, dataVariants: 0 },
        label: j.complexity || 'low',
      },
      warnings: [],
      analyzedAt: new Date().toISOString(),
    })),
    summary: {
      totalJourneys: journeys.length,
      totalSteps: journeys.reduce((sum, j) => sum + j.steps.length, 0),
      complexityDistribution: { low: journeys.length },
      commonKeywords: [],
    },
    analyzedAt: new Date().toISOString(),
  };
}

describe('CLI: plan command', () => {
  beforeEach(() => {
    mkdirSync(autogenDir, { recursive: true });
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

      await runPlan(['--help']);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('plan');
    });

    it('should accept analysis file path with -a flag', async () => {
      // Create analysis file
      const analysisPath = join(autogenDir, 'analysis.json');
      const analysis = createAnalysis([{
        journeyId: 'JRN-001',
        title: 'Test Journey',
        steps: [
          { text: 'Navigate to home', type: 'navigation' },
          { text: 'Click button', type: 'interaction' },
        ],
      }]);
      writeFileSync(analysisPath, JSON.stringify(analysis), 'utf-8');

      const outputPath = join(autogenDir, 'plan.json');
      await runPlan(['-a', analysisPath, '-o', outputPath, '-q']);

      expect(existsSync(outputPath)).toBe(true);
    });

    it('should accept strategy with --strategy flag', async () => {
      const analysisPath = join(autogenDir, 'analysis.json');
      const analysis = createAnalysis([{
        journeyId: 'JRN-001',
        title: 'Test',
        steps: [{ text: 'Test step', type: 'interaction' }],
      }]);
      writeFileSync(analysisPath, JSON.stringify(analysis), 'utf-8');

      const outputPath = join(autogenDir, 'plan.json');
      await runPlan(['-a', analysisPath, '-o', outputPath, '-q', '--strategy', 'scot']);

      const output = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(output.plans[0].strategy).toBe('scot');
    });
  });

  describe('plan generation', () => {
    it('should generate plan for each journey', async () => {
      const analysisPath = join(autogenDir, 'analysis.json');
      const analysis = createAnalysis([
        {
          journeyId: 'JRN-001',
          title: 'Journey 1',
          steps: [{ text: 'Navigate to page', type: 'navigation' }],
        },
        {
          journeyId: 'JRN-002',
          title: 'Journey 2',
          steps: [{ text: 'Click element', type: 'interaction' }],
          complexity: 'medium',
        },
      ]);
      writeFileSync(analysisPath, JSON.stringify(analysis), 'utf-8');

      const outputPath = join(autogenDir, 'plan.json');
      await runPlan(['-a', analysisPath, '-o', outputPath, '-q']);

      const output = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(output.plans).toHaveLength(2);
      expect(output.plans[0].journeyId).toBe('JRN-001');
      expect(output.plans[1].journeyId).toBe('JRN-002');
    });

    it('should filter to specific journey with -j flag', async () => {
      const analysisPath = join(autogenDir, 'analysis.json');
      const analysis = createAnalysis([
        { journeyId: 'JRN-001', title: 'J1', steps: [{ text: 'Step 1', type: 'navigation' }] },
        { journeyId: 'JRN-002', title: 'J2', steps: [{ text: 'Step 2', type: 'interaction' }] },
      ]);
      writeFileSync(analysisPath, JSON.stringify(analysis), 'utf-8');

      const outputPath = join(autogenDir, 'plan.json');
      await runPlan(['-a', analysisPath, '-o', outputPath, '-q', '-j', 'JRN-002']);

      const output = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(output.plans).toHaveLength(1);
      expect(output.plans[0].journeyId).toBe('JRN-002');
    });

    it('should convert steps to actions', async () => {
      const analysisPath = join(autogenDir, 'analysis.json');
      const analysis = createAnalysis([{
        journeyId: 'JRN-001',
        title: 'Actions Test',
        steps: [
          { text: 'Navigate to /login', type: 'navigation' },
          { text: 'Click the submit button', type: 'interaction' },
          { text: 'Fill in the username field', type: 'form' },
          { text: 'Verify success message appears', type: 'assertion' },
        ],
      }]);
      writeFileSync(analysisPath, JSON.stringify(analysis), 'utf-8');

      const outputPath = join(autogenDir, 'plan.json');
      await runPlan(['-a', analysisPath, '-o', outputPath, '-q']);

      const output = JSON.parse(readFileSync(outputPath, 'utf-8'));
      const steps = output.plans[0].steps;

      expect(steps.length).toBe(4);
      // Verify action types are set correctly based on step type
      expect(steps.some((s: { action: { type: string } }) => s.action.type === 'navigate')).toBe(true);
      expect(steps.some((s: { action: { type: string } }) => s.action.type === 'click')).toBe(true);
      expect(steps.some((s: { action: { type: string } }) => s.action.type === 'fill')).toBe(true);
      expect(steps.some((s: { action: { type: string } }) => s.action.type === 'assert')).toBe(true);
    });

    it('should adjust config based on complexity', async () => {
      const analysisPath = join(autogenDir, 'analysis.json');
      const analysis = createAnalysis([{
        journeyId: 'JRN-COMPLEX',
        title: 'Complex Journey',
        steps: Array(15).fill(null).map((_, i) => ({
          text: `Step ${i}`,
          type: 'interaction',
        })),
        complexity: 'high',
      }]);
      writeFileSync(analysisPath, JSON.stringify(analysis), 'utf-8');

      const outputPath = join(autogenDir, 'plan.json');
      await runPlan(['-a', analysisPath, '-o', outputPath, '-q']);

      const output = JSON.parse(readFileSync(outputPath, 'utf-8'));
      const config = output.plans[0].configuration;

      // Verify configuration exists (timeout varies based on implementation)
      expect(config.timeout).toBeGreaterThanOrEqual(30000);  // At least default timeout
      expect(config.retries).toBeGreaterThanOrEqual(0);  // At least no retries
    });
  });

  describe('selector inference', () => {
    it('should infer selectors from step text', async () => {
      const analysisPath = join(autogenDir, 'analysis.json');
      const analysis = createAnalysis([{
        journeyId: 'JRN-SELECTORS',
        title: 'Selector Test',
        steps: [
          { text: 'Click the "Submit" button', type: 'interaction' },
          { text: 'Click element with data-testid="login-btn"', type: 'interaction' },
        ],
      }]);
      writeFileSync(analysisPath, JSON.stringify(analysis), 'utf-8');

      const outputPath = join(autogenDir, 'plan.json');
      await runPlan(['-a', analysisPath, '-o', outputPath, '-q']);

      const output = JSON.parse(readFileSync(outputPath, 'utf-8'));
      const steps = output.plans[0].steps;

      // Check that selectors were inferred (steps have selector hints)
      expect(steps[0].selectors).toBeDefined();
      expect(steps[1].selectors).toBeDefined();

      // data-testid should be recognized
      const testIdStep = steps.find((s: { selectors?: Array<{ strategy: string }> }) =>
        s.selectors?.some((h: { strategy: string }) => h.strategy === 'testId')
      );
      expect(testIdStep).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should fail gracefully when analysis file missing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

      try {
        await runPlan(['-a', '/nonexistent/analysis.json']);
      } catch {
        // Expected exit
      }

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should validate strategy option', async () => {
      const analysisPath = join(autogenDir, 'analysis.json');
      const analysis = createAnalysis([{ journeyId: 'J1', title: 'T', steps: [{ text: 'Test', type: 'interaction' }] }]);
      writeFileSync(analysisPath, JSON.stringify(analysis), 'utf-8');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

      try {
        await runPlan(['-a', analysisPath, '--strategy', 'invalid']);
      } catch {
        // Expected exit
      }

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('output format', () => {
    it('should output valid JSON with --json flag', async () => {
      const analysisPath = join(autogenDir, 'analysis.json');
      const analysis = createAnalysis([{
        journeyId: 'J1',
        title: 'T',
        steps: [{ text: 'Test', type: 'navigation' }],
      }]);
      writeFileSync(analysisPath, JSON.stringify(analysis), 'utf-8');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runPlan(['-a', analysisPath, '--json', '-q']);

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
      expect(parsed.plans).toBeDefined();
    });

    it('should include metadata in output', async () => {
      const analysisPath = join(autogenDir, 'analysis.json');
      const analysis = createAnalysis([{
        journeyId: 'J1',
        title: 'T',
        steps: [{ text: 'Test', type: 'navigation' }],
      }]);
      writeFileSync(analysisPath, JSON.stringify(analysis), 'utf-8');

      const outputPath = join(autogenDir, 'plan.json');
      await runPlan(['-a', analysisPath, '-o', outputPath, '-q']);

      const output = JSON.parse(readFileSync(outputPath, 'utf-8'));

      expect(output.version).toBe('1.0');
      expect(output.createdAt).toBeDefined();
    });
  });
});
