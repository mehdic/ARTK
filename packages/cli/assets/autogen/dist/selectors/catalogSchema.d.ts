/**
 * Selector Catalog Schema - Define structure for repo-local selector catalog
 * @see T088 - Define selector catalog JSON schema
 */
import { z } from 'zod';
/**
 * Selector entry in the catalog
 */
export declare const SelectorEntrySchema: z.ZodObject<{
    /** Unique identifier for this selector */
    id: z.ZodString;
    /** Human-readable description */
    description: z.ZodOptional<z.ZodString>;
    /** The selector strategy */
    strategy: z.ZodEnum<["testid", "role", "label", "text", "css", "xpath"]>;
    /** The selector value */
    value: z.ZodString;
    /** Additional options for the locator */
    options: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        level: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        exact?: boolean | undefined;
        level?: number | undefined;
    }, {
        name?: string | undefined;
        exact?: boolean | undefined;
        level?: number | undefined;
    }>>;
    /** Component or page this selector belongs to */
    component: z.ZodOptional<z.ZodString>;
    /** File where this selector was discovered */
    sourceFile: z.ZodOptional<z.ZodString>;
    /** Line number in source file */
    sourceLine: z.ZodOptional<z.ZodNumber>;
    /** Tags for categorization */
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Whether this is a stable selector (not likely to change) */
    stable: z.ZodDefault<z.ZodBoolean>;
    /** Last verified timestamp */
    lastVerified: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    strategy: "role" | "label" | "text" | "testid" | "css" | "xpath";
    value: string;
    id: string;
    stable: boolean;
    options?: {
        name?: string | undefined;
        exact?: boolean | undefined;
        level?: number | undefined;
    } | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
    component?: string | undefined;
    sourceFile?: string | undefined;
    sourceLine?: number | undefined;
    lastVerified?: string | undefined;
}, {
    strategy: "role" | "label" | "text" | "testid" | "css" | "xpath";
    value: string;
    id: string;
    options?: {
        name?: string | undefined;
        exact?: boolean | undefined;
        level?: number | undefined;
    } | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
    component?: string | undefined;
    sourceFile?: string | undefined;
    sourceLine?: number | undefined;
    stable?: boolean | undefined;
    lastVerified?: string | undefined;
}>;
/**
 * Component entry in the catalog
 */
export declare const ComponentEntrySchema: z.ZodObject<{
    /** Component name */
    name: z.ZodString;
    /** Component file path */
    path: z.ZodOptional<z.ZodString>;
    /** Selectors within this component */
    selectors: z.ZodArray<z.ZodString, "many">;
    /** Child components */
    children: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    selectors: string[];
    path?: string | undefined;
    children?: string[] | undefined;
}, {
    name: string;
    selectors: string[];
    path?: string | undefined;
    children?: string[] | undefined;
}>;
/**
 * Page entry in the catalog
 */
export declare const PageEntrySchema: z.ZodObject<{
    /** Page name */
    name: z.ZodString;
    /** Route pattern */
    route: z.ZodOptional<z.ZodString>;
    /** Page file path */
    path: z.ZodOptional<z.ZodString>;
    /** Components on this page */
    components: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Direct selectors on this page */
    selectors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    path?: string | undefined;
    selectors?: string[] | undefined;
    route?: string | undefined;
    components?: string[] | undefined;
}, {
    name: string;
    path?: string | undefined;
    selectors?: string[] | undefined;
    route?: string | undefined;
    components?: string[] | undefined;
}>;
/**
 * CSS debt entry - tracks CSS selectors that should be migrated
 */
export declare const CSSDebtEntrySchema: z.ZodObject<{
    /** The CSS selector being used */
    selector: z.ZodString;
    /** Files using this selector */
    usages: z.ZodArray<z.ZodObject<{
        file: z.ZodString;
        line: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        file: string;
        line: number;
    }, {
        file: string;
        line: number;
    }>, "many">;
    /** Suggested replacement */
    suggestedReplacement: z.ZodOptional<z.ZodObject<{
        strategy: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        strategy: string;
        value: string;
    }, {
        strategy: string;
        value: string;
    }>>;
    /** Priority for migration (higher = more urgent) */
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
    /** Reason this is considered debt */
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    priority: "low" | "medium" | "high";
    selector: string;
    usages: {
        file: string;
        line: number;
    }[];
    suggestedReplacement?: {
        strategy: string;
        value: string;
    } | undefined;
    reason?: string | undefined;
}, {
    selector: string;
    usages: {
        file: string;
        line: number;
    }[];
    priority?: "low" | "medium" | "high" | undefined;
    suggestedReplacement?: {
        strategy: string;
        value: string;
    } | undefined;
    reason?: string | undefined;
}>;
/**
 * Complete selector catalog schema
 */
export declare const SelectorCatalogSchema: z.ZodObject<{
    /** Schema version */
    version: z.ZodDefault<z.ZodString>;
    /** Generation timestamp */
    generatedAt: z.ZodString;
    /** Source directory that was scanned */
    sourceDir: z.ZodOptional<z.ZodString>;
    /** All selectors indexed by ID */
    selectors: z.ZodRecord<z.ZodString, z.ZodObject<{
        /** Unique identifier for this selector */
        id: z.ZodString;
        /** Human-readable description */
        description: z.ZodOptional<z.ZodString>;
        /** The selector strategy */
        strategy: z.ZodEnum<["testid", "role", "label", "text", "css", "xpath"]>;
        /** The selector value */
        value: z.ZodString;
        /** Additional options for the locator */
        options: z.ZodOptional<z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            exact: z.ZodOptional<z.ZodBoolean>;
            level: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            name?: string | undefined;
            exact?: boolean | undefined;
            level?: number | undefined;
        }, {
            name?: string | undefined;
            exact?: boolean | undefined;
            level?: number | undefined;
        }>>;
        /** Component or page this selector belongs to */
        component: z.ZodOptional<z.ZodString>;
        /** File where this selector was discovered */
        sourceFile: z.ZodOptional<z.ZodString>;
        /** Line number in source file */
        sourceLine: z.ZodOptional<z.ZodNumber>;
        /** Tags for categorization */
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Whether this is a stable selector (not likely to change) */
        stable: z.ZodDefault<z.ZodBoolean>;
        /** Last verified timestamp */
        lastVerified: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        strategy: "role" | "label" | "text" | "testid" | "css" | "xpath";
        value: string;
        id: string;
        stable: boolean;
        options?: {
            name?: string | undefined;
            exact?: boolean | undefined;
            level?: number | undefined;
        } | undefined;
        description?: string | undefined;
        tags?: string[] | undefined;
        component?: string | undefined;
        sourceFile?: string | undefined;
        sourceLine?: number | undefined;
        lastVerified?: string | undefined;
    }, {
        strategy: "role" | "label" | "text" | "testid" | "css" | "xpath";
        value: string;
        id: string;
        options?: {
            name?: string | undefined;
            exact?: boolean | undefined;
            level?: number | undefined;
        } | undefined;
        description?: string | undefined;
        tags?: string[] | undefined;
        component?: string | undefined;
        sourceFile?: string | undefined;
        sourceLine?: number | undefined;
        stable?: boolean | undefined;
        lastVerified?: string | undefined;
    }>>;
    /** Components indexed by name */
    components: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        /** Component name */
        name: z.ZodString;
        /** Component file path */
        path: z.ZodOptional<z.ZodString>;
        /** Selectors within this component */
        selectors: z.ZodArray<z.ZodString, "many">;
        /** Child components */
        children: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        selectors: string[];
        path?: string | undefined;
        children?: string[] | undefined;
    }, {
        name: string;
        selectors: string[];
        path?: string | undefined;
        children?: string[] | undefined;
    }>>>;
    /** Pages indexed by name */
    pages: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        /** Page name */
        name: z.ZodString;
        /** Route pattern */
        route: z.ZodOptional<z.ZodString>;
        /** Page file path */
        path: z.ZodOptional<z.ZodString>;
        /** Components on this page */
        components: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Direct selectors on this page */
        selectors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        path?: string | undefined;
        selectors?: string[] | undefined;
        route?: string | undefined;
        components?: string[] | undefined;
    }, {
        name: string;
        path?: string | undefined;
        selectors?: string[] | undefined;
        route?: string | undefined;
        components?: string[] | undefined;
    }>>>;
    /** TestIDs found in the codebase */
    testIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** CSS debt entries */
    cssDebt: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** The CSS selector being used */
        selector: z.ZodString;
        /** Files using this selector */
        usages: z.ZodArray<z.ZodObject<{
            file: z.ZodString;
            line: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            file: string;
            line: number;
        }, {
            file: string;
            line: number;
        }>, "many">;
        /** Suggested replacement */
        suggestedReplacement: z.ZodOptional<z.ZodObject<{
            strategy: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            strategy: string;
            value: string;
        }, {
            strategy: string;
            value: string;
        }>>;
        /** Priority for migration (higher = more urgent) */
        priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
        /** Reason this is considered debt */
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        priority: "low" | "medium" | "high";
        selector: string;
        usages: {
            file: string;
            line: number;
        }[];
        suggestedReplacement?: {
            strategy: string;
            value: string;
        } | undefined;
        reason?: string | undefined;
    }, {
        selector: string;
        usages: {
            file: string;
            line: number;
        }[];
        priority?: "low" | "medium" | "high" | undefined;
        suggestedReplacement?: {
            strategy: string;
            value: string;
        } | undefined;
        reason?: string | undefined;
    }>, "many">>;
    /** Statistics */
    stats: z.ZodOptional<z.ZodObject<{
        totalSelectors: z.ZodNumber;
        byStrategy: z.ZodRecord<z.ZodString, z.ZodNumber>;
        stableCount: z.ZodNumber;
        unstableCount: z.ZodNumber;
        cssDebtCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalSelectors: number;
        byStrategy: Record<string, number>;
        stableCount: number;
        unstableCount: number;
        cssDebtCount: number;
    }, {
        totalSelectors: number;
        byStrategy: Record<string, number>;
        stableCount: number;
        unstableCount: number;
        cssDebtCount: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    version: string;
    selectors: Record<string, {
        strategy: "role" | "label" | "text" | "testid" | "css" | "xpath";
        value: string;
        id: string;
        stable: boolean;
        options?: {
            name?: string | undefined;
            exact?: boolean | undefined;
            level?: number | undefined;
        } | undefined;
        description?: string | undefined;
        tags?: string[] | undefined;
        component?: string | undefined;
        sourceFile?: string | undefined;
        sourceLine?: number | undefined;
        lastVerified?: string | undefined;
    }>;
    components: Record<string, {
        name: string;
        selectors: string[];
        path?: string | undefined;
        children?: string[] | undefined;
    }>;
    generatedAt: string;
    pages: Record<string, {
        name: string;
        path?: string | undefined;
        selectors?: string[] | undefined;
        route?: string | undefined;
        components?: string[] | undefined;
    }>;
    testIds: string[];
    cssDebt: {
        priority: "low" | "medium" | "high";
        selector: string;
        usages: {
            file: string;
            line: number;
        }[];
        suggestedReplacement?: {
            strategy: string;
            value: string;
        } | undefined;
        reason?: string | undefined;
    }[];
    sourceDir?: string | undefined;
    stats?: {
        totalSelectors: number;
        byStrategy: Record<string, number>;
        stableCount: number;
        unstableCount: number;
        cssDebtCount: number;
    } | undefined;
}, {
    selectors: Record<string, {
        strategy: "role" | "label" | "text" | "testid" | "css" | "xpath";
        value: string;
        id: string;
        options?: {
            name?: string | undefined;
            exact?: boolean | undefined;
            level?: number | undefined;
        } | undefined;
        description?: string | undefined;
        tags?: string[] | undefined;
        component?: string | undefined;
        sourceFile?: string | undefined;
        sourceLine?: number | undefined;
        stable?: boolean | undefined;
        lastVerified?: string | undefined;
    }>;
    generatedAt: string;
    version?: string | undefined;
    components?: Record<string, {
        name: string;
        selectors: string[];
        path?: string | undefined;
        children?: string[] | undefined;
    }> | undefined;
    sourceDir?: string | undefined;
    pages?: Record<string, {
        name: string;
        path?: string | undefined;
        selectors?: string[] | undefined;
        route?: string | undefined;
        components?: string[] | undefined;
    }> | undefined;
    testIds?: string[] | undefined;
    cssDebt?: {
        selector: string;
        usages: {
            file: string;
            line: number;
        }[];
        priority?: "low" | "medium" | "high" | undefined;
        suggestedReplacement?: {
            strategy: string;
            value: string;
        } | undefined;
        reason?: string | undefined;
    }[] | undefined;
    stats?: {
        totalSelectors: number;
        byStrategy: Record<string, number>;
        stableCount: number;
        unstableCount: number;
        cssDebtCount: number;
    } | undefined;
}>;
export type SelectorEntry = z.infer<typeof SelectorEntrySchema>;
export type ComponentEntry = z.infer<typeof ComponentEntrySchema>;
export type PageEntry = z.infer<typeof PageEntrySchema>;
export type CSSDebtEntry = z.infer<typeof CSSDebtEntrySchema>;
export type SelectorCatalog = z.infer<typeof SelectorCatalogSchema>;
/**
 * Create an empty catalog
 */
export declare function createEmptyCatalog(): SelectorCatalog;
/**
 * Validate a catalog object
 */
export declare function validateCatalog(catalog: unknown): {
    valid: boolean;
    errors: string[];
    catalog?: SelectorCatalog;
};
//# sourceMappingURL=catalogSchema.d.ts.map