"use strict";
/**
 * AG Grid Master/Detail Helpers (Enterprise)
 *
 * Provides utilities for testing master/detail grids.
 *
 * @module grid/ag-grid/enterprise/master-detail
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasDetailView = hasDetailView;
exports.isDetailRowVisible = isDetailRowVisible;
exports.expandMasterRow = expandMasterRow;
exports.collapseMasterRow = collapseMasterRow;
exports.getDetailGrid = getDetailGrid;
exports.getDetailRow = getDetailRow;
exports.waitForDetailReady = waitForDetailReady;
exports.getAllMasterRows = getAllMasterRows;
const selectors_js_1 = require("../selectors.js");
const locators_js_1 = require("../locators.js");
const helper_js_1 = require("../helper.js");
/**
 * Check if a row has a detail view
 *
 * @param rowLocator - The row locator
 * @returns True if the row can show detail
 */
async function hasDetailView(rowLocator) {
    // Check for master row expand icon
    const expandIcon = rowLocator.locator('.ag-group-contracted, .ag-cell-expandable');
    return (await expandIcon.count()) > 0;
}
/**
 * Check if a master row's detail is currently visible
 *
 * @param ctx - Grid locator context
 * @param masterMatcher - Row matching criteria for the master row
 * @returns True if the detail row is visible
 */
async function isDetailRowVisible(ctx, masterMatcher) {
    const masterRow = (0, locators_js_1.getRow)(ctx, masterMatcher);
    const ariaRowIndex = await masterRow.getAttribute('aria-rowindex');
    if (!ariaRowIndex) {
        return false;
    }
    // Detail row typically follows the master row
    const detailRow = ctx.gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.DETAILS_ROW);
    const count = await detailRow.count();
    // Check if any detail row is visible near the master row
    return count > 0;
}
/**
 * Expand a master row to show its detail
 *
 * @param ctx - Grid locator context
 * @param masterMatcher - Row matching criteria for the master row
 */
async function expandMasterRow(ctx, masterMatcher) {
    const masterRow = (0, locators_js_1.getRow)(ctx, masterMatcher);
    // Check if already expanded
    const ariaExpanded = await masterRow.getAttribute('aria-expanded');
    if (ariaExpanded === 'true') {
        return; // Already expanded
    }
    // Click the expand icon
    const expandIcon = masterRow.locator('.ag-group-contracted, .ag-cell-expandable').first();
    const count = await expandIcon.count();
    if (count > 0) {
        await expandIcon.click();
    }
    else {
        // Some configurations use double-click on the row
        await masterRow.dblclick();
    }
    await ctx.page.waitForTimeout(100); // Allow detail to render
}
/**
 * Collapse a master row to hide its detail
 *
 * @param ctx - Grid locator context
 * @param masterMatcher - Row matching criteria for the master row
 */
async function collapseMasterRow(ctx, masterMatcher) {
    const masterRow = (0, locators_js_1.getRow)(ctx, masterMatcher);
    // Check if already collapsed
    const ariaExpanded = await masterRow.getAttribute('aria-expanded');
    if (ariaExpanded !== 'true') {
        return; // Already collapsed
    }
    // Click the collapse icon
    const collapseIcon = masterRow.locator('.ag-group-expanded, .ag-cell-expandable').first();
    const count = await collapseIcon.count();
    if (count > 0) {
        await collapseIcon.click();
    }
    await ctx.page.waitForTimeout(100); // Allow detail to hide
}
/**
 * Get the detail grid helper for a master row
 *
 * @param ctx - Grid locator context
 * @param masterMatcher - Row matching criteria for the master row
 * @returns AG Grid helper for the detail grid
 */
function getDetailGrid(ctx, _masterMatcher) {
    // The detail grid is nested within a detail row
    // We need to scope our selector to find the detail grid within this specific detail row
    // TODO: Use masterMatcher to find the specific detail grid for multi-detail scenarios
    // For now, use a simple approach - find the detail grid within the current master/detail structure
    const detailSelector = `${selectors_js_1.AG_GRID_SELECTORS.DETAILS_ROW} ${selectors_js_1.AG_GRID_SELECTORS.ROOT_WRAPPER}`;
    return new helper_js_1.AgGridHelperImpl(ctx.page, {
        ...ctx.config,
        selector: detailSelector,
    });
}
/**
 * Get the detail row element for a master row
 *
 * @param ctx - Grid locator context
 * @param masterMatcher - Row matching criteria for the master row
 * @returns Locator for the detail row
 */
function getDetailRow(ctx, _masterMatcher) {
    // In AG Grid, detail rows are full-width rows that follow the master row
    // They have the class .ag-details-row or .ag-full-width-row
    // TODO: Use masterMatcher to find the specific detail row for the given master row
    // The detail row should be a sibling following the master row
    // We can use the aria-rowindex to find it
    return ctx.gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.DETAILS_ROW);
}
/**
 * Wait for the detail grid to be ready
 *
 * @param ctx - Grid locator context
 * @param masterMatcher - Row matching criteria for the master row
 * @param options - Wait options
 */
async function waitForDetailReady(ctx, _masterMatcher, options) {
    const timeout = options?.timeout ?? ctx.config.timeouts.gridReady;
    // Wait for detail row to appear
    const detailRow = ctx.gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.DETAILS_ROW);
    // Use a polling approach since the detail might take time to render
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const count = await detailRow.count();
        if (count > 0) {
            // Found detail row, wait a bit for it to fully render
            await ctx.page.waitForTimeout(100);
            return;
        }
        await ctx.page.waitForTimeout(50);
    }
    throw new Error(`Detail row did not appear within ${timeout}ms`);
}
/**
 * Get all master rows that have detail views
 *
 * @param ctx - Grid locator context
 * @returns Array of master row locators
 */
async function getAllMasterRows(ctx) {
    // Master rows typically have an expand icon or are marked as expandable
    const masterRows = ctx.gridLocator.locator('.ag-row:has(.ag-cell-expandable), .ag-row:has(.ag-group-contracted), .ag-row:has(.ag-group-expanded)');
    const count = await masterRows.count();
    const rows = [];
    for (let i = 0; i < count; i++) {
        rows.push(masterRows.nth(i));
    }
    return rows;
}
//# sourceMappingURL=master-detail.js.map