import { z } from 'zod';

/**
 * Zod Schemas for Environment Context
 *
 * Runtime validation schemas matching the JSON schema at
 * specs/001-foundation-compatibility/contracts/environment-context.schema.json
 *
 * @module @artk/core/schemas
 */

/**
 * Module system schema - either CommonJS or ESM
 */
declare const ModuleSystemSchema: z.ZodEnum<["commonjs", "esm"]>;
/**
 * Template source schema - where templates came from
 */
declare const TemplateSourceSchema: z.ZodEnum<["bundled", "local-override"]>;
/**
 * Detection confidence schema
 */
declare const DetectionConfidenceSchema: z.ZodEnum<["high", "medium", "low"]>;
/**
 * Detection method schema
 */
declare const DetectionMethodSchema: z.ZodEnum<["package.json", "tsconfig.json", "fallback"]>;
/**
 * Parsed Node.js version schema
 */
declare const NodeVersionParsedSchema: z.ZodObject<{
    /** Major version number (must be >= 18) */
    major: z.ZodNumber;
    /** Minor version number */
    minor: z.ZodNumber;
    /** Patch version number */
    patch: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    major: number;
    minor: number;
    patch: number;
}, {
    major: number;
    minor: number;
    patch: number;
}>;
/**
 * Environment Context schema
 *
 * Validates the structure of .artk/context.json
 */
declare const EnvironmentContextSchema: z.ZodObject<{
    /** Detected module system from package.json or tsconfig.json */
    moduleSystem: z.ZodEnum<["commonjs", "esm"]>;
    /** Semantic version of Node.js (e.g., "18.12.1") */
    nodeVersion: z.ZodString;
    /** Parsed Node.js version components */
    nodeVersionParsed: z.ZodObject<{
        /** Major version number (must be >= 18) */
        major: z.ZodNumber;
        /** Minor version number */
        minor: z.ZodNumber;
        /** Patch version number */
        patch: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        major: number;
        minor: number;
        patch: number;
    }, {
        major: number;
        minor: number;
        patch: number;
    }>;
    /** TypeScript module setting from tsconfig.json, or null if not present */
    tsModule: z.ZodNullable<z.ZodString>;
    /** true if Node 18+ and ESM environment */
    supportsImportMeta: z.ZodBoolean;
    /** true if Node 20.11.0+ (has import.meta.dirname built-in) */
    supportsBuiltinDirname: z.ZodBoolean;
    /** Which template set was used for generation */
    templateVariant: z.ZodEnum<["commonjs", "esm"]>;
    /** Where templates came from */
    templateSource: z.ZodEnum<["bundled", "local-override"]>;
    /** ISO 8601 timestamp when detection ran */
    detectionTimestamp: z.ZodString;
    /** Confidence level based on signal consistency */
    detectionConfidence: z.ZodEnum<["high", "medium", "low"]>;
    /** Primary method that determined module system */
    detectionMethod: z.ZodEnum<["package.json", "tsconfig.json", "fallback"]>;
    /** List of warnings encountered during detection */
    warnings: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    moduleSystem: "commonjs" | "esm";
    nodeVersion: string;
    nodeVersionParsed: {
        major: number;
        minor: number;
        patch: number;
    };
    tsModule: string | null;
    supportsImportMeta: boolean;
    supportsBuiltinDirname: boolean;
    templateVariant: "commonjs" | "esm";
    templateSource: "bundled" | "local-override";
    detectionTimestamp: string;
    detectionConfidence: "high" | "medium" | "low";
    detectionMethod: "package.json" | "tsconfig.json" | "fallback";
    warnings: string[];
}, {
    moduleSystem: "commonjs" | "esm";
    nodeVersion: string;
    nodeVersionParsed: {
        major: number;
        minor: number;
        patch: number;
    };
    tsModule: string | null;
    supportsImportMeta: boolean;
    supportsBuiltinDirname: boolean;
    templateVariant: "commonjs" | "esm";
    templateSource: "bundled" | "local-override";
    detectionTimestamp: string;
    detectionConfidence: "high" | "medium" | "low";
    detectionMethod: "package.json" | "tsconfig.json" | "fallback";
    warnings: string[];
}>;
/**
 * Detection options schema
 */
declare const DetectionOptionsSchema: z.ZodObject<{
    /** Project root directory */
    projectRoot: z.ZodString;
    /** Force re-detection */
    forceDetect: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Timeout in milliseconds */
    timeout: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    projectRoot: string;
    forceDetect: boolean;
    timeout: number;
}, {
    projectRoot: string;
    forceDetect?: boolean | undefined;
    timeout?: number | undefined;
}>;
/**
 * Detection result schema
 */
declare const DetectionResultSchema: z.ZodObject<{
    /** The detected environment context */
    context: z.ZodObject<{
        /** Detected module system from package.json or tsconfig.json */
        moduleSystem: z.ZodEnum<["commonjs", "esm"]>;
        /** Semantic version of Node.js (e.g., "18.12.1") */
        nodeVersion: z.ZodString;
        /** Parsed Node.js version components */
        nodeVersionParsed: z.ZodObject<{
            /** Major version number (must be >= 18) */
            major: z.ZodNumber;
            /** Minor version number */
            minor: z.ZodNumber;
            /** Patch version number */
            patch: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            major: number;
            minor: number;
            patch: number;
        }, {
            major: number;
            minor: number;
            patch: number;
        }>;
        /** TypeScript module setting from tsconfig.json, or null if not present */
        tsModule: z.ZodNullable<z.ZodString>;
        /** true if Node 18+ and ESM environment */
        supportsImportMeta: z.ZodBoolean;
        /** true if Node 20.11.0+ (has import.meta.dirname built-in) */
        supportsBuiltinDirname: z.ZodBoolean;
        /** Which template set was used for generation */
        templateVariant: z.ZodEnum<["commonjs", "esm"]>;
        /** Where templates came from */
        templateSource: z.ZodEnum<["bundled", "local-override"]>;
        /** ISO 8601 timestamp when detection ran */
        detectionTimestamp: z.ZodString;
        /** Confidence level based on signal consistency */
        detectionConfidence: z.ZodEnum<["high", "medium", "low"]>;
        /** Primary method that determined module system */
        detectionMethod: z.ZodEnum<["package.json", "tsconfig.json", "fallback"]>;
        /** List of warnings encountered during detection */
        warnings: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        moduleSystem: "commonjs" | "esm";
        nodeVersion: string;
        nodeVersionParsed: {
            major: number;
            minor: number;
            patch: number;
        };
        tsModule: string | null;
        supportsImportMeta: boolean;
        supportsBuiltinDirname: boolean;
        templateVariant: "commonjs" | "esm";
        templateSource: "bundled" | "local-override";
        detectionTimestamp: string;
        detectionConfidence: "high" | "medium" | "low";
        detectionMethod: "package.json" | "tsconfig.json" | "fallback";
        warnings: string[];
    }, {
        moduleSystem: "commonjs" | "esm";
        nodeVersion: string;
        nodeVersionParsed: {
            major: number;
            minor: number;
            patch: number;
        };
        tsModule: string | null;
        supportsImportMeta: boolean;
        supportsBuiltinDirname: boolean;
        templateVariant: "commonjs" | "esm";
        templateSource: "bundled" | "local-override";
        detectionTimestamp: string;
        detectionConfidence: "high" | "medium" | "low";
        detectionMethod: "package.json" | "tsconfig.json" | "fallback";
        warnings: string[];
    }>;
    /** Whether results were loaded from cache */
    fromCache: z.ZodBoolean;
    /** Time taken for detection in milliseconds */
    detectionTime: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    context: {
        moduleSystem: "commonjs" | "esm";
        nodeVersion: string;
        nodeVersionParsed: {
            major: number;
            minor: number;
            patch: number;
        };
        tsModule: string | null;
        supportsImportMeta: boolean;
        supportsBuiltinDirname: boolean;
        templateVariant: "commonjs" | "esm";
        templateSource: "bundled" | "local-override";
        detectionTimestamp: string;
        detectionConfidence: "high" | "medium" | "low";
        detectionMethod: "package.json" | "tsconfig.json" | "fallback";
        warnings: string[];
    };
    fromCache: boolean;
    detectionTime: number;
}, {
    context: {
        moduleSystem: "commonjs" | "esm";
        nodeVersion: string;
        nodeVersionParsed: {
            major: number;
            minor: number;
            patch: number;
        };
        tsModule: string | null;
        supportsImportMeta: boolean;
        supportsBuiltinDirname: boolean;
        templateVariant: "commonjs" | "esm";
        templateSource: "bundled" | "local-override";
        detectionTimestamp: string;
        detectionConfidence: "high" | "medium" | "low";
        detectionMethod: "package.json" | "tsconfig.json" | "fallback";
        warnings: string[];
    };
    fromCache: boolean;
    detectionTime: number;
}>;
/**
 * Type inference helpers
 */
type ModuleSystemType = z.infer<typeof ModuleSystemSchema>;
type TemplateSourceType = z.infer<typeof TemplateSourceSchema>;
type DetectionConfidenceType = z.infer<typeof DetectionConfidenceSchema>;
type DetectionMethodType = z.infer<typeof DetectionMethodSchema>;
type NodeVersionParsedType = z.infer<typeof NodeVersionParsedSchema>;
type EnvironmentContextType = z.infer<typeof EnvironmentContextSchema>;
type DetectionOptionsType = z.infer<typeof DetectionOptionsSchema>;
type DetectionResultType = z.infer<typeof DetectionResultSchema>;
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
declare function validateEnvironmentContext(data: unknown): EnvironmentContextType;
/**
 * Safely validates an EnvironmentContext object
 *
 * @param data - Data to validate
 * @returns Result object with success status and data or error
 */
declare function safeValidateEnvironmentContext(data: unknown): z.SafeParseReturnType<unknown, EnvironmentContextType>;

/**
 * Zod Schemas for Validation Result
 *
 * Runtime validation schemas matching the JSON schema at
 * specs/001-foundation-compatibility/contracts/validation-result.schema.json
 *
 * @module @artk/core/schemas
 */

/**
 * Validation severity schema
 */
declare const ValidationSeveritySchema: z.ZodEnum<["error", "warning"]>;
/**
 * Validation status schema
 */
declare const ValidationStatusSchema: z.ZodEnum<["passed", "failed", "warnings"]>;
/**
 * Strictness level schema
 */
declare const StrictnessLevelSchema: z.ZodEnum<["error", "warning", "ignore"]>;
/**
 * Known validation rule IDs
 */
declare const ValidationRuleIdSchema: z.ZodEnum<["import-meta-usage", "dirname-usage", "import-paths", "dependency-compat", "typescript-compat"]>;
/**
 * Validation issue schema
 */
declare const ValidationIssueSchema: z.ZodObject<{
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
    file: string;
    line: number | null;
    column: number | null;
    severity: "error" | "warning";
    ruleId: string;
    suggestedFix: string | null;
}, {
    message: string;
    file: string;
    line: number | null;
    column: number | null;
    severity: "error" | "warning";
    ruleId: string;
    suggestedFix: string | null;
}>;
/**
 * Validation rule result schema
 */
declare const ValidationRuleResultSchema: z.ZodObject<{
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
    ruleId: string;
    pass: boolean;
    affectedFiles: string[];
}, {
    message: string;
    ruleId: string;
    pass: boolean;
    affectedFiles: string[];
}>;
/**
 * Validation result schema
 *
 * Validates the structure of .artk/validation-results.json entries
 */
declare const ValidationResultSchema: z.ZodObject<{
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
        ruleId: string;
        pass: boolean;
        affectedFiles: string[];
    }, {
        message: string;
        ruleId: string;
        pass: boolean;
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
        file: string;
        line: number | null;
        column: number | null;
        severity: "error" | "warning";
        ruleId: string;
        suggestedFix: string | null;
    }, {
        message: string;
        file: string;
        line: number | null;
        column: number | null;
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
        file: string;
        line: number | null;
        column: number | null;
        severity: "error" | "warning";
        ruleId: string;
        suggestedFix: string | null;
    }, {
        message: string;
        file: string;
        line: number | null;
        column: number | null;
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
    status: "warnings" | "passed" | "failed";
    warnings: {
        message: string;
        file: string;
        line: number | null;
        column: number | null;
        severity: "error" | "warning";
        ruleId: string;
        suggestedFix: string | null;
    }[];
    timestamp: string;
    environmentContext: string;
    executionTime: number;
    rules: {
        message: string;
        ruleId: string;
        pass: boolean;
        affectedFiles: string[];
    }[];
    errors: {
        message: string;
        file: string;
        line: number | null;
        column: number | null;
        severity: "error" | "warning";
        ruleId: string;
        suggestedFix: string | null;
    }[];
    validatedFiles: string[];
    rollbackPerformed: boolean;
    rollbackSuccess: boolean | null;
}, {
    status: "warnings" | "passed" | "failed";
    warnings: {
        message: string;
        file: string;
        line: number | null;
        column: number | null;
        severity: "error" | "warning";
        ruleId: string;
        suggestedFix: string | null;
    }[];
    timestamp: string;
    environmentContext: string;
    executionTime: number;
    rules: {
        message: string;
        ruleId: string;
        pass: boolean;
        affectedFiles: string[];
    }[];
    errors: {
        message: string;
        file: string;
        line: number | null;
        column: number | null;
        severity: "error" | "warning";
        ruleId: string;
        suggestedFix: string | null;
    }[];
    validatedFiles: string[];
    rollbackPerformed: boolean;
    rollbackSuccess: boolean | null;
}>;
/**
 * Validation options schema
 */
declare const ValidationOptionsSchema: z.ZodObject<{
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
declare const ValidationRuleConfigSchema: z.ZodObject<{
    /** Unique identifier for the rule */
    id: z.ZodString;
    /** Human-readable name */
    name: z.ZodString;
    /** Description of what the rule checks */
    description: z.ZodString;
    /** Default strictness level */
    defaultStrictness: z.ZodEnum<["error", "warning", "ignore"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string;
    defaultStrictness: "error" | "warning" | "ignore";
}, {
    id: string;
    name: string;
    description: string;
    defaultStrictness: "error" | "warning" | "ignore";
}>;
/**
 * Rollback result schema
 */
declare const RollbackResultSchema: z.ZodObject<{
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
type ValidationSeverityType = z.infer<typeof ValidationSeveritySchema>;
type ValidationStatusType = z.infer<typeof ValidationStatusSchema>;
type StrictnessLevelType = z.infer<typeof StrictnessLevelSchema>;
type ValidationRuleIdType = z.infer<typeof ValidationRuleIdSchema>;
type ValidationIssueType = z.infer<typeof ValidationIssueSchema>;
type ValidationRuleResultType = z.infer<typeof ValidationRuleResultSchema>;
type ValidationResultType = z.infer<typeof ValidationResultSchema>;
type ValidationOptionsType = z.infer<typeof ValidationOptionsSchema>;
type ValidationRuleConfigType = z.infer<typeof ValidationRuleConfigSchema>;
type RollbackResultType = z.infer<typeof RollbackResultSchema>;
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
declare function validateValidationResult(data: unknown): ValidationResultType;
/**
 * Safely validates a ValidationResult object
 *
 * @param data - Data to validate
 * @returns Result object with success status and data or error
 */
declare function safeValidateValidationResult(data: unknown): z.SafeParseReturnType<unknown, ValidationResultType>;
/**
 * Validates a ValidationIssue object
 *
 * @param data - Data to validate
 * @returns Validated ValidationIssue or throws ZodError
 */
declare function validateValidationIssue(data: unknown): ValidationIssueType;
/**
 * Validates a RollbackResult object
 *
 * @param data - Data to validate
 * @returns Validated RollbackResult or throws ZodError
 */
declare function validateRollbackResult(data: unknown): RollbackResultType;

export { DetectionConfidenceSchema, type DetectionConfidenceType, DetectionMethodSchema, type DetectionMethodType, DetectionOptionsSchema, type DetectionOptionsType, DetectionResultSchema, type DetectionResultType, EnvironmentContextSchema, type EnvironmentContextType, ModuleSystemSchema, type ModuleSystemType, NodeVersionParsedSchema, type NodeVersionParsedType, RollbackResultSchema, type RollbackResultType, StrictnessLevelSchema, type StrictnessLevelType, TemplateSourceSchema, type TemplateSourceType, ValidationIssueSchema, type ValidationIssueType, ValidationOptionsSchema, type ValidationOptionsType, ValidationResultSchema, type ValidationResultType, ValidationRuleConfigSchema, type ValidationRuleConfigType, ValidationRuleIdSchema, type ValidationRuleIdType, ValidationRuleResultSchema, type ValidationRuleResultType, ValidationSeveritySchema, type ValidationSeverityType, ValidationStatusSchema, type ValidationStatusType, safeValidateEnvironmentContext, safeValidateValidationResult, validateEnvironmentContext, validateRollbackResult, validateValidationIssue, validateValidationResult };
