/**
 * @module detection/submodule-checker
 * @description Git submodule detection and status checker.
 *
 * Parses .gitmodules files and checks submodule initialization status
 * to identify submodule boundaries during frontend detection.
 *
 * @example
 * ```typescript
 * import { SubmoduleChecker, checkSubmodules } from '@artk/core/detection';
 *
 * const checker = new SubmoduleChecker();
 * const status = await checker.checkAll('/path/to/repo');
 *
 * for (const sub of status) {
 *   console.log(`${sub.path}: ${sub.initialized ? 'initialized' : 'not initialized'}`);
 * }
 * ```
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import type { SubmoduleStatus, SubmoduleScanResult } from '../types/submodule.js';

/**
 * Options for submodule checking.
 */
export interface SubmoduleCheckerOptions {
  /** Whether to check initialization status via git command (default: true) */
  checkInitStatus?: boolean;

  /** Whether to include remote URL information (default: false) */
  includeUrls?: boolean;
}

/**
 * Default checker options.
 */
const DEFAULT_OPTIONS: Required<SubmoduleCheckerOptions> = {
  checkInitStatus: true,
  includeUrls: false,
};

/**
 * Parsed entry from .gitmodules file.
 */
interface GitmodulesEntry {
  name: string;
  path: string;
  url?: string;
  branch?: string;
}

/**
 * Checker for git submodule status.
 */
export class SubmoduleChecker {
  /**
   * Checks all submodules in a repository.
   *
   * @param repoRoot - Root directory of the git repository
   * @param options - Checker options
   * @returns Array of submodule statuses
   */
  async checkAll(
    repoRoot: string,
    options?: SubmoduleCheckerOptions
  ): Promise<SubmoduleStatus[]> {
    const opts: Required<SubmoduleCheckerOptions> = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    const gitmodulesPath = path.join(repoRoot, '.gitmodules');

    // No .gitmodules = no submodules
    if (!existsSync(gitmodulesPath)) {
      return [];
    }

    // Parse .gitmodules
    const entries = await this.parseGitmodules(gitmodulesPath);

    if (entries.length === 0) {
      return [];
    }

    // Build status for each submodule
    const statuses: SubmoduleStatus[] = [];

    for (const entry of entries) {
      const fullPath = path.join(repoRoot, entry.path);
      const status: SubmoduleStatus = {
        path: entry.path,
        initialized: false,
      };

      // Check if submodule directory exists
      if (!existsSync(fullPath)) {
        status.warning = 'Submodule directory does not exist';
        statuses.push(status);
        continue;
      }

      // Check initialization status
      if (opts.checkInitStatus) {
        const initStatus = this.checkInitialization(repoRoot, entry.path);
        status.initialized = initStatus.initialized;
        status.commit = initStatus.commit;
        if (initStatus.warning) {
          status.warning = initStatus.warning;
        }
      } else {
        // If not checking git status, assume initialized if .git exists
        status.initialized = existsSync(path.join(fullPath, '.git'));
      }

      // Include URL if requested
      if (opts.includeUrls && entry.url) {
        status.url = entry.url;
      }

      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Scans a directory to determine if it's a submodule.
   *
   * @param dirPath - Directory to check
   * @param repoRoot - Root of the parent repository
   * @returns Scan result with submodule information
   */
  async scan(dirPath: string, repoRoot: string): Promise<SubmoduleScanResult> {
    const gitmodulesPath = path.join(repoRoot, '.gitmodules');

    // No .gitmodules = not a submodule
    if (!existsSync(gitmodulesPath)) {
      return {
        isSubmodule: false,
        path: dirPath,
      };
    }

    // Get relative path from repo root
    const relativePath = path.relative(repoRoot, dirPath);

    // Parse .gitmodules and check if this path matches
    const entries = await this.parseGitmodules(gitmodulesPath);
    const matchingEntry = entries.find(
      (e) => e.path === relativePath || e.path === relativePath.replace(/\\/g, '/')
    );

    if (!matchingEntry) {
      return {
        isSubmodule: false,
        path: dirPath,
      };
    }

    // It's a submodule - get its status
    const initStatus = this.checkInitialization(repoRoot, matchingEntry.path);

    return {
      isSubmodule: true,
      path: dirPath,
      relativePath: matchingEntry.path,
      status: {
        path: matchingEntry.path,
        initialized: initStatus.initialized,
        commit: initStatus.commit,
        url: matchingEntry.url,
        warning: initStatus.warning,
      },
    };
  }

  /**
   * Checks if a path is within a submodule.
   *
   * @param checkPath - Path to check
   * @param repoRoot - Root of the parent repository
   * @returns True if path is inside a submodule
   */
  async isInSubmodule(checkPath: string, repoRoot: string): Promise<boolean> {
    const gitmodulesPath = path.join(repoRoot, '.gitmodules');

    if (!existsSync(gitmodulesPath)) {
      return false;
    }

    const relativePath = path.relative(repoRoot, checkPath);
    const normalizedPath = relativePath.replace(/\\/g, '/');

    const entries = await this.parseGitmodules(gitmodulesPath);

    // Check if the path starts with any submodule path
    return entries.some((entry) => {
      const submodulePath = entry.path.replace(/\\/g, '/');
      return (
        normalizedPath === submodulePath ||
        normalizedPath.startsWith(submodulePath + '/')
      );
    });
  }

  /**
   * Parses a .gitmodules file.
   *
   * @param gitmodulesPath - Path to .gitmodules file
   * @returns Array of parsed submodule entries
   */
  private async parseGitmodules(
    gitmodulesPath: string
  ): Promise<GitmodulesEntry[]> {
    try {
      const content = await readFile(gitmodulesPath, 'utf-8');
      return this.parseGitmodulesContent(content);
    } catch {
      return [];
    }
  }

  /**
   * Parses the content of a .gitmodules file.
   *
   * .gitmodules format:
   * [submodule "name"]
   *     path = some/path
   *     url = https://github.com/...
   *     branch = main
   */
  private parseGitmodulesContent(content: string): GitmodulesEntry[] {
    const entries: GitmodulesEntry[] = [];
    const lines = content.split('\n');

    let currentEntry: Partial<GitmodulesEntry> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Check for section header: [submodule "name"]
      const sectionMatch = trimmed.match(/^\[submodule\s+"([^"]+)"\]$/);
      if (sectionMatch) {
        // Save previous entry if valid
        if (currentEntry?.name && currentEntry?.path) {
          entries.push(currentEntry as GitmodulesEntry);
        }

        // Start new entry
        currentEntry = {
          name: sectionMatch[1],
        };
        continue;
      }

      // Parse key = value pairs
      if (currentEntry) {
        const keyValueMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
        if (keyValueMatch && keyValueMatch[1] && keyValueMatch[2]) {
          const key = keyValueMatch[1];
          const value = keyValueMatch[2];
          switch (key.toLowerCase()) {
            case 'path':
              currentEntry.path = value.trim();
              break;
            case 'url':
              currentEntry.url = value.trim();
              break;
            case 'branch':
              currentEntry.branch = value.trim();
              break;
          }
        }
      }
    }

    // Don't forget the last entry
    if (currentEntry?.name && currentEntry?.path) {
      entries.push(currentEntry as GitmodulesEntry);
    }

    return entries;
  }

  /**
   * Checks initialization status of a submodule via git command.
   */
  private checkInitialization(
    repoRoot: string,
    submodulePath: string
  ): { initialized: boolean; commit?: string; warning?: string } {
    try {
      // Use git submodule status to check initialization
      const output = execSync(`git submodule status "${submodulePath}"`, {
        cwd: repoRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Parse output: " abc123 path" (initialized) or "-abc123 path" (not initialized)
      const trimmed = output.trim();

      if (trimmed.startsWith('-')) {
        // Not initialized (prefix is -)
        return { initialized: false };
      }

      if (trimmed.startsWith('+')) {
        // Initialized but has local changes (prefix is +)
        const commitMatch = trimmed.match(/^\+([a-f0-9]+)/);
        return {
          initialized: true,
          commit: commitMatch?.[1],
          warning: 'Submodule has uncommitted changes',
        };
      }

      // Normal initialized state (prefix is space)
      const commitMatch = trimmed.match(/^\s*([a-f0-9]+)/);
      return {
        initialized: true,
        commit: commitMatch?.[1],
      };
    } catch {
      // Git command failed - might not be a git repo or git not available
      return {
        initialized: false,
        warning: 'Could not determine git status',
      };
    }
  }
}

/**
 * Convenience function to check all submodules in a repository.
 *
 * @param repoRoot - Root directory of the git repository
 * @param options - Checker options
 * @returns Array of submodule statuses
 */
export async function checkSubmodules(
  repoRoot: string,
  options?: SubmoduleCheckerOptions
): Promise<SubmoduleStatus[]> {
  const checker = new SubmoduleChecker();
  return checker.checkAll(repoRoot, options);
}

/**
 * Checks if a directory is a git submodule.
 *
 * @param dirPath - Directory to check
 * @param repoRoot - Root of the parent repository
 * @returns Scan result with submodule information
 */
export async function scanSubmodule(
  dirPath: string,
  repoRoot: string
): Promise<SubmoduleScanResult> {
  const checker = new SubmoduleChecker();
  return checker.scan(dirPath, repoRoot);
}

/**
 * Checks if a path is within a git submodule.
 *
 * @param checkPath - Path to check
 * @param repoRoot - Root of the parent repository
 * @returns True if path is inside a submodule
 */
export async function isPathInSubmodule(
  checkPath: string,
  repoRoot: string
): Promise<boolean> {
  const checker = new SubmoduleChecker();
  return checker.isInSubmodule(checkPath, repoRoot);
}

/**
 * Parses a .gitmodules file directly.
 *
 * @param gitmodulesPath - Path to .gitmodules file
 * @returns Array of submodule paths
 */
export async function parseGitmodulesFile(
  gitmodulesPath: string
): Promise<string[]> {
  if (!existsSync(gitmodulesPath)) {
    return [];
  }

  try {
    const content = await readFile(gitmodulesPath, 'utf-8');
    const paths: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.trim().match(/^path\s*=\s*(.+)$/);
      if (match && match[1]) {
        paths.push(match[1].trim());
      }
    }

    return paths;
  } catch {
    return [];
  }
}
