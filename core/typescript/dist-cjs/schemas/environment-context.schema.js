"use strict";
/**
 * Zod Schemas for Environment Context
 *
 * Runtime validation schemas matching the JSON schema at
 * specs/001-foundation-compatibility/contracts/environment-context.schema.json
 *
 * @module @artk/core/schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectionResultSchema = exports.DetectionOptionsSchema = exports.EnvironmentContextSchema = exports.NodeVersionParsedSchema = exports.DetectionMethodSchema = exports.DetectionConfidenceSchema = exports.TemplateSourceSchema = exports.ModuleSystemSchema = void 0;
exports.validateEnvironmentContext = validateEnvironmentContext;
exports.safeValidateEnvironmentContext = safeValidateEnvironmentContext;
const zod_1 = require("zod");
/**
 * Module system schema - either CommonJS or ESM
 */
exports.ModuleSystemSchema = zod_1.z.enum(['commonjs', 'esm']);
/**
 * Template source schema - where templates came from
 */
exports.TemplateSourceSchema = zod_1.z.enum(['bundled', 'local-override']);
/**
 * Detection confidence schema
 */
exports.DetectionConfidenceSchema = zod_1.z.enum(['high', 'medium', 'low']);
/**
 * Detection method schema
 */
exports.DetectionMethodSchema = zod_1.z.enum(['package.json', 'tsconfig.json', 'fallback']);
/**
 * Parsed Node.js version schema
 */
exports.NodeVersionParsedSchema = zod_1.z.object({
    /** Major version number (must be >= 18) */
    major: zod_1.z.number().int().min(18, 'Node.js version must be >= 18.0.0'),
    /** Minor version number */
    minor: zod_1.z.number().int().min(0),
    /** Patch version number */
    patch: zod_1.z.number().int().min(0),
});
/**
 * Semver string pattern for Node version
 */
const semverPattern = /^\d+\.\d+\.\d+$/;
/**
 * Environment Context schema
 *
 * Validates the structure of .artk/context.json
 */
exports.EnvironmentContextSchema = zod_1.z.object({
    /** Detected module system from package.json or tsconfig.json */
    moduleSystem: exports.ModuleSystemSchema,
    /** Semantic version of Node.js (e.g., "18.12.1") */
    nodeVersion: zod_1.z.string().regex(semverPattern, 'Invalid semver format'),
    /** Parsed Node.js version components */
    nodeVersionParsed: exports.NodeVersionParsedSchema,
    /** TypeScript module setting from tsconfig.json, or null if not present */
    tsModule: zod_1.z.string().nullable(),
    /** true if Node 18+ and ESM environment */
    supportsImportMeta: zod_1.z.boolean(),
    /** true if Node 20.11.0+ (has import.meta.dirname built-in) */
    supportsBuiltinDirname: zod_1.z.boolean(),
    /** Which template set was used for generation */
    templateVariant: exports.ModuleSystemSchema,
    /** Where templates came from */
    templateSource: exports.TemplateSourceSchema,
    /** ISO 8601 timestamp when detection ran */
    detectionTimestamp: zod_1.z.string().datetime({ message: 'Invalid ISO 8601 timestamp' }),
    /** Confidence level based on signal consistency */
    detectionConfidence: exports.DetectionConfidenceSchema,
    /** Primary method that determined module system */
    detectionMethod: exports.DetectionMethodSchema,
    /** List of warnings encountered during detection */
    warnings: zod_1.z.array(zod_1.z.string()),
});
/**
 * Detection options schema
 */
exports.DetectionOptionsSchema = zod_1.z.object({
    /** Project root directory */
    projectRoot: zod_1.z.string().min(1, 'Project root is required'),
    /** Force re-detection */
    forceDetect: zod_1.z.boolean().optional().default(false),
    /** Timeout in milliseconds */
    timeout: zod_1.z.number().int().min(100).max(30000).optional().default(5000),
});
/**
 * Detection result schema
 */
exports.DetectionResultSchema = zod_1.z.object({
    /** The detected environment context */
    context: exports.EnvironmentContextSchema,
    /** Whether results were loaded from cache */
    fromCache: zod_1.z.boolean(),
    /** Time taken for detection in milliseconds */
    detectionTime: zod_1.z.number().int().min(0),
});
/**
 * Validates an EnvironmentContext object
 *
 * @param data - Data to validate
 * @returns Validated EnvironmentContext or throws ZodError
 *
 * @example
 * ```typescript
 * import { validateEnvironmentContext } from '@artk/core/schemas';
 *
 * const context = validateEnvironmentContext({
 *   moduleSystem: 'commonjs',
 *   nodeVersion: '18.12.1',
 *   // ... other fields
 * });
 * ```
 */
function validateEnvironmentContext(data) {
    return exports.EnvironmentContextSchema.parse(data);
}
/**
 * Safely validates an EnvironmentContext object
 *
 * @param data - Data to validate
 * @returns Result object with success status and data or error
 */
function safeValidateEnvironmentContext(data) {
    return exports.EnvironmentContextSchema.safeParse(data);
}
//# sourceMappingURL=environment-context.schema.js.map