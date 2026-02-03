/**
 * Workspace Detection - Detect ARTK installations in the workspace
 *
 * Uses async I/O to avoid blocking the extension host thread.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { ArtkWorkspaceInfo, ArtkContext, ArtkConfig } from '../types';
import * as YAML from 'yaml';

const fsPromises = fs.promises;

/**
 * Check if a path exists (async)
 */
async function pathExists(p: string): Promise<boolean> {
  try {
    await fsPromises.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path exists (sync) - only for use in synchronous contexts
 * Prefer async version when possible
 */
function pathExistsSync(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and parse context.json (async)
 */
export async function readContextAsync(contextPath: string): Promise<ArtkContext | undefined> {
  try {
    const content = await fsPromises.readFile(contextPath, 'utf-8');
    return JSON.parse(content) as ArtkContext;
  } catch {
    return undefined;
  }
}

/**
 * Read and parse context.json (sync) - kept for backward compatibility
 * Prefer readContextAsync when possible
 */
export function readContext(contextPath: string): ArtkContext | undefined {
  try {
    const content = fs.readFileSync(contextPath, 'utf-8');
    return JSON.parse(content) as ArtkContext;
  } catch {
    return undefined;
  }
}

/**
 * Read and parse artk.config.yml (async)
 */
export async function readConfigAsync(configPath: string): Promise<ArtkConfig | undefined> {
  try {
    const content = await fsPromises.readFile(configPath, 'utf-8');
    return YAML.parse(content) as ArtkConfig;
  } catch {
    return undefined;
  }
}

/**
 * Read and parse artk.config.yml (sync) - kept for backward compatibility
 * Prefer readConfigAsync when possible
 */
export function readConfig(configPath: string): ArtkConfig | undefined {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return YAML.parse(content) as ArtkConfig;
  } catch {
    return undefined;
  }
}

/**
 * Detect ARTK installation in a workspace folder (async)
 */
export async function detectArtkWorkspaceAsync(
  workspaceFolder: vscode.WorkspaceFolder
): Promise<ArtkWorkspaceInfo> {
  const root = workspaceFolder.uri.fsPath;

  // Check for artk-e2e directory (primary indicator)
  const artkE2ePath = path.join(root, 'artk-e2e');
  const contextPath = path.join(root, '.artk', 'context.json');
  const configPath = path.join(artkE2ePath, 'artk.config.yml');
  const llkbPath = path.join(root, '.artk', 'llkb');

  // Check paths in parallel for better performance
  const [artkE2eExists, contextExists, configExists, llkbExists, llkbConfigExists] = await Promise.all([
    pathExists(artkE2ePath),
    pathExists(contextPath),
    pathExists(configPath),
    pathExists(llkbPath),
    pathExists(path.join(llkbPath, 'config.yml')),
  ]);

  if (!artkE2eExists) {
    return { detected: false, projectRoot: root };
  }

  // Read context.json for metadata
  const context = contextExists ? await readContextAsync(contextPath) : undefined;

  // Check if LLKB is enabled
  const llkbEnabled = llkbExists && llkbConfigExists;

  return {
    detected: true,
    projectRoot: root,
    artkE2ePath,
    contextPath: contextExists ? contextPath : undefined,
    configPath: configExists ? configPath : undefined,
    variant: context?.variant,
    version: context?.artkVersion,
    llkbEnabled,
    llkbPath: llkbEnabled ? llkbPath : undefined,
  };
}

/**
 * Detect ARTK installation in a workspace folder (sync)
 * Kept for backward compatibility - prefer detectArtkWorkspaceAsync
 */
export function detectArtkWorkspace(
  workspaceFolder: vscode.WorkspaceFolder
): ArtkWorkspaceInfo {
  const root = workspaceFolder.uri.fsPath;

  // Check for artk-e2e directory (primary indicator)
  const artkE2ePath = path.join(root, 'artk-e2e');
  const contextPath = path.join(root, '.artk', 'context.json');
  const configPath = path.join(artkE2ePath, 'artk.config.yml');
  const llkbPath = path.join(root, '.artk', 'llkb');

  if (!pathExistsSync(artkE2ePath)) {
    return { detected: false, projectRoot: root };
  }

  // Read context.json for metadata
  const context = pathExistsSync(contextPath) ? readContext(contextPath) : undefined;

  // Check if LLKB is enabled
  const llkbEnabled = pathExistsSync(llkbPath) && pathExistsSync(path.join(llkbPath, 'config.yml'));

  return {
    detected: true,
    projectRoot: root,
    artkE2ePath,
    contextPath: pathExistsSync(contextPath) ? contextPath : undefined,
    configPath: pathExistsSync(configPath) ? configPath : undefined,
    variant: context?.variant,
    version: context?.artkVersion,
    llkbEnabled,
    llkbPath: llkbEnabled ? llkbPath : undefined,
  };
}

/**
 * Detect ARTK in all workspace folders (async)
 */
export async function detectAllArtkWorkspacesAsync(): Promise<Map<string, ArtkWorkspaceInfo>> {
  const results = new Map<string, ArtkWorkspaceInfo>();
  const folders = vscode.workspace.workspaceFolders;

  if (!folders) {
    return results;
  }

  // Detect all workspaces in parallel
  const detections = await Promise.all(
    folders.map(async (folder) => ({
      path: folder.uri.fsPath,
      info: await detectArtkWorkspaceAsync(folder),
    }))
  );

  for (const { path: folderPath, info } of detections) {
    results.set(folderPath, info);
  }

  return results;
}

/**
 * Detect ARTK in all workspace folders (sync)
 * Kept for backward compatibility - prefer detectAllArtkWorkspacesAsync
 */
export function detectAllArtkWorkspaces(): Map<string, ArtkWorkspaceInfo> {
  const results = new Map<string, ArtkWorkspaceInfo>();
  const folders = vscode.workspace.workspaceFolders;

  if (!folders) {
    return results;
  }

  for (const folder of folders) {
    results.set(folder.uri.fsPath, detectArtkWorkspace(folder));
  }

  return results;
}

/**
 * Get the primary ARTK workspace (first detected) - async
 */
export async function getPrimaryArtkWorkspaceAsync(): Promise<ArtkWorkspaceInfo | undefined> {
  const workspaces = await detectAllArtkWorkspacesAsync();

  for (const [, info] of workspaces) {
    if (info.detected) {
      return info;
    }
  }

  return undefined;
}

/**
 * Get the primary ARTK workspace (first detected) - sync
 * Kept for backward compatibility - prefer getPrimaryArtkWorkspaceAsync
 */
export function getPrimaryArtkWorkspace(): ArtkWorkspaceInfo | undefined {
  const workspaces = detectAllArtkWorkspaces();

  for (const [, info] of workspaces) {
    if (info.detected) {
      return info;
    }
  }

  return undefined;
}

/**
 * Check if any workspace has ARTK installed (async)
 */
export async function hasArtkInstallationAsync(): Promise<boolean> {
  return (await getPrimaryArtkWorkspaceAsync()) !== undefined;
}

/**
 * Check if any workspace has ARTK installed (sync)
 * Kept for backward compatibility - prefer hasArtkInstallationAsync
 */
export function hasArtkInstallation(): boolean {
  return getPrimaryArtkWorkspace() !== undefined;
}
