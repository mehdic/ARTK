import { S as StepPattern } from '../stepMapper-uOS4_Obt.js';
export { a8 as ACMappingResult, $ as ExtendedGlossaryMeta, F as Glossary, G as GlossaryEntry, L as LabelAlias, M as ModuleMethodMapping, P as PATTERN_VERSION, b as PatternMatch, a as PatternMetadata, a6 as StepMapperOptions, a7 as StepMappingResult, y as allPatterns, h as authPatterns, g as checkPatterns, a1 as clearExtendedGlossary, e as clickPatterns, c as createLocatorFromMatch, d as createValueFromText, H as defaultGlossary, l as extendedAssertionPatterns, j as extendedClickPatterns, k as extendedFillPatterns, o as extendedNavigationPatterns, q as extendedSelectPatterns, m as extendedWaitPatterns, f as fillPatterns, V as findLabelAlias, E as findMatchingPatterns, X as findModuleMethod, x as focusPatterns, B as getAllPatternNames, N as getGlossary, a4 as getGlossaryStats, Z as getLabelAliases, W as getLocatorFromLabel, ad as getMappingStats, _ as getModuleMethods, C as getPatternCountByCategory, A as getPatternMatches, D as getPatternMetadata, R as getSynonyms, a5 as hasExtendedGlossary, r as hoverPatterns, K as initGlossary, ae as initializeLlkb, af as isLlkbAvailable, T as isSynonymOf, a0 as loadExtendedGlossary, I as loadGlossary, a3 as lookupCoreGlossary, a2 as lookupGlossary, aa as mapAcceptanceCriterion, ab as mapProceduralStep, a9 as mapStepText, ac as mapSteps, z as matchPattern, J as mergeGlossaries, n as navigationPatterns, Q as normalizeStepText, p as parseSelectorToLocator, U as resetGlossaryCache, O as resolveCanonical, Y as resolveModuleMethod, s as selectPatterns, i as structuredPatterns, ag as suggestImprovements, t as toastPatterns, u as urlPatterns, v as visibilityPatterns, w as waitPatterns } from '../stepMapper-uOS4_Obt.js';
import '../types-DJnqAI1V.js';
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

export { type BlockedStepAnalysis, type BlockedStepRecord, type NearestPatternResult, type PatternDefinition, type PatternGap, type StepCategory, StepPattern, type StepSuggestion, type TelemetryStats, analyzeBlockedPatterns, analyzeBlockedStep, calculateSimilarity, categorizeStep, categorizeStepText, clearTelemetry, explainMismatch, findNearestPattern, formatBlockedStepAnalysis, getAssertionSuggestions, getGenericSuggestions, getInteractionSuggestions, getNavigationSuggestions, getTelemetryPath, getTelemetryStats, getWaitSuggestions, inferMachineHint, levenshteinDistance, normalizeStepTextForTelemetry, readBlockedStepRecords, recordBlockedStep, recordUserFix };
