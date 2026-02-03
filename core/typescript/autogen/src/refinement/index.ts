/**
 * @module refinement
 * @description Self-Refinement strategy for iterative test fixing
 */

// Types
export * from './types.js';

// Error Parser
export {
  parseError,
  parseErrors,
  parsePlaywrightReport,
  isSelectorRelated,
  isTimingRelated,
  isEnvironmentalError,
  isCodeError,
  getSuggestedFixTypes,
  type ParseErrorOptions,
  type PlaywrightJsonReport,
} from './error-parser.js';

// Convergence Detection
export {
  CircuitBreaker,
  ConvergenceDetector,
  analyzeRefinementProgress,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  type RefinementAnalysis,
} from './convergence-detector.js';

// Refinement Loop
export {
  runRefinementLoop,
  runSingleRefinementAttempt,
  type RefinementLLMClient,
  type FixGenerationOptions,
  type FixGenerationResult,
  type TestRunner,
  type RefinementOptions,
  type RefinementProgress,
} from './refinement-loop.js';

// LLKB Learning
export {
  extractLessonsFromSession,
  aggregateLessons,
  calculateConfidenceAdjustment,
  applyConfidenceDecay,
  recommendLessons,
  type LLKBStorage,
  type LessonFilter,
  type LessonExtractionOptions,
  type AggregatedPattern,
  type ConfidenceAdjustment,
  type LessonRecommendation,
} from './llkb-learning.js';

// LLKB Storage (Refinement-specific persistence)
export {
  loadLlkbStore,
  saveLlkbStore,
  findLesson,
  findLessonsForContext,
  addLesson,
  recordSuccess,
  recordFailure,
  pruneLessons,
  learnFromRefinement,
  getSuggestedFixes,
  applyLearnedFix,
  exportLessonsForOrchestrator,
  getLlkbRefinementPath,
  type LlkbLesson,
  type LessonType,
  type LessonContext,
  type LessonFix,
  type LlkbStore,
  type LlkbStats,
} from './llkb-storage.js';

// Playwright Runner (Hybrid Agentic Architecture)
export {
  runPlaywright,
  runSingleTest,
  quickCheck,
  formatFailures,
  formatSummary,
  type PlaywrightRunOptions,
  type PlaywrightRunResult,
  type TestFailure,
  type ErrorType,
} from './playwright-runner.js';
