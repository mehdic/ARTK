/**
 * Journeys Tree View Provider
 *
 * Displays journeys organized by status and tier.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { getWorkspaceContextManager, WorkspaceContextManager } from '../workspace';
import type { JourneyFrontmatter, JourneyItem } from '../types';

/**
 * Tree item types
 */
type JourneyTreeItemType = 'group' | 'journey';

/**
 * Journey tree item
 */
class JourneyTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly itemType: JourneyTreeItemType,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly journey?: JourneyItem,
    public readonly children?: JourneyTreeItem[]
  ) {
    super(label, collapsibleState);

    if (itemType === 'journey' && journey) {
      this.description = journey.status;
      this.tooltip = `${journey.title}\nStatus: ${journey.status}\nTier: ${journey.tier}`;
      this.contextValue = 'journey';
      this.resourceUri = vscode.Uri.file(journey.filePath);

      // Set icon based on status
      switch (journey.status) {
        case 'implemented':
          this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
          break;
        case 'clarified':
          this.iconPath = new vscode.ThemeIcon('file-code');
          break;
        case 'defined':
          this.iconPath = new vscode.ThemeIcon('file');
          break;
        case 'proposed':
          this.iconPath = new vscode.ThemeIcon('lightbulb');
          break;
        case 'quarantined':
          this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
          break;
        case 'deprecated':
          this.iconPath = new vscode.ThemeIcon('trash', new vscode.ThemeColor('disabledForeground'));
          break;
      }

      // Click to open
      this.command = {
        command: 'artk.openJourney',
        title: 'Open Journey',
        arguments: [journey.filePath],
      };
    } else {
      this.iconPath = new vscode.ThemeIcon('folder');
      this.contextValue = 'journeyGroup';
    }
  }
}

/**
 * Journeys Tree Data Provider
 */
export class JourneysTreeProvider implements vscode.TreeDataProvider<JourneyTreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<JourneyTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly contextManager: WorkspaceContextManager;
  private journeys: JourneyItem[] = [];
  private groupBy: 'status' | 'tier' = 'status';

  constructor() {
    this.contextManager = getWorkspaceContextManager();

    // Listen for changes
    this.contextManager.onDidChangeWorkspace(() => this.refresh());
    this.contextManager.onDidChangeJourneys(() => this.refresh());
  }

  refresh(): void {
    this.loadJourneys();
    this._onDidChangeTreeData.fire(undefined);
  }

  setGroupBy(groupBy: 'status' | 'tier'): void {
    this.groupBy = groupBy;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: JourneyTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: JourneyTreeItem): JourneyTreeItem[] {
    if (!this.contextManager.isInstalled) {
      return [];
    }

    if (element) {
      return element.children || [];
    }

    // Root level - group journeys
    this.loadJourneys();

    if (this.journeys.length === 0) {
      return [];
    }

    return this.groupBy === 'status'
      ? this.groupByStatus()
      : this.groupByTier();
  }

  private loadJourneys(): void {
    const artkE2ePath = this.contextManager.workspaceInfo?.artkE2ePath;
    if (!artkE2ePath) {
      this.journeys = [];
      return;
    }

    const journeysDir = path.join(artkE2ePath, 'journeys');
    if (!fs.existsSync(journeysDir)) {
      this.journeys = [];
      return;
    }

    this.journeys = this.scanJourneyFiles(journeysDir);
  }

  private scanJourneyFiles(dir: string): JourneyItem[] {
    const journeys: JourneyItem[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recurse into subdirectories
          journeys.push(...this.scanJourneyFiles(fullPath));
        } else if (entry.name.endsWith('.md')) {
          // Parse journey file
          const journey = this.parseJourneyFile(fullPath);
          if (journey) {
            journeys.push(journey);
          }
        }
      }
    } catch (err) {
      // Ignore errors
    }

    return journeys;
  }

  private parseJourneyFile(filePath: string): JourneyItem | undefined {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract YAML frontmatter
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (!match) {
        return undefined;
      }

      const frontmatter = YAML.parse(match[1]) as JourneyFrontmatter;

      if (!frontmatter.id || !frontmatter.status) {
        return undefined;
      }

      return {
        id: frontmatter.id,
        title: frontmatter.title || frontmatter.id,
        status: frontmatter.status,
        tier: frontmatter.tier || 'regression',
        filePath,
        tests: frontmatter.tests,
        owner: frontmatter.owner,
      };
    } catch {
      return undefined;
    }
  }

  private groupByStatus(): JourneyTreeItem[] {
    const groups: Record<string, JourneyItem[]> = {
      implemented: [],
      clarified: [],
      defined: [],
      proposed: [],
      quarantined: [],
      deprecated: [],
    };

    for (const journey of this.journeys) {
      if (groups[journey.status]) {
        groups[journey.status].push(journey);
      }
    }

    const items: JourneyTreeItem[] = [];

    for (const [status, journeys] of Object.entries(groups)) {
      if (journeys.length === 0) {
        continue;
      }

      const children = journeys.map(
        (j) =>
          new JourneyTreeItem(
            j.id,
            'journey',
            vscode.TreeItemCollapsibleState.None,
            j
          )
      );

      items.push(
        new JourneyTreeItem(
          `${this.capitalizeFirst(status)} (${journeys.length})`,
          'group',
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          children
        )
      );
    }

    return items;
  }

  private groupByTier(): JourneyTreeItem[] {
    const groups: Record<string, JourneyItem[]> = {
      smoke: [],
      release: [],
      regression: [],
    };

    for (const journey of this.journeys) {
      if (groups[journey.tier]) {
        groups[journey.tier].push(journey);
      }
    }

    const items: JourneyTreeItem[] = [];

    for (const [tier, journeys] of Object.entries(groups)) {
      if (journeys.length === 0) {
        continue;
      }

      const children = journeys.map(
        (j) =>
          new JourneyTreeItem(
            j.id,
            'journey',
            vscode.TreeItemCollapsibleState.None,
            j
          )
      );

      items.push(
        new JourneyTreeItem(
          `${this.capitalizeFirst(tier)} (${journeys.length})`,
          'group',
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          children
        )
      );
    }

    return items;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
