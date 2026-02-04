/**
 * Dashboard Webview Panel
 *
 * Provides a visual dashboard for ARTK status and actions.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspaceContextManager } from '../../workspace';
import { llkbStatsJson, journeySummary, readSessionState } from '../../cli';
import type { ArtkContext, ArtkConfig } from '../../types';
import type { LLKBStatsResult, JourneySummary, SessionState } from '../../cli/types';

const SESSION_POLL_INTERVAL = 2000; // Poll every 2 seconds during implementation

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
  private llkbStats: LLKBStatsResult | undefined;
  private journeySummaryData: JourneySummary | undefined;
  private sessionState: SessionState | undefined;
  private sessionPollInterval: ReturnType<typeof setInterval> | undefined;

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
      (message: { command: string; journeyIds?: string[] }) => {
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
          case 'llkbSeed':
            vscode.commands.executeCommand('artk.llkb.seed');
            break;
          case 'journeyValidate':
            vscode.commands.executeCommand('artk.journey.validate');
            break;
          case 'journeyImplementReady':
            this.implementReadyJourneys();
            break;
          case 'journeyImplementSelected':
            if (message.journeyIds?.length) {
              vscode.commands.executeCommand('artk.journey.implement', { journeyIds: message.journeyIds });
            }
            break;
          case 'viewJourneys':
            vscode.commands.executeCommand('artk.openJourney');
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
   * Implement all ready journeys (clarified status)
   */
  private async implementReadyJourneys(): Promise<void> {
    const readyJourneys = this.journeySummaryData?.readyToImplement;
    if (!readyJourneys?.length) {
      vscode.window.showInformationMessage('No journeys are ready to implement.');
      return;
    }

    const confirm = await vscode.window.showInformationMessage(
      `Implement ${readyJourneys.length} ready journey(s)?`,
      { detail: readyJourneys.join(', ') },
      'Implement',
      'Cancel'
    );

    if (confirm === 'Implement') {
      vscode.commands.executeCommand('artk.journey.implement', { journeyIds: readyJourneys });
      // Start polling for progress
      this.startSessionPolling();
    }
  }

  /**
   * Start polling for session state during implementation
   */
  private startSessionPolling(): void {
    // Clear any existing interval
    this.stopSessionPolling();

    const contextManager = getWorkspaceContextManager();
    const harnessRoot = contextManager.workspaceInfo?.artkE2ePath;

    if (!harnessRoot) {
      return;
    }

    this.sessionPollInterval = setInterval(async () => {
      try {
        const state = await readSessionState(harnessRoot);
        const previousStatus = this.sessionState?.status;
        this.sessionState = state;

        // Re-render to show progress
        this.renderCurrentState();

        // Stop polling when session completes or fails
        if (state?.status === 'completed' || state?.status === 'failed' || !state) {
          this.stopSessionPolling();

          // Refresh journey summary after implementation
          if (previousStatus === 'running') {
            this.fetchAsyncData(
              contextManager.workspaceInfo?.llkbPath,
              harnessRoot
            );
          }
        }
      } catch {
        // Ignore errors during polling
      }
    }, SESSION_POLL_INTERVAL);
  }

  /**
   * Stop polling for session state
   */
  private stopSessionPolling(): void {
    if (this.sessionPollInterval) {
      clearInterval(this.sessionPollInterval);
      this.sessionPollInterval = undefined;
    }
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

    // Fetch async data in background
    this.fetchAsyncData(workspaceInfo?.llkbPath, workspaceInfo?.artkE2ePath);

    this.panel.webview.html = this.getHtmlContent(
      workspaceInfo?.detected ?? false,
      artkContext,
      artkConfig,
      workspaceInfo?.llkbEnabled ?? false
    );
  }

  /**
   * Fetch async data like LLKB stats and journey summary
   */
  private async fetchAsyncData(llkbPath?: string, harnessRoot?: string): Promise<void> {
    const contextManager = getWorkspaceContextManager();

    // Fetch LLKB stats if enabled
    if (llkbPath && contextManager.llkbEnabled) {
      try {
        const result = await llkbStatsJson({ llkbRoot: llkbPath });
        if (result.success && result.stdout) {
          try {
            this.llkbStats = JSON.parse(result.stdout);
            // Re-render with new data
            this.renderCurrentState();
          } catch {
            // Ignore parse errors
          }
        }
      } catch {
        // Ignore fetch errors
      }
    }

    // Fetch journey summary if harness root exists
    if (harnessRoot) {
      try {
        const result = await journeySummary(harnessRoot);
        if (result.success && result.stdout) {
          try {
            this.journeySummaryData = JSON.parse(result.stdout);
            // Re-render with new data
            this.renderCurrentState();
          } catch {
            // Ignore parse errors
          }
        }
      } catch {
        // Ignore fetch errors
      }
    }
  }

  /**
   * Re-render the panel with current state
   */
  private renderCurrentState(): void {
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
    .progress-container {
      margin: 12px 0;
    }
    .progress-bar {
      height: 8px;
      background: var(--vscode-progressBar-background);
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--vscode-progressBar-background);
      background: var(--vscode-button-background);
      transition: width 0.3s ease;
    }
    .progress-text {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    .journey-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 8px 0;
    }
    .journey-item {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    .journey-item.completed {
      background: var(--vscode-testing-iconPassed);
      color: var(--vscode-editor-background);
    }
    .journey-item.current {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      animation: pulse 1.5s infinite;
    }
    .journey-item.failed {
      background: var(--vscode-editorError-foreground);
      color: var(--vscode-editor-background);
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .card.highlight {
      border-color: var(--vscode-button-background);
      border-width: 2px;
    }
    .button-primary {
      background: var(--vscode-button-background);
    }
    .button-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
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

    // Event delegation for all buttons with data-command attribute
    document.addEventListener('click', function(e) {
      const target = e.target.closest('[data-command]');
      if (target) {
        const command = target.getAttribute('data-command');
        const journeyIds = target.getAttribute('data-journey-ids');
        const message = { command: command };
        if (journeyIds) {
          try {
            message.journeyIds = JSON.parse(journeyIds);
          } catch (err) {
            console.error('Invalid journey IDs JSON:', journeyIds);
          }
        }
        vscode.postMessage(message);
      }
    });
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
   * Check if init-playbook has been run (PLAYBOOK.md exists)
   */
  private isInitialized(): boolean {
    const contextManager = getWorkspaceContextManager();
    const artkRoot = contextManager.workspaceInfo?.artkRoot;
    if (!artkRoot) return false;

    const playbookPath = path.join(artkRoot, 'docs', 'PLAYBOOK.md');
    return fs.existsSync(playbookPath);
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
    const initialized = this.isInitialized();
    const envNames = config?.environments ? Object.keys(config.environments) : [];
    const envDisplay = envNames.length > 0 ? envNames.join(', ') : 'None';

    return `
  <div class="grid" role="main" aria-label="ARTK Status Dashboard">
    <div class="card" role="region" aria-labelledby="installation-heading">
      <h2 id="installation-heading">Installation</h2>
      <div class="card-content">
        <div class="stat">
          <span class="stat-label">Status</span>
          <span class="stat-value status-ok" role="status">Installed</span>
        </div>
        <div class="stat">
          <span class="stat-label">Initialized</span>
          <span class="stat-value ${initialized ? 'status-ok' : 'status-warning'}" role="status">
            ${initialized ? 'Yes' : 'No (run init-playbook)'}
          </span>
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
          <span class="stat-value" title="${escapeHtml(envDisplay)}">${escapeHtml(envDisplay)}</span>
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
        <button data-command="openConfig" aria-label="Open configuration file">Open Config</button>
      </div>
    </div>
    ` : ''}

    <div class="card" role="region" aria-labelledby="llkb-heading">
      <h2 id="llkb-heading">LLKB (Lessons Learned Knowledge Base)</h2>
      <div class="card-content">
        <div class="stat">
          <span class="stat-label">Status</span>
          <span class="stat-value ${llkbEnabled ? 'status-ok' : 'status-warning'}" role="status">
            ${llkbEnabled ? 'Enabled' : 'Not Enabled'}
          </span>
        </div>
        ${llkbEnabled && this.llkbStats ? `
        <div class="stat">
          <span class="stat-label">Lessons</span>
          <span class="stat-value">${escapeHtml(this.llkbStats.lessons)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Components</span>
          <span class="stat-value">${escapeHtml(this.llkbStats.components)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Avg Confidence</span>
          <span class="stat-value">${this.llkbStats.avgConfidence !== undefined ? (this.llkbStats.avgConfidence * 100).toFixed(0) + '%' : 'N/A'}</span>
        </div>
        ${this.llkbStats.lastUpdated ? `
        <div class="stat">
          <span class="stat-label">Last Updated</span>
          <span class="stat-value" title="${escapeHtml(this.llkbStats.lastUpdated)}">${escapeHtml(this.formatDate(this.llkbStats.lastUpdated))}</span>
        </div>
        ` : ''}
        ` : ''}
      </div>
      ${llkbEnabled ? `
      <div class="actions">
        <button data-command="llkbHealth" aria-label="Run LLKB health check">Health Check</button>
        <button data-command="llkbStats" aria-label="View LLKB statistics">Statistics</button>
        <button data-command="llkbSeed" aria-label="Seed LLKB with universal patterns">Seed Patterns</button>
      </div>
      ` : ''}
    </div>

    ${this.getImplementationProgressCard()}

    ${this.getJourneySummaryCard()}

    <div class="card" role="region" aria-labelledby="actions-heading">
      <h2 id="actions-heading">Quick Actions</h2>
      <div class="actions">
        <button data-command="runDoctor" aria-label="Run ARTK diagnostics">Run Doctor</button>
        <button data-command="checkPrerequisites" aria-label="Check system prerequisites">Check Prerequisites</button>
        <button data-command="upgrade" aria-label="Upgrade ARTK to latest version">Upgrade ARTK</button>
      </div>
    </div>
  </div>`;
  }

  /**
   * Generate implementation progress card
   */
  private getImplementationProgressCard(): string {
    const session = this.sessionState;

    // Only show if there's an active or recently completed session
    if (!session || session.status === 'idle') {
      return '';
    }

    const completed = session.completedJourneys?.length ?? 0;
    const failed = session.failedJourneys?.length ?? 0;
    const total = session.totalJourneys;
    const progress = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;
    const elapsed = session.elapsedMs ? this.formatElapsed(session.elapsedMs) : '';

    const isRunning = session.status === 'running';
    const isCompleted = session.status === 'completed';
    const isFailed = session.status === 'failed';

    return `
    <div class="card ${isRunning ? 'highlight' : ''}" role="region" aria-labelledby="progress-heading">
      <h2 id="progress-heading">Implementation Progress</h2>
      <div class="card-content">
        <div class="stat">
          <span class="stat-label">Status</span>
          <span class="stat-value ${isCompleted ? 'status-ok' : isFailed ? 'status-error' : ''}" role="status">
            ${escapeHtml(session.status.charAt(0).toUpperCase() + session.status.slice(1))}
          </span>
        </div>

        ${session.currentJourney && isRunning ? `
        <div class="stat">
          <span class="stat-label">Current</span>
          <span class="stat-value">${escapeHtml(session.currentJourney)}</span>
        </div>
        ` : ''}

        ${session.currentStep && isRunning ? `
        <div class="stat">
          <span class="stat-label">Step</span>
          <span class="stat-value" title="${escapeHtml(session.currentStep)}">${escapeHtml(session.currentStep)}</span>
        </div>
        ` : ''}

        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <div class="progress-text">${completed + failed}/${total} journeys (${progress}%)${elapsed ? ` • ${elapsed}` : ''}</div>
        </div>

        ${this.getJourneyProgressList(session)}

        ${session.lastError ? `
        <div class="stat">
          <span class="stat-label">Last Error</span>
          <span class="stat-value status-error" title="${escapeHtml(session.lastError)}">${escapeHtml(session.lastError.substring(0, 50))}${session.lastError.length > 50 ? '...' : ''}</span>
        </div>
        ` : ''}
      </div>
    </div>`;
  }

  /**
   * Generate journey progress list showing completed/current/pending
   */
  private getJourneyProgressList(session: SessionState): string {
    const completed = new Set(session.completedJourneys || []);
    const failed = new Set(session.failedJourneys || []);
    const current = session.currentJourney;

    // We don't have full list of journeys, so just show completed, failed, and current
    const items: string[] = [];

    for (const id of completed) {
      items.push(`<span class="journey-item completed" title="Completed">✓ ${escapeHtml(id)}</span>`);
    }

    for (const id of failed) {
      items.push(`<span class="journey-item failed" title="Failed">✗ ${escapeHtml(id)}</span>`);
    }

    if (current && !completed.has(current) && !failed.has(current)) {
      items.push(`<span class="journey-item current" title="In Progress">◉ ${escapeHtml(current)}</span>`);
    }

    if (items.length === 0) {
      return '';
    }

    return `<div class="journey-list">${items.join('')}</div>`;
  }

  /**
   * Format elapsed time for display
   */
  private formatElapsed(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Generate journey summary card with quick actions
   */
  private getJourneySummaryCard(): string {
    if (!this.journeySummaryData || this.journeySummaryData.total === 0) {
      return '';
    }

    const data = this.journeySummaryData;
    const readyCount = data.readyToImplement?.length ?? 0;

    return `
    <div class="card" role="region" aria-labelledby="journeys-heading">
      <h2 id="journeys-heading">Journey Summary</h2>
      <div class="card-content">
        <div class="stat">
          <span class="stat-label">Total</span>
          <span class="stat-value">${escapeHtml(data.total)}</span>
        </div>
        ${data.implemented > 0 ? `
        <div class="stat">
          <span class="stat-label">Implemented</span>
          <span class="stat-value status-ok">${escapeHtml(data.implemented)}</span>
        </div>
        ` : ''}
        ${data.clarified > 0 ? `
        <div class="stat">
          <span class="stat-label">Clarified</span>
          <span class="stat-value">${escapeHtml(data.clarified)}</span>
        </div>
        ` : ''}
        ${data.defined > 0 ? `
        <div class="stat">
          <span class="stat-label">Defined</span>
          <span class="stat-value">${escapeHtml(data.defined)}</span>
        </div>
        ` : ''}
        ${data.proposed > 0 ? `
        <div class="stat">
          <span class="stat-label">Proposed</span>
          <span class="stat-value">${escapeHtml(data.proposed)}</span>
        </div>
        ` : ''}
        ${data.quarantined > 0 ? `
        <div class="stat">
          <span class="stat-label">Quarantined</span>
          <span class="stat-value status-warning">${escapeHtml(data.quarantined)}</span>
        </div>
        ` : ''}
        ${data.deprecated > 0 ? `
        <div class="stat">
          <span class="stat-label">Deprecated</span>
          <span class="stat-value">${escapeHtml(data.deprecated)}</span>
        </div>
        ` : ''}
        ${readyCount > 0 ? `
        <div class="stat">
          <span class="stat-label">Ready to Implement</span>
          <span class="stat-value" title="${escapeHtml(data.readyToImplement?.join(', '))}">${escapeHtml(readyCount)}</span>
        </div>
        ` : ''}
      </div>
      <div class="actions">
        <button data-command="viewJourneys" class="button-secondary" aria-label="View all journeys">View Journeys</button>
        <button data-command="journeyValidate" class="button-secondary" aria-label="Validate journeys">Validate All</button>
        ${readyCount > 0 ? `
        <button data-command="journeyImplementReady" class="button-primary" aria-label="Implement ${readyCount} ready journeys">Implement Ready (${readyCount})</button>
        ` : ''}
      </div>
    </div>`;
  }

  /**
   * Format date for display
   */
  private formatDate(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) {
        return 'Today';
      } else if (days === 1) {
        return 'Yesterday';
      } else if (days < 7) {
        return `${days} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return isoDate;
    }
  }

  /**
   * Generate content for not installed state
   */
  private getNotInstalledContent(): string {
    return `
  <div class="not-installed" role="main" aria-label="ARTK Installation">
    <h2>ARTK is not installed in this workspace</h2>
    <p>Click the button below to start the installation wizard.</p>
    <button data-command="init" aria-label="Start ARTK installation wizard">Install ARTK</button>
  </div>`;
  }

  /**
   * Dispose the panel
   */
  public dispose(): void {
    DashboardPanel.currentPanel = undefined;

    // Stop session polling
    this.stopSessionPolling();

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
