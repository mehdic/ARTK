/**
 * Journey format validation for AutoGen compatibility
 */

import * as fs from 'fs';

export interface ValidationError {
  line: number;
  step: string;
  error: string;
  suggestion?: string;
}

export interface ValidationWarning {
  line: number;
  step: string;
  warning: string;
}

export interface AutoFixSuggestion {
  line: number;
  original: string;
  fixed: string;
  confidence: number;
}

export interface JourneyValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  autoFixable: AutoFixSuggestion[];
  summary: {
    totalSteps: number;
    validSteps: number;
    stepsWithHints: number;
    stepsWithoutHints: number;
  };
}

interface ParsedStep {
  line: number;
  text: string;
  rawLine: string;
}

/**
 * Parse steps from journey markdown content
 */
export function parseStepsFromContent(content: string): ParsedStep[] {
  const steps: ParsedStep[] = [];
  const lines = content.split('\n');

  let inStepsSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNumber = i + 1;

    // Detect steps section headers
    if (line.match(/^##?\s*(?:steps|procedure|execution)/i)) {
      inStepsSection = true;
      continue;
    }

    // Exit steps section at next major heading
    if (inStepsSection && line.match(/^##?\s+[A-Z]/)) {
      inStepsSection = false;
      continue;
    }

    // Parse step lines (numbered or bulleted)
    if (inStepsSection || line.match(/^\d+\.\s+\*\*(?:Action|Assert|Wait)/i)) {
      const stepMatch = line.match(/^(?:\d+\.\s*|-\s*|\*\s*)(?:\*\*\w+\*\*:\s*)?(.+)$/);
      if (stepMatch?.[1]) {
        const stepText = stepMatch[1].trim();
        if (stepText && !stepText.startsWith('#') && stepText.length > 3) {
          steps.push({
            line: lineNumber,
            text: stepText,
            rawLine: line,
          });
        }
      }
    }
  }

  return steps;
}

/**
 * Check if step has machine hints (locator hints)
 */
export function hasMachineHints(text: string): boolean {
  // Check for backtick-enclosed hints
  if (text.includes('`(') && text.includes(')`')) {
    return true;
  }

  // Check for common locator patterns
  const locatorPatterns = [
    /\brole\s*=\s*/i,
    /\btestid\s*=\s*/i,
    /\bdata-testid\s*=\s*/i,
    /\bname\s*=\s*/i,
    /\btext\s*=\s*/i,
    /\bsignal\s*=\s*/i,
  ];

  return locatorPatterns.some(pattern => pattern.test(text));
}

/**
 * Check if step uses structured format (**Action**: ..., **Assert**: ...)
 */
export function isStructuredFormat(text: string): boolean {
  return /^\*\*(?:Action|Assert|Wait(?:\s+for)?)\*\*:/i.test(text);
}

/**
 * Get suggestion for fixing a step
 */
export function getSuggestionForStep(step: string): string | undefined {
  const lowerStep = step.toLowerCase();

  // Click patterns
  if (lowerStep.includes('click')) {
    const buttonMatch = step.match(/['"]([^'"]+)['"]/);
    const buttonName = buttonMatch?.[1] || 'Button';
    return `User clicks '${buttonName}' button \`(role=button, name=${buttonName})\``;
  }

  // Fill/Enter patterns
  if (lowerStep.includes('fill') || lowerStep.includes('enter') || lowerStep.includes('type')) {
    const fieldMatch = step.match(/['"]([^'"]+)['"]/);
    const fieldName = fieldMatch?.[1] || 'Field';
    return `User enters 'value' in '${fieldName}' field \`(role=textbox, name=${fieldName})\``;
  }

  // Navigate patterns
  if (lowerStep.includes('navigate') || lowerStep.includes('go to')) {
    const pathMatch = step.match(/\/[a-zA-Z0-9/_-]+/);
    const path = pathMatch?.[0] || '/path';
    return `User navigates to ${path}`;
  }

  // Visibility assertions
  if (lowerStep.includes('see') || lowerStep.includes('visible') || lowerStep.includes('verify')) {
    const textMatch = step.match(/['"]([^'"]+)['"]/);
    const text = textMatch?.[1] || 'content';
    return `User should see '${text}' \`(text=${text})\``;
  }

  return undefined;
}

/**
 * Attempt to auto-fix a step to be AutoGen compatible
 */
export function attemptAutoFix(step: string): AutoFixSuggestion | null {
  const lowerStep = step.toLowerCase();

  // Already has hints - no fix needed
  if (hasMachineHints(step)) {
    return null;
  }

  // Try to extract element name and generate hint
  const quotedMatch = step.match(/['"]([^'"]+)['"]/);
  if (!quotedMatch) {
    return null; // Can't auto-fix without element name
  }

  const elementName = quotedMatch[1];
  let fixed = step;
  let confidence = 0.7;

  // Click steps
  if (lowerStep.includes('click')) {
    if (lowerStep.includes('button')) {
      fixed = step.replace(quotedMatch[0], `'${elementName}' button \`(role=button, name=${elementName})\``);
      confidence = 0.9;
    } else if (lowerStep.includes('link')) {
      fixed = step.replace(quotedMatch[0], `'${elementName}' link \`(role=link, name=${elementName})\``);
      confidence = 0.9;
    } else {
      fixed = `${step} \`(role=button, name=${elementName})\``;
      confidence = 0.7;
    }
    return { line: 0, original: step, fixed, confidence };
  }

  // Input steps
  if (lowerStep.includes('enter') || lowerStep.includes('fill') || lowerStep.includes('type')) {
    fixed = `${step} \`(role=textbox, name=${elementName})\``;
    confidence = 0.8;
    return { line: 0, original: step, fixed, confidence };
  }

  // Assertion steps
  if (lowerStep.includes('see') || lowerStep.includes('visible')) {
    fixed = `${step} \`(text=${elementName})\``;
    confidence = 0.75;
    return { line: 0, original: step, fixed, confidence };
  }

  return null;
}

/**
 * Validate journey format for AutoGen compatibility
 */
export function validateJourneyFormat(journeyContent: string): JourneyValidationResult {
  const result: JourneyValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    autoFixable: [],
    summary: {
      totalSteps: 0,
      validSteps: 0,
      stepsWithHints: 0,
      stepsWithoutHints: 0,
    },
  };

  const steps = parseStepsFromContent(journeyContent);
  result.summary.totalSteps = steps.length;

  for (const step of steps) {
    // Check for machine hints
    const hasHints = hasMachineHints(step.text);
    if (hasHints) {
      result.summary.stepsWithHints++;
    } else {
      result.summary.stepsWithoutHints++;
      result.warnings.push({
        line: step.line,
        step: step.text,
        warning: 'Step has no machine hints (role=, testid=, name=)',
      });
    }

    // Check if step appears to be AutoGen-compatible
    const isInteraction = /\b(click|fill|enter|type|select|check)\b/i.test(step.text);
    const isAssertion = /\b(see|visible|verify|assert|should|expect)\b/i.test(step.text);
    const isNavigation = /\b(navigate|go to|open|visit)\b/i.test(step.text);
    const isWait = /\b(wait|load|until)\b/i.test(step.text);

    if (isInteraction && !hasHints) {
      result.errors.push({
        line: step.line,
        step: step.text,
        error: 'Interaction step missing locator hint',
        suggestion: getSuggestionForStep(step.text),
      });
      result.valid = false;

      // Try auto-fix
      const autoFix = attemptAutoFix(step.text);
      if (autoFix && autoFix.confidence > 0.7) {
        result.autoFixable.push({
          ...autoFix,
          line: step.line,
        });
      }
    }

    // Count valid steps
    if (hasHints || isNavigation || isWait || (!isInteraction && !isAssertion)) {
      result.summary.validSteps++;
    }
  }

  return result;
}

/**
 * Apply auto-fixes to journey content
 */
export function applyAutoFixes(
  content: string,
  fixes: AutoFixSuggestion[]
): string {
  const lines = content.split('\n');

  // Sort fixes by line number in reverse order to avoid line number shifts
  const sortedFixes = [...fixes].sort((a, b) => b.line - a.line);

  for (const fix of sortedFixes) {
    const lineIndex = fix.line - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
      lines[lineIndex] = lines[lineIndex]!.replace(fix.original, fix.fixed);
    }
  }

  return lines.join('\n');
}

/**
 * Format validation result for console output
 */
export function formatValidationResult(result: JourneyValidationResult): string {
  const lines: string[] = [];
  const icon = result.valid ? '✅' : '❌';

  lines.push(`${icon} Journey Format Validation`);
  lines.push('═'.repeat(40));

  lines.push('');
  lines.push('Summary:');
  lines.push(`  Total steps: ${result.summary.totalSteps}`);
  lines.push(`  Valid steps: ${result.summary.validSteps}`);
  lines.push(`  With hints: ${result.summary.stepsWithHints}`);
  lines.push(`  Without hints: ${result.summary.stepsWithoutHints}`);

  if (result.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const error of result.errors) {
      lines.push(`  Line ${error.line}: ${error.step}`);
      lines.push(`    ❌ ${error.error}`);
      if (error.suggestion) {
        lines.push(`    💡 Suggestion: ${error.suggestion}`);
      }
    }
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings.slice(0, 5)) {
      lines.push(`  Line ${warning.line}: ${warning.step}`);
      lines.push(`    ⚠️ ${warning.warning}`);
    }
    if (result.warnings.length > 5) {
      lines.push(`  ... and ${result.warnings.length - 5} more warnings`);
    }
  }

  if (result.autoFixable.length > 0) {
    lines.push('');
    lines.push('Auto-fixable issues:');
    for (const fix of result.autoFixable) {
      lines.push(`  Line ${fix.line}: (${(fix.confidence * 100).toFixed(0)}% confidence)`);
      lines.push(`    Before: ${fix.original}`);
      lines.push(`    After:  ${fix.fixed}`);
    }
  }

  lines.push('');
  if (result.valid) {
    lines.push('✅ Journey is AutoGen-compatible');
  } else {
    lines.push(`❌ Journey has ${result.errors.length} errors that need fixing`);
  }

  return lines.join('\n');
}

/**
 * Validate a journey file
 */
export function validateJourneyFile(filePath: string): JourneyValidationResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  return validateJourneyFormat(content);
}
