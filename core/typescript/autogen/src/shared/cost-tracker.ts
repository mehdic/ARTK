/**
 * @module shared/cost-tracker
 * @description LLM cost tracking with limits to prevent cost explosion
 */

import { TokenUsage, CostLimits, CostTrackerState } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// COST ESTIMATION
// ═══════════════════════════════════════════════════════════════════════════

// Pricing per 1M tokens (as of 2026)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  // Anthropic
  'claude-opus-4-20250514': { input: 15.00, output: 75.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  // Default for unknown models
  'default': { input: 1.00, output: 3.00 },
};

export function estimateCost(usage: TokenUsage, model: string): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['default'];
  const inputCost = (usage.promptTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

export function estimateTokensFromText(text: string): number {
  // Rough estimation: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

// ═══════════════════════════════════════════════════════════════════════════
// COST TRACKER
// ═══════════════════════════════════════════════════════════════════════════

export class CostTracker {
  private state: CostTrackerState;
  private limits: CostLimits;
  private model: string;

  constructor(limits: CostLimits, model: string = 'default') {
    this.limits = limits;
    this.model = model;
    this.state = {
      sessionCost: 0,
      testCost: 0,
      totalTokens: 0,
      sessionStartedAt: new Date(),
    };
  }

  /**
   * Track token usage and update costs
   */
  trackUsage(usage: TokenUsage): void {
    const cost = usage.estimatedCostUsd > 0
      ? usage.estimatedCostUsd
      : estimateCost(usage, this.model);

    this.state.sessionCost += cost;
    this.state.testCost += cost;
    this.state.totalTokens += usage.totalTokens;
  }

  /**
   * Get current session cost
   */
  getSessionCost(): number {
    return this.state.sessionCost;
  }

  /**
   * Get current test cost
   */
  getTestCost(): number {
    return this.state.testCost;
  }

  /**
   * Get total tokens used
   */
  getTotalTokens(): number {
    return this.state.totalTokens;
  }

  /**
   * Reset test cost (call between tests)
   */
  resetTestCost(): void {
    this.state.testCost = 0;
  }

  /**
   * Check if a limit has been exceeded
   */
  checkLimit(type: 'test' | 'session'): boolean {
    if (!this.limits.enabled) return true;

    if (type === 'test') {
      return this.state.testCost < this.limits.perTestUsd;
    } else {
      return this.state.sessionCost < this.limits.perSessionUsd;
    }
  }

  /**
   * Check if adding estimated tokens would exceed limit
   */
  wouldExceedLimit(estimatedTokens: number, type: 'test' | 'session' = 'test'): boolean {
    if (!this.limits.enabled) return false;

    const estimatedUsage: TokenUsage = {
      promptTokens: estimatedTokens,
      completionTokens: Math.ceil(estimatedTokens * 0.5), // Assume 50% output ratio
      totalTokens: Math.ceil(estimatedTokens * 1.5),
      estimatedCostUsd: 0,
    };
    const estimatedCost = estimateCost(estimatedUsage, this.model);

    if (type === 'test') {
      return (this.state.testCost + estimatedCost) >= this.limits.perTestUsd;
    } else {
      return (this.state.sessionCost + estimatedCost) >= this.limits.perSessionUsd;
    }
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(type: 'test' | 'session'): number {
    if (!this.limits.enabled) return Infinity;

    if (type === 'test') {
      return Math.max(0, this.limits.perTestUsd - this.state.testCost);
    } else {
      return Math.max(0, this.limits.perSessionUsd - this.state.sessionCost);
    }
  }

  /**
   * Get state snapshot
   */
  getState(): CostTrackerState {
    return { ...this.state };
  }

  /**
   * Create summary report
   */
  getSummary(): CostTrackerSummary {
    return {
      sessionCost: this.state.sessionCost,
      testCost: this.state.testCost,
      totalTokens: this.state.totalTokens,
      sessionDurationMs: Date.now() - this.state.sessionStartedAt.getTime(),
      testBudgetRemaining: this.getRemainingBudget('test'),
      sessionBudgetRemaining: this.getRemainingBudget('session'),
      limitsEnabled: this.limits.enabled,
    };
  }
}

export interface CostTrackerSummary {
  sessionCost: number;
  testCost: number;
  totalTokens: number;
  sessionDurationMs: number;
  testBudgetRemaining: number;
  sessionBudgetRemaining: number;
  limitsEnabled: boolean;
}

/**
 * Create a cost tracker with default limits
 */
export function createCostTracker(
  limits?: Partial<CostLimits>,
  model?: string
): CostTracker {
  const defaultLimits: CostLimits = {
    perTestUsd: 0.10,
    perSessionUsd: 5.00,
    enabled: true,
    ...limits,
  };
  return new CostTracker(defaultLimits, model);
}
