/**
 * LLKB Component Matching Module
 *
 * This module provides functions to match journey steps to existing components
 * and determine whether code should be extracted as a reusable component.
 *
 * @module llkb/matching
 */
import type { Component, ComponentCategory, LLKBConfig, ExtractionCandidate } from './types.js';
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
/**
 * Extract keywords from a journey step
 */
export declare function extractStepKeywords(step: JourneyStep): string[];
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
export declare function matchStepsToComponents(steps: JourneyStep[], components: Component[], options?: MatchOptions): StepMatchResult[];
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
export declare function shouldExtractAsComponent(code: string, occurrences: PatternOccurrence[], config: LLKBConfig, existingComponents?: Component[]): ExtractionCheckResult;
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
export declare function findExtractionCandidates(codeSnippets: Array<{
    code: string;
    file: string;
    journeyId: string;
    stepName: string;
    lineStart: number;
    lineEnd: number;
}>, config: LLKBConfig, existingComponents?: Component[]): ExtractionCandidate[];
//# sourceMappingURL=matching.d.ts.map