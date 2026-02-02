/**
 * @module shared/llm-response-parser
 * @description Validated JSON parsing from LLM responses with Zod schemas
 */

import { z } from 'zod';
import { Result, ok, err } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// PARSE ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ParseError {
  type: 'INVALID_JSON' | 'SCHEMA_VALIDATION' | 'EXTRACTION_FAILED';
  message: string;
  rawResponse: string;
  validationErrors?: z.ZodError;
}

// ═══════════════════════════════════════════════════════════════════════════
// JSON EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract JSON from LLM response (handles markdown code blocks)
 */
export function extractJson(response: string): string | null {
  // Try markdown code block first (```json ... ```)
  const jsonBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }

  // Try to find JSON object directly
  const objectMatch = response.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    // Validate it looks like complete JSON
    try {
      JSON.parse(objectMatch[0]);
      return objectMatch[0];
    } catch {
      // Not valid JSON, continue
    }
  }

  // Try to find JSON array directly
  const arrayMatch = response.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      JSON.parse(arrayMatch[0]);
      return arrayMatch[0];
    } catch {
      // Not valid JSON
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════════════════════════════

export interface ParseOptions {
  maxRetries?: number;
  onRetry?: (_attempt: number, _error: ParseError) => Promise<string>;
}

/**
 * Parse and validate LLM response against a Zod schema
 */
export async function parseLLMResponse<T>(
  rawResponse: string,
  schema: z.Schema<T>,
  options: ParseOptions = {}
): Promise<Result<T, ParseError>> {
  const { maxRetries = 0, onRetry } = options;
  let lastError: ParseError | null = null;
  let currentResponse = rawResponse;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Step 1: Extract JSON
    const jsonStr = extractJson(currentResponse);
    if (!jsonStr) {
      lastError = {
        type: 'EXTRACTION_FAILED',
        message: 'Could not find JSON in LLM response',
        rawResponse: currentResponse,
      };

      if (attempt < maxRetries && onRetry) {
        currentResponse = await onRetry(attempt + 1, lastError);
        continue;
      }
      return err(lastError);
    }

    // Step 2: Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      lastError = {
        type: 'INVALID_JSON',
        message: `JSON parse error: ${e instanceof Error ? e.message : 'Unknown'}`,
        rawResponse: currentResponse,
      };

      if (attempt < maxRetries && onRetry) {
        currentResponse = await onRetry(attempt + 1, lastError);
        continue;
      }
      return err(lastError);
    }

    // Step 3: Validate against schema
    const result = schema.safeParse(parsed);
    if (!result.success) {
      lastError = {
        type: 'SCHEMA_VALIDATION',
        message: `Schema validation failed: ${result.error.message}`,
        rawResponse: currentResponse,
        validationErrors: result.error,
      };

      if (attempt < maxRetries && onRetry) {
        currentResponse = await onRetry(attempt + 1, lastError);
        continue;
      }
      return err(lastError);
    }

    return ok(result.data);
  }

  return err(lastError!);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITIONS FOR LLM RESPONSES
// ═══════════════════════════════════════════════════════════════════════════

// SCoT Plan Response Schema
export const SCoTAtomicStepSchema = z.object({
  action: z.string(),
  target: z.string().optional(),
  value: z.string().optional(),
  assertion: z.string().optional(),
});

export const SCoTConditionSchema = z.object({
  element: z.string().optional(),
  state: z.enum(['visible', 'hidden', 'enabled', 'disabled', 'exists', 'checked', 'unchecked']),
  negate: z.boolean().optional(),
});

export const SCoTIteratorSchema = z.object({
  variable: z.string(),
  collection: z.string(),
  maxIterations: z.number().optional(),
});

export const SCoTStructureSchema = z.object({
  type: z.enum(['sequential', 'branch', 'loop']),
  description: z.string(),
  steps: z.array(SCoTAtomicStepSchema).optional(),
  condition: SCoTConditionSchema.optional(),
  thenBranch: z.array(SCoTAtomicStepSchema).optional(),
  elseBranch: z.array(SCoTAtomicStepSchema).optional(),
  iterator: SCoTIteratorSchema.optional(),
  body: z.array(SCoTAtomicStepSchema).optional(),
});

export const SCoTPlanResponseSchema = z.object({
  reasoning: z.string().min(1),
  confidence: z.number().min(0).max(1),
  plan: z.array(SCoTStructureSchema),
  warnings: z.array(z.string()).default([]),
});

// Error Analysis Response Schema
export const SuggestedApproachSchema = z.object({
  name: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  requiredChanges: z.array(z.string()),
});

export const ErrorAnalysisResponseSchema = z.object({
  rootCause: z.string().min(1),
  confidence: z.number().min(0).max(1),
  suggestedApproaches: z.array(SuggestedApproachSchema).min(1),
});

// Code Fix Response Schema
export const CodeChangeSchema = z.object({
  type: z.enum(['replace', 'insert', 'delete']),
  lineStart: z.number(),
  lineEnd: z.number().optional(),
  explanation: z.string(),
});

export const CodeFixResponseSchema = z.object({
  fixedCode: z.string().min(1),
  changes: z.array(CodeChangeSchema),
  explanation: z.string(),
});

// Type exports
export type SCoTPlanResponse = z.infer<typeof SCoTPlanResponseSchema>;
export type ErrorAnalysisResponse = z.infer<typeof ErrorAnalysisResponseSchema>;
export type CodeFixResponse = z.infer<typeof CodeFixResponseSchema>;
export type SuggestedApproach = z.infer<typeof SuggestedApproachSchema>;
