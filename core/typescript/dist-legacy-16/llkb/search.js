"use strict";
/**
 * LLKB Search and Export Module
 *
 * This module provides search functionality across LLKB data
 * and export capabilities for reports and sharing.
 *
 * @module llkb/search
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = search;
exports.findLessonsByPattern = findLessonsByPattern;
exports.findComponents = findComponents;
exports.getLessonsForJourney = getLessonsForJourney;
exports.getComponentsForJourney = getComponentsForJourney;
exports.exportLLKB = exportLLKB;
exports.generateReport = generateReport;
exports.exportToFile = exportToFile;
const fs = __importStar(require("fs"));
const loaders_js_1 = require("./loaders.js");
// =============================================================================
// Search Functions
// =============================================================================
/**
 * Calculate text relevance score
 */
function calculateTextRelevance(text, query) {
    if (!query)
        return 1.0;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 1);
    if (queryWords.length === 0)
        return 1.0;
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
function searchLessons(lessons, query) {
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
            type: 'lesson',
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
function searchComponents(components, query) {
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
            type: 'component',
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
function search(llkbRoot, query) {
    const lessons = (0, loaders_js_1.loadLessons)(llkbRoot, { includeArchived: query.includeArchived });
    const components = (0, loaders_js_1.loadComponents)(llkbRoot, { includeArchived: query.includeArchived });
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
function findLessonsByPattern(llkbRoot, pattern) {
    const lessons = (0, loaders_js_1.loadLessons)(llkbRoot);
    return lessons.filter((lesson) => {
        const lowerPattern = pattern.toLowerCase();
        const lowerLessonPattern = lesson.pattern.toLowerCase();
        const lowerTrigger = lesson.trigger.toLowerCase();
        return (lowerLessonPattern.includes(lowerPattern) ||
            lowerTrigger.includes(lowerPattern));
    });
}
/**
 * Find components by name or description
 *
 * @param llkbRoot - Root directory of LLKB
 * @param searchTerm - Term to search for
 * @returns Matching components
 */
function findComponents(llkbRoot, searchTerm) {
    const components = (0, loaders_js_1.loadComponents)(llkbRoot);
    const lowerSearch = searchTerm.toLowerCase();
    return components.filter((component) => {
        return (component.name.toLowerCase().includes(lowerSearch) ||
            component.description.toLowerCase().includes(lowerSearch));
    });
}
/**
 * Get lessons for a specific journey
 *
 * @param llkbRoot - Root directory of LLKB
 * @param journeyId - Journey ID
 * @returns Lessons associated with the journey
 */
function getLessonsForJourney(llkbRoot, journeyId) {
    const lessons = (0, loaders_js_1.loadLessons)(llkbRoot);
    return lessons.filter((lesson) => lesson.journeyIds.includes(journeyId));
}
/**
 * Get components for a specific journey
 *
 * @param llkbRoot - Root directory of LLKB
 * @param journeyId - Journey ID
 * @returns Components used in or extracted from the journey
 */
function getComponentsForJourney(llkbRoot, journeyId) {
    const components = (0, loaders_js_1.loadComponents)(llkbRoot);
    return components.filter((component) => component.source.extractedFrom === journeyId);
}
// =============================================================================
// Export Functions
// =============================================================================
/**
 * Export lessons to specified format
 */
function exportLessonsToMarkdown(lessons, includeMetrics) {
    let md = '# Lessons\n\n';
    const byCategory = new Map();
    for (const lesson of lessons) {
        const category = lesson.category;
        if (!byCategory.has(category)) {
            byCategory.set(category, []);
        }
        byCategory.get(category).push(lesson);
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
function exportComponentsToMarkdown(components, includeMetrics, includeSource) {
    let md = '# Components\n\n';
    const byCategory = new Map();
    for (const component of components) {
        const category = component.category;
        if (!byCategory.has(category)) {
            byCategory.set(category, []);
        }
        byCategory.get(category).push(component);
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
function exportLessonsToCSV(lessons) {
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
function exportComponentsToCSV(components) {
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
function exportLLKB(llkbRoot, options) {
    const lessons = (0, loaders_js_1.loadLessons)(llkbRoot, {
        includeArchived: options.includeArchived,
        category: options.categories,
        scope: options.scopes,
    });
    const components = (0, loaders_js_1.loadComponents)(llkbRoot, {
        includeArchived: options.includeArchived,
        category: options.categories,
        scope: options.scopes,
    });
    switch (options.format) {
        case 'markdown':
            return [
                exportLessonsToMarkdown(lessons, options.includeMetrics || false),
                exportComponentsToMarkdown(components, options.includeMetrics || false, options.includeSource || false),
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
            return JSON.stringify({
                exported: new Date().toISOString(),
                lessons,
                components,
            }, null, 2);
    }
}
/**
 * Generate a summary report of LLKB
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Markdown report
 */
function generateReport(llkbRoot) {
    // Load config to verify LLKB is properly configured
    (0, loaders_js_1.loadLLKBConfig)(llkbRoot);
    const lessons = (0, loaders_js_1.loadLessons)(llkbRoot);
    const components = (0, loaders_js_1.loadComponents)(llkbRoot);
    const appProfile = (0, loaders_js_1.loadAppProfile)(llkbRoot);
    const archivedLessons = (0, loaders_js_1.loadLessons)(llkbRoot, { includeArchived: true }).filter((l) => l.archived).length;
    const archivedComponents = (0, loaders_js_1.loadComponents)(llkbRoot, { includeArchived: true }).filter((c) => c.archived).length;
    // Calculate stats
    const avgConfidence = lessons.length > 0
        ? lessons.reduce((sum, l) => sum + l.metrics.confidence, 0) / lessons.length
        : 0;
    const avgSuccessRate = lessons.length > 0
        ? lessons.reduce((sum, l) => sum + l.metrics.successRate, 0) / lessons.length
        : 0;
    const totalComponentUses = components.reduce((sum, c) => sum + c.metrics.totalUses, 0);
    // Count by category
    const lessonsByCategory = new Map();
    for (const lesson of lessons) {
        const count = lessonsByCategory.get(lesson.category) || 0;
        lessonsByCategory.set(lesson.category, count + 1);
    }
    const componentsByCategory = new Map();
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
async function exportToFile(llkbRoot, outputPath, options) {
    const content = exportLLKB(llkbRoot, options);
    fs.writeFileSync(outputPath, content, 'utf-8');
}
//# sourceMappingURL=search.js.map