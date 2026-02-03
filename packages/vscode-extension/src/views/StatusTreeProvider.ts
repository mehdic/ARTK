/**
 * Status Tree View Provider
 *
 * Displays ARTK installation status, health, and quick actions.
 */

import * as vscode from 'vscode';
import { getWorkspaceContextManager, WorkspaceContextManager } from '../workspace';

/**
 * Tree item types
 */
type StatusItemType =
  | 'section'
  | 'info'
  | 'ok'
  | 'warning'
  | 'error'
  | 'action';

/**
 * Status tree item
 */
class StatusTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly itemType: StatusItemType,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children?: StatusTreeItem[],
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);

    // Set icon based on type
    switch (itemType) {
      case 'section':
        this.iconPath = new vscode.ThemeIcon('folder');
        break;
      case 'ok':
        this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        break;
      case 'warning':
        this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
        break;
      case 'error':
        this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('editorError.foreground'));
        break;
      case 'action':
        this.iconPath = new vscode.ThemeIcon('play');
        break;
      case 'info':
      default:
        this.iconPath = new vscode.ThemeIcon('info');
        break;
    }

    this.contextValue = itemType;
  }
}

/**
 * Status Tree Data Provider
 */
export class StatusTreeProvider implements vscode.TreeDataProvider<StatusTreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<StatusTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly contextManager: WorkspaceContextManager;

  constructor() {
    this.contextManager = getWorkspaceContextManager();

    // Listen for workspace changes
    this.contextManager.onDidChangeWorkspace(() => this.refresh());
    this.contextManager.onDidChangeConfig(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: StatusTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: StatusTreeItem): StatusTreeItem[] {
    if (element) {
      return element.children || [];
    }

    // Root level
    if (!this.contextManager.isInstalled) {
      return [
        new StatusTreeItem(
          'ARTK Not Installed',
          'warning',
          vscode.TreeItemCollapsibleState.None,
          undefined,
          {
            command: 'artk.init',
            title: 'Install ARTK',
          }
        ),
      ];
    }

    return this.buildStatusTree();
  }

  private buildStatusTree(): StatusTreeItem[] {
    const items: StatusTreeItem[] = [];
    const workspaceInfo = this.contextManager.workspaceInfo;
    const artkContext = this.contextManager.artkContext;
    const artkConfig = this.contextManager.artkConfig;

    // Installation section
    const installationChildren: StatusTreeItem[] = [];

    if (artkContext) {
      installationChildren.push(
        new StatusTreeItem(
          `Version: ${artkContext.artkVersion}`,
          'info',
          vscode.TreeItemCollapsibleState.None
        ),
        new StatusTreeItem(
          `Variant: ${artkContext.variant}`,
          'info',
          vscode.TreeItemCollapsibleState.None
        ),
        new StatusTreeItem(
          `Node.js: ${artkContext.nodeVersion}`,
          'info',
          vscode.TreeItemCollapsibleState.None
        ),
        new StatusTreeItem(
          `Playwright: ${artkContext.playwrightVersion}`,
          'info',
          vscode.TreeItemCollapsibleState.None
        )
      );
    } else {
      installationChildren.push(
        new StatusTreeItem(
          'Context not found',
          'warning',
          vscode.TreeItemCollapsibleState.None
        )
      );
    }

    items.push(
      new StatusTreeItem(
        'Installation',
        'section',
        vscode.TreeItemCollapsibleState.Expanded,
        installationChildren
      )
    );

    // Configuration section
    if (artkConfig) {
      const configChildren: StatusTreeItem[] = [
        new StatusTreeItem(
          `App: ${artkConfig.app.name}`,
          'info',
          vscode.TreeItemCollapsibleState.None
        ),
      ];

      // Environments
      const envCount = Object.keys(artkConfig.environments || {}).length;
      configChildren.push(
        new StatusTreeItem(
          `Environments: ${envCount}`,
          'info',
          vscode.TreeItemCollapsibleState.None
        )
      );

      // Auth
      if (artkConfig.auth?.provider) {
        configChildren.push(
          new StatusTreeItem(
            `Auth: ${artkConfig.auth.provider}`,
            'info',
            vscode.TreeItemCollapsibleState.None
          )
        );
      }

      // Browser
      if (artkConfig.browsers?.channel) {
        configChildren.push(
          new StatusTreeItem(
            `Browser: ${artkConfig.browsers.channel}`,
            'info',
            vscode.TreeItemCollapsibleState.None
          )
        );
      }

      items.push(
        new StatusTreeItem(
          'Configuration',
          'section',
          vscode.TreeItemCollapsibleState.Collapsed,
          configChildren
        )
      );
    }

    // LLKB section
    if (workspaceInfo?.llkbEnabled) {
      items.push(
        new StatusTreeItem(
          'LLKB: Enabled',
          'ok',
          vscode.TreeItemCollapsibleState.None,
          undefined,
          {
            command: 'artk.llkb.stats',
            title: 'View LLKB Stats',
          }
        )
      );
    } else {
      items.push(
        new StatusTreeItem(
          'LLKB: Not Enabled',
          'warning',
          vscode.TreeItemCollapsibleState.None
        )
      );
    }

    // Quick Actions section
    const actionChildren: StatusTreeItem[] = [
      new StatusTreeItem(
        'Run Doctor',
        'action',
        vscode.TreeItemCollapsibleState.None,
        undefined,
        { command: 'artk.doctor', title: 'Run Doctor' }
      ),
      new StatusTreeItem(
        'Open Configuration',
        'action',
        vscode.TreeItemCollapsibleState.None,
        undefined,
        { command: 'artk.openConfig', title: 'Open Configuration' }
      ),
      new StatusTreeItem(
        'Check Prerequisites',
        'action',
        vscode.TreeItemCollapsibleState.None,
        undefined,
        { command: 'artk.check', title: 'Check Prerequisites' }
      ),
      new StatusTreeItem(
        'Upgrade ARTK',
        'action',
        vscode.TreeItemCollapsibleState.None,
        undefined,
        { command: 'artk.upgrade', title: 'Upgrade ARTK' }
      ),
    ];

    items.push(
      new StatusTreeItem(
        'Quick Actions',
        'section',
        vscode.TreeItemCollapsibleState.Expanded,
        actionChildren
      )
    );

    return items;
  }
}
