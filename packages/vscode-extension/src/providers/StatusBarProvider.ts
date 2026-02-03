/**
 * Status Bar Provider
 *
 * Displays ARTK status in the VS Code status bar.
 */

import * as vscode from 'vscode';
import { getWorkspaceContextManager, WorkspaceContextManager } from '../workspace';

/**
 * Status Bar Provider
 */
export class StatusBarProvider {
  private readonly statusBarItem: vscode.StatusBarItem;
  private readonly contextManager: WorkspaceContextManager;
  private refreshTimer: NodeJS.Timeout | undefined;

  constructor() {
    this.contextManager = getWorkspaceContextManager();

    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = 'artk.openDashboard';

    // Listen for changes
    this.contextManager.onDidChangeWorkspace(() => this.update());
    this.contextManager.onDidChangeConfig(() => this.update());

    // Initial update
    this.update();

    // Start periodic refresh if configured
    this.startRefreshTimer();
  }

  /**
   * Update the status bar item
   */
  update(): void {
    const config = vscode.workspace.getConfiguration('artk');
    const showStatusBar = config.get<boolean>('showStatusBar', true);

    if (!showStatusBar) {
      this.statusBarItem.hide();
      return;
    }

    if (!this.contextManager.isInstalled) {
      this.statusBarItem.text = '$(beaker) ARTK: Not Installed';
      this.statusBarItem.tooltip = 'Click to install ARTK';
      this.statusBarItem.command = 'artk.init';
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.show();
      return;
    }

    // Build status text
    const parts: string[] = ['$(beaker) ARTK'];

    // Add version if available
    const context = this.contextManager.artkContext;
    if (context?.artkVersion) {
      parts.push(`v${context.artkVersion}`);
    }

    // Add journey count placeholder (would need to scan files)
    // For now, just show OK status
    parts.push('OK');

    // Add LLKB indicator if enabled
    if (this.contextManager.llkbEnabled) {
      parts.push('| LLKB');
    }

    this.statusBarItem.text = parts.join(' ');
    this.statusBarItem.tooltip = this.buildTooltip();
    this.statusBarItem.command = 'artk.openDashboard';
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.show();
  }

  /**
   * Build tooltip content
   */
  private buildTooltip(): string {
    const lines: string[] = ['ARTK Status'];

    const context = this.contextManager.artkContext;
    const config = this.contextManager.artkConfig;

    if (context) {
      lines.push('');
      lines.push(`Version: ${context.artkVersion}`);
      lines.push(`Variant: ${context.variant}`);
      lines.push(`Playwright: ${context.playwrightVersion}`);
    }

    if (config) {
      lines.push('');
      lines.push(`App: ${config.app.name}`);
      const envCount = Object.keys(config.environments || {}).length;
      lines.push(`Environments: ${envCount}`);
    }

    if (this.contextManager.llkbEnabled) {
      lines.push('');
      lines.push('LLKB: Enabled');
    }

    lines.push('');
    lines.push('Click to open dashboard');

    return lines.join('\n');
  }

  /**
   * Start periodic refresh timer
   */
  private startRefreshTimer(): void {
    this.stopRefreshTimer();

    const config = vscode.workspace.getConfiguration('artk');
    const interval = config.get<number>('refreshInterval', 30000);

    if (interval > 0) {
      this.refreshTimer = setInterval(() => {
        this.update();
      }, interval);
    }
  }

  /**
   * Stop periodic refresh timer
   */
  private stopRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  /**
   * Show the status bar item
   */
  show(): void {
    this.statusBarItem.show();
  }

  /**
   * Hide the status bar item
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stopRefreshTimer();
    this.statusBarItem.dispose();
  }
}
