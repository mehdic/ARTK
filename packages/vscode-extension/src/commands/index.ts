/**
 * ARTK Commands - VS Code command registration
 */

import * as vscode from 'vscode';
import { runInitWizard } from './init';
import { runDoctor } from './doctor';
import { runCheck } from './check';
import { openConfig, openJourney } from './config';
import { runLLKBHealth, runLLKBStats, runLLKBExport } from './llkb';
import { getWorkspaceContextManager } from '../workspace';
import { upgrade, uninstall } from '../cli';
import { DashboardPanel } from '../views/dashboard/DashboardPanel';

/**
 * Register all ARTK commands
 */
export function registerCommands(context: vscode.ExtensionContext): void {
  // Core commands
  context.subscriptions.push(
    vscode.commands.registerCommand('artk.init', runInitWizard),
    vscode.commands.registerCommand('artk.check', runCheck),
    vscode.commands.registerCommand('artk.doctor', runDoctor),
    vscode.commands.registerCommand('artk.openConfig', openConfig),
    vscode.commands.registerCommand('artk.openJourney', openJourney)
  );

  // Upgrade command
  context.subscriptions.push(
    vscode.commands.registerCommand('artk.upgrade', async () => {
      const contextManager = getWorkspaceContextManager();

      if (!contextManager.isInstalled) {
        vscode.window.showWarningMessage('ARTK is not installed in this workspace.');
        return;
      }

      const confirm = await vscode.window.showInformationMessage(
        'Upgrade @artk/core to the latest version?',
        'Upgrade',
        'Cancel'
      );

      if (confirm !== 'Upgrade') {
        return;
      }

      const result = await upgrade({
        targetPath: contextManager.workspaceInfo?.projectRoot,
      });

      if (result.success) {
        vscode.window.showInformationMessage('ARTK upgraded successfully!');
        contextManager.refresh();
      } else {
        vscode.window.showErrorMessage(`Upgrade failed: ${result.error}`);
      }
    })
  );

  // Uninstall command
  context.subscriptions.push(
    vscode.commands.registerCommand('artk.uninstall', async () => {
      const contextManager = getWorkspaceContextManager();

      if (!contextManager.isInstalled) {
        vscode.window.showWarningMessage('ARTK is not installed in this workspace.');
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to uninstall ARTK? This will remove the artk-e2e directory and all tests.',
        { modal: true },
        'Uninstall'
      );

      if (confirm !== 'Uninstall') {
        return;
      }

      const targetPath = contextManager.workspaceInfo?.projectRoot;
      if (!targetPath) {
        return;
      }

      const result = await uninstall(targetPath);

      if (result.success) {
        vscode.window.showInformationMessage('ARTK uninstalled.');
        contextManager.refresh();
      } else {
        vscode.window.showErrorMessage(`Uninstall failed: ${result.error}`);
      }
    })
  );

  // LLKB commands
  context.subscriptions.push(
    vscode.commands.registerCommand('artk.llkb.health', runLLKBHealth),
    vscode.commands.registerCommand('artk.llkb.stats', runLLKBStats),
    vscode.commands.registerCommand('artk.llkb.export', runLLKBExport)
  );

  // Refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand('artk.refreshViews', () => {
      const contextManager = getWorkspaceContextManager();
      contextManager.refresh();
      vscode.window.showInformationMessage('ARTK views refreshed.');
    })
  );

  // Dashboard command
  context.subscriptions.push(
    vscode.commands.registerCommand('artk.openDashboard', () => {
      DashboardPanel.createOrShow(context.extensionUri);
    })
  );

  // Run tests command
  context.subscriptions.push(
    vscode.commands.registerCommand('artk.runTests', async (item?: { testPath?: string }) => {
      const contextManager = getWorkspaceContextManager();

      if (!contextManager.isInstalled) {
        vscode.window.showWarningMessage('ARTK is not installed in this workspace.');
        return;
      }

      const artkE2ePath = contextManager.workspaceInfo?.artkE2ePath;
      if (!artkE2ePath) {
        return;
      }

      // Build the command
      let command = 'npx playwright test';
      if (item?.testPath) {
        command += ` "${item.testPath}"`;
      }

      // Run in terminal
      const terminal = vscode.window.createTerminal({
        name: 'ARTK Tests',
        cwd: artkE2ePath,
      });
      terminal.show();
      terminal.sendText(command);
    })
  );
}
