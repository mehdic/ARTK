/**
 * Fuzzy Matcher - Tier 4 in the coverage improvement architecture
 * Uses Levenshtein distance with high confidence threshold
 *
 * Coverage Flow: Normalization → Core Patterns → LLKB → Fuzzy → LLM → TODO
 *
 * @see research/2026-02-03_multi-ai-debate-coverage-improvement.md
 */
import { calculateSimilarity } from './patternDistance.js';
import { getCanonicalForm } from './normalize.js';
import { allPatterns, type StepPattern } from './patterns.js';
import type { IRPrimitive } from '../ir/types.js';

/**
 * Fuzzy match configuration
 */
export interface FuzzyMatchConfig {
  /** Minimum similarity threshold (0-1, default: 0.85) */
  minSimilarity?: number;
  /** Use normalized text for comparison (default: true) */
  useNormalization?: boolean;
  /** Maximum candidates to consider (default: 10) */
  maxCandidates?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Fuzzy match result
 */
export interface FuzzyMatchResult {
  /** The matched primitive */
  primitive: IRPrimitive;
  /** The pattern that matched */
  patternName: string;
  /** Similarity score (0-1) */
  similarity: number;
  /** The example that was matched */
  matchedExample: string;
  /** Original input text */
  originalText: string;
  /** Normalized input text */
  normalizedText: string;
}

/**
 * Pattern with examples for fuzzy matching
 */
interface PatternWithExamples {
  pattern: StepPattern;
  examples: string[];
}

/**
 * Generate canonical examples for each pattern type
 */
function getPatternExamples(pattern: StepPattern): string[] {
  const examples: string[] = [];
  const name = pattern.name.toLowerCase();

  // Navigation patterns
  if (name.includes('navigate') || name.includes('goto')) {
    examples.push(
      'navigate to /home',
      'go to /login',
      'open /dashboard',
      'visit the homepage',
      'navigate to the settings page'
    );
  }

  // Click patterns
  if (name.includes('click')) {
    examples.push(
      'click the submit button',
      'click on save',
      'click cancel button',
      'press the login button',
      'tap the menu icon'
    );
  }

  // Fill/Enter patterns
  if (name.includes('fill') || name.includes('enter') || name.includes('type')) {
    examples.push(
      'enter username in the username field',
      'fill password in password field',
      'type hello in the search box',
      'input test@example.com in email field',
      'enter value into the input'
    );
  }

  // See/Verify patterns
  if (name.includes('see') || name.includes('visible') || name.includes('verify')) {
    examples.push(
      'see the welcome message',
      'verify the success message is displayed',
      'confirm the error appears',
      'should see login button',
      'expect the form to be visible'
    );
  }

  // Wait patterns
  if (name.includes('wait')) {
    examples.push(
      'wait for network idle',
      'wait for page to load',
      'wait 3 seconds',
      'wait for the spinner to disappear',
      'wait until the modal closes'
    );
  }

  // Select patterns
  if (name.includes('select')) {
    examples.push(
      'select option 1 from dropdown',
      'choose value from the list',
      'pick an item from menu',
      'select country from country dropdown'
    );
  }

  // Check/Uncheck patterns
  if (name.includes('check')) {
    examples.push(
      'check the checkbox',
      'tick the agreement box',
      'check remember me',
      'uncheck the newsletter option'
    );
  }

  // Upload patterns
  if (name.includes('upload')) {
    examples.push(
      'upload file.pdf',
      'attach document.docx',
      'upload image to the form'
    );
  }

  // Hover patterns
  if (name.includes('hover')) {
    examples.push(
      'hover over the menu',
      'mouse over the dropdown',
      'hover on the button'
    );
  }

  // Scroll patterns
  if (name.includes('scroll')) {
    examples.push(
      'scroll down',
      'scroll to the bottom',
      'scroll to element'
    );
  }

  // Press patterns (keyboard)
  if (name.includes('press')) {
    examples.push(
      'press enter',
      'press tab',
      'press escape key',
      'hit the enter key'
    );
  }

  // Table patterns
  if (name.includes('table') || name.includes('grid')) {
    examples.push(
      'see 5 rows in the table',
      'verify table has data',
      'check grid contains value'
    );
  }

  // Text assertion patterns
  if (name.includes('text') || name.includes('contain')) {
    examples.push(
      'see text welcome back',
      'page contains login form',
      'element has text submit'
    );
  }

  return examples;
}

/**
 * Build pattern examples cache
 */
function buildPatternExamplesCache(): PatternWithExamples[] {
  return allPatterns.map(pattern => ({
    pattern,
    examples: getPatternExamples(pattern),
  }));
}

// Cached pattern examples
let patternExamplesCache: PatternWithExamples[] | null = null;

/**
 * Get or build pattern examples cache
 */
function getPatternExamples_cached(): PatternWithExamples[] {
  if (!patternExamplesCache) {
    patternExamplesCache = buildPatternExamplesCache();
  }
  return patternExamplesCache;
}

/**
 * Find best fuzzy match for step text
 *
 * @param text - Step text to match
 * @param config - Fuzzy match configuration
 * @returns Best match if similarity >= threshold, null otherwise
 */
export function fuzzyMatch(
  text: string,
  config: FuzzyMatchConfig = {}
): FuzzyMatchResult | null {
  const {
    minSimilarity = 0.85,
    useNormalization = true,
    maxCandidates = 10,
    debug = false,
  } = config;

  const trimmedText = text.trim();
  const normalizedText = useNormalization
    ? getCanonicalForm(trimmedText)
    : trimmedText.toLowerCase();

  // Get pattern examples
  const patternsWithExamples = getPatternExamples_cached();

  // Score all candidates
  const candidates: Array<{
    pattern: StepPattern;
    example: string;
    similarity: number;
  }> = [];

  // Track best match for early termination
  let bestSimilarity = 0;

  outer: for (const { pattern, examples } of patternsWithExamples) {
    for (const example of examples) {
      const normalizedExample = useNormalization
        ? getCanonicalForm(example)
        : example.toLowerCase();

      const similarity = calculateSimilarity(normalizedText, normalizedExample);

      if (similarity >= minSimilarity) {
        candidates.push({ pattern, example, similarity });

        // Track best similarity for early termination
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
        }

        // Early termination: if we find a perfect or near-perfect match, stop searching
        if (similarity >= 0.98) {
          break outer;
        }
      }
    }
  }

  // Sort by similarity (descending)
  candidates.sort((a, b) => b.similarity - a.similarity);

  // Take top candidates
  const topCandidates = candidates.slice(0, maxCandidates);

  if (debug && topCandidates.length > 0) {
    console.log(
      `[FuzzyMatcher] Top ${topCandidates.length} candidates for "${trimmedText}":`
    );
    for (const c of topCandidates) {
      console.log(`  ${c.pattern.name}: ${(c.similarity * 100).toFixed(1)}% (vs "${c.example}")`);
    }
  }

  // Return best match if above threshold
  if (topCandidates.length > 0) {
    const best = topCandidates[0]!;

    // Try to extract primitive using the pattern
    const match = trimmedText.match(best.pattern.regex);
    if (match) {
      const primitive = best.pattern.extract(match);
      if (primitive) {
        return {
          primitive,
          patternName: best.pattern.name,
          similarity: best.similarity,
          matchedExample: best.example,
          originalText: trimmedText,
          normalizedText,
        };
      }
    }

    // Pattern didn't extract - try to create a generic primitive
    // based on the pattern type (only for very high confidence)
    if (best.similarity >= 0.90) {
      const genericPrimitive = createGenericPrimitive(best.pattern, trimmedText);
      if (genericPrimitive) {
        if (debug) {
          console.log(
            `[FuzzyMatcher] Created generic primitive for ${best.pattern.name}`
          );
        }
        return {
          primitive: genericPrimitive,
          patternName: `${best.pattern.name}:fuzzy`,
          similarity: best.similarity,
          matchedExample: best.example,
          originalText: trimmedText,
          normalizedText,
        };
      }
    }
  }

  if (debug) {
    console.log(`[FuzzyMatcher] No match above ${minSimilarity * 100}% for "${trimmedText}"`);
  }

  return null;
}

/**
 * Create a generic primitive when pattern extraction fails but similarity is very high
 * Returns properly typed IR primitives that match the schema
 */
function createGenericPrimitive(pattern: StepPattern, text: string): IRPrimitive | null {
  const type = pattern.primitiveType;

  // Extract quoted strings from text
  const quotedStrings = text.match(/["']([^"']+)["']/g)?.map(s => s.slice(1, -1)) || [];
  const targetStr = quotedStrings[0] || extractTarget(text) || 'element';
  const valueStr = quotedStrings[1] || quotedStrings[0] || '';

  // Helper to create a locator from extracted text
  const makeLocator = (value: string) => ({
    strategy: 'text' as const,
    value: value,
  });

  switch (type) {
    case 'click':
    case 'dblclick':
    case 'rightClick':
      return { type, locator: makeLocator(targetStr) };

    case 'fill':
      return {
        type: 'fill',
        locator: makeLocator(targetStr),
        value: { type: 'literal', value: valueStr },
      };

    case 'goto': {
      // Extract URL or path
      const urlMatch = text.match(/(?:to|\/)\s*([\/\w.-]+)/i);
      return {
        type: 'goto',
        url: urlMatch?.[1] || '/',
      };
    }

    case 'waitForTimeout': {
      // Check for time-based wait
      const timeMatch = text.match(/(\d+)\s*(?:second|sec|ms|millisecond)/i);
      if (timeMatch) {
        const amount = parseInt(timeMatch[1]!, 10);
        const unit = text.toLowerCase().includes('ms') ? 'ms' : 's';
        return {
          type: 'waitForTimeout',
          ms: unit === 'ms' ? amount : amount * 1000,
        };
      }
      return { type: 'waitForTimeout', ms: 1000 };
    }

    case 'waitForNetworkIdle':
      return { type: 'waitForNetworkIdle' };

    case 'waitForVisible':
      return { type: 'waitForVisible', locator: makeLocator(targetStr) };

    case 'waitForHidden':
      return { type: 'waitForHidden', locator: makeLocator(targetStr) };

    case 'expectVisible':
    case 'expectNotVisible':
    case 'expectHidden':
      return { type, locator: makeLocator(targetStr) };

    case 'expectText':
      return {
        type: 'expectText',
        locator: makeLocator(targetStr),
        text: valueStr,
      };

    case 'select':
      return {
        type: 'select',
        locator: makeLocator(targetStr),
        option: valueStr,
      };

    case 'hover':
    case 'focus':
    case 'clear':
    case 'check':
    case 'uncheck':
      return { type, locator: makeLocator(targetStr) };

    case 'press': {
      // Extract key name
      const keyMatch = text.match(/(?:press|hit|key)\s+(\w+)/i);
      return {
        type: 'press',
        key: keyMatch?.[1] || 'Enter',
      };
    }

    default:
      // Type doesn't have a direct mapping - return null
      return null;
  }
}

/**
 * Extract potential target from step text
 */
function extractTarget(text: string): string | null {
  // Try to extract target from common patterns
  const patterns = [
    /(?:the|a)\s+["']?(\w+(?:\s+\w+)?)["']?\s+(?:button|field|input|link|element)/i,
    /(?:on|click|tap|press)\s+(?:the\s+)?["']?(\w+(?:\s+\w+)?)["']?/i,
    /(?:in|into)\s+(?:the\s+)?["']?(\w+(?:\s+\w+)?)["']?\s+(?:field|input)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get fuzzy match statistics
 */
export function getFuzzyMatchStats(): {
  patternsWithExamples: number;
  totalExamples: number;
  examplesByType: Record<string, number>;
} {
  const patternsWithExamples = getPatternExamples_cached();

  const examplesByType: Record<string, number> = {};
  let totalExamples = 0;

  for (const { pattern, examples } of patternsWithExamples) {
    const type = pattern.primitiveType;
    examplesByType[type] = (examplesByType[type] || 0) + examples.length;
    totalExamples += examples.length;
  }

  return {
    patternsWithExamples: patternsWithExamples.length,
    totalExamples,
    examplesByType,
  };
}

/**
 * Clear the pattern examples cache (for testing)
 */
export function clearFuzzyMatchCache(): void {
  patternExamplesCache = null;
}
