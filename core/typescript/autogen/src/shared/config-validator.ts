/**
 * @module shared/config-validator
 * @description Config validation with LLM availability check
 */

import { z } from 'zod';
import { LLMProvider, LLMConfigSchema, CostLimitsSchema } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// SCOT CONFIG SCHEMA - DEFAULT DISABLED
// ═══════════════════════════════════════════════════════════════════════════

export const SCoTConfigSchema = z.object({
  enabled: z.boolean().default(false),
  minConfidence: z.number().min(0).max(1).default(0.7),
  maxStructures: z.number().min(1).max(100).default(20),
  includeReasoningComments: z.boolean().default(true),
  llm: LLMConfigSchema.default({}),
  fallback: z.enum(['pattern-only', 'error']).default('pattern-only'),
}).default({});

// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const CircuitBreakerConfigSchema = z.object({
  sameErrorThreshold: z.number().min(1).max(5).default(2),
  errorHistorySize: z.number().min(5).max(50).default(10),
  degradationThreshold: z.number().min(0.1).max(1).default(0.5),
  cooldownMs: z.number().min(1000).max(300000).default(60000),
}).default({});

// ═══════════════════════════════════════════════════════════════════════════
// REFINEMENT CONFIG SCHEMA - DEFAULT DISABLED
// ═══════════════════════════════════════════════════════════════════════════

export const RefinementConfigSchema = z.object({
  enabled: z.boolean().default(false),
  maxAttempts: z.number().min(1).max(5).default(3),
  timeouts: z.object({
    session: z.number().min(60000).max(600000).default(300000),
    execution: z.number().min(10000).max(120000).default(60000),
    delayBetweenAttempts: z.number().min(500).max(10000).default(1000),
  }).default({}),
  circuitBreaker: CircuitBreakerConfigSchema,
  errorHandling: z.object({
    categories: z.array(z.string()).default([]),
    skip: z.array(z.string()).default(['FIXTURE', 'PAGE_ERROR']),
  }).default({}),
  learning: z.object({
    enabled: z.boolean().default(true),
    minGeneralizability: z.number().min(0).max(1).default(0.6),
  }).default({}),
  llm: LLMConfigSchema.default({}),
  advanced: z.object({
    minAutoFixConfidence: z.number().min(0).max(1).default(0.7),
    includeScreenshots: z.boolean().default(true),
    includeTraces: z.boolean().default(false),
    verbose: z.boolean().default(false),
    dryRun: z.boolean().default(false),
  }).default({}),
}).default({});

// ═══════════════════════════════════════════════════════════════════════════
// UNCERTAINTY CONFIG SCHEMA - DEFAULT DISABLED
// ═══════════════════════════════════════════════════════════════════════════

export const UncertaintyConfigSchema = z.object({
  enabled: z.boolean().default(false),
  thresholds: z.object({
    autoAccept: z.number().min(0.5).max(1).default(0.85),
    block: z.number().min(0).max(0.8).default(0.50),
    minimumPerDimension: z.number().min(0).max(0.8).default(0.40),
  }).default({}),
  weights: z.object({
    syntax: z.number().min(0).max(1).default(0.20),
    pattern: z.number().min(0).max(1).default(0.30),
    selector: z.number().min(0).max(1).default(0.30),
    agreement: z.number().min(0).max(1).default(0.20),
  }).default({}),
  sampling: z.object({
    enabled: z.boolean().default(false),
    sampleCount: z.number().min(2).max(5).default(3),
    temperatures: z.array(z.number()).default([0.2, 0.5, 0.7]),
  }).default({}),
  reporting: z.object({
    includeInTestComments: z.boolean().default(true),
    generateMarkdownReport: z.boolean().default(false),
  }).default({}),
}).default({});

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED ENHANCEMENT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const AutogenEnhancementConfigSchema = z.object({
  scot: SCoTConfigSchema,
  refinement: RefinementConfigSchema,
  uncertainty: UncertaintyConfigSchema,
  costLimits: CostLimitsSchema.default({}),
});

export type SCoTConfig = z.infer<typeof SCoTConfigSchema>;
export type RefinementConfig = z.infer<typeof RefinementConfigSchema>;
export type UncertaintyConfig = z.infer<typeof UncertaintyConfigSchema>;
export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;
export type AutogenEnhancementConfig = z.infer<typeof AutogenEnhancementConfigSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// LLM AVAILABILITY CHECK
// ═══════════════════════════════════════════════════════════════════════════

export interface LLMAvailabilityResult {
  available: boolean;
  provider: LLMProvider;
  missingEnvVar?: string;
  message: string;
}

const PROVIDER_ENV_VARS: Record<LLMProvider, string | null> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  azure: 'AZURE_OPENAI_API_KEY',
  bedrock: 'AWS_ACCESS_KEY_ID',
  ollama: null,
  local: null,
  none: null,
};

export function checkLLMAvailability(provider: LLMProvider): LLMAvailabilityResult {
  if (provider === 'none') {
    return { available: true, provider, message: 'LLM disabled' };
  }

  if (provider === 'local' || provider === 'ollama') {
    return { available: true, provider, message: 'Local LLM, no API key required' };
  }

  const envVar = PROVIDER_ENV_VARS[provider];
  if (!envVar) {
    return { available: false, provider, message: `Unknown provider: ${provider}` };
  }

  if (!process.env[envVar]) {
    return {
      available: false,
      provider,
      missingEnvVar: envVar,
      message: `${provider} requires ${envVar} environment variable`,
    };
  }

  return { available: true, provider, message: `${provider} configured` };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export interface ConfigValidationResult {
  valid: boolean;
  config?: AutogenEnhancementConfig;
  errors: ConfigValidationError[];
  warnings: string[];
}

export interface ConfigValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export function validateEnhancementConfig(rawConfig: unknown): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];
  const warnings: string[] = [];

  // Parse with Zod
  const result = AutogenEnhancementConfigSchema.safeParse(rawConfig ?? {});
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join('.'),
        message: issue.message,
        severity: 'error',
      });
    }
    return { valid: false, errors, warnings };
  }

  const config = result.data;

  // Check LLM availability for enabled features
  if (config.scot.enabled) {
    const llmCheck = checkLLMAvailability(config.scot.llm.provider);
    if (!llmCheck.available) {
      errors.push({
        path: 'scot.llm.provider',
        message: `SCoT is enabled but LLM is not available: ${llmCheck.message}. ` +
                 `Set ${llmCheck.missingEnvVar} or set scot.enabled: false`,
        severity: 'error',
      });
    }
  }

  if (config.refinement.enabled) {
    const llmCheck = checkLLMAvailability(config.refinement.llm.provider);
    if (!llmCheck.available) {
      errors.push({
        path: 'refinement.llm.provider',
        message: `Self-Refinement is enabled but LLM is not available: ${llmCheck.message}. ` +
                 `Set ${llmCheck.missingEnvVar} or set refinement.enabled: false`,
        severity: 'error',
      });
    }
  }

  // Warn if weights don't sum to 1.0
  const weightSum = config.uncertainty.weights.syntax +
                    config.uncertainty.weights.pattern +
                    config.uncertainty.weights.selector +
                    config.uncertainty.weights.agreement;
  if (Math.abs(weightSum - 1.0) > 0.001) {
    warnings.push(`Uncertainty weights sum to ${weightSum.toFixed(2)}, not 1.0. Scores may be unexpected.`);
  }

  // Warn if thresholds are inverted
  if (config.uncertainty.thresholds.block >= config.uncertainty.thresholds.autoAccept) {
    warnings.push(`Uncertainty block threshold (${config.uncertainty.thresholds.block}) >= ` +
                  `autoAccept (${config.uncertainty.thresholds.autoAccept}). This may cause unexpected blocking.`);
  }

  return {
    valid: errors.length === 0,
    config: errors.length === 0 ? config : undefined,
    errors,
    warnings,
  };
}
