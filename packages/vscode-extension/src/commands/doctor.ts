/**
 * ARTK Doctor Command - Run diagnostics
 */

import * as vscode from 'vscode';
import { doctor } from '../cli';
import { getWorkspaceContextManager } from '../workspace';

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

  const targetPath = contextManager.workspaceInfo?.projectRoot;

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

  const result = await doctor({
    targetPath,
    fix: action.fix,
  });

  if (result.success) {
    // Parse and display results
    const outputChannel = getOutputChannel();
    outputChannel.clear();
    outputChannel.appendLine('ARTK Doctor Results');
    outputChannel.appendLine('='.repeat(50));
    outputChannel.appendLine('');
    outputChannel.appendLine(result.data || 'No issues found.');
    outputChannel.show();

    // Also show a summary notification
    if (result.data?.includes('error') || result.data?.includes('Error')) {
      vscode.window.showWarningMessage(
        'ARTK Doctor found issues. See Output panel for details.',
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
  } else {
    vscode.window.showErrorMessage(`Doctor failed: ${result.error}`);
  }
}

// Output channel singleton
let _outputChannel: vscode.OutputChannel | undefined;

function getOutputChannel(): vscode.OutputChannel {
  if (!_outputChannel) {
    _outputChannel = vscode.window.createOutputChannel('ARTK');
  }
  return _outputChannel;
}
