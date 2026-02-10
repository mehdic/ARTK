import { z } from 'zod';

// schemas/environment-context.schema.ts
var ModuleSystemSchema = z.enum(["commonjs", "esm"]);
var TemplateSourceSchema = z.enum(["bundled", "local-override"]);
var DetectionConfidenceSchema = z.enum(["high", "medium", "low"]);
var DetectionMethodSchema = z.enum(["package.json", "tsconfig.json", "fallback"]);
var NodeVersionParsedSchema = z.object({
  /** Major version number (must be >= 18) */
  major: z.number().int().min(18, "Node.js version must be >= 18.0.0"),
  /** Minor version number */
  minor: z.number().int().min(0),
  /** Patch version number */
  patch: z.number().int().min(0)
});
var semverPattern = /^\d+\.\d+\.\d+$/;
var EnvironmentContextSchema = z.object({
  /** Detected module system from package.json or tsconfig.json */
  moduleSystem: ModuleSystemSchema,
  /** Semantic version of Node.js (e.g., "18.12.1") */
  nodeVersion: z.string().regex(semverPattern, "Invalid semver format"),
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
  detectionTimestamp: z.string().datetime({ message: "Invalid ISO 8601 timestamp" }),
  /** Confidence level based on signal consistency */
  detectionConfidence: DetectionConfidenceSchema,
  /** Primary method that determined module system */
  detectionMethod: DetectionMethodSchema,
  /** List of warnings encountered during detection */
  warnings: z.array(z.string())
});
var DetectionOptionsSchema = z.object({
  /** Project root directory */
  projectRoot: z.string().min(1, "Project root is required"),
  /** Force re-detection */
  forceDetect: z.boolean().optional().default(false),
  /** Timeout in milliseconds */
  timeout: z.number().int().min(100).max(3e4).optional().default(5e3)
});
var DetectionResultSchema = z.object({
  /** The detected environment context */
  context: EnvironmentContextSchema,
  /** Whether results were loaded from cache */
  fromCache: z.boolean(),
  /** Time taken for detection in milliseconds */
  detectionTime: z.number().int().min(0)
});
function validateEnvironmentContext(data) {
  return EnvironmentContextSchema.parse(data);
}
function safeValidateEnvironmentContext(data) {
  return EnvironmentContextSchema.safeParse(data);
}
var ValidationSeveritySchema = z.enum(["error", "warning"]);
var ValidationStatusSchema = z.enum(["passed", "failed", "warnings"]);
var StrictnessLevelSchema = z.enum(["error", "warning", "ignore"]);
var ValidationRuleIdSchema = z.enum([
  "import-meta-usage",
  "dirname-usage",
  "import-paths",
  "dependency-compat",
  "typescript-compat"
]);
var ValidationIssueSchema = z.object({
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
  suggestedFix: z.string().nullable()
});
var ValidationRuleResultSchema = z.object({
  /** Unique identifier for the rule */
  ruleId: z.string(),
  /** true if rule passed */
  pass: z.boolean(),
  /** Files with violations */
  affectedFiles: z.array(z.string()),
  /** Human-readable summary */
  message: z.string()
});
var ValidationResultSchema = z.object({
  /** ISO 8601 timestamp when validation ran */
  timestamp: z.string().datetime({ message: "Invalid ISO 8601 timestamp" }),
  /** Hash or reference to EnvironmentContext used */
  environmentContext: z.string(),
  /** Milliseconds taken to validate (max 10 seconds per FR-029) */
  executionTime: z.number().int().min(0).max(1e4),
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
  rollbackSuccess: z.boolean().nullable()
});
var ValidationOptionsSchema = z.object({
  /** Files to validate */
  files: z.array(z.string()).min(1, "At least one file is required"),
  /** Environment context for validation rules */
  environmentContext: z.string(),
  /** Skip validation entirely */
  skipValidation: z.boolean().optional().default(false),
  /** Validation timeout in milliseconds */
  timeout: z.number().int().min(100).max(6e4).optional().default(1e4),
  /** Strictness levels for each rule type */
  strictness: z.record(ValidationRuleIdSchema, StrictnessLevelSchema).optional().default({})
});
var ValidationRuleConfigSchema = z.object({
  /** Unique identifier for the rule */
  id: z.string(),
  /** Human-readable name */
  name: z.string(),
  /** Description of what the rule checks */
  description: z.string(),
  /** Default strictness level */
  defaultStrictness: StrictnessLevelSchema
});
var RollbackResultSchema = z.object({
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
      error: z.string()
    })
  )
});
function validateValidationResult(data) {
  return ValidationResultSchema.parse(data);
}
function safeValidateValidationResult(data) {
  return ValidationResultSchema.safeParse(data);
}
function validateValidationIssue(data) {
  return ValidationIssueSchema.parse(data);
}
function validateRollbackResult(data) {
  return RollbackResultSchema.parse(data);
}

export { DetectionConfidenceSchema, DetectionMethodSchema, DetectionOptionsSchema, DetectionResultSchema, EnvironmentContextSchema, ModuleSystemSchema, NodeVersionParsedSchema, RollbackResultSchema, StrictnessLevelSchema, TemplateSourceSchema, ValidationIssueSchema, ValidationOptionsSchema, ValidationResultSchema, ValidationRuleConfigSchema, ValidationRuleIdSchema, ValidationRuleResultSchema, ValidationSeveritySchema, ValidationStatusSchema, safeValidateEnvironmentContext, safeValidateValidationResult, validateEnvironmentContext, validateRollbackResult, validateValidationIssue, validateValidationResult };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map