/**
 * ARTK Zod Schemas for Variant System
 *
 * Validation schemas for context.json, lock files, and feature compatibility.
 */

import { z } from 'zod';

/**
 * Schema for variant IDs.
 */
export const VariantIdSchema = z.enum([
  'modern-esm',
  'modern-cjs',
  'legacy-16',
  'legacy-14',
]);

/**
 * Schema for module system.
 */
export const ModuleSystemSchema = z.enum(['esm', 'cjs']);

/**
 * Schema for install method.
 */
export const InstallMethodSchema = z.enum(['cli', 'bootstrap', 'manual']);

/**
 * Schema for log level.
 */
export const LogLevelSchema = z.enum(['INFO', 'WARN', 'ERROR']);

/**
 * Schema for operation type.
 */
export const OperationTypeSchema = z.enum([
  'install',
  'upgrade',
  'rollback',
  'detect',
]);

/**
 * Schema for lock operation.
 */
export const LockOperationSchema = z.enum(['install', 'upgrade']);

/**
 * Schema for upgrade history record.
 */
export const UpgradeRecordSchema = z.object({
  from: VariantIdSchema,
  to: VariantIdSchema,
  at: z.string().datetime(),
});

/**
 * Schema for .artk/context.json file.
 */
export const ArtkContextSchema = z.object({
  variant: VariantIdSchema,
  variantInstalledAt: z.string().datetime(),
  nodeVersion: z.number().int().min(14).max(30),
  moduleSystem: ModuleSystemSchema,
  playwrightVersion: z.string().regex(/^\d+\.\d+\.x$/),
  artkVersion: z.string(),
  installMethod: InstallMethodSchema,
  overrideUsed: z.boolean().optional(),
  previousVariant: VariantIdSchema.optional(),
  upgradeHistory: z.array(UpgradeRecordSchema).optional(),
});

/**
 * Schema for .artk/install.lock file.
 */
export const LockFileSchema = z.object({
  pid: z.number().int().positive(),
  startedAt: z.string().datetime(),
  operation: LockOperationSchema,
});

/**
 * Schema for install log entry.
 */
export const InstallLogEntrySchema = z.object({
  timestamp: z.string().datetime(),
  level: LogLevelSchema,
  operation: OperationTypeSchema,
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

/**
 * Schema for feature entry in variant-features.json.
 */
export const FeatureEntrySchema = z.object({
  available: z.boolean(),
  alternative: z.string().optional(),
  notes: z.string().optional(),
  sincePlaywright: z.string().regex(/^\d+\.\d+$/).optional(),
});

/**
 * Schema for variant-features.json file.
 */
export const FeatureCompatibilitySchema = z.object({
  variant: VariantIdSchema,
  playwrightVersion: z.string().regex(/^\d+\.\d+\.x$/),
  nodeRange: z.array(z.string().regex(/^\d+$/)).min(1),
  moduleSystem: ModuleSystemSchema.optional(),
  features: z.record(FeatureEntrySchema),
  generatedAt: z.string().datetime().optional(),
});

/**
 * Schema for variant definition.
 */
export const VariantDefinitionSchema = z.object({
  id: VariantIdSchema,
  displayName: z.string(),
  nodeRange: z.array(z.string().regex(/^\d+$/)).min(1),
  playwrightVersion: z.string().regex(/^\d+\.\d+\.x$/),
  moduleSystem: ModuleSystemSchema,
  tsTarget: z.string(),
  distDirectory: z.string(),
});

/**
 * Schema for detection result.
 */
export const DetectionResultSchema = z.object({
  nodeVersion: z.number().int().min(1),
  nodeVersionFull: z.string(),
  moduleSystem: ModuleSystemSchema,
  selectedVariant: VariantIdSchema,
  success: z.boolean(),
  error: z.string().optional(),
});

/**
 * Type exports inferred from schemas.
 */
export type VariantIdSchemaType = z.infer<typeof VariantIdSchema>;
export type ModuleSystemSchemaType = z.infer<typeof ModuleSystemSchema>;
export type ArtkContextSchemaType = z.infer<typeof ArtkContextSchema>;
export type LockFileSchemaType = z.infer<typeof LockFileSchema>;
export type InstallLogEntrySchemaType = z.infer<typeof InstallLogEntrySchema>;
export type FeatureCompatibilitySchemaType = z.infer<
  typeof FeatureCompatibilitySchema
>;
export type DetectionResultSchemaType = z.infer<typeof DetectionResultSchema>;

/**
 * Validate context.json content.
 */
export function validateContext(data: unknown): z.SafeParseReturnType<unknown, ArtkContextSchemaType> {
  return ArtkContextSchema.safeParse(data);
}

/**
 * Validate lock file content.
 */
export function validateLockFile(data: unknown): z.SafeParseReturnType<unknown, LockFileSchemaType> {
  return LockFileSchema.safeParse(data);
}

/**
 * Validate feature compatibility content.
 */
export function validateFeatureCompatibility(
  data: unknown
): z.SafeParseReturnType<unknown, FeatureCompatibilitySchemaType> {
  return FeatureCompatibilitySchema.safeParse(data);
}
