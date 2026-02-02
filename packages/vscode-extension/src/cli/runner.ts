/**
 * CLI Runner - Execute ARTK CLI commands
 *
 * SECURITY: This module uses `shell: false` to prevent command injection.
 * Custom CLI paths are validated before use.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { CLIResult } from '../types';
import type {
  CLICommandOptions,
  CLIInitOptions,
  CLIDoctorOptions,
  CLIUpgradeOptions,
  CLILLKBOptions,
  CLILLKBExportOptions,
  CLILLKBSeedOptions,
  CLIJourneyValidateOptions,
  CLIJourneyImplementOptions,
  CheckPrerequisitesResult,
  LLKBStatsResult,
  JourneySummary,
} from './types';

const DEFAULT_TIMEOUT = 120000; // 2 minutes
const MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10MB limit to prevent memory issues

/**
 * Validate that a path is safe to use as a CLI executable
 * Returns an error message if invalid, undefined if valid
 */
function validateCLIPath(cliPath: string): string | undefined {
  // Path must be absolute
  if (!path.isAbsolute(cliPath)) {
    return 'CLI path must be an absolute path';
  }

  // Path must exist
  if (!fs.existsSync(cliPath)) {
    return `CLI path does not exist: ${cliPath}`;
  }

  // Path must be a file (not a directory)
  const stat = fs.statSync(cliPath);
  if (!stat.isFile()) {
    return 'CLI path must be a file, not a directory';
  }

  // Reject paths containing dangerous characters
  const dangerousChars = /[;&|`$(){}[\]<>\\'"]/;
  if (dangerousChars.test(cliPath)) {
    return 'CLI path contains invalid characters';
  }

  return undefined;
}

/**
 * Get the CLI executable path
 * Uses configured path (validated) or falls back to npx
 */
function getCLIPath(): { command: string; args: string[]; useShell: boolean } {
  const config = vscode.workspace.getConfiguration('artk');
  const customPath = config.get<string>('cliPath');

  if (customPath && customPath.trim()) {
    const trimmed = customPath.trim();
    const error = validateCLIPath(trimmed);
    if (error) {
      // Log error and fall back to npx
      vscode.window.showWarningMessage(`Invalid artk.cliPath: ${error}. Using npx instead.`);
      return { command: 'npx', args: ['@artk/cli'], useShell: false };
    }
    return { command: trimmed, args: [], useShell: false };
  }

  // Use npx to run @artk/cli
  // npx requires shell on Windows for proper PATH resolution
  const isWindows = process.platform === 'win32';
  return {
    command: isWindows ? 'npx.cmd' : 'npx',
    args: ['@artk/cli'],
    useShell: false
  };
}

/**
 * Execute a CLI command and return the result
 *
 * SECURITY: Uses shell: false to prevent command injection
 */
export async function runCLI(
  args: string[],
  options: CLICommandOptions = {}
): Promise<CLIResult> {
  const { cwd, timeout = DEFAULT_TIMEOUT, env } = options;
  const { command, args: prefixArgs, useShell } = getCLIPath();
  const fullArgs = [...prefixArgs, ...args];

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let killed = false;
    let outputTruncated = false;

    const proc = spawn(command, fullArgs, {
      cwd,
      env: { ...process.env, ...env },
      shell: useShell, // false by default for security
      windowsHide: true, // Hide console window on Windows
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
      // Force kill after 5 seconds if SIGTERM doesn't work
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      }, 5000);
    }, timeout);

    proc.stdout.on('data', (data) => {
      if (stdout.length < MAX_OUTPUT_SIZE) {
        stdout += data.toString();
      } else if (!outputTruncated) {
        outputTruncated = true;
        stdout += '\n... output truncated (exceeded 10MB limit)';
      }
    });

    proc.stderr.on('data', (data) => {
      if (stderr.length < MAX_OUTPUT_SIZE) {
        stderr += data.toString();
      }
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
        error: exitCode !== 0 ? formatErrorMessage(exitCode, stderr) : undefined,
        exitCode,
        stdout,
        stderr,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        error: formatSpawnError(err),
        exitCode: -1,
        stdout,
        stderr,
      });
    });
  });
}

/**
 * Format error message for user display
 */
function formatErrorMessage(exitCode: number, stderr: string): string {
  const trimmed = stderr.trim();
  if (trimmed) {
    return trimmed;
  }
  return `Command failed with exit code ${exitCode}`;
}

/**
 * Format spawn error for user display
 */
function formatSpawnError(err: Error): string {
  // Provide user-friendly messages for common errors
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
    return 'ARTK CLI not found. Make sure @artk/cli is installed or configure artk.cliPath.';
  }
  if ((err as NodeJS.ErrnoException).code === 'EACCES') {
    return 'Permission denied. Check that the CLI executable has execute permissions.';
  }
  return err.message;
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
 * LLKB statistics as JSON
 */
export async function llkbStatsJson(options: CLILLKBOptions): Promise<CLIResult<LLKBStatsResult>> {
  return runCLI(['llkb', 'stats', '--llkb-root', options.llkbRoot, '--json']) as Promise<CLIResult<LLKBStatsResult>>;
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

/**
 * Seed LLKB with universal patterns
 */
export async function llkbSeed(options: CLILLKBSeedOptions): Promise<CLIResult> {
  const args = ['llkb', 'seed'];

  if (options.list) {
    args.push('--list');
    return runCLI(args);
  }

  args.push('--patterns', options.patterns);

  if (options.llkbRoot) {
    args.push('--llkb-root', options.llkbRoot);
  }
  if (options.dryRun) {
    args.push('--dry-run');
  }

  return runCLIWithProgress('Seeding LLKB with patterns...', args);
}

/**
 * Validate journey(s) for implementation
 */
export async function journeyValidate(options: CLIJourneyValidateOptions): Promise<CLIResult> {
  const args = [
    'journey',
    'validate',
    ...options.journeyIds,
    '--harness-root',
    options.harnessRoot,
  ];

  if (options.json) {
    args.push('--json');
  }

  return runCLIWithProgress('Validating journey(s)...', args);
}

/**
 * Check if LLKB is configured and ready
 */
export async function journeyCheckLlkb(harnessRoot: string): Promise<CLIResult> {
  return runCLI(['journey', 'check-llkb', '--harness-root', harnessRoot, '--json']);
}

/**
 * Implement journey(s) - generate tests
 */
export async function journeyImplement(options: CLIJourneyImplementOptions): Promise<CLIResult> {
  const args = [
    'journey',
    'implement',
    ...options.journeyIds,
    '--harness-root',
    options.harnessRoot,
  ];

  if (options.batchMode) {
    args.push('--batch-mode', options.batchMode);
  }
  if (options.learningMode) {
    args.push('--learning-mode', options.learningMode);
  }
  if (options.dryRun) {
    args.push('--dry-run');
  }
  if (options.verbose) {
    args.push('--verbose');
  }

  return runCLIWithProgress('Implementing journey(s)...', args);
}

/**
 * Get journey summary statistics
 */
export async function journeySummary(harnessRoot: string): Promise<CLIResult<JourneySummary>> {
  return runCLI(['journey', 'summary', '--harness-root', harnessRoot, '--json']) as Promise<CLIResult<JourneySummary>>;
}
