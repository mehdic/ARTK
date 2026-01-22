/**
 * AG Grid Actions
 *
 * Provides action functions for interacting with grid elements.
 *
 * @module grid/ag-grid/actions
 */
import type { RowMatcher } from '../types.js';
import { type GridLocatorContext } from './locators.js';
/**
 * Sort by a column by clicking its header
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID to sort by
 * @param direction - Optional target sort direction ('asc' or 'desc')
 */
export declare function sortByColumn(ctx: GridLocatorContext, colId: string, direction?: 'asc' | 'desc'): Promise<void>;
/**
 * Filter a column using the floating filter input
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID to filter
 * @param filterValue - Value to filter by
 */
export declare function filterColumn(ctx: GridLocatorContext, colId: string, filterValue: string): Promise<void>;
/**
 * Clear the filter for a specific column
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID to clear filter
 */
export declare function clearFilter(ctx: GridLocatorContext, colId: string): Promise<void>;
/**
 * Clear all filters in the grid
 *
 * @param ctx - Grid locator context
 */
export declare function clearAllFilters(ctx: GridLocatorContext): Promise<void>;
/**
 * Click on a specific cell
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 */
export declare function clickCell(ctx: GridLocatorContext, rowMatcher: RowMatcher, colId: string): Promise<void>;
/**
 * Double-click to edit a cell and enter a new value
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 * @param newValue - New value to enter
 */
export declare function editCell(ctx: GridLocatorContext, rowMatcher: RowMatcher, colId: string, newValue: string): Promise<void>;
/**
 * Press a key while focused on a cell
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 * @param key - Key to press (e.g., 'Enter', 'Escape', 'Delete')
 */
export declare function pressCellKey(ctx: GridLocatorContext, rowMatcher: RowMatcher, colId: string, key: string): Promise<void>;
/**
 * Select a row by clicking its checkbox or the row itself
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria
 */
export declare function selectRow(ctx: GridLocatorContext, matcher: RowMatcher): Promise<void>;
/**
 * Deselect a row by unchecking its checkbox or clicking it again
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria
 */
export declare function deselectRow(ctx: GridLocatorContext, matcher: RowMatcher): Promise<void>;
/**
 * Select all rows using the header checkbox
 *
 * @param ctx - Grid locator context
 */
export declare function selectAllRows(ctx: GridLocatorContext): Promise<void>;
/**
 * Deselect all rows using the header checkbox
 *
 * @param ctx - Grid locator context
 */
export declare function deselectAllRows(ctx: GridLocatorContext): Promise<void>;
/**
 * Get IDs of all currently selected rows
 *
 * @param ctx - Grid locator context
 * @returns Array of selected row IDs
 */
export declare function getSelectedRowIds(ctx: GridLocatorContext): Promise<string[]>;
/**
 * Right-click on a cell to open context menu
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 */
export declare function rightClickCell(ctx: GridLocatorContext, rowMatcher: RowMatcher, colId: string): Promise<void>;
/**
 * Drag a row to a new position (for row reordering)
 *
 * @param ctx - Grid locator context
 * @param sourceMatcher - Source row matching criteria
 * @param targetMatcher - Target row matching criteria
 */
export declare function dragRowTo(ctx: GridLocatorContext, sourceMatcher: RowMatcher, targetMatcher: RowMatcher): Promise<void>;
//# sourceMappingURL=actions.d.ts.map