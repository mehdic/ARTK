"use strict";
/**
 * @module types/context
 * @description Context type definitions for ARTK E2E independent architecture.
 * Defines the persistent state for inter-prompt communication.
 *
 * The context file (.artk/context.json) is created by /init and read by
 * subsequent commands (/discover, /journey-propose, etc.) to maintain
 * state across prompts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtkContextExtendedSchema = exports.JourneyStatsSchema = exports.DiscoveryContextSchema = exports.DetectedTargetSchema = exports.PilotContextSchema = exports.ArtkTargetSchema = exports.MIN_TARGETS = exports.MAX_TARGETS = exports.CONTEXT_SCHEMA_VERSION = void 0;
exports.isArtkContext = isArtkContext;
exports.validateArtkContext = validateArtkContext;
exports.validateArtkContextExtended = validateArtkContextExtended;
const zod_1 = require("zod");
/**
 * Context schema version.
 * Update this when making breaking changes to the context schema.
 */
exports.CONTEXT_SCHEMA_VERSION = '1.0';
/**
 * Type guard to check if a value is a valid ArtkContext.
 */
function isArtkContext(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const obj = value;
    // Check version
    if (obj.version !== exports.CONTEXT_SCHEMA_VERSION)
        return false;
    // Check initialized_at
    if (typeof obj.initialized_at !== 'string')
        return false;
    // Check project
    if (typeof obj.project !== 'object' || obj.project === null)
        return false;
    const project = obj.project;
    if (typeof project.name !== 'string')
        return false;
    if (typeof project.root !== 'string')
        return false;
    // Check targets (basic check, detailed validation elsewhere)
    if (!Array.isArray(obj.targets))
        return false;
    if (obj.targets.length < 1 || obj.targets.length > 5)
        return false;
    // Check install
    if (typeof obj.install !== 'object' || obj.install === null)
        return false;
    const install = obj.install;
    if (typeof install.artk_core_version !== 'string')
        return false;
    if (typeof install.playwright_version !== 'string')
        return false;
    if (typeof install.script_path !== 'string')
        return false;
    return true;
}
/**
 * Maximum number of targets allowed.
 */
exports.MAX_TARGETS = 5;
/**
 * Minimum number of targets required.
 */
exports.MIN_TARGETS = 1;
// =============================================================================
// Zod Schemas for Validation
// =============================================================================
/**
 * Zod schema for ArtkTarget.
 */
exports.ArtkTargetSchema = zod_1.z.object({
    name: zod_1.z.string().regex(/^[a-z][a-z0-9-]*$/),
    path: zod_1.z.string(),
    type: zod_1.z.enum(['react-spa', 'vue-spa', 'angular', 'next', 'nuxt', 'other']),
    detected_by: zod_1.z.array(zod_1.z.string()),
    description: zod_1.z.string().optional(),
});
/**
 * Zod schema for PilotContext.
 */
exports.PilotContextSchema = zod_1.z.object({
    project: zod_1.z.string(),
    phase: zod_1.z.enum([
        'discovery',
        'propose',
        'define',
        'implement',
        'validate',
        'verify',
    ]),
    lastCommand: zod_1.z.string(),
    lastCommandAt: zod_1.z.string(),
});
/**
 * Zod schema for DetectedTarget.
 */
exports.DetectedTargetSchema = zod_1.z.object({
    name: zod_1.z.string(),
    path: zod_1.z.string(),
    type: zod_1.z.enum(['react-spa', 'vue-spa', 'angular', 'next', 'nuxt', 'other']),
    confidence: zod_1.z.enum(['high', 'medium', 'low']),
    signals: zod_1.z.array(zod_1.z.string()),
});
/**
 * Zod schema for DiscoveryContext.
 */
exports.DiscoveryContextSchema = zod_1.z.object({
    routes: zod_1.z.array(zod_1.z.object({
        path: zod_1.z.string(),
        name: zod_1.z.string(),
        authRequired: zod_1.z.boolean(),
        roles: zod_1.z.array(zod_1.z.string()).optional(),
    })),
    components: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        path: zod_1.z.string(),
        type: zod_1.z.enum(['page', 'layout', 'form', 'table', 'modal']),
    })),
});
/**
 * Zod schema for JourneyStats.
 */
exports.JourneyStatsSchema = zod_1.z.object({
    proposed: zod_1.z.number().int().min(0),
    defined: zod_1.z.number().int().min(0),
    implemented: zod_1.z.number().int().min(0),
    verified: zod_1.z.number().int().min(0),
});
/**
 * Zod schema for base ArtkContext (internal use only).
 * Note: The canonical ArtkContextSchema in schemas.ts has additional validation.
 * This simpler version is used here for .extend() support.
 */
const ArtkContextSchemaBase = zod_1.z.object({
    version: zod_1.z.literal(exports.CONTEXT_SCHEMA_VERSION),
    initialized_at: zod_1.z.string(),
    project: zod_1.z.object({
        name: zod_1.z.string(),
        root: zod_1.z.string(),
    }),
    targets: zod_1.z.array(exports.ArtkTargetSchema).min(1).max(5),
    install: zod_1.z.object({
        artk_core_version: zod_1.z.string(),
        playwright_version: zod_1.z.string(),
        script_path: zod_1.z.string(),
    }),
});
/**
 * Zod schema for extended ArtkContext with pilot fields.
 */
exports.ArtkContextExtendedSchema = ArtkContextSchemaBase.extend({
    pilot: exports.PilotContextSchema.optional(),
    detectedTargets: zod_1.z.array(exports.DetectedTargetSchema).optional(),
    discovery: exports.DiscoveryContextSchema.optional(),
    journeys: exports.JourneyStatsSchema.optional(),
});
/**
 * Validates an ArtkContext object using Zod (internal version).
 * Note: This uses the base schema. For full validation with refinements,
 * use validateArtkContext from schemas.ts.
 */
function validateArtkContext(value) {
    const result = ArtkContextSchemaBase.safeParse(value);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Validates an extended ArtkContext object using Zod.
 */
function validateArtkContextExtended(value) {
    const result = exports.ArtkContextExtendedSchema.safeParse(value);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
//# sourceMappingURL=context.js.map