/**
 * @module refinement/types
 * @description Type definitions for Self-Refinement strategy
 */

import { TokenUsage } from '../shared/types.js';

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

export type ErrorCategory =
  | 'SELECTOR_NOT_FOUND'
  | 'TIMEOUT'
  | 'ASSERTION_FAILED'
  | 'NAVIGATION_ERROR'
  | 'TYPE_ERROR'
  | 'RUNTIME_ERROR'
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'PERMISSION_ERROR'
  | 'SYNTAX_ERROR'
  | 'UNKNOWN';

export type ErrorSeverity = 'critical' | 'major' | 'minor' | 'warning';

// ═══════════════════════════════════════════════════════════════════════════
// ERROR ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

export interface ErrorLocation {
  file: string;
  line: number;
  column?: number;
  testName?: string;
  stepDescription?: string;
}

export interface ErrorAnalysis {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError: string;
  location?: ErrorLocation;
  selector?: string;
  expectedValue?: string;
  actualValue?: string;
  stackTrace?: string;
  timestamp: Date;

  // Fingerprint for detecting same errors
  fingerprint: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CODE FIX
// ═══════════════════════════════════════════════════════════════════════════

export type FixType =
  | 'SELECTOR_CHANGE'
  | 'WAIT_ADDED'
  | 'ASSERTION_MODIFIED'
  | 'FLOW_REORDERED'
  | 'ERROR_HANDLING_ADDED'
  | 'TIMEOUT_INCREASED'
  | 'RETRY_ADDED'
  | 'LOCATOR_STRATEGY_CHANGED'
  | 'FRAME_CONTEXT_ADDED'
  | 'OTHER';

export interface CodeFix {
  type: FixType;
  description: string;
  originalCode: string;
  fixedCode: string;
  location: ErrorLocation;
  confidence: number;
  reasoning?: string;
}

export interface FixAttempt {
  attemptNumber: number;
  timestamp: Date;
  error: ErrorAnalysis;
  proposedFixes: CodeFix[];
  appliedFix?: CodeFix;
  outcome: 'success' | 'failure' | 'partial' | 'skipped';
  newErrors?: ErrorAnalysis[];
  tokenUsage?: TokenUsage;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAYWRIGHT TEST RESULT
// ═══════════════════════════════════════════════════════════════════════════

export type TestStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';

export interface PlaywrightTestResult {
  testId: string;
  testName: string;
  testFile: string;
  status: TestStatus;
  duration: number;
  errors: ErrorAnalysis[];
  retries: number;
  stdout?: string;
  stderr?: string;
  attachments?: TestAttachment[];
}

export interface TestAttachment {
  name: string;
  contentType: string;
  path?: string;
  body?: Buffer;
}

// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════════════════

export interface CircuitBreakerConfig {
  /** Maximum refinement attempts before giving up */
  maxAttempts: number;

  /** Stop if same error fingerprint repeats this many times */
  sameErrorThreshold: number;

  /** Detect oscillation: A→B→A error pattern */
  oscillationDetection: boolean;

  /** Window size for oscillation detection */
  oscillationWindowSize: number;

  /** Maximum time for all refinement attempts (ms) */
  totalTimeoutMs: number;

  /** Time between refinement attempts (ms) - for rate limiting */
  cooldownMs: number;

  /** Maximum token budget for refinement */
  maxTokenBudget: number;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  openReason?: 'MAX_ATTEMPTS' | 'SAME_ERROR' | 'OSCILLATION' | 'TIMEOUT' | 'BUDGET_EXCEEDED';
  attemptCount: number;
  errorHistory: string[];
  startTime?: Date;
  tokensUsed: number;
  /** Max attempts config (for state restoration) */
  maxAttempts?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERGENCE
// ═══════════════════════════════════════════════════════════════════════════

export interface ConvergenceInfo {
  converged: boolean;
  attempts: number;
  errorCountHistory: number[];
  uniqueErrorsHistory: Set<string>[];
  lastImprovement?: number;
  stagnationCount: number;
  trend: 'improving' | 'stagnating' | 'degrading' | 'oscillating';
}

// ═══════════════════════════════════════════════════════════════════════════
// REFINEMENT SESSION
// ═══════════════════════════════════════════════════════════════════════════

export interface RefinementSession {
  sessionId: string;
  journeyId: string;
  testFile: string;
  startTime: Date;
  endTime?: Date;

  originalCode: string;
  currentCode: string;

  attempts: FixAttempt[];
  circuitBreakerState: CircuitBreakerState;
  convergenceInfo: ConvergenceInfo;

  finalStatus: RefinementStatus;
  totalTokenUsage: TokenUsage;
}

export type RefinementStatus =
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'MAX_ATTEMPTS_REACHED'
  | 'SAME_ERROR_LOOP'
  | 'OSCILLATION_DETECTED'
  | 'TIMEOUT'
  | 'BUDGET_EXCEEDED'
  | 'CANNOT_FIX'
  | 'ABORTED';

// ═══════════════════════════════════════════════════════════════════════════
// REFINEMENT RESULT
// ═══════════════════════════════════════════════════════════════════════════

export interface RefinementResult {
  success: boolean;
  session: RefinementSession;
  fixedCode?: string;
  remainingErrors: ErrorAnalysis[];
  appliedFixes: CodeFix[];

  /** Lessons learned for LLKB */
  lessonsLearned: LessonLearned[];

  /** Diagnostics for dead-end reporting */
  diagnostics: RefinementDiagnostics;
}

export interface RefinementDiagnostics {
  attempts: number;
  lastError: string;
  convergenceFailure: boolean;
  sameErrorRepeated: boolean;
  oscillationDetected: boolean;
  budgetExhausted: boolean;
  timedOut: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// LLKB LEARNING
// ═══════════════════════════════════════════════════════════════════════════

export interface LessonLearned {
  id: string;
  type: 'selector_pattern' | 'error_fix' | 'wait_strategy' | 'flow_pattern';
  context: {
    journeyId: string;
    errorCategory: ErrorCategory;
    originalSelector?: string;
    element?: string;
  };
  solution: {
    pattern: string;
    code: string;
    explanation: string;
  };
  confidence: number;
  createdAt: Date;
  verified: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// REFINEMENT CONFIG (imported from shared, re-exported for convenience)
// ═══════════════════════════════════════════════════════════════════════════

export type { RefinementConfig } from '../shared/config-validator.js';
