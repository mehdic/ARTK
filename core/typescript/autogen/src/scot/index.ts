/**
 * @module scot
 * @description Structured Chain-of-Thought (SCoT) planning for Playwright test generation
 */

// Types
export * from './types.js';

// Parser
export { parseSCoTPlan, type SCoTParseError } from './parser.js';

// Validator
export {
  validateSCoTPlan,
  quickValidateConfidence,
  getValidationSummary,
} from './validator.js';

// Planner
export {
  generateSCoTPlan,
  extractCodeContext,
  // Orchestrator mode (Hybrid Agentic Architecture)
  generateSCoTPrompts,
  processSCoTPlanFromJSON,
  type LLMClient,
  type LLMGenerateOptions,
  type LLMGenerateResult,
  type JourneyInput,
  type JourneyStep,
  type PlannerOptions,
  type PlannerMode,
  type OrchestratorPromptOutput,
  type CodeContext,
} from './planner.js';

// Prompts
export {
  SCOT_SYSTEM_PROMPT,
  createUserPrompt,
  createErrorCorrectionPrompt,
  FEW_SHOT_EXAMPLES,
} from './prompts.js';
