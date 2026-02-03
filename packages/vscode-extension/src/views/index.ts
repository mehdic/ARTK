/**
 * ARTK Views - Tree view providers registration
 */

import * as vscode from 'vscode';
import { StatusTreeProvider } from './StatusTreeProvider';
import { JourneysTreeProvider } from './JourneysTreeProvider';
import { LLKBTreeProvider } from './LLKBTreeProvider';
import { WorkflowTreeProvider, registerWorkflowCommands } from './WorkflowTreeProvider';

export { StatusTreeProvider } from './StatusTreeProvider';
export { JourneysTreeProvider } from './JourneysTreeProvider';
export { LLKBTreeProvider } from './LLKBTreeProvider';
export { WorkflowTreeProvider } from './WorkflowTreeProvider';

/**
 * Register all tree view providers
 */
export function registerViews(context: vscode.ExtensionContext): {
  statusProvider: StatusTreeProvider;
  journeysProvider: JourneysTreeProvider;
  llkbProvider: LLKBTreeProvider;
  workflowProvider: WorkflowTreeProvider;
} {
  // Create providers
  const statusProvider = new StatusTreeProvider();
  const journeysProvider = new JourneysTreeProvider();
  const llkbProvider = new LLKBTreeProvider();
  const workflowProvider = new WorkflowTreeProvider(context);

  // Register tree data providers
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('artk-status', statusProvider),
    vscode.window.registerTreeDataProvider('artk-journeys', journeysProvider),
    vscode.window.registerTreeDataProvider('artk-llkb', llkbProvider),
    vscode.window.registerTreeDataProvider('artk-workflow', workflowProvider)
  );

  // Register workflow commands (execute, edit, reset)
  registerWorkflowCommands(context, workflowProvider);

  // Register view-specific commands
  context.subscriptions.push(
    vscode.commands.registerCommand('artk.journeys.groupByStatus', () => {
      journeysProvider.setGroupBy('status');
    }),
    vscode.commands.registerCommand('artk.journeys.groupByTier', () => {
      journeysProvider.setGroupBy('tier');
    })
  );

  return { statusProvider, journeysProvider, llkbProvider, workflowProvider };
}
