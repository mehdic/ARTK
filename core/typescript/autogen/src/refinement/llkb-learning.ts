/**
 * @module refinement/llkb-learning
 * @description Record successful fixes to LLKB for future learning
 */

import {
  LessonLearned,
  CodeFix,
  ErrorAnalysis,
  RefinementSession,
  ErrorCategory,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// LLKB STORAGE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface LLKBStorage {
  saveLessons(_lessons: LessonLearned[]): Promise<void>;
  getLessons(_filter: LessonFilter): Promise<LessonLearned[]>;
  updateLessonConfidence(_lessonId: string, _newConfidence: number): Promise<void>;
  markLessonAsVerified(_lessonId: string, _verified: boolean): Promise<void>;
}

export interface LessonFilter {
  journeyId?: string;
  errorCategory?: ErrorCategory;
  type?: LessonLearned['type'];
  minConfidence?: number;
  verified?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// LESSON EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

export interface LessonExtractionOptions {
  minConfidence: number;
  includeUnverified: boolean;
  maxLessonsPerSession: number;
}

const DEFAULT_EXTRACTION_OPTIONS: LessonExtractionOptions = {
  minConfidence: 0.7,
  includeUnverified: false,
  maxLessonsPerSession: 10,
};

/**
 * Extract lessons from a completed refinement session
 */
export function extractLessonsFromSession(
  session: RefinementSession,
  options: Partial<LessonExtractionOptions> = {}
): LessonLearned[] {
  const opts = { ...DEFAULT_EXTRACTION_OPTIONS, ...options };
  const lessons: LessonLearned[] = [];

  for (const attempt of session.attempts) {
    // Only learn from successful or partial success attempts
    if (attempt.outcome !== 'success' && attempt.outcome !== 'partial') {
      continue;
    }

    // Only learn from attempts with applied fixes
    if (!attempt.appliedFix) {
      continue;
    }

    const fix = attempt.appliedFix;

    // Check confidence threshold
    if (fix.confidence < opts.minConfidence) {
      continue;
    }

    // Create lesson
    const lesson = createLessonFromFix(
      session.journeyId,
      fix,
      attempt.error,
      attempt.outcome === 'success' // verified only if full success
    );

    if (lesson && (lesson.verified || opts.includeUnverified)) {
      lessons.push(lesson);
    }

    // Respect max lessons limit
    if (lessons.length >= opts.maxLessonsPerSession) {
      break;
    }
  }

  return lessons;
}

/**
 * Create a lesson from a successful fix
 */
function createLessonFromFix(
  journeyId: string,
  fix: CodeFix,
  error: ErrorAnalysis,
  verified: boolean
): LessonLearned | undefined {
  const type = mapFixTypeToLessonType(fix.type);
  if (!type) {
    return undefined;
  }

  return {
    id: generateLessonId(journeyId, fix, error),
    type,
    context: {
      journeyId,
      errorCategory: error.category,
      originalSelector: error.selector,
      element: extractElementDescription(fix, error),
    },
    solution: {
      pattern: extractPattern(fix),
      code: fix.fixedCode,
      explanation: fix.reasoning || fix.description,
    },
    confidence: fix.confidence,
    createdAt: new Date(),
    verified,
  };
}

function mapFixTypeToLessonType(fixType: string): LessonLearned['type'] | undefined {
  switch (fixType) {
    case 'SELECTOR_CHANGE':
    case 'LOCATOR_STRATEGY_CHANGED':
    case 'FRAME_CONTEXT_ADDED':
      return 'selector_pattern';
    case 'WAIT_ADDED':
    case 'TIMEOUT_INCREASED':
    case 'RETRY_ADDED':
      return 'wait_strategy';
    case 'FLOW_REORDERED':
      return 'flow_pattern';
    case 'ASSERTION_MODIFIED':
    case 'ERROR_HANDLING_ADDED':
    case 'OTHER':
      return 'error_fix';
    default:
      return undefined;
  }
}

function generateLessonId(journeyId: string, fix: CodeFix, error: ErrorAnalysis): string {
  const timestamp = Date.now();
  const fixHash = hashString(fix.fixedCode.substring(0, 50));
  return `lesson-${journeyId}-${error.category}-${fixHash}-${timestamp}`;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

function extractElementDescription(fix: CodeFix, error: ErrorAnalysis): string {
  // Try to extract element description from various sources
  if (fix.location.stepDescription) {
    return fix.location.stepDescription;
  }

  if (error.selector) {
    return extractElementFromSelector(error.selector);
  }

  // Try to extract from fixed code
  const locatorMatch = fix.fixedCode.match(/getBy\w+\(['"]([^'"]+)['"]\)/);
  if (locatorMatch && locatorMatch[1]) {
    return locatorMatch[1];
  }

  return 'unknown element';
}

function extractElementFromSelector(selector: string): string {
  // Extract meaningful element description from selector
  const testIdMatch = selector.match(/data-testid[=~*^$]*["']?([^"'\]]+)/);
  if (testIdMatch && testIdMatch[1]) {
    return testIdMatch[1];
  }

  const roleMatch = selector.match(/role=["']?([^"'\]]+)/);
  if (roleMatch && roleMatch[1]) {
    return roleMatch[1];
  }

  const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);
  if (classMatch && classMatch[1]) {
    return classMatch[1];
  }

  return selector.substring(0, 30);
}

function extractPattern(fix: CodeFix): string {
  // Extract a generalizable pattern from the fix
  switch (fix.type) {
    case 'SELECTOR_CHANGE':
      return extractSelectorPattern(fix.fixedCode);
    case 'WAIT_ADDED':
      return extractWaitPattern(fix.fixedCode);
    case 'ASSERTION_MODIFIED':
      return extractAssertionPattern(fix.fixedCode);
    default:
      return fix.type;
  }
}

function extractSelectorPattern(code: string): string {
  // Identify the selector strategy used
  if (code.includes('getByTestId')) return 'testid';
  if (code.includes('getByRole')) return 'role';
  if (code.includes('getByText')) return 'text';
  if (code.includes('getByLabel')) return 'label';
  if (code.includes('getByPlaceholder')) return 'placeholder';
  if (code.includes('locator')) return 'css';
  return 'unknown';
}

function extractWaitPattern(code: string): string {
  if (code.includes('waitForSelector')) return 'waitForSelector';
  if (code.includes('waitForLoadState')) return 'waitForLoadState';
  if (code.includes('waitForResponse')) return 'waitForResponse';
  if (code.includes('waitForTimeout')) return 'waitForTimeout';
  if (code.includes('toBeVisible')) return 'expectVisible';
  return 'unknown';
}

function extractAssertionPattern(code: string): string {
  if (code.includes('toHaveText')) return 'toHaveText';
  if (code.includes('toHaveValue')) return 'toHaveValue';
  if (code.includes('toBeVisible')) return 'toBeVisible';
  if (code.includes('toBeEnabled')) return 'toBeEnabled';
  if (code.includes('toHaveCount')) return 'toHaveCount';
  return 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════
// LESSON AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════

export interface AggregatedPattern {
  pattern: string;
  occurrences: number;
  averageConfidence: number;
  contexts: string[];
  representativeCode: string;
}

/**
 * Aggregate similar lessons into patterns
 */
export function aggregateLessons(lessons: LessonLearned[]): AggregatedPattern[] {
  const patterns = new Map<string, {
    occurrences: number;
    totalConfidence: number;
    contexts: Set<string>;
    codes: string[];
  }>();

  for (const lesson of lessons) {
    const key = `${lesson.type}:${lesson.solution.pattern}`;
    const existing = patterns.get(key);

    if (existing) {
      existing.occurrences++;
      existing.totalConfidence += lesson.confidence;
      existing.contexts.add(lesson.context.errorCategory);
      existing.codes.push(lesson.solution.code);
    } else {
      patterns.set(key, {
        occurrences: 1,
        totalConfidence: lesson.confidence,
        contexts: new Set([lesson.context.errorCategory]),
        codes: [lesson.solution.code],
      });
    }
  }

  return Array.from(patterns.entries())
    .map(([key, data]) => ({
      pattern: key,
      occurrences: data.occurrences,
      averageConfidence: data.totalConfidence / data.occurrences,
      contexts: Array.from(data.contexts),
      representativeCode: data.codes[0] || '', // Use first occurrence as representative
    }))
    .sort((a, b) => b.occurrences - a.occurrences);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE ADJUSTMENT
// ═══════════════════════════════════════════════════════════════════════════

export interface ConfidenceAdjustment {
  lessonId: string;
  oldConfidence: number;
  newConfidence: number;
  reason: 'success' | 'failure' | 'decay';
}

/**
 * Calculate confidence adjustment based on outcome
 */
export function calculateConfidenceAdjustment(
  lesson: LessonLearned,
  outcome: 'success' | 'failure',
  currentUsageCount: number
): ConfidenceAdjustment {
  const oldConfidence = lesson.confidence;
  let newConfidence: number;
  let reason: ConfidenceAdjustment['reason'];

  if (outcome === 'success') {
    // Increase confidence, with diminishing returns
    const increment = 0.05 * Math.pow(0.9, currentUsageCount);
    newConfidence = Math.min(1.0, oldConfidence + increment);
    reason = 'success';
  } else {
    // Decrease confidence more aggressively
    const decrement = 0.1 * Math.pow(1.1, currentUsageCount);
    newConfidence = Math.max(0.0, oldConfidence - decrement);
    reason = 'failure';
  }

  return {
    lessonId: lesson.id,
    oldConfidence,
    newConfidence,
    reason,
  };
}

/**
 * Apply time-based decay to confidence scores
 */
export function applyConfidenceDecay(
  lessons: LessonLearned[],
  decayRate: number = 0.01,
  referenceDate: Date = new Date()
): ConfidenceAdjustment[] {
  const adjustments: ConfidenceAdjustment[] = [];

  for (const lesson of lessons) {
    const ageInDays = (referenceDate.getTime() - lesson.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays > 30) { // Only decay lessons older than 30 days
      const decayFactor = Math.pow(1 - decayRate, Math.floor(ageInDays / 30));
      const newConfidence = lesson.confidence * decayFactor;

      if (newConfidence !== lesson.confidence) {
        adjustments.push({
          lessonId: lesson.id,
          oldConfidence: lesson.confidence,
          newConfidence,
          reason: 'decay',
        });
      }
    }
  }

  return adjustments;
}

// ═══════════════════════════════════════════════════════════════════════════
// LESSON RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface LessonRecommendation {
  lesson: LessonLearned;
  relevanceScore: number;
  applicabilityReason: string;
}

/**
 * Recommend lessons that might help fix given errors
 */
export function recommendLessons(
  errors: ErrorAnalysis[],
  availableLessons: LessonLearned[],
  maxRecommendations: number = 5
): LessonRecommendation[] {
  const recommendations: LessonRecommendation[] = [];

  for (const lesson of availableLessons) {
    // Skip low-confidence or unverified lessons
    if (lesson.confidence < 0.6 || !lesson.verified) {
      continue;
    }

    for (const error of errors) {
      const relevance = calculateRelevance(lesson, error);
      if (relevance > 0) {
        recommendations.push({
          lesson,
          relevanceScore: relevance * lesson.confidence,
          applicabilityReason: explainRelevance(lesson, error),
        });
        break; // One recommendation per lesson
      }
    }
  }

  return recommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxRecommendations);
}

function calculateRelevance(lesson: LessonLearned, error: ErrorAnalysis): number {
  let score = 0;

  // Same error category is highly relevant
  if (lesson.context.errorCategory === error.category) {
    score += 0.5;
  }

  // Similar selector patterns
  if (lesson.context.originalSelector && error.selector) {
    const similarity = calculateSelectorSimilarity(
      lesson.context.originalSelector,
      error.selector
    );
    score += similarity * 0.3;
  }

  // Lesson type matches suggested fix types
  const suggestedFixes = getSuggestedFixTypesForLesson(error.category);
  if (suggestedFixes.includes(lessonTypeToFixType(lesson.type))) {
    score += 0.2;
  }

  return score;
}

function calculateSelectorSimilarity(selector1: string, selector2: string): number {
  // Simple similarity based on common strategies
  const strategy1 = extractSelectorStrategy(selector1);
  const strategy2 = extractSelectorStrategy(selector2);

  if (strategy1 === strategy2) {
    return 0.8;
  }

  // Both are attribute-based
  if (['testid', 'role', 'label'].includes(strategy1) &&
      ['testid', 'role', 'label'].includes(strategy2)) {
    return 0.5;
  }

  return 0.2;
}

function extractSelectorStrategy(selector: string): string {
  if (selector.includes('data-testid')) return 'testid';
  if (selector.includes('role=')) return 'role';
  if (selector.includes('aria-label')) return 'label';
  if (selector.match(/^[.#]/)) return 'css';
  return 'other';
}

function explainRelevance(lesson: LessonLearned, error: ErrorAnalysis): string {
  const reasons: string[] = [];

  if (lesson.context.errorCategory === error.category) {
    reasons.push(`Same error type: ${error.category}`);
  }

  if (lesson.context.originalSelector && error.selector) {
    reasons.push('Similar selector pattern');
  }

  reasons.push(`Solution: ${lesson.solution.pattern}`);

  return reasons.join('; ');
}

function getSuggestedFixTypesForLesson(category: ErrorCategory): string[] {
  switch (category) {
    case 'SELECTOR_NOT_FOUND':
      return ['SELECTOR_CHANGE', 'LOCATOR_STRATEGY_CHANGED'];
    case 'TIMEOUT':
      return ['WAIT_ADDED', 'TIMEOUT_INCREASED'];
    case 'ASSERTION_FAILED':
      return ['ASSERTION_MODIFIED'];
    default:
      return ['OTHER'];
  }
}

function lessonTypeToFixType(lessonType: LessonLearned['type']): string {
  switch (lessonType) {
    case 'selector_pattern':
      return 'SELECTOR_CHANGE';
    case 'wait_strategy':
      return 'WAIT_ADDED';
    case 'flow_pattern':
      return 'FLOW_REORDERED';
    case 'error_fix':
      return 'OTHER';
  }
}
