/**
 * Zod Schemas for Validation Result
 *
 * Runtime validation schemas matching the JSON schema at
 * specs/001-foundation-compatibility/contracts/validation-result.schema.json
 *
 * @module @artk/core/schemas
 */

import { z } from 'zod';

/**
 * Validation severity schema
 */
export const ValidationSeveritySchema = z.enum(['error', 'warning']);

/**
 * Validation status schema
 */
export const ValidationStatusSchema = z.enum(['passed', 'failed', 'warnings']);

/**
 * Strictness level schema
 */
export const StrictnessLevelSchema = z.enum(['error', 'warning', 'ignore']);

/**
 * Known validation rule IDs
 */
export const ValidationRuleIdSchema = z.enum([
  'import-meta-usage',
  'dirname-usage',
  'import-paths',
  'dependency-compat',
  'typescript-compat',
]);

/**
 * Validation issue schema
 */
export const ValidationIssueSchema = z.object({
  /** Absolute path to file with issue */
  file: z.string(),

  /** Line number (null if not applicable) */
  line: z.number().int().min(1).nullable(),

  /** Column number (null if not available) */
  column: z.number().int().min(1).nullable(),

  /** Issue severity level */
  severity: ValidationSeveritySchema,

  /** Rule that detected this issue */
  ruleId: z.string(),

  /** Human-readable description of the issue */
  message: z.string(),

  /** Suggestion for how to fix the issue */
  suggestedFix: z.string().nullable(),
});

/**
 * Validation rule result schema
 */
export const ValidationRuleResultSchema = z.object({
  /** Unique identifier for the rule */
  ruleId: z.string(),

  /** true if rule passed */
  pass: z.boolean(),

  /** Files with violations */
  affectedFiles: z.array(z.string()),

  /** Human-readable summary */
  message: z.string(),
});

/**
 * Validation result schema
 *
 * Validates the structure of .artk/validation-results.json entries
 */
export const ValidationResultSchema = z.object({
  /** ISO 8601 timestamp when validation ran */
  timestamp: z.string().datetime({ message: 'Invalid ISO 8601 timestamp' }),

  /** Hash or reference to EnvironmentContext used */
  environmentContext: z.string(),

  /** Milliseconds taken to validate (max 10 seconds per FR-029) */
  executionTime: z.number().int().min(0).max(10000),

  /** Overall validation status */
  status: ValidationStatusSchema,

  /** Individual rule execution results */
  rules: z.array(ValidationRuleResultSchema),

  /** Critical issues that must be fixed */
  errors: z.array(ValidationIssueSchema),

  /** Non-critical issues for developer awareness */
  warnings: z.array(ValidationIssueSchema),

  /** List of file paths that were validated */
  validatedFiles: z.array(z.string()),

  /** true if automatic rollback was triggered */
  rollbackPerformed: z.boolean(),

  /** null if no rollback, true if successful, false if failed */
  rollbackSuccess: z.boolean().nullable(),
});

/**
 * Validation options schema
 */
export const ValidationOptionsSchema = z.object({
  /** Files to validate */
  files: z.array(z.string()).min(1, 'At least one file is required'),

  /** Environment context for validation rules */
  environmentContext: z.string(),

  /** Skip validation entirely */
  skipValidation: z.boolean().optional().default(false),

  /** Validation timeout in milliseconds */
  timeout: z.number().int().min(100).max(60000).optional().default(10000),

  /** Strictness levels for each rule type */
  strictness: z
    .record(ValidationRuleIdSchema, StrictnessLevelSchema)
    .optional()
    .default({}),
});

/**
 * Validation rule config schema
 */
export const ValidationRuleConfigSchema = z.object({
  /** Unique identifier for the rule */
  id: z.string(),

  /** Human-readable name */
  name: z.string(),

  /** Description of what the rule checks */
  description: z.string(),

  /** Default strictness level */
  defaultStrictness: StrictnessLevelSchema,
});

/**
 * Rollback result schema
 */
export const RollbackResultSchema = z.object({
  /** Whether rollback was successful */
  success: z.boolean(),

  /** Files that were removed during rollback */
  removedFiles: z.array(z.string()),

  /** Files that were restored from backup */
  restoredFiles: z.array(z.string()),

  /** Files that failed to be rolled back */
  failedFiles: z.array(
    z.object({
      file: z.string(),
      error: z.string(),
    })
  ),
});

/**
 * Type inference helpers
 */
export type ValidationSeverityType = z.infer<typeof ValidationSeveritySchema>;
export type ValidationStatusType = z.infer<typeof ValidationStatusSchema>;
export type StrictnessLevelType = z.infer<typeof StrictnessLevelSchema>;
export type ValidationRuleIdType = z.infer<typeof ValidationRuleIdSchema>;
export type ValidationIssueType = z.infer<typeof ValidationIssueSchema>;
export type ValidationRuleResultType = z.infer<typeof ValidationRuleResultSchema>;
export type ValidationResultType = z.infer<typeof ValidationResultSchema>;
export type ValidationOptionsType = z.infer<typeof ValidationOptionsSchema>;
export type ValidationRuleConfigType = z.infer<typeof ValidationRuleConfigSchema>;
export type RollbackResultType = z.infer<typeof RollbackResultSchema>;

/**
 * Validates a ValidationResult object
 *
 * @param data - Data to validate
 * @returns Validated ValidationResult or throws ZodError
 *
 * @example
 * ```typescript
 * import { validateValidationResult } from '@artk/core/schemas';
 *
 * const result = validateValidationResult({
 *   timestamp: '2026-01-13T15:35:00.000Z',
 *   status: 'passed',
 *   // ... other fields
 * });
 * ```
 */
export function validateValidationResult(data: unknown): ValidationResultType {
  return ValidationResultSchema.parse(data);
}

/**
 * Safely validates a ValidationResult object
 *
 * @param data - Data to validate
 * @returns Result object with success status and data or error
 */
export function safeValidateValidationResult(
  data: unknown
): z.SafeParseReturnType<unknown, ValidationResultType> {
  return ValidationResultSchema.safeParse(data);
}

/**
 * Validates a ValidationIssue object
 *
 * @param data - Data to validate
 * @returns Validated ValidationIssue or throws ZodError
 */
export function validateValidationIssue(data: unknown): ValidationIssueType {
  return ValidationIssueSchema.parse(data);
}

/**
 * Validates a RollbackResult object
 *
 * @param data - Data to validate
 * @returns Validated RollbackResult or throws ZodError
 */
export function validateRollbackResult(data: unknown): RollbackResultType {
  return RollbackResultSchema.parse(data);
}
