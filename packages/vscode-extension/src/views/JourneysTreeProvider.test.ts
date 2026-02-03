/**
 * Journeys Tree Provider Tests
 *
 * Tests for the journeys tree view provider with async I/O.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';

// Hoist mock state so it's available when vi.mock factory runs
const mockState = vi.hoisted(() => ({
  isInstalled: true,
  workspaceInfo: {
    detected: true,
    projectRoot: '/project',
    artkE2ePath: '/project/artk-e2e',
    llkbEnabled: true,
  } as any,
}));

// Mock fs
vi.mock('fs', () => ({
  default: {
    promises: {
      access: vi.fn(),
      readFile: vi.fn(),
      readdir: vi.fn(),
    },
  },
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
  },
}));

// Mock yaml - use plain functions without vi.fn() to avoid hoisting issues
vi.mock('yaml', () => {
  const parseYaml = (content: string) => {
    // Parse simple YAML key-value pairs
    const lines = content.split('\n');
    const result: Record<string, unknown> = {};
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        result[match[1]] = match[2].trim();
      }
    }
    return result;
  };
  return {
    default: { parse: parseYaml },
    parse: parseYaml,
  };
});

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
    description?: string;
    tooltip?: string;
    resourceUri?: unknown;
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
  Uri: {
    file: (path: string) => ({ fsPath: path, toString: () => path }),
  },
}));

// Mock workspace context with dynamic values using hoisted state
vi.mock('../workspace', () => ({
  getWorkspaceContextManager: () => ({
    get isInstalled() { return mockState.isInstalled; },
    get workspaceInfo() { return mockState.workspaceInfo; },
    onDidChangeWorkspace: () => ({ dispose: () => {} }),
    onDidChangeJourneys: () => ({ dispose: () => {} }),
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

import { JourneysTreeProvider } from './JourneysTreeProvider';

describe('JourneysTreeProvider', () => {
  let provider: JourneysTreeProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.isInstalled = true;
    mockState.workspaceInfo = {
      detected: true,
      projectRoot: '/project',
      artkE2ePath: '/project/artk-e2e',
      llkbEnabled: true,
    };
    provider = new JourneysTreeProvider();
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
      provider = new JourneysTreeProvider();

      const children = provider.getChildren();

      expect(children).toEqual([]);
    });

    it('should return children for elements with children', () => {
      const childItems = [{ label: 'child1' }, { label: 'child2' }];
      const item = { children: childItems } as any;

      const children = provider.getChildren(item);

      expect(children).toEqual(childItems);
    });

    it('should return empty array for elements without children', () => {
      const item = { children: undefined } as any;

      const children = provider.getChildren(item);

      expect(children).toEqual([]);
    });
  });

  describe('setGroupBy', () => {
    it('should update groupBy and fire change event', () => {
      const fireSpy = vi.fn();
      (provider as any)._onDidChangeTreeData = { fire: fireSpy };

      provider.setGroupBy('tier');

      expect((provider as any).groupBy).toBe('tier');
      expect(fireSpy).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Async Loading', () => {
    it('should show loading state while loading', async () => {
      // Setup mock to delay
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      // Set isLoading to true
      (provider as any).isLoading = true;

      const children = provider.getChildren() as any[];

      expect(children).toHaveLength(1);
      expect(children[0].label).toBe('Loading journeys...');
    });

    it('should show error state on load failure', () => {
      (provider as any).loadError = 'Failed to read directory';
      (provider as any).isLoading = false;

      const children = provider.getChildren() as any[];

      expect(children).toHaveLength(1);
      expect(children[0].label).toContain('Error:');
    });
  });

  describe('Recursion Limits', () => {
    it('should respect MAX_RECURSION_DEPTH', async () => {
      // This tests that the recursion depth limit is enforced
      const MAX_RECURSION_DEPTH = 10;

      // Create nested directory structure
      const mockEntry = (name: string, isDir: boolean) => ({
        name,
        isDirectory: () => isDir,
        isFile: () => !isDir,
      });

      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      let callCount = 0;

      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callCount++;
        // Return a nested directory to trigger recursion
        if (callCount < 15) {
          return [mockEntry('subdir', true)];
        }
        return [];
      });

      // Trigger load
      await (provider as any).loadJourneysAsync();

      // Should have stopped at depth limit
      expect(callCount).toBeLessThanOrEqual(MAX_RECURSION_DEPTH + 1);
    });

    it('should respect MAX_FILES_TO_SCAN', async () => {
      const mockEntry = (name: string) => ({
        name,
        isDirectory: () => false,
        isFile: () => true,
      });

      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Return many markdown files
      const manyFiles = Array.from({ length: 2000 }, (_, i) => mockEntry(`journey-${i}.md`));

      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockResolvedValue(manyFiles);
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(`---
id: test-journey
status: defined
tier: regression
---`);

      // Trigger load
      await (provider as any).loadJourneysAsync();

      // Verify file count was limited (should be < 2000)
      const journeys = (provider as any).journeys;
      expect(journeys.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Journey Parsing', () => {
    it('should parse journey frontmatter correctly', async () => {
      const mockEntry = {
        name: 'test-journey.md',
        isDirectory: () => false,
        isFile: () => true,
      };

      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([mockEntry]);
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(`---
id: JRN-001
title: Test Journey
status: implemented
tier: smoke
owner: test-team
---
# Test Journey`);

      await (provider as any).loadJourneysAsync();

      const journeys = (provider as any).journeys;
      expect(journeys).toHaveLength(1);
      expect(journeys[0].id).toBe('JRN-001');
      expect(journeys[0].status).toBe('implemented');
      expect(journeys[0].tier).toBe('smoke');
    });

    it('should skip files without valid frontmatter', async () => {
      const mockEntry = {
        name: 'invalid.md',
        isDirectory: () => false,
        isFile: () => true,
      };

      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([mockEntry]);
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(`# No frontmatter
Just content`);

      await (provider as any).loadJourneysAsync();

      const journeys = (provider as any).journeys;
      expect(journeys).toHaveLength(0);
    });

    it('should skip hidden directories', async () => {
      const mockEntries = [
        { name: '.git', isDirectory: () => true, isFile: () => false },
        { name: 'node_modules', isDirectory: () => true, isFile: () => false },
        { name: 'valid', isDirectory: () => true, isFile: () => false },
      ];

      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      let readdirCallCount = 0;
      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        readdirCallCount++;
        if (readdirCallCount === 1) {
          return mockEntries;
        }
        return [];
      });

      await (provider as any).loadJourneysAsync();

      // Should only recurse into 'valid', not .git or node_modules
      expect(readdirCallCount).toBe(2); // Initial + valid subdirectory
    });
  });

  describe('refresh', () => {
    it('should trigger async load', async () => {
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const loadSpy = vi.spyOn(provider as any, 'loadJourneysAsync');

      provider.refresh();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(loadSpy).toHaveBeenCalled();
    });
  });
});
