/**
 * Enhanced analysis of blocked steps for AI-assisted fixing
 */

import { findNearestPattern, type NearestPatternResult, type PatternDefinition } from './patternDistance.js';
import type { StepPattern } from './patterns.js';

export type StepCategory = 'navigation' | 'interaction' | 'assertion' | 'wait' | 'unknown';

export interface StepSuggestion {
  priority: number;
  text: string;
  explanation: string;
  confidence: number;
}

export interface BlockedStepAnalysis {
  step: string;
  reason: string;
  suggestions: StepSuggestion[];
  nearestPattern?: NearestPatternResult;
  machineHintSuggestion?: string;
  category: StepCategory;
}

/**
 * Categorize a step based on its text
 */
export function categorizeStep(text: string): StepCategory {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('navigate') || lowerText.includes('go to') ||
      lowerText.includes('open') || lowerText.includes('visit')) {
    return 'navigation';
  }

  if (lowerText.includes('click') || lowerText.includes('fill') ||
      lowerText.includes('enter') || lowerText.includes('type') ||
      lowerText.includes('select') || lowerText.includes('check') ||
      lowerText.includes('press')) {
    return 'interaction';
  }

  if (lowerText.includes('see') || lowerText.includes('visible') ||
      lowerText.includes('verify') || lowerText.includes('assert') ||
      lowerText.includes('confirm') || lowerText.includes('should') ||
      lowerText.includes('expect')) {
    return 'assertion';
  }

  if (lowerText.includes('wait') || lowerText.includes('load') ||
      lowerText.includes('until') || lowerText.includes('appear')) {
    return 'wait';
  }

  return 'unknown';
}

/**
 * Infer a machine hint from step text
 */
export function inferMachineHint(text: string): string | undefined {
  const lowerText = text.toLowerCase();

  // Extract element name from quotes
  const quotedMatch = text.match(/['"]([^'"]+)['"]/);
  const elementName = quotedMatch?.[1];

  if (!elementName) return undefined;

  // Suggest hint based on context (check more specific terms first)
  if (lowerText.includes('link')) {
    return `(role=link, name=${elementName})`;
  }

  if (lowerText.includes('button') || lowerText.includes('click')) {
    return `(role=button, name=${elementName})`;
  }

  if (lowerText.includes('field') || lowerText.includes('input') ||
      lowerText.includes('enter') || lowerText.includes('type')) {
    return `(role=textbox, name=${elementName})`;
  }

  if (lowerText.includes('heading')) {
    return `(role=heading, name=${elementName})`;
  }

  if (lowerText.includes('checkbox')) {
    return `(role=checkbox, name=${elementName})`;
  }

  return `(text=${elementName})`;
}

/**
 * Get suggestions for navigation steps
 */
export function getNavigationSuggestions(text: string): StepSuggestion[] {
  const suggestions: StepSuggestion[] = [];
  const urlMatch = text.match(/\/[a-zA-Z0-9/_-]+/);

  if (urlMatch) {
    suggestions.push({
      priority: 1,
      text: `User navigates to ${urlMatch[0]}`,
      explanation: 'Standard navigation pattern',
      confidence: 0.9,
    });
  } else {
    suggestions.push({
      priority: 1,
      text: 'User navigates to /[path]',
      explanation: 'Add explicit URL path',
      confidence: 0.5,
    });
  }

  return suggestions;
}

/**
 * Get suggestions for interaction steps
 */
export function getInteractionSuggestions(text: string): StepSuggestion[] {
  const suggestions: StepSuggestion[] = [];
  const quotedMatch = text.match(/['"]([^'"]+)['"]/);
  const elementName = quotedMatch?.[1] || '[element]';
  const lowerText = text.toLowerCase();

  if (lowerText.includes('click')) {
    suggestions.push({
      priority: 1,
      text: `User clicks '${elementName}' button \`(role=button, name=${elementName})\``,
      explanation: 'Add role=button locator hint',
      confidence: 0.85,
    });
  }

  if (lowerText.includes('fill') || lowerText.includes('enter') ||
      lowerText.includes('type')) {
    // Try to extract value being entered
    const valueMatch = text.match(/['"]([^'"]+)['"]/);
    const value = valueMatch?.[1] || 'value';
    suggestions.push({
      priority: 1,
      text: `User enters '${value}' in '${elementName}' field \`(role=textbox, name=${elementName})\``,
      explanation: 'Add role=textbox locator hint',
      confidence: 0.85,
    });
  }

  return suggestions;
}

/**
 * Get suggestions for assertion steps
 */
export function getAssertionSuggestions(text: string): StepSuggestion[] {
  const suggestions: StepSuggestion[] = [];
  const quotedMatch = text.match(/['"]([^'"]+)['"]/);
  const content = quotedMatch?.[1] || '[content]';

  suggestions.push({
    priority: 1,
    text: `User should see '${content}' \`(text=${content})\``,
    explanation: 'Standard visibility assertion',
    confidence: 0.8,
  });

  suggestions.push({
    priority: 2,
    text: `**Assert**: '${content}' is visible \`(role=heading, name=${content})\``,
    explanation: 'Structured assertion format with heading role',
    confidence: 0.7,
  });

  return suggestions;
}

/**
 * Get suggestions for wait steps
 */
export function getWaitSuggestions(text: string): StepSuggestion[] {
  const suggestions: StepSuggestion[] = [];

  suggestions.push({
    priority: 1,
    text: 'Wait for network idle `(signal=networkidle)`',
    explanation: 'Standard network wait pattern',
    confidence: 0.8,
  });

  suggestions.push({
    priority: 2,
    text: 'Wait for page to load `(signal=load)`',
    explanation: 'Wait for load event',
    confidence: 0.7,
  });

  return suggestions;
}

/**
 * Get generic suggestions for unknown step categories
 */
export function getGenericSuggestions(text: string): StepSuggestion[] {
  return [{
    priority: 1,
    text: `**Action**: ${text}`,
    explanation: 'Use structured format with Action prefix',
    confidence: 0.5,
  }];
}

/**
 * Analyze a blocked step and generate suggestions
 */
export function analyzeBlockedStep(
  step: string,
  reason: string,
  patterns?: Map<string, PatternDefinition> | StepPattern[]
): BlockedStepAnalysis {
  const category = categorizeStep(step);

  const analysis: BlockedStepAnalysis = {
    step,
    reason,
    suggestions: [],
    category,
  };

  // Find nearest pattern if patterns provided
  if (patterns) {
    const nearest = findNearestPattern(step, patterns);
    if (nearest) {
      analysis.nearestPattern = nearest;
    }
  }

  // Generate category-specific suggestions
  switch (category) {
    case 'navigation':
      analysis.suggestions = getNavigationSuggestions(step);
      break;
    case 'interaction':
      analysis.suggestions = getInteractionSuggestions(step);
      analysis.machineHintSuggestion = inferMachineHint(step);
      break;
    case 'assertion':
      analysis.suggestions = getAssertionSuggestions(step);
      break;
    case 'wait':
      analysis.suggestions = getWaitSuggestions(step);
      break;
    default:
      analysis.suggestions = getGenericSuggestions(step);
  }

  return analysis;
}

/**
 * Format a blocked step analysis for console output
 */
export function formatBlockedStepAnalysis(analysis: BlockedStepAnalysis): string {
  const lines: string[] = [];

  lines.push(`\n  Step: "${analysis.step}"`);
  lines.push(`  Category: ${analysis.category}`);
  lines.push(`  Reason: ${analysis.reason}`);

  if (analysis.nearestPattern) {
    lines.push(`  Nearest pattern: ${analysis.nearestPattern.name}`);
    lines.push(`  Example that works: "${analysis.nearestPattern.exampleMatch}"`);
    lines.push(`  Why it didn't match: ${analysis.nearestPattern.mismatchReason}`);
  }

  lines.push('  Suggestions:');
  for (const suggestion of analysis.suggestions) {
    lines.push(`    ${suggestion.priority}. ${suggestion.text}`);
    lines.push(`       (${suggestion.explanation}, confidence: ${(suggestion.confidence * 100).toFixed(0)}%)`);
  }

  if (analysis.machineHintSuggestion) {
    lines.push(`  Suggested hint: ${analysis.machineHintSuggestion}`);
  }

  return lines.join('\n');
}
