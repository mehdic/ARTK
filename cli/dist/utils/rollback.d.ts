/**
 * ARTK Rollback Utility
 *
 * Handles rollback on partial installation failure.
 * Removes all installed files to return to clean pre-install state.
 */
/**
 * Rollback result.
 */
export interface RollbackResult {
    success: boolean;
    removedDirectories: string[];
    removedFiles: string[];
    errors: string[];
}
/**
 * Perform rollback to clean state.
 */
export declare function rollback(targetPath: string, reason: string): RollbackResult;
/**
 * Check if rollback is needed based on partial installation state.
 */
export declare function needsRollback(targetPath: string): {
    needed: boolean;
    reason?: string;
};
/**
 * Create a backup of existing installation before upgrade.
 */
export declare function createBackup(targetPath: string): {
    success: boolean;
    backupPath?: string;
    error?: string;
};
/**
 * Restore from backup.
 */
export declare function restoreFromBackup(targetPath: string, backupPath: string): {
    success: boolean;
    error?: string;
};
//# sourceMappingURL=rollback.d.ts.map