/**
 * Dirname Usage Validation Rule
 * T054: Implement dirname-usage rule (FR-022)
 *
 * Detects usage of __dirname and __filename in ESM environments where they are not available.
 *
 * @module @artk/core/validation/rules/dirname-usage
 */
import type { ValidationRule, ValidationRuleConfig, ValidationIssue } from '../types.js';
/**
 * Dirname Usage Rule
 *
 * Detects __dirname and __filename usage in ESM environments
 */
export declare class DirnameUsageRule implements ValidationRule {
    config: ValidationRuleConfig;
    /**
     * Validate a file for __dirname/__filename usage
     */
    validate(filePath: string, content: string, moduleSystem: 'commonjs' | 'esm'): ValidationIssue[];
}
/**
 * Create a new DirnameUsageRule instance
 */
export declare function createDirnameUsageRule(): DirnameUsageRule;
//# sourceMappingURL=dirname-usage.d.ts.map