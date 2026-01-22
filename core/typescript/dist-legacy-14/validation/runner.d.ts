/**
 * Validation Runner
 * T057-T066: Implement ValidationRunner with timeout, file tracking, rollback, persistence
 *
 * Orchestrates all validation rules and manages the validation lifecycle including
 * automatic rollback on failure and result persistence.
 *
 * @module @artk/core/validation/runner
 */
import type { ValidationResult, ValidationOptions } from '../types/validation-result.js';
/**
 * Runner options
 */
export interface RunnerOptions {
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
export declare class ValidationRunner {
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
export declare function validateFoundation(options: ValidationOptions): Promise<ValidationResult>;
//# sourceMappingURL=runner.d.ts.map