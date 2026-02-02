/**
 * Init Command Tests
 *
 * Tests for the ARTK initialization wizard with hoisted mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist all mock state to ensure it's available before mocks run
const mockState = vi.hoisted(() => ({
  // Workspace context
  isInstalled: false,
  refreshCalled: false,

  // VS Code workspace
  workspaceFolders: [
    { uri: { fsPath: '/project' }, name: 'project', index: 0 },
  ] as any[] | undefined,

  // QuickPick responses (consumed in order)
  quickPickResponses: [] as any[],

  // Message responses (queue - consumed in order)
  infoMessageResponses: ['Install'] as (string | undefined)[],
  warningMessageResponse: undefined as string | undefined,

  // Track calls for assertions
  calls: {
    showInformationMessage: [] as any[][],
    showWarningMessage: [] as any[][],
    showErrorMessage: [] as any[][],
    showQuickPick: [] as any[][],
    executeCommand: [] as any[][],
    check: [] as any[][],
    init: [] as any[][],
  },

  // Mock return values
  checkResult: { success: true } as { success: boolean; error?: string },
  initResult: { success: true } as { success: boolean; error?: string },
}));

// Mock CLI
vi.mock('../cli', () => ({
  init: (...args: any[]) => {
    mockState.calls.init.push(args);
    return Promise.resolve(mockState.initResult);
  },
  check: (...args: any[]) => {
    mockState.calls.check.push(args);
    return Promise.resolve(mockState.checkResult);
  },
}));

// Mock workspace
vi.mock('../workspace', () => ({
  getWorkspaceContextManager: () => ({
    get isInstalled() { return mockState.isInstalled; },
    refresh: () => { mockState.refreshCalled = true; },
  }),
}));

// Mock vscode
vi.mock('vscode', () => ({
  workspace: {
    get workspaceFolders() { return mockState.workspaceFolders; },
    openTextDocument: () => Promise.resolve({}),
  },
  window: {
    showInformationMessage: (...args: any[]) => {
      mockState.calls.showInformationMessage.push(args);
      return Promise.resolve(mockState.infoMessageResponses.shift());
    },
    showWarningMessage: (...args: any[]) => {
      mockState.calls.showWarningMessage.push(args);
      return Promise.resolve(mockState.warningMessageResponse);
    },
    showErrorMessage: (...args: any[]) => {
      mockState.calls.showErrorMessage.push(args);
      return Promise.resolve(undefined);
    },
    showQuickPick: (...args: any[]) => {
      mockState.calls.showQuickPick.push(args);
      return Promise.resolve(mockState.quickPickResponses.shift());
    },
    withProgress: async (_options: unknown, task: (progress: { report: () => void }) => Promise<unknown>) => {
      return task({ report: () => {} });
    },
  },
  commands: {
    executeCommand: (...args: any[]) => {
      mockState.calls.executeCommand.push(args);
      return Promise.resolve();
    },
  },
  ProgressLocation: {
    Notification: 15,
  },
  Uri: {
    file: (path: string) => ({ fsPath: path }),
  },
}));

import { runInitWizard } from './init';

describe('Init Command', () => {
  beforeEach(() => {
    // Reset all mock state
    mockState.isInstalled = false;
    mockState.refreshCalled = false;
    mockState.workspaceFolders = [
      { uri: { fsPath: '/project' }, name: 'project', index: 0 },
    ];
    mockState.quickPickResponses = [
      { value: 'auto' }, // Variant selection
      [{ id: 'npm' }, { id: 'llkb' }, { id: 'browsers' }, { id: 'prompts' }], // Options
    ];
    mockState.infoMessageResponses = ['Install']; // Default: confirm install
    mockState.warningMessageResponse = undefined;
    mockState.checkResult = { success: true };
    mockState.initResult = { success: true };

    // Clear call tracking
    mockState.calls = {
      showInformationMessage: [],
      showWarningMessage: [],
      showErrorMessage: [],
      showQuickPick: [],
      executeCommand: [],
      check: [],
      init: [],
    };
  });

  describe('No Workspace Open', () => {
    it('should prompt to open folder when no workspace is open', async () => {
      mockState.workspaceFolders = undefined;
      mockState.infoMessageResponses = ['Open Folder'];

      await runInitWizard();

      expect(mockState.calls.showInformationMessage.length).toBeGreaterThan(0);
      const [message] = mockState.calls.showInformationMessage[0];
      expect(message).toContain('No workspace folder open');
      expect(mockState.calls.executeCommand).toContainEqual(['vscode.openFolder']);
    });

    it('should not proceed when user cancels folder open', async () => {
      mockState.workspaceFolders = undefined;
      mockState.infoMessageResponses = ['Cancel'];

      await runInitWizard();

      expect(mockState.calls.check.length).toBe(0);
    });
  });

  describe('Single Workspace', () => {
    it('should proceed directly with single workspace folder', async () => {
      mockState.workspaceFolders = [
        { uri: { fsPath: '/my-project' }, name: 'my-project', index: 0 },
      ];

      await runInitWizard();

      // Should call check (prerequisites)
      expect(mockState.calls.check.length).toBe(1);
    });
  });

  describe('Multiple Workspaces', () => {
    it('should prompt for folder selection with multiple workspaces', async () => {
      mockState.workspaceFolders = [
        { uri: { fsPath: '/project1' }, name: 'project1', index: 0 },
        { uri: { fsPath: '/project2' }, name: 'project2', index: 1 },
      ];
      mockState.quickPickResponses = [
        { folder: { uri: { fsPath: '/project1' } } }, // Folder selection
        { value: 'auto' }, // Variant selection
        [{ id: 'npm' }], // Options
      ];

      await runInitWizard();

      // First QuickPick should be for folder selection
      expect(mockState.calls.showQuickPick.length).toBeGreaterThan(0);
      const [items] = mockState.calls.showQuickPick[0];
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'project1' }),
          expect.objectContaining({ label: 'project2' }),
        ])
      );
    });

    it('should exit when folder selection is cancelled', async () => {
      mockState.workspaceFolders = [
        { uri: { fsPath: '/project1' }, name: 'project1', index: 0 },
        { uri: { fsPath: '/project2' }, name: 'project2', index: 1 },
      ];
      mockState.quickPickResponses = [undefined]; // Cancelled

      await runInitWizard();

      expect(mockState.calls.check.length).toBe(0);
    });
  });

  describe('Reinstall Detection', () => {
    it('should prompt for reinstall when ARTK is already installed', async () => {
      mockState.isInstalled = true;
      mockState.warningMessageResponse = 'Reinstall';

      await runInitWizard();

      expect(mockState.calls.showWarningMessage.length).toBeGreaterThan(0);
      const [message] = mockState.calls.showWarningMessage[0];
      expect(message).toContain('already installed');
    });

    it('should exit when reinstall is cancelled', async () => {
      mockState.isInstalled = true;
      mockState.warningMessageResponse = 'Cancel';

      await runInitWizard();

      expect(mockState.calls.init.length).toBe(0);
    });

    it('should pass force flag when reinstalling', async () => {
      mockState.isInstalled = true;
      mockState.warningMessageResponse = 'Reinstall';

      await runInitWizard();

      expect(mockState.calls.init.length).toBe(1);
      expect(mockState.calls.init[0][0]).toMatchObject({ force: true });
    });
  });

  describe('Prerequisites Check', () => {
    it('should check prerequisites before proceeding', async () => {
      await runInitWizard();

      expect(mockState.calls.check.length).toBe(1);
    });

    it('should show error when prerequisites check fails', async () => {
      mockState.checkResult = { success: false, error: 'Node.js not found' };

      await runInitWizard();

      expect(mockState.calls.showErrorMessage.length).toBeGreaterThan(0);
      const [message] = mockState.calls.showErrorMessage[0];
      expect(message).toContain('Node.js not found');
      expect(mockState.calls.init.length).toBe(0);
    });
  });

  describe('Variant Selection', () => {
    it('should offer variant options', async () => {
      await runInitWizard();

      // Find the QuickPick call for variant selection
      const variantCall = mockState.calls.showQuickPick.find(call => {
        const items = call[0] as any[];
        return items.some((item: any) => item.value === 'modern-esm');
      });

      expect(variantCall).toBeDefined();
    });

    it('should exit when variant selection is cancelled', async () => {
      mockState.quickPickResponses = [undefined]; // Cancelled

      await runInitWizard();

      expect(mockState.calls.init.length).toBe(0);
    });
  });

  describe('Installation', () => {
    it('should call init with correct options', async () => {
      await runInitWizard();

      expect(mockState.calls.init.length).toBe(1);
      expect(mockState.calls.init[0][0]).toMatchObject({
        targetPath: '/project',
        variant: 'auto',
      });
    });

    it('should refresh context manager after successful install', async () => {
      await runInitWizard();

      expect(mockState.refreshCalled).toBe(true);
    });

    it('should show success message after installation', async () => {
      await runInitWizard();

      const successCall = mockState.calls.showInformationMessage.find(call =>
        call[0]?.includes('successfully')
      );
      expect(successCall).toBeDefined();
    });

    it('should show error message on installation failure', async () => {
      mockState.initResult = { success: false, error: 'Installation failed' };

      await runInitWizard();

      expect(mockState.calls.showErrorMessage.length).toBeGreaterThan(0);
    });
  });

  describe('Post-Installation Actions', () => {
    it('should handle post-install action selection', async () => {
      // First response: Install confirmation, Second: Open Dashboard
      mockState.infoMessageResponses = ['Install', 'Open Dashboard'];

      await runInitWizard();

      const dashboardCall = mockState.calls.executeCommand.find(call =>
        call[0] === 'artk.openDashboard'
      );
      expect(dashboardCall).toBeDefined();
    });
  });
});
