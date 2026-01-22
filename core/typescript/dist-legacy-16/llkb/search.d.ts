/**
 * LLKB Search and Export Module
 *
 * This module provides search functionality across LLKB data
 * and export capabilities for reports and sharing.
 *
 * @module llkb/search
 */
import type { Lesson, Component, LLKBCategory, ComponentCategory, LLKBScope, AppQuirk, GlobalRule } from './types.js';
/**
 * Search query options
 */
export interface SearchQuery {
    /** Text to search for (searches titles, descriptions, patterns) */
    text?: string;
    /** Filter by category */
    category?: LLKBCategory | ComponentCategory;
    /** Filter by scope */
    scope?: LLKBScope;
    /** Filter by tags */
    tags?: string[];
    /** Filter by minimum confidence */
    minConfidence?: number;
    /** Filter by journey ID */
    journeyId?: string;
    /** Include archived items */
    includeArchived?: boolean;
    /** Maximum results */
    limit?: number;
}
/**
 * Unified search result
 */
export interface SearchResult {
    /** Result type */
    type: 'lesson' | 'component' | 'quirk' | 'rule';
    /** Item ID */
    id: string;
    /** Title or name */
    title: string;
    /** Description or pattern */
    description: string;
    /** Category */
    category: string;
    /** Scope */
    scope: LLKBScope;
    /** Relevance score (0.0 - 1.0) */
    relevance: number;
    /** The original item */
    item: Lesson | Component | AppQuirk | GlobalRule;
}
/**
 * Export format
 */
export type ExportFormat = 'json' | 'markdown' | 'csv';
/**
 * Export options
 */
export interface ExportOptions {
    /** Export format */
    format: ExportFormat;
    /** Include archived items */
    includeArchived?: boolean;
    /** Include metrics */
    includeMetrics?: boolean;
    /** Include source code */
    includeSource?: boolean;
    /** Filter by categories */
    categories?: (LLKBCategory | ComponentCategory)[];
    /** Filter by scopes */
    scopes?: LLKBScope[];
}
/**
 * Report section
 */
export interface ReportSection {
    title: string;
    content: string;
}
/**
 * Search LLKB data
 *
 * Searches across lessons, components, quirks, and rules.
 *
 * @param llkbRoot - Root directory of LLKB
 * @param query - Search query
 * @returns Array of search results sorted by relevance
 *
 * @example
 * ```typescript
 * const results = search('.artk/llkb', {
 *   text: 'sidebar navigation',
 *   category: 'navigation',
 *   minConfidence: 0.7,
 * });
 * ```
 */
export declare function search(llkbRoot: string, query: SearchQuery): SearchResult[];
/**
 * Find lessons by pattern
 *
 * Searches for lessons that match a specific code pattern.
 *
 * @param llkbRoot - Root directory of LLKB
 * @param pattern - Pattern to search for
 * @returns Matching lessons
 */
export declare function findLessonsByPattern(llkbRoot: string, pattern: string): Lesson[];
/**
 * Find components by name or description
 *
 * @param llkbRoot - Root directory of LLKB
 * @param searchTerm - Term to search for
 * @returns Matching components
 */
export declare function findComponents(llkbRoot: string, searchTerm: string): Component[];
/**
 * Get lessons for a specific journey
 *
 * @param llkbRoot - Root directory of LLKB
 * @param journeyId - Journey ID
 * @returns Lessons associated with the journey
 */
export declare function getLessonsForJourney(llkbRoot: string, journeyId: string): Lesson[];
/**
 * Get components for a specific journey
 *
 * @param llkbRoot - Root directory of LLKB
 * @param journeyId - Journey ID
 * @returns Components used in or extracted from the journey
 */
export declare function getComponentsForJourney(llkbRoot: string, journeyId: string): Component[];
/**
 * Export LLKB data
 *
 * @param llkbRoot - Root directory of LLKB
 * @param options - Export options
 * @returns Export content as string
 *
 * @example
 * ```typescript
 * const markdown = exportLLKB('.artk/llkb', {
 *   format: 'markdown',
 *   includeMetrics: true,
 * });
 * fs.writeFileSync('llkb-export.md', markdown);
 * ```
 */
export declare function exportLLKB(llkbRoot: string, options: ExportOptions): string;
/**
 * Generate a summary report of LLKB
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Markdown report
 */
export declare function generateReport(llkbRoot: string): string;
/**
 * Export to file
 *
 * @param llkbRoot - Root directory of LLKB
 * @param outputPath - Output file path
 * @param options - Export options
 */
export declare function exportToFile(llkbRoot: string, outputPath: string, options: ExportOptions): Promise<void>;
//# sourceMappingURL=search.d.ts.map