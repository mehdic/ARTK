/**
 * Dependency Compatibility Validation Rule
 * T056: Implement dependency-compat rule (FR-024, FR-025)
 *
 * Checks that project dependencies are compatible with the detected module system.
 * Detects ESM-only packages (like nanoid v5+) in CommonJS environments.
 *
 * @module @artk/core/validation/rules/dependency-compat
 */
import type { ValidationRule, ValidationRuleConfig, ValidationIssue } from '../types.js';
/**
 * Dependency Compatibility Rule
 *
 * Detects ESM-only packages in CommonJS environments
 */
export declare class DependencyCompatRule implements ValidationRule {
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
export declare function createDependencyCompatRule(): DependencyCompatRule;
//# sourceMappingURL=dependency-compat.d.ts.map