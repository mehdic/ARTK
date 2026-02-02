/**
 * @module uncertainty/selector-analyzer
 * @description Analyze selector quality and stability
 */

import {
  SelectorAnalysisResult,
  SelectorInfo,
  SelectorStrategy,
  SelectorRecommendation,
  DimensionScore,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// SELECTOR PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

interface SelectorPattern {
  strategy: SelectorStrategy;
  pattern: RegExp;
  stabilityScore: number;
  accessibilityBonus: number;
}

const SELECTOR_PATTERNS: SelectorPattern[] = [
  // Test ID selectors (most stable)
  {
    strategy: 'testId',
    pattern: /getByTestId\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 1.0,
    accessibilityBonus: 0,
  },
  {
    strategy: 'testId',
    pattern: /locator\s*\(\s*['"]\[data-testid=['"]?([^'"\]]+)['"]?\]['"]\s*\)/g,
    stabilityScore: 0.95,
    accessibilityBonus: 0,
  },

  // Role selectors (stable + accessible)
  {
    strategy: 'role',
    pattern: /getByRole\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*\{[^}]*\})?\s*\)/g,
    stabilityScore: 0.9,
    accessibilityBonus: 0.2,
  },

  // Label selectors (stable + accessible)
  {
    strategy: 'label',
    pattern: /getByLabel\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.85,
    accessibilityBonus: 0.15,
  },
  {
    strategy: 'label',
    pattern: /getByLabelText\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.85,
    accessibilityBonus: 0.15,
  },

  // Placeholder selectors (moderately stable)
  {
    strategy: 'placeholder',
    pattern: /getByPlaceholder\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.75,
    accessibilityBonus: 0,
  },

  // Text selectors (less stable due to content changes)
  {
    strategy: 'text',
    pattern: /getByText\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.65,
    accessibilityBonus: 0.05,
  },
  {
    strategy: 'text',
    pattern: /getByText\s*\(\s*\/([^/]+)\/[a-z]*\s*\)/g,
    stabilityScore: 0.6, // Regex text is slightly less stable
    accessibilityBonus: 0.05,
  },

  // Title selectors
  {
    strategy: 'title',
    pattern: /getByTitle\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.7,
    accessibilityBonus: 0.1,
  },

  // Alt text selectors
  {
    strategy: 'altText',
    pattern: /getByAltText\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.75,
    accessibilityBonus: 0.15,
  },

  // CSS selectors (fragile)
  {
    strategy: 'css',
    pattern: /locator\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.5,
    accessibilityBonus: 0,
  },

  // XPath selectors (most fragile)
  {
    strategy: 'xpath',
    pattern: /locator\s*\(\s*['"]xpath=([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.3,
    accessibilityBonus: 0,
  },
  {
    strategy: 'xpath',
    pattern: /locator\s*\(\s*['"]\/\/([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.3,
    accessibilityBonus: 0,
  },

  // nth selectors (order-dependent, fragile)
  {
    strategy: 'nth',
    pattern: /\.nth\s*\(\s*(\d+)\s*\)/g,
    stabilityScore: 0.4,
    accessibilityBonus: 0,
  },
  {
    strategy: 'nth',
    pattern: /\.first\s*\(\s*\)/g,
    stabilityScore: 0.45,
    accessibilityBonus: 0,
  },
  {
    strategy: 'nth',
    pattern: /\.last\s*\(\s*\)/g,
    stabilityScore: 0.45,
    accessibilityBonus: 0,
  },

  // Chained selectors
  {
    strategy: 'chain',
    pattern: /locator\([^)]+\)\s*\.\s*locator\s*\(/g,
    stabilityScore: 0.55,
    accessibilityBonus: 0,
  },
];

// Fragility indicators
const FRAGILITY_INDICATORS = [
  { pattern: /\[class[*^$~|]?=['"][^'"]*['"]\]/i, reason: 'Class-based selector (may change)' },
  { pattern: /\[id[*^$~|]?=['"][^'"]*['"]\]/i, reason: 'ID-based selector (may be dynamic)' },
  { pattern: /:nth-child\(\d+\)/i, reason: 'Position-based selector' },
  { pattern: /:nth-of-type\(\d+\)/i, reason: 'Position-based selector' },
  { pattern: /\s>\s/g, reason: 'Direct child combinator (structure-sensitive)' },
  { pattern: /\s+\s/g, reason: 'Descendant combinator (structure-sensitive)' },
  { pattern: /\[style[*^$~|]?=/i, reason: 'Style-based selector (highly volatile)' },
  { pattern: /\.btn-[a-z]+/i, reason: 'Framework-specific class (may change)' },
  { pattern: /\.col-[a-z0-9-]+/i, reason: 'Grid class (layout-dependent)' },
  { pattern: /auto-generated|generated-id|uuid|guid/i, reason: 'Contains generated ID pattern' },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ANALYZER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze selectors in generated code
 */
export function analyzeSelectors(code: string): SelectorAnalysisResult {
  const selectors: SelectorInfo[] = [];
  const strategyDistribution: Record<SelectorStrategy, number> = {
    testId: 0,
    role: 0,
    text: 0,
    label: 0,
    placeholder: 0,
    title: 0,
    altText: 0,
    css: 0,
    xpath: 0,
    nth: 0,
    chain: 0,
  };

  // Extract all selectors
  for (const selectorPattern of SELECTOR_PATTERNS) {
    const regex = new RegExp(selectorPattern.pattern.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(code)) !== null) {
      const selector = match[0];
      const lineNum = code.substring(0, match.index).split('\n').length;

      // Analyze fragility
      const fragilityReasons = analyzeSelectorFragility(selector);
      const isFragile = fragilityReasons.length > 0;

      // Calculate specificity
      const specificity = calculateSpecificity(selector, selectorPattern.strategy);

      // Adjust stability for fragility
      let stabilityScore = selectorPattern.stabilityScore;
      if (isFragile) {
        stabilityScore *= (1 - fragilityReasons.length * 0.1);
      }

      selectors.push({
        selector,
        strategy: selectorPattern.strategy,
        stabilityScore: Math.max(0, stabilityScore),
        specificity,
        hasTestId: selectorPattern.strategy === 'testId',
        usesRole: selectorPattern.strategy === 'role',
        isFragile,
        fragilityReasons,
        line: lineNum,
      });

      strategyDistribution[selectorPattern.strategy]++;
    }
  }

  // Calculate scores
  const stabilityScore = calculateOverallStability(selectors);
  const accessibilityScore = calculateAccessibilityScore(selectors);

  // Generate recommendations
  const recommendations = generateRecommendations(selectors);

  // Calculate overall score
  const overallScore = calculateSelectorScore(
    selectors,
    stabilityScore,
    accessibilityScore,
    strategyDistribution
  );

  return {
    score: overallScore,
    selectors,
    strategyDistribution,
    stabilityScore,
    accessibilityScore,
    recommendations,
  };
}

/**
 * Create a dimension score from selector analysis
 */
export function createSelectorDimensionScore(result: SelectorAnalysisResult): DimensionScore {
  const subScores = [
    {
      name: 'Stability',
      score: result.stabilityScore,
      details: `Stability: ${Math.round(result.stabilityScore * 100)}%`,
    },
    {
      name: 'Accessibility',
      score: result.accessibilityScore,
      details: `A11y: ${Math.round(result.accessibilityScore * 100)}%`,
    },
    {
      name: 'TestId Usage',
      score: calculateTestIdRatio(result.strategyDistribution),
      details: `TestId: ${result.strategyDistribution.testId} selectors`,
    },
    {
      name: 'Fragility',
      score: calculateFragilityScore(result.selectors),
      details: `${result.selectors.filter(s => s.isFragile).length} fragile selectors`,
    },
  ];

  const reasoning = generateSelectorReasoning(result);

  return {
    dimension: 'selector',
    score: result.score,
    weight: 0.30,
    reasoning,
    subScores,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FRAGILITY ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

function analyzeSelectorFragility(selector: string): string[] {
  const reasons: string[] = [];

  for (const indicator of FRAGILITY_INDICATORS) {
    if (indicator.pattern.test(selector)) {
      reasons.push(indicator.reason);
    }
  }

  // Check for very long selectors (usually fragile)
  if (selector.length > 100) {
    reasons.push('Very long selector (likely over-specified)');
  }

  // Check for multiple combinators
  const combinatorCount = (selector.match(/[>\s+~]/g) || []).length;
  if (combinatorCount > 3) {
    reasons.push('Too many combinators (deep nesting)');
  }

  return reasons;
}

function calculateSpecificity(selector: string, strategy: SelectorStrategy): number {
  // Simplified specificity calculation
  switch (strategy) {
    case 'testId':
      return 1.0; // Most specific and intentional
    case 'role':
      return 0.9; // Very specific
    case 'label':
    case 'altText':
      return 0.85;
    case 'placeholder':
    case 'title':
      return 0.8;
    case 'text':
      return 0.7;
    case 'css':
      // CSS specificity varies
      const idCount = (selector.match(/#/g) || []).length;
      const classCount = (selector.match(/\./g) || []).length;
      return Math.min(1, 0.3 + idCount * 0.3 + classCount * 0.1);
    case 'xpath':
      return 0.4; // XPath is usually less specific
    case 'nth':
      return 0.3; // Position-based is not semantic
    case 'chain':
      return 0.5; // Depends on the chain
    default:
      return 0.5;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

function calculateOverallStability(selectors: SelectorInfo[]): number {
  if (selectors.length === 0) return 0.5;

  const totalStability = selectors.reduce((sum, s) => sum + s.stabilityScore, 0);
  return totalStability / selectors.length;
}

function calculateAccessibilityScore(selectors: SelectorInfo[]): number {
  if (selectors.length === 0) return 0.5;

  // Strategies that use accessibility attributes
  const accessibleStrategies: SelectorStrategy[] = ['role', 'label', 'altText', 'title'];

  const accessibleCount = selectors.filter(s =>
    accessibleStrategies.includes(s.strategy)
  ).length;

  return accessibleCount / selectors.length;
}

function calculateTestIdRatio(distribution: Record<SelectorStrategy, number>): number {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;
  return distribution.testId / total;
}

function calculateFragilityScore(selectors: SelectorInfo[]): number {
  if (selectors.length === 0) return 1.0;

  const fragileCount = selectors.filter(s => s.isFragile).length;
  return 1 - (fragileCount / selectors.length);
}

function calculateSelectorScore(
  selectors: SelectorInfo[],
  stabilityScore: number,
  accessibilityScore: number,
  distribution: Record<SelectorStrategy, number>
): number {
  if (selectors.length === 0) return 0.5; // Neutral if no selectors

  // Weight factors
  const weights = {
    stability: 0.4,
    accessibility: 0.2,
    testIdUsage: 0.25,
    fragility: 0.15,
  };

  const testIdRatio = calculateTestIdRatio(distribution);
  const fragilityScore = calculateFragilityScore(selectors);

  let score =
    stabilityScore * weights.stability +
    accessibilityScore * weights.accessibility +
    testIdRatio * weights.testIdUsage +
    fragilityScore * weights.fragility;

  // Penalize for overuse of fragile strategies
  const fragileStrategyCount = distribution.css + distribution.xpath + distribution.nth;
  const total = Object.values(distribution).reduce((sum, c) => sum + c, 0);
  if (total > 0 && fragileStrategyCount / total > 0.5) {
    score *= 0.8; // 20% penalty for >50% fragile selectors
  }

  return Math.max(0, Math.min(1, score));
}

// ═══════════════════════════════════════════════════════════════════════════
// RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════

function generateRecommendations(selectors: SelectorInfo[]): SelectorRecommendation[] {
  const recommendations: SelectorRecommendation[] = [];

  for (const selector of selectors) {
    // Recommend upgrading CSS/XPath to better strategies
    if (selector.strategy === 'css' || selector.strategy === 'xpath') {
      recommendations.push({
        selector: selector.selector,
        currentStrategy: selector.strategy,
        suggestedStrategy: 'testId',
        reason: 'CSS/XPath selectors are fragile. Add data-testid to element.',
        priority: 'high',
      });
    }

    // Recommend upgrading nth selectors
    if (selector.strategy === 'nth') {
      recommendations.push({
        selector: selector.selector,
        currentStrategy: selector.strategy,
        suggestedStrategy: 'role',
        reason: 'Position-based selectors break when order changes. Use role with name.',
        priority: 'medium',
      });
    }

    // Recommend adding testId to fragile selectors
    if (selector.isFragile && selector.strategy !== 'testId') {
      recommendations.push({
        selector: selector.selector,
        currentStrategy: selector.strategy,
        suggestedStrategy: 'testId',
        reason: `Fragile selector: ${selector.fragilityReasons.join(', ')}`,
        priority: 'high',
      });
    }

    // Suggest role for better accessibility
    if (selector.strategy === 'text' && !selector.usesRole) {
      recommendations.push({
        selector: selector.selector,
        currentStrategy: selector.strategy,
        suggestedStrategy: 'role',
        reason: 'Text selectors break on content changes. Use role for stability.',
        priority: 'low',
      });
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations.slice(0, 10); // Limit to top 10
}

function generateSelectorReasoning(result: SelectorAnalysisResult): string {
  const reasons: string[] = [];

  if (result.selectors.length === 0) {
    return 'No selectors found in code';
  }

  // Strategy distribution
  const totalSelectors = result.selectors.length;
  const testIdCount = result.strategyDistribution.testId;
  const roleCount = result.strategyDistribution.role;
  const fragileCount = result.strategyDistribution.css +
    result.strategyDistribution.xpath +
    result.strategyDistribution.nth;

  if (testIdCount > totalSelectors * 0.5) {
    reasons.push('Good test-id coverage');
  } else if (testIdCount < totalSelectors * 0.2) {
    reasons.push('Low test-id usage');
  }

  if (roleCount > 0) {
    reasons.push(`${roleCount} role-based selectors (accessible)`);
  }

  if (fragileCount > totalSelectors * 0.3) {
    reasons.push(`${fragileCount} fragile selectors (CSS/XPath/nth)`);
  }

  // Fragility issues
  const fragileSelectors = result.selectors.filter(s => s.isFragile);
  if (fragileSelectors.length > 0) {
    reasons.push(`${fragileSelectors.length} selectors with fragility issues`);
  }

  // Overall assessment
  if (result.stabilityScore > 0.8) {
    reasons.push('High stability');
  } else if (result.stabilityScore < 0.5) {
    reasons.push('Low stability');
  }

  return reasons.join('; ');
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Quick check if code uses recommended selector strategies
 */
export function usesRecommendedSelectors(code: string): boolean {
  const hasTestId = /getByTestId|data-testid/.test(code);
  const hasRole = /getByRole/.test(code);

  return hasTestId || hasRole;
}

/**
 * Get selector strategy from code snippet
 */
export function identifyStrategy(selectorCode: string): SelectorStrategy {
  for (const pattern of SELECTOR_PATTERNS) {
    if (new RegExp(pattern.pattern.source).test(selectorCode)) {
      return pattern.strategy;
    }
  }
  return 'css'; // Default fallback
}

/**
 * Check if selector is likely fragile
 */
export function isSelectorFragile(selector: string): boolean {
  return analyzeSelectorFragility(selector).length > 0;
}
