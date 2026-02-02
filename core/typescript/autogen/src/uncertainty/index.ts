/**
 * @module uncertainty
 * @description Uncertainty Quantification strategy for confidence scoring
 */

// Types
export * from './types.js';

// Syntax Validator
export {
  validateSyntax,
  createSyntaxDimensionScore,
  quickSyntaxCheck,
  getDeprecatedAPIs,
} from './syntax-validator.js';

// Pattern Matcher
export {
  matchPatterns,
  createPatternDimensionScore,
  getPatternCategories,
  hasMinimumPatterns,
  getBuiltinPatterns,
  type PatternDefinition,
  type PatternCategory,
  type PatternMatcherOptions,
} from './pattern-matcher.js';

// Selector Analyzer
export {
  analyzeSelectors,
  createSelectorDimensionScore,
  usesRecommendedSelectors,
  identifyStrategy,
  isSelectorFragile,
} from './selector-analyzer.js';

// Confidence Scorer
export {
  calculateConfidence,
  calculateConfidenceWithSamples,
  quickConfidenceCheck,
  passesMinimumConfidence,
  getBlockingIssues,
  type UncertaintyLLMClient,
  type ScorerOptions,
} from './confidence-scorer.js';

// Multi-Sampler (Hybrid Agentic Architecture)
export {
  generateMultipleSamples,
  analyzeAgreement,
  loadSamples,
  createOrchestratorSampleRequest,
  processOrchestratorSamples,
  DEFAULT_MULTI_SAMPLER_CONFIG,
  type MultiSamplerConfig,
  type MultiSampleRequest,
  type MultiSampleResult,
  type CodeGenerator,
  type OrchestratorSampleRequest,
} from './multi-sampler.js';
