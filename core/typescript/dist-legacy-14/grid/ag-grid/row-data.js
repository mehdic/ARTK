"use strict";
/**
 * AG Grid Row Data Extraction
 *
 * Provides utilities for extracting and finding row data.
 *
 * @module grid/ag-grid/row-data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRowData = getRowData;
exports.getAllVisibleRowData = getAllVisibleRowData;
exports.findRowByMatcher = findRowByMatcher;
exports.matchesCellValues = matchesCellValues;
exports.findClosestMatch = findClosestMatch;
exports.countVisibleRows = countVisibleRows;
exports.countSelectedRows = countSelectedRows;
const selectors_js_1 = require("./selectors.js");
const cell_renderers_js_1 = require("./cell-renderers.js");
/**
 * Extract data from a row element
 *
 * @param rowLocator - The row locator
 * @param config - Normalized grid configuration
 * @returns Extracted row data
 */
async function getRowData(rowLocator, config) {
    const [ariaRowIndex, rowIndex, rowId, isGroup, isExpanded, cells] = await Promise.all([
        (0, selectors_js_1.getAriaRowIndex)(rowLocator),
        (0, selectors_js_1.getRowIndex)(rowLocator),
        (0, selectors_js_1.getRowId)(rowLocator),
        (0, selectors_js_1.isGroupRow)(rowLocator),
        (0, selectors_js_1.isRowExpanded)(rowLocator),
        (0, cell_renderers_js_1.getAllCellValues)(rowLocator, config),
    ]);
    const rowData = {
        rowIndex,
        ariaRowIndex,
        cells,
    };
    if (rowId) {
        rowData.rowId = rowId;
    }
    if (isGroup) {
        rowData.isGroup = true;
        rowData.isExpanded = isExpanded;
        // Try to get group level from aria attribute or class
        const level = await rowLocator.getAttribute('aria-level');
        if (level) {
            rowData.groupLevel = parseInt(level, 10);
        }
    }
    return rowData;
}
/**
 * Extract data from all visible rows
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Array of row data
 */
async function getAllVisibleRowData(gridLocator, config) {
    const rows = gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.ROW);
    const rowCount = await rows.count();
    const results = [];
    for (let i = 0; i < rowCount; i++) {
        const rowLocator = rows.nth(i);
        const rowData = await getRowData(rowLocator, config);
        results.push(rowData);
    }
    return results;
}
/**
 * Find a row by matching criteria
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matching criteria
 * @param config - Normalized grid configuration
 * @returns Locator for the matching row, or null if not found
 */
async function findRowByMatcher(gridLocator, matcher, config) {
    // Fast path: Direct CSS selector matchers (ariaRowIndex, rowId, rowIndex)
    if ((0, selectors_js_1.isDirectMatcher)(matcher)) {
        const selector = (0, selectors_js_1.buildRowSelectorFromMatcher)(matcher);
        if (selector) {
            const row = gridLocator.locator(selector);
            const count = await row.count();
            if (count > 0) {
                return { row: row.first(), data: await getRowData(row.first(), config) };
            }
        }
        return null;
    }
    // Slow path: Cell values or predicate matching (requires iterating)
    if (matcher.cellValues || matcher.predicate) {
        const allRows = await getAllVisibleRowData(gridLocator, config);
        for (let i = 0; i < allRows.length; i++) {
            const rowData = allRows[i];
            if (!rowData) {
                continue;
            }
            const matches = matcher.cellValues
                ? matchesCellValues(rowData, matcher.cellValues)
                : matcher.predicate?.(rowData);
            if (matches) {
                const row = gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.ROW).nth(i);
                return { row, data: rowData };
            }
        }
        return null;
    }
    return null;
}
/**
 * Check if a row's cell values match the expected values
 *
 * @param rowData - Row data to check
 * @param expectedValues - Expected cell values
 * @returns True if all expected values match
 */
function matchesCellValues(rowData, expectedValues) {
    for (const [colId, expectedValue] of Object.entries(expectedValues)) {
        const actualValue = rowData.cells[colId];
        // Normalize both values for comparison
        const normalizedExpected = normalizeForComparison(expectedValue);
        const normalizedActual = normalizeForComparison(actualValue);
        if (normalizedExpected !== normalizedActual) {
            return false;
        }
    }
    return true;
}
/**
 * Find the closest matching row for error messages
 *
 * @param gridLocator - The grid root locator
 * @param expectedValues - Expected cell values
 * @param config - Normalized grid configuration
 * @returns Closest match result
 */
async function findClosestMatch(gridLocator, expectedValues, config) {
    const allRows = await getAllVisibleRowData(gridLocator, config);
    if (allRows.length === 0) {
        return null;
    }
    let bestMatch = null;
    let bestMatchCount = -1;
    const expectedKeys = Object.keys(expectedValues);
    const totalFields = expectedKeys.length;
    for (const rowData of allRows) {
        let matchedFields = 0;
        const mismatches = [];
        for (const colId of expectedKeys) {
            const expectedValue = expectedValues[colId];
            const actualValue = rowData.cells[colId];
            const normalizedExpected = normalizeForComparison(expectedValue);
            const normalizedActual = normalizeForComparison(actualValue);
            if (normalizedExpected === normalizedActual) {
                matchedFields++;
            }
            else {
                mismatches.push({
                    field: colId,
                    expected: expectedValue,
                    actual: actualValue,
                });
            }
        }
        if (matchedFields > bestMatchCount) {
            bestMatchCount = matchedFields;
            bestMatch = {
                row: rowData,
                matchedFields,
                totalFields,
                mismatches,
            };
        }
    }
    return bestMatch;
}
/**
 * Normalize a value for comparison
 *
 * @param value - Value to normalize
 * @returns Normalized string value
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
/**
 * Count visible rows in the grid
 *
 * @param gridLocator - The grid root locator
 * @returns Number of visible rows
 */
async function countVisibleRows(gridLocator) {
    return gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.ROW).count();
}
/**
 * Count selected rows in the grid
 *
 * @param gridLocator - The grid root locator
 * @returns Number of selected rows
 */
async function countSelectedRows(gridLocator) {
    return gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.ROW_SELECTED).count();
}
//# sourceMappingURL=row-data.js.map