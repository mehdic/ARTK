"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectorCatalogSchema = exports.CSSDebtEntrySchema = exports.PageEntrySchema = exports.ComponentEntrySchema = exports.SelectorEntrySchema = void 0;
exports.createEmptyCatalog = createEmptyCatalog;
exports.validateCatalog = validateCatalog;
/**
 * Selector Catalog Schema - Define structure for repo-local selector catalog
 * @see T088 - Define selector catalog JSON schema
 */
const zod_1 = require("zod");
/**
 * Selector entry in the catalog
 */
exports.SelectorEntrySchema = zod_1.z.object({
    /** Unique identifier for this selector */
    id: zod_1.z.string(),
    /** Human-readable description */
    description: zod_1.z.string().optional(),
    /** The selector strategy */
    strategy: zod_1.z.enum(['testid', 'role', 'label', 'text', 'css', 'xpath']),
    /** The selector value */
    value: zod_1.z.string(),
    /** Additional options for the locator */
    options: zod_1.z
        .object({
        name: zod_1.z.string().optional(),
        exact: zod_1.z.boolean().optional(),
        level: zod_1.z.number().optional(),
    })
        .optional(),
    /** Component or page this selector belongs to */
    component: zod_1.z.string().optional(),
    /** File where this selector was discovered */
    sourceFile: zod_1.z.string().optional(),
    /** Line number in source file */
    sourceLine: zod_1.z.number().optional(),
    /** Tags for categorization */
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    /** Whether this is a stable selector (not likely to change) */
    stable: zod_1.z.boolean().default(true),
    /** Last verified timestamp */
    lastVerified: zod_1.z.string().optional(),
});
/**
 * Component entry in the catalog
 */
exports.ComponentEntrySchema = zod_1.z.object({
    /** Component name */
    name: zod_1.z.string(),
    /** Component file path */
    path: zod_1.z.string().optional(),
    /** Selectors within this component */
    selectors: zod_1.z.array(zod_1.z.string()), // References to selector IDs
    /** Child components */
    children: zod_1.z.array(zod_1.z.string()).optional(),
});
/**
 * Page entry in the catalog
 */
exports.PageEntrySchema = zod_1.z.object({
    /** Page name */
    name: zod_1.z.string(),
    /** Route pattern */
    route: zod_1.z.string().optional(),
    /** Page file path */
    path: zod_1.z.string().optional(),
    /** Components on this page */
    components: zod_1.z.array(zod_1.z.string()).optional(),
    /** Direct selectors on this page */
    selectors: zod_1.z.array(zod_1.z.string()).optional(),
});
/**
 * CSS debt entry - tracks CSS selectors that should be migrated
 */
exports.CSSDebtEntrySchema = zod_1.z.object({
    /** The CSS selector being used */
    selector: zod_1.z.string(),
    /** Files using this selector */
    usages: zod_1.z.array(zod_1.z.object({
        file: zod_1.z.string(),
        line: zod_1.z.number(),
    })),
    /** Suggested replacement */
    suggestedReplacement: zod_1.z
        .object({
        strategy: zod_1.z.string(),
        value: zod_1.z.string(),
    })
        .optional(),
    /** Priority for migration (higher = more urgent) */
    priority: zod_1.z.enum(['low', 'medium', 'high']).default('medium'),
    /** Reason this is considered debt */
    reason: zod_1.z.string().optional(),
});
/**
 * Complete selector catalog schema
 */
exports.SelectorCatalogSchema = zod_1.z.object({
    /** Schema version */
    version: zod_1.z.string().default('1.0.0'),
    /** Generation timestamp */
    generatedAt: zod_1.z.string(),
    /** Source directory that was scanned */
    sourceDir: zod_1.z.string().optional(),
    /** All selectors indexed by ID */
    selectors: zod_1.z.record(exports.SelectorEntrySchema),
    /** Components indexed by name */
    components: zod_1.z.record(exports.ComponentEntrySchema).default({}),
    /** Pages indexed by name */
    pages: zod_1.z.record(exports.PageEntrySchema).default({}),
    /** TestIDs found in the codebase */
    testIds: zod_1.z.array(zod_1.z.string()).default([]),
    /** CSS debt entries */
    cssDebt: zod_1.z.array(exports.CSSDebtEntrySchema).default([]),
    /** Statistics */
    stats: zod_1.z
        .object({
        totalSelectors: zod_1.z.number(),
        byStrategy: zod_1.z.record(zod_1.z.number()),
        stableCount: zod_1.z.number(),
        unstableCount: zod_1.z.number(),
        cssDebtCount: zod_1.z.number(),
    })
        .optional(),
});
/**
 * Create an empty catalog
 */
function createEmptyCatalog() {
    return {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        selectors: {},
        components: {},
        pages: {},
        testIds: [],
        cssDebt: [],
    };
}
/**
 * Validate a catalog object
 */
function validateCatalog(catalog) {
    const result = exports.SelectorCatalogSchema.safeParse(catalog);
    if (result.success) {
        return { valid: true, errors: [], catalog: result.data };
    }
    return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
}
//# sourceMappingURL=catalogSchema.js.map