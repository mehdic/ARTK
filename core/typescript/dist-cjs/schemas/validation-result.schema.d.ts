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
export declare const ValidationSeveritySchema: z.ZodEnum<["error", "warning"]>;
/**
 * Validation status schema
 */
export declare const ValidationStatusSchema: z.ZodEnum<["passed", "failed", "warnings"]>;
/**
 * Strictness level schema
 */
export declare const StrictnessLevelSchema: z.ZodEnum<["error", "warning", "ignore"]>;
/**
 * Known validation rule IDs
 */
export declare const ValidationRuleIdSchema: z.ZodEnum<["import-meta-usage", "dirname-usage", "import-paths", "dependency-compat", "typescript-compat"]>;
/**
 * Validation issue schema
 */
export declare const ValidationIssueSchema: z.ZodObject<{
    /** Absolute path to file with issue */
    file: z.ZodString;
    /** Line number (null if not applicable) */
    line: z.ZodNullable<z.ZodNumber>;
    /** Column number (null if not available) */
    column: z.ZodNullable<z.ZodNumber>;
    /** Issue severity level */
    severity: z.ZodEnum<["error", "warning"]>;
    /** Rule that detected this issue */
    ruleId: z.ZodString;
    /** Human-readable description of the issue */
    message: z.ZodString;
    /** Suggestion for how to fix the issue */
    suggestedFix: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    column: number | null;
    line: number | null;
    file: string;
    severity: "error" | "warning";
    ruleId: string;
    suggestedFix: string | null;
}, {
    message: string;
    column: number | null;
    line: number | null;
    file: string;
    severity: "error" | "warning";
    ruleId: string;
    suggestedFix: string | null;
}>;
/**
 * Validation rule result schema
 */
export declare const ValidationRuleResultSchema: z.ZodObject<{
    /** Unique identifier for the rule */
    ruleId: z.ZodString;
    /** true if rule passed */
    pass: z.ZodBoolean;
    /** Files with violations */
    affectedFiles: z.ZodArray<z.ZodString, "many">;
    /** Human-readable summary */
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    pass: boolean;
    ruleId: string;
    affectedFiles: string[];
}, {
    message: string;
    pass: boolean;
    ruleId: string;
    affectedFiles: string[];
}>;
/**
 * Validation result schema
 *
 * Validates the structure of .artk/validation-results.json entries
 */
export declare const ValidationResultSchema: z.ZodObject<{
    /** ISO 8601 timestamp when validation ran */
    timestamp: z.ZodString;
    /** Hash or reference to EnvironmentContext used */
    environmentContext: z.ZodString;
    /** Milliseconds taken to validate (max 10 seconds per FR-029) */
    executionTime: z.ZodNumber;
    /** Overall validation status */
    status: z.ZodEnum<["passed", "failed", "warnings"]>;
    /** Individual rule execution results */
    rules: z.ZodArray<z.ZodObject<{
        /** Unique identifier for the rule */
        ruleId: z.ZodString;
        /** true if rule passed */
        pass: z.ZodBoolean;
        /** Files with violations */
        affectedFiles: z.ZodArray<z.ZodString, "many">;
        /** Human-readable summary */
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        pass: boolean;
        ruleId: string;
        affectedFiles: string[];
    }, {
        message: string;
        pass: boolean;
        ruleId: string;
        affectedFiles: string[];
    }>, "many">;
    /** Critical issues that must be fixed */
    errors: z.ZodArray<z.ZodObject<{
        /** Absolute path to file with issue */
        file: z.ZodString;
        /** Line number (null if not applicable) */
        line: z.ZodNullable<z.ZodNumber>;
        /** Column number (null if not available) */
        column: z.ZodNullable<z.ZodNumber>;
        /** Issue severity level */
        severity: z.ZodEnum<["error", "warning"]>;
        /** Rule that detected this issue */
        ruleId: z.ZodString;
        /** Human-readable description of the issue */
        message: z.ZodString;
        /** Suggestion for how to fix the issue */
        suggestedFix: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        column: number | null;
        line: number | null;
        file: string;
        severity: "error" | "warning";
        ruleId: string;
        suggestedFix: string | null;
    }, {
        message: string;
        column: number | null;
        line: number | null;
        file: string;
        severity: "error" | "warning";
        ruleId: string;
        suggestedFix: string | null;
    }>, "many">;
    /** Non-critical issues for developer awareness */
    warnings: z.ZodArray<z.ZodObject<{
        /** Absolute path to file with issue */
        file: z.ZodString;
        /** Line number (null if not applicable) */
        line: z.ZodNullable<z.ZodNumber>;
        /** Column number (null if not available) */
        column: z.ZodNullable<z.ZodNumber>;
        /** Issue severity level */
        severity: z.ZodEnum<["error", "warning"]>;
        /** Rule that detected this issue */
        ruleId: z.ZodString;
        /** Human-readable description of the issue */
        message: z.ZodString;
        /** Suggestion for how to fix the issue */
        suggestedFix: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        column: number | null;
        line: number | null;
        file: string;
        severity: "error" | "warning";
        ruleId: string;
        suggestedFix: string | null;
    }, {
        message: string;
        column: number | null;
        line: number | null;
        file: string;
        severity: "error" | "warning";
        ruleId: string;
        suggestedFix: string | null;
    }>, "many">;
    /** List of file paths that were validated */
    validatedFiles: z.ZodArray<z.ZodString, "many">;
    /** true if automatic rollback was triggered */
    rollbackPerformed: z.ZodBoolean;
    /** null if no rollback, true if successful, false if failed */
    rollbackSuccess: z.ZodNullable<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status: "passed" | "failed" | "warnings";
    errors: {
        message: string;
        column: number | null;
        line: number | null;
        file: string;
        severity: "error" | "warning";
        ruleId: string;
        suggestedFix: string | null;
    }[];
    warnings: {
        message: string;
        column: number | null;
        line: number | null;
        file: string;
        severity: "error" | "warning";
        ruleId: string;
        suggestedFix: string | null;
    }[];
    timestamp: string;
    environmentContext: string;
    executionTime: number;
    rules: {
        message: string;
        pass: boolean;
        ruleId: string;
        affectedFiles: string[];
    }[];
    validatedFiles: string[];
    rollbackPerformed: boolean;
    rollbackSuccess: boolean | null;
}, {
    status: "passed" | "failed" | "warnings";
    errors: {
        message: string;
        column: number | null;
        line: number | null;
        file: string;
        severity: "error" | "warning";
        ruleId: string;
        suggestedFix: string | null;
    }[];
    warnings: {
        message: string;
        column: number | null;
        line: number | null;
        file: string;
        severity: "error" | "warning";
        ruleId: string;
        suggestedFix: string | null;
    }[];
    timestamp: string;
    environmentContext: string;
    executionTime: number;
    rules: {
        message: string;
        pass: boolean;
        ruleId: string;
        affectedFiles: string[];
    }[];
    validatedFiles: string[];
    rollbackPerformed: boolean;
    rollbackSuccess: boolean | null;
}>;
/**
 * Validation options schema
 */
export declare const ValidationOptionsSchema: z.ZodObject<{
    /** Files to validate */
    files: z.ZodArray<z.ZodString, "many">;
    /** Environment context for validation rules */
    environmentContext: z.ZodString;
    /** Skip validation entirely */
    skipValidation: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Validation timeout in milliseconds */
    timeout: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    /** Strictness levels for each rule type */
    strictness: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodEnum<["import-meta-usage", "dirname-usage", "import-paths", "dependency-compat", "typescript-compat"]>, z.ZodEnum<["error", "warning", "ignore"]>>>>;
}, "strip", z.ZodTypeAny, {
    timeout: number;
    environmentContext: string;
    files: string[];
    skipValidation: boolean;
    strictness: Partial<Record<"import-meta-usage" | "dirname-usage" | "import-paths" | "dependency-compat" | "typescript-compat", "error" | "warning" | "ignore">>;
}, {
    environmentContext: string;
    files: string[];
    timeout?: number | undefined;
    skipValidation?: boolean | undefined;
    strictness?: Partial<Record<"import-meta-usage" | "dirname-usage" | "import-paths" | "dependency-compat" | "typescript-compat", "error" | "warning" | "ignore">> | undefined;
}>;
/**
 * Validation rule config schema
 */
export declare const ValidationRuleConfigSchema: z.ZodObject<{
    /** Unique identifier for the rule */
    id: z.ZodString;
    /** Human-readable name */
    name: z.ZodString;
    /** Description of what the rule checks */
    description: z.ZodString;
    /** Default strictness level */
    defaultStrictness: z.ZodEnum<["error", "warning", "ignore"]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    id: string;
    defaultStrictness: "error" | "warning" | "ignore";
}, {
    name: string;
    description: string;
    id: string;
    defaultStrictness: "error" | "warning" | "ignore";
}>;
/**
 * Rollback result schema
 */
export declare const RollbackResultSchema: z.ZodObject<{
    /** Whether rollback was successful */
    success: z.ZodBoolean;
    /** Files that were removed during rollback */
    removedFiles: z.ZodArray<z.ZodString, "many">;
    /** Files that were restored from backup */
    restoredFiles: z.ZodArray<z.ZodString, "many">;
    /** Files that failed to be rolled back */
    failedFiles: z.ZodArray<z.ZodObject<{
        file: z.ZodString;
        error: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        error: string;
        file: string;
    }, {
        error: string;
        file: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    removedFiles: string[];
    restoredFiles: string[];
    failedFiles: {
        error: string;
        file: string;
    }[];
}, {
    success: boolean;
    removedFiles: string[];
    restoredFiles: string[];
    failedFiles: {
        error: string;
        file: string;
    }[];
}>;
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
export declare function validateValidationResult(data: unknown): ValidationResultType;
/**
 * Safely validates a ValidationResult object
 *
 * @param data - Data to validate
 * @returns Result object with success status and data or error
 */
export declare function safeValidateValidationResult(data: unknown): z.SafeParseReturnType<unknown, ValidationResultType>;
/**
 * Validates a ValidationIssue object
 *
 * @param data - Data to validate
 * @returns Validated ValidationIssue or throws ZodError
 */
export declare function validateValidationIssue(data: unknown): ValidationIssueType;
/**
 * Validates a RollbackResult object
 *
 * @param data - Data to validate
 * @returns Validated RollbackResult or throws ZodError
 */
export declare function validateRollbackResult(data: unknown): RollbackResultType;
//# sourceMappingURL=validation-result.schema.d.ts.map