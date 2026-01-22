/**
 * AG Grid DOM Selector Utilities
 *
 * Provides stable DOM selectors for AG Grid elements based on ARIA attributes
 * and AG Grid's internal class/attribute patterns.
 *
 * @module grid/ag-grid/selectors
 */
import type { Locator, Page } from '@playwright/test';
import type { RowMatcher } from '../types.js';
/**
 * AG Grid CSS class and attribute selectors
 * These are stable across AG Grid versions 30-33
 */
export declare const AG_GRID_SELECTORS: {
    readonly ROOT_WRAPPER: ".ag-root-wrapper";
    readonly HEADER: ".ag-header";
    readonly HEADER_ROW: ".ag-header-row";
    readonly HEADER_CELL: ".ag-header-cell";
    readonly BODY_VIEWPORT: ".ag-body-viewport";
    readonly CENTER_COLS_CONTAINER: ".ag-center-cols-container";
    readonly PINNED_LEFT_CONTAINER: ".ag-pinned-left-cols-container";
    readonly PINNED_RIGHT_CONTAINER: ".ag-pinned-right-cols-container";
    readonly ROW: ".ag-row";
    readonly CELL: ".ag-cell";
    readonly ROW_GROUP: ".ag-row-group";
    readonly ROW_SELECTED: ".ag-row-selected";
    readonly CELL_FOCUS: ".ag-cell-focus";
    readonly LOADING_OVERLAY: ".ag-overlay-loading-center";
    readonly NO_ROWS_OVERLAY: ".ag-overlay-no-rows-center";
    readonly GROUP_EXPANDED: ".ag-group-expanded";
    readonly GROUP_CONTRACTED: ".ag-group-contracted";
    readonly DETAILS_ROW: ".ag-details-row";
    readonly FULL_WIDTH_ROW: ".ag-full-width-row";
    readonly FLOATING_FILTER: ".ag-floating-filter";
    readonly FLOATING_FILTER_INPUT: ".ag-floating-filter-input";
    readonly SELECTION_CHECKBOX: ".ag-selection-checkbox";
    readonly HEADER_SELECT_ALL: ".ag-header-select-all";
    readonly ATTR_COL_ID: "col-id";
    readonly ATTR_ROW_INDEX: "row-index";
    readonly ATTR_ROW_ID: "row-id";
    readonly ATTR_ARIA_ROW_INDEX: "aria-rowindex";
    readonly ATTR_ARIA_COL_INDEX: "aria-colindex";
    readonly ATTR_ARIA_SORT: "aria-sort";
    readonly ATTR_ARIA_SELECTED: "aria-selected";
};
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
export declare function getGridRoot(page: Page, selector: string): Locator;
/**
 * Build a CSS selector for a cell by column ID
 *
 * @param colId - Column ID (col-id attribute value)
 * @returns CSS selector string
 */
export declare function buildCellSelector(colId: string): string;
/**
 * Build a CSS selector for a header cell by column ID
 *
 * @param colId - Column ID (col-id attribute value)
 * @returns CSS selector string
 */
export declare function buildHeaderCellSelector(colId: string): string;
/**
 * Build a CSS selector for a row based on various matching criteria
 *
 * @param options - Row matching options
 * @returns CSS selector string
 */
export declare function buildRowSelector(options: {
    rowIndex?: number;
    rowId?: string;
    ariaRowIndex?: number;
}): string;
/**
 * Build a CSS selector for a floating filter input by column ID
 *
 * @param colId - Column ID (col-id attribute value)
 * @returns CSS selector string
 */
export declare function buildFilterInputSelector(colId: string): string;
/**
 * Get all container locators for pinned and center columns
 *
 * @param gridLocator - The grid root locator
 * @returns Object with locators for each container
 */
export declare function getColumnContainers(gridLocator: Locator): {
    left: Locator;
    center: Locator;
    right: Locator;
};
/**
 * Find a cell across all column containers (handles pinned columns)
 *
 * @param gridLocator - The grid root locator
 * @param rowSelector - CSS selector for the row
 * @param colId - Column ID
 * @returns Locator for the cell
 */
export declare function findCellAcrossContainers(gridLocator: Locator, rowSelector: string, colId: string): Locator;
/**
 * Check if a row is a group row (enterprise feature)
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to true if it's a group row
 */
export declare function isGroupRow(rowLocator: Locator): Promise<boolean>;
/**
 * Check if a row is expanded (group or tree node)
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to true if expanded
 */
export declare function isRowExpanded(rowLocator: Locator): Promise<boolean>;
/**
 * Check if a row is selected
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to true if selected
 */
export declare function isRowSelected(rowLocator: Locator): Promise<boolean>;
/**
 * Get the aria-rowindex value from a row element
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to the aria-rowindex value (1-based)
 */
export declare function getAriaRowIndex(rowLocator: Locator): Promise<number>;
/**
 * Get the row-index value from a row element (viewport index)
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to the row-index value (0-based)
 */
export declare function getRowIndex(rowLocator: Locator): Promise<number>;
/**
 * Get the row-id value from a row element
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to the row-id value
 */
export declare function getRowId(rowLocator: Locator): Promise<string | null>;
/**
 * Get the sort direction of a header cell
 *
 * @param headerCellLocator - The header cell locator
 * @returns Promise resolving to sort direction or undefined if not sorted
 */
export declare function getSortDirection(headerCellLocator: Locator): Promise<'asc' | 'desc' | undefined>;
/**
 * Build a row selector from a RowMatcher using priority order.
 * Priority: ariaRowIndex > rowId > rowIndex > (fallback to all rows)
 *
 * @param matcher - Row matching criteria
 * @returns CSS selector string or null if only predicate/cellValues matching
 */
export declare function buildRowSelectorFromMatcher(matcher: RowMatcher): string | null;
/**
 * Check if a matcher can be resolved directly via CSS selector (fast path)
 *
 * @param matcher - Row matching criteria
 * @returns True if matcher can be resolved with CSS selector
 */
export declare function isDirectMatcher(matcher: RowMatcher): boolean;
/**
 * Format a RowMatcher for error messages with meaningful context
 *
 * @param matcher - Row matching criteria
 * @returns Human-readable string describing the matcher
 */
export declare function formatRowMatcher(matcher: RowMatcher): string;
//# sourceMappingURL=selectors.d.ts.map