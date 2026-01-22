"use strict";
/**
 * Category Inference for LLKB
 *
 * Infers the category of code patterns based on keywords and patterns.
 *
 * @module llkb/inference
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferCategory = inferCategory;
exports.inferCategoryWithConfidence = inferCategoryWithConfidence;
exports.isComponentCategory = isComponentCategory;
exports.getAllCategories = getAllCategories;
exports.getComponentCategories = getComponentCategories;
/**
 * Keyword patterns for each category
 */
const CATEGORY_PATTERNS = {
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
const CATEGORY_PRIORITY = [
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
function inferCategory(code) {
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
function inferCategoryWithConfidence(code) {
    const codeLower = code.toLowerCase();
    const categoryMatches = new Map();
    // Count matches for each category
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
        let matchCount = 0;
        for (const pattern of patterns) {
            if (codeLower.includes(pattern)) {
                matchCount++;
            }
        }
        if (matchCount > 0) {
            categoryMatches.set(category, matchCount);
        }
    }
    // Find the category with most matches
    let bestCategory = 'ui-interaction';
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
function isComponentCategory(category) {
    return category !== 'quirk';
}
/**
 * Get all valid categories
 *
 * @returns Array of all valid category names
 */
function getAllCategories() {
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
function getComponentCategories() {
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
//# sourceMappingURL=inference.js.map