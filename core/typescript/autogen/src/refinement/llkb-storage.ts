/**
 * @module refinement/llkb-storage
 * @description LLKB (Living Learned Knowledge Base) storage for refinement lessons
 *
 * Persists lessons learned during test generation and refinement cycles
 * so they can be reused in future generation runs.
 *
 * @see research/2026-02-02_autogen-enhancement-implementation-plan.md
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { getLlkbRoot } from '../utils/paths.js';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LlkbLesson {
  id: string;
  type: LessonType;
  pattern: string;
  context: LessonContext;
  fix: LessonFix;
  confidence: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  lastUsedAt?: string;
  lastSuccessAt?: string;
}

export type LessonType =
  | 'selector'      // Selector strategy lesson
  | 'timing'        // Wait/timeout adjustment
  | 'assertion'     // Assertion pattern
  | 'navigation'    // Navigation pattern
  | 'form'          // Form interaction pattern
  | 'error-fix';    // Error → fix mapping

export interface LessonContext {
  errorType?: string;
  errorMessage?: string;
  stepType?: string;
  pageContext?: string;
  componentType?: string;
}

export interface LessonFix {
  type: 'replace' | 'insert' | 'wrap' | 'config';
  pattern: string;
  replacement: string;
  explanation: string;
}

export interface LlkbStore {
  version: '1.0';
  lessons: LlkbLesson[];
  stats: LlkbStats;
  lastUpdated: string;
}

export interface LlkbStats {
  totalLessons: number;
  lessonsByType: Record<LessonType, number>;
  avgConfidence: number;
  totalApplications: number;
  successRate: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════

const LLKB_REFINEMENT_FILE = 'refinement-lessons.json';

/**
 * Get the path to the LLKB refinement lessons file
 */
export function getLlkbRefinementPath(): string {
  return join(getLlkbRoot(), LLKB_REFINEMENT_FILE);
}

/**
 * Create an empty LLKB store
 */
function createEmptyStore(): LlkbStore {
  return {
    version: '1.0',
    lessons: [],
    stats: {
      totalLessons: 0,
      lessonsByType: {
        'selector': 0,
        'timing': 0,
        'assertion': 0,
        'navigation': 0,
        'form': 0,
        'error-fix': 0,
      },
      avgConfidence: 0,
      totalApplications: 0,
      successRate: 0,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Load the LLKB store from disk
 */
export function loadLlkbStore(): LlkbStore {
  const path = getLlkbRefinementPath();

  if (!existsSync(path)) {
    return createEmptyStore();
  }

  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as LlkbStore;
  } catch {
    // Return empty store on parse error
    return createEmptyStore();
  }
}

/**
 * Save the LLKB store to disk
 */
export function saveLlkbStore(store: LlkbStore): void {
  const path = getLlkbRefinementPath();
  const dir = dirname(path);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  store.lastUpdated = new Date().toISOString();
  updateStats(store);

  writeFileSync(path, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Update store statistics
 */
function updateStats(store: LlkbStore): void {
  const stats = store.stats;
  stats.totalLessons = store.lessons.length;

  // Reset type counts
  for (const type of Object.keys(stats.lessonsByType) as LessonType[]) {
    stats.lessonsByType[type] = 0;
  }

  // Count lessons by type and calculate averages
  let totalConfidence = 0;
  let totalApplications = 0;
  let totalSuccesses = 0;

  for (const lesson of store.lessons) {
    stats.lessonsByType[lesson.type]++;
    totalConfidence += lesson.confidence;
    totalApplications += lesson.successCount + lesson.failureCount;
    totalSuccesses += lesson.successCount;
  }

  stats.avgConfidence = store.lessons.length > 0
    ? totalConfidence / store.lessons.length
    : 0;

  stats.totalApplications = totalApplications;
  stats.successRate = totalApplications > 0
    ? totalSuccesses / totalApplications
    : 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// LESSON MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique lesson ID
 */
function generateLessonId(type: LessonType, pattern: string): string {
  const hash = pattern.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `${type}-${Math.abs(hash).toString(36)}`;
}

/**
 * Find an existing lesson by type and pattern
 */
export function findLesson(
  store: LlkbStore,
  type: LessonType,
  pattern: string
): LlkbLesson | undefined {
  return store.lessons.find(l =>
    l.type === type && l.pattern === pattern
  );
}

/**
 * Find lessons matching a context
 */
export function findLessonsForContext(
  store: LlkbStore,
  context: Partial<LessonContext>,
  minConfidence = 0.5
): LlkbLesson[] {
  return store.lessons.filter(lesson => {
    // Must meet minimum confidence
    if (lesson.confidence < minConfidence) {
      return false;
    }

    // Match context fields
    const lc = lesson.context;

    if (context.errorType && lc.errorType !== context.errorType) {
      return false;
    }

    if (context.stepType && lc.stepType !== context.stepType) {
      return false;
    }

    if (context.componentType && lc.componentType !== context.componentType) {
      return false;
    }

    // Partial match on error message
    if (context.errorMessage && lc.errorMessage) {
      const contextWords = context.errorMessage.toLowerCase().split(/\s+/);
      const lessonWords = lc.errorMessage.toLowerCase().split(/\s+/);
      const overlap = contextWords.filter(w => lessonWords.includes(w));
      if (overlap.length < Math.min(3, contextWords.length * 0.5)) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => b.confidence - a.confidence);
}

/**
 * Add or update a lesson
 */
export function addLesson(
  store: LlkbStore,
  type: LessonType,
  pattern: string,
  context: LessonContext,
  fix: LessonFix,
  initialConfidence = 0.5
): LlkbLesson {
  const existing = findLesson(store, type, pattern);

  if (existing) {
    // Update existing lesson
    existing.context = { ...existing.context, ...context };
    existing.fix = fix;
    existing.lastUsedAt = new Date().toISOString();
    return existing;
  }

  // Create new lesson
  const lesson: LlkbLesson = {
    id: generateLessonId(type, pattern),
    type,
    pattern,
    context,
    fix,
    confidence: initialConfidence,
    successCount: 0,
    failureCount: 0,
    createdAt: new Date().toISOString(),
  };

  store.lessons.push(lesson);
  return lesson;
}

/**
 * Record a successful application of a lesson
 */
export function recordSuccess(store: LlkbStore, lessonId: string): void {
  const lesson = store.lessons.find(l => l.id === lessonId);
  if (lesson) {
    lesson.successCount++;
    lesson.lastSuccessAt = new Date().toISOString();
    lesson.lastUsedAt = new Date().toISOString();

    // Increase confidence (capped at 0.95)
    lesson.confidence = Math.min(0.95, lesson.confidence + 0.05);
  }
}

/**
 * Record a failed application of a lesson
 */
export function recordFailure(store: LlkbStore, lessonId: string): void {
  const lesson = store.lessons.find(l => l.id === lessonId);
  if (lesson) {
    lesson.failureCount++;
    lesson.lastUsedAt = new Date().toISOString();

    // Decrease confidence (floored at 0.1)
    lesson.confidence = Math.max(0.1, lesson.confidence - 0.1);
  }
}

/**
 * Remove low-confidence lessons
 */
export function pruneLessons(
  store: LlkbStore,
  minConfidence = 0.2,
  minApplications = 3
): number {
  const before = store.lessons.length;

  store.lessons = store.lessons.filter(lesson => {
    const applications = lesson.successCount + lesson.failureCount;
    // Keep if not enough applications yet OR confidence is good
    return applications < minApplications || lesson.confidence >= minConfidence;
  });

  return before - store.lessons.length;
}

// ═══════════════════════════════════════════════════════════════════════════
// REFINEMENT INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Learn from a successful refinement
 */
export function learnFromRefinement(
  errorType: string,
  errorMessage: string,
  originalCode: string,
  fixedCode: string,
  stepType?: string
): LlkbLesson {
  const store = loadLlkbStore();

  // Create pattern from error
  const pattern = `${errorType}:${errorMessage.substring(0, 50)}`;

  // Determine fix type
  let fixType: LessonFix['type'] = 'replace';
  if (fixedCode.length > originalCode.length * 1.5) {
    fixType = 'wrap';
  } else if (!originalCode.trim()) {
    fixType = 'insert';
  }

  const lesson = addLesson(
    store,
    'error-fix',
    pattern,
    {
      errorType,
      errorMessage: errorMessage.substring(0, 200),
      stepType,
    },
    {
      type: fixType,
      pattern: originalCode,
      replacement: fixedCode,
      explanation: `Fix for ${errorType} error`,
    },
    0.6 // Start with higher confidence since it worked
  );

  recordSuccess(store, lesson.id);
  saveLlkbStore(store);

  return lesson;
}

/**
 * Get suggested fixes for an error
 */
export function getSuggestedFixes(
  errorType: string,
  errorMessage: string,
  stepType?: string
): LlkbLesson[] {
  const store = loadLlkbStore();

  return findLessonsForContext(store, {
    errorType,
    errorMessage,
    stepType,
  });
}

/**
 * Apply a learned fix and record result
 */
export function applyLearnedFix(
  lessonId: string,
  success: boolean
): void {
  const store = loadLlkbStore();

  if (success) {
    recordSuccess(store, lessonId);
  } else {
    recordFailure(store, lessonId);
  }

  saveLlkbStore(store);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT FOR ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Export lessons as JSON for the orchestrating LLM
 */
export function exportLessonsForOrchestrator(): {
  lessons: LlkbLesson[];
  stats: LlkbStats;
  exportedAt: string;
} {
  const store = loadLlkbStore();

  // Only export high-confidence lessons
  const exportLessons = store.lessons
    .filter(l => l.confidence >= 0.5)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 100); // Limit to top 100

  return {
    lessons: exportLessons,
    stats: store.stats,
    exportedAt: new Date().toISOString(),
  };
}
