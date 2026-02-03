/**
 * Journeys Tree View Provider
 *
 * Displays journeys organized by status and tier.
 * Uses async I/O to avoid blocking the extension host.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { getWorkspaceContextManager, WorkspaceContextManager } from '../workspace';
import type { JourneyFrontmatter, JourneyItem } from '../types';
import { logger } from '../utils';

const fsPromises = fs.promises;

/** Maximum recursion depth for directory scanning */
const MAX_RECURSION_DEPTH = 10;

/** Maximum number of files to scan */
const MAX_FILES_TO_SCAN = 1000;

/**
 * Tree item types
 */
type JourneyTreeItemType = 'group' | 'journey' | 'loading' | 'error';

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
    } else if (itemType === 'loading') {
      this.iconPath = new vscode.ThemeIcon('loading~spin');
      this.contextValue = 'loading';
    } else if (itemType === 'error') {
      this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('editorError.foreground'));
      this.contextValue = 'error';
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
  private isLoading = false;
  private loadError: string | undefined;
  private lastLoadTime = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds cache

  constructor() {
    this.contextManager = getWorkspaceContextManager();

    // Listen for changes
    this.contextManager.onDidChangeWorkspace(() => this.refresh());
    this.contextManager.onDidChangeJourneys(() => this.invalidateCache());
  }

  /**
   * Invalidate cache and trigger refresh
   */
  private invalidateCache(): void {
    this.lastLoadTime = 0;
    this.refresh();
  }

  /**
   * Refresh the tree view
   */
  refresh(): void {
    // Load journeys asynchronously
    this.loadJourneysAsync().then(() => {
      this._onDidChangeTreeData.fire(undefined);
    });
  }

  setGroupBy(groupBy: 'status' | 'tier'): void {
    this.groupBy = groupBy;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: JourneyTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: JourneyTreeItem): JourneyTreeItem[] | Thenable<JourneyTreeItem[]> {
    if (!this.contextManager.isInstalled) {
      return [];
    }

    if (element) {
      return element.children || [];
    }

    // Check if cache is still valid
    const now = Date.now();
    if (now - this.lastLoadTime < this.CACHE_DURATION && this.journeys.length > 0) {
      return this.buildTree();
    }

    // Show loading state if we're loading
    if (this.isLoading) {
      return [new JourneyTreeItem('Loading journeys...', 'loading', vscode.TreeItemCollapsibleState.None)];
    }

    // Show error state if load failed
    if (this.loadError) {
      return [new JourneyTreeItem(`Error: ${this.loadError}`, 'error', vscode.TreeItemCollapsibleState.None)];
    }

    // Return current data (may be stale) and trigger async load
    if (this.journeys.length === 0 && this.lastLoadTime === 0) {
      // First load - show loading and return promise
      return this.loadJourneysAsync().then(() => this.buildTree());
    }

    return this.buildTree();
  }

  /**
   * Build the tree structure from loaded journeys
   */
  private buildTree(): JourneyTreeItem[] {
    if (this.journeys.length === 0) {
      return [];
    }

    return this.groupBy === 'status'
      ? this.groupByStatus()
      : this.groupByTier();
  }

  /**
   * Load journeys asynchronously
   */
  private async loadJourneysAsync(): Promise<void> {
    const artkE2ePath = this.contextManager.workspaceInfo?.artkE2ePath;
    if (!artkE2ePath) {
      this.journeys = [];
      this.loadError = undefined;
      return;
    }

    const journeysDir = path.join(artkE2ePath, 'journeys');

    try {
      const exists = await this.pathExists(journeysDir);
      if (!exists) {
        this.journeys = [];
        this.loadError = undefined;
        this.lastLoadTime = Date.now();
        return;
      }

      this.isLoading = true;
      this.loadError = undefined;
      this._onDidChangeTreeData.fire(undefined); // Show loading state

      const journeys = await this.scanJourneyFilesAsync(journeysDir, 0);
      this.journeys = journeys;
      this.lastLoadTime = Date.now();
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
      this.loadError = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to load journeys', err instanceof Error ? err : undefined);
    }
  }

  /**
   * Check if path exists (async)
   */
  private async pathExists(p: string): Promise<boolean> {
    try {
      await fsPromises.access(p);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scan directory for journey files (async with depth limit)
   */
  private async scanJourneyFilesAsync(
    dir: string,
    depth: number,
    fileCount: { count: number } = { count: 0 }
  ): Promise<JourneyItem[]> {
    // Check recursion depth limit
    if (depth >= MAX_RECURSION_DEPTH) {
      logger.warn(`Recursion depth limit (${MAX_RECURSION_DEPTH}) reached at: ${dir}`);
      return [];
    }

    // Check file count limit
    if (fileCount.count >= MAX_FILES_TO_SCAN) {
      logger.warn(`File scan limit (${MAX_FILES_TO_SCAN}) reached`);
      return [];
    }

    const journeys: JourneyItem[] = [];

    try {
      const entries = await fsPromises.readdir(dir, { withFileTypes: true });

      // Process entries in parallel with controlled concurrency
      const promises: Promise<JourneyItem | JourneyItem[] | undefined>[] = [];

      for (const entry of entries) {
        if (fileCount.count >= MAX_FILES_TO_SCAN) {
          break;
        }

        const fullPath = path.join(dir, entry.name);

        // Skip hidden directories and common non-journey directories
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        if (entry.isDirectory()) {
          // Recurse into subdirectories
          promises.push(this.scanJourneyFilesAsync(fullPath, depth + 1, fileCount));
        } else if (entry.name.endsWith('.md')) {
          fileCount.count++;
          // Parse journey file
          promises.push(this.parseJourneyFileAsync(fullPath));
        }
      }

      const results = await Promise.all(promises);

      for (const result of results) {
        if (result) {
          if (Array.isArray(result)) {
            journeys.push(...result);
          } else {
            journeys.push(result);
          }
        }
      }
    } catch (err) {
      // Log error but don't fail entirely
      logger.error(`Failed to scan directory: ${dir}`, err instanceof Error ? err : undefined);
    }

    return journeys;
  }

  /**
   * Parse a journey file (async)
   */
  private async parseJourneyFileAsync(filePath: string): Promise<JourneyItem | undefined> {
    try {
      const content = await fsPromises.readFile(filePath, 'utf-8');

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
    } catch (err) {
      // Log parse errors for debugging
      logger.warn(`Failed to parse journey file: ${filePath}`);
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
