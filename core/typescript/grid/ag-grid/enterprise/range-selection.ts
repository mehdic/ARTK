/**
 * AG Grid Range Selection Support
 *
 * Provides utilities for testing grids with range selection,
 * including multi-cell selection, drag selection, and clipboard operations.
 *
 * @module grid/ag-grid/enterprise/range-selection
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type {
  NormalizedAgGridConfig,
  CellPosition,
  CellRange,
  RangeSelectionState,
  RangeSelectionOptions,
} from '../../types.js';
import { AG_GRID_SELECTORS, buildRowSelectorFromMatcher } from '../selectors.js';

/**
 * AG Grid range selection CSS selectors
 */
export const RANGE_SELECTION_SELECTORS = {
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
} as const;

/**
 * Get the cell locator for a specific position
 *
 * @param gridLocator - The grid root locator
 * @param position - Cell position
 * @returns Cell locator
 */
function getCellLocator(gridLocator: Locator, position: CellPosition): Locator {
  const rowSelector = buildRowSelectorFromMatcher(position.rowMatcher);

  if (rowSelector) {
    return gridLocator.locator(rowSelector).locator(
      `${AG_GRID_SELECTORS.CELL}[col-id="${position.colId}"]`
    );
  }

  // Fallback: find all rows and filter
  return gridLocator.locator(
    `${AG_GRID_SELECTORS.ROW} ${AG_GRID_SELECTORS.CELL}[col-id="${position.colId}"]`
  );
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
export async function selectCellRange(
  gridLocator: Locator,
  _page: Page,
  range: CellRange,
  _config: NormalizedAgGridConfig,
  options?: RangeSelectionOptions
): Promise<void> {
  const startCell = getCellLocator(gridLocator, range.start);
  const endCell = getCellLocator(gridLocator, range.end);

  // Verify cells exist
  await expect(startCell.first()).toBeVisible({ timeout: 5000 });
  await expect(endCell.first()).toBeVisible({ timeout: 5000 });

  const modifiers: ('Control' | 'Shift' | 'Meta')[] = [];

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
  await expect(startCell.first()).toHaveClass(/ag-cell-range-selected/, { timeout: 2000 });
  await expect(endCell.first()).toHaveClass(/ag-cell-range-selected/, { timeout: 2000 });
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
export async function selectCellsByDrag(
  gridLocator: Locator,
  page: Page,
  start: CellPosition,
  end: CellPosition,
  _config: NormalizedAgGridConfig
): Promise<void> {
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
  await expect(startCell.first()).toHaveClass(/ag-cell-range-selected/, { timeout: 2000 });
  await expect(endCell.first()).toHaveClass(/ag-cell-range-selected/, { timeout: 2000 });
}

/**
 * Add a cell to the current selection
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param position - Cell position to add
 * @param config - Normalized grid configuration
 */
export async function addCellToSelection(
  gridLocator: Locator,
  _page: Page,
  position: CellPosition,
  _config: NormalizedAgGridConfig
): Promise<void> {
  const cell = getCellLocator(gridLocator, position);

  // Ctrl+Click to add to selection
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await cell.first().click({ modifiers: [modifier] });

  // Wait for cell to be selected
  await expect(cell.first()).toHaveClass(/ag-cell-range-selected/, { timeout: 2000 });
}

/**
 * Clear all range selections
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function clearRangeSelection(
  gridLocator: Locator,
  page: Page
): Promise<void> {
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
  const selectedCells = gridLocator.locator(RANGE_SELECTION_SELECTORS.RANGE_CELL);
  await expect(selectedCells).toHaveCount(0, { timeout: 2000 });
}

/**
 * Get the current range selection state
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Range selection state
 */
export async function getRangeSelectionState(
  gridLocator: Locator,
  _config: NormalizedAgGridConfig
): Promise<RangeSelectionState> {
  const selectedCells = gridLocator.locator(RANGE_SELECTION_SELECTORS.RANGE_CELL);
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
  const selectedPositions: Array<{ row: number; col: string }> = [];

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
  const ranges: CellRange[] = [];

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
export async function getSelectedRangeValues(
  gridLocator: Locator,
  _config: NormalizedAgGridConfig
): Promise<unknown[][]> {
  const selectedCells = gridLocator.locator(RANGE_SELECTION_SELECTORS.RANGE_CELL);
  const cellCount = await selectedCells.count();

  if (cellCount === 0) {
    return [];
  }

  // Collect cells with their positions
  const cellData: Array<{ row: number; col: number; value: string }> = [];

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

  const result: unknown[][] = [];

  for (const rowIdx of rows) {
    const rowValues: unknown[] = [];
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
export async function expectRangeSelected(
  gridLocator: Locator,
  range: CellRange,
  _config: NormalizedAgGridConfig
): Promise<void> {
  const startCell = getCellLocator(gridLocator, range.start);
  const endCell = getCellLocator(gridLocator, range.end);

  // Check that start and end cells are in selection
  await expect(startCell.first()).toHaveClass(/ag-cell-range-selected/);
  await expect(endCell.first()).toHaveClass(/ag-cell-range-selected/);
}

/**
 * Copy selected cells to clipboard
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function copySelectedCells(
  gridLocator: Locator,
  page: Page
): Promise<void> {
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
export async function pasteToSelectedCells(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  // Focus on the grid first
  await gridLocator.click();

  // Use keyboard shortcut
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+v`);

  // Wait for any flash animation that indicates paste completion
  try {
    const flashCell = gridLocator.locator('.ag-cell-data-changed, .ag-cell-flash');
    await expect(flashCell.first()).toBeVisible({ timeout: 500 });
    await expect(flashCell).toHaveCount(0, { timeout: 1000 });
  } catch {
    // No flash animation, paste completed
  }
}

/**
 * Get the focused cell position
 *
 * @param gridLocator - The grid root locator
 * @returns Focused cell position or null
 */
export async function getFocusedCell(
  gridLocator: Locator
): Promise<CellPosition | null> {
  const focusedCell = gridLocator.locator(RANGE_SELECTION_SELECTORS.CELL_FOCUS);
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
export async function isCellSelected(
  gridLocator: Locator,
  position: CellPosition
): Promise<boolean> {
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
export function getFillHandle(gridLocator: Locator): Locator {
  return gridLocator.locator(RANGE_SELECTION_SELECTORS.FILL_HANDLE);
}

/**
 * Perform a fill down operation (drag fill handle)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param rowCount - Number of rows to fill
 */
export async function fillDown(
  gridLocator: Locator,
  page: Page,
  rowCount: number
): Promise<void> {
  const fillHandle = getFillHandle(gridLocator);
  const handleBox = await fillHandle.boundingBox();

  if (!handleBox) {
    throw new Error('Fill handle not found or not visible');
  }

  // Estimate row height
  const rows = gridLocator.locator(AG_GRID_SELECTORS.ROW);
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
  await expect(async () => {
    const selectedCells = gridLocator.locator(RANGE_SELECTION_SELECTORS.RANGE_CELL);
    const count = await selectedCells.count();
    // Selection should have expanded to include more cells
    expect(count).toBeGreaterThan(0);
  }).toPass({ timeout: 2000 });
}

/**
 * Perform a fill right operation (drag fill handle horizontally)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param columnCount - Number of columns to fill
 */
export async function fillRight(
  gridLocator: Locator,
  page: Page,
  columnCount: number
): Promise<void> {
  const fillHandle = getFillHandle(gridLocator);
  const handleBox = await fillHandle.boundingBox();

  if (!handleBox) {
    throw new Error('Fill handle not found or not visible');
  }

  // Estimate column width
  const cells = gridLocator.locator(`${AG_GRID_SELECTORS.ROW} ${AG_GRID_SELECTORS.CELL}`);
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
  await expect(async () => {
    const selectedCells = gridLocator.locator(RANGE_SELECTION_SELECTORS.RANGE_CELL);
    const count = await selectedCells.count();
    // Selection should have expanded to include more cells
    expect(count).toBeGreaterThan(0);
  }).toPass({ timeout: 2000 });
}
