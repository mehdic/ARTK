/**
 * ARTK LLKB Commands - Lessons Learned Knowledge Base operations
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { llkbHealth, llkbStats, llkbExport, llkbSeed } from '../cli';
import { getWorkspaceContextManager } from '../workspace';

/**
 * Run LLKB health check
 */
export async function runLLKBHealth(): Promise<void> {
  const contextManager = getWorkspaceContextManager();

  if (!contextManager.isInstalled) {
    vscode.window.showWarningMessage('ARTK is not installed in this workspace.');
    return;
  }

  if (!contextManager.llkbEnabled) {
    const action = await vscode.window.showWarningMessage(
      'LLKB is not enabled in this workspace.',
      'Run Doctor'
    );

    if (action === 'Run Doctor') {
      await vscode.commands.executeCommand('artk.doctor');
    }
    return;
  }

  const llkbRoot = contextManager.workspaceInfo?.llkbPath;
  if (!llkbRoot) {
    vscode.window.showErrorMessage('LLKB path not found.');
    return;
  }

  const result = await llkbHealth({ llkbRoot });

  if (result.success) {
    // Show in output channel
    const outputChannel = vscode.window.createOutputChannel('ARTK');
    outputChannel.clear();
    outputChannel.appendLine('LLKB Health Check');
    outputChannel.appendLine('='.repeat(50));
    outputChannel.appendLine('');
    outputChannel.appendLine(result.data || 'Health check completed.');
    outputChannel.show();

    vscode.window.showInformationMessage('LLKB health check completed. See Output panel.');
  } else {
    vscode.window.showErrorMessage(`LLKB health check failed: ${result.error}`);
  }
}

/**
 * Show LLKB statistics
 */
export async function runLLKBStats(): Promise<void> {
  const contextManager = getWorkspaceContextManager();

  if (!contextManager.isInstalled) {
    vscode.window.showWarningMessage('ARTK is not installed in this workspace.');
    return;
  }

  if (!contextManager.llkbEnabled) {
    vscode.window.showWarningMessage('LLKB is not enabled in this workspace.');
    return;
  }

  const llkbRoot = contextManager.workspaceInfo?.llkbPath;
  if (!llkbRoot) {
    vscode.window.showErrorMessage('LLKB path not found.');
    return;
  }

  const result = await llkbStats({ llkbRoot });

  if (result.success) {
    // Show in output channel
    const outputChannel = vscode.window.createOutputChannel('ARTK');
    outputChannel.clear();
    outputChannel.appendLine('LLKB Statistics');
    outputChannel.appendLine('='.repeat(50));
    outputChannel.appendLine('');
    outputChannel.appendLine(result.data || 'No statistics available.');
    outputChannel.show();

    vscode.window.showInformationMessage('LLKB statistics retrieved. See Output panel.');
  } else {
    vscode.window.showErrorMessage(`Failed to get LLKB statistics: ${result.error}`);
  }
}

/**
 * Export LLKB for AutoGen
 */
export async function runLLKBExport(): Promise<void> {
  const contextManager = getWorkspaceContextManager();

  if (!contextManager.isInstalled) {
    vscode.window.showWarningMessage('ARTK is not installed in this workspace.');
    return;
  }

  if (!contextManager.llkbEnabled) {
    vscode.window.showWarningMessage('LLKB is not enabled in this workspace.');
    return;
  }

  const workspaceInfo = contextManager.workspaceInfo;
  if (!workspaceInfo?.llkbPath || !workspaceInfo.artkE2ePath) {
    vscode.window.showErrorMessage('LLKB or artk-e2e path not found.');
    return;
  }

  // Ask for minimum confidence
  const confidenceInput = await vscode.window.showInputBox({
    title: 'LLKB Export',
    prompt: 'Minimum confidence threshold (0.0 - 1.0)',
    value: '0.7',
    validateInput: (value) => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 1) {
        return 'Please enter a number between 0.0 and 1.0';
      }
      return undefined;
    },
  });

  if (confidenceInput === undefined) {
    return; // User cancelled
  }

  const minConfidence = parseFloat(confidenceInput);

  // Ask for dry run
  const mode = await vscode.window.showQuickPick(
    [
      {
        label: '$(file-add) Export',
        description: 'Generate AutoGen configuration files',
        dryRun: false,
      },
      {
        label: '$(preview) Preview',
        description: 'Show what would be exported without writing files',
        dryRun: true,
      },
    ],
    {
      title: 'LLKB Export Mode',
      placeHolder: 'Choose export mode',
    }
  );

  if (!mode) {
    return;
  }

  const result = await llkbExport({
    llkbRoot: workspaceInfo.llkbPath,
    outputDir: workspaceInfo.artkE2ePath,
    minConfidence,
    dryRun: mode.dryRun,
  });

  if (result.success) {
    const outputChannel = vscode.window.createOutputChannel('ARTK');
    outputChannel.clear();
    outputChannel.appendLine('LLKB Export');
    outputChannel.appendLine('='.repeat(50));
    outputChannel.appendLine('');
    outputChannel.appendLine(result.data || 'Export completed.');
    outputChannel.show();

    if (mode.dryRun) {
      vscode.window.showInformationMessage('LLKB export preview completed. See Output panel.');
    } else {
      vscode.window.showInformationMessage(
        'LLKB exported successfully for AutoGen. See Output panel.'
      );
    }
  } else {
    vscode.window.showErrorMessage(`LLKB export failed: ${result.error}`);
  }
}

/**
 * Seed LLKB with universal patterns
 */
export async function runLLKBSeed(): Promise<void> {
  const contextManager = getWorkspaceContextManager();

  if (!contextManager.isInstalled) {
    vscode.window.showWarningMessage('ARTK is not installed in this workspace.');
    return;
  }

  if (!contextManager.llkbEnabled) {
    const action = await vscode.window.showWarningMessage(
      'LLKB is not enabled in this workspace.',
      'Run Doctor'
    );

    if (action === 'Run Doctor') {
      await vscode.commands.executeCommand('artk.doctor');
    }
    return;
  }

  const llkbRoot = contextManager.workspaceInfo?.llkbPath;
  if (!llkbRoot) {
    vscode.window.showErrorMessage('LLKB path not found.');
    return;
  }

  // Ask which patterns to seed
  const patternChoice = await vscode.window.showQuickPick(
    [
      {
        label: '$(symbol-misc) Universal Patterns',
        description: 'Common Playwright patterns for forms, tables, navigation',
        value: 'universal',
      },
    ],
    {
      title: 'LLKB Seed',
      placeHolder: 'Select pattern set to seed',
    }
  );

  if (!patternChoice) {
    return; // User cancelled
  }

  // Confirm seeding
  const confirm = await vscode.window.showWarningMessage(
    `This will add ${patternChoice.label} to your LLKB. Existing patterns with the same ID will be skipped.`,
    'Seed LLKB',
    'Preview First'
  );

  if (!confirm) {
    return;
  }

  const dryRun = confirm === 'Preview First';

  const result = await llkbSeed({
    patterns: patternChoice.value,
    llkbRoot,
    dryRun,
  });

  if (result.success) {
    const outputChannel = vscode.window.createOutputChannel('ARTK');
    outputChannel.clear();
    outputChannel.appendLine('LLKB Seed');
    outputChannel.appendLine('='.repeat(50));
    outputChannel.appendLine('');
    outputChannel.appendLine(result.data || 'Seeding completed.');
    outputChannel.show();

    if (dryRun) {
      const action = await vscode.window.showInformationMessage(
        'Preview completed. Would you like to apply these patterns?',
        'Apply Now',
        'Cancel'
      );

      if (action === 'Apply Now') {
        // Run again without dry-run
        const applyResult = await llkbSeed({
          patterns: patternChoice.value,
          llkbRoot,
          dryRun: false,
        });

        if (applyResult.success) {
          vscode.window.showInformationMessage('LLKB seeded successfully!');
          // Refresh LLKB view
          contextManager.refresh();
        } else {
          vscode.window.showErrorMessage(`LLKB seeding failed: ${applyResult.error}`);
        }
      }
    } else {
      vscode.window.showInformationMessage('LLKB seeded successfully!');
      // Refresh LLKB view
      contextManager.refresh();
    }
  } else {
    vscode.window.showErrorMessage(`LLKB seeding failed: ${result.error}`);
  }
}
