/**
 * Locators Module API Contract
 *
 * This contract defines the public API for the ARTK Locators module.
 * Implementation must satisfy these type signatures.
 */

import type { Page, Locator } from '@playwright/test';

// =============================================================================
// Types
// =============================================================================

export interface ByRoleOptions {
  name?: string | RegExp;
  exact?: boolean;
  checked?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  includeHidden?: boolean;
  level?: number;
  pressed?: boolean;
  selected?: boolean;
}

export interface LocatorHints {
  /** Preferred strategy (overrides config order) */
  strategy?: 'role' | 'label' | 'placeholder' | 'testid' | 'text' | 'css';
  /** For role-based: the ARIA role */
  role?: string;
  /** For role-based: additional options */
  roleOptions?: ByRoleOptions;
  /** For CSS-based: fallback selector */
  css?: string;
}

// =============================================================================
// Primary Locator Functions
// =============================================================================

/**
 * Locate element by ARIA role
 *
 * @param page - Playwright Page
 * @param role - ARIA role (button, textbox, link, etc.)
 * @param options - Role-specific options
 * @returns Playwright Locator
 *
 * @example
 * await byRole(page, 'button', { name: 'Submit' }).click();
 * await byRole(page, 'textbox', { name: 'Email' }).fill('user@example.com');
 */
export declare function byRole(
  page: Page,
  role: string,
  options?: ByRoleOptions
): Locator;

/**
 * Locate form element by associated label
 *
 * @param page - Playwright Page
 * @param text - Label text (string or regex)
 * @returns Playwright Locator
 *
 * @example
 * await byLabel(page, 'Email address').fill('user@example.com');
 * await byLabel(page, /password/i).fill('secret');
 */
export declare function byLabel(page: Page, text: string | RegExp): Locator;

/**
 * Locate element by placeholder text
 *
 * @param page - Playwright Page
 * @param text - Placeholder text (string or regex)
 * @returns Playwright Locator
 *
 * @example
 * await byPlaceholder(page, 'Search...').fill('query');
 */
export declare function byPlaceholder(page: Page, text: string | RegExp): Locator;

/**
 * Locate element by test ID attribute
 *
 * Uses configured testIdAttribute (default: data-testid).
 *
 * @param page - Playwright Page
 * @param testId - Test ID value
 * @returns Playwright Locator
 *
 * @example
 * await byTestId(page, 'submit-button').click();
 * await byTestId(page, 'user-menu').hover();
 */
export declare function byTestId(page: Page, testId: string): Locator;

/**
 * Locate element by visible text
 *
 * @param page - Playwright Page
 * @param text - Text content (string or regex)
 * @returns Playwright Locator
 *
 * @example
 * await byText(page, 'Sign in').click();
 * await byText(page, /welcome/i).waitFor();
 */
export declare function byText(page: Page, text: string | RegExp): Locator;

// =============================================================================
// Scoped Locators
// =============================================================================

/**
 * Form-specific locator helpers
 */
export interface FormLocators {
  /** Get form field by name or data-field attribute */
  field(name: string): Locator;

  /** Get form field by associated label */
  fieldByLabel(label: string): Locator;

  /** Get submit button */
  submit(): Locator;

  /** Get cancel button */
  cancel(): Locator;

  /** Get field error message */
  error(field: string): Locator;

  /** Get form-level error */
  formError(): Locator;
}

/**
 * Create scoped locators within a form
 *
 * @param page - Playwright Page
 * @param formIdentifier - Form name, test ID, or label
 * @returns FormLocators scoped to the form
 *
 * @example
 * const form = withinForm(page, 'login-form');
 * await form.field('email').fill('user@example.com');
 * await form.field('password').fill('secret');
 * await form.submit().click();
 */
export declare function withinForm(page: Page, formIdentifier: string): FormLocators;

/**
 * Table-specific locator helpers
 */
export interface TableLocators {
  /** Get row by index (0-based) */
  row(index: number): Locator;

  /** Get row containing specific text */
  rowContaining(text: string): Locator;

  /** Get cell by row and column (column can be index or header text) */
  cell(row: number, column: number | string): Locator;

  /** Get header cell */
  header(column: number | string): Locator;

  /** Get all rows */
  rows(): Locator;

  /** Get row count */
  rowCount(): Promise<number>;
}

/**
 * Create scoped locators within a table
 *
 * @param page - Playwright Page
 * @param tableIdentifier - Table name, test ID, or aria-label
 * @returns TableLocators scoped to the table
 *
 * @example
 * const table = withinTable(page, 'orders-table');
 * await expect(table.rowContaining('ORD-123')).toBeVisible();
 * await table.cell(0, 'Status').click();
 */
export declare function withinTable(page: Page, tableIdentifier: string): TableLocators;

/**
 * Section-specific locator helpers
 */
export interface SectionLocators {
  /** Generic locator within section */
  locator(selector: string): Locator;

  /** Get element by test ID within section */
  byTestId(testId: string): Locator;

  /** Get element by role within section */
  byRole(role: string, options?: ByRoleOptions): Locator;

  /** Get element by text within section */
  byText(text: string | RegExp): Locator;
}

/**
 * Create scoped locators within a section/region
 *
 * @param page - Playwright Page
 * @param sectionIdentifier - Section name, test ID, or aria-label
 * @returns SectionLocators scoped to the section
 *
 * @example
 * const sidebar = withinSection(page, 'sidebar');
 * await sidebar.byRole('link', { name: 'Settings' }).click();
 */
export declare function withinSection(page: Page, sectionIdentifier: string): SectionLocators;

// =============================================================================
// Configuration
// =============================================================================

/**
 * Set the test ID attribute globally
 *
 * Called during harness initialization from config.
 *
 * @param attribute - Attribute name (e.g., 'data-testid', 'data-qa')
 */
export declare function setTestIdAttribute(attribute: string): void;

/**
 * Get current test ID attribute
 *
 * @returns Current test ID attribute name
 */
export declare function getTestIdAttribute(): string;

// =============================================================================
// Strategy Chain (Internal)
// =============================================================================

/**
 * Smart locator that tries strategies in configured order
 *
 * @param page - Playwright Page
 * @param description - Human-readable element description
 * @param hints - Optional hints for locator resolution
 * @returns Playwright Locator
 *
 * @example
 * // Tries role, label, testid, text, css in order
 * await locate(page, 'email input', { role: 'textbox', css: '#email' });
 */
export declare function locate(
  page: Page,
  description: string,
  hints?: LocatorHints
): Locator;
