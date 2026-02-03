/**
 * Tests for CLI refine command
 * @module tests/cli/refine
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import type { RunOutput, TestRunResult } from '../../src/cli/run.js';
import type { RefineOutput } from '../../src/cli/refine.js';

// Mock paths module FIRST
const testDir = join(process.cwd(), 'test-fixtures', 'refine-test');
const outputDir = join(testDir, '.artk', 'autogen');

vi.mock('../../src/utils/paths.js', () => ({
  getAutogenDir: vi.fn(() => join(process.cwd(), 'test-fixtures', 'refine-test', '.artk', 'autogen')),
  getAutogenArtifact: vi.fn((name: string) => join(process.cwd(), 'test-fixtures', 'refine-test', '.artk', 'autogen', `${name}.json`)),
  ensureAutogenDir: vi.fn(async () => {
    const { mkdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    mkdirSync(join(process.cwd(), 'test-fixtures', 'refine-test', '.artk', 'autogen'), { recursive: true });
  }),
  getHarnessRoot: vi.fn(() => join(process.cwd(), 'test-fixtures', 'refine-test')),
}));

// Mock telemetry
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
  loadPipelineState: vi.fn().mockResolvedValue({ stage: 'tested', journeyIds: [], history: [] }),
  updatePipelineState: vi.fn().mockResolvedValue({}),
  canProceedTo: vi.fn(() => ({ allowed: true })),
}));

import { runRefine } from '../../src/cli/refine.js';

// Helper to create a run output with test results
function createRunOutput(results: Partial<TestRunResult>[]): RunOutput {
  const fullResults: TestRunResult[] = results.map((r, i) => ({
    version: '1.0',
    testPath: r.testPath || join(testDir, `test-${i}.spec.ts`),
    journeyId: r.journeyId,
    status: r.status || 'failed',
    duration: r.duration || 1000,
    errors: r.errors || [],
    output: r.output || { stdout: '', stderr: '', exitCode: 1 },
    artifacts: r.artifacts || {},
    executedAt: r.executedAt || new Date().toISOString(),
  }));

  return {
    version: '1.0',
    results: fullResults,
    summary: {
      total: fullResults.length,
      passed: fullResults.filter(r => r.status === 'passed').length,
      failed: fullResults.filter(r => r.status === 'failed').length,
      timeout: fullResults.filter(r => r.status === 'timeout').length,
      error: fullResults.filter(r => r.status === 'error').length,
      totalDuration: fullResults.reduce((sum, r) => sum + r.duration, 0),
    },
    harnessRoot: testDir,
    executedAt: new Date().toISOString(),
  };
}

describe('CLI: refine command', () => {
  beforeEach(() => {
    mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('argument parsing', () => {
    it('should show help with --help flag', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await runRefine(['--help']);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('refine');
      expect(output).toContain('--max-attempts');
      expect(output).toContain('--results');
    });

    it('should error when results file not found', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit'); }) as () => never);

      try {
        await runRefine(['-r', '/nonexistent/results.json']);
      } catch {
        // Expected exit
      }

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Results file not found');
    });

    it('should reject invalid max-attempts value', async () => {
      // Create a results file first
      const resultsPath = join(outputDir, 'results.json');
      writeFileSync(resultsPath, JSON.stringify(createRunOutput([{ status: 'passed' }])));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit'); }) as () => never);

      try {
        await runRefine(['-r', resultsPath, '--max-attempts', 'invalid']);
      } catch {
        // Expected exit
      }

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Invalid max-attempts value');
    });
  });

  describe('refinement analysis', () => {
    it('should report no refinement needed when all tests pass', async () => {
      const resultsPath = join(outputDir, 'results.json');
      writeFileSync(resultsPath, JSON.stringify(createRunOutput([
        { status: 'passed', testPath: join(testDir, 'passing.spec.ts') },
      ])));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runRefine(['-r', resultsPath]);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('All tests passed');
    });

    it('should generate suggestions for failed tests', async () => {
      const resultsPath = join(outputDir, 'results.json');
      writeFileSync(resultsPath, JSON.stringify(createRunOutput([
        {
          status: 'failed',
          testPath: join(testDir, 'failing.spec.ts'),
          errors: [
            {
              message: 'Locator timeout: element not found',
              type: 'selector',
            },
          ],
        },
      ])));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runRefine(['-r', resultsPath, '--json']);

      const jsonOutput = consoleSpy.mock.calls.find(c => {
        try {
          JSON.parse(c[0]);
          return true;
        } catch {
          return false;
        }
      });

      expect(jsonOutput).toBeDefined();
      const parsed: RefineOutput = JSON.parse(jsonOutput![0]);
      expect(parsed.status).toBe('needs_refinement');
      expect(parsed.suggestions.length).toBeGreaterThan(0);
    });

    it('should track convergence across attempts', async () => {
      const resultsPath = join(outputDir, 'results.json');
      const testPath = join(testDir, 'convergence-test.spec.ts');

      // First attempt with errors
      writeFileSync(resultsPath, JSON.stringify(createRunOutput([
        {
          status: 'failed',
          testPath,
          errors: [
            { message: 'Error 1', type: 'selector' },
            { message: 'Error 2', type: 'assertion' },
          ],
        },
      ])));

      await runRefine(['-r', resultsPath, '-q']);

      // Check state was saved
      const statePath = join(outputDir, 'refine-state-convergence-test.json');
      expect(existsSync(statePath)).toBe(true);

      const state = JSON.parse(readFileSync(statePath, 'utf-8'));
      expect(state.attempts.length).toBe(1);
      expect(state.errorCountHistory).toContain(2);
    });

    it('should filter to specific test with --test flag', async () => {
      const resultsPath = join(outputDir, 'results.json');
      writeFileSync(resultsPath, JSON.stringify(createRunOutput([
        { status: 'failed', testPath: join(testDir, 'test1.spec.ts'), errors: [{ message: 'Error', type: 'selector' }] },
        { status: 'failed', testPath: join(testDir, 'test2.spec.ts'), errors: [{ message: 'Error', type: 'selector' }] },
      ])));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runRefine(['-r', resultsPath, '--test', 'test1', '--json']);

      const jsonOutput = consoleSpy.mock.calls.find(c => {
        try {
          JSON.parse(c[0]);
          return true;
        } catch {
          return false;
        }
      });

      expect(jsonOutput).toBeDefined();
      const parsed: RefineOutput = JSON.parse(jsonOutput![0]);
      expect(parsed.testPath).toContain('test1');
    });
  });

  describe('output format', () => {
    it('should output valid JSON with --json flag', async () => {
      const resultsPath = join(outputDir, 'results.json');
      writeFileSync(resultsPath, JSON.stringify(createRunOutput([
        { status: 'failed', testPath: join(testDir, 'json-test.spec.ts'), errors: [{ message: 'Error', type: 'timeout' }] },
      ])));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runRefine(['-r', resultsPath, '--json']);

      const jsonOutput = consoleSpy.mock.calls.find(c => {
        try {
          JSON.parse(c[0]);
          return true;
        } catch {
          return false;
        }
      });

      expect(jsonOutput).toBeDefined();
      const parsed: RefineOutput = JSON.parse(jsonOutput![0]);
      expect(parsed.version).toBe('1.0');
      expect(parsed.convergence).toBeDefined();
      expect(parsed.circuitBreaker).toBeDefined();
    });

    it('should include refinedAt timestamp', async () => {
      const resultsPath = join(outputDir, 'results.json');
      writeFileSync(resultsPath, JSON.stringify(createRunOutput([
        { status: 'failed', testPath: join(testDir, 'timestamp.spec.ts'), errors: [{ message: 'Error', type: 'runtime' }] },
      ])));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runRefine(['-r', resultsPath, '--json']);

      const jsonOutput = consoleSpy.mock.calls.find(c => {
        try {
          const obj = JSON.parse(c[0]);
          return obj.refinedAt !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonOutput).toBeDefined();
      const parsed: RefineOutput = JSON.parse(jsonOutput![0]);
      expect(() => new Date(parsed.refinedAt)).not.toThrow();
    });
  });

  describe('error type handling', () => {
    it('should map selector errors correctly', async () => {
      const resultsPath = join(outputDir, 'results.json');
      writeFileSync(resultsPath, JSON.stringify(createRunOutput([
        {
          status: 'failed',
          testPath: join(testDir, 'selector.spec.ts'),
          errors: [{ message: 'locator strict mode found multiple elements', type: 'selector' }],
        },
      ])));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runRefine(['-r', resultsPath, '--json']);

      const jsonOutput = consoleSpy.mock.calls.find(c => {
        try {
          JSON.parse(c[0]);
          return true;
        } catch {
          return false;
        }
      });

      const parsed: RefineOutput = JSON.parse(jsonOutput![0]);
      expect(parsed.suggestions[0].errorType).toBe('selector');
      expect(parsed.suggestions[0].suggestion).toContain('first');
    });

    it('should map timeout errors correctly', async () => {
      const resultsPath = join(outputDir, 'results.json');
      writeFileSync(resultsPath, JSON.stringify(createRunOutput([
        {
          status: 'failed',
          testPath: join(testDir, 'timeout.spec.ts'),
          errors: [{ message: 'page.goto timeout exceeded', type: 'timeout' }],
        },
      ])));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runRefine(['-r', resultsPath, '--json']);

      const jsonOutput = consoleSpy.mock.calls.find(c => {
        try {
          JSON.parse(c[0]);
          return true;
        } catch {
          return false;
        }
      });

      const parsed: RefineOutput = JSON.parse(jsonOutput![0]);
      expect(parsed.suggestions[0].errorType).toBe('timeout');
      expect(parsed.suggestions[0].suggestion).toContain('timeout');
    });

    it('should map assertion errors correctly', async () => {
      const resultsPath = join(outputDir, 'results.json');
      writeFileSync(resultsPath, JSON.stringify(createRunOutput([
        {
          status: 'failed',
          testPath: join(testDir, 'assertion.spec.ts'),
          errors: [{ message: 'expect received value tobehave false', type: 'assertion' }],
        },
      ])));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runRefine(['-r', resultsPath, '--json']);

      const jsonOutput = consoleSpy.mock.calls.find(c => {
        try {
          JSON.parse(c[0]);
          return true;
        } catch {
          return false;
        }
      });

      const parsed: RefineOutput = JSON.parse(jsonOutput![0]);
      expect(parsed.suggestions[0].errorType).toBe('assertion');
    });
  });
});
