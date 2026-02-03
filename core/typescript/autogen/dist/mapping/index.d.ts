import { S as StepPattern } from '../stepMapper-DZ3x4qT1.js';
export { a9 as ACMappingResult, a0 as ExtendedGlossaryMeta, H as Glossary, G as GlossaryEntry, L as LabelAlias, M as ModuleMethodMapping, P as PATTERN_VERSION, b as PatternMatch, a as PatternMetadata, a7 as StepMapperOptions, a8 as StepMappingResult, z as allPatterns, h as authPatterns, g as checkPatterns, a2 as clearExtendedGlossary, e as clickPatterns, c as createLocatorFromMatch, d as createValueFromText, I as defaultGlossary, l as extendedAssertionPatterns, j as extendedClickPatterns, k as extendedFillPatterns, o as extendedNavigationPatterns, q as extendedSelectPatterns, m as extendedWaitPatterns, f as fillPatterns, W as findLabelAlias, F as findMatchingPatterns, Y as findModuleMethod, x as focusPatterns, C as getAllPatternNames, O as getGlossary, a5 as getGlossaryStats, _ as getLabelAliases, X as getLocatorFromLabel, ae as getMappingStats, $ as getModuleMethods, D as getPatternCountByCategory, B as getPatternMatches, E as getPatternMetadata, T as getSynonyms, a6 as hasExtendedGlossary, r as hoverPatterns, N as initGlossary, af as initializeLlkb, ag as isLlkbAvailable, U as isSynonymOf, a1 as loadExtendedGlossary, J as loadGlossary, a4 as lookupCoreGlossary, a3 as lookupGlossary, ab as mapAcceptanceCriterion, ac as mapProceduralStep, aa as mapStepText, ad as mapSteps, A as matchPattern, K as mergeGlossaries, y as modalAlertPatterns, n as navigationPatterns, R as normalizeStepText, p as parseSelectorToLocator, V as resetGlossaryCache, Q as resolveCanonical, Z as resolveModuleMethod, s as selectPatterns, i as structuredPatterns, ah as suggestImprovements, t as toastPatterns, u as urlPatterns, v as visibilityPatterns, w as waitPatterns } from '../stepMapper-DZ3x4qT1.js';
import { a as IRPrimitive } from '../types-DJnqAI1V.js';
import 'zod';
import '../parseJourney-kHery1o3.js';

/**
 * Pattern distance calculation for finding nearest matching patterns
 */

/**
 * Extended pattern definition with examples for distance calculation
 */
interface PatternDefinition extends StepPattern {
    examples?: string[];
    requiredKeywords?: string[];
}
interface NearestPatternResult {
    name: string;
    distance: number;
    exampleMatch: string;
    mismatchReason: string;
}
/**
 * Calculate Levenshtein distance between two strings
 */
declare function levenshteinDistance(a: string, b: string): number;
/**
 * Calculate normalized similarity between two strings (0-1)
 */
declare function calculateSimilarity(a: string, b: string): number;
/**
 * Find the nearest pattern for a given step text
 */
declare function findNearestPattern(text: string, patterns: Map<string, PatternDefinition> | StepPattern[]): NearestPatternResult | null;
/**
 * Explain why a pattern didn't match
 */
declare function explainMismatch(text: string, pattern: StepPattern | PatternDefinition): string;

/**
 * Enhanced analysis of blocked steps for AI-assisted fixing
 */

type StepCategory = 'navigation' | 'interaction' | 'assertion' | 'wait' | 'unknown';
interface StepSuggestion {
    priority: number;
    text: string;
    explanation: string;
    confidence: number;
}
interface BlockedStepAnalysis {
    step: string;
    reason: string;
    suggestions: StepSuggestion[];
    nearestPattern?: NearestPatternResult;
    machineHintSuggestion?: string;
    category: StepCategory;
}
/**
 * Categorize a step based on its text
 */
declare function categorizeStep(text: string): StepCategory;
/**
 * Infer a machine hint from step text
 */
declare function inferMachineHint(text: string): string | undefined;
/**
 * Get suggestions for navigation steps
 */
declare function getNavigationSuggestions(text: string): StepSuggestion[];
/**
 * Get suggestions for interaction steps
 */
declare function getInteractionSuggestions(text: string): StepSuggestion[];
/**
 * Get suggestions for assertion steps
 */
declare function getAssertionSuggestions(text: string): StepSuggestion[];
/**
 * Get suggestions for wait steps
 */
declare function getWaitSuggestions(_text: string): StepSuggestion[];
/**
 * Get generic suggestions for unknown step categories
 */
declare function getGenericSuggestions(text: string): StepSuggestion[];
/**
 * Analyze a blocked step and generate suggestions
 */
declare function analyzeBlockedStep(step: string, reason: string, patterns?: Map<string, PatternDefinition> | StepPattern[]): BlockedStepAnalysis;
/**
 * Format a blocked step analysis for console output
 */
declare function formatBlockedStepAnalysis(analysis: BlockedStepAnalysis): string;

/**
 * Record for a blocked step
 */
interface BlockedStepRecord {
    /** ISO timestamp when the step was blocked */
    timestamp: string;
    /** Journey ID where this step was found */
    journeyId: string;
    /** Original step text that was blocked */
    stepText: string;
    /** Normalized text (lowercase, trimmed) */
    normalizedText: string;
    /** Category of the step */
    category: 'navigation' | 'interaction' | 'assertion' | 'wait' | 'unknown';
    /** Reason the step was blocked */
    reason: string;
    /** Suggested fix from the system */
    suggestedFix?: string;
    /** User's manual fix (if captured) */
    userFix?: string;
    /** Nearest pattern that almost matched */
    nearestPattern?: string;
    /** Distance to nearest pattern */
    nearestDistance?: number;
}
/**
 * Pattern gap identified from telemetry analysis
 */
interface PatternGap {
    /** Example text that represents this gap */
    exampleText: string;
    /** Normalized form of the text */
    normalizedText: string;
    /** Number of times this gap was encountered */
    count: number;
    /** Category of the gap */
    category: string;
    /** All unique step texts that fall into this gap */
    variants: string[];
    /** Suggested regex pattern to add */
    suggestedPattern?: string;
    /** First occurrence timestamp */
    firstSeen: string;
    /** Last occurrence timestamp */
    lastSeen: string;
}
/**
 * Telemetry statistics
 */
interface TelemetryStats {
    /** Total number of blocked steps recorded */
    totalRecords: number;
    /** Unique patterns identified */
    uniquePatterns: number;
    /** Records by category */
    byCategory: Record<string, number>;
    /** Date range of records */
    dateRange: {
        earliest: string;
        latest: string;
    };
}
/**
 * Get the telemetry file path.
 *
 * Automatically infers the correct .artk directory location by:
 * 1. Using explicit baseDir if provided
 * 2. Finding artk-e2e/.artk from project root
 * 3. Finding .artk in current directory if inside harness
 *
 * @param baseDir - Optional explicit base directory override
 * @returns Path to the telemetry file
 */
declare function getTelemetryPath(baseDir?: string): string;
/**
 * Normalize step text for telemetry comparison
 * (Simpler normalization than glossary - for deduplication purposes)
 */
declare function normalizeStepTextForTelemetry(text: string): string;
/**
 * Categorize a step based on its text
 */
declare function categorizeStepText(text: string): BlockedStepRecord['category'];
/**
 * Record a blocked step to the telemetry file
 */
declare function recordBlockedStep(record: Omit<BlockedStepRecord, 'timestamp' | 'normalizedText' | 'category'> & {
    category?: BlockedStepRecord['category'];
}, options?: {
    baseDir?: string;
}): void;
/**
 * Read all blocked step records from the telemetry file
 */
declare function readBlockedStepRecords(options?: {
    baseDir?: string;
}): BlockedStepRecord[];
/**
 * Analyze blocked steps to find top pattern gaps
 */
declare function analyzeBlockedPatterns(options?: {
    baseDir?: string;
    limit?: number;
}): PatternGap[];
/**
 * Get telemetry statistics
 */
declare function getTelemetryStats(options?: {
    baseDir?: string;
}): TelemetryStats;
/**
 * Record a user fix for a previously blocked step
 */
declare function recordUserFix(originalStepText: string, userFixedText: string, options?: {
    baseDir?: string;
}): void;
/**
 * Clear telemetry data (for testing or reset)
 */
declare function clearTelemetry(options?: {
    baseDir?: string;
}): void;

/**
 * Unified Pattern Matcher - Single entry point for all pattern matching
 * Combines core patterns (patterns.ts) with LLKB learned patterns
 *
 * This eliminates duplicate pattern logic in plan.ts and ensures consistent
 * pattern matching behavior across the entire system.
 *
 * @see research/2026-02-03_unified-pattern-matching-plan.md Phase 2
 */

/**
 * Options for unified pattern matching
 */
interface UnifiedMatchOptions {
    /** Use LLKB learned patterns as fallback (default: true) */
    useLlkb?: boolean;
    /** LLKB root directory (auto-detected if not provided) */
    llkbRoot?: string;
    /** Minimum confidence for LLKB patterns (default: 0.7) */
    minLlkbConfidence?: number;
    /** Enable debug logging (default: false) */
    debug?: boolean;
}
/**
 * Result of unified pattern matching
 */
interface UnifiedMatchResult {
    /** The matched IR primitive, or null if no match */
    primitive: IRPrimitive | null;
    /** Source of the match */
    source: 'core' | 'llkb' | 'none';
    /** Pattern name that matched (if core) */
    patternName?: string;
    /** LLKB pattern ID (if LLKB) */
    llkbPatternId?: string;
    /** LLKB confidence (if LLKB) */
    llkbConfidence?: number;
}
/**
 * Match step text against unified pattern system
 *
 * Priority order:
 * 1. Core patterns from patterns.ts (57+ patterns)
 * 2. LLKB learned patterns (dynamic, confidence-filtered)
 *
 * @param text - Step text to match
 * @param options - Matching options
 * @returns Match result with primitive and source
 */
declare function unifiedMatch(text: string, options?: UnifiedMatchOptions): UnifiedMatchResult;
/**
 * Match step text and return all potential matches (for debugging)
 */
declare function unifiedMatchAll(text: string, options?: UnifiedMatchOptions): Array<{
    source: 'core' | 'llkb';
    name: string;
    primitive: IRPrimitive;
    confidence?: number;
}>;
/**
 * Get statistics about the unified matcher
 */
declare function getUnifiedMatcherStats(options?: {
    llkbRoot?: string;
}): {
    corePatternCount: number;
    llkbPatternCount: number;
    totalPatterns: number;
    coreCategories: Record<string, number>;
};
/**
 * Warm up the pattern cache for better performance
 * Call this before batch processing
 */
declare function warmUpUnifiedMatcher(options?: {
    llkbRoot?: string;
}): Promise<void>;
/**
 * Check if text matches any pattern (without extracting)
 * Useful for quick filtering
 */
declare function hasPatternMatch(text: string, options?: UnifiedMatchOptions): boolean;
/**
 * Get pattern name for matched text (for telemetry/logging)
 */
declare function getMatchedPatternName(text: string, options?: UnifiedMatchOptions): string | null;
/**
 * Export for testing - get all core patterns
 */
declare function getCorePatterns(): StepPattern[];

interface PlannedAction {
    type: 'navigate' | 'reload' | 'goBack' | 'goForward' | 'click' | 'dblclick' | 'rightClick' | 'fill' | 'select' | 'check' | 'uncheck' | 'press' | 'hover' | 'focus' | 'clear' | 'upload' | 'assert' | 'assertText' | 'assertValue' | 'assertChecked' | 'assertEnabled' | 'assertDisabled' | 'assertURL' | 'assertTitle' | 'assertHidden' | 'assertCount' | 'wait' | 'waitForVisible' | 'waitForHidden' | 'waitForURL' | 'waitForNetwork' | 'assertToast' | 'dismissModal' | 'acceptAlert' | 'dismissAlert' | 'callModule' | 'custom';
    target?: string;
    value?: string;
    /** For callModule: module name */
    module?: string;
    /** For callModule: method name */
    method?: string;
    /** For press: key name */
    key?: string;
    /** For upload: file paths */
    files?: string[];
    /** For assertCount: expected count */
    count?: number;
    /** For assertToast: toast type */
    toastType?: 'success' | 'error' | 'info' | 'warning';
    options?: Record<string, unknown>;
}

/**
 * Adapter to convert IR Primitives to PlannedActions
 * This enables plan.ts to use the unified pattern matching system
 *
 * @see research/2026-02-03_unified-pattern-matching-plan.md Phase 1
 */

/**
 * Convert an IR Primitive to a PlannedAction
 * This is the bridge between the unified pattern system and plan.ts
 */
declare function irPrimitiveToPlannedAction(primitive: IRPrimitive): PlannedAction;
/**
 * Convert PlannedAction back to an IR Primitive (for round-trip consistency)
 * This is useful for testing and debugging
 */
declare function plannedActionToIRPrimitive(action: PlannedAction): IRPrimitive | null;

/**
 * A pattern learned from successful step mappings
 */
interface LearnedPattern {
    /** Unique identifier */
    id: string;
    /** Original step text that was learned from */
    originalText: string;
    /** Normalized form for matching */
    normalizedText: string;
    /** The IR primitive this text maps to */
    mappedPrimitive: IRPrimitive;
    /** Confidence score (0-1) */
    confidence: number;
    /** Journey IDs where this pattern was used */
    sourceJourneys: string[];
    /** Number of successful uses */
    successCount: number;
    /** Number of failed uses */
    failCount: number;
    /** Timestamp of last use */
    lastUsed: string;
    /** Timestamp when created */
    createdAt: string;
    /** Whether this pattern has been promoted to core */
    promotedToCore: boolean;
    /** Promotion timestamp if promoted */
    promotedAt?: string;
}
/**
 * Pattern ready for promotion to core
 */
interface PromotedPattern {
    /** The learned pattern being promoted */
    pattern: LearnedPattern;
    /** Generated regex string for the pattern */
    generatedRegex: string;
    /** Priority score for ordering */
    priority: number;
}
/**
 * LLKB pattern match result
 */
interface LlkbPatternMatch {
    /** Pattern ID that matched */
    patternId: string;
    /** The IR primitive */
    primitive: IRPrimitive;
    /** Confidence of the match */
    confidence: number;
}
/**
 * Options for pruning patterns
 */
interface PruneOptions {
    /** Minimum confidence to keep */
    minConfidence?: number;
    /** Minimum success count to keep */
    minSuccess?: number;
    /** Maximum age in days to keep */
    maxAgeDays?: number;
}
/**
 * Invalidate the pattern cache
 * Call this after any write operation
 */
declare function invalidatePatternCache(): void;
/**
 * Get the path to the patterns file.
 *
 * Automatically infers the correct LLKB directory location by:
 * 1. Using explicit llkbRoot if provided
 * 2. Finding artk-e2e/.artk/llkb from project root
 * 3. Finding .artk/llkb in current directory if inside harness
 *
 * @param llkbRoot - Optional explicit LLKB root directory override
 * @returns Path to the patterns file
 */
declare function getPatternsFilePath(llkbRoot?: string): string;
/**
 * Generate a unique pattern ID
 */
declare function generatePatternId(): string;
/**
 * Load learned patterns from storage (with caching for performance)
 */
declare function loadLearnedPatterns(options?: {
    llkbRoot?: string;
    bypassCache?: boolean;
}): LearnedPattern[];
/**
 * Save learned patterns to storage
 */
declare function saveLearnedPatterns(patterns: LearnedPattern[], options?: {
    llkbRoot?: string;
}): void;
/**
 * Calculate confidence from success/fail counts
 * Uses Wilson score interval for small sample sizes
 */
declare function calculateConfidence(successCount: number, failCount: number): number;
/**
 * Record a successful pattern transformation
 */
declare function recordPatternSuccess(originalText: string, primitive: IRPrimitive, journeyId: string, options?: {
    llkbRoot?: string;
}): LearnedPattern;
/**
 * Record a failed pattern use
 */
declare function recordPatternFailure(originalText: string, _journeyId: string, options?: {
    llkbRoot?: string;
}): LearnedPattern | null;
/**
 * Match text against learned LLKB patterns
 */
declare function matchLlkbPattern(text: string, options?: {
    llkbRoot?: string;
    minConfidence?: number;
}): LlkbPatternMatch | null;
/**
 * Generate a regex pattern from a learned text pattern
 * This is a heuristic approach - complex patterns may need manual refinement
 */
declare function generateRegexFromText(text: string): string;
/**
 * Get patterns ready for promotion to core
 */
declare function getPromotablePatterns(options?: {
    llkbRoot?: string;
}): PromotedPattern[];
/**
 * Mark patterns as promoted
 */
declare function markPatternsPromoted(patternIds: string[], options?: {
    llkbRoot?: string;
}): void;
/**
 * Prune low-quality patterns
 */
declare function prunePatterns(options?: PruneOptions & {
    llkbRoot?: string;
}): {
    removed: number;
    remaining: number;
};
/**
 * Get pattern statistics
 */
declare function getPatternStats(options?: {
    llkbRoot?: string;
}): {
    total: number;
    promoted: number;
    highConfidence: number;
    lowConfidence: number;
    avgConfidence: number;
    totalSuccesses: number;
    totalFailures: number;
};
/**
 * Export learned patterns to LLKB config format
 */
declare function exportPatternsToConfig(options: {
    llkbRoot?: string;
    outputPath?: string;
    minConfidence?: number;
}): {
    exported: number;
    path: string;
};
/**
 * Clear all learned patterns (for testing)
 */
declare function clearLearnedPatterns(options?: {
    llkbRoot?: string;
}): void;

export { type BlockedStepAnalysis, type BlockedStepRecord, type LearnedPattern, type LlkbPatternMatch, type NearestPatternResult, type PatternDefinition, type PatternGap, type PromotedPattern, type PruneOptions, type StepCategory, StepPattern, type StepSuggestion, type TelemetryStats, type UnifiedMatchOptions, type UnifiedMatchResult, analyzeBlockedPatterns, analyzeBlockedStep, calculateConfidence, calculateSimilarity, categorizeStep, categorizeStepText, clearLearnedPatterns, clearTelemetry, explainMismatch, exportPatternsToConfig, findNearestPattern, formatBlockedStepAnalysis, generatePatternId, generateRegexFromText, getAssertionSuggestions, getCorePatterns, getGenericSuggestions, getInteractionSuggestions, getMatchedPatternName, getNavigationSuggestions, getPatternStats, getPatternsFilePath, getPromotablePatterns, getTelemetryPath, getTelemetryStats, getUnifiedMatcherStats, getWaitSuggestions, hasPatternMatch, inferMachineHint, invalidatePatternCache, irPrimitiveToPlannedAction, levenshteinDistance, loadLearnedPatterns, markPatternsPromoted, matchLlkbPattern, normalizeStepTextForTelemetry, plannedActionToIRPrimitive, prunePatterns, readBlockedStepRecords, recordBlockedStep, recordPatternFailure, recordPatternSuccess, recordUserFix, saveLearnedPatterns, unifiedMatch, unifiedMatchAll, warmUpUnifiedMatcher };
