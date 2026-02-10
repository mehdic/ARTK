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
 * Combines core patterns (patterns.ts) with LLKB learned patterns and fuzzy matching
 *
 * Coverage Flow: Normalization → Core Patterns → LLKB → Fuzzy → LLM → TODO
 *
 * This eliminates duplicate pattern logic in plan.ts and ensures consistent
 * pattern matching behavior across the entire system.
 *
 * @see research/2026-02-03_unified-pattern-matching-plan.md Phase 2
 * @see research/2026-02-03_multi-ai-debate-coverage-improvement.md
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
    /** Use fuzzy matching as final fallback before TODO (default: true) */
    useFuzzy?: boolean;
    /** Minimum similarity for fuzzy matching (default: 0.85) */
    minFuzzySimilarity?: number;
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
    source: 'core' | 'llkb' | 'fuzzy' | 'none';
    /** Pattern name that matched (if core or fuzzy) */
    patternName?: string;
    /** LLKB pattern ID (if LLKB) */
    llkbPatternId?: string;
    /** LLKB confidence (if LLKB) */
    llkbConfidence?: number;
    /** Fuzzy match similarity score (if fuzzy) */
    fuzzySimilarity?: number;
    /** Fuzzy matched example (if fuzzy) */
    fuzzyMatchedExample?: string;
}
/**
 * Match step text against unified pattern system
 *
 * Priority order (Coverage Flow):
 * 1. Core patterns from patterns.ts (84+ patterns)
 * 2. LLKB learned patterns (dynamic, confidence-filtered)
 * 3. Fuzzy matching (high similarity threshold, 0.85+)
 * 4. No match → TODO (or LLM fallback in future)
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
    source: 'core' | 'llkb' | 'fuzzy';
    name: string;
    primitive: IRPrimitive;
    confidence?: number;
    similarity?: number;
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
 * Fuzzy match configuration
 */
interface FuzzyMatchConfig {
    /** Minimum similarity threshold (0-1, default: 0.85) */
    minSimilarity?: number;
    /** Use normalized text for comparison (default: true) */
    useNormalization?: boolean;
    /** Maximum candidates to consider (default: 10) */
    maxCandidates?: number;
    /** Enable debug logging (default: false) */
    debug?: boolean;
}
/**
 * Fuzzy match result
 */
interface FuzzyMatchResult {
    /** The matched primitive */
    primitive: IRPrimitive;
    /** The pattern that matched */
    patternName: string;
    /** Similarity score (0-1) */
    similarity: number;
    /** The example that was matched */
    matchedExample: string;
    /** Original input text */
    originalText: string;
    /** Normalized input text */
    normalizedText: string;
}
/**
 * Find best fuzzy match for step text
 *
 * @param text - Step text to match
 * @param config - Fuzzy match configuration
 * @returns Best match if similarity >= threshold, null otherwise
 */
declare function fuzzyMatch(text: string, config?: FuzzyMatchConfig): FuzzyMatchResult | null;
/**
 * Get fuzzy match statistics
 */
declare function getFuzzyMatchStats(): {
    patternsWithExamples: number;
    totalExamples: number;
    examplesByType: Record<string, number>;
};
/**
 * Clear the pattern examples cache (for testing)
 */
declare function clearFuzzyMatchCache(): void;

/**
 * Enhanced Normalization Pipeline for Step Text
 * Implements Tier 1 of the coverage improvement strategy:
 * - Stemming (verb form normalization)
 * - Glossary expansion
 * - Canonical form transformation
 * - Whitespace and punctuation normalization
 *
 * @see research/2026-02-03_multi-ai-debate-coverage-improvement.md
 */
/**
 * Normalize options
 */
interface NormalizeOptions {
    /** Apply verb stemming */
    stemVerbs?: boolean;
    /** Expand abbreviations */
    expandAbbreviations?: boolean;
    /** Remove stop words */
    removeStopWords?: boolean;
    /** Remove actor prefixes (e.g., "user clicks" -> "click") */
    removeActorPrefixes?: boolean;
    /** Lowercase everything */
    lowercase?: boolean;
    /** Preserve quoted strings */
    preserveQuoted?: boolean;
}
/**
 * Stem a single word (verb normalization)
 */
declare function stemWord(word: string): string;
/**
 * Expand abbreviations in text
 */
declare function expandAbbreviations(text: string): string;
/**
 * Remove actor prefixes from step text
 */
declare function removeActorPrefixes(text: string): string;
/**
 * Remove stop words from text
 */
declare function removeStopWords(text: string): string;
/**
 * Enhanced step text normalization
 * Applies all normalization transformations
 */
declare function normalizeStepTextEnhanced(text: string, options?: NormalizeOptions): string;
/**
 * Get the canonical form of a step (most normalized version)
 */
declare function getCanonicalForm(text: string): string;
/**
 * Get a less aggressive normalization (preserves more structure)
 */
declare function getLightNormalization(text: string): string;
/**
 * Check if two step texts are semantically equivalent after normalization
 */
declare function areStepsEquivalent(step1: string, step2: string): boolean;
/**
 * Get all possible normalizations of a step (for fuzzy matching)
 */
declare function getAllNormalizations(text: string): string[];

/**
 * LLM Fallback - Final tier in coverage architecture
 * Handles blocked steps that can't be matched by patterns, LLKB, or fuzzy matching
 *
 * Coverage Flow: Normalization → Core Patterns → LLKB → Fuzzy → LLM → TODO
 *
 * Key features:
 * - Schema-constrained outputs (only valid IR primitives)
 * - Validation before use
 * - Cost and latency tracking
 * - Non-determinism awareness (logging, telemetry)
 * - Disabled by default for deterministic builds
 *
 * @see research/2026-02-03_multi-ai-debate-coverage-improvement.md
 */

/**
 * LLM provider type
 */
type LlmProvider = 'claude' | 'gpt' | 'gemini' | 'mock';
/**
 * Configuration for LLM fallback
 */
interface LlmFallbackConfig {
    /** Whether LLM fallback is enabled (default: false) */
    enabled: boolean;
    /** LLM provider to use */
    provider: LlmProvider;
    /** Model name (e.g., 'claude-3-haiku', 'gpt-4o-mini') */
    model?: string;
    /** API key (environment variable name) */
    apiKeyEnvVar?: string;
    /** Maximum tokens for response */
    maxTokens?: number;
    /** Temperature (0-1, lower = more deterministic) */
    temperature?: number;
    /** Timeout in milliseconds */
    timeout?: number;
    /** Maximum retries on failure */
    maxRetries?: number;
    /** Whether to cache LLM responses */
    cacheResponses?: boolean;
    /** Cache TTL in seconds */
    cacheTtlSeconds?: number;
    /** Cost budget per session (in USD) */
    costBudgetUsd?: number;
}
/**
 * Default configuration (disabled by default)
 */
declare const DEFAULT_LLM_CONFIG: LlmFallbackConfig;
/**
 * LLM fallback result
 */
interface LlmFallbackResult {
    /** The generated primitive */
    primitive: IRPrimitive;
    /** Confidence in the result (0-1) */
    confidence: number;
    /** Whether result is from cache */
    fromCache: boolean;
    /** Latency in milliseconds */
    latencyMs: number;
    /** Estimated cost in USD */
    estimatedCostUsd: number;
    /** Provider used */
    provider: LlmProvider;
    /** Model used */
    model: string;
}
/**
 * LLM fallback telemetry
 */
interface LlmFallbackTelemetry {
    /** Total LLM calls made */
    totalCalls: number;
    /** Successful calls */
    successfulCalls: number;
    /** Failed calls (validation failures, timeouts) */
    failedCalls: number;
    /** Cache hits */
    cacheHits: number;
    /** Total latency (ms) */
    totalLatencyMs: number;
    /** Total estimated cost (USD) */
    totalCostUsd: number;
    /** Call history for analysis */
    history: Array<{
        timestamp: string;
        stepText: string;
        success: boolean;
        latencyMs: number;
        costUsd: number;
        error?: string;
    }>;
}
/**
 * Validate an IR primitive from LLM response
 */
declare function validateLlmPrimitive(primitive: unknown): {
    valid: boolean;
    errors: string[];
};
/**
 * Main LLM fallback function
 */
declare function llmFallback(stepText: string, config?: Partial<LlmFallbackConfig>): Promise<LlmFallbackResult | null>;
/**
 * Get current telemetry
 */
declare function getLlmFallbackTelemetry(): LlmFallbackTelemetry;
/**
 * Reset telemetry (for testing)
 */
declare function resetLlmFallbackTelemetry(): void;
/**
 * Clear response cache (for testing)
 */
declare function clearLlmResponseCache(): void;
/**
 * Check if LLM fallback is available and configured
 */
declare function isLlmFallbackAvailable(config?: Partial<LlmFallbackConfig>): {
    available: boolean;
    reason?: string;
};

/**
 * Invalidate the discovered pattern cache
 */
declare function invalidateDiscoveredPatternCache(): void;
/**
 * A pattern learned from successful step mappings (runtime matching format).
 *
 * This is the rich runtime type used by AutoGen for pattern matching during
 * test generation. It stores `mappedPrimitive` as a full `IRPrimitive` object.
 *
 * NOTE: This is distinct from core LLKB's `LearnedPattern` (aka `LearnedPatternEntry`)
 * in pattern-generation.ts, which stores `irPrimitive` as a string type name for
 * persistence/merge operations. See I-01 in the review for context.
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
 * Options for LLKB pattern matching
 */
interface LlkbMatchOptions {
    /** LLKB root directory */
    llkbRoot?: string;
    /** Minimum pattern confidence to consider (default: 0.5) */
    minConfidence?: number;
    /** Minimum text similarity for fuzzy match (default: 0.7) */
    minSimilarity?: number;
    /** Whether to use fuzzy matching (default: true) */
    useFuzzyMatch?: boolean;
}
/**
 * Match text against learned LLKB patterns and discovered patterns.
 *
 * Search order with layer priority:
 * 1. Learned patterns (exact match, then fuzzy match)
 * 2. Discovered patterns (exact match, then fuzzy match)
 *    - Layer priority: app-specific > framework > universal
 *
 * When both sources return a match, the higher-layer discovered pattern
 * wins if it has equal or higher confidence than the learned pattern match.
 */
declare function matchLlkbPattern(text: string, options?: LlkbMatchOptions): LlkbPatternMatch | null;
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

export { type BlockedStepAnalysis, type BlockedStepRecord, DEFAULT_LLM_CONFIG, type FuzzyMatchConfig, type FuzzyMatchResult, type LearnedPattern, type LlkbMatchOptions, type LlkbPatternMatch, type LlmFallbackConfig, type LlmFallbackResult, type LlmFallbackTelemetry, type LlmProvider, type NearestPatternResult, type NormalizeOptions, type PatternDefinition, type PatternGap, type PromotedPattern, type PruneOptions, type StepCategory, StepPattern, type StepSuggestion, type TelemetryStats, type UnifiedMatchOptions, type UnifiedMatchResult, analyzeBlockedPatterns, analyzeBlockedStep, areStepsEquivalent, calculateConfidence, calculateSimilarity, categorizeStep, categorizeStepText, clearFuzzyMatchCache, clearLearnedPatterns, clearLlmResponseCache, clearTelemetry, expandAbbreviations, explainMismatch, exportPatternsToConfig, findNearestPattern, formatBlockedStepAnalysis, fuzzyMatch, generatePatternId, generateRegexFromText, getAllNormalizations, getAssertionSuggestions, getCanonicalForm, getCorePatterns, getFuzzyMatchStats, getGenericSuggestions, getInteractionSuggestions, getLightNormalization, getLlmFallbackTelemetry, getMatchedPatternName, getNavigationSuggestions, getPatternStats, getPatternsFilePath, getPromotablePatterns, getTelemetryPath, getTelemetryStats, getUnifiedMatcherStats, getWaitSuggestions, hasPatternMatch, inferMachineHint, invalidateDiscoveredPatternCache, invalidatePatternCache, irPrimitiveToPlannedAction, isLlmFallbackAvailable, levenshteinDistance, llmFallback, loadLearnedPatterns, markPatternsPromoted, matchLlkbPattern, normalizeStepTextEnhanced, normalizeStepTextForTelemetry, plannedActionToIRPrimitive, prunePatterns, readBlockedStepRecords, recordBlockedStep, recordPatternFailure, recordPatternSuccess, recordUserFix, removeActorPrefixes, removeStopWords, resetLlmFallbackTelemetry, saveLearnedPatterns, stemWord, unifiedMatch, unifiedMatchAll, validateLlmPrimitive, warmUpUnifiedMatcher };
