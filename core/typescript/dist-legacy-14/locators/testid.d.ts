/**
 * Test ID locator utilities with custom attribute support
 *
 * Implements FR-019: Custom test ID attribute configuration
 *
 * Provides flexible test ID locator resolution that supports:
 * - Primary test ID attribute (default: 'data-testid')
 * - Multiple custom test ID attributes
 * - Fallback mechanism across configured attributes
 *
 * @module locators/testid
 */
import type { Locator, Page } from '@playwright/test';
import type { LocatorFactoryConfig } from './types.js';
/**
 * Locate element by test ID using configured attribute
 *
 * Tries primary testIdAttribute first, then falls back to customTestIds
 * if configured. Returns first matching element.
 *
 * @param page - Playwright Page object
 * @param testId - Test ID value to locate
 * @param config - Locator factory configuration
 * @returns Locator for the element
 *
 * @example
 * ```ts
 * const config = {
 *   testIdAttribute: 'data-testid',
 *   customTestIds: ['data-test', 'data-qa'],
 *   strategies: ['testid', 'role']
 * };
 *
 * // Tries: [data-testid="submit"], [data-test="submit"], [data-qa="submit"]
 * const button = byTestId(page, 'submit', config);
 * ```
 */
export declare function byTestId(page: Page, testId: string, config: LocatorFactoryConfig): Locator;
/**
 * Check if element has test ID using any configured attribute
 *
 * Useful for validating element presence or debugging locator issues.
 *
 * @param locator - Playwright Locator to check
 * @param testId - Expected test ID value
 * @param config - Locator factory configuration
 * @returns Promise resolving to true if element has the test ID
 *
 * @example
 * ```ts
 * const button = page.locator('button').first();
 * const hasTestId = await hasTestIdAttribute(button, 'submit', config);
 * ```
 */
export declare function hasTestIdAttribute(locator: Locator, testId: string, config: LocatorFactoryConfig): Promise<boolean>;
/**
 * Get test ID value from element using any configured attribute
 *
 * Returns the first test ID value found, checking attributes in order:
 * 1. Primary testIdAttribute
 * 2. Custom test ID attributes (if configured)
 *
 * @param locator - Playwright Locator to inspect
 * @param config - Locator factory configuration
 * @returns Promise resolving to test ID value or null if not found
 *
 * @example
 * ```ts
 * const button = page.locator('button').first();
 * const testId = await getTestIdValue(button, config);
 * console.log(`Button test ID: ${testId}`);
 * ```
 */
export declare function getTestIdValue(locator: Locator, config: LocatorFactoryConfig): Promise<string | null>;
/**
 * Create test ID selector string for use in CSS selectors
 *
 * Generates attribute selector for primary test ID attribute.
 * Useful for combining with other CSS selectors.
 *
 * @param testId - Test ID value
 * @param config - Locator factory configuration
 * @returns CSS attribute selector string
 *
 * @example
 * ```ts
 * const selector = createTestIdSelector('submit', config);
 * // Returns: '[data-testid="submit"]'
 *
 * const complexSelector = `form ${selector}`;
 * // Use in page.locator(complexSelector)
 * ```
 */
export declare function createTestIdSelector(testId: string, config: LocatorFactoryConfig): string;
/**
 * Create combined test ID selector matching any configured attribute
 *
 * Generates CSS selector that matches test ID on any configured attribute.
 * Useful for exhaustive matching when test ID attribute might vary.
 *
 * @param testId - Test ID value
 * @param config - Locator factory configuration
 * @returns CSS selector matching any configured test ID attribute
 *
 * @example
 * ```ts
 * const selector = createCombinedTestIdSelector('submit', {
 *   testIdAttribute: 'data-testid',
 *   customTestIds: ['data-test', 'data-qa'],
 *   strategies: ['testid']
 * });
 * // Returns: '[data-testid="submit"], [data-test="submit"], [data-qa="submit"]'
 * ```
 */
export declare function createCombinedTestIdSelector(testId: string, config: LocatorFactoryConfig): string;
//# sourceMappingURL=testid.d.ts.map