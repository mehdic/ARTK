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
 * Checker for git submodule status.
 */
export declare class SubmoduleChecker {
    /**
     * Checks all submodules in a repository.
     *
     * @param repoRoot - Root directory of the git repository
     * @param options - Checker options
     * @returns Array of submodule statuses
     */
    checkAll(repoRoot: string, options?: SubmoduleCheckerOptions): Promise<SubmoduleStatus[]>;
    /**
     * Scans a directory to determine if it's a submodule.
     *
     * @param dirPath - Directory to check
     * @param repoRoot - Root of the parent repository
     * @returns Scan result with submodule information
     */
    scan(dirPath: string, repoRoot: string): Promise<SubmoduleScanResult>;
    /**
     * Checks if a path is within a submodule.
     *
     * @param checkPath - Path to check
     * @param repoRoot - Root of the parent repository
     * @returns True if path is inside a submodule
     */
    isInSubmodule(checkPath: string, repoRoot: string): Promise<boolean>;
    /**
     * Parses a .gitmodules file.
     *
     * @param gitmodulesPath - Path to .gitmodules file
     * @returns Array of parsed submodule entries
     */
    private parseGitmodules;
    /**
     * Parses the content of a .gitmodules file.
     *
     * .gitmodules format:
     * [submodule "name"]
     *     path = some/path
     *     url = https://github.com/...
     *     branch = main
     */
    private parseGitmodulesContent;
    /**
     * Checks initialization status of a submodule via git command.
     */
    private checkInitialization;
}
/**
 * Convenience function to check all submodules in a repository.
 *
 * @param repoRoot - Root directory of the git repository
 * @param options - Checker options
 * @returns Array of submodule statuses
 */
export declare function checkSubmodules(repoRoot: string, options?: SubmoduleCheckerOptions): Promise<SubmoduleStatus[]>;
/**
 * Checks if a directory is a git submodule.
 *
 * @param dirPath - Directory to check
 * @param repoRoot - Root of the parent repository
 * @returns Scan result with submodule information
 */
export declare function scanSubmodule(dirPath: string, repoRoot: string): Promise<SubmoduleScanResult>;
/**
 * Checks if a path is within a git submodule.
 *
 * @param checkPath - Path to check
 * @param repoRoot - Root of the parent repository
 * @returns True if path is inside a submodule
 */
export declare function isPathInSubmodule(checkPath: string, repoRoot: string): Promise<boolean>;
/**
 * Parses a .gitmodules file directly.
 *
 * @param gitmodulesPath - Path to .gitmodules file
 * @returns Array of submodule paths
 */
export declare function parseGitmodulesFile(gitmodulesPath: string): Promise<string[]>;
//# sourceMappingURL=submodule-checker.d.ts.map