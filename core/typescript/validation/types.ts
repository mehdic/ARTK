/**
 * Validation Types
 * T052: Create ValidationRule interface
 *
 * Type definitions for the validation system.
 * Re-exports types from the main types module for convenience.
 *
 * @module @artk/core/validation/types
 */

// Re-export validation types from main types module
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
} from '../types/validation-result.js';
