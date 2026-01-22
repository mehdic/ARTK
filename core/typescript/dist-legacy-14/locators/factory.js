"use strict";
/**
 * Locator factory with strategy chaining and scoped locators
 *
 * Implements:
 * - FR-018: Strategy chain resolution (first match wins)
 * - FR-020: Scoped locators for forms, tables, sections
 *
 * @module locators/factory
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.locate = locate;
exports.withinForm = withinForm;
exports.withinTable = withinTable;
exports.withinSection = withinSection;
exports.createDefaultConfig = createDefaultConfig;
exports.createConfigFromSelectors = createConfigFromSelectors;
const testid_js_1 = require("./testid.js");
const strategies_js_1 = require("./strategies.js");
// =============================================================================
// Strategy Chain Resolution (FR-018)
// =============================================================================
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
function locate(page, selector, config, options) {
    // Try each strategy in configured order
    for (const strategy of config.strategies) {
        try {
            switch (strategy) {
                case 'role':
                    return (0, strategies_js_1.byRole)(page, selector, options);
                case 'label':
                    return (0, strategies_js_1.byLabel)(page, selector, options);
                case 'placeholder':
                    return (0, strategies_js_1.byPlaceholder)(page, selector, options);
                case 'testid':
                    return (0, testid_js_1.byTestId)(page, selector, config);
                case 'text':
                    return (0, strategies_js_1.byText)(page, selector, options);
                case 'css':
                    return (0, strategies_js_1.byCss)(page, selector);
            }
        }
        catch {
            // Strategy failed, try next one
            continue;
        }
    }
    // Fallback to CSS if all strategies fail
    return (0, strategies_js_1.byCss)(page, selector);
}
// =============================================================================
// Form Scoped Locators (FR-020)
// =============================================================================
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
function withinForm(formLocator, config) {
    return {
        field(name) {
            // Try by name attribute first
            const byName = formLocator.locator(`[name="${name}"]`);
            if (byName) {
                return byName;
            }
            // Fallback to test ID
            return (0, testid_js_1.byTestId)(formLocator.page(), name, config).and(formLocator.locator('input, select, textarea'));
        },
        fieldByLabel(label) {
            // Use Playwright's getByLabel within form scope
            return formLocator.getByLabel(label);
        },
        submit() {
            // Try button[type="submit"] first, fallback to input[type="submit"]
            return formLocator.locator('button[type="submit"], input[type="submit"]');
        },
        cancel() {
            // Try role-based locator for cancel button
            return formLocator.getByRole('button', { name: /cancel|close/i });
        },
        error(field) {
            // Common error message patterns
            return formLocator.locator(`[data-field="${field}"][role="alert"], ` +
                `[data-field="${field}"].error, ` +
                `#${field}-error, ` +
                `.${field}-error`);
        },
    };
}
// =============================================================================
// Table Scoped Locators (FR-020)
// =============================================================================
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
function withinTable(tableLocator) {
    return {
        row(index) {
            // Select row by index (0-based)
            return tableLocator.locator('tbody tr').nth(index);
        },
        rowContaining(text) {
            // Find first row containing text
            return tableLocator.locator('tbody tr').filter({ hasText: text });
        },
        cell(row, column) {
            const rowLocator = tableLocator.locator('tbody tr').nth(row);
            if (typeof column === 'number') {
                // Select cell by column index (0-based)
                return rowLocator.locator('td').nth(column);
            }
            else {
                // Select cell by column name using header text
                // Note: This is a simplified implementation
                // Ideally, we would compute the column index dynamically
                // For now, we use a locator that finds the cell with the matching header
                return rowLocator
                    .locator('td')
                    .filter({
                    has: tableLocator.locator(`thead th:has-text("${column}")`),
                })
                    .first();
            }
        },
        header(column) {
            if (typeof column === 'number') {
                // Select header by column index (0-based)
                return tableLocator.locator('thead th').nth(column);
            }
            else {
                // Select header by text content
                return tableLocator.locator('thead th').filter({ hasText: column });
            }
        },
    };
}
// =============================================================================
// Section Scoped Locators (FR-020)
// =============================================================================
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
function withinSection(sectionLocator, config) {
    return {
        locator(selector) {
            return sectionLocator.locator(selector);
        },
        byTestId(testId) {
            // Use configured test ID attributes within section scope
            const selector = `[${config.testIdAttribute}="${testId}"]`;
            // Scope to within section
            return sectionLocator.locator(selector);
        },
        byRole(role, options) {
            return sectionLocator.getByRole(role, options);
        },
    };
}
// =============================================================================
// Utility Functions
// =============================================================================
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
function createDefaultConfig() {
    return {
        strategies: ['role', 'label', 'placeholder', 'testid', 'text', 'css'],
        testIdAttribute: 'data-testid',
        customTestIds: [],
    };
}
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
function createConfigFromSelectors(selectorsConfig) {
    return {
        strategies: selectorsConfig.strategy,
        testIdAttribute: selectorsConfig.testIdAttribute,
        customTestIds: selectorsConfig.customTestIds,
    };
}
//# sourceMappingURL=factory.js.map