/**
 * ARTK VS Code Extension
 *
 * Visual tools for ARTK test automation with Playwright.
 */

import * as vscode from 'vscode';
import { getWorkspaceContextManager } from './workspace';
import { registerCommands } from './commands';
import { registerViews } from './views';
import { StatusBarProvider } from './providers';
import { logger } from './utils';

let statusBarProvider: StatusBarProvider | undefined;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext): void {
  logger.info('ARTK extension activating...');

  // Initialize workspace context manager
  const contextManager = getWorkspaceContextManager();
  contextManager.initialize(context);

  // Register commands
  registerCommands(context);

  // Register tree views
  const { statusProvider, journeysProvider, llkbProvider } = registerViews(context);

  // Create status bar provider
  statusBarProvider = new StatusBarProvider();
  context.subscriptions.push({
    dispose: () => statusBarProvider?.dispose(),
  });

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('artk')) {
        // Update status bar visibility
        statusBarProvider?.update();

        // Refresh views if auto-refresh changed
        if (e.affectsConfiguration('artk.autoRefresh')) {
          statusProvider.refresh();
          journeysProvider.refresh();
          llkbProvider.refresh();
        }
      }
    })
  );

  // Show welcome message if ARTK is not installed
  if (!contextManager.isInstalled) {
    showWelcomeMessage();
  }

  logger.info('ARTK extension activated');
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  logger.info('ARTK extension deactivating...');

  if (statusBarProvider) {
    statusBarProvider.dispose();
    statusBarProvider = undefined;
  }

  logger.info('ARTK extension deactivated');
}

/**
 * Show welcome message for new users
 */
async function showWelcomeMessage(): Promise<void> {
  const action = await vscode.window.showInformationMessage(
    'ARTK is not installed in this workspace. Would you like to install it?',
    'Install ARTK',
    'Learn More',
    'Dismiss'
  );

  if (action === 'Install ARTK') {
    vscode.commands.executeCommand('artk.init');
  } else if (action === 'Learn More') {
    vscode.env.openExternal(vscode.Uri.parse('https://github.com/artk/artk'));
  }
}
