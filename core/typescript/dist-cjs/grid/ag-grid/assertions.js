"use strict";
/**
 * AG Grid Assertions
 *
 * Provides assertion functions for grid state verification.
 *
 * @module grid/ag-grid/assertions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectRowCount = expectRowCount;
exports.expectRowContains = expectRowContains;
exports.expectRowNotContains = expectRowNotContains;
exports.expectCellValue = expectCellValue;
exports.expectSortedBy = expectSortedBy;
exports.expectEmpty = expectEmpty;
exports.expectNoRowsOverlay = expectNoRowsOverlay;
exports.expectRowSelected = expectRowSelected;
const test_1 = require("@playwright/test");
const selectors_js_1 = require("./selectors.js");
const config_js_1 = require("./config.js");
const row_data_js_1 = require("./row-data.js");
const state_js_1 = require("./state.js");
/**
 * Assert that the grid has the expected row count
 *
 * @param gridLocator - The grid root locator
 * @param count - Expected row count
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
async function expectRowCount(gridLocator, count, config, options) {
    const timeout = options?.timeout ?? 5000;
    const rows = gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.ROW);
    // Handle range assertions
    if (options?.min !== undefined || options?.max !== undefined) {
        const actualCount = await rows.count();
        if (options.min !== undefined && actualCount < options.min) {
            throw new Error(`Grid "${config.selector}" has ${actualCount} rows, expected at least ${options.min}`);
        }
        if (options.max !== undefined && actualCount > options.max) {
            throw new Error(`Grid "${config.selector}" has ${actualCount} rows, expected at most ${options.max}`);
        }
        return;
    }
    // Exact count assertion
    await (0, test_1.expect)(rows).toHaveCount(count, { timeout });
}
/**
 * Assert that the grid contains a row matching the given cell values
 *
 * @param gridLocator - The grid root locator
 * @param cellValues - Expected cell values
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
async function expectRowContains(gridLocator, cellValues, config, options) {
    const timeout = options?.timeout ?? 5000;
    const startTime = Date.now();
    // Poll until timeout
    while (Date.now() - startTime < timeout) {
        const match = await (0, row_data_js_1.findRowByMatcher)(gridLocator, { cellValues }, config);
        if (match) {
            return; // Found a matching row
        }
        // Small delay before retry
        await gridLocator.page().waitForTimeout(100);
    }
    // No match found - build detailed error message
    const visibleRowCount = await (0, row_data_js_1.countVisibleRows)(gridLocator);
    const closestMatch = await (0, row_data_js_1.findClosestMatch)(gridLocator, cellValues, config);
    let errorMessage = `Grid "${config.selector}" does not contain a row matching:\n`;
    errorMessage += `   Expected: ${formatCellValues(cellValues, config)}\n\n`;
    errorMessage += `   Visible rows checked: ${visibleRowCount}\n`;
    if (closestMatch && closestMatch.matchedFields > 0) {
        errorMessage += `   Closest match: ${formatCellValues(closestMatch.row.cells, config)}\n`;
        errorMessage += `   Mismatched fields:\n`;
        for (const mismatch of closestMatch.mismatches) {
            const displayName = (0, config_js_1.getColumnDisplayName)(config, mismatch.field);
            errorMessage += `     - ${displayName}: expected "${String(mismatch.expected)}", got "${String(mismatch.actual)}"\n`;
        }
    }
    else {
        errorMessage += `   No similar rows found\n`;
    }
    errorMessage += `\n   Tip: If the row exists but isn't visible, it may require scrolling.\n`;
    errorMessage += `   The helper automatically scrolls for you - check if the data exists.`;
    throw new Error(errorMessage);
}
/**
 * Assert that the grid does NOT contain a row matching the given cell values
 *
 * @param gridLocator - The grid root locator
 * @param cellValues - Cell values that should NOT match any row
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
async function expectRowNotContains(gridLocator, cellValues, config, options) {
    const timeout = options?.timeout ?? 5000;
    const startTime = Date.now();
    // Poll until timeout to ensure row doesn't appear
    while (Date.now() - startTime < timeout) {
        const allRows = await (0, row_data_js_1.getAllVisibleRowData)(gridLocator, config);
        let foundMatch = false;
        for (const rowData of allRows) {
            if ((0, row_data_js_1.matchesCellValues)(rowData, cellValues)) {
                foundMatch = true;
                break;
            }
        }
        if (foundMatch) {
            // Found a match - this is a failure, wait a bit and check again
            // (the row might be about to be removed)
            await gridLocator.page().waitForTimeout(100);
        }
        else {
            // No match - success
            return;
        }
    }
    // Timeout reached and row still exists
    throw new Error(`Grid "${config.selector}" contains a row matching:\n` +
        `   ${formatCellValues(cellValues, config)}\n\n` +
        `   Expected this row to NOT exist.`);
}
/**
 * Assert that a specific cell has the expected value
 *
 * @param gridLocator - The grid root locator
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 * @param expectedValue - Expected cell value
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
async function expectCellValue(gridLocator, rowMatcher, colId, expectedValue, config, options) {
    const _timeout = options?.timeout ?? 5000;
    void _timeout; // Reserved for future retry logic
    const exact = options?.exact ?? false;
    const match = await (0, row_data_js_1.findRowByMatcher)(gridLocator, rowMatcher, config);
    if (!match) {
        throw new Error(`Grid "${config.selector}": Could not find row matching ${formatMatcher(rowMatcher)}`);
    }
    const actualValue = match.data.cells[colId];
    const displayName = (0, config_js_1.getColumnDisplayName)(config, colId);
    if (exact) {
        // Exact match
        if (actualValue !== expectedValue) {
            throw new Error(`Grid "${config.selector}": Cell "${displayName}" has value "${String(actualValue)}", expected exactly "${String(expectedValue)}"`);
        }
    }
    else {
        // Normalized comparison
        const normalizedExpected = normalizeForComparison(expectedValue);
        const normalizedActual = normalizeForComparison(actualValue);
        if (normalizedExpected !== normalizedActual) {
            throw new Error(`Grid "${config.selector}": Cell "${displayName}" has value "${String(actualValue)}", expected "${String(expectedValue)}"`);
        }
    }
}
/**
 * Assert that the grid is sorted by a specific column
 *
 * @param gridLocator - The grid root locator
 * @param colId - Column ID
 * @param direction - Expected sort direction
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
async function expectSortedBy(gridLocator, colId, direction, config, _options) {
    const sortState = await (0, state_js_1.getSortState)(gridLocator);
    const columnSort = sortState.find((s) => s.colId === colId);
    const displayName = (0, config_js_1.getColumnDisplayName)(config, colId);
    if (!columnSort) {
        const sortedCols = sortState.map((s) => `${s.colId} (${s.direction})`).join(', ') || 'none';
        throw new Error(`Grid "${config.selector}": Column "${displayName}" is not sorted. Currently sorted: ${sortedCols}`);
    }
    if (columnSort.direction !== direction) {
        throw new Error(`Grid "${config.selector}": Column "${displayName}" is sorted "${columnSort.direction}", expected "${direction}"`);
    }
}
/**
 * Assert that the grid is empty (no data rows)
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
async function expectEmpty(gridLocator, _config, options) {
    const timeout = options?.timeout ?? 5000;
    const rows = gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.ROW);
    await (0, test_1.expect)(rows).toHaveCount(0, { timeout });
}
/**
 * Assert that the "no rows" overlay is visible
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
async function expectNoRowsOverlay(gridLocator, config, _options) {
    const isVisible = await (0, state_js_1.isNoRowsOverlayVisible)(gridLocator);
    if (!isVisible) {
        const rowCount = await (0, row_data_js_1.countVisibleRows)(gridLocator);
        throw new Error(`Grid "${config.selector}": "No rows" overlay is not visible. Grid has ${rowCount} rows.`);
    }
}
/**
 * Assert that a row is selected
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matching criteria
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
async function expectRowSelected(gridLocator, matcher, config, _options) {
    const match = await (0, row_data_js_1.findRowByMatcher)(gridLocator, matcher, config);
    if (!match) {
        throw new Error(`Grid "${config.selector}": Could not find row matching ${formatMatcher(matcher)}`);
    }
    const selected = await (0, selectors_js_1.isRowSelected)(match.row);
    if (!selected) {
        throw new Error(`Grid "${config.selector}": Row matching ${formatMatcher(matcher)} is not selected`);
    }
}
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Format cell values for error messages
 */
function formatCellValues(values, config) {
    const parts = [];
    for (const [colId, value] of Object.entries(values)) {
        const displayName = (0, config_js_1.getColumnDisplayName)(config, colId);
        parts.push(`${displayName}: "${String(value)}"`);
    }
    return `{ ${parts.join(', ')} }`;
}
/**
 * Format a row matcher for error messages
 */
function formatMatcher(matcher) {
    if (matcher.ariaRowIndex !== undefined) {
        return `aria-rowindex=${matcher.ariaRowIndex}`;
    }
    if (matcher.rowId !== undefined) {
        return `row-id="${matcher.rowId}"`;
    }
    if (matcher.rowIndex !== undefined) {
        return `row-index=${matcher.rowIndex}`;
    }
    if (matcher.cellValues) {
        return JSON.stringify(matcher.cellValues);
    }
    return '<custom predicate>';
}
/**
 * Normalize a value for comparison
 */
function normalizeForComparison(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'string') {
        return value.trim().toLowerCase();
    }
    return String(value).trim().toLowerCase();
}
//# sourceMappingURL=assertions.js.map