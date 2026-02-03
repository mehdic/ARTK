/**
 * ARTK Config Command - Open configuration
 */

import * as vscode from 'vscode';
import { getWorkspaceContextManager } from '../workspace';

/**
 * Open the ARTK configuration file
 */
export async function openConfig(): Promise<void> {
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

  const configPath = contextManager.workspaceInfo?.configPath;

  if (!configPath) {
    vscode.window.showErrorMessage('Configuration file not found.');
    return;
  }

  // Open the config file in the editor
  const document = await vscode.workspace.openTextDocument(configPath);
  await vscode.window.showTextDocument(document);
}

/**
 * Open a specific journey file
 */
export async function openJourney(journeyPath?: string): Promise<void> {
  if (!journeyPath) {
    // Show journey picker
    const contextManager = getWorkspaceContextManager();
    if (!contextManager.workspaceInfo?.artkE2ePath) {
      vscode.window.showWarningMessage('ARTK is not installed in this workspace.');
      return;
    }

    const journeysGlob = new vscode.RelativePattern(
      contextManager.workspaceInfo.artkE2ePath,
      'journeys/**/*.md'
    );

    const journeyFiles = await vscode.workspace.findFiles(journeysGlob);

    if (journeyFiles.length === 0) {
      vscode.window.showInformationMessage('No journey files found.');
      return;
    }

    const selected = await vscode.window.showQuickPick(
      journeyFiles.map((uri) => ({
        label: uri.path.split('/').pop() || uri.path,
        description: uri.fsPath,
        uri,
      })),
      {
        title: 'Select Journey',
        placeHolder: 'Choose a journey file to open',
      }
    );

    if (!selected) {
      return;
    }

    journeyPath = selected.uri.fsPath;
  }

  const document = await vscode.workspace.openTextDocument(journeyPath);
  await vscode.window.showTextDocument(document);
}
