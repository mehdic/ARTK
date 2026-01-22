"use strict";
/**
 * @module types/schemas
 * @description Zod validation schemas for ARTK E2E independent architecture.
 * Provides runtime type checking and validation for ArtkContext and ArtkConfig.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmoduleScanResultSchema = exports.SubmoduleStatusSchema = exports.DetectionResultSchema = exports.DetectionSignalSchema = exports.ArtkConfidenceLevelSchema = exports.ArtkConfigSchema = exports.ArtkTimeoutConfigSchema = exports.ArtkBrowserConfigSchema = exports.ArtkBrowserTypeSchema = exports.ArtkConfigTargetSchema = exports.ArtkEnvironmentUrlsSchema = exports.ArtkAuthConfigSchema = exports.ArtkAuthEnvironmentUrlsSchema = exports.ArtkRoleSchema = exports.ArtkCredentialsEnvSchema = exports.ArtkIdpTypeSchema = exports.ArtkAuthProviderSchema = exports.ArtkContextSchema = exports.ArtkTargetSchema = exports.ArtkTargetTypeSchema = void 0;
exports.validateArtkContext = validateArtkContext;
exports.safeValidateArtkContext = safeValidateArtkContext;
exports.validateArtkConfig = validateArtkConfig;
exports.safeValidateArtkConfig = safeValidateArtkConfig;
const zod_1 = require("zod");
const context_js_1 = require("./context.js");
const config_js_1 = require("./config.js");
// =============================================================================
// Primitive Schemas
// =============================================================================
/** Non-empty string */
const nonEmptyString = zod_1.z.string().min(1, 'Must not be empty');
/** Positive integer with minimum */
const positiveIntMin = (min) => zod_1.z.number().int().min(min, `Must be at least ${min}`);
/** Lowercase kebab-case identifier */
const kebabCaseId = zod_1.z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/, 'Must be lowercase-kebab-case starting with a letter');
/** Relative path (no leading /, no .. escaping) */
const relativePath = zod_1.z
    .string()
    .refine((p) => !p.startsWith('/'), 'Path must be relative (no leading /)')
    .refine((p) => !/(^|\/)\.\.($|\/)/.test(p), 'Path must not contain .. escaping project root');
/** Environment variable name pattern */
const envVarName = zod_1.z
    .string()
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Must be UPPER_SNAKE_CASE');
/** Semantic version pattern */
const semver = zod_1.z
    .string()
    .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, 'Must be valid semantic version (e.g., 1.0.0 or 1.0.0-beta.1)');
/** URL format */
const urlString = zod_1.z.string().url('Must be a valid URL');
// =============================================================================
// Target Type Schema
// =============================================================================
/** Target type schema */
exports.ArtkTargetTypeSchema = zod_1.z.enum([
    'react-spa',
    'vue-spa',
    'angular',
    'next',
    'nuxt',
    'other',
]);
// =============================================================================
// ArtkTarget Schema
// =============================================================================
/**
 * Schema for ArtkTarget (used in ArtkContext).
 */
exports.ArtkTargetSchema = zod_1.z.object({
    /** Unique identifier, lowercase-kebab-case */
    name: kebabCaseId.describe('Unique target identifier'),
    /** Relative path to frontend directory from artk-e2e/ */
    path: relativePath.describe('Relative path to frontend'),
    /** Detected or specified application type */
    type: exports.ArtkTargetTypeSchema,
    /** Signals that identified this target during detection */
    detected_by: zod_1.z
        .array(nonEmptyString)
        .describe('Detection signals (e.g., package.json:react)'),
    /** Optional description */
    description: zod_1.z.string().optional(),
});
// =============================================================================
// ArtkContext Schema (T014)
// =============================================================================
/**
 * Schema for ArtkContext stored in .artk/context.json.
 * Used for inter-prompt communication.
 */
exports.ArtkContextSchema = zod_1.z
    .object({
    /** Schema version for migration support */
    version: zod_1.z.literal(context_js_1.CONTEXT_SCHEMA_VERSION, {
        errorMap: () => ({
            message: `Context version must be "${context_js_1.CONTEXT_SCHEMA_VERSION}"`,
        }),
    }),
    /** When this context was created (ISO8601) */
    initialized_at: nonEmptyString.describe('ISO8601 timestamp'),
    /** Project metadata */
    project: zod_1.z.object({
        /** Human-readable project name */
        name: nonEmptyString,
        /** Relative path to project root from artk-e2e/ */
        root: relativePath,
    }),
    /** Configured frontend targets (1-5 max) */
    targets: zod_1.z
        .array(exports.ArtkTargetSchema)
        .min(context_js_1.MIN_TARGETS, `At least ${context_js_1.MIN_TARGETS} target required`)
        .max(context_js_1.MAX_TARGETS, `Maximum ${context_js_1.MAX_TARGETS} targets allowed`),
    /** Installation metadata */
    install: zod_1.z.object({
        /** Semantic version of @artk/core */
        artk_core_version: semver,
        /** Semantic version of @playwright/test */
        playwright_version: semver,
        /** Path to the install script used */
        script_path: nonEmptyString,
    }),
})
    .superRefine((data, ctx) => {
    // Validate unique target names
    const names = data.targets.map((t) => t.name);
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    if (duplicates.length > 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: `Duplicate target names: ${[...new Set(duplicates)].join(', ')}`,
            path: ['targets'],
        });
    }
});
// =============================================================================
// Auth Schemas for ArtkConfig
// =============================================================================
/** Auth provider type schema */
exports.ArtkAuthProviderSchema = zod_1.z.enum([
    'oidc',
    'saml',
    'basic',
    'custom',
]);
/** Identity provider type schema */
exports.ArtkIdpTypeSchema = zod_1.z.enum([
    'keycloak',
    'auth0',
    'okta',
    'azure-ad',
    'other',
]);
/** Credentials environment schema */
exports.ArtkCredentialsEnvSchema = zod_1.z.object({
    username: envVarName.describe('Env var name for username'),
    password: envVarName.describe('Env var name for password'),
});
/** Role configuration schema */
exports.ArtkRoleSchema = zod_1.z.object({
    /** Environment variable names for credentials */
    credentialsEnv: exports.ArtkCredentialsEnvSchema,
    /** TOTP secret environment variable (if MFA enabled) */
    totpSecretEnv: envVarName.optional(),
    /** Per-target storage state path overrides */
    storageState: zod_1.z.record(zod_1.z.string(), relativePath).optional(),
});
/** Auth environment URLs schema */
exports.ArtkAuthEnvironmentUrlsSchema = zod_1.z.object({
    /** Login URL for this environment */
    loginUrl: urlString,
    /** Optional logout URL for this environment */
    logoutUrl: urlString.optional(),
});
/** Auth configuration schema */
exports.ArtkAuthConfigSchema = zod_1.z.object({
    /** Authentication provider type */
    provider: exports.ArtkAuthProviderSchema,
    /** Identity provider type (for OIDC provider) */
    idpType: exports.ArtkIdpTypeSchema.optional(),
    /** Directory for storage states (relative to artk-e2e/) */
    storageStateDir: relativePath.default('.auth-states'),
    /** Per-environment authentication URLs */
    environments: zod_1.z.record(zod_1.z.string(), exports.ArtkAuthEnvironmentUrlsSchema),
    /** Role definitions */
    roles: zod_1.z
        .record(zod_1.z.string(), exports.ArtkRoleSchema)
        .refine((roles) => Object.keys(roles).length > 0, 'At least one role must be defined'),
});
// =============================================================================
// Config Target Schema
// =============================================================================
/** Environment URLs schema */
exports.ArtkEnvironmentUrlsSchema = zod_1.z.object({
    /** Base URL for the environment */
    baseUrl: urlString,
    /** Optional API URL if different from baseUrl */
    apiUrl: urlString.optional(),
});
/** Config target schema (extended from ArtkTarget) */
exports.ArtkConfigTargetSchema = zod_1.z.object({
    /** Unique identifier */
    name: kebabCaseId,
    /** Relative path to frontend directory */
    path: relativePath,
    /** Application type */
    type: exports.ArtkTargetTypeSchema,
    /** Optional description */
    description: zod_1.z.string().optional(),
    /** Environment-specific URLs */
    environments: zod_1.z
        .record(zod_1.z.string(), exports.ArtkEnvironmentUrlsSchema)
        .refine((envs) => Object.keys(envs).length > 0, 'At least one environment must be defined'),
});
// =============================================================================
// Browser and Timeout Schemas
// =============================================================================
/** Browser type schema */
exports.ArtkBrowserTypeSchema = zod_1.z.enum(['chromium', 'firefox', 'webkit']);
/** Browser configuration schema */
exports.ArtkBrowserConfigSchema = zod_1.z.object({
    /** Enabled browser types */
    enabled: zod_1.z
        .array(exports.ArtkBrowserTypeSchema)
        .min(1, 'At least one browser required')
        .default(['chromium']),
    /** Whether to run in headless mode */
    headless: zod_1.z.boolean().default(true),
});
/** Timeout configuration schema */
exports.ArtkTimeoutConfigSchema = zod_1.z.object({
    /** Default timeout for operations (ms) */
    default: positiveIntMin(1000).default(30000),
    /** Navigation timeout (ms) */
    navigation: positiveIntMin(1000).default(60000),
    /** Authentication timeout (ms) */
    auth: positiveIntMin(1000).default(120000),
});
// =============================================================================
// ArtkConfig Schema (T015)
// =============================================================================
/**
 * Schema for ArtkConfig stored in artk.config.yml.
 * Main configuration file for ARTK E2E suite.
 */
exports.ArtkConfigSchema = zod_1.z
    .object({
    /** Schema version for backward compatibility */
    schemaVersion: zod_1.z.literal(config_js_1.CONFIG_SCHEMA_VERSION, {
        errorMap: () => ({
            message: `Config schema version must be "${config_js_1.CONFIG_SCHEMA_VERSION}"`,
        }),
    }),
    /** Project metadata */
    project: zod_1.z.object({
        /** Project name */
        name: nonEmptyString,
        /** Optional project description */
        description: zod_1.z.string().optional(),
    }),
    /** Frontend targets with environment URLs */
    targets: zod_1.z
        .array(exports.ArtkConfigTargetSchema)
        .min(context_js_1.MIN_TARGETS, `At least ${context_js_1.MIN_TARGETS} target required`)
        .max(context_js_1.MAX_TARGETS, `Maximum ${context_js_1.MAX_TARGETS} targets allowed`),
    /** Default settings */
    defaults: zod_1.z.object({
        /** Default target name (must match a targets[].name) */
        target: nonEmptyString,
        /** Default environment name (must exist in all targets' environments) */
        environment: nonEmptyString,
    }),
    /** Optional authentication configuration */
    auth: exports.ArtkAuthConfigSchema.optional(),
    /** Optional browser configuration */
    browsers: exports.ArtkBrowserConfigSchema.optional(),
    /** Optional timeout configuration */
    timeouts: exports.ArtkTimeoutConfigSchema.optional(),
})
    .superRefine((data, ctx) => {
    // Validate unique target names
    const names = data.targets.map((t) => t.name);
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    if (duplicates.length > 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: `Duplicate target names: ${[...new Set(duplicates)].join(', ')}`,
            path: ['targets'],
        });
    }
    // Validate defaults.target matches a targets[].name
    if (!names.includes(data.defaults.target)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: `defaults.target "${data.defaults.target}" does not match any target. Available: ${names.join(', ')}`,
            path: ['defaults', 'target'],
        });
    }
    // Validate defaults.environment exists in all targets
    for (const target of data.targets) {
        const envNames = Object.keys(target.environments);
        if (!envNames.includes(data.defaults.environment)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: `defaults.environment "${data.defaults.environment}" does not exist in target "${target.name}". Available: ${envNames.join(', ')}`,
                path: ['defaults', 'environment'],
            });
        }
    }
});
// =============================================================================
// Detection Schemas (bonus)
// =============================================================================
/** Confidence level schema */
exports.ArtkConfidenceLevelSchema = zod_1.z.enum(['high', 'medium', 'low']);
/** Detection signal schema */
exports.DetectionSignalSchema = zod_1.z.object({
    type: zod_1.z.enum([
        'package-dependency',
        'entry-file',
        'directory-name',
        'index-html',
        'config-file',
    ]),
    source: nonEmptyString,
    weight: zod_1.z.number(),
    description: zod_1.z.string().optional(),
});
/** Detection result schema */
exports.DetectionResultSchema = zod_1.z.object({
    path: nonEmptyString,
    relativePath: relativePath,
    confidence: exports.ArtkConfidenceLevelSchema,
    type: exports.ArtkTargetTypeSchema,
    signals: zod_1.z.array(nonEmptyString),
    score: zod_1.z.number(),
    detailedSignals: zod_1.z.array(exports.DetectionSignalSchema).optional(),
});
/** Submodule status schema */
exports.SubmoduleStatusSchema = zod_1.z.object({
    path: nonEmptyString,
    initialized: zod_1.z.boolean(),
    commit: zod_1.z.string().optional(),
    url: urlString.optional(),
    warning: zod_1.z.string().optional(),
});
/** Submodule scan result schema */
exports.SubmoduleScanResultSchema = zod_1.z.object({
    hasSubmodules: zod_1.z.boolean(),
    submodules: zod_1.z.array(exports.SubmoduleStatusSchema),
    warnings: zod_1.z.array(zod_1.z.string()),
});
// =============================================================================
// Validation Helper Functions
// =============================================================================
/**
 * Validates an ArtkContext object.
 * @returns Validated context or throws ZodError
 */
function validateArtkContext(data) {
    return exports.ArtkContextSchema.parse(data);
}
/**
 * Safely validates an ArtkContext object.
 * @returns Result object with success/error
 */
function safeValidateArtkContext(data) {
    return exports.ArtkContextSchema.safeParse(data);
}
/**
 * Validates an ArtkConfig object.
 * @returns Validated config or throws ZodError
 */
function validateArtkConfig(data) {
    return exports.ArtkConfigSchema.parse(data);
}
/**
 * Safely validates an ArtkConfig object.
 * @returns Result object with success/error
 */
function safeValidateArtkConfig(data) {
    return exports.ArtkConfigSchema.safeParse(data);
}
//# sourceMappingURL=schemas.js.map