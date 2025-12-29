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

import type { Locator, Page } from '@playwright/test';

// =============================================================================
// Locator Strategy Types
// =============================================================================

/**
 * Available locator strategies
 *
 * @see data-model.md Section 1.6 - SelectorsConfig
 */
export type LocatorStrategy =
  | 'role'
  | 'label'
  | 'placeholder'
  | 'testid'
  | 'text'
  | 'css';

/**
 * Options for role-based locators
 *
 * Aligns with Playwright's getByRole options while providing
 * type-safe configuration.
 */
export interface ByRoleOptions {
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

// =============================================================================
// Scoped Locator Interfaces
// =============================================================================

/**
 * Form-scoped locator helpers
 *
 * @see data-model.md Section 2.6 - ScopedLocators
 */
export interface FormLocators {
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
export interface TableLocators {
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
export interface SectionLocators {
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

// =============================================================================
// Locator Factory Configuration
// =============================================================================

/**
 * Configuration for locator factory
 *
 * Controls strategy resolution order and custom test ID attributes
 */
export interface LocatorFactoryConfig {
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

// =============================================================================
// ARIA Role Types
// =============================================================================

/**
 * Standard ARIA roles for accessibility-first locators
 *
 * Based on WAI-ARIA specification
 */
export type AriaRole =
  // Document structure roles
  | 'article'
  | 'banner'
  | 'complementary'
  | 'contentinfo'
  | 'form'
  | 'main'
  | 'navigation'
  | 'region'
  | 'search'

  // Landmark roles
  | 'application'
  | 'directory'
  | 'document'
  | 'feed'
  | 'figure'
  | 'img'
  | 'list'
  | 'listitem'
  | 'math'
  | 'note'
  | 'presentation'
  | 'table'
  | 'term'

  // Widget roles
  | 'alert'
  | 'alertdialog'
  | 'button'
  | 'checkbox'
  | 'dialog'
  | 'gridcell'
  | 'link'
  | 'log'
  | 'marquee'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'option'
  | 'progressbar'
  | 'radio'
  | 'scrollbar'
  | 'searchbox'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'switch'
  | 'tab'
  | 'tabpanel'
  | 'textbox'
  | 'timer'
  | 'tooltip'
  | 'tree'
  | 'treeitem'

  // Composite widget roles
  | 'combobox'
  | 'grid'
  | 'listbox'
  | 'menu'
  | 'menubar'
  | 'radiogroup'
  | 'tablist'
  | 'toolbar'
  | 'treegrid'

  // Heading roles
  | 'heading'

  // Row and cell roles
  | 'row'
  | 'rowheader'
  | 'columnheader'
  | 'cell';

// =============================================================================
// Strategy Function Types
// =============================================================================

/**
 * Function signature for strategy-based locator resolution
 */
export type LocatorStrategyFn = (
  page: Page,
  selector: string,
  config: LocatorFactoryConfig
) => Locator | null;
