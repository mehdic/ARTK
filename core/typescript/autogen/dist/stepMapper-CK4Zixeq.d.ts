import { I as IRPrimitive, L as LocatorStrategy, b as LocatorSpec, V as ValueSpec, c as IRStep } from './types-CBcw78BQ.js';
import { z } from 'zod';
import { A as AcceptanceCriterion, x as ProceduralStep } from './parseJourney-pVvnO7Mc.js';

/**
 * Step Mapping Patterns - Regex patterns for parsing step text into IR primitives
 * @see research/2026-01-02_autogen-refined-plan.md Section 10
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 3
 */

/**
 * Pattern version - increment when patterns change
 * Format: MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes to pattern behavior
 * - MINOR: New patterns added
 * - PATCH: Bug fixes to existing patterns
 */
declare const PATTERN_VERSION = "1.1.0";
/**
 * Pattern metadata for tracking
 */
interface PatternMetadata {
    name: string;
    version: string;
    addedDate: string;
    source: 'core' | 'llkb' | 'telemetry';
    category: string;
}
/**
 * Pattern result with match groups
 */
interface PatternMatch {
    type: IRPrimitive['type'];
    groups: Record<string, string>;
}
/**
 * Pattern definition
 */
interface StepPattern {
    /** Pattern name for debugging */
    name: string;
    /** Regex pattern with named groups */
    regex: RegExp;
    /** IR primitive type this pattern produces */
    primitiveType: IRPrimitive['type'];
    /** Extract IR primitive from match (prefix with _ if unused) */
    extract: (_match: RegExpMatchArray) => IRPrimitive | null;
}
/**
 * Create a locator spec from pattern match
 */
declare function createLocatorFromMatch(strategy: LocatorStrategy, value: string, name?: string): LocatorSpec;
/**
 * Create a value spec from text
 */
declare function createValueFromText(text: string): ValueSpec;
/**
 * Navigation patterns
 */
declare const navigationPatterns: StepPattern[];
/**
 * Click patterns
 */
declare const clickPatterns: StepPattern[];
/**
 * Fill/Input patterns
 */
declare const fillPatterns: StepPattern[];
/**
 * Select patterns
 */
declare const selectPatterns: StepPattern[];
/**
 * Check/Uncheck patterns
 */
declare const checkPatterns: StepPattern[];
/**
 * Visibility assertion patterns
 */
declare const visibilityPatterns: StepPattern[];
/**
 * Toast/notification patterns
 */
declare const toastPatterns: StepPattern[];
/**
 * URL assertion patterns
 */
declare const urlPatterns: StepPattern[];
/**
 * Module call patterns (authentication)
 */
declare const authPatterns: StepPattern[];
/**
 * Wait patterns
 */
declare const waitPatterns: StepPattern[];
/**
 * Helper function to convert natural language selectors to Playwright locator strategies
 */
declare function parseSelectorToLocator(selector: string): {
    strategy: LocatorStrategy;
    value: string;
    name?: string;
};
/**
 * Structured step patterns for Journey markdown format
 * Matches patterns like:
 * - **Action**: Click the login button
 * - **Wait for**: Dashboard to load
 * - **Assert**: User name is visible
 */
declare const structuredPatterns: StepPattern[];
/**
 * Extended click patterns - Common variations missed by core patterns
 * Added in v1.1.0 based on telemetry analysis
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 3
 */
declare const extendedClickPatterns: StepPattern[];
/**
 * Extended fill patterns - Common variations missed by core patterns
 * Added in v1.1.0 based on telemetry analysis
 */
declare const extendedFillPatterns: StepPattern[];
/**
 * Extended assertion patterns - Common variations missed by core patterns
 * Added in v1.1.0 based on telemetry analysis
 */
declare const extendedAssertionPatterns: StepPattern[];
/**
 * Extended wait patterns - Common variations missed by core patterns
 * Added in v1.1.0 based on telemetry analysis
 */
declare const extendedWaitPatterns: StepPattern[];
/**
 * Extended navigation patterns - Common variations missed by core patterns
 * Added in v1.1.0 based on telemetry analysis
 */
declare const extendedNavigationPatterns: StepPattern[];
/**
 * Extended select/dropdown patterns
 * Added in v1.1.0 based on telemetry analysis
 */
declare const extendedSelectPatterns: StepPattern[];
/**
 * Hover patterns
 * Added in v1.1.0 based on telemetry analysis
 */
declare const hoverPatterns: StepPattern[];
/**
 * Focus patterns
 * Added in v1.1.0 based on telemetry analysis
 */
declare const focusPatterns: StepPattern[];
/**
 * All patterns in priority order (more specific patterns first)
 * Structured patterns come first to prioritize the Journey markdown format
 */
declare const allPatterns: StepPattern[];
/**
 * Match text against all patterns and return the first matching primitive
 */
declare function matchPattern(text: string): IRPrimitive | null;
/**
 * Get all pattern matches for debugging
 */
declare function getPatternMatches(text: string): Array<{
    pattern: string;
    match: IRPrimitive;
}>;
/**
 * Get all pattern names for CLI listing
 */
declare function getAllPatternNames(): string[];
/**
 * Get pattern count by category
 */
declare function getPatternCountByCategory(): Record<string, number>;
/**
 * Get pattern metadata for a specific pattern
 */
declare function getPatternMetadata(patternName: string): PatternMetadata | null;
/**
 * Find patterns that match a given text (for debugging)
 */
declare function findMatchingPatterns(text: string): string[];

/**
 * Glossary entry schema
 */
declare const GlossaryEntrySchema: z.ZodObject<{
    canonical: z.ZodString;
    synonyms: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    canonical: string;
    synonyms: string[];
}, {
    canonical: string;
    synonyms: string[];
}>;
/**
 * Label alias entry schema (maps display labels to testids/selectors)
 * @see T082 - Extend glossary schema for labelAliases
 */
declare const LabelAliasSchema: z.ZodObject<{
    label: z.ZodString;
    testid: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label: string;
    role?: string | undefined;
    testid?: string | undefined;
    selector?: string | undefined;
}, {
    label: string;
    role?: string | undefined;
    testid?: string | undefined;
    selector?: string | undefined;
}>;
/**
 * Module method mapping schema (maps phrases to module.method calls)
 * @see T082 - Module method resolution
 */
declare const ModuleMethodMappingSchema: z.ZodObject<{
    phrase: z.ZodString;
    module: z.ZodString;
    method: z.ZodString;
    params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    method: string;
    phrase: string;
    module: string;
    params?: Record<string, string> | undefined;
}, {
    method: string;
    phrase: string;
    module: string;
    params?: Record<string, string> | undefined;
}>;
/**
 * Glossary file schema
 */
declare const GlossarySchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodNumber>;
    entries: z.ZodArray<z.ZodObject<{
        canonical: z.ZodString;
        synonyms: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        canonical: string;
        synonyms: string[];
    }, {
        canonical: string;
        synonyms: string[];
    }>, "many">;
    labelAliases: z.ZodDefault<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        testid: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        role?: string | undefined;
        testid?: string | undefined;
        selector?: string | undefined;
    }, {
        label: string;
        role?: string | undefined;
        testid?: string | undefined;
        selector?: string | undefined;
    }>, "many">>;
    moduleMethods: z.ZodDefault<z.ZodArray<z.ZodObject<{
        phrase: z.ZodString;
        module: z.ZodString;
        method: z.ZodString;
        params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        method: string;
        phrase: string;
        module: string;
        params?: Record<string, string> | undefined;
    }, {
        method: string;
        phrase: string;
        module: string;
        params?: Record<string, string> | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    version: number;
    entries: {
        canonical: string;
        synonyms: string[];
    }[];
    labelAliases: {
        label: string;
        role?: string | undefined;
        testid?: string | undefined;
        selector?: string | undefined;
    }[];
    moduleMethods: {
        method: string;
        phrase: string;
        module: string;
        params?: Record<string, string> | undefined;
    }[];
}, {
    entries: {
        canonical: string;
        synonyms: string[];
    }[];
    version?: number | undefined;
    labelAliases?: {
        label: string;
        role?: string | undefined;
        testid?: string | undefined;
        selector?: string | undefined;
    }[] | undefined;
    moduleMethods?: {
        method: string;
        phrase: string;
        module: string;
        params?: Record<string, string> | undefined;
    }[] | undefined;
}>;
type LabelAlias = z.infer<typeof LabelAliasSchema>;
type ModuleMethodMapping = z.infer<typeof ModuleMethodMappingSchema>;
type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;
type Glossary = z.infer<typeof GlossarySchema>;
/**
 * Default glossary entries for common terms
 */
declare const defaultGlossary: Glossary;
/**
 * Load glossary from file
 * @param glossaryPath - Path to glossary YAML file
 */
declare function loadGlossary(glossaryPath: string): Glossary;
/**
 * Merge two glossaries (user glossary extends defaults)
 */
declare function mergeGlossaries(base: Glossary, extension: Glossary): Glossary;
/**
 * Initialize the glossary (call once at startup)
 * @param glossaryPath - Optional path to custom glossary
 */
declare function initGlossary(glossaryPath?: string): void;
/**
 * Get the current glossary
 */
declare function getGlossary(): Glossary;
/**
 * Resolve a term to its canonical form
 * @param term - Term to resolve
 * @returns Canonical form or original term if not found
 */
declare function resolveCanonical(term: string): string;
/**
 * Normalize step text by replacing synonyms with canonical terms
 * @param text - Step text to normalize
 * @returns Normalized text
 */
declare function normalizeStepText(text: string): string;
/**
 * Get all synonyms for a canonical term
 */
declare function getSynonyms(canonical: string): string[];
/**
 * Check if a term is a synonym of a canonical term
 */
declare function isSynonymOf(term: string, canonical: string): boolean;
/**
 * Reset the glossary cache (for testing)
 */
declare function resetGlossaryCache(): void;
/**
 * Find a label alias by label text
 * @see T082 - Label alias matching
 */
declare function findLabelAlias(label: string): LabelAlias | null;
/**
 * Get locator info from label alias
 */
declare function getLocatorFromLabel(label: string): {
    strategy: string;
    value: string;
} | null;
/**
 * Find a module method mapping by phrase
 * @see T083 - Module method resolution in step mapper
 */
declare function findModuleMethod(text: string): ModuleMethodMapping | null;
/**
 * Resolve a step to a module method call if it matches
 */
declare function resolveModuleMethod(text: string): {
    module: string;
    method: string;
    params?: Record<string, string>;
} | null;
/**
 * Get all label aliases
 */
declare function getLabelAliases(): LabelAlias[];
/**
 * Get all module method mappings
 */
declare function getModuleMethods(): ModuleMethodMapping[];
/**
 * Extended glossary metadata from LLKB export
 */
interface ExtendedGlossaryMeta {
    exportedAt: string;
    entryCount: number;
    minConfidence?: number;
    sourceComponents?: string[];
    sourceLessons?: string[];
}
/**
 * Load extended glossary from LLKB export file
 * @param glossaryPath - Path to the LLKB-generated glossary TypeScript file
 * @returns Loading result with entry count and metadata
 */
declare function loadExtendedGlossary(glossaryPath: string): Promise<{
    loaded: boolean;
    entryCount: number;
    exportedAt: string | null;
    error?: string;
}>;
/**
 * Clear extended glossary (for testing)
 */
declare function clearExtendedGlossary(): void;
/**
 * Lookup a term in both core glossary and extended LLKB glossary
 * Core glossary takes precedence for exact matches (LLKB only extends, never overrides)
 * @param term - Term to look up
 * @returns IR primitive if found, undefined otherwise
 */
declare function lookupGlossary(term: string): IRPrimitive | undefined;
/**
 * Lookup a term in core glossary only (for priority enforcement)
 * Used when LLKB should NOT override core mappings
 * @param term - Term to look up
 * @returns IR primitive if found, undefined otherwise
 */
declare function lookupCoreGlossary(term: string): IRPrimitive | undefined;
/**
 * Get glossary statistics
 */
declare function getGlossaryStats(): {
    coreEntries: number;
    extendedEntries: number;
    extendedExportedAt: string | null;
    extendedMeta: ExtendedGlossaryMeta | null;
};
/**
 * Check if extended glossary is loaded
 */
declare function hasExtendedGlossary(): boolean;

/**
 * Step Mapper - Convert step text to IR primitives
 * @see research/2026-01-02_autogen-refined-plan.md Section 10
 * @see T073 - Update step mapper to prioritize explicit hints over inference
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 4 - LLKB integration
 */

/**
 * Options for step mapping
 */
interface StepMapperOptions {
    /** Whether to normalize text before matching */
    normalizeText?: boolean;
    /** Whether to include blocked steps for unmatched text */
    includeBlocked?: boolean;
    /** Default timeout for assertions */
    defaultTimeout?: number;
    /** Whether to use LLKB patterns as fallback (default: true) */
    useLlkb?: boolean;
    /** LLKB root directory (default: .artk/llkb) */
    llkbRoot?: string;
    /** Minimum confidence for LLKB pattern matches (default: 0.7) */
    llkbMinConfidence?: number;
    /** Journey ID for LLKB recording (optional) */
    journeyId?: string;
}
/**
 * Result of mapping a single step
 */
interface StepMappingResult {
    /** The parsed primitive, or null if not matched */
    primitive: IRPrimitive | null;
    /** Original text that was mapped */
    sourceText: string;
    /** Whether this is an assertion (expect*) or action */
    isAssertion: boolean;
    /** Warning or error message if any */
    message?: string;
    /** Source of the match */
    matchSource?: 'pattern' | 'llkb' | 'hints' | 'none';
    /** LLKB pattern ID if matched via LLKB */
    llkbPatternId?: string;
    /** LLKB match confidence if matched via LLKB */
    llkbConfidence?: number;
}
/**
 * Result of mapping an acceptance criterion
 */
interface ACMappingResult {
    /** The mapped IR step */
    step: IRStep;
    /** Individual step mapping results */
    mappings: StepMappingResult[];
    /** Number of successfully mapped steps */
    mappedCount: number;
    /** Number of blocked/unmatched steps */
    blockedCount: number;
}
/**
 * Map a single text step to an IR primitive
 */
declare function mapStepText(text: string, options?: StepMapperOptions): StepMappingResult;
/**
 * Map an acceptance criterion to an IR step
 */
declare function mapAcceptanceCriterion(ac: AcceptanceCriterion, proceduralSteps: ProceduralStep[], options?: StepMapperOptions): ACMappingResult;
/**
 * Map a procedural step to an IR step
 */
declare function mapProceduralStep(ps: ProceduralStep, options?: StepMapperOptions): ACMappingResult;
/**
 * Batch map multiple steps
 */
declare function mapSteps(steps: string[], options?: StepMapperOptions): StepMappingResult[];
/**
 * Get mapping statistics (enhanced with LLKB stats)
 */
declare function getMappingStats(mappings: StepMappingResult[]): {
    total: number;
    mapped: number;
    blocked: number;
    actions: number;
    assertions: number;
    mappingRate: number;
    /** Steps matched by core patterns */
    patternMatches: number;
    /** Steps matched by LLKB patterns */
    llkbMatches: number;
    /** Steps matched by hints */
    hintMatches: number;
};
/**
 * Initialize LLKB module for use with step mapping
 * Call this once at the start of generation to enable LLKB patterns
 */
declare function initializeLlkb(): Promise<boolean>;
/**
 * Check if LLKB is available for use
 */
declare function isLlkbAvailable(): boolean;
/**
 * Suggest improvements for blocked steps
 */
declare function suggestImprovements(blockedSteps: StepMappingResult[]): string[];

export { mapProceduralStep as $, type ACMappingResult as A, getGlossaryStats as B, getLabelAliases as C, getLocatorFromLabel as D, type ExtendedGlossaryMeta as E, getMappingStats as F, type Glossary as G, getModuleMethods as H, getPatternCountByCategory as I, getPatternMatches as J, getPatternMetadata as K, type LabelAlias as L, type ModuleMethodMapping as M, getSynonyms as N, hasExtendedGlossary as O, PATTERN_VERSION as P, hoverPatterns as Q, initGlossary as R, type StepPattern as S, initializeLlkb as T, isLlkbAvailable as U, isSynonymOf as V, loadExtendedGlossary as W, loadGlossary as X, lookupCoreGlossary as Y, lookupGlossary as Z, mapAcceptanceCriterion as _, type GlossaryEntry as a, mapStepText as a0, mapSteps as a1, matchPattern as a2, mergeGlossaries as a3, navigationPatterns as a4, normalizeStepText as a5, parseSelectorToLocator as a6, resetGlossaryCache as a7, resolveCanonical as a8, resolveModuleMethod as a9, selectPatterns as aa, structuredPatterns as ab, suggestImprovements as ac, toastPatterns as ad, urlPatterns as ae, visibilityPatterns as af, waitPatterns as ag, type PatternMatch as b, type PatternMetadata as c, type StepMapperOptions as d, type StepMappingResult as e, allPatterns as f, authPatterns as g, checkPatterns as h, clearExtendedGlossary as i, clickPatterns as j, createLocatorFromMatch as k, createValueFromText as l, defaultGlossary as m, extendedAssertionPatterns as n, extendedClickPatterns as o, extendedFillPatterns as p, extendedNavigationPatterns as q, extendedSelectPatterns as r, extendedWaitPatterns as s, fillPatterns as t, findLabelAlias as u, findMatchingPatterns as v, findModuleMethod as w, focusPatterns as x, getAllPatternNames as y, getGlossary as z };
