/**
 * LLM Fallback - Final tier in coverage architecture
 * Handles blocked steps that can't be matched by patterns, LLKB, or fuzzy matching
 *
 * Coverage Flow: Normalization → Core Patterns → LLKB → Fuzzy → LLM → TODO
 *
 * Key features:
 * - Schema-constrained outputs (only valid IR primitives)
 * - Validation before use
 * - Cost and latency tracking
 * - Non-determinism awareness (logging, telemetry)
 * - Disabled by default for deterministic builds
 *
 * @see research/2026-02-03_multi-ai-debate-coverage-improvement.md
 */
import type { IRPrimitive, LocatorSpec, ValueSpec } from '../ir/types.js';

/**
 * LLM provider type
 */
export type LlmProvider = 'claude' | 'gpt' | 'gemini' | 'mock';

/**
 * Configuration for LLM fallback
 */
export interface LlmFallbackConfig {
  /** Whether LLM fallback is enabled (default: false) */
  enabled: boolean;
  /** LLM provider to use */
  provider: LlmProvider;
  /** Model name (e.g., 'claude-3-haiku', 'gpt-4o-mini') */
  model?: string;
  /** API key (environment variable name) */
  apiKeyEnvVar?: string;
  /** Maximum tokens for response */
  maxTokens?: number;
  /** Temperature (0-1, lower = more deterministic) */
  temperature?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Maximum retries on failure */
  maxRetries?: number;
  /** Whether to cache LLM responses */
  cacheResponses?: boolean;
  /** Cache TTL in seconds */
  cacheTtlSeconds?: number;
  /** Cost budget per session (in USD) */
  costBudgetUsd?: number;
}

/**
 * Default configuration (disabled by default)
 */
export const DEFAULT_LLM_CONFIG: LlmFallbackConfig = {
  enabled: false,
  provider: 'claude',
  model: 'claude-3-haiku-20240307',
  apiKeyEnvVar: 'ANTHROPIC_API_KEY',
  maxTokens: 500,
  temperature: 0.1, // Low temperature for consistency
  timeout: 10000,
  maxRetries: 2,
  cacheResponses: true,
  cacheTtlSeconds: 3600,
  costBudgetUsd: 0.50,
};

/**
 * LLM fallback result
 */
export interface LlmFallbackResult {
  /** The generated primitive */
  primitive: IRPrimitive;
  /** Confidence in the result (0-1) */
  confidence: number;
  /** Whether result is from cache */
  fromCache: boolean;
  /** Latency in milliseconds */
  latencyMs: number;
  /** Estimated cost in USD */
  estimatedCostUsd: number;
  /** Provider used */
  provider: LlmProvider;
  /** Model used */
  model: string;
}

/**
 * LLM fallback telemetry
 */
export interface LlmFallbackTelemetry {
  /** Total LLM calls made */
  totalCalls: number;
  /** Successful calls */
  successfulCalls: number;
  /** Failed calls (validation failures, timeouts) */
  failedCalls: number;
  /** Cache hits */
  cacheHits: number;
  /** Total latency (ms) */
  totalLatencyMs: number;
  /** Total estimated cost (USD) */
  totalCostUsd: number;
  /** Call history for analysis */
  history: Array<{
    timestamp: string;
    stepText: string;
    success: boolean;
    latencyMs: number;
    costUsd: number;
    error?: string;
  }>;
}

// Telemetry state
let telemetry: LlmFallbackTelemetry = {
  totalCalls: 0,
  successfulCalls: 0,
  failedCalls: 0,
  cacheHits: 0,
  totalLatencyMs: 0,
  totalCostUsd: 0,
  history: [],
};

// Simple in-memory cache
const responseCache = new Map<string, { result: LlmFallbackResult; expiry: number }>();

/** Maximum history entries to keep (avoid unbounded memory growth) */
const MAX_HISTORY_ENTRIES = 1000;

/**
 * Add a history entry with bounded array size
 */
function addHistoryEntry(entry: LlmFallbackTelemetry['history'][0]): void {
  telemetry.history.push(entry);
  // Trim history if it exceeds max size (keep most recent)
  if (telemetry.history.length > MAX_HISTORY_ENTRIES) {
    telemetry.history = telemetry.history.slice(-MAX_HISTORY_ENTRIES);
  }
}

/**
 * Valid primitive types for schema validation
 */
const VALID_PRIMITIVE_TYPES = [
  'goto', 'waitForURL', 'waitForResponse', 'waitForLoadingComplete', 'reload', 'goBack', 'goForward',
  'waitForVisible', 'waitForHidden', 'waitForTimeout', 'waitForNetworkIdle',
  'click', 'dblclick', 'rightClick', 'fill', 'select', 'check', 'uncheck', 'upload', 'press', 'hover', 'focus', 'clear',
  'expectVisible', 'expectNotVisible', 'expectHidden', 'expectText', 'expectValue', 'expectChecked',
  'expectEnabled', 'expectDisabled', 'expectURL', 'expectTitle', 'expectCount', 'expectContainsText',
  'expectToast', 'dismissModal', 'acceptAlert', 'dismissAlert',
  'callModule', 'blocked',
] as const;

/**
 * Valid locator strategies
 */
const VALID_LOCATOR_STRATEGIES = ['role', 'label', 'placeholder', 'text', 'testid', 'css'] as const;

/**
 * Validate a locator spec
 */
function validateLocatorSpec(locator: unknown): locator is LocatorSpec {
  if (!locator || typeof locator !== 'object') return false;
  const loc = locator as Record<string, unknown>;

  if (!VALID_LOCATOR_STRATEGIES.includes(loc.strategy as typeof VALID_LOCATOR_STRATEGIES[number])) {
    return false;
  }

  if (typeof loc.value !== 'string' || loc.value.length === 0) {
    return false;
  }

  return true;
}

/**
 * Validate a value spec
 */
function validateValueSpec(value: unknown): value is ValueSpec {
  if (!value || typeof value !== 'object') return false;
  const val = value as Record<string, unknown>;

  const validTypes = ['literal', 'actor', 'runId', 'generated', 'testData'];
  if (!validTypes.includes(val.type as string)) {
    return false;
  }

  if (typeof val.value !== 'string') {
    return false;
  }

  return true;
}

/**
 * Validate an IR primitive from LLM response
 */
export function validateLlmPrimitive(primitive: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!primitive || typeof primitive !== 'object') {
    errors.push('Primitive must be an object');
    return { valid: false, errors };
  }

  const prim = primitive as Record<string, unknown>;

  // Check type
  if (!VALID_PRIMITIVE_TYPES.includes(prim.type as typeof VALID_PRIMITIVE_TYPES[number])) {
    errors.push(`Invalid primitive type: ${prim.type}`);
    return { valid: false, errors };
  }

  // Type-specific validation
  switch (prim.type) {
    // Navigation primitives
    case 'goto':
      if (typeof prim.url !== 'string') errors.push('goto requires url string');
      break;

    case 'waitForURL':
      if (typeof prim.pattern !== 'string') errors.push('waitForURL requires pattern string');
      break;

    case 'waitForResponse':
      if (typeof prim.urlPattern !== 'string') errors.push('waitForResponse requires urlPattern string');
      break;

    case 'reload':
    case 'goBack':
    case 'goForward':
      // No additional validation needed
      break;

    case 'waitForLoadingComplete':
    case 'waitForNetworkIdle':
      // Optional timeout, no validation needed
      break;

    // Wait primitives with locator
    case 'waitForVisible':
    case 'waitForHidden':
      if (!validateLocatorSpec(prim.locator)) errors.push(`${prim.type} requires valid locator`);
      break;

    case 'waitForTimeout':
      if (typeof prim.ms !== 'number' || prim.ms < 0) errors.push('waitForTimeout requires positive ms');
      break;

    // Interaction primitives with locator
    case 'click':
    case 'dblclick':
    case 'rightClick':
    case 'hover':
    case 'focus':
    case 'clear':
    case 'check':
    case 'uncheck':
      if (!validateLocatorSpec(prim.locator)) errors.push(`${prim.type} requires valid locator`);
      break;

    case 'fill':
      if (!validateLocatorSpec(prim.locator)) errors.push('fill requires valid locator');
      if (!validateValueSpec(prim.value)) errors.push('fill requires valid value');
      break;

    case 'select':
      if (!validateLocatorSpec(prim.locator)) errors.push('select requires valid locator');
      if (typeof prim.option !== 'string') errors.push('select requires option string');
      break;

    case 'press':
      if (typeof prim.key !== 'string') errors.push('press requires key string');
      break;

    case 'upload':
      if (!validateLocatorSpec(prim.locator)) errors.push('upload requires valid locator');
      if (!Array.isArray(prim.files) || prim.files.length === 0) errors.push('upload requires non-empty files array');
      break;

    // Assertion primitives
    case 'expectText':
    case 'expectContainsText':
      if (!validateLocatorSpec(prim.locator)) errors.push(`${prim.type} requires valid locator`);
      if (typeof prim.text !== 'string') errors.push(`${prim.type} requires text string`);
      break;

    case 'expectValue':
      if (!validateLocatorSpec(prim.locator)) errors.push('expectValue requires valid locator');
      if (typeof prim.value !== 'string') errors.push('expectValue requires value string');
      break;

    case 'expectVisible':
    case 'expectNotVisible':
    case 'expectHidden':
    case 'expectEnabled':
    case 'expectDisabled':
    case 'expectChecked':
      if (!validateLocatorSpec(prim.locator)) errors.push(`${prim.type} requires valid locator`);
      break;

    case 'expectCount':
      if (!validateLocatorSpec(prim.locator)) errors.push('expectCount requires valid locator');
      if (typeof prim.count !== 'number') errors.push('expectCount requires count number');
      break;

    case 'expectURL':
      if (typeof prim.pattern !== 'string') errors.push('expectURL requires pattern string');
      break;

    case 'expectTitle':
      if (typeof prim.title !== 'string') errors.push('expectTitle requires title string');
      break;

    // Signal primitives
    case 'expectToast':
      if (!['success', 'error', 'info', 'warning'].includes(prim.toastType as string)) {
        errors.push('expectToast requires valid toastType (success|error|info|warning)');
      }
      break;

    case 'dismissModal':
    case 'acceptAlert':
    case 'dismissAlert':
      // No additional validation needed
      break;

    // Module calls
    case 'callModule':
      if (typeof prim.module !== 'string') errors.push('callModule requires module string');
      if (typeof prim.method !== 'string') errors.push('callModule requires method string');
      break;

    // Blocked steps
    case 'blocked':
      if (typeof prim.reason !== 'string') errors.push('blocked requires reason string');
      if (typeof prim.sourceText !== 'string') errors.push('blocked requires sourceText string');
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate the prompt for LLM
 */
function generatePrompt(stepText: string): string {
  return `You are an expert at converting natural language test steps into structured IR (Intermediate Representation) primitives for Playwright test automation.

Given this test step:
"${stepText}"

Return a JSON object representing the IR primitive. The primitive must follow this schema:

Primitive Types:
- Navigation: goto (url), waitForURL (pattern), reload, goBack, goForward
- Wait: waitForVisible (locator), waitForHidden (locator), waitForTimeout (ms), waitForNetworkIdle
- Actions: click (locator), fill (locator, value), select (locator, option), check (locator), uncheck (locator), press (key), hover (locator)
- Assertions: expectVisible (locator), expectText (locator, text), expectValue (locator, value), expectURL (pattern), expectTitle (title)

Locator format:
{
  "strategy": "role" | "label" | "text" | "testid" | "css",
  "value": "string",
  "options": { "name": "string", "exact": boolean } // optional
}

Value format (for fill):
{
  "type": "literal" | "actor" | "testData",
  "value": "string"
}

Examples:
- "Click the Submit button" → {"type": "click", "locator": {"strategy": "role", "value": "button", "options": {"name": "Submit"}}}
- "Enter 'john@test.com' in email field" → {"type": "fill", "locator": {"strategy": "label", "value": "email"}, "value": {"type": "literal", "value": "john@test.com"}}
- "Wait for page to load" → {"type": "waitForNetworkIdle"}

RESPOND WITH ONLY THE JSON OBJECT, NO EXPLANATION.`;
}

/**
 * Parse LLM response into primitive
 */
function parseResponse(response: string): IRPrimitive | null {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const validation = validateLlmPrimitive(parsed);

    if (validation.valid) {
      return parsed as IRPrimitive;
    }

    console.warn('[LLM Fallback] Validation errors:', validation.errors);
    return null;
  } catch (e) {
    console.warn('[LLM Fallback] Failed to parse response:', e);
    return null;
  }
}

/**
 * Get cache key for a step
 */
function getCacheKey(stepText: string, config: LlmFallbackConfig): string {
  return `${config.provider}:${config.model}:${stepText.toLowerCase().trim()}`;
}

/**
 * Estimate cost for a call
 */
function estimateCost(_provider: LlmProvider, model: string, inputTokens: number, outputTokens: number): number {
  // Rough estimates per 1M tokens (as of early 2025)
  const costs: Record<string, { input: number; output: number }> = {
    'claude-3-haiku': { input: 0.25, output: 1.25 },
    'claude-3-sonnet': { input: 3.00, output: 15.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o': { input: 5.00, output: 15.00 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  };

  const modelKey = Object.keys(costs).find(k => model.includes(k)) || 'gpt-4o-mini';
  const rates = costs[modelKey]!;

  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

/**
 * Mock LLM call for testing
 */
async function mockLlmCall(stepText: string): Promise<{ response: string; latencyMs: number }> {
  // Simulate latency
  await new Promise(r => setTimeout(r, 100));

  const lower = stepText.toLowerCase();

  // Simple mock responses based on keywords
  let primitive: IRPrimitive;

  if (lower.includes('click')) {
    const match = stepText.match(/["']([^"']+)["']/);
    primitive = {
      type: 'click',
      locator: { strategy: 'role', value: 'button', options: { name: match?.[1] || 'button' } },
    };
  } else if (lower.includes('enter') || lower.includes('fill') || lower.includes('type')) {
    const matches = stepText.match(/["']([^"']+)["']/g);
    const value = matches?.[0]?.slice(1, -1) || '';
    const field = matches?.[1]?.slice(1, -1) || 'input';
    primitive = {
      type: 'fill',
      locator: { strategy: 'label', value: field },
      value: { type: 'literal', value },
    };
  } else if (lower.includes('see') || lower.includes('visible')) {
    const match = stepText.match(/["']([^"']+)["']/);
    primitive = {
      type: 'expectVisible',
      locator: { strategy: 'text', value: match?.[1] || 'element' },
    };
  } else if (lower.includes('navigate') || lower.includes('go to')) {
    const match = stepText.match(/(?:to|\/)\s*([\/\w.-]+)/i);
    primitive = { type: 'goto', url: match?.[1] || '/' };
  } else if (lower.includes('wait')) {
    primitive = { type: 'waitForNetworkIdle' };
  } else {
    // Fallback to blocked
    primitive = { type: 'blocked', reason: 'LLM mock could not interpret', sourceText: stepText };
  }

  return {
    response: JSON.stringify(primitive),
    latencyMs: 100,
  };
}

/**
 * Make actual LLM API call
 * Note: This is a placeholder - actual implementation would use provider SDKs
 */
async function callLlmApi(
  _prompt: string,
  _config: LlmFallbackConfig
): Promise<{ response: string; latencyMs: number; inputTokens: number; outputTokens: number }> {
  // TODO: Implement actual LLM API calls using provider SDKs
  // For now, throw an error indicating it's not implemented
  throw new Error(
    'LLM API calls not implemented. Use mock provider for testing or implement callLlmApi with your preferred provider SDK.'
  );
}

/**
 * Main LLM fallback function
 */
export async function llmFallback(
  stepText: string,
  config: Partial<LlmFallbackConfig> = {}
): Promise<LlmFallbackResult | null> {
  const mergedConfig: LlmFallbackConfig = { ...DEFAULT_LLM_CONFIG, ...config };

  if (!mergedConfig.enabled) {
    return null;
  }

  const startTime = Date.now();
  const cacheKey = getCacheKey(stepText, mergedConfig);

  // Check cache
  if (mergedConfig.cacheResponses) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      telemetry.cacheHits++;
      return { ...cached.result, fromCache: true };
    }
  }

  // Check cost budget
  if (mergedConfig.costBudgetUsd && telemetry.totalCostUsd >= mergedConfig.costBudgetUsd) {
    console.warn('[LLM Fallback] Cost budget exceeded, skipping LLM call');
    telemetry.failedCalls++;
    addHistoryEntry({
      timestamp: new Date().toISOString(),
      stepText,
      success: false,
      latencyMs: 0,
      costUsd: 0,
      error: 'Cost budget exceeded',
    });
    return null;
  }

  telemetry.totalCalls++;

  try {
    let response: string;
    let latencyMs: number;
    let inputTokens = 0;
    let outputTokens = 0;

    if (mergedConfig.provider === 'mock') {
      const result = await mockLlmCall(stepText);
      response = result.response;
      latencyMs = result.latencyMs;
      inputTokens = Math.ceil(stepText.length / 4);
      outputTokens = Math.ceil(response.length / 4);
    } else {
      const prompt = generatePrompt(stepText);
      const result = await callLlmApi(prompt, mergedConfig);
      response = result.response;
      latencyMs = result.latencyMs;
      inputTokens = result.inputTokens;
      outputTokens = result.outputTokens;
    }

    const primitive = parseResponse(response);

    if (!primitive) {
      telemetry.failedCalls++;
      addHistoryEntry({
        timestamp: new Date().toISOString(),
        stepText,
        success: false,
        latencyMs: Date.now() - startTime,
        costUsd: 0,
        error: 'Failed to parse response',
      });
      return null;
    }

    const costUsd = estimateCost(mergedConfig.provider, mergedConfig.model || '', inputTokens, outputTokens);

    const result: LlmFallbackResult = {
      primitive,
      confidence: primitive.type === 'blocked' ? 0.3 : 0.7,
      fromCache: false,
      latencyMs,
      estimatedCostUsd: costUsd,
      provider: mergedConfig.provider,
      model: mergedConfig.model || 'unknown',
    };

    // Update telemetry
    telemetry.successfulCalls++;
    telemetry.totalLatencyMs += latencyMs;
    telemetry.totalCostUsd += costUsd;
    addHistoryEntry({
      timestamp: new Date().toISOString(),
      stepText,
      success: true,
      latencyMs,
      costUsd,
    });

    // Cache result
    if (mergedConfig.cacheResponses) {
      responseCache.set(cacheKey, {
        result,
        expiry: Date.now() + (mergedConfig.cacheTtlSeconds || 3600) * 1000,
      });
    }

    return result;
  } catch (error) {
    telemetry.failedCalls++;
    addHistoryEntry({
      timestamp: new Date().toISOString(),
      stepText,
      success: false,
      latencyMs: Date.now() - startTime,
      costUsd: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Get current telemetry
 */
export function getLlmFallbackTelemetry(): LlmFallbackTelemetry {
  return { ...telemetry };
}

/**
 * Reset telemetry (for testing)
 */
export function resetLlmFallbackTelemetry(): void {
  telemetry = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    cacheHits: 0,
    totalLatencyMs: 0,
    totalCostUsd: 0,
    history: [],
  };
}

/**
 * Clear response cache (for testing)
 */
export function clearLlmResponseCache(): void {
  responseCache.clear();
}

/**
 * Check if LLM fallback is available and configured
 */
export function isLlmFallbackAvailable(config: Partial<LlmFallbackConfig> = {}): {
  available: boolean;
  reason?: string;
} {
  const mergedConfig = { ...DEFAULT_LLM_CONFIG, ...config };

  if (!mergedConfig.enabled) {
    return { available: false, reason: 'LLM fallback is disabled' };
  }

  if (mergedConfig.provider === 'mock') {
    return { available: true };
  }

  // Check for API key
  const apiKey = process.env[mergedConfig.apiKeyEnvVar || 'ANTHROPIC_API_KEY'];
  if (!apiKey) {
    return {
      available: false,
      reason: `API key not found in environment variable: ${mergedConfig.apiKeyEnvVar}`,
    };
  }

  return { available: true };
}
