/**
 * Validation Result Types
 *
 * Records the outcome of foundation module validation for audit trail and debugging.
 * Matches the JSON schema at specs/001-foundation-compatibility/contracts/validation-result.schema.json
 *
 * @module @artk/core/types
 */

/**
 * Severity level for validation issues
 */
export type ValidationSeverity = 'error' | 'warning';

/**
 * Overall validation status
 */
export type ValidationStatus = 'passed' | 'failed' | 'warnings';

/**
 * Strictness level for validation rules
 */
export type StrictnessLevel = 'error' | 'warning' | 'ignore';

/**
 * Known validation rule IDs
 */
export type ValidationRuleId =
  | 'import-meta-usage'
  | 'dirname-usage'
  | 'import-paths'
  | 'dependency-compat'
  | 'typescript-compat';

/**
 * Individual validation issue found during validation
 */
export interface ValidationIssue {
  /**
   * Absolute path to file with issue
   */
  file: string;

  /**
   * Line number (null if not applicable)
   */
  line: number | null;

  /**
   * Column number (null if not available)
   */
  column: number | null;

  /**
   * Issue severity level
   */
  severity: ValidationSeverity;

  /**
   * Rule that detected this issue
   */
  ruleId: string;

  /**
   * Human-readable description of the issue
   */
  message: string;

  /**
   * Suggestion for how to fix the issue (null if no suggestion)
   */
  suggestedFix: string | null;
}

/**
 * Result of a single validation rule execution
 */
export interface ValidationRuleResult {
  /**
   * Unique identifier for the rule (e.g., 'import-meta-usage')
   */
  ruleId: string;

  /**
   * true if rule passed, false if violations found
   */
  pass: boolean;

  /**
   * Files with violations (empty if rule passed)
   */
  affectedFiles: string[];

  /**
   * Human-readable summary of rule result
   */
  message: string;
}

/**
 * Validation Result - Outcome of foundation module validation
 *
 * Storage: `.artk/validation-results.json`
 * Lifecycle: Appended to (array of results) after each validation run.
 *            Preserved during rollback (FR-034).
 *
 * @example
 * ```json
 * {
 *   "timestamp": "2026-01-13T15:35:00.000Z",
 *   "environmentContext": "commonjs-node-18.12.1",
 *   "executionTime": 245,
 *   "status": "passed",
 *   "rules": [],
 *   "errors": [],
 *   "warnings": [],
 *   "validatedFiles": ["auth/login.ts", "config/env.ts"],
 *   "rollbackPerformed": false,
 *   "rollbackSuccess": null
 * }
 * ```
 */
export interface ValidationResult {
  /**
   * ISO 8601 timestamp when validation ran
   */
  timestamp: string;

  /**
   * Hash or reference to EnvironmentContext used
   */
  environmentContext: string;

  /**
   * Milliseconds taken to validate (max 10 seconds per FR-029)
   */
  executionTime: number;

  /**
   * Overall validation status
   * - 'passed': No errors or warnings
   * - 'failed': One or more errors
   * - 'warnings': No errors but has warnings
   */
  status: ValidationStatus;

  /**
   * Individual rule execution results
   */
  rules: ValidationRuleResult[];

  /**
   * Critical issues that must be fixed
   */
  errors: ValidationIssue[];

  /**
   * Non-critical issues for developer awareness
   */
  warnings: ValidationIssue[];

  /**
   * List of file paths that were validated
   */
  validatedFiles: string[];

  /**
   * true if automatic rollback was triggered (FR-033)
   */
  rollbackPerformed: boolean;

  /**
   * null if no rollback, true if successful, false if failed
   */
  rollbackSuccess: boolean | null;
}

/**
 * Options for the validation runner
 */
export interface ValidationOptions {
  /**
   * Files to validate
   */
  files: string[];

  /**
   * Environment context for validation rules
   */
  environmentContext: string;

  /**
   * Skip validation entirely
   * @default false
   */
  skipValidation?: boolean;

  /**
   * Validation timeout in milliseconds
   * @default 10000
   */
  timeout?: number;

  /**
   * Strictness levels for each rule type
   */
  strictness?: Partial<Record<ValidationRuleId, StrictnessLevel>>;
}

/**
 * Configuration for a validation rule
 */
export interface ValidationRuleConfig {
  /**
   * Unique identifier for the rule
   */
  id: ValidationRuleId | string;

  /**
   * Human-readable name for the rule
   */
  name: string;

  /**
   * Description of what the rule checks
   */
  description: string;

  /**
   * Default strictness level
   */
  defaultStrictness: StrictnessLevel;
}

/**
 * Interface for implementing a validation rule
 */
export interface ValidationRule {
  /**
   * Rule configuration
   */
  config: ValidationRuleConfig;

  /**
   * Validate a single file
   * @param filePath Absolute path to file
   * @param content File content
   * @param moduleSystem Current module system
   * @returns Array of validation issues found
   */
  validate(
    filePath: string,
    content: string,
    moduleSystem: 'commonjs' | 'esm'
  ): ValidationIssue[];
}

/**
 * Transaction tracking for rollback support
 */
export interface GenerationTransaction {
  /**
   * Files generated during this transaction
   */
  generatedFiles: string[];

  /**
   * Map of original file path to backup path
   */
  originalFiles: Map<string, string>;

  /**
   * Transaction start timestamp
   */
  startTime: number;
}

/**
 * Rollback result information
 */
export interface RollbackResult {
  /**
   * Whether rollback was successful
   */
  success: boolean;

  /**
   * Files that were removed during rollback
   */
  removedFiles: string[];

  /**
   * Files that were restored from backup
   */
  restoredFiles: string[];

  /**
   * Files that failed to be rolled back
   */
  failedFiles: Array<{
    file: string;
    error: string;
  }>;
}
