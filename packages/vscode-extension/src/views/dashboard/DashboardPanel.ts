/**
 * Dashboard Webview Panel
 *
 * Provides a visual dashboard for ARTK status and actions.
 */

import * as vscode from 'vscode';
import { getWorkspaceContextManager } from '../../workspace';

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
      (message) => {
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

    // Create a new panel
    const panel = vscode.window.createWebviewPanel(
      'artkDashboard',
      'ARTK Dashboard',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
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
   */
  private getHtmlContent(
    installed: boolean,
    context: any,
    config: any,
    llkbEnabled: boolean
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    }
    .status-ok {
      color: var(--vscode-testing-iconPassed);
    }
    .status-warning {
      color: var(--vscode-editorWarning-foreground);
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 3h6v5l4 9a2 2 0 0 1-1.8 2.8H6.8A2 2 0 0 1 5 17l4-9V3"/>
      <path d="M9 3h6"/>
      <circle cx="10" cy="14" r="1"/>
      <circle cx="14" cy="13" r="1"/>
      <circle cx="12" cy="16" r="1"/>
    </svg>
    ARTK Dashboard
  </h1>

  ${installed ? this.getInstalledContent(context, config, llkbEnabled) : this.getNotInstalledContent()}

  <script>
    const vscode = acquireVsCodeApi();

    function runCommand(command) {
      vscode.postMessage({ command });
    }
  </script>
</body>
</html>`;
  }

  private getInstalledContent(context: any, config: any, llkbEnabled: boolean): string {
    return `
  <div class="grid">
    <div class="card">
      <h2>Installation</h2>
      <div class="card-content">
        <div class="stat">
          <span class="stat-label">Status</span>
          <span class="stat-value status-ok">Installed</span>
        </div>
        ${context ? `
        <div class="stat">
          <span class="stat-label">Version</span>
          <span class="stat-value">${context.artkVersion || 'Unknown'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Variant</span>
          <span class="stat-value">${context.variant || 'Unknown'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Node.js</span>
          <span class="stat-value">${context.nodeVersion || 'Unknown'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Playwright</span>
          <span class="stat-value">${context.playwrightVersion || 'Unknown'}</span>
        </div>
        ` : ''}
      </div>
    </div>

    ${config ? `
    <div class="card">
      <h2>Configuration</h2>
      <div class="card-content">
        <div class="stat">
          <span class="stat-label">App Name</span>
          <span class="stat-value">${config.app?.name || 'Not set'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Environments</span>
          <span class="stat-value">${Object.keys(config.environments || {}).length}</span>
        </div>
        ${config.auth?.provider ? `
        <div class="stat">
          <span class="stat-label">Auth Provider</span>
          <span class="stat-value">${config.auth.provider}</span>
        </div>
        ` : ''}
        ${config.browsers?.channel ? `
        <div class="stat">
          <span class="stat-label">Browser</span>
          <span class="stat-value">${config.browsers.channel}</span>
        </div>
        ` : ''}
      </div>
      <div class="actions">
        <button onclick="runCommand('openConfig')">Open Config</button>
      </div>
    </div>
    ` : ''}

    <div class="card">
      <h2>LLKB</h2>
      <div class="card-content">
        <div class="stat">
          <span class="stat-label">Status</span>
          <span class="stat-value ${llkbEnabled ? 'status-ok' : 'status-warning'}">
            ${llkbEnabled ? 'Enabled' : 'Not Enabled'}
          </span>
        </div>
      </div>
      ${llkbEnabled ? `
      <div class="actions">
        <button onclick="runCommand('llkbHealth')">Health Check</button>
        <button onclick="runCommand('llkbStats')">Statistics</button>
      </div>
      ` : ''}
    </div>

    <div class="card">
      <h2>Quick Actions</h2>
      <div class="actions">
        <button onclick="runCommand('runDoctor')">Run Doctor</button>
        <button onclick="runCommand('checkPrerequisites')">Check Prerequisites</button>
        <button onclick="runCommand('upgrade')">Upgrade ARTK</button>
      </div>
    </div>
  </div>`;
  }

  private getNotInstalledContent(): string {
    return `
  <div class="not-installed">
    <h2>ARTK is not installed in this workspace</h2>
    <p>Click the button below to start the installation wizard.</p>
    <button onclick="runCommand('init')">Install ARTK</button>
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
