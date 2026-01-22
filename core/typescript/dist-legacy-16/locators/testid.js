"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.byTestId = byTestId;
exports.hasTestIdAttribute = hasTestIdAttribute;
exports.getTestIdValue = getTestIdValue;
exports.createTestIdSelector = createTestIdSelector;
exports.createCombinedTestIdSelector = createCombinedTestIdSelector;
// =============================================================================
// Test ID Locator Functions
// =============================================================================
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
function byTestId(page, testId, config) {
    // Try primary test ID attribute first
    const primarySelector = `[${config.testIdAttribute}="${testId}"]`;
    const primaryLocator = page.locator(primarySelector);
    // If no custom test IDs configured, return primary locator
    if (!config.customTestIds || config.customTestIds.length === 0) {
        return primaryLocator;
    }
    // Build CSS selector that matches any configured test ID attribute
    const allSelectors = [
        config.testIdAttribute,
        ...(config.customTestIds || []),
    ].map((attr) => `[${attr}="${testId}"]`);
    const combinedSelector = allSelectors.join(', ');
    return page.locator(combinedSelector).first();
}
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
async function hasTestIdAttribute(locator, testId, config) {
    // Build list of all test ID attributes to check
    const attributes = [
        config.testIdAttribute,
        ...(config.customTestIds || []),
    ];
    // Check each attribute
    for (const attr of attributes) {
        try {
            const value = await locator.getAttribute(attr);
            if (value === testId) {
                return true;
            }
        }
        catch {
            // Attribute doesn't exist on element, continue to next
            continue;
        }
    }
    return false;
}
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
async function getTestIdValue(locator, config) {
    // Build list of all test ID attributes to check
    const attributes = [
        config.testIdAttribute,
        ...(config.customTestIds || []),
    ];
    // Check each attribute in order
    for (const attr of attributes) {
        try {
            const value = await locator.getAttribute(attr);
            if (value) {
                return value;
            }
        }
        catch {
            // Attribute doesn't exist on element, continue to next
            continue;
        }
    }
    return null;
}
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
function createTestIdSelector(testId, config) {
    return `[${config.testIdAttribute}="${testId}"]`;
}
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
function createCombinedTestIdSelector(testId, config) {
    const allAttributes = [
        config.testIdAttribute,
        ...(config.customTestIds || []),
    ];
    const selectors = allAttributes.map((attr) => `[${attr}="${testId}"]`);
    return selectors.join(', ');
}
//# sourceMappingURL=testid.js.map