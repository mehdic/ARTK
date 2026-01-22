"use strict";
/**
 * AG Grid Range Selection Support
 *
 * Provides utilities for testing grids with range selection,
 * including multi-cell selection, drag selection, and clipboard operations.
 *
 * @module grid/ag-grid/enterprise/range-selection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RANGE_SELECTION_SELECTORS = void 0;
exports.selectCellRange = selectCellRange;
exports.selectCellsByDrag = selectCellsByDrag;
exports.addCellToSelection = addCellToSelection;
exports.clearRangeSelection = clearRangeSelection;
exports.getRangeSelectionState = getRangeSelectionState;
exports.getSelectedRangeValues = getSelectedRangeValues;
exports.expectRangeSelected = expectRangeSelected;
exports.copySelectedCells = copySelectedCells;
exports.pasteToSelectedCells = pasteToSelectedCells;
exports.getFocusedCell = getFocusedCell;
exports.isCellSelected = isCellSelected;
exports.getFillHandle = getFillHandle;
exports.fillDown = fillDown;
exports.fillRight = fillRight;
const test_1 = require("@playwright/test");
const selectors_js_1 = require("../selectors.js");
/**
 * AG Grid range selection CSS selectors
 */
exports.RANGE_SELECTION_SELECTORS = {
    /** Cell in range selection */
    RANGE_CELL: '.ag-cell-range-selected',
    /** Single cell selection */
    RANGE_SINGLE: '.ag-cell-range-single-cell',
    /** Top edge of range */
    RANGE_TOP: '.ag-cell-range-top',
    /** Bottom edge of range */
    RANGE_BOTTOM: '.ag-cell-range-bottom',
    /** Left edge of range */
    RANGE_LEFT: '.ag-cell-range-left',
    /** Right edge of range */
    RANGE_RIGHT: '.ag-cell-range-right',
    /** Fill handle for drag-fill */
    FILL_HANDLE: '.ag-fill-handle',
    /** Range handle for resize */
    RANGE_HANDLE: '.ag-range-handle',
    /** Focused cell */
    CELL_FOCUS: '.ag-cell-focus',
    /** Range chart */
    RANGE_CHART: '.ag-cell-range-chart',
    /** Range category */
    RANGE_CHART_CATEGORY: '.ag-cell-range-chart-category',
};
/**
 * Get the cell locator for a specific position
 *
 * @param gridLocator - The grid root locator
 * @param position - Cell position
 * @returns Cell locator
 */
function getCellLocator(gridLocator, position) {
    const rowSelector = (0, selectors_js_1.buildRowSelectorFromMatcher)(position.rowMatcher);
    if (rowSelector) {
        return gridLocator.locator(rowSelector).locator(`${selectors_js_1.AG_GRID_SELECTORS.CELL}[col-id="${position.colId}"]`);
    }
    // Fallback: find all rows and filter
    return gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW} ${selectors_js_1.AG_GRID_SELECTORS.CELL}[col-id="${position.colId}"]`);
}
/**
 * Select a range of cells
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param range - Cell range to select
 * @param config - Normalized grid configuration
 * @param options - Range selection options
 */
async function selectCellRange(gridLocator, _page, range, _config, options) {
    const startCell = getCellLocator(gridLocator, range.start);
    const endCell = getCellLocator(gridLocator, range.end);
    // Verify cells exist
    await (0, test_1.expect)(startCell.first()).toBeVisible({ timeout: 5000 });
    await (0, test_1.expect)(endCell.first()).toBeVisible({ timeout: 5000 });
    const modifiers = [];
    if (options?.addToSelection) {
        // Use Ctrl/Cmd for adding to selection
        modifiers.push(process.platform === 'darwin' ? 'Meta' : 'Control');
    }
    if (options?.extendSelection) {
        modifiers.push('Shift');
    }
    // Click start cell
    await startCell.first().click({ modifiers: modifiers.length > 0 ? modifiers : undefined });
    // Shift+Click end cell to select range
    await endCell.first().click({ modifiers: ['Shift', ...modifiers] });
    // Wait for range selection to be applied
    await (0, test_1.expect)(startCell.first()).toHaveClass(/ag-cell-range-selected/, { timeout: 2000 });
    await (0, test_1.expect)(endCell.first()).toHaveClass(/ag-cell-range-selected/, { timeout: 2000 });
}
/**
 * Select cells by drag operation
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param start - Start cell position
 * @param end - End cell position
 * @param config - Normalized grid configuration
 */
async function selectCellsByDrag(gridLocator, page, start, end, _config) {
    const startCell = getCellLocator(gridLocator, start);
    const endCell = getCellLocator(gridLocator, end);
    // Get bounding boxes
    const startBox = await startCell.first().boundingBox();
    const endBox = await endCell.first().boundingBox();
    if (!startBox || !endBox) {
        throw new Error('Could not get cell bounding boxes for drag selection');
    }
    // Calculate center points
    const startX = startBox.x + startBox.width / 2;
    const startY = startBox.y + startBox.height / 2;
    const endX = endBox.x + endBox.width / 2;
    const endY = endBox.y + endBox.height / 2;
    // Perform drag operation
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();
    // Wait for selection to be applied
    await (0, test_1.expect)(startCell.first()).toHaveClass(/ag-cell-range-selected/, { timeout: 2000 });
    await (0, test_1.expect)(endCell.first()).toHaveClass(/ag-cell-range-selected/, { timeout: 2000 });
}
/**
 * Add a cell to the current selection
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param position - Cell position to add
 * @param config - Normalized grid configuration
 */
async function addCellToSelection(gridLocator, _page, position, _config) {
    const cell = getCellLocator(gridLocator, position);
    // Ctrl+Click to add to selection
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await cell.first().click({ modifiers: [modifier] });
    // Wait for cell to be selected
    await (0, test_1.expect)(cell.first()).toHaveClass(/ag-cell-range-selected/, { timeout: 2000 });
}
/**
 * Clear all range selections
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
async function clearRangeSelection(gridLocator, page) {
    // Press Escape to clear selection
    await page.keyboard.press('Escape');
    // Alternatively, click on an empty area
    const viewport = gridLocator.locator('.ag-body-viewport');
    const box = await viewport.boundingBox();
    if (box) {
        // Click in bottom-right corner (likely empty)
        await page.mouse.click(box.x + box.width - 10, box.y + box.height - 10);
    }
    // Wait for selection to be cleared
    const selectedCells = gridLocator.locator(exports.RANGE_SELECTION_SELECTORS.RANGE_CELL);
    await (0, test_1.expect)(selectedCells).toHaveCount(0, { timeout: 2000 });
}
/**
 * Get the current range selection state
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Range selection state
 */
async function getRangeSelectionState(gridLocator, _config) {
    const selectedCells = gridLocator.locator(exports.RANGE_SELECTION_SELECTORS.RANGE_CELL);
    const cellCount = await selectedCells.count();
    if (cellCount === 0) {
        return {
            ranges: [],
            cellCount: 0,
            rowCount: 0,
            columnCount: 0,
        };
    }
    // Collect all selected cell positions
    const selectedPositions = [];
    for (let i = 0; i < cellCount; i++) {
        const cell = selectedCells.nth(i);
        const colId = await cell.getAttribute('col-id');
        const row = cell.locator('..'); // Parent row
        const ariaRowIndex = await row.getAttribute('aria-rowindex');
        if (colId && ariaRowIndex) {
            selectedPositions.push({
                row: parseInt(ariaRowIndex, 10),
                col: colId,
            });
        }
    }
    // Calculate unique rows and columns
    const uniqueRows = new Set(selectedPositions.map((p) => p.row));
    const uniqueCols = new Set(selectedPositions.map((p) => p.col));
    // Build ranges (simplified: one range containing all selections)
    const ranges = [];
    if (selectedPositions.length > 0) {
        const minRow = Math.min(...Array.from(uniqueRows));
        const maxRow = Math.max(...Array.from(uniqueRows));
        // For columns, we need to maintain order
        const colsArray = Array.from(uniqueCols);
        const firstCol = colsArray[0];
        const lastCol = colsArray[colsArray.length - 1];
        if (firstCol && lastCol) {
            ranges.push({
                start: {
                    rowMatcher: { ariaRowIndex: minRow },
                    colId: firstCol,
                },
                end: {
                    rowMatcher: { ariaRowIndex: maxRow },
                    colId: lastCol,
                },
            });
        }
    }
    return {
        ranges,
        cellCount,
        rowCount: uniqueRows.size,
        columnCount: uniqueCols.size,
    };
}
/**
 * Get values from the selected range
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns 2D array of cell values
 */
async function getSelectedRangeValues(gridLocator, _config) {
    const selectedCells = gridLocator.locator(exports.RANGE_SELECTION_SELECTORS.RANGE_CELL);
    const cellCount = await selectedCells.count();
    if (cellCount === 0) {
        return [];
    }
    // Collect cells with their positions
    const cellData = [];
    for (let i = 0; i < cellCount; i++) {
        const cell = selectedCells.nth(i);
        const row = cell.locator('..');
        const ariaRowIndex = await row.getAttribute('aria-rowindex');
        const ariaColIndex = await cell.getAttribute('aria-colindex');
        const value = await cell.textContent();
        if (ariaRowIndex && ariaColIndex && value !== null) {
            cellData.push({
                row: parseInt(ariaRowIndex, 10),
                col: parseInt(ariaColIndex, 10),
                value: value.trim(),
            });
        }
    }
    if (cellData.length === 0) {
        return [];
    }
    // Organize into 2D array
    const rows = Array.from(new Set(cellData.map((c) => c.row))).sort((a, b) => a - b);
    const cols = Array.from(new Set(cellData.map((c) => c.col))).sort((a, b) => a - b);
    const result = [];
    for (const rowIdx of rows) {
        const rowValues = [];
        for (const colIdx of cols) {
            const cell = cellData.find((c) => c.row === rowIdx && c.col === colIdx);
            rowValues.push(cell?.value ?? null);
        }
        result.push(rowValues);
    }
    return result;
}
/**
 * Assert that cells in a range are selected
 *
 * @param gridLocator - The grid root locator
 * @param range - Expected range
 * @param config - Normalized grid configuration
 */
async function expectRangeSelected(gridLocator, range, _config) {
    const startCell = getCellLocator(gridLocator, range.start);
    const endCell = getCellLocator(gridLocator, range.end);
    // Check that start and end cells are in selection
    await (0, test_1.expect)(startCell.first()).toHaveClass(/ag-cell-range-selected/);
    await (0, test_1.expect)(endCell.first()).toHaveClass(/ag-cell-range-selected/);
}
/**
 * Copy selected cells to clipboard
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
async function copySelectedCells(gridLocator, page) {
    // Focus on the grid first
    await gridLocator.click();
    // Use keyboard shortcut
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+c`);
    // Copy is synchronous - no DOM changes to wait for
}
/**
 * Paste from clipboard to selected cells
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
async function pasteToSelectedCells(gridLocator, page) {
    // Focus on the grid first
    await gridLocator.click();
    // Use keyboard shortcut
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+v`);
    // Wait for any flash animation that indicates paste completion
    try {
        const flashCell = gridLocator.locator('.ag-cell-data-changed, .ag-cell-flash');
        await (0, test_1.expect)(flashCell.first()).toBeVisible({ timeout: 500 });
        await (0, test_1.expect)(flashCell).toHaveCount(0, { timeout: 1000 });
    }
    catch {
        // No flash animation, paste completed
    }
}
/**
 * Get the focused cell position
 *
 * @param gridLocator - The grid root locator
 * @returns Focused cell position or null
 */
async function getFocusedCell(gridLocator) {
    const focusedCell = gridLocator.locator(exports.RANGE_SELECTION_SELECTORS.CELL_FOCUS);
    const count = await focusedCell.count();
    if (count === 0) {
        return null;
    }
    const cell = focusedCell.first();
    const colId = await cell.getAttribute('col-id');
    const row = cell.locator('..');
    const ariaRowIndex = await row.getAttribute('aria-rowindex');
    if (!colId || !ariaRowIndex) {
        return null;
    }
    return {
        rowMatcher: { ariaRowIndex: parseInt(ariaRowIndex, 10) },
        colId,
    };
}
/**
 * Check if a specific cell is in the current selection
 *
 * @param gridLocator - The grid root locator
 * @param position - Cell position to check
 * @returns True if cell is selected
 */
async function isCellSelected(gridLocator, position) {
    const cell = getCellLocator(gridLocator, position);
    const count = await cell.count();
    if (count === 0) {
        return false;
    }
    const classAttr = await cell.first().getAttribute('class');
    return classAttr?.includes('ag-cell-range-selected') ?? false;
}
/**
 * Get the fill handle locator for drag-fill operations
 *
 * @param gridLocator - The grid root locator
 * @returns Fill handle locator
 */
function getFillHandle(gridLocator) {
    return gridLocator.locator(exports.RANGE_SELECTION_SELECTORS.FILL_HANDLE);
}
/**
 * Perform a fill down operation (drag fill handle)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param rowCount - Number of rows to fill
 */
async function fillDown(gridLocator, page, rowCount) {
    const fillHandle = getFillHandle(gridLocator);
    const handleBox = await fillHandle.boundingBox();
    if (!handleBox) {
        throw new Error('Fill handle not found or not visible');
    }
    // Estimate row height
    const rows = gridLocator.locator(selectors_js_1.AG_GRID_SELECTORS.ROW);
    const firstRowBox = await rows.first().boundingBox();
    const rowHeight = firstRowBox?.height ?? 42;
    // Calculate target position
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endY = startY + rowCount * rowHeight;
    // Drag fill handle down
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: rowCount * 2 });
    await page.mouse.up();
    // Wait for fill operation to complete - selection should expand
    await (0, test_1.expect)(async () => {
        const selectedCells = gridLocator.locator(exports.RANGE_SELECTION_SELECTORS.RANGE_CELL);
        const count = await selectedCells.count();
        // Selection should have expanded to include more cells
        (0, test_1.expect)(count).toBeGreaterThan(0);
    }).toPass({ timeout: 2000 });
}
/**
 * Perform a fill right operation (drag fill handle horizontally)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param columnCount - Number of columns to fill
 */
async function fillRight(gridLocator, page, columnCount) {
    const fillHandle = getFillHandle(gridLocator);
    const handleBox = await fillHandle.boundingBox();
    if (!handleBox) {
        throw new Error('Fill handle not found or not visible');
    }
    // Estimate column width
    const cells = gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW} ${selectors_js_1.AG_GRID_SELECTORS.CELL}`);
    const firstCellBox = await cells.first().boundingBox();
    const cellWidth = firstCellBox?.width ?? 100;
    // Calculate target position
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endX = startX + columnCount * cellWidth;
    // Drag fill handle right
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, startY, { steps: columnCount * 2 });
    await page.mouse.up();
    // Wait for fill operation to complete - selection should expand
    await (0, test_1.expect)(async () => {
        const selectedCells = gridLocator.locator(exports.RANGE_SELECTION_SELECTORS.RANGE_CELL);
        const count = await selectedCells.count();
        // Selection should have expanded to include more cells
        (0, test_1.expect)(count).toBeGreaterThan(0);
    }).toPass({ timeout: 2000 });
}
//# sourceMappingURL=range-selection.js.map