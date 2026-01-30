/**
 * Workspace Detection - Detect ARTK installations in the workspace
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { ArtkWorkspaceInfo, ArtkContext, ArtkConfig } from '../types';
import * as YAML from 'yaml';

/**
 * Check if a path exists
 */
function pathExists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and parse context.json
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
 * Read and parse artk.config.yml
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
 * Detect ARTK installation in a workspace folder
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

  if (!pathExists(artkE2ePath)) {
    return { detected: false, projectRoot: root };
  }

  // Read context.json for metadata
  const context = pathExists(contextPath) ? readContext(contextPath) : undefined;

  // Check if LLKB is enabled
  const llkbEnabled = pathExists(llkbPath) && pathExists(path.join(llkbPath, 'config.yml'));

  return {
    detected: true,
    projectRoot: root,
    artkE2ePath,
    contextPath: pathExists(contextPath) ? contextPath : undefined,
    configPath: pathExists(configPath) ? configPath : undefined,
    variant: context?.variant,
    version: context?.artkVersion,
    llkbEnabled,
    llkbPath: llkbEnabled ? llkbPath : undefined,
  };
}

/**
 * Detect ARTK in all workspace folders
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
 * Get the primary ARTK workspace (first detected)
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
 * Check if any workspace has ARTK installed
 */
export function hasArtkInstallation(): boolean {
  return getPrimaryArtkWorkspace() !== undefined;
}
