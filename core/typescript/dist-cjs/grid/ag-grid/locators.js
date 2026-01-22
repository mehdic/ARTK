"use strict";
/**
 * AG Grid Locators
 *
 * Provides locator factories for AG Grid elements.
 *
 * @module grid/ag-grid/locators
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLocatorContext = createLocatorContext;
exports.getGrid = getGrid;
exports.getRow = getRow;
exports.getVisibleRows = getVisibleRows;
exports.getCell = getCell;
exports.getHeaderCell = getHeaderCell;
exports.getFilterInput = getFilterInput;
exports.getLoadingOverlay = getLoadingOverlay;
exports.getNoRowsOverlay = getNoRowsOverlay;
exports.getSelectAllCheckbox = getSelectAllCheckbox;
exports.getRowSelectionCheckbox = getRowSelectionCheckbox;
exports.getGroupIcon = getGroupIcon;
exports.getBodyViewport = getBodyViewport;
exports.getDetailRow = getDetailRow;
const selectors_js_1 = require("./selectors.js");
const config_js_1 = require("./config.js");
/**
 * Create the grid locator context
 *
 * @param page - Playwright page
 * @param config - Normalized grid configuration
 * @returns Grid locator context
 */
function createLocatorContext(page, config) {
    return {
        page,
        config,
        gridLocator: (0, selectors_js_1.getGridRoot)(page, config.selector),
    };
}
/**
 * Get the root grid container locator
 *
 * @param ctx - Grid locator context
 * @returns Grid root locator
 */
function getGrid(ctx) {
    return ctx.gridLocator;
}
/**
 * Get a specific row by matcher criteria
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria
 * @returns Row locator
 */
function getRow(ctx, matcher) {
    const { gridLocator } = ctx;
    // Use shared row matcher logic with consistent priority order
    const selector = (0, selectors_js_1.buildRowSelectorFromMatcher)(matcher);
    if (selector) {
        return gridLocator.locator(selector);
    }
    // For cellValues/predicate, return all rows (filtering will be done async)
    return gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.ROW);
}
/**
 * Get all visible rows in the grid
 *
 * @param ctx - Grid locator context
 * @returns Locator for all visible rows
 */
function getVisibleRows(ctx) {
    return ctx.gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.ROW);
}
/**
 * Get a specific cell by row matcher and column ID
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 * @returns Cell locator
 */
function getCell(ctx, rowMatcher, colId) {
    const { gridLocator, config } = ctx;
    // Check if column is pinned (if column config is provided)
    const pinnedPosition = (0, config_js_1.getColumnPinnedPosition)(config, colId);
    if (pinnedPosition) {
        // For pinned columns, search in the appropriate container
        const containerSelector = pinnedPosition === 'left'
            ? selectors_js_1.AG_GRID_SELECTORS.PINNED_LEFT_CONTAINER
            : selectors_js_1.AG_GRID_SELECTORS.PINNED_RIGHT_CONTAINER;
        const rowSelector = (0, selectors_js_1.buildRowSelectorFromMatcher)(rowMatcher) ?? selectors_js_1.AG_GRID_SELECTORS.ROW;
        return gridLocator
            .locator(containerSelector)
            .locator(rowSelector)
            .locator((0, selectors_js_1.buildCellSelector)(colId));
    }
    // Standard path: use row locator then find cell
    const rowLocator = getRow(ctx, rowMatcher);
    return rowLocator.locator((0, selectors_js_1.buildCellSelector)(colId));
}
/**
 * Get a header cell by column ID
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID
 * @returns Header cell locator
 */
function getHeaderCell(ctx, colId) {
    return ctx.gridLocator.locator((0, selectors_js_1.buildHeaderCellSelector)(colId));
}
/**
 * Get the floating filter input for a column
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID
 * @returns Filter input locator
 */
function getFilterInput(ctx, colId) {
    return ctx.gridLocator.locator((0, selectors_js_1.buildFilterInputSelector)(colId));
}
/**
 * Get the loading overlay locator
 *
 * @param ctx - Grid locator context
 * @returns Loading overlay locator
 */
function getLoadingOverlay(ctx) {
    return ctx.gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.LOADING_OVERLAY);
}
/**
 * Get the "no rows" overlay locator
 *
 * @param ctx - Grid locator context
 * @returns No rows overlay locator
 */
function getNoRowsOverlay(ctx) {
    return ctx.gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.NO_ROWS_OVERLAY);
}
/**
 * Get the header select-all checkbox
 *
 * @param ctx - Grid locator context
 * @returns Select-all checkbox locator
 */
function getSelectAllCheckbox(ctx) {
    return ctx.gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.HEADER_SELECT_ALL);
}
/**
 * Get the selection checkbox for a row
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @returns Row selection checkbox locator
 */
function getRowSelectionCheckbox(ctx, rowMatcher) {
    const rowLocator = getRow(ctx, rowMatcher);
    return rowLocator.locator(selectors_js_1.AG_GRID_SELECTORS.SELECTION_CHECKBOX);
}
/**
 * Get the group expand/collapse icon for a row
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @returns Group icon locator
 */
function getGroupIcon(ctx, rowMatcher) {
    const rowLocator = getRow(ctx, rowMatcher);
    return rowLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.GROUP_EXPANDED}, ${selectors_js_1.AG_GRID_SELECTORS.GROUP_CONTRACTED}`);
}
/**
 * Get the body viewport (scrollable container)
 *
 * @param ctx - Grid locator context
 * @returns Body viewport locator
 */
function getBodyViewport(ctx) {
    return ctx.gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.BODY_VIEWPORT);
}
/**
 * Get the detail row for a master row (enterprise)
 *
 * @param ctx - Grid locator context
 * @param masterRowMatcher - Master row matching criteria
 * @returns Detail row locator
 */
function getDetailRow(ctx, masterRowMatcher) {
    const masterRow = getRow(ctx, masterRowMatcher);
    // Detail row is typically a sibling or following row with .ag-details-row class
    // In AG Grid, detail rows follow their master row
    if (masterRowMatcher.ariaRowIndex !== undefined) {
        // Detail row has aria-rowindex = master + 1 for detail
        return ctx.gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.DETAILS_ROW}, ${selectors_js_1.AG_GRID_SELECTORS.FULL_WIDTH_ROW}`).filter({
            has: masterRow.page().locator(`[aria-rowindex="${masterRowMatcher.ariaRowIndex + 1}"]`),
        });
    }
    // Fallback: find detail row near the master row
    return ctx.gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.DETAILS_ROW);
}
//# sourceMappingURL=locators.js.map