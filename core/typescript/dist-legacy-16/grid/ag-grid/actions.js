"use strict";
/**
 * AG Grid Actions
 *
 * Provides action functions for interacting with grid elements.
 *
 * @module grid/ag-grid/actions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortByColumn = sortByColumn;
exports.filterColumn = filterColumn;
exports.clearFilter = clearFilter;
exports.clearAllFilters = clearAllFilters;
exports.clickCell = clickCell;
exports.editCell = editCell;
exports.pressCellKey = pressCellKey;
exports.selectRow = selectRow;
exports.deselectRow = deselectRow;
exports.selectAllRows = selectAllRows;
exports.deselectAllRows = deselectAllRows;
exports.getSelectedRowIds = getSelectedRowIds;
exports.rightClickCell = rightClickCell;
exports.dragRowTo = dragRowTo;
const selectors_js_1 = require("./selectors.js");
const locators_js_1 = require("./locators.js");
const wait_js_1 = require("./wait.js");
// ============================================================================
// Sorting Actions
// ============================================================================
/**
 * Sort by a column by clicking its header
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID to sort by
 * @param direction - Optional target sort direction ('asc' or 'desc')
 */
async function sortByColumn(ctx, colId, direction) {
    const header = (0, locators_js_1.getHeaderCell)(ctx, colId);
    if (!direction) {
        // Just click once to toggle sort
        await header.click();
        return;
    }
    // Click until desired direction is reached (max 3 clicks: none -> asc -> desc -> none)
    for (let i = 0; i < 3; i++) {
        const currentDirection = await (0, selectors_js_1.getSortDirection)(header);
        if (currentDirection === direction) {
            return; // Already at desired direction
        }
        await header.click();
        await ctx.page.waitForTimeout(100); // Allow sort to apply
    }
    throw new Error(`Could not sort column "${colId}" to "${direction}" after 3 attempts`);
}
// ============================================================================
// Filtering Actions
// ============================================================================
/**
 * Filter a column using the floating filter input
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID to filter
 * @param filterValue - Value to filter by
 */
async function filterColumn(ctx, colId, filterValue) {
    const filterInput = (0, locators_js_1.getFilterInput)(ctx, colId);
    await filterInput.fill(filterValue);
    await ctx.page.waitForTimeout(100); // Allow filter to apply
}
/**
 * Clear the filter for a specific column
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID to clear filter
 */
async function clearFilter(ctx, colId) {
    const filterInput = (0, locators_js_1.getFilterInput)(ctx, colId);
    await filterInput.clear();
    await ctx.page.waitForTimeout(100); // Allow filter to clear
}
/**
 * Clear all filters in the grid
 *
 * @param ctx - Grid locator context
 */
async function clearAllFilters(ctx) {
    const filterInputs = ctx.gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.FLOATING_FILTER} input`);
    const count = await filterInputs.count();
    for (let i = 0; i < count; i++) {
        const input = filterInputs.nth(i);
        const value = await input.inputValue();
        if (value) {
            await input.clear();
        }
    }
    await ctx.page.waitForTimeout(100); // Allow filters to clear
}
// ============================================================================
// Cell Interaction Actions
// ============================================================================
/**
 * Click on a specific cell
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 */
async function clickCell(ctx, rowMatcher, colId) {
    const cell = (0, locators_js_1.getCell)(ctx, rowMatcher, colId);
    await cell.click();
}
/**
 * Double-click to edit a cell and enter a new value
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 * @param newValue - New value to enter
 */
async function editCell(ctx, rowMatcher, colId, newValue) {
    const cell = (0, locators_js_1.getCell)(ctx, rowMatcher, colId);
    // Double-click to enter edit mode
    await cell.dblclick();
    // Wait for edit mode to activate
    await (0, wait_js_1.waitForCellEditing)(cell, ctx.config);
    // Find the input element and fill it
    const input = cell.locator('input, textarea').first();
    await input.fill(newValue);
    // Press Enter to confirm
    await input.press('Enter');
    // Wait for edit mode to close
    await ctx.page.waitForTimeout(100);
}
/**
 * Press a key while focused on a cell
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 * @param key - Key to press (e.g., 'Enter', 'Escape', 'Delete')
 */
async function pressCellKey(ctx, rowMatcher, colId, key) {
    const cell = (0, locators_js_1.getCell)(ctx, rowMatcher, colId);
    await cell.click();
    await cell.press(key);
}
// ============================================================================
// Row Selection Actions
// ============================================================================
/**
 * Select a row by clicking its checkbox or the row itself
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria
 */
async function selectRow(ctx, matcher) {
    const row = (0, locators_js_1.getRow)(ctx, matcher);
    const checkbox = row.locator(`${selectors_js_1.AG_GRID_SELECTORS.SELECTION_CHECKBOX} input`);
    const checkboxCount = await checkbox.count();
    if (checkboxCount > 0) {
        // Use checkbox if available
        const isChecked = await checkbox.isChecked();
        if (!isChecked) {
            await checkbox.check();
        }
    }
    else {
        // Click the row to select (assumes row selection mode)
        await row.click();
    }
}
/**
 * Deselect a row by unchecking its checkbox or clicking it again
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria
 */
async function deselectRow(ctx, matcher) {
    const row = (0, locators_js_1.getRow)(ctx, matcher);
    const checkbox = row.locator(`${selectors_js_1.AG_GRID_SELECTORS.SELECTION_CHECKBOX} input`);
    const checkboxCount = await checkbox.count();
    if (checkboxCount > 0) {
        const isChecked = await checkbox.isChecked();
        if (isChecked) {
            await checkbox.uncheck();
        }
    }
    else {
        // For toggle selection, clicking again deselects
        // Check if currently selected
        const classAttr = await row.getAttribute('class');
        if (classAttr?.includes('ag-row-selected')) {
            await row.click();
        }
    }
}
/**
 * Select all rows using the header checkbox
 *
 * @param ctx - Grid locator context
 */
async function selectAllRows(ctx) {
    const selectAll = ctx.gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.HEADER_SELECT_ALL} input`);
    const count = await selectAll.count();
    if (count > 0) {
        await selectAll.check();
    }
    else {
        throw new Error('Select all checkbox not found. Grid may not have row selection enabled.');
    }
}
/**
 * Deselect all rows using the header checkbox
 *
 * @param ctx - Grid locator context
 */
async function deselectAllRows(ctx) {
    const selectAll = ctx.gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.HEADER_SELECT_ALL} input`);
    const count = await selectAll.count();
    if (count > 0) {
        await selectAll.uncheck();
    }
    else {
        throw new Error('Select all checkbox not found. Grid may not have row selection enabled.');
    }
}
/**
 * Get IDs of all currently selected rows
 *
 * @param ctx - Grid locator context
 * @returns Array of selected row IDs
 */
async function getSelectedRowIds(ctx) {
    const selectedRows = ctx.gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.ROW_SELECTED);
    const count = await selectedRows.count();
    const ids = [];
    for (let i = 0; i < count; i++) {
        const rowId = await selectedRows.nth(i).getAttribute(selectors_js_1.AG_GRID_SELECTORS.ATTR_ROW_ID);
        if (rowId) {
            ids.push(rowId);
        }
    }
    return ids;
}
// ============================================================================
// Context Menu Actions
// ============================================================================
/**
 * Right-click on a cell to open context menu
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 */
async function rightClickCell(ctx, rowMatcher, colId) {
    const cell = (0, locators_js_1.getCell)(ctx, rowMatcher, colId);
    await cell.click({ button: 'right' });
}
// ============================================================================
// Drag and Drop Actions
// ============================================================================
/**
 * Drag a row to a new position (for row reordering)
 *
 * @param ctx - Grid locator context
 * @param sourceMatcher - Source row matching criteria
 * @param targetMatcher - Target row matching criteria
 */
async function dragRowTo(ctx, sourceMatcher, targetMatcher) {
    const sourceRow = (0, locators_js_1.getRow)(ctx, sourceMatcher);
    const targetRow = (0, locators_js_1.getRow)(ctx, targetMatcher);
    // Find the drag handle if it exists
    const dragHandle = sourceRow.locator('.ag-drag-handle').first();
    const handleCount = await dragHandle.count();
    const dragSource = handleCount > 0 ? dragHandle : sourceRow;
    await dragSource.dragTo(targetRow);
}
//# sourceMappingURL=actions.js.map