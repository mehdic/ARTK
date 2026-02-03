/**
 * @module shared
 * @description Shared infrastructure for AutoGen enhancement strategies
 */

// Types
export * from './types.js';

// LLM Response Parser
export {
  parseLLMResponse,
  extractJson,
  type ParseError,
  type ParseOptions,
  // Schemas
  SCoTPlanResponseSchema,
  ErrorAnalysisResponseSchema,
  CodeFixResponseSchema,
  SCoTAtomicStepSchema,
  SCoTConditionSchema,
  SCoTIteratorSchema,
  SCoTStructureSchema,
  SuggestedApproachSchema,
  CodeChangeSchema,
  // Types
  type SCoTPlanResponse,
  type ErrorAnalysisResponse,
  type CodeFixResponse,
  type SuggestedApproach,
} from './llm-response-parser.js';

// Config Validator
export {
  validateEnhancementConfig,
  checkLLMAvailability,
  // Schemas
  SCoTConfigSchema,
  RefinementConfigSchema,
  UncertaintyConfigSchema,
  CircuitBreakerConfigSchema,
  AutogenEnhancementConfigSchema,
  // Types
  type SCoTConfig,
  type RefinementConfig,
  type UncertaintyConfig,
  type CircuitBreakerConfig,
  type AutogenEnhancementConfig,
  type LLMAvailabilityResult,
  type ConfigValidationResult,
  type ConfigValidationError,
} from './config-validator.js';

// Cost Tracker
export {
  CostTracker,
  createCostTracker,
  estimateCost,
  estimateTokensFromText,
  type CostTrackerSummary,
} from './cost-tracker.js';

// Telemetry
export {
  Telemetry,
  getTelemetry,
  createTelemetry,
  resetGlobalTelemetry,
  type TelemetryEvent,
  type TelemetryData,
  type TelemetryConfig,
  type TelemetrySummary,
  type CommandStats,
} from './telemetry.js';
