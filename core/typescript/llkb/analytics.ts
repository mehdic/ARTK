/**
 * Analytics Update for LLKB
 *
 * Provides functions to calculate and update LLKB analytics.
 *
 * @module llkb/analytics
 */

import * as path from 'path';
import type {
  LessonsFile,
  ComponentsFile,
  AnalyticsFile,
  AnalyticsOverview,
  LessonStats,
  ComponentStats,
  TopPerformerLesson,
  TopPerformerComponent,
  LLKBCategory,
  ComponentCategory,
  LLKBScope,
} from './types.js';
import { loadJSON, saveJSONAtomicSync } from './file-utils.js';
import { detectDecliningConfidence, daysBetween } from './confidence.js';

/**
 * Default LLKB root directory
 */
const DEFAULT_LLKB_ROOT = '.artk/llkb';

/**
 * All valid lesson categories
 */
const ALL_CATEGORIES: LLKBCategory[] = [
  'selector',
  'timing',
  'quirk',
  'auth',
  'data',
  'assertion',
  'navigation',
  'ui-interaction',
];

/**
 * All valid component categories (excludes 'quirk')
 */
const COMPONENT_CATEGORIES: ComponentCategory[] = [
  'selector',
  'timing',
  'auth',
  'data',
  'assertion',
  'navigation',
  'ui-interaction',
];

/**
 * All valid scopes
 */
const ALL_SCOPES: LLKBScope[] = [
  'universal',
  'framework:angular',
  'framework:react',
  'framework:vue',
  'framework:ag-grid',
  'app-specific',
];

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
export function updateAnalytics(llkbRoot: string = DEFAULT_LLKB_ROOT): boolean {
  try {
    // Load current data
    const lessonsPath = path.join(llkbRoot, 'lessons.json');
    const componentsPath = path.join(llkbRoot, 'components.json');
    const analyticsPath = path.join(llkbRoot, 'analytics.json');

    const lessons = loadJSON<LessonsFile>(lessonsPath);
    const components = loadJSON<ComponentsFile>(componentsPath);
    let analytics = loadJSON<AnalyticsFile>(analyticsPath);

    if (!lessons || !components) {
      console.warn('[LLKB] Cannot update analytics: lessons or components not found');
      return false;
    }

    // Initialize analytics if not exists
    if (!analytics) {
      analytics = createEmptyAnalytics();
    }

    // Update all sections
    analytics.overview = calculateOverview(lessons, components);
    analytics.lessonStats = calculateLessonStats(lessons);
    analytics.componentStats = calculateComponentStats(components);
    analytics.topPerformers = calculateTopPerformers(lessons, components);
    analytics.needsReview = calculateNeedsReview(lessons, components);
    analytics.lastUpdated = new Date().toISOString();

    // Save updated analytics
    const result = saveJSONAtomicSync(analyticsPath, analytics);
    return result.success;
  } catch (error) {
    console.error(
      `[LLKB] Failed to update analytics: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

/**
 * Update analytics with provided data (for testing or when data is already loaded)
 *
 * @param lessons - Lessons data
 * @param components - Components data
 * @param analyticsPath - Path to save analytics
 * @returns true if successful
 */
export function updateAnalyticsWithData(
  lessons: LessonsFile,
  components: ComponentsFile,
  analyticsPath: string
): boolean {
  try {
    let analytics = loadJSON<AnalyticsFile>(analyticsPath) ?? createEmptyAnalytics();

    analytics.overview = calculateOverview(lessons, components);
    analytics.lessonStats = calculateLessonStats(lessons);
    analytics.componentStats = calculateComponentStats(components);
    analytics.topPerformers = calculateTopPerformers(lessons, components);
    analytics.needsReview = calculateNeedsReview(lessons, components);
    analytics.lastUpdated = new Date().toISOString();

    const result = saveJSONAtomicSync(analyticsPath, analytics);
    return result.success;
  } catch (error) {
    console.error(`[LLKB] Failed to update analytics: ${error}`);
    return false;
  }
}

/**
 * Create an empty analytics structure
 */
export function createEmptyAnalytics(): AnalyticsFile {
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    overview: {
      totalLessons: 0,
      activeLessons: 0,
      archivedLessons: 0,
      totalComponents: 0,
      activeComponents: 0,
      archivedComponents: 0,
    },
    lessonStats: {
      byCategory: Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 0])) as Record<
        LLKBCategory,
        number
      >,
      avgConfidence: 0,
      avgSuccessRate: 0,
    },
    componentStats: {
      byCategory: Object.fromEntries(COMPONENT_CATEGORIES.map((c) => [c, 0])) as Record<
        ComponentCategory,
        number
      >,
      byScope: Object.fromEntries(ALL_SCOPES.map((s) => [s, 0])) as Record<LLKBScope, number>,
      totalReuses: 0,
      avgReusesPerComponent: 0,
    },
    impact: {
      verifyIterationsSaved: 0,
      avgIterationsBeforeLLKB: 0,
      avgIterationsAfterLLKB: 0,
      codeDeduplicationRate: 0,
      estimatedHoursSaved: 0,
    },
    topPerformers: {
      lessons: [],
      components: [],
    },
    needsReview: {
      lowConfidenceLessons: [],
      lowUsageComponents: [],
      decliningSuccessRate: [],
    },
  };
}

/**
 * Calculate overview statistics
 */
function calculateOverview(
  lessons: LessonsFile,
  components: ComponentsFile
): AnalyticsOverview {
  const activeLessons = lessons.lessons.filter((l) => !l.archived);
  const activeComponents = components.components.filter((c) => !c.archived);
  const archivedComponents = components.components.filter((c) => c.archived);

  return {
    totalLessons: lessons.lessons.length,
    activeLessons: activeLessons.length,
    archivedLessons: (lessons.archived ?? []).length,
    totalComponents: components.components.length,
    activeComponents: activeComponents.length,
    archivedComponents: archivedComponents.length,
  };
}

/**
 * Calculate lesson statistics
 */
function calculateLessonStats(lessons: LessonsFile): LessonStats {
  const activeLessons = lessons.lessons.filter((l) => !l.archived);

  // Count by category
  const byCategory = Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 0])) as Record<
    LLKBCategory,
    number
  >;

  for (const lesson of activeLessons) {
    const category = lesson.category;
    if (category in byCategory) {
      byCategory[category]++;
    }
  }

  // Calculate averages
  let avgConfidence = 0;
  let avgSuccessRate = 0;

  if (activeLessons.length > 0) {
    const confidenceSum = activeLessons.reduce((acc, l) => acc + l.metrics.confidence, 0);
    const successRateSum = activeLessons.reduce((acc, l) => acc + l.metrics.successRate, 0);

    avgConfidence = Math.round((confidenceSum / activeLessons.length) * 100) / 100;
    avgSuccessRate = Math.round((successRateSum / activeLessons.length) * 100) / 100;
  }

  return {
    byCategory,
    avgConfidence,
    avgSuccessRate,
  };
}

/**
 * Calculate component statistics
 */
function calculateComponentStats(components: ComponentsFile): ComponentStats {
  const activeComponents = components.components.filter((c) => !c.archived);

  // Count by category
  const byCategory = Object.fromEntries(COMPONENT_CATEGORIES.map((c) => [c, 0])) as Record<
    ComponentCategory,
    number
  >;

  for (const comp of activeComponents) {
    const category = comp.category;
    if (category in byCategory) {
      byCategory[category]++;
    }
  }

  // Count by scope
  const byScope = Object.fromEntries(ALL_SCOPES.map((s) => [s, 0])) as Record<
    LLKBScope,
    number
  >;

  for (const comp of activeComponents) {
    const scope = comp.scope;
    if (scope in byScope) {
      byScope[scope]++;
    }
  }

  // Calculate reuse metrics
  let totalReuses = 0;
  let avgReusesPerComponent = 0;

  if (activeComponents.length > 0) {
    totalReuses = activeComponents.reduce((acc, c) => acc + (c.metrics.totalUses ?? 0), 0);
    avgReusesPerComponent = Math.round((totalReuses / activeComponents.length) * 100) / 100;
  }

  return {
    byCategory,
    byScope,
    totalReuses,
    avgReusesPerComponent,
  };
}

/**
 * Calculate top performers
 */
function calculateTopPerformers(
  lessons: LessonsFile,
  components: ComponentsFile
): { lessons: TopPerformerLesson[]; components: TopPerformerComponent[] } {
  const activeLessons = lessons.lessons.filter((l) => !l.archived);
  const activeComponents = components.components.filter((c) => !c.archived);

  // Top lessons by (successRate * occurrences)
  const topLessons: TopPerformerLesson[] = activeLessons
    .map((l) => ({
      id: l.id,
      title: l.title,
      score: Math.round(l.metrics.successRate * l.metrics.occurrences * 100) / 100,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Top components by totalUses
  const topComponents: TopPerformerComponent[] = activeComponents
    .map((c) => ({
      id: c.id,
      name: c.name,
      uses: c.metrics.totalUses ?? 0,
    }))
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 5);

  return {
    lessons: topLessons,
    components: topComponents,
  };
}

/**
 * Calculate items needing review
 */
function calculateNeedsReview(
  lessons: LessonsFile,
  components: ComponentsFile
): {
  lowConfidenceLessons: string[];
  lowUsageComponents: string[];
  decliningSuccessRate: string[];
} {
  const activeLessons = lessons.lessons.filter((l) => !l.archived);
  const activeComponents = components.components.filter((c) => !c.archived);
  const now = new Date();

  // Low confidence lessons (< 0.4)
  const lowConfidenceLessons = activeLessons
    .filter((l) => l.metrics.confidence < 0.4)
    .map((l) => l.id);

  // Lessons with declining success rate
  const decliningSuccessRate = activeLessons
    .filter((l) => detectDecliningConfidence(l))
    .map((l) => l.id);

  // Low usage components (< 2 uses and age > 30 days)
  const lowUsageComponents = activeComponents
    .filter((c) => {
      const uses = c.metrics.totalUses ?? 0;
      const extractedAt = new Date(c.source.extractedAt);
      const age = daysBetween(now, extractedAt);
      return uses < 2 && age > 30;
    })
    .map((c) => c.id);

  return {
    lowConfidenceLessons,
    lowUsageComponents,
    decliningSuccessRate,
  };
}

/**
 * Get analytics summary as a formatted string
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Formatted summary string
 */
export function getAnalyticsSummary(llkbRoot: string = DEFAULT_LLKB_ROOT): string {
  const analyticsPath = path.join(llkbRoot, 'analytics.json');
  const analytics = loadJSON<AnalyticsFile>(analyticsPath);

  if (!analytics) {
    return 'Analytics not available';
  }

  const o = analytics.overview;
  const l = analytics.lessonStats;
  const c = analytics.componentStats;

  return [
    `LLKB Analytics (${analytics.lastUpdated})`,
    '─'.repeat(50),
    `Lessons: ${o.activeLessons} active, ${o.archivedLessons} archived`,
    `  Avg Confidence: ${l.avgConfidence}`,
    `  Avg Success Rate: ${l.avgSuccessRate}`,
    `Components: ${o.activeComponents} active, ${o.archivedComponents} archived`,
    `  Total Reuses: ${c.totalReuses}`,
    `  Avg Reuses/Component: ${c.avgReusesPerComponent}`,
    `Items Needing Review: ${analytics.needsReview.lowConfidenceLessons.length + analytics.needsReview.lowUsageComponents.length + analytics.needsReview.decliningSuccessRate.length}`,
  ].join('\n');
}
