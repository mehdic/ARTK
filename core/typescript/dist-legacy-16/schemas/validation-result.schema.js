"use strict";
/**
 * Zod Schemas for Validation Result
 *
 * Runtime validation schemas matching the JSON schema at
 * specs/001-foundation-compatibility/contracts/validation-result.schema.json
 *
 * @module @artk/core/schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollbackResultSchema = exports.ValidationRuleConfigSchema = exports.ValidationOptionsSchema = exports.ValidationResultSchema = exports.ValidationRuleResultSchema = exports.ValidationIssueSchema = exports.ValidationRuleIdSchema = exports.StrictnessLevelSchema = exports.ValidationStatusSchema = exports.ValidationSeveritySchema = void 0;
exports.validateValidationResult = validateValidationResult;
exports.safeValidateValidationResult = safeValidateValidationResult;
exports.validateValidationIssue = validateValidationIssue;
exports.validateRollbackResult = validateRollbackResult;
const zod_1 = require("zod");
/**
 * Validation severity schema
 */
exports.ValidationSeveritySchema = zod_1.z.enum(['error', 'warning']);
/**
 * Validation status schema
 */
exports.ValidationStatusSchema = zod_1.z.enum(['passed', 'failed', 'warnings']);
/**
 * Strictness level schema
 */
exports.StrictnessLevelSchema = zod_1.z.enum(['error', 'warning', 'ignore']);
/**
 * Known validation rule IDs
 */
exports.ValidationRuleIdSchema = zod_1.z.enum([
    'import-meta-usage',
    'dirname-usage',
    'import-paths',
    'dependency-compat',
    'typescript-compat',
]);
/**
 * Validation issue schema
 */
exports.ValidationIssueSchema = zod_1.z.object({
    /** Absolute path to file with issue */
    file: zod_1.z.string(),
    /** Line number (null if not applicable) */
    line: zod_1.z.number().int().min(1).nullable(),
    /** Column number (null if not available) */
    column: zod_1.z.number().int().min(1).nullable(),
    /** Issue severity level */
    severity: exports.ValidationSeveritySchema,
    /** Rule that detected this issue */
    ruleId: zod_1.z.string(),
    /** Human-readable description of the issue */
    message: zod_1.z.string(),
    /** Suggestion for how to fix the issue */
    suggestedFix: zod_1.z.string().nullable(),
});
/**
 * Validation rule result schema
 */
exports.ValidationRuleResultSchema = zod_1.z.object({
    /** Unique identifier for the rule */
    ruleId: zod_1.z.string(),
    /** true if rule passed */
    pass: zod_1.z.boolean(),
    /** Files with violations */
    affectedFiles: zod_1.z.array(zod_1.z.string()),
    /** Human-readable summary */
    message: zod_1.z.string(),
});
/**
 * Validation result schema
 *
 * Validates the structure of .artk/validation-results.json entries
 */
exports.ValidationResultSchema = zod_1.z.object({
    /** ISO 8601 timestamp when validation ran */
    timestamp: zod_1.z.string().datetime({ message: 'Invalid ISO 8601 timestamp' }),
    /** Hash or reference to EnvironmentContext used */
    environmentContext: zod_1.z.string(),
    /** Milliseconds taken to validate (max 10 seconds per FR-029) */
    executionTime: zod_1.z.number().int().min(0).max(10000),
    /** Overall validation status */
    status: exports.ValidationStatusSchema,
    /** Individual rule execution results */
    rules: zod_1.z.array(exports.ValidationRuleResultSchema),
    /** Critical issues that must be fixed */
    errors: zod_1.z.array(exports.ValidationIssueSchema),
    /** Non-critical issues for developer awareness */
    warnings: zod_1.z.array(exports.ValidationIssueSchema),
    /** List of file paths that were validated */
    validatedFiles: zod_1.z.array(zod_1.z.string()),
    /** true if automatic rollback was triggered */
    rollbackPerformed: zod_1.z.boolean(),
    /** null if no rollback, true if successful, false if failed */
    rollbackSuccess: zod_1.z.boolean().nullable(),
});
/**
 * Validation options schema
 */
exports.ValidationOptionsSchema = zod_1.z.object({
    /** Files to validate */
    files: zod_1.z.array(zod_1.z.string()).min(1, 'At least one file is required'),
    /** Environment context for validation rules */
    environmentContext: zod_1.z.string(),
    /** Skip validation entirely */
    skipValidation: zod_1.z.boolean().optional().default(false),
    /** Validation timeout in milliseconds */
    timeout: zod_1.z.number().int().min(100).max(60000).optional().default(10000),
    /** Strictness levels for each rule type */
    strictness: zod_1.z
        .record(exports.ValidationRuleIdSchema, exports.StrictnessLevelSchema)
        .optional()
        .default({}),
});
/**
 * Validation rule config schema
 */
exports.ValidationRuleConfigSchema = zod_1.z.object({
    /** Unique identifier for the rule */
    id: zod_1.z.string(),
    /** Human-readable name */
    name: zod_1.z.string(),
    /** Description of what the rule checks */
    description: zod_1.z.string(),
    /** Default strictness level */
    defaultStrictness: exports.StrictnessLevelSchema,
});
/**
 * Rollback result schema
 */
exports.RollbackResultSchema = zod_1.z.object({
    /** Whether rollback was successful */
    success: zod_1.z.boolean(),
    /** Files that were removed during rollback */
    removedFiles: zod_1.z.array(zod_1.z.string()),
    /** Files that were restored from backup */
    restoredFiles: zod_1.z.array(zod_1.z.string()),
    /** Files that failed to be rolled back */
    failedFiles: zod_1.z.array(zod_1.z.object({
        file: zod_1.z.string(),
        error: zod_1.z.string(),
    })),
});
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
function validateValidationResult(data) {
    return exports.ValidationResultSchema.parse(data);
}
/**
 * Safely validates a ValidationResult object
 *
 * @param data - Data to validate
 * @returns Result object with success status and data or error
 */
function safeValidateValidationResult(data) {
    return exports.ValidationResultSchema.safeParse(data);
}
/**
 * Validates a ValidationIssue object
 *
 * @param data - Data to validate
 * @returns Validated ValidationIssue or throws ZodError
 */
function validateValidationIssue(data) {
    return exports.ValidationIssueSchema.parse(data);
}
/**
 * Validates a RollbackResult object
 *
 * @param data - Data to validate
 * @returns Validated RollbackResult or throws ZodError
 */
function validateRollbackResult(data) {
    return exports.RollbackResultSchema.parse(data);
}
//# sourceMappingURL=validation-result.schema.js.map