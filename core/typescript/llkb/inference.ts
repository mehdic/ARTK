/**
 * Category Inference for LLKB
 *
 * Infers the category of code patterns based on keywords and patterns.
 *
 * @module llkb/inference
 */

import type { LLKBCategory, ComponentCategory } from './types.js';

/**
 * Keyword patterns for each category
 */
const CATEGORY_PATTERNS: Record<ComponentCategory, string[]> = {
  navigation: [
    'goto',
    'navigate',
    'route',
    'url',
    'path',
    'sidebar',
    'menu',
    'breadcrumb',
    'nav',
    'link',
    'href',
    'router',
  ],
  auth: [
    'login',
    'logout',
    'auth',
    'password',
    'credential',
    'session',
    'token',
    'user',
    'signin',
    'signout',
    'authenticate',
    'authorization',
  ],
  assertion: [
    'expect',
    'assert',
    'verify',
    'should',
    'tobevisible',
    'tohavetext',
    'tobehidden',
    'tocontain',
    'tohaveattribute',
    'tobeenabled',
    'tobedisabled',
    'tohavevalue',
  ],
  data: [
    'api',
    'fetch',
    'response',
    'request',
    'json',
    'payload',
    'data',
    'post',
    'get',
    'put',
    'delete',
    'endpoint',
    'graphql',
    'rest',
  ],
  selector: [
    'locator',
    'getby',
    'selector',
    'testid',
    'data-testid',
    'queryselector',
    'findby',
    'getbyrole',
    'getbylabel',
    'getbytext',
    'getbyplaceholder',
  ],
  timing: [
    'wait',
    'timeout',
    'delay',
    'sleep',
    'settimeout',
    'poll',
    'retry',
    'interval',
    'waitfor',
    'waituntil',
  ],
  'ui-interaction': [
    'click',
    'fill',
    'type',
    'select',
    'check',
    'uncheck',
    'upload',
    'drag',
    'drop',
    'hover',
    'focus',
    'blur',
    'press',
    'scroll',
    'dblclick',
  ],
};

/**
 * Priority order for category matching
 * Higher priority categories are checked first
 */
const CATEGORY_PRIORITY: ComponentCategory[] = [
  'auth', // Auth patterns are distinctive
  'navigation', // Navigation patterns are common
  'assertion', // Assertions are easy to identify
  'data', // Data/API patterns
  'timing', // Wait patterns
  'selector', // Selector patterns
  'ui-interaction', // Default fallback for UI ops
];

/**
 * Infer the category of a code pattern
 *
 * Analyzes the code for keywords associated with each category
 * and returns the best matching category.
 *
 * @param code - The code to analyze
 * @returns The inferred category
 *
 * @example
 * ```typescript
 * inferCategory(`await page.goto('/login')`); // 'navigation'
 * inferCategory(`expect(toast).toBeVisible()`); // 'assertion'
 * inferCategory(`await page.click('#submit')`); // 'ui-interaction'
 * ```
 */
export function inferCategory(code: string): ComponentCategory {
  const codeLower = code.toLowerCase();

  // Check each category in priority order
  for (const category of CATEGORY_PRIORITY) {
    const patterns = CATEGORY_PATTERNS[category];

    if (patterns !== undefined) {
      for (const pattern of patterns) {
        if (codeLower.includes(pattern)) {
          return category;
        }
      }
    }
  }

  // Default to ui-interaction for unclassified patterns
  return 'ui-interaction';
}

/**
 * Infer category with confidence score
 *
 * Returns both the category and a confidence score based on
 * how many matching keywords were found.
 *
 * @param code - The code to analyze
 * @returns Object with category and confidence
 *
 * @example
 * ```typescript
 * inferCategoryWithConfidence(`await page.goto('/login'); await expect(page).toHaveURL('/login');`);
 * // { category: 'navigation', confidence: 0.8, matchCount: 2 }
 * ```
 */
export function inferCategoryWithConfidence(code: string): {
  category: ComponentCategory;
  confidence: number;
  matchCount: number;
} {
  const codeLower = code.toLowerCase();
  const categoryMatches: Map<ComponentCategory, number> = new Map();

  // Count matches for each category
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    let matchCount = 0;
    for (const pattern of patterns) {
      if (codeLower.includes(pattern)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      categoryMatches.set(category as ComponentCategory, matchCount);
    }
  }

  // Find the category with most matches
  let bestCategory: ComponentCategory = 'ui-interaction';
  let maxMatches = 0;

  for (const [category, count] of categoryMatches) {
    if (count > maxMatches) {
      maxMatches = count;
      bestCategory = category;
    }
  }

  // Calculate confidence based on match density
  // More matches = higher confidence, capped at 1.0
  const totalPatterns = CATEGORY_PATTERNS[bestCategory]?.length ?? 1;
  const confidence = Math.min(maxMatches / Math.min(totalPatterns, 5), 1.0);

  return {
    category: bestCategory,
    confidence: Math.round(confidence * 100) / 100,
    matchCount: maxMatches,
  };
}

/**
 * Check if a category is valid for components
 *
 * 'quirk' is a lesson-only category and cannot be used for components.
 *
 * @param category - The category to check
 * @returns true if valid for components
 */
export function isComponentCategory(category: LLKBCategory): category is ComponentCategory {
  return category !== 'quirk';
}

/**
 * Get all valid categories
 *
 * @returns Array of all valid category names
 */
export function getAllCategories(): LLKBCategory[] {
  return [
    'selector',
    'timing',
    'quirk',
    'auth',
    'data',
    'assertion',
    'navigation',
    'ui-interaction',
  ];
}

/**
 * Get all valid component categories
 *
 * @returns Array of valid component category names
 */
export function getComponentCategories(): ComponentCategory[] {
  return [
    'selector',
    'timing',
    'auth',
    'data',
    'assertion',
    'navigation',
    'ui-interaction',
  ];
}
