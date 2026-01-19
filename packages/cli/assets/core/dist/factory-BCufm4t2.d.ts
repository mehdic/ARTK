import { Locator, Page } from '@playwright/test';

/**
 * TypeScript types for ARTK Core v1 Locators module
 *
 * Provides accessibility-first locator utilities that wrap Playwright's
 * locator system with a strategy-based approach.
 *
 * Key features:
 * - Strategy-based locator resolution (FR-017, FR-018)
 * - Custom test ID attribute support (FR-019)
 * - Scoped locators for forms, tables, sections (FR-020)
 * - ARIA/accessibility helpers
 *
 * @module locators/types
 */

/**
 * Available locator strategies
 *
 * @see data-model.md Section 1.6 - SelectorsConfig
 */
type LocatorStrategy = 'role' | 'label' | 'placeholder' | 'testid' | 'text' | 'css';
/**
 * Options for role-based locators
 *
 * Aligns with Playwright's getByRole options while providing
 * type-safe configuration.
 */
interface ByRoleOptions {
    /**
     * Expected accessible name (exact match or regex)
     */
    readonly name?: string | RegExp;
    /**
     * Whether element should be checked (for checkboxes/radios)
     */
    readonly checked?: boolean;
    /**
     * Whether element should be disabled
     */
    readonly disabled?: boolean;
    /**
     * Whether element should be expanded (for expandable elements)
     */
    readonly expanded?: boolean;
    /**
     * Hierarchical level (for headings, list items)
     */
    readonly level?: number;
    /**
     * Whether element should be pressed (for toggle buttons)
     */
    readonly pressed?: boolean;
    /**
     * Whether element should be selected (for options)
     */
    readonly selected?: boolean;
    /**
     * Whether to match exact name or substring
     */
    readonly exact?: boolean;
    /**
     * Whether to include hidden elements
     */
    readonly includeHidden?: boolean;
}
/**
 * Form-scoped locator helpers
 *
 * @see data-model.md Section 2.6 - ScopedLocators
 */
interface FormLocators {
    /**
     * Locate form field by name attribute
     */
    field(name: string): Locator;
    /**
     * Locate form field by associated label text
     */
    fieldByLabel(label: string): Locator;
    /**
     * Locate submit button
     */
    submit(): Locator;
    /**
     * Locate cancel button
     */
    cancel(): Locator;
    /**
     * Locate error message for specific field
     */
    error(field: string): Locator;
}
/**
 * Table-scoped locator helpers
 *
 * @see data-model.md Section 2.6 - ScopedLocators
 */
interface TableLocators {
    /**
     * Locate table row by index (0-based)
     */
    row(index: number): Locator;
    /**
     * Locate first table row containing specific text
     */
    rowContaining(text: string): Locator;
    /**
     * Locate table cell by row and column
     *
     * @param row - Row index (0-based)
     * @param column - Column index (0-based) or column name
     */
    cell(row: number, column: number | string): Locator;
    /**
     * Locate table header by column
     *
     * @param column - Column index (0-based) or column name
     */
    header(column: number | string): Locator;
}
/**
 * Section-scoped locator helpers
 *
 * Provides a scoped context for locating elements within
 * a specific section of the page.
 *
 * @see data-model.md Section 2.6 - ScopedLocators
 */
interface SectionLocators {
    /**
     * Locate element within section by CSS selector
     */
    locator(selector: string): Locator;
    /**
     * Locate element within section by test ID
     */
    byTestId(testId: string): Locator;
    /**
     * Locate element within section by ARIA role
     */
    byRole(role: string, options?: ByRoleOptions): Locator;
}
/**
 * Configuration for locator factory
 *
 * Controls strategy resolution order and custom test ID attributes
 */
interface LocatorFactoryConfig {
    /**
     * Ordered list of strategies to try (first match wins)
     *
     * @see FR-018
     */
    readonly strategies: readonly LocatorStrategy[];
    /**
     * Primary test ID attribute (default: 'data-testid')
     *
     * @see FR-019
     */
    readonly testIdAttribute: string;
    /**
     * Additional test ID attributes to check
     *
     * @see FR-019
     */
    readonly customTestIds?: readonly string[];
}
/**
 * Standard ARIA roles for accessibility-first locators
 *
 * Based on WAI-ARIA specification
 */
type AriaRole = 'article' | 'banner' | 'complementary' | 'contentinfo' | 'form' | 'main' | 'navigation' | 'region' | 'search' | 'application' | 'directory' | 'document' | 'feed' | 'figure' | 'img' | 'list' | 'listitem' | 'math' | 'note' | 'presentation' | 'table' | 'term' | 'alert' | 'alertdialog' | 'button' | 'checkbox' | 'dialog' | 'gridcell' | 'link' | 'log' | 'marquee' | 'menuitem' | 'menuitemcheckbox' | 'menuitemradio' | 'option' | 'progressbar' | 'radio' | 'scrollbar' | 'searchbox' | 'slider' | 'spinbutton' | 'status' | 'switch' | 'tab' | 'tabpanel' | 'textbox' | 'timer' | 'tooltip' | 'tree' | 'treeitem' | 'combobox' | 'grid' | 'listbox' | 'menu' | 'menubar' | 'radiogroup' | 'tablist' | 'toolbar' | 'treegrid' | 'heading' | 'row' | 'rowheader' | 'columnheader' | 'cell';
/**
 * Function signature for strategy-based locator resolution
 */
type LocatorStrategyFn = (page: Page, selector: string, config: LocatorFactoryConfig) => Locator | null;

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
declare function byRole(page: Page, role: string, options?: ByRoleOptions): Locator;
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
declare function byLabel(page: Page, label: string | RegExp, options?: {
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
declare function byPlaceholder(page: Page, placeholder: string | RegExp, options?: {
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
declare function byText(page: Page, text: string | RegExp, options?: {
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
declare function byCss(page: Page, selector: string): Locator;
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
declare function tryStrategy(page: Page, strategy: string, selector: string, options?: ByRoleOptions | {
    exact?: boolean;
}): Locator | null;

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
declare function byTestId(page: Page, testId: string, config: LocatorFactoryConfig): Locator;
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
declare function hasTestIdAttribute(locator: Locator, testId: string, config: LocatorFactoryConfig): Promise<boolean>;
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
declare function getTestIdValue(locator: Locator, config: LocatorFactoryConfig): Promise<string | null>;
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
declare function createTestIdSelector(testId: string, config: LocatorFactoryConfig): string;
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
declare function createCombinedTestIdSelector(testId: string, config: LocatorFactoryConfig): string;

/**
 * Locator factory with strategy chaining and scoped locators
 *
 * Implements:
 * - FR-018: Strategy chain resolution (first match wins)
 * - FR-020: Scoped locators for forms, tables, sections
 *
 * @module locators/factory
 */

/**
 * Locate element using configured strategy chain
 *
 * Tries strategies in configured order until a match is found.
 * Returns the first locator that matches an element.
 *
 * @param page - Playwright Page object
 * @param selector - Selector value (interpretation depends on strategy)
 * @param config - Locator factory configuration
 * @param options - Strategy-specific options
 * @returns Locator for the element
 *
 * @example
 * ```ts
 * const config = {
 *   strategies: ['role', 'testid', 'css'],
 *   testIdAttribute: 'data-testid'
 * };
 *
 * // Tries: role="button", [data-testid="submit"], CSS selector
 * const button = locate(page, 'submit', config);
 * ```
 */
declare function locate(page: Page, selector: string, config: LocatorFactoryConfig, options?: ByRoleOptions | {
    exact?: boolean;
}): Locator;
/**
 * Create form-scoped locators within a form element
 *
 * Provides convenient methods for locating form fields, buttons,
 * and error messages within a specific form context.
 *
 * @param formLocator - Locator for the form element
 * @param config - Locator factory configuration
 * @returns FormLocators interface with scoped methods
 *
 * @example
 * ```ts
 * const loginForm = page.locator('form#login');
 * const form = withinForm(loginForm, config);
 *
 * await form.field('username').fill('user@example.com');
 * await form.fieldByLabel('Password').fill('secret');
 * await form.submit().click();
 * ```
 */
declare function withinForm(formLocator: Locator, config: LocatorFactoryConfig): FormLocators;
/**
 * Create table-scoped locators within a table element
 *
 * Provides methods for locating rows, cells, and headers
 * within a specific table context.
 *
 * @param tableLocator - Locator for the table element
 * @returns TableLocators interface with scoped methods
 *
 * @example
 * ```ts
 * const dataTable = page.locator('table#users');
 * const table = withinTable(dataTable);
 *
 * const firstRow = table.row(0);
 * const emailCell = table.cell(0, 'Email');
 * const matchingRow = table.rowContaining('john@example.com');
 * ```
 */
declare function withinTable(tableLocator: Locator): TableLocators;
/**
 * Create section-scoped locators within a page section
 *
 * Provides a scoped context for locating elements within
 * a specific section, region, or container.
 *
 * @param sectionLocator - Locator for the section element
 * @param config - Locator factory configuration
 * @returns SectionLocators interface with scoped methods
 *
 * @example
 * ```ts
 * const sidebar = page.locator('aside#sidebar');
 * const section = withinSection(sidebar, config);
 *
 * const navLink = section.byRole('link', { name: 'Dashboard' });
 * const searchBox = section.byTestId('sidebar-search');
 * ```
 */
declare function withinSection(sectionLocator: Locator, config: LocatorFactoryConfig): SectionLocators;
/**
 * Create default locator factory configuration
 *
 * Provides sensible defaults for strategy order and test ID attributes.
 *
 * @returns Default configuration
 *
 * @example
 * ```ts
 * const config = createDefaultConfig();
 * // {
 * //   strategies: ['role', 'label', 'placeholder', 'testid', 'text', 'css'],
 * //   testIdAttribute: 'data-testid'
 * // }
 * ```
 */
declare function createDefaultConfig(): LocatorFactoryConfig;
/**
 * Create config from SelectorsConfig (from artk.config.yml)
 *
 * Converts SelectorsConfig from ARTK config into LocatorFactoryConfig.
 *
 * @param selectorsConfig - SelectorsConfig from ARTK config
 * @returns LocatorFactoryConfig for use with locator functions
 *
 * @example
 * ```ts
 * import { loadConfig } from '@artk/core/config';
 *
 * const artkConfig = await loadConfig();
 * const locatorConfig = createConfigFromSelectors(artkConfig.selectors);
 * ```
 */
declare function createConfigFromSelectors(selectorsConfig: {
    testIdAttribute: string;
    strategy: readonly LocatorStrategy[];
    customTestIds?: readonly string[];
}): LocatorFactoryConfig;

export { type AriaRole as A, type ByRoleOptions as B, type FormLocators as F, type LocatorStrategy as L, type SectionLocators as S, type TableLocators as T, byLabel as a, byRole as b, byTestId as c, withinTable as d, type LocatorFactoryConfig as e, type LocatorStrategyFn as f, byPlaceholder as g, byText as h, byCss as i, hasTestIdAttribute as j, getTestIdValue as k, locate as l, createTestIdSelector as m, createCombinedTestIdSelector as n, withinSection as o, createDefaultConfig as p, createConfigFromSelectors as q, tryStrategy as t, withinForm as w };
