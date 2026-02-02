/**
 * @module scot/parser
 * @description Parse LLM output to structured SCoT plan
 */

import { z } from 'zod';
import { Result, ok, err } from '../shared/types.js';
import { parseLLMResponse, SCoTPlanResponseSchema } from '../shared/llm-response-parser.js';
import {
  SCoTPlan,
  SCoTStructure,
  SCoTSequential,
  SCoTBranch,
  SCoTLoop,
  SCoTAtomicStep,
  SCoTPlanMetadata,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// PARSE ERROR
// ═══════════════════════════════════════════════════════════════════════════

export interface SCoTParseError {
  type: 'EXTRACTION_FAILED' | 'INVALID_JSON' | 'SCHEMA_VALIDATION' | 'STRUCTURE_ERROR';
  message: string;
  line?: number;
  rawContent?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// REGEX PATTERNS FOR TEXT PARSING
// ═══════════════════════════════════════════════════════════════════════════

const PATTERNS = {
  SEQUENTIAL: /^SEQUENTIAL:\s*(.+)$/im,
  BRANCH: /^BRANCH:\s*(.+)$/im,
  LOOP: /^LOOP:\s*(.+)$/im,
  IF: /^IF\s+(.+)\s+THEN$/im,
  ELSE: /^ELSE$/im,
  ENDIF: /^ENDIF$/im,
  FOR_EACH: /^FOR\s+EACH\s+(\w+)\s+IN\s+(.+)$/im,
  ENDFOR: /^ENDFOR$/im,
  STEP: /^\s*(\d+[a-z]?)\.\s*(.+)$/m,
  REASONING: /REASONING:\s*([\s\S]*?)(?=CONFIDENCE:|PLAN:|$)/i,
  CONFIDENCE: /CONFIDENCE:\s*([\d.]+)/i,
  WARNINGS: /WARNINGS:\s*([\s\S]*?)$/i,
  ACTION_STEP: /^-\s*(.+)$/m,
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════════════════════════════

export interface ParseOptions {
  journeyId: string;
  llmModel?: string;
  maxRetries?: number;
}

/**
 * Parse SCoT plan from LLM response
 * Tries JSON first, falls back to text parsing
 */
export async function parseSCoTPlan(
  llmResponse: string,
  options: ParseOptions
): Promise<Result<SCoTPlan, SCoTParseError>> {
  const { journeyId, llmModel = 'unknown', maxRetries = 1 } = options;

  // Try JSON parsing first (preferred)
  const jsonResult = await parseLLMResponse(llmResponse, SCoTPlanResponseSchema, {
    maxRetries,
  });

  if (jsonResult.ok) {
    // Normalize the response (ensure warnings is always an array)
    const normalized = {
      ...jsonResult.value,
      warnings: jsonResult.value.warnings ?? [],
    };
    const plan = convertResponseToPlan(normalized, journeyId, llmModel, 'json');
    return ok(plan);
  }

  // Fall back to text parsing
  const textResult = parseTextFormat(llmResponse, journeyId, llmModel);
  return textResult;
}

// ═══════════════════════════════════════════════════════════════════════════
// JSON RESPONSE CONVERTER
// ═══════════════════════════════════════════════════════════════════════════

type SCoTPlanResponse = z.infer<typeof SCoTPlanResponseSchema>;

function convertResponseToPlan(
  response: SCoTPlanResponse,
  journeyId: string,
  llmModel: string,
  method: 'json' | 'text'
): SCoTPlan {
  const structures: SCoTStructure[] = response.plan.map(item => {
    if (item.type === 'sequential') {
      return {
        type: 'sequential',
        description: item.description,
        steps: (item.steps ?? []).map(convertStep),
      } as SCoTSequential;
    } else if (item.type === 'branch') {
      return {
        type: 'branch',
        description: item.description,
        condition: item.condition ?? { state: 'visible' },
        thenBranch: (item.thenBranch ?? []).map(convertStep),
        elseBranch: item.elseBranch?.map(convertStep),
      } as SCoTBranch;
    } else {
      return {
        type: 'loop',
        description: item.description,
        iterator: item.iterator ?? { variable: 'item', collection: 'items' },
        body: (item.body ?? []).map(convertStep),
        maxIterations: item.iterator?.maxIterations,
      } as SCoTLoop;
    }
  });

  const metadata: SCoTPlanMetadata = {
    generatedAt: new Date(),
    llmModel,
    tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
    parseAttempts: 1,
    parsingMethod: method,
  };

  return {
    journeyId,
    structures,
    reasoning: response.reasoning,
    confidence: response.confidence,
    warnings: response.warnings ?? [],
    metadata,
  };
}

function convertStep(step: { action: string; target?: string; value?: string; assertion?: string }): SCoTAtomicStep {
  return {
    action: step.action,
    target: step.target,
    value: step.value,
    assertion: step.assertion,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEXT FORMAT PARSER
// ═══════════════════════════════════════════════════════════════════════════

function parseTextFormat(
  text: string,
  journeyId: string,
  llmModel: string
): Result<SCoTPlan, SCoTParseError> {
  try {
    const reasoning = extractReasoning(text);
    const confidence = extractConfidence(text);
    const warnings = extractWarnings(text);
    const structures = extractStructures(text);

    if (structures.length === 0) {
      return err({
        type: 'STRUCTURE_ERROR',
        message: 'No SEQUENTIAL, BRANCH, or LOOP structures found in response',
        rawContent: text.substring(0, 500),
      });
    }

    const metadata: SCoTPlanMetadata = {
      generatedAt: new Date(),
      llmModel,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
      parseAttempts: 1,
      parsingMethod: 'text',
    };

    return ok({
      journeyId,
      structures,
      reasoning,
      confidence,
      warnings,
      metadata,
    });
  } catch (e) {
    return err({
      type: 'STRUCTURE_ERROR',
      message: e instanceof Error ? e.message : 'Unknown parsing error',
      rawContent: text.substring(0, 500),
    });
  }
}

function extractReasoning(text: string): string {
  const match = text.match(PATTERNS.REASONING);
  return match ? match[1].trim() : '';
}

function extractConfidence(text: string): number {
  const match = text.match(PATTERNS.CONFIDENCE);
  if (match) {
    const value = parseFloat(match[1]);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      return value;
    }
  }
  return 0.5; // Default confidence
}

function extractWarnings(text: string): string[] {
  const match = text.match(PATTERNS.WARNINGS);
  if (!match || match[1].trim().toLowerCase() === 'none') {
    return [];
  }
  return match[1]
    .trim()
    .split('\n')
    .map(w => w.trim())
    .filter(Boolean);
}

function extractStructures(text: string): SCoTStructure[] {
  const structures: SCoTStructure[] = [];
  const lines = text.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Check for SEQUENTIAL
    const seqMatch = line.match(PATTERNS.SEQUENTIAL);
    if (seqMatch) {
      const { structure, endIndex } = parseSequentialBlock(lines, i, seqMatch[1]);
      structures.push(structure);
      i = endIndex + 1;
      continue;
    }

    // Check for BRANCH
    const branchMatch = line.match(PATTERNS.BRANCH);
    if (branchMatch) {
      const { structure, endIndex } = parseBranchBlock(lines, i, branchMatch[1]);
      structures.push(structure);
      i = endIndex + 1;
      continue;
    }

    // Check for LOOP
    const loopMatch = line.match(PATTERNS.LOOP);
    if (loopMatch) {
      const { structure, endIndex } = parseLoopBlock(lines, i, loopMatch[1]);
      structures.push(structure);
      i = endIndex + 1;
      continue;
    }

    i++;
  }

  return structures;
}

function parseSequentialBlock(
  lines: string[],
  startIndex: number,
  description: string
): { structure: SCoTSequential; endIndex: number } {
  const steps: SCoTAtomicStep[] = [];
  let i = startIndex + 1;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Check for end of block (next structure or empty lines followed by structure)
    if (PATTERNS.SEQUENTIAL.test(line) || PATTERNS.BRANCH.test(line) || PATTERNS.LOOP.test(line)) {
      break;
    }

    // Parse numbered step
    const stepMatch = line.match(PATTERNS.STEP);
    if (stepMatch) {
      steps.push(parseStepText(stepMatch[2]));
    }

    // Parse bullet point step
    const bulletMatch = line.match(PATTERNS.ACTION_STEP);
    if (bulletMatch) {
      steps.push(parseStepText(bulletMatch[1]));
    }

    i++;
  }

  return {
    structure: { type: 'sequential', description, steps },
    endIndex: i - 1,
  };
}

function parseBranchBlock(
  lines: string[],
  startIndex: number,
  description: string
): { structure: SCoTBranch; endIndex: number } {
  const thenBranch: SCoTAtomicStep[] = [];
  const elseBranch: SCoTAtomicStep[] = [];
  let condition: { element?: string; state: 'visible' | 'hidden' | 'enabled' | 'disabled' | 'exists' | 'checked' | 'unchecked' } = { state: 'visible' };
  let inElse = false;
  let i = startIndex + 1;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Check for IF condition
    const ifMatch = line.match(PATTERNS.IF);
    if (ifMatch) {
      condition = parseConditionText(ifMatch[1]);
      i++;
      continue;
    }

    // Check for ELSE
    if (PATTERNS.ELSE.test(line)) {
      inElse = true;
      i++;
      continue;
    }

    // Check for ENDIF
    if (PATTERNS.ENDIF.test(line)) {
      break;
    }

    // Check for end of block
    if (PATTERNS.SEQUENTIAL.test(line) || PATTERNS.BRANCH.test(line) || PATTERNS.LOOP.test(line)) {
      break;
    }

    // Parse step
    const bulletMatch = line.match(PATTERNS.ACTION_STEP);
    if (bulletMatch) {
      const step = parseStepText(bulletMatch[1]);
      if (inElse) {
        elseBranch.push(step);
      } else {
        thenBranch.push(step);
      }
    }

    i++;
  }

  return {
    structure: {
      type: 'branch',
      description,
      condition,
      thenBranch,
      elseBranch: elseBranch.length > 0 ? elseBranch : undefined,
    },
    endIndex: i,
  };
}

function parseLoopBlock(
  lines: string[],
  startIndex: number,
  description: string
): { structure: SCoTLoop; endIndex: number } {
  const body: SCoTAtomicStep[] = [];
  let iterator = { variable: 'item', collection: 'items' };
  let i = startIndex + 1;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Check for FOR EACH
    const forMatch = line.match(PATTERNS.FOR_EACH);
    if (forMatch) {
      iterator = { variable: forMatch[1], collection: forMatch[2] };
      i++;
      continue;
    }

    // Check for ENDFOR
    if (PATTERNS.ENDFOR.test(line)) {
      break;
    }

    // Check for end of block
    if (PATTERNS.SEQUENTIAL.test(line) || PATTERNS.BRANCH.test(line) || PATTERNS.LOOP.test(line)) {
      break;
    }

    // Parse step
    const bulletMatch = line.match(PATTERNS.ACTION_STEP);
    if (bulletMatch) {
      body.push(parseStepText(bulletMatch[1]));
    }

    i++;
  }

  return {
    structure: { type: 'loop', description, iterator, body },
    endIndex: i,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP TEXT PARSING
// ═══════════════════════════════════════════════════════════════════════════

function parseStepText(stepText: string): SCoTAtomicStep {
  const lowerText = stepText.toLowerCase();

  // Navigation actions
  if (lowerText.includes('navigate') || lowerText.includes('go to') || lowerText.includes('open')) {
    return { action: 'navigate', target: stepText };
  }

  // Click actions
  if (lowerText.includes('click') || lowerText.includes('press') || lowerText.includes('tap')) {
    return { action: 'click', target: stepText };
  }

  // Fill/input actions
  if (lowerText.includes('fill') || lowerText.includes('enter') || lowerText.includes('type') || lowerText.includes('input')) {
    return { action: 'fill', target: stepText };
  }

  // Select actions
  if (lowerText.includes('select') || lowerText.includes('choose')) {
    return { action: 'select', target: stepText };
  }

  // Check/uncheck actions
  if (lowerText.includes('check') || lowerText.includes('toggle')) {
    return { action: 'check', target: stepText };
  }

  // Wait actions
  if (lowerText.includes('wait')) {
    return { action: 'wait', target: stepText };
  }

  // Assertion actions
  if (lowerText.includes('verify') || lowerText.includes('assert') || lowerText.includes('expect') || lowerText.includes('confirm') || lowerText.includes('should')) {
    return { action: 'assert', assertion: stepText };
  }

  // Default to generic action
  return { action: 'action', target: stepText };
}

function parseConditionText(conditionText: string): { element?: string; state: 'visible' | 'hidden' | 'enabled' | 'disabled' | 'exists' | 'checked' | 'unchecked' } {
  const lowerText = conditionText.toLowerCase();

  let state: 'visible' | 'hidden' | 'enabled' | 'disabled' | 'exists' | 'checked' | 'unchecked' = 'visible';

  if (lowerText.includes('hidden') || lowerText.includes('not visible')) {
    state = 'hidden';
  } else if (lowerText.includes('disabled')) {
    state = 'disabled';
  } else if (lowerText.includes('enabled')) {
    state = 'enabled';
  } else if (lowerText.includes('exists') || lowerText.includes('present')) {
    state = 'exists';
  } else if (lowerText.includes('checked') || lowerText.includes('selected')) {
    state = 'checked';
  } else if (lowerText.includes('unchecked') || lowerText.includes('not selected')) {
    state = 'unchecked';
  }

  return { element: conditionText, state };
}
