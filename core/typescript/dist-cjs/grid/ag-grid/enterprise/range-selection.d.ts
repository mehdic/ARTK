/**
 * AG Grid Range Selection Support
 *
 * Provides utilities for testing grids with range selection,
 * including multi-cell selection, drag selection, and clipboard operations.
 *
 * @module grid/ag-grid/enterprise/range-selection
 */
import type { Locator, Page } from '@playwright/test';
import type { NormalizedAgGridConfig, CellPosition, CellRange, RangeSelectionState, RangeSelectionOptions } from '../../types.js';
/**
 * AG Grid range selection CSS selectors
 */
export declare const RANGE_SELECTION_SELECTORS: {
    /** Cell in range selection */
    readonly RANGE_CELL: ".ag-cell-range-selected";
    /** Single cell selection */
    readonly RANGE_SINGLE: ".ag-cell-range-single-cell";
    /** Top edge of range */
    readonly RANGE_TOP: ".ag-cell-range-top";
    /** Bottom edge of range */
    readonly RANGE_BOTTOM: ".ag-cell-range-bottom";
    /** Left edge of range */
    readonly RANGE_LEFT: ".ag-cell-range-left";
    /** Right edge of range */
    readonly RANGE_RIGHT: ".ag-cell-range-right";
    /** Fill handle for drag-fill */
    readonly FILL_HANDLE: ".ag-fill-handle";
    /** Range handle for resize */
    readonly RANGE_HANDLE: ".ag-range-handle";
    /** Focused cell */
    readonly CELL_FOCUS: ".ag-cell-focus";
    /** Range chart */
    readonly RANGE_CHART: ".ag-cell-range-chart";
    /** Range category */
    readonly RANGE_CHART_CATEGORY: ".ag-cell-range-chart-category";
};
/**
 * Select a range of cells
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param range - Cell range to select
 * @param config - Normalized grid configuration
 * @param options - Range selection options
 */
export declare function selectCellRange(gridLocator: Locator, _page: Page, range: CellRange, _config: NormalizedAgGridConfig, options?: RangeSelectionOptions): Promise<void>;
/**
 * Select cells by drag operation
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param start - Start cell position
 * @param end - End cell position
 * @param config - Normalized grid configuration
 */
export declare function selectCellsByDrag(gridLocator: Locator, page: Page, start: CellPosition, end: CellPosition, _config: NormalizedAgGridConfig): Promise<void>;
/**
 * Add a cell to the current selection
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param position - Cell position to add
 * @param config - Normalized grid configuration
 */
export declare function addCellToSelection(gridLocator: Locator, _page: Page, position: CellPosition, _config: NormalizedAgGridConfig): Promise<void>;
/**
 * Clear all range selections
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function clearRangeSelection(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Get the current range selection state
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Range selection state
 */
export declare function getRangeSelectionState(gridLocator: Locator, _config: NormalizedAgGridConfig): Promise<RangeSelectionState>;
/**
 * Get values from the selected range
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns 2D array of cell values
 */
export declare function getSelectedRangeValues(gridLocator: Locator, _config: NormalizedAgGridConfig): Promise<unknown[][]>;
/**
 * Assert that cells in a range are selected
 *
 * @param gridLocator - The grid root locator
 * @param range - Expected range
 * @param config - Normalized grid configuration
 */
export declare function expectRangeSelected(gridLocator: Locator, range: CellRange, _config: NormalizedAgGridConfig): Promise<void>;
/**
 * Copy selected cells to clipboard
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function copySelectedCells(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Paste from clipboard to selected cells
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function pasteToSelectedCells(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Get the focused cell position
 *
 * @param gridLocator - The grid root locator
 * @returns Focused cell position or null
 */
export declare function getFocusedCell(gridLocator: Locator): Promise<CellPosition | null>;
/**
 * Check if a specific cell is in the current selection
 *
 * @param gridLocator - The grid root locator
 * @param position - Cell position to check
 * @returns True if cell is selected
 */
export declare function isCellSelected(gridLocator: Locator, position: CellPosition): Promise<boolean>;
/**
 * Get the fill handle locator for drag-fill operations
 *
 * @param gridLocator - The grid root locator
 * @returns Fill handle locator
 */
export declare function getFillHandle(gridLocator: Locator): Locator;
/**
 * Perform a fill down operation (drag fill handle)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param rowCount - Number of rows to fill
 */
export declare function fillDown(gridLocator: Locator, page: Page, rowCount: number): Promise<void>;
/**
 * Perform a fill right operation (drag fill handle horizontally)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param columnCount - Number of columns to fill
 */
export declare function fillRight(gridLocator: Locator, page: Page, columnCount: number): Promise<void>;
//# sourceMappingURL=range-selection.d.ts.map