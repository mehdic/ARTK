/**
 * Locator factory with strategy chaining and scoped locators
 *
 * Implements:
 * - FR-018: Strategy chain resolution (first match wins)
 * - FR-020: Scoped locators for forms, tables, sections
 *
 * @module locators/factory
 */
import type { Locator, Page } from '@playwright/test';
import type { ByRoleOptions, FormLocators, LocatorFactoryConfig, LocatorStrategy, SectionLocators, TableLocators } from './types.js';
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
export declare function locate(page: Page, selector: string, config: LocatorFactoryConfig, options?: ByRoleOptions | {
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
export declare function withinForm(formLocator: Locator, config: LocatorFactoryConfig): FormLocators;
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
export declare function withinTable(tableLocator: Locator): TableLocators;
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
export declare function withinSection(sectionLocator: Locator, config: LocatorFactoryConfig): SectionLocators;
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
export declare function createDefaultConfig(): LocatorFactoryConfig;
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
export declare function createConfigFromSelectors(selectorsConfig: {
    testIdAttribute: string;
    strategy: readonly LocatorStrategy[];
    customTestIds?: readonly string[];
}): LocatorFactoryConfig;
//# sourceMappingURL=factory.d.ts.map