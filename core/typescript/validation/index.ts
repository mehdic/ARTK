/**
 * Validation Engine for Foundation Modules
 * T066: Export validateFoundation() from validation module
 *
 * Pre-generation validation gate that checks for module system compatibility.
 * Auto-rollback on failure (FR-033).
 *
 * @module @artk/core/validation
 *
 * @example
 * ```typescript
 * import { validateFoundation } from '@artk/core/validation';
 *
 * const result = await validateFoundation({
 *   files: ['auth/login.ts', 'config/env.ts'],
 *   environmentContext: 'commonjs-node-18.12.1'
 * });
 *
 * if (result.status === 'failed') {
 *   console.error('Validation failed:', result.errors);
 *   // Rollback has already occurred
 * }
 * ```
 */

// Main exports
export { ValidationRunner, validateFoundation } from './runner.js';
export type { RunnerOptions } from './runner.js';

// Rollback functionality
export {
  startTransaction,
  trackGeneratedFile,
  trackOriginalFile,
  commitTransaction,
  rollbackTransaction,
  generateRollbackMessage,
} from './rollback.js';

// Validation rules
export {
  ImportMetaUsageRule,
  createImportMetaUsageRule,
  DirnameUsageRule,
  createDirnameUsageRule,
  ImportPathsRule,
  createImportPathsRule,
  DependencyCompatRule,
  createDependencyCompatRule,
  getAllRules,
} from './rules/index.js';

// Types (re-export for convenience)
export type {
  ValidationSeverity,
  ValidationStatus,
  StrictnessLevel,
  ValidationRuleId,
  ValidationIssue,
  ValidationRuleResult,
  ValidationResult,
  ValidationOptions,
  ValidationRuleConfig,
  ValidationRule,
  GenerationTransaction,
  RollbackResult,
} from './types.js';
