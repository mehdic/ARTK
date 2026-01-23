/**
 * LLKB Adapter Transform Functions
 *
 * This module provides functions to transform LLKB data structures
 * (lessons, components) into AutoGen-compatible formats.
 *
 * @module llkb/adapter-transforms
 */

import type { Component, Lesson } from './types.js';
import type {
  AdditionalPattern,
  GlossaryEntry,
  IRPrimitive,
  ModuleMapping,
  PatternSource,
  SelectorOverride,
  TimingHint,
} from './adapter-types.js';
import { CONFIDENCE, TIMEOUTS } from './constants.js';

// =============================================================================
// Category to Primitive Type Mapping
// =============================================================================

/**
 * Map LLKB categories to IR primitive types
 */
function categoryToPrimitiveType(
  category: string
): 'callModule' | 'click' | 'fill' | 'navigate' | 'wait' | 'assert' {
  switch (category) {
    case 'navigation':
      return 'navigate';
    case 'timing':
      return 'wait';
    case 'assertion':
      return 'assert';
    case 'selector':
    case 'ui-interaction':
      return 'click';
    default:
      return 'callModule';
  }
}

/**
 * Infer module name from component category
 */
function inferModuleFromCategory(category: string): string {
  switch (category) {
    case 'selector':
      return 'selectors';
    case 'timing':
      return 'timing';
    case 'auth':
      return 'auth';
    case 'data':
      return 'data';
    case 'assertion':
      return 'assertions';
    case 'navigation':
      return 'navigation';
    case 'ui-interaction':
      return 'ui';
    default:
      return 'helpers';
  }
}

// =============================================================================
// Trigger to Regex Conversion
// =============================================================================

/**
 * Convert a lesson trigger phrase into a regex pattern
 *
 * This is heuristic-based: it takes the trigger description and
 * attempts to create a flexible regex that matches similar phrases.
 *
 * @param trigger - The trigger phrase from the lesson
 * @returns Regex pattern string or null if conversion fails
 */
export function triggerToRegex(trigger: string): string | null {
  if (!trigger || trigger.trim().length === 0) {
    return null;
  }

  // Escape special regex characters first
  let pattern = trigger
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Make common variations optional
    .replace(/\\bthe\\b/gi, '(?:the\\s+)?')
    .replace(/\\ba\\b/gi, '(?:a\\s+)?')
    .replace(/\\ban\\b/gi, '(?:an\\s+)?');

  // Allow flexible whitespace
  pattern = pattern.replace(/\s+/g, '\\s+');

  // Make it case-insensitive compatible
  pattern = `(?i)${pattern}`;

  return pattern;
}

/**
 * Convert component name to a trigger pattern
 *
 * @param name - The component function name (e.g., "waitForAgGridLoad")
 * @returns Natural language trigger pattern
 */
export function componentNameToTrigger(name: string): string {
  // Split camelCase into words
  const words = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim()
    .split(/\s+/);

  // Build flexible regex pattern
  const pattern = words
    .map((word) => {
      // Handle common abbreviations
      if (word === 'ag' || word === 'aggrid') {
        return '(?:ag-?)?grid';
      }
      return word;
    })
    .join('\\s+');

  return `(?:${pattern})`;
}

/**
 * Generate natural language variations for a component name
 *
 * @param name - The component function name
 * @returns Array of natural language phrases
 */
export function generateNameVariations(name: string): string[] {
  const variations: string[] = [];

  // Split camelCase into words
  const words = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();

  // Add the basic form
  variations.push(words);

  // Add "the" prefix form
  variations.push(`the ${words}`);

  // Handle special cases
  if (words.includes('grid')) {
    variations.push(words.replace('grid', 'ag-grid'));
    variations.push(words.replace('grid', 'ag grid'));
  }

  if (words.includes('wait for')) {
    // "wait for X to load" -> "X loads"
    const afterWaitFor = words.replace('wait for ', '').replace(' to load', '');
    variations.push(`${afterWaitFor} loads`);
    variations.push(`${afterWaitFor} is loaded`);
  }

  return [...new Set(variations)]; // Remove duplicates
}

// =============================================================================
// Lesson Transform Functions
// =============================================================================

/**
 * Transform a lesson into an additional pattern for AutoGen
 *
 * Only applicable to lessons in certain categories that have
 * clear trigger patterns that can be converted to regex.
 *
 * @param lesson - The lesson to transform
 * @returns AdditionalPattern or null if not applicable
 */
export function lessonToPattern(lesson: Lesson): AdditionalPattern | null {
  // Only certain categories can become patterns
  const patternCategories = ['selector', 'timing', 'navigation', 'ui-interaction'];

  if (!patternCategories.includes(lesson.category)) {
    return null;
  }

  // Require minimum confidence
  if (lesson.metrics.confidence < CONFIDENCE.DEFAULT_WEIGHT) {
    return null;
  }

  // Try to convert trigger to regex
  const regex = triggerToRegex(lesson.trigger);
  if (!regex) {
    return null;
  }

  const source: PatternSource = {
    lessonId: lesson.id,
    confidence: lesson.metrics.confidence,
    occurrences: lesson.metrics.occurrences,
  };

  return {
    name: `llkb-${lesson.id.toLowerCase()}`,
    regex,
    primitiveType: categoryToPrimitiveType(lesson.category),
    source,
  };
}

/**
 * Transform a lesson into a selector override
 *
 * Applicable to lessons in the 'selector' category that describe
 * specific selector patterns or fixes.
 *
 * @param lesson - The lesson to transform
 * @returns SelectorOverride or null if not applicable
 */
export function lessonToSelectorOverride(lesson: Lesson): SelectorOverride | null {
  if (lesson.category !== 'selector') {
    return null;
  }

  // Look for selector patterns in the lesson pattern
  const pattern = lesson.pattern;

  // Try to extract selector strategy and value from pattern
  // Common patterns: "use data-testid", "use role", "use label"
  const testIdMatch = pattern.match(/data-testid[=:]\s*["']?([^"'\s]+)["']?/i);
  const roleMatch = pattern.match(/role[=:]\s*["']?([^"'\s]+)["']?/i);
  const labelMatch = pattern.match(/aria-label[=:]\s*["']?([^"'\s]+)["']?/i);

  let strategy: 'testid' | 'role' | 'label' | 'css' | 'xpath' = 'testid';
  let value = '';

  if (testIdMatch?.[1]) {
    strategy = 'testid';
    value = testIdMatch[1];
  } else if (roleMatch?.[1]) {
    strategy = 'role';
    value = roleMatch[1];
  } else if (labelMatch?.[1]) {
    strategy = 'label';
    value = labelMatch[1];
  } else {
    // Cannot extract a valid selector override
    return null;
  }

  const source: PatternSource = {
    lessonId: lesson.id,
    confidence: lesson.metrics.confidence,
    occurrences: lesson.metrics.occurrences,
  };

  return {
    pattern: lesson.trigger,
    override: {
      strategy,
      value,
    },
    source,
  };
}

/**
 * Transform a lesson into a timing hint
 *
 * Applicable to lessons in the 'timing' category that describe
 * wait times or delays.
 *
 * @param lesson - The lesson to transform
 * @returns TimingHint or null if not applicable
 */
export function lessonToTimingHint(lesson: Lesson): TimingHint | null {
  if (lesson.category !== 'timing') {
    return null;
  }

  // Try to extract wait time from pattern
  const pattern = lesson.pattern;
  const waitMatch = pattern.match(/wait\s*(?:for\s*)?\s*(\d+)\s*(?:ms|milliseconds?)?/i);
  const timeoutMatch = pattern.match(/timeout\s*(?:of\s*)?\s*(\d+)\s*(?:ms|milliseconds?)?/i);
  const delayMatch = pattern.match(/delay\s*(?:of\s*)?\s*(\d+)\s*(?:ms|milliseconds?)?/i);

  let waitMs = 0;

  if (waitMatch?.[1]) {
    waitMs = parseInt(waitMatch[1], 10);
  } else if (timeoutMatch?.[1]) {
    waitMs = parseInt(timeoutMatch[1], 10);
  } else if (delayMatch?.[1]) {
    waitMs = parseInt(delayMatch[1], 10);
  }

  // If no explicit time found, use a sensible default based on pattern keywords
  if (waitMs === 0) {
    if (pattern.toLowerCase().includes('animation')) {
      waitMs = TIMEOUTS.SHORT_MS;
    } else if (pattern.toLowerCase().includes('load')) {
      waitMs = TIMEOUTS.MEDIUM_MS;
    } else if (pattern.toLowerCase().includes('network')) {
      waitMs = TIMEOUTS.LONG_MS;
    } else {
      // Cannot determine timing
      return null;
    }
  }

  const source: PatternSource = {
    lessonId: lesson.id,
    confidence: lesson.metrics.confidence,
    occurrences: lesson.metrics.occurrences,
  };

  return {
    trigger: lesson.trigger,
    waitMs,
    source,
  };
}

// =============================================================================
// Component Transform Functions
// =============================================================================

/**
 * Transform a component into a module mapping
 *
 * @param component - The component to transform
 * @returns ModuleMapping
 */
export function componentToModule(component: Component): ModuleMapping {
  const trigger = componentNameToTrigger(component.name);

  return {
    name: component.name,
    trigger,
    componentId: component.id,
    importPath: component.filePath,
    confidence: component.metrics.successRate,
  };
}

/**
 * Transform a component into glossary entries
 *
 * Generates multiple glossary entries for natural language variations
 * that map to the same component.
 *
 * @param component - The component to transform
 * @returns Array of [phrase, primitive] tuples
 */
export function componentToGlossaryEntries(
  component: Component
): GlossaryEntry[] {
  const entries: GlossaryEntry[] = [];
  const variations = generateNameVariations(component.name);
  const moduleName = inferModuleFromCategory(component.category);

  const primitive: IRPrimitive = {
    type: 'callModule',
    module: moduleName,
    method: component.name,
  };

  for (const phrase of variations) {
    entries.push({
      phrase,
      primitive,
      sourceId: component.id,
      confidence: component.metrics.successRate,
    });
  }

  return entries;
}

/**
 * Transform a lesson into glossary entries
 *
 * @param lesson - The lesson to transform
 * @returns Array of GlossaryEntry or empty if not applicable
 */
export function lessonToGlossaryEntries(lesson: Lesson): GlossaryEntry[] {
  // Only certain categories make sense as glossary entries
  const glossaryCategories = ['navigation', 'ui-interaction', 'assertion'];

  if (!glossaryCategories.includes(lesson.category)) {
    return [];
  }

  const primitive: IRPrimitive = {
    type: categoryToPrimitiveType(lesson.category),
  };

  // Generate a phrase from the trigger
  const phrase = lesson.trigger.toLowerCase().trim();

  if (!phrase) {
    return [];
  }

  return [
    {
      phrase,
      primitive,
      sourceId: lesson.id,
      confidence: lesson.metrics.confidence,
    },
  ];
}
