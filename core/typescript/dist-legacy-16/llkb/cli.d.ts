/**
 * CLI Commands for LLKB
 *
 * Provides command-line interface functions for LLKB management.
 *
 * @module llkb/cli
 */
/**
 * Health check result
 */
export interface HealthCheckResult {
    status: 'healthy' | 'warning' | 'error';
    checks: HealthCheck[];
    summary: string;
}
/**
 * Individual health check
 */
export interface HealthCheck {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: string;
}
/**
 * Stats result
 */
export interface StatsResult {
    lessons: {
        total: number;
        active: number;
        archived: number;
        avgConfidence: number;
        avgSuccessRate: number;
        needsReview: number;
    };
    components: {
        total: number;
        active: number;
        archived: number;
        totalReuses: number;
        avgReusesPerComponent: number;
    };
    history: {
        todayEvents: number;
        historyFiles: number;
        oldestFile: string | null;
        newestFile: string | null;
    };
}
/**
 * Prune result
 */
export interface PruneResult {
    historyFilesDeleted: number;
    deletedFiles: string[];
    archivedLessons: number;
    archivedComponents: number;
    errors: string[];
}
/**
 * Run health check on LLKB
 *
 * Verifies that:
 * - All required files exist
 * - JSON files are valid
 * - No data corruption detected
 * - Configuration is valid
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Health check result
 *
 * @example
 * ```typescript
 * const result = runHealthCheck();
 * if (result.status === 'error') {
 *   console.error('LLKB needs attention:', result.summary);
 * }
 * ```
 */
export declare function runHealthCheck(llkbRoot?: string): HealthCheckResult;
/**
 * Get LLKB statistics
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Statistics about LLKB contents
 *
 * @example
 * ```typescript
 * const stats = getStats();
 * console.log(`Total lessons: ${stats.lessons.total}`);
 * console.log(`Total reuses: ${stats.components.totalReuses}`);
 * ```
 */
export declare function getStats(llkbRoot?: string): StatsResult;
/**
 * Prune old history files and optionally archive stale items
 *
 * @param options - Prune options
 * @returns Prune result with counts of deleted/archived items
 *
 * @example
 * ```typescript
 * const result = prune({ historyRetentionDays: 90 });
 * console.log(`Deleted ${result.historyFilesDeleted} old history files`);
 * ```
 */
export declare function prune(options?: {
    llkbRoot?: string;
    historyRetentionDays?: number;
    archiveInactiveLessons?: boolean;
    archiveInactiveComponents?: boolean;
    inactiveDays?: number;
}): PruneResult;
/**
 * Format health check result for console output
 *
 * @param result - Health check result
 * @returns Formatted string for console
 */
export declare function formatHealthCheck(result: HealthCheckResult): string;
/**
 * Format stats result for console output
 *
 * @param stats - Stats result
 * @returns Formatted string for console
 */
export declare function formatStats(stats: StatsResult): string;
/**
 * Format prune result for console output
 *
 * @param result - Prune result
 * @returns Formatted string for console
 */
export declare function formatPruneResult(result: PruneResult): string;
//# sourceMappingURL=cli.d.ts.map