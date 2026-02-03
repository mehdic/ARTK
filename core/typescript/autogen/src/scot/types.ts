/**
 * @module scot/types
 * @description Type definitions for Structured Chain-of-Thought (SCoT) planning
 */

import { TokenUsage, LLMConfig } from '../shared/types.js';

// ═══════════════════════════════════════════════════════════════════════════
// ATOMIC STEP
// ═══════════════════════════════════════════════════════════════════════════

export interface SCoTAtomicStep {
  /** The action to perform (e.g., 'click', 'fill', 'navigate', 'assert') */
  action: string;
  /** The target element or URL */
  target?: string;
  /** The value to input (for fill actions) */
  value?: string;
  /** An assertion to verify after the action */
  assertion?: string;
  /** Optional timeout override in milliseconds */
  timeoutMs?: number;
  /** Whether this step is optional (won't fail the test if it fails) */
  optional?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONDITION
// ═══════════════════════════════════════════════════════════════════════════

export type ConditionState = 'visible' | 'hidden' | 'enabled' | 'disabled' | 'exists' | 'checked' | 'unchecked';

export interface SCoTCondition {
  /** The element to check (selector or description) */
  element?: string;
  /** The state to check for */
  state: ConditionState;
  /** Whether to negate the condition (NOT visible, etc.) */
  negate?: boolean;
  /** Alternative: a custom JavaScript expression to evaluate */
  expression?: string;
  /** Timeout for waiting on the condition */
  timeoutMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ITERATOR
// ═══════════════════════════════════════════════════════════════════════════

export interface SCoTIterator {
  /** The variable name for each iteration */
  variable: string;
  /** The collection to iterate over (selector or data source) */
  collection: string;
  /** Maximum iterations to prevent infinite loops */
  maxIterations?: number;
  /** Whether to continue on error (vs fail fast) */
  continueOnError?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type SCoTStructureType = 'sequential' | 'branch' | 'loop';

export interface SCoTSequential {
  type: 'sequential';
  description: string;
  steps: SCoTAtomicStep[];
}

export interface SCoTBranch {
  type: 'branch';
  description: string;
  condition: SCoTCondition;
  thenBranch: SCoTAtomicStep[];
  elseBranch?: SCoTAtomicStep[];
}

export interface SCoTLoop {
  type: 'loop';
  description: string;
  iterator: SCoTIterator;
  body: SCoTAtomicStep[];
  maxIterations?: number;
}

/** Union type for all structure types */
export type SCoTStructure = SCoTSequential | SCoTBranch | SCoTLoop;

// ═══════════════════════════════════════════════════════════════════════════
// PLAN
// ═══════════════════════════════════════════════════════════════════════════

export interface SCoTPlan {
  journeyId: string;
  structures: SCoTStructure[];
  reasoning: string;
  confidence: number;
  warnings: string[];
  metadata: SCoTPlanMetadata;
}

export interface SCoTPlanMetadata {
  generatedAt: Date;
  llmModel: string;
  tokenUsage: TokenUsage;
  parseAttempts: number;
  parsingMethod: 'json' | 'text';
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export interface SCoTConfig {
  enabled: boolean;
  minConfidence: number;
  maxStructures: number;
  includeReasoningComments: boolean;
  llm: LLMConfig;
  fallback: 'pattern-only' | 'error';
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type SCoTPlanResult =
  | { success: true; plan: SCoTPlan }
  | { success: false; error: SCoTPlanError; fallbackUsed: boolean };

export type SCoTPlanErrorType =
  | 'LLM_ERROR'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'LOW_CONFIDENCE'
  | 'TIMEOUT'
  | 'COST_LIMIT';

export interface SCoTPlanError {
  type: SCoTPlanErrorType;
  message: string;
  details?: unknown;
  tokenUsage?: TokenUsage;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export interface SCoTValidationResult {
  valid: boolean;
  errors: SCoTValidationError[];
  warnings: string[];
}

export interface SCoTValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════

export function isSequential(structure: SCoTStructure): structure is SCoTSequential {
  return structure.type === 'sequential';
}

export function isBranch(structure: SCoTStructure): structure is SCoTBranch {
  return structure.type === 'branch';
}

export function isLoop(structure: SCoTStructure): structure is SCoTLoop {
  return structure.type === 'loop';
}
