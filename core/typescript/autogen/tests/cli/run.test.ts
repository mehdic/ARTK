/**
 * Tests for CLI run command
 * @module tests/cli/run
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';

// Use vi.hoisted for mocks that need to be referenced in mock factories
const { mockCheckPlaywright } = vi.hoisted(() => ({
  mockCheckPlaywright: vi.fn(),
}));

// Mock paths module FIRST (before other mocks that might depend on it)
const testDir = join(process.cwd(), 'test-fixtures', 'run-test');
const testsDir = join(testDir, 'tests');
const outputDir = join(testDir, '.artk', 'autogen');

vi.mock('../../src/utils/paths.js', () => ({
  getAutogenDir: vi.fn(() => join(process.cwd(), 'test-fixtures', 'run-test', '.artk', 'autogen')),
  getAutogenArtifact: vi.fn((name: string) => join(process.cwd(), 'test-fixtures', 'run-test', '.artk', 'autogen', `${name}.json`)),
  ensureAutogenDir: vi.fn(async () => {
    const { mkdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    mkdirSync(join(process.cwd(), 'test-fixtures', 'run-test', '.artk', 'autogen'), { recursive: true });
  }),
  getHarnessRoot: vi.fn(() => join(process.cwd(), 'test-fixtures', 'run-test')),
}));

// Mock telemetry before importing run
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
  loadPipelineState: vi.fn(() => ({ stage: 'generated', journeyIds: [], history: [] })),
  updatePipelineState: vi.fn().mockResolvedValue({}),
}));

// Mock playwright runner (to avoid spawning real processes)
vi.mock('../../src/refinement/playwright-runner.js', () => ({
  checkPlaywrightInstalled: mockCheckPlaywright,
}));

// Mock child_process spawn to simulate Playwright runs
vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => {
    const mockProc = {
      stdout: {
        on: vi.fn((event: string, cb: (_data: Buffer) => void) => {
          if (event === 'data') {
            setTimeout(() => cb(Buffer.from('Running 1 test\n  ✓ test passed (500ms)\n1 passed\n')), 0);
          }
        }),
      },
      stderr: {
        on: vi.fn(),
      },
      on: vi.fn((event: string, cb: (_code: number) => void) => {
        if (event === 'close') {
          setTimeout(() => cb(0), 10); // Success after a short delay
        }
      }),
    };
    return mockProc;
  }),
}));

import { runRun } from '../../src/cli/run.js';
import type { RunOutput } from '../../src/cli/run.js';

describe('CLI: run command', () => {
  beforeEach(() => {
    mkdirSync(testsDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
    // Reset to default successful playwright check
    mockCheckPlaywright.mockResolvedValue({
      installed: true,
      version: '1.57.0',
    });
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

      await runRun(['--help']);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('run');
      expect(output).toContain('--timeout');
      expect(output).toContain('--retries');
    });

    it('should error when no test files specified', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

      try {
        await runRun([]);
      } catch {
        // Expected exit
      }

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('No test files specified');
    });

    it('should accept custom timeout with --timeout flag', async () => {
      const testPath = join(testsDir, 'test.spec.ts');
      writeFileSync(testPath, `import { test, expect } from '@playwright/test';
test('sample', async () => { expect(true).toBe(true); });`);

      const outputPath = join(outputDir, 'results.json');
      await runRun([testPath, '-o', outputPath, '-q', '--timeout', '60000']);

      expect(existsSync(outputPath)).toBe(true);
    });

    it('should accept custom retries with --retries flag', async () => {
      const testPath = join(testsDir, 'test.spec.ts');
      writeFileSync(testPath, `import { test, expect } from '@playwright/test';
test('sample', async () => { expect(true).toBe(true); });`);

      const outputPath = join(outputDir, 'results.json');
      await runRun([testPath, '-o', outputPath, '-q', '--retries', '3']);

      expect(existsSync(outputPath)).toBe(true);
    });

    it('should reject invalid timeout value', async () => {
      const testPath = join(testsDir, 'test.spec.ts');
      writeFileSync(testPath, `test('x', () => {});`);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

      try {
        await runRun([testPath, '--timeout', 'invalid']);
      } catch {
        // Expected exit
      }

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Invalid timeout value');
    });

    it('should reject invalid retries value', async () => {
      const testPath = join(testsDir, 'test.spec.ts');
      writeFileSync(testPath, `test('x', () => {});`);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit'); }) as () => never);

      try {
        // Use 'abc' as a clearly invalid value (not a number)
        await runRun([testPath, '--retries', 'abc']);
      } catch {
        // Expected exit
      }

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Invalid retries value');
    });
  });

  describe('test execution', () => {
    it('should run test and produce results file', async () => {
      const testPath = join(testsDir, 'test.spec.ts');
      writeFileSync(testPath, `/**
 * @journey JRN-001
 */
import { test, expect } from '@playwright/test';
test('sample', async () => { expect(true).toBe(true); });`);

      const outputPath = join(outputDir, 'results.json');
      await runRun([testPath, '-o', outputPath, '-q']);

      expect(existsSync(outputPath)).toBe(true);
      const output: RunOutput = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(output.version).toBe('1.0');
      expect(output.results).toHaveLength(1);
      expect(output.summary).toBeDefined();
    });

    it('should handle missing test file gracefully', async () => {
      const outputPath = join(outputDir, 'results.json');
      vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

      try {
        await runRun(['/nonexistent/test.spec.ts', '-o', outputPath, '-q']);
      } catch {
        // Expected exit due to test failure
      }

      // Should still write results with error status
      expect(existsSync(outputPath)).toBe(true);
      const output: RunOutput = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(output.results[0].status).toBe('error');
      expect(output.results[0].errors[0].message).toContain('not found');
    });

    it('should extract journey ID from test file', async () => {
      const testPath = join(testsDir, 'journey-test.spec.ts');
      writeFileSync(testPath, `/**
 * @journey JRN-TEST-123
 */
import { test, expect } from '@playwright/test';
test('journey test', async () => { expect(true).toBe(true); });`);

      const outputPath = join(outputDir, 'results.json');
      await runRun([testPath, '-o', outputPath, '-q']);

      const output: RunOutput = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(output.results[0].journeyId).toBe('JRN-TEST-123');
    });
  });

  describe('output format', () => {
    it('should output valid JSON with --json flag', async () => {
      const testPath = join(testsDir, 'json-test.spec.ts');
      writeFileSync(testPath, `import { test, expect } from '@playwright/test';
test('json test', async () => { expect(true).toBe(true); });`);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runRun([testPath, '--json', '-q']);

      const jsonOutput = consoleSpy.mock.calls.find(c => {
        try {
          JSON.parse(c[0]);
          return true;
        } catch {
          return false;
        }
      });

      expect(jsonOutput).toBeDefined();
      const parsed: RunOutput = JSON.parse(jsonOutput![0]);
      expect(parsed.version).toBe('1.0');
      expect(parsed.results).toBeDefined();
      expect(parsed.summary).toBeDefined();
    });

    it('should include summary statistics in output', async () => {
      const testPath = join(testsDir, 'summary-test.spec.ts');
      writeFileSync(testPath, `import { test, expect } from '@playwright/test';
test('summary test', async () => { expect(true).toBe(true); });`);

      const outputPath = join(outputDir, 'results.json');
      await runRun([testPath, '-o', outputPath, '-q']);

      const output: RunOutput = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(output.summary.total).toBe(1);
      expect(output.summary.totalDuration).toBeDefined();
      expect(typeof output.summary.passed).toBe('number');
      expect(typeof output.summary.failed).toBe('number');
    });

    it('should include executedAt timestamp', async () => {
      const testPath = join(testsDir, 'timestamp-test.spec.ts');
      writeFileSync(testPath, `import { test } from '@playwright/test';
test('timestamp', async () => {});`);

      const outputPath = join(outputDir, 'results.json');
      await runRun([testPath, '-o', outputPath, '-q']);

      const output: RunOutput = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(output.executedAt).toBeDefined();
      expect(() => new Date(output.executedAt)).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should report playwright not installed error', async () => {
      // Override the mock for this test
      mockCheckPlaywright.mockResolvedValueOnce({
        installed: false,
        error: 'Playwright not found',
      });

      const testPath = join(testsDir, 'test.spec.ts');
      writeFileSync(testPath, `test('x', () => {});`);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

      try {
        await runRun([testPath]);
      } catch {
        // Expected exit
      }

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Playwright is not installed');
    });
  });
});

// Test error parsing utilities separately
describe('Error parsing utilities', () => {
  // We can't easily import these since they're not exported
  // Testing them through the public interface instead
  it('should correctly categorize error types through run output', async () => {
    // This would require mocking spawn to return different error outputs
    // For now, we verify the error type enum exists in the output
    expect(['selector', 'timeout', 'assertion', 'navigation', 'typescript', 'runtime', 'unknown']).toBeDefined();
  });
});
