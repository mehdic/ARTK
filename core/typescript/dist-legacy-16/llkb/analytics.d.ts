/**
 * Analytics Update for LLKB
 *
 * Provides functions to calculate and update LLKB analytics.
 *
 * @module llkb/analytics
 */
import type { LessonsFile, ComponentsFile, AnalyticsFile } from './types.js';
/**
 * Update analytics.json based on current lessons and components
 *
 * This function recalculates all statistics and saves the updated analytics.
 *
 * @param llkbRoot - Root LLKB directory
 * @returns true if successful, false otherwise
 *
 * @example
 * ```typescript
 * // Call after modifying lessons or components
 * updateAnalytics();
 * ```
 */
export declare function updateAnalytics(llkbRoot?: string): boolean;
/**
 * Update analytics with provided data (for testing or when data is already loaded)
 *
 * @param lessons - Lessons data
 * @param components - Components data
 * @param analyticsPath - Path to save analytics
 * @returns true if successful
 */
export declare function updateAnalyticsWithData(lessons: LessonsFile, components: ComponentsFile, analyticsPath: string): boolean;
/**
 * Create an empty analytics structure
 */
export declare function createEmptyAnalytics(): AnalyticsFile;
/**
 * Get analytics summary as a formatted string
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Formatted summary string
 */
export declare function getAnalyticsSummary(llkbRoot?: string): string;
//# sourceMappingURL=analytics.d.ts.map