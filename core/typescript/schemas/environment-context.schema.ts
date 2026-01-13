/**
 * Zod Schemas for Environment Context
 *
 * Runtime validation schemas matching the JSON schema at
 * specs/001-foundation-compatibility/contracts/environment-context.schema.json
 *
 * @module @artk/core/schemas
 */

import { z } from 'zod';

/**
 * Module system schema - either CommonJS or ESM
 */
export const ModuleSystemSchema = z.enum(['commonjs', 'esm']);

/**
 * Template source schema - where templates came from
 */
export const TemplateSourceSchema = z.enum(['bundled', 'local-override']);

/**
 * Detection confidence schema
 */
export const DetectionConfidenceSchema = z.enum(['high', 'medium', 'low']);

/**
 * Detection method schema
 */
export const DetectionMethodSchema = z.enum(['package.json', 'tsconfig.json', 'fallback']);

/**
 * Parsed Node.js version schema
 */
export const NodeVersionParsedSchema = z.object({
  /** Major version number (must be >= 18) */
  major: z.number().int().min(18, 'Node.js version must be >= 18.0.0'),
  /** Minor version number */
  minor: z.number().int().min(0),
  /** Patch version number */
  patch: z.number().int().min(0),
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
export const EnvironmentContextSchema = z.object({
  /** Detected module system from package.json or tsconfig.json */
  moduleSystem: ModuleSystemSchema,

  /** Semantic version of Node.js (e.g., "18.12.1") */
  nodeVersion: z.string().regex(semverPattern, 'Invalid semver format'),

  /** Parsed Node.js version components */
  nodeVersionParsed: NodeVersionParsedSchema,

  /** TypeScript module setting from tsconfig.json, or null if not present */
  tsModule: z.string().nullable(),

  /** true if Node 18+ and ESM environment */
  supportsImportMeta: z.boolean(),

  /** true if Node 20.11.0+ (has import.meta.dirname built-in) */
  supportsBuiltinDirname: z.boolean(),

  /** Which template set was used for generation */
  templateVariant: ModuleSystemSchema,

  /** Where templates came from */
  templateSource: TemplateSourceSchema,

  /** ISO 8601 timestamp when detection ran */
  detectionTimestamp: z.string().datetime({ message: 'Invalid ISO 8601 timestamp' }),

  /** Confidence level based on signal consistency */
  detectionConfidence: DetectionConfidenceSchema,

  /** Primary method that determined module system */
  detectionMethod: DetectionMethodSchema,

  /** List of warnings encountered during detection */
  warnings: z.array(z.string()),
});

/**
 * Detection options schema
 */
export const DetectionOptionsSchema = z.object({
  /** Project root directory */
  projectRoot: z.string().min(1, 'Project root is required'),

  /** Force re-detection */
  forceDetect: z.boolean().optional().default(false),

  /** Timeout in milliseconds */
  timeout: z.number().int().min(100).max(30000).optional().default(5000),
});

/**
 * Detection result schema
 */
export const DetectionResultSchema = z.object({
  /** The detected environment context */
  context: EnvironmentContextSchema,

  /** Whether results were loaded from cache */
  fromCache: z.boolean(),

  /** Time taken for detection in milliseconds */
  detectionTime: z.number().int().min(0),
});

/**
 * Type inference helpers
 */
export type ModuleSystemType = z.infer<typeof ModuleSystemSchema>;
export type TemplateSourceType = z.infer<typeof TemplateSourceSchema>;
export type DetectionConfidenceType = z.infer<typeof DetectionConfidenceSchema>;
export type DetectionMethodType = z.infer<typeof DetectionMethodSchema>;
export type NodeVersionParsedType = z.infer<typeof NodeVersionParsedSchema>;
export type EnvironmentContextType = z.infer<typeof EnvironmentContextSchema>;
export type DetectionOptionsType = z.infer<typeof DetectionOptionsSchema>;
export type DetectionResultType = z.infer<typeof DetectionResultSchema>;

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
export function validateEnvironmentContext(data: unknown): EnvironmentContextType {
  return EnvironmentContextSchema.parse(data);
}

/**
 * Safely validates an EnvironmentContext object
 *
 * @param data - Data to validate
 * @returns Result object with success status and data or error
 */
export function safeValidateEnvironmentContext(
  data: unknown
): z.SafeParseReturnType<unknown, EnvironmentContextType> {
  return EnvironmentContextSchema.safeParse(data);
}
