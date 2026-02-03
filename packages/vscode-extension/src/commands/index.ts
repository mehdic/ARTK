/**
 * ARTK Commands - VS Code command registration
 *
 * All commands use native implementations - no CLI/npm dependency required.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { runInitWizard, setExtensionContext } from './init';
import { runDoctor } from './doctor';
import { runCheck } from './check';
import { openConfig, openJourney } from './config';
import { runLLKBHealth, runLLKBStats, runLLKBExport, runLLKBSeed } from './llkb';
import { runJourneyValidate, runJourneyImplement } from './journey';
import { getWorkspaceContextManager } from '../workspace';
import { installBundled } from '../installer';
import { DashboardPanel } from '../views/dashboard/DashboardPanel';

// Store extension context for native commands
let _extensionContext: vscode.ExtensionContext | undefined;

/**
 * Register all ARTK commands
 */
export function registerCommands(context: vscode.ExtensionContext): void {
  // Store extension context for bundled installer access
  setExtensionContext(context);
  _extensionContext = context;

  // Core commands
  context.subscriptions.push(
    vscode.commands.registerCommand('artk.init', runInitWizard),
    vscode.commands.registerCommand('artk.check', runCheck),
    vscode.commands.registerCommand('artk.doctor', runDoctor),
    vscode.commands.registerCommand('artk.openConfig', openConfig),
    vscode.commands.registerCommand('artk.openJourney', openJourney)
  );

  // Upgrade command - native implementation using bundled installer
  context.subscriptions.push(
    vscode.commands.registerCommand('artk.upgrade', runUpgrade)
  );

  // Uninstall command - native implementation
  context.subscriptions.push(
    vscode.commands.registerCommand('artk.uninstall', runUninstall)
  );

  // LLKB commands
  context.subscriptions.push(
    vscode.commands.registerCommand('artk.llkb.health', runLLKBHealth),
    vscode.commands.registerCommand('artk.llkb.stats', runLLKBStats),
    vscode.commands.registerCommand('artk.llkb.export', runLLKBExport),
    vscode.commands.registerCommand('artk.llkb.seed', runLLKBSeed)
  );

  // Journey commands
  context.subscriptions.push(
    vscode.commands.registerCommand('artk.journey.validate', runJourneyValidate),
    vscode.commands.registerCommand('artk.journey.implement', runJourneyImplement)
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

/**
 * Native upgrade command - reinstalls ARTK using bundled installer
 */
async function runUpgrade(): Promise<void> {
  const contextManager = getWorkspaceContextManager();

  if (!contextManager.isInstalled) {
    vscode.window.showWarningMessage('ARTK is not installed in this workspace.');
    return;
  }

  if (!_extensionContext) {
    vscode.window.showErrorMessage('Extension context not available.');
    return;
  }

  const targetPath = contextManager.workspaceInfo?.projectRoot;
  if (!targetPath) {
    vscode.window.showErrorMessage('Cannot determine project root.');
    return;
  }

  const confirm = await vscode.window.showInformationMessage(
    'Upgrade ARTK to the latest bundled version? Your tests and journeys will be preserved.',
    'Upgrade',
    'Cancel'
  );

  if (confirm !== 'Upgrade') {
    return;
  }

  const result = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Upgrading ARTK...',
      cancellable: false,
    },
    async (progress) => {
      return await installBundled(_extensionContext!, {
        targetPath,
        force: true,       // Reinstall over existing
        skipNpm: false,    // Re-run npm install
        skipLlkb: true,    // Preserve LLKB learned patterns
        skipBrowsers: true, // Preserve browser config
        noPrompts: false,  // Update prompts to latest
      }, progress);
    }
  );

  if (result.success) {
    vscode.window.showInformationMessage('ARTK upgraded successfully!');
    contextManager.refresh();
  } else {
    vscode.window.showErrorMessage(`Upgrade failed: ${result.error}`);
  }
}

/**
 * Native uninstall command - removes artk-e2e directory
 */
async function runUninstall(): Promise<void> {
  const contextManager = getWorkspaceContextManager();

  if (!contextManager.isInstalled) {
    vscode.window.showWarningMessage('ARTK is not installed in this workspace.');
    return;
  }

  const artkE2ePath = contextManager.workspaceInfo?.artkE2ePath;
  const targetPath = contextManager.workspaceInfo?.projectRoot;

  if (!artkE2ePath || !targetPath) {
    vscode.window.showErrorMessage('Cannot determine ARTK installation path.');
    return;
  }

  // Confirm with user
  const confirm = await vscode.window.showWarningMessage(
    'Are you sure you want to uninstall ARTK? This will remove the artk-e2e directory and all tests.',
    { modal: true },
    'Uninstall'
  );

  if (confirm !== 'Uninstall') {
    return;
  }

  // Ask about prompts
  const removePrompts = await vscode.window.showQuickPick(
    [
      { label: 'Keep prompts', description: 'Keep .github/prompts/artk.* and .github/agents/artk.*', remove: false },
      { label: 'Remove prompts', description: 'Also remove ARTK prompts and agents', remove: true },
    ],
    {
      title: 'ARTK Uninstall',
      placeHolder: 'What to do with AI prompts?',
    }
  );

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Uninstalling ARTK...',
        cancellable: false,
      },
      async () => {
        // Remove artk-e2e directory
        await fs.promises.rm(artkE2ePath, { recursive: true, force: true });

        // Remove prompts if requested
        if (removePrompts?.remove) {
          const promptsDir = path.join(targetPath, '.github', 'prompts');
          const agentsDir = path.join(targetPath, '.github', 'agents');

          // Remove artk.* prompts
          if (fs.existsSync(promptsDir)) {
            const prompts = await fs.promises.readdir(promptsDir);
            for (const file of prompts) {
              if (file.startsWith('artk.')) {
                await fs.promises.unlink(path.join(promptsDir, file));
              }
            }
          }

          // Remove artk.* agents
          if (fs.existsSync(agentsDir)) {
            const agents = await fs.promises.readdir(agentsDir);
            for (const file of agents) {
              if (file.startsWith('artk.')) {
                await fs.promises.unlink(path.join(agentsDir, file));
              }
            }
          }
        }
      }
    );

    vscode.window.showInformationMessage('ARTK uninstalled successfully.');
    contextManager.refresh();
  } catch (error) {
    vscode.window.showErrorMessage(`Uninstall failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
