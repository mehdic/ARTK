/**
 * Zod schemas for @artk/core
 *
 * Provides runtime validation for configuration and result objects.
 *
 * @module @artk/core/schemas
 */

// Environment Context Schemas
export {
  ModuleSystemSchema,
  TemplateSourceSchema,
  DetectionConfidenceSchema,
  DetectionMethodSchema,
  NodeVersionParsedSchema,
  EnvironmentContextSchema,
  DetectionOptionsSchema,
  DetectionResultSchema,
  validateEnvironmentContext,
  safeValidateEnvironmentContext,
} from './environment-context.schema.js';

export type {
  ModuleSystemType,
  TemplateSourceType,
  DetectionConfidenceType,
  DetectionMethodType,
  NodeVersionParsedType,
  EnvironmentContextType,
  DetectionOptionsType,
  DetectionResultType,
} from './environment-context.schema.js';

// Validation Result Schemas
export {
  ValidationSeveritySchema,
  ValidationStatusSchema,
  StrictnessLevelSchema,
  ValidationRuleIdSchema,
  ValidationIssueSchema,
  ValidationRuleResultSchema,
  ValidationResultSchema,
  ValidationOptionsSchema,
  ValidationRuleConfigSchema,
  RollbackResultSchema,
  validateValidationResult,
  safeValidateValidationResult,
  validateValidationIssue,
  validateRollbackResult,
} from './validation-result.schema.js';

export type {
  ValidationSeverityType,
  ValidationStatusType,
  StrictnessLevelType,
  ValidationRuleIdType,
  ValidationIssueType,
  ValidationRuleResultType,
  ValidationResultType,
  ValidationOptionsType,
  ValidationRuleConfigType,
  RollbackResultType,
} from './validation-result.schema.js';
