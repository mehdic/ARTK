/**
 * @module uncertainty/pattern-matcher
 * @description Match generated code against known patterns from LLKB/glossary
 */

import {
  PatternMatchResult,
  MatchedPattern,
  UnmatchedElement,
  DimensionScore,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface PatternDefinition {
  id: string;
  name: string;
  category: PatternCategory;
  patterns: RegExp[];
  confidence: number;
  source: 'glossary' | 'llkb' | 'builtin';
}

export type PatternCategory =
  | 'navigation'
  | 'interaction'
  | 'assertion'
  | 'wait'
  | 'form'
  | 'authentication'
  | 'data'
  | 'utility';

// Built-in patterns for common Playwright operations
const BUILTIN_PATTERNS: PatternDefinition[] = [
  // Navigation patterns
  {
    id: 'nav-goto',
    name: 'Page Navigation',
    category: 'navigation',
    patterns: [/page\.goto\s*\(/],
    confidence: 0.95,
    source: 'builtin',
  },
  {
    id: 'nav-reload',
    name: 'Page Reload',
    category: 'navigation',
    patterns: [/page\.reload\s*\(/],
    confidence: 0.95,
    source: 'builtin',
  },
  {
    id: 'nav-back',
    name: 'Navigate Back',
    category: 'navigation',
    patterns: [/page\.goBack\s*\(/, /page\.goForward\s*\(/],
    confidence: 0.95,
    source: 'builtin',
  },

  // Interaction patterns
  {
    id: 'click-locator',
    name: 'Locator Click',
    category: 'interaction',
    patterns: [/\.click\s*\(\s*\)/, /locator\([^)]+\)\.click/],
    confidence: 0.9,
    source: 'builtin',
  },
  {
    id: 'fill-locator',
    name: 'Locator Fill',
    category: 'interaction',
    patterns: [/\.fill\s*\([^)]+\)/, /locator\([^)]+\)\.fill/],
    confidence: 0.9,
    source: 'builtin',
  },
  {
    id: 'type-locator',
    name: 'Locator Type',
    category: 'interaction',
    patterns: [/\.pressSequentially\s*\(/, /\.type\s*\(/],
    confidence: 0.85,
    source: 'builtin',
  },
  {
    id: 'select-option',
    name: 'Select Option',
    category: 'interaction',
    patterns: [/\.selectOption\s*\(/],
    confidence: 0.9,
    source: 'builtin',
  },
  {
    id: 'check-uncheck',
    name: 'Checkbox Toggle',
    category: 'interaction',
    patterns: [/\.check\s*\(\s*\)/, /\.uncheck\s*\(\s*\)/, /\.setChecked\s*\(/],
    confidence: 0.9,
    source: 'builtin',
  },
  {
    id: 'hover',
    name: 'Hover Action',
    category: 'interaction',
    patterns: [/\.hover\s*\(\s*\)/],
    confidence: 0.9,
    source: 'builtin',
  },
  {
    id: 'focus',
    name: 'Focus Element',
    category: 'interaction',
    patterns: [/\.focus\s*\(\s*\)/],
    confidence: 0.9,
    source: 'builtin',
  },
  {
    id: 'keyboard',
    name: 'Keyboard Action',
    category: 'interaction',
    patterns: [/\.press\s*\(['"]/, /keyboard\.press\s*\(/],
    confidence: 0.85,
    source: 'builtin',
  },

  // Assertion patterns
  {
    id: 'expect-visible',
    name: 'Visibility Assertion',
    category: 'assertion',
    patterns: [/expect\([^)]+\)\.toBeVisible/, /expect\([^)]+\)\.toBeHidden/],
    confidence: 0.95,
    source: 'builtin',
  },
  {
    id: 'expect-text',
    name: 'Text Assertion',
    category: 'assertion',
    patterns: [/expect\([^)]+\)\.toHaveText/, /expect\([^)]+\)\.toContainText/],
    confidence: 0.9,
    source: 'builtin',
  },
  {
    id: 'expect-value',
    name: 'Value Assertion',
    category: 'assertion',
    patterns: [/expect\([^)]+\)\.toHaveValue/],
    confidence: 0.9,
    source: 'builtin',
  },
  {
    id: 'expect-url',
    name: 'URL Assertion',
    category: 'assertion',
    patterns: [/expect\(page\)\.toHaveURL/],
    confidence: 0.95,
    source: 'builtin',
  },
  {
    id: 'expect-title',
    name: 'Title Assertion',
    category: 'assertion',
    patterns: [/expect\(page\)\.toHaveTitle/],
    confidence: 0.95,
    source: 'builtin',
  },
  {
    id: 'expect-count',
    name: 'Count Assertion',
    category: 'assertion',
    patterns: [/expect\([^)]+\)\.toHaveCount/],
    confidence: 0.9,
    source: 'builtin',
  },
  {
    id: 'expect-enabled',
    name: 'Enabled State Assertion',
    category: 'assertion',
    patterns: [/expect\([^)]+\)\.toBeEnabled/, /expect\([^)]+\)\.toBeDisabled/],
    confidence: 0.9,
    source: 'builtin',
  },
  {
    id: 'expect-checked',
    name: 'Checked State Assertion',
    category: 'assertion',
    patterns: [/expect\([^)]+\)\.toBeChecked/],
    confidence: 0.9,
    source: 'builtin',
  },

  // Wait patterns
  {
    id: 'wait-selector',
    name: 'Wait for Selector',
    category: 'wait',
    patterns: [/\.waitFor\s*\(\s*\{/, /locator\.waitFor/],
    confidence: 0.85,
    source: 'builtin',
  },
  {
    id: 'wait-load-state',
    name: 'Wait for Load State',
    category: 'wait',
    patterns: [/page\.waitForLoadState\s*\(/],
    confidence: 0.9,
    source: 'builtin',
  },
  {
    id: 'wait-response',
    name: 'Wait for Response',
    category: 'wait',
    patterns: [/page\.waitForResponse\s*\(/],
    confidence: 0.9,
    source: 'builtin',
  },
  {
    id: 'wait-request',
    name: 'Wait for Request',
    category: 'wait',
    patterns: [/page\.waitForRequest\s*\(/],
    confidence: 0.9,
    source: 'builtin',
  },

  // Form patterns
  {
    id: 'form-submit',
    name: 'Form Submit',
    category: 'form',
    patterns: [/getByRole\(['"]button['"].*submit/i, /type=['"]submit['"]/],
    confidence: 0.85,
    source: 'builtin',
  },

  // Data patterns
  {
    id: 'table-row',
    name: 'Table Row Access',
    category: 'data',
    patterns: [/getByRole\(['"]row['"]/, /locator\(['"]tr['"]\)/],
    confidence: 0.85,
    source: 'builtin',
  },
  {
    id: 'table-cell',
    name: 'Table Cell Access',
    category: 'data',
    patterns: [/getByRole\(['"]cell['"]/, /locator\(['"]td['"]\)/],
    confidence: 0.85,
    source: 'builtin',
  },

  // Utility patterns
  {
    id: 'screenshot',
    name: 'Screenshot',
    category: 'utility',
    patterns: [/page\.screenshot\s*\(/],
    confidence: 0.95,
    source: 'builtin',
  },
  {
    id: 'test-step',
    name: 'Test Step',
    category: 'utility',
    patterns: [/test\.step\s*\(/],
    confidence: 0.95,
    source: 'builtin',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN MATCHER
// ═══════════════════════════════════════════════════════════════════════════

export interface PatternMatcherOptions {
  customPatterns?: PatternDefinition[];
  llkbPatterns?: PatternDefinition[];
  includeBuiltins?: boolean;
  minConfidence?: number;
}

/**
 * Match code against known patterns
 */
export function matchPatterns(
  code: string,
  options: PatternMatcherOptions = {}
): PatternMatchResult {
  const {
    customPatterns = [],
    llkbPatterns = [],
    includeBuiltins = true,
    minConfidence = 0.5,
  } = options;

  // Combine all patterns
  const allPatterns = [
    ...(includeBuiltins ? BUILTIN_PATTERNS : []),
    ...customPatterns,
    ...llkbPatterns,
  ];

  const matchedPatterns: MatchedPattern[] = [];
  const matchedLineRanges = new Set<string>();

  // Find matches for each pattern
  for (const pattern of allPatterns) {
    for (const regex of pattern.patterns) {
      const globalRegex = new RegExp(regex.source, 'gm');
      let match: RegExpExecArray | null;

      while ((match = globalRegex.exec(code)) !== null) {
        const startLine = code.substring(0, match.index).split('\n').length;
        const endLine = startLine; // Most patterns are single-line

        const lineRange = `${startLine}-${endLine}`;
        if (!matchedLineRanges.has(`${pattern.id}:${lineRange}`)) {
          matchedLineRanges.add(`${pattern.id}:${lineRange}`);

          matchedPatterns.push({
            patternId: pattern.id,
            patternName: pattern.name,
            confidence: pattern.confidence,
            codeLocation: { startLine, endLine },
            source: pattern.source,
          });
        }
      }
    }
  }

  // Find unmatched elements (potential issues)
  const unmatchedElements = findUnmatchedElements(code, matchedPatterns, allPatterns);

  // Calculate scores
  const noveltyScore = calculateNoveltyScore(matchedPatterns, allPatterns);
  const consistencyScore = calculateConsistencyScore(matchedPatterns);
  const overallScore = calculatePatternScore(
    matchedPatterns,
    unmatchedElements,
    noveltyScore,
    consistencyScore,
    minConfidence
  );

  return {
    score: overallScore,
    matchedPatterns,
    unmatchedElements,
    noveltyScore,
    consistencyScore,
  };
}

/**
 * Create a dimension score from pattern matching
 */
export function createPatternDimensionScore(result: PatternMatchResult): DimensionScore {
  const subScores = [
    {
      name: 'Pattern Coverage',
      score: Math.min(1, result.matchedPatterns.length / 10),
      details: `${result.matchedPatterns.length} patterns matched`,
    },
    {
      name: 'Novelty',
      score: result.noveltyScore,
      details: `Novelty score: ${Math.round(result.noveltyScore * 100)}%`,
    },
    {
      name: 'Consistency',
      score: result.consistencyScore,
      details: `Consistency score: ${Math.round(result.consistencyScore * 100)}%`,
    },
    {
      name: 'Unmatched Risk',
      score: Math.max(0, 1 - result.unmatchedElements.length * 0.2),
      details: `${result.unmatchedElements.length} unmatched elements`,
    },
  ];

  const reasoning = generatePatternReasoning(result);

  return {
    dimension: 'pattern',
    score: result.score,
    weight: 0.25,
    reasoning,
    subScores,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UNMATCHED ELEMENT DETECTION
// ═══════════════════════════════════════════════════════════════════════════

function findUnmatchedElements(
  code: string,
  matchedPatterns: MatchedPattern[],
  allPatterns: PatternDefinition[]
): UnmatchedElement[] {
  const unmatched: UnmatchedElement[] = [];

  // Look for potential action calls that weren't matched
  const actionPatterns = [
    { regex: /page\.(\w+)\s*\(/g, type: 'page method' },
    { regex: /locator\([^)]+\)\.(\w+)\s*\(/g, type: 'locator method' },
    { regex: /getBy\w+\([^)]+\)\.(\w+)\s*\(/g, type: 'locator method' },
    { regex: /expect\([^)]+\)\.(\w+)/g, type: 'assertion' },
  ];

  for (const actionPattern of actionPatterns) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(actionPattern.regex.source, 'g');

    while ((match = regex.exec(code)) !== null) {
      const methodName = match[1];
      const lineNum = code.substring(0, match.index).split('\n').length;

      // Check if this is covered by any matched pattern
      const isCovered = matchedPatterns.some(p =>
        p.codeLocation.startLine <= lineNum && p.codeLocation.endLine >= lineNum
      );

      if (!isCovered) {
        // Find suggested patterns
        const suggestions = findSuggestedPatterns(methodName, allPatterns);

        unmatched.push({
          element: `${actionPattern.type}: ${methodName}`,
          reason: 'No matching pattern found',
          suggestedPatterns: suggestions,
          riskLevel: determineRiskLevel(methodName),
        });
      }
    }
  }

  // Deduplicate by element name
  const seen = new Set<string>();
  return unmatched.filter(u => {
    if (seen.has(u.element)) return false;
    seen.add(u.element);
    return true;
  });
}

function findSuggestedPatterns(methodName: string, patterns: PatternDefinition[]): string[] {
  const suggestions: string[] = [];

  // Find patterns that might be similar
  for (const pattern of patterns) {
    const patternText = pattern.patterns.map(p => p.source).join(' ');
    if (patternText.toLowerCase().includes(methodName.toLowerCase())) {
      suggestions.push(pattern.name);
    }
  }

  return suggestions.slice(0, 3);
}

function determineRiskLevel(methodName: string): 'low' | 'medium' | 'high' {
  const highRiskMethods = ['evaluate', 'evaluateHandle', 'addScriptTag', 'setContent'];
  const mediumRiskMethods = ['waitForTimeout', 'waitForFunction', 'route', 'unroute'];

  if (highRiskMethods.includes(methodName)) return 'high';
  if (mediumRiskMethods.includes(methodName)) return 'medium';
  return 'low';
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

function calculateNoveltyScore(
  matchedPatterns: MatchedPattern[],
  _allPatterns: PatternDefinition[]
): number {
  if (matchedPatterns.length === 0) return 0.5; // Neutral if no patterns

  // Higher novelty = more LLKB patterns used (shows learning)
  const llkbCount = matchedPatterns.filter(p => p.source === 'llkb').length;
  const glossaryCount = matchedPatterns.filter(p => p.source === 'glossary').length;
  // builtinCount not used in scoring formula - LLKB/glossary patterns rewarded

  // Reward using learned patterns while not penalizing builtins
  const total = matchedPatterns.length;
  const learnedRatio = (llkbCount + glossaryCount) / total;

  // Score: base 0.5 + up to 0.5 for learned patterns
  return 0.5 + learnedRatio * 0.5;
}

function calculateConsistencyScore(matchedPatterns: MatchedPattern[]): number {
  if (matchedPatterns.length < 2) return 1.0; // Single pattern is consistent

  // Check for consistent selector strategies
  const categories = matchedPatterns.map(p => {
    const pattern = BUILTIN_PATTERNS.find(bp => bp.id === p.patternId);
    return pattern?.category || 'unknown';
  });

  // Count category transitions (inconsistency indicator)
  let transitions = 0;
  for (let i = 1; i < categories.length; i++) {
    if (categories[i] !== categories[i - 1]) {
      transitions++;
    }
  }

  // More transitions = potentially less consistent (but not always bad)
  const transitionRatio = transitions / (categories.length - 1);

  // Score: 1.0 for few transitions, down to 0.6 for many
  return Math.max(0.6, 1 - transitionRatio * 0.4);
}

function calculatePatternScore(
  matchedPatterns: MatchedPattern[],
  unmatchedElements: UnmatchedElement[],
  noveltyScore: number,
  consistencyScore: number,
  _minConfidence: number // Reserved for future confidence filtering
): number {
  // Base score from pattern matches
  const avgConfidence = matchedPatterns.length > 0
    ? matchedPatterns.reduce((sum, p) => sum + p.confidence, 0) / matchedPatterns.length
    : 0.5;

  // Penalty for unmatched high-risk elements
  const highRiskCount = unmatchedElements.filter(u => u.riskLevel === 'high').length;
  const mediumRiskCount = unmatchedElements.filter(u => u.riskLevel === 'medium').length;
  const riskPenalty = highRiskCount * 0.15 + mediumRiskCount * 0.05;

  // Combine scores
  let score = (
    avgConfidence * 0.4 +
    noveltyScore * 0.2 +
    consistencyScore * 0.2 +
    (1 - riskPenalty) * 0.2
  );

  // Ensure minimum coverage
  if (matchedPatterns.length < 3) {
    score *= 0.8; // Penalty for too few patterns
  }

  return Math.max(0, Math.min(1, score));
}

function generatePatternReasoning(result: PatternMatchResult): string {
  const reasons: string[] = [];

  const patternCount = result.matchedPatterns.length;
  if (patternCount === 0) {
    reasons.push('No recognized patterns found');
  } else if (patternCount < 5) {
    reasons.push(`${patternCount} patterns matched (low coverage)`);
  } else {
    reasons.push(`${patternCount} patterns matched`);
  }

  // Count by source
  const llkbCount = result.matchedPatterns.filter(p => p.source === 'llkb').length;
  if (llkbCount > 0) {
    reasons.push(`${llkbCount} LLKB patterns used`);
  }

  // Unmatched warnings
  const highRisk = result.unmatchedElements.filter(u => u.riskLevel === 'high');
  if (highRisk.length > 0) {
    reasons.push(`${highRisk.length} high-risk unmatched elements`);
  }

  // Consistency
  if (result.consistencyScore < 0.7) {
    reasons.push('Pattern usage inconsistent');
  }

  return reasons.join('; ');
}

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN ANALYSIS HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get pattern categories used in code
 */
export function getPatternCategories(
  matchedPatterns: MatchedPattern[]
): Record<PatternCategory, number> {
  const categories: Record<PatternCategory, number> = {
    navigation: 0,
    interaction: 0,
    assertion: 0,
    wait: 0,
    form: 0,
    authentication: 0,
    data: 0,
    utility: 0,
  };

  for (const matched of matchedPatterns) {
    const pattern = BUILTIN_PATTERNS.find(p => p.id === matched.patternId);
    if (pattern) {
      categories[pattern.category]++;
    }
  }

  return categories;
}

/**
 * Check if code has minimum required patterns
 */
export function hasMinimumPatterns(
  matchedPatterns: MatchedPattern[],
  requirements: Partial<Record<PatternCategory, number>>
): boolean {
  const categories = getPatternCategories(matchedPatterns);

  for (const [category, minCount] of Object.entries(requirements)) {
    if (categories[category as PatternCategory] < minCount) {
      return false;
    }
  }

  return true;
}

/**
 * Get all built-in patterns (for external use)
 */
export function getBuiltinPatterns(): PatternDefinition[] {
  return [...BUILTIN_PATTERNS];
}
