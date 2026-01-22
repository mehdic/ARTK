"use strict";
/**
 * AG Grid Wait Utilities
 *
 * Provides wait functions for grid ready states and data loading.
 *
 * @module grid/ag-grid/wait
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForReady = waitForReady;
exports.waitForDataLoaded = waitForDataLoaded;
exports.waitForRowCount = waitForRowCount;
exports.waitForAnyRows = waitForAnyRows;
exports.waitForRow = waitForRow;
exports.waitForNoRowsOverlay = waitForNoRowsOverlay;
exports.waitForCellEditing = waitForCellEditing;
const test_1 = require("@playwright/test");
const selectors_js_1 = require("./selectors.js");
/**
 * Wait for the grid to be fully rendered and ready for interaction
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Wait options
 */
async function waitForReady(gridLocator, config, options) {
    const timeout = options?.timeout ?? config.timeouts.gridReady;
    // Wait for root wrapper to be visible
    await (0, test_1.expect)(gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.ROOT_WRAPPER).or(gridLocator))
        .toBeVisible({ timeout });
    // Wait for header to be visible (indicates grid structure is rendered)
    await (0, test_1.expect)(gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.HEADER))
        .toBeVisible({ timeout });
    // Wait for loading overlay to disappear (if present)
    await waitForDataLoaded(gridLocator, config, { timeout });
}
/**
 * Wait for the loading overlay to disappear
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Wait options
 */
async function waitForDataLoaded(gridLocator, config, options) {
    const timeout = options?.timeout ?? config.timeouts.gridReady;
    const loadingOverlay = gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.LOADING_OVERLAY);
    // Check if loading overlay exists
    const overlayCount = await loadingOverlay.count();
    if (overlayCount > 0) {
        // Check if it has the .visible class (our test fixture pattern)
        const visibleOverlay = loadingOverlay.locator('.visible');
        const visibleCount = await visibleOverlay.count();
        if (visibleCount > 0) {
            // Wait for .visible class to be removed
            await (0, test_1.expect)(visibleOverlay).toHaveCount(0, { timeout });
        }
        // If no .visible class, assume it's hidden (display: none is the default in our fixture)
    }
}
/**
 * Wait for a specific number of rows to be visible
 *
 * @param gridLocator - The grid root locator
 * @param count - Expected row count
 * @param config - Normalized grid configuration
 * @param options - Wait options
 */
async function waitForRowCount(gridLocator, count, config, options) {
    const timeout = options?.timeout ?? config.timeouts.rowLoad;
    const rows = gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.ROW);
    await (0, test_1.expect)(rows).toHaveCount(count, { timeout });
}
/**
 * Wait for at least one row to be visible
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Wait options
 */
async function waitForAnyRows(gridLocator, config, options) {
    const timeout = options?.timeout ?? config.timeouts.rowLoad;
    const rows = gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.ROW);
    // Wait for at least one row
    await (0, test_1.expect)(rows.first()).toBeVisible({ timeout });
}
/**
 * Wait for a specific row to appear in the DOM
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matching criteria
 * @param config - Normalized grid configuration
 * @param options - Wait options
 * @returns Locator for the found row
 */
async function waitForRow(gridLocator, matcher, config, options) {
    const timeout = options?.timeout ?? config.timeouts.rowLoad;
    // Build row selector based on matcher
    let rowLocator;
    if (matcher.ariaRowIndex !== undefined) {
        rowLocator = gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW}[${selectors_js_1.AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX}="${matcher.ariaRowIndex}"]`);
    }
    else if (matcher.rowId !== undefined) {
        rowLocator = gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW}[${selectors_js_1.AG_GRID_SELECTORS.ATTR_ROW_ID}="${matcher.rowId}"]`);
    }
    else if (matcher.rowIndex !== undefined) {
        rowLocator = gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW}[${selectors_js_1.AG_GRID_SELECTORS.ATTR_ROW_INDEX}="${matcher.rowIndex}"]`);
    }
    else {
        // For cellValues matcher, we need more complex logic (handled elsewhere)
        // Default to first row
        rowLocator = gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.ROW).first();
    }
    await (0, test_1.expect)(rowLocator).toBeVisible({ timeout });
    return rowLocator;
}
/**
 * Wait for the grid to show the "no rows" overlay
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Wait options
 */
async function waitForNoRowsOverlay(gridLocator, config, options) {
    const timeout = options?.timeout ?? config.timeouts.gridReady;
    const noRowsOverlay = gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.NO_ROWS_OVERLAY);
    // Wait for no rows overlay to be visible (either by .visible class or actual visibility)
    await (0, test_1.expect)(noRowsOverlay.filter({ has: gridLocator.page().locator('.visible') })
        .or(noRowsOverlay)).toBeVisible({ timeout });
}
/**
 * Wait for a cell to be in edit mode
 *
 * @param cellLocator - The cell locator
 * @param config - Normalized grid configuration
 * @param options - Wait options
 */
async function waitForCellEditing(cellLocator, config, options) {
    const timeout = options?.timeout ?? config.timeouts.cellEdit;
    // AG Grid adds specific classes when a cell is being edited
    await (0, test_1.expect)(cellLocator.locator('.ag-cell-edit-wrapper').or(cellLocator.locator('input, textarea'))).toBeVisible({ timeout });
}
//# sourceMappingURL=wait.js.map