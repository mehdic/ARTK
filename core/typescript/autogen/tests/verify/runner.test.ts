/**
 * Playwright Runner Wrapper Tests
 * @see T046 - Unit test for Playwright runner wrapper
 */
import { describe, it, expect } from 'vitest';
import {
  buildPlaywrightArgs,
  isPlaywrightAvailable,
  getPlaywrightVersion,
} from '../../src/verify/runner.js';

describe('buildPlaywrightArgs', () => {
  it('should build basic test command', () => {
    const args = buildPlaywrightArgs({});
    expect(args).toEqual(['test']);
  });

  it('should add test file', () => {
    const args = buildPlaywrightArgs({ testFile: 'tests/login.spec.ts' });
    expect(args).toContain('tests/login.spec.ts');
  });

  it('should add grep pattern', () => {
    const args = buildPlaywrightArgs({ grep: '@smoke' });
    expect(args).toContain('--grep');
    expect(args).toContain('@smoke');
  });

  it('should add project', () => {
    const args = buildPlaywrightArgs({ project: 'chromium' });
    expect(args).toContain('--project');
    expect(args).toContain('chromium');
  });

  it('should add workers', () => {
    const args = buildPlaywrightArgs({ workers: 4 });
    expect(args).toContain('--workers');
    expect(args).toContain('4');
  });

  it('should add retries', () => {
    const args = buildPlaywrightArgs({ retries: 2 });
    expect(args).toContain('--retries');
    expect(args).toContain('2');
  });

  it('should add repeat-each', () => {
    const args = buildPlaywrightArgs({ repeatEach: 3 });
    expect(args).toContain('--repeat-each');
    expect(args).toContain('3');
  });

  it('should add fail-on-flaky-tests', () => {
    const args = buildPlaywrightArgs({ failOnFlaky: true });
    expect(args).toContain('--fail-on-flaky-tests');
  });

  it('should add timeout', () => {
    const args = buildPlaywrightArgs({ timeout: 30000 });
    expect(args).toContain('--timeout');
    expect(args).toContain('30000');
  });

  it('should add reporter', () => {
    const args = buildPlaywrightArgs({ reporter: 'json' });
    expect(args).toContain('--reporter');
    expect(args).toContain('json');
  });

  it('should add output directory', () => {
    const args = buildPlaywrightArgs({ outputDir: './results' });
    expect(args).toContain('--output');
    expect(args).toContain('./results');
  });

  it('should add headed mode', () => {
    const args = buildPlaywrightArgs({ headed: true });
    expect(args).toContain('--headed');
  });

  it('should add debug mode', () => {
    const args = buildPlaywrightArgs({ debug: true });
    expect(args).toContain('--debug');
  });

  it('should add update-snapshots', () => {
    const args = buildPlaywrightArgs({ updateSnapshots: true });
    expect(args).toContain('--update-snapshots');
  });

  it('should combine multiple options', () => {
    const args = buildPlaywrightArgs({
      testFile: 'tests/login.spec.ts',
      project: 'chromium',
      workers: 2,
      retries: 1,
    });

    expect(args).toContain('test');
    expect(args).toContain('tests/login.spec.ts');
    expect(args).toContain('--project');
    expect(args).toContain('chromium');
    expect(args).toContain('--workers');
    expect(args).toContain('2');
    expect(args).toContain('--retries');
    expect(args).toContain('1');
  });
});

describe('isPlaywrightAvailable', () => {
  it('should return a boolean', () => {
    const result = isPlaywrightAvailable();
    expect(typeof result).toBe('boolean');
  });
});

describe('getPlaywrightVersion', () => {
  it('should return version string or null', () => {
    const version = getPlaywrightVersion();
    if (version !== null) {
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    }
  });
});
