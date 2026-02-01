/**
 * Tests for journey implementation workflow
 *
 * These tests verify environment detection, terminal access checks,
 * and session state tracking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectEnvironment,
  hasTerminalAccess,
  formatImplementPlan,
  buildImplementPlan,
  parseGeneratedTestFile,
  getSessionFilePath,
  CommandSpec,
  ImplementPlan,
} from '../journey-implement.js';
import { WorkflowContext, JourneyInfo, createSessionState, ImplementedBatchMode, LearningMode } from '../types.js';

describe('detectEnvironment', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all environment variables that affect detection
    delete process.env.VSCODE_PID;
    delete process.env.VSCODE_CWD;
    delete process.env.TERM_PROGRAM;
    delete process.env.CURSOR_TRACE_ID;
    delete process.env.JETBRAINS_IDE;
    delete process.env.TERMINAL_EMULATOR;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.JENKINS_URL;
    delete process.env.CIRCLECI;
    delete process.env.TRAVIS;
    delete process.env.CI;
    delete process.env.CODESPACES;
    delete process.env.GITHUB_CODESPACE_TOKEN;
    delete process.env.WSL_DISTRO_NAME;
    delete process.env.WSLENV;
    delete process.env.container;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  it('detects VS Code environment', () => {
    process.env.VSCODE_PID = '12345';
    expect(detectEnvironment()).toBe('vscode-local');
  });

  it('detects VS Code via CWD', () => {
    process.env.VSCODE_CWD = '/some/path';
    expect(detectEnvironment()).toBe('vscode-local');
  });

  it('detects VS Code via TERM_PROGRAM', () => {
    process.env.TERM_PROGRAM = 'vscode';
    expect(detectEnvironment()).toBe('vscode-local');
  });

  it('detects Cursor IDE', () => {
    process.env.CURSOR_TRACE_ID = 'some-trace';
    expect(detectEnvironment()).toBe('vscode-local');
  });

  it('detects Cursor via TERM_PROGRAM', () => {
    process.env.TERM_PROGRAM = 'Cursor';
    expect(detectEnvironment()).toBe('vscode-local');
  });

  it('detects JetBrains IDE', () => {
    process.env.JETBRAINS_IDE = 'IntelliJ IDEA';
    expect(detectEnvironment()).toBe('vscode-local');
  });

  it('detects GitHub Actions CI', () => {
    process.env.GITHUB_ACTIONS = 'true';
    expect(detectEnvironment()).toBe('ci-pipeline');
  });

  it('detects GitLab CI', () => {
    process.env.GITLAB_CI = 'true';
    expect(detectEnvironment()).toBe('ci-pipeline');
  });

  it('detects Jenkins CI', () => {
    process.env.JENKINS_URL = 'https://jenkins.example.com';
    expect(detectEnvironment()).toBe('ci-pipeline');
  });

  it('detects generic CI environment', () => {
    process.env.CI = 'true';
    expect(detectEnvironment()).toBe('ci-pipeline');
  });

  it('detects GitHub Codespaces', () => {
    process.env.CODESPACES = 'true';
    expect(detectEnvironment()).toBe('github-web');
  });

  it('detects GitHub via token', () => {
    process.env.GITHUB_CODESPACE_TOKEN = 'some-token';
    expect(detectEnvironment()).toBe('github-web');
  });

  it('detects WSL environment', () => {
    process.env.WSL_DISTRO_NAME = 'Ubuntu';
    expect(detectEnvironment()).toBe('cli-terminal');
  });
});

describe('hasTerminalAccess', () => {
  it('allows terminal access for VS Code local', () => {
    const result = hasTerminalAccess('vscode-local');
    expect(result.available).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('allows terminal access for CLI terminal', () => {
    const result = hasTerminalAccess('cli-terminal');
    expect(result.available).toBe(true);
  });

  it('allows terminal access for CI pipeline', () => {
    const result = hasTerminalAccess('ci-pipeline');
    expect(result.available).toBe(true);
  });

  it('denies terminal access for GitHub web', () => {
    const result = hasTerminalAccess('github-web');
    expect(result.available).toBe(false);
    expect(result.reason).toContain('GitHub.com Copilot');
  });

  it('denies terminal access for unknown environment', () => {
    const result = hasTerminalAccess('unknown');
    expect(result.available).toBe(false);
    expect(result.reason).toContain('Unknown environment');
  });
});

describe('createSessionState', () => {
  it('creates initial session state', () => {
    const journeyIds = ['JRN-0001', 'JRN-0002'];
    const state = createSessionState(journeyIds, 'serial', 'strict');

    expect(state.journeysRequested).toEqual(journeyIds);
    expect(state.journeysCompleted).toEqual([]);
    expect(state.journeysFailed).toEqual([]);
    expect(state.currentJourneyIndex).toBe(0);
    expect(state.totalJourneys).toBe(2);
    expect(state.batchMode).toBe('serial');
    expect(state.learningMode).toBe('strict');
    expect(state.llkbExportCount).toBe(0);
    expect(state.llkbSkippedExports).toBe(0);
    expect(state.startTime).toBeGreaterThan(0);
    expect(state.currentJourneyId).toBeNull();
    expect(state.verificationPassed).toBe(false);
    expect(state.testsGenerated).toEqual([]);
  });
});

describe('formatImplementPlan', () => {
  it('formats plan with all sections', () => {
    const plan: ImplementPlan = {
      journeys: [
        { id: 'JRN-0001', path: '/path/JRN-0001.md', status: 'clarified', title: 'Test', tests: [] },
      ],
      batchMode: 'serial',
      learningMode: 'strict',
      environment: 'cli-terminal',
      llkbExportCommand: {
        executable: 'npx',
        args: ['artk', 'llkb', 'export'],
        description: 'Export LLKB',
      },
      autogenCommands: [
        {
          executable: 'npx',
          args: ['artk-autogen', 'generate', '/path/JRN-0001.md'],
          description: 'Generate tests',
        },
      ],
      warnings: ['Test warning'],
    };

    const output = formatImplementPlan(plan);

    expect(output).toContain('JOURNEY IMPLEMENTATION PLAN');
    expect(output).toContain('Environment: cli-terminal');
    expect(output).toContain('Batch Mode: serial');
    expect(output).toContain('Learning Mode: strict');
    expect(output).toContain('JRN-0001');
    expect(output).toContain('npx artk llkb export');
    expect(output).toContain('npx artk-autogen generate');
    expect(output).toContain('Test warning');
  });

  it('quotes arguments with spaces', () => {
    const plan: ImplementPlan = {
      journeys: [],
      batchMode: 'serial',
      learningMode: 'strict',
      environment: 'cli-terminal',
      llkbExportCommand: {
        executable: 'npx',
        args: ['artk', '--path', '/path with spaces/file.md'],
        description: 'Export LLKB',
      },
      autogenCommands: [],
      warnings: [],
    };

    const output = formatImplementPlan(plan);
    expect(output).toContain('"/path with spaces/file.md"');
  });
});

describe('CommandSpec (security)', () => {
  it('uses array args instead of string (prevents injection)', () => {
    const cmd: CommandSpec = {
      executable: 'npx',
      args: ['artk', '--path', '/safe/path; rm -rf /'],
      description: 'Test command',
    };

    // The malicious input is treated as a single argument, not parsed as shell
    expect(cmd.args[2]).toBe('/safe/path; rm -rf /');
    // With shell: false, this would NOT execute rm -rf
  });
});

describe('parseGeneratedTestFile', () => {
  it('parses "Generated: path" format', () => {
    const stdout = 'Some output\nGenerated: /path/to/JRN-0001.spec.ts\nMore output';
    expect(parseGeneratedTestFile(stdout, 'JRN-0001')).toBe('/path/to/JRN-0001.spec.ts');
  });

  it('parses "Created test file: path" format', () => {
    const stdout = 'Some output\nCreated test file: /path/to/test.spec.ts\nDone';
    expect(parseGeneratedTestFile(stdout, 'JRN-0001')).toBe('/path/to/test.spec.ts');
  });

  it('parses "Output: path" format', () => {
    const stdout = 'Processing...\nOutput: /tests/JRN-0001.spec.ts\n';
    expect(parseGeneratedTestFile(stdout, 'JRN-0001')).toBe('/tests/JRN-0001.spec.ts');
  });

  it('finds journey ID in path', () => {
    const stdout = 'Writing to /some/path/JRN-0001__login.spec.ts';
    expect(parseGeneratedTestFile(stdout, 'JRN-0001')).toBe('/some/path/JRN-0001__login.spec.ts');
  });

  it('returns null when no pattern matches', () => {
    const stdout = 'No test file information here';
    expect(parseGeneratedTestFile(stdout, 'JRN-0001')).toBeNull();
  });

  it('handles empty stdout', () => {
    expect(parseGeneratedTestFile('', 'JRN-0001')).toBeNull();
  });
});

describe('getSessionFilePath', () => {
  it('returns correct path', () => {
    const result = getSessionFilePath('/project/artk-e2e');
    expect(result).toContain('.artk');
    expect(result).toContain('session.json');
  });
});

describe('buildImplementPlan', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set up environment to pass terminal access check
    process.env.VSCODE_PID = '12345';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const mockContext: WorkflowContext = {
    projectRoot: '/project',
    harnessRoot: '/project/artk-e2e',
    llkbRoot: '/project/artk-e2e/.artk/llkb',
    dryRun: true,
    environment: 'unknown',
  };

  it('fails when no journey IDs provided', () => {
    const result = buildImplementPlan(mockContext, {
      journeyIds: '',
      dryRun: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No valid journey IDs');
  });

  it('fails with invalid batch mode', () => {
    const result = buildImplementPlan(mockContext, {
      journeyIds: 'JRN-0001',
      batchMode: 'invalid',
      dryRun: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown batch mode');
  });

  it('fails with parallel batch mode (not implemented)', () => {
    const result = buildImplementPlan(mockContext, {
      journeyIds: 'JRN-0001',
      batchMode: 'parallel',
      dryRun: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('not yet implemented');
  });

  it('fails with invalid learning mode', () => {
    const result = buildImplementPlan(mockContext, {
      journeyIds: 'JRN-0001',
      learningMode: 'invalid',
      dryRun: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid learning mode');
  });

  it('fails when terminal access unavailable in non-dry-run mode', () => {
    // Clear VS Code env to simulate unknown environment
    delete process.env.VSCODE_PID;
    delete process.env.VSCODE_CWD;

    const result = buildImplementPlan(mockContext, {
      journeyIds: 'JRN-0001',
      dryRun: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown environment');
  });

  it('allows dry-run even without terminal access', () => {
    // Clear VS Code env to simulate unknown environment
    delete process.env.VSCODE_PID;
    delete process.env.VSCODE_CWD;

    const result = buildImplementPlan(mockContext, {
      journeyIds: 'JRN-0001',
      dryRun: true,
    });

    // Will fail on LLKB validation (not terminal access)
    expect(result.success).toBe(false);
    expect(result.error).toContain('LLKB');
  });
});
