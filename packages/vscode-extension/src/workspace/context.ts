/**
 * Workspace Context Management
 *
 * Manages ARTK workspace context and state within VS Code.
 */

import * as vscode from 'vscode';
import type { ArtkWorkspaceInfo, ArtkContext, ArtkConfig } from '../types';
import { detectArtkWorkspace, readContext, readConfig } from './detector';
import { createWatchers } from './watcher';

/**
 * Event emitter for workspace changes
 */
export class WorkspaceContextManager {
  private _workspaceInfo: ArtkWorkspaceInfo | undefined;
  private _context: ArtkContext | undefined;
  private _config: ArtkConfig | undefined;

  private readonly _onDidChangeWorkspace = new vscode.EventEmitter<ArtkWorkspaceInfo | undefined>();
  private readonly _onDidChangeConfig = new vscode.EventEmitter<ArtkConfig | undefined>();
  private readonly _onDidChangeLLKB = new vscode.EventEmitter<void>();
  private readonly _onDidChangeJourneys = new vscode.EventEmitter<void>();

  public readonly onDidChangeWorkspace = this._onDidChangeWorkspace.event;
  public readonly onDidChangeConfig = this._onDidChangeConfig.event;
  public readonly onDidChangeLLKB = this._onDidChangeLLKB.event;
  public readonly onDidChangeJourneys = this._onDidChangeJourneys.event;

  constructor() {}

  /**
   * Initialize the context manager
   */
  initialize(extensionContext: vscode.ExtensionContext): void {
    // Initial detection
    this.refresh();

    // Set up file watchers
    createWatchers(extensionContext, {
      onConfigChange: () => this.refreshConfig(),
      onContextChange: () => this.refresh(),
      onLLKBChange: () => this._onDidChangeLLKB.fire(),
      onJourneyChange: () => this._onDidChangeJourneys.fire(),
    });

    // Watch for workspace folder changes
    extensionContext.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.refresh())
    );

    // Set VS Code context for when clauses
    this.updateVSCodeContext();
  }

  /**
   * Refresh workspace detection
   */
  refresh(): void {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      this._workspaceInfo = undefined;
      this._context = undefined;
      this._config = undefined;
      this._onDidChangeWorkspace.fire(undefined);
      this.updateVSCodeContext();
      return;
    }

    // Detect in first workspace folder
    this._workspaceInfo = detectArtkWorkspace(folders[0]);

    if (this._workspaceInfo.detected) {
      // Read context and config
      if (this._workspaceInfo.contextPath) {
        this._context = readContext(this._workspaceInfo.contextPath);
      }
      if (this._workspaceInfo.configPath) {
        this._config = readConfig(this._workspaceInfo.configPath);
      }
    } else {
      this._context = undefined;
      this._config = undefined;
    }

    this._onDidChangeWorkspace.fire(this._workspaceInfo);
    this.updateVSCodeContext();
  }

  /**
   * Refresh only the config
   */
  refreshConfig(): void {
    if (this._workspaceInfo?.configPath) {
      this._config = readConfig(this._workspaceInfo.configPath);
      this._onDidChangeConfig.fire(this._config);
    }
  }

  /**
   * Update VS Code context for when clauses
   */
  private updateVSCodeContext(): void {
    vscode.commands.executeCommand(
      'setContext',
      'artk.installed',
      this._workspaceInfo?.detected ?? false
    );
    vscode.commands.executeCommand(
      'setContext',
      'artk.llkbEnabled',
      this._workspaceInfo?.llkbEnabled ?? false
    );
  }

  /**
   * Get current workspace info
   */
  get workspaceInfo(): ArtkWorkspaceInfo | undefined {
    return this._workspaceInfo;
  }

  /**
   * Get current context
   */
  get artkContext(): ArtkContext | undefined {
    return this._context;
  }

  /**
   * Get current config
   */
  get artkConfig(): ArtkConfig | undefined {
    return this._config;
  }

  /**
   * Check if ARTK is installed
   */
  get isInstalled(): boolean {
    return this._workspaceInfo?.detected ?? false;
  }

  /**
   * Check if LLKB is enabled
   */
  get llkbEnabled(): boolean {
    return this._workspaceInfo?.llkbEnabled ?? false;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this._onDidChangeWorkspace.dispose();
    this._onDidChangeConfig.dispose();
    this._onDidChangeLLKB.dispose();
    this._onDidChangeJourneys.dispose();
  }
}

// Singleton instance
let _instance: WorkspaceContextManager | undefined;

export function getWorkspaceContextManager(): WorkspaceContextManager {
  if (!_instance) {
    _instance = new WorkspaceContextManager();
  }
  return _instance;
}
