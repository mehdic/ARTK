/**
 * Status Tree Provider Tests
 *
 * Tests for the status tree view provider.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock state so it's available when vi.mock factory runs
const mockState = vi.hoisted(() => ({
  isInstalled: true,
  workspaceInfo: {
    detected: true,
    projectRoot: '/project',
    artkE2ePath: '/project/artk-e2e',
    llkbEnabled: true,
  } as any,
  artkContext: {
    variant: 'modern-esm',
    artkVersion: '1.0.0',
    nodeVersion: '20.0.0',
    playwrightVersion: '1.57.0',
    installedAt: '2024-01-01',
  } as any,
  artkConfig: {
    app: { name: 'Test App', baseUrl: 'http://localhost:3000' },
    environments: { local: {}, staging: {} },
    auth: { provider: 'oidc' },
    browsers: { channel: 'chromium' },
  } as any,
}));

// Mock vscode
vi.mock('vscode', () => ({
  EventEmitter: class {
    event = vi.fn();
    fire = vi.fn();
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

// Mock workspace context with dynamic values using hoisted state
vi.mock('../workspace', () => ({
  getWorkspaceContextManager: () => ({
    get isInstalled() { return mockState.isInstalled; },
    get workspaceInfo() { return mockState.workspaceInfo; },
    get artkContext() { return mockState.artkContext; },
    get artkConfig() { return mockState.artkConfig; },
    onDidChangeWorkspace: () => ({ dispose: () => {} }),
    onDidChangeConfig: () => ({ dispose: () => {} }),
    onDidChangeJourneys: () => ({ dispose: () => {} }),
    onDidChangeLLKB: () => ({ dispose: () => {} }),
  }),
}));

import { StatusTreeProvider } from './StatusTreeProvider';

describe('StatusTreeProvider', () => {
  let provider: StatusTreeProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock state
    mockState.isInstalled = true;
    mockState.workspaceInfo = {
      detected: true,
      projectRoot: '/project',
      artkE2ePath: '/project/artk-e2e',
      llkbEnabled: true,
    };
    mockState.artkContext = {
      variant: 'modern-esm',
      artkVersion: '1.0.0',
      nodeVersion: '20.0.0',
      playwrightVersion: '1.57.0',
      installedAt: '2024-01-01',
    };
    mockState.artkConfig = {
      app: { name: 'Test App', baseUrl: 'http://localhost:3000' },
      environments: { local: {}, staging: {} },
      auth: { provider: 'oidc' },
      browsers: { channel: 'chromium' },
    };

    provider = new StatusTreeProvider();
  });

  describe('getTreeItem', () => {
    it('should return the element as-is', () => {
      const item = { label: 'test' } as any;
      expect(provider.getTreeItem(item)).toBe(item);
    });
  });

  describe('getChildren', () => {
    it('should show not installed message when ARTK is not installed', () => {
      mockState.isInstalled = false;
      provider = new StatusTreeProvider();

      const children = provider.getChildren();

      expect(children).toHaveLength(1);
      expect(children[0].label).toBe('ARTK Not Installed');
      expect((children[0] as any).command?.command).toBe('artk.init');
    });

    it('should return empty array for element children without children', () => {
      const item = { children: undefined } as any;
      const children = provider.getChildren(item);

      expect(children).toEqual([]);
    });

    it('should return children for elements with children', () => {
      const childItems = [{ label: 'child1' }, { label: 'child2' }];
      const item = { children: childItems } as any;

      const children = provider.getChildren(item);

      expect(children).toEqual(childItems);
    });

    it('should build status tree when ARTK is installed', () => {
      const children = provider.getChildren();

      // Should have Installation, Configuration, LLKB, Quick Actions sections
      expect(children.length).toBeGreaterThanOrEqual(3);

      const labels = children.map((c) => c.label);
      expect(labels).toContain('Installation');
      expect(labels).toContain('Configuration');
    });
  });

  describe('Installation Section', () => {
    it('should show version info when context is available', () => {
      const children = provider.getChildren();
      const installation = children.find((c) => c.label === 'Installation');

      expect(installation).toBeDefined();
      expect((installation as any)?.children).toBeDefined();

      const childLabels = (installation as any)?.children?.map((c: any) => c.label);
      expect(childLabels).toContain('Version: 1.0.0');
      expect(childLabels).toContain('Variant: modern-esm');
      expect(childLabels).toContain('Node.js: 20.0.0');
      expect(childLabels).toContain('Playwright: 1.57.0');
    });

    it('should show warning when context is not available', () => {
      mockState.artkContext = undefined;
      provider = new StatusTreeProvider();

      const children = provider.getChildren();
      const installation = children.find((c) => c.label === 'Installation');

      expect((installation as any)?.children?.[0]?.label).toBe('Context not found');
    });
  });

  describe('Configuration Section', () => {
    it('should show config info when available', () => {
      const children = provider.getChildren();
      const configuration = children.find((c) => c.label === 'Configuration');

      expect(configuration).toBeDefined();
      expect((configuration as any)?.children).toBeDefined();

      const childLabels = (configuration as any)?.children?.map((c: any) => c.label);
      expect(childLabels).toContain('App: Test App');
      expect(childLabels).toContain('Environments: 2');
      expect(childLabels).toContain('Auth: oidc');
      expect(childLabels).toContain('Browser: chromium');
    });

    it('should not show configuration section when config is undefined', () => {
      mockState.artkConfig = undefined;
      provider = new StatusTreeProvider();

      const children = provider.getChildren();
      const configuration = children.find((c) => c.label === 'Configuration');

      expect(configuration).toBeUndefined();
    });
  });

  describe('LLKB Section', () => {
    it('should show LLKB enabled when llkbEnabled is true', () => {
      const children = provider.getChildren();
      const llkb = children.find((c) => c.label === 'LLKB: Enabled');

      expect(llkb).toBeDefined();
      expect((llkb as any)?.command?.command).toBe('artk.llkb.stats');
    });

    it('should show LLKB not enabled when llkbEnabled is false', () => {
      mockState.workspaceInfo.llkbEnabled = false;
      provider = new StatusTreeProvider();

      const children = provider.getChildren();
      const llkb = children.find((c) => c.label === 'LLKB: Not Enabled');

      expect(llkb).toBeDefined();
    });
  });

  describe('Quick Actions Section', () => {
    it('should show all quick actions', () => {
      const children = provider.getChildren();
      const actions = children.find((c) => c.label === 'Quick Actions');

      expect(actions).toBeDefined();
      expect((actions as any)?.children).toBeDefined();

      const actionCommands = (actions as any)?.children?.map((c: any) => c.command?.command);
      expect(actionCommands).toContain('artk.doctor');
      expect(actionCommands).toContain('artk.openConfig');
      expect(actionCommands).toContain('artk.check');
      expect(actionCommands).toContain('artk.upgrade');
    });
  });

  describe('refresh', () => {
    it('should fire tree data change event', () => {
      // Access the private event emitter via the provider
      const fireSpy = vi.fn();
      (provider as any)._onDidChangeTreeData = { fire: fireSpy };

      provider.refresh();

      expect(fireSpy).toHaveBeenCalledWith(undefined);
    });
  });
});
