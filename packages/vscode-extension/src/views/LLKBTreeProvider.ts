/**
 * LLKB Tree View Provider
 *
 * Displays Lessons Learned Knowledge Base status and contents.
 * Uses async I/O to avoid blocking the extension host.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspaceContextManager, WorkspaceContextManager } from '../workspace';
import type { LLKBStats } from '../types';
import { logger } from '../utils';

const fsPromises = fs.promises;

/**
 * Tree item types
 */
type LLKBTreeItemType = 'section' | 'stat' | 'lesson' | 'component' | 'action' | 'loading' | 'error';

/**
 * LLKB tree item
 */
class LLKBTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly itemType: LLKBTreeItemType,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children?: LLKBTreeItem[],
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);

    // Set icon based on type
    switch (itemType) {
      case 'section':
        this.iconPath = new vscode.ThemeIcon('folder');
        break;
      case 'stat':
        this.iconPath = new vscode.ThemeIcon('symbol-number');
        break;
      case 'lesson':
        this.iconPath = new vscode.ThemeIcon('book');
        break;
      case 'component':
        this.iconPath = new vscode.ThemeIcon('symbol-method');
        break;
      case 'action':
        this.iconPath = new vscode.ThemeIcon('play');
        break;
      case 'loading':
        this.iconPath = new vscode.ThemeIcon('loading~spin');
        break;
      case 'error':
        this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('editorError.foreground'));
        break;
    }

    this.contextValue = itemType;
  }
}

/**
 * LLKB Tree Data Provider
 */
export class LLKBTreeProvider implements vscode.TreeDataProvider<LLKBTreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<LLKBTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly contextManager: WorkspaceContextManager;
  private llkbData: LLKBData | undefined;
  private isLoading = false;
  private loadError: string | undefined;
  private lastLoadTime = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds cache

  constructor() {
    this.contextManager = getWorkspaceContextManager();

    // Listen for changes
    this.contextManager.onDidChangeWorkspace(() => this.refresh());
    this.contextManager.onDidChangeLLKB(() => this.invalidateCache());
  }

  /**
   * Invalidate cache and trigger refresh
   */
  private invalidateCache(): void {
    this.lastLoadTime = 0;
    this.refresh();
  }

  refresh(): void {
    this.loadLLKBDataAsync().then(() => {
      this._onDidChangeTreeData.fire(undefined);
    });
  }

  getTreeItem(element: LLKBTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: LLKBTreeItem): LLKBTreeItem[] | Thenable<LLKBTreeItem[]> {
    if (!this.contextManager.isInstalled || !this.contextManager.llkbEnabled) {
      return [];
    }

    if (element) {
      return element.children || [];
    }

    // Check if cache is still valid
    const now = Date.now();
    if (now - this.lastLoadTime < this.CACHE_DURATION && this.llkbData) {
      return this.buildLLKBTree();
    }

    // Show loading state
    if (this.isLoading) {
      return [new LLKBTreeItem('Loading LLKB data...', 'loading', vscode.TreeItemCollapsibleState.None)];
    }

    // Show error state
    if (this.loadError) {
      return [new LLKBTreeItem(`Error: ${this.loadError}`, 'error', vscode.TreeItemCollapsibleState.None)];
    }

    // First load
    if (!this.llkbData && this.lastLoadTime === 0) {
      return this.loadLLKBDataAsync().then(() => this.buildLLKBTree());
    }

    if (!this.llkbData) {
      return [
        new LLKBTreeItem(
          'Unable to load LLKB data',
          'error',
          vscode.TreeItemCollapsibleState.None
        ),
      ];
    }

    return this.buildLLKBTree();
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
   * Safely parse JSON with error handling
   */
  private safeJsonParse<T>(content: string, defaultValue: T): T {
    try {
      return JSON.parse(content) as T;
    } catch (err) {
      logger.warn(`Failed to parse JSON: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return defaultValue;
    }
  }

  /**
   * Load LLKB data asynchronously
   */
  private async loadLLKBDataAsync(): Promise<void> {
    const llkbPath = this.contextManager.workspaceInfo?.llkbPath;
    if (!llkbPath) {
      this.llkbData = undefined;
      this.loadError = undefined;
      return;
    }

    try {
      this.isLoading = true;
      this.loadError = undefined;
      this._onDidChangeTreeData.fire(undefined); // Show loading state

      // Check which files exist in parallel
      const lessonsPath = path.join(llkbPath, 'lessons.json');
      const componentsPath = path.join(llkbPath, 'components.json');
      const analyticsPath = path.join(llkbPath, 'analytics.json');

      const [lessonsExists, componentsExists, analyticsExists] = await Promise.all([
        this.pathExists(lessonsPath),
        this.pathExists(componentsPath),
        this.pathExists(analyticsPath),
      ]);

      // Read files that exist in parallel
      const readPromises: Promise<{ type: string; content: string } | null>[] = [];

      if (lessonsExists) {
        readPromises.push(
          fsPromises.readFile(lessonsPath, 'utf-8').then((content) => ({ type: 'lessons', content }))
        );
      }
      if (componentsExists) {
        readPromises.push(
          fsPromises.readFile(componentsPath, 'utf-8').then((content) => ({ type: 'components', content }))
        );
      }
      if (analyticsExists) {
        readPromises.push(
          fsPromises.readFile(analyticsPath, 'utf-8').then((content) => ({ type: 'analytics', content }))
        );
      }

      const results = await Promise.all(readPromises);

      // Parse results
      let lessons: { lessons: LLKBLesson[] } = { lessons: [] };
      let components: { components: LLKBComponent[] } = { components: [] };
      let analytics: { totalLearningEvents?: number; lastUpdated?: string } = { totalLearningEvents: 0 };

      for (const result of results) {
        if (!result) continue;

        switch (result.type) {
          case 'lessons':
            lessons = this.safeJsonParse(result.content, { lessons: [] });
            break;
          case 'components':
            components = this.safeJsonParse(result.content, { components: [] });
            break;
          case 'analytics':
            analytics = this.safeJsonParse(result.content, { totalLearningEvents: 0 });
            break;
        }
      }

      this.llkbData = {
        lessons: lessons.lessons || [],
        components: components.components || [],
        analytics,
      };
      this.lastLoadTime = Date.now();
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
      this.loadError = err instanceof Error ? err.message : 'Unknown error';
      this.llkbData = undefined;
      logger.error('Failed to load LLKB data', err instanceof Error ? err : undefined);
    }
  }

  private buildLLKBTree(): LLKBTreeItem[] {
    if (!this.llkbData) {
      return [];
    }

    const items: LLKBTreeItem[] = [];

    // Overview section
    const overviewChildren: LLKBTreeItem[] = [
      new LLKBTreeItem(
        `Lessons: ${this.llkbData.lessons.length}`,
        'stat',
        vscode.TreeItemCollapsibleState.None
      ),
      new LLKBTreeItem(
        `Components: ${this.llkbData.components.length}`,
        'stat',
        vscode.TreeItemCollapsibleState.None
      ),
      new LLKBTreeItem(
        `Learning Events: ${this.llkbData.analytics.totalLearningEvents || 0}`,
        'stat',
        vscode.TreeItemCollapsibleState.None
      ),
    ];

    if (this.llkbData.analytics.lastUpdated) {
      const lastUpdated = new Date(this.llkbData.analytics.lastUpdated);
      overviewChildren.push(
        new LLKBTreeItem(
          `Last Updated: ${lastUpdated.toLocaleDateString()}`,
          'stat',
          vscode.TreeItemCollapsibleState.None
        )
      );
    }

    items.push(
      new LLKBTreeItem(
        'Overview',
        'section',
        vscode.TreeItemCollapsibleState.Expanded,
        overviewChildren
      )
    );

    // Lessons by category
    const lessonsByCategory = this.groupLessonsByCategory();
    if (Object.keys(lessonsByCategory).length > 0) {
      const categoryChildren: LLKBTreeItem[] = [];

      for (const [category, lessons] of Object.entries(lessonsByCategory)) {
        categoryChildren.push(
          new LLKBTreeItem(
            `${category} (${lessons.length})`,
            'lesson',
            vscode.TreeItemCollapsibleState.None
          )
        );
      }

      items.push(
        new LLKBTreeItem(
          'Lessons by Category',
          'section',
          vscode.TreeItemCollapsibleState.Collapsed,
          categoryChildren
        )
      );
    }

    // Top components
    const topComponents = this.getTopComponents(5);
    if (topComponents.length > 0) {
      const componentChildren = topComponents.map(
        (comp) =>
          new LLKBTreeItem(
            `${comp.name} (${comp.usageCount} uses)`,
            'component',
            vscode.TreeItemCollapsibleState.None
          )
      );

      items.push(
        new LLKBTreeItem(
          'Top Components',
          'section',
          vscode.TreeItemCollapsibleState.Collapsed,
          componentChildren
        )
      );
    }

    // Low confidence lessons
    const lowConfidenceLessons = this.getLowConfidenceLessons();
    if (lowConfidenceLessons.length > 0) {
      const lowConfidenceChildren = lowConfidenceLessons.map(
        (lesson) =>
          new LLKBTreeItem(
            `${lesson.id}: ${lesson.confidence.toFixed(2)}`,
            'lesson',
            vscode.TreeItemCollapsibleState.None
          )
      );

      items.push(
        new LLKBTreeItem(
          `Needs Review (${lowConfidenceLessons.length})`,
          'section',
          vscode.TreeItemCollapsibleState.Collapsed,
          lowConfidenceChildren
        )
      );
    }

    // Actions
    const actionChildren: LLKBTreeItem[] = [
      new LLKBTreeItem(
        'Health Check',
        'action',
        vscode.TreeItemCollapsibleState.None,
        undefined,
        { command: 'artk.llkb.health', title: 'Health Check' }
      ),
      new LLKBTreeItem(
        'View Statistics',
        'action',
        vscode.TreeItemCollapsibleState.None,
        undefined,
        { command: 'artk.llkb.stats', title: 'View Statistics' }
      ),
      new LLKBTreeItem(
        'Export for AutoGen',
        'action',
        vscode.TreeItemCollapsibleState.None,
        undefined,
        { command: 'artk.llkb.export', title: 'Export for AutoGen' }
      ),
    ];

    items.push(
      new LLKBTreeItem(
        'Actions',
        'section',
        vscode.TreeItemCollapsibleState.Expanded,
        actionChildren
      )
    );

    return items;
  }

  private groupLessonsByCategory(): Record<string, LLKBLesson[]> {
    const groups: Record<string, LLKBLesson[]> = {};

    for (const lesson of this.llkbData?.lessons || []) {
      const category = lesson.category || 'uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(lesson);
    }

    return groups;
  }

  private getTopComponents(limit: number): LLKBComponent[] {
    const components = this.llkbData?.components || [];
    return [...components]
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, limit);
  }

  private getLowConfidenceLessons(): LLKBLesson[] {
    const threshold = 0.5;
    return (this.llkbData?.lessons || []).filter(
      (lesson) => lesson.confidence < threshold
    );
  }
}

// Internal types for LLKB data
interface LLKBData {
  lessons: LLKBLesson[];
  components: LLKBComponent[];
  analytics: {
    totalLearningEvents?: number;
    lastUpdated?: string;
  };
}

interface LLKBLesson {
  id: string;
  category?: string;
  confidence: number;
  description?: string;
}

interface LLKBComponent {
  id: string;
  name: string;
  usageCount?: number;
}
