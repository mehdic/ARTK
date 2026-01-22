"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuarantinedJourneyFrontmatterSchema = exports.ImplementedJourneyFrontmatterSchema = exports.ClarifiedJourneyFrontmatterSchema = exports.JourneyFrontmatterSchema = exports.TestDataSetSchema = exports.PerformanceSchema = exports.AccessibilitySchema = exports.AccessibilityTimingSchema = exports.VisualRegressionSchema = exports.NegativePathSchema = exports.LinksSchema = exports.TestRefSchema = exports.ModulesSchema = exports.DataConfigSchema = exports.CompletionSignalSchema = exports.ElementStateSchema = exports.CompletionTypeSchema = exports.CleanupStrategySchema = exports.DataStrategySchema = exports.JourneyTierSchema = exports.JourneyStatusSchema = void 0;
exports.validateForAutoGen = validateForAutoGen;
/**
 * Journey Frontmatter Zod Schema
 * @see research/2026-01-02_autogen-refined-plan.md Section 8
 */
const zod_1 = require("zod");
/**
 * Journey status enum
 */
exports.JourneyStatusSchema = zod_1.z.enum([
    'proposed',
    'defined',
    'clarified',
    'implemented',
    'quarantined',
    'deprecated',
]);
/**
 * Journey tier enum
 */
exports.JourneyTierSchema = zod_1.z.enum(['smoke', 'release', 'regression']);
/**
 * Data strategy enum
 */
exports.DataStrategySchema = zod_1.z.enum(['seed', 'create', 'reuse']);
/**
 * Cleanup strategy enum
 */
exports.CleanupStrategySchema = zod_1.z.enum(['required', 'best-effort', 'none']);
/**
 * Completion signal type enum
 */
exports.CompletionTypeSchema = zod_1.z.enum(['url', 'toast', 'element', 'text', 'title', 'api']);
/**
 * Element state enum for completion signals
 */
exports.ElementStateSchema = zod_1.z.enum(['visible', 'hidden', 'attached', 'detached']);
/**
 * Completion signal schema
 */
exports.CompletionSignalSchema = zod_1.z.object({
    type: exports.CompletionTypeSchema,
    value: zod_1.z.string().min(1, 'Completion signal value is required'),
    options: zod_1.z.object({
        timeout: zod_1.z.number().positive().optional(),
        exact: zod_1.z.boolean().optional(),
        state: exports.ElementStateSchema.optional(),
        method: zod_1.z.string().optional(),
        status: zod_1.z.number().int().positive().optional(),
    }).optional(),
});
/**
 * Data configuration schema
 */
exports.DataConfigSchema = zod_1.z.object({
    strategy: exports.DataStrategySchema.default('create'),
    cleanup: exports.CleanupStrategySchema.default('best-effort'),
});
/**
 * Module dependencies schema
 */
exports.ModulesSchema = zod_1.z.object({
    foundation: zod_1.z.array(zod_1.z.string()).default([]),
    features: zod_1.z.array(zod_1.z.string()).default([]),
});
/**
 * Test reference schema
 */
exports.TestRefSchema = zod_1.z.object({
    file: zod_1.z.string(),
    line: zod_1.z.number().optional(),
});
/**
 * Link schema
 */
exports.LinksSchema = zod_1.z.object({
    issues: zod_1.z.array(zod_1.z.string()).optional(),
    prs: zod_1.z.array(zod_1.z.string()).optional(),
    docs: zod_1.z.array(zod_1.z.string()).optional(),
});
/**
 * Negative path schema for error scenario testing
 */
exports.NegativePathSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Negative path name is required'),
    input: zod_1.z.record(zod_1.z.any()),
    expectedError: zod_1.z.string().min(1, 'Expected error message is required'),
    expectedElement: zod_1.z.string().optional(),
});
/**
 * Visual regression configuration schema
 */
exports.VisualRegressionSchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    snapshots: zod_1.z.array(zod_1.z.string()).optional(),
    threshold: zod_1.z.number().min(0).max(1).optional(),
});
/**
 * Accessibility timing mode enum
 */
exports.AccessibilityTimingSchema = zod_1.z.enum(['afterEach', 'inTest']);
/**
 * Accessibility configuration schema
 */
exports.AccessibilitySchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    rules: zod_1.z.array(zod_1.z.string()).optional(),
    exclude: zod_1.z.array(zod_1.z.string()).optional(),
    /**
     * When to run accessibility checks:
     * - 'afterEach': Run after each test (default, catches issues but doesn't fail individual tests)
     * - 'inTest': Run within test steps (fails immediately, better for CI)
     */
    timing: exports.AccessibilityTimingSchema.default('afterEach'),
});
/**
 * Performance budgets schema
 */
exports.PerformanceSchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    budgets: zod_1.z
        .object({
        lcp: zod_1.z.number().positive().optional(),
        fid: zod_1.z.number().positive().optional(),
        cls: zod_1.z.number().min(0).optional(),
        ttfb: zod_1.z.number().positive().optional(),
    })
        .optional(),
    /** Timeout for collecting performance metrics in ms (default: 3000) */
    collectTimeout: zod_1.z.number().positive().optional(),
});
/**
 * Test data set schema for parameterized/data-driven tests
 */
exports.TestDataSetSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Test data set name is required'),
    description: zod_1.z.string().optional(),
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
});
/**
 * Complete Journey frontmatter schema
 */
exports.JourneyFrontmatterSchema = zod_1.z.object({
    id: zod_1.z
        .string()
        .regex(/^JRN-\d{4}$/, 'Journey ID must be in format JRN-XXXX'),
    title: zod_1.z.string().min(1, 'Title is required'),
    status: exports.JourneyStatusSchema,
    tier: exports.JourneyTierSchema,
    scope: zod_1.z.string().min(1, 'Scope is required'),
    actor: zod_1.z.string().min(1, 'Actor is required'),
    revision: zod_1.z.number().int().positive().default(1),
    owner: zod_1.z.string().optional(),
    statusReason: zod_1.z.string().optional(),
    modules: exports.ModulesSchema.default({ foundation: [], features: [] }),
    tests: zod_1.z.array(zod_1.z.union([zod_1.z.string(), exports.TestRefSchema])).default([]),
    data: exports.DataConfigSchema.optional(),
    completion: zod_1.z.array(exports.CompletionSignalSchema).optional(),
    links: exports.LinksSchema.optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    flags: zod_1.z
        .object({
        required: zod_1.z.array(zod_1.z.string()).optional(),
        forbidden: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .optional(),
    prerequisites: zod_1.z
        .array(zod_1.z.string())
        .optional()
        .describe('Array of Journey IDs that must run first'),
    negativePaths: zod_1.z
        .array(exports.NegativePathSchema)
        .optional()
        .describe('Error scenarios to test'),
    testData: zod_1.z
        .array(exports.TestDataSetSchema)
        .optional()
        .describe('Parameterized test data sets for data-driven testing'),
    visualRegression: exports.VisualRegressionSchema.optional(),
    accessibility: exports.AccessibilitySchema.optional(),
    performance: exports.PerformanceSchema.optional(),
});
/**
 * Schema specifically for clarified journeys (required for AutoGen)
 */
exports.ClarifiedJourneyFrontmatterSchema = exports.JourneyFrontmatterSchema.extend({
    status: zod_1.z.literal('clarified'),
}).refine((data) => {
    // Clarified journeys should have completion signals
    return data.completion && data.completion.length > 0;
}, {
    message: 'Clarified journeys must have at least one completion signal',
    path: ['completion'],
});
/**
 * Schema for implemented journeys (must have tests)
 */
exports.ImplementedJourneyFrontmatterSchema = exports.JourneyFrontmatterSchema.extend({
    status: zod_1.z.literal('implemented'),
}).refine((data) => {
    return data.tests && data.tests.length > 0;
}, {
    message: 'Implemented journeys must have at least one test reference',
    path: ['tests'],
});
/**
 * Schema for quarantined journeys (must have owner and reason)
 */
exports.QuarantinedJourneyFrontmatterSchema = exports.JourneyFrontmatterSchema.extend({
    status: zod_1.z.literal('quarantined'),
    owner: zod_1.z.string().min(1, 'Quarantined journeys require an owner'),
    statusReason: zod_1.z.string().min(1, 'Quarantined journeys require a status reason'),
}).refine((data) => {
    return data.links?.issues && data.links.issues.length > 0;
}, {
    message: 'Quarantined journeys must have at least one linked issue',
    path: ['links', 'issues'],
});
/**
 * Validate that a journey is ready for AutoGen (must be clarified)
 */
function validateForAutoGen(frontmatter) {
    const errors = [];
    if (frontmatter.status !== 'clarified') {
        errors.push(`Journey status must be "clarified" for AutoGen, got "${frontmatter.status}"`);
    }
    if (!frontmatter.completion || frontmatter.completion.length === 0) {
        errors.push('Journey must have completion signals defined');
    }
    if (!frontmatter.actor) {
        errors.push('Journey must have an actor defined');
    }
    if (!frontmatter.scope) {
        errors.push('Journey must have a scope defined');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=schema.js.map