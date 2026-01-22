/**
 * Category Inference for LLKB
 *
 * Infers the category of code patterns based on keywords and patterns.
 *
 * @module llkb/inference
 */
import type { LLKBCategory, ComponentCategory } from './types.js';
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
export declare function inferCategory(code: string): ComponentCategory;
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
export declare function inferCategoryWithConfidence(code: string): {
    category: ComponentCategory;
    confidence: number;
    matchCount: number;
};
/**
 * Check if a category is valid for components
 *
 * 'quirk' is a lesson-only category and cannot be used for components.
 *
 * @param category - The category to check
 * @returns true if valid for components
 */
export declare function isComponentCategory(category: LLKBCategory): category is ComponentCategory;
/**
 * Get all valid categories
 *
 * @returns Array of all valid category names
 */
export declare function getAllCategories(): LLKBCategory[];
/**
 * Get all valid component categories
 *
 * @returns Array of valid component category names
 */
export declare function getComponentCategories(): ComponentCategory[];
//# sourceMappingURL=inference.d.ts.map