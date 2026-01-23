/**
 * Learning Loop for LLKB
 *
 * Records test generation outcomes back to LLKB for continuous improvement.
 * This module enables the learning loop by tracking:
 * - Pattern validations (selector strategies that worked/failed)
 * - Component usage (reusable modules that were applied)
 * - Lesson applications (knowledge that was used)
 *
 * @module llkb/learning
 */

import * as path from 'path';
import type {
  ComponentsFile,
  Lesson,
  LessonsFile,
} from './types.js';
import { appendToHistory, DEFAULT_LLKB_ROOT } from './history.js';
import { updateJSONWithLockSync } from './file-utils.js';
import { calculateConfidence } from './confidence.js';
import { PERCENTAGES } from './constants.js';

// =============================================================================
// Input Types
// =============================================================================

/**
 * Base input for all learning operations
 */
export interface LearningInput {
  /** Journey ID where the learning occurred */
  journeyId: string;

  /** Test file path */
  testFile: string;

  /** Source prompt that triggered the learning */
  prompt: 'journey-implement' | 'journey-verify';

  /** LLKB root directory (optional, defaults to .artk/llkb) */
  llkbRoot?: string;
}

/**
 * Input for recording a pattern learned/validated
 */
export interface PatternLearnedInput extends LearningInput {
  /** The step text that triggered the pattern */
  stepText: string;

  /** The selector that was used */
  selectorUsed: {
    strategy: string;
    value: string;
  };

  /** Whether the pattern worked successfully */
  success: boolean;
}

/**
 * Input for recording a component usage
 */
export interface ComponentUsedInput extends LearningInput {
  /** Component ID that was used */
  componentId: string;

  /** Whether the component worked successfully */
  success: boolean;
}

/**
 * Input for recording a lesson application
 */
export interface LessonAppliedInput extends LearningInput {
  /** Lesson ID that was applied */
  lessonId: string;

  /** Whether the lesson worked successfully */
  success: boolean;

  /** Additional context about the application */
  context?: string;
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Result of a learning operation
 */
export interface LearningResult {
  /** Whether the learning was recorded successfully */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Updated metrics (if applicable) */
  metrics?: {
    confidence?: number;
    successRate?: number;
    occurrences?: number;
    totalUses?: number;
  };

  /** ID of the affected entity (lesson or component) */
  entityId?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate new success rate based on existing metrics and new outcome
 */
function calculateNewSuccessRate(
  currentSuccessRate: number,
  currentOccurrences: number,
  newSuccess: boolean
): number {
  const totalSuccesses = currentSuccessRate * currentOccurrences;
  const newSuccesses = newSuccess ? totalSuccesses + 1 : totalSuccesses;
  const newOccurrences = currentOccurrences + 1;
  return Math.round((newSuccesses / newOccurrences) * PERCENTAGES.FULL) / PERCENTAGES.FULL;
}

/**
 * Find a lesson by pattern or trigger match
 */
function findMatchingLesson(
  lessons: Lesson[],
  selectorValue: string,
  stepText: string
): Lesson | undefined {
  // Try exact match on selector value first
  const exactMatch = lessons.find(
    (l) => !l.archived && l.pattern.includes(selectorValue)
  );
  if (exactMatch) {
    return exactMatch;
  }

  // Try trigger match
  const triggerMatch = lessons.find(
    (l) => !l.archived && l.trigger.toLowerCase().includes(stepText.toLowerCase())
  );
  return triggerMatch;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Record that a selector pattern was learned/validated
 *
 * This function is called after test verification to update LLKB with
 * information about which selector patterns worked or failed.
 *
 * @param input - Pattern learning input
 * @returns Learning result with updated metrics
 *
 * @example
 * ```typescript
 * const result = recordPatternLearned({
 *   journeyId: 'JRN-0001',
 *   testFile: 'tests/login.spec.ts',
 *   prompt: 'journey-verify',
 *   stepText: 'Click the Save button',
 *   selectorUsed: { strategy: 'testid', value: 'btn-save' },
 *   success: true,
 * });
 * ```
 */
export function recordPatternLearned(input: PatternLearnedInput): LearningResult {
  const llkbRoot = input.llkbRoot ?? DEFAULT_LLKB_ROOT;
  const lessonsPath = path.join(llkbRoot, 'lessons.json');

  try {
    let matchedLessonId: string | undefined;
    let updatedMetrics: LearningResult['metrics'] | undefined;

    // Update lessons file if lesson exists
    const updateResult = updateJSONWithLockSync<LessonsFile>(
      lessonsPath,
      (data: LessonsFile) => {
        const existingLesson = findMatchingLesson(
          data.lessons,
          input.selectorUsed.value,
          input.stepText
        );

        if (existingLesson) {
          matchedLessonId = existingLesson.id;

          // Update metrics
          existingLesson.metrics.occurrences++;
          existingLesson.metrics.lastApplied = new Date().toISOString();

          if (input.success) {
            existingLesson.metrics.lastSuccess = new Date().toISOString();
          }

          existingLesson.metrics.successRate = calculateNewSuccessRate(
            existingLesson.metrics.successRate,
            existingLesson.metrics.occurrences - 1,
            input.success
          );

          existingLesson.metrics.confidence = calculateConfidence(existingLesson);

          // Add journey ID if not present
          if (!existingLesson.journeyIds.includes(input.journeyId)) {
            existingLesson.journeyIds.push(input.journeyId);
          }

          updatedMetrics = {
            confidence: existingLesson.metrics.confidence,
            successRate: existingLesson.metrics.successRate,
            occurrences: existingLesson.metrics.occurrences,
          };
        }

        data.lastUpdated = new Date().toISOString();
        return data;
      }
    );

    // Log to history (graceful - doesn't throw on failure)
    // Only log if we matched a lesson
    if (matchedLessonId) {
      appendToHistory(
        {
          event: 'lesson_applied',
          timestamp: new Date().toISOString(),
          journeyId: input.journeyId,
          prompt: input.prompt,
          lessonId: matchedLessonId,
          success: input.success,
          context: input.stepText,
        },
        llkbRoot
      );
    }

    return {
      success: updateResult.success,
      error: updateResult.error,
      metrics: updatedMetrics,
      entityId: matchedLessonId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[LLKB] Failed to record pattern learned: ${message}`);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Record that a component was used
 *
 * This function is called when a reusable component is used in test generation.
 * It updates the component's usage metrics.
 *
 * @param input - Component usage input
 * @returns Learning result with updated metrics
 *
 * @example
 * ```typescript
 * const result = recordComponentUsed({
 *   journeyId: 'JRN-0001',
 *   testFile: 'tests/login.spec.ts',
 *   prompt: 'journey-implement',
 *   componentId: 'COMP012',
 *   success: true,
 * });
 * ```
 */
export function recordComponentUsed(input: ComponentUsedInput): LearningResult {
  const llkbRoot = input.llkbRoot ?? DEFAULT_LLKB_ROOT;
  const componentsPath = path.join(llkbRoot, 'components.json');

  try {
    let foundComponent = false;
    let updatedMetrics: LearningResult['metrics'] | undefined;

    const updateResult = updateJSONWithLockSync<ComponentsFile>(
      componentsPath,
      (data: ComponentsFile) => {
        const component = data.components.find((c) => c.id === input.componentId);

        if (component && !component.archived) {
          foundComponent = true;

          // Update metrics
          component.metrics.totalUses++;
          component.metrics.lastUsed = new Date().toISOString();

          // Update success rate (for both success and failure)
          component.metrics.successRate = calculateNewSuccessRate(
            component.metrics.successRate,
            component.metrics.totalUses - 1,
            input.success
          );

          updatedMetrics = {
            totalUses: component.metrics.totalUses,
            successRate: component.metrics.successRate,
          };
        }

        data.lastUpdated = new Date().toISOString();
        return data;
      }
    );

    // Log to history
    appendToHistory(
      {
        event: 'component_used',
        timestamp: new Date().toISOString(),
        journeyId: input.journeyId,
        prompt: input.prompt,
        componentId: input.componentId,
        success: input.success,
      },
      llkbRoot
    );

    if (!foundComponent) {
      return {
        success: false,
        error: `Component not found: ${input.componentId}`,
      };
    }

    return {
      success: updateResult.success,
      error: updateResult.error,
      metrics: updatedMetrics,
      entityId: input.componentId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[LLKB] Failed to record component used: ${message}`);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Record that a lesson was applied
 *
 * This function is called when a specific lesson is explicitly applied
 * during test generation or verification.
 *
 * @param input - Lesson application input
 * @returns Learning result with updated metrics
 *
 * @example
 * ```typescript
 * const result = recordLessonApplied({
 *   journeyId: 'JRN-0001',
 *   testFile: 'tests/login.spec.ts',
 *   prompt: 'journey-verify',
 *   lessonId: 'L042',
 *   success: true,
 *   context: 'Applied ag-grid wait pattern',
 * });
 * ```
 */
export function recordLessonApplied(input: LessonAppliedInput): LearningResult {
  const llkbRoot = input.llkbRoot ?? DEFAULT_LLKB_ROOT;
  const lessonsPath = path.join(llkbRoot, 'lessons.json');

  try {
    let foundLesson = false;
    let updatedMetrics: LearningResult['metrics'] | undefined;

    const updateResult = updateJSONWithLockSync<LessonsFile>(
      lessonsPath,
      (data: LessonsFile) => {
        const lesson = data.lessons.find((l) => l.id === input.lessonId);

        if (lesson && !lesson.archived) {
          foundLesson = true;

          // Update metrics
          lesson.metrics.occurrences++;
          lesson.metrics.lastApplied = new Date().toISOString();

          if (input.success) {
            lesson.metrics.lastSuccess = new Date().toISOString();
          }

          lesson.metrics.successRate = calculateNewSuccessRate(
            lesson.metrics.successRate,
            lesson.metrics.occurrences - 1,
            input.success
          );

          lesson.metrics.confidence = calculateConfidence(lesson);

          // Add journey ID if not present
          if (!lesson.journeyIds.includes(input.journeyId)) {
            lesson.journeyIds.push(input.journeyId);
          }

          updatedMetrics = {
            confidence: lesson.metrics.confidence,
            successRate: lesson.metrics.successRate,
            occurrences: lesson.metrics.occurrences,
          };
        }

        data.lastUpdated = new Date().toISOString();
        return data;
      }
    );

    // Log to history
    appendToHistory(
      {
        event: 'lesson_applied',
        timestamp: new Date().toISOString(),
        journeyId: input.journeyId,
        prompt: input.prompt,
        lessonId: input.lessonId,
        success: input.success,
        context: input.context,
      },
      llkbRoot
    );

    if (!foundLesson) {
      return {
        success: false,
        error: `Lesson not found: ${input.lessonId}`,
      };
    }

    return {
      success: updateResult.success,
      error: updateResult.error,
      metrics: updatedMetrics,
      entityId: input.lessonId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[LLKB] Failed to record lesson applied: ${message}`);
    return {
      success: false,
      error: message,
    };
  }
}

// =============================================================================
// CLI Helper Functions
// =============================================================================

/**
 * Record learning event from CLI
 *
 * This is a convenience function for the CLI that dispatches to the
 * appropriate recording function based on the event type.
 *
 * @param args - CLI arguments
 * @returns Learning result
 *
 * @example
 * ```bash
 * npx artk-llkb learn --type component --id COMP012 --journey JRN-0001 --success
 * npx artk-llkb learn --type lesson --id L042 --journey JRN-0001 --success --context "grid edit"
 * npx artk-llkb learn --type pattern --journey JRN-0001 --step "Click Save" --selector "btn-save" --success
 * ```
 */
export function recordLearning(args: {
  type: 'pattern' | 'component' | 'lesson';
  journeyId: string;
  testFile?: string;
  prompt?: 'journey-implement' | 'journey-verify';
  id?: string;
  success: boolean;
  context?: string;
  stepText?: string;
  selectorStrategy?: string;
  selectorValue?: string;
  llkbRoot?: string;
}): LearningResult {
  const baseInput: LearningInput = {
    journeyId: args.journeyId,
    testFile: args.testFile ?? 'unknown',
    prompt: args.prompt ?? 'journey-verify',
    llkbRoot: args.llkbRoot,
  };

  switch (args.type) {
    case 'pattern':
      return recordPatternLearned({
        ...baseInput,
        stepText: args.stepText ?? args.context ?? '',
        selectorUsed: {
          strategy: args.selectorStrategy ?? 'unknown',
          value: args.selectorValue ?? '',
        },
        success: args.success,
      });

    case 'component':
      if (!args.id) {
        return {
          success: false,
          error: 'Component ID is required for component learning',
        };
      }
      return recordComponentUsed({
        ...baseInput,
        componentId: args.id,
        success: args.success,
      });

    case 'lesson':
      if (!args.id) {
        return {
          success: false,
          error: 'Lesson ID is required for lesson learning',
        };
      }
      return recordLessonApplied({
        ...baseInput,
        lessonId: args.id,
        success: args.success,
        context: args.context,
      });

    default:
      return {
        success: false,
        error: `Unknown learning type: ${String(args.type)}`,
      };
  }
}

/**
 * Format learning result for console output
 */
export function formatLearningResult(result: LearningResult): string {
  const lines: string[] = [];

  if (result.success) {
    lines.push('Learning recorded successfully');
    if (result.entityId) {
      lines.push(`  Entity: ${result.entityId}`);
    }
    if (result.metrics) {
      lines.push('  Updated metrics:');
      if (result.metrics.confidence !== undefined) {
        lines.push(`    - Confidence: ${result.metrics.confidence}`);
      }
      if (result.metrics.successRate !== undefined) {
        lines.push(`    - Success Rate: ${result.metrics.successRate}`);
      }
      if (result.metrics.occurrences !== undefined) {
        lines.push(`    - Occurrences: ${result.metrics.occurrences}`);
      }
      if (result.metrics.totalUses !== undefined) {
        lines.push(`    - Total Uses: ${result.metrics.totalUses}`);
      }
    }
  } else {
    lines.push('Learning recording failed');
    if (result.error) {
      lines.push(`  Error: ${result.error}`);
    }
  }

  return lines.join('\n');
}
