/**
 * AG Grid DOM Selector Utilities
 *
 * Provides stable DOM selectors for AG Grid elements based on ARIA attributes
 * and AG Grid's internal class/attribute patterns.
 *
 * @module grid/ag-grid/selectors
 */

import type { Locator, Page } from '@playwright/test';

/**
 * AG Grid CSS class and attribute selectors
 * These are stable across AG Grid versions 30-33
 */
export const AG_GRID_SELECTORS = {
  // Grid structure
  ROOT_WRAPPER: '.ag-root-wrapper',
  HEADER: '.ag-header',
  HEADER_ROW: '.ag-header-row',
  HEADER_CELL: '.ag-header-cell',
  BODY_VIEWPORT: '.ag-body-viewport',
  CENTER_COLS_CONTAINER: '.ag-center-cols-container',
  PINNED_LEFT_CONTAINER: '.ag-pinned-left-cols-container',
  PINNED_RIGHT_CONTAINER: '.ag-pinned-right-cols-container',

  // Row and cell
  ROW: '.ag-row',
  CELL: '.ag-cell',
  ROW_GROUP: '.ag-row-group',
  ROW_SELECTED: '.ag-row-selected',
  CELL_FOCUS: '.ag-cell-focus',

  // Overlays
  LOADING_OVERLAY: '.ag-overlay-loading-center',
  NO_ROWS_OVERLAY: '.ag-overlay-no-rows-center',

  // Enterprise features
  GROUP_EXPANDED: '.ag-group-expanded',
  GROUP_CONTRACTED: '.ag-group-contracted',
  DETAILS_ROW: '.ag-details-row',
  FULL_WIDTH_ROW: '.ag-full-width-row',

  // Floating filter
  FLOATING_FILTER: '.ag-floating-filter',
  FLOATING_FILTER_INPUT: '.ag-floating-filter-input',

  // Selection checkbox
  SELECTION_CHECKBOX: '.ag-selection-checkbox',
  HEADER_SELECT_ALL: '.ag-header-select-all',

  // Attributes
  ATTR_COL_ID: 'col-id',
  ATTR_ROW_INDEX: 'row-index',
  ATTR_ROW_ID: 'row-id',
  ATTR_ARIA_ROW_INDEX: 'aria-rowindex',
  ATTR_ARIA_COL_INDEX: 'aria-colindex',
  ATTR_ARIA_SORT: 'aria-sort',
  ATTR_ARIA_SELECTED: 'aria-selected',
} as const;

/**
 * Get the root grid container element
 *
 * @param page - Playwright page object
 * @param selector - Grid selector (test-id, CSS selector, or custom)
 * @returns Locator for the grid root wrapper
 *
 * @example
 * ```typescript
 * // By test ID
 * const grid = getGridRoot(page, 'orders-grid');
 *
 * // By CSS selector
 * const grid = getGridRoot(page, '#my-grid');
 *
 * // By custom CSS
 * const grid = getGridRoot(page, '.custom-grid-container');
 * ```
 */
export function getGridRoot(page: Page, selector: string): Locator {
  // Try data-testid first (most common pattern)
  const byTestId = page.locator(`[data-testid="${selector}"]`);

  // If selector starts with special characters, treat as CSS selector
  if (selector.startsWith('#') || selector.startsWith('.') || selector.startsWith('[')) {
    return page.locator(selector).locator(AG_GRID_SELECTORS.ROOT_WRAPPER).or(page.locator(selector));
  }

  // Default: use data-testid, but fall back to finding root wrapper with that testid
  return byTestId.locator(AG_GRID_SELECTORS.ROOT_WRAPPER).or(byTestId);
}

/**
 * Build a CSS selector for a cell by column ID
 *
 * @param colId - Column ID (col-id attribute value)
 * @returns CSS selector string
 */
export function buildCellSelector(colId: string): string {
  return `${AG_GRID_SELECTORS.CELL}[${AG_GRID_SELECTORS.ATTR_COL_ID}="${colId}"]`;
}

/**
 * Build a CSS selector for a header cell by column ID
 *
 * @param colId - Column ID (col-id attribute value)
 * @returns CSS selector string
 */
export function buildHeaderCellSelector(colId: string): string {
  return `${AG_GRID_SELECTORS.HEADER_CELL}[${AG_GRID_SELECTORS.ATTR_COL_ID}="${colId}"]`;
}

/**
 * Build a CSS selector for a row based on various matching criteria
 *
 * @param options - Row matching options
 * @returns CSS selector string
 */
export function buildRowSelector(options: {
  rowIndex?: number;
  rowId?: string;
  ariaRowIndex?: number;
}): string {
  const { rowIndex, rowId, ariaRowIndex } = options;

  if (ariaRowIndex !== undefined) {
    return `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX}="${ariaRowIndex}"]`;
  }

  if (rowId !== undefined) {
    return `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ROW_ID}="${rowId}"]`;
  }

  if (rowIndex !== undefined) {
    return `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ROW_INDEX}="${rowIndex}"]`;
  }

  // Default: all rows
  return AG_GRID_SELECTORS.ROW;
}

/**
 * Build a CSS selector for a floating filter input by column ID
 *
 * @param colId - Column ID (col-id attribute value)
 * @returns CSS selector string
 */
export function buildFilterInputSelector(colId: string): string {
  return `${AG_GRID_SELECTORS.FLOATING_FILTER}[${AG_GRID_SELECTORS.ATTR_COL_ID}="${colId}"] input`;
}

/**
 * Get all container locators for pinned and center columns
 *
 * @param gridLocator - The grid root locator
 * @returns Object with locators for each container
 */
export function getColumnContainers(gridLocator: Locator): {
  left: Locator;
  center: Locator;
  right: Locator;
} {
  return {
    left: gridLocator.locator(AG_GRID_SELECTORS.PINNED_LEFT_CONTAINER),
    center: gridLocator.locator(AG_GRID_SELECTORS.CENTER_COLS_CONTAINER),
    right: gridLocator.locator(AG_GRID_SELECTORS.PINNED_RIGHT_CONTAINER),
  };
}

/**
 * Find a cell across all column containers (handles pinned columns)
 *
 * @param gridLocator - The grid root locator
 * @param rowSelector - CSS selector for the row
 * @param colId - Column ID
 * @returns Locator for the cell
 */
export function findCellAcrossContainers(
  gridLocator: Locator,
  rowSelector: string,
  colId: string
): Locator {
  const cellSelector = buildCellSelector(colId);

  // Use first() to return the first matching cell across all containers
  return gridLocator
    .locator(`${rowSelector} ${cellSelector}`)
    .first();
}

/**
 * Check if a row is a group row (enterprise feature)
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to true if it's a group row
 */
export async function isGroupRow(rowLocator: Locator): Promise<boolean> {
  const classAttr = await rowLocator.getAttribute('class');
  return classAttr?.includes('ag-row-group') ?? false;
}

/**
 * Check if a row is expanded (group or tree node)
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to true if expanded
 */
export async function isRowExpanded(rowLocator: Locator): Promise<boolean> {
  const ariaExpanded = await rowLocator.getAttribute('aria-expanded');
  return ariaExpanded === 'true';
}

/**
 * Check if a row is selected
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to true if selected
 */
export async function isRowSelected(rowLocator: Locator): Promise<boolean> {
  const classAttr = await rowLocator.getAttribute('class');
  const ariaSelected = await rowLocator.getAttribute('aria-selected');

  return classAttr?.includes('ag-row-selected') || ariaSelected === 'true';
}

/**
 * Get the aria-rowindex value from a row element
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to the aria-rowindex value (1-based)
 */
export async function getAriaRowIndex(rowLocator: Locator): Promise<number> {
  const ariaRowIndex = await rowLocator.getAttribute(AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX);
  return ariaRowIndex ? parseInt(ariaRowIndex, 10) : -1;
}

/**
 * Get the row-index value from a row element (viewport index)
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to the row-index value (0-based)
 */
export async function getRowIndex(rowLocator: Locator): Promise<number> {
  const rowIndex = await rowLocator.getAttribute(AG_GRID_SELECTORS.ATTR_ROW_INDEX);
  return rowIndex ? parseInt(rowIndex, 10) : -1;
}

/**
 * Get the row-id value from a row element
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to the row-id value
 */
export async function getRowId(rowLocator: Locator): Promise<string | null> {
  return rowLocator.getAttribute(AG_GRID_SELECTORS.ATTR_ROW_ID);
}

/**
 * Get the sort direction of a header cell
 *
 * @param headerCellLocator - The header cell locator
 * @returns Promise resolving to sort direction or undefined if not sorted
 */
export async function getSortDirection(
  headerCellLocator: Locator
): Promise<'asc' | 'desc' | undefined> {
  const ariaSort = await headerCellLocator.getAttribute(AG_GRID_SELECTORS.ATTR_ARIA_SORT);

  if (ariaSort === 'ascending') return 'asc';
  if (ariaSort === 'descending') return 'desc';
  return undefined;
}
