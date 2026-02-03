/**
 * LLKB Tree Provider Tests
 *
 * Tests for the LLKB tree view provider with async I/O.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';

// Mock fs
vi.mock('fs', () => ({
  default: {
    promises: {
      access: vi.fn(),
      readFile: vi.fn(),
    },
  },
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
  },
}));

// Hoist mock state for workspace context
const mockState = vi.hoisted(() => ({
  isInstalled: true,
  llkbEnabled: true,
  workspaceInfo: {
    detected: true,
    projectRoot: '/project',
    artkE2ePath: '/project/artk-e2e',
    llkbEnabled: true,
    llkbPath: '/project/.artk/llkb',
  } as any,
}));

// Mock vscode
vi.mock('vscode', () => ({
  EventEmitter: class {
    private listeners: Array<(e: unknown) => void> = [];
    event = (listener: (e: unknown) => void) => {
      this.listeners.push(listener);
      return { dispose: vi.fn() };
    };
    fire = vi.fn((data) => {
      this.listeners.forEach((l) => l(data));
    });
    dispose = vi.fn();
  },
  TreeItem: class {
    label?: string;
    collapsibleState?: number;
    iconPath?: unknown;
    contextValue?: string;
    command?: unknown;
    constructor(label: string | { label: string }, collapsibleState?: number) {
      this.label = typeof label === 'string' ? label : label.label;
      this.collapsibleState = collapsibleState;
    }
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  ThemeIcon: class {
    constructor(public id: string, public color?: unknown) {}
  },
  ThemeColor: class {
    constructor(public id: string) {}
  },
}));

// Mock workspace with dynamic getters using hoisted state
vi.mock('../workspace', () => ({
  getWorkspaceContextManager: () => ({
    get isInstalled() { return mockState.isInstalled; },
    get llkbEnabled() { return mockState.llkbEnabled; },
    get workspaceInfo() { return mockState.workspaceInfo; },
    onDidChangeWorkspace: () => ({ dispose: () => {} }),
    onDidChangeLLKB: () => ({ dispose: () => {} }),
  }),
}));

// Mock logger
vi.mock('../utils', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { LLKBTreeProvider } from './LLKBTreeProvider';

describe('LLKBTreeProvider', () => {
  let provider: LLKBTreeProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.isInstalled = true;
    mockState.llkbEnabled = true;
    mockState.workspaceInfo = {
      detected: true,
      projectRoot: '/project',
      artkE2ePath: '/project/artk-e2e',
      llkbEnabled: true,
      llkbPath: '/project/.artk/llkb',
    };
    provider = new LLKBTreeProvider();
  });

  describe('getTreeItem', () => {
    it('should return the element as-is', () => {
      const item = { label: 'test' } as any;
      expect(provider.getTreeItem(item)).toBe(item);
    });
  });

  describe('getChildren', () => {
    it('should return empty array when ARTK is not installed', () => {
      mockState.isInstalled = false;
      provider = new LLKBTreeProvider();

      const children = provider.getChildren();

      expect(children).toEqual([]);
    });

    it('should return empty array when LLKB is not enabled', () => {
      mockState.llkbEnabled = false;
      provider = new LLKBTreeProvider();

      const children = provider.getChildren();

      expect(children).toEqual([]);
    });

    it('should return children for elements with children', () => {
      const childItems = [{ label: 'child1' }, { label: 'child2' }];
      const item = { children: childItems } as any;

      const children = provider.getChildren(item);

      expect(children).toEqual(childItems);
    });
  });

  describe('Async Loading', () => {
    it('should show loading state while loading', () => {
      (provider as any).isLoading = true;

      const children = provider.getChildren() as any[];

      expect(children).toHaveLength(1);
      expect(children[0].label).toBe('Loading LLKB data...');
    });

    it('should show error state on load failure', () => {
      (provider as any).loadError = 'Failed to read LLKB files';
      (provider as any).isLoading = false;

      const children = provider.getChildren() as any[];

      expect(children).toHaveLength(1);
      expect(children[0].label).toContain('Error:');
    });
  });

  describe('LLKB Data Loading', () => {
    it('should load all LLKB files in parallel', async () => {
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockImplementation(async (path: string) => {
        if (path.includes('lessons.json')) {
          return JSON.stringify({
            lessons: [
              { id: 'L001', category: 'selectors', confidence: 0.9 },
              { id: 'L002', category: 'auth', confidence: 0.3 },
            ],
          });
        }
        if (path.includes('components.json')) {
          return JSON.stringify({
            components: [
              { id: 'C001', name: 'LoginForm', usageCount: 10 },
              { id: 'C002', name: 'DataGrid', usageCount: 5 },
            ],
          });
        }
        if (path.includes('analytics.json')) {
          return JSON.stringify({
            totalLearningEvents: 42,
            lastUpdated: '2024-01-15T10:00:00Z',
          });
        }
        return '{}';
      });

      await (provider as any).loadLLKBDataAsync();

      const data = (provider as any).llkbData;
      expect(data).toBeDefined();
      expect(data.lessons).toHaveLength(2);
      expect(data.components).toHaveLength(2);
      expect(data.analytics.totalLearningEvents).toBe(42);
    });

    it('should handle missing files gracefully', async () => {
      (fs.promises.access as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));

      await (provider as any).loadLLKBDataAsync();

      const data = (provider as any).llkbData;
      expect(data).toBeDefined();
      expect(data.lessons).toEqual([]);
      expect(data.components).toEqual([]);
    });

    it('should handle invalid JSON gracefully', async () => {
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('invalid json {{{');

      await (provider as any).loadLLKBDataAsync();

      // Should not throw, should use default values
      const data = (provider as any).llkbData;
      expect(data).toBeDefined();
    });
  });

  describe('Tree Building', () => {
    beforeEach(async () => {
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockImplementation(async (path: string) => {
        if (path.includes('lessons.json')) {
          return JSON.stringify({
            lessons: [
              { id: 'L001', category: 'selectors', confidence: 0.9 },
              { id: 'L002', category: 'auth', confidence: 0.3 },
              { id: 'L003', category: 'selectors', confidence: 0.95 },
            ],
          });
        }
        if (path.includes('components.json')) {
          return JSON.stringify({
            components: [
              { id: 'C001', name: 'LoginForm', usageCount: 10 },
              { id: 'C002', name: 'DataGrid', usageCount: 5 },
              { id: 'C003', name: 'Modal', usageCount: 15 },
            ],
          });
        }
        if (path.includes('analytics.json')) {
          return JSON.stringify({
            totalLearningEvents: 42,
            lastUpdated: '2024-01-15T10:00:00Z',
          });
        }
        return '{}';
      });

      await (provider as any).loadLLKBDataAsync();
    });

    it('should build overview section', () => {
      const tree = (provider as any).buildLLKBTree();

      const overview = tree.find((t: any) => t.label === 'Overview');
      expect(overview).toBeDefined();
      expect(overview.children).toBeDefined();

      const labels = overview.children.map((c: any) => c.label);
      expect(labels.some((l: string) => l.includes('Lessons: 3'))).toBe(true);
      expect(labels.some((l: string) => l.includes('Components: 3'))).toBe(true);
      expect(labels.some((l: string) => l.includes('Learning Events: 42'))).toBe(true);
    });

    it('should build lessons by category section', () => {
      const tree = (provider as any).buildLLKBTree();

      const lessonsByCategory = tree.find((t: any) => t.label === 'Lessons by Category');
      expect(lessonsByCategory).toBeDefined();

      const categories = lessonsByCategory.children.map((c: any) => c.label);
      expect(categories.some((c: string) => c.includes('selectors'))).toBe(true);
      expect(categories.some((c: string) => c.includes('auth'))).toBe(true);
    });

    it('should build top components section', () => {
      const tree = (provider as any).buildLLKBTree();

      const topComponents = tree.find((t: any) => t.label === 'Top Components');
      expect(topComponents).toBeDefined();

      // Should be sorted by usage count
      const componentLabels = topComponents.children.map((c: any) => c.label);
      expect(componentLabels[0]).toContain('Modal'); // 15 uses
      expect(componentLabels[1]).toContain('LoginForm'); // 10 uses
    });

    it('should build needs review section for low confidence lessons', () => {
      const tree = (provider as any).buildLLKBTree();

      const needsReview = tree.find((t: any) => t.label?.includes('Needs Review'));
      expect(needsReview).toBeDefined();

      // L002 has confidence 0.3 (below 0.5 threshold)
      const lowConfidenceLessons = needsReview.children.map((c: any) => c.label);
      expect(lowConfidenceLessons.some((l: string) => l.includes('L002'))).toBe(true);
    });

    it('should build actions section', () => {
      const tree = (provider as any).buildLLKBTree();

      const actions = tree.find((t: any) => t.label === 'Actions');
      expect(actions).toBeDefined();

      const actionLabels = actions.children.map((c: any) => c.label);
      expect(actionLabels).toContain('Health Check');
      expect(actionLabels).toContain('View Statistics');
      expect(actionLabels).toContain('Export for AutoGen');
    });
  });

  describe('Caching', () => {
    it('should use cached data within cache duration', async () => {
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({ lessons: [] })
      );

      // First load
      await (provider as any).loadLLKBDataAsync();
      const firstLoadTime = (provider as any).lastLoadTime;

      // Set valid cache time
      (provider as any).lastLoadTime = Date.now();
      (provider as any).llkbData = {
        lessons: [{ id: 'L001', category: 'test', confidence: 0.8 }],
        components: [],
        analytics: {},
      };

      // Get children should use cache
      const children = provider.getChildren() as any[];

      // Should not be loading state
      expect(children.some((c: any) => c.label === 'Loading LLKB data...')).toBe(false);
    });

    it('should invalidate cache on invalidateCache call', () => {
      (provider as any).lastLoadTime = Date.now();

      (provider as any).invalidateCache();

      expect((provider as any).lastLoadTime).toBe(0);
    });
  });

  describe('refresh', () => {
    it('should trigger async load', async () => {
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({ lessons: [] })
      );

      const loadSpy = vi.spyOn(provider as any, 'loadLLKBDataAsync');

      provider.refresh();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(loadSpy).toHaveBeenCalled();
    });
  });

  describe('Safe JSON Parsing', () => {
    it('should return default value for invalid JSON', () => {
      const result = (provider as any).safeJsonParse('invalid{', { default: true });
      expect(result).toEqual({ default: true });
    });

    it('should parse valid JSON', () => {
      const result = (provider as any).safeJsonParse('{"key": "value"}', {});
      expect(result).toEqual({ key: 'value' });
    });

    it('should not throw on malformed input', () => {
      expect(() => {
        (provider as any).safeJsonParse(undefined, {});
      }).not.toThrow();
    });
  });
});
