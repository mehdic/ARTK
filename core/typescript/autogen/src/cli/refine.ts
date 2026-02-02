/**
 * CLI Refine Command - Apply refinements based on test errors
 *
 * Part of the Hybrid Agentic architecture. This command analyzes
 * test results and outputs structured refinement suggestions for
 * the orchestrating LLM to apply.
 *
 * @see research/2026-02-02_autogen-enhancement-implementation-plan.md
 */
import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import {
  getAutogenArtifact,
  getAutogenDir,
  ensureAutogenDir,
} from '../utils/paths.js';
import { updatePipelineState } from '../pipeline/state.js';
import { getTelemetry } from '../shared/telemetry.js';
import type { RunOutput, TestError, ErrorType } from './run.js';
import {
  CircuitBreaker,
  ConvergenceDetector,
  analyzeRefinementProgress,
  type RefinementAnalysis,
} from '../refinement/convergence-detector.js';
import type { ErrorAnalysis, CircuitBreakerState, ErrorCategory } from '../refinement/types.js';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map TestError type to ErrorAnalysis category
 */
function mapErrorTypeToCategory(errorType: ErrorType): ErrorCategory {
  switch (errorType) {
    case 'selector':
      return 'SELECTOR_NOT_FOUND';
    case 'timeout':
      return 'TIMEOUT';
    case 'assertion':
      return 'ASSERTION_FAILED';
    case 'navigation':
      return 'NAVIGATION_ERROR';
    case 'typescript':
      return 'SYNTAX_ERROR';
    case 'runtime':
      return 'RUNTIME_ERROR';
    default:
      return 'UNKNOWN';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RefinementSuggestion {
  errorType: ErrorType;
  errorMessage: string;
  location?: {
    file: string;
    line: number;
  };
  suggestion: string;
  confidence: number;
  codeChange?: CodeChange;
  llkbPattern?: string;
}

export interface CodeChange {
  type: 'replace' | 'insert' | 'delete';
  file: string;
  line: number;
  oldCode?: string;
  newCode?: string;
  explanation: string;
}

export interface RefineOutput {
  version: '1.0';
  testPath: string;
  journeyId?: string;
  status: 'needs_refinement' | 'converged' | 'blocked';
  errors: TestError[];
  suggestions: RefinementSuggestion[];
  convergence: ConvergenceInfo;
  circuitBreaker: CircuitBreakerInfo;
  recommendation: string;
  refinedAt: string;
}

export interface ConvergenceInfo {
  attempts: number;
  trend: 'improving' | 'degrading' | 'stagnating' | 'oscillating';
  errorCountHistory: number[];
  improvementPercent: number;
}

export interface CircuitBreakerInfo {
  isOpen: boolean;
  reason?: string;
  remainingAttempts: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE
// ═══════════════════════════════════════════════════════════════════════════

const USAGE = `
Usage: artk-autogen refine [options]

Analyze test results and generate refinement suggestions.

Options:
  -r, --results <path>   Path to results.json (default: .artk/autogen/results.json)
  -t, --test <path>      Analyze specific test file only
  --max-attempts <n>     Max refinement attempts before stopping (default: 3)
  --json                 Output JSON to stdout instead of file
  -q, --quiet            Suppress output except errors
  -h, --help             Show this help message

Examples:
  artk-autogen refine
  artk-autogen refine --test tests/login.spec.ts
  artk-autogen refine --max-attempts 5
  artk-autogen refine --json
`;

// ═══════════════════════════════════════════════════════════════════════════
// REFINEMENT LOGIC
// ═══════════════════════════════════════════════════════════════════════════

const SELECTOR_REFINEMENTS: Record<string, RefinementSuggestion['suggestion']> = {
  'strict mode': 'Locator found multiple elements. Add more specific selector or use .first() / .nth(0)',
  'timeout': 'Element not found within timeout. Check if element exists, is visible, or needs explicit wait',
  'not found': 'Element does not exist. Verify selector is correct and element is rendered',
  'detached': 'Element was removed from DOM. Add waitFor or re-query the element',
};

const ASSERTION_REFINEMENTS: Record<string, RefinementSuggestion['suggestion']> = {
  'expected': 'Assertion value mismatch. Check expected vs actual value - may be timing issue',
  'tobehave': 'Element state assertion failed. Add explicit wait before assertion',
  'visibility': 'Element visibility check failed. Ensure element is in viewport and not hidden',
};

const TIMEOUT_REFINEMENTS: Record<string, RefinementSuggestion['suggestion']> = {
  'page.goto': 'Page navigation timeout. Check URL, network conditions, or increase timeout',
  'waitfor': 'WaitFor timeout. Element may not appear - check selector or use different wait condition',
  'click': 'Click timeout. Element may be overlapped, disabled, or not interactable',
};

function generateRefinement(error: TestError): RefinementSuggestion {
  const message = error.message.toLowerCase();
  let suggestion = error.suggestion || 'Review the error and fix manually';
  let confidence = 0.5;

  // Match against known patterns
  if (error.type === 'selector') {
    for (const [pattern, sug] of Object.entries(SELECTOR_REFINEMENTS)) {
      if (message.includes(pattern)) {
        suggestion = sug;
        confidence = 0.8;
        break;
      }
    }
  } else if (error.type === 'assertion') {
    for (const [pattern, sug] of Object.entries(ASSERTION_REFINEMENTS)) {
      if (message.includes(pattern)) {
        suggestion = sug;
        confidence = 0.75;
        break;
      }
    }
  } else if (error.type === 'timeout') {
    for (const [pattern, sug] of Object.entries(TIMEOUT_REFINEMENTS)) {
      if (message.includes(pattern)) {
        suggestion = sug;
        confidence = 0.7;
        break;
      }
    }
  }

  // Generate code change suggestion if location is available
  let codeChange: CodeChange | undefined;
  if (error.location && error.snippet) {
    codeChange = suggestCodeChange(error);
  }

  return {
    errorType: error.type,
    errorMessage: error.message.substring(0, 300),
    location: error.location,
    suggestion,
    confidence,
    codeChange,
  };
}

function suggestCodeChange(error: TestError): CodeChange | undefined {
  if (!error.location || !error.snippet) return undefined;

  const { file, line } = error.location;
  const snippet = error.snippet;

  // Selector timeout - add explicit wait
  if (error.type === 'timeout' && snippet.includes('locator')) {
    return {
      type: 'replace',
      file,
      line,
      oldCode: snippet,
      newCode: `await page.waitForSelector('${extractSelector(snippet)}', { state: 'visible' });\n  ${snippet}`,
      explanation: 'Add explicit waitForSelector before the action',
    };
  }

  // Click on overlapped element - add scrollIntoView
  if (error.type === 'selector' && error.message.includes('intercept')) {
    return {
      type: 'replace',
      file,
      line,
      oldCode: snippet,
      newCode: snippet.replace('.click()', '.scrollIntoViewIfNeeded();\n  await ' + snippet.trim()),
      explanation: 'Scroll element into view before clicking',
    };
  }

  // Strict mode violation - use .first()
  if (error.type === 'selector' && error.message.includes('strict')) {
    return {
      type: 'replace',
      file,
      line,
      oldCode: snippet,
      newCode: snippet.replace('.click()', '.first().click()'),
      explanation: 'Use .first() to select single element from multiple matches',
    };
  }

  return undefined;
}

function extractSelector(snippet: string): string {
  const match = snippet.match(/(?:locator|getBy\w+)\(['"]([^'"]+)['"]\)/);
  return match?.[1] || 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

interface RefineState {
  testPath: string;
  attempts: RefineAttempt[];
  /** Saved circuit breaker state for restoration */
  circuitBreakerState: CircuitBreakerState;
  /** Error count history for convergence detection */
  errorCountHistory: number[];
}

interface RefineAttempt {
  attemptNumber: number;
  errors: TestError[];
  suggestions: RefinementSuggestion[];
  timestamp: string;
}

function loadRefineState(testPath: string, maxAttempts: number): RefineState {
  const stateDir = getAutogenDir();
  const statePath = join(stateDir, `refine-state-${basename(testPath, '.spec.ts')}.json`);

  if (existsSync(statePath)) {
    try {
      const loaded = JSON.parse(readFileSync(statePath, 'utf-8')) as RefineState;

      // Migration: convert old format to new format if needed
      if (!loaded.circuitBreakerState) {
        // Old format had circuitBreaker object, migrate to new format
        const oldState = loaded as unknown as {
          circuitBreaker?: {
            isOpen: boolean;
            openReason?: string;
            attemptCount: number;
            errorHistory: string[];
            tokensUsed: number;
          };
        };
        loaded.circuitBreakerState = {
          isOpen: oldState.circuitBreaker?.isOpen ?? false,
          openReason: oldState.circuitBreaker?.openReason as CircuitBreakerState['openReason'],
          attemptCount: oldState.circuitBreaker?.attemptCount ?? loaded.attempts.length,
          errorHistory: oldState.circuitBreaker?.errorHistory ?? [],
          tokensUsed: oldState.circuitBreaker?.tokensUsed ?? 0,
          maxAttempts,
        };
      }

      // Migration: add errorCountHistory if missing
      if (!loaded.errorCountHistory) {
        loaded.errorCountHistory = loaded.attempts.map(a => a.errors.length);
      }

      return loaded;
    } catch {
      // Corrupted state, start fresh
    }
  }

  return {
    testPath,
    attempts: [],
    circuitBreakerState: {
      isOpen: false,
      attemptCount: 0,
      errorHistory: [],
      tokensUsed: 0,
      maxAttempts,
    },
    errorCountHistory: [],
  };
}

function saveRefineState(state: RefineState): void {
  const stateDir = getAutogenDir();
  const statePath = join(stateDir, `refine-state-${basename(state.testPath, '.spec.ts')}.json`);
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMMAND
// ═══════════════════════════════════════════════════════════════════════════

export async function runRefine(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      results: { type: 'string', short: 'r' },
      test: { type: 'string', short: 't' },
      'max-attempts': { type: 'string', default: '3' },
      json: { type: 'boolean', default: false },
      quiet: { type: 'boolean', short: 'q', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(USAGE);
    return;
  }

  const quiet = values.quiet;
  const outputJson = values.json;

  // Validate max-attempts
  const maxAttempts = parseInt(values['max-attempts'], 10);
  if (isNaN(maxAttempts) || maxAttempts <= 0) {
    console.error(`Error: Invalid max-attempts value "${values['max-attempts']}". Must be a positive number.`);
    process.exit(1);
  }

  // Initialize telemetry
  const telemetry = getTelemetry();
  await telemetry.load();
  const eventId = telemetry.trackCommandStart('refine');

  // Load results
  const resultsPath = values.results || getAutogenArtifact('results');
  if (!existsSync(resultsPath)) {
    console.error(`Error: Results file not found: ${resultsPath}`);
    console.error('Run "artk-autogen run" first.');
    process.exit(1);
  }

  let runOutput: RunOutput;
  try {
    runOutput = JSON.parse(readFileSync(resultsPath, 'utf-8'));
  } catch (e) {
    console.error(`Error: Failed to parse results file: ${e}`);
    process.exit(1);
  }

  // Filter to specific test if requested
  let results = runOutput.results;
  if (values.test) {
    results = results.filter(r => r.testPath.includes(values.test!));
    if (results.length === 0) {
      console.error(`Error: No results found for test "${values.test}"`);
      process.exit(1);
    }
  }

  // Filter to failed tests only
  const failedResults = results.filter(r => r.status !== 'passed');
  if (failedResults.length === 0) {
    if (!quiet && !outputJson) {
      console.log('All tests passed - no refinement needed');
    }
    if (outputJson) {
      console.log(JSON.stringify({ status: 'converged', message: 'All tests passed' }, null, 2));
    }
    return;
  }

  await ensureAutogenDir();
  const outputs: RefineOutput[] = [];

  for (const result of failedResults) {
    // Load state for this test (with maxAttempts for circuit breaker config)
    const state = loadRefineState(result.testPath, maxAttempts);

    // CRITICAL FIX: Restore circuit breaker from saved state instead of replaying
    // This prevents double-counting attempts when the CLI is run multiple times
    const circuitBreaker = new CircuitBreaker({
      maxAttempts,
      initialState: state.circuitBreakerState,
    });

    // Restore convergence detector from saved error count history
    const convergenceDetector = new ConvergenceDetector();
    convergenceDetector.restoreFromHistory(state.errorCountHistory);

    // Record ONLY the current attempt (not historical ones - they're already in saved state)
    // Map TestError to ErrorAnalysis format
    const currentErrors: ErrorAnalysis[] = result.errors.map(e => ({
      fingerprint: `${e.type}:${e.message.substring(0, 50)}`,
      category: mapErrorTypeToCategory(e.type),
      message: e.message,
      originalError: e.message,
      severity: 'major' as const,
      timestamp: new Date(),
    }));
    circuitBreaker.recordAttempt(currentErrors);
    convergenceDetector.recordAttempt(currentErrors);

    // Analyze progress
    const analysis: RefinementAnalysis = analyzeRefinementProgress(
      [], // Fix attempts not used directly
      circuitBreaker,
      convergenceDetector
    );

    // Generate suggestions
    const suggestions = result.errors.map(e => generateRefinement(e));

    // Determine status
    let status: RefineOutput['status'] = 'needs_refinement';
    let recommendation = 'Apply suggested refinements and re-run the test';

    if (result.errors.length === 0) {
      status = 'converged';
      recommendation = 'Test is now passing';
    } else if (analysis.recommendation === 'stop' || !analysis.shouldContinue) {
      status = 'blocked';
      recommendation = `Refinement blocked: ${analysis.reason}. Manual intervention required.`;
    }

    const output: RefineOutput = {
      version: '1.0',
      testPath: result.testPath,
      journeyId: result.journeyId,
      status,
      errors: result.errors,
      suggestions,
      convergence: {
        attempts: state.attempts.length + 1,
        trend: analysis.convergence.trend,
        errorCountHistory: analysis.convergence.errorCountHistory,
        improvementPercent: convergenceDetector.getImprovementPercentage(),
      },
      circuitBreaker: {
        isOpen: analysis.circuitBreaker.isOpen,
        reason: analysis.circuitBreaker.openReason,
        remainingAttempts: circuitBreaker.remainingAttempts(),
      },
      recommendation,
      refinedAt: new Date().toISOString(),
    };

    outputs.push(output);

    // Update state with new attempt
    state.attempts.push({
      attemptNumber: state.attempts.length + 1,
      errors: result.errors,
      suggestions,
      timestamp: new Date().toISOString(),
    });

    // Save circuit breaker state for future restoration
    state.circuitBreakerState = {
      isOpen: analysis.circuitBreaker.isOpen,
      openReason: analysis.circuitBreaker.openReason,
      attemptCount: analysis.circuitBreaker.attemptCount,
      errorHistory: analysis.circuitBreaker.errorHistory,
      tokensUsed: analysis.circuitBreaker.tokensUsed,
      maxAttempts,
    };

    // Save error count history for convergence detection restoration
    state.errorCountHistory.push(result.errors.length);

    saveRefineState(state);

    if (!quiet && !outputJson) {
      console.log(`\nTest: ${basename(result.testPath)}`);
      console.log(`  Status: ${status}`);
      console.log(`  Errors: ${result.errors.length}`);
      console.log(`  Attempt: ${state.attempts.length}/${maxAttempts}`);
      console.log(`  Trend: ${analysis.convergence.trend}`);
      if (suggestions.length > 0) {
        console.log(`  Suggestions:`);
        for (const s of suggestions.slice(0, 3)) {
          console.log(`    - [${s.errorType}] ${s.suggestion.substring(0, 60)}`);
        }
      }
    }
  }

  // Output
  if (outputJson) {
    console.log(JSON.stringify(outputs.length === 1 ? outputs[0] : outputs, null, 2));
  } else if (!quiet) {
    console.log(`\nRefinement analysis complete:`);
    console.log(`  Total: ${outputs.length}`);
    console.log(`  Needs refinement: ${outputs.filter(o => o.status === 'needs_refinement').length}`);
    console.log(`  Blocked: ${outputs.filter(o => o.status === 'blocked').length}`);
    console.log(`  Converged: ${outputs.filter(o => o.status === 'converged').length}`);
  }

  // Determine pipeline stage based on refinement results
  const hasBlocked = outputs.some(o => o.status === 'blocked');
  const allConverged = outputs.every(o => o.status === 'converged');
  const pipelineStage = hasBlocked ? 'blocked' : allConverged ? 'completed' : 'refining';

  // Calculate total refinement attempts
  const totalAttempts = outputs.reduce((sum, o) => sum + o.convergence.attempts, 0);

  // Update pipeline state
  await updatePipelineState('refine', pipelineStage, !hasBlocked, {
    refinementAttempts: totalAttempts,
    isBlocked: hasBlocked,
    blockedReason: hasBlocked
      ? outputs.find(o => o.status === 'blocked')?.recommendation
      : undefined,
  });

  // Track command completion
  telemetry.trackCommandEnd(eventId, !hasBlocked, {
    totalTests: outputs.length,
    needsRefinement: outputs.filter(o => o.status === 'needs_refinement').length,
    blocked: outputs.filter(o => o.status === 'blocked').length,
    converged: outputs.filter(o => o.status === 'converged').length,
    totalAttempts,
  });
  await telemetry.save();
}
