/**
 * Journey Frontmatter Zod Schema
 * @see research/2026-01-02_autogen-refined-plan.md Section 8
 */
import { z } from 'zod';
/**
 * Journey status enum
 */
export const JourneyStatusSchema = z.enum([
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
export const JourneyTierSchema = z.enum(['smoke', 'release', 'regression']);
/**
 * Data strategy enum
 */
export const DataStrategySchema = z.enum(['seed', 'create', 'reuse']);
/**
 * Cleanup strategy enum
 */
export const CleanupStrategySchema = z.enum(['required', 'best-effort', 'none']);
/**
 * Completion signal type enum
 */
export const CompletionTypeSchema = z.enum(['url', 'toast', 'element', 'title', 'api']);
/**
 * Element state enum for completion signals
 */
export const ElementStateSchema = z.enum(['visible', 'hidden', 'attached', 'detached']);
/**
 * Completion signal schema
 */
export const CompletionSignalSchema = z.object({
    type: CompletionTypeSchema,
    value: z.string().min(1, 'Completion signal value is required'),
    options: z.object({
        timeout: z.number().positive().optional(),
        exact: z.boolean().optional(),
        state: ElementStateSchema.optional(),
        method: z.string().optional(),
        status: z.number().int().positive().optional(),
    }).optional(),
});
/**
 * Data configuration schema
 */
export const DataConfigSchema = z.object({
    strategy: DataStrategySchema.default('create'),
    cleanup: CleanupStrategySchema.default('best-effort'),
});
/**
 * Module dependencies schema
 */
export const ModulesSchema = z.object({
    foundation: z.array(z.string()).default([]),
    features: z.array(z.string()).default([]),
});
/**
 * Test reference schema
 */
export const TestRefSchema = z.object({
    file: z.string(),
    line: z.number().optional(),
});
/**
 * Link schema
 */
export const LinksSchema = z.object({
    issues: z.array(z.string()).optional(),
    prs: z.array(z.string()).optional(),
    docs: z.array(z.string()).optional(),
});
/**
 * Complete Journey frontmatter schema
 */
export const JourneyFrontmatterSchema = z.object({
    id: z
        .string()
        .regex(/^JRN-\d{4}$/, 'Journey ID must be in format JRN-XXXX'),
    title: z.string().min(1, 'Title is required'),
    status: JourneyStatusSchema,
    tier: JourneyTierSchema,
    scope: z.string().min(1, 'Scope is required'),
    actor: z.string().min(1, 'Actor is required'),
    revision: z.number().int().positive().default(1),
    owner: z.string().optional(),
    statusReason: z.string().optional(),
    modules: ModulesSchema.default({ foundation: [], features: [] }),
    tests: z.array(z.union([z.string(), TestRefSchema])).default([]),
    data: DataConfigSchema.optional(),
    completion: z.array(CompletionSignalSchema).optional(),
    links: LinksSchema.optional(),
    tags: z.array(z.string()).optional(),
    flags: z
        .object({
        required: z.array(z.string()).optional(),
        forbidden: z.array(z.string()).optional(),
    })
        .optional(),
});
/**
 * Schema specifically for clarified journeys (required for AutoGen)
 */
export const ClarifiedJourneyFrontmatterSchema = JourneyFrontmatterSchema.extend({
    status: z.literal('clarified'),
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
export const ImplementedJourneyFrontmatterSchema = JourneyFrontmatterSchema.extend({
    status: z.literal('implemented'),
}).refine((data) => {
    return data.tests && data.tests.length > 0;
}, {
    message: 'Implemented journeys must have at least one test reference',
    path: ['tests'],
});
/**
 * Schema for quarantined journeys (must have owner and reason)
 */
export const QuarantinedJourneyFrontmatterSchema = JourneyFrontmatterSchema.extend({
    status: z.literal('quarantined'),
    owner: z.string().min(1, 'Quarantined journeys require an owner'),
    statusReason: z.string().min(1, 'Quarantined journeys require a status reason'),
}).refine((data) => {
    return data.links?.issues && data.links.issues.length > 0;
}, {
    message: 'Quarantined journeys must have at least one linked issue',
    path: ['links', 'issues'],
});
/**
 * Validate that a journey is ready for AutoGen (must be clarified)
 */
export function validateForAutoGen(frontmatter) {
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