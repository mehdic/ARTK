/**
 * LLKB Component Matching Module
 *
 * This module provides functions to match journey steps to existing components
 * and determine whether code should be extracted as a reusable component.
 *
 * @module llkb/matching
 */

import type {
  Component,
  ComponentCategory,
  LLKBScope,
  LLKBConfig,
  ExtractionCandidate,
} from './types.js';
import { normalizeCode, hashCode, countLines } from './normalize.js';
import { calculateSimilarity } from './similarity.js';
import { inferCategory } from './inference.js';

// =============================================================================
// Types
// =============================================================================

/**
 * A journey step to match against components
 */
export interface JourneyStep {
  /** Step name or description */
  name: string;

  /** Step description (if separate from name) */
  description?: string;

  /** Action keywords (verify, navigate, click, etc.) */
  keywords?: string[];

  /** The journey scope */
  scope?: string;

  /** Inline code if available */
  code?: string;
}

/**
 * Result of matching a step to a component
 */
export interface StepMatchResult {
  /** The step that was matched */
  step: JourneyStep;

  /** Matched component (if any) */
  component: Component | null;

  /** Match score (0.0 - 1.0) */
  score: number;

  /** Match recommendation */
  recommendation: 'USE' | 'SUGGEST' | 'NONE';

  /** Reason for the recommendation */
  reason: string;
}

/**
 * Options for step matching
 */
export interface MatchOptions {
  /** Minimum score to use component (default: 0.7) */
  useThreshold?: number;

  /** Minimum score to suggest component (default: 0.4) */
  suggestThreshold?: number;

  /** App framework for scope filtering */
  appFramework?: string;

  /** Filter by categories */
  categories?: ComponentCategory[];
}

/**
 * Result of extraction check
 */
export interface ExtractionCheckResult {
  /** Whether the code should be extracted */
  shouldExtract: boolean;

  /** Confidence score (0.0 - 1.0) */
  confidence: number;

  /** Reason for the decision */
  reason: string;

  /** Suggested component category */
  suggestedCategory?: ComponentCategory;

  /** Suggested module path */
  suggestedPath?: string;
}

/**
 * Pattern occurrence info for extraction analysis
 */
export interface PatternOccurrence {
  /** File path */
  file: string;

  /** Journey ID */
  journeyId: string;

  /** Step name */
  stepName: string;

  /** Line start */
  lineStart: number;

  /** Line end */
  lineEnd: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Common action keywords for step analysis */
const ACTION_KEYWORDS = [
  'verify',
  'check',
  'assert',
  'expect',
  'navigate',
  'goto',
  'click',
  'fill',
  'type',
  'select',
  'wait',
  'load',
  'submit',
  'upload',
  'download',
  'hover',
  'drag',
  'drop',
  'scroll',
  'resize',
  'close',
  'open',
  'toggle',
  'expand',
  'collapse',
  'search',
  'filter',
  'sort',
  'create',
  'delete',
  'update',
  'edit',
  'save',
  'cancel',
  'confirm',
  'login',
  'logout',
  'authenticate',
];

/** Common UI patterns that indicate reusable components */
const REUSABLE_PATTERNS = [
  { pattern: /navigation|sidebar|menu|breadcrumb/i, category: 'navigation' as ComponentCategory },
  { pattern: /form|input|submit|validation/i, category: 'ui-interaction' as ComponentCategory },
  { pattern: /table|grid|row|cell|column/i, category: 'data' as ComponentCategory },
  { pattern: /modal|dialog|popup|overlay/i, category: 'ui-interaction' as ComponentCategory },
  { pattern: /toast|alert|notification|message/i, category: 'assertion' as ComponentCategory },
  { pattern: /login|auth|logout|session/i, category: 'auth' as ComponentCategory },
  { pattern: /loading|spinner|skeleton|progress/i, category: 'timing' as ComponentCategory },
  { pattern: /select|dropdown|picker|autocomplete/i, category: 'ui-interaction' as ComponentCategory },
  { pattern: /tab|accordion|panel|collapse/i, category: 'ui-interaction' as ComponentCategory },
  { pattern: /search|filter|sort|pagination/i, category: 'data' as ComponentCategory },
];

// =============================================================================
// Step Matching Functions
// =============================================================================

/**
 * Extract keywords from a journey step
 */
export function extractStepKeywords(step: JourneyStep): string[] {
  const text = `${step.name} ${step.description || ''}`.toLowerCase();
  const keywords: string[] = [];

  // Extract action keywords
  for (const keyword of ACTION_KEYWORDS) {
    if (text.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  // Add explicit keywords
  if (step.keywords) {
    keywords.push(...step.keywords.map((k) => k.toLowerCase()));
  }

  // Extract potential UI element keywords
  const elementMatches = text.match(/\b(button|link|input|field|table|grid|form|modal|dialog|toast|sidebar|menu|dropdown|checkbox|radio)\b/gi);
  if (elementMatches) {
    keywords.push(...elementMatches.map((m) => m.toLowerCase()));
  }

  return [...new Set(keywords)];
}

/**
 * Calculate similarity between step and component
 */
function calculateStepComponentSimilarity(
  step: JourneyStep,
  component: Component,
  stepKeywords: string[]
): number {
  let score = 0;
  let factors = 0;

  // 1. Category match (if step has code, infer category)
  if (step.code) {
    const stepCategory = inferCategory(step.code);
    if (stepCategory === component.category) {
      score += 0.3;
    }
  }
  factors += 0.3;

  // 2. Keyword overlap
  const componentKeywords = [
    component.category,
    ...(component.description?.toLowerCase().split(/\s+/) || []),
    component.name.toLowerCase(),
  ];

  const keywordOverlap = stepKeywords.filter((k) =>
    componentKeywords.some((ck) => ck.includes(k) || k.includes(ck))
  ).length;

  const keywordScore = Math.min(keywordOverlap / Math.max(stepKeywords.length, 1), 1);
  score += keywordScore * 0.4;
  factors += 0.4;

  // 3. Name similarity
  const stepText = `${step.name} ${step.description || ''}`.toLowerCase();
  const componentText = `${component.name} ${component.description}`.toLowerCase();

  // Simple word overlap
  const stepWords = new Set(stepText.split(/\s+/).filter((w) => w.length > 2));
  const componentWords = new Set(componentText.split(/\s+/).filter((w) => w.length > 2));

  let overlap = 0;
  for (const word of stepWords) {
    if (componentWords.has(word)) {
      overlap++;
    }
  }

  const nameScore = overlap / Math.max(stepWords.size, 1);
  score += nameScore * 0.3;
  factors += 0.3;

  return score / factors;
}

/**
 * Check if component scope matches journey scope
 */
function scopeMatches(
  componentScope: LLKBScope,
  _journeyScope: string | undefined,
  appFramework?: string
): boolean {
  // Universal scope matches everything
  if (componentScope === 'universal') {
    return true;
  }

  // Framework-specific scope
  if (componentScope.startsWith('framework:')) {
    const framework = componentScope.replace('framework:', '');
    return appFramework === framework;
  }

  // App-specific scope always matches within the same app
  if (componentScope === 'app-specific') {
    return true;
  }

  return false;
}

/**
 * Match journey steps to existing components
 *
 * For each step, finds the best matching component and provides
 * a recommendation on whether to use it, suggest it, or skip.
 *
 * @param steps - Array of journey steps to match
 * @param components - Available components to match against
 * @param options - Matching options
 * @returns Array of match results for each step
 *
 * @example
 * ```typescript
 * const results = matchStepsToComponents(
 *   [{ name: 'Verify sidebar is ready', scope: 'orders' }],
 *   components,
 *   { appFramework: 'angular', useThreshold: 0.7 }
 * );
 * ```
 */
export function matchStepsToComponents(
  steps: JourneyStep[],
  components: Component[],
  options: MatchOptions = {}
): StepMatchResult[] {
  const { useThreshold = 0.7, suggestThreshold = 0.4, appFramework, categories } = options;

  // Filter components by scope and category
  const filteredComponents = components.filter((c) => {
    // Skip archived components
    if (c.archived) {
      return false;
    }

    // Filter by category if specified
    if (categories && categories.length > 0 && !categories.includes(c.category)) {
      return false;
    }

    return true;
  });

  return steps.map((step) => {
    const stepKeywords = extractStepKeywords(step);

    // Find best matching component
    let bestMatch: Component | null = null;
    let bestScore = 0;

    for (const component of filteredComponents) {
      // Check scope compatibility
      if (!scopeMatches(component.scope, step.scope, appFramework)) {
        continue;
      }

      const score = calculateStepComponentSimilarity(step, component, stepKeywords);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = component;
      }
    }

    // Determine recommendation
    let recommendation: 'USE' | 'SUGGEST' | 'NONE';
    let reason: string;

    if (bestScore >= useThreshold) {
      recommendation = 'USE';
      reason = `High confidence match (${(bestScore * 100).toFixed(0)}%) - use ${bestMatch!.name} component`;
    } else if (bestScore >= suggestThreshold) {
      recommendation = 'SUGGEST';
      reason = `Moderate match (${(bestScore * 100).toFixed(0)}%) - consider ${bestMatch!.name} component`;
    } else {
      recommendation = 'NONE';
      reason = bestMatch
        ? `Low match score (${(bestScore * 100).toFixed(0)}%) - write inline code`
        : 'No matching components found';
      bestMatch = null;
    }

    return {
      step,
      component: bestMatch,
      score: bestScore,
      recommendation,
      reason,
    };
  });
}

// =============================================================================
// Extraction Detection Functions
// =============================================================================

/**
 * Determine if code pattern matches a reusable pattern
 */
function matchesReusablePattern(code: string): {
  matches: boolean;
  category?: ComponentCategory;
} {
  for (const { pattern, category } of REUSABLE_PATTERNS) {
    if (pattern.test(code)) {
      return { matches: true, category };
    }
  }
  return { matches: false };
}

/**
 * Suggest module path for component based on category and scope
 */
function suggestModulePath(category: ComponentCategory, scope: LLKBScope): string {
  if (scope === 'universal') {
    return `@artk/core/${category}`;
  }

  if (scope.startsWith('framework:')) {
    const framework = scope.replace('framework:', '');
    return `@artk/core/${framework}/${category}`;
  }

  // App-specific
  return `modules/foundation/${category}`;
}

/**
 * Determine if code should be extracted as a reusable component
 *
 * Analyzes code patterns, occurrences, and configuration to decide
 * whether to extract the code into a reusable module.
 *
 * @param code - The code to analyze
 * @param occurrences - Where this pattern appears
 * @param config - LLKB configuration
 * @param existingComponents - Existing components to check for duplicates
 * @returns Extraction check result with recommendation
 *
 * @example
 * ```typescript
 * const result = shouldExtractAsComponent(
 *   'await page.waitForSelector(".sidebar");',
 *   [{ file: 'test1.spec.ts', journeyId: 'JRN-001', stepName: 'Verify sidebar', lineStart: 10, lineEnd: 15 }],
 *   config,
 *   existingComponents
 * );
 * if (result.shouldExtract) {
 *   // Extract as component
 * }
 * ```
 */
export function shouldExtractAsComponent(
  code: string,
  occurrences: PatternOccurrence[],
  config: LLKBConfig,
  existingComponents: Component[] = []
): ExtractionCheckResult {
  const {
    minOccurrences = 2,
    predictiveExtraction = true,
    minLinesForExtraction = 3,
    similarityThreshold = 0.8,
  } = config.extraction;

  // 1. Check minimum lines
  const lineCount = countLines(code);
  if (lineCount < minLinesForExtraction) {
    return {
      shouldExtract: false,
      confidence: 0,
      reason: `Code too short (${lineCount} lines < ${minLinesForExtraction} minimum)`,
    };
  }

  // 2. Check for existing similar component
  const normalizedCode = normalizeCode(code);

  for (const component of existingComponents) {
    if (component.archived) continue;

    // Check source code similarity
    const sourceNormalized = normalizeCode(component.source.originalCode);
    const similarity = calculateSimilarity(normalizedCode, sourceNormalized);

    if (similarity >= similarityThreshold) {
      return {
        shouldExtract: false,
        confidence: 1.0,
        reason: `Similar component already exists: ${component.name} (${(similarity * 100).toFixed(0)}% similar)`,
      };
    }
  }

  // 3. Infer category and check reusable patterns
  const category = inferCategory(code);
  const patternMatch = matchesReusablePattern(code);

  // 4. Check occurrence threshold
  const uniqueJourneys = new Set(occurrences.map((o) => o.journeyId)).size;

  if (occurrences.length >= minOccurrences) {
    return {
      shouldExtract: true,
      confidence: Math.min(0.7 + uniqueJourneys * 0.1, 0.95),
      reason: `Pattern appears ${occurrences.length} times across ${uniqueJourneys} journey(s) (>= ${minOccurrences} threshold)`,
      suggestedCategory: patternMatch.category || category,
      suggestedPath: suggestModulePath(patternMatch.category || category, 'app-specific'),
    };
  }

  // 5. Check predictive extraction
  if (predictiveExtraction && patternMatch.matches) {
    return {
      shouldExtract: true,
      confidence: 0.6,
      reason: `Predictive extraction: matches common ${patternMatch.category} pattern`,
      suggestedCategory: patternMatch.category,
      suggestedPath: suggestModulePath(patternMatch.category!, 'app-specific'),
    };
  }

  // 6. Single occurrence, not a common pattern
  if (occurrences.length === 1 && !patternMatch.matches) {
    return {
      shouldExtract: false,
      confidence: 0.3,
      reason: 'Single occurrence, not a common pattern - keep inline',
      suggestedCategory: category,
    };
  }

  // 7. Default: not enough evidence
  return {
    shouldExtract: false,
    confidence: 0.4,
    reason: `Not enough occurrences (${occurrences.length} < ${minOccurrences}) and no common pattern match`,
    suggestedCategory: category,
  };
}

/**
 * Analyze multiple code snippets and identify extraction candidates
 *
 * Groups similar code patterns and recommends which ones to extract.
 *
 * @param codeSnippets - Array of code snippets with metadata
 * @param config - LLKB configuration
 * @param existingComponents - Existing components
 * @returns Array of extraction candidates sorted by score
 */
export function findExtractionCandidates(
  codeSnippets: Array<{
    code: string;
    file: string;
    journeyId: string;
    stepName: string;
    lineStart: number;
    lineEnd: number;
  }>,
  config: LLKBConfig,
  existingComponents: Component[] = []
): ExtractionCandidate[] {
  const { similarityThreshold = 0.8 } = config.extraction;

  // Group similar patterns
  const groups: Map<string, PatternOccurrence[]> = new Map();
  const codeByHash: Map<string, string> = new Map();

  for (const snippet of codeSnippets) {
    const normalized = normalizeCode(snippet.code);
    const hash = hashCode(normalized);

    // Check if this is similar to an existing group
    let matchedHash: string | null = null;

    for (const [existingHash, existingCode] of codeByHash.entries()) {
      const similarity = calculateSimilarity(normalized, existingCode);
      if (similarity >= similarityThreshold) {
        matchedHash = existingHash;
        break;
      }
    }

    const groupHash = matchedHash || hash;

    if (!groups.has(groupHash)) {
      groups.set(groupHash, []);
      codeByHash.set(groupHash, normalized);
    }

    groups.get(groupHash)!.push({
      file: snippet.file,
      journeyId: snippet.journeyId,
      stepName: snippet.stepName,
      lineStart: snippet.lineStart,
      lineEnd: snippet.lineEnd,
    });
  }

  // Analyze each group
  const candidates: ExtractionCandidate[] = [];

  for (const [hash, occurrences] of groups.entries()) {
    const code = codeByHash.get(hash)!;
    const firstOccurrence = occurrences[0];

    // Skip if no occurrences (should not happen, but TypeScript requires check)
    if (!firstOccurrence) continue;

    // Get original code from first occurrence
    const originalSnippet = codeSnippets.find(
      (s) =>
        s.file === firstOccurrence.file &&
        s.lineStart === firstOccurrence.lineStart
    );

    const checkResult = shouldExtractAsComponent(
      originalSnippet?.code || code,
      occurrences,
      config,
      existingComponents
    );

    // Calculate extraction score
    const uniqueJourneys = new Set(occurrences.map((o) => o.journeyId)).size;
    const score = occurrences.length * 0.3 + uniqueJourneys * 0.4 + checkResult.confidence * 0.3;

    let recommendation: 'EXTRACT_NOW' | 'CONSIDER' | 'SKIP';
    if (checkResult.shouldExtract && score >= 0.7) {
      recommendation = 'EXTRACT_NOW';
    } else if (checkResult.shouldExtract || score >= 0.5) {
      recommendation = 'CONSIDER';
    } else {
      recommendation = 'SKIP';
    }

    candidates.push({
      pattern: code,
      originalCode: originalSnippet?.code || code,
      occurrences: occurrences.length,
      journeys: [...new Set(occurrences.map((o) => o.journeyId))],
      files: [...new Set(occurrences.map((o) => o.file))],
      category: checkResult.suggestedCategory || inferCategory(code),
      score,
      recommendation,
    });
  }

  // Sort by score descending
  return candidates.sort((a, b) => b.score - a.score);
}
