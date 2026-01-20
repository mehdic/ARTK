'use strict';

var zod = require('zod');

// schemas/environment-context.schema.ts
var ModuleSystemSchema = zod.z.enum(["commonjs", "esm"]);
var TemplateSourceSchema = zod.z.enum(["bundled", "local-override"]);
var DetectionConfidenceSchema = zod.z.enum(["high", "medium", "low"]);
var DetectionMethodSchema = zod.z.enum(["package.json", "tsconfig.json", "fallback"]);
var NodeVersionParsedSchema = zod.z.object({
  /** Major version number (must be >= 18) */
  major: zod.z.number().int().min(18, "Node.js version must be >= 18.0.0"),
  /** Minor version number */
  minor: zod.z.number().int().min(0),
  /** Patch version number */
  patch: zod.z.number().int().min(0)
});
var semverPattern = /^\d+\.\d+\.\d+$/;
var EnvironmentContextSchema = zod.z.object({
  /** Detected module system from package.json or tsconfig.json */
  moduleSystem: ModuleSystemSchema,
  /** Semantic version of Node.js (e.g., "18.12.1") */
  nodeVersion: zod.z.string().regex(semverPattern, "Invalid semver format"),
  /** Parsed Node.js version components */
  nodeVersionParsed: NodeVersionParsedSchema,
  /** TypeScript module setting from tsconfig.json, or null if not present */
  tsModule: zod.z.string().nullable(),
  /** true if Node 18+ and ESM environment */
  supportsImportMeta: zod.z.boolean(),
  /** true if Node 20.11.0+ (has import.meta.dirname built-in) */
  supportsBuiltinDirname: zod.z.boolean(),
  /** Which template set was used for generation */
  templateVariant: ModuleSystemSchema,
  /** Where templates came from */
  templateSource: TemplateSourceSchema,
  /** ISO 8601 timestamp when detection ran */
  detectionTimestamp: zod.z.string().datetime({ message: "Invalid ISO 8601 timestamp" }),
  /** Confidence level based on signal consistency */
  detectionConfidence: DetectionConfidenceSchema,
  /** Primary method that determined module system */
  detectionMethod: DetectionMethodSchema,
  /** List of warnings encountered during detection */
  warnings: zod.z.array(zod.z.string())
});
var DetectionOptionsSchema = zod.z.object({
  /** Project root directory */
  projectRoot: zod.z.string().min(1, "Project root is required"),
  /** Force re-detection */
  forceDetect: zod.z.boolean().optional().default(false),
  /** Timeout in milliseconds */
  timeout: zod.z.number().int().min(100).max(3e4).optional().default(5e3)
});
var DetectionResultSchema = zod.z.object({
  /** The detected environment context */
  context: EnvironmentContextSchema,
  /** Whether results were loaded from cache */
  fromCache: zod.z.boolean(),
  /** Time taken for detection in milliseconds */
  detectionTime: zod.z.number().int().min(0)
});
function validateEnvironmentContext(data) {
  return EnvironmentContextSchema.parse(data);
}
function safeValidateEnvironmentContext(data) {
  return EnvironmentContextSchema.safeParse(data);
}
var ValidationSeveritySchema = zod.z.enum(["error", "warning"]);
var ValidationStatusSchema = zod.z.enum(["passed", "failed", "warnings"]);
var StrictnessLevelSchema = zod.z.enum(["error", "warning", "ignore"]);
var ValidationRuleIdSchema = zod.z.enum([
  "import-meta-usage",
  "dirname-usage",
  "import-paths",
  "dependency-compat",
  "typescript-compat"
]);
var ValidationIssueSchema = zod.z.object({
  /** Absolute path to file with issue */
  file: zod.z.string(),
  /** Line number (null if not applicable) */
  line: zod.z.number().int().min(1).nullable(),
  /** Column number (null if not available) */
  column: zod.z.number().int().min(1).nullable(),
  /** Issue severity level */
  severity: ValidationSeveritySchema,
  /** Rule that detected this issue */
  ruleId: zod.z.string(),
  /** Human-readable description of the issue */
  message: zod.z.string(),
  /** Suggestion for how to fix the issue */
  suggestedFix: zod.z.string().nullable()
});
var ValidationRuleResultSchema = zod.z.object({
  /** Unique identifier for the rule */
  ruleId: zod.z.string(),
  /** true if rule passed */
  pass: zod.z.boolean(),
  /** Files with violations */
  affectedFiles: zod.z.array(zod.z.string()),
  /** Human-readable summary */
  message: zod.z.string()
});
var ValidationResultSchema = zod.z.object({
  /** ISO 8601 timestamp when validation ran */
  timestamp: zod.z.string().datetime({ message: "Invalid ISO 8601 timestamp" }),
  /** Hash or reference to EnvironmentContext used */
  environmentContext: zod.z.string(),
  /** Milliseconds taken to validate (max 10 seconds per FR-029) */
  executionTime: zod.z.number().int().min(0).max(1e4),
  /** Overall validation status */
  status: ValidationStatusSchema,
  /** Individual rule execution results */
  rules: zod.z.array(ValidationRuleResultSchema),
  /** Critical issues that must be fixed */
  errors: zod.z.array(ValidationIssueSchema),
  /** Non-critical issues for developer awareness */
  warnings: zod.z.array(ValidationIssueSchema),
  /** List of file paths that were validated */
  validatedFiles: zod.z.array(zod.z.string()),
  /** true if automatic rollback was triggered */
  rollbackPerformed: zod.z.boolean(),
  /** null if no rollback, true if successful, false if failed */
  rollbackSuccess: zod.z.boolean().nullable()
});
var ValidationOptionsSchema = zod.z.object({
  /** Files to validate */
  files: zod.z.array(zod.z.string()).min(1, "At least one file is required"),
  /** Environment context for validation rules */
  environmentContext: zod.z.string(),
  /** Skip validation entirely */
  skipValidation: zod.z.boolean().optional().default(false),
  /** Validation timeout in milliseconds */
  timeout: zod.z.number().int().min(100).max(6e4).optional().default(1e4),
  /** Strictness levels for each rule type */
  strictness: zod.z.record(ValidationRuleIdSchema, StrictnessLevelSchema).optional().default({})
});
var ValidationRuleConfigSchema = zod.z.object({
  /** Unique identifier for the rule */
  id: zod.z.string(),
  /** Human-readable name */
  name: zod.z.string(),
  /** Description of what the rule checks */
  description: zod.z.string(),
  /** Default strictness level */
  defaultStrictness: StrictnessLevelSchema
});
var RollbackResultSchema = zod.z.object({
  /** Whether rollback was successful */
  success: zod.z.boolean(),
  /** Files that were removed during rollback */
  removedFiles: zod.z.array(zod.z.string()),
  /** Files that were restored from backup */
  restoredFiles: zod.z.array(zod.z.string()),
  /** Files that failed to be rolled back */
  failedFiles: zod.z.array(
    zod.z.object({
      file: zod.z.string(),
      error: zod.z.string()
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

exports.DetectionConfidenceSchema = DetectionConfidenceSchema;
exports.DetectionMethodSchema = DetectionMethodSchema;
exports.DetectionOptionsSchema = DetectionOptionsSchema;
exports.DetectionResultSchema = DetectionResultSchema;
exports.EnvironmentContextSchema = EnvironmentContextSchema;
exports.ModuleSystemSchema = ModuleSystemSchema;
exports.NodeVersionParsedSchema = NodeVersionParsedSchema;
exports.RollbackResultSchema = RollbackResultSchema;
exports.StrictnessLevelSchema = StrictnessLevelSchema;
exports.TemplateSourceSchema = TemplateSourceSchema;
exports.ValidationIssueSchema = ValidationIssueSchema;
exports.ValidationOptionsSchema = ValidationOptionsSchema;
exports.ValidationResultSchema = ValidationResultSchema;
exports.ValidationRuleConfigSchema = ValidationRuleConfigSchema;
exports.ValidationRuleIdSchema = ValidationRuleIdSchema;
exports.ValidationRuleResultSchema = ValidationRuleResultSchema;
exports.ValidationSeveritySchema = ValidationSeveritySchema;
exports.ValidationStatusSchema = ValidationStatusSchema;
exports.safeValidateEnvironmentContext = safeValidateEnvironmentContext;
exports.safeValidateValidationResult = safeValidateValidationResult;
exports.validateEnvironmentContext = validateEnvironmentContext;
exports.validateRollbackResult = validateRollbackResult;
exports.validateValidationIssue = validateValidationIssue;
exports.validateValidationResult = validateValidationResult;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map