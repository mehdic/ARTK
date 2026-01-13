/**
 * Validation Runner
 * T057-T066: Implement ValidationRunner with timeout, file tracking, rollback, persistence
 *
 * Orchestrates all validation rules and manages the validation lifecycle including
 * automatic rollback on failure and result persistence.
 *
 * @module @artk/core/validation/runner
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getAllRules,
  ImportMetaUsageRule,
  DirnameUsageRule,
  ImportPathsRule,
  DependencyCompatRule,
} from './rules/index.js';
import {
  startTransaction,
  trackGeneratedFile as trackGenerated,
  trackOriginalFile as trackOriginal,
  commitTransaction,
  rollbackTransaction,
  generateRollbackMessage,
} from './rollback.js';
import type {
  ValidationResult,
  ValidationOptions,
  ValidationIssue,
  ValidationRuleResult,
  ValidationRule,
  StrictnessLevel,
  ValidationRuleId,
  GenerationTransaction,
} from '../types/validation-result.js';

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
 * Default timeout for validation (10 seconds per FR-029)
 */
const DEFAULT_TIMEOUT = 10000;

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
export class ValidationRunner {
  private timeout: number;
  private outputDir: string;
  private transaction: GenerationTransaction;
  private rules: ValidationRule[];

  /**
   * Create a new ValidationRunner
   */
  constructor(options: RunnerOptions = {}) {
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.outputDir = options.outputDir ?? process.cwd();
    this.transaction = startTransaction();
    this.rules = getAllRules();
  }

  /**
   * Get the configured timeout
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * Track a newly generated file
   */
  trackGeneratedFile(filePath: string): void {
    trackGenerated(this.transaction, filePath);
  }

  /**
   * Track an existing file before modification
   */
  trackOriginalFile(filePath: string): string | null {
    return trackOriginal(this.transaction, filePath);
  }

  /**
   * Run validation on the specified files
   */
  async validate(options: ValidationOptions): Promise<ValidationResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Handle skip validation
    if (options.skipValidation) {
      return {
        timestamp,
        environmentContext: options.environmentContext,
        executionTime: Date.now() - startTime,
        status: 'passed',
        rules: [],
        errors: [],
        warnings: [],
        validatedFiles: options.files,
        rollbackPerformed: false,
        rollbackSuccess: null,
      };
    }

    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const ruleResults: ValidationRuleResult[] = [];
    const validatedFiles: string[] = [];

    // Get strictness settings
    const strictness = options.strictness || {};

    // Validate each file with timeout
    const validationPromise = this.validateFiles(
      options.files,
      options.environmentContext,
      strictness,
      errors,
      warnings,
      ruleResults,
      validatedFiles
    );

    // Apply timeout
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Validation timeout')), this.timeout);
    });

    try {
      await Promise.race([validationPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message === 'Validation timeout') {
        warnings.push({
          file: '',
          line: null,
          column: null,
          severity: 'warning',
          ruleId: 'timeout',
          message: `Validation timed out after ${this.timeout}ms`,
          suggestedFix: 'Consider increasing timeout or validating fewer files',
        });
      }
    }

    // Determine status
    let status: 'passed' | 'failed' | 'warnings' = 'passed';
    if (errors.length > 0) {
      status = 'failed';
    } else if (warnings.length > 0) {
      status = 'warnings';
    }

    // Handle rollback on failure
    let rollbackPerformed = false;
    let rollbackSuccess: boolean | null = null;

    if (
      status === 'failed' &&
      (this.transaction.generatedFiles.length > 0 ||
        this.transaction.originalFiles.size > 0)
    ) {
      const rollbackResult = rollbackTransaction(this.transaction);
      rollbackPerformed = true;
      rollbackSuccess = rollbackResult.success;

      // Log rollback message
      const message = generateRollbackMessage(rollbackResult);
      console.log(message);
    } else if (status === 'passed' || status === 'warnings') {
      // Commit transaction on success
      commitTransaction(this.transaction);
    }

    // Reset transaction for next use
    this.transaction = startTransaction();

    const result: ValidationResult = {
      timestamp,
      environmentContext: options.environmentContext,
      executionTime: Date.now() - startTime,
      status,
      rules: ruleResults,
      errors,
      warnings,
      validatedFiles,
      rollbackPerformed,
      rollbackSuccess,
    };

    // Persist results
    await this.persistResult(result);

    return result;
  }

  /**
   * Validate files using all rules
   */
  private async validateFiles(
    files: string[],
    moduleSystem: string,
    strictness: Partial<Record<ValidationRuleId, StrictnessLevel>>,
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
    ruleResults: ValidationRuleResult[],
    validatedFiles: string[]
  ): Promise<void> {
    const affectedFilesByRule = new Map<string, Set<string>>();

    for (const rule of this.rules) {
      affectedFilesByRule.set(rule.config.id, new Set());
    }

    for (const filePath of files) {
      // Skip non-existent files
      if (!fs.existsSync(filePath)) {
        continue;
      }

      validatedFiles.push(filePath);

      let content: string;
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }

      // Run each rule
      for (const rule of this.rules) {
        const ruleStrictness =
          strictness[rule.config.id as ValidationRuleId] ||
          rule.config.defaultStrictness;

        // Skip ignored rules
        if (ruleStrictness === 'ignore') {
          continue;
        }

        const issues = rule.validate(
          filePath,
          content,
          moduleSystem as 'commonjs' | 'esm'
        );

        for (const issue of issues) {
          // Track affected files
          affectedFilesByRule.get(rule.config.id)?.add(filePath);

          // Apply strictness
          if (ruleStrictness === 'warning') {
            warnings.push({ ...issue, severity: 'warning' });
          } else {
            if (issue.severity === 'error') {
              errors.push(issue);
            } else {
              warnings.push(issue);
            }
          }
        }
      }
    }

    // Generate rule results
    for (const rule of this.rules) {
      const affectedFiles = Array.from(
        affectedFilesByRule.get(rule.config.id) || []
      );
      const pass = affectedFiles.length === 0;

      ruleResults.push({
        ruleId: rule.config.id,
        pass,
        affectedFiles,
        message: pass
          ? `${rule.config.name}: No issues found`
          : `${rule.config.name}: Found issues in ${affectedFiles.length} file(s)`,
      });
    }
  }

  /**
   * Persist validation result to .artk/validation-results.json
   */
  private async persistResult(result: ValidationResult): Promise<void> {
    const artkDir = path.join(this.outputDir, '.artk');
    const resultsPath = path.join(artkDir, 'validation-results.json');

    // Ensure .artk directory exists
    if (!fs.existsSync(artkDir)) {
      fs.mkdirSync(artkDir, { recursive: true });
    }

    // Load existing results or start fresh
    let results: ValidationResult[] = [];
    if (fs.existsSync(resultsPath)) {
      try {
        const content = fs.readFileSync(resultsPath, 'utf8');
        results = JSON.parse(content);
        if (!Array.isArray(results)) {
          results = [];
        }
      } catch {
        results = [];
      }
    }

    // Append new result
    results.push(result);

    // Write back
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  }
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
export async function validateFoundation(
  options: ValidationOptions
): Promise<ValidationResult> {
  const runner = new ValidationRunner();
  return runner.validate(options);
}
