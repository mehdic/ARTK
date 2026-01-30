/**
 * CLI Runner - Execute ARTK CLI commands
 */

import { spawn, ChildProcess } from 'child_process';
import * as vscode from 'vscode';
import type { CLIResult } from '../types';
import type {
  CLICommandOptions,
  CLIInitOptions,
  CLIDoctorOptions,
  CLIUpgradeOptions,
  CLILLKBOptions,
  CLILLKBExportOptions,
  CheckPrerequisitesResult,
} from './types';

const DEFAULT_TIMEOUT = 120000; // 2 minutes

/**
 * Get the CLI executable path
 * Uses configured path or falls back to npx
 */
function getCLIPath(): { command: string; args: string[] } {
  const config = vscode.workspace.getConfiguration('artk');
  const customPath = config.get<string>('cliPath');

  if (customPath && customPath.trim()) {
    return { command: customPath, args: [] };
  }

  // Use npx to run @artk/cli
  return { command: 'npx', args: ['@artk/cli'] };
}

/**
 * Execute a CLI command and return the result
 */
export async function runCLI(
  args: string[],
  options: CLICommandOptions = {}
): Promise<CLIResult> {
  const { cwd, timeout = DEFAULT_TIMEOUT, env } = options;
  const { command, args: prefixArgs } = getCLIPath();
  const fullArgs = [...prefixArgs, ...args];

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let killed = false;

    const proc = spawn(command, fullArgs, {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
    }, timeout);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);

      if (killed) {
        resolve({
          success: false,
          error: `Command timed out after ${timeout}ms`,
          exitCode: -1,
          stdout,
          stderr,
        });
        return;
      }

      const exitCode = code ?? 0;
      resolve({
        success: exitCode === 0,
        data: stdout.trim(),
        error: exitCode !== 0 ? stderr.trim() || `Exit code: ${exitCode}` : undefined,
        exitCode,
        stdout,
        stderr,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        error: err.message,
        exitCode: -1,
        stdout,
        stderr,
      });
    });
  });
}

/**
 * Run CLI command with progress notification
 */
export async function runCLIWithProgress<T = string>(
  title: string,
  args: string[],
  options: CLICommandOptions = {},
  parseOutput?: (stdout: string) => T
): Promise<CLIResult<T>> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: false,
    },
    async (): Promise<CLIResult<T>> => {
      const result = await runCLI(args, options);
      if (result.success && parseOutput) {
        try {
          return {
            ...result,
            data: parseOutput(result.stdout),
          } as CLIResult<T>;
        } catch (e) {
          return {
            ...result,
            success: false,
            error: `Failed to parse output: ${e instanceof Error ? e.message : String(e)}`,
            data: undefined,
          } as CLIResult<T>;
        }
      }
      return {
        ...result,
        data: result.data as T | undefined,
      } as CLIResult<T>;
    }
  );
}

/**
 * Initialize ARTK in a project
 */
export async function init(options: CLIInitOptions): Promise<CLIResult> {
  const args = ['init', options.targetPath];

  if (options.variant && options.variant !== 'auto') {
    args.push('--variant', options.variant);
  }
  if (options.skipNpm) {
    args.push('--skip-npm');
  }
  if (options.skipLlkb) {
    args.push('--skip-llkb');
  }
  if (options.skipBrowsers) {
    args.push('--skip-browsers');
  }
  if (options.noPrompts) {
    args.push('--no-prompts');
  }
  if (options.force) {
    args.push('--force');
  }

  return runCLIWithProgress('Installing ARTK...', args);
}

/**
 * Check prerequisites
 */
export async function check(): Promise<CLIResult<CheckPrerequisitesResult>> {
  return runCLIWithProgress(
    'Checking prerequisites...',
    ['check', '--json'],
    {},
    (stdout) => JSON.parse(stdout)
  );
}

/**
 * Run doctor diagnostics
 */
export async function doctor(options: CLIDoctorOptions = {}): Promise<CLIResult> {
  const args = ['doctor'];

  if (options.targetPath) {
    args.push(options.targetPath);
  }
  if (options.fix) {
    args.push('--fix');
  }

  return runCLIWithProgress('Running diagnostics...', args, {
    cwd: options.targetPath,
  });
}

/**
 * Upgrade ARTK installation
 */
export async function upgrade(options: CLIUpgradeOptions = {}): Promise<CLIResult> {
  const args = ['upgrade'];

  if (options.targetPath) {
    args.push(options.targetPath);
  }
  if (options.force) {
    args.push('--force');
  }

  return runCLIWithProgress('Upgrading ARTK...', args, {
    cwd: options.targetPath,
  });
}

/**
 * Uninstall ARTK
 */
export async function uninstall(targetPath: string): Promise<CLIResult> {
  return runCLIWithProgress('Uninstalling ARTK...', ['uninstall', targetPath]);
}

/**
 * LLKB health check
 */
export async function llkbHealth(options: CLILLKBOptions): Promise<CLIResult> {
  return runCLI(['llkb', 'health', '--llkb-root', options.llkbRoot]);
}

/**
 * LLKB statistics
 */
export async function llkbStats(options: CLILLKBOptions): Promise<CLIResult> {
  return runCLI(['llkb', 'stats', '--llkb-root', options.llkbRoot]);
}

/**
 * Export LLKB for AutoGen
 */
export async function llkbExport(options: CLILLKBExportOptions): Promise<CLIResult> {
  const args = [
    'llkb',
    'export',
    '--for-autogen',
    '--llkb-root',
    options.llkbRoot,
    '--output',
    options.outputDir,
  ];

  if (options.minConfidence !== undefined) {
    args.push('--min-confidence', String(options.minConfidence));
  }
  if (options.dryRun) {
    args.push('--dry-run');
  }

  return runCLIWithProgress('Exporting LLKB...', args);
}
