/**
 * @module shared/types
 * @description Shared types used across all AutoGen enhancement strategies
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// RESULT TYPE (for error handling)
// ═══════════════════════════════════════════════════════════════════════════

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

// ═══════════════════════════════════════════════════════════════════════════
// LLM TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type LLMProvider =
  | 'openai'
  | 'anthropic'
  | 'azure'
  | 'bedrock'
  | 'ollama'
  | 'local'
  | 'none';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface LLMResponse<T> {
  data: T;
  tokenUsage: TokenUsage;
  latencyMs: number;
  retryCount: number;
}

export interface LLMError {
  type: 'TIMEOUT' | 'RATE_LIMIT' | 'API_ERROR' | 'INVALID_RESPONSE' | 'UNAVAILABLE';
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
  originalError?: Error;
}

// ═══════════════════════════════════════════════════════════════════════════
// COST TRACKING
// ═══════════════════════════════════════════════════════════════════════════

export interface CostLimits {
  perTestUsd: number;
  perSessionUsd: number;
  enabled: boolean;
}

export interface CostTrackerState {
  sessionCost: number;
  testCost: number;
  totalTokens: number;
  sessionStartedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE ORCHESTRATION PHASE (internal state machine)
// NOTE: This is different from PipelineState in pipeline/state.ts which is
// the persisted state file format for the CLI pipeline.
// ═══════════════════════════════════════════════════════════════════════════

export type OrchestrationPhase =
  | 'IDLE'
  | 'PARSING'
  | 'PLANNING'
  | 'GENERATING'
  | 'SCORING'
  | 'EXECUTING'
  | 'REFINING'
  | 'LEARNING'
  | 'DONE'
  | 'BLOCKED'
  | 'DEAD_END'
  | 'FAILED';

export interface PipelineContext {
  journeyId: string;
  state: OrchestrationPhase;
  scotEnabled: boolean;
  refinementEnabled: boolean;
  uncertaintyEnabled: boolean;
  generatedCode?: string;
  error?: PipelineError;
  startedAt: Date;
  completedAt?: Date;
  tokenUsage: TokenUsage;
}

export interface StateTransition {
  from: OrchestrationPhase;
  to: OrchestrationPhase;
  guard?: (_ctx: PipelineContext) => boolean;
  action?: (_ctx: PipelineContext) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE ERRORS & DEAD-END HANDLING
// ═══════════════════════════════════════════════════════════════════════════

export type PipelineErrorType =
  | 'SCOT_FAILED'
  | 'GENERATION_FAILED'
  | 'UNCERTAINTY_BLOCKED'
  | 'EXECUTION_FAILED'
  | 'REFINEMENT_EXHAUSTED'
  | 'LLM_UNAVAILABLE'
  | 'COST_LIMIT_EXCEEDED'
  | 'TIMEOUT'
  | 'DEAD_END';

export interface PipelineError {
  type: PipelineErrorType;
  message: string;
  stage: OrchestrationPhase;
  recoverable: boolean;
  suggestedAction: 'manual_review' | 'journey_revision' | 'retry' | 'abort';
  diagnostics: PipelineDiagnostics;
}

export interface PipelineDiagnostics {
  journeyId: string;
  scotConfidence?: number;
  uncertaintyScore?: number;
  refinementAttempts?: number;
  lastError?: string;
  tokenUsage?: TokenUsage;
  durationMs?: number;
}

export interface DeadEndResult {
  status: 'dead_end';
  error: PipelineError;
  partialCode?: string;
  report: DeadEndReport;
}

export interface DeadEndReport {
  journeyId: string;
  blockedAt: OrchestrationPhase;
  reasons: string[];
  scotDiagnostics?: {
    confidence: number;
    warnings: string[];
    fallbackUsed: boolean;
  };
  uncertaintyDiagnostics?: {
    overallScore: number;
    blockedDimensions: string[];
    lowestDimension: { name: string; score: number };
  };
  refinementDiagnostics?: {
    attempts: number;
    lastError: string;
    convergenceFailure: boolean;
    sameErrorRepeated: boolean;
  };
  suggestedActions: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// LLKB ADAPTER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface LLKBPattern {
  id: string;
  category: string;
  pattern: string;
  confidence: number;
  usageCount: number;
  lastUsed: Date;
}

export interface LLKBLesson {
  id: string;
  category: string;
  content: string;
  confidence: number;
  generalizability: number;
  sourceType: 'refinement' | 'manual' | 'extraction';
  createdAt: Date;
}

export interface SuccessfulFix {
  journeyId: string;
  errorCategory: string;
  originalCode: string;
  fixedCode: string;
  fixDescription: string;
  refinementAttempts: number;
  generalizability: number;
}

export interface FailedAttempt {
  journeyId: string;
  errorCategory: string;
  attemptedFix: string;
  failureReason: string;
}

export interface LLKBAdapter {
  isAvailable(): boolean;
  findPattern(_action: string): Promise<LLKBPattern | null>;
  findSimilarFixes(_errorCategory: string, _context: string): Promise<LLKBPattern[]>;
  calculatePatternCoverage(_code: string): Promise<number>;
  recordSuccessfulFix(_fix: SuccessfulFix): Promise<void>;
  recordFailedAttempt(_attempt: FailedAttempt): Promise<void>;
  recordLesson(_lesson: Omit<LLKBLesson, 'id' | 'createdAt'>): Promise<string>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

export const LLMProviderSchema = z.enum([
  'openai',
  'anthropic',
  'azure',
  'bedrock',
  'ollama',
  'local',
  'none',
]);

export const LLMConfigSchema = z.object({
  provider: LLMProviderSchema.default('none'),
  model: z.string().default(''),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().min(100).max(32000).default(2000),
  timeoutMs: z.number().min(1000).max(300000).default(30000),
  maxRetries: z.number().min(0).max(5).default(2),
  retryDelayMs: z.number().min(100).max(10000).default(1000),
});

export const CostLimitsSchema = z.object({
  perTestUsd: z.number().min(0.01).max(10).default(0.10),
  perSessionUsd: z.number().min(0.10).max(100).default(5.00),
  enabled: z.boolean().default(true),
});

export const TokenUsageSchema = z.object({
  promptTokens: z.number().default(0),
  completionTokens: z.number().default(0),
  totalTokens: z.number().default(0),
  estimatedCostUsd: z.number().default(0),
});
