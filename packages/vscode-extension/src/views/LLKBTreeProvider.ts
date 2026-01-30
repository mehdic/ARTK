/**
 * LLKB Tree View Provider
 *
 * Displays Lessons Learned Knowledge Base status and contents.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspaceContextManager, WorkspaceContextManager } from '../workspace';
import type { LLKBStats } from '../types';

/**
 * Tree item types
 */
type LLKBTreeItemType = 'section' | 'stat' | 'lesson' | 'component' | 'action';

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

  constructor() {
    this.contextManager = getWorkspaceContextManager();

    // Listen for changes
    this.contextManager.onDidChangeWorkspace(() => this.refresh());
    this.contextManager.onDidChangeLLKB(() => this.refresh());
  }

  refresh(): void {
    this.loadLLKBData();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: LLKBTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: LLKBTreeItem): LLKBTreeItem[] {
    if (!this.contextManager.isInstalled || !this.contextManager.llkbEnabled) {
      return [];
    }

    if (element) {
      return element.children || [];
    }

    // Root level
    this.loadLLKBData();

    if (!this.llkbData) {
      return [
        new LLKBTreeItem(
          'Unable to load LLKB data',
          'stat',
          vscode.TreeItemCollapsibleState.None
        ),
      ];
    }

    return this.buildLLKBTree();
  }

  private loadLLKBData(): void {
    const llkbPath = this.contextManager.workspaceInfo?.llkbPath;
    if (!llkbPath) {
      this.llkbData = undefined;
      return;
    }

    try {
      // Read lessons.json
      const lessonsPath = path.join(llkbPath, 'lessons.json');
      const lessons = fs.existsSync(lessonsPath)
        ? JSON.parse(fs.readFileSync(lessonsPath, 'utf-8'))
        : { lessons: [] };

      // Read components.json
      const componentsPath = path.join(llkbPath, 'components.json');
      const components = fs.existsSync(componentsPath)
        ? JSON.parse(fs.readFileSync(componentsPath, 'utf-8'))
        : { components: [] };

      // Read analytics.json
      const analyticsPath = path.join(llkbPath, 'analytics.json');
      const analytics = fs.existsSync(analyticsPath)
        ? JSON.parse(fs.readFileSync(analyticsPath, 'utf-8'))
        : { totalLearningEvents: 0 };

      this.llkbData = {
        lessons: lessons.lessons || [],
        components: components.components || [],
        analytics,
      };
    } catch (err) {
      this.llkbData = undefined;
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
