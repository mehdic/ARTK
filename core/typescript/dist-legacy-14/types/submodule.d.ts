/**
 * @module types/submodule
 * @description Submodule type definitions for ARTK E2E independent architecture.
 * Defines types for Git submodule state during /init.
 */
/**
 * Git submodule initialization states.
 */
export type SubmoduleState = 'initialized' | 'uninitialized' | 'not-submodule';
/**
 * Git submodule state for warning users.
 * Transient - not persisted, used only during /init.
 *
 * @example
 * ```typescript
 * const status: SubmoduleStatus = {
 *   path: 'libs/shared-ui',
 *   initialized: true,
 *   commit: 'abc123def456...',
 *   url: 'https://github.com/org/shared-ui.git'
 * };
 * ```
 */
export interface SubmoduleStatus {
    /**
     * Path to submodule (from .gitmodules).
     */
    path: string;
    /**
     * Whether the submodule is initialized.
     */
    initialized: boolean;
    /**
     * Commit SHA if initialized.
     */
    commit?: string;
    /**
     * Remote URL of the submodule (from .gitmodules).
     */
    url?: string;
    /**
     * Optional warning message if submodule affects testing.
     */
    warning?: string;
}
/**
 * Result of scanning all submodules in a project.
 *
 * @example
 * ```typescript
 * const result: SubmoduleScanResult = {
 *   hasSubmodules: true,
 *   submodules: [
 *     { path: 'libs/shared-ui', initialized: true, commit: 'abc123...' },
 *     { path: 'libs/legacy', initialized: false, warning: 'Submodule not initialized' }
 *   ],
 *   warnings: ['Some submodules are not initialized. Run: git submodule update --init']
 * };
 * ```
 */
export interface SubmoduleScanResult {
    /**
     * Whether the scanned path is a submodule.
     * Used when scanning a single directory.
     */
    isSubmodule: boolean;
    /**
     * The scanned path.
     */
    path: string;
    /**
     * Relative path from repo root (if is a submodule).
     */
    relativePath?: string;
    /**
     * Submodule status details (if is a submodule).
     */
    status?: SubmoduleStatus;
    /**
     * Whether the project has any submodules.
     * @deprecated Use isSubmodule for single path checks
     */
    hasSubmodules?: boolean;
    /**
     * List of submodule statuses (for bulk scans).
     */
    submodules?: SubmoduleStatus[];
    /**
     * Warnings about submodule state.
     */
    warnings?: string[];
}
/**
 * Type guard to check if a value is a valid SubmoduleStatus.
 */
export declare function isSubmoduleStatus(value: unknown): value is SubmoduleStatus;
/**
 * Type guard to check if a value is a valid SubmoduleScanResult.
 */
export declare function isSubmoduleScanResult(value: unknown): value is SubmoduleScanResult;
/**
 * Creates an empty submodule scan result.
 */
export declare function createEmptySubmoduleScanResult(dirPath: string): SubmoduleScanResult;
//# sourceMappingURL=submodule.d.ts.map