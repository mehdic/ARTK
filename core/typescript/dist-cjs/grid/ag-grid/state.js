"use strict";
/**
 * AG Grid State Extraction
 *
 * Provides utilities for extracting the current grid state.
 *
 * @module grid/ag-grid/state
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGridState = getGridState;
exports.getSortState = getSortState;
exports.checkIsLoading = checkIsLoading;
exports.getTotalRowCount = getTotalRowCount;
exports.isNoRowsOverlayVisible = isNoRowsOverlayVisible;
exports.getGroupedColumns = getGroupedColumns;
const selectors_js_1 = require("./selectors.js");
const row_data_js_1 = require("./row-data.js");
/**
 * Extract the current state of the grid
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Current grid state
 */
async function getGridState(gridLocator, _config) {
    const [visibleRows, selectedRows, sortedBy, isLoading, totalRows] = await Promise.all([
        (0, row_data_js_1.countVisibleRows)(gridLocator),
        (0, row_data_js_1.countSelectedRows)(gridLocator),
        getSortState(gridLocator),
        checkIsLoading(gridLocator),
        getTotalRowCount(gridLocator),
    ]);
    const state = {
        totalRows,
        visibleRows,
        selectedRows,
        isLoading,
    };
    if (sortedBy.length > 0) {
        state.sortedBy = sortedBy;
    }
    // TODO: Extract filter state (more complex, depends on filter type)
    // TODO: Extract groupedBy (enterprise feature)
    return state;
}
/**
 * Get the current sort state from header cells
 *
 * @param gridLocator - The grid root locator
 * @returns Array of sort models
 */
async function getSortState(gridLocator) {
    const headerCells = gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.HEADER_CELL);
    const cellCount = await headerCells.count();
    const sortedColumns = [];
    for (let i = 0; i < cellCount; i++) {
        const cell = headerCells.nth(i);
        const colId = await cell.getAttribute(selectors_js_1.AG_GRID_SELECTORS.ATTR_COL_ID);
        const direction = await (0, selectors_js_1.getSortDirection)(cell);
        if (colId && direction) {
            sortedColumns.push({ colId, direction });
        }
    }
    return sortedColumns;
}
/**
 * Check if an overlay element is visible
 * Handles AG Grid's overlay visibility patterns (CSS class and display)
 *
 * @param overlayLocator - Locator for the overlay element
 * @returns True if overlay is visible
 */
async function isOverlayVisible(overlayLocator) {
    const count = await overlayLocator.count();
    if (count === 0) {
        return false;
    }
    // Check if the overlay has the .visible class (AG Grid pattern)
    const visibleOverlay = overlayLocator.locator('.visible');
    const visibleCount = await visibleOverlay.count();
    if (visibleCount > 0) {
        return true;
    }
    // Check if it's actually visible (not display: none)
    try {
        const isVisible = await overlayLocator.first().isVisible({ timeout: 100 });
        return isVisible;
    }
    catch {
        return false;
    }
}
/**
 * Check if the grid is in a loading state
 *
 * @param gridLocator - The grid root locator
 * @returns True if loading overlay is visible
 */
async function checkIsLoading(gridLocator) {
    const loadingOverlay = gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.LOADING_OVERLAY);
    return isOverlayVisible(loadingOverlay);
}
/**
 * Get the total row count
 *
 * This tries multiple strategies:
 * 1. Read from pagination info if available
 * 2. Count visible rows if no pagination
 *
 * @param gridLocator - The grid root locator
 * @returns Total row count
 */
async function getTotalRowCount(gridLocator) {
    // Strategy 1: Check for pagination info
    // AG Grid typically has pagination info like "1 to 10 of 100"
    const paginationPanel = gridLocator.locator('.ag-paging-panel');
    const paginationCount = await paginationPanel.count();
    if (paginationCount > 0) {
        const paginationText = await paginationPanel.textContent();
        if (paginationText) {
            // Try to extract "of X" pattern
            const match = paginationText.match(/of\s*(\d+)/i);
            const matchedValue = match?.[1];
            if (matchedValue) {
                return parseInt(matchedValue, 10);
            }
        }
    }
    // Strategy 2: Check for row count in status bar
    const statusBar = gridLocator.locator('.ag-status-bar');
    const statusBarCount = await statusBar.count();
    if (statusBarCount > 0) {
        const statusText = await statusBar.textContent();
        if (statusText) {
            const match = statusText.match(/(\d+)\s*(rows?|records?|items?)/i);
            const matchedValue = match?.[1];
            if (matchedValue) {
                return parseInt(matchedValue, 10);
            }
        }
    }
    // Strategy 3: Count visible rows (fallback)
    return (0, row_data_js_1.countVisibleRows)(gridLocator);
}
/**
 * Check if the "no rows" overlay is visible
 *
 * @param gridLocator - The grid root locator
 * @returns True if no rows overlay is visible
 */
async function isNoRowsOverlayVisible(gridLocator) {
    const noRowsOverlay = gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.NO_ROWS_OVERLAY);
    return isOverlayVisible(noRowsOverlay);
}
/**
 * Get the columns that are currently grouped (enterprise feature)
 *
 * @param gridLocator - The grid root locator
 * @returns Array of column IDs used for grouping
 */
async function getGroupedColumns(gridLocator) {
    // AG Grid shows grouped columns in a row group panel
    const rowGroupPanel = gridLocator.locator('.ag-column-drop-row-group');
    const count = await rowGroupPanel.count();
    if (count === 0) {
        return [];
    }
    // Extract column IDs from the chips in the panel
    const chips = rowGroupPanel.locator('.ag-column-drop-cell');
    const chipCount = await chips.count();
    const groupedColumns = [];
    for (let i = 0; i < chipCount; i++) {
        const chip = chips.nth(i);
        const colId = await chip.getAttribute('col-id');
        if (colId) {
            groupedColumns.push(colId);
        }
    }
    return groupedColumns;
}
//# sourceMappingURL=state.js.map