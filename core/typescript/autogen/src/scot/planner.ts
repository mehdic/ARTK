/**
 * @module scot/planner
 * @description Main SCoT planning module - generates structured plans from journeys
 */

import { TokenUsage } from '../shared/types.js';
import { CostTracker } from '../shared/cost-tracker.js';
import { SCoTConfig } from '../shared/config-validator.js';
import {
  SCoTPlan,
  SCoTPlanResult,
  
} from './types.js';
import { parseSCoTPlan } from './parser.js';
import { validateSCoTPlan } from './validator.js';
import { SCOT_SYSTEM_PROMPT, createUserPrompt } from './prompts.js';

// ═══════════════════════════════════════════════════════════════════════════
// LLM CLIENT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface LLMClient {
  generate(_prompt: string, _systemPrompt: string, _options: LLMGenerateOptions): Promise<LLMGenerateResult>;
}

export interface LLMGenerateOptions {
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

export interface LLMGenerateResult {
  content: string;
  tokenUsage: TokenUsage;
  model: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNEY INPUT
// ═══════════════════════════════════════════════════════════════════════════

export interface JourneyInput {
  id: string;
  title: string;
  description?: string;
  steps: JourneyStep[];
  acceptanceCriteria?: string[];
  tier?: 'smoke' | 'release' | 'regression';
  rawMarkdown?: string;
}

export interface JourneyStep {
  number: number;
  text: string;
  substeps?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANNER OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export type PlannerMode = 'direct' | 'orchestrator';

export interface PlannerOptions {
  config: SCoTConfig;
  /** LLM client - required for 'direct' mode, optional for 'orchestrator' mode */
  llmClient?: LLMClient;
  costTracker?: CostTracker;
  /** Planning mode: 'direct' calls LLM API, 'orchestrator' outputs prompts for external LLM */
  mode?: PlannerMode;
}

/**
 * Output for orchestrator mode - the LLM prompt to send to the orchestrating LLM
 */
export interface OrchestratorPromptOutput {
  /** System prompt for the LLM */
  systemPrompt: string;
  /** User prompt with journey context */
  userPrompt: string;
  /** Expected response format description */
  expectedFormat: string;
  /** Journey ID for tracking */
  journeyId: string;
  /** Function to parse the LLM response */
  parseResponse: (_response: string) => Promise<SCoTPlanResult>;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PLANNER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a SCoT plan from a journey
 *
 * Supports two modes:
 * - 'direct': Calls LLM API directly (requires llmClient)
 * - 'orchestrator': Returns prompts for the orchestrating LLM (hybrid agentic pattern)
 */
export async function generateSCoTPlan(
  journey: JourneyInput,
  options: PlannerOptions
): Promise<SCoTPlanResult> {
  const { config, llmClient, costTracker, mode = 'direct' } = options;

  // Check if SCoT is enabled
  if (!config.enabled) {
    return {
      success: false,
      error: {
        type: 'LLM_ERROR',
        message: 'SCoT is disabled in configuration',
      },
      fallbackUsed: true,
    };
  }

  // For orchestrator mode, we generate prompts instead of calling LLM
  if (mode === 'orchestrator') {
    // Return a partial result that indicates prompts are needed
    return {
      success: false,
      error: {
        type: 'LLM_ERROR',
        message: 'Orchestrator mode requires using generateSCoTPrompts() instead',
      },
      fallbackUsed: false,
    };
  }

  // Direct mode requires LLM client
  if (!llmClient) {
    return {
      success: false,
      error: {
        type: 'LLM_ERROR',
        message: 'LLM client is required for direct mode',
      },
      fallbackUsed: config.fallback === 'pattern-only',
    };
  }

  // Check cost limits
  if (costTracker?.wouldExceedLimit(2000)) {
    return {
      success: false,
      error: {
        type: 'COST_LIMIT',
        message: 'Cost limit would be exceeded',
      },
      fallbackUsed: config.fallback === 'pattern-only',
    };
  }

  try {
    // Generate the user prompt
    const userPrompt = createUserPrompt(journey);

    // Call LLM
    const llmResult = await llmClient.generate(userPrompt, SCOT_SYSTEM_PROMPT, {
      temperature: config.llm.temperature,
      maxTokens: config.llm.maxTokens,
      timeoutMs: config.llm.timeoutMs,
    });

    // Track cost
    if (costTracker) {
      costTracker.trackUsage(llmResult.tokenUsage);
    }

    // Parse the response
    const parseResult = await parseSCoTPlan(llmResult.content, {
      journeyId: journey.id,
      llmModel: llmResult.model,
      maxRetries: config.llm.maxRetries,
    });

    if (!parseResult.ok) {
      return {
        success: false,
        error: {
          type: 'PARSE_ERROR',
          message: parseResult.error.message,
          details: parseResult.error,
          tokenUsage: llmResult.tokenUsage,
        },
        fallbackUsed: config.fallback === 'pattern-only',
      };
    }

    const plan = parseResult.value;

    // Update token usage in metadata
    plan.metadata.tokenUsage = llmResult.tokenUsage;
    plan.metadata.llmModel = llmResult.model;

    // Validate the plan
    const validationResult = validateSCoTPlan(plan, config);

    if (!validationResult.valid) {
      const criticalErrors = validationResult.errors.filter(e => e.severity === 'error');
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: criticalErrors.map(e => e.message).join('; '),
          details: validationResult,
          tokenUsage: llmResult.tokenUsage,
        },
        fallbackUsed: config.fallback === 'pattern-only',
      };
    }

    // Check confidence threshold
    if (plan.confidence < config.minConfidence) {
      return {
        success: false,
        error: {
          type: 'LOW_CONFIDENCE',
          message: `Plan confidence ${plan.confidence.toFixed(2)} is below threshold ${config.minConfidence}`,
          tokenUsage: llmResult.tokenUsage,
        },
        fallbackUsed: config.fallback === 'pattern-only',
      };
    }

    return {
      success: true,
      plan,
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = message.toLowerCase().includes('timeout');

    return {
      success: false,
      error: {
        type: isTimeout ? 'TIMEOUT' : 'LLM_ERROR',
        message,
        details: error,
      },
      fallbackUsed: config.fallback === 'pattern-only',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAN TO CODE CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

export interface CodeContext {
  reasoning: string;
  structureComments: string[];
  hasConditionals: boolean;
  hasLoops: boolean;
  estimatedSteps: number;
}

export function extractCodeContext(plan: SCoTPlan, includeReasoning: boolean): CodeContext {
  const structureComments: string[] = [];
  let hasConditionals = false;
  let hasLoops = false;
  let estimatedSteps = 0;

  for (const structure of plan.structures) {
    if (structure.type === 'sequential') {
      structureComments.push(`// SEQUENTIAL: ${structure.description}`);
      estimatedSteps += structure.steps.length;
    } else if (structure.type === 'branch') {
      structureComments.push(`// BRANCH: ${structure.description}`);
      hasConditionals = true;
      estimatedSteps += structure.thenBranch.length;
      if (structure.elseBranch) {
        estimatedSteps += structure.elseBranch.length;
      }
    } else if (structure.type === 'loop') {
      structureComments.push(`// LOOP: ${structure.description}`);
      hasLoops = true;
      estimatedSteps += structure.body.length * (structure.maxIterations ?? 3);
    }
  }

  return {
    reasoning: includeReasoning ? plan.reasoning : '',
    structureComments,
    hasConditionals,
    hasLoops,
    estimatedSteps,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR MODE (Hybrid Agentic Architecture)
// ═══════════════════════════════════════════════════════════════════════════

const SCOT_EXPECTED_FORMAT = `
The response should be a JSON object with:
- reasoning: string explaining the test structure approach
- structures: array of test structures (sequential, branch, loop)
- stepMappings: array mapping journey steps to test actions
- confidence: number 0.0-1.0 for overall plan confidence
- metadata: object with journeyId, generatedAt

Each structure has:
- type: "sequential" | "branch" | "loop"
- description: string explaining the structure
- steps/thenBranch/elseBranch/body: arrays of step references
- condition (for branch/loop): string describing the condition
`;

/**
 * Generate prompts for the orchestrating LLM (Hybrid Agentic Pattern)
 *
 * Instead of calling an LLM directly, this returns the prompts that the
 * orchestrating LLM (Copilot/Claude Code) should use to generate the plan.
 *
 * @example
 * ```typescript
 * const prompts = generateSCoTPrompts(journey, { config });
 *
 * // The orchestrating LLM generates a response
 * const llmResponse = await orchestratorLLM.generate(prompts.userPrompt);
 *
 * // Parse the response
 * const result = await prompts.parseResponse(llmResponse);
 * ```
 */
export function generateSCoTPrompts(
  journey: JourneyInput,
  config: SCoTConfig
): OrchestratorPromptOutput {
  const userPrompt = createUserPrompt(journey);

  return {
    systemPrompt: SCOT_SYSTEM_PROMPT,
    userPrompt,
    expectedFormat: SCOT_EXPECTED_FORMAT,
    journeyId: journey.id,
    parseResponse: async (response: string): Promise<SCoTPlanResult> => {
      try {
        // Parse the response
        const parseResult = await parseSCoTPlan(response, {
          journeyId: journey.id,
          llmModel: 'orchestrator',
          maxRetries: config.llm.maxRetries,
        });

        if (!parseResult.ok) {
          return {
            success: false,
            error: {
              type: 'PARSE_ERROR',
              message: parseResult.error.message,
              details: parseResult.error,
            },
            fallbackUsed: config.fallback === 'pattern-only',
          };
        }

        const plan = parseResult.value;

        // Validate the plan
        const validationResult = validateSCoTPlan(plan, config);

        if (!validationResult.valid) {
          const criticalErrors = validationResult.errors.filter(e => e.severity === 'error');
          return {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: criticalErrors.map(e => e.message).join('; '),
              details: validationResult,
            },
            fallbackUsed: config.fallback === 'pattern-only',
          };
        }

        // Check confidence threshold
        if (plan.confidence < config.minConfidence) {
          return {
            success: false,
            error: {
              type: 'LOW_CONFIDENCE',
              message: `Plan confidence ${plan.confidence.toFixed(2)} is below threshold ${config.minConfidence}`,
            },
            fallbackUsed: config.fallback === 'pattern-only',
          };
        }

        return {
          success: true,
          plan,
        };

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          success: false,
          error: {
            type: 'PARSE_ERROR',
            message,
            details: error,
          },
          fallbackUsed: config.fallback === 'pattern-only',
        };
      }
    },
  };
}

/**
 * Process a plan from orchestrator-provided JSON
 *
 * For cases where the orchestrating LLM has already generated a plan
 * and we just need to parse and validate it.
 */
export async function processSCoTPlanFromJSON(
  planJson: string,
  journeyId: string,
  config: SCoTConfig
): Promise<SCoTPlanResult> {
  const prompts = generateSCoTPrompts({ id: journeyId, title: journeyId, steps: [] }, config);
  return prompts.parseResponse(planJson);
}
