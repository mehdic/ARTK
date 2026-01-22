"use strict";
/**
 * AG Grid DOM Selector Utilities
 *
 * Provides stable DOM selectors for AG Grid elements based on ARIA attributes
 * and AG Grid's internal class/attribute patterns.
 *
 * @module grid/ag-grid/selectors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AG_GRID_SELECTORS = void 0;
exports.getGridRoot = getGridRoot;
exports.buildCellSelector = buildCellSelector;
exports.buildHeaderCellSelector = buildHeaderCellSelector;
exports.buildRowSelector = buildRowSelector;
exports.buildFilterInputSelector = buildFilterInputSelector;
exports.getColumnContainers = getColumnContainers;
exports.findCellAcrossContainers = findCellAcrossContainers;
exports.isGroupRow = isGroupRow;
exports.isRowExpanded = isRowExpanded;
exports.isRowSelected = isRowSelected;
exports.getAriaRowIndex = getAriaRowIndex;
exports.getRowIndex = getRowIndex;
exports.getRowId = getRowId;
exports.getSortDirection = getSortDirection;
exports.buildRowSelectorFromMatcher = buildRowSelectorFromMatcher;
exports.isDirectMatcher = isDirectMatcher;
exports.formatRowMatcher = formatRowMatcher;
/**
 * AG Grid CSS class and attribute selectors
 * These are stable across AG Grid versions 30-33
 */
exports.AG_GRID_SELECTORS = {
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
function getGridRoot(page, selector) {
    // Try data-testid first (most common pattern)
    const byTestId = page.locator(`[data-testid="${selector}"]`);
    // If selector starts with special characters, treat as CSS selector
    if (selector.startsWith('#') || selector.startsWith('.') || selector.startsWith('[')) {
        return page.locator(selector).locator(exports.AG_GRID_SELECTORS.ROOT_WRAPPER).or(page.locator(selector));
    }
    // Default: use data-testid, but fall back to finding root wrapper with that testid
    return byTestId.locator(exports.AG_GRID_SELECTORS.ROOT_WRAPPER).or(byTestId);
}
/**
 * Build a CSS selector for a cell by column ID
 *
 * @param colId - Column ID (col-id attribute value)
 * @returns CSS selector string
 */
function buildCellSelector(colId) {
    return `${exports.AG_GRID_SELECTORS.CELL}[${exports.AG_GRID_SELECTORS.ATTR_COL_ID}="${colId}"]`;
}
/**
 * Build a CSS selector for a header cell by column ID
 *
 * @param colId - Column ID (col-id attribute value)
 * @returns CSS selector string
 */
function buildHeaderCellSelector(colId) {
    return `${exports.AG_GRID_SELECTORS.HEADER_CELL}[${exports.AG_GRID_SELECTORS.ATTR_COL_ID}="${colId}"]`;
}
/**
 * Build a CSS selector for a row based on various matching criteria
 *
 * @param options - Row matching options
 * @returns CSS selector string
 */
function buildRowSelector(options) {
    const { rowIndex, rowId, ariaRowIndex } = options;
    if (ariaRowIndex !== undefined) {
        return `${exports.AG_GRID_SELECTORS.ROW}[${exports.AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX}="${ariaRowIndex}"]`;
    }
    if (rowId !== undefined) {
        return `${exports.AG_GRID_SELECTORS.ROW}[${exports.AG_GRID_SELECTORS.ATTR_ROW_ID}="${rowId}"]`;
    }
    if (rowIndex !== undefined) {
        return `${exports.AG_GRID_SELECTORS.ROW}[${exports.AG_GRID_SELECTORS.ATTR_ROW_INDEX}="${rowIndex}"]`;
    }
    // Default: all rows
    return exports.AG_GRID_SELECTORS.ROW;
}
/**
 * Build a CSS selector for a floating filter input by column ID
 *
 * @param colId - Column ID (col-id attribute value)
 * @returns CSS selector string
 */
function buildFilterInputSelector(colId) {
    return `${exports.AG_GRID_SELECTORS.FLOATING_FILTER}[${exports.AG_GRID_SELECTORS.ATTR_COL_ID}="${colId}"] input`;
}
/**
 * Get all container locators for pinned and center columns
 *
 * @param gridLocator - The grid root locator
 * @returns Object with locators for each container
 */
function getColumnContainers(gridLocator) {
    return {
        left: gridLocator.locator(exports.AG_GRID_SELECTORS.PINNED_LEFT_CONTAINER),
        center: gridLocator.locator(exports.AG_GRID_SELECTORS.CENTER_COLS_CONTAINER),
        right: gridLocator.locator(exports.AG_GRID_SELECTORS.PINNED_RIGHT_CONTAINER),
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
function findCellAcrossContainers(gridLocator, rowSelector, colId) {
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
async function isGroupRow(rowLocator) {
    const classAttr = await rowLocator.getAttribute('class');
    return classAttr?.includes('ag-row-group') ?? false;
}
/**
 * Check if a row is expanded (group or tree node)
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to true if expanded
 */
async function isRowExpanded(rowLocator) {
    const ariaExpanded = await rowLocator.getAttribute('aria-expanded');
    return ariaExpanded === 'true';
}
/**
 * Check if a row is selected
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to true if selected
 */
async function isRowSelected(rowLocator) {
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
async function getAriaRowIndex(rowLocator) {
    const ariaRowIndex = await rowLocator.getAttribute(exports.AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX);
    return ariaRowIndex ? parseInt(ariaRowIndex, 10) : -1;
}
/**
 * Get the row-index value from a row element (viewport index)
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to the row-index value (0-based)
 */
async function getRowIndex(rowLocator) {
    const rowIndex = await rowLocator.getAttribute(exports.AG_GRID_SELECTORS.ATTR_ROW_INDEX);
    return rowIndex ? parseInt(rowIndex, 10) : -1;
}
/**
 * Get the row-id value from a row element
 *
 * @param rowLocator - The row locator
 * @returns Promise resolving to the row-id value
 */
async function getRowId(rowLocator) {
    return rowLocator.getAttribute(exports.AG_GRID_SELECTORS.ATTR_ROW_ID);
}
/**
 * Get the sort direction of a header cell
 *
 * @param headerCellLocator - The header cell locator
 * @returns Promise resolving to sort direction or undefined if not sorted
 */
async function getSortDirection(headerCellLocator) {
    const ariaSort = await headerCellLocator.getAttribute(exports.AG_GRID_SELECTORS.ATTR_ARIA_SORT);
    if (ariaSort === 'ascending')
        return 'asc';
    if (ariaSort === 'descending')
        return 'desc';
    return undefined;
}
/**
 * Build a row selector from a RowMatcher using priority order.
 * Priority: ariaRowIndex > rowId > rowIndex > (fallback to all rows)
 *
 * @param matcher - Row matching criteria
 * @returns CSS selector string or null if only predicate/cellValues matching
 */
function buildRowSelectorFromMatcher(matcher) {
    if (matcher.ariaRowIndex !== undefined) {
        return `${exports.AG_GRID_SELECTORS.ROW}[${exports.AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX}="${matcher.ariaRowIndex}"]`;
    }
    if (matcher.rowId !== undefined) {
        return `${exports.AG_GRID_SELECTORS.ROW}[${exports.AG_GRID_SELECTORS.ATTR_ROW_ID}="${matcher.rowId}"]`;
    }
    if (matcher.rowIndex !== undefined) {
        return `${exports.AG_GRID_SELECTORS.ROW}[${exports.AG_GRID_SELECTORS.ATTR_ROW_INDEX}="${matcher.rowIndex}"]`;
    }
    // For cellValues or predicate, we need to iterate - return null
    if (matcher.cellValues || matcher.predicate) {
        return null;
    }
    // No criteria specified - fallback to all rows
    return exports.AG_GRID_SELECTORS.ROW;
}
/**
 * Check if a matcher can be resolved directly via CSS selector (fast path)
 *
 * @param matcher - Row matching criteria
 * @returns True if matcher can be resolved with CSS selector
 */
function isDirectMatcher(matcher) {
    return (matcher.ariaRowIndex !== undefined ||
        matcher.rowId !== undefined ||
        matcher.rowIndex !== undefined);
}
/**
 * Format a RowMatcher for error messages with meaningful context
 *
 * @param matcher - Row matching criteria
 * @returns Human-readable string describing the matcher
 */
function formatRowMatcher(matcher) {
    const parts = [];
    if (matcher.ariaRowIndex !== undefined) {
        parts.push(`ariaRowIndex=${matcher.ariaRowIndex}`);
    }
    if (matcher.rowId !== undefined) {
        parts.push(`rowId="${matcher.rowId}"`);
    }
    if (matcher.rowIndex !== undefined) {
        parts.push(`rowIndex=${matcher.rowIndex}`);
    }
    if (matcher.cellValues) {
        const cellParts = Object.entries(matcher.cellValues)
            .map(([key, val]) => `${key}="${val}"`)
            .join(', ');
        parts.push(`cellValues={${cellParts}}`);
    }
    if (matcher.predicate) {
        parts.push('predicate=[function]');
    }
    if (parts.length === 0) {
        return '(empty matcher)';
    }
    return parts.join(', ');
}
//# sourceMappingURL=selectors.js.map