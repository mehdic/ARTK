/**
 * Workspace Detector Tests
 *
 * Tests for ARTK workspace detection functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs
vi.mock('fs', () => ({
  default: {
    accessSync: vi.fn(),
    readFileSync: vi.fn(),
    promises: {
      access: vi.fn(),
      readFile: vi.fn(),
    },
  },
  accessSync: vi.fn(),
  readFileSync: vi.fn(),
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
  },
}));

// Mock yaml - use a simple YAML parser that handles JSON-like structures
vi.mock('yaml', () => {
  const parseYaml = (content: string) => {
    // For test simplicity, just return JSON.parse since test data is JSON-like
    try {
      return JSON.parse(content);
    } catch {
      // Simple YAML key-value parsing fallback
      const lines = content.split('\n');
      const result: Record<string, unknown> = {};
      for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          result[match[1]] = match[2].trim();
        }
      }
      return result;
    }
  };
  return {
    default: { parse: parseYaml },
    parse: parseYaml,
  };
});

// Mock vscode
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [],
  },
  Uri: {
    file: (path: string) => ({ fsPath: path }),
  },
}));

import {
  readContextAsync,
  readContext,
  readConfigAsync,
  readConfig,
  detectArtkWorkspaceAsync,
  detectArtkWorkspace,
  detectAllArtkWorkspacesAsync,
  detectAllArtkWorkspaces,
  getPrimaryArtkWorkspaceAsync,
  getPrimaryArtkWorkspace,
  hasArtkInstallationAsync,
  hasArtkInstallation,
} from './detector';
import * as vscode from 'vscode';
import type { ArtkContext, ArtkConfig } from '../types';

describe('Workspace Detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readContextAsync', () => {
    it('should read and parse valid context.json', async () => {
      const mockContext: ArtkContext = {
        variant: 'modern-esm',
        artkVersion: '1.0.0',
        installedAt: '2024-01-01T00:00:00Z',
      };
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(mockContext));

      const result = await readContextAsync('/project/.artk/context.json');

      expect(result).toEqual(mockContext);
      expect(fs.promises.readFile).toHaveBeenCalledWith('/project/.artk/context.json', 'utf-8');
    });

    it('should return undefined for non-existent file', async () => {
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));

      const result = await readContextAsync('/nonexistent/context.json');

      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid JSON', async () => {
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('invalid json {');

      const result = await readContextAsync('/project/.artk/context.json');

      expect(result).toBeUndefined();
    });
  });

  describe('readContext (sync)', () => {
    it('should read and parse valid context.json', () => {
      const mockContext: ArtkContext = {
        variant: 'modern-cjs',
        artkVersion: '1.0.0',
        installedAt: '2024-01-01T00:00:00Z',
      };
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(mockContext));

      const result = readContext('/project/.artk/context.json');

      expect(result).toEqual(mockContext);
    });

    it('should return undefined for errors', () => {
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const result = readContext('/nonexistent/context.json');

      expect(result).toBeUndefined();
    });
  });

  describe('readConfigAsync', () => {
    it('should read and parse valid config YAML', async () => {
      const mockConfig = {
        app: { name: 'Test App', baseUrl: 'http://localhost:3000' },
      };
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(mockConfig));

      const result = await readConfigAsync('/project/artk-e2e/artk.config.yml');

      expect(result).toEqual(mockConfig);
    });

    it('should return undefined for non-existent file', async () => {
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));

      const result = await readConfigAsync('/nonexistent/config.yml');

      expect(result).toBeUndefined();
    });
  });

  describe('readConfig (sync)', () => {
    it('should read and parse valid config', () => {
      const mockConfig = {
        app: { name: 'Test App' },
      };
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(mockConfig));

      const result = readConfig('/project/artk-e2e/artk.config.yml');

      expect(result).toEqual(mockConfig);
    });
  });

  describe('detectArtkWorkspaceAsync', () => {
    it('should detect ARTK installation with all files present', async () => {
      const mockWorkspaceFolder = {
        uri: { fsPath: '/project' },
        name: 'project',
        index: 0,
      } as vscode.WorkspaceFolder;

      // All paths exist
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (fs.promises.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          variant: 'modern-esm',
          artkVersion: '1.0.0',
        })
      );

      const result = await detectArtkWorkspaceAsync(mockWorkspaceFolder);

      expect(result.detected).toBe(true);
      expect(result.projectRoot).toBe('/project');
      expect(result.artkE2ePath).toBe(path.join('/project', 'artk-e2e'));
      expect(result.variant).toBe('modern-esm');
      expect(result.llkbEnabled).toBe(true);
    });

    it('should return not detected when artk-e2e missing', async () => {
      const mockWorkspaceFolder = {
        uri: { fsPath: '/project' },
        name: 'project',
        index: 0,
      } as vscode.WorkspaceFolder;

      // artk-e2e doesn't exist
      (fs.promises.access as ReturnType<typeof vi.fn>).mockImplementation(async (p: string) => {
        if (p.includes('artk-e2e')) {
          throw new Error('ENOENT');
        }
      });

      const result = await detectArtkWorkspaceAsync(mockWorkspaceFolder);

      expect(result.detected).toBe(false);
      expect(result.projectRoot).toBe('/project');
      expect(result.artkE2ePath).toBeUndefined();
    });

    it('should detect LLKB disabled when llkb directory missing', async () => {
      const mockWorkspaceFolder = {
        uri: { fsPath: '/project' },
        name: 'project',
        index: 0,
      } as vscode.WorkspaceFolder;

      // artk-e2e exists but not llkb
      (fs.promises.access as ReturnType<typeof vi.fn>).mockImplementation(async (p: string) => {
        if (p.includes('llkb')) {
          throw new Error('ENOENT');
        }
      });

      const result = await detectArtkWorkspaceAsync(mockWorkspaceFolder);

      expect(result.detected).toBe(true);
      expect(result.llkbEnabled).toBe(false);
      expect(result.llkbPath).toBeUndefined();
    });

    it('should handle missing context.json gracefully', async () => {
      const mockWorkspaceFolder = {
        uri: { fsPath: '/project' },
        name: 'project',
        index: 0,
      } as vscode.WorkspaceFolder;

      (fs.promises.access as ReturnType<typeof vi.fn>).mockImplementation(async (p: string) => {
        if (p.includes('context.json')) {
          throw new Error('ENOENT');
        }
      });

      const result = await detectArtkWorkspaceAsync(mockWorkspaceFolder);

      expect(result.detected).toBe(true);
      expect(result.contextPath).toBeUndefined();
      expect(result.variant).toBeUndefined();
    });
  });

  describe('detectArtkWorkspace (sync)', () => {
    it('should detect ARTK installation', () => {
      const mockWorkspaceFolder = {
        uri: { fsPath: '/project' },
        name: 'project',
        index: 0,
      } as vscode.WorkspaceFolder;

      (fs.accessSync as ReturnType<typeof vi.fn>).mockImplementation(() => undefined);
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify({
          variant: 'modern-cjs',
          artkVersion: '1.0.0',
        })
      );

      const result = detectArtkWorkspace(mockWorkspaceFolder);

      expect(result.detected).toBe(true);
      expect(result.variant).toBe('modern-cjs');
    });

    it('should return not detected when artk-e2e missing', () => {
      const mockWorkspaceFolder = {
        uri: { fsPath: '/project' },
        name: 'project',
        index: 0,
      } as vscode.WorkspaceFolder;

      (fs.accessSync as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('artk-e2e')) {
          throw new Error('ENOENT');
        }
      });

      const result = detectArtkWorkspace(mockWorkspaceFolder);

      expect(result.detected).toBe(false);
    });
  });

  describe('detectAllArtkWorkspacesAsync', () => {
    it('should detect ARTK in multiple workspaces', async () => {
      const mockFolders = [
        { uri: { fsPath: '/project1' }, name: 'project1', index: 0 },
        { uri: { fsPath: '/project2' }, name: 'project2', index: 1 },
      ] as vscode.WorkspaceFolder[];

      (vscode.workspace as any).workspaceFolders = mockFolders;

      // project1 has ARTK, project2 doesn't
      (fs.promises.access as ReturnType<typeof vi.fn>).mockImplementation(async (p: string) => {
        if (p.includes('project2') && p.includes('artk-e2e')) {
          throw new Error('ENOENT');
        }
      });

      const results = await detectAllArtkWorkspacesAsync();

      expect(results.size).toBe(2);
      expect(results.get('/project1')?.detected).toBe(true);
      expect(results.get('/project2')?.detected).toBe(false);
    });

    it('should return empty map when no workspace folders', async () => {
      (vscode.workspace as any).workspaceFolders = undefined;

      const results = await detectAllArtkWorkspacesAsync();

      expect(results.size).toBe(0);
    });
  });

  describe('detectAllArtkWorkspaces (sync)', () => {
    it('should detect ARTK in all workspace folders', () => {
      const mockFolders = [
        { uri: { fsPath: '/project1' }, name: 'project1', index: 0 },
      ] as vscode.WorkspaceFolder[];

      (vscode.workspace as any).workspaceFolders = mockFolders;
      (fs.accessSync as ReturnType<typeof vi.fn>).mockImplementation(() => undefined);
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue('{}');

      const results = detectAllArtkWorkspaces();

      expect(results.size).toBe(1);
      expect(results.get('/project1')?.detected).toBe(true);
    });
  });

  describe('getPrimaryArtkWorkspaceAsync', () => {
    it('should return first detected ARTK workspace', async () => {
      const mockFolders = [
        { uri: { fsPath: '/no-artk' }, name: 'no-artk', index: 0 },
        { uri: { fsPath: '/has-artk' }, name: 'has-artk', index: 1 },
      ] as vscode.WorkspaceFolder[];

      (vscode.workspace as any).workspaceFolders = mockFolders;

      (fs.promises.access as ReturnType<typeof vi.fn>).mockImplementation(async (p: string) => {
        if (p.includes('no-artk') && p.includes('artk-e2e')) {
          throw new Error('ENOENT');
        }
      });

      const result = await getPrimaryArtkWorkspaceAsync();

      expect(result).toBeDefined();
      expect(result?.projectRoot).toBe('/has-artk');
    });

    it('should return undefined when no ARTK installations', async () => {
      const mockFolders = [
        { uri: { fsPath: '/project' }, name: 'project', index: 0 },
      ] as vscode.WorkspaceFolder[];

      (vscode.workspace as any).workspaceFolders = mockFolders;
      (fs.promises.access as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));

      const result = await getPrimaryArtkWorkspaceAsync();

      expect(result).toBeUndefined();
    });
  });

  describe('getPrimaryArtkWorkspace (sync)', () => {
    it('should return first detected workspace', () => {
      const mockFolders = [
        { uri: { fsPath: '/project' }, name: 'project', index: 0 },
      ] as vscode.WorkspaceFolder[];

      (vscode.workspace as any).workspaceFolders = mockFolders;
      (fs.accessSync as ReturnType<typeof vi.fn>).mockImplementation(() => undefined);
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue('{}');

      const result = getPrimaryArtkWorkspace();

      expect(result).toBeDefined();
      expect(result?.detected).toBe(true);
    });
  });

  describe('hasArtkInstallationAsync', () => {
    it('should return true when ARTK is installed', async () => {
      const mockFolders = [
        { uri: { fsPath: '/project' }, name: 'project', index: 0 },
      ] as vscode.WorkspaceFolder[];

      (vscode.workspace as any).workspaceFolders = mockFolders;
      (fs.promises.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await hasArtkInstallationAsync();

      expect(result).toBe(true);
    });

    it('should return false when ARTK is not installed', async () => {
      const mockFolders = [
        { uri: { fsPath: '/project' }, name: 'project', index: 0 },
      ] as vscode.WorkspaceFolder[];

      (vscode.workspace as any).workspaceFolders = mockFolders;
      (fs.promises.access as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));

      const result = await hasArtkInstallationAsync();

      expect(result).toBe(false);
    });
  });

  describe('hasArtkInstallation (sync)', () => {
    it('should return true when ARTK is installed', () => {
      const mockFolders = [
        { uri: { fsPath: '/project' }, name: 'project', index: 0 },
      ] as vscode.WorkspaceFolder[];

      (vscode.workspace as any).workspaceFolders = mockFolders;
      (fs.accessSync as ReturnType<typeof vi.fn>).mockImplementation(() => undefined);
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue('{}');

      expect(hasArtkInstallation()).toBe(true);
    });

    it('should return false when ARTK is not installed', () => {
      const mockFolders = [
        { uri: { fsPath: '/project' }, name: 'project', index: 0 },
      ] as vscode.WorkspaceFolder[];

      (vscode.workspace as any).workspaceFolders = mockFolders;
      (fs.accessSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('ENOENT');
      });

      expect(hasArtkInstallation()).toBe(false);
    });
  });
});
