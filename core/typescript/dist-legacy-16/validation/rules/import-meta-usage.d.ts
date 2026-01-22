/**
 * Import Meta Usage Validation Rule
 * T053: Implement import-meta-usage rule (FR-022)
 *
 * Detects usage of import.meta in CommonJS environments where it would cause runtime errors.
 *
 * @module @artk/core/validation/rules/import-meta-usage
 */
import type { ValidationRule, ValidationRuleConfig, ValidationIssue } from '../types.js';
/**
 * Import Meta Usage Rule
 *
 * Detects import.meta usage in CommonJS environments
 */
export declare class ImportMetaUsageRule implements ValidationRule {
    config: ValidationRuleConfig;
    /**
     * Validate a file for import.meta usage
     */
    validate(filePath: string, content: string, moduleSystem: 'commonjs' | 'esm'): ValidationIssue[];
}
/**
 * Create a new ImportMetaUsageRule instance
 */
export declare function createImportMetaUsageRule(): ImportMetaUsageRule;
//# sourceMappingURL=import-meta-usage.d.ts.map