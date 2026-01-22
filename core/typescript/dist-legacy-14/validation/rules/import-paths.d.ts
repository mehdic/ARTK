/**
 * Import Paths Validation Rule
 * T055: Implement import-paths rule (FR-023)
 *
 * Validates import paths have correct extensions for the module system.
 * ESM requires explicit .js extensions for relative imports.
 *
 * @module @artk/core/validation/rules/import-paths
 */
import type { ValidationRule, ValidationRuleConfig, ValidationIssue } from '../types.js';
/**
 * Import Paths Rule
 *
 * Validates import paths have correct extensions for the module system
 */
export declare class ImportPathsRule implements ValidationRule {
    config: ValidationRuleConfig;
    /**
     * Validate a file for import path issues
     */
    validate(filePath: string, content: string, moduleSystem: 'commonjs' | 'esm'): ValidationIssue[];
}
/**
 * Create a new ImportPathsRule instance
 */
export declare function createImportPathsRule(): ImportPathsRule;
//# sourceMappingURL=import-paths.d.ts.map