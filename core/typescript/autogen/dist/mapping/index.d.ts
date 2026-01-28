import { S as StepPattern } from '../stepMapper-CK4Zixeq.js';
export { A as ACMappingResult, E as ExtendedGlossaryMeta, G as Glossary, a as GlossaryEntry, L as LabelAlias, M as ModuleMethodMapping, P as PATTERN_VERSION, b as PatternMatch, c as PatternMetadata, d as StepMapperOptions, e as StepMappingResult, f as allPatterns, g as authPatterns, h as checkPatterns, i as clearExtendedGlossary, j as clickPatterns, k as createLocatorFromMatch, l as createValueFromText, m as defaultGlossary, n as extendedAssertionPatterns, o as extendedClickPatterns, p as extendedFillPatterns, q as extendedNavigationPatterns, r as extendedSelectPatterns, s as extendedWaitPatterns, t as fillPatterns, u as findLabelAlias, v as findMatchingPatterns, w as findModuleMethod, x as focusPatterns, y as getAllPatternNames, z as getGlossary, B as getGlossaryStats, C as getLabelAliases, D as getLocatorFromLabel, F as getMappingStats, H as getModuleMethods, I as getPatternCountByCategory, J as getPatternMatches, K as getPatternMetadata, N as getSynonyms, O as hasExtendedGlossary, Q as hoverPatterns, R as initGlossary, T as initializeLlkb, U as isLlkbAvailable, V as isSynonymOf, W as loadExtendedGlossary, X as loadGlossary, Y as lookupCoreGlossary, Z as lookupGlossary, _ as mapAcceptanceCriterion, $ as mapProceduralStep, a0 as mapStepText, a1 as mapSteps, a2 as matchPattern, a3 as mergeGlossaries, a4 as navigationPatterns, a5 as normalizeStepText, a6 as parseSelectorToLocator, a7 as resetGlossaryCache, a8 as resolveCanonical, a9 as resolveModuleMethod, aa as selectPatterns, ab as structuredPatterns, ac as suggestImprovements, ad as toastPatterns, ae as urlPatterns, af as visibilityPatterns, ag as waitPatterns } from '../stepMapper-CK4Zixeq.js';
import '../types-CBcw78BQ.js';
import 'zod';
import '../parseJourney-pVvnO7Mc.js';

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
 * Get the telemetry file path
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
