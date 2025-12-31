/**
 * @module types/schemas
 * @description Zod validation schemas for ARTK E2E independent architecture.
 * Provides runtime type checking and validation for ArtkContext and ArtkConfig.
 */

import { z } from 'zod';
import { CONTEXT_SCHEMA_VERSION, MAX_TARGETS, MIN_TARGETS } from './context.js';
import { CONFIG_SCHEMA_VERSION } from './config.js';

// =============================================================================
// Primitive Schemas
// =============================================================================

/** Non-empty string */
const nonEmptyString = z.string().min(1, 'Must not be empty');

/** Positive integer with minimum */
const positiveIntMin = (min: number) =>
  z.number().int().min(min, `Must be at least ${min}`);

/** Lowercase kebab-case identifier */
const kebabCaseId = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]*$/,
    'Must be lowercase-kebab-case starting with a letter'
  );

/** Relative path (no leading /, no .. escaping) */
const relativePath = z
  .string()
  .refine((p) => !p.startsWith('/'), 'Path must be relative (no leading /)')
  .refine(
    (p) => !/(^|\/)\.\.($|\/)/.test(p),
    'Path must not contain .. escaping project root'
  );

/** Environment variable name pattern */
const envVarName = z
  .string()
  .regex(/^[A-Z][A-Z0-9_]*$/, 'Must be UPPER_SNAKE_CASE');

/** Semantic version pattern */
const semver = z
  .string()
  .regex(
    /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/,
    'Must be valid semantic version (e.g., 1.0.0 or 1.0.0-beta.1)'
  );

/** URL format */
const urlString = z.string().url('Must be a valid URL');

// =============================================================================
// Target Type Schema
// =============================================================================

/** Target type schema */
export const ArtkTargetTypeSchema = z.enum([
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
export const ArtkTargetSchema = z.object({
  /** Unique identifier, lowercase-kebab-case */
  name: kebabCaseId.describe('Unique target identifier'),

  /** Relative path to frontend directory from artk-e2e/ */
  path: relativePath.describe('Relative path to frontend'),

  /** Detected or specified application type */
  type: ArtkTargetTypeSchema,

  /** Signals that identified this target during detection */
  detected_by: z
    .array(nonEmptyString)
    .describe('Detection signals (e.g., package.json:react)'),

  /** Optional description */
  description: z.string().optional(),
});

// =============================================================================
// ArtkContext Schema (T014)
// =============================================================================

/**
 * Schema for ArtkContext stored in .artk/context.json.
 * Used for inter-prompt communication.
 */
export const ArtkContextSchema = z
  .object({
    /** Schema version for migration support */
    version: z.literal(CONTEXT_SCHEMA_VERSION, {
      errorMap: () => ({
        message: `Context version must be "${CONTEXT_SCHEMA_VERSION}"`,
      }),
    }),

    /** When this context was created (ISO8601) */
    initialized_at: nonEmptyString.describe('ISO8601 timestamp'),

    /** Project metadata */
    project: z.object({
      /** Human-readable project name */
      name: nonEmptyString,

      /** Relative path to project root from artk-e2e/ */
      root: relativePath,
    }),

    /** Configured frontend targets (1-5 max) */
    targets: z
      .array(ArtkTargetSchema)
      .min(MIN_TARGETS, `At least ${MIN_TARGETS} target required`)
      .max(MAX_TARGETS, `Maximum ${MAX_TARGETS} targets allowed`),

    /** Installation metadata */
    install: z.object({
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
        code: z.ZodIssueCode.custom,
        message: `Duplicate target names: ${[...new Set(duplicates)].join(', ')}`,
        path: ['targets'],
      });
    }
  });

// =============================================================================
// Auth Schemas for ArtkConfig
// =============================================================================

/** Auth provider type schema */
export const ArtkAuthProviderSchema = z.enum([
  'oidc',
  'saml',
  'basic',
  'custom',
]);

/** Identity provider type schema */
export const ArtkIdpTypeSchema = z.enum([
  'keycloak',
  'auth0',
  'okta',
  'azure-ad',
  'other',
]);

/** Credentials environment schema */
export const ArtkCredentialsEnvSchema = z.object({
  username: envVarName.describe('Env var name for username'),
  password: envVarName.describe('Env var name for password'),
});

/** Role configuration schema */
export const ArtkRoleSchema = z.object({
  /** Environment variable names for credentials */
  credentialsEnv: ArtkCredentialsEnvSchema,

  /** TOTP secret environment variable (if MFA enabled) */
  totpSecretEnv: envVarName.optional(),

  /** Per-target storage state path overrides */
  storageState: z.record(z.string(), relativePath).optional(),
});

/** Auth environment URLs schema */
export const ArtkAuthEnvironmentUrlsSchema = z.object({
  /** Login URL for this environment */
  loginUrl: urlString,

  /** Optional logout URL for this environment */
  logoutUrl: urlString.optional(),
});

/** Auth configuration schema */
export const ArtkAuthConfigSchema = z.object({
  /** Authentication provider type */
  provider: ArtkAuthProviderSchema,

  /** Identity provider type (for OIDC provider) */
  idpType: ArtkIdpTypeSchema.optional(),

  /** Directory for storage states (relative to artk-e2e/) */
  storageStateDir: relativePath.default('.auth-states'),

  /** Per-environment authentication URLs */
  environments: z.record(z.string(), ArtkAuthEnvironmentUrlsSchema),

  /** Role definitions */
  roles: z
    .record(z.string(), ArtkRoleSchema)
    .refine(
      (roles) => Object.keys(roles).length > 0,
      'At least one role must be defined'
    ),
});

// =============================================================================
// Config Target Schema
// =============================================================================

/** Environment URLs schema */
export const ArtkEnvironmentUrlsSchema = z.object({
  /** Base URL for the environment */
  baseUrl: urlString,

  /** Optional API URL if different from baseUrl */
  apiUrl: urlString.optional(),
});

/** Config target schema (extended from ArtkTarget) */
export const ArtkConfigTargetSchema = z.object({
  /** Unique identifier */
  name: kebabCaseId,

  /** Relative path to frontend directory */
  path: relativePath,

  /** Application type */
  type: ArtkTargetTypeSchema,

  /** Optional description */
  description: z.string().optional(),

  /** Environment-specific URLs */
  environments: z
    .record(z.string(), ArtkEnvironmentUrlsSchema)
    .refine(
      (envs) => Object.keys(envs).length > 0,
      'At least one environment must be defined'
    ),
});

// =============================================================================
// Browser and Timeout Schemas
// =============================================================================

/** Browser type schema */
export const ArtkBrowserTypeSchema = z.enum(['chromium', 'firefox', 'webkit']);

/** Browser configuration schema */
export const ArtkBrowserConfigSchema = z.object({
  /** Enabled browser types */
  enabled: z
    .array(ArtkBrowserTypeSchema)
    .min(1, 'At least one browser required')
    .default(['chromium']),

  /** Whether to run in headless mode */
  headless: z.boolean().default(true),
});

/** Timeout configuration schema */
export const ArtkTimeoutConfigSchema = z.object({
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
export const ArtkConfigSchema = z
  .object({
    /** Schema version for backward compatibility */
    schemaVersion: z.literal(CONFIG_SCHEMA_VERSION, {
      errorMap: () => ({
        message: `Config schema version must be "${CONFIG_SCHEMA_VERSION}"`,
      }),
    }),

    /** Project metadata */
    project: z.object({
      /** Project name */
      name: nonEmptyString,

      /** Optional project description */
      description: z.string().optional(),
    }),

    /** Frontend targets with environment URLs */
    targets: z
      .array(ArtkConfigTargetSchema)
      .min(MIN_TARGETS, `At least ${MIN_TARGETS} target required`)
      .max(MAX_TARGETS, `Maximum ${MAX_TARGETS} targets allowed`),

    /** Default settings */
    defaults: z.object({
      /** Default target name (must match a targets[].name) */
      target: nonEmptyString,

      /** Default environment name (must exist in all targets' environments) */
      environment: nonEmptyString,
    }),

    /** Optional authentication configuration */
    auth: ArtkAuthConfigSchema.optional(),

    /** Optional browser configuration */
    browsers: ArtkBrowserConfigSchema.optional(),

    /** Optional timeout configuration */
    timeouts: ArtkTimeoutConfigSchema.optional(),
  })
  .superRefine((data, ctx) => {
    // Validate unique target names
    const names = data.targets.map((t) => t.name);
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate target names: ${[...new Set(duplicates)].join(', ')}`,
        path: ['targets'],
      });
    }

    // Validate defaults.target matches a targets[].name
    if (!names.includes(data.defaults.target)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `defaults.target "${data.defaults.target}" does not match any target. Available: ${names.join(', ')}`,
        path: ['defaults', 'target'],
      });
    }

    // Validate defaults.environment exists in all targets
    for (const target of data.targets) {
      const envNames = Object.keys(target.environments);
      if (!envNames.includes(data.defaults.environment)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
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
export const ArtkConfidenceLevelSchema = z.enum(['high', 'medium', 'low']);

/** Detection signal schema */
export const DetectionSignalSchema = z.object({
  type: z.enum([
    'package-dependency',
    'entry-file',
    'directory-name',
    'index-html',
    'config-file',
  ]),
  source: nonEmptyString,
  weight: z.number(),
  description: z.string().optional(),
});

/** Detection result schema */
export const DetectionResultSchema = z.object({
  path: nonEmptyString,
  relativePath: relativePath,
  confidence: ArtkConfidenceLevelSchema,
  type: ArtkTargetTypeSchema,
  signals: z.array(nonEmptyString),
  score: z.number(),
  detailedSignals: z.array(DetectionSignalSchema).optional(),
});

/** Submodule status schema */
export const SubmoduleStatusSchema = z.object({
  path: nonEmptyString,
  initialized: z.boolean(),
  commit: z.string().optional(),
  url: urlString.optional(),
  warning: z.string().optional(),
});

/** Submodule scan result schema */
export const SubmoduleScanResultSchema = z.object({
  hasSubmodules: z.boolean(),
  submodules: z.array(SubmoduleStatusSchema),
  warnings: z.array(z.string()),
});

// =============================================================================
// Type Exports
// =============================================================================

/** Inferred type from ArtkContextSchema */
export type ArtkContextInput = z.input<typeof ArtkContextSchema>;

/** Validated ArtkContext type */
export type ArtkContextOutput = z.output<typeof ArtkContextSchema>;

/** Inferred type from ArtkConfigSchema */
export type ArtkConfigInput = z.input<typeof ArtkConfigSchema>;

/** Validated ArtkConfig type */
export type ArtkConfigOutput = z.output<typeof ArtkConfigSchema>;

/** Inferred type from ArtkTargetSchema */
export type ArtkTargetInput = z.input<typeof ArtkTargetSchema>;

/** Validated ArtkTarget type */
export type ArtkTargetOutput = z.output<typeof ArtkTargetSchema>;

// =============================================================================
// Validation Helper Functions
// =============================================================================

/**
 * Validates an ArtkContext object.
 * @returns Validated context or throws ZodError
 */
export function validateArtkContext(data: unknown): ArtkContextOutput {
  return ArtkContextSchema.parse(data);
}

/**
 * Safely validates an ArtkContext object.
 * @returns Result object with success/error
 */
export function safeValidateArtkContext(data: unknown) {
  return ArtkContextSchema.safeParse(data);
}

/**
 * Validates an ArtkConfig object.
 * @returns Validated config or throws ZodError
 */
export function validateArtkConfig(data: unknown): ArtkConfigOutput {
  return ArtkConfigSchema.parse(data);
}

/**
 * Safely validates an ArtkConfig object.
 * @returns Result object with success/error
 */
export function safeValidateArtkConfig(data: unknown) {
  return ArtkConfigSchema.safeParse(data);
}
