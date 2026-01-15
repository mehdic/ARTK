import { z } from 'zod';
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
    entries: {
        canonical: string;
        synonyms: string[];
    }[];
    version: number;
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
export type LabelAlias = z.infer<typeof LabelAliasSchema>;
export type ModuleMethodMapping = z.infer<typeof ModuleMethodMappingSchema>;
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;
export type Glossary = z.infer<typeof GlossarySchema>;
/**
 * Default glossary entries for common terms
 */
export declare const defaultGlossary: Glossary;
/**
 * Load glossary from file
 * @param glossaryPath - Path to glossary YAML file
 */
export declare function loadGlossary(glossaryPath: string): Glossary;
/**
 * Merge two glossaries (user glossary extends defaults)
 */
export declare function mergeGlossaries(base: Glossary, extension: Glossary): Glossary;
/**
 * Initialize the glossary (call once at startup)
 * @param glossaryPath - Optional path to custom glossary
 */
export declare function initGlossary(glossaryPath?: string): void;
/**
 * Get the current glossary
 */
export declare function getGlossary(): Glossary;
/**
 * Resolve a term to its canonical form
 * @param term - Term to resolve
 * @returns Canonical form or original term if not found
 */
export declare function resolveCanonical(term: string): string;
/**
 * Normalize step text by replacing synonyms with canonical terms
 * @param text - Step text to normalize
 * @returns Normalized text
 */
export declare function normalizeStepText(text: string): string;
/**
 * Get all synonyms for a canonical term
 */
export declare function getSynonyms(canonical: string): string[];
/**
 * Check if a term is a synonym of a canonical term
 */
export declare function isSynonymOf(term: string, canonical: string): boolean;
/**
 * Reset the glossary cache (for testing)
 */
export declare function resetGlossaryCache(): void;
/**
 * Find a label alias by label text
 * @see T082 - Label alias matching
 */
export declare function findLabelAlias(label: string): LabelAlias | null;
/**
 * Get locator info from label alias
 */
export declare function getLocatorFromLabel(label: string): {
    strategy: string;
    value: string;
} | null;
/**
 * Find a module method mapping by phrase
 * @see T083 - Module method resolution in step mapper
 */
export declare function findModuleMethod(text: string): ModuleMethodMapping | null;
/**
 * Resolve a step to a module method call if it matches
 */
export declare function resolveModuleMethod(text: string): {
    module: string;
    method: string;
    params?: Record<string, string>;
} | null;
/**
 * Get all label aliases
 */
export declare function getLabelAliases(): LabelAlias[];
/**
 * Get all module method mappings
 */
export declare function getModuleMethods(): ModuleMethodMapping[];
export {};
//# sourceMappingURL=glossary.d.ts.map