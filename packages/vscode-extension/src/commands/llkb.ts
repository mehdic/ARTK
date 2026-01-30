/**
 * ARTK LLKB Commands - Lessons Learned Knowledge Base operations
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { llkbHealth, llkbStats, llkbExport } from '../cli';
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
