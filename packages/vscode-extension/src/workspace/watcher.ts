/**
 * File System Watcher - Watch for ARTK-related file changes
 */

import * as vscode from 'vscode';
import * as path from 'path';

export interface WatcherCallbacks {
  onConfigChange?: () => void;
  onContextChange?: () => void;
  onLLKBChange?: () => void;
  onJourneyChange?: () => void;
  onTestChange?: () => void;
}

/**
 * Create file watchers for ARTK-related files
 */
export function createWatchers(
  context: vscode.ExtensionContext,
  callbacks: WatcherCallbacks
): void {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return;
  }

  // Watch artk.config.yml
  if (callbacks.onConfigChange) {
    const configWatcher = vscode.workspace.createFileSystemWatcher(
      '**/artk-e2e/artk.config.yml'
    );
    configWatcher.onDidChange(callbacks.onConfigChange);
    configWatcher.onDidCreate(callbacks.onConfigChange);
    configWatcher.onDidDelete(callbacks.onConfigChange);
    context.subscriptions.push(configWatcher);
  }

  // Watch .artk/context.json
  if (callbacks.onContextChange) {
    const contextWatcher = vscode.workspace.createFileSystemWatcher(
      '**/.artk/context.json'
    );
    contextWatcher.onDidChange(callbacks.onContextChange);
    contextWatcher.onDidCreate(callbacks.onContextChange);
    contextWatcher.onDidDelete(callbacks.onContextChange);
    context.subscriptions.push(contextWatcher);
  }

  // Watch LLKB files
  if (callbacks.onLLKBChange) {
    const llkbWatcher = vscode.workspace.createFileSystemWatcher(
      '**/.artk/llkb/**'
    );
    llkbWatcher.onDidChange(callbacks.onLLKBChange);
    llkbWatcher.onDidCreate(callbacks.onLLKBChange);
    llkbWatcher.onDidDelete(callbacks.onLLKBChange);
    context.subscriptions.push(llkbWatcher);
  }

  // Watch journey files
  if (callbacks.onJourneyChange) {
    const journeyWatcher = vscode.workspace.createFileSystemWatcher(
      '**/artk-e2e/journeys/**/*.md'
    );
    journeyWatcher.onDidChange(callbacks.onJourneyChange);
    journeyWatcher.onDidCreate(callbacks.onJourneyChange);
    journeyWatcher.onDidDelete(callbacks.onJourneyChange);
    context.subscriptions.push(journeyWatcher);
  }

  // Watch test files
  if (callbacks.onTestChange) {
    const testWatcher = vscode.workspace.createFileSystemWatcher(
      '**/artk-e2e/tests/**/*.spec.ts'
    );
    testWatcher.onDidChange(callbacks.onTestChange);
    testWatcher.onDidCreate(callbacks.onTestChange);
    testWatcher.onDidDelete(callbacks.onTestChange);
    context.subscriptions.push(testWatcher);
  }
}
