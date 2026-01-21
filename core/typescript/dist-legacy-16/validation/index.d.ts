import { f as ValidationOptions, e as ValidationResult, G as GenerationTransaction, R as RollbackResult, h as ValidationRule, g as ValidationRuleConfig, c as ValidationIssue } from '../validation-result-BgIGL_BW.js';
export { S as StrictnessLevel, b as ValidationRuleId, d as ValidationRuleResult, V as ValidationSeverity, a as ValidationStatus } from '../validation-result-BgIGL_BW.js';

/**
 * Validation Runner
 * T057-T066: Implement ValidationRunner with timeout, file tracking, rollback, persistence
 *
 * Orchestrates all validation rules and manages the validation lifecycle including
 * automatic rollback on failure and result persistence.
 *
 * @module @artk/core/validation/runner
 */

/**
 * Runner options
 */
interface RunnerOptions {
    /**
     * Validation timeout in milliseconds
     * @default 10000 (10 seconds)
     */
    timeout?: number;
    /**
     * Output directory for validation results
     * @default process.cwd()
     */
    outputDir?: string;
}
/**
 * Validation Runner
 *
 * Orchestrates validation rules and manages the validation lifecycle.
 *
 * @example
 * ```typescript
 * const runner = new ValidationRunner();
 *
 * // Track files being generated
 * runner.trackGeneratedFile('/path/to/new/file.ts');
 *
 * // Run validation
 * const result = await runner.validate({
 *   files: ['/path/to/new/file.ts'],
 *   environmentContext: 'commonjs'
 * });
 *
 * if (result.status === 'failed') {
 *   // Files have been automatically rolled back
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */
declare class ValidationRunner {
    private timeout;
    private outputDir;
    private transaction;
    private rules;
    /**
     * Create a new ValidationRunner
     */
    constructor(options?: RunnerOptions);
    /**
     * Get the configured timeout
     */
    getTimeout(): number;
    /**
     * Track a newly generated file
     */
    trackGeneratedFile(filePath: string): void;
    /**
     * Track an existing file before modification
     */
    trackOriginalFile(filePath: string): string | null;
    /**
     * Run validation on the specified files
     */
    validate(options: ValidationOptions): Promise<ValidationResult>;
    /**
     * Validate files using all rules
     */
    private validateFiles;
    /**
     * Persist validation result to .artk/validation-results.json
     */
    private persistResult;
}
/**
 * Validate foundation modules
 *
 * Convenience function for one-off validation without creating a runner instance.
 *
 * @param options - Validation options
 * @returns Validation result
 *
 * @example
 * ```typescript
 * import { validateFoundation } from '@artk/core/validation';
 *
 * const result = await validateFoundation({
 *   files: ['auth/login.ts', 'config/env.ts'],
 *   environmentContext: 'commonjs'
 * });
 *
 * if (result.status === 'failed') {
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */
declare function validateFoundation(options: ValidationOptions): Promise<ValidationResult>;

/**
 * Rollback Transaction Logic
 * T060: Implement rollback transaction logic (FR-033)
 *
 * Provides write-to-temp-then-rename pattern and rollback functionality
 * for atomic file generation with automatic cleanup on validation failure.
 *
 * @module @artk/core/validation/rollback
 */

/**
 * Start a new generation transaction
 *
 * @returns A new transaction object for tracking generated files
 *
 * @example
 * ```typescript
 * const tx = startTransaction();
 * trackGeneratedFile(tx, '/path/to/new/file.ts');
 * // ... generate files ...
 * if (validationFailed) {
 *   rollbackTransaction(tx);
 * } else {
 *   commitTransaction(tx);
 * }
 * ```
 */
declare function startTransaction(): GenerationTransaction;
/**
 * Track a newly generated file
 *
 * Call this for each file created during generation.
 * On rollback, these files will be deleted.
 *
 * @param tx - The current transaction
 * @param filePath - Absolute path to the generated file
 */
declare function trackGeneratedFile(tx: GenerationTransaction, filePath: string): void;
/**
 * Track an existing file before modification
 *
 * Call this before modifying an existing file.
 * Creates a backup that will be restored on rollback.
 *
 * @param tx - The current transaction
 * @param filePath - Absolute path to the existing file
 * @returns Path to the backup file, or null if file doesn't exist
 */
declare function trackOriginalFile(tx: GenerationTransaction, filePath: string): string | null;
/**
 * Commit the transaction
 *
 * Call this when validation passes. Cleans up backup files
 * and clears the transaction state.
 *
 * @param tx - The transaction to commit
 */
declare function commitTransaction(tx: GenerationTransaction): void;
/**
 * Rollback the transaction
 *
 * Call this when validation fails. Removes generated files
 * and restores original files from backups.
 *
 * @param tx - The transaction to rollback
 * @returns Result object with lists of removed, restored, and failed files
 *
 * @example
 * ```typescript
 * const result = rollbackTransaction(tx);
 * if (result.success) {
 *   console.log('Rollback complete');
 *   console.log('Removed:', result.removedFiles);
 *   console.log('Restored:', result.restoredFiles);
 * } else {
 *   console.error('Some files could not be rolled back:', result.failedFiles);
 * }
 * ```
 */
declare function rollbackTransaction(tx: GenerationTransaction): RollbackResult;
/**
 * Generate a rollback confirmation message
 *
 * @param result - The rollback result
 * @returns Human-readable message describing the rollback
 */
declare function generateRollbackMessage(result: RollbackResult): string;

/**
 * Import Meta Usage Validation Rule
 * T053: Implement import-meta-usage rule (FR-022)
 *
 * Detects usage of import.meta in CommonJS environments where it would cause runtime errors.
 *
 * @module @artk/core/validation/rules/import-meta-usage
 */

/**
 * Import Meta Usage Rule
 *
 * Detects import.meta usage in CommonJS environments
 */
declare class ImportMetaUsageRule implements ValidationRule {
    config: ValidationRuleConfig;
    /**
     * Validate a file for import.meta usage
     */
    validate(filePath: string, content: string, moduleSystem: 'commonjs' | 'esm'): ValidationIssue[];
}
/**
 * Create a new ImportMetaUsageRule instance
 */
declare function createImportMetaUsageRule(): ImportMetaUsageRule;

/**
 * Dirname Usage Validation Rule
 * T054: Implement dirname-usage rule (FR-022)
 *
 * Detects usage of __dirname and __filename in ESM environments where they are not available.
 *
 * @module @artk/core/validation/rules/dirname-usage
 */

/**
 * Dirname Usage Rule
 *
 * Detects __dirname and __filename usage in ESM environments
 */
declare class DirnameUsageRule implements ValidationRule {
    config: ValidationRuleConfig;
    /**
     * Validate a file for __dirname/__filename usage
     */
    validate(filePath: string, content: string, moduleSystem: 'commonjs' | 'esm'): ValidationIssue[];
}
/**
 * Create a new DirnameUsageRule instance
 */
declare function createDirnameUsageRule(): DirnameUsageRule;

/**
 * Import Paths Validation Rule
 * T055: Implement import-paths rule (FR-023)
 *
 * Validates import paths have correct extensions for the module system.
 * ESM requires explicit .js extensions for relative imports.
 *
 * @module @artk/core/validation/rules/import-paths
 */

/**
 * Import Paths Rule
 *
 * Validates import paths have correct extensions for the module system
 */
declare class ImportPathsRule implements ValidationRule {
    config: ValidationRuleConfig;
    /**
     * Validate a file for import path issues
     */
    validate(filePath: string, content: string, moduleSystem: 'commonjs' | 'esm'): ValidationIssue[];
}
/**
 * Create a new ImportPathsRule instance
 */
declare function createImportPathsRule(): ImportPathsRule;

/**
 * Dependency Compatibility Validation Rule
 * T056: Implement dependency-compat rule (FR-024, FR-025)
 *
 * Checks that project dependencies are compatible with the detected module system.
 * Detects ESM-only packages (like nanoid v5+) in CommonJS environments.
 *
 * @module @artk/core/validation/rules/dependency-compat
 */

/**
 * Dependency Compatibility Rule
 *
 * Detects ESM-only packages in CommonJS environments
 */
declare class DependencyCompatRule implements ValidationRule {
    config: ValidationRuleConfig;
    /**
     * Get list of known ESM-only packages
     */
    getEsmOnlyPackages(): string[];
    /**
     * Get version constraints for ESM-only packages
     */
    getEsmOnlyConstraints(): Record<string, string>;
    /**
     * Validate a file for ESM-only package imports
     */
    validate(filePath: string, content: string, moduleSystem: 'commonjs' | 'esm'): ValidationIssue[];
    /**
     * Validate dependencies in package.json
     */
    validateDependencies(projectDir: string, moduleSystem: 'commonjs' | 'esm'): ValidationIssue[];
    /**
     * Get line number for a position in content
     */
    private getLineNumber;
}
/**
 * Create a new DependencyCompatRule instance
 */
declare function createDependencyCompatRule(): DependencyCompatRule;

/**
 * Validation Rules Index
 *
 * Exports all validation rules for the foundation validation gate.
 *
 * @module @artk/core/validation/rules
 */

/**
 * Get all built-in validation rules
 */
declare function getAllRules(): (ImportMetaUsageRule | DirnameUsageRule | ImportPathsRule | DependencyCompatRule)[];

export { DependencyCompatRule, DirnameUsageRule, GenerationTransaction, ImportMetaUsageRule, ImportPathsRule, RollbackResult, type RunnerOptions, ValidationIssue, ValidationOptions, ValidationResult, ValidationRule, ValidationRuleConfig, ValidationRunner, commitTransaction, createDependencyCompatRule, createDirnameUsageRule, createImportMetaUsageRule, createImportPathsRule, generateRollbackMessage, getAllRules, rollbackTransaction, startTransaction, trackGeneratedFile, trackOriginalFile, validateFoundation };
