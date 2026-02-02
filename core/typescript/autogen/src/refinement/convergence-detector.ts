/**
 * @module refinement/convergence-detector
 * @description Circuit breaker and convergence detection for refinement loops
 */

import {
  CircuitBreakerConfig,
  CircuitBreakerState,
  ConvergenceInfo,
  ErrorAnalysis,
  FixAttempt,
} from './types.js';
import { TokenUsage } from '../shared/types.js';

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  maxAttempts: 3,
  sameErrorThreshold: 2,
  oscillationDetection: true,
  oscillationWindowSize: 4,
  totalTimeoutMs: 300000, // 5 minutes
  cooldownMs: 1000,
  maxTokenBudget: 50000,
};

// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════════════════

export interface CircuitBreakerOptions extends Partial<CircuitBreakerConfig> {
  /** Optional initial state for restoration from saved state */
  initialState?: CircuitBreakerState;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;

  constructor(options: CircuitBreakerOptions = {}) {
    const { initialState, ...config } = options;
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };

    // Restore from saved state if provided, otherwise create fresh state
    if (initialState) {
      this.state = this.restoreState(initialState);
    } else {
      this.state = this.createInitialState();
    }
  }

  private createInitialState(): CircuitBreakerState {
    return {
      isOpen: false,
      attemptCount: 0,
      errorHistory: [],
      startTime: new Date(),
      tokensUsed: 0,
      maxAttempts: this.config.maxAttempts,
    };
  }

  /**
   * Restore state from a saved CircuitBreakerState
   * This allows the circuit breaker to continue from a previous session
   * without double-counting attempts
   */
  private restoreState(saved: CircuitBreakerState): CircuitBreakerState {
    return {
      isOpen: saved.isOpen,
      openReason: saved.openReason,
      attemptCount: saved.attemptCount,
      errorHistory: [...(saved.errorHistory || [])],
      // Restore startTime or use now if not saved
      startTime: saved.startTime ? new Date(saved.startTime) : new Date(),
      tokensUsed: saved.tokensUsed || 0,
      maxAttempts: this.config.maxAttempts,
    };
  }

  /**
   * Reset the circuit breaker to initial state
   */
  reset(): void {
    this.state = this.createInitialState();
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Record an attempt and check if circuit should open
   */
  recordAttempt(errors: ErrorAnalysis[], tokenUsage?: TokenUsage): CircuitBreakerState {
    if (this.state.isOpen) {
      return this.state;
    }

    this.state.attemptCount++;

    // Add error fingerprints to history
    const fingerprints = errors.map(e => e.fingerprint);
    this.state.errorHistory.push(...fingerprints);

    // Track tokens
    if (tokenUsage) {
      this.state.tokensUsed += tokenUsage.totalTokens;
    }

    // Check all conditions
    this.checkMaxAttempts();
    this.checkSameError();
    this.checkOscillation();
    this.checkTimeout();
    this.checkBudget();

    return this.state;
  }

  /**
   * Check if we can make another attempt
   */
  canAttempt(): boolean {
    if (this.state.isOpen) {
      return false;
    }

    // Re-check timeout in case time passed
    this.checkTimeout();

    return !this.state.isOpen;
  }

  /**
   * Get remaining attempts
   */
  remainingAttempts(): number {
    if (this.state.isOpen) return 0;
    return Math.max(0, this.config.maxAttempts - this.state.attemptCount);
  }

  /**
   * Get remaining token budget
   */
  remainingTokenBudget(): number {
    return Math.max(0, this.config.maxTokenBudget - this.state.tokensUsed);
  }

  /**
   * Estimate if operation would exceed budget
   */
  wouldExceedBudget(estimatedTokens: number): boolean {
    return (this.state.tokensUsed + estimatedTokens) > this.config.maxTokenBudget;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE CHECKS
  // ─────────────────────────────────────────────────────────────────────────

  private checkMaxAttempts(): void {
    if (this.state.attemptCount >= this.config.maxAttempts) {
      this.openCircuit('MAX_ATTEMPTS');
    }
  }

  private checkSameError(): void {
    if (this.state.errorHistory.length < this.config.sameErrorThreshold) {
      return;
    }

    // Count occurrences of each fingerprint
    const counts = new Map<string, number>();
    for (const fp of this.state.errorHistory) {
      counts.set(fp, (counts.get(fp) || 0) + 1);
    }

    // Check if any error repeated too many times
    for (const count of counts.values()) {
      if (count >= this.config.sameErrorThreshold) {
        this.openCircuit('SAME_ERROR');
        return;
      }
    }
  }

  private checkOscillation(): void {
    if (!this.config.oscillationDetection) {
      return;
    }

    const history = this.state.errorHistory;
    const windowSize = this.config.oscillationWindowSize;

    if (history.length < windowSize) {
      return;
    }

    // Check for A-B-A-B pattern in recent history
    const recentHistory = history.slice(-windowSize);

    // Simple oscillation: alternating between two states
    const unique = new Set(recentHistory);
    if (unique.size === 2) {
      // Check if it's actually alternating
      let isAlternating = true;
      for (let i = 2; i < recentHistory.length; i++) {
        const currentItem = recentHistory[i];
        const previousItem = recentHistory[i - 2];
        if (currentItem !== undefined && previousItem !== undefined && currentItem !== previousItem) {
          isAlternating = false;
          break;
        }
      }
      if (isAlternating) {
        this.openCircuit('OSCILLATION');
      }
    }
  }

  private checkTimeout(): void {
    if (!this.state.startTime) return;
    const elapsed = Date.now() - this.state.startTime.getTime();
    if (elapsed >= this.config.totalTimeoutMs) {
      this.openCircuit('TIMEOUT');
    }
  }

  private checkBudget(): void {
    if (this.state.tokensUsed >= this.config.maxTokenBudget) {
      this.openCircuit('BUDGET_EXCEEDED');
    }
  }

  private openCircuit(reason: CircuitBreakerState['openReason']): void {
    this.state.isOpen = true;
    this.state.openReason = reason;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERGENCE DETECTOR
// ═══════════════════════════════════════════════════════════════════════════

export class ConvergenceDetector {
  private errorCountHistory: number[] = [];
  private uniqueErrorsHistory: Set<string>[] = [];
  private lastImprovement: number | undefined;
  private stagnationCount = 0;

  /**
   * Record errors from an attempt
   */
  recordAttempt(errors: ErrorAnalysis[]): void {
    const count = errors.length;
    const uniqueFingerprints = new Set(errors.map(e => e.fingerprint));

    this.errorCountHistory.push(count);
    this.uniqueErrorsHistory.push(uniqueFingerprints);

    // Check for improvement
    if (this.errorCountHistory.length >= 2) {
      const prev = this.errorCountHistory[this.errorCountHistory.length - 2] ?? 0;
      const curr = this.errorCountHistory[this.errorCountHistory.length - 1] ?? 0;

      if (curr < prev) {
        this.lastImprovement = this.errorCountHistory.length - 1;
        this.stagnationCount = 0;
      } else {
        this.stagnationCount++;
      }
    }
  }

  /**
   * Get convergence information
   */
  getInfo(): ConvergenceInfo {
    const converged = this.isConverged();
    const trend = this.detectTrend();

    return {
      converged,
      attempts: this.errorCountHistory.length,
      errorCountHistory: [...this.errorCountHistory],
      uniqueErrorsHistory: this.uniqueErrorsHistory.map(s => new Set(s)),
      lastImprovement: this.lastImprovement,
      stagnationCount: this.stagnationCount,
      trend,
    };
  }

  /**
   * Check if we've converged (no errors)
   */
  isConverged(): boolean {
    if (this.errorCountHistory.length === 0) return false;
    return this.errorCountHistory[this.errorCountHistory.length - 1] === 0;
  }

  /**
   * Detect the trend in error counts
   */
  detectTrend(): ConvergenceInfo['trend'] {
    if (this.errorCountHistory.length < 2) {
      return 'stagnating';
    }

    const recent = this.errorCountHistory.slice(-3);

    // Check for oscillation first
    if (this.isOscillating()) {
      return 'oscillating';
    }

    // Check trend
    const decreasing = recent.every((val, i, arr) =>
      i === 0 || val <= (arr[i - 1] ?? val)
    );

    const increasing = recent.every((val, i, arr) =>
      i === 0 || val >= (arr[i - 1] ?? val)
    );

    const allSame = recent.every((val, _, arr) => val === arr[0]);

    if (allSame || this.stagnationCount >= 2) {
      return 'stagnating';
    }

    if (decreasing) {
      return 'improving';
    }

    if (increasing) {
      return 'degrading';
    }

    return 'stagnating';
  }

  /**
   * Check if error counts are oscillating
   */
  private isOscillating(): boolean {
    if (this.errorCountHistory.length < 4) {
      return false;
    }

    const recent = this.errorCountHistory.slice(-4);
    // A-B-A-B pattern in counts (allow some tolerance)
    const diff01 = (recent[1] || 0) - (recent[0] || 0);
    const diff12 = (recent[2] || 0) - (recent[1] || 0);
    const diff23 = (recent[3] || 0) - (recent[2] || 0);

    // Signs alternate: +, -, +, - or -, +, -, +
    const signsAlternate =
      Math.sign(diff01) !== 0 &&
      Math.sign(diff01) === -Math.sign(diff12) &&
      Math.sign(diff12) === -Math.sign(diff23);

    return signsAlternate;
  }

  /**
   * Calculate improvement percentage
   */
  getImprovementPercentage(): number {
    if (this.errorCountHistory.length < 2) {
      return 0;
    }

    const first = this.errorCountHistory[0] || 0;
    const last = this.errorCountHistory[this.errorCountHistory.length - 1] || 0;

    if (first === 0) {
      return last === 0 ? 100 : 0;
    }

    return Math.round(((first - last) / first) * 100);
  }

  /**
   * Get new errors introduced in last attempt (not in previous)
   */
  getNewErrors(): Set<string> {
    if (this.uniqueErrorsHistory.length < 2) {
      const firstEntry = this.uniqueErrorsHistory[0];
      return firstEntry ? firstEntry : new Set();
    }

    const prev = this.uniqueErrorsHistory[this.uniqueErrorsHistory.length - 2];
    const curr = this.uniqueErrorsHistory[this.uniqueErrorsHistory.length - 1];

    if (!prev || !curr) {
      return new Set();
    }

    const newErrors = new Set<string>();
    for (const fp of curr) {
      if (!prev.has(fp)) {
        newErrors.add(fp);
      }
    }

    return newErrors;
  }

  /**
   * Get errors fixed in last attempt (in previous but not current)
   */
  getFixedErrors(): Set<string> {
    if (this.uniqueErrorsHistory.length < 2) {
      return new Set();
    }

    const prev = this.uniqueErrorsHistory[this.uniqueErrorsHistory.length - 2];
    const curr = this.uniqueErrorsHistory[this.uniqueErrorsHistory.length - 1];

    if (!prev || !curr) {
      return new Set();
    }

    const fixedErrors = new Set<string>();
    for (const fp of prev) {
      if (!curr.has(fp)) {
        fixedErrors.add(fp);
      }
    }

    return fixedErrors;
  }

  /**
   * Reset the detector
   */
  reset(): void {
    this.errorCountHistory = [];
    this.uniqueErrorsHistory = [];
    this.lastImprovement = undefined;
    this.stagnationCount = 0;
  }

  /**
   * Restore detector state from saved error count history
   * This allows the detector to continue from a previous session
   * without losing context about convergence trends
   */
  restoreFromHistory(savedErrorCounts: number[]): void {
    if (!savedErrorCounts || savedErrorCounts.length === 0) {
      return;
    }

    this.errorCountHistory = [...savedErrorCounts];
    // We can't restore uniqueErrorsHistory without fingerprints,
    // but we can still detect trends from error counts
    this.uniqueErrorsHistory = savedErrorCounts.map(() => new Set<string>());

    // Recalculate lastImprovement and stagnationCount
    this.lastImprovement = undefined;
    this.stagnationCount = 0;

    for (let i = 1; i < savedErrorCounts.length; i++) {
      const prev = savedErrorCounts[i - 1];
      const curr = savedErrorCounts[i];

      if (prev !== undefined && curr !== undefined && curr < prev) {
        this.lastImprovement = i;
        this.stagnationCount = 0;
      } else {
        this.stagnationCount++;
      }
    }
  }

  /**
   * Get the error count history for serialization
   */
  getErrorCountHistory(): number[] {
    return [...this.errorCountHistory];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED ANALYZER
// ═══════════════════════════════════════════════════════════════════════════

export interface RefinementAnalysis {
  shouldContinue: boolean;
  reason: string;
  circuitBreaker: CircuitBreakerState;
  convergence: ConvergenceInfo;
  recommendation: 'continue' | 'stop' | 'escalate';
}

/**
 * Analyze refinement progress and decide whether to continue
 */
export function analyzeRefinementProgress(
  _attempts: FixAttempt[],
  circuitBreaker: CircuitBreaker,
  convergenceDetector: ConvergenceDetector
): RefinementAnalysis {
  const cbState = circuitBreaker.getState();
  const convergenceInfo = convergenceDetector.getInfo();

  // Check circuit breaker first
  if (cbState.isOpen) {
    return {
      shouldContinue: false,
      reason: `Circuit breaker open: ${cbState.openReason}`,
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: 'stop',
    };
  }

  // Check convergence
  if (convergenceInfo.converged) {
    return {
      shouldContinue: false,
      reason: 'All errors resolved',
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: 'stop',
    };
  }

  // Check trend
  if (convergenceInfo.trend === 'degrading') {
    return {
      shouldContinue: false,
      reason: 'Error count increasing - fixes are making things worse',
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: 'escalate',
    };
  }

  if (convergenceInfo.trend === 'oscillating') {
    return {
      shouldContinue: false,
      reason: 'Error counts oscillating - cannot converge',
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: 'escalate',
    };
  }

  // Check stagnation
  if (convergenceInfo.stagnationCount >= 2) {
    return {
      shouldContinue: false,
      reason: 'No improvement in last 2 attempts - stagnating',
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: 'escalate',
    };
  }

  // Can continue
  return {
    shouldContinue: true,
    reason: 'Progress being made',
    circuitBreaker: cbState,
    convergence: convergenceInfo,
    recommendation: 'continue',
  };
}
