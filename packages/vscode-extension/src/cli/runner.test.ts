/**
 * CLI Runner Tests
 *
 * Tests for CLI execution, security validations, and error handling.
 * This is SECURITY-CRITICAL code that prevents command injection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import { EventEmitter } from 'events';

// Hoist mock state
const mockState = vi.hoisted(() => ({
  configValue: '' as string,
  fsExistsSync: false,
  fsStatIsFile: true,
  showWarningMessages: [] as string[],
  spawnCalls: [] as any[],
}));

// Mock child_process
vi.mock('child_process', () => ({
  spawn: (...args: any[]) => {
    mockState.spawnCalls.push(args);
    const process = new EventEmitter() as childProcess.ChildProcess;
    const stdoutEmitter = new EventEmitter();
    const stderrEmitter = new EventEmitter();

    (process as any).stdout = stdoutEmitter;
    (process as any).stderr = stderrEmitter;
    (process as any).stdin = { write: () => {}, end: () => {} };
    (process as any).kill = () => {};
    (process as any).killed = false;

    // Emit success immediately
    setTimeout(() => {
      stdoutEmitter.emit('data', 'success');
      process.emit('close', 0);
    }, 10);

    return process;
  },
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: () => mockState.fsExistsSync,
  statSync: () => ({ isFile: () => mockState.fsStatIsFile }),
  promises: {
    access: () => Promise.resolve(),
    readFile: () => Promise.resolve(''),
    writeFile: () => Promise.resolve(),
  },
}));

// Mock vscode
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: () => mockState.configValue,
    }),
  },
  window: {
    showWarningMessage: (msg: string) => {
      mockState.showWarningMessages.push(msg);
      return Promise.resolve();
    },
    withProgress: async (_options: unknown, task: (progress: { report: () => void }) => Promise<unknown>) => {
      return task({ report: () => {} });
    },
  },
  ProgressLocation: {
    Notification: 15,
  },
}));

// Import after mocks
import {
  runCLI,
  init,
  check,
  doctor,
  upgrade,
  uninstall,
  llkbHealth,
  llkbStats,
  llkbStatsJson,
  llkbExport,
  llkbSeed,
  journeyValidate,
  journeyCheckLlkb,
  journeyImplement,
  journeySummary,
} from './runner';

describe('CLI Runner', () => {
  beforeEach(() => {
    // Reset mock state
    mockState.configValue = '';
    mockState.fsExistsSync = false;
    mockState.fsStatIsFile = true;
    mockState.showWarningMessages = [];
    mockState.spawnCalls = [];
  });

  describe('Security: CLI Path Validation', () => {
    it('should reject relative paths', async () => {
      mockState.configValue = './artk';
      mockState.fsExistsSync = true;

      await runCLI(['--version']);

      expect(mockState.showWarningMessages.some(m => m.includes('absolute path'))).toBe(true);
    });

    it('should reject paths that do not exist', async () => {
      mockState.configValue = '/nonexistent/artk';
      mockState.fsExistsSync = false;

      await runCLI(['--version']);

      expect(mockState.showWarningMessages.some(m => m.includes('does not exist'))).toBe(true);
    });

    it('should reject paths that are directories', async () => {
      mockState.configValue = '/usr/local/bin';
      mockState.fsExistsSync = true;
      mockState.fsStatIsFile = false;

      await runCLI(['--version']);

      expect(mockState.showWarningMessages.some(m => m.includes('must be a file'))).toBe(true);
    });

    it('should reject paths with dangerous characters - semicolon', async () => {
      mockState.configValue = '/usr/local/bin/artk;rm -rf /';
      mockState.fsExistsSync = true;
      mockState.fsStatIsFile = true;

      await runCLI(['--version']);

      expect(mockState.showWarningMessages.some(m => m.includes('invalid characters'))).toBe(true);
    });

    it('should reject paths with dangerous characters - pipe', async () => {
      mockState.configValue = '/usr/local/bin/artk | cat /etc/passwd';
      mockState.fsExistsSync = true;
      mockState.fsStatIsFile = true;

      await runCLI(['--version']);

      expect(mockState.showWarningMessages.some(m => m.includes('invalid characters'))).toBe(true);
    });

    it('should reject paths with dangerous characters - backtick', async () => {
      mockState.configValue = '/usr/local/bin/artk`whoami`';
      mockState.fsExistsSync = true;
      mockState.fsStatIsFile = true;

      await runCLI(['--version']);

      expect(mockState.showWarningMessages.some(m => m.includes('invalid characters'))).toBe(true);
    });

    it('should reject paths with dangerous characters - dollar sign', async () => {
      mockState.configValue = '/usr/local/bin/artk$(cat /etc/passwd)';
      mockState.fsExistsSync = true;
      mockState.fsStatIsFile = true;

      await runCLI(['--version']);

      expect(mockState.showWarningMessages.some(m => m.includes('invalid characters'))).toBe(true);
    });

    it('should reject paths with quotes', async () => {
      mockState.configValue = '/usr/local/bin/artk"test';
      mockState.fsExistsSync = true;
      mockState.fsStatIsFile = true;

      await runCLI(['--version']);

      expect(mockState.showWarningMessages.some(m => m.includes('invalid characters'))).toBe(true);
    });

    it('should accept valid absolute paths', async () => {
      mockState.configValue = '/usr/local/bin/artk';
      mockState.fsExistsSync = true;
      mockState.fsStatIsFile = true;

      await runCLI(['--version']);

      expect(mockState.showWarningMessages.length).toBe(0);
      expect(mockState.spawnCalls.length).toBe(1);
      expect(mockState.spawnCalls[0][0]).toBe('/usr/local/bin/artk');
    });
  });

  describe('Security: Shell Disabled', () => {
    it('should never use shell: true', async () => {
      await runCLI(['init', '/tmp/test']);

      expect(mockState.spawnCalls.length).toBe(1);
      expect(mockState.spawnCalls[0][2].shell).toBe(false);
    });
  });

  describe('runCLI', () => {
    it('should return success result on exit code 0', async () => {
      const result = await runCLI(['--version']);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should use npx by default', async () => {
      await runCLI(['--version']);

      expect(mockState.spawnCalls.length).toBe(1);
      // On non-Windows, uses npx
      if (process.platform !== 'win32') {
        expect(mockState.spawnCalls[0][0]).toBe('npx');
        expect(mockState.spawnCalls[0][1]).toContain('@artk/cli');
      }
    });
  });

  describe('CLI Commands', () => {
    describe('init', () => {
      it('should build correct arguments', async () => {
        await init({ targetPath: '/test/project' });

        expect(mockState.spawnCalls.length).toBe(1);
        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('@artk/cli');
        expect(args).toContain('init');
        expect(args).toContain('/test/project');
      });

      it('should include variant option', async () => {
        await init({ targetPath: '/test', variant: 'modern-esm' });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('--variant');
        expect(args).toContain('modern-esm');
      });

      it('should include skip options', async () => {
        await init({
          targetPath: '/test',
          skipNpm: true,
          skipLlkb: true,
          skipBrowsers: true,
        });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('--skip-npm');
        expect(args).toContain('--skip-llkb');
        expect(args).toContain('--skip-browsers');
      });

      it('should include force option', async () => {
        await init({ targetPath: '/test', force: true });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('--force');
      });
    });

    describe('check', () => {
      it('should include --json flag', async () => {
        await check();

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('check');
        expect(args).toContain('--json');
      });
    });

    describe('doctor', () => {
      it('should include fix option', async () => {
        await doctor({ fix: true });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('doctor');
        expect(args).toContain('--fix');
      });

      it('should include target path', async () => {
        await doctor({ targetPath: '/my/project' });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('/my/project');
      });
    });

    describe('upgrade', () => {
      it('should include force option', async () => {
        await upgrade({ force: true });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('upgrade');
        expect(args).toContain('--force');
      });

      it('should include target path', async () => {
        await upgrade({ targetPath: '/project' });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('/project');
      });
    });

    describe('uninstall', () => {
      it('should pass target path', async () => {
        await uninstall('/old/project');

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('uninstall');
        expect(args).toContain('/old/project');
      });
    });

    describe('llkbHealth', () => {
      it('should include llkb-root option', async () => {
        await llkbHealth({ llkbRoot: '/path/to/llkb' });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('llkb');
        expect(args).toContain('health');
        expect(args).toContain('--llkb-root');
        expect(args).toContain('/path/to/llkb');
      });
    });

    describe('llkbStats', () => {
      it('should include llkb-root option', async () => {
        await llkbStats({ llkbRoot: '/path/to/llkb' });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('llkb');
        expect(args).toContain('stats');
        expect(args).toContain('--llkb-root');
        expect(args).toContain('/path/to/llkb');
      });
    });

    describe('llkbExport', () => {
      it('should build correct export arguments', async () => {
        await llkbExport({
          llkbRoot: '/path/to/llkb',
          outputDir: '/output',
          minConfidence: 0.8,
          dryRun: true,
        });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('llkb');
        expect(args).toContain('export');
        expect(args).toContain('--for-autogen');
        expect(args).toContain('--llkb-root');
        expect(args).toContain('/path/to/llkb');
        expect(args).toContain('--output');
        expect(args).toContain('/output');
        expect(args).toContain('--min-confidence');
        expect(args).toContain('0.8');
        expect(args).toContain('--dry-run');
      });
    });

    describe('llkbStatsJson', () => {
      it('should include --json flag for JSON output', async () => {
        await llkbStatsJson({ llkbRoot: '/path/to/llkb' });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('llkb');
        expect(args).toContain('stats');
        expect(args).toContain('--llkb-root');
        expect(args).toContain('/path/to/llkb');
        expect(args).toContain('--json');
      });
    });

    describe('llkbSeed', () => {
      it('should build correct seed arguments', async () => {
        await llkbSeed({
          patterns: 'universal',
          llkbRoot: '/path/to/llkb',
          dryRun: true,
        });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('llkb');
        expect(args).toContain('seed');
        expect(args).toContain('--patterns');
        expect(args).toContain('universal');
        expect(args).toContain('--llkb-root');
        expect(args).toContain('/path/to/llkb');
        expect(args).toContain('--dry-run');
      });

      it('should support --list option', async () => {
        await llkbSeed({
          patterns: '',
          list: true,
        });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('llkb');
        expect(args).toContain('seed');
        expect(args).toContain('--list');
      });
    });

    describe('journeyValidate', () => {
      it('should build correct validate arguments', async () => {
        await journeyValidate({
          journeyIds: ['JRN-0001', 'JRN-0002'],
          harnessRoot: '/path/to/harness',
          json: true,
        });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('journey');
        expect(args).toContain('validate');
        expect(args).toContain('JRN-0001');
        expect(args).toContain('JRN-0002');
        expect(args).toContain('--harness-root');
        expect(args).toContain('/path/to/harness');
        expect(args).toContain('--json');
      });
    });

    describe('journeyCheckLlkb', () => {
      it('should build correct check-llkb arguments', async () => {
        await journeyCheckLlkb('/path/to/harness');

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('journey');
        expect(args).toContain('check-llkb');
        expect(args).toContain('--harness-root');
        expect(args).toContain('/path/to/harness');
        expect(args).toContain('--json');
      });
    });

    describe('journeyImplement', () => {
      it('should build correct implement arguments', async () => {
        await journeyImplement({
          journeyIds: ['JRN-0001'],
          harnessRoot: '/path/to/harness',
          batchMode: 'serial',
          learningMode: 'strict',
          dryRun: true,
          verbose: true,
        });

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('journey');
        expect(args).toContain('implement');
        expect(args).toContain('JRN-0001');
        expect(args).toContain('--harness-root');
        expect(args).toContain('/path/to/harness');
        expect(args).toContain('--batch-mode');
        expect(args).toContain('serial');
        expect(args).toContain('--learning-mode');
        expect(args).toContain('strict');
        expect(args).toContain('--dry-run');
        expect(args).toContain('--verbose');
      });
    });

    describe('journeySummary', () => {
      it('should build correct summary arguments', async () => {
        await journeySummary('/path/to/harness');

        const args = mockState.spawnCalls[0][1];
        expect(args).toContain('journey');
        expect(args).toContain('summary');
        expect(args).toContain('--harness-root');
        expect(args).toContain('/path/to/harness');
        expect(args).toContain('--json');
      });
    });
  });
});
