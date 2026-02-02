/**
 * Dashboard Webview Panel
 *
 * Provides a visual dashboard for ARTK status and actions.
 */

import * as vscode from 'vscode';
import { getWorkspaceContextManager } from '../../workspace';
import type { ArtkContext, ArtkConfig } from '../../types';

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(unsafe: string | number | undefined | null): string {
  if (unsafe === undefined || unsafe === null) {
    return '';
  }
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Manages the dashboard webview panel
 */
export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;

    // Set initial content
    this.update();

    // Listen for when the panel is disposed
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Listen for workspace changes
    const contextManager = getWorkspaceContextManager();
    contextManager.onDidChangeWorkspace(() => this.update(), null, this.disposables);
    contextManager.onDidChangeConfig(() => this.update(), null, this.disposables);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (message: { command: string }) => {
        switch (message.command) {
          case 'runDoctor':
            vscode.commands.executeCommand('artk.doctor');
            break;
          case 'openConfig':
            vscode.commands.executeCommand('artk.openConfig');
            break;
          case 'checkPrerequisites':
            vscode.commands.executeCommand('artk.check');
            break;
          case 'upgrade':
            vscode.commands.executeCommand('artk.upgrade');
            break;
          case 'llkbHealth':
            vscode.commands.executeCommand('artk.llkb.health');
            break;
          case 'llkbStats':
            vscode.commands.executeCommand('artk.llkb.stats');
            break;
          case 'init':
            vscode.commands.executeCommand('artk.init');
            break;
        }
      },
      null,
      this.disposables
    );
  }

  /**
   * Create or show the dashboard panel
   */
  public static createOrShow(extensionUri: vscode.Uri): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel.panel.reveal(column);
      return;
    }

    // Create a new panel with Content Security Policy
    const panel = vscode.window.createWebviewPanel(
      'artkDashboard',
      'ARTK Dashboard',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [], // No local resources needed
      }
    );

    DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri);
  }

  /**
   * Update the webview content
   */
  private update(): void {
    const contextManager = getWorkspaceContextManager();
    const workspaceInfo = contextManager.workspaceInfo;
    const artkContext = contextManager.artkContext;
    const artkConfig = contextManager.artkConfig;

    this.panel.webview.html = this.getHtmlContent(
      workspaceInfo?.detected ?? false,
      artkContext,
      artkConfig,
      workspaceInfo?.llkbEnabled ?? false
    );
  }

  /**
   * Generate HTML content for the webview
   * Uses Content Security Policy to mitigate XSS risks
   */
  private getHtmlContent(
    installed: boolean,
    context: ArtkContext | undefined,
    config: ArtkConfig | undefined,
    llkbEnabled: boolean
  ): string {
    // Generate a nonce for inline scripts
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>ARTK Dashboard</title>
  <style>
    :root {
      --vscode-font-family: var(--vscode-editor-font-family, system-ui);
    }
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--vscode-widget-border);
      padding-bottom: 10px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    .card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      padding: 16px;
    }
    .card h2 {
      margin-top: 0;
      margin-bottom: 12px;
      font-size: 14px;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
    }
    .card-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .stat {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stat-label {
      color: var(--vscode-descriptionForeground);
    }
    .stat-value {
      font-weight: bold;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .status-ok {
      color: var(--vscode-testing-iconPassed);
    }
    .status-ok::before {
      content: "\\2713 ";
    }
    .status-warning {
      color: var(--vscode-editorWarning-foreground);
    }
    .status-warning::before {
      content: "\\26A0 ";
    }
    .status-error {
      color: var(--vscode-editorError-foreground);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button:focus {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }
    .not-installed {
      text-align: center;
      padding: 40px;
    }
    .not-installed h2 {
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <h1>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M9 3h6v5l4 9a2 2 0 0 1-1.8 2.8H6.8A2 2 0 0 1 5 17l4-9V3"/>
      <path d="M9 3h6"/>
      <circle cx="10" cy="14" r="1"/>
      <circle cx="14" cy="13" r="1"/>
      <circle cx="12" cy="16" r="1"/>
    </svg>
    ARTK Dashboard
  </h1>

  ${installed ? this.getInstalledContent(context, config, llkbEnabled) : this.getNotInstalledContent()}

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    function runCommand(command) {
      vscode.postMessage({ command: command });
    }
  </script>
</body>
</html>`;
  }

  /**
   * Generate a random nonce for CSP
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Generate content for installed state
   * All user-controlled values are HTML-escaped to prevent XSS
   */
  private getInstalledContent(
    context: ArtkContext | undefined,
    config: ArtkConfig | undefined,
    llkbEnabled: boolean
  ): string {
    return `
  <div class="grid" role="main" aria-label="ARTK Status Dashboard">
    <div class="card" role="region" aria-labelledby="installation-heading">
      <h2 id="installation-heading">Installation</h2>
      <div class="card-content">
        <div class="stat">
          <span class="stat-label">Status</span>
          <span class="stat-value status-ok" role="status">Installed</span>
        </div>
        ${context ? `
        <div class="stat">
          <span class="stat-label">Version</span>
          <span class="stat-value">${escapeHtml(context.artkVersion) || 'Unknown'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Variant</span>
          <span class="stat-value">${escapeHtml(context.variant) || 'Unknown'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Node.js</span>
          <span class="stat-value">${escapeHtml(context.nodeVersion) || 'Unknown'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Playwright</span>
          <span class="stat-value">${escapeHtml(context.playwrightVersion) || 'Unknown'}</span>
        </div>
        ` : ''}
      </div>
    </div>

    ${config ? `
    <div class="card" role="region" aria-labelledby="config-heading">
      <h2 id="config-heading">Configuration</h2>
      <div class="card-content">
        <div class="stat">
          <span class="stat-label">App Name</span>
          <span class="stat-value" title="${escapeHtml(config.app?.name)}">${escapeHtml(config.app?.name) || 'Not set'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Environments</span>
          <span class="stat-value">${Object.keys(config.environments || {}).length}</span>
        </div>
        ${config.auth?.provider ? `
        <div class="stat">
          <span class="stat-label">Auth Provider</span>
          <span class="stat-value">${escapeHtml(config.auth.provider)}</span>
        </div>
        ` : ''}
        ${config.browsers?.channel ? `
        <div class="stat">
          <span class="stat-label">Browser</span>
          <span class="stat-value">${escapeHtml(config.browsers.channel)}</span>
        </div>
        ` : ''}
      </div>
      <div class="actions">
        <button onclick="runCommand('openConfig')" aria-label="Open configuration file">Open Config</button>
      </div>
    </div>
    ` : ''}

    <div class="card" role="region" aria-labelledby="llkb-heading">
      <h2 id="llkb-heading">LLKB</h2>
      <div class="card-content">
        <div class="stat">
          <span class="stat-label">Status</span>
          <span class="stat-value ${llkbEnabled ? 'status-ok' : 'status-warning'}" role="status">
            ${llkbEnabled ? 'Enabled' : 'Not Enabled'}
          </span>
        </div>
      </div>
      ${llkbEnabled ? `
      <div class="actions">
        <button onclick="runCommand('llkbHealth')" aria-label="Run LLKB health check">Health Check</button>
        <button onclick="runCommand('llkbStats')" aria-label="View LLKB statistics">Statistics</button>
      </div>
      ` : ''}
    </div>

    <div class="card" role="region" aria-labelledby="actions-heading">
      <h2 id="actions-heading">Quick Actions</h2>
      <div class="actions">
        <button onclick="runCommand('runDoctor')" aria-label="Run ARTK diagnostics">Run Doctor</button>
        <button onclick="runCommand('checkPrerequisites')" aria-label="Check system prerequisites">Check Prerequisites</button>
        <button onclick="runCommand('upgrade')" aria-label="Upgrade ARTK to latest version">Upgrade ARTK</button>
      </div>
    </div>
  </div>`;
  }

  /**
   * Generate content for not installed state
   */
  private getNotInstalledContent(): string {
    return `
  <div class="not-installed" role="main" aria-label="ARTK Installation">
    <h2>ARTK is not installed in this workspace</h2>
    <p>Click the button below to start the installation wizard.</p>
    <button onclick="runCommand('init')" aria-label="Start ARTK installation wizard">Install ARTK</button>
  </div>`;
  }

  /**
   * Dispose the panel
   */
  public dispose(): void {
    DashboardPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
