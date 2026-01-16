/**
 * LLKB Search and Export Module
 *
 * This module provides search functionality across LLKB data
 * and export capabilities for reports and sharing.
 *
 * @module llkb/search
 */

import * as fs from 'fs';
import type {
  Lesson,
  Component,
  LLKBCategory,
  ComponentCategory,
  LLKBScope,
  AppQuirk,
  GlobalRule,
} from './types.js';
import { loadLessons, loadComponents, loadAppProfile, loadLLKBConfig } from './loaders.js';

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Search Functions
// =============================================================================

/**
 * Calculate text relevance score
 */
function calculateTextRelevance(text: string, query: string): number {
  if (!query) return 1.0;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 1);

  if (queryWords.length === 0) return 1.0;

  // Exact match
  if (lowerText.includes(lowerQuery)) {
    return 1.0;
  }

  // Word matches
  let matchedWords = 0;
  for (const word of queryWords) {
    if (lowerText.includes(word)) {
      matchedWords++;
    }
  }

  return matchedWords / queryWords.length;
}

/**
 * Search lessons
 */
function searchLessons(
  lessons: Lesson[],
  query: SearchQuery
): SearchResult[] {
  return lessons
    .filter((lesson) => {
      // Filter archived
      if (!query.includeArchived && lesson.archived) {
        return false;
      }

      // Filter by category
      if (query.category && lesson.category !== query.category) {
        return false;
      }

      // Filter by scope
      if (query.scope && lesson.scope !== query.scope) {
        return false;
      }

      // Filter by tags
      if (query.tags && query.tags.length > 0) {
        const lessonTags = lesson.tags || [];
        if (!query.tags.some((t) => lessonTags.includes(t))) {
          return false;
        }
      }

      // Filter by confidence
      if (query.minConfidence !== undefined) {
        if (lesson.metrics.confidence < query.minConfidence) {
          return false;
        }
      }

      // Filter by journey
      if (query.journeyId && !lesson.journeyIds.includes(query.journeyId)) {
        return false;
      }

      return true;
    })
    .map((lesson) => {
      const searchText = `${lesson.title} ${lesson.pattern} ${lesson.trigger}`;
      const relevance = calculateTextRelevance(searchText, query.text || '');

      return {
        type: 'lesson' as const,
        id: lesson.id,
        title: lesson.title,
        description: lesson.pattern,
        category: lesson.category,
        scope: lesson.scope,
        relevance,
        item: lesson,
      };
    })
    .filter((result) => result.relevance > 0.1);
}

/**
 * Search components
 */
function searchComponents(
  components: Component[],
  query: SearchQuery
): SearchResult[] {
  return components
    .filter((component) => {
      // Filter archived
      if (!query.includeArchived && component.archived) {
        return false;
      }

      // Filter by category
      if (query.category && component.category !== query.category) {
        return false;
      }

      // Filter by scope
      if (query.scope && component.scope !== query.scope) {
        return false;
      }

      return true;
    })
    .map((component) => {
      const searchText = `${component.name} ${component.description}`;
      const relevance = calculateTextRelevance(searchText, query.text || '');

      return {
        type: 'component' as const,
        id: component.id,
        title: component.name,
        description: component.description,
        category: component.category,
        scope: component.scope,
        relevance,
        item: component,
      };
    })
    .filter((result) => result.relevance > 0.1);
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
export function search(llkbRoot: string, query: SearchQuery): SearchResult[] {
  const lessons = loadLessons(llkbRoot, { includeArchived: query.includeArchived });
  const components = loadComponents(llkbRoot, { includeArchived: query.includeArchived });

  // Search all types
  const lessonResults = searchLessons(lessons, query);
  const componentResults = searchComponents(components, query);

  // Combine and sort by relevance
  const allResults = [...lessonResults, ...componentResults];
  allResults.sort((a, b) => b.relevance - a.relevance);

  // Apply limit
  if (query.limit && query.limit > 0) {
    return allResults.slice(0, query.limit);
  }

  return allResults;
}

/**
 * Find lessons by pattern
 *
 * Searches for lessons that match a specific code pattern.
 *
 * @param llkbRoot - Root directory of LLKB
 * @param pattern - Pattern to search for
 * @returns Matching lessons
 */
export function findLessonsByPattern(llkbRoot: string, pattern: string): Lesson[] {
  const lessons = loadLessons(llkbRoot);

  return lessons.filter((lesson) => {
    const lowerPattern = pattern.toLowerCase();
    const lowerLessonPattern = lesson.pattern.toLowerCase();
    const lowerTrigger = lesson.trigger.toLowerCase();

    return (
      lowerLessonPattern.includes(lowerPattern) ||
      lowerTrigger.includes(lowerPattern)
    );
  });
}

/**
 * Find components by name or description
 *
 * @param llkbRoot - Root directory of LLKB
 * @param searchTerm - Term to search for
 * @returns Matching components
 */
export function findComponents(llkbRoot: string, searchTerm: string): Component[] {
  const components = loadComponents(llkbRoot);
  const lowerSearch = searchTerm.toLowerCase();

  return components.filter((component) => {
    return (
      component.name.toLowerCase().includes(lowerSearch) ||
      component.description.toLowerCase().includes(lowerSearch)
    );
  });
}

/**
 * Get lessons for a specific journey
 *
 * @param llkbRoot - Root directory of LLKB
 * @param journeyId - Journey ID
 * @returns Lessons associated with the journey
 */
export function getLessonsForJourney(llkbRoot: string, journeyId: string): Lesson[] {
  const lessons = loadLessons(llkbRoot);
  return lessons.filter((lesson) => lesson.journeyIds.includes(journeyId));
}

/**
 * Get components for a specific journey
 *
 * @param llkbRoot - Root directory of LLKB
 * @param journeyId - Journey ID
 * @returns Components used in or extracted from the journey
 */
export function getComponentsForJourney(llkbRoot: string, journeyId: string): Component[] {
  const components = loadComponents(llkbRoot);
  return components.filter(
    (component) => component.source.extractedFrom === journeyId
  );
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Export lessons to specified format
 */
function exportLessonsToMarkdown(lessons: Lesson[], includeMetrics: boolean): string {
  let md = '# Lessons\n\n';

  const byCategory = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const category = lesson.category;
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(lesson);
  }

  for (const [category, categoryLessons] of byCategory) {
    md += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

    for (const lesson of categoryLessons) {
      md += `### ${lesson.id}: ${lesson.title}\n\n`;
      md += `**Trigger:** ${lesson.trigger}\n\n`;
      md += `**Pattern:** ${lesson.pattern}\n\n`;
      md += `**Scope:** ${lesson.scope}\n\n`;

      if (includeMetrics) {
        md += `**Metrics:**\n`;
        md += `- Occurrences: ${lesson.metrics.occurrences}\n`;
        md += `- Success Rate: ${(lesson.metrics.successRate * 100).toFixed(1)}%\n`;
        md += `- Confidence: ${(lesson.metrics.confidence * 100).toFixed(1)}%\n`;
        md += '\n';
      }

      md += '---\n\n';
    }
  }

  return md;
}

/**
 * Export components to specified format
 */
function exportComponentsToMarkdown(
  components: Component[],
  includeMetrics: boolean,
  includeSource: boolean
): string {
  let md = '# Components\n\n';

  const byCategory = new Map<string, Component[]>();
  for (const component of components) {
    const category = component.category;
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(component);
  }

  for (const [category, categoryComponents] of byCategory) {
    md += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

    for (const component of categoryComponents) {
      md += `### ${component.id}: ${component.name}\n\n`;
      md += `${component.description}\n\n`;
      md += `**File:** \`${component.filePath}\`\n\n`;
      md += `**Scope:** ${component.scope}\n\n`;

      if (includeMetrics) {
        md += `**Metrics:**\n`;
        md += `- Total Uses: ${component.metrics.totalUses}\n`;
        md += `- Success Rate: ${(component.metrics.successRate * 100).toFixed(1)}%\n`;
        md += '\n';
      }

      if (includeSource && component.source.originalCode) {
        md += '**Original Code:**\n\n';
        md += '```typescript\n';
        md += component.source.originalCode;
        md += '\n```\n\n';
      }

      md += '---\n\n';
    }
  }

  return md;
}

/**
 * Export lessons to CSV
 */
function exportLessonsToCSV(lessons: Lesson[]): string {
  const headers = [
    'ID',
    'Title',
    'Category',
    'Scope',
    'Trigger',
    'Pattern',
    'Occurrences',
    'Success Rate',
    'Confidence',
  ];

  const rows = lessons.map((lesson) => [
    lesson.id,
    `"${lesson.title.replace(/"/g, '""')}"`,
    lesson.category,
    lesson.scope,
    `"${lesson.trigger.replace(/"/g, '""')}"`,
    `"${lesson.pattern.replace(/"/g, '""')}"`,
    lesson.metrics.occurrences.toString(),
    lesson.metrics.successRate.toFixed(3),
    lesson.metrics.confidence.toFixed(3),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export components to CSV
 */
function exportComponentsToCSV(components: Component[]): string {
  const headers = [
    'ID',
    'Name',
    'Category',
    'Scope',
    'File Path',
    'Description',
    'Total Uses',
    'Success Rate',
    'Extracted From',
  ];

  const rows = components.map((component) => [
    component.id,
    component.name,
    component.category,
    component.scope,
    `"${component.filePath}"`,
    `"${component.description.replace(/"/g, '""')}"`,
    component.metrics.totalUses.toString(),
    component.metrics.successRate.toFixed(3),
    component.source.extractedFrom,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

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
export function exportLLKB(llkbRoot: string, options: ExportOptions): string {
  const lessons = loadLessons(llkbRoot, {
    includeArchived: options.includeArchived,
    category: options.categories as LLKBCategory[],
    scope: options.scopes,
  });

  const components = loadComponents(llkbRoot, {
    includeArchived: options.includeArchived,
    category: options.categories as ComponentCategory[],
    scope: options.scopes,
  });

  switch (options.format) {
    case 'markdown':
      return [
        exportLessonsToMarkdown(lessons, options.includeMetrics || false),
        exportComponentsToMarkdown(
          components,
          options.includeMetrics || false,
          options.includeSource || false
        ),
      ].join('\n\n');

    case 'csv':
      return [
        '# Lessons',
        exportLessonsToCSV(lessons),
        '',
        '# Components',
        exportComponentsToCSV(components),
      ].join('\n');

    case 'json':
    default:
      return JSON.stringify(
        {
          exported: new Date().toISOString(),
          lessons,
          components,
        },
        null,
        2
      );
  }
}

/**
 * Generate a summary report of LLKB
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Markdown report
 */
export function generateReport(llkbRoot: string): string {
  // Load config to verify LLKB is properly configured
  loadLLKBConfig(llkbRoot);
  const lessons = loadLessons(llkbRoot);
  const components = loadComponents(llkbRoot);
  const appProfile = loadAppProfile(llkbRoot);

  const archivedLessons = loadLessons(llkbRoot, { includeArchived: true }).filter(
    (l) => l.archived
  ).length;
  const archivedComponents = loadComponents(llkbRoot, { includeArchived: true }).filter(
    (c) => c.archived
  ).length;

  // Calculate stats
  const avgConfidence =
    lessons.length > 0
      ? lessons.reduce((sum, l) => sum + l.metrics.confidence, 0) / lessons.length
      : 0;

  const avgSuccessRate =
    lessons.length > 0
      ? lessons.reduce((sum, l) => sum + l.metrics.successRate, 0) / lessons.length
      : 0;

  const totalComponentUses = components.reduce(
    (sum, c) => sum + c.metrics.totalUses,
    0
  );

  // Count by category
  const lessonsByCategory = new Map<string, number>();
  for (const lesson of lessons) {
    const count = lessonsByCategory.get(lesson.category) || 0;
    lessonsByCategory.set(lesson.category, count + 1);
  }

  const componentsByCategory = new Map<string, number>();
  for (const component of components) {
    const count = componentsByCategory.get(component.category) || 0;
    componentsByCategory.set(component.category, count + 1);
  }

  // Generate report
  let report = '# LLKB Status Report\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n\n`;

  if (appProfile) {
    report += '## Application Profile\n\n';
    report += `- **Framework:** ${appProfile.application.framework}\n`;
    report += `- **UI Library:** ${appProfile.application.uiLibrary}\n`;
    report += `- **Data Grid:** ${appProfile.application.dataGrid}\n`;
    report += '\n';
  }

  report += '## Overview\n\n';
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Active Lessons | ${lessons.length} |\n`;
  report += `| Archived Lessons | ${archivedLessons} |\n`;
  report += `| Active Components | ${components.length} |\n`;
  report += `| Archived Components | ${archivedComponents} |\n`;
  report += `| Avg. Lesson Confidence | ${(avgConfidence * 100).toFixed(1)}% |\n`;
  report += `| Avg. Lesson Success Rate | ${(avgSuccessRate * 100).toFixed(1)}% |\n`;
  report += `| Total Component Uses | ${totalComponentUses} |\n`;
  report += '\n';

  report += '## Lessons by Category\n\n';
  report += `| Category | Count |\n`;
  report += `|----------|-------|\n`;
  for (const [category, count] of lessonsByCategory) {
    report += `| ${category} | ${count} |\n`;
  }
  report += '\n';

  report += '## Components by Category\n\n';
  report += `| Category | Count |\n`;
  report += `|----------|-------|\n`;
  for (const [category, count] of componentsByCategory) {
    report += `| ${category} | ${count} |\n`;
  }
  report += '\n';

  // Top lessons
  const topLessons = [...lessons]
    .sort((a, b) => b.metrics.confidence - a.metrics.confidence)
    .slice(0, 5);

  if (topLessons.length > 0) {
    report += '## Top Lessons (by Confidence)\n\n';
    for (const lesson of topLessons) {
      report += `- **${lesson.id}** - ${lesson.title} (${(lesson.metrics.confidence * 100).toFixed(0)}%)\n`;
    }
    report += '\n';
  }

  // Most used components
  const topComponents = [...components]
    .sort((a, b) => b.metrics.totalUses - a.metrics.totalUses)
    .slice(0, 5);

  if (topComponents.length > 0) {
    report += '## Most Used Components\n\n';
    for (const component of topComponents) {
      report += `- **${component.id}** - ${component.name} (${component.metrics.totalUses} uses)\n`;
    }
    report += '\n';
  }

  // Low confidence lessons (needs review)
  const lowConfidence = lessons.filter((l) => l.metrics.confidence < 0.4);
  if (lowConfidence.length > 0) {
    report += '## Needs Review (Low Confidence)\n\n';
    for (const lesson of lowConfidence.slice(0, 5)) {
      report += `- **${lesson.id}** - ${lesson.title} (${(lesson.metrics.confidence * 100).toFixed(0)}%)\n`;
    }
    report += '\n';
  }

  return report;
}

/**
 * Export to file
 *
 * @param llkbRoot - Root directory of LLKB
 * @param outputPath - Output file path
 * @param options - Export options
 */
export async function exportToFile(
  llkbRoot: string,
  outputPath: string,
  options: ExportOptions
): Promise<void> {
  const content = exportLLKB(llkbRoot, options);
  fs.writeFileSync(outputPath, content, 'utf-8');
}
