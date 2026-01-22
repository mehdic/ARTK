"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.byRole = byRole;
exports.byLabel = byLabel;
exports.byPlaceholder = byPlaceholder;
exports.byText = byText;
exports.byCss = byCss;
exports.tryStrategy = tryStrategy;
// =============================================================================
// Accessibility-First Strategy Functions
// =============================================================================
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
function byRole(page, role, options) {
    // Convert our options to Playwright's format
    const playwrightOptions = {};
    if (options) {
        if (options.name !== undefined) {
            playwrightOptions.name = options.name;
        }
        if (options.checked !== undefined) {
            playwrightOptions.checked = options.checked;
        }
        if (options.disabled !== undefined) {
            playwrightOptions.disabled = options.disabled;
        }
        if (options.expanded !== undefined) {
            playwrightOptions.expanded = options.expanded;
        }
        if (options.level !== undefined) {
            playwrightOptions.level = options.level;
        }
        if (options.pressed !== undefined) {
            playwrightOptions.pressed = options.pressed;
        }
        if (options.selected !== undefined) {
            playwrightOptions.selected = options.selected;
        }
        if (options.exact !== undefined) {
            playwrightOptions.exact = options.exact;
        }
        if (options.includeHidden !== undefined) {
            playwrightOptions.includeHidden = options.includeHidden;
        }
    }
    return page.getByRole(role, playwrightOptions);
}
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
function byLabel(page, label, options) {
    return page.getByLabel(label, options);
}
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
function byPlaceholder(page, placeholder, options) {
    return page.getByPlaceholder(placeholder, options);
}
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
function byText(page, text, options) {
    return page.getByText(text, options);
}
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
function byCss(page, selector) {
    return page.locator(selector);
}
// =============================================================================
// Combined Strategy Resolution
// =============================================================================
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
function tryStrategy(page, strategy, selector, options) {
    try {
        switch (strategy) {
            case 'role':
                return byRole(page, selector, options);
            case 'label':
                return byLabel(page, selector, options);
            case 'placeholder':
                return byPlaceholder(page, selector, options);
            case 'text':
                return byText(page, selector, options);
            case 'css':
                return byCss(page, selector);
            default:
                return null;
        }
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=strategies.js.map