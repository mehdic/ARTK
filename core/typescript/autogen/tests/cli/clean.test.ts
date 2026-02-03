/**
 * Tests for CLI clean command
 * @module tests/cli/clean
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';

// Mock paths module FIRST
const testDir = join(process.cwd(), 'test-fixtures', 'clean-test');
const autogenDir = join(testDir, '.artk', 'autogen');

vi.mock('../../src/utils/paths.js', () => ({
  getAutogenDir: vi.fn(() => join(process.cwd(), 'test-fixtures', 'clean-test', '.artk', 'autogen')),
  getAutogenArtifact: vi.fn((name: string) => join(process.cwd(), 'test-fixtures', 'clean-test', '.artk', 'autogen', `${name}.json`)),
  ensureAutogenDir: vi.fn(async () => {
    const { mkdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    mkdirSync(join(process.cwd(), 'test-fixtures', 'clean-test', '.artk', 'autogen'), { recursive: true });
  }),
  cleanAutogenArtifacts: vi.fn(async () => {
    // Just creates the directory
    const { mkdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    mkdirSync(join(process.cwd(), 'test-fixtures', 'clean-test', '.artk', 'autogen'), { recursive: true });
  }),
  hasAutogenArtifacts: vi.fn(() => {
    const { existsSync, readdirSync } = require('node:fs');
    const { join } = require('node:path');
    const dir = join(process.cwd(), 'test-fixtures', 'clean-test', '.artk', 'autogen');
    if (!existsSync(dir)) return false;
    try {
      return readdirSync(dir).length > 0;
    } catch {
      return false;
    }
  }),
  getHarnessRoot: vi.fn(() => join(process.cwd(), 'test-fixtures', 'clean-test')),
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
  loadPipelineState: vi.fn().mockResolvedValue({ stage: 'initial', journeyIds: [], history: [] }),
  updatePipelineState: vi.fn().mockResolvedValue({}),
  resetPipelineState: vi.fn().mockResolvedValue({}),
  canProceedTo: vi.fn(() => ({ allowed: true })),
}));

import { runClean } from '../../src/cli/clean.js';

describe('CLI: clean command', () => {
  beforeEach(() => {
    mkdirSync(autogenDir, { recursive: true });
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

      await runClean(['--help']);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('clean');
      expect(output).toContain('--dry-run');
      expect(output).toContain('--keep-analysis');
    });

    it('should report nothing to clean when no artifacts exist', async () => {
      // Empty the autogen directory
      rmSync(autogenDir, { recursive: true, force: true });
      mkdirSync(autogenDir, { recursive: true });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runClean([]);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('No autogen artifacts');
    });
  });

  describe('dry-run mode', () => {
    it('should show what would be deleted without deleting', async () => {
      // Create some artifacts
      writeFileSync(join(autogenDir, 'analysis.json'), '{}');
      writeFileSync(join(autogenDir, 'plan.json'), '{}');
      writeFileSync(join(autogenDir, 'results.json'), '{}');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runClean(['--dry-run']);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Would delete');

      // Verify files still exist
      expect(existsSync(join(autogenDir, 'analysis.json'))).toBe(true);
      expect(existsSync(join(autogenDir, 'plan.json'))).toBe(true);
    });
  });

  describe('keep options', () => {
    it('should keep analysis.json with --keep-analysis', async () => {
      writeFileSync(join(autogenDir, 'analysis.json'), '{}');
      writeFileSync(join(autogenDir, 'results.json'), '{}');

      vi.spyOn(console, 'log').mockImplementation(() => {});
      await runClean(['--keep-analysis', '--force', '-q']);

      // analysis.json should still exist
      expect(existsSync(join(autogenDir, 'analysis.json'))).toBe(true);
      // results.json should be deleted
      expect(existsSync(join(autogenDir, 'results.json'))).toBe(false);
    });

    it('should keep plan.json with --keep-plan', async () => {
      writeFileSync(join(autogenDir, 'plan.json'), '{}');
      writeFileSync(join(autogenDir, 'results.json'), '{}');

      await runClean(['--keep-plan', '--force', '-q']);

      // plan.json should still exist
      expect(existsSync(join(autogenDir, 'plan.json'))).toBe(true);
      // results.json should be deleted
      expect(existsSync(join(autogenDir, 'results.json'))).toBe(false);
    });

    it('should report nothing to delete when all files are kept', async () => {
      writeFileSync(join(autogenDir, 'analysis.json'), '{}');
      writeFileSync(join(autogenDir, 'plan.json'), '{}');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runClean(['--keep-analysis', '--keep-plan']);

      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Nothing to delete');
    });
  });

  describe('force deletion', () => {
    it('should delete without confirmation with --force', async () => {
      writeFileSync(join(autogenDir, 'test.json'), '{"test": true}');

      await runClean(['--force', '-q']);

      // File should be deleted
      expect(existsSync(join(autogenDir, 'test.json'))).toBe(false);
    });
  });

  describe('size formatting', () => {
    it('should format file sizes in output', async () => {
      // Create a file with some content
      writeFileSync(join(autogenDir, 'large.json'), JSON.stringify({ data: 'x'.repeat(2000) }));

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runClean(['--dry-run']);

      const output = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      // Should show size in bytes or KB
      expect(output).toMatch(/\d+\s*(B|KB|MB)/);
    });
  });
});
