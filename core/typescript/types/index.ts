/**
 * @module types
 * @description Shared types index for ARTK Core v1.
 *
 * This barrel export provides common types used across multiple modules
 * for the ARTK E2E independent architecture.
 *
 * @example
 * ```typescript
 * import {
 *   ArtkTarget,
 *   ArtkContext,
 *   ArtkConfig,
 *   ArtkAuthConfig,
 *   DetectionResult,
 *   SubmoduleStatus,
 *   // Zod schemas
 *   ArtkContextSchema,
 *   ArtkConfigSchema,
 *   validateArtkContext,
 *   validateArtkConfig
 * } from '@artk/core/types';
 * ```
 */

// Target types
export * from './target.js';

// Context types (inter-prompt communication)
// Explicit exports to avoid duplicates with schemas.js
export type {
  ArtkContext,
  PilotPhase,
  PilotContext,
  DetectedTarget,
  DiscoveryContext,
  JourneyStats,
  ArtkContextExtended,
} from './context.js';
export {
  CONTEXT_SCHEMA_VERSION,
  isArtkContext,
  MAX_TARGETS,
  MIN_TARGETS,
  PilotContextSchema,
  DetectedTargetSchema,
  DiscoveryContextSchema,
  JourneyStatsSchema,
  ArtkContextExtendedSchema,
  validateArtkContextExtended,
} from './context.js';

// Config types (artk.config.yml)
export * from './config.js';

// Auth types
export * from './auth.js';

// Detection types (frontend detection heuristics)
export * from './detection.js';

// Submodule types (git submodule state)
export * from './submodule.js';

// Zod schemas and validation helpers (canonical source)
// ArtkContextSchema, ArtkTargetSchema, validateArtkContext from here
export * from './schemas.js';

// Environment Context types (Foundation Module System Compatibility - US1)
export type {
  ModuleSystem,
  TemplateSource,
  DetectionConfidence,
  DetectionMethod,
  NodeVersionParsed,
  EnvironmentContext,
  DetectionOptions,
  DetectionResult as EnvDetectionResult,
} from './environment-context.js';

// Validation Result types (Foundation Module System Compatibility - US3)
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
} from './validation-result.js';
