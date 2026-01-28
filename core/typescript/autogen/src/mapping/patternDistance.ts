/**
 * Pattern distance calculation for finding nearest matching patterns
 */

import type { StepPattern } from './patterns.js';

/**
 * Extended pattern definition with examples for distance calculation
 */
export interface PatternDefinition extends StepPattern {
  examples?: string[];
  requiredKeywords?: string[];
}

export interface NearestPatternResult {
  name: string;
  distance: number;
  exampleMatch: string;
  mismatchReason: string;
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1,     // insertion
          matrix[i - 1]![j]! + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/**
 * Calculate normalized similarity between two strings (0-1)
 */
export function calculateSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}

/**
 * Extract example text from a regex pattern
 * This is a heuristic - it tries to create a plausible example from the regex
 */
function generateExampleFromRegex(regex: RegExp, patternName: string): string {
  // Reserved for future regex-based example generation
  void regex.source;

  // Navigation patterns
  if (patternName.includes('navigate')) {
    return 'User navigates to /path';
  }

  // Click patterns
  if (patternName.includes('click')) {
    return 'User clicks "Button" button';
  }

  // Fill patterns
  if (patternName.includes('fill') || patternName.includes('enter') || patternName.includes('type')) {
    return 'User enters "value" in "Field" field';
  }

  // Assertion patterns
  if (patternName.includes('see') || patternName.includes('visible') || patternName.includes('expect')) {
    return 'User should see "Content"';
  }

  // Wait patterns
  if (patternName.includes('wait')) {
    return 'Wait for network idle';
  }

  // Generic fallback
  return `Step matching ${patternName}`;
}

/**
 * Find the nearest pattern for a given step text
 */
export function findNearestPattern(
  text: string,
  patterns: Map<string, PatternDefinition> | StepPattern[]
): NearestPatternResult | null {
  let nearest: NearestPatternResult | null = null;
  let minDistance = Infinity;

  const normalizedText = text.toLowerCase().trim();

  // Convert to array if it's a Map
  const patternArray: Array<[string, PatternDefinition | StepPattern]> =
    patterns instanceof Map
      ? Array.from(patterns.entries())
      : patterns.map(p => [p.name, p] as [string, PatternDefinition | StepPattern]);

  for (const [name, pattern] of patternArray) {
    // Get examples - either from PatternDefinition or generate from regex
    const examples = 'examples' in pattern && pattern.examples
      ? pattern.examples
      : [generateExampleFromRegex(pattern.regex, pattern.name)];

    // Compare against pattern examples
    for (const example of examples) {
      const distance = levenshteinDistance(normalizedText, example.toLowerCase());
      if (distance < minDistance) {
        minDistance = distance;
        nearest = {
          name,
          distance,
          exampleMatch: example,
          mismatchReason: explainMismatch(text, pattern),
        };
      }
    }
  }

  // Only return if similarity is above threshold (> 50%)
  if (nearest && nearest.exampleMatch) {
    const similarity = calculateSimilarity(text, nearest.exampleMatch);
    if (similarity > 0.5) {
      return nearest;
    }
  }

  return nearest;
}

/**
 * Explain why a pattern didn't match
 */
export function explainMismatch(text: string, pattern: StepPattern | PatternDefinition): string {
  const reasons: string[] = [];
  const lowerText = text.toLowerCase();

  // Check for missing keywords based on pattern type
  const requiredKeywords = 'requiredKeywords' in pattern
    ? pattern.requiredKeywords
    : inferRequiredKeywords(pattern);

  if (requiredKeywords) {
    const missing = requiredKeywords.filter(
      kw => !lowerText.includes(kw.toLowerCase())
    );
    if (missing.length > 0) {
      reasons.push(`Missing keywords: ${missing.join(', ')}`);
    }
  }

  // Check for missing locator hints
  if (!text.includes('(') && !text.includes('testid=') && !text.includes('role=')) {
    reasons.push('Missing locator hint (e.g., testid=..., role=button)');
  }

  // Check for ambiguous target based on pattern type
  if (pattern.primitiveType === 'click' && !text.match(/['"].+?['"]/)) {
    reasons.push('Target element name not quoted');
  }

  return reasons.length > 0 ? reasons.join('; ') : 'Pattern format mismatch';
}

/**
 * Infer required keywords from a pattern
 */
function inferRequiredKeywords(pattern: StepPattern): string[] | undefined {
  const name = pattern.name.toLowerCase();

  if (name.includes('navigate')) {
    return ['navigate', 'go', 'open'];
  }

  if (name.includes('click')) {
    return ['click', 'press', 'tap'];
  }

  if (name.includes('fill') || name.includes('enter')) {
    return ['enter', 'type', 'fill', 'input'];
  }

  if (name.includes('see') || name.includes('visible')) {
    return ['see', 'visible', 'shown'];
  }

  if (name.includes('wait')) {
    return ['wait'];
  }

  return undefined;
}
