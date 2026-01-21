import { a as IRPrimitive, L as LocatorStrategy, c as LocatorSpec, V as ValueSpec, d as IRStep } from '../types-CDhy20ih.js';
import { z } from 'zod';
import { F as AcceptanceCriterion, G as ProceduralStep } from '../parseJourney-BY3R1Dwj.js';

/**
 * Step Mapping Patterns - Regex patterns for parsing step text into IR primitives
 * @see research/2026-01-02_autogen-refined-plan.md Section 10
 */

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
 * Step Mapper - Convert step text to IR primitives
 * @see research/2026-01-02_autogen-refined-plan.md Section 10
 * @see T073 - Update step mapper to prioritize explicit hints over inference
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
 * Get mapping statistics
 */
declare function getMappingStats(mappings: StepMappingResult[]): {
    total: number;
    mapped: number;
    blocked: number;
    actions: number;
    assertions: number;
    mappingRate: number;
};
/**
 * Suggest improvements for blocked steps
 */
declare function suggestImprovements(blockedSteps: StepMappingResult[]): string[];

export { type ACMappingResult, type Glossary, type GlossaryEntry, type LabelAlias, type ModuleMethodMapping, type PatternMatch, type StepMapperOptions, type StepMappingResult, type StepPattern, allPatterns, authPatterns, checkPatterns, clickPatterns, createLocatorFromMatch, createValueFromText, defaultGlossary, fillPatterns, findLabelAlias, findModuleMethod, getGlossary, getLabelAliases, getLocatorFromLabel, getMappingStats, getModuleMethods, getPatternMatches, getSynonyms, initGlossary, isSynonymOf, loadGlossary, mapAcceptanceCriterion, mapProceduralStep, mapStepText, mapSteps, matchPattern, mergeGlossaries, navigationPatterns, normalizeStepText, parseSelectorToLocator, resetGlossaryCache, resolveCanonical, resolveModuleMethod, selectPatterns, structuredPatterns, suggestImprovements, toastPatterns, urlPatterns, visibilityPatterns, waitPatterns };
