/**
 * @module refinement/refinement-loop
 * @description Main orchestrator for self-refinement of generated tests
 */

import { Result, ok, err, TokenUsage } from '../shared/types.js';
import { CostTracker } from '../shared/cost-tracker.js';
import { RefinementConfig } from '../shared/config-validator.js';
import {
  ErrorAnalysis,
  CodeFix,
  FixAttempt,
  PlaywrightTestResult,
  RefinementSession,
  RefinementResult,
  RefinementStatus,
  RefinementDiagnostics,
  LessonLearned,
  CircuitBreakerConfig,
} from './types.js';
import { parseError } from './error-parser.js';
import {
  CircuitBreaker,
  ConvergenceDetector,
  analyzeRefinementProgress,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from './convergence-detector.js';

// ═══════════════════════════════════════════════════════════════════════════
// LLM CLIENT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface RefinementLLMClient {
  generateFix(
    _code: string,
    _errors: ErrorAnalysis[],
    _previousAttempts: FixAttempt[],
    _options: FixGenerationOptions
  ): Promise<FixGenerationResult>;
}

export interface FixGenerationOptions {
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
}

export interface FixGenerationResult {
  fixes: CodeFix[];
  tokenUsage: TokenUsage;
  reasoning?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST RUNNER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface TestRunner {
  runTest(_testFile: string, _testCode: string): Promise<PlaywrightTestResult>;
}

// ═══════════════════════════════════════════════════════════════════════════
// REFINEMENT OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface RefinementOptions {
  config: RefinementConfig;
  llmClient: RefinementLLMClient;
  testRunner: TestRunner;
  costTracker?: CostTracker;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  onAttemptComplete?: (_attempt: FixAttempt) => void;
  onProgressUpdate?: (_progress: RefinementProgress) => void;
}

export interface RefinementProgress {
  attemptNumber: number;
  maxAttempts: number;
  currentErrorCount: number;
  originalErrorCount: number;
  trend: string;
  status: 'running' | 'success' | 'failed';
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

const REFINEMENT_SYSTEM_PROMPT = `You are an expert Playwright test debugger. Your task is to fix failing E2E tests.

## Context
You will receive:
1. The current test code (TypeScript/Playwright)
2. A list of errors with detailed analysis
3. Previous fix attempts (if any)

## Your Task
Analyze the errors and provide fixes. For each error:
1. Understand the root cause
2. Propose a minimal, targeted fix
3. Explain your reasoning

## Fix Guidelines
- Prefer more robust selectors (testId > role > text > css)
- Add appropriate waits for async operations
- Don't over-engineer - fix only what's broken
- Preserve the original test intent
- Avoid changing test assertions unless they're incorrect

## Response Format
Respond with JSON:
{
  "reasoning": "Brief explanation of root cause",
  "fixes": [
    {
      "type": "SELECTOR_CHANGE" | "WAIT_ADDED" | "ASSERTION_MODIFIED" | "OTHER",
      "description": "What this fix does",
      "originalCode": "exact code being replaced",
      "fixedCode": "replacement code",
      "location": { "file": "test.spec.ts", "line": 42 },
      "confidence": 0.85,
      "reasoning": "Why this fix should work"
    }
  ]
}

## Important
- fixes[].originalCode must be an EXACT substring of the current code
- Each fix should target one specific issue
- Order fixes by confidence (highest first)
- If you cannot determine a fix, set confidence < 0.5`;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN REFINEMENT LOOP
// ═══════════════════════════════════════════════════════════════════════════

export async function runRefinementLoop(
  journeyId: string,
  testFile: string,
  originalCode: string,
  initialErrors: ErrorAnalysis[],
  options: RefinementOptions
): Promise<RefinementResult> {
  const {
    config,
    llmClient,
    testRunner,
    costTracker,
    circuitBreakerConfig,
    onAttemptComplete,
    onProgressUpdate,
  } = options;

  // Initialize session
  const sessionId = `refine-${journeyId}-${Date.now()}`;
  const circuitBreaker = new CircuitBreaker({
    ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
    maxAttempts: config.maxAttempts,
    ...circuitBreakerConfig,
  });
  const convergenceDetector = new ConvergenceDetector();

  // Track initial errors
  convergenceDetector.recordAttempt(initialErrors);

  const session: RefinementSession = {
    sessionId,
    journeyId,
    testFile,
    startTime: new Date(),
    originalCode,
    currentCode: originalCode,
    attempts: [],
    circuitBreakerState: circuitBreaker.getState(),
    convergenceInfo: convergenceDetector.getInfo(),
    finalStatus: 'SUCCESS', // Will be updated
    totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
  };

  let currentCode = originalCode;
  let currentErrors = initialErrors;
  const appliedFixes: CodeFix[] = [];
  const lessonsLearned: LessonLearned[] = [];

  // Main loop
  while (true) {
    // Check if we can continue
    const analysis = analyzeRefinementProgress(
      session.attempts,
      circuitBreaker,
      convergenceDetector
    );

    if (!analysis.shouldContinue) {
      session.finalStatus = mapAnalysisToStatus(analysis.reason, currentErrors.length === 0);
      break;
    }

    // Check cost limits
    if (costTracker?.wouldExceedLimit(5000)) {
      session.finalStatus = 'BUDGET_EXCEEDED';
      break;
    }

    // Report progress
    if (onProgressUpdate) {
      onProgressUpdate({
        attemptNumber: session.attempts.length + 1,
        maxAttempts: config.maxAttempts,
        currentErrorCount: currentErrors.length,
        originalErrorCount: initialErrors.length,
        trend: convergenceDetector.getInfo().trend,
        status: 'running',
      });
    }

    // Generate fixes
    let fixResult: FixGenerationResult;
    try {
      fixResult = await llmClient.generateFix(
        currentCode,
        currentErrors,
        session.attempts,
        {
          maxTokens: config.llm.maxTokens,
          temperature: config.llm.temperature,
          systemPrompt: REFINEMENT_SYSTEM_PROMPT,
        }
      );
    } catch (error) {
      const attempt: FixAttempt = {
        attemptNumber: session.attempts.length + 1,
        timestamp: new Date(),
        error: currentErrors[0],
        proposedFixes: [],
        outcome: 'failure',
        newErrors: [parseError(error instanceof Error ? error.message : 'LLM error')],
      };
      session.attempts.push(attempt);
      session.finalStatus = 'CANNOT_FIX';
      break;
    }

    // Track token usage
    session.totalTokenUsage = addTokenUsage(session.totalTokenUsage, fixResult.tokenUsage);
    if (costTracker) {
      costTracker.trackUsage(fixResult.tokenUsage);
    }

    // Filter to high-confidence fixes
    const viableFixes = fixResult.fixes.filter(f => f.confidence >= 0.5);

    if (viableFixes.length === 0) {
      const attempt: FixAttempt = {
        attemptNumber: session.attempts.length + 1,
        timestamp: new Date(),
        error: currentErrors[0],
        proposedFixes: fixResult.fixes,
        outcome: 'skipped',
        tokenUsage: fixResult.tokenUsage,
      };
      session.attempts.push(attempt);
      circuitBreaker.recordAttempt(currentErrors, fixResult.tokenUsage);

      if (onAttemptComplete) {
        onAttemptComplete(attempt);
      }
      continue;
    }

    // Apply the highest confidence fix
    const fixToApply = viableFixes[0];
    const applyResult = applyFix(currentCode, fixToApply);

    if (!applyResult.ok) {
      const attempt: FixAttempt = {
        attemptNumber: session.attempts.length + 1,
        timestamp: new Date(),
        error: currentErrors[0],
        proposedFixes: fixResult.fixes,
        outcome: 'failure',
        tokenUsage: fixResult.tokenUsage,
      };
      session.attempts.push(attempt);
      circuitBreaker.recordAttempt(currentErrors, fixResult.tokenUsage);

      if (onAttemptComplete) {
        onAttemptComplete(attempt);
      }
      continue;
    }

    const fixedCode = applyResult.value;

    // Run test with fixed code
    let testResult: PlaywrightTestResult;
    try {
      testResult = await testRunner.runTest(testFile, fixedCode);
    } catch (error) {
      const attempt: FixAttempt = {
        attemptNumber: session.attempts.length + 1,
        timestamp: new Date(),
        error: currentErrors[0],
        proposedFixes: fixResult.fixes,
        appliedFix: fixToApply,
        outcome: 'failure',
        newErrors: [parseError(error instanceof Error ? error.message : 'Test run error')],
        tokenUsage: fixResult.tokenUsage,
      };
      session.attempts.push(attempt);
      circuitBreaker.recordAttempt(currentErrors, fixResult.tokenUsage);

      if (onAttemptComplete) {
        onAttemptComplete(attempt);
      }
      continue;
    }

    // Determine outcome
    const newErrors = testResult.errors;
    const outcome = determineOutcome(currentErrors, newErrors);

    const attempt: FixAttempt = {
      attemptNumber: session.attempts.length + 1,
      timestamp: new Date(),
      error: currentErrors[0],
      proposedFixes: fixResult.fixes,
      appliedFix: fixToApply,
      outcome,
      newErrors: newErrors.length > 0 ? newErrors : undefined,
      tokenUsage: fixResult.tokenUsage,
    };

    session.attempts.push(attempt);

    // Update state
    if (outcome === 'success' || outcome === 'partial') {
      currentCode = fixedCode;
      session.currentCode = currentCode;
      appliedFixes.push(fixToApply);

      // Learn from successful fix
      const lesson = createLesson(journeyId, fixToApply, currentErrors[0]);
      if (lesson) {
        lessonsLearned.push(lesson);
      }
    }

    currentErrors = newErrors;
    convergenceDetector.recordAttempt(newErrors);
    circuitBreaker.recordAttempt(newErrors, fixResult.tokenUsage);

    // Update session state
    session.circuitBreakerState = circuitBreaker.getState();
    session.convergenceInfo = convergenceDetector.getInfo();

    if (onAttemptComplete) {
      onAttemptComplete(attempt);
    }

    // Add cooldown between attempts
    if (config.timeouts.delayBetweenAttempts > 0) {
      await sleep(config.timeouts.delayBetweenAttempts);
    }
  }

  // Finalize session
  session.endTime = new Date();
  session.circuitBreakerState = circuitBreaker.getState();
  session.convergenceInfo = convergenceDetector.getInfo();

  // Report final progress
  if (onProgressUpdate) {
    onProgressUpdate({
      attemptNumber: session.attempts.length,
      maxAttempts: config.maxAttempts,
      currentErrorCount: currentErrors.length,
      originalErrorCount: initialErrors.length,
      trend: convergenceDetector.getInfo().trend,
      status: currentErrors.length === 0 ? 'success' : 'failed',
    });
  }

  return {
    success: currentErrors.length === 0,
    session,
    fixedCode: currentErrors.length === 0 ? currentCode : undefined,
    remainingErrors: currentErrors,
    appliedFixes,
    lessonsLearned,
    diagnostics: createDiagnostics(session),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function applyFix(code: string, fix: CodeFix): Result<string, string> {
  if (!code.includes(fix.originalCode)) {
    return err(`Original code not found: "${fix.originalCode.substring(0, 50)}..."`);
  }

  const fixedCode = code.replace(fix.originalCode, fix.fixedCode);
  return ok(fixedCode);
}

function determineOutcome(
  previousErrors: ErrorAnalysis[],
  newErrors: ErrorAnalysis[]
): 'success' | 'failure' | 'partial' {
  if (newErrors.length === 0) {
    return 'success';
  }

  if (newErrors.length < previousErrors.length) {
    return 'partial';
  }

  // Check if we fixed some errors but introduced new ones
  const previousFingerprints = new Set(previousErrors.map(e => e.fingerprint));
  const newFingerprints = new Set(newErrors.map(e => e.fingerprint));

  let fixedCount = 0;
  for (const fp of previousFingerprints) {
    if (!newFingerprints.has(fp)) {
      fixedCount++;
    }
  }

  if (fixedCount > 0) {
    return 'partial';
  }

  return 'failure';
}

function mapAnalysisToStatus(reason: string, noErrors: boolean): RefinementStatus {
  if (noErrors) {
    return 'SUCCESS';
  }

  if (reason.includes('Circuit breaker')) {
    if (reason.includes('MAX_ATTEMPTS')) return 'MAX_ATTEMPTS_REACHED';
    if (reason.includes('SAME_ERROR')) return 'SAME_ERROR_LOOP';
    if (reason.includes('OSCILLATION')) return 'OSCILLATION_DETECTED';
    if (reason.includes('TIMEOUT')) return 'TIMEOUT';
    if (reason.includes('BUDGET')) return 'BUDGET_EXCEEDED';
  }

  if (reason.includes('stagnating')) return 'CANNOT_FIX';
  if (reason.includes('degrading')) return 'CANNOT_FIX';
  if (reason.includes('oscillating')) return 'OSCILLATION_DETECTED';

  return 'PARTIAL_SUCCESS';
}

function createDiagnostics(session: RefinementSession): RefinementDiagnostics {
  const lastError = session.attempts.length > 0
    ? session.attempts[session.attempts.length - 1].error?.message || ''
    : '';

  return {
    attempts: session.attempts.length,
    lastError,
    convergenceFailure: session.convergenceInfo.trend === 'stagnating' ||
      session.convergenceInfo.trend === 'oscillating',
    sameErrorRepeated: session.circuitBreakerState.openReason === 'SAME_ERROR',
    oscillationDetected: session.circuitBreakerState.openReason === 'OSCILLATION' ||
      session.convergenceInfo.trend === 'oscillating',
    budgetExhausted: session.circuitBreakerState.openReason === 'BUDGET_EXCEEDED',
    timedOut: session.circuitBreakerState.openReason === 'TIMEOUT',
  };
}

function createLesson(
  journeyId: string,
  fix: CodeFix,
  error: ErrorAnalysis
): LessonLearned | undefined {
  // Only create lessons for high-confidence fixes
  if (fix.confidence < 0.7) {
    return undefined;
  }

  const lessonType = mapFixTypeToLessonType(fix.type);
  if (!lessonType) {
    return undefined;
  }

  return {
    id: `lesson-${journeyId}-${Date.now()}`,
    type: lessonType,
    context: {
      journeyId,
      errorCategory: error.category,
      originalSelector: error.selector,
      element: fix.location.stepDescription,
    },
    solution: {
      pattern: fix.type,
      code: fix.fixedCode,
      explanation: fix.reasoning || fix.description,
    },
    confidence: fix.confidence,
    createdAt: new Date(),
    verified: true, // It worked!
  };
}

function mapFixTypeToLessonType(
  fixType: string
): LessonLearned['type'] | undefined {
  switch (fixType) {
    case 'SELECTOR_CHANGE':
    case 'LOCATOR_STRATEGY_CHANGED':
      return 'selector_pattern';
    case 'WAIT_ADDED':
    case 'TIMEOUT_INCREASED':
      return 'wait_strategy';
    case 'FLOW_REORDERED':
      return 'flow_pattern';
    default:
      return 'error_fix';
  }
}

function addTokenUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    estimatedCostUsd: a.estimatedCostUsd + b.estimatedCostUsd,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLE ATTEMPT HELPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run a single refinement attempt (for testing or manual control)
 */
export async function runSingleRefinementAttempt(
  code: string,
  errors: ErrorAnalysis[],
  llmClient: RefinementLLMClient,
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<Result<{ fixes: CodeFix[]; reasoning?: string }, string>> {
  try {
    const result = await llmClient.generateFix(code, errors, [], {
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.2,
      systemPrompt: REFINEMENT_SYSTEM_PROMPT,
    });

    return ok({
      fixes: result.fixes,
      reasoning: result.reasoning,
    });
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Unknown error');
  }
}
