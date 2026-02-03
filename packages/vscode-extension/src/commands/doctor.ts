/**
 * ARTK Doctor Command - Run diagnostics
 *
 * Native implementation that doesn't require npm registry access.
 * Performs file system checks to verify ARTK installation health.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspaceContextManager } from '../workspace';

interface DiagnosticCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: () => Promise<void>;
}

interface DiagnosticResult {
  checks: DiagnosticCheck[];
  passed: number;
  warnings: number;
  failures: number;
}

/**
 * Run native diagnostics on ARTK installation
 */
async function runDiagnosticsNative(artkE2ePath: string, autoFix: boolean): Promise<DiagnosticResult> {
  const checks: DiagnosticCheck[] = [];

  // 1. Check artk-e2e directory exists
  if (fs.existsSync(artkE2ePath)) {
    checks.push({ name: 'artk-e2e directory', status: 'pass', message: 'Directory exists' });
  } else {
    checks.push({ name: 'artk-e2e directory', status: 'fail', message: 'Directory not found' });
    // Can't continue if directory doesn't exist
    return summarizeChecks(checks);
  }

  // 2. Check required directories
  const requiredDirs = [
    'vendor/artk-core',
    '.artk',
    'tests',
    'journeys',
    'src/modules/foundation',
  ];

  for (const dir of requiredDirs) {
    const dirPath = path.join(artkE2ePath, dir);
    if (fs.existsSync(dirPath)) {
      checks.push({ name: `Directory: ${dir}`, status: 'pass', message: 'Exists' });
    } else {
      checks.push({
        name: `Directory: ${dir}`,
        status: 'warn',
        message: 'Missing',
        fix: async () => {
          await fs.promises.mkdir(dirPath, { recursive: true });
        },
      });
    }
  }

  // 3. Check required files
  const requiredFiles = [
    { file: 'package.json', critical: true },
    { file: 'tsconfig.json', critical: false },
    { file: 'playwright.config.ts', critical: true },
    { file: 'artk.config.yml', critical: true },
    { file: '.artk/context.json', critical: true },
  ];

  for (const { file, critical } of requiredFiles) {
    const filePath = path.join(artkE2ePath, file);
    if (fs.existsSync(filePath)) {
      checks.push({ name: `File: ${file}`, status: 'pass', message: 'Exists' });
    } else {
      checks.push({
        name: `File: ${file}`,
        status: critical ? 'fail' : 'warn',
        message: 'Missing',
      });
    }
  }

  // 4. Check package.json has required dependencies
  const pkgPath = path.join(artkE2ePath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const devDeps = pkg.devDependencies || {};

      if (devDeps['@playwright/test']) {
        checks.push({ name: 'Playwright dependency', status: 'pass', message: devDeps['@playwright/test'] });
      } else {
        checks.push({ name: 'Playwright dependency', status: 'fail', message: 'Not found in package.json' });
      }

      if (devDeps['@artk/core'] || devDeps['@artk/core']?.startsWith('file:')) {
        checks.push({ name: '@artk/core dependency', status: 'pass', message: 'Found (vendored)' });
      } else {
        checks.push({ name: '@artk/core dependency', status: 'warn', message: 'Not found' });
      }
    } catch (e) {
      checks.push({ name: 'package.json validity', status: 'fail', message: 'Invalid JSON' });
    }
  }

  // 5. Check node_modules exists
  const nodeModulesPath = path.join(artkE2ePath, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    checks.push({ name: 'node_modules', status: 'pass', message: 'Installed' });
  } else {
    checks.push({
      name: 'node_modules',
      status: 'warn',
      message: 'Not installed - run npm install',
    });
  }

  // 6. Check LLKB structure
  const llkbPath = path.join(artkE2ePath, '.artk', 'llkb');
  if (fs.existsSync(llkbPath)) {
    const llkbFiles = ['config.yml', 'lessons.json', 'components.json', 'analytics.json'];
    let llkbOk = true;
    for (const file of llkbFiles) {
      if (!fs.existsSync(path.join(llkbPath, file))) {
        llkbOk = false;
        break;
      }
    }
    if (llkbOk) {
      checks.push({ name: 'LLKB structure', status: 'pass', message: 'Valid' });
    } else {
      checks.push({ name: 'LLKB structure', status: 'warn', message: 'Incomplete - some files missing' });
    }
  } else {
    checks.push({ name: 'LLKB structure', status: 'warn', message: 'Not initialized' });
  }

  // 7. Check context.json validity
  const contextPath = path.join(artkE2ePath, '.artk', 'context.json');
  if (fs.existsSync(contextPath)) {
    try {
      const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
      if (context.variant && context.nodeVersion && context.playwrightVersion) {
        checks.push({ name: 'context.json validity', status: 'pass', message: `Variant: ${context.variant}` });
      } else {
        checks.push({ name: 'context.json validity', status: 'warn', message: 'Missing required fields' });
      }
    } catch (e) {
      checks.push({ name: 'context.json validity', status: 'fail', message: 'Invalid JSON' });
    }
  }

  // 8. Check artk.config.yml validity
  const configPath = path.join(artkE2ePath, 'artk.config.yml');
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      // Basic YAML validation - check for required sections
      if (content.includes('environments:') && content.includes('browsers:')) {
        checks.push({ name: 'artk.config.yml validity', status: 'pass', message: 'Valid structure' });
      } else {
        checks.push({ name: 'artk.config.yml validity', status: 'warn', message: 'Missing required sections' });
      }
    } catch (e) {
      checks.push({ name: 'artk.config.yml validity', status: 'fail', message: 'Cannot read file' });
    }
  }

  // Apply auto-fixes if requested
  if (autoFix) {
    for (const check of checks) {
      if (check.status !== 'pass' && check.fix) {
        try {
          await check.fix();
          check.status = 'pass';
          check.message += ' (fixed)';
        } catch (e) {
          check.message += ' (fix failed)';
        }
      }
    }
  }

  return summarizeChecks(checks);
}

function summarizeChecks(checks: DiagnosticCheck[]): DiagnosticResult {
  return {
    checks,
    passed: checks.filter((c) => c.status === 'pass').length,
    warnings: checks.filter((c) => c.status === 'warn').length,
    failures: checks.filter((c) => c.status === 'fail').length,
  };
}

/**
 * Run the doctor command
 */
export async function runDoctor(): Promise<void> {
  const contextManager = getWorkspaceContextManager();

  if (!contextManager.isInstalled) {
    const action = await vscode.window.showWarningMessage(
      'ARTK is not installed in this workspace.',
      'Install ARTK'
    );

    if (action === 'Install ARTK') {
      await vscode.commands.executeCommand('artk.init');
    }
    return;
  }

  const artkE2ePath = contextManager.workspaceInfo?.artkE2ePath;
  if (!artkE2ePath) {
    vscode.window.showErrorMessage('Cannot determine artk-e2e path.');
    return;
  }

  // Ask if user wants to auto-fix issues
  const action = await vscode.window.showQuickPick(
    [
      {
        label: '$(search) Diagnose Only',
        description: 'Check for issues without making changes',
        fix: false,
      },
      {
        label: '$(wrench) Diagnose & Fix',
        description: 'Automatically fix issues when possible',
        fix: true,
      },
    ],
    {
      title: 'ARTK Doctor',
      placeHolder: 'Choose diagnostic mode',
    }
  );

  if (!action) {
    return;
  }

  const result = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Running ARTK diagnostics...',
      cancellable: false,
    },
    async () => {
      return await runDiagnosticsNative(artkE2ePath, action.fix);
    }
  );

  // Display results
  const outputChannel = getOutputChannel();
  outputChannel.clear();
  outputChannel.appendLine('ARTK Doctor Results');
  outputChannel.appendLine('='.repeat(50));
  outputChannel.appendLine('');

  for (const check of result.checks) {
    const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
    outputChannel.appendLine(`${icon} ${check.name}: ${check.message}`);
  }

  outputChannel.appendLine('');
  outputChannel.appendLine('-'.repeat(50));
  outputChannel.appendLine(`Passed: ${result.passed} | Warnings: ${result.warnings} | Failures: ${result.failures}`);
  outputChannel.show();

  // Show notification
  if (result.failures > 0) {
    vscode.window.showErrorMessage(
      `ARTK Doctor: ${result.failures} critical issues found. See Output panel.`,
      'Show Output'
    ).then((selection) => {
      if (selection === 'Show Output') {
        outputChannel.show();
      }
    });
  } else if (result.warnings > 0) {
    vscode.window.showWarningMessage(
      `ARTK Doctor: ${result.warnings} warnings. See Output panel.`,
      'Show Output'
    ).then((selection) => {
      if (selection === 'Show Output') {
        outputChannel.show();
      }
    });
  } else {
    vscode.window.showInformationMessage('ARTK Doctor: All checks passed!');
  }

  // Refresh workspace context
  contextManager.refresh();
}

// Output channel singleton
let _outputChannel: vscode.OutputChannel | undefined;

function getOutputChannel(): vscode.OutputChannel {
  if (!_outputChannel) {
    _outputChannel = vscode.window.createOutputChannel('ARTK');
  }
  return _outputChannel;
}
