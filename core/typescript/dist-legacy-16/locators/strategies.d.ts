/**
 * Locator strategy implementations
 *
 * Implements FR-017: Support for role, label, placeholder, text, CSS strategies
 *
 * Provides accessibility-first locator strategies that prioritize
 * semantic HTML and ARIA attributes over brittle CSS selectors.
 *
 * @module locators/strategies
 */
import type { Locator, Page } from '@playwright/test';
import type { ByRoleOptions } from './types.js';
/**
 * Locate element by ARIA role
 *
 * Uses Playwright's getByRole which queries based on ARIA role attribute.
 * This is the most robust strategy for interactive elements.
 *
 * @param page - Playwright Page object
 * @param role - ARIA role name
 * @param options - Additional role-based filters
 * @returns Locator for matching elements
 *
 * @example
 * ```ts
 * // Locate button by role
 * byRole(page, 'button', { name: 'Submit' })
 *
 * // Locate heading by role and level
 * byRole(page, 'heading', { level: 1 })
 *
 * // Locate checkbox by role and state
 * byRole(page, 'checkbox', { name: 'Accept terms', checked: true })
 * ```
 */
export declare function byRole(page: Page, role: string, options?: ByRoleOptions): Locator;
/**
 * Locate element by associated label text
 *
 * Uses Playwright's getByLabel which finds form controls by their
 * associated <label> element text.
 *
 * @param page - Playwright Page object
 * @param label - Label text (exact match or regex)
 * @param options - Additional options
 * @returns Locator for matching form control
 *
 * @example
 * ```ts
 * // Locate input by label text
 * byLabel(page, 'Email address')
 *
 * // Locate input by label with regex
 * byLabel(page, /email/i)
 *
 * // Locate input by label with exact match
 * byLabel(page, 'Username', { exact: true })
 * ```
 */
export declare function byLabel(page: Page, label: string | RegExp, options?: {
    exact?: boolean;
}): Locator;
/**
 * Locate input element by placeholder text
 *
 * Uses Playwright's getByPlaceholder which finds input elements
 * by their placeholder attribute.
 *
 * @param page - Playwright Page object
 * @param placeholder - Placeholder text (exact match or regex)
 * @param options - Additional options
 * @returns Locator for matching input element
 *
 * @example
 * ```ts
 * // Locate input by placeholder
 * byPlaceholder(page, 'Enter your email')
 *
 * // Locate input by placeholder with regex
 * byPlaceholder(page, /search/i)
 *
 * // Locate input by placeholder with exact match
 * byPlaceholder(page, 'Search...', { exact: true })
 * ```
 */
export declare function byPlaceholder(page: Page, placeholder: string | RegExp, options?: {
    exact?: boolean;
}): Locator;
/**
 * Locate element by visible text content
 *
 * Uses Playwright's getByText which finds elements containing
 * the specified text. Use sparingly as text can change frequently.
 *
 * @param page - Playwright Page object
 * @param text - Text content (exact match or regex)
 * @param options - Additional options
 * @returns Locator for matching elements
 *
 * @example
 * ```ts
 * // Locate element by text
 * byText(page, 'Click here')
 *
 * // Locate element by text with regex
 * byText(page, /click/i)
 *
 * // Locate element by exact text match
 * byText(page, 'Submit', { exact: true })
 * ```
 */
export declare function byText(page: Page, text: string | RegExp, options?: {
    exact?: boolean;
}): Locator;
/**
 * Locate element by CSS selector
 *
 * Fallback strategy using standard CSS selector.
 * Use only when semantic strategies are not applicable.
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector string
 * @returns Locator for matching elements
 *
 * @example
 * ```ts
 * // Locate by CSS class
 * byCss(page, '.submit-button')
 *
 * // Locate by ID
 * byCss(page, '#login-form')
 *
 * // Locate by complex selector
 * byCss(page, 'form > div.field:nth-child(2) input')
 * ```
 */
export declare function byCss(page: Page, selector: string): Locator;
/**
 * Try to locate element using specified strategy
 *
 * Returns null if strategy cannot be applied or element not found.
 * Used internally by the locate() function for strategy chaining.
 *
 * @param page - Playwright Page object
 * @param strategy - Strategy name to try
 * @param selector - Selector value appropriate for the strategy
 * @param options - Strategy-specific options
 * @returns Locator if found, null if strategy inapplicable
 *
 * @internal
 */
export declare function tryStrategy(page: Page, strategy: string, selector: string, options?: ByRoleOptions | {
    exact?: boolean;
}): Locator | null;
//# sourceMappingURL=strategies.d.ts.map